/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  ScoredOpportunity,
  OpportunityScoreWeights,
  KnowledgeSourceCitation,
} from '../types/api';

export class OpportunityScoringService {
  public static readonly DEFAULT_WEIGHTS: OpportunityScoreWeights = {
    businessImpact: 0.3,
    strategicAlignment: 0.25,
    evidenceConfidence: 0.2,
    feasibility: 0.15,
    costEfficiency: 0.1,
  };

  public static readonly DISCLAIMER =
    'Opportunity scores indicate relative strategic alignment under current business assumptions and do NOT imply guaranteed revenue, conversion, or commercial success.';

  /**
   * Scores and ranks a list of business opportunities using transparent 5-factor weighted formula
   */
  public rankOpportunities(
    opportunities: Array<{
      opportunityId?: string;
      title: string;
      description: string;
      targetDepartment?: string;
      businessImpact: number; // 0 - 100
      strategicAlignment: number; // 0 - 100
      evidenceConfidence: number; // 0 - 100
      feasibility: number; // 0 - 100
      costEfficiency: number; // 0 - 100
      supportingEvidence?: KnowledgeSourceCitation[];
      statusOverride?: 'rejected' | 'deferred';
    }>,
    customWeights?: Partial<OpportunityScoreWeights>
  ): ScoredOpportunity[] {
    const weights: OpportunityScoreWeights = {
      ...OpportunityScoringService.DEFAULT_WEIGHTS,
      ...customWeights,
    };

    const alignWeight = weights.strategicAlignment ?? weights.goalAlignment ?? 0.25;

    // Normalize weights to sum exactly to 1.0
    const weightSum =
      weights.businessImpact +
      alignWeight +
      weights.evidenceConfidence +
      weights.feasibility +
      weights.costEfficiency;

    const norm = {
      impact: weights.businessImpact / weightSum,
      alignment: alignWeight / weightSum,
      evidence: weights.evidenceConfidence / weightSum,
      feasibility: weights.feasibility / weightSum,
      cost: weights.costEfficiency / weightSum,
    };

    const scored: ScoredOpportunity[] = opportunities.map((opp, idx) => {
      const raw = {
        businessImpact: Math.min(100, Math.max(0, opp.businessImpact)),
        strategicAlignment: Math.min(100, Math.max(0, opp.strategicAlignment)),
        evidenceConfidence: Math.min(100, Math.max(0, opp.evidenceConfidence)),
        feasibility: Math.min(100, Math.max(0, opp.feasibility)),
        costEfficiency: Math.min(100, Math.max(0, opp.costEfficiency)),
      };

      const factorContributions = {
        businessImpact: Math.round(raw.businessImpact * norm.impact * 100) / 100,
        strategicAlignment: Math.round(raw.strategicAlignment * norm.alignment * 100) / 100,
        evidenceConfidence: Math.round(raw.evidenceConfidence * norm.evidence * 100) / 100,
        feasibility: Math.round(raw.feasibility * norm.feasibility * 100) / 100,
        costEfficiency: Math.round(raw.costEfficiency * norm.cost * 100) / 100,
      };

      const compositeScore = Math.round(
        factorContributions.businessImpact +
          factorContributions.strategicAlignment +
          factorContributions.evidenceConfidence +
          factorContributions.feasibility +
          factorContributions.costEfficiency
      );

      let priorityTier: ScoredOpportunity['priorityTier'] =
        compositeScore >= 75
          ? 'high_priority'
          : compositeScore >= 50
            ? 'medium_priority'
            : 'low_priority';

      if (opp.statusOverride === 'rejected') priorityTier = 'rejected';
      if (opp.statusOverride === 'deferred') priorityTier = 'deferred';

      return {
        opportunityId: opp.opportunityId || `opp_${idx + 1}_${Date.now()}`,
        title: opp.title,
        description: opp.description,
        targetDepartment: opp.targetDepartment || 'GROWTH_DIRECTOR',
        rawFactors: raw,
        factorContributions,
        compositeScore,
        priorityTier,
        disclaimer: OpportunityScoringService.DISCLAIMER,
        supportingEvidence: opp.supportingEvidence || [],
      };
    });

    // Sort by composite score descending (active opportunities first)
    return scored.sort((a, b) => {
      if (a.priorityTier === 'rejected' && b.priorityTier !== 'rejected') return 1;
      if (b.priorityTier === 'rejected' && a.priorityTier !== 'rejected') return -1;
      return b.compositeScore - a.compositeScore;
    });
  }
}

export const opportunityScoringService = new OpportunityScoringService();
