/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  financialIntelligenceEngine,
  type FinancialTransactionItem,
} from './services/analytics/financialIntelligenceEngine';
import {
  marketingAttributionEngine,
  type CustomerConversionJourney,
} from './services/analytics/marketingAttributionEngine';

describe('PHASE 3 & 4 — FINANCIAL INTELLIGENCE & MARKETING ATTRIBUTION', () => {
  it('1. Computes strict revenue composition distinguishing gross, net, cash collected, and recognized', () => {
    const transactions: FinancialTransactionItem[] = [
      {
        transactionId: 'tx_1',
        amount: 1000,
        currency: 'USD',
        type: 'PAYMENT',
        category: 'SUBSCRIPTION_RECURRING',
        billingInterval: 'MONTHLY',
        customerId: 'c_1',
        timestamp: '2026-11-01T10:00:00Z',
        isCollected: true,
        isRecognized: true,
        status: 'SETTLED',
      },
      {
        transactionId: 'tx_2',
        amount: 1200,
        currency: 'USD',
        type: 'PAYMENT',
        category: 'SUBSCRIPTION_RECURRING',
        billingInterval: 'ANNUAL', // Normalized MRR is 100
        customerId: 'c_2',
        timestamp: '2026-11-05T12:00:00Z',
        isCollected: true,
        isRecognized: false, // Deferred
        status: 'SETTLED',
      },
      {
        transactionId: 'tx_3',
        amount: 200,
        currency: 'USD',
        type: 'REFUND',
        category: 'SUBSCRIPTION_RECURRING',
        customerId: 'c_1',
        timestamp: '2026-11-10T14:00:00Z',
        isCollected: true,
        isRecognized: true,
        status: 'SETTLED',
      },
      {
        transactionId: 'tx_4',
        amount: 50,
        currency: 'USD',
        type: 'DISCOUNT',
        category: 'SUBSCRIPTION_RECURRING',
        customerId: 'c_1',
        timestamp: '2026-11-01T10:00:00Z',
        isCollected: true,
        isRecognized: true,
        status: 'SETTLED',
      },
    ];

    const result = financialIntelligenceEngine.computeRevenueComposition({
      transactions,
      currency: 'USD',
      period: { startDate: '2026-11-01', endDate: '2026-11-30' },
    });

    assert.strictEqual(result.grossRevenue, 2200);
    // Net: 2200 - 200 (refund) - 50 (discount) = 1950
    assert.strictEqual(result.netRevenue, 1950);
    // Cash collected: 2200 - 200 = 2000
    assert.strictEqual(result.cashCollected, 2000);
    // Recognized: tx_1 (1000)
    assert.strictEqual(result.recognizedRevenue, 1000);
    // Recurring monthly: 1000 + (1200 / 12) = 1100
    assert.strictEqual(result.recurringRevenue, 1100);
  });

  it('2. Accurately calculates SaaS MRR waterfall, NRR, and quick ratio', () => {
    const saas = financialIntelligenceEngine.computeSaaSMetrics({
      startingMRR: 10000,
      newMRR: 2000,
      expansionMRR: 500,
      contractionMRR: 200,
      churnedMRR: 300,
    });

    // Net new: 2000 + 500 - 200 - 300 = 2000
    assert.strictEqual(saas.netNewMRR, 2000);
    assert.strictEqual(saas.endingMRR, 12000);
    assert.strictEqual(saas.arr, 144000);
    // NRR: (10000 + 500 - 200 - 300) / 10000 = 100%
    assert.strictEqual(saas.nrrPercent, 100);
    // Quick ratio: (2000 + 500) / (200 + 300) = 5.0
    assert.strictEqual(saas.quickRatio, 5);
  });

  it('3. Computes multi-touch Position-Based (U-Shaped) attribution across customer journeys', () => {
    const journeys: CustomerConversionJourney[] = [
      {
        conversionId: 'conv_1',
        customerId: 'cust_alpha',
        conversionTimestamp: '2026-11-15T12:00:00Z',
        revenueAmount: 1000,
        currency: 'USD',
        touchpoints: [
          { touchpointId: 'tp_1', customerId: 'cust_alpha', channel: 'organic_search', timestamp: '2026-11-01T10:00:00Z' },
          { touchpointId: 'tp_2', customerId: 'cust_alpha', channel: 'email_newsletter', timestamp: '2026-11-05T12:00:00Z' },
          { touchpointId: 'tp_3', customerId: 'cust_alpha', channel: 'paid_meta', timestamp: '2026-11-15T11:00:00Z' },
        ],
      },
    ];

    const spend = { organic_search: 0, email_newsletter: 100, paid_meta: 300 };

    const attribution = marketingAttributionEngine.evaluateAttribution({
      journeys,
      channelSpend: spend,
      model: 'POSITION_BASED_U_SHAPED',
    });

    assert.strictEqual(attribution.totalConversions, 1);
    assert.strictEqual(attribution.totalAttributedRevenue, 1000);

    const organic = attribution.channelBreakdown.find((c) => c.channel === 'organic_search');
    const email = attribution.channelBreakdown.find((c) => c.channel === 'email_newsletter');
    const meta = attribution.channelBreakdown.find((c) => c.channel === 'paid_meta');

    // U-shaped: 40% to first, 20% to middle, 40% to last
    assert.strictEqual(organic?.attributedRevenue, 400);
    assert.strictEqual(organic?.attributedConversions, 0.4);
    assert.strictEqual(email?.attributedRevenue, 200);
    assert.strictEqual(email?.attributedConversions, 0.2);
    assert.strictEqual(meta?.attributedRevenue, 400);
    assert.strictEqual(meta?.attributedConversions, 0.4);

    // ROAS on Meta: 400 / 300 = 1.33x
    assert.strictEqual(meta?.roas, 1.33);
  });

  it('4. Correctly isolates unattributed revenue when journeys have zero touchpoints', () => {
    const journeys: CustomerConversionJourney[] = [
      {
        conversionId: 'conv_ghost',
        customerId: 'cust_unknown',
        conversionTimestamp: '2026-11-20T10:00:00Z',
        revenueAmount: 500,
        currency: 'USD',
        touchpoints: [],
      },
    ];

    const attribution = marketingAttributionEngine.evaluateAttribution({
      journeys,
      model: 'LAST_TOUCH',
    });

    assert.strictEqual(attribution.totalUnattributedRevenue, 500);
    const unattributed = attribution.channelBreakdown.find((c) => c.channel === 'UNATTRIBUTED');
    assert.ok(unattributed);
    assert.strictEqual(unattributed.attributedRevenue, 500);
  });
});
