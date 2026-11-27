/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'node:crypto';
import type { AssembledGrowthContext } from './growthTypes';
import { unifiedAiOrchestrator } from '../../ai/unifiedOrchestrator';

export interface CampaignPlan {
  campaignId: string;
  name: string;
  objective: string;
  targetAudience: string;
  channel: string;
  format: 'SVG_COLLATERAL' | 'STATIC_CAROUSEL' | 'OUTREACH_COPY' | 'CONTENT_PACK';
  budget: number;
  timelineWeeks: number;
  creativeAssetBrief: {
    headline: string;
    subheadline: string;
    callToAction: string;
    keyPoints: string[];
    brandStudioDirective: string;
  };
  successMetrics: {
    targetMetric: string;
    targetValue: number;
    unit: string;
  };
}

export interface OutreachSequence {
  sequenceId: string;
  title: string;
  targetRole: string;
  steps: Array<{
    stepNumber: number;
    delayDays: number;
    subject: string;
    bodyText: string;
    proofPoint: string;
  }>;
}

export interface FunnelAuditFinding {
  findingId: string;
  pageArea: 'PRICING_CARDS' | 'CHECKOUT_FORM' | 'HERO_HEADLINE' | 'SOCIAL_PROOF';
  observedFriction: string;
  beforeCopy: string;
  recommendedAfterCopy: string;
  projectedConversionUpliftPercent: number;
  implementationEffortHours: number;
}

export interface RetentionInitiative {
  initiativeId: string;
  lifecycleStage: 'ONBOARDING' | 'DAY_14_ACTIVE' | 'DAY_30_RENEWAL' | 'AT_RISK';
  triggerCondition: string;
  actionSummary: string;
  incentive: string;
  expectedChurnReductionPercent: number;
}

export interface PartnershipProposal {
  partnerId: string;
  partnerCategory: 'NON_COMPETING_SaaS' | 'INDUSTRY_NEWSLETTER' | 'COMPLEMENTARY_CONSULTANT';
  collaborationConcept: string;
  mutualBenefit: string;
  revenueSharePercent: number;
  outreachPitch: string;
}

