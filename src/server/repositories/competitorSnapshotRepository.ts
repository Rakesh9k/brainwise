/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from '../db/firestore';
import type { CompetitorSnapshotEntity } from '../types/api';

export class CompetitorSnapshotRepository {
  public async create(snapshot: CompetitorSnapshotEntity): Promise<CompetitorSnapshotEntity> {
    await db
      .collection<CompetitorSnapshotEntity>(
        `workspaces/${snapshot.workspaceId}/competitorSnapshots`
      )
      .doc(snapshot.snapshotId)
      .set(snapshot);
    return snapshot;
  }

  public async getLatest(
    workspaceId: string,
    competitorId: string
  ): Promise<CompetitorSnapshotEntity | null> {
    const snap = await db
      .collection<CompetitorSnapshotEntity>(`workspaces/${workspaceId}/competitorSnapshots`)
      .where('competitorId', '==', competitorId)
      .orderBy('capturedAt', 'desc')
      .limit(1)
      .get();
    return snap.docs[0]?.data() ? (snap.docs[0].data() as CompetitorSnapshotEntity) : null;
  }

  public async listSnapshots(
    workspaceId: string,
    competitorId: string
  ): Promise<CompetitorSnapshotEntity[]> {
    const snap = await db
      .collection<CompetitorSnapshotEntity>(`workspaces/${workspaceId}/competitorSnapshots`)
      .where('competitorId', '==', competitorId)
      .orderBy('capturedAt', 'desc')
      .get();
    return snap.docs.map((d) => d.data()).filter(Boolean) as CompetitorSnapshotEntity[];
  }
}

export const competitorSnapshotRepository = new CompetitorSnapshotRepository();
