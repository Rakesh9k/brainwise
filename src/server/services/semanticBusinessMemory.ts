/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { businessProfileRepository } from '../repositories/businessProfileRepository';
import { productRepository } from '../repositories/productRepository';
import { brandIdentityRepository } from '../repositories/brandIdentityRepository';
import { memoryRepository } from '../repositories/memoryRepository';
import { sharedBusinessContextService } from './sharedBusinessContextService';
import type {
  FactProvenanceItem,
  StrategicMemoryItemEntity,
  RetrievedKnowledgeItem,
  KnowledgeSourceCitation,
} from '../types/api';

export type MemoryFactProvenance = 'USER_CONFIRMED' | 'CALCULATION' | 'OBSERVED_EVIDENCE' | 'AI_INFERRED';

export interface SemanticFactItem {
  factId: string;
  workspaceId: string;
  category: 'BUSINESS_IDENTITY' | 'PRODUCT_CATALOG' | 'BRAND_RULE' | 'CUSTOMER_INSIGHT' | 'COMPETITIVE_INTEL' | 'STRATEGIC_ANGLE';
  subject: string; // e.g. "Monsoon Malabar Single Estate Blend"
  predicate: string; // e.g. "hasPrice" | "hasRoastWindow" | "prohibitsDiscount"
  objectValue: string | number; // e.g. 450 | "48 hours" | "Never offer 50% clearance"
  provenance: MemoryFactProvenance;
  confidence: number; // 0.0 to 1.0
  createdAt: string;
  lastVerifiedAt: string;
  status: 'ACTIVE' | 'SUPERSEDED' | 'CONFLICT_PENDING_REVIEW' | 'STALE';
  vectorEmbedding?: number[];
  departmentOrigin?: string;
  citationSource?: string;
}

export interface FactConflictResolution {
  hasConflict: boolean;
  conflictType?: 'PRICE_DISCREPANCY' | 'VALUE_PROP_CONTRADICTION' | 'FORBIDDEN_RULE_OVERRIDE' | 'DUPLICATE_INCOMPATIBLE';
  existingFact?: SemanticFactItem;
  incomingFact: SemanticFactItem;
  resolution: 'OVERRIDE_APPROVED' | 'INCOMING_BLOCKED' | 'FLAGGED_FOR_HUMAN_REVIEW';
  rationale: string;
}

export interface AntiFatigueRecord {
  theme: string;
  angle: string;
  department: 'BrandStudio' | 'GrowthDirector' | 'IdeaIntelligence' | 'Outreach';
  usedAt: string;
  usageCountLast30Days: number;
  isFatigued: boolean;
  alternativeSuggestion?: string;
}

export class SemanticBusinessMemory {
  private factStore = new Map<string, SemanticFactItem[]>(); // workspaceId -> facts

  /**
   * Deterministic 8-dimensional semantic embedding vector generator
   */
  private generateEmbedding(text: string): number[] {
    const clean = text.toLowerCase();
    const dims = [
      /\b(coffee\w*|beverage\w*|roast\w*|bean\w*|brew\w*|estate\w*)\b/.test(clean) ? 1.0 : 0.0,
      /\b(price\w*|pricing\w*|cost\w*|inr|usd|margin\w*|aov|discount\w*)\b/.test(clean) ? 1.0 : 0.0,
      /\b(fresh\w*|dispatch\w*|harvest\w*|48 hours|guarantee\w*)\b/.test(clean) ? 1.0 : 0.0,
      /\b(b2b|corporate|wholesale|gifting|csv|gst)\b/.test(clean) ? 1.0 : 0.0,
      /\b(competitor\w*|alternative\w*|rival\w*|incumbent\w*|switch\w*)\b/.test(clean) ? 1.0 : 0.0,
      /\b(brand\w*|voice\w*|artisan\w*|single-estate\w*|luxury|direct)\b/.test(clean) ? 1.0 : 0.0,
      /\b(churn\w*|retention\w*|subscriber\w*|lapsing|complaint\w*)\b/.test(clean) ? 1.0 : 0.0,
      /\b(saas|software|cloud|api|deterministic|observability)\b/.test(clean) ? 1.0 : 0.0,
    ];
    return dims;
  }

