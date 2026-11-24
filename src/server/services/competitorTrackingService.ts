/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from '../db/firestore';
import { evidenceLakeRepository } from '../repositories/evidenceLakeRepository';
import type { CompetitorSnapshot, CompetitorDiff, EvidenceRecord } from '../types/evidence';

export class CompetitorTrackingService {
  /**
   * Captures and stores a time-stamped snapshot of a competitor's pricing, features, and offers.
   * If a previous snapshot exists, automatically computes the diff and logs evidence.
   */
  public async captureAndAnalyze(
    workspaceId: string,
    snapshotData: {
      competitorId: string;
      competitorName: string;
      pricingTiers: Array<{
        tierName: string;
        price: number;
        billingPeriod: 'monthly' | 'yearly';
        features: string[];
      }>;
      heroOffer: string;
      valueProposition: string;
      keyFeatures: string[];
      sourceUrl?: string;
    }
  ): Promise<{ currentSnapshot: CompetitorSnapshot; detectedDiffs: CompetitorDiff[] }> {
    const now = new Date().toISOString();
    const snapshotId = `snap_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const currentSnapshot: CompetitorSnapshot = {
      snapshotId,
      workspaceId,
      competitorId: snapshotData.competitorId,
      competitorName: snapshotData.competitorName,
      pricingTiers: snapshotData.pricingTiers,
      heroOffer: snapshotData.heroOffer,
      valueProposition: snapshotData.valueProposition,
      keyFeatures: snapshotData.keyFeatures,
      capturedAt: now,
    };

    // 1. Fetch the most recent prior snapshot
    const priorSnapshot = await this.getLatestSnapshot(workspaceId, snapshotData.competitorId);

    // 2. Persist the current snapshot
    await db
      .doc<CompetitorSnapshot>(`workspaces/${workspaceId}/competitor_snapshots/${snapshotId}`)
      .set(currentSnapshot);

    // 3. Compare with prior snapshot to detect material changes
    const detectedDiffs: CompetitorDiff[] = [];
    if (priorSnapshot) {
      detectedDiffs.push(...this.computeDiffs(priorSnapshot, currentSnapshot));
    }

    // 4. Ingest snapshot and diffs into the Shared Evidence Lake
    await this.persistEvidenceRecords(
      workspaceId,
      currentSnapshot,
      detectedDiffs,
      snapshotData.sourceUrl
    );

    return { currentSnapshot, detectedDiffs };
  }

  /**
   * Computes granular diffs between two competitor snapshots.
   */
  public computeDiffs(prior: CompetitorSnapshot, current: CompetitorSnapshot): CompetitorDiff[] {
    const diffs: CompetitorDiff[] = [];
    const now = new Date().toISOString();

    // Check pricing tier shifts
    const priorTierMap = new Map(prior.pricingTiers.map((t) => [t.tierName.toLowerCase(), t]));
    const currentTierMap = new Map(current.pricingTiers.map((t) => [t.tierName.toLowerCase(), t]));

    for (const [tierName, currentTier] of currentTierMap.entries()) {
      const priorTier = priorTierMap.get(tierName);
      if (!priorTier) {
        diffs.push({
          diffId: `diff_${Date.now()}_new_${Math.random().toString(36).substring(2, 6)}`,
          workspaceId: current.workspaceId,
          competitorId: current.competitorId,
          competitorName: current.competitorName,
          changeType: 'NEW_TIER',
          previousValue: 'None',
          newValue: `${currentTier.tierName}: ₹${currentTier.price}/${currentTier.billingPeriod}`,
          summary: `${current.competitorName} introduced a new '${currentTier.tierName}' tier at ₹${currentTier.price}.`,
          detectedAt: now,
          severity: 'MEDIUM',
        });
      } else if (currentTier.price > priorTier.price) {
        const delta = Math.round(((currentTier.price - priorTier.price) / priorTier.price) * 100);
        diffs.push({
          diffId: `diff_${Date.now()}_up_${Math.random().toString(36).substring(2, 6)}`,
          workspaceId: current.workspaceId,
          competitorId: current.competitorId,
          competitorName: current.competitorName,
          changeType: 'PRICE_INCREASE',
          previousValue: `₹${priorTier.price}`,
          newValue: `₹${currentTier.price}`,
          summary: `${current.competitorName} increased ${currentTier.tierName} price by ${delta}% (from ₹${priorTier.price} to ₹${currentTier.price}).`,
          detectedAt: now,
          severity: delta >= 20 ? 'HIGH' : 'MEDIUM',
        });
      } else if (currentTier.price < priorTier.price) {
        const delta = Math.round(((priorTier.price - currentTier.price) / priorTier.price) * 100);
        diffs.push({
          diffId: `diff_${Date.now()}_down_${Math.random().toString(36).substring(2, 6)}`,
          workspaceId: current.workspaceId,
          competitorId: current.competitorId,
          competitorName: current.competitorName,
          changeType: 'PRICE_DECREASE',
          previousValue: `₹${priorTier.price}`,
          newValue: `₹${currentTier.price}`,
          summary: `${current.competitorName} dropped ${currentTier.tierName} price by ${delta}% (from ₹${priorTier.price} to ₹${currentTier.price}).`,
          detectedAt: now,
          severity: 'HIGH',
        });
      }
    }

    // Check Hero Offer or Positioning shift
    if (
      prior.heroOffer &&
      current.heroOffer &&
      prior.heroOffer.trim().toLowerCase() !== current.heroOffer.trim().toLowerCase()
    ) {
      diffs.push({
        diffId: `diff_${Date.now()}_offer_${Math.random().toString(36).substring(2, 6)}`,
        workspaceId: current.workspaceId,
        competitorId: current.competitorId,
        competitorName: current.competitorName,
        changeType: 'OFFER_CHANGED',
        previousValue: prior.heroOffer,
        newValue: current.heroOffer,
        summary: `${current.competitorName} shifted landing page hero offer to: "${current.heroOffer}"`,
        detectedAt: now,
        severity: 'MEDIUM',
      });
    }

    // Check new features added
    const priorFeatureSet = new Set(prior.keyFeatures.map((f) => f.toLowerCase().trim()));
    const newFeatures = current.keyFeatures.filter(
      (f) => !priorFeatureSet.has(f.toLowerCase().trim())
    );

    if (newFeatures.length > 0) {
      diffs.push({
        diffId: `diff_${Date.now()}_feat_${Math.random().toString(36).substring(2, 6)}`,
        workspaceId: current.workspaceId,
        competitorId: current.competitorId,
        competitorName: current.competitorName,
        changeType: 'FEATURE_ADDED',
        previousValue: prior.keyFeatures.join(', '),
        newValue: newFeatures.join(', '),
        summary: `${current.competitorName} announced new capabilities: ${newFeatures.join(', ')}`,
        detectedAt: now,
        severity: 'LOW',
      });
    }

    return diffs;
  }

  /**
   * Retrieves the most recent prior snapshot for a competitor.
   */
  public async getLatestSnapshot(
    workspaceId: string,
    competitorId: string
  ): Promise<CompetitorSnapshot | null> {
    const coll = db.collection<CompetitorSnapshot>(
      `workspaces/${workspaceId}/competitor_snapshots`
    );
    const snap = await coll.where('competitorId', '==', competitorId).get();

    if (snap.empty) return null;

    const snapshots = snap.docs
      .map((d) => d.data())
      .filter((d): d is CompetitorSnapshot => Boolean(d));

    snapshots.sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime());
    return snapshots[0] || null;
  }

  /**
   * Persists competitor snapshots and diffs into the unified Evidence Lake.
   */
  private async persistEvidenceRecords(
    workspaceId: string,
    snapshot: CompetitorSnapshot,
    diffs: CompetitorDiff[],
    sourceUrl?: string
  ): Promise<void> {
    const records: EvidenceRecord[] = [];
    const now = new Date().toISOString();

    // Baseline pricing snapshot record
    const minPrice = Math.min(...snapshot.pricingTiers.map((t) => t.price));
    records.push({
      evidenceId: `ev_comp_${snapshot.snapshotId}`,
      workspaceId,
      capability: 'COMPETITOR_TRACKING',
      sourceType: 'COMPETITOR_SNAPSHOT',
      title: `${snapshot.competitorName} Pricing Benchmark`,
      domainOrPlatform: 'competitor_tracking',
      sourceUrl:
        sourceUrl || `https://${snapshot.competitorName.toLowerCase().replace(/\s+/g, '')}.com`,
      rawExcerpt: `${snapshot.competitorName} offers ${snapshot.pricingTiers.length} tiers starting at ₹${minPrice}. Value proposition: ${snapshot.valueProposition}`,
      extractedMetrics: {
        starterPrice: minPrice,
        tierCount: snapshot.pricingTiers.length,
        heroOffer: snapshot.heroOffer,
      },
      provenance: 'AI_INFERRED',
      confidence: 0.95,
      detectedAt: now,
      relatedEntityId: snapshot.competitorId,
      fingerprint: evidenceLakeRepository.generateFingerprint(
        workspaceId,
        'COMPETITOR_TRACKING',
        `${snapshot.competitorId}_${snapshot.snapshotId}`
      ),
      tags: ['competitor', 'pricing', snapshot.competitorName.toLowerCase()],
    });

    // Material diff records (triggering proactive opportunities/risks)
    for (const diff of diffs) {
      records.push({
        evidenceId: `ev_diff_${diff.diffId}`,
        workspaceId,
        capability: 'COMPETITOR_TRACKING',
        sourceType: 'COMPETITOR_DIFF',
        title: `${snapshot.competitorName} ${diff.changeType}`,
        domainOrPlatform: 'competitor_diff_engine',
        rawExcerpt: diff.summary,
        extractedMetrics: {
          changeType: diff.changeType,
          previousValue: diff.previousValue,
          newValue: diff.newValue,
          severity: diff.severity,
        },
        provenance: 'AI_INFERRED',
        confidence: 0.98,
        detectedAt: now,
        relatedEntityId: snapshot.competitorId,
        fingerprint: evidenceLakeRepository.generateFingerprint(
          workspaceId,
          'COMPETITOR_DIFF',
          diff.diffId
        ),
        tags: ['competitor_move', diff.changeType.toLowerCase(), diff.severity.toLowerCase()],
      });
    }

    await evidenceLakeRepository.saveBatch(workspaceId, records);
  }
}

export const competitorTrackingService = new CompetitorTrackingService();
