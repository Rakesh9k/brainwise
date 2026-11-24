/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from '../db/firestore';
import type {
  WorkingMemoryEntity,
  EpisodicMemoryEntity,
  StrategicMemoryItemEntity,
} from '../types/api';

export class MemoryRepository {
  // ===========================================================================
  // 1. WORKING MEMORY (Session & Task Lifecycle with TTL)
  // ===========================================================================

  private workingMemoryPath(workspaceId: string, sessionId: string): string {
    return `workspaces/${workspaceId}/workingMemory/${sessionId}`;
  }

  public async setWorkingMemory(memory: WorkingMemoryEntity): Promise<WorkingMemoryEntity> {
    const path = this.workingMemoryPath(memory.workspaceId, memory.sessionId);
    await db.doc(path).set(memory as any);
    return memory;
  }

  public async getWorkingMemory(
    workspaceId: string,
    sessionId: string
  ): Promise<WorkingMemoryEntity | null> {
    const snap = await db.doc(this.workingMemoryPath(workspaceId, sessionId)).get();
    if (!snap.exists) return null;

    const data = snap.data() as unknown as WorkingMemoryEntity;
    const now = new Date().toISOString();

    // Check TTL expiration
    if (data.expiresAt && data.expiresAt < now) {
      await db.doc(this.workingMemoryPath(workspaceId, sessionId)).delete();
      return null;
    }

    return data;
  }

  public async clearWorkingMemory(workspaceId: string, sessionId: string): Promise<boolean> {
    const ref = db.doc(this.workingMemoryPath(workspaceId, sessionId));
    const snap = await ref.get();
    if (!snap.exists) return false;
    await ref.delete();
    return true;
  }

  public async listActiveWorkingMemories(workspaceId: string): Promise<WorkingMemoryEntity[]> {
    const snap = await db.collection(`workspaces/${workspaceId}/workingMemory`).get();
    const now = new Date().toISOString();
    const active: WorkingMemoryEntity[] = [];

    for (const doc of snap.docs) {
      const data = doc.data() as unknown as WorkingMemoryEntity;
      if (data.expiresAt && data.expiresAt < now) {
        await db.doc(this.workingMemoryPath(workspaceId, data.sessionId)).delete();
      } else {
        active.push(data);
      }
    }
    return active;
  }

  // ===========================================================================
  // 2. EPISODIC MEMORY (Past Campaigns, Experiments, Decisions, Outcomes)
  // ===========================================================================

  private episodicCollection(workspaceId: string): string {
    return `workspaces/${workspaceId}/episodicMemory`;
  }

  public async saveEpisode(episode: EpisodicMemoryEntity): Promise<EpisodicMemoryEntity> {
    const path = `${this.episodicCollection(episode.workspaceId)}/${episode.episodeId}`;
    await db.doc(path).set(episode as any);
    return episode;
  }

  public async getEpisode(
    workspaceId: string,
    episodeId: string
  ): Promise<EpisodicMemoryEntity | null> {
    const snap = await db.doc(`${this.episodicCollection(workspaceId)}/${episodeId}`).get();
    if (!snap.exists) return null;
    return snap.data() as unknown as EpisodicMemoryEntity;
  }

  public async listEpisodes(
    workspaceId: string,
    options?: {
      department?: string;
      activityType?: EpisodicMemoryEntity['activityType'];
      limit?: number;
    }
  ): Promise<EpisodicMemoryEntity[]> {
    const snap = await db.collection(this.episodicCollection(workspaceId)).get();
    let episodes = snap.docs.map((d) => d.data() as unknown as EpisodicMemoryEntity);

    if (options?.department) {
      episodes = episodes.filter(
        (e) => e.department.toLowerCase() === options.department!.toLowerCase()
      );
    }
    if (options?.activityType) {
      episodes = episodes.filter((e) => e.activityType === options.activityType);
    }

    // Sort newest first
    episodes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (options?.limit && options.limit > 0) {
      episodes = episodes.slice(0, options.limit);
    }

    return episodes;
  }

  // ===========================================================================
  // 3. STRATEGIC MEMORY (Objectives, Priorities, Positioning, Shifts, Exclusions)
  // ===========================================================================

  private strategicCollection(workspaceId: string): string {
    return `workspaces/${workspaceId}/strategicMemoryItems`;
  }

  public async saveStrategicItem(
    item: StrategicMemoryItemEntity
  ): Promise<StrategicMemoryItemEntity> {
    const path = `${this.strategicCollection(item.workspaceId)}/${item.itemId}`;
    await db.doc(path).set(item as any);
    return item;
  }

  public async getStrategicItem(
    workspaceId: string,
    itemId: string
  ): Promise<StrategicMemoryItemEntity | null> {
    const snap = await db.doc(`${this.strategicCollection(workspaceId)}/${itemId}`).get();
    if (!snap.exists) return null;
    return snap.data() as unknown as StrategicMemoryItemEntity;
  }

  public async listStrategicItems(
    workspaceId: string,
    options?: {
      type?: StrategicMemoryItemEntity['type'];
      status?: StrategicMemoryItemEntity['status'];
    }
  ): Promise<StrategicMemoryItemEntity[]> {
    const snap = await db.collection(this.strategicCollection(workspaceId)).get();
    let items = snap.docs.map((d) => d.data() as unknown as StrategicMemoryItemEntity);

    if (options?.type) {
      items = items.filter((i) => i.type === options.type);
    }
    if (options?.status) {
      items = items.filter((i) => i.status === options.status);
    }

    // Sort newest first
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return items;
  }

  public async supersedeStrategicItem(
    workspaceId: string,
    oldItemId: string,
    newItem: StrategicMemoryItemEntity
  ): Promise<{ oldItem: StrategicMemoryItemEntity; newItem: StrategicMemoryItemEntity }> {
    const old = await this.getStrategicItem(workspaceId, oldItemId);
    if (!old) {
      throw new Error(`STRATEGIC_ITEM_NOT_FOUND: Item '${oldItemId}' not found.`);
    }

    const now = new Date().toISOString();
    const updatedOld: StrategicMemoryItemEntity = {
      ...old,
      status: 'superseded',
      supersededBy: newItem.itemId,
      updatedAt: now,
    };

    await this.saveStrategicItem(updatedOld);
    const savedNew = await this.saveStrategicItem(newItem);

    return { oldItem: updatedOld, newItem: savedNew };
  }
}

export const memoryRepository = new MemoryRepository();
