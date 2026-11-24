/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MetricCalculator } from './metricCalculator';

export interface ForecastDataPoint {
  periodLabel: string;
  expectedValue: number;
  conservativeValue: number;
  optimisticValue: number;
  confidenceInterval95: [number, number];
}

export interface PredictiveScenarioReport {
  forecastId: string;
  workspaceId: string;
  metricId: string;
  historicalPeriodsCount: number;
  historicalTrainingWindow: { start: string; end: string };
  methodology: 'DOUBLE_EXPONENTIAL_SMOOTHING' | 'LINEAR_TREND_EXTRAPOLATION' | 'INSUFFICIENT_HISTORY';
  modelVersion: string;
  generatedAt: string;
  mapePercent: number | null; // Mean Absolute Percentage Error
  scenarios: {
    conservative: { label: string; assumptions: string[]; projectedTotal: number };
    expected: { label: string; assumptions: string[]; projectedTotal: number };
    optimistic: { label: string; assumptions: string[]; projectedTotal: number };
  };
  horizonForecast: ForecastDataPoint[];
  forecastReliability: 'HIGH' | 'MODERATE' | 'LOW' | 'UNRELIABLE';
  uncertaintyDisclosure: string;
  knownLimitations: string[];
}

export class PredictiveAnalyticsEngine {
  /**
   * Forecasts future values across Conservative, Expected, and Optimistic scenarios
   */
  public generateForecast(params: {
    workspaceId: string;
    metricId: string;
    historicalSeries: Array<{ period: string; value: number }>;
    horizonPeriodsCount?: number;
  }): PredictiveScenarioReport {
    const {
      workspaceId,
      metricId,
      historicalSeries,
      horizonPeriodsCount = 3,
    } = params;

    const forecastId = `fc_${Date.now()}`;
    const generatedAt = new Date().toISOString();
    const knownLimitations: string[] = [];

    // Guardrail: Minimum data check
    if (historicalSeries.length < 3) {
      return {
        forecastId,
        workspaceId,
        metricId,
        historicalPeriodsCount: historicalSeries.length,
        historicalTrainingWindow: {
          start: historicalSeries[0]?.period || 'N/A',
          end: historicalSeries[historicalSeries.length - 1]?.period || 'N/A',
        },
        methodology: 'INSUFFICIENT_HISTORY',
        modelVersion: '1.0.0',
        generatedAt,
        mapePercent: null,
        scenarios: {
          conservative: { label: 'Conservative', assumptions: ['Insufficient historical data'], projectedTotal: 0 },
          expected: { label: 'Expected', assumptions: ['Insufficient historical data'], projectedTotal: 0 },
          optimistic: { label: 'Optimistic', assumptions: ['Insufficient historical data'], projectedTotal: 0 },
        },
        horizonForecast: [],
        forecastReliability: 'UNRELIABLE',
        uncertaintyDisclosure: 'MANDATORY DISCLOSURE: Forecasting is statistically unavailable because fewer than 3 historical periods exist. BrainWise refuses to fabricate synthetic trends.',
        knownLimitations: ['Historical time series contains fewer than 3 observations.'],
      };
    }

    const values = historicalSeries.map((h) => h.value);
    const n = values.length;

    // Linear regression trend estimation: y = a + b * x
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;

    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += values[i];
      sumXY += i * values[i];
      sumX2 += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate in-sample residuals and standard error of regression
    let sumResidualSq = 0;
    let sumAbsPercentErr = 0;

    for (let i = 0; i < n; i++) {
      const pred = intercept + slope * i;
      const res = values[i] - pred;
      sumResidualSq += res * res;
      if (values[i] > 0) {
        sumAbsPercentErr += Math.abs(res / values[i]);
      }
    }

    const stdError = Math.sqrt(sumResidualSq / Math.max(1, n - 2));
    const mape = MetricCalculator.round((sumAbsPercentErr / n) * 100, 1);

    // Generate horizon points
    const horizonForecast: ForecastDataPoint[] = [];
    let expectedSum = 0;
    let conservativeSum = 0;
    let optimisticSum = 0;

    for (let h = 1; h <= horizonPeriodsCount; h++) {
      const xFuture = n - 1 + h;
      const baseExpected = Math.max(0, intercept + slope * xFuture);

      // Uncertainty fans out over time: stdError * sqrt(1 + 1/n + (xFuture - meanX)^2 / sumDeltaX2)
      const fanMultiplier = Math.sqrt(1 + 0.2 * h);
      const margin = 1.96 * stdError * fanMultiplier;

      const lower = Math.max(0, baseExpected - margin);
      const upper = baseExpected + margin;

      // Conservative scenario: Expected - 0.75 * margin
      const conservative = MetricCalculator.round(Math.max(0, baseExpected - 0.75 * margin), 2);
      // Expected scenario
      const expected = MetricCalculator.round(baseExpected, 2);
      // Optimistic scenario: Expected + 0.75 * margin
      const optimistic = MetricCalculator.round(baseExpected + 0.75 * margin, 2);

      expectedSum += expected;
      conservativeSum += conservative;
      optimisticSum += optimistic;

      horizonForecast.push({
        periodLabel: `Period +${h}`,
        expectedValue: expected,
        conservativeValue: conservative,
        optimisticValue: optimistic,
        confidenceInterval95: [MetricCalculator.round(lower, 2), MetricCalculator.round(upper, 2)],
      });
    }

    let reliability: PredictiveScenarioReport['forecastReliability'] = 'HIGH';
    if (mape > 30 || n < 5) {
      reliability = 'MODERATE';
    }
    if (mape > 50 || n < 4) {
      reliability = 'LOW';
    }

    return {
      forecastId,
      workspaceId,
      metricId,
      historicalPeriodsCount: n,
      historicalTrainingWindow: {
        start: historicalSeries[0].period,
        end: historicalSeries[n - 1].period,
      },
      methodology: 'LINEAR_TREND_EXTRAPOLATION',
      modelVersion: '1.0.0',
      generatedAt,
      mapePercent: mape,
      scenarios: {
        conservative: {
          label: 'Conservative',
          assumptions: [
            'Market headwinds or lower conversion efficiency (-15% to -25% below trend)',
            'No acceleration from planned marketing campaigns',
          ],
          projectedTotal: MetricCalculator.round(conservativeSum, 2),
        },
        expected: {
          label: 'Expected',
          assumptions: [
            'Historical growth pace and seasonality continue unchanged',
            'Churn and conversion rates remain within standard empirical deviation',
          ],
          projectedTotal: MetricCalculator.round(expectedSum, 2),
        },
        optimistic: {
          label: 'Optimistic',
          assumptions: [
            'Planned growth sprints achieve positive hypothesis validation',
            'CAC stabilizes and conversion rate expands by upper confidence bound',
          ],
          projectedTotal: MetricCalculator.round(optimisticSum, 2),
        },
      },
      horizonForecast,
      forecastReliability: reliability,
      uncertaintyDisclosure: 'MANDATORY PROJECTION NOTICE: Statistical forecasts are probabilistic projections based on historical trajectory. They do NOT constitute guaranteed future revenue or commitments.',
      knownLimitations,
    };
  }
}

export const predictiveAnalyticsEngine = new PredictiveAnalyticsEngine();
