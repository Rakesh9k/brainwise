/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'node:crypto';
import { db } from '../../db/firestore';
import { departmentEventBus } from '../../events/eventBus';
import { growthStrategicMemoryEngine } from './growthStrategicMemoryEngine';
import type {
  GrowthMissionEntity,
  MissionLifecycleStatus,
  GrowthDepartmentType,
} from './growthTypes';

export class GrowthMissionEngine {
  /**
   * Allowed state transitions map
   */
  private readonly ALLOWED_TRANSITIONS: Record<MissionLifecycleStatus, MissionLifecycleStatus[]> = {
    DRAFT: ['PROPOSED', 'CANCELLED'],
    PROPOSED: ['APPROVED', 'FAILED', 'CANCELLED'],
    APPROVED: ['PLANNED', 'CANCELLED'],
    PLANNED: ['READY', 'CANCELLED'],
    READY: ['IN_PROGRESS', 'BLOCKED', 'CANCELLED'],
    IN_PROGRESS: ['BLOCKED', 'REVIEW', 'PAUSED', 'FAILED', 'CANCELLED'],
    BLOCKED: ['IN_PROGRESS', 'CANCELLED'],
    PAUSED: ['IN_PROGRESS', 'CANCELLED'],
    REVIEW: ['COMPLETED', 'IN_PROGRESS', 'FAILED'],
    COMPLETED: ['VERIFIED', 'ARCHIVED'],
    VERIFIED: ['ARCHIVED'],
    FAILED: ['ARCHIVED', 'PLANNED'],
    CANCELLED: ['ARCHIVED'],
    ARCHIVED: [],
  };

