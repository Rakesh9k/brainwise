/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MetricCalculator } from './metricCalculator';

export interface PerformanceCorrelationResult {
  correlationId: string;
  workspaceId: string;
  dimensionA: string;
  dimensionB: string;
  dataPointsCount: number;
  pearsonCoefficient: number | null;
  relationshipStrength: 'STRONG_POSITIVE' | 'MODERATE_POSITIVE' | 'NEGLIGIBLE' | 'MODERATE_NEGATIVE' | 'STRONG_NEGATIVE' | 'INSUFFICIENT_DATA';
  causalityCaveat: string;
  observedInsights: string[];
  businessBrainVersion: number;
  evaluatedAt: string;
}

export class PerformanceCorrelationEngine {
  /**
   * Computes Pearson correlation coefficient between two series of matching length
   */
  public computePearson(x: number[], y: number[]): number | null {
    if (x.length !== y.length || x.length < 3) return null;

    const n = x.length;
    const meanX = x.reduce((a, b) => a + b, 0) / n;
    const meanY = y.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denomX = 0;
    let denomY = 0;

    for (let i = 0; i < n; i++) {
      const dx = x[i] - meanX;
      const dy = y[i] - meanY;
      numerator += dx * dy;
      denomX += dx * dx;
      denomY += dy * dy;
    }

    if (denomX === 0 || denomY === 0) return null;
    return MetricCalculator.round(numerator / Math.sqrt(denomX * denomY), 3);
  }

  /**
   * Evaluates cross-department performance correlations (e.g. Sprint Velocity vs Revenue Growth)
   */
  public correlatePerformance(params: {
    workspaceId: string;
    dimensionA: string;
    seriesA: number[];
    dimensionB: string;
    seriesB: number[];
    businessBrainVersion: number;
  }): PerformanceCorrelationResult {
    const {
      workspaceId,
      dimensionA,
      seriesA,
      dimensionB,
      seriesB,
      businessBrainVersion,
    } = params;

    const correlationId = `corr_${Date.now()}`;
    const evaluatedAt = new Date().toISOString();
    const r = this.computePearson(seriesA, seriesB);

    let strength: PerformanceCorrelationResult['relationshipStrength'] = 'INSUFFICIENT_DATA';
    const insights: string[] = [];

    if (r === null) {
      insights.push(`Insufficient historical paired data points (need at least 3, provided ${seriesA.length}).`);
    } else {
      if (r >= 0.7) {
        strength = 'STRONG_POSITIVE';
        insights.push(`Strong positive co-movement observed: increases in ${dimensionA} closely accompany increases in ${dimensionB}.`);
      } else if (r >= 0.3) {
        strength = 'MODERATE_POSITIVE';
        insights.push(`Moderate positive association between ${dimensionA} and ${dimensionB}.`);
      } else if (r <= -0.7) {
        strength = 'STRONG_NEGATIVE';
        insights.push(`Strong inverse relationship: increases in ${dimensionA} coincide with declines in ${dimensionB}.`);
      } else if (r <= -0.3) {
        strength = 'MODERATE_NEGATIVE';
        insights.push(`Moderate negative association between ${dimensionA} and ${dimensionB}.`);
      } else {
        strength = 'NEGLIGIBLE';
        insights.push(`No statistically meaningful linear relationship detected between ${dimensionA} and ${dimensionB} (r = ${r}).`);
      }
    }

    return {
      correlationId,
      workspaceId,
      dimensionA,
      dimensionB,
      dataPointsCount: Math.min(seriesA.length, seriesB.length),
      pearsonCoefficient: r,
      relationshipStrength: strength,
      causalityCaveat: 'MANDATORY STATISTICAL GUARDRAIL: Correlation does not establish direct causation. Observed co-movements may be influenced by external macroeconomic factors, seasonal cycles, or confounders.',
      observedInsights: insights,
      businessBrainVersion,
      evaluatedAt,
    };
  }
}

export const performanceCorrelationEngine = new PerformanceCorrelationEngine();
