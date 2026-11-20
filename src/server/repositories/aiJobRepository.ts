/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from '../db/firestore';
import type { AiJobEntity, AuditLogEntity } from '../types/api';

export class AiJobRepository {
  public async create(job: AiJobEntity): Promise<AiJobEntity> {
    await db.doc<AiJobEntity>(`workspaces/${job.workspaceId}/aiJobs/${job.jobId}`).set(job);
    return job;
  }

  public async findById(workspaceId: string, jobId: string): Promise<AiJobEntity | null> {
    const snap = await db.doc<AiJobEntity>(`workspaces/${workspaceId}/aiJobs/${jobId}`).get();
    return snap.exists && snap.data() ? snap.data()! : null;
  }

  public async listByWorkspace(workspaceId: string): Promise<AiJobEntity[]> {
    const snap = await db
      .collection<AiJobEntity>(`workspaces/${workspaceId}/aiJobs`)
      .orderBy('createdAt', 'desc')
      .limit(30)
      .get();
    return snap.docs.map((d) => d.data()).filter((d): d is AiJobEntity => Boolean(d));
  }

  public async updateStatus(
    workspaceId: string,
    jobId: string,
    patch: {
      status: AiJobEntity['status'];
      resultPayload?: Record<string, unknown>;
      errorMessage?: string;
      creditsConsumed?: number;
      completedAt?: string;
      modelUsed?: string;
    }
  ): Promise<AiJobEntity> {
    await db.doc<AiJobEntity>(`workspaces/${workspaceId}/aiJobs/${jobId}`).update(patch);
    const updated = await this.findById(workspaceId, jobId);
    if (!updated) throw new Error(`Job '${jobId}' not found after update`);
    return updated;
  }
}

export class AuditLogRepository {
  public async logEvent(
    entry: Omit<AuditLogEntity, 'logId' | 'timestamp'>
  ): Promise<AuditLogEntity> {
    const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const fullEntry: AuditLogEntity = {
      ...entry,
      logId,
      timestamp: db.serverTimestamp(),
    };
    await db.doc<AuditLogEntity>(`auditLogs/${logId}`).set(fullEntry);
    if (entry.workspaceId) {
      await db
        .doc<AuditLogEntity>(`workspaces/${entry.workspaceId}/auditLogs/${logId}`)
        .set(fullEntry);
    }
    return fullEntry;
  }

  public async listByWorkspace(workspaceId: string): Promise<AuditLogEntity[]> {
    const snap = await db
      .collection<AuditLogEntity>(`workspaces/${workspaceId}/auditLogs`)
      .orderBy('timestamp', 'desc')
      .limit(100)
      .get();
    return snap.docs.map((d) => d.data()).filter((d): d is AuditLogEntity => Boolean(d));
  }
}

export const aiJobRepository = new AiJobRepository();
export const auditLogRepository = new AuditLogRepository();
