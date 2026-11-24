/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { businessProfileRepository } from '../repositories/businessProfileRepository';
import { productRepository } from '../repositories/productRepository';
import { brandIdentityRepository } from '../repositories/brandIdentityRepository';
import { documentRepository } from '../repositories/documentRepository';
import { knowledgeGraphService } from './knowledgeGraphService';
import { memoryService } from './memoryService';
import type { GraphNodeType, KnowledgeSourceCitation, RetrievedKnowledgeItem } from '../types/api';

export interface HybridRetrievalQuery {
  workspaceId: string;
  query: string;
  taskType?: 'MARKETING' | 'GROWTH' | 'STRATEGY' | 'BRANDING' | 'FINANCIAL' | 'GENERAL';
  department?: string;
  filters?: {
    entityTypes?: GraphNodeType[];
    verificationStatus?: 'VERIFIED' | 'INFERRED' | 'UNKNOWN';
    tags?: string[];
  };
  maxResults?: number;
  tokenBudget?: number;
  includeRelationships?: boolean;
  includeDocuments?: boolean;
}

export class HybridRetrievalService {
  /**
   * Primary entry point for hybrid knowledge search
   */
  public async search(query: HybridRetrievalQuery): Promise<{
    items: RetrievedKnowledgeItem[];
    citations: KnowledgeSourceCitation[];
    totalResults: number;
    tokenCount: number;
    tokenBudget: number;
  }> {
    const {
      workspaceId,
      query: queryString,
      taskType = 'GENERAL',
      filters,
      maxResults = 10,
      tokenBudget = 2500,
      includeRelationships = true,
      includeDocuments = true,
    } = query;

    const candidates: RetrievedKnowledgeItem[] = [];

    // 1. Structured Ingestion of Verified Facts & Entities
    const profile = await businessProfileRepository.getProfile(workspaceId);
    const products = await productRepository.listProducts(workspaceId);
    const services = await productRepository.listServices(workspaceId);
    const brand = await brandIdentityRepository.getLatest(workspaceId);
    const episodes = await memoryService.listEpisodes(workspaceId, { limit: 15 });
    const strategicItems = await memoryService.listStrategicItems(workspaceId, {
      status: 'active',
    });

    // A. Index Business Identity
    if (profile && profile.businessName) {
      candidates.push(
        this.buildCandidate({
          id: `biz_${workspaceId}`,
          type: 'business',
          title: profile.businessName,
          content: `${profile.businessName} - ${profile.tagline || ''}. Industry: ${profile.industry || 'General'}. Location: ${profile.location || 'Global'}. Stage: ${profile.stage || 'Growing'}. Target: ${profile.targetAudience || ''}. Value Proposition: ${profile.valueProposition || ''}`,
          sourceType: 'USER_CONFIRMED_FACT',
          sourceTitle: 'Business Identity Profile',
          confidence: 1.0,
          verificationStatus: 'VERIFIED',
          timestamp: profile.lastUpdated || new Date().toISOString(),
        })
      );
    }

    // B. Index Products & Services
    for (const prod of products) {
      candidates.push(
        this.buildCandidate({
          id: prod.productId,
          type: 'product',
          title: prod.name,
          content: `Product: ${prod.name} | Category: ${prod.category} | Price: $${prod.price} | Pricing: ${prod.pricingStructure || 'one-time'} | Description: ${prod.description || ''} | Features: ${(prod.features || []).join(', ')} | Benefits: ${(prod.benefits || []).join(', ')} | SKU: ${prod.sku || ''}`,
          sourceType: prod.source === 'USER_CONFIRMED' ? 'USER_CONFIRMED_FACT' : 'DOCUMENT',
          sourceTitle: `Product: ${prod.name}`,
          confidence: prod.source === 'USER_CONFIRMED' ? 1.0 : 0.85,
          verificationStatus: prod.source === 'USER_CONFIRMED' ? 'VERIFIED' : 'INFERRED',
          timestamp: prod.updatedAt || prod.createdAt,
        })
      );
    }

    for (const srv of services) {
      candidates.push(
        this.buildCandidate({
          id: srv.serviceId,
          type: 'service',
          title: srv.name,
          content: `Service: ${srv.name} | Category: ${srv.category} | Price: $${srv.price} | Duration: ${srv.duration || 'N/A'} | Target: ${srv.targetCustomer || ''} | Description: ${srv.description || ''}`,
          sourceType: srv.source === 'USER_CONFIRMED' ? 'USER_CONFIRMED_FACT' : 'DOCUMENT',
          sourceTitle: `Service: ${srv.name}`,
          confidence: srv.source === 'USER_CONFIRMED' ? 1.0 : 0.85,
          verificationStatus: srv.source === 'USER_CONFIRMED' ? 'VERIFIED' : 'INFERRED',
          timestamp: srv.updatedAt || srv.createdAt,
        })
      );
    }

    // C. Index Brand Guidelines
    if (brand) {
      candidates.push(
        this.buildCandidate({
          id: brand.brandIdentityId,
          type: 'brand_guideline',
          title: `${brand.brandName} Brand Guidelines`,
          content: `Voice: ${(brand.voice || []).join(', ')} | Tone: ${brand.tone || ''} | Words to Use: ${(brand.wordsToUse || []).join(', ')} | Words to Avoid: ${(brand.wordsToAvoid || []).join(', ')} | Approved Claims: ${(brand.approvedClaims || []).join('; ')} | Restricted Claims: ${(brand.restrictedClaims || []).join('; ')} | USP: ${brand.uniqueSellingProposition || ''}`,
          sourceType: 'USER_CONFIRMED_FACT',
          sourceTitle: 'Brand Identity Guidelines',
          confidence: 1.0,
          verificationStatus: 'VERIFIED',
          timestamp: brand.updatedAt || brand.createdAt || new Date().toISOString(),
        })
      );
    }

    // D. Index Episodic Memory
    for (const ep of episodes) {
      candidates.push(
        this.buildCandidate({
          id: ep.episodeId,
          type: 'decision',
          title: ep.title,
          content: `Historical Activity (${ep.department}): ${ep.title}. Summary: ${ep.summary}. Learnings: ${ep.learnings.join('; ')}. Outcomes: ${JSON.stringify(ep.outcomes || {})}`,
          sourceType: 'EPISODE',
          sourceTitle: `Episodic Record: ${ep.title}`,
          confidence: 0.95,
          verificationStatus: 'VERIFIED',
          timestamp: ep.createdAt,
        })
      );
    }

    // E. Index Strategic Memory
    for (const strat of strategicItems) {
      candidates.push(
        this.buildCandidate({
          id: strat.itemId,
          type: 'business_goal',
          title: strat.title || strat.description || 'Strategic Goal',
          content: `Strategy (${strat.type}): ${strat.title}. Description: ${strat.description}. Rationale: ${strat.rationale || ''}`,
          sourceType: 'USER_CONFIRMED_FACT',
          sourceTitle: `Strategic Priority: ${strat.title}`,
          confidence: strat.confidence,
          verificationStatus: strat.verificationStatus,
          timestamp: strat.updatedAt || strat.createdAt || new Date().toISOString(),
        })
      );
    }

    // F. Index Stored Business Documents
    if (includeDocuments) {
      const docs = await documentRepository.listDocuments(workspaceId);
      for (const doc of docs) {
        const docSummary =
          doc.extractedSummary || (doc as any).extractedData
            ? JSON.stringify(doc.extractedSummary || (doc as any).extractedData).slice(0, 500)
            : doc.name;
        candidates.push(
          this.buildCandidate({
            id: doc.documentId,
            type: 'document',
            title: doc.name,
            content: `Document: ${doc.name} (${doc.type}). Extracted Insights: ${docSummary}`,
            sourceType: 'DOCUMENT',
            sourceTitle: doc.name,
            documentId: doc.documentId,
            excerpt: docSummary,
            confidence: (doc.confidenceScore || 80) / 100,
            verificationStatus: 'INFERRED',
            timestamp: doc.uploadedAt,
          })
        );
      }
    }

    // 2. Score Candidates with Hybrid Weights:
    // Combined Score = (0.5 * Semantic/Keyword Relevance) + (0.3 * Task Affinity) + (0.2 * Freshness)
    const scoredCandidates: RetrievedKnowledgeItem[] = [];
    const queryTokens = this.tokenize(queryString);

    for (const item of candidates) {
      // Filter by verification status if requested
      if (filters?.verificationStatus && item.verificationStatus !== filters.verificationStatus) {
        continue;
      }
      // Filter by entity type if requested
      if (filters?.entityTypes && filters.entityTypes.length > 0) {
        if (!filters.entityTypes.includes(item.type as GraphNodeType)) {
          continue;
        }
      }

      // Keyword / Semantic Relevance
      const textTokens = this.tokenize(`${item.title} ${item.content}`);
      const lexicalScore = this.computeOverlapScore(queryTokens, textTokens);

      // Task Affinity weighting
      const affinityScore = this.computeTaskAffinity(item.type, taskType);

      // Freshness decay (within last 30 days = 1.0, scales down smoothly)
      const freshnessScore = item.freshnessScore;

      // Combined score
      const combinedScore = lexicalScore * 0.5 + affinityScore * 0.3 + freshnessScore * 0.2;

      if (combinedScore > 0.05 || queryTokens.length === 0) {
        scoredCandidates.push({
          ...item,
          relevanceScore: Math.round(lexicalScore * 100) / 100,
          combinedScore: Math.round(combinedScore * 100) / 100,
        });
      }
    }

    // Sort by combined score descending
    scoredCandidates.sort((a, b) => b.combinedScore - a.combinedScore);

    // 3. Relationship Expansion (Graph Traversal)
    if (includeRelationships) {
      for (const topItem of scoredCandidates.slice(0, 5)) {
        const relations = await knowledgeGraphService.getRelationships(workspaceId, topItem.id);
        if (relations.length > 0) {
          topItem.relationships = relations.map((rel) => ({
            relation: rel.relationshipType,
            targetName: rel.target.name || '',
            targetType: rel.target.type,
          }));
        }
      }
    }

    // 4. Token Budget Clamping & Duplicate Suppression
    const finalItems: RetrievedKnowledgeItem[] = [];
    const citations: KnowledgeSourceCitation[] = [];
    const seenTitles = new Set<string>();
    let currentTokens = 0;

    for (const candidate of scoredCandidates) {
      if (seenTitles.has(candidate.title.toLowerCase())) continue;
      seenTitles.add(candidate.title.toLowerCase());

      const itemTokens = Math.ceil(candidate.content.length / 4);
      if (currentTokens + itemTokens > tokenBudget && finalItems.length >= 1) {
        break;
      }

      finalItems.push(candidate);
      citations.push(candidate.sourceCitation);
      currentTokens += itemTokens;

      if (finalItems.length >= maxResults) break;
    }

    return {
      items: finalItems,
      citations,
      totalResults: finalItems.length,
      tokenCount: currentTokens,
      tokenBudget,
    };
  }

