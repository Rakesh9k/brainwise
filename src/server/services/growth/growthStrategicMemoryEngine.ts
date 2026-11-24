/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from '../../db/firestore';
import type {
  CategorizedStrategicMemoryRecord,
  EvidenceQuality,
  MemoryCategory,
  OutcomeClassification,
} from './growthTypes';

export const FATIGUE_THRESHOLD = 3;

export interface IngestLearningEventParams {
  eventId: string;
  workspaceId: string;
  category: MemoryCategory;
  entityId: string;
  theme: string;
  observation: string;
  hypothesis?: string;
  outcomeClassification: OutcomeClassification;
  executionSuccess: boolean;
  evidenceQuality: EvidenceQuality;
  sampleSize?: number;
  applicabilityConditions?: string[];
}

export class GrowthStrategicMemoryEngine {
  /**
   * Idempotently ingests a learning event into the 10-category strategic memory
   */
  public async ingestLearningEvent(
    params: IngestLearningEventParams
  ): Promise<{
    record: CategorizedStrategicMemoryRecord;
    isDuplicate: boolean;
    promotedToBusinessBrain: boolean;
  }> {
    const {
      eventId,
      workspaceId,
      category,
      entityId,
      theme,
      observation,
      hypothesis,
      outcomeClassification,
      executionSuccess,
      evidenceQuality,
      sampleSize = 1,
      applicabilityConditions = [],
    } = params;

    const memoryId = `mem_${eventId}`;
    const memoryRef = db.doc<CategorizedStrategicMemoryRecord>(
      `workspaces/${workspaceId}/strategicMemories/${memoryId}`
    );

    // 1. Idempotency Check
    const existingSnap = await memoryRef.get();
    if (existingSnap.exists && existingSnap.data()) {
      return {
        record: existingSnap.data()!,
        isDuplicate: true,
        promotedToBusinessBrain: false,
      };
    }

    const now = new Date().toISOString();

    // 2. Compute Bounded Confidence Score
    // Confidence is a bounded function of evidence quality and outcome clarity
    let confidenceScore: number;
    if (evidenceQuality === 'DIRECTLY_MEASURED') confidenceScore = 0.95;
    else if (evidenceQuality === 'INDEPENDENTLY_VERIFIED') confidenceScore = 0.85;
    else if (evidenceQuality === 'USER_REPORTED') confidenceScore = 0.70;
    else if (evidenceQuality === 'INFERRED') confidenceScore = 0.40;
    else confidenceScore = 0.20;

    // Adjust confidence if sample size is small
    if (sampleSize < 10 && confidenceScore > 0.6) {
      confidenceScore = Number((confidenceScore * 0.75).toFixed(2));
    }

    // 3. Compute Category-Specific Fatigue
    // Check previous memories in this category and theme
    const previousMemoriesSnap = await db
      .collection<CategorizedStrategicMemoryRecord>(`workspaces/${workspaceId}/strategicMemories`)
      .where('category', '==', category)
      .where('theme', '==', theme)
      .get();

    let consecutiveFailures = 0;
    if (outcomeClassification === 'NEGATIVE') {
      consecutiveFailures = 1;
      for (const doc of previousMemoriesSnap.docs) {
        const d = doc.data();
        if (d?.outcomeClassification === 'NEGATIVE') {
          consecutiveFailures += 1;
        }
      }
    }

    const isFatigued = consecutiveFailures >= FATIGUE_THRESHOLD;

    const record: CategorizedStrategicMemoryRecord = {
      memoryId,
      workspaceId,
      category,
      entityId,
      theme,
      observation,
      hypothesis,
      outcomeClassification,
      executionSuccess,
      evidenceQuality,
      sampleSize,
      confidenceScore,
      applicabilityConditions,
      fatigueScore: consecutiveFailures,
      isFatigued,
      createdAt: now,
      lastValidatedAt: now,
      version: 1,
    };

    await memoryRef.set(record);

    // 4. Evidence-First Promotion to Business Brain
    // ONLY appropriately qualified evidence (DIRECTLY_MEASURED or INDEPENDENTLY_VERIFIED)
    // with outcome POSITIVE or confirmed NEGATIVE can be written to Business Brain.
    let promotedToBusinessBrain = false;
    if (
      (evidenceQuality === 'DIRECTLY_MEASURED' || evidenceQuality === 'INDEPENDENTLY_VERIFIED') &&
      sampleSize >= 10 &&
      (outcomeClassification === 'POSITIVE' || outcomeClassification === 'NEGATIVE')
    ) {
      promotedToBusinessBrain = true;
      await db.collection(`workspaces/${workspaceId}/businessFacts`).add({
        factId: `fct_${Date.now()}_${category.toLowerCase()}`,
        workspaceId,
        category: `VALIDATED_${category}`,
        attribute: `Learning: ${theme}`,
        value: observation,
        provenance: 'USER_CONFIRMED',
        confidence: confidenceScore,
        createdAt: now,
      });
    }

    return {
      record,
      isDuplicate: false,
      promotedToBusinessBrain,
    };
  }

  /**
   * Retrieves active strategic memories, filtering fatigued themes and exclusions
   */
  public async getActiveMemories(workspaceId: string): Promise<{
    memories: CategorizedStrategicMemoryRecord[];
    fatiguedThemesByCategory: Record<MemoryCategory, string[]>;
  }> {
    const snap = await db
      .collection<CategorizedStrategicMemoryRecord>(`workspaces/${workspaceId}/strategicMemories`)
      .get();

    const memories = snap.docs
      .map((d) => d.data())
      .filter((m): m is CategorizedStrategicMemoryRecord => Boolean(m));

    const fatiguedThemesByCategory: Record<MemoryCategory, string[]> = {
      CHANNEL_MEMORY: [],
      AUDIENCE_MEMORY: [],
      OFFER_MEMORY: [],
      CREATIVE_ANGLE_MEMORY: [],
      CAMPAIGN_FORMAT_MEMORY: [],
      EXPERIMENT_MEMORY: [],
      GROWTH_LEARNING: [],
      OPERATIONAL_LEARNING: [],
      FINANCIAL_LEARNING: [],
      MARKET_COMPETITIVE_LEARNING: [],
    };

    for (const m of memories) {
      if (m.isFatigued && !fatiguedThemesByCategory[m.category].includes(m.theme)) {
        fatiguedThemesByCategory[m.category].push(m.theme);
      }
    }

    return {
      memories,
      fatiguedThemesByCategory,
    };
  }
}

export const growthStrategicMemoryEngine = new GrowthStrategicMemoryEngine();
