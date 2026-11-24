/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { decisionIntelligenceEngine } from './services/analytics/decisionIntelligenceEngine';
import { aiPerformanceAssistant } from './services/analytics/aiPerformanceAssistant';
import { metricCalculator } from './services/analytics/metricCalculator';

describe('PHASE 11 & 12 — DECISION INTELLIGENCE & AI PERFORMANCE ASSISTANT', () => {
  it('1. Creates strategic decision linked to baseline, target, and review date', async () => {
    const decision = await decisionIntelligenceEngine.createDecision({
      workspaceId: 'ws_test_dec',
      problemStatement: 'Trial to paid subscription conversion rate plateaued at 36%',
      hypothesis: 'One-click checkout and social proof reduces drop-off and increases conversion to 42%',
      recommendedAction: 'Deploy streamlined checkout flow across organic traffic',
      supportingMetricIds: ['MKT_CVR', 'REV_NET'],
      expectedImpact: '+$4,200 Net Revenue per month',
      priority: 'CRITICAL',
      baselineMetricValue: 36.0,
      targetMetricValue: 42.0,
      reviewDate: '2026-12-15T00:00:00Z',
    });

    assert.ok(decision.decisionId.startsWith('dec_'));
    assert.strictEqual(decision.status, 'APPROVED');
    assert.strictEqual(decision.baselineMetricValue, 36.0);
    assert.strictEqual(decision.targetMetricValue, 42.0);
  });

  it('2. Evaluates closed-loop decision outcome when target is achieved (SUCCESSFUL)', async () => {
    const decision = await decisionIntelligenceEngine.createDecision({
      workspaceId: 'ws_test_dec_eval',
      problemStatement: 'High trial drop-off',
      hypothesis: 'Onboarding email drip lifts retention',
      recommendedAction: 'Send 3-part educational series',
      supportingMetricIds: ['CUST_RETENTION_RATE'],
      expectedImpact: '+10% retention',
      baselineMetricValue: 40.0,
      targetMetricValue: 50.0,
      reviewDate: '2026-12-01T00:00:00Z',
    });

    // Actual metric came in at 52.0% (target 50.0%)
    const evaluated = await decisionIntelligenceEngine.evaluateOutcome({
      workspaceId: 'ws_test_dec_eval',
      decisionId: decision.decisionId,
      actualMetricValue: 52.0,
      postMortemNotes: 'Hypothesis fully validated with statistically significant lift.',
    });

    assert.strictEqual(evaluated.status, 'CONCLUDED');
    assert.strictEqual(evaluated.evaluation?.outcomeClassification, 'SUCCESSFUL');
    assert.strictEqual(evaluated.evaluation?.hypothesisValidated, true);
    assert.strictEqual(evaluated.evaluation?.varianceValue, 2.0); // 52 - 50 = +2
  });

  it('3. AI Performance Assistant answers grounded questions with verified metrics and refuses unverified claims', () => {
    const period = { startDate: '2026-11-01', endDate: '2026-11-30' };
    const revNet = metricCalculator.calculateMetric({
      metricId: 'REV_NET',
      directValue: 1680,
      currency: 'USD',
      reportingPeriod: period,
    });
    const tasks = metricCalculator.calculateMetric({
      metricId: 'OPS_TASK_COMPLETION',
      directValue: 90.0,
      reportingPeriod: period,
    });

    // Question: Revenue inquiry
    const revAnswer = aiPerformanceAssistant.answerQuestion({
      question: 'Why did revenue change this month?',
      verifiedMetrics: [revNet, tasks],
      businessName: 'Acme SaaS',
    });

    assert.strictEqual(revAnswer.evidenceTier, 'FACT_VERIFIED');
    assert.ok(revAnswer.answerSummary.includes('$1,680.00'));
    assert.ok(revAnswer.supportingMetricIds.includes('REV_NET'));

    // Question: Unverified / missing records inquiry
    const emptyAnswer = aiPerformanceAssistant.answerQuestion({
      question: 'Why did revenue decline?',
      verifiedMetrics: [],
      businessName: 'NewCo',
    });

    assert.strictEqual(emptyAnswer.evidenceTier, 'INSUFFICIENT_EVIDENCE');
    assert.ok(emptyAnswer.answerSummary.includes('Insufficient verified transaction records'));
    assert.ok(emptyAnswer.countermeasures.length > 0);
  });
});
