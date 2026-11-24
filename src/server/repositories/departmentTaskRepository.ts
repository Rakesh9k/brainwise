/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from '../db/firestore';
import type { StandardDepartmentTaskEntity } from '../types/api';

export class DepartmentTaskRepository {
  public async listByWorkspace(
    workspaceId: string,
    filter?: { department?: string; status?: string }
  ): Promise<StandardDepartmentTaskEntity[]> {
    const coll = db.collection<StandardDepartmentTaskEntity>(
      `workspaces/${workspaceId}/departmentTasks`
    );
    const snap = await coll.orderBy('createdAt', 'desc').get();
    let tasks: StandardDepartmentTaskEntity[] = snap.docs
      .map((d) => d.data())
      .filter((d): d is StandardDepartmentTaskEntity => Boolean(d));

    if (filter?.department) {
      tasks = tasks.filter((t) => t.department.toUpperCase() === filter.department!.toUpperCase());
    }
    if (filter?.status) {
      tasks = tasks.filter((t) => t.status.toUpperCase() === filter.status!.toUpperCase());
    }
    return tasks;
  }

  public async findById(
    workspaceId: string,
    taskId: string
  ): Promise<StandardDepartmentTaskEntity | null> {
    const snap = await db
      .doc<StandardDepartmentTaskEntity>(`workspaces/${workspaceId}/departmentTasks/${taskId}`)
      .get();
    return snap.exists && snap.data() ? snap.data()! : null;
  }

  public async findByIdempotencyKey(
    workspaceId: string,
    idempotencyKey: string
  ): Promise<StandardDepartmentTaskEntity | null> {
    const snap = await db
      .collection<StandardDepartmentTaskEntity>(`workspaces/${workspaceId}/departmentTasks`)
      .where('idempotencyKey', '==', idempotencyKey)
      .limit(1)
      .get();
    if (snap.empty || !snap.docs[0].exists) return null;
    return snap.docs[0].data() || null;
  }

  public async create(task: StandardDepartmentTaskEntity): Promise<StandardDepartmentTaskEntity> {
    await db
      .doc<StandardDepartmentTaskEntity>(
        `workspaces/${task.workspaceId}/departmentTasks/${task.taskId}`
      )
      .set(task);
    return task;
  }

  public async update(
    workspaceId: string,
    taskId: string,
    patch: Partial<StandardDepartmentTaskEntity>
  ): Promise<StandardDepartmentTaskEntity> {
    const now = new Date().toISOString();
    await db
      .doc<StandardDepartmentTaskEntity>(`workspaces/${workspaceId}/departmentTasks/${taskId}`)
      .update({
        ...patch,
        updatedAt: now,
      });
    const updated = await this.findById(workspaceId, taskId);
    if (!updated) throw new Error(`DepartmentTask '${taskId}' not found`);
    return updated;
  }

  public async delete(workspaceId: string, taskId: string): Promise<void> {
    await db.doc(`workspaces/${workspaceId}/departmentTasks/${taskId}`).delete();
  }
}

export const departmentTaskRepository = new DepartmentTaskRepository();
