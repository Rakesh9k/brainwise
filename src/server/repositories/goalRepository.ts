/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from '../db/firestore';
import type { BusinessGoalEntity, CompetitorEntity } from '../types/api';

export class GoalRepository {
  public async listByWorkspace(workspaceId: string): Promise<BusinessGoalEntity[]> {
    const snap = await db
      .collection<BusinessGoalEntity>(`workspaces/${workspaceId}/goals`)
      .orderBy('createdAt', 'desc')
      .get();
    return snap.docs.map((d) => d.data()).filter((d): d is BusinessGoalEntity => Boolean(d));
  }

  public async findById(workspaceId: string, goalId: string): Promise<BusinessGoalEntity | null> {
    const snap = await db
      .doc<BusinessGoalEntity>(`workspaces/${workspaceId}/goals/${goalId}`)
      .get();
    return snap.exists && snap.data() ? snap.data()! : null;
  }

  public async create(goal: BusinessGoalEntity): Promise<BusinessGoalEntity> {
    await db
      .doc<BusinessGoalEntity>(`workspaces/${goal.workspaceId}/goals/${goal.goalId}`)
      .set(goal);
    return goal;
  }

  public async update(
    workspaceId: string,
    goalId: string,
    patch: Partial<BusinessGoalEntity>
  ): Promise<BusinessGoalEntity> {
    const now = db.serverTimestamp();
    await db.doc<BusinessGoalEntity>(`workspaces/${workspaceId}/goals/${goalId}`).update({
      ...patch,
      updatedAt: now,
    });
    const updated = await this.findById(workspaceId, goalId);
    if (!updated) throw new Error(`Goal '${goalId}' not found`);
    return updated;
  }

  public async delete(workspaceId: string, goalId: string): Promise<void> {
    await db.doc(`workspaces/${workspaceId}/goals/${goalId}`).delete();
  }
}

export class CompetitorRepository {
  public async listByWorkspace(workspaceId: string): Promise<CompetitorEntity[]> {
    const snap = await db
      .collection<CompetitorEntity>(`workspaces/${workspaceId}/competitors`)
      .orderBy('createdAt', 'desc')
      .get();
    return snap.docs.map((d) => d.data()).filter((d): d is CompetitorEntity => Boolean(d));
  }

  public async findById(
    workspaceId: string,
    competitorId: string
  ): Promise<CompetitorEntity | null> {
    const snap = await db
      .doc<CompetitorEntity>(`workspaces/${workspaceId}/competitors/${competitorId}`)
      .get();
    return snap.exists && snap.data() ? snap.data()! : null;
  }

  public async create(competitor: CompetitorEntity): Promise<CompetitorEntity> {
    await db
      .doc<CompetitorEntity>(
        `workspaces/${competitor.workspaceId}/competitors/${competitor.competitorId}`
      )
      .set(competitor);
    return competitor;
  }

  public async update(
    workspaceId: string,
    competitorId: string,
    patch: Partial<CompetitorEntity>
  ): Promise<CompetitorEntity> {
    const now = db.serverTimestamp();
    await db.doc<CompetitorEntity>(`workspaces/${workspaceId}/competitors/${competitorId}`).update({
      ...patch,
      updatedAt: now,
    });
    const updated = await this.findById(workspaceId, competitorId);
    if (!updated) throw new Error(`Competitor '${competitorId}' not found`);
    return updated;
  }

  public async delete(workspaceId: string, competitorId: string): Promise<void> {
    await db.doc(`workspaces/${workspaceId}/competitors/${competitorId}`).delete();
  }
}

export const goalRepository = new GoalRepository();
export const competitorRepository = new CompetitorRepository();
