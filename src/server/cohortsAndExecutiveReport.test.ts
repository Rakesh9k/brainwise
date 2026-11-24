/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  customerCohortEngine,
  type CustomerTransactionRecord,
} from './services/analytics/customerCohortEngine';
import { reportValidator } from './services/analytics/reportValidator';
import { executiveReportingEngine } from './services/analytics/executiveReportingEngine';
import { metricCalculator } from './services/analytics/metricCalculator';

describe('PHASE 9 & 10 — CUSTOMER COHORTS & EXECUTIVE REPORTING ENGINE', () => {
  it('1. Constructs customer lifecycle stages and cohort retention matrix', () => {
    const transactions: CustomerTransactionRecord[] = [
      // Cohort 2026-06 (c_1)
      { customerId: 'c_1', orderId: 'o_1', amount: 500, timestamp: '2026-06-05T10:00:00Z' },
      { customerId: 'c_1', orderId: 'o_2', amount: 300, timestamp: '2026-07-10T12:00:00Z' },
      { customerId: 'c_1', orderId: 'o_3', amount: 400, timestamp: '2026-08-15T14:00:00Z' },
      // Cohort 2026-06 (c_2) - single order (churned)
      { customerId: 'c_2', orderId: 'o_4', amount: 200, timestamp: '2026-06-12T10:00:00Z' },
      // Cohort 2026-07 (c_3)
      { customerId: 'c_3', orderId: 'o_5', amount: 1500, timestamp: '2026-07-20T10:00:00Z' },
    ];

    const result = customerCohortEngine.analyzeCohorts({
      workspaceId: 'ws_test_cohorts',
      transactions,
      reportingPeriod: { startDate: '2026-06-01', endDate: '2026-08-31' },
      referenceDate: '2026-11-23T00:00:00Z',
    });

    assert.strictEqual(result.totalUniqueCustomers, 3);
    assert.strictEqual(result.cohortMatrix.length, 2);

    // June 2026 cohort has 2 customers (c_1, c_2)
    const juneCohort = result.cohortMatrix.find((c) => c.cohortMonth === '2026-06');
    assert.ok(juneCohort);
    assert.strictEqual(juneCohort.initialCustomerCount, 2);
    // Month 0: 100%
    assert.strictEqual(juneCohort.retentionByMonth[0], 100);
    // Month 1 (July): c_1 retained -> 50%
    assert.strictEqual(juneCohort.retentionByMonth[1], 50);

    // Pareto revenue concentration
    assert.ok(result.top20PercentRevenueShare > 0);
  });

  it('2. Report Validator accepts narratives grounded in verified metrics', () => {
    const period = { startDate: '2026-11-01', endDate: '2026-11-30' };
    const revNet = metricCalculator.calculateMetric({
      metricId: 'REV_NET',
      directValue: 1680,
      reportingPeriod: period,
      currency: 'USD',
    });
    const taskRate = metricCalculator.calculateMetric({
      metricId: 'OPS_TASK_COMPLETION',
      directValue: 85.5,
      reportingPeriod: period,
    });

    const narrative = 'BrainWise achieved $1,680 Net Revenue with 85.5% task execution rate.';
    const validation = reportValidator.validateReportNarrative({
      narrativeText: narrative,
      verifiedMetrics: [revNet, taskRate],
    });

    assert.strictEqual(validation.isValid, true);
    assert.strictEqual(validation.unsupportedClaims.length, 0);
    assert.strictEqual(validation.groundedMetricsCount, 2);
  });

  it('3. Report Validator REJECTS narratives containing fabricated numerical assertions', () => {
    const period = { startDate: '2026-11-01', endDate: '2026-11-30' };
    const revNet = metricCalculator.calculateMetric({
      metricId: 'REV_NET',
      directValue: 1680,
      reportingPeriod: period,
      currency: 'USD',
    });

    // Contains fabricated $99,500 and 98%
    const fraudulentNarrative = 'BrainWise generated $99,500 in revenue with 98% customer satisfaction.';
    const validation = reportValidator.validateReportNarrative({
      narrativeText: fraudulentNarrative,
      verifiedMetrics: [revNet],
    });

    assert.strictEqual(validation.isValid, false);
    assert.ok(validation.unsupportedClaims.length >= 1);
    assert.ok(validation.unsupportedClaims.some((c) => c.assertedNumber === 99500));
  });

  it('4. Executive Reporting Engine persists immutable report with SHA-256 snapshot hash and exports CSV/HTML', async () => {
    const period = { startDate: '2026-11-01', endDate: '2026-11-30' };
    const rev = metricCalculator.calculateMetric({
      metricId: 'REV_NET',
      directValue: 1680,
      reportingPeriod: period,
      currency: 'USD',
    });

    const report = await executiveReportingEngine.generateReport({
      workspaceId: 'ws_test_rep',
      businessName: 'Coffee Roasters',
      reportType: 'MONTHLY_BUSINESS_REVIEW',
      reportingPeriod: period,
      businessBrainVersion: 2,
      metrics: [rev],
      narrativeSummary: 'Coffee Roasters recorded $1,680 in net revenue for the period.',
    });

    assert.ok(report.reportId.startsWith('rep_'));
    assert.strictEqual(report.status, 'VERIFIED');
    assert.strictEqual(report.snapshotHash.length, 64); // SHA-256 hex length
    assert.strictEqual(report.businessBrainVersion, 2);

    // Verify CSV export
    const csv = executiveReportingEngine.exportCsv(report);
    assert.ok(csv.includes('Coffee Roasters'));
    assert.ok(csv.includes('REV_NET'));
    assert.ok(csv.includes('$1,680.00'));

    // Verify HTML export
    const html = executiveReportingEngine.exportHtml(report);
    assert.ok(html.includes('Coffee Roasters'));
    assert.ok(html.includes('Snapshot SHA-256:'));
  });
});
