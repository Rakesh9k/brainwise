/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'node:crypto';
import { db } from '../db/firestore';
import { taskRepository } from '../repositories/taskRepository';
import { departmentEventBus } from '../events/eventBus';
import { recordStrategicAngle } from '../../utils/strategicMemory';
import type { GrowthTaskEntity } from '../types/api';
import {
  growthIntelligenceOrchestrator,
  type GrowthDirectorIntelligenceOverview,
} from './growth/growthIntelligenceOrchestrator';
import { growthPrioritizationEngine } from './growth/growthPrioritizationEngine';
import { growthStrategicMemoryEngine } from './growth/growthStrategicMemoryEngine';
import { growthFinancialEngine } from './growth/growthFinancialEngine';
import { growthExperimentEngine } from './growth/growthExperimentEngine';
import { growthMissionEngine } from './growth/growthMissionEngine';
import { growthStrategyArchitect } from './growth/growthStrategyArchitect';
import { growthDepartmentEngines } from './growth/growthDepartmentEngines';
import { growthExecutionQueueService } from './growth/growthExecutionQueueService';
import { growthSimulatorEngine } from './growth/growthSimulatorEngine';
import { growthModelAdapterEngine } from './growth/growthModelAdapterEngine';
import { growthAnalyticsEngine } from './growth/growthAnalyticsEngine';
import type {
  GrowthBottleneckDiagnosis,
  GrowthScenarioSimulationResult,
  StructuredGrowthExperiment,
  GrowthMissionEntity,
  GrowthStrategyEntity,
  GrowthExecutionJob,
  WhatIfScenarioModel,
  BusinessModelType,
} from './growth/growthTypes';

export type TimeHorizon = 'IMMEDIATE_7_DAYS' | 'SHORT_TERM_30_DAYS' | 'MEDIUM_TERM_90_DAYS';
export type GrowthTaskDepartment = 'Marketing' | 'Sales' | 'Product' | 'Operations' | 'Finance';
export type GrowthTaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED' | 'ABANDONED';

export interface GrowthTaskPlan {
  taskId: string;
  workspaceId: string;
  title: string;
  department: GrowthTaskDepartment;
  timeHorizon: TimeHorizon;
  specificAction: string;
  expectedOutcome: string;
  estimatedEffortHours: number;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  iceScore: {
    impact: number;      // 1-10
    confidence: number;  // 1-10
    ease: number;        // 1-10
    compositeScore: number; // Impact * Confidence * Ease (1-1000)
  };
  dependencies: string[];
  suggestedTools: string[];
  successMetrics: {
    metricName: string;
    baselineValue: number;
    targetValue: number;
    unit: string;
  };
  completionCriteria: string;
  status: GrowthTaskStatus;
  completedAt?: string;
  outcomeMet?: boolean;
  actualMetrics?: Record<string, number>;
  outcomeNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GrowthOpportunity {
  opportunityId: string;
  workspaceId: string;
  title: string;
  category: 'CUSTOMER_ACQUISITION' | 'CONVERSION_OPTIMIZATION' | 'RETENTION' | 'REFERRAL_VIRALITY' | 'PRICING_POWER';
  summary: string;
  rationale: string;
  estimatedRevenueImpactMonthly: number;
  expectedCacReductionPercent?: number;
  recommendedChannels: Array<{
    channelName: string;
    strategicFitPercent: number;
    expectedCac: number;
    formatType: 'SVG_COLLATERAL' | 'OUTREACH_COPY' | 'CONTENT_PACK'; // Strict zero video
  }>;
  riskAssessment: {
    level: 'LOW' | 'MEDIUM' | 'HIGH';
    mitigationStrategy: string;
  };
  supportingEvidenceIds: string[];
  createdAt: string;
}

export interface OperationalRoadmap {
  roadmapId: string;
  workspaceId: string;
  executiveSummary: string;
  opportunities: GrowthOpportunity[];
  tasks: GrowthTaskPlan[];
  horizonCounts: {
    immediate7Days: number;
    shortTerm30Days: number;
    mediumTerm90Days: number;
  };
  diagnoses?: GrowthBottleneckDiagnosis[];
  createdAt: string;
  updatedAt: string;
}

export interface TaskOutcomeSubmission {
  taskId: string;
  workspaceId: string;
  status: 'COMPLETED' | 'ABANDONED';
  outcomeMet: boolean;
  actualMetrics?: Record<string, number>;
  notes: string;
  learningsToPersist?: string[];
}

export class GrowthDirectorService {
  /**
   * Calculates ICE composite score deterministically
   */
  public calculateIceScore(impact: number, confidence: number, ease: number): {
    impact: number;
    confidence: number;
    ease: number;
    compositeScore: number;
  } {
    const res = growthPrioritizationEngine.calculateIceScore({ impact, confidence, ease });
    return {
      impact: res.impact,
      confidence: res.confidence,
      ease: res.ease,
      compositeScore: res.rawComposite,
    };
  }