  /**
   * Computes cosine similarity between two 8-dim embedding vectors
   */
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dot += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Stores a structured business fact with conflict detection and provenance enforcement
   */
  public async recordFact(fact: SemanticFactItem): Promise<FactConflictResolution> {
    const list = this.factStore.get(fact.workspaceId) || [];
    fact.vectorEmbedding = fact.vectorEmbedding || this.generateEmbedding(`${fact.subject} ${fact.predicate} ${fact.objectValue}`);

    // Check for existing facts with matching subject and predicate
    const existing = list.find(
      (f) => f.status === 'ACTIVE' && f.subject.toLowerCase() === fact.subject.toLowerCase() && f.predicate === fact.predicate
    );

    if (existing) {
      // Conflict Detection Logic
      if (existing.objectValue !== fact.objectValue) {
        // Rule 1: USER_CONFIRMED always trumps AI_INFERRED
        if (existing.provenance === 'USER_CONFIRMED' && fact.provenance === 'AI_INFERRED') {
          return {
            hasConflict: true,
            conflictType: 'PRICE_DISCREPANCY',
            existingFact: existing,
            incomingFact: fact,
            resolution: 'INCOMING_BLOCKED',
            rationale: `AI_INFERRED fact cannot override USER_CONFIRMED truth (${existing.subject} ${existing.predicate} is verified as "${existing.objectValue}").`,
          };
        }

        // Rule 2: Newer USER_CONFIRMED overrides older USER_CONFIRMED
        if (fact.provenance === 'USER_CONFIRMED') {
          existing.status = 'SUPERSEDED';
          list.push(fact);
          this.factStore.set(fact.workspaceId, list);
          sharedBusinessContextService.invalidateCache(fact.workspaceId);
          return {
            hasConflict: true,
            conflictType: 'PRICE_DISCREPANCY',
            existingFact: existing,
            incomingFact: fact,
            resolution: 'OVERRIDE_APPROVED',
            rationale: `USER_CONFIRMED fact updated from "${existing.objectValue}" to "${fact.objectValue}".`,
          };
        }

        // Rule 3: Competing AI inferences flagged for review
        fact.status = 'CONFLICT_PENDING_REVIEW';
        list.push(fact);
        this.factStore.set(fact.workspaceId, list);
        return {
          hasConflict: true,
          conflictType: 'PRICE_DISCREPANCY',
          existingFact: existing,
          incomingFact: fact,
          resolution: 'FLAGGED_FOR_HUMAN_REVIEW',
          rationale: 'Multiple contradictory inferred data points detected. Flagged for founder verification.',
        };
      }
    }

    // No conflict, accept clean fact
    list.push(fact);
    this.factStore.set(fact.workspaceId, list);
    return {
      hasConflict: false,
      incomingFact: fact,
      resolution: 'OVERRIDE_APPROVED',
      rationale: 'Clean fact recorded with zero conflicts.',
    };
  }

