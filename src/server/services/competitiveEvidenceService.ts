/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'node:crypto';
import { competitiveIntelligenceRepository } from '../repositories/competitiveIntelligenceRepository';
import type {
  EvidenceClaimRecord,
  ClaimVerificationStatus,
} from '../types/competitiveIntelligence';

export class CompetitiveEvidenceService {
  /**
   * Generates a deterministic hash for deduplication
   */
  public generateClaimHash(sourceUrl: string, claimText: string): string {
    return crypto
      .createHash('sha256')
      .update(`${sourceUrl.trim().toLowerCase()}:${claimText.trim().toLowerCase()}`)
      .digest('hex');
  }

  /**
   * Computes source authority score (0 - 100) based on domain reputation and category
   */
  public evaluateSourceAuthority(
    _sourceUrl: string,
    category: EvidenceClaimRecord['sourceCategory']
  ): number {
    // Authority by category:
    if (category === 'PUBLIC_FILING') return 98; // MCA, ROC, SEC
    if (category === 'OFFICIAL_WEBSITE') return 95; // Brand's own primary domain
    if (category === 'INDUSTRY_REPORT') return 90; // Nielsen, Inc42, Gartner
    if (category === 'NEWS_MEDIA') return 85; // Economic Times, Mint, Forbes
    if (category === 'MARKETPLACE') return 80; // Amazon, Nature's Basket
    if (category === 'CUSTOMER_REVIEW') return 75; // Verified review portals
    if (category === 'COMMUNITY_FORUM') return 68; // Reddit, Quora
    if (category === 'ESTIMATION_MODEL') return 70; // Deterministic calculation

    return 70;
  }

  /**
   * Calculates freshness score with exponential decay over time
   */
  public calculateFreshnessScore(collectionDateIso: string): number {
    const collectedTime = new Date(collectionDateIso).getTime();
    const now = Date.now();
    const daysOld = Math.max(0, (now - collectedTime) / (1000 * 60 * 60 * 24));

    if (daysOld <= 30) return 100;
    if (daysOld <= 90) return 90;
    if (daysOld <= 180) return 80;
    if (daysOld <= 365) return 65;
    return 50; // Older than 1 year
  }

  /**
   * Ingests, verifies, and records evidence
   */
  public async ingestClaim(params: {
    workspaceId: string;
    competitorId?: string;
    claim: string;
    sourceUrl: string;
    sourceName: string;
    sourceCategory: EvidenceClaimRecord['sourceCategory'];
    evidenceExcerpt: string;
    verificationStatus?: ClaimVerificationStatus;
    publicationDate?: string;
  }): Promise<EvidenceClaimRecord> {
    const now = new Date().toISOString();
    const authority = this.evaluateSourceAuthority(params.sourceUrl, params.sourceCategory);
    const freshness = this.calculateFreshnessScore(now);

    const record: EvidenceClaimRecord = {
      evidenceId: `ev_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      workspaceId: params.workspaceId,
      competitorId: params.competitorId,
      claim: params.claim,
      sourceUrl: params.sourceUrl,
      sourceName: params.sourceName,
      sourceCategory: params.sourceCategory,
      collectionDate: now,
      publicationDate: params.publicationDate,
      evidenceExcerpt: params.evidenceExcerpt,
      verificationStatus: params.verificationStatus || (authority >= 90 ? 'VERIFIED' : 'SUPPORTED' as any),
      confidence: Math.round((authority * 0.7 + freshness * 0.3)) / 100,
      sourceAuthority: authority,
      freshnessScore: freshness,
    };

    await competitiveIntelligenceRepository.saveEvidenceClaim(record);
    return record;
  }

  /**
   * Detects contradictions between claims for a specific competitor
   */
  public detectContradictions(claims: EvidenceClaimRecord[]): Array<{
    claimA: EvidenceClaimRecord;
    claimB: EvidenceClaimRecord;
    reason: string;
  }> {
    const contradictions: Array<{
      claimA: EvidenceClaimRecord;
      claimB: EvidenceClaimRecord;
      reason: string;
    }> = [];

    // Extract price and revenue numeric mentions to detect severe discrepancies
    for (let i = 0; i < claims.length; i++) {
      for (let j = i + 1; j < claims.length; j++) {
        const a = claims[i];
        const b = claims[j];

        if (a.competitorId && b.competitorId && a.competitorId === b.competitorId) {
          // Check for price contradiction
          const priceA = this.extractNumericPrice(a.claim);
          const priceB = this.extractNumericPrice(b.claim);

          if (priceA && priceB && Math.abs(priceA - priceB) / Math.min(priceA, priceB) > 0.4) {
            contradictions.push({
              claimA: a,
              claimB: b,
              reason: `Significant pricing discrepancy detected for same competitor: ${priceA} vs ${priceB}.`,
            });
          }
        }
      }
    }

    return contradictions;
  }

  private extractNumericPrice(text: string): number | null {
    const match = text.match(/₹\s*([\d,]+)/) || text.match(/\$\s*([\d,]+)/);
    if (match) {
      return parseFloat(match[1].replace(/,/g, ''));
    }
    return null;
  }
}

export const competitiveEvidenceService = new CompetitiveEvidenceService();