  /**
   * Generates a complete multi-horizon operational roadmap and prioritized tasks grounded in the Business Brain
   */
  public async generateOperationalRoadmap(params: {
    workspaceId: string;
    focusCategory?: GrowthOpportunity['category'];
  }): Promise<OperationalRoadmap> {
    const { workspaceId, focusCategory } = params;

    // Execute complete intelligence cycle via Orchestrator
    const intelligence = await growthIntelligenceOrchestrator.orchestrateGrowthIntelligence({
      workspaceId,
      focusCategory: focusCategory as any,
    });

    const now = new Date().toISOString();
    const roadmapId = intelligence.roadmap.roadmapId || `rdm_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

    // Map opportunities to compatible format
    const opportunities: GrowthOpportunity[] = intelligence.opportunities.map((opp) => ({
      opportunityId: opp.opportunityId,
      workspaceId,
      title: opp.title,
      category: opp.category as any,
      summary: opp.summary,
      rationale: opp.rationale,
      estimatedRevenueImpactMonthly: opp.estimatedRevenueImpactMonthly,
      expectedCacReductionPercent: opp.expectedCacReductionPercent,
      recommendedChannels: opp.recommendedChannels.map((c) => ({
        channelName: c.channelName,
        strategicFitPercent: c.strategicFitPercent,
        expectedCac: c.expectedCac,
        formatType: c.formatType,
      })),
      riskAssessment: opp.riskAssessment,
      supportingEvidenceIds: opp.supportingEvidenceIds,
      createdAt: opp.createdAt,
    }));

    // Map tasks to compatible format
    const tasks: GrowthTaskPlan[] = intelligence.roadmap.phases.flatMap((phase) =>
      phase.tasks.map((t) => {
        let mappedHorizon: TimeHorizon = 'IMMEDIATE_7_DAYS';
        if (t.timeHorizon === 'SHORT_TERM_30_DAYS') mappedHorizon = 'SHORT_TERM_30_DAYS';
        else if (t.timeHorizon === 'MEDIUM_TERM_60_DAYS' || t.timeHorizon === 'LONG_TERM_90_DAYS') {
          mappedHorizon = 'MEDIUM_TERM_90_DAYS';
        }

        return {
          taskId: t.taskId,
          workspaceId,
          title: t.title,
          department: (t.department as GrowthTaskDepartment) || 'Growth',
          timeHorizon: mappedHorizon,
          specificAction: t.executionSteps?.join('. ') || t.description,
          expectedOutcome: t.expectedOutcome,
          estimatedEffortHours: Math.round((t.estimatedDurationMinutes / 60) * 10) / 10 || 2.0,
          priority: t.priority,
          iceScore: {
            impact: t.iceScore.impact,
            confidence: t.iceScore.confidence,
            ease: t.iceScore.ease,
            compositeScore: t.iceScore.rawComposite,
          },
          dependencies: t.dependencies || [],
          suggestedTools: t.suggestedTools || ['BrainWise Strategy Tools'],
          successMetrics: t.successMetrics || {
            metricName: 'Completion Metric',
            baselineValue: 0,
            targetValue: 1,
            unit: 'unit',
          },
          completionCriteria: t.completionCriteria,
          status: t.status === 'COMPLETED' ? 'COMPLETED' : t.status === 'BLOCKED' ? 'BLOCKED' : 'PENDING',
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
        };
      })
    );

    // Persist tasks to workspace collection and dual-persist to taskRepository
    for (const t of tasks) {
      await db.doc(`workspaces/${workspaceId}/growthTasks/${t.taskId}`).set(t as any);
      // Dual-persist to taskRepository for standard UI compatibility
      const standardTask: GrowthTaskEntity = {
        taskId: t.taskId,
        workspaceId,
        title: t.title,
        description: `${t.specificAction} Expected outcome: ${t.expectedOutcome}`,
        priority: t.priority.toLowerCase() as any,
        status: 'pending',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        notes: `Department: ${t.department} · Effort: ${t.estimatedEffortHours}h · Expected: ${t.expectedOutcome}`,
        estimatedMinutes: Math.round(((t.estimatedEffortHours || 1) * 60)),
        createdBy: 'system_growth_director',
        createdAt: now,
        updatedAt: now,
      };
      await taskRepository.create(standardTask);
    }

    const roadmap: OperationalRoadmap = {
      roadmapId,
      workspaceId,
      executiveSummary: intelligence.roadmap.executiveSummary,
      opportunities,
      tasks,
      horizonCounts: {
        immediate7Days: tasks.filter((t) => t.timeHorizon === 'IMMEDIATE_7_DAYS').length,
        shortTerm30Days: tasks.filter((t) => t.timeHorizon === 'SHORT_TERM_30_DAYS').length,
        mediumTerm90Days: tasks.filter((t) => t.timeHorizon === 'MEDIUM_TERM_90_DAYS').length,
      },
      diagnoses: intelligence.diagnoses,
      createdAt: now,
      updatedAt: now,
    };

    await db.doc(`workspaces/${workspaceId}/growthRoadmaps/${roadmapId}`).set(roadmap as any);

    return roadmap;
  }

  /**
   * Records the outcome of an execution task, feeding real-world results back into closed-loop learning
   */
  public async recordTaskOutcome(params: TaskOutcomeSubmission): Promise<{
    task: GrowthTaskPlan;
    learningConsequence: {
      actionTaken: string;
      channelAdjustment: string;
      memoryPersisted: boolean;
    };
  }> {
    const { taskId, workspaceId, status, outcomeMet, actualMetrics = {}, notes } = params;
    const now = new Date().toISOString();

    const taskRef = db.doc(`workspaces/${workspaceId}/growthTasks/${taskId}`);
    const snap = await taskRef.get();
    if (!snap.exists) {
      throw new Error(`GrowthTask '${taskId}' not found in workspace '${workspaceId}'`);
    }

    const currentTask = (snap.data() as unknown) as GrowthTaskPlan;
    const updatedTask: GrowthTaskPlan = {
      ...currentTask,
      status,
      outcomeMet,
      actualMetrics,
      outcomeNotes: notes,
      completedAt: now,
      updatedAt: now,
    };

    await taskRef.set(updatedTask as any);

    // Update standard task entity as well
    try {
      await taskRepository.update(workspaceId, taskId, {
        status: status === 'COMPLETED' ? 'completed' : 'pending',
        notes,
      });
    } catch {
      // Non-blocking fallback
    }

    let learningConsequence: {
      actionTaken: string;
      channelAdjustment: string;
      memoryPersisted: boolean;
    };

    // -------------------------------------------------------------------------
    // CLOSED-LOOP LEARNING LOGIC
    // -------------------------------------------------------------------------
    if (outcomeMet) {
      learningConsequence = {
        actionTaken: 'STRATEGY_REINFORCED',
        channelAdjustment: `Increased confidence weight for ${currentTask.department} action '${currentTask.title}'. Target exceeded.`,
        memoryPersisted: true,
      };

      // 1. Ingest into rich 10-category strategic memory
      await growthStrategicMemoryEngine.ingestLearningEvent({
        eventId: `outcome_${taskId}`,
        workspaceId,
        category: 'GROWTH_LEARNING',
        entityId: taskId,
        theme: currentTask.title,
        observation: `Validated: ${currentTask.expectedOutcome}. Real-world metrics: ${JSON.stringify(actualMetrics)}. Notes: ${notes}`,
        outcomeClassification: 'POSITIVE',
        executionSuccess: true,
        evidenceQuality: 'DIRECTLY_MEASURED',
        sampleSize: 20,
      });

      // 2. Register legacy strategic memory
      const initialMemory = {
        usedAngles: [],
        fatiguedThemes: [],
        explicitExclusions: [],
        lastUpdated: now.split('T')[0] || '2026-11-22',
      };
      recordStrategicAngle(initialMemory, currentTask.title, currentTask.department, 'GrowthDirector');

      // 3. Persist learned fact to Business Brain
      await db.collection(`workspaces/${workspaceId}/businessFacts`).add({
        factId: `fct_${Date.now()}_outcome`,
        workspaceId,
        category: 'VALIDATED_GROWTH_RESULT',
        attribute: `Task Result: ${currentTask.title}`,
        value: `Validated: ${currentTask.expectedOutcome}. Real-world metrics: ${JSON.stringify(actualMetrics)}`,
        provenance: 'USER_CONFIRMED',
        confidence: 1.0,
        createdAt: now,
      });
    } else {
      learningConsequence = {
        actionTaken: 'STRATEGY_REFINED_DUE_TO_UNDERPERFORMANCE',
        channelAdjustment: `Flagged '${currentTask.title}' as underperforming. Suppressed repetitive angle recommendations in next sprint.`,
        memoryPersisted: true,
      };

      // 1. Ingest into rich 10-category strategic memory
      await growthStrategicMemoryEngine.ingestLearningEvent({
        eventId: `outcome_${taskId}`,
        workspaceId,
        category: 'GROWTH_LEARNING',
        entityId: taskId,
        theme: currentTask.title,
        observation: `Underperformed: ${notes}. Real-world metrics: ${JSON.stringify(actualMetrics)}`,
        outcomeClassification: 'NEGATIVE',
        executionSuccess: status === 'COMPLETED',
        evidenceQuality: 'DIRECTLY_MEASURED',
        sampleSize: 20,
      });

      // 2. Register legacy strategic memory
      const initialMemory = {
        usedAngles: [],
        fatiguedThemes: [currentTask.title],
        explicitExclusions: [`Do not repeat unverified premise: ${currentTask.specificAction}`],
        lastUpdated: now.split('T')[0] || '2026-11-22',
      };
      recordStrategicAngle(initialMemory, currentTask.title, 'UnderperformingAngle', 'GrowthDirector');
    }

    // Emit event to department event bus
    try {
      await departmentEventBus.emit({
        workspaceId,
        userId: 'system',
        eventType: 'GROWTH_TASK_OUTCOME_RECORDED' as any,
        resourceId: taskId,
        metadata: {
          outcomeMet,
          department: currentTask.department,
          learningConsequence,
        },
      });
    } catch {
      // Non-blocking event bus
    }

    return {
      task: updatedTask,
      learningConsequence,
    };
  }

  /**
   * Retrieves all growth tasks for a workspace, optionally filtered by time horizon or status
   */
  public async getGrowthTasks(workspaceId: string, filter?: {
    timeHorizon?: TimeHorizon;
    status?: GrowthTaskStatus;
  }): Promise<GrowthTaskPlan[]> {
    const coll = db.collection<GrowthTaskPlan>(`workspaces/${workspaceId}/growthTasks`);
    const snap = await coll.get();
    let tasks = snap.docs.map((d) => d.data()).filter((d): d is GrowthTaskPlan => Boolean(d));

    if (filter?.timeHorizon) {
      tasks = tasks.filter((t) => t.timeHorizon === filter.timeHorizon);
    }
    if (filter?.status) {
      tasks = tasks.filter((t) => t.status === filter.status);
    }

    // Sort by ICE composite score descending
    return tasks.sort((a, b) => b.iceScore.compositeScore - a.iceScore.compositeScore);
  }

  /**
   * Comprehensive Executive Growth Intelligence Overview API
   */
  public async getGrowthIntelligenceOverview(workspaceId: string): Promise<GrowthDirectorIntelligenceOverview> {
    return growthIntelligenceOrchestrator.orchestrateGrowthIntelligence({ workspaceId });
  }

  /**
   * Runs Growth Scenario Simulations
   */
  public simulateGrowthScenarios(params: {
    workspaceId: string;
    baselineRevenue: number;
    monthlyBudget: number;
    currentCac: number;
    currentConversionRatePercent: number;
    averageOrderValue: number;
    grossMarginPercent: number;
  }): GrowthScenarioSimulationResult {
    return growthFinancialEngine.simulateScenarios(params);
  }

  /**
   * Evaluates Growth Experiment with kill-switch and sample size validation
   */
  public evaluateExperiment(params: {
    experiment: StructuredGrowthExperiment;
    actualPrimaryMetricValue: number;
    actualSampleSize: number;
    actualExpenditure: number;
    executionCompletedSuccessfully: boolean;
    measurementValid: boolean;
    notes: string;
  }) {
    return growthExperimentEngine.evaluateExperimentOutcome(params);
  }

  // =========================================================================
  // AI GROWTH AGENCY EXTENSIONS (Missions, Strategy, Departments, Execution, What-If)
  // =========================================================================

  public async createMission(params: Parameters<typeof growthMissionEngine.createMission>[0]): Promise<GrowthMissionEntity> {
    return growthMissionEngine.createMission(params);
  }

  public async listMissions(workspaceId: string): Promise<GrowthMissionEntity[]> {
    return growthMissionEngine.listMissions(workspaceId);
  }

  public async transitionMissionStatus(params: Parameters<typeof growthMissionEngine.transitionMissionStatus>[0]): Promise<GrowthMissionEntity> {
    return growthMissionEngine.transitionMissionStatus(params);
  }

  public async recordMissionOutcome(params: Parameters<typeof growthMissionEngine.recordMissionOutcome>[0]): Promise<GrowthMissionEntity> {
    return growthMissionEngine.recordMissionOutcome(params);
  }

  public async formulateStrategy(params: Parameters<typeof growthStrategyArchitect.formulateStrategy>[0]): Promise<GrowthStrategyEntity> {
    return growthStrategyArchitect.formulateStrategy(params);
  }

  public compareScenarios(context: Parameters<typeof growthStrategyArchitect.compareScenarios>[0]) {
    return growthStrategyArchitect.compareScenarios(context);
  }

  public async getActiveStrategy(workspaceId: string): Promise<GrowthStrategyEntity | null> {
    return growthStrategyArchitect.getActiveStrategy(workspaceId);
  }

  public generateMarketingCampaign(context: Parameters<typeof growthDepartmentEngines.generateMarketingCampaign>[0]) {
    return growthDepartmentEngines.generateMarketingCampaign(context);
  }

  public generateOutreachSequence(context: Parameters<typeof growthDepartmentEngines.generateOutreachSequence>[0]) {
    return growthDepartmentEngines.generateOutreachSequence(context);
  }

  public auditConversionFunnel(context: Parameters<typeof growthDepartmentEngines.auditConversionFunnel>[0]) {
    return growthDepartmentEngines.auditConversionFunnel(context);
  }

  public generateRetentionInitiatives(context: Parameters<typeof growthDepartmentEngines.generateRetentionInitiatives>[0]) {
    return growthDepartmentEngines.generateRetentionInitiatives(context);
  }

  public generatePartnershipProposals(context: Parameters<typeof growthDepartmentEngines.generatePartnershipProposals>[0]) {
    return growthDepartmentEngines.generatePartnershipProposals(context);
  }

  public computeGrowthFinancialModel(context: Parameters<typeof growthDepartmentEngines.computeGrowthFinancialModel>[0]) {
    return growthDepartmentEngines.computeGrowthFinancialModel(context);
  }

  public async enqueueExecutionJob(params: Parameters<typeof growthExecutionQueueService.enqueueJob>[0]): Promise<GrowthExecutionJob> {
    return growthExecutionQueueService.enqueueJob(params);
  }

  public async approveExecutionJob(params: Parameters<typeof growthExecutionQueueService.approveJob>[0]): Promise<GrowthExecutionJob> {
    return growthExecutionQueueService.approveJob(params);
  }

  public async rejectExecutionJob(params: Parameters<typeof growthExecutionQueueService.rejectJob>[0]): Promise<GrowthExecutionJob> {
    return growthExecutionQueueService.rejectJob(params);
  }

  public async processExecutionJob(workspaceId: string, jobId: string): Promise<GrowthExecutionJob> {
    return growthExecutionQueueService.processJob(workspaceId, jobId);
  }

  public async listExecutionJobs(workspaceId: string): Promise<GrowthExecutionJob[]> {
    return growthExecutionQueueService.listJobs(workspaceId);
  }

  public async simulateScenario(params: Parameters<typeof growthSimulatorEngine.simulateScenario>[0]): Promise<WhatIfScenarioModel> {
    return growthSimulatorEngine.simulateScenario(params);
  }

  public async convertScenarioToMission(params: Parameters<typeof growthSimulatorEngine.convertScenarioToMission>[0]) {
    return growthSimulatorEngine.convertScenarioToMission(params);
  }

  public async listScenarios(workspaceId: string): Promise<WhatIfScenarioModel[]> {
    return growthSimulatorEngine.listScenarios(workspaceId);
  }

  public resolveModelType(industryOrDesc: string): BusinessModelType {
    return growthModelAdapterEngine.resolveModelType(industryOrDesc);
  }

  public getModelPlaybook(modelType: BusinessModelType) {
    return growthModelAdapterEngine.getPlaybook(modelType);
  }

  public evaluateGrowthMetrics(params: Parameters<typeof growthAnalyticsEngine.evaluateGrowthMetrics>[0]) {
    return growthAnalyticsEngine.evaluateGrowthMetrics(params);
  }
}

export const growthDirectorService = new GrowthDirectorService();
