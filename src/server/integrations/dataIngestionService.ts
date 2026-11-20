/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from '../db/firestore';
import type { NormalizedDataRecord, ExternalDataPackage } from './types';

/**
 * Centralized Data Ingestion & Normalization Layer
 * Manages raw external data normalization, provenance tracking, deduplication,
 * and organization-isolated storage.
 */
export class DataIngestionService {
  /**
   * Persists normalized records into the workspace-isolated subcollection.
   */
  public async ingestRecords(
    workspaceId: string,
    integrationId: string,
    dataPackage: ExternalDataPackage
  ): Promise<{ ingestedCount: number; duplicateCount: number }> {
    let ingestedCount = 0;
    let duplicateCount = 0;

    for (const record of dataPackage.records) {
      const recordRef = db.doc<NormalizedDataRecord>(
        `workspaces/${workspaceId}/imported_data/${record.recordId}`
      );

      const existing = await recordRef.get();
      if (existing.exists) {
        duplicateCount++;
        continue;
      }

      await recordRef.set({
        ...record,
        workspaceId,
        integrationId,
      });
      ingestedCount++;
    }

    return { ingestedCount, duplicateCount };
  }

  /**
   * Retrieves normalized records for a workspace by category or integration.
   */
  public async getWorkspaceRecords(
    workspaceId: string,
    options?: { category?: string; integrationId?: string; limit?: number }
  ): Promise<NormalizedDataRecord[]> {
    let query = db.collection<NormalizedDataRecord>(`workspaces/${workspaceId}/imported_data`);

    if (options?.category) {
      query = query.where('category', '==', options.category) as any;
    }
    if (options?.integrationId) {
      query = query.where('integrationId', '==', options.integrationId) as any;
    }

    const snap = await query.get();
    let records = snap.docs
      .map((d) => d.data())
      .filter((d): d is NormalizedDataRecord => Boolean(d));

    // Sort by retrievedAt descending
    records.sort((a, b) => new Date(b.retrievedAt).getTime() - new Date(a.retrievedAt).getTime());

    if (options?.limit && records.length > options.limit) {
      records = records.slice(0, options.limit);
    }

    return records;
  }

  /**
   * Cleans up or prunes historical imported data for a disconnected integration.
   */
  public async purgeIntegrationData(workspaceId: string, integrationId: string): Promise<number> {
    const snap = await db
      .collection<NormalizedDataRecord>(`workspaces/${workspaceId}/imported_data`)
      .where('integrationId', '==', integrationId)
      .get();

    let deleted = 0;
    for (const doc of snap.docs) {
      await db.doc(`workspaces/${workspaceId}/imported_data/${doc.id}`).delete();
      deleted++;
    }
    return deleted;
  }
}

export const dataIngestionService = new DataIngestionService();