  /**
   * Creates a new structured Growth Mission
   */
  public async createMission(params: {
    workspaceId: string;
    title: string;
    strategicRationale: string;
    department: GrowthDepartmentType;
    targetAudience: string;
    timeHorizon: '7_DAYS' | '30_DAYS' | '90_DAYS';
    priority?: 'HIGH' | 'MEDIUM' | 'LOW';
    budgetCap?: number;
    ownerId?: string;
    approvalRequired?: boolean;
    strategyId?: string;
    objectiveId?: string;
    successCriteria?: Array<{
      metricName: string;
      baselineValue: number;
      targetValue: number;
      unit: string;
    }>;
  }): Promise<GrowthMissionEntity> {
    const {
      workspaceId,
      title,
      strategicRationale,
      department,
      targetAudience,
      timeHorizon,
      priority = 'HIGH',
      budgetCap = 0,
      ownerId = 'system_growth_director',
      approvalRequired = true,
      strategyId,
      objectiveId,
      successCriteria = [],
    } = params;

    if (!title || !title.trim()) {
      throw new Error('Mission title is required.');
    }
    if (!strategicRationale || !strategicRationale.trim()) {
      throw new Error('Strategic rationale is required to ground mission in Business Brain.');
    }

    const now = new Date().toISOString();
    const missionId = `msn_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

    const mission: GrowthMissionEntity = {
      missionId,
      workspaceId,
      strategyId,
      objectiveId,
      title: title.trim(),
      strategicRationale: strategicRationale.trim(),
      department,
      targetAudience,
      timeHorizon,
      priority,
      budgetCap,
      currentExpenditure: 0,
      startDate: now.slice(0, 10),
      endDate: new Date(Date.now() + (timeHorizon === '7_DAYS' ? 7 : timeHorizon === '30_DAYS' ? 30 : 90) * 86400000).toISOString().slice(0, 10),
      ownerId,
      approvalRequired,
      isApproved: !approvalRequired,
      status: approvalRequired ? 'PROPOSED' : 'APPROVED',
      successCriteria: successCriteria.length > 0 ? successCriteria : [
        {
          metricName: 'Key Result Lift',
          baselineValue: 0,
          targetValue: 1,
          unit: 'verified_deliverable',
        },
      ],
      taskIds: [],
      experimentIds: [],
      deliverableIds: [],
      createdAt: now,
      updatedAt: now,
    };

    await db.doc(`workspaces/${workspaceId}/growthMissions/${missionId}`).set(mission as any);

    await departmentEventBus.emit({
      workspaceId,
      userId: ownerId,
      eventType: 'WORKFLOW_STARTED' as any,
      resourceId: missionId,
      metadata: { title: mission.title, department: mission.department },
    });

    return mission;
  }

  /**
   * Transitions mission lifecycle status with validation
   */
  public async transitionMissionStatus(params: {
    workspaceId: string;
    missionId: string;
    targetStatus: MissionLifecycleStatus;
    actorId: string;
    notes?: string;
  }): Promise<GrowthMissionEntity> {
    const { workspaceId, missionId, targetStatus, actorId, notes } = params;
    const ref = db.doc(`workspaces/${workspaceId}/growthMissions/${missionId}`);
    const snap = await ref.get();
    if (!snap.exists) {
      throw new Error(`GrowthMission '${missionId}' not found in workspace '${workspaceId}'`);
    }

    const mission = (snap.data() as unknown) as GrowthMissionEntity;
    const allowed = this.ALLOWED_TRANSITIONS[mission.status] || [];

    if (!allowed.includes(targetStatus)) {
      throw new Error(
        `Invalid mission status transition from '${mission.status}' to '${targetStatus}'. Allowed: ${allowed.join(', ') || 'None'}`
      );
    }

    const now = new Date().toISOString();
    const updated: GrowthMissionEntity = {
      ...mission,
      status: targetStatus,
      updatedAt: now,
    };

    if (targetStatus === 'APPROVED') {
      updated.isApproved = true;
      updated.approvedBy = actorId;
      updated.approvedAt = now;
    }

    await ref.set(updated as any);

    await departmentEventBus.emit({
      workspaceId,
      userId: actorId,
      eventType: 'TASK_COMPLETED' as any,
      resourceId: missionId,
      metadata: { from: mission.status, to: targetStatus, notes },
    });

    return updated;
  }

  /**
   * Links an execution task to a mission
   */
  public async linkTaskToMission(workspaceId: string, missionId: string, taskId: string): Promise<void> {
    const ref = db.doc(`workspaces/${workspaceId}/growthMissions/${missionId}`);
    const snap = await ref.get();
    if (!snap.exists) return;
    const mission = (snap.data() as unknown) as GrowthMissionEntity;
    if (!mission.taskIds.includes(taskId)) {
      const taskIds = [...mission.taskIds, taskId];
      await ref.update({ taskIds, updatedAt: new Date().toISOString() });
    }
  }

  /**
   * Links an experiment to a mission
   */
  public async linkExperimentToMission(workspaceId: string, missionId: string, experimentId: string): Promise<void> {
    const ref = db.doc(`workspaces/${workspaceId}/growthMissions/${missionId}`);
    const snap = await ref.get();
    if (!snap.exists) return;
    const mission = (snap.data() as unknown) as GrowthMissionEntity;
    if (!mission.experimentIds.includes(experimentId)) {
      const experimentIds = [...mission.experimentIds, experimentId];
      await ref.update({ experimentIds, updatedAt: new Date().toISOString() });
    }
  }

  /**
   * Records verified mission outcome, triggering closed-loop learning
   */
  public async recordMissionOutcome(params: {
    workspaceId: string;
    missionId: string;
    actorId: string;
    metricsAchieved: Record<string, number>;
    summaryNotes: string;
    strategicLearnings?: string[];
  }): Promise<GrowthMissionEntity> {
    const { workspaceId, missionId, actorId, metricsAchieved, summaryNotes, strategicLearnings = [] } = params;
    const ref = db.doc(`workspaces/${workspaceId}/growthMissions/${missionId}`);
    const snap = await ref.get();
    if (!snap.exists) {
      throw new Error(`GrowthMission '${missionId}' not found in workspace '${workspaceId}'`);
    }

    const mission = (snap.data() as unknown) as GrowthMissionEntity;
    const now = new Date().toISOString();

    const updated: GrowthMissionEntity = {
      ...mission,
      status: 'VERIFIED',
      actualOutcomes: {
        verifiedAt: now,
        metricsAchieved,
        summaryNotes,
        strategicLearnings,
      },
      updatedAt: now,
    };

    await ref.set(updated as any);

    // Feed back into strategic memory
    await growthStrategicMemoryEngine.ingestLearningEvent({
      eventId: `lrn_${Date.now()}_${missionId}`,
      workspaceId,
      category: 'GROWTH_LEARNING',
      entityId: missionId,
      theme: mission.title,
      observation: summaryNotes,
      outcomeClassification: 'POSITIVE',
      executionSuccess: true,
      evidenceQuality: 'DIRECTLY_MEASURED',
      sampleSize: Object.values(metricsAchieved)[0] || 1,
      applicabilityConditions: [`Department: ${mission.department}`, `Horizon: ${mission.timeHorizon}`],
    });

    await departmentEventBus.emit({
      workspaceId,
      userId: actorId,
      eventType: 'TASK_COMPLETED' as any,
      resourceId: missionId,
      metadata: { metricsAchieved, summaryNotes },
    });

    return updated;
  }

  /**
   * Gets a single mission by ID
   */
  public async getMissionById(workspaceId: string, missionId: string): Promise<GrowthMissionEntity | null> {
    const snap = await db.doc(`workspaces/${workspaceId}/growthMissions/${missionId}`).get();
    if (!snap.exists) return null;
    return (snap.data() as unknown) as GrowthMissionEntity;
  }

  /**
   * Lists all missions for a workspace
   */
  public async listMissions(workspaceId: string): Promise<GrowthMissionEntity[]> {
    const snap = await db.collection(`workspaces/${workspaceId}/growthMissions`).get();
    return snap.docs.map((d) => (d.data() as unknown) as GrowthMissionEntity);
  }
}

export const growthMissionEngine = new GrowthMissionEngine();
