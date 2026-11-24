/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'node:crypto';
import { db } from '../../db/firestore';
import type { AssembledGrowthContext, GrowthStrategyEntity } from './growthTypes';

export class GrowthStrategyArchitect {
  /**
   * Formulates an evidence-backed growth strategy tailored to the business stage and model
   */
  public async formulateStrategy(params: {
    context: AssembledGrowthContext;
    executionApproach?: GrowthStrategyEntity['executionApproach'];
    customObjective?: string;
  }): Promise<GrowthStrategyEntity> {
    const { context, executionApproach, customObjective } = params;
    const { workspaceId, stage, businessName, unitEconomics, nearestCompetitor } = context;

    const now = new Date().toISOString();
    const strategyId = `str_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

    // Select archetype if not provided
    let approach: GrowthStrategyEntity['executionApproach'] = executionApproach || 'OUTBOUND_LED';
    if (!executionApproach) {
      if (stage === 'Idea Stage' || stage === 'Pre-Launch') {
        approach = 'OUTBOUND_LED'; // Outbound problem-solution validation
      } else if (unitEconomics.customerAcquisitionCost > 0 && unitEconomics.customerLifetimeValue / unitEconomics.customerAcquisitionCost > 4) {
        approach = 'ORGANIC_LED';
      } else {
        approach = 'PARTNERSHIP_LED';
      }
    }

    const title = `${businessName} Strategic Customer Acquisition & Growth Playbook`;
    const strategicObjective = customObjective || `Acquire initial cohort of verified paying customers and validate sustainable unit economics.`;
    const businessRationale = `Grounded in ${businessName} Business Brain: stage is '${stage}' with ${unitEconomics.currency} ${unitEconomics.averageOrderValue} AOV. Whitespace separation from ${nearestCompetitor || 'incumbents'} requires direct validation without premature advertising expenditure.`;

    const supportingEvidence = [
      `Stage: ${stage} with target audience: ${context.targetAudience}`,
      `Nearest competitor: ${nearestCompetitor || 'Market Incumbents'} with documented pricing whitespace`,
      `Founder weekly capacity: ${context.founderCapacityHoursWeekly} hours`,
      `Strict zero-video collateral mandate enforced across all channels`,
    ];

    const successMetrics = [
      {
        metricName: 'Direct Qualified Responses / Leads',
        targetValue: 25,
        unit: 'leads',
      },
      {
        metricName: 'Paying Customer Conversions',
        targetValue: 10,
        unit: 'paying_customers',
      },
      {
        metricName: 'Blended Acquisition Cost',
        targetValue: Math.max(100, Math.round(unitEconomics.customerLifetimeValue * 0.25)),
        unit: unitEconomics.currency,
      },
    ];

    const risksAndMitigations = [
      {
        risk: 'Target prospects ignore generic outbound messaging',
        mitigation: 'Deploy contrast pricing wedge emphasizing transparent, mathematically proven pricing over competitor opacity.',
      },
      {
        risk: 'Founder bandwidth bottlenecks outbound follow-ups',
        mitigation: 'Cap daily outbound tasks to 45-minute Focus Sprint blocks (max 10 accounts/day).',
      },
    ];

    const alternativeApproaches = [
      'ORGANIC_LED: 5-slide static educational carousels distributed across LinkedIn/Instagram',
      'PARTNERSHIP_LED: Co-marketing with complementary non-competing service providers',
    ];

    const strategy: GrowthStrategyEntity = {
      strategyId,
      workspaceId,
      version: 1,
      title,
      strategicObjective,
      businessRationale,
      supportingEvidence,
      targetCustomerSegment: context.targetAudience,
      primaryGrowthChannel: approach === 'OUTBOUND_LED' ? 'Direct Founder Outbound Wedge' : 'Organic Educational Carousels',
      executionApproach: approach,
      requiredBudgetMonthly: context.marketingBudgetMonthly || 15000,
      expectedTimeframeWeeks: 6,
      successMetrics,
      risksAndMitigations,
      alternativeApproaches,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    };

    await db.doc(`workspaces/${workspaceId}/growthStrategies/${strategyId}`).set(strategy as any);

    return strategy;
  }

  /**
   * Compares 3 strategic scenarios side-by-side
   */
  public compareScenarios(context: AssembledGrowthContext) {
    return {
      organicLed: {
        archetype: 'ORGANIC_LED',
        description: 'Multi-slide static carousels, founder advocacy, and evidence-backed case teardowns',
        timeToResultsWeeks: 8,
        requiredBudget: 5000,
        reachEstimate: '2,500 - 8,000 monthly impressions',
        projectedAcquisitions: 15,
        confidence: 0.85,
        recommended: context.stage === 'Early Traction',
      },
      outboundLed: {
        archetype: 'OUTBOUND_LED',
        description: 'Targeted direct messaging contrasting competitor opacity with transparent pricing',
        timeToResultsWeeks: 3,
        requiredBudget: 2500,
        reachEstimate: '150 - 300 targeted decision-makers',
        projectedAcquisitions: 12,
        confidence: 0.92,
        recommended: context.stage === 'Idea Stage' || context.stage === 'Pre-Launch',
      },
      partnershipLed: {
        archetype: 'PARTNERSHIP_LED',
        description: 'Co-marketing bundles, newsletter cross-promotions, and two-sided referral incentives',
        timeToResultsWeeks: 6,
        requiredBudget: 8000,
        reachEstimate: '5,000 - 15,000 partner audience members',
        projectedAcquisitions: 22,
        confidence: 0.78,
        recommended: context.stage === 'Growing Business',
      },
    };
  }

  /**
   * Retrieves active strategy
   */
  public async getActiveStrategy(workspaceId: string): Promise<GrowthStrategyEntity | null> {
    const snap = await db
      .collection(`workspaces/${workspaceId}/growthStrategies`)
      .where('status', '==', 'ACTIVE')
      .limit(1)
      .get();
    if (snap.empty) return null;
    return (snap.docs[0].data() as unknown) as GrowthStrategyEntity;
  }
}

export const growthStrategyArchitect = new GrowthStrategyArchitect();
