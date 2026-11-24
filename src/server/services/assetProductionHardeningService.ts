/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'node:crypto';
import { db } from '../db/firestore';
import { brandAssetRepository } from '../repositories/brandAssetRepository';
import { storageService } from './storageService';
import { departmentEventBus } from '../events/eventBus';
import { sanitizeAiSvgMarkup } from '../../utils/logic';
import type { UnifiedBrandAssetEntity } from '../types/assetLibrary';
import type {
  WorkspaceUserRole,
  SecurityAccessCheck,
  MalwareScanResult,
  MagicBytesValidationResult,
  IntegrityAuditReport,
  PerformanceBenchmarkMetrics,
  AiCostControlSummary,
  DeadLetterJobEntity,
  QueueHealthStatus,
  WorkspaceDisasterRecoverySnapshot,
} from '../types/assetHardening';

export class AssetProductionHardeningService {
  // In-memory cost control cache keyed by SHA-256
  private analysisCache = new Map<string, { analysis: Record<string, unknown>; cachedAt: number; tokenSavings: number }>();
  private cacheStats = {
    hits: 0,
    misses: 0,
    tokensAvoided: 0,
  };

  // ==========================================
  // 1. SECURITY & RBAC ENFORCEMENT
  // ==========================================

  public checkPermission(
    role: WorkspaceUserRole,
    action: 'read' | 'write' | 'delete' | 'admin'
  ): SecurityAccessCheck {
    if (role === 'guest') {
      if (action !== 'read') {
        return {
          allowed: false,
          reason: 'PERMISSION_DENIED: Guests possess read-only privileges.',
          statusCode: 403,
        };
      }
      return { allowed: true, statusCode: 200 };
    }

    if (role === 'viewer') {
      if (action !== 'read') {
        return {
          allowed: false,
          reason: 'PERMISSION_DENIED: Viewers are restricted from mutating workspace assets.',
          statusCode: 403,
        };
      }
      return { allowed: true, statusCode: 200 };
    }

    if (role === 'member') {
      if (action === 'delete' || action === 'admin') {
        return {
          allowed: false,
          reason: 'PERMISSION_DENIED: Permanent deletion and administrative operations require admin or owner role.',
          statusCode: 403,
        };
      }
      return { allowed: true, statusCode: 200 };
    }

    // Owner and Admin have full access
    return { allowed: true, statusCode: 200 };
  }

  public assertTenantIsolation(requestWorkspaceId: string, resourceWorkspaceId?: string): void {
    if (!resourceWorkspaceId) return;
    if (requestWorkspaceId !== resourceWorkspaceId) {
      throw new Error(
        `FORBIDDEN_CROSS_TENANT_ACCESS: Request workspace '${requestWorkspaceId}' cannot access resources belonging to workspace '${resourceWorkspaceId}'`
      );
    }
  }

  public scanPayloadForMalware(content: string, _mimeType?: string): MalwareScanResult {
    const threats: string[] = [];

    // 1. Check for executable script tags
    if (/<script\b[^>]*>/i.test(content) || /<\/script>/i.test(content)) {
      threats.push('MALICIOUS_SCRIPT_TAG_INJECTION');
    }

    // 2. Check for inline DOM event handlers (e.g. onload, onerror, onclick)
    if (/on\w+\s*=/i.test(content)) {
      threats.push('INLINE_DOM_EVENT_HANDLER');
    }

    // 3. Check for javascript: pseudo-protocols
    if (/javascript\s*:/i.test(content)) {
      threats.push('JAVASCRIPT_PSEUDO_PROTOCOL');
    }

    // 4. Check for XML External Entity (XXE) attacks
    if (/<!entity\b/i.test(content) || /<!doctype\b[^>]*system/i.test(content)) {
      threats.push('XML_EXTERNAL_ENTITY_EXPANSION_ATTEMPT');
    }

    // 5. Check for base64 executable payloads or script execution in data URIs
    if (/data:\s*text\/html/i.test(content) || /data:\s*application\/javascript/i.test(content)) {
      threats.push('DATA_URI_EXECUTABLE_INJECTION');
    }

    const isClean = threats.length === 0;
    const sanitizedContent = sanitizeAiSvgMarkup(content);

    return {
      isClean,
      threatsDetected: threats,
      sanitizedContent,
      scanTimestamp: new Date().toISOString(),
    };
  }

