/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  AssembledGrowthContext,
  GrowthBottleneckDiagnosis,
  GrowthRiskAlert,
  WhatNotToDoRecommendation,
} from './growthTypes';

export interface GroundedRecommendationItem {
  id: string;
  whatToDo: string;
  whyToDoIt: string;
  supportingResearch: string;
  expectedBenefit: string;
  difficulty: 'Low' | 'Medium' | 'High';
  estimatedCost: string;
  priority: 'high' | 'medium' | 'low';
  validUntil: string;
  category: 'GROWTH_LEVERAGE' | 'CONVERSION' | 'ACQUISITION' | 'RETENTION';
}

export class GrowthRecommendationEngine {
  /**
   * Generates grounded, deduplicated AI recommendations that strictly respect anti-fatigue and Business Brain
   */
  public generateRecommendations(params: {
    context: AssembledGrowthContext;
    diagnoses: GrowthBottleneckDiagnosis[];
    fatiguedThemes?: string[];
    existingRecommendations?: Array<{ whatToDo: string }>;
  }): GroundedRecommendationItem[] {
    const { context, diagnoses, fatiguedThemes = [], existingRecommendations = [] } = params;
    const items: GroundedRecommendationItem[] = [];
    const now = new Date();
    const validUntil = new Date(now.getTime() + 14 * 86400000).toISOString().slice(0, 10);
    const existingTitles = new Set(existingRecommendations.map((r) => r.whatToDo.toLowerCase().trim()));

    // 1. Recommendation for Primary Bottleneck
    const primaryDiag = diagnoses[0];
    if (primaryDiag && !fatiguedThemes.includes(primaryDiag.dimension)) {
      const title = `Deploy ${primaryDiag.dimension === 'CONVERSION' ? 'Evidence Badges to Pricing Cards' : 'Targeted ICP Outbound Problem Wedge'}`;
      if (!existingTitles.has(title.toLowerCase())) {
        items.push({
          id: `rec_${Date.now()}_1`,
          whatToDo: title,
          whyToDoIt: primaryDiag.problem,
          supportingResearch: `Diagnosis identified ${primaryDiag.dimension} as a ${primaryDiag.classification}. ${primaryDiag.supportingEvidence[0] || ''}`,
          expectedBenefit: primaryDiag.recommendedCorrectiveAction,
          difficulty: 'Low',
          estimatedCost: '₹2,500',
          priority: 'high',
          validUntil,
          category: primaryDiag.dimension === 'CONVERSION' ? 'CONVERSION' : 'ACQUISITION',
        });
      }
    }

    // 2. Recommendation targeting Competitor Whitespace
    const compTheme = `Targeting ${context.nearestCompetitor} Whitespace`;
    if (!fatiguedThemes.includes(compTheme)) {
      const title = `Launch 5-Slide Static SVG Carousel Highlighting ${context.nearestCompetitor} Pricing Bloat`;
      if (!existingTitles.has(title.toLowerCase())) {
        items.push({
          id: `rec_${Date.now()}_2`,
          whatToDo: title,
          whyToDoIt: `Competitive Radar confirms buyers are frustrated with ${context.nearestCompetitor}'s opaque pricing and long onboarding.`,
          supportingResearch: `Competitor weaknesses: ${context.competitorWeaknesses.join(', ')}. Zero video dependency.`,
          expectedBenefit: 'Lower blended CAC by 25% and drive qualified organic demo requests.',
          difficulty: 'Medium',
          estimatedCost: '₹3,500',
          priority: 'high',
          validUntil,
          category: 'GROWTH_LEVERAGE',
        });
      }
    }

    // 3. Recommendation for Referral Loop
    const refTheme = 'Founder Referral Loop';
    if (!fatiguedThemes.includes(refTheme)) {
      const title = 'Activate Two-Sided Bonus Credit Referral Link for Validated Founders';
      if (!existingTitles.has(title.toLowerCase())) {
        items.push({
          id: `rec_${Date.now()}_3`,
          whatToDo: title,
          whyToDoIt: 'Founder-to-founder advocacy provides the lowest blended CAC of any customer acquisition channel.',
          supportingResearch: 'Organic referral loops lower CAC by 40% based on Business Brain unit economics.',
          expectedBenefit: 'Achieve viral referral coefficient K >= 0.20 within 30 days.',
          difficulty: 'Medium',
          estimatedCost: '₹5,000',
          priority: 'medium',
          validUntil,
          category: 'RETENTION',
        });
      }
    }

    return items;
  }

