/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { memoryRepository } from '../repositories/memoryRepository';
import { businessProfileRepository } from '../repositories/businessProfileRepository';
import { productRepository } from '../repositories/productRepository';
import { brandIdentityRepository } from '../repositories/brandIdentityRepository';
import type {
  WorkingMemoryEntity,
  EpisodicMemoryEntity,
  StrategicMemoryItemEntity,
  BusinessProfileEntity,
  ProductEntity,
  ServiceEntity,
  BrandIdentityEntity,
} from '../types/api';

export class MemoryService {
  // ===========================================================================
  // 1. WORKING MEMORY (Session & Task Context with TTL)
  // ===========================================================================

  public async setWorkingContext(params: {
    sessionId: string;
    workspaceId: string;
    userId: string;
    currentTask?: string;
    activeWorkflow?: string;
    department?: string;
    temporaryDecisions?: Array<{ id: string; decision: string; rationale?: string }>;
    pendingApprovals?: Array<{ id: string; action: string; details: unknown }>;
    scratchpad?: Record<string, unknown>;
    ttlSeconds?: number;
  }): Promise<WorkingMemoryEntity> {
    const {
      sessionId,
      workspaceId,
      userId,
      currentTask,
      activeWorkflow,
      department,
      temporaryDecisions,
      pendingApprovals,
      scratchpad,
      ttlSeconds = 1800, // 30 minutes default
    } = params;

    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000).toISOString();

    const existing = await memoryRepository.getWorkingMemory(workspaceId, sessionId);

    const memory: WorkingMemoryEntity = {
      sessionId,
      workspaceId,
      userId,
      currentTask: currentTask !== undefined ? currentTask : existing?.currentTask,
      activeWorkflow: activeWorkflow !== undefined ? activeWorkflow : existing?.activeWorkflow,
      department: department !== undefined ? department : existing?.department,
      conversationContext: existing?.conversationContext || [],
      temporaryDecisions: temporaryDecisions
        ? temporaryDecisions.map((d) => ({ ...d, createdAt: now.toISOString() }))
        : existing?.temporaryDecisions || [],
      pendingApprovals: pendingApprovals
        ? pendingApprovals.map((a) => ({ ...a, createdAt: now.toISOString() }))
        : existing?.pendingApprovals || [],
      scratchpad:
        scratchpad !== undefined
          ? { ...existing?.scratchpad, ...scratchpad }
          : existing?.scratchpad,
      expiresAt,
      createdAt: existing?.createdAt || now.toISOString(),
      updatedAt: now.toISOString(),
    };

