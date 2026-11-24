/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ConnectorSyncStatus =
  | 'CONNECTED'
  | 'AUTHENTICATED'
  | 'SYNCING'
  | 'SYNCHRONIZED'
  | 'PARTIALLY_SYNCHRONIZED'
  | 'FAILED'
  | 'DISCONNECTED'
  | 'PERMISSION_EXPIRED';

export interface ConnectorHealthEntity {
  connectorId: string;
  workspaceId: string;
  provider: 'STRIPE' | 'SHOPIFY' | 'GA4' | 'GOOGLE_ADS' | 'META_ADS' | 'MANUAL_CSV' | 'GENERIC_WEBHOOK';
  status: ConnectorSyncStatus;
  authValid: boolean;
  lastSuccessfulSyncAt: string | null;
  lastAttemptedSyncAt: string | null;
  dataFreshnessHours: number | null;
  recordsReceived: number;
  recordsProcessed: number;
  recordsRejected: number;
  recordsDuplicated: number;
  missingFieldsDetected: string[];
  historicalCoverageStart: string | null;
  historicalCoverageEnd: string | null;
  unresolvedErrors: Array<{
    code: string;
    message: string;
    timestamp: string;
    retryCount: number;
  }>;
}

export type ReconciliationDiscrepancyType =
  | 'MISSING_TRANSACTION'
  | 'DUPLICATE_TRANSACTION'
  | 'CONFLICTING_AMOUNT'
  | 'UNPROCESSED_REFUND'
  | 'MISSING_ATTRIBUTION'
  | 'INCOMPLETE_CUSTOMER_IDENTITY'
  | 'DELAYED_SYNC_TIMESTAMP';

export interface ReconciliationDiscrepancy {
  discrepancyId: string;
  type: ReconciliationDiscrepancyType;
  sourceRecordId: string;
  sourceAmount?: number;
  importedAmount?: number;
  currency?: string;
  detectedAt: string;
  details: string;
  status: 'OPEN' | 'RESOLVED' | 'WAIVED_BY_USER';
}

export interface ReconciliationReport {
  reconciliationId: string;
  workspaceId: string;
  period: { startDate: string; endDate: string };
  reconciledAt: string;
  sourceRecordCount: number;
  importedRecordCount: number;
  matchedRecordCount: number;
  sourceTotalGross: number;
  importedTotalGross: number;
  varianceAmount: number;
  reconciliationState: 'RECONCILED_MATCH' | 'DISCREPANCY_DETECTED' | 'UNRECONCILED_GAPS' | 'PENDING_SOURCE_DATA';
  discrepancies: ReconciliationDiscrepancy[];
}
