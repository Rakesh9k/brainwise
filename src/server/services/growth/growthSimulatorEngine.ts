/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'node:crypto';
import { db } from '../../db/firestore';
import { growthMissionEngine } from './growthMissionEngine';
import type { WhatIfScenarioModel } from './growthTypes';

export class GrowthSimulatorEngine {
  /**
   * Simulates a What-If growth scenario with Base, Best, and Downside cases
   */
  public async simulateScenario(params: {
    workspaceId: string;
    name: string;
    description: string;
    hypothesis: string;
    monthlyMarketingBudget: number;
    targetPrice: number;
    expectedConversionRate: number; // e.g. 3.5 for 3.5%
    targetCac: number;
    primaryChannel: string;
    grossMarginPercent?: number;
    cacVariancePercent?: number;
    conversionRateVariancePercent?: number;
    monthlyFixedOpEx?: number;
    lifespanMonths?: number;
  }): Promise<WhatIfScenarioModel> {
    const {
      workspaceId,
      name,
      description,
      hypothesis,
      monthlyMarketingBudget,
      targetPrice,
      expectedConversionRate,
      targetCac,
      primaryChannel,
      grossMarginPercent = 70,
      cacVariancePercent = 35,
      monthlyFixedOpEx = 0,
      lifespanMonths = 12,
    } = params;

    const safeBudget = Math.max(1000, monthlyMarketingBudget);
    const safeCac = Math.max(10, targetCac);
    const safePrice = Math.max(10, targetPrice);
    const marginFrac = Math.min(0.95, Math.max(0.1, grossMarginPercent / 100));

    // Base Case
    const baseCustomers = Math.floor(safeBudget / safeCac);
    const baseRevenue = baseCustomers * safePrice;
    const baseGrossProfit = Math.round(baseRevenue * marginFrac);
    const baseContribution = baseGrossProfit - safeBudget;
    const baseNetCashFlow = baseContribution - monthlyFixedOpEx;
    const baseRoas = Math.round((baseRevenue / safeBudget) * 10) / 10;
    const basePayback = Math.max(0.5, Math.round((safeCac / Math.max(1, safePrice * marginFrac)) * 10) / 10);

    // Dynamic Multipliers from configurable business variance
    const bestMultiplier = 1 + (cacVariancePercent / 100);
    const downMultiplier = Math.max(0.2, 1 - (cacVariancePercent / 100));

    // Best Case
    const bestCustomers = Math.floor(baseCustomers * bestMultiplier);
    const bestRevenue = bestCustomers * safePrice;
    const bestGrossProfit = Math.round(bestRevenue * marginFrac);
    const bestContribution = bestGrossProfit - safeBudget;
    const bestNetCashFlow = bestContribution - monthlyFixedOpEx;
    const bestRoas = Math.round((bestRevenue / safeBudget) * 10) / 10;
    const bestPayback = Math.max(0.3, Math.round((safeCac * 0.75 / Math.max(1, safePrice * marginFrac)) * 10) / 10);

    // Downside Case
    const downCustomers = Math.max(1, Math.floor(baseCustomers * downMultiplier));
    const downRevenue = downCustomers * safePrice;
    const downGrossProfit = Math.round(downRevenue * marginFrac);
    const downContribution = downGrossProfit - safeBudget;
    const downNetCashFlow = downContribution - monthlyFixedOpEx;
    const downRoas = Math.round((downRevenue / safeBudget) * 10) / 10;
    const downPayback = Math.max(1.0, Math.round((safeCac * 1.4 / Math.max(1, safePrice * marginFrac)) * 10) / 10);

    // Comprehensive Financial Metrics
    const customerLtv = Math.round(safePrice * marginFrac * lifespanMonths);
    const maxAffordableCac = Math.round(customerLtv * 0.33);
    const ltvCacRatio = Math.round((customerLtv / safeCac) * 10) / 10;
    const contributionMarginPercent = baseRevenue > 0
      ? Math.round((baseContribution / baseRevenue) * 100)
      : 0;

    const now = new Date().toISOString();
    const scenarioId = `scen_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

    const scenario: WhatIfScenarioModel = {
      scenarioId,
      workspaceId,
      name,
      description,
      hypothesis,
      inputs: {
        monthlyMarketingBudget: safeBudget,
        targetPrice: safePrice,
        expectedConversionRate,
        targetCac: safeCac,
        primaryChannel,
      },
      projections: {
        baseCase: {
          monthlyRevenue: baseRevenue,
          customersAcquired: baseCustomers,
          grossProfit: baseGrossProfit,
          contributionProfit: baseContribution,
          netCashFlow: baseNetCashFlow,
          roas: baseRoas,
          paybackMonths: basePayback,
        },
        bestCase: {
          monthlyRevenue: bestRevenue,
          customersAcquired: bestCustomers,
          grossProfit: bestGrossProfit,
          contributionProfit: bestContribution,
          netCashFlow: bestNetCashFlow,
          roas: bestRoas,
          paybackMonths: bestPayback,
        },
        downsideCase: {
          monthlyRevenue: downRevenue,
          customersAcquired: downCustomers,
          grossProfit: downGrossProfit,
          contributionProfit: downContribution,
          netCashFlow: downNetCashFlow,
          roas: downRoas,
          paybackMonths: downPayback,
        },
      },
      financialMetrics: {
        ltv: customerLtv,
        maxAffordableCac,
        ltvCacRatio,
        contributionMarginPercent,
      },
      sensitivityBreakdown: {
        primaryDriver: 'Target CAC & Conversion Rate Elasticity',
        cacElasticity: -1.2,
        conversionElasticity: 0.95,
        uncertaintyRating: expectedConversionRate < 2.0 ? 'HIGH' : expectedConversionRate > 5.0 ? 'LOW' : 'MEDIUM',
        confidenceScore: 0.88,
      },
      sensitivityFactor: `Target CAC variation (${cacVariancePercent}%) is the primary driver of net contribution profitability.`,
      confidenceDisclaimer: 'Modeled forecast based on explicit unit economics inputs. Not a guaranteed revenue outcome.',
      isConvertedToMission: false,
      createdAt: now,
    };

    await db.doc(`workspaces/${workspaceId}/growthScenarios/${scenarioId}`).set(scenario as any);

    return scenario;
  }

  /**
   * Converts a modeled scenario directly into an active Growth Mission
   */
  public async convertScenarioToMission(params: {
    workspaceId: string;
    scenarioId: string;
    ownerId?: string;
  }): Promise<{ scenario: WhatIfScenarioModel; missionId: string }> {
    const { workspaceId, scenarioId, ownerId = 'system_growth_director' } = params;
    const ref = db.doc(`workspaces/${workspaceId}/growthScenarios/${scenarioId}`);
    const snap = await ref.get();
    if (!snap.exists) {
      throw new Error(`Scenario '${scenarioId}' not found.`);
    }

    const scenario = (snap.data() as unknown) as WhatIfScenarioModel;

    const mission = await growthMissionEngine.createMission({
      workspaceId,
      title: `Execute ${scenario.name}: Scale to ${scenario.projections.baseCase.customersAcquired} New Customers`,
      strategicRationale: `Modeled from scenario "${scenario.name}". Hypothesis: ${scenario.hypothesis}. Channel: ${scenario.inputs.primaryChannel}. Target CAC: ${scenario.inputs.targetCac}.`,
      department: 'Marketing',
      targetAudience: 'Target ICP for ' + scenario.name,
      timeHorizon: '30_DAYS',
      priority: 'HIGH',
      budgetCap: scenario.inputs.monthlyMarketingBudget,
      ownerId,
      approvalRequired: true,
      successCriteria: [
        {
          metricName: 'Target Customers Acquired',
          baselineValue: 0,
          targetValue: scenario.projections.baseCase.customersAcquired,
          unit: 'customers',
        },
        {
          metricName: 'Customer Acquisition Cost',
          baselineValue: scenario.inputs.targetCac * 1.5,
          targetValue: scenario.inputs.targetCac,
          unit: 'currency_unit',
        },
      ],
    });

    const updatedScenario: WhatIfScenarioModel = {
      ...scenario,
      isConvertedToMission: true,
      convertedMissionId: mission.missionId,
    };

    await ref.set(updatedScenario as any);

    return { scenario: updatedScenario, missionId: mission.missionId };
  }

  /**
   * Lists scenarios for workspace
   */
  public async listScenarios(workspaceId: string): Promise<WhatIfScenarioModel[]> {
    const snap = await db.collection(`workspaces/${workspaceId}/growthScenarios`).get();
    return snap.docs.map((d) => (d.data() as unknown) as WhatIfScenarioModel);
  }
}

export const growthSimulatorEngine = new GrowthSimulatorEngine();
