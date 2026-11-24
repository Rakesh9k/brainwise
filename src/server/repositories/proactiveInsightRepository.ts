/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from '../db/firestore';
import type { ProactiveInsightEntity } from '../types/api';

export class ProactiveInsightRepository {
  public async create(insight: ProactiveInsightEntity): Promise<ProactiveInsightEntity> {
    await db
      .doc<ProactiveInsightEntity>(
        `workspaces/${insight.workspaceId}/proactiveInsights/${insight.insightId}`
      )
      .set(insight);
    return insight;
  }

  public async findById(
    workspaceId: string,
    insightId: string
  ): Promise<ProactiveInsightEntity | null> {
    const snap = await db
      .doc<ProactiveInsightEntity>(`workspaces/${workspaceId}/proactiveInsights/${insightId}`)
      .get();
    return snap.exists && snap.data() ? snap.data()! : null;
  }

  public async update(
    workspaceId: string,
    insightId: string,
    patch: Partial<ProactiveInsightEntity>
  ): Promise<ProactiveInsightEntity> {
    const now = new Date().toISOString();
    await db
      .doc<ProactiveInsightEntity>(`workspaces/${workspaceId}/proactiveInsights/${insightId}`)
      .update({
        ...patch,
        updatedAt: now,
      });
    const updated = await this.findById(workspaceId, insightId);
    if (!updated) throw new Error(`ProactiveInsight '${insightId}' not found.`);
    return updated;
  }

  public async listByWorkspace(
    workspaceId: string,
    filter?: { status?: string; triggerType?: string; activeOnly?: boolean }
  ): Promise<ProactiveInsightEntity[]> {
    const coll = db.collection<ProactiveInsightEntity>(
      `workspaces/${workspaceId}/proactiveInsights`
    );
    const snap = await coll.orderBy('createdAt', 'desc').get();
    let insights: ProactiveInsightEntity[] = snap.docs
      .map((d) => d.data())
      .filter((d): d is ProactiveInsightEntity => Boolean(d));

    if (filter?.status) {
      insights = insights.filter((i) => i.status.toUpperCase() === filter.status!.toUpperCase());
    } else if (filter?.activeOnly) {
      insights = insights.filter((i) => i.status === 'ACTIVE');
    }

    if (filter?.triggerType) {
      insights = insights.filter(
        (i) => i.triggerType.toUpperCase() === filter.triggerType!.toUpperCase()
      );
    }

    return insights;
  }

  /**
   * Identifies and marks insights as EXPIRED when their expirationDate has passed
   */
  public async expireStaleInsights(workspaceId: string): Promise<number> {
    const now = new Date().toISOString();
    const insights = await this.listByWorkspace(workspaceId, { status: 'ACTIVE' });
    let expiredCount = 0;

    for (const insight of insights) {
      if (insight.expirationDate && insight.expirationDate < now) {
        await this.update(workspaceId, insight.insightId, { status: 'EXPIRED' });
        expiredCount++;
      }
    }

    return expiredCount;
  }

  /**
   * Checks whether a similar recommendation was previously dismissed and should remain suppressed
   */
  public async isSuppressed(
    workspaceId: string,
    triggerType: string,
    title: string,
    currentMetricValue?: number
  ): Promise<boolean> {
    const dismissed = await this.listByWorkspace(workspaceId, { status: 'DISMISSED' });
    const match = dismissed.find(
      (d) => d.triggerType === triggerType && d.title?.toLowerCase() === title.toLowerCase()
    );

    if (!match) return false;

    // If marked to suppress until material change, evaluate delta
    if (match.dismissalMetadata?.suppressUntilMaterialChange) {
      const baseline = match.dismissalMetadata.baselineMetricValueAtDismissal;
      if (baseline !== undefined && currentMetricValue !== undefined && baseline > 0) {
        const delta = Math.abs((currentMetricValue - baseline) / baseline);
        // If metric shifted by more than 25%, material change occurred -> allow reappearance
        if (delta >= 0.25) {
          return false;
        }
      }
      return true; // Still suppressed
    }

    return true;
  }
}

export const proactiveInsightRepository = new ProactiveInsightRepository();
