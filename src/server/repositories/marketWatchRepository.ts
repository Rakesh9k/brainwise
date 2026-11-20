/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from '../db/firestore';
import type { MarketTopicEntity, MarketFindingEntity } from '../types/api';

export class MarketWatchRepository {
  // TOPICS
  public async createTopic(topic: MarketTopicEntity): Promise<MarketTopicEntity> {
    await db
      .collection<MarketTopicEntity>(`workspaces/${topic.workspaceId}/marketTopics`)
      .doc(topic.topicId)
      .set(topic);
    return topic;
  }

  public async getTopic(workspaceId: string, topicId: string): Promise<MarketTopicEntity | null> {
    const snap = await db
      .collection<MarketTopicEntity>(`workspaces/${workspaceId}/marketTopics`)
      .doc(topicId)
      .get();
    return snap.exists ? (snap.data() as MarketTopicEntity) : null;
  }

  public async listTopics(workspaceId: string): Promise<MarketTopicEntity[]> {
    const snap = await db
      .collection<MarketTopicEntity>(`workspaces/${workspaceId}/marketTopics`)
      .orderBy('createdAt', 'desc')
      .get();
    return snap.docs.map((d) => d.data()).filter(Boolean) as MarketTopicEntity[];
  }

  public async updateTopic(
    workspaceId: string,
    topicId: string,
    patch: Partial<MarketTopicEntity>
  ): Promise<MarketTopicEntity> {
    const ref = db
      .collection<MarketTopicEntity>(`workspaces/${workspaceId}/marketTopics`)
      .doc(topicId);
    const existing = await ref.get();
    if (!existing.exists) {
      throw new Error(`Topic '${topicId}' not found in workspace '${workspaceId}'`);
    }

    const updated: MarketTopicEntity = {
      ...(existing.data() as MarketTopicEntity),
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    await ref.set(updated, { merge: true });
    return updated;
  }

  public async deleteTopic(workspaceId: string, topicId: string): Promise<void> {
    await db
      .collection<MarketTopicEntity>(`workspaces/${workspaceId}/marketTopics`)
      .doc(topicId)
      .delete();
  }

  // FINDINGS & ALERTS
  public async createFinding(finding: MarketFindingEntity): Promise<MarketFindingEntity> {
    await db
      .collection<MarketFindingEntity>(`workspaces/${finding.workspaceId}/marketFindings`)
      .doc(finding.findingId)
      .set(finding);
    return finding;
  }

  public async listFindings(
    workspaceId: string,
    options?: { category?: string; unreadOnly?: boolean; limit?: number }
  ): Promise<MarketFindingEntity[]> {
    let query = db
      .collection<MarketFindingEntity>(`workspaces/${workspaceId}/marketFindings`)
      .orderBy('retrievedAt', 'desc')
      .limit(options?.limit || 50);

    if (options?.category) {
      query = query.where('category', '==', options.category);
    }
    if (options?.unreadOnly) {
      query = query.where('isRead', '==', false);
    }

    const snap = await query.get();
    return snap.docs.map((d) => d.data()).filter(Boolean) as MarketFindingEntity[];
  }

  public async updateFinding(
    workspaceId: string,
    findingId: string,
    patch: Partial<MarketFindingEntity>
  ): Promise<MarketFindingEntity> {
    const ref = db
      .collection<MarketFindingEntity>(`workspaces/${workspaceId}/marketFindings`)
      .doc(findingId);
    const existing = await ref.get();
    if (!existing.exists) {
      throw new Error(`Finding '${findingId}' not found in workspace '${workspaceId}'`);
    }

    const updated: MarketFindingEntity = {
      ...(existing.data() as MarketFindingEntity),
      ...patch,
    };
    await ref.set(updated, { merge: true });
    return updated;
  }

  public async findByDedupHash(
    workspaceId: string,
    dedupHash: string
  ): Promise<MarketFindingEntity | null> {
    const snap = await db
      .collection<MarketFindingEntity>(`workspaces/${workspaceId}/marketFindings`)
      .where('dedupHash', '==', dedupHash)
      .limit(1)
      .get();
    return snap.docs[0]?.data() ? (snap.docs[0].data() as MarketFindingEntity) : null;
  }
}

export const marketWatchRepository = new MarketWatchRepository();
