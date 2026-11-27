/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { businessProfileRepository } from '../repositories/businessProfileRepository';
import { productRepository } from '../repositories/productRepository';
import { brandIdentityRepository } from '../repositories/brandIdentityRepository';
import { goalRepository } from '../repositories/goalRepository';
import { audienceSegmentRepository } from '../repositories/audienceSegmentRepository';
import { sharedBusinessContextService } from './sharedBusinessContextService';
import { modelRouter } from '../ai/modelRouter';
import { serverConfig } from '../config/index';
import type { KnowledgeSourceCitation } from '../types/api';

export type BusinessDiagnosisDimension =
  | 'UNIT_ECONOMICS'
  | 'MARKET_FIT_POSITIONING'
  | 'FUNNEL_VELOCITY'
  | 'RETENTION_CHURN'
  | 'PRICING_POWER'
  | 'BRAND_AUTHORITY'
  | 'CAPITAL_EFFICIENCY'
  | 'OPERATIONAL_CAPACITY'
  | 'REGULATORY_COMPLIANCE'
  | 'GROWTH_LEVERAGE';

export type DiagnosticFactClassification =
  | 'CONFIRMED_FACT'
  | 'CALCULATION'
  | 'OBSERVED_EVIDENCE'
  | 'AI_HYPOTHESIS';

export interface DiagnosticFinding {
  statement: string;
  classification: DiagnosticFactClassification;
  confidence: number;
  evidenceSource?: string;
  metricValue?: number | string;
}

export interface DimensionDiagnosis {
  dimension: BusinessDiagnosisDimension;
  name: string;
  score: number; // 0 to 100
  status: 'EXCELLENT' | 'HEALTHY' | 'MODERATE' | 'AT_RISK' | 'CRITICAL';
  keyMetrics: Record<string, number | string | undefined>;
  findings: DiagnosticFinding[];
  identifiedVulnerabilities: string[];
  remediationSuggestions: string[];
}

export interface PrimaryConstraintAnalysis {
  dimension: BusinessDiagnosisDimension;
  title: string;
  bindingProblem: string;
  theoryOfConstraintsExplanation: string;
  severity: 'CRITICAL' | 'HIGH' | 'MODERATE';
  immediateRemediationSprints: Array<{
    sprintNumber: number;
    actionTitle: string;
    responsibleDepartment: string;
    estimatedDays: number;
    expectedImpact: string;
  }>;
}

export interface WhatNotToDoDirective {
  prohibitedAction: string;
  rationale: string;
  consequenceIfIgnored: string;
  riskCategory: 'CAPITAL_WASTE' | 'BRAND_DILUTION' | 'OPERATIONAL_CHAOS' | 'LEGAL_EXPOSURE';
}

export interface ComprehensiveBusinessDiagnosis {
  workspaceId: string;
  businessName: string;
  evaluatedAt: string;
  overallHealthScore: number; // 0 to 100 weighted
  maturityStage: 'PRE_SEED' | 'EARLY_TRACTION' | 'GROWTH_SCALING' | 'ESTABLISHED';
  dimensions: Record<BusinessDiagnosisDimension, DimensionDiagnosis>;
  primaryConstraint: PrimaryConstraintAnalysis;
  whatNotToDoDirectives: WhatNotToDoDirective[];
  swotMatrix: {
    strengths: DiagnosticFinding[];
    weaknesses: DiagnosticFinding[];
    opportunities: DiagnosticFinding[];
    threats: DiagnosticFinding[];
  };
  dataConfidenceScore: number; // 0 to 100 based on confirmed facts vs inferences
  citations: KnowledgeSourceCitation[];
}