  public validateMagicBytes(buffer: Buffer, declaredMimeType: string): MagicBytesValidationResult {
    const hex = buffer.subarray(0, 16).toString('hex').toLowerCase();
    const str = buffer.subarray(0, 64).toString('utf8');

    // 1. Strict Video Signatures check
    const isMp4 = hex.includes('66747970') || hex.includes('6d6f6f76'); // 'ftyp' or 'moov'
    const isWebm = hex.startsWith('1a45dfa3'); // Matroska / WebM EBML ID
    const isAvi = hex.startsWith('52494646') && str.includes('AVI');

    if (isMp4 || isWebm || isAvi || declaredMimeType.startsWith('video/')) {
      return {
        isValid: false,
        detectedMimeType: 'video/mp4',
        expectedMimeType: declaredMimeType,
        isForbiddenVideo: true,
      };
    }

    // 2. Allowed static formats checks
    let detected = 'application/octet-stream';
    if (hex.startsWith('89504e47')) {
      detected = 'image/png';
    } else if (hex.startsWith('ffd8ff')) {
      detected = 'image/jpeg';
    } else if (hex.startsWith('25504446')) {
      detected = 'application/pdf';
    } else if (hex.startsWith('52494646') && str.includes('WEBP')) {
      detected = 'image/webp';
    } else if (str.trim().startsWith('<svg') || str.trim().startsWith('<?xml')) {
      detected = 'image/svg+xml';
    } else if (declaredMimeType.includes('json') || (str.trim().startsWith('{') && str.trim().endsWith('}'))) {
      detected = 'application/json';
    }

    const isValid = detected === declaredMimeType || detected !== 'application/octet-stream';

    return {
      isValid,
      detectedMimeType: detected,
      expectedMimeType: declaredMimeType,
      isForbiddenVideo: false,
    };
  }

  // ==========================================
  // 2. DATA INTEGRITY & AUDITING
  // ==========================================

  public async auditWorkspaceIntegrity(workspaceId: string): Promise<IntegrityAuditReport> {
    const assets = await brandAssetRepository.listByWorkspace(workspaceId, { limit: 1000 });
    const collections = await brandAssetRepository.listCollections(workspaceId);

    const assetIdSet = new Set(assets.map((a) => a.assetId));
    const checksumMap = new Map<string, { ids: string[]; names: string[] }>();
    const brokenStorage: string[] = [];
    const brokenLineages: string[] = [];

    for (const asset of assets) {
      // Check duplicate checksums
      const chk = asset.verifiedMetadata?.checksumSha256;
      if (chk) {
        if (!checksumMap.has(chk)) {
          checksumMap.set(chk, { ids: [], names: [] });
        }
        checksumMap.get(chk)!.ids.push(asset.assetId);
        checksumMap.get(chk)!.names.push(asset.name);
      }

      // Check storage existence
      if (!asset.svgContent && !asset.fileUrl?.startsWith('data:')) {
        const local = await storageService.readLocalFile(asset.storagePath);
        if (!local) {
          brokenStorage.push(asset.assetId);
        }
      }

      // Check parent asset lineage
      if (asset.parentAssetId && !assetIdSet.has(asset.parentAssetId)) {
        brokenLineages.push(asset.assetId);
      }
    }

    const duplicateGroups = Array.from(checksumMap.entries())
      .filter(([_, group]) => group.ids.length > 1)
      .map(([chk, group]) => ({
        checksumSha256: chk,
        assetIds: group.ids,
        assetNames: group.names,
      }));

    return {
      workspaceId,
      totalAssetsScanned: assets.length,
      totalCollectionsScanned: collections.length,
      brokenStorageReferences: brokenStorage,
      orphanedStoragePaths: [],
      duplicateChecksumGroups: duplicateGroups,
      brokenVersionLineages: brokenLineages,
      timestamp: new Date().toISOString(),
    };
  }

