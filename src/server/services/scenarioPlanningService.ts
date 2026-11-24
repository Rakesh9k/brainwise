/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { businessProfileRepository } from '../repositories/businessProfileRepository';
import { productRepository } from '../repositories/productRepository';
import type {
  ScenarioSimulationRequest,
  ScenarioSimulationResult,
  ScenarioBand,
} from '../types/api';

export class ScenarioPlanningService {
  public static readonly DISCLAIMER =
    'Scenario planning outputs represent calculated parametric sensitivity models under explicit assumptions. They are planning tools and do NOT constitute financial forecasts, earnings guarantees, or predictive commitments.';

  /**
   * Simulates decision outcomes across Best-Case, Expected-Case, and Downside bands
   */
  public async simulateScenario(
    request: ScenarioSimulationRequest
  ): Promise<ScenarioSimulationResult> {
    const { workspaceId, scenarioType, parameters } = request;
    const profile = await businessProfileRepository.getProfile(workspaceId);
    const products = await productRepository.listProducts(workspaceId);

    const resources = profile?.resourcesAndConstraints;
    const mb = resources?.marketingBudget;
    const verifiedBudget =
      resources?.monthlyMarketingBudget ||
      (typeof mb === 'number' ? mb : mb?.monthly);
    const hasKnownBudget = typeof verifiedBudget === 'number' && verifiedBudget > 0;
    const baselineMonthlyBudget = hasKnownBudget ? verifiedBudget : 3000; // Baseline modeling anchor
    const avgPrice =
      products.length > 0
        ? Math.round(products.reduce((acc, p) => acc + (p.price || 0), 0) / products.length)
        : 100;

    let title: string;
    let description: string;
    let bestCase: ScenarioBand;
    let expectedCase: ScenarioBand;
    let downside: ScenarioBand;

    switch (scenarioType) {
      case 'budget_increase_20': {
        title = 'Marketing Budget Increase (+20%)';
        description =
          'Evaluates incremental account acquisition vs channel diminishing returns when increasing marketing spend by 20%.';

        const newSpend = Math.round(baselineMonthlyBudget * 1.2);
        const incrementalSpend = newSpend - baselineMonthlyBudget;

        bestCase = {
          caseType: 'best_case',
          projectedRevenueRange: {
            min: Math.round(incrementalSpend * 3.5),
            max: Math.round(incrementalSpend * 5.0),
            midpoint: Math.round(incrementalSpend * 4.25),
          },
          projectedCustomerGrowth: { min: 8, max: 14 },
          estimatedCost: newSpend,
          netMarginEstimatePercent: 42,
          keyAssumptions: [
            'Ad channel conversion rate remains constant at scale.',
            'Production fulfillment absorbs volume without overtime premium.',
          ],
          operationalBottlenecks: ['Weekly dispatch capacity ceiling'],
        };

        expectedCase = {
          caseType: 'expected_case',
          projectedRevenueRange: {
            min: Math.round(incrementalSpend * 2.2),
            max: Math.round(incrementalSpend * 3.2),
            midpoint: Math.round(incrementalSpend * 2.7),
          },
          projectedCustomerGrowth: { min: 5, max: 8 },
          estimatedCost: newSpend,
          netMarginEstimatePercent: 35,
          keyAssumptions: [
            'Slight 10% CAC inflation due to broader audience reach.',
            'Standard customer churn rate applies.',
          ],
          operationalBottlenecks: ['Lead response time within 24 hours'],
        };

        downside = {
          caseType: 'downside',
          projectedRevenueRange: {
            min: Math.round(incrementalSpend * 0.8),
            max: Math.round(incrementalSpend * 1.5),
            midpoint: Math.round(incrementalSpend * 1.15),
          },
          projectedCustomerGrowth: { min: 1, max: 3 },
          estimatedCost: newSpend,
          netMarginEstimatePercent: 12,
          keyAssumptions: [
            'Diminishing returns increase blended CAC by 40%.',
            'Competitive discounting dampens conversion.',
          ],
          operationalBottlenecks: ['Unabsorbed marketing spend without positive payback'],
        };
        break;
      }

      case 'pricing_change': {
        const delta = typeof parameters?.priceDeltaPercent === 'number' ? parameters.priceDeltaPercent : 10;
        const newPrice = Math.round(avgPrice * (1 + delta / 100));
        title = `Product Price Adjustment (${delta > 0 ? '+' : ''}${delta}%)`;
        description = `Evaluates margin expansion against price elasticity and customer drop-off at a ${delta}% price shift (avg unit price moves to $${newPrice}).`;

        bestCase = {
          caseType: 'best_case',
          projectedRevenueRange: {
            min: Math.round(avgPrice * 25 * 1.15),
            max: Math.round(avgPrice * 35 * 1.15),
            midpoint: Math.round(avgPrice * 30 * 1.15),
          },
          projectedCustomerGrowth: { min: 4, max: 8 },
          estimatedCost: baselineMonthlyBudget,
          netMarginEstimatePercent: 55,
          keyAssumptions: [
            'Strong product differentiation absorbs price increase with zero churn.',
            'Commercial accounts perceive higher quality.',
          ],
          operationalBottlenecks: ['Maintaining zero defect rate under premium pricing'],
        };

        expectedCase = {
          caseType: 'expected_case',
          projectedRevenueRange: {
            min: Math.round(avgPrice * 20 * 1.05),
            max: Math.round(avgPrice * 28 * 1.05),
            midpoint: Math.round(avgPrice * 24 * 1.05),
          },
          projectedCustomerGrowth: { min: 2, max: 5 },
          estimatedCost: baselineMonthlyBudget,
          netMarginEstimatePercent: 48,
          keyAssumptions: [
            '5% account drop-off offset by higher gross margin on remaining accounts.',
          ],
          operationalBottlenecks: ['Account manager time handling contract renegotiations'],
        };

        downside = {
          caseType: 'downside',
          projectedRevenueRange: {
            min: Math.round(avgPrice * 15 * 0.9),
            max: Math.round(avgPrice * 20 * 0.9),
            midpoint: Math.round(avgPrice * 17.5 * 0.9),
          },
          projectedCustomerGrowth: { min: -3, max: 0 },
          estimatedCost: baselineMonthlyBudget,
          netMarginEstimatePercent: 28,
          keyAssumptions: [
            'Price sensitivity drives 20% of commercial accounts to regional competitors.',
          ],
          operationalBottlenecks: ['Underutilized manufacturing or roasting capacity'],
        };
        break;
      }

      case 'cac_increase': {
        title = 'Customer Acquisition Cost Surge (+30%)';
        description =
          'Simulates unit economics resilience if acquisition costs rise 30% due to auction competition.';

        bestCase = {
          caseType: 'best_case',
          projectedRevenueRange: { min: 6000, max: 9500, midpoint: 7750 },
          projectedCustomerGrowth: { min: 5, max: 8 },
          estimatedCost: baselineMonthlyBudget,
          netMarginEstimatePercent: 32,
          keyAssumptions: ['Organic referrals offset paid acquisition inflation.'],
          operationalBottlenecks: ['Referral tracking workflow'],
        };

        expectedCase = {
          caseType: 'expected_case',
          projectedRevenueRange: { min: 4500, max: 7000, midpoint: 5750 },
          projectedCustomerGrowth: { min: 3, max: 5 },
          estimatedCost: baselineMonthlyBudget,
          netMarginEstimatePercent: 24,
          keyAssumptions: ['Blended CAC rises from $120 to $156 per verified account.'],
          operationalBottlenecks: ['Longer payback period (7.5 months)'],
        };

        downside = {
          caseType: 'downside',
          projectedRevenueRange: { min: 2500, max: 4000, midpoint: 3250 },
          projectedCustomerGrowth: { min: 1, max: 2 },
          estimatedCost: baselineMonthlyBudget,
          netMarginEstimatePercent: 8,
          keyAssumptions: [
            'Paid channel becomes economically unviable without retention expansion.',
          ],
          operationalBottlenecks: ['Capital exhaustion if paid spend is maintained unchanged'],
        };
        break;
      }

      case 'repeat_customer_focus': {
        title = 'Retention & Account LTV Optimization';
        description =
          'Models reallocation of 50% acquisition budget toward commercial reorder automation and retention.';

        bestCase = {
          caseType: 'best_case',
          projectedRevenueRange: { min: 12000, max: 18000, midpoint: 15000 },
          projectedCustomerGrowth: { min: 6, max: 10 },
          estimatedCost: Math.round(baselineMonthlyBudget * 0.8),
          netMarginEstimatePercent: 62,
          keyAssumptions: [
            'Bi-weekly subscription reorder frequency increases by 25%.',
            'Lower churn dramatically expands LTV/CAC ratio to 5.2x.',
          ],
          operationalBottlenecks: ['Predictable schedule logistics'],
        };

        expectedCase = {
          caseType: 'expected_case',
          projectedRevenueRange: { min: 8500, max: 13000, midpoint: 10750 },
          projectedCustomerGrowth: { min: 3, max: 6 },
          estimatedCost: Math.round(baselineMonthlyBudget * 0.8),
          netMarginEstimatePercent: 52,
          keyAssumptions: ['Monthly commercial repeat rate stabilizes at 88%.'],
          operationalBottlenecks: ['Keg inventory return turnaround time'],
        };

        downside = {
          caseType: 'downside',
          projectedRevenueRange: { min: 5000, max: 7500, midpoint: 6250 },
          projectedCustomerGrowth: { min: 0, max: 2 },
          estimatedCost: Math.round(baselineMonthlyBudget * 0.8),
          netMarginEstimatePercent: 36,
          keyAssumptions: [
            'Top of funnel dries up while existing accounts order at baseline frequency.',
          ],
          operationalBottlenecks: ['Stagnant new customer addition'],
        };
        break;
      }

      case 'new_location_expansion':
      default: {
        title = 'Regional Distribution Expansion';
        description = 'Models launching cold-chain delivery into adjacent metropolitan territory.';

        const capex = 12000;
        bestCase = {
          caseType: 'best_case',
          projectedRevenueRange: { min: 18000, max: 28000, midpoint: 23000 },
          projectedCustomerGrowth: { min: 15, max: 25 },
          estimatedCost: baselineMonthlyBudget + 3000,
          netMarginEstimatePercent: 44,
          keyAssumptions: [
            'Rapid adoption among cafes in new territory within 60 days.',
            `Initial vehicle cold-chain capital expenditure of $${capex.toLocaleString()} amortized over 24 months.`,
          ],
          operationalBottlenecks: ['Regional driver hiring and van cold-storage maintenance'],
        };

        expectedCase = {
          caseType: 'expected_case',
          projectedRevenueRange: { min: 10000, max: 16000, midpoint: 13000 },
          projectedCustomerGrowth: { min: 8, max: 14 },
          estimatedCost: baselineMonthlyBudget + 3000,
          netMarginEstimatePercent: 32,
          keyAssumptions: ['Gradual territory ramp with 6-month breakeven.'],
          operationalBottlenecks: ['Logistics route density optimization'],
        };

        downside = {
          caseType: 'downside',
          projectedRevenueRange: { min: 3000, max: 6000, midpoint: 4500 },
          projectedCustomerGrowth: { min: 2, max: 5 },
          estimatedCost: baselineMonthlyBudget + 3000,
          netMarginEstimatePercent: -8, // Initial loss
          keyAssumptions: [
            'Entrenched local roasters protect existing accounts with price discounting.',
          ],
          operationalBottlenecks: ['High fixed transit overhead with low delivery density'],
        };
        break;
      }
    }

    return {
      scenarioType,
      title,
      description,
      baseline: {
        monthlyBudget: hasKnownBudget ? verifiedBudget : 'UNKNOWN',
        activeProductCount: products.length,
        targetMarket: profile?.industry || 'Unspecified Market',
      },
      scenarios: {
        bestCase,
        expectedCase,
        downside,
      },
      disclaimer: ScenarioPlanningService.DISCLAIMER,
      simulatedAt: new Date().toISOString(),
    };
  }
}

export const scenarioPlanningService = new ScenarioPlanningService();