    return await memoryRepository.setWorkingMemory(memory);
  }

  public async getWorkingContext(
    workspaceId: string,
    sessionId: string
  ): Promise<WorkingMemoryEntity | null> {
    return await memoryRepository.getWorkingMemory(workspaceId, sessionId);
  }

  public async clearWorkingContext(workspaceId: string, sessionId: string): Promise<boolean> {
    return await memoryRepository.clearWorkingMemory(workspaceId, sessionId);
  }

  public async appendConversationTurn(params: {
    workspaceId: string;
    sessionId: string;
    userId: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    ttlSeconds?: number;
  }): Promise<WorkingMemoryEntity> {
    const { workspaceId, sessionId, userId, role, content, ttlSeconds = 1800 } = params;
    const now = new Date().toISOString();

    let memory = await memoryRepository.getWorkingMemory(workspaceId, sessionId);
    if (!memory) {
      memory = {
        sessionId,
        workspaceId,
        userId,
        conversationContext: [],
        expiresAt: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
        createdAt: now,
        updatedAt: now,
      };
    }

    const turns = memory.conversationContext || [];
    turns.push({ role, content, timestamp: now });

    // Keep recent 20 turns in working memory
    const trimmedTurns = turns.slice(-20);

    memory.conversationContext = trimmedTurns;
    memory.updatedAt = now;
    memory.expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

    return await memoryRepository.setWorkingMemory(memory);
  }

  // ===========================================================================
  // 2. BUSINESS MEMORY (Verified Ground Truth Knowledge)
  // ===========================================================================

  public async getVerifiedBusinessMemory(workspaceId: string): Promise<{
    profile: BusinessProfileEntity | null;
    products: ProductEntity[];
    services: ServiceEntity[];
    brandIdentity: BrandIdentityEntity | null;
    resourcesAndConstraints: Record<string, unknown>;
  }> {
    const profile = await businessProfileRepository.getProfile(workspaceId);
    const products = await productRepository.listProducts(workspaceId);
    const services = await productRepository.listServices(workspaceId);
    const brandIdentity = await brandIdentityRepository.getLatest(workspaceId);

    // Only return confirmed/verified facts for Business Memory
    return {
      profile,
      products: products.filter(
        (p) => p.source === 'USER_CONFIRMED' || p.source === 'DERIVED_FROM_DOC'
      ),
      services: services.filter(
        (s) => s.source === 'USER_CONFIRMED' || s.source === 'DERIVED_FROM_DOC'
      ),
      brandIdentity: brandIdentity?.approvalStatus === 'APPROVED' ? brandIdentity : null,
      resourcesAndConstraints: (profile?.resourcesAndConstraints as any) || {},
    };
  }

  // ===========================================================================
  // 3. EPISODIC MEMORY (Historical Campaigns, Decisions & Learnings)
  // ===========================================================================

  public async recordEpisode(params: {
    workspaceId: string;
    department: string;
    activityType: EpisodicMemoryEntity['activityType'];
    title: string;
    summary: string;
    learnings: string[];
    outcomes?: Record<string, unknown>;
    tags?: string[];
    relatedNodeIds?: string[];
    userAttribution?: string;
  }): Promise<EpisodicMemoryEntity> {
    const {
      workspaceId,
      department,
      activityType,
      title,
      summary,
      learnings,
      outcomes,
      tags = [],
      relatedNodeIds = [],
      userAttribution = 'Founder',
    } = params;

    const episodeId = `ep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const episode: EpisodicMemoryEntity = {
      episodeId,
      workspaceId,
      department,
      activityType,
      title,
      summary,
      learnings,
      outcomes,
      tags,
      relatedNodeIds,
      userAttribution,
      createdAt: now,
    };

    return await memoryRepository.saveEpisode(episode);
  }

  public async listEpisodes(
    workspaceId: string,
    options?: {
      department?: string;
      activityType?: EpisodicMemoryEntity['activityType'];
      limit?: number;
    }
  ): Promise<EpisodicMemoryEntity[]> {
    return await memoryRepository.listEpisodes(workspaceId, options);
  }

  public async getEpisode(
    workspaceId: string,
    episodeId: string
  ): Promise<EpisodicMemoryEntity | null> {
    return await memoryRepository.getEpisode(workspaceId, episodeId);
  }

  // ===========================================================================
  // 4. STRATEGIC MEMORY (Objectives, Priorities, Positioning, Shifts, Exclusions)
  // ===========================================================================

  public async recordStrategicItem(params: {
    workspaceId: string;
    type: StrategicMemoryItemEntity['type'];
    title: string;
    description: string;
    rationale?: string;
    confidence?: number;
    verificationStatus?: 'VERIFIED' | 'INFERRED' | 'UNKNOWN';
    verifiedBy?: string;
  }): Promise<StrategicMemoryItemEntity> {
    const {
      workspaceId,
      type,
      title,
      description,
      rationale,
      confidence = 1.0,
      verificationStatus = 'VERIFIED',
      verifiedBy = 'Founder',
    } = params;

    const itemId = `strat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const item: StrategicMemoryItemEntity = {
      itemId,
      workspaceId,
      type,
      title,
      description,
      rationale,
      status: 'active',
      confidence,
      verificationStatus,
      createdAt: now,
      updatedAt: now,
      lastVerifiedAt: now,
      verifiedBy,
    };

    return await memoryRepository.saveStrategicItem(item);
  }

  public async listStrategicItems(
    workspaceId: string,
    options?: {
      type?: StrategicMemoryItemEntity['type'];
      status?: StrategicMemoryItemEntity['status'];
    }
  ): Promise<StrategicMemoryItemEntity[]> {
    return await memoryRepository.listStrategicItems(workspaceId, options);
  }

  public async supersedeStrategicItem(
    workspaceId: string,
    oldItemId: string,
    newItemData: {
      type: StrategicMemoryItemEntity['type'];
      title: string;
      description: string;
      rationale?: string;
      verifiedBy?: string;
    }
  ): Promise<{ oldItem: StrategicMemoryItemEntity; newItem: StrategicMemoryItemEntity }> {
    const newItemId = `strat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const newItem: StrategicMemoryItemEntity = {
      itemId: newItemId,
      workspaceId,
      type: newItemData.type,
      title: newItemData.title,
      description: newItemData.description,
      rationale: newItemData.rationale,
      status: 'active',
      confidence: 1.0,
      verificationStatus: 'VERIFIED',
      createdAt: now,
      updatedAt: now,
      lastVerifiedAt: now,
      verifiedBy: newItemData.verifiedBy || 'Founder',
    };

    return await memoryRepository.supersedeStrategicItem(workspaceId, oldItemId, newItem);
  }
}

export const memoryService = new MemoryService();
