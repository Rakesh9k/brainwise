/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { growthContextEngine } from './growthContextEngine';
import { growthDiagnosisEngine } from './growthDiagnosisEngine';
import { growthOpportunityEngine } from './growthOpportunityEngine';
import { growthCapacityEngine } from './growthCapacityEngine';
import { growthRoadmapEngine } from './growthRoadmapEngine';
import { growthStrategicMemoryEngine } from './growthStrategicMemoryEngine';
import { growthRecommendationEngine, type GroundedRecommendationItem } from './growthRecommendationEngine';
import type {
  AdaptiveRoadmapVersion,
  AssembledGrowthContext,
  CategorizedStrategicMemoryRecord,
  GrowthBottleneckDiagnosis,
  GrowthOpportunityDetail,
  GrowthRiskAlert,
  ResourceCapacityProfile,
  StructuredGrowthTask,
  WhatNotToDoRecommendation,
} from './growthTypes';

export interface GrowthDirectorIntelligenceOverview {
  workspaceId: string;
  context: AssembledGrowthContext;
  diagnoses: GrowthBottleneckDiagnosis[];
  opportunities: GrowthOpportunityDetail[];
  capacity: ResourceCapacityProfile;
  roadmap: AdaptiveRoadmapVersion;
  focusSprintTasks: StructuredGrowthTask[];
  recommendations: GroundedRecommendationItem[];
  riskAlerts: GrowthRiskAlert[];
  whatNotToDo: WhatNotToDoRecommendation[];
  activeMemories: CategorizedStrategicMemoryRecord[];
  generatedAt: string;
}

export class GrowthIntelligenceOrchestrator {
  /**
   * Executes a complete Growth Intelligence cycle for a workspace
   */
  public async orchestrateGrowthIntelligence(params: {
    workspaceId: string;
    focusCategory?: GrowthOpportunityDetail['category'];
    founderDailyHours?: number;
    metrics?: {
      monthlyVisitors?: number;
      signupsOrLeads?: number;
      payingCustomers?: number;
      trackedConversionRate?: number;
      retentionRate90Day?: number;
      currentCac?: number;
      currentLtv?: number;
    };
  }): Promise<GrowthDirectorIntelligenceOverview> {
    const { workspaceId, focusCategory, founderDailyHours = 7, metrics } = params;
    const now = new Date().toISOString();

    // 1. Retrieve & Assemble Business Context
    const context = await growthContextEngine.assembleContext(workspaceId);

    // 2. Retrieve Strategic Memories and Fatigued Themes
    const { memories, fatiguedThemesByCategory } =
      await growthStrategicMemoryEngine.getActiveMemories(workspaceId);
    const fatiguedThemes = Object.values(fatiguedThemesByCategory).flat();

    // 3. Growth Diagnosis
    const diagnoses = growthDiagnosisEngine.diagnoseBottlenecks(context, metrics);

    // 4. Growth Opportunities
    let opportunities = growthOpportunityEngine.synthesizeOpportunities(context, diagnoses);
    if (focusCategory) {
      opportunities = opportunities.filter((o) => o.category === focusCategory);
    }

    // 5. Dynamic Roadmap Generation
    const roadmap = growthRoadmapEngine.generateDynamicRoadmap({
      context,
      diagnoses,
      opportunities,
      version: 1,
    });

    const allTasks = roadmap.phases.flatMap((p) => p.tasks);

    // 6. Capacity & Resource Evaluation
    const capacity = growthCapacityEngine.evaluateCapacity({
      founderDailyHours,
      availableDaysPerWeek: 5,
      teamSize: 1,
      monthlyBudget: context.marketingBudgetMonthly,
      plannedTasks: allTasks,
    });

    // 7. Focus Sprint Task Selection (Top 3 unblocked coherent tasks)
    const focusSprintTasks = growthCapacityEngine.selectFocusSprintTasks({
      tasks: allTasks,
      limit: 3,
      availableMinutes: 45,
      targetGoalId: context.activeGoals[0]?.goalId,
    });

    // 8. Grounded Recommendations
    const recommendations = growthRecommendationEngine.generateRecommendations({
      context,
      diagnoses,
      fatiguedThemes,
    });

    // 9. Risk Monitoring & What Not To Do
    const riskAlerts = growthRecommendationEngine.monitorGrowthRisks({
      context,
      activeChannelsCount: context.channels.length,
      founderUtilizationPercent: capacity.utilizationPercent,
    });

    const whatNotToDo = growthRecommendationEngine.generateWhatNotToDo({
      context,
      fatiguedThemes,
    });

    return {
      workspaceId,
      context,
      diagnoses,
      opportunities,
      capacity,
      roadmap,
      focusSprintTasks,
      recommendations,
      riskAlerts,
      whatNotToDo,
      activeMemories: memories,
      generatedAt: now,
    };
  }
}

export const growthIntelligenceOrchestrator = new GrowthIntelligenceOrchestrator();
