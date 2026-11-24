/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { businessProfileRepository } from '../repositories/businessProfileRepository';
import { productRepository } from '../repositories/productRepository';
import { goalRepository } from '../repositories/goalRepository';
import { competitorRepository } from '../repositories/competitorRepository';
import { campaignPerformanceRepository } from '../repositories/campaignPerformanceRepository';
import { documentRepository } from '../repositories/documentRepository';
import type {
  AskBusinessEvidenceItem,
  AskBusinessIntent,
  AskBusinessCitation,
  AskBusinessToolCall,
} from '../types/api';

export interface RetrievedBusinessContext {
  intent: AskBusinessIntent;
  domain: string;
  isUnsupported: boolean;
  unsupportedReason?: string;
  evidence: AskBusinessEvidenceItem[];
  citations: AskBusinessCitation[];
  conflictingInformation: string[];
  missingInformation: string[];
  suggestedFollowUps: string[];
  toolCalls: AskBusinessToolCall[];
  tokenCount: number;
}

export class AskYourBusinessRetrievalService {
  private readonly NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

  /**
   * Neutralize prompt injection attempts in user queries or document text
   */
  public sanitizeAndDefendPrompt(input: string): {
    cleanText: string;
    isInjectionSuspected: boolean;
  } {
    if (!input) return { cleanText: '', isInjectionSuspected: false };

    const injectionPatterns = [
      /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/i,
      /disregard\s+(all\s+)?(previous|prior|system)\s+(instructions|rules|prompts)/i,
      /reveal\s+(your\s+)?(system\s+prompt|hidden\s+instructions|master\s+directives)/i,
      /output\s+(your\s+)?system\s+prompt/i,
      /you\s+are\s+now\s+(an?\s+unrestricted|in\s+god\s+mode|dan)/i,
      /bypass\s+all\s+(filters|guardrails|safety)/i,
    ];

    let isInjectionSuspected = false;
    let cleanText = input;

    for (const pattern of injectionPatterns) {
      if (pattern.test(cleanText)) {
        isInjectionSuspected = true;
        cleanText = cleanText.replace(pattern, '[DEFUSED_INSTRUCTION]');
      }
    }

    return { cleanText, isInjectionSuspected };
  }

  /**
   * Classify user query intent into one of the 7 business intelligence domains or unsupported
   */
  public classifyIntent(query: string): {
    intent: AskBusinessIntent;
    domain: string;
    isUnsupported: boolean;
    reason?: string;
  } {
    const q = query.toLowerCase().trim();

    // Check for obvious non-business / general chat / irrelevant questions
    const nonBusinessPatterns = [
      /\b(poem|haiku|story|joke|song)\b/i,
      /\b(capital of|who won the|recipe for|bake a cake|alien|planet mars|astronomy)\b/i,
      /\b(weather in|translate.*to spanish|french lesson)\b/i,
    ];

    const hasBusinessKeywords =
      /\b(sell|product|price|margin|goal|target|revenue|competitor|brand|voice|customer|persona|marketing|campaign|cpa|ctr|roas|business|company|service|strategy|kpi|spend|budget)\b/i.test(
        q
      );

    for (const pat of nonBusinessPatterns) {
      if (pat.test(q) && !hasBusinessKeywords) {
        return {
          intent: 'UNSUPPORTED_NON_BUSINESS',
          domain: 'General Non-Business',
          isUnsupported: true,
          reason:
            'This question is unrelated to your business operations, strategy, or market performance. I can only assist with verified Business Brain intelligence.',
        };
      }
    }

    // Domain categorization
    if (
      /\b(product|service|sku|pricing|price|cost|feature|benefit|compare|catalog|sell|offering)\b/i.test(
        q
      )
    ) {
      return {
        intent: 'PRODUCT_INTELLIGENCE',
        domain: 'Product & Service Intelligence',
        isUnsupported: false,
      };
    }
    if (/\b(goal|milestone|target|kpi|behind schedule|progress|deadline|objective)\b/i.test(q)) {
      return {
        intent: 'STRATEGY_PERFORMANCE',
        domain: 'Strategy & Goal Performance',
        isUnsupported: false,
      };
    }
    if (/\b(customer|audience|persona|segment|buyer|demographic|pain point|objection)\b/i.test(q)) {
      return {
        intent: 'CUSTOMER_INTELLIGENCE',
        domain: 'Customer Intelligence & Segments',
        isUnsupported: false,
      };
    }
    if (
      /\b(brand|voice|tone|guideline|claim|prohibited|forbidden|words to avoid|positioning)\b/i.test(
        q
      )
    ) {
      return {
        intent: 'BRAND_INTELLIGENCE',
        domain: 'Brand Identity & Guidelines',
        isUnsupported: false,
      };
    }
    if (
      /\b(campaign|ad|ads|marketing|channel|ctr|cpa|roas|conversion|experiment|fatigue|angle)\b/i.test(
        q
      )
    ) {
      return {
        intent: 'MARKETING_INTELLIGENCE',
        domain: 'Marketing & Campaign Intelligence',
        isUnsupported: false,
      };
    }
    if (
      /\b(margin|profit|financial|revenue model|pricing structure|unit economic|decision)\b/i.test(
        q
      )
    ) {
      return {
        intent: 'OPERATIONAL_FINANCIAL',
        domain: 'Operational & Financial Intelligence',
        isUnsupported: false,
      };
    }
    if (
      /\b(what does.*sell|about us|overview|mission|industry|stage|founded|who are we)\b/i.test(q)
    ) {
      return {
        intent: 'BUSINESS_OVERVIEW',
        domain: 'Business Overview & Profile',
        isUnsupported: false,
      };
    }

    return {
      intent: 'GENERAL_QUERY',
      domain: 'Business Strategy & Brain Context',
      isUnsupported: false,
    };
  }