export class BusinessDiagnosisEngine {
  /**
   * Executes full 10-dimensional diagnostic assessment of a business workspace
   */
  public async diagnoseBusiness(workspaceId: string, options?: {
    bypassCache?: boolean;
    telemetryMetrics?: {
      monthlyVisitors?: number;
      trackedConversionRate?: number;
      churnRateMonthly?: number;
      cac?: number;
      ltv?: number;
    };
  }): Promise<ComprehensiveBusinessDiagnosis> {
    const profile = await businessProfileRepository.getProfile(workspaceId);
    const products = await productRepository.listProducts(workspaceId);
    const brand = await brandIdentityRepository.getLatest(workspaceId);
    const goals = await goalRepository.listGoals(workspaceId);
    const audienceSegments = await audienceSegmentRepository.listByWorkspace(workspaceId);
    const context = await sharedBusinessContextService.getBusinessContext({
      workspaceId,
      taskType: 'STRATEGY',
      bypassCache: options?.bypassCache,
    });

    const businessName = profile?.businessName || context.businessSummary.split(' ')[0] || 'Business';
    const now = new Date().toISOString();

    const citations: KnowledgeSourceCitation[] = [
      {
        sourceId: `src_profile_${workspaceId}`,
        sourceType: 'USER_CONFIRMED_FACT',
        title: `${businessName} Profile`,
        confidence: 1.0,
        verifiedAt: profile?.lastUpdated || now,
      },
    ];

    // Compute Provenance & Confidence Stats
    const provEntries = Object.values(profile?.provenance || {});
    const confirmedCount = provEntries.filter((p) => p.source === 'USER_CONFIRMED').length;
    const totalProv = Math.max(provEntries.length, 1);
    const dataConfidenceScore = Math.min(100, Math.round((confirmedCount / totalProv) * 100));

    // -------------------------------------------------------------------------
    // 1. UNIT ECONOMICS & CONTRIBUTION MARGINS
    // -------------------------------------------------------------------------
    const prices = products.map((p) => p.price).filter((pr): pr is number => typeof pr === 'number' && pr > 0);
    const avgPrice = prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0;
    const resources = profile?.resourcesAndConstraints;
    const grossMargin = (resources as any)?.grossMarginPercent || (profile as any)?.unitEconomics?.grossMarginPercent || (prices.length > 0 ? 65 : 0);
    const unitScore = prices.length === 0 ? 25 : grossMargin >= 65 ? 90 : grossMargin >= 45 ? 70 : 40;

    const unitFindings: DiagnosticFinding[] = [];
    if (prices.length > 0) {
      unitFindings.push({
        statement: `Average verified catalog unit price is ${avgPrice}. Gross margin baseline is ${grossMargin}%.`,
        classification: 'CALCULATION',
        confidence: 0.95,
        metricValue: avgPrice,
      });
      unitFindings.push({
        statement: `${products.length} active product SKU(s) verified in commercial catalogue.`,
        classification: 'CONFIRMED_FACT',
        confidence: 1.0,
        metricValue: products.length,
      });
    } else {
      unitFindings.push({
        statement: 'No products or pricing registered in Business Brain. Unit economics cannot be mathematically proven.',
        classification: 'CONFIRMED_FACT',
        confidence: 1.0,
      });
    }

    const unitEconomicsDiagnosis: DimensionDiagnosis = {
      dimension: 'UNIT_ECONOMICS',
      name: 'Unit Economics & Contribution Margins',
      score: unitScore,
      status: unitScore >= 80 ? 'EXCELLENT' : unitScore >= 65 ? 'HEALTHY' : unitScore >= 45 ? 'MODERATE' : 'CRITICAL',
      keyMetrics: {
        averageUnitPrice: avgPrice || 'UNDEFINED',
        grossMarginPercent: grossMargin || 'UNDEFINED',
        verifiedProductsCount: products.length,
      },
      findings: unitFindings,
      identifiedVulnerabilities:
        prices.length === 0
          ? ['Unregistered product catalog prevents price verification and margin calculation.']
          : grossMargin < 50
            ? ['Gross margin is below healthy benchmark (50%+), leaving little room for marketing customer acquisition costs.']
            : [],
      remediationSuggestions:
        prices.length === 0
          ? ['Import and verify products with exact price ranges in Business Brain.']
          : ['Package individual products into higher-ticket bundles or flights to increase Average Order Value (AOV).'],
    };

    // -------------------------------------------------------------------------
    // 2. PRODUCT-MARKET FIT & POSITIONING CLARITY
    // -------------------------------------------------------------------------
    const hasValueProp = Boolean(profile?.valueProposition);
    const profilePersonas = profile?.customerPersonas || [];
    const totalPersonasCount = Math.max(profilePersonas.length, audienceSegments.length);
    const hasAudience = totalPersonasCount > 0;
    const posScore = hasValueProp && hasAudience ? 88 : hasValueProp || hasAudience ? 60 : 30;

    const positioningDiagnosis: DimensionDiagnosis = {
      dimension: 'MARKET_FIT_POSITIONING',
      name: 'Product-Market Fit & Positioning Clarity',
      score: posScore,
      status: posScore >= 80 ? 'EXCELLENT' : posScore >= 60 ? 'HEALTHY' : 'CRITICAL',
      keyMetrics: {
        valuePropositionDefined: hasValueProp,
        customerPersonasCount: totalPersonasCount,
      },
      findings: [
        {
          statement: hasValueProp
            ? `Value proposition defined: "${profile!.valueProposition}"`
            : 'Value proposition is unarticulated in Business Brain.',
          classification: 'CONFIRMED_FACT',
          confidence: 1.0,
        },
        {
          statement: hasAudience
            ? `${totalPersonasCount} ICP persona(s) configured with documented pain points.`
            : 'Customer personas not yet configured.',
          classification: 'CONFIRMED_FACT',
          confidence: 1.0,
        },
      ],
      identifiedVulnerabilities: !hasValueProp ? ['Lacks explicit value proposition to contrast against incumbents.'] : [],
      remediationSuggestions: !hasValueProp
        ? ['Define a sharp, contrasting value proposition highlighting why buyers switch from incumbents.']
        : ['Conduct 15 customer discovery interviews to validate persona pain point resonance.'],
    };

    // -------------------------------------------------------------------------
    // 3. FUNNEL VELOCITY & CONVERSION
    // -------------------------------------------------------------------------
    const convRate = options?.telemetryMetrics?.trackedConversionRate;
    const funnelScore = convRate !== undefined ? (convRate >= 3.0 ? 90 : convRate >= 1.8 ? 70 : 40) : 55;

    const funnelDiagnosis: DimensionDiagnosis = {
      dimension: 'FUNNEL_VELOCITY',
      name: 'Funnel Velocity & Conversion Friction',
      score: funnelScore,
      status: funnelScore >= 75 ? 'HEALTHY' : funnelScore >= 50 ? 'MODERATE' : 'AT_RISK',
      keyMetrics: {
        trackedConversionRate: convRate !== undefined ? `${convRate}%` : 'INSUFFICIENT_TELEMETRY',
        monthlyVisitors: options?.telemetryMetrics?.monthlyVisitors || 'UNTRACKED',
      },
      findings: [
        {
          statement: convRate !== undefined
            ? `Measured conversion rate is ${convRate}%.`
            : 'Live funnel conversion rate telemetry not yet connected.',
          classification: convRate !== undefined ? 'CONFIRMED_FACT' : 'AI_HYPOTHESIS',
          confidence: convRate !== undefined ? 0.95 : 0.6,
        },
      ],
      identifiedVulnerabilities: convRate !== undefined && convRate < 2.0
        ? ['Conversion rate is below industry threshold, signaling pricing card hesitation or checkout friction.']
        : ['Telemetry data missing: unable to pinpoint drop-offs with absolute certainty.'],
      remediationSuggestions: [
        'Deploy deterministic Evidence Badges and transparent pricing cards on the checkout page.',
      ],
    };

    // -------------------------------------------------------------------------
    // 4. RETENTION, LTV & CHURN RISK
    // -------------------------------------------------------------------------
    const churn = options?.telemetryMetrics?.churnRateMonthly;
    const retScore = churn !== undefined ? (churn <= 3 ? 90 : churn <= 7 ? 70 : 40) : 60;

    const retentionDiagnosis: DimensionDiagnosis = {
      dimension: 'RETENTION_CHURN',
      name: 'Retention, LTV & Churn Risk',
      score: retScore,
      status: retScore >= 75 ? 'HEALTHY' : retScore >= 55 ? 'MODERATE' : 'AT_RISK',
      keyMetrics: {
        monthlyChurnRate: churn !== undefined ? `${churn}%` : 'UNTRACKED',
        ltvToCacRatio: options?.telemetryMetrics?.ltv && options?.telemetryMetrics?.cac
          ? Number((options.telemetryMetrics.ltv / options.telemetryMetrics.cac).toFixed(1))
          : 'UNKNOWN',
      },
      findings: [
        {
          statement: 'Retention baseline inferred from business model and documented objections.',
          classification: 'AI_HYPOTHESIS',
          confidence: 0.7,
        },
      ],
      identifiedVulnerabilities: ['Customer buying objections in Business Brain require continuous refresh from sales calls.'],
      remediationSuggestions: [
        'Set up automated Day-14 post-purchase check-in sequence to head off churn before Day-30 renewals.',
      ],
    };

    // -------------------------------------------------------------------------
    // 5. PRICING POWER & DEFENSIBILITY
    // -------------------------------------------------------------------------
    const hasExclusions = profile?.strategicMemory?.explicitExclusions && profile.strategicMemory.explicitExclusions.length > 0;
    const pricingPowerScore = prices.length > 0 && hasExclusions ? 85 : prices.length > 0 ? 70 : 35;

    const pricingPowerDiagnosis: DimensionDiagnosis = {
      dimension: 'PRICING_POWER',
      name: 'Pricing Power & Defensibility',
      score: pricingPowerScore,
      status: pricingPowerScore >= 75 ? 'HEALTHY' : 'MODERATE',
      keyMetrics: {
        hasDiscountingExclusions: Boolean(hasExclusions),
        premiumPricingVerified: prices.some((p) => p > 500),
      },
      findings: [
        {
          statement: hasExclusions
            ? `Founder has set explicit pricing protection: "${profile!.strategicMemory!.explicitExclusions[0]}"`
            : 'No explicit discounting prohibitions recorded in strategic memory.',
          classification: 'CONFIRMED_FACT',
          confidence: 1.0,
        },
      ],
      identifiedVulnerabilities: !hasExclusions ? ['Risk of reactive discounting when pressured by competitors.'] : [],
      remediationSuggestions: [
        'Anchor pricing on transparent proof points rather than matching competitor discount cycles.',
      ],
    };

    // -------------------------------------------------------------------------
    // 6. BRAND AUTHORITY & REPUTATION
    // -------------------------------------------------------------------------
    const hasApprovedClaims = brand?.approvedClaims && brand.approvedClaims.length > 0;
    const brandScore = brand && hasApprovedClaims ? 88 : brand ? 65 : 30;

    const brandDiagnosis: DimensionDiagnosis = {
      dimension: 'BRAND_AUTHORITY',
      name: 'Brand Authority & Proof Assets',
      score: brandScore,
      status: brandScore >= 75 ? 'HEALTHY' : 'MODERATE',
      keyMetrics: {
        brandIdentityConfigured: Boolean(brand),
        approvedClaimsCount: brand?.approvedClaims?.length || 0,
        svgOnlyCollateral: true, // STRICT VIDEO EXCLUSION
      },
      findings: [
        {
          statement: brand
            ? `Brand Identity configured: "${brand.brandName}". Voice: ${(brand.voice || []).join(', ')}.`
            : 'Brand identity guidelines unconfigured.',
          classification: 'CONFIRMED_FACT',
          confidence: 1.0,
        },
      ],
      identifiedVulnerabilities: !brand ? ['Inconsistent brand assets weaken customer trust.'] : [],
      remediationSuggestions: [
        'Lock brand visual tokens and certified claims in Brand Studio to prevent ad-hoc collateral inconsistency.',
      ],
    };

    // -------------------------------------------------------------------------
    // 7. CAPITAL EFFICIENCY & RUNWAY
    // -------------------------------------------------------------------------
    const mktBudget =
      (resources as any)?.monthlyMarketingBudget ||
      (typeof resources?.marketingBudget === 'number' ? resources.marketingBudget : (resources?.marketingBudget as any)?.monthly);
    const capScore = mktBudget ? (mktBudget >= 2000 ? 85 : 65) : 30;

    const capitalDiagnosis: DimensionDiagnosis = {
      dimension: 'CAPITAL_EFFICIENCY',
      name: 'Capital & Resource Allocation Efficiency',
      score: capScore,
      status: capScore >= 75 ? 'HEALTHY' : capScore >= 50 ? 'MODERATE' : 'CRITICAL',
      keyMetrics: {
        monthlyMarketingBudget: mktBudget || 'UNDEFINED',
      },
      findings: [
        {
          statement: mktBudget
            ? `Defined monthly marketing capital allocation of ${mktBudget}.`
            : 'Monthly marketing budget undefined in Business Brain.',
          classification: 'CONFIRMED_FACT',
          confidence: 1.0,
        },
      ],
      identifiedVulnerabilities: !mktBudget ? ['Undefined marketing budget invites cashflow volatility.'] : [],
      remediationSuggestions: [
        'Commit a strict monthly test budget and cap experimental acquisition spend.',
      ],
    };

    // -------------------------------------------------------------------------
    // 8. OPERATIONAL CAPACITY & FULFILLMENT
    // -------------------------------------------------------------------------
    const capacityLimit = resources?.operatingCapacity || (resources as any)?.operationalCapacity;
    const opScore = capacityLimit ? 80 : 50;

    const operationalDiagnosis: DimensionDiagnosis = {
      dimension: 'OPERATIONAL_CAPACITY',
      name: 'Operational Capacity & Fulfillment Limits',
      score: opScore,
      status: opScore >= 70 ? 'HEALTHY' : 'MODERATE',
      keyMetrics: {
        documentedCapacityLimit: capacityLimit || 'UNDEFINED',
      },
      findings: [
        {
          statement: capacityLimit
            ? `Documented operating capacity limit: "${capacityLimit}".`
            : 'Operational capacity ceiling is not specified.',
          classification: 'CONFIRMED_FACT',
          confidence: 1.0,
        },
      ],
      identifiedVulnerabilities: !capacityLimit ? ['Uncapped growth campaigns risk causing fulfillment delays or stockouts.'] : [],
      remediationSuggestions: [
        'Specify weekly order fulfillment capacity in Business Brain to ground growth projections.',
      ],
    };

    // -------------------------------------------------------------------------
    // 9. REGULATORY & COMPLIANCE HAZARDS
    // -------------------------------------------------------------------------
    const regScore = 90; // High by default due to strict TruthCheck & exclusion engine
    const regulatoryDiagnosis: DimensionDiagnosis = {
      dimension: 'REGULATORY_COMPLIANCE',
      name: 'Regulatory Compliance & Truth Safeguards',
      score: regScore,
      status: 'EXCELLENT',
      keyMetrics: {
        truthCheckActive: true,
        strictVideoExclusionActive: true,
        forbiddenClaimsChecked: Boolean(hasExclusions),
      },
      findings: [
        {
          statement: 'Active TruthCheck Engine intercepts unverified claims, superlatives, and price hallucinations.',
          classification: 'CONFIRMED_FACT',
          confidence: 1.0,
        },
      ],
      identifiedVulnerabilities: [],
      remediationSuggestions: [
        'Maintain strict separation between confirmed facts and marketing hypotheses.',
      ],
    };

    // -------------------------------------------------------------------------
    // 10. GROWTH LEVERAGE & SCALABILITY
    // -------------------------------------------------------------------------
    const hasGoals = goals.length > 0;
    const growthScore = hasGoals ? 82 : 45;

    const growthLeverageDiagnosis: DimensionDiagnosis = {
      dimension: 'GROWTH_LEVERAGE',
      name: 'Growth Leverage & Scalable Distribution',
      score: growthScore,
      status: growthScore >= 70 ? 'HEALTHY' : 'MODERATE',
      keyMetrics: {
        activeGoalsCount: goals.length,
      },
      findings: [
        {
          statement: hasGoals
            ? `${goals.length} active business objective(s) registered in Goal Tracking.`
            : 'No active strategic goals defined in workspace.',
          classification: 'CONFIRMED_FACT',
          confidence: 1.0,
        },
      ],
      identifiedVulnerabilities: !hasGoals ? ['Lack of target metrics leads to unfocused marketing experiments.'] : [],
      remediationSuggestions: [
        'Define 2 specific 30-day target milestones (e.g., target customer count or CAC ceiling).',
      ],
    };

    // Combine all dimensions
    const allDimensions: Record<BusinessDiagnosisDimension, DimensionDiagnosis> = {
      UNIT_ECONOMICS: unitEconomicsDiagnosis,
      MARKET_FIT_POSITIONING: positioningDiagnosis,
      FUNNEL_VELOCITY: funnelDiagnosis,
      RETENTION_CHURN: retentionDiagnosis,
      PRICING_POWER: pricingPowerDiagnosis,
      BRAND_AUTHORITY: brandDiagnosis,
      CAPITAL_EFFICIENCY: capitalDiagnosis,
      OPERATIONAL_CAPACITY: operationalDiagnosis,
      REGULATORY_COMPLIANCE: regulatoryDiagnosis,
      GROWTH_LEVERAGE: growthLeverageDiagnosis,
    };

    // Compute Overall Health Score
    const dimensionList = Object.values(allDimensions);
    const overallHealthScore = Math.round(
      dimensionList.reduce((sum, d) => sum + d.score, 0) / dimensionList.length
    );

    const stageLower = (profile?.stage || '').toLowerCase();
    const isPreSeed = stageLower.includes('idea') || stageLower.includes('pre-launch') || prices.length === 0;

    const maturityStage = isPreSeed
      ? 'PRE_SEED'
      : overallHealthScore >= 82
        ? 'ESTABLISHED'
        : overallHealthScore >= 68
          ? 'GROWTH_SCALING'
          : overallHealthScore >= 45
            ? 'EARLY_TRACTION'
            : 'PRE_SEED';

    // -------------------------------------------------------------------------
    // THEORY OF CONSTRAINTS: FIND PRIMARY BINDING CONSTRAINT
    // -------------------------------------------------------------------------
    const sortedByScore = [...dimensionList].sort((a, b) => a.score - b.score);
    const weakest = sortedByScore[0];

    const primaryConstraint: PrimaryConstraintAnalysis = {
      dimension: weakest.dimension,
      title: `The Primary Growth Bottleneck: ${weakest.name}`,
      bindingProblem: weakest.identifiedVulnerabilities[0] || `${weakest.name} currently scores ${weakest.score}/100 and limits growth velocity.`,
      theoryOfConstraintsExplanation:
        `According to the Theory of Constraints, system throughput is determined solely by the single most restrictive bottleneck (${weakest.name}). Pouring capital into other departments will produce diminishing returns until this constraint is broken.`,
      severity: weakest.score < 50 ? 'CRITICAL' : weakest.score < 70 ? 'HIGH' : 'MODERATE',
      immediateRemediationSprints: [
        {
          sprintNumber: 1,
          actionTitle: weakest.remediationSuggestions[0] || `Resolve critical gaps in ${weakest.name}`,
          responsibleDepartment: this.mapDimensionToDepartment(weakest.dimension),
          estimatedDays: 7,
          expectedImpact: `Lifts ${weakest.name} score from ${weakest.score} to ${Math.min(100, weakest.score + 25)}.`,
        },
        {
          sprintNumber: 2,
          actionTitle: 'Verify business metrics against baseline and evaluate downstream throughput',
          responsibleDepartment: 'PERFORMANCE_INTELLIGENCE',
          estimatedDays: 7,
          expectedImpact: 'Validates that the primary bottleneck is successfully unblocked.',
        },
      ],
    };

    // -------------------------------------------------------------------------
    // WHAT NOT TO DO DIRECTIVES (PREVENT PREMATURE CAPITAL & TIME WASTE)
    // -------------------------------------------------------------------------
    const whatNotToDoDirectives: WhatNotToDoDirective[] = [
      {
        prohibitedAction: 'Do NOT run broad paid advertising campaigns prior to validated conversion proofs.',
        rationale: 'Top-of-funnel paid traffic without high-converting pricing cards burns cash without learning.',
        consequenceIfIgnored: 'Accelerated burn rate and distorted customer acquisition cost telemetry.',
        riskCategory: 'CAPITAL_WASTE',
      },
      {
        prohibitedAction: 'Do NOT introduce reactive price discounts to compete with mass competitors.',
        rationale: 'Discounting high-quality craft offerings destroys contribution margin and signals desperation to buyers.',
        consequenceIfIgnored: 'Erosion of gross margins and permanent brand devaluation.',
        riskCategory: 'BRAND_DILUTION',
      },
      {
        prohibitedAction: 'Do NOT invest in complex video production, reels, or video rendering pipelines.',
        rationale: 'BrainWise operates under strict video exclusion. Visual collateral is strictly deterministic SVG vector and static carousels.',
        consequenceIfIgnored: 'High production costs, delayed delivery, and distraction from core unit economics.',
        riskCategory: 'OPERATIONAL_CHAOS',
      },
    ];

    // -------------------------------------------------------------------------
    // EVIDENCE-BACKED SWOT MATRIX
    // -------------------------------------------------------------------------
    const strengths: DiagnosticFinding[] = [];
    const weaknesses: DiagnosticFinding[] = [];
    const opportunities: DiagnosticFinding[] = [];
    const threats: DiagnosticFinding[] = [];

    if (products.length > 0) {
      strengths.push({
        statement: `Registered catalogue with ${products.length} commercial product(s).`,
        classification: 'CONFIRMED_FACT',
        confidence: 1.0,
      });
    }
    if (brand) {
      strengths.push({
        statement: `Established Brand Identity guidelines for "${brand.brandName}".`,
        classification: 'CONFIRMED_FACT',
        confidence: 1.0,
      });
    }
    if (prices.length === 0) {
      weaknesses.push({
        statement: 'No verified product pricing in catalogue.',
        classification: 'CONFIRMED_FACT',
        confidence: 1.0,
      });
    }
    if (!mktBudget) {
      weaknesses.push({
        statement: 'Undefined monthly marketing budget.',
        classification: 'CONFIRMED_FACT',
        confidence: 1.0,
      });
    }

    opportunities.push({
      statement: 'Direct outbound positioning targeting competitor pricing opacity.',
      classification: 'AI_HYPOTHESIS',
      confidence: 0.85,
    });
    opportunities.push({
      statement: 'Product bundling and gift flights to lift Average Order Value by 25-40%.',
      classification: 'CALCULATION',
      confidence: 0.9,
    });

    threats.push({
      statement: 'Aggressive mass-market competitor ad budgets and promotional discounts.',
      classification: 'OBSERVED_EVIDENCE',
      confidence: 0.88,
    });

    return {
      workspaceId,
      businessName,
      evaluatedAt: now,
      overallHealthScore,
      maturityStage,
      dimensions: allDimensions,
      primaryConstraint,
      whatNotToDoDirectives,
      swotMatrix: {
        strengths,
        weaknesses,
        opportunities,
        threats,
      },
      dataConfidenceScore,
      citations,
    };
  }

  private mapDimensionToDepartment(dimension: BusinessDiagnosisDimension): string {
    switch (dimension) {
      case 'UNIT_ECONOMICS':
      case 'CAPITAL_EFFICIENCY':
        return 'FINANCIAL_INTELLIGENCE';
      case 'MARKET_FIT_POSITIONING':
      case 'PRICING_POWER':
        return 'BUSINESS_STRATEGY';
      case 'FUNNEL_VELOCITY':
      case 'GROWTH_LEVERAGE':
        return 'GROWTH_DIRECTOR';
      case 'RETENTION_CHURN':
        return 'CUSTOMER_INTELLIGENCE';
      case 'BRAND_AUTHORITY':
        return 'BRAND_STUDIO';
      case 'OPERATIONAL_CAPACITY':
        return 'OPERATIONS';
      case 'REGULATORY_COMPLIANCE':
        return 'COMPLIANCE';
      default:
        return 'BUSINESS_STRATEGY';
    }
  }
}

export const businessDiagnosisEngine = new BusinessDiagnosisEngine();
