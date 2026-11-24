/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { metricRegistry } from './services/analytics/metricRegistry';
import { metricCalculator } from './services/analytics/metricCalculator';
import { dataReconciliationEngine } from './services/analytics/dataReconciliationEngine';
import { dataHealthService } from './services/analytics/dataHealthService';
import { financialIntelligenceEngine } from './services/analytics/financialIntelligenceEngine';
import { marketingAttributionEngine } from './services/analytics/marketingAttributionEngine';
import { statisticalIntelligenceEngine } from './services/analytics/statisticalIntelligenceEngine';
import { performanceCorrelationEngine } from './services/analytics/performanceCorrelationEngine';
import { predictiveAnalyticsEngine } from './services/analytics/predictiveAnalyticsEngine';
import { rootCauseAnalysisEngine } from './services/analytics/rootCauseAnalysisEngine';
import { customerCohortEngine } from './services/analytics/customerCohortEngine';
import { reportValidator } from './services/analytics/reportValidator';
import { executiveReportingEngine } from './services/analytics/executiveReportingEngine';
import { decisionIntelligenceEngine } from './services/analytics/decisionIntelligenceEngine';
import { creditEngine } from './billing/creditEngine';
import { db } from './db/firestore';

describe('PHASE 13 & 14 — SECURITY, FINANCIAL INTEGRITY & END-TO-END VALIDATION', () => {
  const wsA = 'ws_tenant_alpha_secure';
  const wsB = 'ws_tenant_beta_secure';
  const period = { startDate: '2026-11-01T00:00:00Z', endDate: '2026-11-30T23:59:59Z' };

  it('1. Enforces strict multi-tenant workspace isolation across reports and decisions', async () => {
    // Create decision in Workspace A
    const decA = await decisionIntelligenceEngine.createDecision({
      workspaceId: wsA,
      problemStatement: 'Tenant A bottleneck',
      hypothesis: 'Feature rollout accelerates growth',
      recommendedAction: 'Ship v2',
      supportingMetricIds: ['REV_NET'],
      expectedImpact: '+10%',
      baselineMetricValue: 1000,
      targetMetricValue: 1100,
      reviewDate: '2026-12-31T00:00:00Z',
    });

    // Create decision in Workspace B
    await decisionIntelligenceEngine.createDecision({
      workspaceId: wsB,
      problemStatement: 'Tenant B bottleneck',
      hypothesis: 'Marketing push',
      recommendedAction: 'Ad blitz',
      supportingMetricIds: ['MKT_CAC'],
      expectedImpact: '-15%',
      baselineMetricValue: 50,
      targetMetricValue: 40,
      reviewDate: '2026-12-31T00:00:00Z',
    });

    // Query Workspace A
    const listA = await decisionIntelligenceEngine.listDecisions(wsA);
    assert.ok(listA.some((d) => d.decisionId === decA.decisionId));
    assert.ok(!listA.some((d) => d.workspaceId === wsB), 'Tenant A must NEVER access Tenant B data');

    // Query Workspace B
    const listB = await decisionIntelligenceEngine.listDecisions(wsB);
    assert.ok(!listB.some((d) => d.workspaceId === wsA), 'Tenant B must NEVER access Tenant A data');
  });

  it('2. ADR-006 Two-Phase Credit Reservation: reserves 5 credits, settles on success', async () => {
    const wsCredit = `ws_credit_int_${Date.now()}`;
    const userId = 'usr_credit_tester';

    const initialAccount = await creditEngine.initializeAccount(wsCredit, 100);
    assert.strictEqual(initialAccount.availableBalance, 100);

    // Phase 1: Hold 5 credits
    const reservation = await creditEngine.holdCredits({
      workspaceId: wsCredit,
      userId,
      featureId: 'FEAT-REP-001',
      amount: 5,
      idempotencyKey: `idem_rep_${Date.now()}`,
    });

    assert.ok(reservation.reservationId.startsWith('res_'));
    assert.strictEqual(reservation.amount, 5);

    const postReserveAccount = await creditEngine.getAccount(wsCredit);
    assert.strictEqual(postReserveAccount.reservedCredits, 5);
    assert.strictEqual(postReserveAccount.availableBalance, 95);

    // Phase 2: Commit credits
    const commit = await creditEngine.commitCredits({
      workspaceId: wsCredit,
      reservationId: reservation.reservationId,
      featureId: 'FEAT-REP-001',
      notes: 'Executive report generated successfully',
    });

    assert.strictEqual(commit.remainingBalance, 95);

    const finalAccount = await creditEngine.getAccount(wsCredit);
    assert.strictEqual(finalAccount.availableBalance, 95);
    assert.strictEqual(finalAccount.reservedCredits, 0);
  });

  it('3. ADR-006 Credit Refund Protocol: refunds reserved credits with zero net deduction on generation failure', async () => {
    const wsRefund = `ws_credit_ref_${Date.now()}`;
    const userId = 'usr_refund_tester';

    await creditEngine.initializeAccount(wsRefund, 50);

    // Phase 1: Hold 5 credits
    const reservation = await creditEngine.holdCredits({
      workspaceId: wsRefund,
      userId,
      featureId: 'FEAT-REP-001',
      amount: 5,
    });

    // Phase 2: Release reservation on failure
    await creditEngine.releaseCredits({
      workspaceId: wsRefund,
      reservationId: reservation.reservationId,
      reason: 'Report generation aborted due to audit validation failure',
    });

    const finalAccount = await creditEngine.getAccount(wsRefund);
    assert.strictEqual(finalAccount.availableBalance, 50);
    assert.strictEqual(finalAccount.reservedCredits, 0);
  });

  it('4. Adversarial AI Truth Test: Rejects hallucinated numbers, altered CAC, and unverified causality', () => {
    const revNet = metricCalculator.calculateMetric({
      metricId: 'REV_NET',
      directValue: 1680,
      currency: 'USD',
      reportingPeriod: period,
    });
    const cac = metricCalculator.calculateMetric({
      metricId: 'MKT_CAC',
      directValue: 14.50,
      currency: 'USD',
      reportingPeriod: period,
    });

    // Adversarial case 1: Hallucinated revenue ($85,000)
    const adv1 = reportValidator.validateReportNarrative({
      narrativeText: 'Our enterprise operations produced $85,000 this month with unprecedented demand.',
      verifiedMetrics: [revNet, cac],
    });
    assert.strictEqual(adv1.isValid, false);
    assert.ok(adv1.unsupportedClaims.some((c) => c.assertedNumber === 85000));

    // Adversarial case 2: Altered CAC ($4.20 instead of $14.50)
    const adv2 = reportValidator.validateReportNarrative({
      narrativeText: 'Customer acquisition cost dropped to $4.20 per user.',
      verifiedMetrics: [revNet, cac],
    });
    assert.strictEqual(adv2.isValid, false);
    assert.ok(adv2.unsupportedClaims.some((c) => c.assertedNumber === 4.2));

    // Valid case: Strictly cites verified $1,680 and $14.50
    const valid = reportValidator.validateReportNarrative({
      narrativeText: 'Net Revenue settled at $1,680.00 with a blended CAC of $14.50.',
      verifiedMetrics: [revNet, cac],
    });
    assert.strictEqual(valid.isValid, true);
    assert.strictEqual(valid.unsupportedClaims.length, 0);
  });

  it('5. End-to-End Master Lifecycle: Ingestion -> Reconciliation -> Metrics -> Forecast -> RCA -> Report -> Decision', async () => {
    const wsE2E = 'ws_e2e_master_lifecycle';

    // 1. Data Ingestion & Reconciliation
    const sourceRecords = [
      { sourceId: 'tx_e1', source: 'STRIPE', amount: 1000, currency: 'USD', timestamp: '2026-11-05T10:00:00Z', type: 'PAYMENT' as const, channel: 'organic' },
      { sourceId: 'tx_e2', source: 'STRIPE', amount: 680, currency: 'USD', timestamp: '2026-11-12T10:00:00Z', type: 'PAYMENT' as const, channel: 'paid' },
    ];
    const importedRecords = [
      { importId: 'imp_e1', externalSourceId: 'tx_e1', source: 'STRIPE', amount: 1000, currency: 'USD', timestamp: '2026-11-05T10:00:00Z', type: 'PAYMENT' as const, channel: 'organic' },
      { importId: 'imp_e2', externalSourceId: 'tx_e2', source: 'STRIPE', amount: 680, currency: 'USD', timestamp: '2026-11-12T10:00:00Z', type: 'PAYMENT' as const, channel: 'paid' },
    ];

    const recon = dataReconciliationEngine.reconcile({
      workspaceId: wsE2E,
      period,
      sourceRecords,
      importedRecords,
    });
    assert.strictEqual(recon.reconciliationState, 'RECONCILED_MATCH');
    assert.strictEqual(recon.sourceTotalGross, 1680);

    // 2. Canonical Metrics Computation
    const revNet = metricCalculator.calculateMetric({
      metricId: 'REV_NET',
      directValue: recon.importedTotalGross,
      currency: 'USD',
      reportingPeriod: period,
    });
    assert.strictEqual(revNet.verificationStatus, 'VERIFIED');
    assert.strictEqual(revNet.calculatedValue, 1680);

    // 3. Multi-Scenario Predictive Forecast
    const forecast = predictiveAnalyticsEngine.generateForecast({
      workspaceId: wsE2E,
      metricId: 'REV_NET',
      historicalSeries: [
        { period: 'Aug', value: 910 },
        { period: 'Sep', value: 1180 },
        { period: 'Oct', value: 1420 },
        { period: 'Nov', value: 1680 },
      ],
    });
    assert.strictEqual(forecast.horizonForecast.length, 3);
    assert.ok(forecast.scenarios.expected.projectedTotal > 0);

    // 4. Root Cause Analysis
    const rca = rootCauseAnalysisEngine.decomposeRevenueDelta({
      workspaceId: wsE2E,
      baseline: { label: 'Oct', revenue: 1420, ordersOrCustomers: 172, refunds: 50 },
      current: { label: 'Nov', revenue: 1680, ordersOrCustomers: 214, refunds: 80 },
    });
    assert.strictEqual(rca.totalDelta, 260); // +260 growth
    assert.ok(rca.drivers.length >= 2);

    // 5. Customer Cohorts
    const cohorts = customerCohortEngine.analyzeCohorts({
      workspaceId: wsE2E,
      transactions: [
        { customerId: 'c_alpha', orderId: 'ord_1', amount: 1000, timestamp: '2026-11-05T10:00:00Z' },
        { customerId: 'c_beta', orderId: 'ord_2', amount: 680, timestamp: '2026-11-12T10:00:00Z' },
      ],
      reportingPeriod: period,
    });
    assert.strictEqual(cohorts.totalUniqueCustomers, 2);

    // 6. Validated Executive Report with Immutable Snapshot Hash
    const report = await executiveReportingEngine.generateReport({
      workspaceId: wsE2E,
      businessName: 'Master Enterprise',
      reportType: 'MONTHLY_BUSINESS_REVIEW',
      reportingPeriod: period,
      businessBrainVersion: 3,
      metrics: [revNet],
      narrativeSummary: 'Master Enterprise achieved $1,680.00 Net Revenue with verified ledger reconciliation.',
    });
    assert.strictEqual(report.status, 'VERIFIED');
    assert.ok(report.snapshotHash.length === 64);

    // 7. Closed-Loop Strategic Decision & Evaluation
    const decision = await decisionIntelligenceEngine.createDecision({
      workspaceId: wsE2E,
      problemStatement: 'Scale revenue from $1,680 to $2,000',
      hypothesis: 'Expand paid social campaign reach',
      recommendedAction: 'Increase ad spend on high ROAS channels',
      supportingMetricIds: ['REV_NET', 'MKT_ROAS'],
      expectedImpact: '+$320/month',
      baselineMetricValue: 1680,
      targetMetricValue: 2000,
      reviewDate: '2026-12-15T00:00:00Z',
    });

    const evaluated = await decisionIntelligenceEngine.evaluateOutcome({
      workspaceId: wsE2E,
      decisionId: decision.decisionId,
      actualMetricValue: 2050,
      postMortemNotes: 'Target exceeded with strong contribution margin.',
    });
    assert.strictEqual(evaluated.status, 'CONCLUDED');
    assert.strictEqual(evaluated.evaluation?.outcomeClassification, 'SUCCESSFUL');
  });
});
