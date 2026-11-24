/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'node:crypto';
import { db } from '../db/firestore';

export interface StrategyDecisionParameters {
  scenarioName: string;
  priceMonthly: number;
  targetCustomerVolume: number;
  customerAcquisitionCost: number; // CAC
  websiteConversionRatePercent: number; // e.g. 3.2%
  monthlyOperatingCosts: number; // Fixed OpEx
  monthlyMarketingBudget: number;
  grossMarginPercent: number; // e.g. 75%
  monthlyChurnPercent: number; // e.g. 3.0%
}

export interface CalculatedFinancialMetrics {
  scenarioName: string;
  monthlyRevenue: number;
  annualRunRate: number;
  grossProfitMonthly: number;
  contributionMarginMonthly: number;
  breakEvenCustomers: number;
  customerLifetimeMonths: number;
  customerLtv: number;
  ltvCacRatio: number;
  paybackMonths: number;
  cashRunwayRequired: number; // Minimum cash buffer needed
  healthZone: 'healthy' | 'moderate' | 'high_risk';
  strategicInsight: string;
}

export interface StrategySimulationComparison {
  simulationId: string;
  workspaceId: string;
  currency: string;
  scenarios: {
    scenarioA: CalculatedFinancialMetrics;
    scenarioB: CalculatedFinancialMetrics;
  };
  deltaAnalysis: {
    monthlyRevenueDelta: number;
    grossProfitDelta: number;
    breakEvenCustomerDelta: number;
    paybackMonthsDelta: number;
    recommendedDecision: string;
  };
  threeTierBands: {
    optimistic: CalculatedFinancialMetrics;
    realistic: CalculatedFinancialMetrics;
    pessimistic: CalculatedFinancialMetrics;
  };
  disclaimer: string;
  createdAt: string;
}

export interface StartupCostEstimate {
  workspaceId: string;
  currency: string;
  capitalExpenditure: Array<{ item: string; cost: number; category: string }>;
  operationalExpenditureMonthly: Array<{ item: string; cost: number; category: string }>;
  totalInitialCapEx: number;
  monthlyOpExBurn: number;
  recommendedRunwayMonths: number;
  totalWorkingCapitalNeeded: number;
}

export class FinancialIntelligenceService {
  public static readonly DISCLAIMER =
    'Financial model projections represent parametric mathematical calculations based on explicit user assumptions. They do not constitute guaranteed commercial returns, investment advice, or bankable commitments.';

