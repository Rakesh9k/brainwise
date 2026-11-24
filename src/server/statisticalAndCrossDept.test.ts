/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { statisticalIntelligenceEngine } from './services/analytics/statisticalIntelligenceEngine';
import { performanceCorrelationEngine } from './services/analytics/performanceCorrelationEngine';

describe('PHASE 5 & 6 — STATISTICAL INTELLIGENCE & CROSS-DEPT CORRELATION', () => {
  it('1. Accurately computes required sample size based on baseline rate and MDE', () => {
    // 5% baseline rate, 20% relative MDE (delta = 1%), 80% power, 5% alpha
    const n = statisticalIntelligenceEngine.calculateRequiredSampleSize(0.05, 0.20, 0.05, 0.80);
    // Mathematically exact sample size is 7,457 per variant
    assert.ok(n >= 7000 && n <= 8000, `Expected n between 7000 and 8000, got ${n}`);
  });

  it('2. Evaluates an experiment with insufficient sample size and flags INSUFFICIENT_SAMPLE without declaring winner', () => {
    const result = statisticalIntelligenceEngine.evaluateExperiment({
      hypothesis: 'New headline increases landing page conversion rate',
      control: { name: 'Control', visitors: 100, conversions: 5 }, // 5%
      variant: { name: 'Variant A', visitors: 100, conversions: 10 }, // 10%
      mdeRelative: 0.2, // requires 7,457 samples
    });

    // Guardrail: must NOT declare positive evidence merely because 10 > 5!
    assert.strictEqual(result.verdict, 'INSUFFICIENT_SAMPLE');
    assert.strictEqual(result.sampleSizeAdequate, false);
    assert.ok(result.limitations.length > 0);
  });

  it('3. Evaluates adequately powered experiment and certifies POSITIVE_EVIDENCE with confidence interval', () => {
    const result = statisticalIntelligenceEngine.evaluateExperiment({
      hypothesis: 'Streamlined one-step checkout increases conversion rate',
      control: { name: 'Control', visitors: 8000, conversions: 400 }, // 5.0%
      variant: { name: 'Variant OneStep', visitors: 8000, conversions: 560 }, // 7.0%
      mdeRelative: 0.2, // 20% lift (delta 1.0%), requires ~7,457
    });

    assert.strictEqual(result.sampleSizeAdequate, true);
    assert.strictEqual(result.verdict, 'POSITIVE_EVIDENCE');
    assert.strictEqual(result.absoluteDifference, 2.0); // +2 percentage points
    assert.ok(result.pValue !== null && result.pValue < 0.01);
    assert.ok(result.confidenceInterval95[0] > 0); // lower bound strictly positive
    assert.ok(result.bayesianProbabilityVariantBeatsControl > 99);
  });

  it('4. Outlier detection isolates extreme values via IQR fences', () => {
    const data = [10, 12, 11, 13, 12, 14, 11, 100]; // 100 is an extreme outlier
    const res = statisticalIntelligenceEngine.detectOutliers(data);

    assert.strictEqual(res.outliers.length, 1);
    assert.strictEqual(res.outliers[0], 100);
    assert.strictEqual(res.cleanValues.length, 7);
  });

  it('5. Cross-department correlation computes Pearson r and attaches mandatory causality caveat', () => {
    // 5 sprints of velocity vs revenue additions
    const sprintVelocity = [10, 15, 20, 25, 30];
    const revenueGrowth = [1000, 1400, 2100, 2400, 3100];

    const corr = performanceCorrelationEngine.correlatePerformance({
      workspaceId: 'ws_test_corr',
      dimensionA: 'Sprint Velocity',
      seriesA: sprintVelocity,
      dimensionB: 'Net Revenue',
      seriesB: revenueGrowth,
      businessBrainVersion: 2,
    });

    assert.ok(corr.pearsonCoefficient !== null && corr.pearsonCoefficient >= 0.95);
    assert.strictEqual(corr.relationshipStrength, 'STRONG_POSITIVE');
    assert.strictEqual(corr.businessBrainVersion, 2);
    assert.ok(corr.causalityCaveat.includes('Correlation does not establish direct causation'));
  });
});