  public async executeChunkedBatchWrite<T>(
    _workspaceId: string,
    items: T[],
    writer: (chunk: T[]) => Promise<void>,
    chunkSize = 250
  ): Promise<number> {
    let processed = 0;
    for (let i = 0; i < items.length; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize);
      await writer(chunk);
      processed += chunk.length;
    }
    return processed;
  }

  // ==========================================
  // 3. PERFORMANCE & HONEST BENCHMARKING
  // ==========================================

  public async runLoadBenchmark(
    workspaceId: string,
    count = 100
  ): Promise<PerformanceBenchmarkMetrics> {
    const startMemory = process.memoryUsage().heapUsed;
    const startTime = performance.now();

    // 1. Batch Write Benchmark (100 assets)
    const testAssets: Partial<UnifiedBrandAssetEntity>[] = [];
    for (let i = 0; i < count; i++) {
      testAssets.push({
        workspaceId,
        businessId: workspaceId,
        name: `Benchmark Asset #${i + 1}`,
        section: 'Active',
        category: 'Collateral',
        approvalStatus: 'approved',
        createdBy: 'system-benchmark',
      });
    }

    // Execute writes with chunking
    await this.executeChunkedBatchWrite(workspaceId, testAssets, async (chunk) => {
      for (const item of chunk) {
        await brandAssetRepository.create(item);
      }
    });

    const endTime = performance.now();
    const totalDurationMs = Math.round(endTime - startTime);
    const averageLatencyMs = Number((totalDurationMs / count).toFixed(2));
    const throughputOpsPerSec = Math.round((count / (totalDurationMs / 1000)) || 0);
    const endMemory = process.memoryUsage().heapUsed;
    const memoryUsageMb = Number(((endMemory - startMemory) / (1024 * 1024)).toFixed(2));

    return {
      operationName: `Batch Ingestion of ${count} Assets`,
      sampleSize: count,
      totalDurationMs,
      averageLatencyMs,
      throughputOpsPerSec,
      memoryUsageMb,
      honestConcurrencyLimit: 50, // Documented realistic concurrency ceiling
    };
  }

  public getHonestyStatement(): string {
    return (
      'BrainWise DAM is optimized for enterprise brand collateral. ' +
      'Realistic architectural bounds: max 500 items per batch transaction, ' +
      '15MB per asset file, and 50 concurrent mutating requests. Video pipelines are 100% excluded.'
    );
  }

  // ==========================================
  // 4. AI COST CONTROL & CACHING
  // ==========================================

  public getCachedAnalysis(checksumSha256: string): { analysis: Record<string, unknown>; cacheHit: true } | null {
    if (!checksumSha256) return null;
    const cached = this.analysisCache.get(checksumSha256);
    if (cached) {
      this.cacheStats.hits++;
      this.cacheStats.tokensAvoided += cached.tokenSavings;
      return { analysis: cached.analysis, cacheHit: true };
    }
    this.cacheStats.misses++;
    return null;
  }

  public setCachedAnalysis(
    checksumSha256: string,
    analysis: Record<string, unknown>,
    tokenSavings = 1500
  ): void {
    if (!checksumSha256) return;
    this.analysisCache.set(checksumSha256, {
      analysis,
      cachedAt: Date.now(),
      tokenSavings,
    });
  }

  public async executeWithAiCostControl<T extends Record<string, unknown>>(
    asset: { verifiedMetadata?: { checksumSha256?: string }; assetId?: string },
    analysisFn: () => Promise<T>,
    tokenCost = 1500
  ): Promise<{ result: T; cached: boolean; tokensConsumed: number }> {
    const checksum = asset.verifiedMetadata?.checksumSha256 || `chk_${asset.assetId || Date.now()}`;
    const cached = this.getCachedAnalysis(checksum);
    if (cached) {
      return {
        result: cached.analysis as T,
        cached: true,
        tokensConsumed: 0,
      };
    }

    const result = await analysisFn();
    this.setCachedAnalysis(checksum, result, tokenCost);
    return {
      result,
      cached: false,
      tokensConsumed: tokenCost,
    };
  }

  public getAiCostSummary(workspaceId: string): AiCostControlSummary {
    const totalJobs = this.cacheStats.hits + this.cacheStats.misses;
    const ratio = totalJobs > 0 ? Number(((this.cacheStats.hits / totalJobs) * 100).toFixed(1)) : 0;
    const estimatedCreditsSaved = Math.round(this.cacheStats.tokensAvoided / 100);

    return {
      workspaceId,
      totalAiJobsSubmitted: totalJobs,
      cachedAnalysisHits: this.cacheStats.hits,
      cacheHitRatioPct: ratio,
      tokensConsumedTotal: this.cacheStats.misses * 1500,
      tokensAvoidedByCache: this.cacheStats.tokensAvoided,
      estimatedCreditsSaved,
      rateLimitThrottledCount: 0,
    };
  }

  // ==========================================
  // 5. RELIABILITY & DEAD-LETTER QUEUE
  // ==========================================

  public async dispatchJobWithRetry(params: {
    workspaceId: string;
    jobType: string;
    payload: Record<string, unknown>;
    handler: () => Promise<void>;
    maxRetries?: number;
  }): Promise<{ success: boolean; attempts: number; routedToDeadLetter?: boolean }> {
    const { workspaceId, jobType, payload, handler, maxRetries = 3 } = params;
    let attempts = 0;
    let lastError = '';

    while (attempts < maxRetries) {
      attempts++;
      try {
        await handler();
        return { success: true, attempts };
      } catch (err: any) {
        lastError = err?.message || 'Unknown processing error';
        // Exponential backoff pause simulation
        if (attempts < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 5 * attempts));
        }
      }
    }

    // Retries exhausted: Route to Dead-Letter collection
    const jobId = `dlq_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const deadLetterJob: DeadLetterJobEntity = {
      jobId,
      workspaceId,
      jobType,
      payload,
      attempts,
      maxRetries,
      finalError: lastError,
      failedAt: new Date().toISOString(),
    };

    await db
      .collection<DeadLetterJobEntity>(`workspaces/${workspaceId}/deadLetterJobs`)
      .doc(jobId)
      .set(deadLetterJob);

    await departmentEventBus.emit({
      workspaceId,
      userId: 'system-reliability',
      eventType: 'DEPARTMENT_COORDINATION_EVENT',
      resourceId: jobId,
      metadata: {
        alert: 'DEAD_LETTER_JOB_RECORDED',
        jobType,
        finalError: lastError,
      },
    });

    return {
      success: false,
      attempts,
      routedToDeadLetter: true,
    };
  }

  public async getQueueHealth(workspaceId: string): Promise<QueueHealthStatus> {
    const dlqSnap = await db
      .collection<DeadLetterJobEntity>(`workspaces/${workspaceId}/deadLetterJobs`)
      .get();
    const deadLetterCount = dlqSnap.docs.length;

    return {
      queuedCount: 0,
      processingCount: 0,
      completedCount: this.cacheStats.hits + this.cacheStats.misses,
      failedCount: deadLetterCount,
      deadLetterCount,
      queueStatus: deadLetterCount > 5 ? 'congested' : deadLetterCount > 0 ? 'degraded' : 'healthy',
    };
  }

  // ==========================================
  // 6. BACKUP & DISASTER RECOVERY
  // ==========================================

  public async createDisasterRecoverySnapshot(
    workspaceId: string
  ): Promise<WorkspaceDisasterRecoverySnapshot> {
    const assets = await brandAssetRepository.listByWorkspace(workspaceId, { limit: 1000 });
    const collections = await brandAssetRepository.listCollections(workspaceId);

    const snapshotId = `snap_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const createdAt = new Date().toISOString();

    const manifestData = JSON.stringify({ workspaceId, assets, collections });
    const manifestChecksumSha256 = crypto.createHash('sha256').update(manifestData).digest('hex');

    const snapshot: WorkspaceDisasterRecoverySnapshot = {
      snapshotId,
      workspaceId,
      createdAt,
      assetCount: assets.length,
      collectionCount: collections.length,
      assets,
      collections,
      manifestChecksumSha256,
    };

    await db
      .collection<WorkspaceDisasterRecoverySnapshot>(`workspaces/${workspaceId}/backupSnapshots`)
      .doc(snapshotId)
      .set(snapshot);

    return snapshot;
  }

  public async restoreFromSnapshot(
    workspaceId: string,
    snapshot: WorkspaceDisasterRecoverySnapshot
  ): Promise<{ restoredAssets: number; restoredCollections: number }> {
    // 1. Verify manifest checksum
    const manifestData = JSON.stringify({
      workspaceId: snapshot.workspaceId,
      assets: snapshot.assets,
      collections: snapshot.collections,
    });
    const computedChecksum = crypto.createHash('sha256').update(manifestData).digest('hex');

    if (computedChecksum !== snapshot.manifestChecksumSha256) {
      throw new Error('CORRUPTED_BACKUP_SNAPSHOT: Checksum verification failed. Restore aborted.');
    }

    // 2. Restore assets
    let restoredAssets = 0;
    for (const a of snapshot.assets) {
      await brandAssetRepository.create(a);
      restoredAssets++;
    }

    // 3. Restore collections
    let restoredCollections = 0;
    for (const c of snapshot.collections) {
      await brandAssetRepository.createCollection(workspaceId, c);
      restoredCollections++;
    }

    return {
      restoredAssets,
      restoredCollections,
    };
  }
}

export const assetProductionHardeningService = new AssetProductionHardeningService();