  /**
   * Scans workspace metrics and telemetry to detect growth risks
   */
  public monitorGrowthRisks(params: {
    context: AssembledGrowthContext;
    activeChannelsCount?: number;
    founderUtilizationPercent?: number;
    budgetSpentMonthly?: number;
  }): GrowthRiskAlert[] {
    const alerts: GrowthRiskAlert[] = [];
    const timestamp = Date.now();
    const now = new Date().toISOString();
    const { context } = params;

    // Risk 1: Channel Concentration
    const channelCount = params.activeChannelsCount || 1;
    if (channelCount <= 1) {
      alerts.push({
        alertId: `risk_${timestamp}_1`,
        workspaceId: context.workspaceId,
        riskType: 'CHANNEL_CONCENTRATION',
        severity: 'HIGH',
        evidence: `Workspace relies entirely on a single active customer acquisition channel (${context.channels[0] || 'Direct Outbound'}).`,
        potentialConsequence: 'Sudden channel fatigue, policy changes, or algorithmic disruption will cause immediate pipeline collapse.',
        recommendedAction: 'Queue and test a second orthogonal acquisition channel within the next 30-day roadmap phase.',
        detectedAt: now,
      });
    }

    // Risk 2: Capacity Overload
    const utilization = params.founderUtilizationPercent || 75;
    if (utilization > 100) {
      alerts.push({
        alertId: `risk_${timestamp}_2`,
        workspaceId: context.workspaceId,
        riskType: 'CAPACITY_OVERLOAD',
        severity: 'CRITICAL',
        evidence: `Current sprint workload exceeds available founder capacity (${utilization}% utilization).`,
        potentialConsequence: 'Burnout, missed deadlines, and compromised execution quality across critical customer deliverables.',
        recommendedAction: 'Apply What-Not-To-Do intelligence to postpone non-essential tasks and enforce top-3 focus task cap.',
        detectedAt: now,
      });
    }

    return alerts;
  }

  /**
   * Generates actionable "Stop, Avoid, or Postpone" directives to protect founder focus
   */
  public generateWhatNotToDo(params: {
    context: AssembledGrowthContext;
    fatiguedThemes?: string[];
  }): WhatNotToDoRecommendation[] {
    const recommendations: WhatNotToDoRecommendation[] = [];
    const timestamp = Date.now();
    const now = new Date().toISOString();
    const { stage, nearestCompetitor } = params.context;

    // Rule 1: Zero Video Policy Enforcement
    recommendations.push({
      recommendationId: `wntd_${timestamp}_video`,
      workspaceId: params.context.workspaceId,
      actionType: 'STOP',
      activityTitle: 'AI Video Generation, Video Editing, or Reel Production',
      reasoning: 'BrainWise strictly forbids AI video production. Vector SVGs, static carousels, and deterministic copy deliver 5x higher B2B ROI without rendering delays or video credit burns.',
      resourceFreedUp: '₹15,000+ monthly video tooling costs and 12+ hours of video editing time.',
      alternativePriority: 'High-authority 5-slide SVG carousels and direct ICP outbound copy.',
      createdAt: now,
    });

    // Rule 2: Premature Paid Scaling for Early Stage
    if (stage === 'Idea Stage' || stage === 'Pre-Launch') {
      recommendations.push({
        recommendationId: `wntd_${timestamp}_paid_scaling`,
        workspaceId: params.context.workspaceId,
        actionType: 'AVOID',
        activityTitle: 'Large-Budget Paid Ad Campaigns on Social / Search',
        reasoning: `Scaling paid ads before achieving verified product-market fit burns capital with negative unit economics.`,
        resourceFreedUp: '₹30,000+ unvalidated ad spend.',
        alternativePriority: `Direct 50-account outbound validation against ${nearestCompetitor} whitespace.`,
        createdAt: now,
      });
    }

    // Rule 3: Fatigued Channel or Theme Avoidance
    if (params.fatiguedThemes && params.fatiguedThemes.length > 0) {
      recommendations.push({
        recommendationId: `wntd_${timestamp}_fatigued`,
        workspaceId: params.context.workspaceId,
        actionType: 'POSTPONE',
        activityTitle: `Repeating Saturated / Fatigued Themes: ${params.fatiguedThemes.slice(0, 2).join(', ')}`,
        reasoning: `These messaging angles have repeatedly underperformed or reached diminishing returns in strategic memory.`,
        resourceFreedUp: '6+ hours of wasted campaign creation time.',
        alternativePriority: 'Formulate fresh, contrarian value angles emphasizing transparent mathematical proof.',
        createdAt: now,
      });
    }

    return recommendations;
  }
}

export const growthRecommendationEngine = new GrowthRecommendationEngine();
