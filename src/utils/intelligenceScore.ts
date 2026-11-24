/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export { DEFAULT_INTELLIGENCE_WEIGHTS };
import {
  DEFAULT_INTELLIGENCE_WEIGHTS,
  validateAndNormalizeWeights,
  type BusinessIntelligenceScore,
  type DimensionScoreDetail,
  type IntelligenceDimensionKey,
  type IntelligenceImprovementRecommendation,
  type IntelligenceScoreWeights,
  type ReadinessLabel,
  type ScoreDeltaInfo,
  type ScoreGrade,
} from '../types/intelligenceScore';

export interface ScoreInputPayload {
  workspaceId: string;
  profile?: any;
  products?: any[];
  services?: any[];
  personas?: any[];
  audienceSegments?: any[];
  brand?: any;
  goals?: any[];
  competitors?: any[];
  documents?: any[];
  provenance?: Record<string, any>;
  strategicMemory?: any;
  resourcesAndConstraints?: any;
  weights?: Partial<IntelligenceScoreWeights>;
  previousScore?: BusinessIntelligenceScore | null;
  version?: number;
  triggerEvent?: string;
  now?: string | Date;
}

function parseDateMs(val: any, fallbackMs: number): number {
  if (!val) return fallbackMs;
  if (val instanceof Date) return val.getTime();
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const parsed = Date.parse(val);
    return isNaN(parsed) ? fallbackMs : parsed;
  }
  if (typeof val.toDate === 'function') {
    return val.toDate().getTime();
  }
  return fallbackMs;
}

function calculateFreshnessScore(dateVal: any, nowMs: number): { score: number; isStale: boolean } {
  if (!dateVal) return { score: 30, isStale: true };
  const itemMs = parseDateMs(dateVal, 0);
  if (itemMs === 0) return { score: 30, isStale: true };

  const daysOld = Math.max(0, (nowMs - itemMs) / (1000 * 60 * 60 * 24));
  if (daysOld <= 30) {
    return { score: 100, isStale: false };
  } else if (daysOld <= 90) {
    return { score: 85, isStale: false };
  } else if (daysOld <= 180) {
    return { score: 60, isStale: true };
  } else {
    return { score: 30, isStale: true };
  }
}

function isVagueOrPlaceholder(str?: string): boolean {
  if (!str) return true;
  const clean = str.trim().toLowerCase();
  if (clean.length < 5) return true;
  const placeholders = ['lorem', 'ipsum', 'tbd', 'n/a', 'na', 'test', 'asdf', 'unknown', 'none'];
  return placeholders.some((p) => clean === p || clean.startsWith(p + ' '));
}

