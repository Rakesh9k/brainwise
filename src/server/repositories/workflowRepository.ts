/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from '../db/firestore';
import type { BusinessWorkflowEntity, WorkflowStatus } from '../types/api';

export class WorkflowRepository {
  public async getWorkflow(
    workspaceId: string,
    workflowId: string
  ): Promise<BusinessWorkflowEntity | null> {
    const snap = await db
      .collection<BusinessWorkflowEntity>(`workspaces/${workspaceId}/workflows`)
      .doc(workflowId)
      .get();
    return snap.exists ? (snap.data() as BusinessWorkflowEntity) : null;
  }

  public async listWorkflows(
    workspaceId: string,
    status?: WorkflowStatus
  ): Promise<BusinessWorkflowEntity[]> {
    let query = db
      .collection<BusinessWorkflowEntity>(`workspaces/${workspaceId}/workflows`)
      .orderBy('createdAt', 'desc');

    if (status) {
      query = query.where('status', '==', status);
    }

    const snap = await query.get();
    return snap.docs.map((d) => d.data()).filter(Boolean) as BusinessWorkflowEntity[];
  }

  public async findByIdempotencyKey(
    workspaceId: string,
    idempotencyKey: string
  ): Promise<BusinessWorkflowEntity | null> {
    const snap = await db
      .collection<BusinessWorkflowEntity>(`workspaces/${workspaceId}/workflows`)
      .where('idempotencyKey', '==', idempotencyKey)
      .limit(1)
      .get();
    return snap.empty ? null : (snap.docs[0].data() as BusinessWorkflowEntity);
  }

  public async createWorkflow(workflow: BusinessWorkflowEntity): Promise<BusinessWorkflowEntity> {
    await db
      .collection<BusinessWorkflowEntity>(`workspaces/${workflow.workspaceId}/workflows`)
      .doc(workflow.workflowId)
      .set(workflow);
    return workflow;
  }

  public async updateWorkflow(
    workspaceId: string,
    workflowId: string,
    patch: Partial<BusinessWorkflowEntity>
  ): Promise<BusinessWorkflowEntity> {
    const ref = db
      .collection<BusinessWorkflowEntity>(`workspaces/${workspaceId}/workflows`)
      .doc(workflowId);
    const existing = await ref.get();
    if (!existing.exists) {
      throw new Error(`Workflow '${workflowId}' not found in workspace '${workspaceId}'`);
    }

    const updated: BusinessWorkflowEntity = {
      ...(existing.data() as BusinessWorkflowEntity),
      ...patch,
      updatedAt: new Date().toISOString(),
    };

    await ref.set(updated);
    return updated;
  }
}

export const workflowRepository = new WorkflowRepository();
