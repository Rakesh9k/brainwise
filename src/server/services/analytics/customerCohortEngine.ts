/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MetricCalculator } from './metricCalculator';

export interface CustomerTransactionRecord {
  customerId: string;
  orderId: string;
  amount: number;
  timestamp: string;
}

export interface CustomerProfileSummary {
  customerId: string;
  firstOrderDate: string;
  latestOrderDate: string;
  totalOrders: number;
  totalSpend: number;
  lifecycleStage: 'NEW' | 'ACTIVE_REPEAT' | 'VIP' | 'AT_RISK' | 'CHURNED';
  recencyDays: number;
}

export interface CohortMatrixRow {
  cohortMonth: string; // e.g. "2026-06"
  initialCustomerCount: number;
  retentionByMonth: number[]; // [100, 45.2, 38.0, ...] retention percentages
}

export interface CustomerCohortAnalysisResult {
  workspaceId: string;
  analyzedAt: string;
  totalUniqueCustomers: number;
  newCustomersInPeriod: number;
  returningCustomersInPeriod: number;
  repeatPurchaseRatePercent: number;
  averagePurchaseFrequency: number;
  top20PercentRevenueShare: number; // Pareto concentration
  cohortMatrix: CohortMatrixRow[];
  lifecycleSegments: {
    newCount: number;
    activeRepeatCount: number;
    vipCount: number;
    atRiskCount: number;
    churnedCount: number;
  };
}

