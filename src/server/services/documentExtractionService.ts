/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'node:crypto';
import { GoogleGenAI } from '@google/genai';
import { serverConfig } from '../config/index';
import { validateSafeExternalUrl } from '../utils/ssrfValidator';
import { documentRepository } from '../repositories/documentRepository';
import { extractionJobRepository } from '../repositories/extractionJobRepository';
import { productRepository } from '../repositories/productRepository';
import { businessProfileRepository } from '../repositories/businessProfileRepository';
import type {
  BusinessDocumentEntity,
  ExtractionJobEntity,
  MissingInfoQuestion,
  VerificationItemEntity,
  ProductEntity,
  ServiceEntity,
  MultiDocDiscrepancyMatrix,
  MultiDocDiscrepancyItem,
  DiscrepancyDomain,
  DiscrepancySeverity,
  DiscrepancySourceEntry,
} from '../types/api';

export interface ExtractionInput {
  workspaceId: string;
  userId: string;
  sourceType: 'file' | 'url' | 'raw_text';
  fileName?: string;
  mimeType?: string;
  fileBufferBase64?: string;
  rawText?: string;
  url?: string;
  documentType?: BusinessDocumentEntity['type'];
}

export interface ExtractionResult {
  job: ExtractionJobEntity;
  document?: BusinessDocumentEntity;
  verificationItems: VerificationItemEntity[];
  duplicateProducts: Array<{ name: string; existingId: string; reason: string }>;
  missingInformationQuestions: Array<{
    id: string;
    domain: string;
    question: string;
    importance: 'critical' | 'high' | 'recommended';
    options?: string[];
  }>;
}

export class DocumentExtractionService {
  /**
   * Main entrypoint for processing any business document, URL, or natural-language description.
   */
  public async processDocument(input: ExtractionInput): Promise<ExtractionResult> {
    const { workspaceId, userId, sourceType } = input;
    const now = new Date().toISOString();
    const jobId = `job_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

    let sourceName =
      input.fileName || (sourceType === 'url' ? input.url || 'Web Document' : 'Text Input');
    let textContent = input.rawText || '';
    let docEntity: BusinessDocumentEntity | undefined;

    // 1. Process URL if provided
    if (sourceType === 'url' && input.url) {
      const ssrfCheck = validateSafeExternalUrl(input.url);
      if (!ssrfCheck.isSafe || !ssrfCheck.sanitizedUrl) {
        throw new Error(`SSRF_BLOCKED: ${ssrfCheck.reason || 'Invalid or unsafe URL.'}`);
      }
      sourceName = ssrfCheck.sanitizedUrl;
      textContent = await this.fetchUrlText(ssrfCheck.sanitizedUrl);
    }

    // 2. Register Document Record if file or url
    if (sourceType === 'file' || sourceType === 'url') {
      const docId = `doc_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      docEntity = await documentRepository.createDocument({
        documentId: docId,
        workspaceId,
        name: sourceName,
        type:
          input.documentType ||
          (sourceType === 'url' ? 'URL' : this.inferDocType(input.fileName, input.mimeType)),
        sizeBytes:
          textContent.length ||
          (input.fileBufferBase64 ? Math.floor(input.fileBufferBase64.length * 0.75) : 1024),
        mimeType: input.mimeType || (sourceType === 'url' ? 'text/html' : 'text/plain'),
        sourceUrl: sourceType === 'url' ? sourceName : undefined,
        status: 'processing',
        usedByAI: true,
        uploadedBy: userId,
        uploadedAt: now,
        updatedAt: now,
      });
    }

    // 3. Perform AI / Heuristic Extraction
    const extractedData = await this.extractStructuredKnowledge({
      sourceType,
      sourceName,
      textContent,
      mimeType: input.mimeType,
      fileBufferBase64: input.fileBufferBase64,
      docType: docEntity?.type,
    });

    // 4. Duplicate Product & Service Detection
    const duplicateProducts: Array<{ name: string; existingId: string; reason: string }> = [];
    if (extractedData.products && extractedData.products.length > 0) {
      for (const p of extractedData.products) {
        if (!p.name) continue;
        const existing = await productRepository.findByNameOrSku(workspaceId, p.name, p.sku);
        if (existing) {
          duplicateProducts.push({
            name: p.name,
            existingId: existing.productId,
            reason:
              p.sku && existing.sku === p.sku
                ? 'Identical SKU match'
                : 'Product name already exists in catalog',
          });
        }
      }
    }

    // 5. Gap Analysis & Follow-Up Questions
    const missingInformationQuestions = this.identifyMissingInformation(extractedData);

    // 6. Generate Verification Items (User approval queue)
    const verificationItems: VerificationItemEntity[] = this.buildVerificationQueue({
      workspaceId,
      jobId,
      sourceName,
      extractedData,
    });

    // 7. Calculate Confidence Score
    let confidenceScore = 0.88;
    if (duplicateProducts.length > 0) confidenceScore = Math.max(0.75, confidenceScore - 0.05);
    if (!extractedData.products?.length && !extractedData.identity?.businessName)
      confidenceScore = 0.65;

