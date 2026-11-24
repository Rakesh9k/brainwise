/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { predictiveAnalyticsEngine } from './services/analytics/predictiveAnalyticsEngine';
import { rootCauseAnalysisEngine } from './services/analytics/rootCauseAnalysisEngine';

describe('PHASE 7 & 8 — PREDICTIVE ANALYTICS & ROOT CAUSE ANALYSIS', () => {
  it('1. Generates 3-scenario forecasting with expanding uncertainty confidence intervals', () => {
    const historicalSeries = [
      { period: '2026-06', value: 1000 },
      { period: '2026-07', value: 1200 },
      { period: '2026-08', value: 1450 },
      { period: '2026-09', value: 1700 },
      { period: '2026-10', value: 1950 },
    ];

    const forecast = predictiveAnalyticsEngine.generateForecast({
      workspaceId: 'ws_test_forecast',
      metricId: 'REV_NET',
      historicalSeries,
      horizonPeriodsCount: 3,
    });

    assert.strictEqual(forecast.methodology, 'LINEAR_TREND_EXTRAPOLATION');
    assert.strictEqual(forecast.horizonForecast.length, 3);
    assert.strictEqual(forecast.historicalPeriodsCount, 5);

    // Expected > Conservative, Optimistic > Expected
    const p1 = forecast.horizonForecast[0];
    assert.ok(p1.optimisticValue >= p1.expectedValue);
    assert.ok(p1.expectedValue >= p1.conservativeValue);

    // Uncertainty fans out: period 3 interval width > period 1 interval width
    const width1 = p1.confidenceInterval95[1] - p1.confidenceInterval95[0];
    const p3 = forecast.horizonForecast[2];
    const width3 = p3.confidenceInterval95[1] - p3.confidenceInterval95[0];
    assert.ok(width3 > width1, `Expected fan-out uncertainty: ${width3} > ${width1}`);

    // Uncertainty disclosure must be present
    assert.ok(forecast.uncertaintyDisclosure.includes('MANDATORY PROJECTION NOTICE'));
  });

  it('2. Refuses to manufacture synthetic forecasts when historical observations < 3', () => {
    const shortSeries = [
      { period: '2026-10', value: 1500 },
    ];

    const forecast = predictiveAnalyticsEngine.generateForecast({
      workspaceId: 'ws_test_forecast',
      metricId: 'REV_NET',
      historicalSeries: shortSeries,
    });

    assert.strictEqual(forecast.methodology, 'INSUFFICIENT_HISTORY');
    assert.strictEqual(forecast.forecastReliability, 'UNRELIABLE');
    assert.strictEqual(forecast.horizonForecast.length, 0);
    assert.ok(forecast.uncertaintyDisclosure.includes('statistically unavailable'));
  });

  it('3. Mathematical variance decomposition isolates volume vs AOV vs refund effects on revenue decline', () => {
    const baseline = { label: 'Oct 2026', revenue: 10000, ordersOrCustomers: 100, refunds: 200 }; // AOV = 100
    const current = { label: 'Nov 2026', revenue: 7600, ordersOrCustomers: 80, refunds: 400 }; // AOV = 95
    // Delta = -2400 (-24%)
    // Volume: (80 - 100) * 100 = -2000
    // AOV: (95 - 100) * 80 = -400
    // Refund: -(400 - 200) = -200

    const rca = rootCauseAnalysisEngine.decomposeRevenueDelta({
      workspaceId: 'ws_test_rca',
      baseline,
      current,
    });

    assert.strictEqual(rca.totalDelta, -2400);
    assert.strictEqual(rca.totalDeltaPercent, -24);

    const volumeDriver = rca.drivers.find((d) => d.driverName.includes('Volume'));
    const aovDriver = rca.drivers.find((d) => d.driverName.includes('AOV'));
    const refundDriver = rca.drivers.find((d) => d.driverName.includes('Refund'));

    assert.strictEqual(volumeDriver?.varianceAmount, -2000);
    assert.strictEqual(volumeDriver?.evidenceTier, 'VERIFIED_OBSERVATION');
    assert.strictEqual(volumeDriver?.direction, 'UNFAVORABLE');

    assert.strictEqual(aovDriver?.varianceAmount, -400);
    assert.strictEqual(aovDriver?.evidenceTier, 'VERIFIED_OBSERVATION');

    assert.strictEqual(refundDriver?.varianceAmount, -200);

    // Primary root cause should be volume shift
    assert.ok(rca.primaryRootCause.includes('Volume'));
    assert.ok(rca.recommendedCountermeasures.some((c) => c.includes('acquisition')));
  });
});
