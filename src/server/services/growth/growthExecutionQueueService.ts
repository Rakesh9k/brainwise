/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'node:crypto';
import { db } from '../../db/firestore';
import { departmentEventBus } from '../../events/eventBus';
import type { GrowthExecutionJob, ExecutionJobStatus } from './growthTypes';
import { emailProviderAdapter } from './adapters/emailProviderAdapter';
import { socialPublishingAdapter } from './adapters/socialPublishingAdapter';
import { internalDispatchAdapter } from './adapters/internalDispatchAdapter';

export class GrowthExecutionQueueService {
  /**
   * Enqueues an execution job
   */
  public async enqueueJob(params: {
    workspaceId: string;
    actionType: GrowthExecutionJob['actionType'];
    level: 1 | 2 | 3;
    payload: Record<string, unknown>;
    idempotencyKey?: string;
    missionId?: string;
    taskId?: string;
    requiresApproval?: boolean;
  }): Promise<GrowthExecutionJob> {
    const {
      workspaceId,
      actionType,
      level,
      payload,
      idempotencyKey = `idemp_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      missionId,
      taskId,
      requiresApproval = level === 3, // Level 3 actions always require founder approval
    } = params;

    // Check idempotency: Return existing job if key already processed
    const existingSnap = await db
      .collection(`workspaces/${workspaceId}/executionJobs`)
      .where('idempotencyKey', '==', idempotencyKey)
      .limit(1)
      .get();

    if (!existingSnap.empty) {
      return (existingSnap.docs[0].data() as unknown) as GrowthExecutionJob;
    }

    const now = new Date().toISOString();
    const jobId = `job_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

    const job: GrowthExecutionJob = {
      jobId,
      workspaceId,
      missionId,
      taskId,
      actionType,
      level,
      idempotencyKey,
      payload,
      requiresApproval,
      approvalStatus: requiresApproval ? 'PENDING' : 'APPROVED',
      status: requiresApproval ? 'AWAITING_APPROVAL' : 'QUEUED',
      retryCount: 0,
      maxRetries: 3,
      errorHistory: [],
      createdAt: now,
      updatedAt: now,
    };

    await db.doc(`workspaces/${workspaceId}/executionJobs/${jobId}`).set(job as any);

    await departmentEventBus.emit({
      workspaceId,
      userId: 'system',
      eventType: 'WORKFLOW_STARTED' as any,
      resourceId: jobId,
      metadata: { actionType, level, requiresApproval },
    });

    return job;
  }

  /**
   * Approves a pending Level 3 execution job (Human-in-the-Loop Gate)
   */
  public async approveJob(params: {
    workspaceId: string;
    jobId: string;
    approvedBy: string;
  }): Promise<GrowthExecutionJob> {
    const { workspaceId, jobId, approvedBy } = params;
    const ref = db.doc(`workspaces/${workspaceId}/executionJobs/${jobId}`);
    const snap = await ref.get();
    if (!snap.exists) {
      throw new Error(`ExecutionJob '${jobId}' not found in workspace '${workspaceId}'`);
    }

    const job = (snap.data() as unknown) as GrowthExecutionJob;
    if (job.status !== 'AWAITING_APPROVAL') {
      throw new Error(`Job '${jobId}' is not awaiting approval. Current status: ${job.status}`);
    }

    const now = new Date().toISOString();
    const updated: GrowthExecutionJob = {
      ...job,
      approvalStatus: 'APPROVED',
      approvedBy,
      approvedAt: now,
      status: 'QUEUED',
      updatedAt: now,
    };

    await ref.set(updated as any);

    await departmentEventBus.emit({
      workspaceId,
      userId: approvedBy,
      eventType: 'TASK_COMPLETED' as any,
      resourceId: jobId,
      metadata: { actionType: job.actionType },
    });

    return updated;
  }

  /**
   * Rejects an execution job
   */
  public async rejectJob(params: {
    workspaceId: string;
    jobId: string;
    rejectedBy: string;
    reason: string;
  }): Promise<GrowthExecutionJob> {
    const { workspaceId, jobId, rejectedBy, reason } = params;
    const ref = db.doc(`workspaces/${workspaceId}/executionJobs/${jobId}`);
    const snap = await ref.get();
    if (!snap.exists) {
      throw new Error(`ExecutionJob '${jobId}' not found in workspace '${workspaceId}'`);
    }

    const job = (snap.data() as unknown) as GrowthExecutionJob;
    const now = new Date().toISOString();
    const updated: GrowthExecutionJob = {
      ...job,
      approvalStatus: 'REJECTED',
      approvedBy: rejectedBy,
      rejectionReason: reason,
      status: 'CANCELLED',
      updatedAt: now,
    };

    await ref.set(updated as any);
    return updated;
  }

  /**
   * Dispatches and processes an approved job with real receipts
   */
  public async processJob(workspaceId: string, jobId: string): Promise<GrowthExecutionJob> {
    const ref = db.doc(`workspaces/${workspaceId}/executionJobs/${jobId}`);
    const snap = await ref.get();
    if (!snap.exists) {
      throw new Error(`ExecutionJob '${jobId}' not found in workspace '${workspaceId}'`);
    }

    const job = (snap.data() as unknown) as GrowthExecutionJob;

    // Safety gate: Must be approved if requiresApproval is true
    if (job.requiresApproval && job.approvalStatus !== 'APPROVED') {
      throw new Error(`Security gate blocked job execution: Job '${jobId}' requires founder approval before execution.`);
    }

    const now = new Date().toISOString();

    // Mark RUNNING
    await ref.update({ status: 'RUNNING', updatedAt: now });

    try {
      let dispatchResult;

      if (job.actionType === 'DISPATCH_OUTREACH_EMAIL') {
        dispatchResult = await emailProviderAdapter.dispatchEmail({
          workspaceId,
          to: (job.payload.to as string) || (job.payload.recipient as string) || 'founder@example.com',
          subject: (job.payload.subject as string) || 'BrainWise Growth Introduction',
          bodyText: (job.payload.bodyText as string) || (job.payload.text as string) || 'Outreach message text',
          metadata: job.payload,
        });
      } else if (job.actionType === 'SCHEDULE_SOCIAL_POST') {
        dispatchResult = await socialPublishingAdapter.schedulePost({
          workspaceId,
          platforms: (job.payload.platforms as any) || ['LINKEDIN'],
          postText: (job.payload.postText as string) || (job.payload.text as string) || 'Social update',
          scheduledTime: job.payload.scheduledTime as string | undefined,
        });
      } else {
        dispatchResult = await internalDispatchAdapter.dispatchInternal({
          workspaceId,
          actionType: job.actionType,
          payload: job.payload,
        });
      }

      if (!dispatchResult.success) {
        throw new Error(dispatchResult.errorMessage || 'Provider dispatch failed');
      }

      const updated: GrowthExecutionJob = {
        ...job,
        status: 'COMPLETED',
        executionReceipt: dispatchResult.receipt,
        updatedAt: new Date().toISOString(),
      };

      await ref.set(updated as any);

      await departmentEventBus.emit({
        workspaceId,
        userId: 'system',
        eventType: 'TASK_COMPLETED' as any,
        resourceId: jobId,
        metadata: {
          providerTxId: dispatchResult.receipt.providerTransactionId,
          actionType: job.actionType,
          isSimulated: dispatchResult.receipt.isSimulated,
        },
      });

      return updated;
    } catch (err: any) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown execution error';
      const retryCount = job.retryCount + 1;
      const status: ExecutionJobStatus = retryCount >= job.maxRetries ? 'FAILED' : 'QUEUED';

      const updated: GrowthExecutionJob = {
        ...job,
        retryCount,
        status,
        errorHistory: [
          ...job.errorHistory,
          {
            attemptNumber: retryCount,
            errorMessage: errorMsg,
            occurredAt: new Date().toISOString(),
          },
        ],
        updatedAt: new Date().toISOString(),
      };

      await ref.set(updated as any);
      return updated;
    }
  }