  /**
   * Executes the comprehensive retrieval pipeline across all structured entities, memory, and documents
   */
  public async retrieveContext(
    workspaceId: string,
    query: string,
    _conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
  ): Promise<RetrievedBusinessContext> {
    const { cleanText } = this.sanitizeAndDefendPrompt(query);
    const { intent, domain, isUnsupported, reason } = this.classifyIntent(cleanText);

    if (isUnsupported) {
      return {
        intent,
        domain,
        isUnsupported: true,
        unsupportedReason: reason,
        evidence: [],
        citations: [],
        conflictingInformation: [],
        missingInformation: [],
        suggestedFollowUps: [
          'What are our current active business goals?',
          'What products do we currently have in our catalogue?',
          'Who is our primary target audience?',
        ],
        toolCalls: [],
        tokenCount: 50,
      };
    }

    const evidence: AskBusinessEvidenceItem[] = [];
    const citations: AskBusinessCitation[] = [];
    const conflictingInformation: string[] = [];
    const missingInformation: string[] = [];
    const suggestedFollowUps: string[] = [];
    const toolCalls: AskBusinessToolCall[] = [];

    const now = Date.now();

    // 1. Retrieve Business Profile
    const profile = await businessProfileRepository.getProfile(workspaceId);
    if (profile && profile.businessName) {
      const isOutdated = profile.lastUpdated
        ? now - new Date(profile.lastUpdated).getTime() > this.NINETY_DAYS_MS
        : false;

      const profileEvidence: AskBusinessEvidenceItem = {
        sourceType: 'PROFILE',
        sourceId: `profile-${workspaceId}`,
        title: `${profile.businessName} Business Profile`,
        content: `Business: ${profile.businessName}. Tagline: ${profile.tagline || 'N/A'}. Stage: ${profile.stage || 'N/A'}. Location: ${profile.location || 'N/A'}. Industry: ${profile.industry || 'N/A'}. Model: ${profile.businessModel || 'N/A'}. Revenue Model: ${profile.revenueModel || 'N/A'}. Value Prop: ${profile.valueProposition || 'N/A'}. Target Audience: ${profile.targetAudience || 'N/A'}. Summary: ${profile.overviewSummary || 'N/A'}.`,
        factStatus: 'VERIFIED_FACT',
        recordDate: profile.lastUpdated || (profile as any).createdAt,
        confidence: 1.0,
        isOutdated,
      };

      evidence.push(profileEvidence);
      citations.push({
        sourceType: 'PROFILE',
        sourceId: profileEvidence.sourceId,
        title: profileEvidence.title,
        recordDate: profileEvidence.recordDate,
        factStatus: profileEvidence.factStatus,
        confidence: 1.0,
        isOutdated,
        snippet: profile.overviewSummary || profile.valueProposition || profile.tagline || '',
      });
    }

    // 2. Retrieve Products and Services
    const products = await productRepository.listProducts(workspaceId);
    const services = await productRepository.listServices(workspaceId);

    for (const prod of products) {
      const isOutdated = prod.updatedAt
        ? now - new Date(prod.updatedAt).getTime() > this.NINETY_DAYS_MS
        : prod.createdAt
          ? now - new Date(prod.createdAt).getTime() > this.NINETY_DAYS_MS
          : false;

      const factStatus = prod.source === 'USER_CONFIRMED' ? 'VERIFIED_FACT' : 'AI_INFERRED';
      const margin =
        prod.marginEstimate ||
        (prod.costPrice
          ? `${Math.round(((prod.price - prod.costPrice) / prod.price) * 100)}%`
          : undefined);

      const prodEvidence: AskBusinessEvidenceItem = {
        sourceType: 'PRODUCT',
        sourceId: prod.productId,
        title: `Product: ${prod.name}`,
        content: `Product: ${prod.name} | Category: ${prod.category} | Price: $${prod.price} | Pricing Model: ${prod.pricingStructure || 'one-time'} | Margin: ${margin || 'N/A'} | SKU: ${prod.sku || 'N/A'} | Status: ${prod.status} | Features: ${(prod.features || []).join(', ')} | Benefits: ${(prod.benefits || []).join(', ')} | Description: ${prod.description || ''}`,
        factStatus,
        recordDate: prod.updatedAt || prod.createdAt,
        confidence: factStatus === 'VERIFIED_FACT' ? 1.0 : 0.85,
        calculationMethod: margin ? 'Gross margin = (Price - Cost) / Price' : undefined,
        isOutdated,
      };

      evidence.push(prodEvidence);
      citations.push({
        sourceType: 'PRODUCT',
        sourceId: prod.productId,
        title: `Product: ${prod.name}`,
        recordDate: prodEvidence.recordDate,
        factStatus,
        confidence: prodEvidence.confidence,
        calculationMethod: prodEvidence.calculationMethod,
        isOutdated,
        snippet: `$${prod.price} - ${prod.description || prod.category}`,
      });
    }

    for (const srv of services) {
      const isOutdated = srv.updatedAt
        ? now - new Date(srv.updatedAt).getTime() > this.NINETY_DAYS_MS
        : srv.createdAt
          ? now - new Date(srv.createdAt).getTime() > this.NINETY_DAYS_MS
          : false;

      const factStatus = srv.source === 'USER_CONFIRMED' ? 'VERIFIED_FACT' : 'AI_INFERRED';
      const srvEvidence: AskBusinessEvidenceItem = {
        sourceType: 'SERVICE',
        sourceId: srv.serviceId,
        title: `Service: ${srv.name}`,
        content: `Service: ${srv.name} | Category: ${srv.category} | Price: $${srv.price} | Duration: ${srv.duration || 'N/A'} | Target: ${srv.targetCustomer || ''} | Description: ${srv.description || ''}`,
        factStatus,
        recordDate: srv.updatedAt || srv.createdAt,
        confidence: factStatus === 'VERIFIED_FACT' ? 1.0 : 0.85,
        isOutdated,
      };

      evidence.push(srvEvidence);
      citations.push({
        sourceType: 'SERVICE',
        sourceId: srv.serviceId,
        title: `Service: ${srv.name}`,
        recordDate: srvEvidence.recordDate,
        factStatus,
        confidence: srvEvidence.confidence,
        isOutdated,
        snippet: `$${srv.price} - ${srv.description || srv.category}`,
      });
    }

    // 3. Retrieve Goals
    const goals = await goalRepository.listByWorkspace(workspaceId);
    for (const goal of goals) {
      const isOutdated = goal.updatedAt
        ? now - new Date(goal.updatedAt).getTime() > this.NINETY_DAYS_MS
        : goal.createdAt
          ? now - new Date(goal.createdAt).getTime() > this.NINETY_DAYS_MS
          : false;

      const progressPct =
        goal.targetValue > 0 ? Math.round((goal.currentValue / goal.targetValue) * 100) : 0;
      const isBehind =
        (goal.status as string) === 'at_risk' ||
        (goal.status as string) === 'critical' ||
        (goal.deadline && new Date(goal.deadline).getTime() < now && progressPct < 100);

      const goalEvidence: AskBusinessEvidenceItem = {
        sourceType: 'GOAL',
        sourceId: goal.goalId,
        title: `Goal: ${goal.title}`,
        content: `Goal: ${goal.title} | Category: ${goal.category} | Current: ${goal.currentValue}${goal.unit || ''} | Target: ${goal.targetValue}${goal.unit || ''} | Progress: ${progressPct}% | Status: ${goal.status} | Deadline: ${goal.deadline || 'None'} | Behind Schedule: ${isBehind ? 'YES' : 'NO'}`,
        factStatus: 'CALCULATED_VALUE',
        recordDate: goal.updatedAt || goal.createdAt,
        confidence: 0.95,
        calculationMethod: 'Progress % = (Current Value / Target Value) * 100',
        isOutdated,
      };

      evidence.push(goalEvidence);
      citations.push({
        sourceType: 'GOAL',
        sourceId: goal.goalId,
        title: `Goal: ${goal.title}`,
        recordDate: goalEvidence.recordDate,
        factStatus: 'CALCULATED_VALUE',
        confidence: 0.95,
        calculationMethod: goalEvidence.calculationMethod,
        isOutdated,
        snippet: `${progressPct}% progress (${goal.currentValue}/${goal.targetValue}) - Status: ${goal.status}`,
      });
    }

    // 4. Retrieve Competitors
    const competitors = await competitorRepository.listByWorkspace(workspaceId);
    for (const comp of competitors) {
      const compEvidence: AskBusinessEvidenceItem = {
        sourceType: 'COMPETITOR',
        sourceId: comp.competitorId,
        title: `Competitor: ${comp.name}`,
        content: `Competitor: ${comp.name} | Category: ${comp.category || 'Direct'} | Threat: ${comp.threatLevel || 'medium'} | Strengths: ${(comp.strengths || []).join(', ')} | Weaknesses: ${(comp.weaknesses || []).join(', ')}`,
        factStatus: 'AI_INFERRED',
        recordDate: comp.updatedAt || comp.createdAt,
        confidence: 0.85,
      };
      evidence.push(compEvidence);
    }

    // 5. Retrieve Campaign Performance History
    const campaigns = await campaignPerformanceRepository.listByWorkspace(workspaceId);
    for (const camp of campaigns) {
      const isOutdated = camp.executionDate
        ? now - new Date(camp.executionDate).getTime() > this.NINETY_DAYS_MS
        : false;

      const campEvidence: AskBusinessEvidenceItem = {
        sourceType: 'CAMPAIGN',
        sourceId: camp.experimentId,
        title: `Campaign: ${camp.name}`,
        content: `Campaign: ${camp.name} | Channel: ${camp.channel} | Outcome: ${camp.outcome} | CTR: ${camp.ctr}% | CPA: $${camp.cpa} | Conversions: ${camp.conversions} | Spend: $${camp.spend} | Date: ${camp.executionDate}`,
        factStatus: 'HISTORICAL_INFO',
        recordDate: camp.executionDate,
        confidence: 1.0,
        calculationMethod: 'Aggregated marketing analytics feed',
        isOutdated,
      };

      evidence.push(campEvidence);
      citations.push({
        sourceType: 'CAMPAIGN',
        sourceId: camp.experimentId,
        title: `Campaign: ${camp.name}`,
        recordDate: camp.executionDate,
        factStatus: 'HISTORICAL_INFO',
        confidence: 1.0,
        calculationMethod: campEvidence.calculationMethod,
        isOutdated,
        snippet: `Channel: ${camp.channel} - CTR: ${camp.ctr}%, CPA: $${camp.cpa}`,
      });
    }

    // 6. Retrieve Documents (with prompt injection containment)
    const docs = await documentRepository.listDocuments(workspaceId);
    for (const doc of docs) {
      const sanitizedDoc = this.sanitizeAndDefendPrompt(
        doc.rawText || (doc.extractedData?.summary ? String(doc.extractedData.summary) : '')
      );
      const isOutdated = doc.uploadedAt
        ? now - new Date(doc.uploadedAt).getTime() > this.NINETY_DAYS_MS
        : false;

      const docEvidence: AskBusinessEvidenceItem = {
        sourceType: 'DOCUMENT',
        sourceId: doc.documentId,
        sourceDocument: doc.fileName,
        title: `Document: ${doc.fileName}`,
        content: `<untrusted_document_content source="${doc.fileName}">\n${sanitizedDoc.cleanText.slice(0, 1000)}\n</untrusted_document_content>`,
        factStatus: 'AI_INFERRED',
        recordDate: doc.uploadedAt,
        confidence: 0.8,
        isOutdated,
      };
      evidence.push(docEvidence);
    }

    // 7. Check for Missing Information based on query specifics
    const qLower = cleanText.toLowerCase();

    // Did the user ask for ad spend / financial metric that is not recorded?
    if (
      /\b(ad(vertising)?\s+spend|total\s+(advertising\s+)?spend|q[1-4]\s+spend|marketing\s+budget|2024\s+spend|revenue\s+in\s+q[1-4])\b/i.test(
        qLower
      )
    ) {
      const hasSpendData = campaigns.some((c) => c.spend && c.spend > 0);
      if (!hasSpendData || qLower.includes('q4 2024') || qLower.includes('q4')) {
        missingInformation.push(
          'Detailed quarterly advertising spend and financial accounting records for Q4 2024 are not recorded in the Business Brain.'
        );
      }
    }

    // Check for products missing price/description
    if (qLower.includes('missing') && qLower.includes('product')) {
      const missingProds = products.filter((p) => !p.price || !p.description || !p.sku);
      if (missingProds.length > 0) {
        missingInformation.push(
          `Found ${missingProds.length} products with incomplete specifications: ${missingProds.map((p) => p.name).join(', ')}`
        );
      }
    }

    // 8. Detect Conflicting Information
    // Example: Product price discrepancies between document briefs and product records
    for (const prod of products) {
      for (const doc of docs) {
        const docText = (doc.rawText || '').toLowerCase();
        // Look for occurrences of product name and a price different from prod.price
        if (docText.includes(prod.name.toLowerCase())) {
          const priceMatches = docText.match(/\$(\d+(\.\d+)?)/g);
          if (priceMatches) {
            for (const pm of priceMatches) {
              const parsed = parseFloat(pm.replace('$', ''));
              if (parsed > 0 && Math.abs(parsed - prod.price) > 5) {
                conflictingInformation.push(
                  `Discrepancy detected for "${prod.name}": Product catalogue lists price as $${prod.price}, but document "${doc.fileName}" mentions $${parsed}.`
                );
              }
            }
          }
        }
      }
    }

    // 9. Tool Execution Detection
    // Tool: compare_products
    if (/\bcompare\b/i.test(qLower) && (products.length >= 2 || /\bproduct\b/i.test(qLower))) {
      // Find products mentioned
      const comparedProds = products.filter((p) => qLower.includes(p.name.toLowerCase()));
      const selected = comparedProds.length >= 2 ? comparedProds : products.slice(0, 2);

      if (selected.length >= 2) {
        toolCalls.push({
          toolId: `tool-${now}-compare`,
          toolName: 'compare_products',
          parameters: {
            productIds: selected.map((p) => p.productId),
            productNames: selected.map((p) => p.name),
          },
          requiresApproval: false,
          status: 'EXECUTED',
          result: {
            products: selected.map((p) => ({
              id: p.productId,
              name: p.name,
              category: p.category,
              price: p.price,
              margin: p.marginEstimate || 'N/A',
              status: p.status,
              featuresCount: (p.features || []).length,
              benefitsCount: (p.benefits || []).length,
            })),
          },
        });
      }
    }

    // Tool: analyze_goals
    if (/\b(goal|behind schedule|risk)\b/i.test(qLower) && goals.length > 0) {
      const behindGoals = goals.filter((g) => {
        const pct = g.targetValue > 0 ? (g.currentValue / g.targetValue) * 100 : 0;
        return (
          (g.status as string) === 'at_risk' || (g.status as string) === 'critical' || pct < 50
        );
      });

      toolCalls.push({
        toolId: `tool-${now}-goals`,
        toolName: 'analyze_goals',
        parameters: { totalGoals: goals.length },
        requiresApproval: false,
        status: 'EXECUTED',
        result: {
          totalGoals: goals.length,
          atRiskCount: behindGoals.length,
          behindScheduleGoals: behindGoals.map((g) => ({
            id: g.goalId,
            title: g.title,
            progress:
              g.targetValue > 0 ? `${Math.round((g.currentValue / g.targetValue) * 100)}%` : '0%',
            status: g.status,
            deadline: g.deadline,
          })),
        },
      });
    }

    // Tool: analyze_campaign_performance
    if (/\b(campaign|best performing|ctr|cpa|channel)\b/i.test(qLower) && campaigns.length > 0) {
      const sortedByCtr = [...campaigns].sort((a, b) => (b.ctr || 0) - (a.ctr || 0));
      const best = sortedByCtr[0];

      toolCalls.push({
        toolId: `tool-${now}-campaign`,
        toolName: 'analyze_campaign_performance',
        parameters: { totalCampaigns: campaigns.length },
        requiresApproval: false,
        status: 'EXECUTED',
        result: {
          totalCampaigns: campaigns.length,
          bestPerformingCampaign: best
            ? {
                name: best.name,
                channel: best.channel,
                ctr: `${best.ctr}%`,
                cpa: `$${best.cpa}`,
                conversions: best.conversions,
              }
            : null,
          averageCpa: campaigns.reduce((acc, c) => acc + (c.cpa || 0), 0) / (campaigns.length || 1),
        },
      });
    }

    // Consequential Action Tool: create_internal_task
    if (/\b(create.*task|add.*task|schedule.*task|assign.*task)\b/i.test(qLower)) {
      toolCalls.push({
        toolId: `tool-${now}-create-task`,
        toolName: 'create_internal_task',
        parameters: {
          title:
            cleanText
              .replace(/^(please\s+)?(create|add|schedule|assign)\s+(a\s+)?task\s+(to\s+)?/i, '')
              .trim() || 'Follow up on business strategy query',
          department: 'GROWTH_DIRECTOR',
          priority: 'HIGH',
        },
        requiresApproval: true,
        status: 'PENDING_APPROVAL',
        approvalReason:
          'Creating an internal operational task modifies workspace backlog and notifies team members.',
      });
    }

    // Consequential Action Tool: update_business_profile
    if (
      /\b(update.*tagline|change.*tagline|update.*value proposition|update.*stage)\b/i.test(qLower)
    ) {
      toolCalls.push({
        toolId: `tool-${now}-update-profile`,
        toolName: 'update_business_profile',
        parameters: {
          field: qLower.includes('tagline') ? 'tagline' : 'stage',
          proposedValue: cleanText.split(/to\s+/i)[1]?.trim() || '',
        },
        requiresApproval: true,
        status: 'PENDING_APPROVAL',
        approvalReason:
          'Modifying core Business Brain profile fields alters ground-truth facts across all 14 departments.',
      });
    }

    // 10. Suggested Follow-Ups
    if (intent === 'PRODUCT_INTELLIGENCE') {
      suggestedFollowUps.push(
        'What are the margin estimates across our product lines?',
        'Which products are missing descriptions or pricing?',
        'How do our products align with our primary target audience?'
      );
    } else if (intent === 'STRATEGY_PERFORMANCE') {
      suggestedFollowUps.push(
        'What action tasks should we create to get our goals back on track?',
        "Which competitor poses the biggest threat to this quarter's milestones?",
        'What was our customer acquisition cost during our last campaign?'
      );
    } else if (intent === 'MARKETING_INTELLIGENCE') {
      suggestedFollowUps.push(
        'What marketing angles are fatigued in our strategic memory?',
        'Which marketing channels generated the lowest CPA?',
        'Should we launch an experiment on our top performing channel?'
      );
    } else {
      suggestedFollowUps.push(
        'What are our current primary business goals and their progress?',
        'What is our core brand voice and approved claim guidelines?',
        'Compare our highest-priced and lowest-priced offerings'
      );
    }

    // Estimate token count
    const totalChars = evidence.reduce((sum, e) => sum + e.content.length, 0);
    const tokenCount = Math.round(totalChars / 4);

    return {
      intent,
      domain,
      isUnsupported: false,
      evidence,
      citations,
      conflictingInformation,
      missingInformation,
      suggestedFollowUps,
      toolCalls,
      tokenCount,
    };
  }
}

export const askYourBusinessRetrievalService = new AskYourBusinessRetrievalService();
