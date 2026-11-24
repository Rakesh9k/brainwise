/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { IceScoreDetail } from './growthTypes';

export interface ScoreIceParams {
  impact: number;      // 1 - 10
  confidence: number;  // 1 - 10
  ease: number;        // 1 - 10
  urgencyLevel?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  goalAlignmentScore?: number; // 0 - 10
  isResourceFeasible?: boolean;
  strategicWeight?: number;    // 0 - 10
  explanation?: string;
}

export class GrowthPrioritizationEngine {
  /**
   * Computes deterministic ICE scores with transparent clamping, explainability, and bounded modifiers
   */
  public calculateIceScore(params: ScoreIceParams): IceScoreDetail {
    const clamp = (val: number) => Math.max(1, Math.min(10, Math.round(val)));
    const i = clamp(params.impact);
    const c = clamp(params.confidence);
    const e = clamp(params.ease);
    const rawComposite = i * c * e; // 1 - 1000

    // Bounded Urgency Modifier: [0.9, 1.2]
    let urgencyModifier = 1.0;
    if (params.urgencyLevel === 'CRITICAL') urgencyModifier = 1.2;
    else if (params.urgencyLevel === 'HIGH') urgencyModifier = 1.1;
    else if (params.urgencyLevel === 'LOW') urgencyModifier = 0.9;

    // Bounded Goal Alignment Modifier: [0.85, 1.15]
    let goalAlignmentModifier = 1.0;
    if (params.goalAlignmentScore !== undefined) {
      const normalizedGoal = Math.max(0, Math.min(10, params.goalAlignmentScore));
      goalAlignmentModifier = 0.85 + (normalizedGoal / 10) * 0.3; // 0.85 to 1.15
    }

    // Bounded Feasibility Modifier: [0.8, 1.0]
    const feasibilityModifier = params.isResourceFeasible === false ? 0.8 : 1.0;

    // Final Weighted Score (bounded composite)
    const finalWeightedScore = Math.round(
      rawComposite * urgencyModifier * goalAlignmentModifier * feasibilityModifier
    );

    // Confidence Classification
    let confidenceClassification: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
    if (c >= 8) confidenceClassification = 'HIGH';
    else if (c <= 4) confidenceClassification = 'LOW';

    const scoringExplanation =
      params.explanation ||
      `Impact (${i}/10) * Confidence (${c}/10) * Ease (${e}/10) = ${rawComposite}. Weighted with Urgency (${urgencyModifier.toFixed(
        2
      )}x), Goal Alignment (${goalAlignmentModifier.toFixed(
        2
      )}x), and Feasibility (${feasibilityModifier.toFixed(2)}x) to produce final score of ${finalWeightedScore}.`;

    return {
      impact: i,
      confidence: c,
      ease: e,
      rawComposite,
      urgencyModifier: Number(urgencyModifier.toFixed(2)),
      goalAlignmentModifier: Number(goalAlignmentModifier.toFixed(2)),
      feasibilityModifier: Number(feasibilityModifier.toFixed(2)),
      finalWeightedScore,
      scoringExplanation,
      confidenceClassification,
      evaluatedAt: new Date().toISOString(),
    };
  }

  /**
   * Calculates OKR progress, remaining target, velocity, and health classification
   */
  public evaluateGoalHealth(goal: {
    currentValue: number;
    targetValue: number;
    baselineValue?: number;
    startDate?: string;
    targetDate?: string;
  }): {
    progressPercent: number;
    remainingTarget: number;
    goalHealth: 'ON_TRACK' | 'AT_RISK' | 'CRITICAL';
    forecastedCompletionDate?: string;
    riskAlert?: string;
  } {
    const baseline = goal.baselineValue || 0;
    const target = goal.targetValue;
    const current = goal.currentValue;

    const totalDelta = target - baseline;
    const currentDelta = current - baseline;

    let progressPercent = 0;
    if (totalDelta > 0) {
      progressPercent = Math.max(0, Math.min(100, Math.round((currentDelta / totalDelta) * 100)));
    } else if (current >= target) {
      progressPercent = 100;
    }

    const remainingTarget = Math.max(0, target - current);

    // Calculate time elapsed vs progress to assess health
    let goalHealth: 'ON_TRACK' | 'AT_RISK' | 'CRITICAL' = 'ON_TRACK';
    let riskAlert: string | undefined;

    if (goal.startDate && goal.targetDate) {
      const startMs = new Date(goal.startDate).getTime();
      const endMs = new Date(goal.targetDate).getTime();
      const nowMs = Date.now();

      if (endMs > startMs) {
        const totalDuration = endMs - startMs;
        const elapsed = nowMs - startMs;
        const timeElapsedPercent = Math.max(0, Math.min(100, Math.round((elapsed / totalDuration) * 100)));

        if (timeElapsedPercent > 80 && progressPercent < 50) {
          goalHealth = 'CRITICAL';
          riskAlert = `Only ${progressPercent}% progress achieved with ${100 - timeElapsedPercent}% time remaining before target date.`;
        } else if (timeElapsedPercent > 50 && progressPercent < 30) {
          goalHealth = 'AT_RISK';
          riskAlert = `Progress (${progressPercent}%) is pacing behind elapsed timeline (${timeElapsedPercent}%).`;
        }
      }
    }

    return {
      progressPercent,
      remainingTarget,
      goalHealth,
      riskAlert,
    };
  }
}

export const growthPrioritizationEngine = new GrowthPrioritizationEngine();