  /**
   * Semantic hybrid search combining dense vector similarity with recency decay
   */
  public async semanticSearch(params: {
    workspaceId: string;
    query: string;
    limit?: number;
    referenceDate?: string;
  }): Promise<Array<{ fact: SemanticFactItem; relevanceScore: number; recencyWeight: number }>> {
    const { workspaceId, query, limit = 5, referenceDate = new Date().toISOString() } = params;
    const refTime = new Date(referenceDate).getTime();
    const queryVec = this.generateEmbedding(query);

    const facts = this.factStore.get(workspaceId) || [];
    const scored: Array<{ fact: SemanticFactItem; relevanceScore: number; recencyWeight: number }> = [];

    for (const f of facts) {
      if (f.status !== 'ACTIVE') continue;

      const vecSim = this.cosineSimilarity(queryVec, f.vectorEmbedding || this.generateEmbedding(`${f.subject} ${f.objectValue}`));

      // Recency decay: half-life = 90 days for market/competitive, 365 days for brand
      const ageDays = Math.max(0, (refTime - new Date(f.lastVerifiedAt).getTime()) / (1000 * 60 * 60 * 24));
      const halfLifeDays = f.category === 'BRAND_RULE' ? 365 : 90;
      const recencyWeight = Math.exp((-Math.LN2 * ageDays) / halfLifeDays);

      // Lexical stem overlap
      const stopWords = new Set(['what', 'this', 'that', 'with', 'from', 'your', 'have', 'does']);
      const queryWords = query
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter((w) => w.length > 3 && !stopWords.has(w));

      let matchCount = 0;
      const targetText = `${f.subject} ${f.predicate} ${f.objectValue}`.toLowerCase();
      for (const w of queryWords) {
        const stem = w.substring(0, 5);
        if (targetText.includes(stem)) matchCount++;
      }
      const lexicalScore = queryWords.length > 0 ? matchCount / queryWords.length : 0;
      const combinedScore = Math.round((vecSim * 0.4 + lexicalScore * 0.6) * recencyWeight * 100) / 100;

      if (combinedScore > 0.05 || lexicalScore > 0) {
        scored.push({ fact: f, relevanceScore: combinedScore, recencyWeight: Math.round(recencyWeight * 100) / 100 });
      }
    }

    scored.sort((a, b) => b.relevanceScore - a.relevanceScore);
    return scored.slice(0, limit);
  }

  /**
   * Detects stale facts requiring founder re-verification
   */
  public detectStaleFacts(workspaceId: string, maxAgeDays = 60): SemanticFactItem[] {
    const facts = this.factStore.get(workspaceId) || [];
    const now = Date.now();
    const stale: SemanticFactItem[] = [];

    for (const f of facts) {
      if (f.status !== 'ACTIVE') continue;
      const ageDays = (now - new Date(f.lastVerifiedAt).getTime()) / (1000 * 60 * 60 * 24);
      if (ageDays > maxAgeDays && f.category !== 'BRAND_RULE') {
        f.status = 'STALE';
        stale.push(f);
      }
    }
    return stale;
  }

  /**
   * Anti-Fatigue Guardrail: Records campaign angle usage and detects angle exhaustion
   */
  public async recordAngleUsage(params: {
    workspaceId: string;
    theme: string;
    angle: string;
    department: AntiFatigueRecord['department'];
  }): Promise<AntiFatigueRecord> {
    const { workspaceId, theme, angle, department } = params;

    // Record in profile strategic memory via repository
    const updatedProfile = await businessProfileRepository.recordStrategicAngle(
      workspaceId,
      angle,
      theme,
      department as any
    );

    const now = new Date().toISOString();
    const storedAngle = updatedProfile.strategicMemory.usedAngles.find(
      (a) => a.theme.toLowerCase() === theme.toLowerCase() || a.angle.toLowerCase() === angle.toLowerCase()
    );
    const usageCount = storedAngle?.frequency || 1;
    const isFatigued = updatedProfile.strategicMemory.fatiguedThemes.includes(theme) || usageCount >= 3;

    return {
      theme,
      angle,
      department,
      usedAt: now,
      usageCountLast30Days: usageCount,
      isFatigued,
      alternativeSuggestion: isFatigued
        ? `Theme "${theme}" has been deployed ${usageCount} times in 30 days. Rotate to secondary angle (e.g. B2B Corporate Gifting or Direct-Trade Sourcing).`
        : undefined,
    };
  }
}

export const semanticBusinessMemory = new SemanticBusinessMemory();
