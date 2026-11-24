/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { businessProfileRepository } from '../repositories/businessProfileRepository';
import { productRepository } from '../repositories/productRepository';
import { brandIdentityRepository } from '../repositories/brandIdentityRepository';
import { goalRepository } from '../repositories/goalRepository';
import { memoryService } from './memoryService';
import { decisionRepository } from '../repositories/decisionRepository';
import type { StrategicRecommendation, KnowledgeSourceCitation } from '../types/api';

export class StrategicReasoningService {
  /**
   * Generates grounded, actionable strategic recommendations strictly respecting business constraints
   */
  public async generateStrategies(params: {
    workspaceId: string;
    targetDepartment?: string;
    goalId?: string;
  }): Promise<StrategicRecommendation[]> {
    const { workspaceId, targetDepartment, goalId } = params;
    const profile = await businessProfileRepository.getProfile(workspaceId);
    const products = await productRepository.listProducts(workspaceId);
    const brand = await brandIdentityRepository.getLatest(workspaceId);
    const goals = await goalRepository.listGoals(workspaceId);
    const episodes = await memoryService.listEpisodes(workspaceId);
    const decisions = await decisionRepository.listDecisions(workspaceId);

    const resources = profile?.resourcesAndConstraints;
    const mb = resources?.marketingBudget;
    const verifiedBudget =
      (resources as any)?.monthlyMarketingBudget ||
      (typeof mb === 'number' ? mb : (mb as any)?.monthly);
    const budgetEstimate: number | 'UNKNOWN' =
      typeof verifiedBudget === 'number' ? Math.round(verifiedBudget * 0.4) : 'UNKNOWN';
    const capacityLimit =
      resources?.operatingCapacity ||
      (resources as any)?.operationalCapacity ||
      'Standard Capacity';
    const exclusions: string[] =
      profile?.strategicMemory?.explicitExclusions || (resources as any)?.explicitExclusions || [];

    const activeGoals = goalId
      ? goals.filter((g) => g.goalId === goalId)
      : goals.filter((g) => g.status !== 'achieved');

    const recommendations: StrategicRecommendation[] = [];

    // Filter past rejected decisions to avoid recommending rejected ideas
    const rejectedTitles = new Set(
      decisions
        .filter((d) => d.userApproval.status === 'rejected')
        .map((d) => d.title.toLowerCase())
    );

    // Citations
    const profileCitation: KnowledgeSourceCitation = {
      sourceId: `src_profile_${workspaceId}`,
      sourceType: 'USER_CONFIRMED_FACT',
      title: `${profile?.businessName || 'Business'} Profile`,
      confidence: 1.0,
      verifiedAt: profile?.lastUpdated,
    };

    // Strategy 1: Targeted Commercial Accounts Expansion (if products and goals exist)
    const primaryProduct =
      products.find(
        (p) =>
          p.category?.toLowerCase().includes('keg') ||
          p.category?.toLowerCase().includes('commercial')
      ) || products[0];
    const wholesaleTitle = 'Direct B2B Commercial Account Expansion';

    if (!rejectedTitles.has(wholesaleTitle.toLowerCase())) {
      const targetGoal = activeGoals[0];
      recommendations.push({
        strategyId: `strat_b2b_${Date.now()}`,
        workspaceId,
        title: wholesaleTitle,
        objective: targetGoal
          ? `Support Goal: "${targetGoal.title}" through direct wholesale distribution.`
          : 'Acquire high-retention commercial accounts with verified unit economics.',
        reason: primaryProduct
          ? `Grounded in verified product "${primaryProduct.name}" ($${primaryProduct.price}) and operational capacity (${capacityLimit}).`
          : 'Focusing on verified high-margin commercial offerings maximizes cashflow efficiency.',
        supportingEvidence: [profileCitation],
        requiredActions: [
          {
            action: 'Compile verified wholesale ratecard highlighting zero prep labor benefits.',
            sequence: 1,
            estimatedEffortDays: 2,
            responsibleDepartment: 'BRAND_STUDIO',
          },
          {
            action: 'Initiate outbound sampling cadence to 25 target specialty venues.',
            sequence: 2,
            estimatedEffortDays: 14,
            responsibleDepartment: 'GROWTH_DIRECTOR',
          },
          {
            action: 'Establish bi-weekly cold-chain delivery routes within operating capacity.',
            sequence: 3,
            estimatedEffortDays: 7,
            responsibleDepartment: 'OPERATIONS',
          },
        ],
        responsibleDepartment: targetDepartment || 'GROWTH_DIRECTOR',
        expectedOutcome:
          'Secure 3 to 5 initial recurring commercial supply agreements within capacity boundaries.',
        budgetEstimate: budgetEstimate,
        budgetCurrency: (typeof mb === 'object' && (mb as any)?.currency) || 'USD',
        requiredResources: [
          'Product specification collateral',
          'Wholesale pricing ratecard',
          'Sales route schedule',
        ],
        risks: [
          {
            risk: 'Wholesale accounts request delivery beyond current capacity limits.',
            severity: 'medium',
            mitigation: `Strictly enforce weekly throughput limit of ${capacityLimit}.`,
          },
          ...(exclusions.length > 0
            ? [
                {
                  risk: 'Marketing creative inadvertently violates founder exclusions.',
                  severity: 'high' as const,
                  mitigation: `Enforce Truth Check on rules: ${exclusions.join(', ')}`,
                },
              ]
            : []),
          ...(episodes.length > 0
            ? [
                {
                  risk: 'Repeating historical experiment failure.',
                  severity: 'low' as const,
                  mitigation: `Incorporate learnings from ${episodes.length} past operational episode(s).`,
                },
              ]
            : []),
        ],
        dependencies: primaryProduct ? [`Product: ${primaryProduct.name}`] : [],
        kpis: [
          {
            metric: 'Commercial Inquiries Generated',
            target: '15 qualified cafes',
            baseline: '0',
          },
          {
            metric: 'Signed Supply Contracts',
            target: '4 active accounts',
            baseline: '0',
          },
        ],
        measurementPeriod: '60 days',
        status: 'proposed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    // Strategy 2: Brand Voice Discipline & Claims Enforcement
    const brandTitle = 'Brand Voice Consistency & Claims Hardening';
    if (brand && !rejectedTitles.has(brandTitle.toLowerCase())) {
      recommendations.push({
        strategyId: `strat_brand_${Date.now()}`,
        workspaceId,
        title: brandTitle,
        objective: 'Eliminate copy inconsistencies and strictly enforce brand exclusions.',
        reason: `Align all marketing channels with approved claims (${(brand.approvedClaims || []).join('; ')}) while avoiding restricted words.`,
        supportingEvidence: [
          {
            sourceId: `src_brand_${brand.brandIdentityId}`,
            sourceType: 'USER_CONFIRMED_FACT',
            title: 'Brand Identity Guidelines',
            confidence: 1.0,
          },
        ],
        requiredActions: [
          {
            action: 'Audit active digital collateral against words to avoid list.',
            sequence: 1,
            estimatedEffortDays: 3,
            responsibleDepartment: 'BRAND_STUDIO',
          },
          {
            action: 'Embed Truth Check guardrail into all department generation templates.',
            sequence: 2,
            estimatedEffortDays: 1,
            responsibleDepartment: 'IDEA_INTELLIGENCE',
          },
        ],
        responsibleDepartment: 'BRAND_STUDIO',
        expectedOutcome: '100% compliance across outbound touchpoints with zero restricted claims.',
        budgetEstimate: 0, // Operational audit requires no extra ad budget
        budgetCurrency: 'USD',
        requiredResources: ['Brand intelligence guidelines document'],
        risks: [
          {
            risk: 'Copy fatigue if creative angles become overly constrained.',
            severity: 'low',
            mitigation: 'Anti-fatigue memory rotates verified value propositions.',
          },
        ],
        dependencies: ['Brand Guidelines'],
        kpis: [
          {
            metric: 'Compliance Rate',
            target: '100%',
            baseline: '85%',
          },
        ],
        measurementPeriod: '30 days',
        status: 'proposed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    return recommendations;
  }

  /**
   * Applies user response to a recommendation (accept, reject, defer)
   */
  public async handleRecommendationDecision(params: {
    workspaceId: string;
    strategyId: string;
    decision: 'accepted' | 'rejected' | 'deferred';
    userId: string;
    userFeedback?: string;
    alternativesConsidered?: Array<{ alternative: string; reasonRejected: string }>;
  }): Promise<StrategicRecommendation> {
    const { workspaceId, strategyId, decision, userId, userFeedback, alternativesConsidered } =
      params;

    // Record formal decision in decision repository
    await decisionRepository.recordDecision({
      decisionId: `dec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      workspaceId,
      title: `Recommendation Decision: ${strategyId}`,
      decision: `Founder ${decision} strategy ${strategyId}. Reason: ${userFeedback || 'No additional comment'}`,
      supportingEvidence: [],
      alternativesConsidered: alternativesConsidered || [],
      userApproval: {
        status: decision === 'accepted' ? 'approved' : decision,
        approvedBy: userId,
        approvedAt: new Date().toISOString(),
        rationale: userFeedback,
        comments: userFeedback,
      },
      decisionDate: new Date().toISOString(),
      responsibleDepartment: 'BUSINESS_STRATEGY',
      expectedResult: decision === 'accepted' ? 'Proceed with action plan' : 'Strategy archived',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Record episode so future reasoning knows founder preferences
    if (decision === 'rejected') {
      await memoryService.recordEpisode({
        workspaceId,
        department: 'GROWTH_DIRECTOR',
        activityType: 'strategic_decision',
        title: `Rejected Recommendation: ${strategyId}`,
        summary: `User explicitly rejected strategy ${strategyId}. Feedback: ${userFeedback || 'Rejected by user preference'}`,
        learnings: [
          `Do not re-recommend strategy ${strategyId} without new supporting performance data.`,
        ],
        userAttribution: userId,
      });
    }

    return {
      strategyId,
      workspaceId,
      title: 'Strategy Updated',
      objective: 'Updated status according to user decision',
      reason: userFeedback || `Status set to ${decision}`,
      supportingEvidence: [],
      requiredActions: [],
      responsibleDepartment: 'GROWTH_DIRECTOR',
      expectedOutcome: decision,
      budgetEstimate: 0,
      budgetCurrency: 'USD',
      requiredResources: [],
      risks: [],
      dependencies: [],
      kpis: [],
      measurementPeriod: 'N/A',
      status: decision,
      userFeedback,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
}

export const strategicReasoningService = new StrategicReasoningService();