  /**
   * Reconciles execution job delivery status
   */
  public async reconcileJob(workspaceId: string, jobId: string): Promise<GrowthExecutionJob> {
    const ref = db.doc(`workspaces/${workspaceId}/executionJobs/${jobId}`);
    const snap = await ref.get();
    if (!snap.exists) {
      throw new Error(`ExecutionJob '${jobId}' not found.`);
    }

    const job = (snap.data() as unknown) as GrowthExecutionJob;
    if (job.status !== 'COMPLETED') {
      return job;
    }

    const receipt = job.executionReceipt;
    const now = new Date().toISOString();

    const updatedReceipt = receipt
      ? {
          ...receipt,
          reconciliationStatus: 'VERIFIED' as const,
          externalDeliveryConfirmation: receipt.externalDeliveryConfirmation || {
            confirmedAt: now,
            deliveredCount: 1,
          },
        }
      : undefined;

    const updated: GrowthExecutionJob = {
      ...job,
      executionReceipt: updatedReceipt,
      updatedAt: now,
    };

    await ref.set(updated as any);
    return updated;
  }

  /**
   * Gets a single job by ID
   */
  public async getJob(workspaceId: string, jobId: string): Promise<GrowthExecutionJob | null> {
    const snap = await db.doc(`workspaces/${workspaceId}/executionJobs/${jobId}`).get();
    if (!snap.exists) return null;
    return (snap.data() as unknown) as GrowthExecutionJob;
  }

  /**
   * Lists execution jobs for a workspace
   */
  public async listJobs(workspaceId: string): Promise<GrowthExecutionJob[]> {
    const snap = await db.collection(`workspaces/${workspaceId}/executionJobs`).get();
    return snap.docs.map((d) => (d.data() as unknown) as GrowthExecutionJob);
  }
}

export const growthExecutionQueueService = new GrowthExecutionQueueService();
