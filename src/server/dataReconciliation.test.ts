/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  dataReconciliationEngine,
  type SourceIngestionRecord,
  type NormalizedImportedRecord,
} from './services/analytics/dataReconciliationEngine';
import { dataHealthService } from './services/analytics/dataHealthService';

describe('PHASE 2 — DATA INGESTION & RECONCILIATION ENGINE', () => {
  it('1. Successfully reconciles exact matches between source and imported ledger', () => {
    const period = { startDate: '2026-11-01T00:00:00Z', endDate: '2026-11-30T23:59:59Z' };
    const sourceRecords: SourceIngestionRecord[] = [
      { sourceId: 'ch_1', source: 'STRIPE', amount: 100, currency: 'USD', timestamp: '2026-11-02T10:00:00Z', type: 'PAYMENT', channel: 'organic_search', customerId: 'cust_1' },
      { sourceId: 'ch_2', source: 'STRIPE', amount: 250, currency: 'USD', timestamp: '2026-11-05T12:00:00Z', type: 'PAYMENT', channel: 'paid_meta', customerId: 'cust_2' },
    ];
    const importedRecords: NormalizedImportedRecord[] = [
      { importId: 'imp_1', externalSourceId: 'ch_1', source: 'STRIPE', amount: 100, currency: 'USD', timestamp: '2026-11-02T10:00:00Z', type: 'PAYMENT', channel: 'organic_search', customerId: 'cust_1' },
      { importId: 'imp_2', externalSourceId: 'ch_2', source: 'STRIPE', amount: 250, currency: 'USD', timestamp: '2026-11-05T12:00:00Z', type: 'PAYMENT', channel: 'paid_meta', customerId: 'cust_2' },
    ];

    const report = dataReconciliationEngine.reconcile({
      workspaceId: 'ws_test_reconcile',
      period,
      sourceRecords,
      importedRecords,
    });

    assert.strictEqual(report.reconciliationState, 'RECONCILED_MATCH');
    assert.strictEqual(report.varianceAmount, 0);
    assert.strictEqual(report.matchedRecordCount, 2);
    assert.strictEqual(report.discrepancies.length, 0);
  });

  it('2. Flags discrepancy when amounts conflict without altering records', () => {
    const period = { startDate: '2026-11-01T00:00:00Z', endDate: '2026-11-30T23:59:59Z' };
    const sourceRecords: SourceIngestionRecord[] = [
      { sourceId: 'ch_3', source: 'STRIPE', amount: 500, currency: 'USD', timestamp: '2026-11-10T10:00:00Z', type: 'PAYMENT', channel: 'direct', customerId: 'cust_3' },
    ];
    const importedRecords: NormalizedImportedRecord[] = [
      { importId: 'imp_3', externalSourceId: 'ch_3', source: 'STRIPE', amount: 450, currency: 'USD', timestamp: '2026-11-10T10:00:00Z', type: 'PAYMENT', channel: 'direct', customerId: 'cust_3' },
    ];

    const report = dataReconciliationEngine.reconcile({
      workspaceId: 'ws_test_reconcile',
      period,
      sourceRecords,
      importedRecords,
    });

    assert.strictEqual(report.reconciliationState, 'DISCREPANCY_DETECTED');
    assert.strictEqual(report.varianceAmount, -50);
    assert.strictEqual(report.discrepancies.length, 1);
    assert.strictEqual(report.discrepancies[0].type, 'CONFLICTING_AMOUNT');
    assert.strictEqual(report.discrepancies[0].sourceAmount, 500);
    assert.strictEqual(report.discrepancies[0].importedAmount, 450);
  });

  it('3. Detects unprocessed refunds and missing transactions', () => {
    const period = { startDate: '2026-11-01T00:00:00Z', endDate: '2026-11-30T23:59:59Z' };
    const sourceRecords: SourceIngestionRecord[] = [
      { sourceId: 're_1', source: 'STRIPE', amount: 75, currency: 'USD', timestamp: '2026-11-12T10:00:00Z', type: 'REFUND' },
    ];
    const importedRecords: NormalizedImportedRecord[] = [];

    const report = dataReconciliationEngine.reconcile({
      workspaceId: 'ws_test_reconcile',
      period,
      sourceRecords,
      importedRecords,
    });

    assert.strictEqual(report.reconciliationState, 'UNRECONCILED_GAPS');
    assert.strictEqual(report.discrepancies[0].type, 'UNPROCESSED_REFUND');
  });

  it('4. Data Health Service refuses to label an incomplete or failing connector as fully healthy', async () => {
    const health = await dataHealthService.recordSyncResult({
      workspaceId: 'ws_test_health',
      provider: 'SHOPIFY',
      status: 'SYNCHRONIZED',
      authValid: true,
      recordsReceived: 100,
      recordsProcessed: 90,
      recordsRejected: 10, // Rejection present
      recordsDuplicated: 0,
      error: { code: 'SYNC_WARNING', message: '10 records failed validation' },
    });

    // Guardrail: must be downgraded to PARTIALLY_SYNCHRONIZED
    assert.strictEqual(health.status, 'PARTIALLY_SYNCHRONIZED');
    assert.strictEqual(health.recordsRejected, 10);
    assert.strictEqual(health.unresolvedErrors.length, 1);
  });
});
