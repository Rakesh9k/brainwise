/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from '../db/firestore';
import type { AiExecutionEntity, AiRequestEntity, AiResultEntity, AiSource } from '../ai/types';

export class AiRequestRepository {
  public async createRequest(request: AiRequestEntity): Promise<AiRequestEntity> {
    await db
      .doc<AiRequestEntity>(`workspaces/${request.workspaceId}/aiRequests/${request.requestId}`)
      .set(request);
    return request;
  }

  public async getRequest(workspaceId: string, requestId: string): Promise<AiRequestEntity | null> {
    const snap = await db
      .doc<AiRequestEntity>(`workspaces/${workspaceId}/aiRequests/${requestId}`)
      .get();
    return snap.exists && snap.data() ? snap.data()! : null;
  }

  public async updateRequestStatus(
    workspaceId: string,
    requestId: string,
    patch: Partial<
      Pick<
        AiRequestEntity,
        'status' | 'completedAt' | 'errorMessage' | 'approvalStatus' | 'approvedBy' | 'approvedAt'
      >
    >
  ): Promise<AiRequestEntity> {
    const ref = db.doc<AiRequestEntity>(`workspaces/${workspaceId}/aiRequests/${requestId}`);
    await ref.update(patch);
    const snap = await ref.get();
    return snap.data()!;
  }

  public async listRequests(workspaceId: string, limit = 20): Promise<AiRequestEntity[]> {
    const snap = await db
      .collection<AiRequestEntity>(`workspaces/${workspaceId}/aiRequests`)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    return snap.docs.map((d) => d.data()).filter((d): d is AiRequestEntity => Boolean(d));
  }

  public async saveExecution(execution: AiExecutionEntity): Promise<AiExecutionEntity> {
    await db
      .doc<AiExecutionEntity>(
        `workspaces/${execution.workspaceId}/aiExecutions/${execution.executionId}`
      )
      .set(execution);
    return execution;
  }

  public async saveResult(result: AiResultEntity): Promise<AiResultEntity> {
    await db
      .doc<AiResultEntity>(`workspaces/${result.workspaceId}/aiResults/${result.resultId}`)
      .set(result);
    return result;
  }

  public async getResultByRequestId(
    workspaceId: string,
    requestId: string
  ): Promise<AiResultEntity | null> {
    const snap = await db
      .collection<AiResultEntity>(`workspaces/${workspaceId}/aiResults`)
      .where('requestId', '==', requestId)
      .limit(1)
      .get();
    if (snap.empty || !snap.docs[0]) return null;
    return snap.docs[0].data() || null;
  }

  public async saveSources(sources: AiSource[]): Promise<void> {
    for (const s of sources) {
      await db.doc<AiSource>(`workspaces/${s.workspaceId}/aiSources/${s.sourceId}`).set(s);
    }
  }

  public async getSourcesByRequestId(workspaceId: string, requestId: string): Promise<AiSource[]> {
    const snap = await db
      .collection<AiSource>(`workspaces/${workspaceId}/aiSources`)
      .where('requestId', '==', requestId)
      .get();
    return snap.docs.map((d) => d.data()).filter((d): d is AiSource => Boolean(d));
  }
}

export const aiRequestRepository = new AiRequestRepository();
