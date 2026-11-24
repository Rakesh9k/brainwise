/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'node:crypto';
import { db } from '../db/firestore';
import type { EvidenceRecord, ResearchCapability } from '../types/evidence';

export class EvidenceLakeRepository {
  /**
   * Generates a deterministic deduplication fingerprint for evidence.
   */
  public generateFingerprint(workspaceId: string, capability: string, sourceKey: string): string {
    const raw = `${workspaceId}:${capability}:${sourceKey.trim().toLowerCase()}`;
    return crypto.createHash('sha256').update(raw).digest('hex').substring(0, 24);
  }

  /**
   * Saves a single evidence record with deduplication check.
   */
  public async saveEvidence(
    evidence: EvidenceRecord
  ): Promise<{ record: EvidenceRecord; isDuplicate: boolean }> {
    const evidenceRef = db.doc<EvidenceRecord>(
      `workspaces/${evidence.workspaceId}/evidence_lake/${evidence.evidenceId}`
    );

    // Check if duplicate fingerprint already exists
    const coll = db.collection<EvidenceRecord>(`workspaces/${evidence.workspaceId}/evidence_lake`);
    const existingSnap = await coll.where('fingerprint', '==', evidence.fingerprint).limit(1).get();

    if (existingSnap.docs.length > 0) {
      return { record: existingSnap.docs[0].data()!, isDuplicate: true };
    }

    await evidenceRef.set(evidence);
    return { record: evidence, isDuplicate: false };
  }

  /**
   * Batch saves evidence records, returning stats.
   */
  public async saveBatch(
    workspaceId: string,
    records: EvidenceRecord[]
  ): Promise<{ savedCount: number; duplicateCount: number }> {
    let savedCount = 0;
    let duplicateCount = 0;

    for (const record of records) {
      const result = await this.saveEvidence({ ...record, workspaceId });
      if (result.isDuplicate) {
        duplicateCount++;
      } else {
        savedCount++;
      }
    }

    return { savedCount, duplicateCount };
  }

  /**
   * Finds evidence by ID.
   */
  public async findById(workspaceId: string, evidenceId: string): Promise<EvidenceRecord | null> {
    const snap = await db
      .doc<EvidenceRecord>(`workspaces/${workspaceId}/evidence_lake/${evidenceId}`)
      .get();
    return snap.exists && snap.data() ? snap.data()! : null;
  }

  /**
   * Retrieves all evidence records matching a given research capability.
   */
  public async findByCapability(
    workspaceId: string,
    capability: ResearchCapability,
    options?: { limit?: number; minConfidence?: number; activeOnly?: boolean }
  ): Promise<EvidenceRecord[]> {
    const query = db
      .collection<EvidenceRecord>(`workspaces/${workspaceId}/evidence_lake`)
      .where('capability', '==', capability) as any;

    const snap = await query.get();
    let records = snap.docs
      .map((d: any) => d.data())
      .filter((d: any): d is EvidenceRecord => Boolean(d));

    const now = new Date().toISOString();

    if (options?.activeOnly) {
      records = records.filter((r: EvidenceRecord) => !r.expiresAt || r.expiresAt > now);
    }

    if (options?.minConfidence !== undefined) {
      records = records.filter((r: EvidenceRecord) => r.confidence >= options.minConfidence!);
    }

    records.sort(
      (a: EvidenceRecord, b: EvidenceRecord) =>
        new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime()
    );

    if (options?.limit && records.length > options.limit) {
      records = records.slice(0, options.limit);
    }

    return records;
  }

  /**
   * Retrieves evidence connected to a specific entity (e.g. competitorId, productId, campaignId)
   * across ANY of the 10 capabilities.
   */
  public async findCrossCapabilityEvidence(
    workspaceId: string,
    relatedEntityId: string
  ): Promise<EvidenceRecord[]> {
    const coll = db.collection<EvidenceRecord>(`workspaces/${workspaceId}/evidence_lake`);
    const snap = await coll.where('relatedEntityId', '==', relatedEntityId).get();

    const records = snap.docs.map((d) => d.data()).filter((d): d is EvidenceRecord => Boolean(d));

    records.sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime());
    return records;
  }

  /**
   * Lists all evidence records in the workspace lake with optional capability filtering.
   */
  public async listAll(
    workspaceId: string,
    options?: { capabilities?: ResearchCapability[]; limit?: number }
  ): Promise<EvidenceRecord[]> {
    const coll = db.collection<EvidenceRecord>(`workspaces/${workspaceId}/evidence_lake`);
    const snap = await coll.get();

    let records = snap.docs.map((d) => d.data()).filter((d): d is EvidenceRecord => Boolean(d));

    if (options?.capabilities && options.capabilities.length > 0) {
      const allowed = new Set(options.capabilities);
      records = records.filter((r) => allowed.has(r.capability));
    }

    records.sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime());

    if (options?.limit && records.length > options.limit) {
      records = records.slice(0, options.limit);
    }

    return records;
  }

  /**
   * Prunes stale expired records from the evidence lake.
   */
  public async pruneExpired(workspaceId: string): Promise<number> {
    const now = new Date().toISOString();
    const snap = await db
      .collection<EvidenceRecord>(`workspaces/${workspaceId}/evidence_lake`)
      .get();

    let deleted = 0;
    for (const doc of snap.docs) {
      const data = doc.data();
      if (data?.expiresAt && data.expiresAt <= now) {
        await db.doc(`workspaces/${workspaceId}/evidence_lake/${doc.id}`).delete();
        deleted++;
      }
    }

    return deleted;
  }
}

export const evidenceLakeRepository = new EvidenceLakeRepository();
