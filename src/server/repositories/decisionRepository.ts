/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from '../db/firestore';
import type { DecisionRecordEntity } from '../types/api';

export class DecisionRepository {
  private decisionsPath(workspaceId: string): string {
    return `workspaces/${workspaceId}/decisions`;
  }

  public async recordDecision(decision: DecisionRecordEntity): Promise<DecisionRecordEntity> {
    const now = new Date().toISOString();
    const entity: DecisionRecordEntity = {
      ...decision,
      createdAt: decision.createdAt || now,
      updatedAt: now,
    };
    await db
      .doc(`${this.decisionsPath(decision.workspaceId)}/${decision.decisionId}`)
      .set(entity as any);
    return entity;
  }

  public async getDecision(
    workspaceId: string,
    decisionId: string
  ): Promise<DecisionRecordEntity | null> {
    const snap = await db.doc(`${this.decisionsPath(workspaceId)}/${decisionId}`).get();
    return snap.exists && snap.data() ? (snap.data() as unknown as DecisionRecordEntity) : null;
  }

  public async listDecisions(
    workspaceId: string,
    filters?: {
      department?: string;
      approvalStatus?: 'approved' | 'rejected' | 'deferred';
      relatedStrategyId?: string;
    }
  ): Promise<DecisionRecordEntity[]> {
    const snap = await db.collection(this.decisionsPath(workspaceId)).get();
    let decisions = snap.docs.map((d) => d.data() as unknown as DecisionRecordEntity);

    if (filters?.department) {
      decisions = decisions.filter((d) => d.responsibleDepartment === filters.department);
    }
    if (filters?.approvalStatus) {
      decisions = decisions.filter((d) => d.userApproval.status === filters.approvalStatus);
    }
    if (filters?.relatedStrategyId) {
      decisions = decisions.filter((d) => d.relatedStrategyId === filters.relatedStrategyId);
    }

    return decisions.sort(
      (a, b) => new Date(b.decisionDate).getTime() - new Date(a.decisionDate).getTime()
    );
  }

  public async updateDecision(
    workspaceId: string,
    decisionId: string,
    patch: Partial<DecisionRecordEntity>
  ): Promise<DecisionRecordEntity> {
    const ref = db.doc(`${this.decisionsPath(workspaceId)}/${decisionId}`);
    const existing = await this.getDecision(workspaceId, decisionId);
    if (!existing) {
      throw new Error(`Decision '${decisionId}' not found in workspace '${workspaceId}'`);
    }

    const updated: DecisionRecordEntity = {
      ...existing,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    await ref.set(updated as any, { merge: true });
    return updated;
  }
}

export const decisionRepository = new DecisionRepository();
