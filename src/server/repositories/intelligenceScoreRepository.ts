/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from '../db/firestore';
import type {
  BusinessIntelligenceScore,
  IntelligenceScoreHistoryEntry,
} from '../../types/intelligenceScore';

export class IntelligenceScoreRepository {
  private getCollectionPath(workspaceId: string): string {
    return `workspaces/${workspaceId}/intelligenceScores`;
  }

  public async saveScore(score: BusinessIntelligenceScore): Promise<BusinessIntelligenceScore> {
    const coll = this.getCollectionPath(score.workspaceId);
    await db.doc<BusinessIntelligenceScore>(`${coll}/${score.scoreId}`).set(score);

    // Also persist lightweight history entry
    const dimensionScores: Record<string, number> = {};
    for (const [key, dim] of Object.entries(score.dimensions)) {
      dimensionScores[key] = dim.score;
    }

    const historyEntry: IntelligenceScoreHistoryEntry = {
      scoreId: score.scoreId,
      workspaceId: score.workspaceId,
      version: score.version,
      calculatedAt: score.calculatedAt,
      overallScore: score.overallScore,
      overallVerificationCoverage: score.overallVerificationCoverage,
      overallFreshnessScore: score.overallFreshnessScore,
      dimensionScores,
      deltaFromPrevious: score.scoreDelta?.delta,
      triggerEvent: score.triggerEvent || 'SCORE_CALCULATED',
    };

    await db
      .doc<IntelligenceScoreHistoryEntry>(
        `workspaces/${score.workspaceId}/intelligenceScoreHistory/v${score.version}`
      )
      .set(historyEntry);

    return score;
  }

  public async getLatestScore(workspaceId: string): Promise<BusinessIntelligenceScore | null> {
    const coll = this.getCollectionPath(workspaceId);
    const snap = await db
      .collection<BusinessIntelligenceScore>(coll)
      .orderBy('version', 'desc')
      .limit(1)
      .get();

    return snap.docs[0]?.data() || null;
  }

  public async listHistory(
    workspaceId: string,
    limitCount = 20
  ): Promise<IntelligenceScoreHistoryEntry[]> {
    const snap = await db
      .collection<IntelligenceScoreHistoryEntry>(
        `workspaces/${workspaceId}/intelligenceScoreHistory`
      )
      .orderBy('version', 'desc')
      .limit(limitCount)
      .get();

    return snap.docs
      .map((d) => d.data())
      .filter((d): d is IntelligenceScoreHistoryEntry => Boolean(d));
  }

  public async deleteWorkspaceScores(workspaceId: string): Promise<void> {
    const coll = this.getCollectionPath(workspaceId);
    const snap = await db.collection(coll).get();
    for (const doc of snap.docs) {
      await db.doc(`${coll}/${doc.id}`).delete();
    }
    const histSnap = await db
      .collection(`workspaces/${workspaceId}/intelligenceScoreHistory`)
      .get();
    for (const doc of histSnap.docs) {
      await db.doc(`workspaces/${workspaceId}/intelligenceScoreHistory/${doc.id}`).delete();
    }
  }
}

export const intelligenceScoreRepository = new IntelligenceScoreRepository();