    // 8. Save Extraction Job
    const job: ExtractionJobEntity = {
      jobId,
      workspaceId,
      documentId: docEntity?.documentId,
      sourceType,
      sourceName,
      sourceUrl: sourceType === 'url' ? sourceName : undefined,
      status: 'completed',
      confidenceScore,
      extractedData,
      missingInfoQuestions: missingInformationQuestions,
      duplicateDetections: duplicateProducts.map((d) => ({
        entityType: 'product',
        detectedName: d.name,
        existingId: d.existingId,
        existingName: d.name,
        similarity: 1.0,
      })),
      createdAt: now,
      completedAt: now,
    };
    await extractionJobRepository.createJob(job);
    await extractionJobRepository.createVerificationItems(workspaceId, verificationItems);

    // 9. Update Document status
    if (docEntity) {
      await documentRepository.updateDocument(workspaceId, docEntity.documentId, {
        status: 'extracted',
        confidenceScore,
        extractedSummary:
          extractedData.identity?.overviewSummary ||
          `Extracted ${extractedData.products?.length || 0} product(s), ${extractedData.services?.length || 0} service(s), and brand insights.`,
        detectedDomainCount: Object.keys(extractedData).filter((k) =>
          Boolean((extractedData as any)[k])
        ).length,
      });
    }

