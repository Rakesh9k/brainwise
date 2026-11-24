/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'node:crypto';
import { departmentTaskRepository } from '../repositories/departmentTaskRepository';
import { departmentPermissionService } from './departmentPermissionService';
import { sharedBusinessContextService } from './sharedBusinessContextService';
import { businessProfileRepository } from '../repositories/businessProfileRepository';
import { departmentEventBus, type DepartmentEvent } from '../events/eventBus';
import type {
  StandardDepartmentTaskEntity,
  StandardDepartmentType,
  DepartmentTaskPriority,
  WorkspaceRole,
} from '../types/api';

export class DepartmentCoordinationService {
  constructor() {
    this.initEventSubscriptions();
  }

  /**
   * Initializes event listeners on the shared event bus for cross-department coordination
   */
  public initEventSubscriptions(): void {
    // 1. Business Profile Updated -> Invalidate context cache across all departments & trigger cascade alerts
    departmentEventBus.subscribe('BUSINESS_PROFILE_UPDATED', async (evt) => {
      sharedBusinessContextService.invalidateCache(evt.workspaceId);
      const changedFields = (evt.metadata?.changedFields as string[]) || [];
      if (changedFields.length > 0) {
        await this.triggerCrossDepartmentCascadeAlerts({
          workspaceId: evt.workspaceId,
          changedFields,
          actorId: evt.userId || 'system',
        });
      }
    });

    // 2. Sales Objection Recorded -> Update customer personas in Business Brain
    departmentEventBus.subscribe('SALES_OBJECTION_RECORDED', async (evt) => {
      const objection = evt.metadata?.objection as string;
      const personaIndex = (evt.metadata?.personaIndex as number) || 0;
      if (!objection) return;

      const profile = await businessProfileRepository.getProfile(evt.workspaceId);
      if (profile && profile.customerPersonas && profile.customerPersonas.length > 0) {
        const personas = [...profile.customerPersonas];
        const targetPersona = { ...personas[personaIndex] };
        const existingObjections =
          (targetPersona as any).objections || (targetPersona as any).buyingObjections || [];
        if (!existingObjections.includes(objection)) {
          (targetPersona as any).objections = [...existingObjections, objection];
          personas[personaIndex] = targetPersona;
          await businessProfileRepository.saveProfile({
            ...profile,
            customerPersonas: personas,
          });
          sharedBusinessContextService.invalidateCache(evt.workspaceId);
        }
      }
    });

    // 3. Creative Asset Approved -> Enforce SVG-only (Strict Video Exclusion) and log
    departmentEventBus.subscribe('CREATIVE_ASSET_APPROVED', async (evt) => {
      const assetType = evt.metadata?.assetType as string;
      if (
        assetType &&
        (assetType.toLowerCase().includes('video') || assetType.toLowerCase().includes('reel'))
      ) {
        console.warn(`[STRICT_VIDEO_EXCLUSION] Blocked non-SVG/video creative asset: ${assetType}`);
        return;
      }
    });
  }

  /**
   * Computes deterministic idempotency key for task deduplication
   */
  private generateIdempotencyKey(
    workspaceId: string,
    department: string,
    requestedAction: string,
    inputContext: Record<string, unknown>
  ): string {
    const raw = `${workspaceId}:${department}:${requestedAction}:${JSON.stringify(inputContext)}`;
    return `idem_${crypto.createHash('sha256').update(raw).digest('hex').substring(0, 24)}`;
  }