export function calculateBusinessIntelligenceScore(
  input: ScoreInputPayload
): BusinessIntelligenceScore {
  const nowMs = input.now ? new Date(input.now).getTime() : Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const weights = validateAndNormalizeWeights(input.weights);
  const version = input.version ?? (input.previousScore ? input.previousScore.version + 1 : 1);

  const profile = input.profile || {};
  const products = [
    ...(input.products || profile.products || profile.productsAndServices || []),
    ...(input.services || []),
  ];
  const personas = [
    ...(input.personas || profile.personas || profile.customerPersonas || []),
    ...(input.audienceSegments || []),
  ];
  const brand = input.brand || profile.brandProfile || {};
  const goals = input.goals || profile.primaryGoals || [];
  const competitors = input.competitors || [];
  const documents = input.documents || profile.documents || [];
  const provenance = input.provenance || profile.provenance || {};
  const resources = input.resourcesAndConstraints || profile.resourcesAndConstraints || {};
  const strategicMem = input.strategicMemory || profile.strategicMemory || {};

  const recommendations: IntelligenceImprovementRecommendation[] = [];

  // ---------------------------------------------------------------------------
  // 1. BUSINESS IDENTITY COMPLETENESS (Weight 15%)
  // ---------------------------------------------------------------------------
  const identityDim: DimensionScoreDetail = (() => {
    const key: IntelligenceDimensionKey = 'businessIdentity';
    const missing: DimensionScoreDetail['missingCriticalInformation'] = [];
    const quality: DimensionScoreDetail['dataQualityIssues'] = [];
    const accuracy: DimensionScoreDetail['accuracyIndicators'] = [];
    const stale: string[] = [];

    // Fields checked
    const fields = [
      { key: 'businessName', label: 'Business Name', critical: true, val: profile.businessName },
      { key: 'industry', label: 'Industry', critical: true, val: profile.industry },
      { key: 'location', label: 'Location / Headquarters', critical: true, val: profile.location },
      {
        key: 'overviewSummary',
        label: 'Overview Summary',
        critical: true,
        val: profile.overviewSummary,
      },
      {
        key: 'valueProposition',
        label: 'Value Proposition',
        critical: true,
        val: profile.valueProposition,
      },
      {
        key: 'businessModel',
        label: 'Business Model',
        critical: false,
        val: profile.businessModel,
      },
      { key: 'revenueModel', label: 'Revenue Model', critical: false, val: profile.revenueModel },
      { key: 'stage', label: 'Business Stage', critical: false, val: profile.stage },
      {
        key: 'website',
        label: 'Website / Online Presences',
        critical: false,
        val: profile.website,
      },
      { key: 'tagline', label: 'Tagline', critical: false, val: profile.tagline },
    ];

    let filledCount = 0;
    let verifiedCount = 0;

    for (const f of fields) {
      if (f.val && !isVagueOrPlaceholder(f.val)) {
        filledCount++;
        const prov = provenance[f.key];
        if (prov && (prov.source === 'USER_CONFIRMED' || prov.confidence === 1.0)) {
          verifiedCount++;
        }
      } else if (f.critical) {
        missing.push({
          field: f.key,
          description: `${f.label} is required to anchor strategic business context`,
          severity: 'critical',
        });
      } else {
        missing.push({
          field: f.key,
          description: `${f.label} is not defined`,
          severity: 'recommended',
        });
      }
    }

    const completeness = Math.round((filledCount / fields.length) * 100);
    const verificationCoverage =
      filledCount > 0 ? Math.round((verifiedCount / filledCount) * 100) : 0;

    // Accuracy and quality checks
    if (profile.overviewSummary && profile.overviewSummary.trim().length < 25) {
      quality.push({
        field: 'overviewSummary',
        issue: 'Business overview summary is very brief (< 25 characters)',
        recommendation:
          'Expand summary with primary offerings, target customer, and operational scope',
        severity: 'warning',
      });
      accuracy.push({
        status: 'warning',
        metric: 'Summary Density',
        details:
          'Overview summary under 25 chars offers limited contextual grounding for AI workflows',
      });
    } else if (profile.overviewSummary) {
      accuracy.push({
        status: 'pass',
        metric: 'Summary Density',
        details: 'Overview summary provides sufficient contextual breadth',
      });
    }

    if (profile.foundedYear) {
      const year = Number(profile.foundedYear);
      const curYear = new Date(nowMs).getFullYear();
      if (isNaN(year) || year < 1800 || year > curYear) {
        quality.push({
          field: 'foundedYear',
          issue: `Founded year '${profile.foundedYear}' is invalid or in the future`,
          recommendation: 'Specify a valid 4-digit calendar year',
          severity: 'alert',
        });
        accuracy.push({
          status: 'fail',
          metric: 'Historical Accuracy',
          details: `Founded year ${profile.foundedYear} is outside plausible range [1800 - ${curYear}]`,
        });
      }
    }

    // Freshness
    const profileDate = profile.lastUpdated || profile.updatedAt || profile.createdAt;
    const { score: freshnessScore, isStale } = calculateFreshnessScore(profileDate, nowMs);
    if (isStale) {
      stale.push('Core business profile has not been confirmed or refreshed in over 90 days');
    }

    // Evidence availability
    let evidenceAvailability = 0;
    if (verificationCoverage >= 70) evidenceAvailability += 50;
    else if (verificationCoverage > 0) evidenceAvailability += 25;
    if (documents.length > 0) evidenceAvailability += 50;

    const penalty = Math.min(25, quality.length * 6);
    const score = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          completeness * 0.4 +
            verificationCoverage * 0.3 +
            freshnessScore * 0.15 +
            Math.max(0, evidenceAvailability - penalty) * 0.15
        )
      )
    );

    if (completeness < 70) {
      recommendations.push({
        id: 'rec_identity_complete',
        title: 'Complete Core Business Identity',
        description:
          'Provide missing foundational facts (business name, industry, headquarters, and value proposition).',
        dimension: 'businessIdentity',
        priority: 'critical',
        estimatedScoreImpact: 12,
        actionType: 'input',
        targetTab: 'overview',
      });
    } else if (verificationCoverage < 60) {
      recommendations.push({
        id: 'rec_identity_verify',
        title: 'Confirm Business Identity Ground Truth',
        description:
          'Elevate AI-inferred identity facts to user-confirmed status in the Business Brain.',
        dimension: 'businessIdentity',
        priority: 'high',
        estimatedScoreImpact: 6,
        actionType: 'verify',
        targetTab: 'overview',
      });
    }

    return {
      dimensionKey: key,
      name: 'Business Identity Completeness',
      weight: weights.businessIdentity,
      score,
      weightedScore: Number(((score * weights.businessIdentity) / 100).toFixed(2)),
      completeness,
      verificationCoverage,
      freshness: freshnessScore,
      evidenceAvailability: Math.min(100, evidenceAvailability),
      accuracyIndicators: accuracy,
      missingCriticalInformation: missing,
      dataQualityIssues: quality,
      staleWarnings: stale,
    };
  })();

  // ---------------------------------------------------------------------------
  // 2. PRODUCT & SERVICE INTELLIGENCE (Weight 15%)
  // ---------------------------------------------------------------------------
  const productDim: DimensionScoreDetail = (() => {
    const key: IntelligenceDimensionKey = 'productService';
    const missing: DimensionScoreDetail['missingCriticalInformation'] = [];
    const quality: DimensionScoreDetail['dataQualityIssues'] = [];
    const accuracy: DimensionScoreDetail['accuracyIndicators'] = [];
    const stale: string[] = [];

    if (products.length === 0) {
      missing.push({
        field: 'products',
        description: 'No products or service tiers defined in catalogue',
        severity: 'critical',
      });
      recommendations.push({
        id: 'rec_product_add',
        title: 'Add Products & Services Catalogue',
        description:
          'Define your core offerings, pricing structures, and margin estimates to enable pricing-aware strategy.',
        dimension: 'productService',
        priority: 'critical',
        estimatedScoreImpact: 15,
        actionType: 'input',
        targetTab: 'products',
      });

      return {
        dimensionKey: key,
        name: 'Product & Service Intelligence',
        weight: weights.productService,
        score: 0,
        weightedScore: 0,
        completeness: 0,
        verificationCoverage: 0,
        freshness: 30,
        evidenceAvailability: 0,
        accuracyIndicators: [
          { status: 'warning', metric: 'Catalogue Coverage', details: 'Empty product catalogue' },
        ],
        missingCriticalInformation: missing,
        dataQualityIssues: [
          {
            field: 'products',
            issue: 'No products or services found in Business Brain catalogue',
            recommendation: 'Add flagship products or services via Products & Services tab',
            severity: 'alert',
          },
        ],
        staleWarnings: ['No product records tracked'],
      };
    }

    let pricedCount = 0;
    let describedCount = 0;
    let marginCount = 0;
    let verifiedCount = 0;
    let staleCount = 0;
    let evidenceCount = 0;

    for (const p of products) {
      const name = p.name || '';
      if (p.price !== undefined || p.priceRange || p.pricingStructure) {
        // Check for invalid or corrupt pricing
        if (p.price !== undefined && p.price < 0) {
          quality.push({
            field: `product_${p.id || name}_price`,
            issue: `Product '${name}' has negative price: ${p.price}`,
            recommendation: 'Correct price to a positive value or set structure to quote',
            severity: 'alert',
          });
          accuracy.push({
            status: 'fail',
            metric: `Pricing: ${name}`,
            details: `Negative price detected (${p.price})`,
          });
        } else if (
          p.price === 0 &&
          p.pricingStructure !== 'tiered' &&
          p.pricingStructure !== 'quote'
        ) {
          quality.push({
            field: `product_${p.id || name}_price`,
            issue: `Product '${name}' has 0 price without being marked tiered or quote`,
            recommendation: 'Provide explicit price or pricing tier',
            severity: 'warning',
          });
        } else {
          pricedCount++;
        }
      } else {
        missing.push({
          field: `product_${p.id || name}_pricing`,
          description: `Product '${name}' lacks explicit price or price range`,
          severity: 'high',
        });
      }

      if (p.description && p.description.trim().length > 10) {
        describedCount++;
      } else {
        quality.push({
          field: `product_${p.id || name}_description`,
          issue: `Product '${name}' has missing or very short description`,
          recommendation: 'Add detailed features and benefits',
          severity: 'warning',
        });
      }

      if (p.marginEstimate || p.margin || p.cost) {
        marginCount++;
      }

      if (p.source === 'USER_CONFIRMED' || p.isConfirmed || (!p.source && p.status === 'active')) {
        verifiedCount++;
      }

      if (p.supportingDocuments && p.supportingDocuments.length > 0) {
        evidenceCount++;
      }

      const pDate = p.updatedAt || p.createdAt;
      const { isStale } = calculateFreshnessScore(pDate, nowMs);
      if (isStale) staleCount++;
    }

    const n = products.length;
    const completeness = Math.round(
      ((pricedCount / n) * 0.4 + (describedCount / n) * 0.35 + (marginCount / n) * 0.25) * 100
    );
    const verificationCoverage = Math.round((verifiedCount / n) * 100);
    const freshness = Math.max(30, Math.round(((n - staleCount) / n) * 100));
    const evidenceAvailability = Math.min(
      100,
      Math.round((evidenceCount / n) * 100) + (documents.length > 0 ? 30 : 0)
    );

    if (staleCount > 0) {
      stale.push(
        `${staleCount} of ${n} products have not been updated or reviewed in over 90 days`
      );
    }

    const penalty = Math.min(30, quality.length * 5);
    const score = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          completeness * 0.4 +
            verificationCoverage * 0.3 +
            freshness * 0.15 +
            Math.max(0, evidenceAvailability - penalty) * 0.15
        )
      )
    );

    if (pricedCount < n) {
      recommendations.push({
        id: 'rec_product_pricing',
        title: 'Add Missing Product Pricing',
        description: `Ensure all offerings have explicit price ranges or pricing tiers to enable Truth Engine verification.`,
        dimension: 'productService',
        priority: 'high',
        estimatedScoreImpact: 8,
        actionType: 'input',
        targetTab: 'products',
      });
    }

    return {
      dimensionKey: key,
      name: 'Product & Service Intelligence',
      weight: weights.productService,
      score,
      weightedScore: Number(((score * weights.productService) / 100).toFixed(2)),
      completeness,
      verificationCoverage,
      freshness,
      evidenceAvailability,
      accuracyIndicators:
        accuracy.length > 0
          ? accuracy
          : [
              {
                status: 'pass',
                metric: 'Catalogue Consistency',
                details: 'All product prices and margins align with validated constraints',
              },
            ],
      missingCriticalInformation: missing,
      dataQualityIssues: quality,
      staleWarnings: stale,
    };
  })();

  // ---------------------------------------------------------------------------
  // 3. CUSTOMER INTELLIGENCE (Weight 15%)
  // ---------------------------------------------------------------------------
  const customerDim: DimensionScoreDetail = (() => {
    const key: IntelligenceDimensionKey = 'customerIntelligence';
    const missing: DimensionScoreDetail['missingCriticalInformation'] = [];
    const quality: DimensionScoreDetail['dataQualityIssues'] = [];
    const accuracy: DimensionScoreDetail['accuracyIndicators'] = [];
    const stale: string[] = [];

    const hasTargetAudience = Boolean(
      profile.targetAudience && !isVagueOrPlaceholder(profile.targetAudience)
    );
    if (!hasTargetAudience) {
      missing.push({
        field: 'targetAudience',
        description: 'Core target customer demographic or geography is missing',
        severity: 'critical',
      });
    } else if (profile.targetAudience.length < 15) {
      quality.push({
        field: 'targetAudience',
        issue: 'Target audience definition is overly generic',
        recommendation: 'Specify buyer demographic, pain point trigger, and geography',
        severity: 'warning',
      });
    }

    if (personas.length === 0) {
      missing.push({
        field: 'personas',
        description: 'No detailed buyer personas or customer segments mapped',
        severity: 'critical',
      });
      recommendations.push({
        id: 'rec_customer_personas',
        title: 'Map Key Customer Personas',
        description:
          'Define target customer personas with specific pain points, buying triggers, and willingness to pay.',
        dimension: 'customerIntelligence',
        priority: 'high',
        estimatedScoreImpact: 10,
        actionType: 'input',
        targetTab: 'audience',
      });
    }

    let personaPainCount = 0;
    let personaTriggerCount = 0;
    let verifiedCount = 0;
    let staleCount = 0;

    for (const p of personas) {
      const painPoints = p.painPoints || p.pains || [];
      const triggers = p.buyingTriggers || p.purchaseMotivations || [];
      if (painPoints.length > 0) personaPainCount++;
      else {
        quality.push({
          field: `persona_${p.name || p.id}_painPoints`,
          issue: `Persona '${p.name || 'Unnamed'}' has no pain points mapped`,
          recommendation: 'Add key customer frustrations or blockers',
          severity: 'warning',
        });
      }

      if (triggers.length > 0) personaTriggerCount++;
      if (
        p.isConfirmed ||
        p.source === 'USER_CONFIRMED' ||
        (!p.source && !p.id?.startsWith('inf_'))
      ) {
        verifiedCount++;
      }

      const pDate = p.updatedAt || p.createdAt;
      const { isStale } = calculateFreshnessScore(pDate, nowMs);
      if (isStale) staleCount++;
    }

    const n = Math.max(1, personas.length);
    const audienceScore = hasTargetAudience ? 40 : 0;
    const personaScore =
      personas.length > 0
        ? Math.round(((personaPainCount / n) * 0.35 + (personaTriggerCount / n) * 0.25) * 60)
        : 0;

    const completeness = Math.min(100, audienceScore + personaScore);
    const verificationCoverage =
      personas.length > 0
        ? Math.round((verifiedCount / n) * 100)
        : hasTargetAudience && provenance.targetAudience?.source === 'USER_CONFIRMED'
          ? 60
          : 0;
    const freshness =
      personas.length > 0 ? Math.max(30, Math.round(((n - staleCount) / n) * 100)) : 40;
    const evidenceAvailability = documents.length > 0 ? 70 : verificationCoverage > 0 ? 50 : 20;

    if (staleCount > 0) {
      stale.push(`${staleCount} customer personas have not been reviewed in over 90 days`);
    }

    const penalty = Math.min(25, quality.length * 5);
    const score = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          completeness * 0.4 +
            verificationCoverage * 0.3 +
            freshness * 0.15 +
            Math.max(0, evidenceAvailability - penalty) * 0.15
        )
      )
    );

    if (verificationCoverage < 50 && personas.length > 0) {
      recommendations.push({
        id: 'rec_customer_verify',
        title: 'Verify Customer Segments',
        description:
          'Review and confirm customer personas to ground AI campaign targeting in verified buyer psychology.',
        dimension: 'customerIntelligence',
        priority: 'medium',
        estimatedScoreImpact: 6,
        actionType: 'verify',
        targetTab: 'audience',
      });
    }

    return {
      dimensionKey: key,
      name: 'Customer Intelligence',
      weight: weights.customerIntelligence,
      score,
      weightedScore: Number(((score * weights.customerIntelligence) / 100).toFixed(2)),
      completeness,
      verificationCoverage,
      freshness,
      evidenceAvailability,
      accuracyIndicators:
        accuracy.length > 0
          ? accuracy
          : [
              {
                status: 'pass',
                metric: 'Audience Integrity',
                details: 'Customer segments and behavioral triggers are populated',
              },
            ],
      missingCriticalInformation: missing,
      dataQualityIssues: quality,
      staleWarnings: stale,
    };
  })();

  // ---------------------------------------------------------------------------
  // 4. BRAND INTELLIGENCE (Weight 15%)
  // ---------------------------------------------------------------------------
  const brandDim: DimensionScoreDetail = (() => {
    const key: IntelligenceDimensionKey = 'brandIntelligence';
    const missing: DimensionScoreDetail['missingCriticalInformation'] = [];
    const quality: DimensionScoreDetail['dataQualityIssues'] = [];
    const accuracy: DimensionScoreDetail['accuracyIndicators'] = [];
    const stale: string[] = [];

    const brandVoice = brand.brandVoice || brand.voice || profile.brandVoice || [];
    const brandTone = brand.brandTone || brand.tone || profile.brandPersonality || [];
    const usp = brand.uniqueSellingProposition || profile.valueProposition;
    const visual = brand.visualGuidelines || brand.visualDirection || brand.colorPalette;
    const approvedClaims = brand.approvedClaims || [];
    const restrictedClaims =
      brand.restrictedClaims || brand.marketingRestrictions || profile.marketingRestrictions || [];

    let filledPoints = 0;
    if (brandVoice.length > 0) filledPoints += 25;
    else {
      missing.push({
        field: 'brandVoice',
        description: 'Brand voice descriptors not defined',
        severity: 'high',
      });
    }

    if (brandTone.length > 0) filledPoints += 15;
    if (usp && !isVagueOrPlaceholder(usp)) filledPoints += 30;
    else {
      missing.push({
        field: 'uniqueSellingProposition',
        description: 'Unique Selling Proposition (USP) is undefined',
        severity: 'critical',
      });
    }

    if (visual) filledPoints += 15;
    else {
      missing.push({
        field: 'visualGuidelines',
        description: 'Visual identity tokens (palette / typography) unconfigured',
        severity: 'recommended',
      });
    }

    if (approvedClaims.length > 0 || restrictedClaims.length > 0) filledPoints += 15;
    else {
      quality.push({
        field: 'claims',
        issue: 'No approved claims or restricted claims established',
        recommendation: 'Configure brand claims to prevent AI hallucination during copy generation',
        severity: 'warning',
      });
    }

    const completeness = Math.min(100, filledPoints);
    const verificationCoverage = brand.version
      ? 80
      : provenance.brandVoice?.source === 'USER_CONFIRMED'
        ? 60
        : 30;
    const brandDate = brand.updatedAt || brand.createdAt || profile.lastUpdated;
    const { score: freshness, isStale } = calculateFreshnessScore(brandDate, nowMs);
    if (isStale) stale.push('Brand intelligence guidelines have not been refreshed recently');

    const evidenceAvailability = documents.some(
      (d: any) => (d.name || '').toLowerCase().includes('brand') || (d.type || '').includes('Brief')
    )
      ? 90
      : 50;

    const penalty = Math.min(20, quality.length * 5);
    const score = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          completeness * 0.4 +
            verificationCoverage * 0.3 +
            freshness * 0.15 +
            Math.max(0, evidenceAvailability - penalty) * 0.15
        )
      )
    );

    if (completeness < 60) {
      recommendations.push({
        id: 'rec_brand_upload',
        title: 'Establish Brand Guidelines & Voice',
        description:
          'Upload brand guidelines or define tone, USP, and restricted claims in Brand Studio.',
        dimension: 'brandIntelligence',
        priority: 'high',
        estimatedScoreImpact: 8,
        actionType: 'upload',
        targetTab: 'brand',
      });
    }

    return {
      dimensionKey: key,
      name: 'Brand Intelligence',
      weight: weights.brandIntelligence,
      score,
      weightedScore: Number(((score * weights.brandIntelligence) / 100).toFixed(2)),
      completeness,
      verificationCoverage,
      freshness,
      evidenceAvailability,
      accuracyIndicators:
        accuracy.length > 0
          ? accuracy
          : [
              {
                status: 'pass',
                metric: 'Brand Voice Alignment',
                details: 'Brand voice and USP are active',
              },
            ],
      missingCriticalInformation: missing,
      dataQualityIssues: quality,
      staleWarnings: stale,
    };
  })();

  // ---------------------------------------------------------------------------
  // 5. GOALS & STRATEGY (Weight 15%)
  // ---------------------------------------------------------------------------
  const goalsDim: DimensionScoreDetail = (() => {
    const key: IntelligenceDimensionKey = 'goalsStrategy';
    const missing: DimensionScoreDetail['missingCriticalInformation'] = [];
    const quality: DimensionScoreDetail['dataQualityIssues'] = [];
    const accuracy: DimensionScoreDetail['accuracyIndicators'] = [];
    const stale: string[] = [];

    const goalList = Array.isArray(goals) ? goals : [];
    if (goalList.length === 0) {
      missing.push({
        field: 'goals',
        description: 'No active business revenue or growth targets defined',
        severity: 'critical',
      });
      recommendations.push({
        id: 'rec_goals_add',
        title: 'Add Measurable Business Goals',
        description:
          'Set revenue and customer acquisition targets to calibrate growth prioritization.',
        dimension: 'goalsStrategy',
        priority: 'critical',
        estimatedScoreImpact: 12,
        actionType: 'input',
        targetTab: 'strategy',
      });

      return {
        dimensionKey: key,
        name: 'Goals & Strategy',
        weight: weights.goalsStrategy,
        score: 0,
        weightedScore: 0,
        completeness: 0,
        verificationCoverage: 0,
        freshness: 30,
        evidenceAvailability: 0,
        accuracyIndicators: [
          { status: 'warning', metric: 'Goal Coverage', details: 'Zero active goals' },
        ],
        missingCriticalInformation: missing,
        dataQualityIssues: [
          {
            field: 'goals',
            issue: 'No growth objectives recorded',
            recommendation: 'Add at least 1 measurable business target in Growth Director',
            severity: 'alert',
          },
        ],
        staleWarnings: ['No goal records tracked'],
      };
    }

    let measurableCount = 0;
    let staleCount = 0;

    for (const g of goalList) {
      if (typeof g === 'string') {
        if (g.trim().length > 5) measurableCount++;
      } else {
        if (g.targetValue !== undefined && g.targetValue > 0) measurableCount++;
        else {
          quality.push({
            field: `goal_${g.id || g.title}_targetValue`,
            issue: `Goal '${g.title || 'Untitled'}' lacks a positive numerical target value`,
            recommendation: 'Specify measurable target value and unit',
            severity: 'warning',
          });
          accuracy.push({
            status: 'warning',
            metric: `Goal Metric: ${g.title || 'Untitled'}`,
            details: 'Target value is <= 0 or missing unit',
          });
        }

        const gDate = g.updatedAt || g.createdAt;
        const { isStale } = calculateFreshnessScore(gDate, nowMs);
        if (isStale) staleCount++;
      }
    }

    const n = goalList.length;
    const completeness = Math.min(100, Math.round((measurableCount / n) * 100));
    const verificationCoverage = 80; // goals set by user
    const freshness = Math.max(30, Math.round(((n - staleCount) / n) * 100));
    const evidenceAvailability = strategicMem.usedAngles?.length > 0 ? 80 : 50;

    if (staleCount > 0) {
      stale.push(`${staleCount} goals have not reported progress or updates in over 60 days`);
    }

    const penalty = Math.min(25, quality.length * 5);
    const score = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          completeness * 0.4 +
            verificationCoverage * 0.3 +
            freshness * 0.15 +
            Math.max(0, evidenceAvailability - penalty) * 0.15
        )
      )
    );

    return {
      dimensionKey: key,
      name: 'Goals & Strategy',
      weight: weights.goalsStrategy,
      score,
      weightedScore: Number(((score * weights.goalsStrategy) / 100).toFixed(2)),
      completeness,
      verificationCoverage,
      freshness,
      evidenceAvailability,
      accuracyIndicators:
        accuracy.length > 0
          ? accuracy
          : [
              {
                status: 'pass',
                metric: 'Goal Feasibility',
                details: 'Measurable targets and deadlines are recorded',
              },
            ],
      missingCriticalInformation: missing,
      dataQualityIssues: quality,
      staleWarnings: stale,
    };
  })();

  // ---------------------------------------------------------------------------
  // 6. MARKET INTELLIGENCE (Weight 10%)
  // ---------------------------------------------------------------------------
  const marketDim: DimensionScoreDetail = (() => {
    const key: IntelligenceDimensionKey = 'marketIntelligence';
    const missing: DimensionScoreDetail['missingCriticalInformation'] = [];
    const quality: DimensionScoreDetail['dataQualityIssues'] = [];
    const accuracy: DimensionScoreDetail['accuracyIndicators'] = [];
    const stale: string[] = [];

    const compList = Array.isArray(competitors) ? competitors : [];
    if (compList.length === 0) {
      missing.push({
        field: 'competitors',
        description: 'No competitor profiles tracked in market matrix',
        severity: 'high',
      });
      recommendations.push({
        id: 'rec_market_competitors',
        title: 'Track Key Market Competitors',
        description:
          'Profile at least 2 direct competitors to unlock automated positioning differentiation.',
        dimension: 'marketIntelligence',
        priority: 'high',
        estimatedScoreImpact: 8,
        actionType: 'input',
        targetTab: 'overview',
        targetRoute: 'competitive-intelligence',
      });
    } else if (compList.length < 2) {
      missing.push({
        field: 'competitors',
        description: 'Tracking only 1 competitor limits quadrant positioning accuracy',
        severity: 'recommended',
      });
    }

    let pricedComps = 0;
    let staleCount = 0;
    for (const c of compList) {
      if (c.priceRange || c.pricingTier || c.averagePrice) pricedComps++;
      else {
        quality.push({
          field: `comp_${c.id || c.name}_price`,
          issue: `Competitor '${c.name}' has no price range recorded`,
          recommendation: 'Add price positioning for relative value benchmarking',
          severity: 'warning',
        });
      }

      const cDate = c.updatedAt || c.createdAt;
      const { isStale } = calculateFreshnessScore(cDate, nowMs);
      if (isStale) staleCount++;
    }

    const n = Math.max(1, compList.length);
    const completeness =
      compList.length === 0
        ? 0
        : Math.min(100, Math.round((compList.length >= 2 ? 60 : 30) + (pricedComps / n) * 40));
    const verificationCoverage = compList.length > 0 ? 70 : 0;
    const freshness =
      compList.length > 0 ? Math.max(30, Math.round(((n - staleCount) / n) * 100)) : 30;
    const evidenceAvailability = compList.some((c) => c.websiteAnalysis || c.website) ? 80 : 30;

    if (staleCount > 0) {
      stale.push(
        `${staleCount} competitor dossiers are older than 60 days without refreshed signals`
      );
    }

    const penalty = Math.min(20, quality.length * 5);
    const score = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          completeness * 0.4 +
            verificationCoverage * 0.3 +
            freshness * 0.15 +
            Math.max(0, evidenceAvailability - penalty) * 0.15
        )
      )
    );

    return {
      dimensionKey: key,
      name: 'Market Intelligence',
      weight: weights.marketIntelligence,
      score,
      weightedScore: Number(((score * weights.marketIntelligence) / 100).toFixed(2)),
      completeness,
      verificationCoverage,
      freshness,
      evidenceAvailability,
      accuracyIndicators:
        accuracy.length > 0
          ? accuracy
          : [
              {
                status: 'pass',
                metric: 'Market Calibration',
                details: 'Rival profiles provide comparative market baseline',
              },
            ],
      missingCriticalInformation: missing,
      dataQualityIssues: quality,
      staleWarnings: stale,
    };
  })();

  // ---------------------------------------------------------------------------
  // 7. RESOURCES & CONSTRAINTS (Weight 5%)
  // ---------------------------------------------------------------------------
  const resourcesDim: DimensionScoreDetail = (() => {
    const key: IntelligenceDimensionKey = 'resourcesConstraints';
    const missing: DimensionScoreDetail['missingCriticalInformation'] = [];
    const quality: DimensionScoreDetail['dataQualityIssues'] = [];
    const accuracy: DimensionScoreDetail['accuracyIndicators'] = [];
    const stale: string[] = [];

    const hasBudget = Boolean(
      resources.marketingBudget?.monthly || resources.marketingBudget?.annual
    );
    const hasCapacity = Boolean(resources.operatingCapacity);
    const hasConstraints = Boolean(
      (resources.financialConstraints?.length || 0) > 0 ||
      (resources.operationalRestrictions?.length || 0) > 0 ||
      (strategicMem.explicitExclusions?.length || 0) > 0
    );

    let filled = 0;
    if (hasBudget) filled += 40;
    else {
      missing.push({
        field: 'marketingBudget',
        description: 'Marketing budget boundaries unrecorded',
        severity: 'recommended',
      });
      recommendations.push({
        id: 'rec_resources_budget',
        title: 'Specify Marketing Budget',
        description: 'Define monthly or annual budget parameters in Strategy & Constraints.',
        dimension: 'resourcesConstraints',
        priority: 'medium',
        estimatedScoreImpact: 5,
        actionType: 'input',
        targetTab: 'strategy',
      });
    }

    if (hasCapacity) filled += 30;
    if (hasConstraints) filled += 30;

    const completeness = Math.min(100, filled);
    const verificationCoverage =
      provenance.resourcesAndConstraints?.source === 'USER_CONFIRMED' ? 90 : 50;
    const { score: freshness, isStale } = calculateFreshnessScore(profile.lastUpdated, nowMs);
    if (isStale) stale.push('Operational constraints unverified in current planning cycle');

    const evidenceAvailability = hasBudget ? 80 : 30;
    const score = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          completeness * 0.4 +
            verificationCoverage * 0.3 +
            freshness * 0.15 +
            evidenceAvailability * 0.15
        )
      )
    );

    return {
      dimensionKey: key,
      name: 'Resources & Constraints',
      weight: weights.resourcesConstraints,
      score,
      weightedScore: Number(((score * weights.resourcesConstraints) / 100).toFixed(2)),
      completeness,
      verificationCoverage,
      freshness,
      evidenceAvailability,
      accuracyIndicators:
        accuracy.length > 0
          ? accuracy
          : [
              {
                status: 'pass',
                metric: 'Boundary Realism',
                details: 'Operating capacity and budget limits recorded',
              },
            ],
      missingCriticalInformation: missing,
      dataQualityIssues: quality,
      staleWarnings: stale,
    };
  })();

  // ---------------------------------------------------------------------------
  // 8. DATA VERIFICATION & FRESHNESS (Weight 10%)
  // ---------------------------------------------------------------------------
  const verificationFreshnessDim: DimensionScoreDetail = (() => {
    const key: IntelligenceDimensionKey = 'dataVerificationFreshness';
    const missing: DimensionScoreDetail['missingCriticalInformation'] = [];
    const quality: DimensionScoreDetail['dataQualityIssues'] = [];
    const accuracy: DimensionScoreDetail['accuracyIndicators'] = [];
    const stale: string[] = [];

    // Aggregate verification across provenance items
    const provEntries = Object.values(provenance);
    const totalFacts = Math.max(1, provEntries.length);
    const confirmedFacts = provEntries.filter(
      (p: any) => p.source === 'USER_CONFIRMED' || p.confidence === 1.0
    ).length;
    const inferredFacts = provEntries.filter((p: any) => p.source === 'AI_INFERRED').length;

    const verificationCoverage = Math.round((confirmedFacts / totalFacts) * 100);

    // Cross-cutting freshness
    const dimFreshnessList = [
      identityDim.freshness,
      productDim.freshness,
      customerDim.freshness,
      brandDim.freshness,
      goalsDim.freshness,
      marketDim.freshness,
    ];
    const avgFreshness = Math.round(
      dimFreshnessList.reduce((a, b) => a + b, 0) / dimFreshnessList.length
    );

    // Evidence via documents
    const docConfidenceAvg =
      documents.length > 0
        ? Math.round(
            (documents.reduce((sum: number, d: any) => sum + (d.confidenceScore || 0.85), 0) /
              documents.length) *
              100
          )
        : 0;

    if (inferredFacts > confirmedFacts) {
      quality.push({
        field: 'provenance',
        issue: `${inferredFacts} facts are AI-inferred and pending founder confirmation`,
        recommendation: 'Review Verification Queue to confirm ground truth',
        severity: 'warning',
      });
      accuracy.push({
        status: 'warning',
        metric: 'Fact Provenance',
        details: 'High proportion of unverified AI-inferred facts presents hallucination risk',
      });
    } else {
      accuracy.push({
        status: 'pass',
        metric: 'Fact Provenance',
        details: 'Majority of active business facts are user-confirmed ground truth',
      });
    }

    if (documents.length === 0) {
      missing.push({
        field: 'documents',
        description: 'No verified source documents uploaded to corroborate business model',
        severity: 'recommended',
      });
    }

    // Stale aggregate warnings
    const allStale = [
      ...identityDim.staleWarnings,
      ...productDim.staleWarnings,
      ...customerDim.staleWarnings,
      ...brandDim.staleWarnings,
      ...goalsDim.staleWarnings,
      ...marketDim.staleWarnings,
    ];
    stale.push(...allStale);

    const completeness = Math.min(100, Math.round(verificationCoverage * 0.5 + avgFreshness * 0.5));
    const evidenceAvailability = Math.min(100, docConfidenceAvg + (documents.length > 0 ? 20 : 0));

    const score = Math.max(
      0,
      Math.min(
        100,
        Math.round(verificationCoverage * 0.4 + avgFreshness * 0.35 + evidenceAvailability * 0.25)
      )
    );

    return {
      dimensionKey: key,
      name: 'Data Verification & Freshness',
      weight: weights.dataVerificationFreshness,
      score,
      weightedScore: Number(((score * weights.dataVerificationFreshness) / 100).toFixed(2)),
      completeness,
      verificationCoverage,
      freshness: avgFreshness,
      evidenceAvailability,
      accuracyIndicators: accuracy,
      missingCriticalInformation: missing,
      dataQualityIssues: quality,
      staleWarnings: stale,
    };
  })();

  // ---------------------------------------------------------------------------
  // OVERALL SCORE CALCULATION & GRADE ASSIGNMENT
  // ---------------------------------------------------------------------------
  const dimensions: Record<IntelligenceDimensionKey, DimensionScoreDetail> = {
    businessIdentity: identityDim,
    productService: productDim,
    customerIntelligence: customerDim,
    brandIntelligence: brandDim,
    goalsStrategy: goalsDim,
    marketIntelligence: marketDim,
    resourcesConstraints: resourcesDim,
    dataVerificationFreshness: verificationFreshnessDim,
  };

  const rawWeightedSum = Object.values(dimensions).reduce(
    (acc, dim) => acc + (dim.score * dim.weight) / 100,
    0
  );
  const overallScore = Math.max(0, Math.min(100, Math.round(rawWeightedSum)));

  let grade: ScoreGrade;
  let readinessLabel: ReadinessLabel;

  if (overallScore >= 85) {
    grade = 'A';
    readinessLabel = 'Fully Grounded';
  } else if (overallScore >= 70) {
    grade = 'B';
    readinessLabel = 'Strategic Ready';
  } else if (overallScore >= 55) {
    grade = 'C';
    readinessLabel = 'Partially Synced';
  } else if (overallScore >= 40) {
    grade = 'D';
    readinessLabel = 'Baseline Grounding';
  } else {
    grade = 'F';
    readinessLabel = 'Action Required';
  }

  // Summary narrative
  const summaryNarrative = (() => {
    const businessName = profile.businessName || 'Your Business';
    if (overallScore >= 85) {
      return `${businessName} has established an authoritative Business Brain. All 8 intelligence dimensions are verified with strong evidence grounding and zero hallucination vulnerability.`;
    } else if (overallScore >= 70) {
      return `${businessName} possesses high-quality intelligence across core identity, offerings, and brand. Resolving remaining gaps in customer segments or market intelligence will elevate readiness to full authority.`;
    } else if (overallScore >= 55) {
      return `${businessName}'s Business Brain has moderate completeness. AI workflows can run safely on confirmed items, but unverified facts and missing pricing constrain autonomous performance.`;
    } else if (overallScore >= 40) {
      return `${businessName} has captured baseline identity data. Substantial gaps in products, audience personas, or business goals require input before marketing and strategy synthesis.`;
    } else {
      return `${businessName} is in foundational setup. Critical business identity, product catalogue, and strategic goals must be populated to prevent generic AI responses.`;
    }
  })();

  // Aggregated counts
  const criticalMissingCount = Object.values(dimensions).reduce(
    (sum, dim) =>
      sum +
      dim.missingCriticalInformation.filter(
        (m) => m.severity === 'critical' || m.severity === 'high'
      ).length,
    0
  );
  const dataQualityIssuesCount = Object.values(dimensions).reduce(
    (sum, dim) => sum + dim.dataQualityIssues.length,
    0
  );
  const staleItemsCount = verificationFreshnessDim.staleWarnings.length;

  // Verification coverage across all dimensions
  const overallVerificationCoverage = Math.round(
    Object.values(dimensions).reduce((sum, dim) => sum + dim.verificationCoverage, 0) /
      Object.keys(dimensions).length
  );
  const overallFreshnessScore = verificationFreshnessDim.freshness;

  // Sort recommendations by priority and impact
  const priorityRank: Record<string, number> = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
  };
  recommendations.sort(
    (a, b) =>
      priorityRank[b.priority] - priorityRank[a.priority] ||
      b.estimatedScoreImpact - a.estimatedScoreImpact
  );

  // Score delta from previous calculation
  let scoreDelta: ScoreDeltaInfo | undefined;
  if (input.previousScore) {
    scoreDelta = {
      previousScore: input.previousScore.overallScore,
      previousCalculatedAt: input.previousScore.calculatedAt,
      delta: overallScore - input.previousScore.overallScore,
    };
  }

  const scoreId = `bis_${input.workspaceId}_v${version}_${Date.now()}`;

  return {
    scoreId,
    workspaceId: input.workspaceId,
    version,
    calculatedAt: nowIso,
    overallScore,
    grade,
    readinessLabel,
    summaryNarrative,
    weights,
    dimensions,
    overallVerificationCoverage,
    overallFreshnessScore,
    criticalMissingCount,
    dataQualityIssuesCount,
    staleItemsCount,
    topRecommendations: recommendations.slice(0, 6),
    scoreDelta,
    triggerEvent: input.triggerEvent || 'SCORE_CALCULATED',
  };
}
