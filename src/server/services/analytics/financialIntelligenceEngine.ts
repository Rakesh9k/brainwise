/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MetricCalculator } from './metricCalculator';

export interface FinancialTransactionItem {
  transactionId: string;
  amount: number;
  currency: string;
  type: 'PAYMENT' | 'REFUND' | 'DISCOUNT' | 'TAX' | 'CHARGEBACK';
  category: 'SUBSCRIPTION_RECURRING' | 'ONE_TIME_PURCHASE' | 'USAGE' | 'SERVICE_FEE';
  billingInterval?: 'MONTHLY' | 'ANNUAL' | 'QUARTERLY';
  customerId: string;
  productId?: string;
  productCategory?: string;
  timestamp: string;
  isRecognized: boolean;
  isCollected: boolean;
  status: 'SETTLED' | 'PENDING' | 'FAILED';
}

export interface SaaSMRRBreakdown {
  startingMRR: number;
  newMRR: number;
  expansionMRR: number;
  contractionMRR: number;
  churnedMRR: number;
  netNewMRR: number;
  endingMRR: number;
  arr: number;
  nrrPercent: number | null;
  grrPercent: number | null;
  quickRatio: number | null;
}

export interface EcommerceFinancialOverview {
  grossSales: number;
  discounts: number;
  refunds: number;
  taxesCollected: number;
  netSales: number;
  totalOrders: number;
  aov: number | null;
  returnRatePercent: number | null;
  topCategories: Array<{ category: string; revenue: number; orderCount: number }>;
}

export interface ServiceFinancialOverview {
  totalBookings: number;
  completedAppointments: number;
  cancellations: number;
  cancellationRatePercent: number | null;
  utilizationRatePercent: number | null;
  totalServiceRevenue: number;
  averageTransactionValue: number | null;
  revenuePerCustomer: number | null;
}

export interface UnifiedRevenueComposition {
  grossRevenue: number;
  netRevenue: number;
  cashCollected: number;
  recognizedRevenue: number;
  bookedRevenue: number;
  recurringRevenue: number;
  outstandingReceivables: number;
  currency: string;
  period: { startDate: string; endDate: string };
}

export class FinancialIntelligenceEngine {
  /**
   * Computes strict revenue categorization ensuring no conflicting revenue concepts are combined
   */
  public computeRevenueComposition(params: {
    transactions: FinancialTransactionItem[];
    currency?: string;
    period: { startDate: string; endDate: string };
  }): UnifiedRevenueComposition {
    const { transactions, currency = 'USD', period } = params;

    let gross = 0;
    let refunds = 0;
    let discounts = 0;
    let cashCollected = 0;
    let recognized = 0;
    let booked = 0;
    let recurring = 0;
    let outstanding = 0;

    for (const tx of transactions) {
      if (tx.status === 'FAILED') continue;

      if (tx.type === 'PAYMENT') {
        gross += tx.amount;
        booked += tx.amount;

        if (tx.isCollected) {
          cashCollected += tx.amount;
        } else {
          outstanding += tx.amount;
        }

        if (tx.isRecognized) {
          recognized += tx.amount;
        }

        if (tx.category === 'SUBSCRIPTION_RECURRING') {
          // Normalize to monthly equivalent
          if (tx.billingInterval === 'ANNUAL') {
            recurring += tx.amount / 12;
          } else if (tx.billingInterval === 'QUARTERLY') {
            recurring += tx.amount / 3;
          } else {
            recurring += tx.amount;
          }
        }
      } else if (tx.type === 'REFUND' || tx.type === 'CHARGEBACK') {
        refunds += tx.amount;
        cashCollected -= tx.amount;
      } else if (tx.type === 'DISCOUNT') {
        discounts += tx.amount;
      }
    }

    const net = gross - refunds - discounts;

    return {
      grossRevenue: MetricCalculator.round(gross, 2),
      netRevenue: MetricCalculator.round(net, 2),
      cashCollected: MetricCalculator.round(cashCollected, 2),
      recognizedRevenue: MetricCalculator.round(recognized, 2),
      bookedRevenue: MetricCalculator.round(booked, 2),
      recurringRevenue: MetricCalculator.round(recurring, 2),
      outstandingReceivables: MetricCalculator.round(outstanding, 2),
      currency,
      period,
    };
  }

