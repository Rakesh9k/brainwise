/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MetricCalculator } from './metricCalculator';

export type EpistemicEvidenceTier =
  | 'VERIFIED_OBSERVATION'
  | 'STATISTICALLY_SUPPORTED'
  | 'PLAUSIBLE_HYPOTHESIS'
  | 'UNVERIFIED_ASSUMPTION'
  | 'MISSING_EVIDENCE';

export interface DriverFactorContribution {
  driverName: string;
  varianceAmount: number;
  variancePercentageOfTotalDelta: number;
  evidenceTier: EpistemicEvidenceTier;
  direction: 'FAVORABLE' | 'UNFAVORABLE';
  details: string;
  evidenceReference?: string;
}

export interface RootCauseInvestigationReport {
  investigationId: string;
  workspaceId: string;
  metricId: string;
  metricCanonicalName: string;
  baselinePeriod: { label: string; value: number };
  currentPeriod: { label: string; value: number };
  totalDelta: number;
  totalDeltaPercent: number;
  drivers: DriverFactorContribution[];
  primaryRootCause: string;
  unexplainedVarianceAmount: number;
  recommendedCountermeasures: string[];
  investigatedAt: string;
}

export class RootCauseAnalysisEngine {
  /**
   * Performs mathematical variance decomposition on revenue change:
   * Total Delta = Volume Effect + Price/AOV Effect + Refund Effect + Churn Effect
   */
  public decomposeRevenueDelta(params: {
    workspaceId: string;
    baseline: { label: string; revenue: number; ordersOrCustomers: number; refunds: number };
    current: { label: string; revenue: number; ordersOrCustomers: number; refunds: number };
    churnedRevenue?: number;
  }): RootCauseInvestigationReport {
    const { workspaceId, baseline, current, churnedRevenue = 0 } = params;

    const investigationId = `rca_${Date.now()}`;
    const investigatedAt = new Date().toISOString();
    const totalDelta = MetricCalculator.round(current.revenue - baseline.revenue, 2);
    const totalDeltaPercent = MetricCalculator.safeRatio(totalDelta, baseline.revenue, 100) ?? 0;

    const baseAOV = MetricCalculator.safeRatio(baseline.revenue, baseline.ordersOrCustomers) ?? 0;
    const currentAOV = MetricCalculator.safeRatio(current.revenue, current.ordersOrCustomers) ?? 0;

    // 1. Volume effect: (Current Volume - Base Volume) * Base AOV
    const deltaVolume = current.ordersOrCustomers - baseline.ordersOrCustomers;
    const volumeEffect = MetricCalculator.round(deltaVolume * baseAOV, 2);

    // 2. AOV effect: (Current AOV - Base AOV) * Current Volume
    const deltaAOV = currentAOV - baseAOV;
    const aovEffect = MetricCalculator.round(deltaAOV * current.ordersOrCustomers, 2);

    // 3. Refund effect: -(Current Refunds - Base Refunds)
    const deltaRefunds = current.refunds - baseline.refunds;
    const refundEffect = MetricCalculator.round(-deltaRefunds, 2);

    // 4. Churn effect: lost revenue from cancellations
    const churnEffect = MetricCalculator.round(-Math.abs(churnedRevenue), 2);

    const drivers: DriverFactorContribution[] = [];

    // Helper to calculate % of total delta
    const pctOfDelta = (val: number) =>
      totalDelta !== 0 ? MetricCalculator.round((val / Math.abs(totalDelta)) * 100, 1) : 0;

    if (volumeEffect !== 0) {
      drivers.push({
        driverName: 'Transaction Volume Shift',
        varianceAmount: volumeEffect,
        variancePercentageOfTotalDelta: pctOfDelta(volumeEffect),
        evidenceTier: 'VERIFIED_OBSERVATION',
        direction: volumeEffect > 0 ? 'FAVORABLE' : 'UNFAVORABLE',
        details: `Customer/order volume moved from ${baseline.ordersOrCustomers} to ${current.ordersOrCustomers} (${deltaVolume > 0 ? '+' : ''}${deltaVolume} units).`,
        evidenceReference: 'ORDER_TRANSACTION_COUNT_AGGREGATION',
      });
    }

    if (aovEffect !== 0) {
      drivers.push({
        driverName: 'Average Order Value (AOV) Pricing Shift',
        varianceAmount: aovEffect,
        variancePercentageOfTotalDelta: pctOfDelta(aovEffect),
        evidenceTier: 'VERIFIED_OBSERVATION',
        direction: aovEffect > 0 ? 'FAVORABLE' : 'UNFAVORABLE',
        details: `Average value per transaction shifted from ${MetricCalculator.formatValue(baseAOV, 'CURRENCY')} to ${MetricCalculator.formatValue(currentAOV, 'CURRENCY')}.`,
        evidenceReference: 'BASKET_SIZE_LEDGER',
      });
    }

    if (refundEffect !== 0) {
      drivers.push({
        driverName: 'Refund & Chargeback Volatility',
        varianceAmount: refundEffect,
        variancePercentageOfTotalDelta: pctOfDelta(refundEffect),
        evidenceTier: 'VERIFIED_OBSERVATION',
        direction: refundEffect > 0 ? 'FAVORABLE' : 'UNFAVORABLE',
        details: `Refunds shifted by ${deltaRefunds > 0 ? '+' : ''}${deltaRefunds} compared to baseline.`,
        evidenceReference: 'STRIPE_REFUND_EVENT_FEED',
      });
    }

    if (churnEffect !== 0) {
      drivers.push({
        driverName: 'Subscription / Customer Churn Attrition',
        varianceAmount: churnEffect,
        variancePercentageOfTotalDelta: pctOfDelta(churnEffect),
        evidenceTier: 'STATISTICALLY_SUPPORTED',
        direction: 'UNFAVORABLE',
        details: `Lost customer subscriptions eroded ${MetricCalculator.formatValue(Math.abs(churnEffect), 'CURRENCY')} in recurring revenue.`,
        evidenceReference: 'CHURN_WATERFALL_ANALYSIS',
      });
    }

    // Identify primary driver
    const sortedDrivers = [...drivers].sort((a, b) => Math.abs(b.varianceAmount) - Math.abs(a.varianceAmount));
    const primary = sortedDrivers[0]?.driverName || 'Mixed balanced factors';

    const explainedSum = MetricCalculator.round(
      drivers.reduce((acc, d) => acc + d.varianceAmount, 0),
      2
    );
    const unexplained = MetricCalculator.round(totalDelta - explainedSum, 2);

    const countermeasures: string[] = [];
    if (deltaVolume < 0) {
      countermeasures.push('Reactivate top-of-funnel acquisition channels with high historical ROAS.');
    }
    if (deltaAOV < 0) {
      countermeasures.push('Review recent promotional discounts and test product bundling/upsells.');
    }
    if (deltaRefunds > 0) {
      countermeasures.push('Audit customer feedback on recent fulfillment quality or product defect rates.');
    }
    if (churnedRevenue > 0) {
      countermeasures.push('Trigger automated win-back and retention workflows for accounts in at-risk usage bands.');
    }

    return {
      investigationId,
      workspaceId,
      metricId: 'REV_NET',
      metricCanonicalName: 'Net Revenue',
      baselinePeriod: { label: baseline.label, value: baseline.revenue },
      currentPeriod: { label: current.label, value: current.revenue },
      totalDelta,
      totalDeltaPercent,
      drivers,
      primaryRootCause: primary,
      unexplainedVarianceAmount: unexplained,
      recommendedCountermeasures: countermeasures,
      investigatedAt,
    };
  }
}

export const rootCauseAnalysisEngine = new RootCauseAnalysisEngine();
