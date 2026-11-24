/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from '@google/genai';
import { serverConfig } from '../config/index';
import { creditService } from './creditService';
import { executeTruthCheck } from '../../utils/truthCheck';
import { buildAntiFatiguePromptDirectives } from '../../utils/strategicMemory';
import { researchRepository } from '../repositories/researchRepository';
import { brandAssetRepository } from '../repositories/brandAssetRepository';
import { businessProfileRepository } from '../repositories/businessProfileRepository';
import type { ResearchReportEntity, BrandAssetEntity } from '../types/api';

function getGeminiClient(): GoogleGenAI | null {
  if (
    process.env.NODE_ENV === 'test' ||
    process.env.TEST_MODE === 'true' ||
    process.env.NODE_TEST_CONTEXT !== undefined ||
    serverConfig.isTest ||
    !serverConfig.geminiApiKey
  ) {
    return null;
  }
  return new GoogleGenAI({
    apiKey: serverConfig.geminiApiKey,
    httpOptions: {
      timeout: 25000,
      headers: { 'User-Agent': 'brainwise-backend' },
    },
  });
}

async function withTimeout<T>(promise: Promise<T>, ms = 22000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`AI generation timed out after ${Math.round(ms / 1000)}s`));
        }, ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export class AiOrchestrationService {
  /**
   * Generates a commercial TAM/SAM/SOM research dossier
   * Feature: FEAT-RES-001 (8 Credits)
   */
  public async generateDossier(params: {
    workspaceId: string;
    userId: string;
    ideaSummary: string;
    industry: string;
    targetMarket: string;
    geography: string;
    depth?: 'Quick Scan' | 'Full Dossier' | 'Deep Dive';
    idempotencyKey?: string;
  }): Promise<{
    report: ResearchReportEntity;
    truthScore: number;
    creditsDeducted: number;
    creditBalanceRemaining: number;
    modelUsed: string;
  }> {
    const { workspaceId, userId, ideaSummary, industry, targetMarket, geography } = params;
    const featureId = 'FEAT-RES-001';

    // 1. Phase 1: Two-Phase Credit Reservation Hold
    const reservation = await creditService
      .reserveCredits({
        workspaceId,
        userId,
        featureId,
        idempotencyKey: params.idempotencyKey,
      })
      .catch((err) => {
        throw new Error(
          `BILLING_ERROR: ${err instanceof Error ? err.message : 'Credit reservation failed'}`,
          { cause: err }
        );
      });

    // 2. Load Business Profile for fact grounding & anti-fatigue
    const profile = await businessProfileRepository.getProfile(workspaceId);

    const client = getGeminiClient();
    let reportData: Partial<ResearchReportEntity>;
    let modelUsed = serverConfig.geminiModel;

    try {
      if (client) {
        const prompt = [
          'You are BrainWise Idea Intelligence, a disciplined strategy analyst.',
          'Generate a commercial validation dossier strictly grounded in honest range estimates.',
          `Concept: ${ideaSummary}`,
          `Industry: ${industry}`,
          `Target Market: ${targetMarket}`,
          `Geography: ${geography}`,
          profile ? `Business Context: ${profile.businessName} (${profile.stage})` : '',
          profile?.strategicMemory ? buildAntiFatiguePromptDirectives(profile.strategicMemory) : '',
          'Return realistic numeric assumptions: tamBillion between 0.5 and 25, samSharePct between 4 and 30, somSharePct between 0.4 and 5.',
        ]
          .filter(Boolean)
          .join('\n');

        const response = await withTimeout(
          client.models.generateContent({
            model: serverConfig.geminiModel,
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  executiveSummary: { type: Type.STRING },
                  tamBillion: { type: Type.NUMBER },
                  samSharePct: { type: Type.NUMBER },
                  somSharePct: { type: Type.NUMBER },
                  cagr: { type: Type.STRING },
                  growthDrivers: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ['title', 'executiveSummary', 'tamBillion', 'samSharePct', 'somSharePct'],
              },
            },
          })
        );

        const text = response.text || '{}';
        const parsed = JSON.parse(text);
        const tamBillion = Number(parsed.tamBillion) || 4.2;
        const samSharePct = Number(parsed.samSharePct) || 12;
        const somSharePct = Number(parsed.somSharePct) || 1.8;

        reportData = {
          title: parsed.title || `${ideaSummary} Commercial Validation`,
          subtitle: `${industry} in ${geography}`,
          executiveSummary:
            parsed.executiveSummary ||
            'Validation indicates commercial viability within addressable segment.',
          tamBillion,
          samSharePct,
          somSharePct,
          tamValue: `$${tamBillion.toFixed(1)}B`,
          samValue: `$${(tamBillion * (samSharePct / 100) * 1000).toFixed(0)}M`,
          somValue: `$${(tamBillion * (samSharePct / 100) * (somSharePct / 100) * 1000).toFixed(1)}M`,
          cagr: parsed.cagr || '14.2%',
          growthDrivers: parsed.growthDrivers || [
            'Expanding digital consumer adoption',
            'Demand for premium craft quality',
          ],
        };
      } else {
        // Deterministic fallback when Gemini API key is not configured (e.g. testing)
        modelUsed = 'deterministic-fallback';
        reportData = {
          title: `${ideaSummary} Market Dossier`,
          subtitle: `${industry} in ${geography}`,
          executiveSummary: `Commercial assessment for ${ideaSummary} indicates a viable addressable market with disciplined acquisition.`,
          tamBillion: 3.8,
          samSharePct: 14.5,
          somSharePct: 2.1,
          tamValue: '$3.8B',
          samValue: '$551M',
          somValue: '$11.6M',
          cagr: '13.8%',
          growthDrivers: ['Direct-to-consumer shift', 'Quality differentiation'],
        };
      }

      // 3. Truth Check Guardrail Verification
      const truthCheckResult = executeTruthCheck(
        reportData.executiveSummary || '',
        (profile as any) || {}
      );

      if (!truthCheckResult.isValid && truthCheckResult.violations.length > 0) {
        // Auto-refund credits on severe truth violation
        await creditService.refundCredits({
          workspaceId,
          reservation,
          reason: `TruthCheck violation: ${truthCheckResult.violations.map((v) => v.expectedFact).join('; ')}`,
        });
        throw new Error(
          `TRUTH_CHECK_FAILED: Generated dossier contained unverified facts: ${truthCheckResult.violations[0].expectedFact}`
        );
      }

      // 4. Phase 2A: Commit Credits
      const settlement = await creditService.settleCredits({
        workspaceId,
        reservation,
        featureId,
        notes: `Market Dossier: ${reportData.title}`,
      });

      // 5. Persist Research Report Entity
      const reportId = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const now = new Date().toISOString();
      const report: ResearchReportEntity = {
        reportId,
        workspaceId,
        title: reportData.title || `${ideaSummary} Dossier`,
        subtitle: reportData.subtitle || `${industry} · ${geography}`,
        reportType: 'TAM_SAM_SOM',
        depth: params.depth || 'Full Dossier',
        executiveSummary: reportData.executiveSummary || '',
        tamValue: reportData.tamValue,
        samValue: reportData.samValue,
        somValue: reportData.somValue,
        tamBillion: reportData.tamBillion,
        samSharePct: reportData.samSharePct,
        somSharePct: reportData.somSharePct,
        cagr: reportData.cagr,
        growthDrivers: reportData.growthDrivers,
        isSavedToBrain: true,
        status: 'completed',
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      };

      await researchRepository.create(report);

      return {
        report,
        truthScore: truthCheckResult.truthScore,
        creditsDeducted: 8,
        creditBalanceRemaining: settlement.remainingBalance,
        modelUsed,
      };
    } catch (err) {
      // 4. Phase 2B: Automatic Rollback Refund on Upstream Error
      if (reservation && reservation.status === 'HOLD') {
        await creditService.refundCredits({
          workspaceId,
          reservation,
          reason: `Upstream AI Failure: ${err instanceof Error ? err.message : 'Unknown error'}`,
        });
      }
      throw err;
    }
  }

  /**
   * Generates a brand vector SVG asset
   * Feature: FEAT-BRD-001 (5 Credits)
   * STRICT VIDEO EXCLUSION: SVG ONLY
   */
  public async generateBrandAssetSvg(params: {
    workspaceId: string;
    userId: string;
    name: string;
    category: BrandAssetEntity['category'];
    conceptPrompt: string;
    idempotencyKey?: string;
  }): Promise<{
    asset: BrandAssetEntity;
    creditsDeducted: number;
    creditBalanceRemaining: number;
    modelUsed: string;
  }> {
    const { workspaceId, userId, name, category, conceptPrompt } = params;
    const featureId = 'FEAT-BRD-001';

    const reservation = await creditService
      .reserveCredits({
        workspaceId,
        userId,
        featureId,
        idempotencyKey: params.idempotencyKey,
      })
      .catch((err) => {
        throw new Error(
          `BILLING_ERROR: ${err instanceof Error ? err.message : 'Credit reservation failed'}`,
          { cause: err }
        );
      });

    try {
      const profile = await businessProfileRepository.getProfile(workspaceId);
      const client = getGeminiClient();
      let svgContent = '';
      let modelUsed = serverConfig.geminiModel;

      if (client) {
        const prompt = [
          'You are BrainWise Brand Studio, a master vector design engine.',
          'Generate clean, valid, standalone SVG vector code.',
          `Brand: ${profile?.businessName || name}`,
          `Category: ${category}`,
          `Design Brief: ${conceptPrompt}`,
          'STRICT MANDATE: Return ONLY a valid <svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">...</svg> document. No markdown formatting, no comments, no scripts, no HTML.',
        ].join('\n');

        const response = await withTimeout(
          client.models.generateContent({
            model: serverConfig.geminiModel,
            contents: prompt,
          })
        );

        let rawSvg = response.text || '';
        rawSvg = rawSvg.replace(/```xml|```svg|```/gi, '').trim();
        const startIdx = rawSvg.indexOf('<svg');
        const endIdx = rawSvg.lastIndexOf('</svg>');
        if (startIdx >= 0 && endIdx > startIdx) {
          svgContent = rawSvg.slice(startIdx, endIdx + 6);
        } else {
          svgContent = `<svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg"><rect width="800" height="600" fill="#18181B"/><text x="400" y="300" fill="#E4E4E7" font-family="sans-serif" font-size="28" text-anchor="middle">${name}</text></svg>`;
        }
      } else {
        modelUsed = 'deterministic-svg-engine';
        svgContent = `<svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#FF6B35"/><stop offset="100%" stop-color="#1E293B"/></linearGradient></defs><rect width="800" height="600" fill="url(#g)" rx="16"/><text x="400" y="310" fill="#FFFFFF" font-family="Cinzel, serif" font-size="36" font-weight="bold" text-anchor="middle">${name}</text></svg>`;
      }

      // Settle credits
      const settlement = await creditService.settleCredits({
        workspaceId,
        reservation,
        featureId,
        notes: `Brand Asset: ${name} (${category})`,
      });

      // Persist Asset Entity
      const assetId = `ast_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const now = new Date().toISOString();
      const storagePath = `workspaces/${workspaceId}/brand/${assetId}.svg`;

      const asset: BrandAssetEntity = {
        assetId,
        workspaceId,
        name,
        category,
        assetType: 'svg',
        storagePath,
        fileSize: Buffer.byteLength(svgContent, 'utf-8'),
        mimeType: 'image/svg+xml',
        svgContent,
        version: 1,
        status: 'active',
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      };

      await brandAssetRepository.create(asset);

      return {
        asset,
        creditsDeducted: 5,
        creditBalanceRemaining: settlement.remainingBalance,
        modelUsed,
      };
    } catch (err) {
      if (reservation && reservation.status === 'HOLD') {
        await creditService.refundCredits({
          workspaceId,
          reservation,
          reason: `Asset Generation Failure: ${err instanceof Error ? err.message : 'Unknown'}`,
        });
      }
      throw err;
    }
  }

  /**
   * Synthesizes a structured Business Brain from onboarding answers.
   * Phase 5 Core Pipeline
   */
  public async synthesizeBusinessBrain(onboardingData: Record<string, any>): Promise<{
    brain: any;
    modelUsed: string;
  }> {
    const gemini = getGeminiClient();
    const model = serverConfig.geminiModel;

    const bName = onboardingData.businessName || 'New Venture Workspace';
    const bType = onboardingData.businessType || 'Technology Startup';
    const bStage = onboardingData.businessStage || 'Early Traction';
    const bLoc =
      [onboardingData.city, onboardingData.region, onboardingData.country]
        .filter(Boolean)
        .join(', ') || 'Global';
    const priorities = Array.isArray(onboardingData.primaryPriorities)
      ? onboardingData.primaryPriorities
      : ['Find more customers'];
    const diffs = Array.isArray(onboardingData.differentiators)
      ? onboardingData.differentiators
      : ['Quality & Innovation'];

    const prompt = `You are a Principal Business Architect and Strategic Intelligence Analyst at BrainWise.
Analyze the following business onboarding information and synthesize a comprehensive, structured Business Brain JSON document.

Business Inputs:
- Name: "${bName}"
- Type: "${bType}"
- Stage: "${bStage}"
- Location & Target Markets: "${bLoc}" (Target: "${onboardingData.targetMarket || bLoc}")
- Website / Channels: "${onboardingData.website || 'None provided'}"
- Primary Objectives: ${JSON.stringify(priorities)}
- Objective Details: "${onboardingData.objectiveDetails || ''}"
- Target Audience: "${onboardingData.targetAudienceType || 'B2C'}", B2B: ${Boolean(onboardingData.isB2B)}
- Customer Pain Points: ${JSON.stringify(onboardingData.customerPainPoints || [])}
- Demographics: "${onboardingData.demographics || ''}"
- Offerings Summary: "${onboardingData.offeringsSummary || ''}"
- Products: ${JSON.stringify(onboardingData.products || [])}
- Services: ${JSON.stringify(onboardingData.services || [])}
- Pricing Model: "${onboardingData.pricingModel || 'Fixed Pricing'}"
- Differentiators: ${JSON.stringify(diffs)}
- Adaptive Details: ${JSON.stringify(onboardingData.adaptiveResponses || {})}

Strict Guidelines:
1. Ground the business identity, offerings, and location strictly in the user's provided facts. Never fabricate unverified claims or pricing.
2. Differentiate between facts and strategic interpretations.
3. Formulate realistic customer personas with actionable buying triggers and willingness to pay.
4. Formulate crisp brand personality tokens, brand voice, and clear marketing restrictions.
5. Identify explicit "informationGaps" (areas where the business needs to clarify assumptions).

Return ONLY valid JSON with this exact structure:
{
  "businessName": string,
  "tagline": string,
  "stage": "Idea Stage" | "Pre-Launch" | "Early Traction" | "Growing Business" | "Established",
  "location": string,
  "website": string,
  "foundedYear": string,
  "overviewSummary": string,
  "targetAudience": string,
  "brandPositioning": string,
  "valueProposition": string,
  "businessModel": string,
  "revenueModel": string,
  "productsAndServices": Array<{
    "id": string,
    "name": string,
    "category": string,
    "priceRange": string,
    "description": string,
    "marginEstimate": string
  }>,
  "customerPersonas": Array<{
    "id": string,
    "name": string,
    "segment": string,
    "ageOrFirmographics": string,
    "painPoints": string[],
    "buyingTriggers": string[],
    "willingnessToPay": string
  }>,
  "primaryGoals": string[],
  "brandPersonality": string[],
  "brandVoice": string[],
  "marketingRestrictions": string[],
  "intelligence": {
    "summary": string,
    "strengths": string[],
    "informationGaps": string[],
    "assumptions": string[],
    "confidence": Record<string, number>
  }
}`;

    if (gemini) {
      try {
        const response = await withTimeout(
          gemini.models.generateContent({
            model,
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              temperature: 0.3,
            },
          })
        );
        const text = response.text?.trim();
        if (text) {
          const parsed = JSON.parse(text);
          if (parsed && parsed.businessName) {
            return { brain: parsed, modelUsed: model };
          }
        }
      } catch (err) {
        console.warn(
          'Gemini synthesis failed, utilizing deterministic intelligence fallback:',
          err
        );
      }
    }

    // High-fidelity deterministic synthesis fallback
    const fallbackProducts =
      onboardingData.products && onboardingData.products.length > 0
        ? onboardingData.products.map((p: any, idx: number) => ({
            id: `prod_${idx + 1}`,
            name: p.name || `Core ${bType} Offering ${idx + 1}`,
            category: bType,
            priceRange: p.price ? `$${p.price}` : 'Premium Tier',
            description:
              p.description ||
              `${bName}'s flagship solution designed for ${onboardingData.targetAudienceType || 'target customers'}.`,
            marginEstimate: '65-75%',
          }))
        : [
            {
              id: 'prod_1',
              name: `${bName} Core Offering`,
              category: bType,
              priceRange: 'Variable',
              description:
                onboardingData.offeringsSummary ||
                `Comprehensive ${bType.toLowerCase()} solutions tailored for modern business requirements.`,
              marginEstimate: '70%',
            },
          ];

    const fallbackPersonas = [
      {
        id: 'pers_1',
        name: onboardingData.isB2B ? 'Growth Decision Maker' : 'Discerning Primary Consumer',
        segment: onboardingData.targetAudienceType || 'Core Segment',
        ageOrFirmographics:
          onboardingData.demographics ||
          (onboardingData.isB2B
            ? 'SMB / Mid-Market Founders & Executives'
            : '25-45 Urban Professionals'),
        painPoints:
          onboardingData.customerPainPoints && onboardingData.customerPainPoints.length > 0
            ? onboardingData.customerPainPoints
            : ['Fragmented alternatives', 'Inconsistent quality', 'Lack of transparent execution'],
        buyingTriggers: [
          'Observed competitive advantage',
          'Proven customer experience',
          'Trust and reliability',
        ],
        willingnessToPay: 'Mid-to-High Tier',
      },
      {
        id: 'pers_2',
        name: 'Efficiency-Driven Early Adopter',
        segment: 'Secondary Segment',
        ageOrFirmographics: 'Forward-looking operators seeking distinct differentiation',
        painPoints: ['Slow turnaround time', 'High friction in vendor communication'],
        buyingTriggers: ['Speed of execution', 'Clear positioning and transparent value'],
        willingnessToPay: 'Value-Focused',
      },
    ];

    const deterministicBrain = {
      businessName: bName,
      tagline: `${bName} — Leading ${bType} in ${bLoc}`,
      stage: bStage,
      location: bLoc,
      website: onboardingData.website || '',
      foundedYear: new Date().getFullYear().toString(),
      overviewSummary: `${bName} is an emerging ${bType.toLowerCase()} headquartered in ${bLoc}, dedicated to solving critical customer pain points through ${diffs.join(' and ')}.`,
      targetAudience: `${onboardingData.targetAudienceType || 'Customers'} seeking ${diffs[0] || 'superior quality'} in ${bLoc}.`,
      brandPositioning: `${bName} combines ${diffs.join(' with ')} to deliver uncompromising performance and measurable impact.`,
      valueProposition: `Empowering clients through ${diffs[0] || 'innovative solutions'} tailored specifically for ${bLoc}.`,
      businessModel: onboardingData.isB2B
        ? 'B2B Retainer / Project Service'
        : 'Direct-to-Consumer / Value-Added Sales',
      revenueModel: onboardingData.pricingModel || 'Value-Based Pricing',
      productsAndServices: fallbackProducts,
      customerPersonas: fallbackPersonas,
      primaryGoals: priorities,
      brandPersonality: ['Authoritative', 'Innovative', 'Disciplined', 'Customer-Obsessed'],
      brandVoice: ['Direct', 'Confident', 'Empathetic', 'Analytical'],
      marketingRestrictions: [
        'Never guarantee unsubstantiated numerical returns',
        'Avoid discount-led promotional messaging',
      ],
      intelligence: {
        summary: `Structured business profile established for ${bName} based on verified ${bType} characteristics in ${bLoc}.`,
        strengths: [
          `Clear differentiation through ${diffs.join(', ')}`,
          `Defined operating territory in ${bLoc}`,
          `Focused initial customer segments`,
        ],
        informationGaps: [
          'Detailed unit economics and gross margin breakdown',
          'Primary digital customer acquisition channel conversion rates',
          'Specific direct competitor pricing benchmark',
        ],
        assumptions: [
          'Target market demonstrates willingness to pay for premium quality',
          'Current distribution infrastructure can sustain early growth trajectory',
        ],
        confidence: {
          identity: 1.0,
          offerings: 0.9,
          positioning: 0.85,
          marketFit: 0.8,
        },
      },
    };

    return { brain: deterministicBrain, modelUsed: 'deterministic-intelligence-engine' };
  }
}

export const aiOrchestrationService = new AiOrchestrationService();