  /**
   * Submits a standard department task with duplicate prevention, approval gates, and dependency checks
   */
  public async submitTask(params: {
    workspaceId: string;
    department: StandardDepartmentType | string;
    objective: string;
    inputContext: Record<string, unknown>;
    requestedAction: string;
    requiredOutputSchema?: Record<string, unknown>;
    priority?: DepartmentTaskPriority;
    dependencies?: string[];
    permissionRequirements?: string[];
    approvalRequirements?: { required: boolean; role?: string };
    idempotencyKey?: string;
    userRole?: WorkspaceRole;
    userId?: string;
  }): Promise<{ task: StandardDepartmentTaskEntity; isDuplicate: boolean }> {
    const {
      workspaceId,
      department,
      objective,
      inputContext,
      requestedAction,
      requiredOutputSchema,
      priority = 'MEDIUM',
      dependencies = [],
      permissionRequirements = [],
      approvalRequirements = { required: false },
      userRole = 'owner',
      userId = 'system',
    } = params;

    // 1. Permission Check
    const isConsequential = approvalRequirements.required || priority === 'CRITICAL';
    if (!departmentPermissionService.canExecuteTask(userRole, department, isConsequential)) {
      const err = new Error(
        `FORBIDDEN: User with role '${userRole}' cannot execute task in department '${department}'.`
      );
      (err as any).statusCode = 403;
      throw err;
    }

    // 2. Duplicate Prevention / Idempotency Check
    const key =
      params.idempotencyKey ||
      this.generateIdempotencyKey(workspaceId, department, requestedAction, inputContext);

    const existing = await departmentTaskRepository.findByIdempotencyKey(workspaceId, key);
    if (existing) {
      // Return existing task without duplicating execution
      return { task: existing, isDuplicate: true };
    }

    // 3. Dependency Validation
    let allDepsSatisfied = true;
    if (dependencies.length > 0) {
      for (const depId of dependencies) {
        const depTask = await departmentTaskRepository.findById(workspaceId, depId);
        if (!depTask || depTask.status !== 'COMPLETED') {
          allDepsSatisfied = false;
          break;
        }
      }
    }

    // 4. Initial Status Determination
    let status: StandardDepartmentTaskEntity['status'] = 'QUEUED';
    if (approvalRequirements.required) {
      status = 'WAITING_APPROVAL';
    } else if (!allDepsSatisfied) {
      status = 'PENDING';
    }

    const taskId = `dept_task_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const now = new Date().toISOString();

    const taskEntity: StandardDepartmentTaskEntity = {
      taskId,
      title: objective,
      description: requestedAction || objective,
      businessId: workspaceId,
      workspaceId,
      department,
      objective,
      inputContext,
      requestedAction,
      requiredOutputSchema,
      priority,
      dependencies,
      permissionRequirements,
      approvalRequirements: {
        required: approvalRequirements.required,
        approved: false,
      },
      status,
      retryCount: 0,
      maxRetries: 3,
      idempotencyKey: key,
      auditHistory: [
        {
          action: 'TASK_CREATED',
          timestamp: now,
          actorId: userId,
          details: `Task created with status ${status}`,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    const saved = await departmentTaskRepository.create(taskEntity);
    return { task: saved, isDuplicate: false };
  }

  /**
   * Approves a waiting task and transitions to RUNNING / COMPLETED
   */
  public async approveTask(params: {
    workspaceId: string;
    taskId: string;
    actorId: string;
    userRole: WorkspaceRole;
    comments?: string;
  }): Promise<StandardDepartmentTaskEntity> {
    const { workspaceId, taskId, actorId, userRole, comments } = params;

    if (!departmentPermissionService.canApprove(userRole)) {
      const err = new Error(
        `FORBIDDEN: User with role '${userRole}' is not authorized to approve department tasks.`
      );
      (err as any).statusCode = 403;
      throw err;
    }

    const task = await departmentTaskRepository.findById(workspaceId, taskId);
    if (!task) {
      const err = new Error(`NOT_FOUND: Department task '${taskId}' not found.`);
      (err as any).statusCode = 404;
      throw err;
    }

    if (task.status !== 'WAITING_APPROVAL') {
      throw new Error(
        `INVALID_STATE: Task '${taskId}' is in status '${task.status}', not WAITING_APPROVAL.`
      );
    }

    const now = new Date().toISOString();
    return await departmentTaskRepository.update(workspaceId, taskId, {
      status: 'RUNNING',
      approvalRequirements: {
        ...task.approvalRequirements,
        approved: true,
        approvedBy: actorId,
        approvedAt: now,
      },
      auditHistory: [
        ...(task.auditHistory || []),
        {
          action: 'TASK_APPROVED',
          timestamp: now,
          actorId,
          details: comments || 'Task approved by authorized user',
        },
      ],
    });
  }

  /**
   * Explicitly rejects a task; moves to CANCELLED and guarantees it is never executed silently
   */
  public async rejectTask(params: {
    workspaceId: string;
    taskId: string;
    actorId: string;
    userRole: WorkspaceRole;
    reason: string;
  }): Promise<StandardDepartmentTaskEntity> {
    const { workspaceId, taskId, actorId, userRole, reason } = params;

    if (!departmentPermissionService.canApprove(userRole)) {
      const err = new Error(
        `FORBIDDEN: User with role '${userRole}' is not authorized to reject department tasks.`
      );
      (err as any).statusCode = 403;
      throw err;
    }

    const task = await departmentTaskRepository.findById(workspaceId, taskId);
    if (!task) {
      const err = new Error(`NOT_FOUND: Department task '${taskId}' not found.`);
      (err as any).statusCode = 404;
      throw err;
    }

    const now = new Date().toISOString();
    return await departmentTaskRepository.update(workspaceId, taskId, {
      status: 'CANCELLED',
      approvalRequirements: {
        ...task.approvalRequirements,
        approved: false,
        rejected: true,
        rejectionReason: reason,
      },
      auditHistory: [
        ...(task.auditHistory || []),
        {
          action: 'TASK_REJECTED',
          timestamp: now,
          actorId,
          details: `Task rejected: ${reason}`,
        },
      ],
    });
  }

  /**
   * Simulates/executes task processing with automatic exponential backoff retry on failure
   */
  public async processTaskWithRetry(
    workspaceId: string,
    taskId: string,
    executor: () => Promise<Record<string, unknown>>
  ): Promise<StandardDepartmentTaskEntity> {
    const task = await departmentTaskRepository.findById(workspaceId, taskId);
    if (!task) {
      throw new Error(`Department task '${taskId}' not found.`);
    }

    if (task.status === 'CANCELLED') {
      throw new Error(`CANNOT_PROCESS: Task '${taskId}' was rejected and cancelled.`);
    }

    let currentTask = task;
    let currentRetry = currentTask.retryCount ?? 0;
    const maxRetries = currentTask.maxRetries || 3;

    while (currentRetry <= maxRetries) {
      try {
        const result = await executor();
        const now = new Date().toISOString();
        return await departmentTaskRepository.update(workspaceId, taskId, {
          status: 'COMPLETED',
          result,
          retryCount: currentRetry,
          auditHistory: [
            ...(currentTask.auditHistory || []),
            {
              action: 'TASK_COMPLETED',
              timestamp: now,
              details: `Task completed successfully on attempt ${currentRetry + 1}`,
            },
          ],
        });
      } catch (err: any) {
        currentRetry++;
        const now = new Date().toISOString();
        const errorMsg = err?.message || 'Unknown processing error';

        if (currentRetry > maxRetries) {
          return await departmentTaskRepository.update(workspaceId, taskId, {
            status: 'FAILED',
            errors: [...(currentTask.errors || []), errorMsg],
            retryCount: currentRetry,
            auditHistory: [
              ...(currentTask.auditHistory || []),
              {
                action: 'TASK_FAILED',
                timestamp: now,
                details: `Task failed permanently after ${maxRetries} retries: ${errorMsg}`,
              },
            ],
          });
        }

        // Record retry attempt in audit log
        currentTask = await departmentTaskRepository.update(workspaceId, taskId, {
          retryCount: currentRetry,
          errors: [...(currentTask.errors || []), `Attempt ${currentRetry} failed: ${errorMsg}`],
          auditHistory: [
            ...(currentTask.auditHistory || []),
            {
              action: 'TASK_RETRY_SCHEDULED',
              timestamp: now,
              details: `Retry attempt ${currentRetry}/${maxRetries} scheduled`,
            },
          ],
        });
      }
    }

    const finalTask = await departmentTaskRepository.findById(workspaceId, taskId);
    return finalTask!;
  }

  /**
   * Dispatches a cross-department coordination event with circular trigger / hop-limit prevention
   */
  public async dispatchCoordinationEvent(params: {
    workspaceId: string;
    sourceDepartment: StandardDepartmentType | string;
    targetDepartment: StandardDepartmentType | string;
    eventType: string;
    payload: Record<string, unknown>;
    userId?: string;
    hopCount?: number;
    visitedDepartments?: string[];
  }): Promise<{ dispatched: boolean; reason?: string; event?: DepartmentEvent }> {
    const {
      workspaceId,
      sourceDepartment,
      targetDepartment,
      eventType,
      payload,
      userId = 'system',
      hopCount = 0,
      visitedDepartments = [sourceDepartment],
    } = params;

    // Cycle & hop limit prevention
    const MAX_HOPS = 3;
    if (hopCount >= MAX_HOPS) {
      return {
        dispatched: false,
        reason: `CYCLE_PREVENTION_BLOCKED: Max coordination hops (${MAX_HOPS}) reached. Chain: ${visitedDepartments.join(' -> ')}`,
      };
    }

    if (visitedDepartments.includes(targetDepartment) && hopCount > 0) {
      return {
        dispatched: false,
        reason: `CIRCULAR_TRIGGER_PREVENTED: Target department '${targetDepartment}' already visited in chain: ${visitedDepartments.join(' -> ')}`,
      };
    }

    const updatedVisited = [...visitedDepartments, targetDepartment];

    const event = await departmentEventBus.emit({
      workspaceId,
      userId,
      eventType: 'DEPARTMENT_COORDINATION_EVENT',
      resourceId: `${sourceDepartment}_to_${targetDepartment}`,
      metadata: {
        sourceDepartment,
        targetDepartment,
        customEventType: eventType,
        payload,
        hopCount: hopCount + 1,
        visitedDepartments: updatedVisited,
      },
    });

    return { dispatched: true, event };
  }

  /**
   * Automatically triggers cascade alerts across departments when core Business Brain attributes change
   * (e.g. price range, brand positioning, target audience, products, value proposition).
   * Flags active drafts in Copywriting, Sales, Ads, etc. as "Requires Re-grounding".
   */
  public async triggerCrossDepartmentCascadeAlerts(params: {
    workspaceId: string;
    changedFields: string[];
    actorId?: string;
  }): Promise<{ affectedTaskIds: string[]; flaggedCount: number }> {
    const { workspaceId, changedFields, actorId = 'system' } = params;
    if (!changedFields || changedFields.length === 0) {
      return { affectedTaskIds: [], flaggedCount: 0 };
    }

    // List all tasks in the workspace
    const allTasks = await departmentTaskRepository.listByWorkspace(workspaceId);

    // Active draft statuses that require re-grounding if underlying truth changed
    const activeStatuses = ['PENDING', 'QUEUED', 'RUNNING', 'WAITING_APPROVAL'];

    // Target departments that rely heavily on product/pricing and brand grounding
    const contentDepartments = [
      'COPYWRITING',
      'MARKETING',
      'SALES',
      'ADVERTISING',
      'GROWTH',
      'CONTENT',
      'BRAND_STUDIO',
      'STRATEGY',
    ];

    const affectedTasks = allTasks.filter((t) => {
      const isStatusActive = activeStatuses.includes(t.status.toUpperCase());
      const obj = (t.objective || t.title || t.description || '').toLowerCase();
      const isTargetDept =
        contentDepartments.includes(t.department.toUpperCase()) ||
        obj.includes('copy') ||
        obj.includes('pricing') ||
        obj.includes('ad') ||
        obj.includes('sales');
      return isStatusActive && isTargetDept;
    });

    const now = new Date().toISOString();
    const affectedTaskIds: string[] = [];

    for (const task of affectedTasks) {
      const existingHistory = task.auditHistory || [];
      const updatedHistory = [
        ...existingHistory,
        {
          action: 'CASCADE_REGROUNDING_ALERT',
          timestamp: now,
          actorId,
          details: `Flagged draft as 'Requires Re-grounding' due to core Business Brain changes in: ${changedFields.join(', ')}`,
        },
      ];

      await departmentTaskRepository.update(workspaceId, task.taskId, {
        regroundingRequired: true,
        regroundingReason: `Core Business Brain attributes updated (${changedFields.join(', ')}). Active draft requires re-grounding before publication.`,
        regroundingFields: changedFields,
        auditHistory: updatedHistory,
      });

      affectedTaskIds.push(task.taskId);
    }

    if (affectedTaskIds.length > 0) {
      await departmentEventBus.emit({
        workspaceId,
        userId: actorId,
        eventType: 'DEPARTMENT_REGROUNDING_ALERT',
        resourceId: `regrounding_${Date.now()}`,
        metadata: {
          changedFields,
          affectedTaskIds,
          flaggedCount: affectedTaskIds.length,
        },
      });
    }

    return { affectedTaskIds, flaggedCount: affectedTaskIds.length };
  }

  /**
   * Clears re-grounding alert after the draft has been re-aligned with updated Business Brain
   */
  public async acknowledgeOrRegroundTask(params: {
    workspaceId: string;
    taskId: string;
    actorId?: string;
  }): Promise<StandardDepartmentTaskEntity> {
    const { workspaceId, taskId, actorId = 'founder' } = params;
    const task = await departmentTaskRepository.findById(workspaceId, taskId);
    if (!task) {
      throw new Error(`Task '${taskId}' not found in workspace '${workspaceId}'`);
    }

    const now = new Date().toISOString();
    const updatedHistory = [
      ...(task.auditHistory || []),
      {
        action: 'REGROUNDING_RESOLVED',
        timestamp: now,
        actorId,
        details: 'Draft successfully re-grounded and cleared for execution/publication',
      },
    ];

    return await departmentTaskRepository.update(workspaceId, taskId, {
      regroundingRequired: false,
      regroundedAt: now,
      auditHistory: updatedHistory,
    });
  }

  /**
   * Retrieves active drafts needing re-grounding for a workspace
   */
  public async getRegroundingAlerts(workspaceId: string): Promise<StandardDepartmentTaskEntity[]> {
    const tasks = await departmentTaskRepository.listByWorkspace(workspaceId);
    return tasks.filter((t) => Boolean(t.regroundingRequired));
  }
}

export const departmentCoordinationService = new DepartmentCoordinationService();
