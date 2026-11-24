/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { UnifiedBrandAssetEntity, AssetCollectionEntity } from './assetLibrary';

// ==========================================
// 1. SECURITY & PERMISSIONS CONTRACTS
// ==========================================

export type WorkspaceUserRole = 'owner' | 'admin' | 'member' | 'viewer' | 'guest';

export interface SecurityAccessCheck {
  allowed: boolean;
  reason?: string;
  statusCode: 200 | 401 | 403 | 404;
}

export interface MalwareScanResult {
  isClean: boolean;
  threatsDetected: string[];
  sanitizedContent?: string;
  scanTimestamp: string;
}

export interface MagicBytesValidationResult {
  isValid: boolean;
  detectedMimeType: string;
  expectedMimeType: string;
  isForbiddenVideo: boolean;
}

// ==========================================
// 2. DATA INTEGRITY & AUDIT CONTRACTS
// ==========================================

export interface IntegrityAuditReport {
  workspaceId: string;
  totalAssetsScanned: number;
  totalCollectionsScanned: number;
  brokenStorageReferences: string[]; // assetIds with missing physical storage
  orphanedStoragePaths: string[];   // storage files not indexed in database
  duplicateChecksumGroups: Array<{
    checksumSha256: string;
    assetIds: string[];
    assetNames: string[];
  }>;
  brokenVersionLineages: string[];   // parentAssetId pointing to non-existent asset
  timestamp: string;
}

// ==========================================
// 3. PERFORMANCE BENCHMARK CONTRACTS
// ==========================================

export interface PerformanceBenchmarkMetrics {
  operationName: string;
  sampleSize: number;
  totalDurationMs: number;
  averageLatencyMs: number;
  throughputOpsPerSec: number;
  memoryUsageMb: number;
  honestConcurrencyLimit: number;
}

export interface ProductionLoadBenchmarkSummary {
  workspaceId: string;
  benchmarkDate: string;
  batch100WriteMs: number;
  list1000ReadMs: number;
  searchFilterThroughputOpsSec: number;
  memoryDeltaMb: number;
  honestyStatement: string;
}

// ==========================================
// 4. AI COST CONTROL & CACHING CONTRACTS
// ==========================================

export interface AiCostControlSummary {
  workspaceId: string;
  totalAiJobsSubmitted: number;
  cachedAnalysisHits: number;
  cacheHitRatioPct: number;
  tokensConsumedTotal: number;
  tokensAvoidedByCache: number;
  estimatedCreditsSaved: number;
  rateLimitThrottledCount: number;
}

// ==========================================
// 5. RELIABILITY & DEAD-LETTER CONTRACTS
// ==========================================

export interface DeadLetterJobEntity {
  jobId: string;
  workspaceId: string;
  jobType: string;
  payload: Record<string, unknown>;
  attempts: number;
  maxRetries: number;
  finalError: string;
  failedAt: string;
}

export interface QueueHealthStatus {
  queuedCount: number;
  processingCount: number;
  completedCount: number;
  failedCount: number;
  deadLetterCount: number;
  queueStatus: 'healthy' | 'degraded' | 'congested';
}

// ==========================================
// 6. BACKUP & DISASTER RECOVERY
// ==========================================

export interface WorkspaceDisasterRecoverySnapshot {
  snapshotId: string;
  workspaceId: string;
  createdAt: string;
  assetCount: number;
  collectionCount: number;
  assets: UnifiedBrandAssetEntity[];
  collections: AssetCollectionEntity[];
  manifestChecksumSha256: string;
}