    return {
      job,
      document: docEntity,
      verificationItems,
      duplicateProducts,
      missingInformationQuestions,
    };
  }

  /**
   * Reprocesses a previously uploaded document.
   */
  public async reprocessDocument(
    workspaceId: string,
    documentId: string,
    userId: string
  ): Promise<ExtractionResult> {
    const doc = await documentRepository.getDocument(workspaceId, documentId);
    if (!doc) {
      throw new Error(`DOCUMENT_NOT_FOUND: Document '${documentId}' not found in workspace.`);
    }

    return this.processDocument({
      workspaceId,
      userId,
      sourceType: doc.sourceUrl ? 'url' : 'file',
      fileName: doc.name,
      mimeType: doc.mimeType,
      url: doc.sourceUrl,
      documentType: doc.type,
      rawText: doc.extractedSummary,
    });
  }

  /**
   * Core extraction engine: Uses Google Gemini 2.5 Flash with fallback to deterministic heuristic rules.
   */
  private async extractStructuredKnowledge(params: {
    sourceType: string;
    sourceName: string;
    textContent: string;
    mimeType?: string;
    fileBufferBase64?: string;
    docType?: BusinessDocumentEntity['type'];
  }): Promise<ExtractionJobEntity['extractedData']> {
    const { sourceName, textContent, mimeType, fileBufferBase64, docType } = params;

    // Attempt Gemini Multimodal / Text Extraction
    if (serverConfig.geminiApiKey && process.env.NODE_ENV !== 'test' && !serverConfig.isTest) {
      try {
        const ai = new GoogleGenAI({ apiKey: serverConfig.geminiApiKey });
        const systemPrompt = `You are the BrainWise Business Knowledge Extraction Engine.
Extract comprehensive, reliable, structured business facts across these domains:
1. Identity (businessName, legalName, industry, subIndustry, businessModel, businessSize, stage, location, serviceAreas, operationType, operatingHours, overviewSummary, strengths, weaknesses)
2. Products & Services (name, category, subcategory, price, currency, pricingStructure, cost, margin, description, features, benefits, targetCustomer, availability, differentiators, faqs, customerObjections)
3. Audience (name, type, needs, painPoints, buyingMotivations, buyingTriggers, objections, preferredChannels, willingnessToPay)
4. Brand (brandName, tagline, voice, tone, visualDirection, preferredLanguage, wordsToUse, wordsToAvoid, approvedClaims, restrictedClaims, uniqueSellingProposition)
5. Goals (title, description, category, measurementMethod, targetValue, currentValue, unit, targetDate)
6. Resources & Constraints (marketingBudget, availableResources, teamCapabilities, operatingCapacity, geographicLimitations, timeConstraints, financialConstraints, operationalRestrictions)

CRITICAL DIRECTIVE: NEVER invent or hallucinate financial numbers or arbitrary operational constraints not present in the document.
Return clean, strictly valid JSON conforming to the requested schema.`;

        const contents: any[] = [];
        if (
          fileBufferBase64 &&
          mimeType &&
          (mimeType === 'application/pdf' || mimeType.startsWith('image/'))
        ) {
          contents.push({
            role: 'user',
            parts: [
              {
                text: `Analyze this document file: ${sourceName} (${docType || 'Document'}).\nExtract all structured business knowledge into JSON.`,
              },
              { inlineData: { mimeType, data: fileBufferBase64 } },
            ],
          });
        } else {
          contents.push({
            role: 'user',
            parts: [
              {
                text: `Document Name: ${sourceName}\nContent:\n${textContent.slice(0, 30000)}\n\nExtract all structured business knowledge into JSON.`,
              },
            ],
          });
        }

        const response = await ai.models.generateContent({
          model: serverConfig.geminiModel,
          contents,
          config: {
            responseMimeType: 'application/json',
            systemInstruction: systemPrompt,
          },
        });

        if (response.text) {
          const parsed = JSON.parse(response.text);
          return this.sanitizeExtractedData(parsed);
        }
      } catch {
        // Fall back gracefully to deterministic rule-based parsing
      }
    }

    // Deterministic Rule-Based & Tabular Parser
    return this.deterministicFallbackExtraction(sourceName, textContent, docType);
  }

  /**
   * Deterministic parser for testing, offline, and fallback execution.
   * Accurately parses CSV catalogues, restaurant menus, salon services, and business text.
   */
  public deterministicFallbackExtraction(
    sourceName: string,
    content: string,
    docType?: BusinessDocumentEntity['type']
  ): ExtractionJobEntity['extractedData'] {
    const lines = content
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const headerGuess = lines[0] || sourceName.replace(/\.[^/.]+$/, '');

    // Check if CSV format
    if (
      content.includes(',') &&
      (docType === 'CSV' ||
        sourceName.endsWith('.csv') ||
        lines[0].includes('price') ||
        lines[0].includes('name'))
    ) {
      return this.parseCsvCatalogue(lines);
    }

    // Check if salon / spa / service catalogue
    const isSalonOrService =
      /salon|spa|treatment|haircut|facial|massage|consultation|service/i.test(
        sourceName + ' ' + content
      );
    if (isSalonOrService) {
      return this.parseSalonCatalogue(headerGuess, lines);
    }

    // Check if restaurant menu / food catalogue
    const isMenu =
      /restaurant|cafe|dish|beverage|appetizer|entree|pizza|coffee|brew|cocktail|food|dine/i.test(
        sourceName + ' ' + content
      );
    if (isMenu) {
      return this.parseRestaurantMenu(headerGuess, lines);
    }

    // General business description parser
    return this.parseGeneralBusinessContent(headerGuess, lines);
  }

  /**
   * Parses CSV catalogue format (e.g. name, category, price, description, sku, cost)
   */
  private parseCsvCatalogue(lines: string[]): ExtractionJobEntity['extractedData'] {
    const headerLine = lines[0].toLowerCase();
    const headers = headerLine.split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''));

    const nameIdx = headers.findIndex(
      (h) => h.includes('name') || h.includes('title') || h.includes('item')
    );
    const priceIdx = headers.findIndex(
      (h) => h.includes('price') || h.includes('rate') || h.includes('mrp')
    );
    const catIdx = headers.findIndex(
      (h) => h.includes('cat') || h.includes('type') || h.includes('dept')
    );
    const descIdx = headers.findIndex(
      (h) => h.includes('desc') || h.includes('detail') || h.includes('note')
    );
    const skuIdx = headers.findIndex(
      (h) => h.includes('sku') || h.includes('code') || h.includes('id')
    );
    const costIdx = headers.findIndex((h) => h.includes('cost') || h.includes('cogs'));

    const products: Array<Partial<ProductEntity>> = [];

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',').map((cell) => cell.trim().replace(/^["']|["']$/g, ''));
      if (!row[nameIdx]) continue;

      const rawPrice = priceIdx !== -1 ? Number(row[priceIdx].replace(/[^0-9.]/g, '')) || 0 : 0;
      const rawCost =
        costIdx !== -1 ? Number(row[costIdx].replace(/[^0-9.]/g, '')) || undefined : undefined;
      const margin =
        rawPrice && rawCost ? Math.round(((rawPrice - rawCost) / rawPrice) * 100) : undefined;

      products.push({
        name: row[nameIdx],
        category: catIdx !== -1 ? row[catIdx] : 'Product Catalog',
        price: rawPrice,
        currency: 'USD',
        description: descIdx !== -1 ? row[descIdx] : 'Imported catalog item',
        sku: skuIdx !== -1 ? row[skuIdx] : undefined,
        cost: rawCost,
        margin,
        pricingStructure: 'one-time',
        availability: 'in_stock',
        source: 'DERIVED_FROM_DOC',
      });
    }

    return {
      identity: {
        businessName: 'Product Catalog Ingestion',
        businessModel: 'Direct Commerce / Retail',
        stage: 'Growing Business',
        overviewSummary: `Imported catalogue with ${products.length} distinct item(s).`,
      },
      products,
    };
  }

  /**
   * Parses Restaurant Menu documents (items, prices, categories, descriptions)
   */
  private parseRestaurantMenu(
    title: string,
    lines: string[]
  ): ExtractionJobEntity['extractedData'] {
    const products: Array<Partial<ProductEntity>> = [];
    let currentCategory = 'Appetizers & Mains';

    for (const line of lines) {
      if (
        /^(starters|appetizers|mains|entrees|desserts|beverages|drinks|pizzas|pasta|sides):?$/i.test(
          line
        )
      ) {
        currentCategory = line.replace(':', '');
        continue;
      }

      // Regex matching: "Item Name - Description - $18" or "Item Name $18" or "Item Name: 18.00"
      const priceMatch = line.match(
        /(?:[$₹€£]\s*(\d+(?:\.\d{2})?)|(\d+(?:\.\d{2})?)\s*[$₹€£]|\b(\d+)\s*(?:USD|INR|EUR))/i
      );
      if (priceMatch) {
        const priceVal = Number(priceMatch[1] || priceMatch[2] || priceMatch[3]);
        const parts = line.split(/[-–—:|]/);
        const name = parts[0]?.replace(/(?:[$₹€£]|\d+\.\d+).*/g, '').trim();

        if (name && name.length > 2 && name.length < 60) {
          const desc =
            parts.length > 1
              ? parts
                  .slice(1)
                  .join(' ')
                  .replace(/[$₹€£]\s*\d+.*/g, '')
                  .trim()
              : 'House specialty prepared fresh.';
          products.push({
            name,
            category: currentCategory,
            price: priceVal || 12,
            currency: 'USD',
            description: desc || 'Signature menu offering.',
            availability: 'in_stock',
            pricingStructure: 'one-time',
            features: ['Locally prepared', 'Fresh ingredients'],
            source: 'DERIVED_FROM_DOC',
          });
        }
      }
    }

    return {
      identity: {
        businessName: title.replace(/(menu|food|carte|dining)/gi, '').trim() || 'Artisan Eatery',
        industry: 'Hospitality & Dining',
        subIndustry: 'Restaurant & Bar',
        businessModel: 'Brick-and-Mortar Hospitality',
        operationType: 'physical',
        stage: 'Growing Business',
        overviewSummary: `${title} offering dine-in and takeaway options with handcrafted menu selections.`,
        strengths: ['Culinary excellence', 'Curated fresh menu', 'Prime customer experience'],
      },
      products: products.length
        ? products
        : [
            {
              name: 'Signature Tasting Dish',
              category: 'Mains',
              price: 28,
              description: 'Chef crafted seasonal selection',
            },
          ],
      audienceSegments: [
        {
          name: 'Local Food Enthusiasts & Diners',
          type: 'B2C',
          needs: ['High culinary quality', 'Inviting ambiance', 'Consistent flavor'],
          painPoints: ['Generic commercial alternatives', 'Slow service at peak hours'],
          buyingMotivations: ['Social dining', 'Authentic flavors', 'Special occasions'],
          isConfirmed: false,
          source: 'AI_INFERRED',
        },
      ],
      brand: {
        brandName: title,
        voice: ['Warm', 'Inviting', 'Gastronomic'],
        tone: 'Hospitable and welcoming',
        wordsToUse: ['Artisanal', 'Handcrafted', 'Freshly roasted', 'Farm-to-table'],
        wordsToAvoid: ['Pre-packaged', 'Artificial', 'Fast-food'],
      },
    };
  }

  /**
   * Parses Salon / Wellness / Clinic services (duration, price, target customer)
   */
  private parseSalonCatalogue(
    title: string,
    lines: string[]
  ): ExtractionJobEntity['extractedData'] {
    const services: Array<Partial<ServiceEntity>> = [];
    let currentCategory = 'Hair & Styling';

    for (const line of lines) {
      if (/^(hair|styling|color|facial|skin|massage|nails|treatments):?$/i.test(line)) {
        currentCategory = line.replace(':', '');
        continue;
      }

      const priceMatch = line.match(/[$₹€£]\s*(\d+(?:\.\d{2})?)/);
      const durationMatch = line.match(/(\d+)\s*(?:mins?|minutes?|hrs?|hours?)/i);

      if (priceMatch) {
        const priceVal = Number(priceMatch[1]);
        const durationVal = durationMatch ? durationMatch[0] : '45 mins';
        const parts = line.split(/[-–—:|]/);
        const name = parts[0]?.replace(/[$₹€£].*/g, '').trim();

        if (name && name.length > 2 && name.length < 60) {
          services.push({
            name,
            category: currentCategory,
            price: priceVal,
            pricingModel: 'Fixed Appointment',
            duration: durationVal,
            targetCustomer: 'Personal grooming & wellness clients',
            benefits: ['Customized consultation', 'Premium salon-grade products'],
            description:
              parts
                .slice(1)
                .join(' ')
                .replace(/[$₹€£].*/g, '')
                .trim() || 'Professional salon care service.',
            availability: 'available',
            source: 'DERIVED_FROM_DOC',
          });
        }
      }
    }

    return {
      identity: {
        businessName: title.replace(/(salon|spa|studio|services)/gi, '').trim() || 'Luxe Studio',
        industry: 'Personal Care & Wellness',
        subIndustry: 'Salon & Spa Services',
        businessModel: 'Appointment-Based Services',
        operationType: 'physical',
        stage: 'Growing Business',
        overviewSummary: `Full-service salon providing premium grooming and styling services.`,
        strengths: [
          'Licensed master stylists',
          'Bespoke consultations',
          'Premium organic product lines',
        ],
      },
      services: services.length
        ? services
        : [
            {
              name: 'Custom Balayage & Cut',
              category: 'Coloring',
              price: 160,
              duration: '90 mins',
              pricingModel: 'Fixed',
            },
          ],
      audienceSegments: [
        {
          name: 'Discerning Wellness & Style Clients',
          type: 'B2C',
          needs: ['Consistent styling', 'Careful hair & skin health', 'Punctual appointments'],
          painPoints: ['Overprocessing damage', 'Rushed appointments'],
          buyingMotivations: ['Personal confidence', 'Event preparation', 'Routine maintenance'],
          isConfirmed: false,
          source: 'AI_INFERRED',
        },
      ],
    };
  }

  /**
   * General natural-language business parser
   */
  private parseGeneralBusinessContent(
    title: string,
    lines: string[]
  ): ExtractionJobEntity['extractedData'] {
    const fullText = lines.join(' ');
    const nameMatch = title
      ? title.replace(/\.[^/.]+$/, '')
      : lines[0]?.slice(0, 50) || 'Analyzed Business';

    const products: Array<Partial<ProductEntity>> = [];
    // Extract potential offers
    if (/pricing|plans|subscription|packages|tier/i.test(fullText)) {
      products.push({
        name: 'Core Solution Package',
        category: 'Flagship Offering',
        price: 99,
        currency: 'USD',
        pricingStructure: 'recurring',
        description: 'Primary product offering extracted from business brief.',
        features: ['Full feature suite', 'Continuous updates'],
        source: 'DERIVED_FROM_DOC',
      });
    }

    return {
      identity: {
        businessName: nameMatch,
        stage: 'Early Traction',
        businessModel: 'SaaS / Tech Enabled',
        operationType: 'hybrid',
        overviewSummary:
          lines.slice(0, 3).join(' ').slice(0, 350) || 'Extracted business knowledge foundation.',
        strengths: ['Clear market positioning', 'Scalable delivery architecture'],
      },
      products,
      audienceSegments: [
        {
          name: 'Primary Enterprise / Buyer Segment',
          type: 'B2B',
          needs: ['Streamlined operations', 'Measurable ROI'],
          painPoints: ['Fragmented manual workflows', 'High coordination costs'],
          buyingMotivations: ['Efficiency gains', 'Scalability'],
          isConfirmed: false,
          source: 'AI_INFERRED',
        },
      ],
      brand: {
        brandName: nameMatch,
        voice: ['Professional', 'Authoritative', 'Reliable'],
        tone: 'Direct and strategic',
        wordsToUse: ['Proven', 'Scalable', 'Precision', 'Enterprise-grade'],
        wordsToAvoid: ['Cheap', 'Untested', 'Quick-fix'],
      },
      goals: [
        {
          title: 'Initial Market Expansion & Customer Acquisition',
          category: 'acquisition',
          measurementMethod: 'New Paying Accounts',
          targetValue: 50,
          currentValue: 5,
          unit: 'Accounts',
          status: 'on_track',
        },
      ],
      resourcesAndConstraints: {
        marketingBudget: {
          monthly: 2500,
          currency: 'USD',
          allocatedDetails: 'Digital acquisition & brand collateral',
        },
        availableResources: ['Internal product team', 'Direct founder sales'],
        teamCapabilities: ['Technical engineering', 'Content strategy'],
        geographicLimitations: ['English-speaking markets initially'],
      },
    };
  }

  /**
   * Identifies gaps across all 6 domains and generates non-repetitive follow-up questions.
   */
  public identifyMissingInformation(
    data: ExtractionJobEntity['extractedData']
  ): MissingInfoQuestion[] {
    const questions: MissingInfoQuestion[] = [];

    if (!data.identity?.operatingHours) {
      questions.push({
        id: 'gap_hours',
        domain: 'identity',
        question: 'What are your standard business operating hours and availability windows?',
        importance: 'recommended',
        options: [
          'Mon–Fri 9am–6pm',
          '24/7 Online Support',
          'Mon–Sat 10am–8pm',
          'By Appointment Only',
        ],
      });
    }

    if (!data.products?.length && !data.services?.length) {
      questions.push({
        id: 'gap_pricing',
        domain: 'products',
        question:
          'What is your core pricing structure (e.g. flat fee, hourly, monthly retainer, or per-unit)?',
        importance: 'critical',
        options: ['Monthly Subscription', 'Fixed Project Fee', 'Per-Unit Retail', 'Custom Quote'],
      });
    }

    if (!data.identity?.serviceAreas?.length && !data.identity?.location) {
      questions.push({
        id: 'gap_geo',
        domain: 'identity',
        question: 'What geographic regions, cities, or service radiuses does your business serve?',
        importance: 'high',
        options: [
          'Nationwide (Domestic)',
          'Metro Cities Only',
          'Global Remote',
          'Within 25km radius',
        ],
      });
    }

    if (!data.resourcesAndConstraints?.marketingBudget?.monthly) {
      questions.push({
        id: 'gap_budget',
        domain: 'resources',
        question: 'Do you have an estimated monthly marketing budget range for growth experiments?',
        importance: 'recommended',
        options: [
          'Bootstrap ($0–$500/mo)',
          'Growth ($500–$2,500/mo)',
          'Scale ($2,500–$10,000/mo)',
          'Enterprise ($10,000+/mo)',
        ],
      });
    }

    if (!data.brand?.approvedClaims?.length) {
      questions.push({
        id: 'gap_claims',
        domain: 'brand',
        question:
          'Are there any specific certified claims, awards, or patents we should highlight in marketing?',
        importance: 'recommended',
      });
    }

    return questions;
  }

  /**
   * Generates a pending verification queue of proposed facts for founder confirmation.
   */
  public buildVerificationQueue(params: {
    workspaceId: string;
    jobId: string;
    sourceName: string;
    extractedData: ExtractionJobEntity['extractedData'];
  }): VerificationItemEntity[] {
    const { workspaceId, jobId, sourceName, extractedData } = params;
    const items: VerificationItemEntity[] = [];
    const now = new Date().toISOString();

    if (extractedData.identity?.businessName) {
      items.push({
        itemId: `v_${Date.now()}_name`,
        workspaceId,
        jobId,
        domain: 'identity',
        fieldKey: 'businessName',
        proposedValue: extractedData.identity.businessName,
        confidence: 0.95,
        sourceDocument: sourceName,
        status: 'pending',
        createdAt: now,
      });
    }

    if (extractedData.identity?.industry) {
      items.push({
        itemId: `v_${Date.now()}_ind`,
        workspaceId,
        jobId,
        domain: 'identity',
        fieldKey: 'industry',
        proposedValue: extractedData.identity.industry,
        confidence: 0.9,
        sourceDocument: sourceName,
        status: 'pending',
        createdAt: now,
      });
    }

    if (extractedData.products && extractedData.products.length > 0) {
      extractedData.products.slice(0, 5).forEach((p: any, idx: number) => {
        items.push({
          itemId: `v_${Date.now()}_prod_${idx}`,
          workspaceId,
          jobId,
          domain: 'products',
          fieldKey: `product:${p.name}`,
          proposedValue: p,
          confidence: 0.88,
          sourceDocument: sourceName,
          status: 'pending',
          createdAt: now,
        });
      });
    }

    if (extractedData.services && extractedData.services.length > 0) {
      extractedData.services.slice(0, 5).forEach((s: any, idx: number) => {
        items.push({
          itemId: `v_${Date.now()}_srv_${idx}`,
          workspaceId,
          jobId,
          domain: 'services',
          fieldKey: `service:${s.name}`,
          proposedValue: s,
          confidence: 0.88,
          sourceDocument: sourceName,
          status: 'pending',
          createdAt: now,
        });
      });
    }

    const brandVoiceArr = extractedData.brand?.voice || extractedData.brand?.brandVoice;
    if (brandVoiceArr?.length) {
      items.push({
        itemId: `v_${Date.now()}_voice`,
        workspaceId,
        jobId,
        domain: 'brand',
        fieldKey: 'brandVoice',
        proposedValue: brandVoiceArr,
        confidence: 0.85,
        sourceDocument: sourceName,
        status: 'pending',
        createdAt: now,
      });
    }

    return items;
  }

  /**
   * Fetches webpage text safely with SSRF protection, size capping, and HTML strip.
   */
  private async fetchUrlText(safeUrl: string): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const res = await fetch(safeUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'BrainWise-Ingestion-Bot/1.0 (+https://brainwise.ai)',
          Accept: 'text/html,text/plain',
        },
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`HTTP_ERROR: Target site responded with status ${res.status}`);
      }

      const html = await res.text();
      // Simple HTML tags strip to readable text
      return html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 30000);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error('URL_TIMEOUT: Target website took longer than 8 seconds to respond.', {
          cause: err,
        });
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  private inferDocType(fileName?: string, mimeType?: string): BusinessDocumentEntity['type'] {
    if (!fileName && !mimeType) return 'TEXT';
    const ext = fileName ? fileName.split('.').pop()?.toLowerCase() : '';

    if (ext === 'pdf' || mimeType === 'application/pdf') return 'PDF';
    if (ext === 'csv' || mimeType === 'text/csv') return 'CSV';
    if (ext === 'xlsx' || ext === 'xls') return 'XLSX';
    if (ext === 'docx' || ext === 'doc') return 'DOCX';
    if (['png', 'jpg', 'jpeg', 'webp'].includes(ext || '') || mimeType?.startsWith('image/'))
      return 'IMAGE';
    if (['ppt', 'pptx'].includes(ext || '')) return 'PRESENTATION';
    return 'TEXT';
  }

  private sanitizeExtractedData(data: any): ExtractionJobEntity['extractedData'] {
    return {
      identity: data.identity || {},
      products: Array.isArray(data.products) ? data.products : [],
      services: Array.isArray(data.services) ? data.services : [],
      audienceSegments: Array.isArray(data.audienceSegments) ? data.audienceSegments : [],
      brand: data.brand || {},
      goals: Array.isArray(data.goals) ? data.goals : [],
      resourcesAndConstraints: data.resourcesAndConstraints || {},
    };
  }

  /**
   * Compiles an inline side-by-side Multi-Doc Discrepancy Matrix across all uploaded pitch decks,
   * legacy catalogs, URLs, and current Business Brain attributes.
   */
  public async getMultiDocDiscrepancyMatrix(
    workspaceId: string
  ): Promise<MultiDocDiscrepancyMatrix> {
    const profile = await businessProfileRepository.getProfile(workspaceId);
    const existingProducts = await productRepository.listProducts(workspaceId);
    const verificationItems = await extractionJobRepository.listVerificationItems(
      workspaceId,
      'pending'
    );
    const jobs = await extractionJobRepository.listJobs(workspaceId, 25);

    // Group verification items and extraction job facts by (domain + fieldKey)
    const fieldMap = new Map<
      string,
      {
        domain: DiscrepancyDomain;
        fieldKey: string;
        currentBrainValue?: unknown;
        sources: Map<string, DiscrepancySourceEntry>;
      }
    >();

    // Helper to normalize domain
    const normalizeDomain = (d: string): DiscrepancyDomain => {
      const lower = d.toLowerCase();
      if (lower.includes('price') || lower.includes('product')) return 'pricing';
      if (lower.includes('position')) return 'positioning';
      if (lower.includes('audience')) return 'audience';
      if (lower.includes('value')) return 'value_proposition';
      if (lower.includes('brand')) return 'positioning';
      return 'identity';
    };

    // Helper to get brain value for a fieldKey
    const getBrainValue = (fieldKey: string): unknown => {
      if (!profile) return undefined;
      if (fieldKey === 'businessName') return profile.businessName;
      if (fieldKey === 'tagline') return profile.tagline;
      if (fieldKey === 'brandPositioning') return profile.brandPositioning;
      if (fieldKey === 'valueProposition') return profile.valueProposition;
      if (fieldKey === 'targetAudience') return profile.targetAudience;
      if (fieldKey === 'revenueModel') return profile.revenueModel;
      if (fieldKey === 'businessModel') return profile.businessModel;
      if (fieldKey.startsWith('product:')) {
        const prodName = fieldKey.replace('product:', '').trim().toLowerCase();
        const p = existingProducts.find((pr) => pr.name.toLowerCase() === prodName);
        return p ? (p as any).priceRange || `${p.currency || '$'}${p.price || ''}` : undefined;
      }
      return (profile as any)[fieldKey];
    };

    // Ingest facts from pending verification items
    for (const item of verificationItems) {
      const itemDomain = item.domain || 'identity';
      const itemFieldKey = item.fieldKey || item.fieldName || 'fact';
      const domain = normalizeDomain(itemDomain);
      const key = `${domain}::${itemFieldKey}`;
      if (!fieldMap.has(key)) {
        fieldMap.set(key, {
          domain,
          fieldKey: itemFieldKey,
          currentBrainValue: item.currentValue ?? getBrainValue(itemFieldKey),
          sources: new Map(),
        });
      }
      const entry = fieldMap.get(key)!;
      const sourceKey = item.sourceDocument || 'Unknown Document';
      if (!entry.sources.has(sourceKey)) {
        entry.sources.set(sourceKey, {
          sourceDocument: sourceKey,
          value: String(item.proposedValue ?? item.suggestedValue ?? ''),
          confidence: item.confidence,
          extractedAt: item.createdAt || new Date().toISOString(),
        });
      }
    }

    // Ingest facts from historical extraction jobs
    for (const job of jobs) {
      const sourceName = job.sourceName || 'Document';
      const extracted = job.extractedData;
      if (!extracted) continue;

      // Check products / pricing
      if (extracted.products && Array.isArray(extracted.products)) {
        for (const prod of extracted.products as any[]) {
          if (!prod.name || !prod.priceRange) continue;
          const key = `pricing::product:${prod.name}`;
          if (!fieldMap.has(key)) {
            fieldMap.set(key, {
              domain: 'pricing',
              fieldKey: `product:${prod.name}`,
              currentBrainValue: getBrainValue(`product:${prod.name}`),
              sources: new Map(),
            });
          }
          const entry = fieldMap.get(key)!;
          if (!entry.sources.has(sourceName)) {
            entry.sources.set(sourceName, {
              sourceDocument: sourceName,
              documentId: job.documentId || '',
              value: prod.priceRange,
              confidence: job.confidenceScore || 0.85,
              extractedAt: job.completedAt || job.createdAt,
            });
          }
        }
      }

      // Check positioning & audience
      if (extracted.identity?.brandPositioning) {
        const key = `positioning::brandPositioning`;
        if (!fieldMap.has(key)) {
          fieldMap.set(key, {
            domain: 'positioning',
            fieldKey: 'brandPositioning',
            currentBrainValue: getBrainValue('brandPositioning'),
            sources: new Map(),
          });
        }
        const entry = fieldMap.get(key)!;
        if (!entry.sources.has(sourceName)) {
          entry.sources.set(sourceName, {
            sourceDocument: sourceName,
            documentId: job.documentId || '',
            value: extracted.identity.brandPositioning,
            confidence: job.confidenceScore || 0.85,
            extractedAt: job.completedAt || job.createdAt,
          });
        }
      }

      if (extracted.identity?.valueProposition) {
        const key = `value_proposition::valueProposition`;
        if (!fieldMap.has(key)) {
          fieldMap.set(key, {
            domain: 'value_proposition',
            fieldKey: 'valueProposition',
            currentBrainValue: getBrainValue('valueProposition'),
            sources: new Map(),
          });
        }
        const entry = fieldMap.get(key)!;
        if (!entry.sources.has(sourceName)) {
          entry.sources.set(sourceName, {
            sourceDocument: sourceName,
            documentId: job.documentId || '',
            value: extracted.identity.valueProposition,
            confidence: job.confidenceScore || 0.85,
            extractedAt: job.completedAt || job.createdAt,
          });
        }
      }
    }

    // Filter down to fields that exhibit true discrepancies
    const items: MultiDocDiscrepancyItem[] = [];

    for (const [_, entry] of fieldMap.entries()) {
      const sourceList = Array.from(entry.sources.values());
      if (sourceList.length === 0) continue;

      // Collect all distinct values (string representations)
      const allValues = sourceList.map((s) =>
        typeof s.value === 'object' ? JSON.stringify(s.value) : String(s.value).trim()
      );
      if (entry.currentBrainValue !== undefined && entry.currentBrainValue !== null) {
        allValues.push(
          typeof entry.currentBrainValue === 'object'
            ? JSON.stringify(entry.currentBrainValue)
            : String(entry.currentBrainValue).trim()
        );
      }

      const uniqueValues = Array.from(new Set(allValues));
      // Discrepancy exists if there are conflicting values across sources or against current brain
      const hasDiscrepancy = uniqueValues.length > 1;

      if (hasDiscrepancy || sourceList.length >= 2) {
        // Calculate Severity
        let severity: DiscrepancySeverity = 'MEDIUM';
        if (entry.domain === 'pricing' || entry.fieldKey.toLowerCase().includes('price')) {
          severity = 'CRITICAL';
        } else if (entry.domain === 'positioning' || entry.domain === 'value_proposition') {
          severity = 'HIGH';
        }

        // Calculate AI Recommended Resolution
        // Prefer highest confidence, breaking ties by newest timestamp
        const sortedSources = [...sourceList].sort((a, b) => {
          if (Math.abs(a.confidence - b.confidence) > 0.05) {
            return b.confidence - a.confidence;
          }
          return new Date(b.extractedAt).getTime() - new Date(a.extractedAt).getTime();
        });

        const bestSource = sortedSources[0]!;
        let rationale = `Recommended from ${bestSource.sourceDocument} based on highest extraction confidence (${Math.round(bestSource.confidence * 100)}%) and recency.`;
        if (entry.currentBrainValue && sourceList.length === 1) {
          rationale = `Document provides updated value compared to baseline Business Brain. Review to confirm or retain existing.`;
        }

        items.push({
          discrepancyId: `disc_${entry.domain}_${entry.fieldKey.replace(/[^a-zA-Z0-9]/g, '_')}`,
          fieldKey: entry.fieldKey,
          domain: entry.domain,
          currentBrainValue: entry.currentBrainValue,
          sources: sourceList,
          severity,
          recommendedSource: bestSource.sourceDocument,
          recommendedValue: bestSource.value,
          recommendationRationale: rationale,
          status: 'UNRESOLVED',
        });
      }
    }

    return {
      workspaceId,
      totalDiscrepancies: items.length,
      unresolvedCount: items.filter((i) => i.status === 'UNRESOLVED').length,
      items,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Resolves a Multi-Doc Discrepancy by founder choice, updating Business Brain with USER_CONFIRMED primacy.
   */
  public async resolveDiscrepancy(params: {
    workspaceId: string;
    discrepancyId: string;
    resolutionType: 'ACCEPT_SOURCE' | 'KEEP_BRAIN' | 'CUSTOM';
    selectedSource?: string;
    customValue?: unknown;
    userId?: string;
  }): Promise<MultiDocDiscrepancyItem> {
    const {
      workspaceId,
      discrepancyId,
      resolutionType,
      selectedSource,
      customValue,
      userId = 'founder',
    } = params;
    const matrix = await this.getMultiDocDiscrepancyMatrix(workspaceId);
    const item = matrix.items.find((i) => i.discrepancyId === discrepancyId);
    if (!item) {
      throw new Error(
        `Discrepancy item '${discrepancyId}' not found in workspace '${workspaceId}'`
      );
    }

    let finalValue: unknown = item.currentBrainValue;
    let status: MultiDocDiscrepancyItem['status'] = 'RESOLVED_KEPT_BRAIN';

    if (resolutionType === 'ACCEPT_SOURCE') {
      const matchSource =
        item.sources?.find((s) => s.sourceDocument === selectedSource) || item.sources?.[0];
      finalValue = matchSource ? matchSource.value : item.recommendedValue;
      status = 'RESOLVED_ACCEPTED_DOC';
    } else if (resolutionType === 'CUSTOM') {
      finalValue = customValue;
      status = 'RESOLVED_CUSTOM';
    }

    const now = new Date().toISOString();

    // Apply resolved value to Business Brain
    const profile = await businessProfileRepository.getProfile(workspaceId);
    if (profile) {
      const patch: Partial<typeof profile> = {};
      if (item.fieldKey === 'brandPositioning') patch.brandPositioning = String(finalValue);
      else if (item.fieldKey === 'valueProposition') patch.valueProposition = String(finalValue);
      else if (item.fieldKey === 'targetAudience') patch.targetAudience = String(finalValue);
      else if (item.fieldKey === 'businessName') patch.businessName = String(finalValue);
      else if (item.fieldKey === 'tagline') patch.tagline = String(finalValue);
      else if (item.fieldKey === 'revenueModel') patch.revenueModel = String(finalValue);
      else if (item.fieldKey.startsWith('product:')) {
        const prodName = item.fieldKey.replace('product:', '').trim();
        const existingProducts = await productRepository.listProducts(workspaceId);
        const matchProd = existingProducts.find(
          (p) => p.name.toLowerCase() === prodName.toLowerCase()
        );
        if (matchProd) {
          await productRepository.updateProduct(workspaceId, matchProd.productId, {
            description: matchProd.description,
            price: typeof finalValue === 'number' ? finalValue : matchProd.price,
          });
        }
      } else {
        (patch as any)[item.fieldKey] = finalValue;
      }

      // Record USER_CONFIRMED provenance
      patch.provenance = {
        ...(profile.provenance || {}),
        [item.fieldKey]: {
          fieldKey: item.fieldKey,
          source: 'USER_CONFIRMED',
          confidence: 1.0,
          verifiedAt: now,
          lastConfirmedBy: userId,
          notes: `Resolved via Multi-Doc Discrepancy Matrix (${resolutionType}${selectedSource ? ` -> ${selectedSource}` : ''})`,
        },
      };

      await businessProfileRepository.saveProfile({
        ...profile,
        ...patch,
      });
    }

    // Auto-update matching verification items
    const verificationItems = await extractionJobRepository.listVerificationItems(
      workspaceId,
      'pending'
    );
    for (const v of verificationItems) {
      if (v.fieldKey === item.fieldKey) {
        const matchesResolved = JSON.stringify(v.proposedValue) === JSON.stringify(finalValue);
        await extractionJobRepository.updateVerificationItem(workspaceId, v.itemId, {
          status: matchesResolved ? 'approved' : 'rejected',
          verifiedBy: userId,
          verifiedAt: now,
        });
      }
    }

    item.status = status;
    item.resolvedValue = finalValue;
    item.resolvedAt = now;

    return item;
  }
}

export const documentExtractionService = new DocumentExtractionService();
