/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'node:crypto';
import { MetricCalculator } from './metricCalculator';
import type {
  ReconciliationDiscrepancy,
  ReconciliationReport,
} from './dataIngestionTypes';

export interface SourceIngestionRecord {
  sourceId: string;
  source: string;
  amount: number;
  currency: string;
  timestamp: string;
  customerId?: string;
  type: 'PAYMENT' | 'REFUND' | 'DISCOUNT';
  channel?: string;
}

export interface NormalizedImportedRecord {
  importId: string;
  externalSourceId: string;
  source: string;
  amount: number;
  currency: string;
  timestamp: string;
  customerId?: string;
  type: 'PAYMENT' | 'REFUND' | 'DISCOUNT';
  channel?: string;
  reconciliationStatus?: 'MATCHED' | 'DISCREPANT' | 'UNMATCHED';
}

export class DataReconciliationEngine {
  /**
   * Reconciles external source transactions against imported ledger records.
   * Strictly adheres to the rule: NEVER automatically alter financial records to force totals to match.
   */
  public reconcile(params: {
    workspaceId: string;
    period: { startDate: string; endDate: string };
    sourceRecords: SourceIngestionRecord[];
    importedRecords: NormalizedImportedRecord[];
  }): ReconciliationReport {
    const { workspaceId, period, sourceRecords, importedRecords } = params;
    const now = new Date().toISOString();
    const reconciliationId = `rec_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

    const discrepancies: ReconciliationDiscrepancy[] = [];
    const importedBySourceId = new Map<string, NormalizedImportedRecord[]>();

    for (const imp of importedRecords) {
      const list = importedBySourceId.get(imp.externalSourceId) || [];
      list.push(imp);
      importedBySourceId.set(imp.externalSourceId, list);
    }

    let sourceTotalGross = 0;
    let matchedCount = 0;
    const checkedImportIds = new Set<string>();

    for (const src of sourceRecords) {
      if (src.type === 'PAYMENT') {
        sourceTotalGross += src.amount;
      }

      const matchingImports = importedBySourceId.get(src.sourceId);

      if (!matchingImports || matchingImports.length === 0) {
        discrepancies.push({
          discrepancyId: `disc_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
          type: src.type === 'REFUND' ? 'UNPROCESSED_REFUND' : 'MISSING_TRANSACTION',
          sourceRecordId: src.sourceId,
          sourceAmount: src.amount,
          currency: src.currency,
          detectedAt: now,
          details: `Source record ${src.sourceId} of type ${src.type} was not found in imported dataset.`,
          status: 'OPEN',
        });
        continue;
      }

      if (matchingImports.length > 1) {
        discrepancies.push({
          discrepancyId: `disc_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
          type: 'DUPLICATE_TRANSACTION',
          sourceRecordId: src.sourceId,
          sourceAmount: src.amount,
          importedAmount: matchingImports.reduce((acc, m) => acc + m.amount, 0),
          currency: src.currency,
          detectedAt: now,
          details: `Multiple imported entries (${matchingImports.length}) mapped to single source ID ${src.sourceId}.`,
          status: 'OPEN',
        });
      }

      const primary = matchingImports[0];
      checkedImportIds.add(primary.importId);

      // Check amount matching
      if (primary.amount !== src.amount) {
        discrepancies.push({
          discrepancyId: `disc_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
          type: 'CONFLICTING_AMOUNT',
          sourceRecordId: src.sourceId,
          sourceAmount: src.amount,
          importedAmount: primary.amount,
          currency: src.currency,
          detectedAt: now,
          details: `Amount mismatch: source was ${src.amount} ${src.currency}, imported was ${primary.amount} ${primary.currency}.`,
          status: 'OPEN',
        });
      } else {
        matchedCount++;
      }

      // Check attribution & customer identity
      if (src.type === 'PAYMENT' && !primary.channel) {
        discrepancies.push({
          discrepancyId: `disc_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
          type: 'MISSING_ATTRIBUTION',
          sourceRecordId: src.sourceId,
          detectedAt: now,
          details: `Payment transaction ${src.sourceId} has no assigned marketing channel or UTM attribution.`,
          status: 'OPEN',
        });
      }

      if (!primary.customerId) {
        discrepancies.push({
          discrepancyId: `disc_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
          type: 'INCOMPLETE_CUSTOMER_IDENTITY',
          sourceRecordId: src.sourceId,
          detectedAt: now,
          details: `Transaction ${src.sourceId} lacks a resolved customer identifier.`,
          status: 'OPEN',
        });
      }
    }

    let importedTotalGross = 0;
    for (const imp of importedRecords) {
      if (imp.type === 'PAYMENT') {
        importedTotalGross += imp.amount;
      }
    }

    sourceTotalGross = MetricCalculator.round(sourceTotalGross, 2);
    importedTotalGross = MetricCalculator.round(importedTotalGross, 2);
    const varianceAmount = MetricCalculator.round(importedTotalGross - sourceTotalGross, 2);

    let reconciliationState: ReconciliationReport['reconciliationState'] = 'RECONCILED_MATCH';
    if (sourceRecords.length === 0 && importedRecords.length === 0) {
      reconciliationState = 'PENDING_SOURCE_DATA';
    } else if (varianceAmount !== 0 || discrepancies.some((d) => d.type === 'CONFLICTING_AMOUNT' || d.type === 'DUPLICATE_TRANSACTION')) {
      reconciliationState = 'DISCREPANCY_DETECTED';
    } else if (discrepancies.some((d) => d.type === 'MISSING_TRANSACTION' || d.type === 'UNPROCESSED_REFUND')) {
      reconciliationState = 'UNRECONCILED_GAPS';
    }

    return {
      reconciliationId,
      workspaceId,
      period,
      reconciledAt: now,
      sourceRecordCount: sourceRecords.length,
      importedRecordCount: importedRecords.length,
      matchedRecordCount: matchedCount,
      sourceTotalGross,
      importedTotalGross,
      varianceAmount,
      reconciliationState,
      discrepancies,
    };
  }
}

export const dataReconciliationEngine = new DataReconciliationEngine();
