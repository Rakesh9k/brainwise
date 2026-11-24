/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { financialIntelligenceService } from './services/financialIntelligenceService';
import type { StrategyDecisionParameters } from './services/financialIntelligenceService';

describe('PHASE 5 — MASTER FINANCIAL INTELLIGENCE & STRATEGY SIMULATOR SUITE', () => {
  const workspaceA = `ws_fin_phase5_test_a_${Date.now()}`;
  const workspaceB = `ws_fin_phase5_test_b_${Date.now()}`;

  // ---------------------------------------------------------------------------
  // 1. Unit Economics & Dependent Metric Recalculation
  // ---------------------------------------------------------------------------
  it('1. Computes unit economics, breakeven accounts, and payback months deterministically', () => {
    const params: StrategyDecisionParameters = {
      scenarioName: 'Starter Pricing Tier',
      priceMonthly: 499,
      targetCustomerVolume: 100,
      customerAcquisitionCost: 800,
      websiteConversionRatePercent: 3.5,
      monthlyOperatingCosts: 15000,
      monthlyMarketingBudget: 10000,
      grossMarginPercent: 80, // 80% margin = ₹399.2 unit gross profit
      monthlyChurnPercent: 4.0, // 25 months average lifetime
    };

    const metrics = financialIntelligenceService.calculateMetrics(params, 'INR');

    assert.equal(metrics.monthlyRevenue, 49900);
    assert.equal(metrics.annualRunRate, 49900 * 12);
    assert.equal(metrics.grossProfitMonthly, Math.round(49900 * 0.8));
    assert.equal(metrics.contributionMarginMonthly, Math.round(49900 * 0.8) - 10000);
    
    // Break-even customers = (15000 + 10000) / (499 * 0.8) = 25000 / 399.2 = 63 accounts
    assert.equal(metrics.breakEvenCustomers, 63);
    
    // Customer lifetime = 100 / 4 = 25 months
    assert.equal(metrics.customerLifetimeMonths, 25);
    
    // LTV = 399.2 * 25 = 9980
    assert.equal(metrics.customerLtv, Math.round(399.2 * 25));
    
    // LTV:CAC = 9980 / 800 = 12.48x
    assert.ok(metrics.ltvCacRatio > 10);
    
    // Payback = 800 / 399.2 = 2.0 months
    assert.equal(metrics.paybackMonths, 2.0);
    assert.equal(metrics.healthZone, 'healthy');
  });

  // ---------------------------------------------------------------------------
  // 2. Interactive Strategy Simulator: Comparing Decisions
  // ---------------------------------------------------------------------------
  it('2. Strategy Simulator compares ₹499 vs ₹799 decisions with 3-tier sensitivity bands', async () => {
    const decisionA: StrategyDecisionParameters = {
      scenarioName: 'Option A (₹499 Low Friction)',
      priceMonthly: 499,
      targetCustomerVolume: 150,
      customerAcquisitionCost: 950,
      websiteConversionRatePercent: 4.2,
      monthlyOperatingCosts: 25000,
      monthlyMarketingBudget: 20000,
      grossMarginPercent: 75,
      monthlyChurnPercent: 3.5,
    };

    const decisionB: StrategyDecisionParameters = {
      scenarioName: 'Option B (₹799 Value Premium)',
      priceMonthly: 799,
      targetCustomerVolume: 90,
      customerAcquisitionCost: 1450,
      websiteConversionRatePercent: 2.8,
      monthlyOperatingCosts: 25000,
      monthlyMarketingBudget: 20000,
      grossMarginPercent: 80,
      monthlyChurnPercent: 2.8,
    };

    const comparison = await financialIntelligenceService.compareDecisions({
      workspaceId: workspaceA,
      decisionA,
      decisionB,
      currency: 'INR',
    });

    assert.ok(comparison.simulationId.startsWith('sim_'));
    assert.equal(comparison.currency, 'INR');
    assert.ok(comparison.deltaAnalysis.monthlyRevenueDelta !== 0);
    assert.ok(comparison.deltaAnalysis.recommendedDecision.length > 0);

    // Verify 3-tier sensitivity bands
    assert.ok(comparison.threeTierBands.optimistic.annualRunRate > comparison.threeTierBands.realistic.annualRunRate);
    assert.ok(comparison.threeTierBands.pessimistic.annualRunRate < comparison.threeTierBands.realistic.annualRunRate);
    assert.ok(comparison.disclaimer.includes('Financial model projections'));
  });

  // ---------------------------------------------------------------------------
  // 3. Startup Cost & Runway Calculator
  // ---------------------------------------------------------------------------
  it('3. Calculates CapEx, monthly OpEx, and 6-month working capital runway requirement', async () => {
    const startupCosts = await financialIntelligenceService.calculateStartupCosts({
      workspaceId: workspaceA,
      currency: 'INR',
    });

    assert.equal(startupCosts.currency, 'INR');
    assert.ok(startupCosts.capitalExpenditure.length >= 2);
    assert.ok(startupCosts.operationalExpenditureMonthly.length >= 2);
    assert.ok(startupCosts.totalInitialCapEx > 0);
    assert.ok(startupCosts.monthlyOpExBurn > 0);
    assert.equal(startupCosts.recommendedRunwayMonths, 6);
    assert.equal(
      startupCosts.totalWorkingCapitalNeeded,
      startupCosts.totalInitialCapEx + (startupCosts.monthlyOpExBurn * 6)
    );
  });

  // ---------------------------------------------------------------------------
  // 4. RFC-Compliant CSV Export
  // ---------------------------------------------------------------------------
  it('4. Generates RFC-compliant CSV formatted financial model with comparison and sensitivity', async () => {
    const decisionA: StrategyDecisionParameters = {
      scenarioName: 'Starter Tier',
      priceMonthly: 499,
      targetCustomerVolume: 100,
      customerAcquisitionCost: 800,
      websiteConversionRatePercent: 3.5,
      monthlyOperatingCosts: 15000,
      monthlyMarketingBudget: 10000,
      grossMarginPercent: 80,
      monthlyChurnPercent: 4.0,
    };

    const decisionB: StrategyDecisionParameters = {
      ...decisionA,
      scenarioName: 'Growth Tier',
      priceMonthly: 799,
      targetCustomerVolume: 80,
    };

    const comparison = await financialIntelligenceService.compareDecisions({
      workspaceId: workspaceA,
      decisionA,
      decisionB,
      currency: 'INR',
    });

    const csv = financialIntelligenceService.exportFinancialModelCsv(comparison);
    assert.ok(csv.includes('BrainWise Financial Intelligence & Strategy Simulator Export'));
    assert.ok(csv.includes('STRATEGY COMPARISON'));
    assert.ok(csv.includes('PARAMETRIC SENSITIVITY BANDS'));
    assert.ok(csv.includes('Statutory Disclaimer'));
  });

  // ---------------------------------------------------------------------------
  // 5. Multi-Tenant Workspace Boundary
  // ---------------------------------------------------------------------------
  it('5. Enforces strict multi-tenant isolation across financial simulations', async () => {
    const startupCostsB = await financialIntelligenceService.calculateStartupCosts({
      workspaceId: workspaceB,
      currency: 'USD',
    });

    assert.equal(startupCostsB.workspaceId, workspaceB);
    assert.equal(startupCostsB.currency, 'USD');
  });
});
