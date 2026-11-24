/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from '../db/firestore';
import type { ApprovalRequestEntity } from '../types/api';

export class ApprovalRequestRepository {
  public async getRequest(
    workspaceId: string,
    requestId: string
  ): Promise<ApprovalRequestEntity | null> {
    const snap = await db
      .collection<ApprovalRequestEntity>(`workspaces/${workspaceId}/approvalRequests`)
      .doc(requestId)
      .get();
    return snap.exists ? (snap.data() as ApprovalRequestEntity) : null;
  }

  public async listRequests(
    workspaceId: string,
    status?: ApprovalRequestEntity['status']
  ): Promise<ApprovalRequestEntity[]> {
    let query = db
      .collection<ApprovalRequestEntity>(`workspaces/${workspaceId}/approvalRequests`)
      .orderBy('createdAt', 'desc');

    if (status) {
      query = query.where('status', '==', status);
    }

    const snap = await query.get();
    return snap.docs.map((d) => d.data()).filter(Boolean) as ApprovalRequestEntity[];
  }

  public async createRequest(request: ApprovalRequestEntity): Promise<ApprovalRequestEntity> {
    await db
      .collection<ApprovalRequestEntity>(`workspaces/${request.workspaceId}/approvalRequests`)
      .doc(request.requestId)
      .set(request);
    return request;
  }

  public async updateRequest(
    workspaceId: string,
    requestId: string,
    patch: Partial<ApprovalRequestEntity>
  ): Promise<ApprovalRequestEntity> {
    const ref = db
      .collection<ApprovalRequestEntity>(`workspaces/${workspaceId}/approvalRequests`)
      .doc(requestId);
    const existing = await ref.get();
    if (!existing.exists) {
      throw new Error(`Approval request '${requestId}' not found in workspace '${workspaceId}'`);
    }

    const updated: ApprovalRequestEntity = {
      ...(existing.data() as ApprovalRequestEntity),
      ...patch,
    };

    await ref.set(updated);
    return updated;
  }
}

export const approvalRequestRepository = new ApprovalRequestRepository();