export class CustomerCohortEngine {
  /**
   * Analyzes customer order history to construct lifecycle stages and cohort retention matrix
   */
  public analyzeCohorts(params: {
    workspaceId: string;
    transactions: CustomerTransactionRecord[];
    reportingPeriod: { startDate: string; endDate: string };
    referenceDate?: string;
  }): CustomerCohortAnalysisResult {
    const {
      workspaceId,
      transactions,
      reportingPeriod,
      referenceDate = new Date().toISOString(),
    } = params;

    const refTime = new Date(referenceDate).getTime();
    const customerOrders = new Map<string, CustomerTransactionRecord[]>();

    for (const tx of transactions) {
      const list = customerOrders.get(tx.customerId) || [];
      list.push(tx);
      customerOrders.set(tx.customerId, list);
    }

    const profiles: CustomerProfileSummary[] = [];
    const cohortMap = new Map<string, Set<string>>(); // cohortMonth -> set of customerIds
    const cohortActivity = new Map<string, Map<number, Set<string>>>(); // cohortMonth -> (monthOffset -> activeCustomerIds)

    for (const [customerId, orders] of customerOrders.entries()) {
      orders.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      const firstTx = orders[0];
      const lastTx = orders[orders.length - 1];

      const firstDate = firstTx.timestamp;
      const lastDate = lastTx.timestamp;
      const totalSpend = MetricCalculator.round(
        orders.reduce((acc, o) => acc + o.amount, 0),
        2
      );

      const recencyDays = Math.floor(
        (refTime - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24)
      );

      // Lifecycle Stage Determination (RFM based)
      let stage: CustomerProfileSummary['lifecycleStage'] = 'ACTIVE_REPEAT';
      if (orders.length === 1 && firstDate >= reportingPeriod.startDate) {
        stage = 'NEW';
      } else if (totalSpend > 2000 || orders.length >= 5) {
        stage = 'VIP';
      } else if (recencyDays > 90) {
        stage = 'CHURNED';
      } else if (recencyDays > 45) {
        stage = 'AT_RISK';
      }

      profiles.push({
        customerId,
        firstOrderDate: firstDate,
        latestOrderDate: lastDate,
        totalOrders: orders.length,
        totalSpend,
        lifecycleStage: stage,
        recencyDays,
      });

      // Cohort month group: "YYYY-MM"
      const cohortMonth = firstDate.slice(0, 7);
      if (!cohortMap.has(cohortMonth)) {
        cohortMap.set(cohortMonth, new Set());
        cohortActivity.set(cohortMonth, new Map());
      }
      cohortMap.get(cohortMonth)!.add(customerId);

      // Track order activity across elapsed months from first order
      const firstYear = parseInt(firstDate.slice(0, 4), 10);
      const firstMo = parseInt(firstDate.slice(5, 7), 10);

      for (const o of orders) {
        const oYear = parseInt(o.timestamp.slice(0, 4), 10);
        const oMo = parseInt(o.timestamp.slice(5, 7), 10);
        const monthOffset = (oYear - firstYear) * 12 + (oMo - firstMo);

        const activityMap = cohortActivity.get(cohortMonth)!;
        if (!activityMap.has(monthOffset)) {
          activityMap.set(monthOffset, new Set());
        }
        activityMap.get(monthOffset)!.add(customerId);
      }
    }

    // Compute Pareto revenue concentration (share of top 20% customers)
    profiles.sort((a, b) => b.totalSpend - a.totalSpend);
    const top20Count = Math.max(1, Math.ceil(profiles.length * 0.2));
    const totalRevAll = profiles.reduce((acc, p) => acc + p.totalSpend, 0);
    const top20Rev = profiles.slice(0, top20Count).reduce((acc, p) => acc + p.totalSpend, 0);
    const paretoShare = MetricCalculator.safeRatio(top20Rev, totalRevAll, 100) ?? 0;

    // Build Cohort Matrix
    const sortedCohorts = Array.from(cohortMap.keys()).sort();
    const cohortMatrix: CohortMatrixRow[] = [];

    for (const cMonth of sortedCohorts) {
      const cohortSize = cohortMap.get(cMonth)!.size;
      const activityMap = cohortActivity.get(cMonth)!;
      const maxOffset = Math.max(...Array.from(activityMap.keys()), 0);

      const retentionByMonth: number[] = [];
      for (let m = 0; m <= Math.min(maxOffset, 6); m++) {
        const activeInM = activityMap.get(m)?.size || 0;
        const pct = MetricCalculator.round((activeInM / cohortSize) * 100, 1);
        retentionByMonth.push(pct);
      }

      cohortMatrix.push({
        cohortMonth: cMonth,
        initialCustomerCount: cohortSize,
        retentionByMonth,
      });
    }

    // Segment distributions
    const newCount = profiles.filter((p) => p.lifecycleStage === 'NEW').length;
    const activeRepeatCount = profiles.filter((p) => p.lifecycleStage === 'ACTIVE_REPEAT').length;
    const vipCount = profiles.filter((p) => p.lifecycleStage === 'VIP').length;
    const atRiskCount = profiles.filter((p) => p.lifecycleStage === 'AT_RISK').length;
    const churnedCount = profiles.filter((p) => p.lifecycleStage === 'CHURNED').length;

    const repeatCustomers = profiles.filter((p) => p.totalOrders > 1).length;
    const repeatRate = MetricCalculator.safeRatio(repeatCustomers, profiles.length, 100) ?? 0;
    const avgFrequency = MetricCalculator.safeRatio(transactions.length, profiles.length) ?? 0;

    const inPeriodNew = profiles.filter(
      (p) => p.firstOrderDate >= reportingPeriod.startDate && p.firstOrderDate <= reportingPeriod.endDate
    ).length;
    const inPeriodReturning = profiles.filter(
      (p) => p.firstOrderDate < reportingPeriod.startDate && p.latestOrderDate >= reportingPeriod.startDate
    ).length;

    return {
      workspaceId,
      analyzedAt: new Date().toISOString(),
      totalUniqueCustomers: profiles.length,
      newCustomersInPeriod: inPeriodNew,
      returningCustomersInPeriod: inPeriodReturning,
      repeatPurchaseRatePercent: MetricCalculator.round(repeatRate, 1),
      averagePurchaseFrequency: MetricCalculator.round(avgFrequency, 2),
      top20PercentRevenueShare: MetricCalculator.round(paretoShare, 1),
      cohortMatrix,
      lifecycleSegments: {
        newCount,
        activeRepeatCount,
        vipCount,
        atRiskCount,
        churnedCount,
      },
    };
  }
}

export const customerCohortEngine = new CustomerCohortEngine();
