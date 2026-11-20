/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from '../db/firestore';
import type { AiMemoryEntity, MemoryCategory } from './types';

export class MemoryEngine {
  /**
   * Persists a categorized business memory under strict multi-tenant workspace isolation.
   */
  public async createMemory(params: {
    workspaceId: string;
    category: MemoryCategory;
    content: string;
    source: string;
    confidence?: number;
    approvalStatus?: AiMemoryEntity['approvalStatus'];
    tags?: string[];
    createdBy: string;
  }): Promise<AiMemoryEntity> {
    const {
      workspaceId,
      category,
      content,
      source,
      confidence = 1.0,
      approvalStatus = 'APPROVED',
      tags = [],
      createdBy,
    } = params;

    const memoryId = `mem_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const now = new Date().toISOString();

    // Deduplication check: verify if an identical memory already exists
    const existing = await this.listMemories(workspaceId, category);
    const duplicate = existing.find(
      (m) => m.content.trim().toLowerCase() === content.trim().toLowerCase()
    );

    if (duplicate) {
      // Return existing without duplicating
      return duplicate;
    }

    const memory: AiMemoryEntity = {
      memoryId,
      workspaceId,
      category,
      content: content.trim(),
      source,
      confidence,
      approvalStatus,
      tags,
      createdBy,
      createdAt: now,
      updatedAt: now,
    };

    await db.doc<AiMemoryEntity>(`workspaces/${workspaceId}/aiMemories/${memoryId}`).set(memory);
    return memory;
  }

  /**
   * Lists memories for a given workspace, optionally filtered by category.
   */
  public async listMemories(
    workspaceId: string,
    category?: MemoryCategory
  ): Promise<AiMemoryEntity[]> {
    let query = db
      .collection<AiMemoryEntity>(`workspaces/${workspaceId}/aiMemories`)
      .orderBy('createdAt', 'desc')
      .limit(50);

    if (category) {
      query = query.where('category', '==', category);
    }

    const snap = await query.get();
    return snap.docs.map((d) => d.data()).filter((d): d is AiMemoryEntity => Boolean(d));
  }

  /**
   * Retrieves task-relevant memories based on semantic keywords rather than dumping all memory.
   */
  public async retrieveRelevantMemories(params: {
    workspaceId: string;
    keywords?: string[];
    limit?: number;
  }): Promise<AiMemoryEntity[]> {
    const { workspaceId, keywords = [], limit = 5 } = params;
    const all = await this.listMemories(workspaceId);

    if (keywords.length === 0) {
      // Prioritize approved business facts and decisions
      return all
        .filter((m) => m.category === 'APPROVED_BUSINESS_FACT' || m.category === 'DECISION')
        .slice(0, limit);
    }

    const lowerKeywords = keywords.map((k) => k.toLowerCase());
    const scored = all.map((mem) => {
      let score = 0;
      const lower = mem.content.toLowerCase();
      for (const kw of lowerKeywords) {
        if (lower.includes(kw)) score += 2;
      }
      if (mem.approvalStatus === 'APPROVED') score += 1;
      return { mem, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored
      .filter((s) => s.score > 0)
      .slice(0, limit)
      .map((s) => s.mem);
  }

  /**
   * Updates an existing memory (e.g. user corrections or approval status changes).
   */
  public async updateMemory(
    workspaceId: string,
    memoryId: string,
    patch: Partial<Pick<AiMemoryEntity, 'content' | 'approvalStatus' | 'confidence' | 'tags'>>
  ): Promise<AiMemoryEntity> {
    const ref = db.doc<AiMemoryEntity>(`workspaces/${workspaceId}/aiMemories/${memoryId}`);
    const snap = await ref.get();
    if (!snap.exists || !snap.data()) {
      throw new Error(`Memory '${memoryId}' not found in workspace '${workspaceId}'`);
    }

    const updatedPatch = {
      ...patch,
      updatedAt: new Date().toISOString(),
    };

    await ref.update(updatedPatch);
    const updatedSnap = await ref.get();
    return updatedSnap.data()!;
  }

  /**
   * Deletes a memory item.
   */
  public async deleteMemory(workspaceId: string, memoryId: string): Promise<void> {
    await db.doc<AiMemoryEntity>(`workspaces/${workspaceId}/aiMemories/${memoryId}`).delete();
  }
}

export const memoryEngine = new MemoryEngine();
