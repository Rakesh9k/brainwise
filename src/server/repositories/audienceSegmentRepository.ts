/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from '../db/firestore';
import type { AudienceSegmentEntity } from '../types/api';

export class AudienceSegmentRepository {
  public async create(segment: AudienceSegmentEntity): Promise<AudienceSegmentEntity> {
    await db
      .collection<AudienceSegmentEntity>(`workspaces/${segment.workspaceId}/audienceSegments`)
      .doc(segment.segmentId)
      .set(segment);
    return segment;
  }

  public async get(workspaceId: string, segmentId: string): Promise<AudienceSegmentEntity | null> {
    const snap = await db
      .collection<AudienceSegmentEntity>(`workspaces/${workspaceId}/audienceSegments`)
      .doc(segmentId)
      .get();
    return snap.exists ? (snap.data() as AudienceSegmentEntity) : null;
  }

  public async listByWorkspace(workspaceId: string): Promise<AudienceSegmentEntity[]> {
    const snap = await db
      .collection<AudienceSegmentEntity>(`workspaces/${workspaceId}/audienceSegments`)
      .orderBy('createdAt', 'desc')
      .get();
    return snap.docs.map((d) => d.data()).filter(Boolean) as AudienceSegmentEntity[];
  }

  public async update(
    workspaceId: string,
    segmentId: string,
    patch: Partial<AudienceSegmentEntity>
  ): Promise<AudienceSegmentEntity> {
    const ref = db
      .collection<AudienceSegmentEntity>(`workspaces/${workspaceId}/audienceSegments`)
      .doc(segmentId);
    const existing = await ref.get();
    if (!existing.exists) {
      throw new Error(`Audience segment '${segmentId}' not found in workspace '${workspaceId}'`);
    }

    const updated: AudienceSegmentEntity = {
      ...(existing.data() as AudienceSegmentEntity),
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    await ref.set(updated, { merge: true });
    return updated;
  }

  public async delete(workspaceId: string, segmentId: string): Promise<void> {
    await db
      .collection<AudienceSegmentEntity>(`workspaces/${workspaceId}/audienceSegments`)
      .doc(segmentId)
      .delete();
  }
}

export const audienceSegmentRepository = new AudienceSegmentRepository();