  /**
   * Calculates dependent unit economics and financial metrics from input assumptions
   */
  public calculateMetrics(params: StrategyDecisionParameters, currency = 'INR'): CalculatedFinancialMetrics {
    const {
      scenarioName,
      priceMonthly,
      targetCustomerVolume,
      customerAcquisitionCost,
      monthlyOperatingCosts,
      monthlyMarketingBudget,
      grossMarginPercent,
      monthlyChurnPercent,
    } = params;

    const marginFraction = Math.max(0.1, Math.min(1.0, grossMarginPercent / 100));
    const churn = Math.max(0.5, Math.min(50, monthlyChurnPercent));
    const cac = Math.max(1, customerAcquisitionCost);
    const volume = Math.max(1, targetCustomerVolume);
    const price = Math.max(1, priceMonthly);

    const monthlyRevenue = Math.round(price * volume);
    const annualRunRate = monthlyRevenue * 12;
    const grossProfitMonthly = Math.round(monthlyRevenue * marginFraction);
    const contributionMarginMonthly = Math.round(grossProfitMonthly - monthlyMarketingBudget);
    
    const unitGrossProfitMonthly = price * marginFraction;
    const breakEvenCustomers = Math.ceil((monthlyOperatingCosts + monthlyMarketingBudget) / Math.max(1, unitGrossProfitMonthly));
    
    const customerLifetimeMonths = Math.round((100 / churn) * 10) / 10;
    const customerLtv = Math.round(unitGrossProfitMonthly * customerLifetimeMonths);
    const ltvCacRatio = Math.round((customerLtv / cac) * 100) / 100;
    const paybackMonths = Math.round((cac / Math.max(1, unitGrossProfitMonthly)) * 10) / 10;

    const monthlyNetBurn = (monthlyOperatingCosts + monthlyMarketingBudget) - grossProfitMonthly;
    const cashRunwayRequired = monthlyNetBurn > 0 ? monthlyNetBurn * 6 : 0; // 6 months safety runway

    let healthZone: 'healthy' | 'moderate' | 'high_risk' = 'moderate';
    if (ltvCacRatio >= 3.0 && paybackMonths <= 12 && contributionMarginMonthly > 0) {
      healthZone = 'healthy';
    } else if (ltvCacRatio < 2.0 || paybackMonths > 18 || contributionMarginMonthly < -monthlyOperatingCosts * 0.5) {
      healthZone = 'high_risk';
    }

    const cur = currency === 'INR' ? '₹' : '$';
    const insight = `At ${cur}${price}/mo ARPU with ${grossMarginPercent}% gross margin, the business breaks even at ${breakEvenCustomers.toLocaleString()} customers. LTV:CAC ratio is ${ltvCacRatio}x with payback in ${paybackMonths} months.`;

    return {
      scenarioName,
      monthlyRevenue,
      annualRunRate,
      grossProfitMonthly,
      contributionMarginMonthly,
      breakEvenCustomers,
      customerLifetimeMonths,
      customerLtv,
      ltvCacRatio,
      paybackMonths,
      cashRunwayRequired,
      healthZone,
      strategicInsight: insight,
    };
  }

