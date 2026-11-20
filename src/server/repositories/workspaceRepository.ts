/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from '../db/firestore';
import type { WorkspaceEntity } from '../types/api';

export class WorkspaceRepository {
  private collection = 'workspaces';

  public async findById(workspaceId: string): Promise<WorkspaceEntity | null> {
    const snap = await db.doc<WorkspaceEntity>(`${this.collection}/${workspaceId}`).get();
    return snap.exists && snap.data() ? snap.data()! : null;
  }

  public async findBySlug(slug: string): Promise<WorkspaceEntity | null> {
    const snap = await db
      .collection<WorkspaceEntity>(this.collection)
      .where('workspaceSlug', '==', slug.toLowerCase().trim())
      .limit(1)
      .get();
    return snap.empty ? null : (snap.docs[0].data() ?? null);
  }

  public async findByOwner(ownerId: string): Promise<WorkspaceEntity[]> {
    const snap = await db
      .collection<WorkspaceEntity>(this.collection)
      .where('ownerUserId', '==', ownerId)
      .get();
    return snap.docs.map((d) => d.data()).filter((d): d is WorkspaceEntity => Boolean(d));
  }

  public async create(
    workspace: Omit<WorkspaceEntity, 'createdAt' | 'updatedAt'>
  ): Promise<WorkspaceEntity> {
    const now = db.serverTimestamp();
    const entity: WorkspaceEntity = {
      ...workspace,
      createdAt: now,
      updatedAt: now,
    };
    await db.doc<WorkspaceEntity>(`${this.collection}/${workspace.workspaceId}`).set(entity);
    return entity;
  }

  public async update(
    workspaceId: string,
    patch: Partial<WorkspaceEntity>
  ): Promise<WorkspaceEntity> {
    const now = db.serverTimestamp();
    await db.doc<WorkspaceEntity>(`${this.collection}/${workspaceId}`).update({
      ...patch,
      updatedAt: now,
    });
    const updated = await this.findById(workspaceId);
    if (!updated) throw new Error(`Workspace '${workspaceId}' not found after update`);
    return updated;
  }

  public async archive(workspaceId: string): Promise<void> {
    await db.doc<WorkspaceEntity>(`${this.collection}/${workspaceId}`).update({
      workspaceStatus: 'archived',
      updatedAt: db.serverTimestamp(),
    });
  }

  public async delete(workspaceId: string): Promise<void> {
    await db.doc<WorkspaceEntity>(`${this.collection}/${workspaceId}`).delete();
  }
}

export const workspaceRepository = new WorkspaceRepository();
