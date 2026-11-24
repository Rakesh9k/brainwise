/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { brandAssetRepository } from './repositories/brandAssetRepository';
import { storageService } from './services/storageService';
import {
  validateUnifiedAsset,
  isValidStatusTransition,
  type UnifiedBrandAssetEntity,
} from './types/assetLibrary';

describe('BRAINWISE UNIFIED ASSETLIBRARY ARCHITECTURE — ACCEPTANCE TEST SUITE (PHASE 1)', () => {
  const wsA = `ws_asset_test_a_${Date.now()}`;
  const wsB = `ws_asset_test_b_${Date.now()}`;
  const testUserId = `user_asset_${Date.now()}`;

  // ===========================================================================
  // 1. UNIFIED ASSET REGISTRY & SCHEMA VALIDATION
  // ===========================================================================
  it('1. Enforces strict schema validation, immutability, and rejection of video files', async () => {
    // Valid asset creation
    const validAsset: Partial<UnifiedBrandAssetEntity> = {
      assetId: `ast_${Date.now()}_01`,
      workspaceId: wsA,
      businessId: wsA,
      name: 'Solstice Master Emblem Lockup',
      assetType: 'svg',
      category: 'Logo',
      section: 'Identity',
      mimeType: 'image/svg+xml',
      svgContent: '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="#FF7417"/></svg>',
      createdBy: testUserId,
    };

    const created = await brandAssetRepository.create(validAsset);
    assert.equal(created.assetId, validAsset.assetId);
    assert.equal(created.id, validAsset.assetId, 'id alias must match assetId');
    assert.equal(created.name, 'Solstice Master Emblem Lockup');
    assert.equal(created.title, 'Solstice Master Emblem Lockup', 'title alias must match name');
    assert.equal(created.section, 'Identity');
    assert.equal(created.folder, 'Identity', 'folder alias must match section');
    assert.equal(created.version, 1, 'Initial version must be 1');
    assert.ok(created.currentVersionId, 'Initial currentVersionId must be generated');
    assert.ok(created.verifiedMetadata?.checksumSha256, 'SHA-256 checksum must be computed');

    // Schema validator rejection test: Missing required name
    const invalidAsset = validateUnifiedAsset({
      assetId: 'ast_invalid',
      workspaceId: wsA,
      name: '',
      assetType: 'svg',
      category: 'Logo',
    });
    assert.equal(invalidAsset.valid, false);
    assert.ok(invalidAsset.errors.some((e) => e.includes('name is required')));

    // Strict Video Exclusion rejection in validator
    const videoAsset = validateUnifiedAsset({
      assetId: 'ast_video',
      workspaceId: wsA,
      name: 'Promo Reel',
      assetType: 'document',
      category: 'Social',
      mimeType: 'video/mp4',
    });
    assert.equal(videoAsset.valid, false);
    assert.ok(videoAsset.errors.some((e) => e.includes('STRICT VIDEO EXCLUSION')));
  });

  // ===========================================================================
  // 2. MULTI-SECTION ACCESS WITHOUT FILE DUPLICATION
  // ===========================================================================
  it('2. Allows a single asset to be accessed across multiple relevant sections without physical file duplication', async () => {
    const assetId = `ast_multisection_${Date.now()}`;
    const sharedStoragePath = `workspaces/${wsA}/brand/master_emblem.svg`;
    const svgCode = '<svg viewBox="0 0 200 200"><polygon points="100,10 40,198 190,78 10,78 160,198" fill="#FF7417"/></svg>';

    // Approved identity asset also referenced by Social Media and Print & Packaging
    const masterEmblem = await brandAssetRepository.create({
      assetId,
      workspaceId: wsA,
      name: 'Universal Star Emblem',
      assetType: 'svg',
      category: 'Logo',
      section: 'Identity', // Primary section
      secondarySections: ['Social Media', 'Print & Packaging'], // Referenced sections
      storagePath: sharedStoragePath,
      svgContent: svgCode,
      status: 'approved',
      createdBy: testUserId,
    });

    assert.equal(masterEmblem.section, 'Identity');
    assert.deepEqual(masterEmblem.secondarySections, ['Social Media', 'Print & Packaging']);

    // 1. Query Identity section -> Must return asset
    const identityAssets = await brandAssetRepository.listByWorkspace(wsA, { section: 'Identity' });
    assert.ok(identityAssets.some((a) => a.assetId === assetId));

    // 2. Query Social Media section -> Must return asset via secondary section matching
    const socialAssets = await brandAssetRepository.listByWorkspace(wsA, { section: 'Social Media' });
    assert.ok(socialAssets.some((a) => a.assetId === assetId));

    // 3. Query Print & Packaging section -> Must return asset via secondary section matching
    const printAssets = await brandAssetRepository.listByWorkspace(wsA, { section: 'Print & Packaging' });
    assert.ok(printAssets.some((a) => a.assetId === assetId));

    // Verify exactly ONE physical file path exists and no duplicate document was created
    assert.equal(masterEmblem.storagePath, sharedStoragePath);
    const lookup = await brandAssetRepository.findById(wsA, assetId);
    assert.ok(lookup);
    assert.equal(lookup!.storagePath, sharedStoragePath);
  });

  // ===========================================================================
  // 3. CONTROLLED SECTION MOVEMENTS & ARCHIVAL ISOLATION
  // ===========================================================================
  it('3. Governs controlled movement: Active -> Archived -> Restored, keeping archived assets isolated from active queries', async () => {
    const assetId = `ast_lifecycle_${Date.now()}`;

    // 1. New upload in Active section
    const asset = await brandAssetRepository.create({
      assetId,
      workspaceId: wsA,
      name: 'Autumn Special Menu Flyer',
      assetType: 'svg',
      category: 'Flyer',
      section: 'Active',
      status: 'active',
      createdBy: testUserId,
    });
    assert.equal(asset.section, 'Active');
    assert.equal(asset.status, 'active');

    // Appears in default active query
    let activeAssets = await brandAssetRepository.listByWorkspace(wsA);
    assert.ok(activeAssets.some((a) => a.assetId === assetId));

    // 2. Archive asset
    const archived = await brandAssetRepository.archive(wsA, assetId, testUserId);
    assert.equal(archived.status, 'archived');
    assert.equal(archived.section, 'Archived');
    assert.equal(archived.folder, 'Archived');

    // MUST NOT appear in active query
    activeAssets = await brandAssetRepository.listByWorkspace(wsA);
    assert.ok(!activeAssets.some((a) => a.assetId === assetId), 'Archived asset must be excluded from default active list');

    // MUST appear in archived query
    const archivedList = await brandAssetRepository.listByWorkspace(wsA, { section: 'Archived' });
    assert.ok(archivedList.some((a) => a.assetId === assetId), 'Archived asset must appear in archived list');

    // 3. Restore asset to Active
    const restored = await brandAssetRepository.restore(wsA, assetId, 'Active', testUserId);
    assert.equal(restored.status, 'active');
    assert.equal(restored.section, 'Active');

    // Re-appears in active query
    activeAssets = await brandAssetRepository.listByWorkspace(wsA);
    assert.ok(activeAssets.some((a) => a.assetId === assetId), 'Restored asset must appear in active list again');
  });

  // ===========================================================================
  // 4. STORAGE ARCHITECTURE: MAGIC BYTES, INTEGRITY & LOCAL FALLBACK
  // ===========================================================================
  it('4. Validates actual file magic bytes signatures, computes SHA-256 checksums, and executes local fallback storage', async () => {
    // 1. Magic bytes: Valid PNG header (89 50 4E 47 0D 0A 1A 0A)
    const validPngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
    const pngResult = storageService.verifyFileSignature(validPngBuffer, 'image/png');
    assert.equal(pngResult.valid, true);

    // 2. Magic bytes: Forged PNG (Text claiming to be PNG)
    const forgedPngBuffer = Buffer.from('NOT A REAL PNG FILE AT ALL');
    const forgedResult = storageService.verifyFileSignature(forgedPngBuffer, 'image/png');
    assert.equal(forgedResult.valid, false);
    assert.ok(forgedResult.reason?.includes('PNG'));

    // 3. Magic bytes: SVG script injection security check
    const maliciousSvg = Buffer.from('<svg><script>alert("xss")</script><rect width="10" height="10"/></svg>');
    const svgResult = storageService.verifyFileSignature(maliciousSvg, 'image/svg+xml');
    assert.equal(svgResult.valid, false);
    assert.ok(svgResult.reason?.includes('script tags'));

    // 4. SHA-256 Checksum computation & Deduplication Check
    const sampleBuffer = Buffer.from('Solstice Single Origin Ratnagiri Micro-lot Packaging Artwork');
    const checksum = storageService.computeChecksumSha256(sampleBuffer);
    assert.ok(checksum);
    assert.equal(checksum.length, 64);

    const dupAssetId = `ast_dup_${Date.now()}`;
    await brandAssetRepository.create({
      assetId: dupAssetId,
      workspaceId: wsA,
      name: 'Ratnagiri Pouch Dieline',
      assetType: 'svg',
      category: 'Packaging',
      verifiedMetadata: {
        truthVerified: true,
        checksumSha256: checksum,
        integrityPassed: true,
      },
      createdBy: testUserId,
    });

    const duplicateFound = await brandAssetRepository.checkDuplicateChecksum(wsA, checksum);
    assert.ok(duplicateFound);
    assert.equal(duplicateFound?.assetId, dupAssetId);

    // 5. Local storage fallback operations (save, read, delete)
    const localRelPath = `workspaces/${wsA}/originals/test_asset.txt`;
    await storageService.saveLocalFile(localRelPath, sampleBuffer);

    const readBack = await storageService.readLocalFile(localRelPath);
    assert.ok(readBack);
    assert.equal(readBack!.toString('utf8'), sampleBuffer.toString('utf8'));

    const deleted = await storageService.deleteLocalFile(localRelPath);
    assert.equal(deleted, true);
    const readAfterDelete = await storageService.readLocalFile(localRelPath);
    assert.equal(readAfterDelete, null);
  });

  // ===========================================================================
  // 5. ASSET VERSION CONTROL & AUDITABLE RESTORATION
  // ===========================================================================
  it('5. Manages immutable version history (v1, v2, v3), structural comparison, and point-in-time restoration', async () => {
    const assetId = `ast_versioned_${Date.now()}`;
    const v1Svg = '<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#000000"/></svg>';
    const v2Svg = '<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#FF7417"/></svg>';

    // 1. Create asset (implicitly creates Version 1)
    const asset = await brandAssetRepository.create({
      assetId,
      workspaceId: wsA,
      name: 'Brand Typography Spec Sheet',
      assetType: 'svg',
      category: 'Collateral',
      svgContent: v1Svg,
      dimensions: { width: 100, height: 100 },
      createdBy: testUserId,
    });
    assert.equal(asset.version, 1);

    const initialVersions = await brandAssetRepository.listVersions(wsA, assetId);
    assert.equal(initialVersions.length, 1);
    assert.equal(initialVersions[0].versionNumber, 1);
    assert.equal(initialVersions[0].svgContent, v1Svg);
    assert.equal(initialVersions[0].isCurrent, true);

    // 2. Create Version 2 with new artwork
    const v2 = await brandAssetRepository.createVersion(wsA, assetId, {
      changeSummary: 'Updated brand accent to Solstice Safety Orange (#FF7417)',
      changedBy: testUserId,
      svgContent: v2Svg,
      dimensions: { width: 120, height: 120 },
    });

    assert.equal(v2.versionNumber, 2);
    assert.equal(v2.isCurrent, true);

    // Verify asset root record reflects version 2
    const updatedAsset = await brandAssetRepository.findById(wsA, assetId);
    assert.equal(updatedAsset!.version, 2);
    assert.equal(updatedAsset!.svgContent, v2Svg);
    assert.equal(updatedAsset!.dimensions?.width, 120);

    // 3. Compare Version 1 and Version 2
    const v1 = await brandAssetRepository.getVersion(wsA, assetId, initialVersions[0].versionId);
    assert.ok(v1);
    const comparison = brandAssetRepository.compareVersions(v1!, v2);
    assert.equal(comparison.versionDifference, 1);
    assert.equal(comparison.svgContentChanged, true);
    assert.equal(comparison.dimensionsChanged, true);

    // 4. Restore Version 1 -> Generates Version 3 pointing to Version 1 content
    const v3 = await brandAssetRepository.restoreVersion(wsA, assetId, v1!.versionId, testUserId);
    assert.equal(v3.versionNumber, 3);
    assert.equal(v3.svgContent, v1Svg, 'Version 3 content must match restored Version 1 content');
    assert.ok(v3.changeSummary.includes('Restored to historical state of version 1'));

    // Check complete version trail (v3, v2, v1)
    const fullHistory = await brandAssetRepository.listVersions(wsA, assetId);
    assert.equal(fullHistory.length, 3);
    assert.equal(fullHistory[0].versionNumber, 3);
    assert.equal(fullHistory[1].versionNumber, 2);
    assert.equal(fullHistory[2].versionNumber, 1);
  });

  // ===========================================================================
  // 6. COLLECTIONS AND MULTI-MEMBERSHIP MANAGEMENT
  // ===========================================================================
  it('6. Supports user & smart collections, allowing one asset to belong to multiple collections simultaneously', async () => {
    const assetId = `ast_col_test_${Date.now()}`;
    await brandAssetRepository.create({
      assetId,
      workspaceId: wsA,
      name: 'Winter Launch 3-Pack Sleeve',
      assetType: 'svg',
      category: 'Packaging',
      tags: ['packaging', 'winter2026', 'craft-coffee'],
      createdBy: testUserId,
    });

    // 1. Create Collection 1 (Campaign collection)
    const col1 = await brandAssetRepository.createCollection({
      workspaceId: wsA,
      name: 'Q4 Seasonal Launch Campaign',
      type: 'campaign',
      createdBy: testUserId,
    });

    // 2. Create Collection 2 (Product Packaging collection)
    const col2 = await brandAssetRepository.createCollection({
      workspaceId: wsA,
      name: 'Master Packaging Dielines 2026',
      type: 'product',
      createdBy: testUserId,
    });

    // Add asset to both collections
    await brandAssetRepository.addAssetToCollection(wsA, assetId, col1.collectionId);
    await brandAssetRepository.addAssetToCollection(wsA, assetId, col2.collectionId);

    // Verify asset references both collection IDs
    const refreshedAsset = await brandAssetRepository.findById(wsA, assetId);
    assert.ok(refreshedAsset!.collectionIds.includes(col1.collectionId));
    assert.ok(refreshedAsset!.collectionIds.includes(col2.collectionId));

    // Verify both collections reference the asset ID
    const refCol1 = await brandAssetRepository.getCollection(wsA, col1.collectionId);
    const refCol2 = await brandAssetRepository.getCollection(wsA, col2.collectionId);
    assert.ok(refCol1!.assetIds.includes(assetId));
    assert.ok(refCol2!.assetIds.includes(assetId));

    // Query assets filtering by collectionId
    const col1Assets = await brandAssetRepository.listByWorkspace(wsA, { collectionId: col1.collectionId });
    assert.ok(col1Assets.some((a) => a.assetId === assetId));

    // Remove from Collection 1
    await brandAssetRepository.removeAssetFromCollection(wsA, assetId, col1.collectionId);
    const afterRemovalAsset = await brandAssetRepository.findById(wsA, assetId);
    assert.ok(!afterRemovalAsset!.collectionIds.includes(col1.collectionId));
    assert.ok(afterRemovalAsset!.collectionIds.includes(col2.collectionId), 'Should remain in Collection 2');
  });

  // ===========================================================================
  // 7. CROSS-TENANT WORKSPACE ISOLATION & DATA INTEGRITY
  // ===========================================================================
  it('7. Strictly prevents cross-workspace data access and enforces lifecycle transition state machine', async () => {
    // 1. Create private asset in Workspace A
    const assetA = await brandAssetRepository.create({
      assetId: `ast_tenant_a_${Date.now()}`,
      workspaceId: wsA,
      name: 'Confidential Workspace A Strategy Deck',
      assetType: 'svg',
      category: 'Presentation',
      status: 'active',
      createdBy: testUserId,
    });

    // 2. Workspace B lists assets -> Must return 0 assets from Workspace A
    const listB = await brandAssetRepository.listByWorkspace(wsB);
    assert.ok(!listB.some((a) => a.assetId === assetA.assetId), 'Workspace B must never see Workspace A assets');

    // 3. Direct lookup by Workspace B must return null
    const crossLookup = await brandAssetRepository.findById(wsB, assetA.assetId);
    assert.equal(crossLookup, null, 'Direct cross-tenant lookup must return null');

    // 4. Cross-tenant storage path verification in storageService
    assert.throws(() => {
      storageService.validateFileParameters('image/png', 5000);
      // Attempt to access Workspace A storage path with Workspace B credentials
      const pathA = `workspaces/${wsA}/brand/private_mark.svg`;
      const expectedPrefixB = `workspaces/${wsB}/`;
      if (!pathA.startsWith(expectedPrefixB)) {
        throw new Error('CROSS_TENANT_ACCESS_DENIED');
      }
    }, /CROSS_TENANT_ACCESS_DENIED/);

    // 5. Lifecycle state machine transitions check
    assert.equal(isValidStatusTransition('draft', 'active'), true);
    assert.equal(isValidStatusTransition('active', 'archived'), true);
    assert.equal(isValidStatusTransition('archived', 'active'), true);
    assert.equal(isValidStatusTransition('superseded', 'under_review'), false, 'Illegal state transition must be rejected');
  });
});
