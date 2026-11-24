/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from '../db/firestore';
import type { ExtractionJobEntity, VerificationItemEntity } from '../types/api';

export class ExtractionJobRepository {
  // EXTRACTION JOBS
  public async createJob(job: ExtractionJobEntity): Promise<ExtractionJobEntity> {
    await db
      .collection<ExtractionJobEntity>(`workspaces/${job.workspaceId}/extractionJobs`)
      .doc(job.jobId)
      .set(job);
    return job;
  }

  public async getJob(workspaceId: string, jobId: string): Promise<ExtractionJobEntity | null> {
    const snap = await db
      .collection<ExtractionJobEntity>(`workspaces/${workspaceId}/extractionJobs`)
      .doc(jobId)
      .get();
    return snap.exists && snap.data() ? (snap.data() as ExtractionJobEntity) : null;
  }

  public async listJobs(workspaceId: string, limit: number = 20): Promise<ExtractionJobEntity[]> {
    const snap = await db
      .collection<ExtractionJobEntity>(`workspaces/${workspaceId}/extractionJobs`)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    return snap.docs.map((d) => d.data()).filter(Boolean) as ExtractionJobEntity[];
  }

  public async updateJob(
    workspaceId: string,
    jobId: string,
    patch: Partial<ExtractionJobEntity>
  ): Promise<ExtractionJobEntity> {
    const ref = db
      .collection<ExtractionJobEntity>(`workspaces/${workspaceId}/extractionJobs`)
      .doc(jobId);
    const existing = await ref.get();
    if (!existing.exists) {
      throw new Error(`Extraction job '${jobId}' not found in workspace '${workspaceId}'`);
    }

    const updated: ExtractionJobEntity = {
      ...(existing.data() as ExtractionJobEntity),
      ...patch,
    };
    await ref.set(updated, { merge: true });
    return updated;
  }

  // VERIFICATION QUEUE
  public async createVerificationItems(
    workspaceId: string,
    items: VerificationItemEntity[]
  ): Promise<VerificationItemEntity[]> {
    for (const item of items) {
      await db
        .collection<VerificationItemEntity>(`workspaces/${workspaceId}/verificationItems`)
        .doc(item.itemId)
        .set(item);
    }
    return items;
  }

  public async listVerificationItems(
    workspaceId: string,
    status: VerificationItemEntity['status'] = 'pending'
  ): Promise<VerificationItemEntity[]> {
    const snap = await db
      .collection<VerificationItemEntity>(`workspaces/${workspaceId}/verificationItems`)
      .where('status', '==', status)
      .get();
    return snap.docs.map((d) => d.data()).filter(Boolean) as VerificationItemEntity[];
  }

  public async updateVerificationItem(
    workspaceId: string,
    itemId: string,
    patch: Partial<VerificationItemEntity>
  ): Promise<VerificationItemEntity> {
    const ref = db
      .collection<VerificationItemEntity>(`workspaces/${workspaceId}/verificationItems`)
      .doc(itemId);
    const existing = await ref.get();
    if (!existing.exists) {
      throw new Error(`Verification item '${itemId}' not found in workspace '${workspaceId}'`);
    }

    const updated: VerificationItemEntity = {
      ...(existing.data() as VerificationItemEntity),
      ...patch,
    };
    await ref.set(updated, { merge: true });
    return updated;
  }
}

export const extractionJobRepository = new ExtractionJobRepository();
