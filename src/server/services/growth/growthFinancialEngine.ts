/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  GrowthScenarioProjection,
  GrowthScenarioSimulationResult,
} from './growthTypes';

export interface FinancialCalculationParams {
  totalMarketingSpend: number;
  newCustomersAcquired: number;
  totalRevenue: number;
  grossMarginPercent: number;
  averageCustomerLifespanMonths?: number;
  monthlyChurnPercent?: number;
}

export class GrowthFinancialEngine {
  public static readonly DISCLAIMER =
    'Financial model projections represent parametric mathematical calculations based on explicit user assumptions. They do not constitute guaranteed commercial returns or bankable commitments.';

  /**
   * Computes key SaaS / Venture unit economics safely with zero-division guards
   */
  public calculateUnitEconomics(params: FinancialCalculationParams): {
    cac: number;
    aov: number;
    ltv: number;
    ltvCacRatio: number;
    paybackMonths: number;
    grossProfit: number;
    roas: number;
    breakEvenCac: number;
  } {
    const {
      totalMarketingSpend,
      newCustomersAcquired,
      totalRevenue,
      grossMarginPercent,
      monthlyChurnPercent = 5,
    } = params;

    const customers = Math.max(0, newCustomersAcquired);
    const spend = Math.max(0, totalMarketingSpend);
    const revenue = Math.max(0, totalRevenue);
    const marginFrac = Math.max(0.01, Math.min(1.0, grossMarginPercent / 100));

    // CAC = Spend / Customers
    const cac = customers > 0 ? Math.round(spend / customers) : 0;

    // AOV = Revenue / Customers
    const aov = customers > 0 ? Math.round(revenue / customers) : 0;

    // Lifespan = 1 / Churn (months)
    const lifespanMonths = monthlyChurnPercent > 0 ? Math.min(36, 100 / monthlyChurnPercent) : 12;

    // LTV = AOV * Margin * Lifespan
    const ltv = Math.round(aov * marginFrac * (lifespanMonths / 12));

    // LTV : CAC Ratio
    const ltvCacRatio = cac > 0 ? Number((ltv / cac).toFixed(2)) : 0;

    // Payback Period (Months) = CAC / (AOV * Margin)
    const monthlyGrossPerCustomer = aov * marginFrac;
    const paybackMonths =
      monthlyGrossPerCustomer > 0 ? Number((cac / monthlyGrossPerCustomer).toFixed(1)) : 0;

    // Gross Profit
    const grossProfit = Math.round(revenue * marginFrac);

    // ROAS = Revenue / Spend
    const roas = spend > 0 ? Number((revenue / spend).toFixed(2)) : 0;

    // Break-even CAC = AOV * Margin
    const breakEvenCac = Math.round(aov * marginFrac);

    return {
      cac,
      aov,
      ltv,
      ltvCacRatio,
      paybackMonths,
      grossProfit,
      roas,
      breakEvenCac,
    };
  }

  /**
   * Runs 3-tier Growth Scenario Simulation (Conservative, Expected, Optimistic)
   */
  public simulateScenarios(params: {
    workspaceId: string;
    currency?: string;
    baselineRevenue: number;
    monthlyBudget: number;
    currentCac: number;
    currentConversionRatePercent: number;
    averageOrderValue: number;
    grossMarginPercent: number;
  }): GrowthScenarioSimulationResult {
    const {
      workspaceId,
      currency = 'INR',
      baselineRevenue,
      monthlyBudget,
      currentCac,
      currentConversionRatePercent,
      averageOrderValue,
      grossMarginPercent,
    } = params;

    const marginFrac = grossMarginPercent / 100;
    const simulationId = `sim_${Date.now()}`;

    // Helper to build scenario projection
    const buildProjection = (
      name: 'Conservative' | 'Expected' | 'Optimistic',
      cacMultiplier: number,
      budgetMultiplier: number,
      convMultiplier: number
    ): GrowthScenarioProjection => {
      const budget = Math.round(monthlyBudget * budgetMultiplier);
      const effectiveCac = Math.max(100, Math.round(currentCac * cacMultiplier));
      const newCustomers = effectiveCac > 0 ? Math.round(budget / effectiveCac) : 0;
      const incrementalRevenue = newCustomers * averageOrderValue;
      const projectedRevenue = baselineRevenue + incrementalRevenue;
      const grossProfit = Math.round(projectedRevenue * marginFrac);
      const roas = budget > 0 ? Number((incrementalRevenue / budget).toFixed(2)) : 0;
      const breakEvenCustomers = averageOrderValue * marginFrac > 0
        ? Math.ceil(budget / (averageOrderValue * marginFrac))
        : 0;

      return {
        scenarioName: name,
        projectedRevenueMonthly: projectedRevenue,
        projectedMarketingCostMonthly: budget,
        projectedGrossProfitMonthly: grossProfit,
        projectedNewCustomersMonthly: newCustomers,
        effectiveCac,
        estimatedRoas: roas,
        breakEvenCustomersRequired: breakEvenCustomers,
        keyAssumptions: [
          `Effective CAC modeled at ${currency} ${effectiveCac} (${Math.round((cacMultiplier - 1) * 100)}% shift vs baseline).`,
          `Conversion rate efficiency factor: ${(currentConversionRatePercent * convMultiplier).toFixed(2)}%.`,
          `Gross margin held stable at ${grossMarginPercent}%.`,
        ],
      };
    };

    return {
      simulationId,
      workspaceId,
      currency,
      baseline: {
        monthlyRevenue: baselineRevenue,
        customerAcquisitionCost: currentCac,
        conversionRatePercent: currentConversionRatePercent,
        monthlyBudget,
      },
      scenarios: {
        conservative: buildProjection('Conservative', 1.25, 0.8, 0.9),
        expected: buildProjection('Expected', 1.0, 1.0, 1.0),
        optimistic: buildProjection('Optimistic', 0.8, 1.2, 1.25),
      },
      sensitivityFactor: 'Customer Acquisition Cost (CAC) and Checkout Conversion Rate',
      confidenceDisclaimer: GrowthFinancialEngine.DISCLAIMER,
      generatedAt: new Date().toISOString(),
    };
  }
}

export const growthFinancialEngine = new GrowthFinancialEngine();