export class GrowthDepartmentEngines {
  /**
   * 1. Growth Marketing Director: Generates a complete campaign plan
   */
  public generateMarketingCampaign(context: AssembledGrowthContext): CampaignPlan {
    const { businessName, targetAudience, nearestCompetitor, unitEconomics } = context;
    const cid = `cmp_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

    return {
      campaignId: cid,
      name: `${businessName} Whitespace Contrast Campaign`,
      objective: `Acquire high-intent customers frustrated with ${nearestCompetitor || 'incumbent'} pricing opacity`,
      targetAudience,
      channel: 'LinkedIn Sponsored Content & Organic Advocacy',
      format: 'STATIC_CAROUSEL',
      budget: Math.min(10000, context.marketingBudgetMonthly || 5000),
      timelineWeeks: 4,
      creativeAssetBrief: {
        headline: `Stop Overpaying for Opaque Contracts. Experience Deterministic Quality.`,
        subheadline: `How ${businessName} delivers verified results for ${unitEconomics.currency} ${unitEconomics.averageOrderValue}.`,
        callToAction: 'View Transparent Calculation Proof',
        keyPoints: [
          `No locked-in enterprise pricing or hidden setup fees.`,
          `Zero video production bloat: clean, high-DPI deterministic execution.`,
          `Grounded in verified customer evidence.`,
        ],
        brandStudioDirective: 'Generate a 5-slide static carousel using Brand Studio with brand primary colors and high-contrast typography.',
      },
      successMetrics: {
        targetMetric: 'Qualified Clicks to Pricing Page',
        targetValue: 200,
        unit: 'clicks',
      },
    };
  }

  /**
   * AI-orchestrated Marketing Campaign via UnifiedAiOrchestrator
   */
  public async generateMarketingCampaignAsync(params: {
    workspaceId: string;
    userId: string;
    context: AssembledGrowthContext;
    objectiveOverride?: string;
  }): Promise<CampaignPlan> {
    return await unifiedAiOrchestrator.generateMarketingCampaign(params);
  }

  /**
   * AI-orchestrated Outreach Sequence via UnifiedAiOrchestrator
   */
  public async generateOutreachSequenceAsync(params: {
    workspaceId: string;
    context: AssembledGrowthContext;
    targetRole?: string;
  }): Promise<OutreachSequence> {
    return await unifiedAiOrchestrator.generateOutreachSequence(params);
  }

  /**
   * AI-orchestrated Conversion Funnel Audit via UnifiedAiOrchestrator
   */
  public async auditConversionFunnelAsync(params: {
    context: AssembledGrowthContext;
  }): Promise<FunnelAuditFinding[]> {
    return await unifiedAiOrchestrator.auditConversionFunnel(params);
  }

  /**
   * 2. Content & Distribution Director: Generates weekly editorial pillars and storyboards
   */
  public generateContentPillars(context: AssembledGrowthContext) {
    return [
      {
        pillarId: 'pillar_evidence',
        title: 'Evidence-Backed Business Proof',
        description: 'Teardowns contrasting vague marketing claims with deterministic facts and verified metrics.',
        suggestedFrequency: '2x weekly',
        format: 'Multi-frame static carousel (5 slides)',
      },
      {
        pillarId: 'pillar_behind_scenes',
        title: 'Founder Build-in-Public Field Notes',
        description: `Field observations from ${context.businessName}'s daily customer discovery and unit economics tests.`,
        suggestedFrequency: '1x weekly',
        format: 'Long-form commentary + SVG stat snapshot',
      },
      {
        pillarId: 'pillar_customer_win',
        title: 'Customer Friction Resolution',
        description: 'Real pain points resolved using our core offering, emphasizing speed and transparent pricing.',
        suggestedFrequency: '1x weekly',
        format: 'Before/After proof comparison card',
      },
    ];
  }

  /**
   * 3. Sales & Customer Acquisition Director: Generates a 3-step outbound email sequence
   */
  public generateOutreachSequence(context: AssembledGrowthContext): OutreachSequence {
    const { businessName, nearestCompetitor, unitEconomics } = context;
    const sid = `seq_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

    return {
      sequenceId: sid,
      title: `Contrarian Whitespace Wedge Sequence`,
      targetRole: `Founder / Operating Executive`,
      steps: [
        {
          stepNumber: 1,
          delayDays: 0,
          subject: `Quick question regarding ${nearestCompetitor || 'your current setup'}`,
          bodyText: `Hi {{firstName}},\n\nNoticed you're operating in {{industry}}. Most founders we speak with are frustrated by opaque enterprise lock-ins and unpredictable agency fees from legacy providers.\n\nWe built ${businessName} to deliver deterministic business intelligence at a transparent ${unitEconomics.currency} ${unitEconomics.averageOrderValue}.\n\nWorth a brief 5-minute look?`,
          proofPoint: 'Transparent pricing with zero long-term contract lock-in.',
        },
        {
          stepNumber: 2,
          delayDays: 3,
          subject: `Evidence teardown: Why transparent pricing converts 2.4x higher`,
          bodyText: `Hi {{firstName}},\n\nFollowing up on my note. We recently published a teardown showing how upfront, mathematically proven pricing eliminates buyer friction compared to "book a demo" paywalls.\n\nHere is a 1-page summary: {{linkToEvidence}}.\n\nBest,\nFounder`,
          proofPoint: 'Published teardown proving 2.4x higher checkout conversion.',
        },
        {
          stepNumber: 3,
          delayDays: 5,
          subject: `Permission to close file?`,
          bodyText: `Hi {{firstName}},\n\nAssuming this isn't a top priority for you right now. I'll pause our outreach so we don't crowd your inbox.\n\nIf you ever need verified, deterministic growth execution for ${businessName}, feel free to reach out anytime.\n\nCheers,\nFounder`,
          proofPoint: 'Polite closeout preserving positive brand sentiment.',
        },
      ],
    };
  }

  /**
   * 4. Conversion Optimization Director: Identifies high-leverage checkout and pricing card CRO
   */
  public auditConversionFunnel(context: AssembledGrowthContext): FunnelAuditFinding[] {
    const { unitEconomics } = context;
    return [
      {
        findingId: 'cro_pricing_proof',
        pageArea: 'PRICING_CARDS',
        observedFriction: 'Buyers hesitate when price is not immediately supported by concrete calculation proofs or ROI justification.',
        beforeCopy: `Starter Plan — ${unitEconomics.currency} ${unitEconomics.averageOrderValue} / month`,
        recommendedAfterCopy: `Starter Plan — ${unitEconomics.currency} ${unitEconomics.averageOrderValue} / mo [Evidence Verified: Saves 14 hours/mo of manual analysis]`,
        projectedConversionUpliftPercent: 24,
        implementationEffortHours: 2,
      },
      {
        findingId: 'cro_checkout_reassurance',
        pageArea: 'CHECKOUT_FORM',
        observedFriction: 'Lack of refund transparency and fear of automatic renewals causes Step-2 drop-off.',
        beforeCopy: 'Enter Card Details to Subscribe',
        recommendedAfterCopy: 'Secure Instant Checkout · 100% Two-Phase Credit Protection · Cancel Anytime in 1 Click',
        projectedConversionUpliftPercent: 18,
        implementationEffortHours: 1,
      },
    ];
  }

  /**
   * 5. Customer Retention & Revenue Director: Generates post-purchase onboarding and referral loops
   */
  public generateRetentionInitiatives(context: AssembledGrowthContext): RetentionInitiative[] {
    const { unitEconomics } = context;
    return [
      {
        initiativeId: 'ret_day14_nps',
        lifecycleStage: 'DAY_14_ACTIVE',
        triggerCondition: 'Customer has completed 3+ active growth tasks or viewed 2+ reports',
        actionSummary: 'Trigger 1-click in-app satisfaction prompt asking "How well did this task match your expectations?"',
        incentive: 'Award 25 complimentary validation credits upon response.',
        expectedChurnReductionPercent: 15,
      },
      {
        initiativeId: 'ret_referral_loop',
        lifecycleStage: 'ONBOARDING',
        triggerCondition: 'Customer verifies first completed growth experiment',
        actionSummary: 'Generate personalized two-sided founder referral link.',
        incentive: `Both referrer and referee receive ${unitEconomics.currency} ${Math.round(unitEconomics.averageOrderValue * 0.2)} credit bonus.`,
        expectedChurnReductionPercent: 22,
      },
    ];
  }

  /**
   * 6. Partnership & Distribution Director: Generates co-marketing and affiliate proposals
   */
  public generatePartnershipProposals(context: AssembledGrowthContext): PartnershipProposal[] {
    const { businessName, targetAudience } = context;
    return [
      {
        partnerId: 'part_complementary_saas',
        partnerCategory: 'NON_COMPETING_SaaS',
        collaborationConcept: `Co-marketed "Startup Growth Stack" bundle with complementary CRM or Accounting SaaS`,
        mutualBenefit: `Introduce ${businessName} to partner's customer base of 2,000+ early-stage businesses with shared revenue incentive.`,
        revenueSharePercent: 20,
        outreachPitch: `We share the same audience (${targetAudience}). Let's bundle a 30-day trial for our joint users at zero cannibalization.`,
      },
    ];
  }

  /**
   * 7. Growth Economics & Financial Analyst: Computes unit economics and payback schedules
   */
  public computeGrowthFinancialModel(context: AssembledGrowthContext) {
    const { unitEconomics } = context;
    const aov = unitEconomics.averageOrderValue || 500;
    const cac = unitEconomics.customerAcquisitionCost || 150;
    const ltv = unitEconomics.customerLifetimeValue || 1500;
    const margin = unitEconomics.grossMarginPercent || 70;

    const ltvCacRatio = ltv / Math.max(1, cac);
    const grossProfitPerCustomer = aov * (margin / 100);
    const paybackMonths = Math.max(0.5, Math.round((cac / Math.max(1, grossProfitPerCustomer)) * 10) / 10);
    const maxAffordableCac = Math.round(ltv * 0.33);

    return {
      averageOrderValue: aov,
      customerAcquisitionCost: cac,
      customerLifetimeValue: ltv,
      grossMarginPercent: margin,
      ltvCacRatio: Math.round(ltvCacRatio * 10) / 10,
      paybackPeriodMonths: paybackMonths,
      maxAffordableCac,
      capitalEfficiencyStatus: ltvCacRatio >= 3 ? 'HEALTHY' : 'NEEDS_OPTIMIZATION',
      recommendation: ltvCacRatio >= 3
        ? 'Unit economics are strong. Expand top-of-funnel outbound and organic distribution.'
        : 'Optimize conversion rate and pricing before scaling marketing expenditures.',
    };
  }
}

export const growthDepartmentEngines = new GrowthDepartmentEngines();