  private buildCandidate(params: {
    id: string;
    type: string;
    title: string;
    content: string;
    sourceType: KnowledgeSourceCitation['sourceType'];
    sourceTitle: string;
    documentId?: string;
    excerpt?: string;
    confidence: number;
    verificationStatus: 'VERIFIED' | 'INFERRED' | 'UNKNOWN';
    timestamp: string;
  }): RetrievedKnowledgeItem {
    const ageDays = Math.max(
      0,
      (Date.now() - new Date(params.timestamp).getTime()) / (1000 * 60 * 60 * 24)
    );
    const freshnessScore = Math.max(0.2, 1.0 - (ageDays / 90) * 0.8);

    return {
      id: params.id,
      type: params.type,
      title: params.title,
      content: params.content,
      relevanceScore: 0,
      freshnessScore: Math.round(freshnessScore * 100) / 100,
      combinedScore: 0,
      sourceCitation: {
        sourceId: `src_${params.id}`,
        sourceType: params.sourceType,
        title: params.sourceTitle,
        documentId: params.documentId,
        excerpt: params.excerpt || params.content.slice(0, 150),
        confidence: params.confidence,
        verifiedAt: params.timestamp,
      },
      verificationStatus: params.verificationStatus,
    };
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2);
  }

  private computeOverlapScore(queryTokens: string[], textTokens: string[]): number {
    if (queryTokens.length === 0) return 0.5; // baseline neutral
    let matches = 0;
    const textSet = new Set(textTokens);

    for (const q of queryTokens) {
      if (textSet.has(q)) {
        matches++;
      } else {
        // Partial substring match
        for (const t of textTokens) {
          if (t.includes(q) || q.includes(t)) {
            matches += 0.5;
            break;
          }
        }
      }
    }

    return Math.min(1.0, matches / queryTokens.length);
  }

  private computeTaskAffinity(
    entityType: string,
    taskType: HybridRetrievalQuery['taskType'] = 'GENERAL'
  ): number {
    switch (taskType) {
      case 'MARKETING':
      case 'BRANDING':
        if (
          entityType === 'brand_guideline' ||
          entityType === 'product' ||
          entityType === 'customer_segment'
        ) {
          return 1.0;
        }
        if (entityType === 'business' || entityType === 'campaign') return 0.8;
        return 0.3;

      case 'FINANCIAL':
        if (
          entityType === 'product' ||
          entityType === 'service' ||
          entityType === 'business_goal'
        ) {
          return 1.0;
        }
        if (entityType === 'business') return 0.7;
        return 0.2;

      case 'STRATEGY':
      case 'GROWTH':
        if (
          entityType === 'business_goal' ||
          entityType === 'decision' ||
          entityType === 'business'
        ) {
          return 1.0;
        }
        if (
          entityType === 'product' ||
          entityType === 'customer_segment' ||
          entityType === 'competitor'
        ) {
          return 0.85;
        }
        return 0.5;

      case 'GENERAL':
      default:
        return 0.6;
    }
  }
}

export const hybridRetrievalService = new HybridRetrievalService();
