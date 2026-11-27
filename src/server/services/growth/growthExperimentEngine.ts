/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  ExperimentHypothesisEvaluation,
  ExperimentLifecycleStatus,
  StructuredGrowthExperiment,
} from './growthTypes';

export interface EvaluateExperimentOutcomeParams {
  experiment: StructuredGrowthExperiment;
  actualPrimaryMetricValue: number;
  actualSampleSize: number;
  actualExpenditure: number;
  executionCompletedSuccessfully: boolean;
  measurementValid: boolean;
  notes: string;
}

export class GrowthExperimentEngine {
  /**
   * Evaluates live kill-switch triggers with sample-size protection against premature termination
   */
  public evaluateKillSwitch(experiment: StructuredGrowthExperiment): {
    shouldKill: boolean;
    reason?: string;
  } {
    const { killSwitch, budgetCap, currentExpenditure } = experiment;

    // 1. Budget Cap check (Hard stop)
    if (currentExpenditure >= budgetCap) {
      return {
        shouldKill: true,
        reason: `Budget cap reached: Spent ₹${currentExpenditure} of approved ₹${budgetCap}. Experiment must stop or request additional budget.`,
      };
    }

    // 2. Statistical Sample Adequacy Check
    // Critical: Do NOT evaluate rate/cost kill-switches if sample size is below minimum meaningful threshold!
    if (killSwitch.currentSampleSize < killSwitch.minSampleSize) {
      return {
        shouldKill: false,
        reason: `Sample size too small (${killSwitch.currentSampleSize}/${killSwitch.minSampleSize}). Premature termination prevented to avoid false negatives.`,
      };
    }

    // 3. Threshold Violation Check
    if (killSwitch.comparison === 'GREATER_THAN') {
      // e.g. Kill if CAC > ₹800
      if (killSwitch.stopThresholdValue && killSwitch.currentExpenditure / Math.max(1, killSwitch.currentSampleSize) > killSwitch.stopThresholdValue) {
        return {
          shouldKill: true,
          reason: `Kill-switch triggered: ${killSwitch.metricName} exceeded threshold of ₹${killSwitch.stopThresholdValue} after reaching required sample size of ${killSwitch.minSampleSize}.`,
        };
      }
    } else if (killSwitch.comparison === 'LESS_THAN') {
      // e.g. Kill if conversion rate < 1.0%
      const observedRate = (killSwitch.currentSampleSize / Math.max(1, killSwitch.currentExpenditure)) * 100;
      if (observedRate < killSwitch.stopThresholdValue) {
        return {
          shouldKill: true,
          reason: `Kill-switch triggered: ${killSwitch.metricName} fell below minimum required threshold of ${killSwitch.stopThresholdValue}% with sufficient sample data.`,
        };
      }
    }

    return { shouldKill: false };
  }

  /**
   * Evaluates final experiment outcome, rigorously distinguishing execution failure from hypothesis rejection
   */
  public evaluateExperimentOutcome(params: EvaluateExperimentOutcomeParams): {
    status: ExperimentLifecycleStatus;
    evaluation: ExperimentHypothesisEvaluation;
    isEvidenceAuthoritative: boolean;
    learningSummary: string;
  } {
    const {
      experiment,
      actualPrimaryMetricValue,
      actualSampleSize,
      executionCompletedSuccessfully,
      measurementValid,
      notes,
    } = params;

    // Check measurement validity first
    if (!measurementValid) {
      return {
        status: 'INCONCLUSIVE',
        evaluation: 'MEASUREMENT_FAILURE',
        isEvidenceAuthoritative: false,
        learningSummary: `Experiment '${experiment.title}' had tracking/measurement anomalies: ${notes}. No validated Business Brain facts created.`,
      };
    }

    // Check execution failure
    if (!executionCompletedSuccessfully) {
      return {
        status: 'ABORTED',
        evaluation: 'EXECUTION_FAILURE',
        isEvidenceAuthoritative: false,
        learningSummary: `Execution failure in '${experiment.title}': Steps were not fully executed as planned (${notes}). Hypothesis remains untested.`,
      };
    }

    // Check sample adequacy
    if (actualSampleSize < experiment.killSwitch.minSampleSize) {
      return {
        status: 'INCONCLUSIVE',
        evaluation: 'INCONCLUSIVE',
        isEvidenceAuthoritative: false,
        learningSummary: `Inconclusive test for '${experiment.title}': Sample size (${actualSampleSize}) was insufficient against required baseline (${experiment.killSwitch.minSampleSize}).`,
      };
    }

    // Evaluate hypothesis against target
    const target = experiment.primaryMetric.targetValue;
    const achieved = actualPrimaryMetricValue >= target;

    if (achieved) {
      return {
        status: 'COMPLETED',
        evaluation: 'HYPOTHESIS_SUPPORTED',
        isEvidenceAuthoritative: true,
        learningSummary: `Hypothesis Validated for '${experiment.title}': Primary metric reached ${actualPrimaryMetricValue} ${experiment.primaryMetric.unit} (Target: >= ${target} ${experiment.primaryMetric.unit}). Strategy reinforced.`,
      };
    } else {
      return {
        status: 'COMPLETED',
        evaluation: 'HYPOTHESIS_REJECTED',
        isEvidenceAuthoritative: true,
        learningSummary: `Hypothesis Rejected for '${experiment.title}': Target not met (${actualPrimaryMetricValue} vs target >= ${target}). Specific channel/angle flagged for refinement.`,
      };
    }
  }
}

export const growthExperimentEngine = new GrowthExperimentEngine();
export { experimentationPlatform, ExperimentationPlatform } from './experimentationPlatform';
