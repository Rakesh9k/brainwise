/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createHash } from 'crypto';
import { db } from '../db/firestore';
import type { NormalizedDataRecord, ExternalDataPackage } from './types';
import { dataHealthService } from '../services/analytics/dataHealthService';
import type { ConnectorHealthEntity } from '../services/analytics/dataIngestionTypes';

/**
 * Computes a deterministic SHA-256 fingerprint for a data record
 * to guarantee atomic, idempotent deduplication across ingestion syncs.
 */
export function computeRecordFingerprint(
  workspaceId: string,
  integrationId: string,
  category: string,
  sourceTimestamp?: string,
  sourceReference?: string,
  metrics?: Record<string, any>
): string {
  const content = [
    workspaceId,
    integrationId,
    category,
    sourceTimestamp || '',
    sourceReference || '',
    metrics ? JSON.stringify(metrics) : '',
  ].join('|');
  return createHash('sha256').update(content).digest('hex').substring(0, 24);
}

/**
 * Centralized Data Ingestion & Normalization Layer
 * Manages raw external data normalization, provenance tracking, deduplication,
 * and organization-isolated storage.
 */
export class DataIngestionService {
  /**
   * Persists normalized records into the workspace-isolated subcollection.
   * Guarantees idempotent deduplication via deterministic fingerprint IDs.
   */
  public async ingestRecords(
    workspaceId: string,
    integrationId: string,
    dataPackage: ExternalDataPackage
  ): Promise<{ ingestedCount: number; duplicateCount: number }> {
    let ingestedCount = 0;
    let duplicateCount = 0;

    for (const record of dataPackage.records) {
      const fp = computeRecordFingerprint(
        workspaceId,
        integrationId,
        record.category,
        record.sourceTimestamp,
        record.sourceReference || record.recordId,
        record.metrics
      );
      const recordDocId = `rec_fp_${fp}`;

      const recordRef = db.doc<NormalizedDataRecord>(
        `workspaces/${workspaceId}/imported_data/${recordDocId}`
      );

      const existing = await recordRef.get();
      if (existing.exists) {
        duplicateCount++;
        continue;
      }

      await recordRef.set({
        ...record,
        recordId: recordDocId,
        workspaceId,
        integrationId,
      });
      ingestedCount++;
    }

    // Map integrationId to ConnectorHealth provider if compatible
    const providerMap: Record<string, ConnectorHealthEntity['provider']> = {
      'google-analytics-4': 'GA4',
      'meta-instagram': 'META_ADS',
      'stripe': 'STRIPE',
      'shopify': 'SHOPIFY',
    };

    const healthProvider = providerMap[integrationId];
    if (healthProvider) {
      try {
        await dataHealthService.recordSyncResult({
          workspaceId,
          provider: healthProvider,
          status: dataPackage.state === 'CONNECTED' ? 'SYNCHRONIZED' : 'PARTIALLY_SYNCHRONIZED',
          authValid: dataPackage.state !== 'PERMISSION_REQUIRED' && dataPackage.state !== 'UNCONNECTED',
          recordsReceived: dataPackage.records.length,
          recordsProcessed: ingestedCount,
          recordsRejected: 0,
          recordsDuplicated: duplicateCount,
        });
      } catch (err) {
        console.warn(`[DATA_INGESTION] Non-fatal health tracking error for ${integrationId}:`, err);
      }
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