  /**
   * Strategy Simulator: Compares two business decisions (e.g. ₹499 vs. ₹799 price points)
   * with Best, Expected, and Downside scenario modeling
   */
  public async compareDecisions(params: {
    workspaceId: string;
    decisionA: StrategyDecisionParameters;
    decisionB: StrategyDecisionParameters;
    currency?: string;
  }): Promise<StrategySimulationComparison> {
    const { workspaceId, decisionA, decisionB, currency = 'INR' } = params;
    const simulationId = `sim_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const now = new Date().toISOString();

    const metricsA = this.calculateMetrics(decisionA, currency);
    const metricsB = this.calculateMetrics(decisionB, currency);

    const monthlyRevenueDelta = metricsB.monthlyRevenue - metricsA.monthlyRevenue;
    const grossProfitDelta = metricsB.grossProfitMonthly - metricsA.grossProfitMonthly;
    const breakEvenCustomerDelta = metricsB.breakEvenCustomers - metricsA.breakEvenCustomers;
    const paybackMonthsDelta = Math.round((metricsB.paybackMonths - metricsA.paybackMonths) * 10) / 10;

    let recommendedDecision: string;
    if (metricsB.ltvCacRatio >= metricsA.ltvCacRatio && metricsB.contributionMarginMonthly >= metricsA.contributionMarginMonthly) {
      recommendedDecision = `Option B (${decisionB.scenarioName}) delivers superior unit contribution and faster payback. Recommended strategy.`;
    } else if (metricsA.breakEvenCustomers < metricsB.breakEvenCustomers * 0.7) {
      recommendedDecision = `Option A (${decisionA.scenarioName}) has a substantially lower customer acquisition hurdle to reach profitability. Safer entry strategy.`;
    } else {
      recommendedDecision = `Option B yields higher revenue potential (+₹${Math.abs(monthlyRevenueDelta)}/mo) but requires tighter acquisition discipline to maintain payback.`;
    }

    // 3-Tier Parametric Bands for Decision B (Realistic baseline)
    const optimisticParams: StrategyDecisionParameters = {
      ...decisionB,
      scenarioName: 'Optimistic (+20% Vol, -15% CAC)',
      targetCustomerVolume: Math.round(decisionB.targetCustomerVolume * 1.2),
      customerAcquisitionCost: Math.round(decisionB.customerAcquisitionCost * 0.85),
      monthlyChurnPercent: Math.max(1.5, decisionB.monthlyChurnPercent * 0.8),
    };
    const pessimisticParams: StrategyDecisionParameters = {
      ...decisionB,
      scenarioName: 'Pessimistic (-20% Vol, +30% CAC)',
      targetCustomerVolume: Math.round(decisionB.targetCustomerVolume * 0.8),
      customerAcquisitionCost: Math.round(decisionB.customerAcquisitionCost * 1.3),
      monthlyChurnPercent: decisionB.monthlyChurnPercent * 1.4,
    };

    const comparison: StrategySimulationComparison = {
      simulationId,
      workspaceId,
      currency,
      scenarios: {
        scenarioA: metricsA,
        scenarioB: metricsB,
      },
      deltaAnalysis: {
        monthlyRevenueDelta,
        grossProfitDelta,
        breakEvenCustomerDelta,
        paybackMonthsDelta,
        recommendedDecision,
      },
      threeTierBands: {
        optimistic: this.calculateMetrics(optimisticParams, currency),
        realistic: metricsB,
        pessimistic: this.calculateMetrics(pessimisticParams, currency),
      },
      disclaimer: FinancialIntelligenceService.DISCLAIMER,
      createdAt: now,
    };

    // Save simulation record to Firestore
    await db.doc<StrategySimulationComparison>(`workspaces/${workspaceId}/financial_simulations/${simulationId}`).set(comparison);

    return comparison;
  }

  /**
   * Generates Startup Cost & Working Capital Runway Calculator
   */
  public async calculateStartupCosts(params: {
    workspaceId: string;
    currency?: string;
  }): Promise<StartupCostEstimate> {
    const { workspaceId, currency = 'INR' } = params;
    const isIndia = currency === 'INR';

    const capitalExpenditure = isIndia
      ? [
          { item: 'Company Registration & MCA Statutory Filing', cost: 12000, category: 'Legal & Compliance' },
          { item: 'Brand Identity & Trademark Filing (Class 35/42)', cost: 15000, category: 'Intellectual Property' },
          { item: 'Domain, SSL & Core Infrastructure Setup', cost: 8000, category: 'Technology' },
        ]
      : [
          { item: 'State Entity Incorporation & Registered Agent', cost: 500, category: 'Legal' },
          { item: 'USPTO Trademark Application', cost: 350, category: 'IP' },
          { item: 'Domain, Cloud Setup & Security', cost: 250, category: 'Technology' },
        ];

    const operationalExpenditureMonthly = isIndia
      ? [
          { item: 'Cloud Server & Firestore Infrastructure (Mumbai asia-south1)', cost: 6500, category: 'Hosting' },
          { item: 'Cashfree PG & Payment Gateway Maintenance', cost: 1500, category: 'Billing' },
          { item: 'Initial Digital Customer Acquisition (Meta/Google Search)', cost: 15000, category: 'Marketing' },
          { item: 'Accounting & GST Compliance Filing', cost: 3500, category: 'Accounting' },
        ]
      : [
          { item: 'Cloud Infrastructure & Managed Database', cost: 150, category: 'Hosting' },
          { item: 'Billing & Payment Gateway Platform Fees', cost: 50, category: 'Billing' },
          { item: 'Initial Paid Discovery Marketing Ad Spend', cost: 450, category: 'Marketing' },
          { item: 'SaaS Tooling & Admin Overhead', cost: 100, category: 'Operations' },
        ];

    const totalInitialCapEx = capitalExpenditure.reduce((acc, c) => acc + c.cost, 0);
    const monthlyOpExBurn = operationalExpenditureMonthly.reduce((acc, o) => acc + o.cost, 0);
    const recommendedRunwayMonths = 6;
    const totalWorkingCapitalNeeded = totalInitialCapEx + (monthlyOpExBurn * recommendedRunwayMonths);

    return {
      workspaceId,
      currency,
      capitalExpenditure,
      operationalExpenditureMonthly,
      totalInitialCapEx,
      monthlyOpExBurn,
      recommendedRunwayMonths,
      totalWorkingCapitalNeeded,
    };
  }

  /**
   * Exports full financial model to RFC-compliant CSV
   */
  public exportFinancialModelCsv(simulation: StrategySimulationComparison): string {
    const lines: string[] = [];
    const cur = simulation.currency === 'INR' ? '₹' : '$';

    lines.push('BrainWise Financial Intelligence & Strategy Simulator Export');
    lines.push(`Workspace ID,${simulation.workspaceId}`);
    lines.push(`Generated Date,${simulation.createdAt}`);
    lines.push(`Currency,${simulation.currency}`);
    lines.push('');

    // Strategy Comparison Table
    lines.push('STRATEGY COMPARISON,Scenario A,Scenario B,Delta (B - A)');
    const a = simulation.scenarios.scenarioA;
    const b = simulation.scenarios.scenarioB;
    const d = simulation.deltaAnalysis;

    lines.push(`Scenario Title,"${a.scenarioName}","${b.scenarioName}",-`);
    lines.push(`Monthly Revenue,${cur}${a.monthlyRevenue},${cur}${b.monthlyRevenue},${cur}${d.monthlyRevenueDelta}`);
    lines.push(`Annual Run Rate (ARR),${cur}${a.annualRunRate},${cur}${b.annualRunRate},${cur}${d.monthlyRevenueDelta * 12}`);
    lines.push(`Gross Profit Monthly,${cur}${a.grossProfitMonthly},${cur}${b.grossProfitMonthly},${cur}${d.grossProfitDelta}`);
    lines.push(`Contribution Margin,${cur}${a.contributionMarginMonthly},${cur}${b.contributionMarginMonthly},${cur}${b.contributionMarginMonthly - a.contributionMarginMonthly}`);
    lines.push(`Break-Even Customers,${a.breakEvenCustomers},${b.breakEvenCustomers},${d.breakEvenCustomerDelta}`);
    lines.push(`Customer LTV,${cur}${a.customerLtv},${cur}${b.customerLtv},${cur}${b.customerLtv - a.customerLtv}`);
    lines.push(`LTV:CAC Ratio,${a.ltvCacRatio}x,${b.ltvCacRatio}x,${(b.ltvCacRatio - a.ltvCacRatio).toFixed(2)}x`);
    lines.push(`Payback Horizon,${a.paybackMonths} mo,${b.paybackMonths} mo,${d.paybackMonthsDelta} mo`);
    lines.push(`Health Zone,${a.healthZone},${b.healthZone},-`);
    lines.push('');

    // 3-Tier Sensitivity Bands Table
    lines.push('PARAMETRIC SENSITIVITY BANDS,Optimistic,Realistic,Pessimistic');
    const opt = simulation.threeTierBands.optimistic;
    const real = simulation.threeTierBands.realistic;
    const pess = simulation.threeTierBands.pessimistic;

    lines.push(`Monthly Revenue,${cur}${opt.monthlyRevenue},${cur}${real.monthlyRevenue},${cur}${pess.monthlyRevenue}`);
    lines.push(`Gross Profit,${cur}${opt.grossProfitMonthly},${cur}${real.grossProfitMonthly},${cur}${pess.grossProfitMonthly}`);
    lines.push(`LTV:CAC Ratio,${opt.ltvCacRatio}x,${real.ltvCacRatio}x,${pess.ltvCacRatio}x`);
    lines.push(`Payback Months,${opt.paybackMonths} mo,${real.paybackMonths} mo,${pess.paybackMonths} mo`);
    lines.push('');

    lines.push(`"Strategic Recommendation","${d.recommendedDecision.replace(/"/g, '""')}"`);
    lines.push(`"Statutory Disclaimer","${simulation.disclaimer.replace(/"/g, '""')}"`);

    return lines.join('\n');
  }
}

export const financialIntelligenceService = new FinancialIntelligenceService();
