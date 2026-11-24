/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from '../db/firestore';
import type { GrowthRadarOpportunity } from '../types/api';

export class GrowthRadarRepository {
  public async create(opportunity: GrowthRadarOpportunity): Promise<GrowthRadarOpportunity> {
    await db
      .doc<GrowthRadarOpportunity>(
        `workspaces/${opportunity.workspaceId}/growthRadarOpportunities/${opportunity.opportunityId}`
      )
      .set(opportunity);
    return opportunity;
  }

  public async findById(
    workspaceId: string,
    opportunityId: string
  ): Promise<GrowthRadarOpportunity | null> {
    const snap = await db
      .doc<GrowthRadarOpportunity>(
        `workspaces/${workspaceId}/growthRadarOpportunities/${opportunityId}`
      )
      .get();
    return snap.exists && snap.data() ? snap.data()! : null;
  }

  public async findByFingerprint(
    workspaceId: string,
    evidenceFingerprint: string
  ): Promise<GrowthRadarOpportunity | null> {
    const coll = db.collection<GrowthRadarOpportunity>(
      `workspaces/${workspaceId}/growthRadarOpportunities`
    );
    const snap = await coll.where('evidenceFingerprint', '==', evidenceFingerprint).limit(1).get();
    return snap.docs[0]?.data() || null;
  }

  public async update(
    workspaceId: string,
    opportunityId: string,
    patch: Partial<GrowthRadarOpportunity>
  ): Promise<GrowthRadarOpportunity> {
    const now = new Date().toISOString();
    await db
      .doc<GrowthRadarOpportunity>(
        `workspaces/${workspaceId}/growthRadarOpportunities/${opportunityId}`
      )
      .update({
        ...patch,
        updatedAt: now,
      });

    const updated = await this.findById(workspaceId, opportunityId);
    if (!updated) {
      throw new Error(`GrowthRadarOpportunity '${opportunityId}' not found.`);
    }
    return updated;
  }

  public async listByWorkspace(
    workspaceId: string,
    filter?: {
      category?: string;
      lifecycleState?: string;
      activeOnly?: boolean;
      minScore?: number;
    }
  ): Promise<GrowthRadarOpportunity[]> {
    const coll = db.collection<GrowthRadarOpportunity>(
      `workspaces/${workspaceId}/growthRadarOpportunities`
    );
    const snap = await coll.orderBy('opportunityScore', 'desc').get();
    let opportunities: GrowthRadarOpportunity[] = snap.docs
      .map((d) => d.data())
      .filter((d): d is GrowthRadarOpportunity => Boolean(d));

    if (filter?.category) {
      opportunities = opportunities.filter((o) => o.category === filter.category);
    }

    if (filter?.lifecycleState) {
      opportunities = opportunities.filter((o) => o.lifecycleState === filter.lifecycleState);
    }

    if (filter?.activeOnly) {
      const activeStates = ['READY', 'DETECTED', 'ASSIGNED', 'IN_PROGRESS'];
      opportunities = opportunities.filter((o) => activeStates.includes(o.lifecycleState));
    }

    if (filter?.minScore !== undefined) {
      opportunities = opportunities.filter((o) => o.opportunityScore >= filter.minScore!);
    }

    return opportunities;
  }

  public async expireStaleOpportunities(
    workspaceId: string,
    now: Date | string = new Date()
  ): Promise<number> {
    const nowIso = typeof now === 'string' ? now : now.toISOString();
    const opportunities = await this.listByWorkspace(workspaceId);
    let expiredCount = 0;

    for (const opp of opportunities) {
      if (
        (opp.lifecycleState === 'READY' || opp.lifecycleState === 'DETECTED') &&
        opp.expirationDate &&
        opp.expirationDate < nowIso
      ) {
        await this.update(workspaceId, opp.opportunityId, {
          lifecycleState: 'EXPIRED',
          lifecycleHistory: [
            ...opp.lifecycleHistory,
            {
              state: 'EXPIRED',
              timestamp: nowIso,
              note: 'Opportunity expired past detection relevance window.',
            },
          ],
        });
        expiredCount++;
      }
    }

    return expiredCount;
  }

  public async delete(workspaceId: string, opportunityId: string): Promise<void> {
    await db
      .doc<GrowthRadarOpportunity>(
        `workspaces/${workspaceId}/growthRadarOpportunities/${opportunityId}`
      )
      .delete();
  }
}

export const growthRadarRepository = new GrowthRadarRepository();