  /**
   * Computes SaaS-specific MRR Waterfall and Retention Dynamics
   */
  public computeSaaSMetrics(params: {
    startingMRR: number;
    newMRR: number;
    expansionMRR: number;
    contractionMRR: number;
    churnedMRR: number;
  }): SaaSMRRBreakdown {
    const { startingMRR, newMRR, expansionMRR, contractionMRR, churnedMRR } = params;

    const netNewMRR = MetricCalculator.round(newMRR + expansionMRR - contractionMRR - churnedMRR, 2);
    const endingMRR = MetricCalculator.round(startingMRR + netNewMRR, 2);
    const arr = MetricCalculator.round(endingMRR * 12, 2);

    const nrrPercent = MetricCalculator.safeRatio(
      startingMRR + expansionMRR - contractionMRR - churnedMRR,
      startingMRR,
      100
    );

    const grrPercent = MetricCalculator.safeRatio(
      startingMRR - contractionMRR - churnedMRR,
      startingMRR,
      100
    );

    const quickRatio = MetricCalculator.safeRatio(
      newMRR + expansionMRR,
      contractionMRR + churnedMRR
    );

    return {
      startingMRR: MetricCalculator.round(startingMRR, 2),
      newMRR: MetricCalculator.round(newMRR, 2),
      expansionMRR: MetricCalculator.round(expansionMRR, 2),
      contractionMRR: MetricCalculator.round(contractionMRR, 2),
      churnedMRR: MetricCalculator.round(churnedMRR, 2),
      netNewMRR,
      endingMRR,
      arr,
      nrrPercent: nrrPercent !== null ? MetricCalculator.round(nrrPercent, 1) : null,
      grrPercent: grrPercent !== null ? MetricCalculator.round(grrPercent, 1) : null,
      quickRatio: quickRatio !== null ? MetricCalculator.round(quickRatio, 2) : null,
    };
  }

  /**
   * Computes Ecommerce financial overview and product category profitability
   */
  public computeEcommerceMetrics(params: {
    orders: Array<{
      orderId: string;
      grossAmount: number;
      discountAmount: number;
      refundAmount: number;
      taxAmount: number;
      status: string;
      category?: string;
    }>;
  }): EcommerceFinancialOverview {
    const { orders } = params;

    let grossSales = 0;
    let discounts = 0;
    let refunds = 0;
    let taxes = 0;
    let totalCompleted = 0;
    const catMap = new Map<string, { revenue: number; count: number }>();

    for (const o of orders) {
      if (['CANCELLED', 'FAILED'].includes(o.status.toUpperCase())) continue;

      grossSales += o.grossAmount;
      discounts += o.discountAmount;
      refunds += o.refundAmount;
      taxes += o.taxAmount;
      totalCompleted++;

      const cat = o.category || 'Uncategorized';
      const existing = catMap.get(cat) || { revenue: 0, count: 0 };
      existing.revenue += o.grossAmount - o.discountAmount - o.refundAmount;
      existing.count++;
      catMap.set(cat, existing);
    }

    const netSales = MetricCalculator.round(grossSales - discounts - refunds, 2);
    const aov = MetricCalculator.safeRatio(netSales, totalCompleted);
    const returnRate = MetricCalculator.safeRatio(refunds, grossSales, 100);

    const topCategories = Array.from(catMap.entries())
      .map(([category, data]) => ({
        category,
        revenue: MetricCalculator.round(data.revenue, 2),
        orderCount: data.count,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    return {
      grossSales: MetricCalculator.round(grossSales, 2),
      discounts: MetricCalculator.round(discounts, 2),
      refunds: MetricCalculator.round(refunds, 2),
      taxesCollected: MetricCalculator.round(taxes, 2),
      netSales,
      totalOrders: totalCompleted,
      aov: aov !== null ? MetricCalculator.round(aov, 2) : null,
      returnRatePercent: returnRate !== null ? MetricCalculator.round(returnRate, 1) : null,
      topCategories,
    };
  }

  /**
   * Computes Service/Salon/Restaurant capacity, booking metrics, and cancellation rates
   */
  public computeServiceMetrics(params: {
    totalBookings: number;
    completedAppointments: number;
    cancellations: number;
    availableOperatingHours: number;
    fulfilledHours: number;
    totalRevenue: number;
    uniqueCustomersCount: number;
  }): ServiceFinancialOverview {
    const {
      totalBookings,
      completedAppointments,
      cancellations,
      availableOperatingHours,
      fulfilledHours,
      totalRevenue,
      uniqueCustomersCount,
    } = params;

    const cancellationRate = MetricCalculator.safeRatio(cancellations, totalBookings, 100);
    const utilizationRate = MetricCalculator.safeRatio(fulfilledHours, availableOperatingHours, 100);
    const atv = MetricCalculator.safeRatio(totalRevenue, completedAppointments);
    const rpc = MetricCalculator.safeRatio(totalRevenue, uniqueCustomersCount);

    return {
      totalBookings,
      completedAppointments,
      cancellations,
      cancellationRatePercent: cancellationRate !== null ? MetricCalculator.round(cancellationRate, 1) : null,
      utilizationRatePercent: utilizationRate !== null ? MetricCalculator.round(utilizationRate, 1) : null,
      totalServiceRevenue: MetricCalculator.round(totalRevenue, 2),
      averageTransactionValue: atv !== null ? MetricCalculator.round(atv, 2) : null,
      revenuePerCustomer: rpc !== null ? MetricCalculator.round(rpc, 2) : null,
    };
  }
}

export const financialIntelligenceEngine = new FinancialIntelligenceEngine();
