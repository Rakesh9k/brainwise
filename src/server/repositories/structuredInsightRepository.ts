/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from '../db/firestore';
import type {
  StructuredBusinessInsight,
  InsightCategory,
  InsightStatus,
} from '../../types/continuousLearning';

export class StructuredInsightRepository {
  public async create(insight: StructuredBusinessInsight): Promise<StructuredBusinessInsight> {
    await db
      .doc<StructuredBusinessInsight>(
        `workspaces/${insight.workspaceId}/learnedInsights/${insight.insightId}`
      )
      .set(insight);
    return insight;
  }

  public async findById(
    workspaceId: string,
    insightId: string
  ): Promise<StructuredBusinessInsight | null> {
    const snap = await db
      .doc<StructuredBusinessInsight>(`workspaces/${workspaceId}/learnedInsights/${insightId}`)
      .get();
    return snap.exists && snap.data() ? snap.data()! : null;
  }

  public async findByFingerprint(
    workspaceId: string,
    fingerprint: string
  ): Promise<StructuredBusinessInsight | null> {
    const coll = db.collection<StructuredBusinessInsight>(
      `workspaces/${workspaceId}/learnedInsights`
    );
    const snap = await coll.where('fingerprint', '==', fingerprint).get();
    if (snap.empty || !snap.docs[0]?.data()) return null;
    return snap.docs[0].data()!;
  }

  public async update(insight: StructuredBusinessInsight): Promise<StructuredBusinessInsight> {
    await db
      .doc<StructuredBusinessInsight>(
        `workspaces/${insight.workspaceId}/learnedInsights/${insight.insightId}`
      )
      .set(insight, { merge: true });
    return insight;
  }

  public async listByWorkspace(
    workspaceId: string,
    filter?: {
      category?: InsightCategory;
      status?: InsightStatus;
      isPermanentRule?: boolean;
    }
  ): Promise<StructuredBusinessInsight[]> {
    const coll = db.collection<StructuredBusinessInsight>(
      `workspaces/${workspaceId}/learnedInsights`
    );
    const snap = await coll.orderBy('createdAt', 'desc').get();
    let insights: StructuredBusinessInsight[] = snap.docs
      .map((d) => d.data())
      .filter((d): d is StructuredBusinessInsight => Boolean(d));

    if (filter?.category) {
      insights = insights.filter((i) => i.category === filter.category);
    }
    if (filter?.status) {
      insights = insights.filter((i) => i.status === filter.status);
    }
    if (filter?.isPermanentRule !== undefined) {
      insights = insights.filter((i) => i.isPermanentRule === filter.isPermanentRule);
    }

    return insights;
  }
}

export const structuredInsightRepository = new StructuredInsightRepository();
