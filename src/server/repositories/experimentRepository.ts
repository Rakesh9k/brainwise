/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from '../db/firestore';
import type { GrowthExperimentEntity, GrowthTaskEntity } from '../types/api';

export class ExperimentRepository {
  public async listByWorkspace(workspaceId: string): Promise<GrowthExperimentEntity[]> {
    const snap = await db
      .collection<GrowthExperimentEntity>(`workspaces/${workspaceId}/experiments`)
      .orderBy('createdAt', 'desc')
      .get();
    return snap.docs.map((d) => d.data()).filter((d): d is GrowthExperimentEntity => Boolean(d));
  }

  public async findById(
    workspaceId: string,
    experimentId: string
  ): Promise<GrowthExperimentEntity | null> {
    const snap = await db
      .doc<GrowthExperimentEntity>(`workspaces/${workspaceId}/experiments/${experimentId}`)
      .get();
    return snap.exists && snap.data() ? snap.data()! : null;
  }

  public async create(exp: GrowthExperimentEntity): Promise<GrowthExperimentEntity> {
    await db
      .doc<GrowthExperimentEntity>(`workspaces/${exp.workspaceId}/experiments/${exp.experimentId}`)
      .set(exp);
    return exp;
  }

  public async update(
    workspaceId: string,
    experimentId: string,
    patch: Partial<GrowthExperimentEntity>
  ): Promise<GrowthExperimentEntity> {
    const now = db.serverTimestamp();
    await db
      .doc<GrowthExperimentEntity>(`workspaces/${workspaceId}/experiments/${experimentId}`)
      .update({
        ...patch,
        updatedAt: now,
      });
    const updated = await this.findById(workspaceId, experimentId);
    if (!updated) throw new Error(`Experiment '${experimentId}' not found`);
    return updated;
  }

  public async delete(workspaceId: string, experimentId: string): Promise<void> {
    await db.doc(`workspaces/${workspaceId}/experiments/${experimentId}`).delete();
  }
}

export class TaskRepository {
  public async listByWorkspace(workspaceId: string): Promise<GrowthTaskEntity[]> {
    const snap = await db
      .collection<GrowthTaskEntity>(`workspaces/${workspaceId}/tasks`)
      .orderBy('createdAt', 'desc')
      .get();
    return snap.docs.map((d) => d.data()).filter((d): d is GrowthTaskEntity => Boolean(d));
  }

  public async findById(workspaceId: string, taskId: string): Promise<GrowthTaskEntity | null> {
    const snap = await db.doc<GrowthTaskEntity>(`workspaces/${workspaceId}/tasks/${taskId}`).get();
    return snap.exists && snap.data() ? snap.data()! : null;
  }

  public async create(task: GrowthTaskEntity): Promise<GrowthTaskEntity> {
    await db.doc<GrowthTaskEntity>(`workspaces/${task.workspaceId}/tasks/${task.taskId}`).set(task);
    return task;
  }

  public async update(
    workspaceId: string,
    taskId: string,
    patch: Partial<GrowthTaskEntity>
  ): Promise<GrowthTaskEntity> {
    const now = db.serverTimestamp();
    await db.doc<GrowthTaskEntity>(`workspaces/${workspaceId}/tasks/${taskId}`).update({
      ...patch,
      updatedAt: now,
    });
    const updated = await this.findById(workspaceId, taskId);
    if (!updated) throw new Error(`Task '${taskId}' not found`);
    return updated;
  }

  public async delete(workspaceId: string, taskId: string): Promise<void> {
    await db.doc(`workspaces/${workspaceId}/tasks/${taskId}`).delete();
  }
}

export { BrandAssetRepository, brandAssetRepository } from './brandAssetRepository';

export const experimentRepository = new ExperimentRepository();
export const taskRepository = new TaskRepository();
