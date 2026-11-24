/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { metricRegistry } from './services/analytics/metricRegistry';
import { metricCalculator, MetricCalculator } from './services/analytics/metricCalculator';

describe('PHASE 1 — UNIVERSAL METRIC REGISTRY & TRUTH ENGINE', () => {
  it('1. Registry contains all core canonical categories and definitions', () => {
    const all = metricRegistry.getAll();
    assert.ok(all.length >= 25, `Expected at least 25 metrics, got ${all.length}`);

    const financial = metricRegistry.getByCategory('FINANCIAL');
    assert.ok(financial.some((m) => m.metricId === 'REV_GROSS'));
    assert.ok(financial.some((m) => m.metricId === 'REV_NET'));
    assert.ok(financial.some((m) => m.metricId === 'GROSS_PROFIT'));
    assert.ok(financial.some((m) => m.metricId === 'RUNWAY'));

    const growth = metricRegistry.getByCategory('GROWTH');
    assert.ok(growth.some((m) => m.metricId === 'GROWTH_RATE_REV'));
    assert.ok(growth.some((m) => m.metricId === 'GROWTH_VELOCITY'));

    const marketing = metricRegistry.getByCategory('MARKETING');
    assert.ok(marketing.some((m) => m.metricId === 'MKT_CAC'));
    assert.ok(marketing.some((m) => m.metricId === 'MKT_ROAS'));
    assert.ok(marketing.some((m) => m.metricId === 'MKT_CTR'));

    const customer = metricRegistry.getByCategory('CUSTOMER');
    assert.ok(customer.some((m) => m.metricId === 'CUST_LTV'));
    assert.ok(customer.some((m) => m.metricId === 'CUST_RETENTION_RATE'));
  });

  it('2. Model-specific filtering returns only relevant metrics', () => {
    const saasMetrics = metricRegistry.getForBusinessModel('SAAS');
    assert.ok(saasMetrics.some((m) => m.metricId === 'SAAS_MRR'));
    assert.ok(saasMetrics.some((m) => m.metricId === 'SAAS_ARR'));
    assert.ok(saasMetrics.some((m) => m.metricId === 'SAAS_NRR'));
    // Ecom specific should NOT be present in SaaS
    assert.ok(!saasMetrics.some((m) => m.metricId === 'ECOM_AOV'));

    const ecomMetrics = metricRegistry.getForBusinessModel('ECOMMERCE');
    assert.ok(ecomMetrics.some((m) => m.metricId === 'ECOM_AOV'));
    assert.ok(ecomMetrics.some((m) => m.metricId === 'ECOM_REPEAT_ORDER_RATE'));
    assert.ok(!ecomMetrics.some((m) => m.metricId === 'SAAS_MRR'));

    const srvMetrics = metricRegistry.getForBusinessModel('RESTAURANT');
    assert.ok(srvMetrics.some((m) => m.metricId === 'SRV_UTILIZATION_RATE'));
    assert.ok(srvMetrics.some((m) => m.metricId === 'SRV_CANCELLATION_RATE'));
    assert.ok(!srvMetrics.some((m) => m.metricId === 'SAAS_ARR'));
  });

  it('3. Safe ratio arithmetic handles zero-denominator without throwing or returning Infinity/NaN', () => {
    const zeroDenom = MetricCalculator.safeRatio(100, 0);
    assert.strictEqual(zeroDenom, null);

    const nullNum = MetricCalculator.safeRatio(null, 50);
    assert.strictEqual(nullNum, null);

    const validRatio = MetricCalculator.safeRatio(25, 100, 100);
    assert.strictEqual(validRatio, 25);
  });

  it('4. Decimal-safe arithmetic and rounding prevents floating-point inaccuracy', () => {
    // 0.1 + 0.2 in standard JS is 0.30000000000000004
    const rounded = MetricCalculator.round(0.1 + 0.2, 2);
    assert.strictEqual(rounded, 0.3);
  });

  it('5. Computes net revenue from transaction records with refunds and exclusions', () => {
    const period = { startDate: '2026-11-01T00:00:00Z', endDate: '2026-11-30T23:59:59Z' };
    const records = [
      { recordId: 'tx_1', source: 'STRIPE', timestamp: '2026-11-05T10:00:00Z', amount: 1000 },
      { recordId: 'tx_2', source: 'STRIPE', timestamp: '2026-11-10T12:00:00Z', amount: 500 },
      { recordId: 'tx_3', source: 'STRIPE', timestamp: '2026-11-15T14:00:00Z', amount: 200, isRefund: true },
      { recordId: 'tx_4', source: 'STRIPE', timestamp: '2026-11-18T16:00:00Z', amount: 300, isDuplicate: true },
      { recordId: 'tx_5', source: 'STRIPE', timestamp: '2026-10-20T10:00:00Z', amount: 400 }, // Out of window
    ];

    const result = metricCalculator.calculateMetric({
      metricId: 'REV_NET',
      records,
      currency: 'USD',
      reportingPeriod: period,
    });

    assert.strictEqual(result.verificationStatus, 'VERIFIED');
    // 1000 + 500 - 200 = 1300
    assert.strictEqual(result.calculatedValue, 1300);
    assert.strictEqual(result.formattedValue, '$1,300.00');
    assert.strictEqual(result.explanation.recordsEvaluated, 5);
    assert.strictEqual(result.explanation.recordsIncluded, 3);
    assert.strictEqual(result.explanation.recordsExcluded, 2);
    assert.ok(result.explanation.exclusions.some((e) => e.recordId === 'tx_4'));
    assert.ok(result.explanation.exclusions.some((e) => e.recordId === 'tx_5'));
  });

  it('6. Correctly detects STALE data when source timestamp exceeds SLA', () => {
    const period = { startDate: '2026-11-01T00:00:00Z', endDate: '2026-11-30T23:59:59Z' };
    // 48 hours old when max freshness is 24h
    const oldTimestamp = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    const result = metricCalculator.calculateMetric({
      metricId: 'REV_GROSS',
      directValue: 50000,
      currency: 'USD',
      reportingPeriod: period,
      sourceDataTimestamp: oldTimestamp,
    });

    assert.strictEqual(result.verificationStatus, 'STALE');
    assert.ok(result.freshnessHours! >= 47);
    assert.ok(result.explanation.knownLimitations[0].includes('exceeds maximum allowed SLA'));
  });

  it('7. Handles missing values by flagging INSUFFICIENT_DATA rather than returning 0', () => {
    const period = { startDate: '2026-11-01T00:00:00Z', endDate: '2026-11-30T23:59:59Z' };
    const result = metricCalculator.calculateMetric({
      metricId: 'MKT_CAC',
      records: [], // No records, no direct numerator/denominator
      currency: 'USD',
      reportingPeriod: period,
    });

    assert.strictEqual(result.calculatedValue, null);
    assert.strictEqual(result.verificationStatus, 'INSUFFICIENT_DATA');
    assert.strictEqual(result.formattedValue, 'N/A');
    assert.notStrictEqual(result.calculatedValue, 0);
  });
});
