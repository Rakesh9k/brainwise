/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { brandAssetRepository } from './repositories/brandAssetRepository';
import { storageService } from './services/storageService';
import type { UnifiedBrandAssetEntity } from './types/assetLibrary';

describe('BRAINWISE ACTIVE ASSET MANAGEMENT — PHASE 2 ACCEPTANCE TEST SUITE', () => {
  const wsId = `ws_active_${Date.now()}`;
  const userId = `user_active_${Date.now()}`;

  // ===========================================================================
  // 1. ASSET DUPLICATION WITH PROVENANCE & COPY INDICATOR
  // ===========================================================================
  it('1. Duplicates asset with (Copy) naming, parentAssetId provenance, and initial version', async () => {
    const original = await brandAssetRepository.create({
      workspaceId: wsId,
      businessId: wsId,
      name: 'Organic Honey Label Packaging',
      assetType: 'svg',
      category: 'Packaging',
      section: 'Print & Packaging',
      mimeType: 'image/svg+xml',
      headlineText: 'Pure Organic Forest Honey',
      accentHex: '#FFA000',
      svgContent: '<svg><rect width="200" height="100" fill="#FFA000"/></svg>',
      tags: ['packaging', 'honey', 'print'],
      createdBy: userId,
    });

    const duplicate = await brandAssetRepository.duplicate(wsId, original.assetId, userId);

    assert.ok(duplicate, 'Duplicate must be created');
    assert.notEqual(duplicate.assetId, original.assetId, 'Duplicate must have unique assetId');
    assert.equal(duplicate.name, 'Organic Honey Label Packaging (Copy)');
    assert.equal(duplicate.title, 'Organic Honey Label Packaging (Copy)');
    assert.equal(duplicate.parentAssetId, original.assetId, 'parentAssetId must link to original');
    assert.equal(duplicate.section, original.section);
    assert.equal(duplicate.category, original.category);
    assert.equal(duplicate.version, 1);
    assert.ok(duplicate.currentVersionId);
    assert.deepEqual(duplicate.tags, original.tags);

    // Verify duplicate is queryable
    const retrieved = await brandAssetRepository.getById(wsId, duplicate.assetId);
    assert.ok(retrieved);
    assert.equal(retrieved.parentAssetId, original.assetId);
  });

  // ===========================================================================
  // 2. BULK OPERATIONS (ARCHIVE, RESTORE, TAG, MOVE, DELETE)
  // ===========================================================================
  it('2. Executes atomic bulk archive, restore, tagging, move, and permanent delete', async () => {
    // Create 3 assets
    const a1 = await brandAssetRepository.create({
      workspaceId: wsId,
      businessId: wsId,
      name: 'Summer Promo Carousel Slide 1',
      assetType: 'svg',
      category: 'Social',
      section: 'Active',
      mimeType: 'image/svg+xml',
      createdBy: userId,
      tags: ['summer'],
    });

    const a2 = await brandAssetRepository.create({
      workspaceId: wsId,
      businessId: wsId,
      name: 'Summer Promo Carousel Slide 2',
      assetType: 'svg',
      category: 'Social',
      section: 'Active',
      mimeType: 'image/svg+xml',
      createdBy: userId,
      tags: ['summer'],
    });

    const a3 = await brandAssetRepository.create({
      workspaceId: wsId,
      businessId: wsId,
      name: 'Summer Promo Carousel Slide 3',
      assetType: 'svg',
      category: 'Social',
      section: 'Active',
      mimeType: 'image/svg+xml',
      createdBy: userId,
      tags: ['summer'],
    });

    const targetIds = [a1.assetId, a2.assetId, a3.assetId];

    // A. Bulk Tag
    const tagCount = await brandAssetRepository.bulkTag(wsId, targetIds, ['campaign-2026', 'promo']);
    assert.equal(tagCount.updatedCount, 3, 'All 3 assets must be tagged');

    const updatedA1 = await brandAssetRepository.getById(wsId, a1.assetId);
    assert.ok(updatedA1?.tags?.includes('campaign-2026'));
    assert.ok(updatedA1?.tags?.includes('promo'));
    assert.ok(updatedA1?.tags?.includes('summer'), 'Existing tags must be preserved');

    // B. Bulk Move
    const moveCount = await brandAssetRepository.bulkMove(wsId, targetIds, 'Social Media');
    assert.equal(moveCount.movedCount, 3);
    const movedA2 = await brandAssetRepository.getById(wsId, a2.assetId);
    assert.equal(movedA2?.section, 'Social Media');
    assert.equal(movedA2?.folder, 'Social Media');

    // C. Bulk Archive
    const archiveCount = await brandAssetRepository.bulkArchive(wsId, targetIds);
    assert.equal(archiveCount.archivedCount, 3);
    const archivedA3 = await brandAssetRepository.getById(wsId, a3.assetId);
    assert.equal(archivedA3?.lifecycleStatus, 'Archived');
    assert.equal(archivedA3?.status.toLowerCase(), 'archived');

    // D. Bulk Restore
    const restoreCount = await brandAssetRepository.bulkRestore(wsId, targetIds);
    assert.equal(restoreCount.restoredCount, 3);
    const restoredA1 = await brandAssetRepository.getById(wsId, a1.assetId);
    assert.equal(restoredA1?.lifecycleStatus, 'Active');
    assert.equal(restoredA1?.status.toLowerCase(), 'active');

    // E. Bulk Delete Permanently
    const deleteCount = await brandAssetRepository.bulkDeletePermanently(wsId, [a1.assetId, a2.assetId]);
    assert.equal(deleteCount.deletedCount, 2);
    const deletedA1 = await brandAssetRepository.getById(wsId, a1.assetId);
    assert.equal(deletedA1, null, 'Deleted asset must not exist');
    const remainingA3 = await brandAssetRepository.getById(wsId, a3.assetId);
    assert.ok(remainingA3, 'Undeleted asset must still exist');
  });

  // ===========================================================================
  // 3. SMART ORGANIZATION & HEURISTIC AI CLASSIFICATION
  // ===========================================================================
  it('3. Automatically classifies assets into categories with deterministic heuristic rules', () => {
    // Test Logo classification
    const logoResult = brandAssetRepository.classifyAssetHeuristic('brand-primary-lockup.svg', 'image/svg+xml', 'Identity');
    assert.equal(logoResult.category, 'Logo');
    assert.ok(logoResult.confidence >= 0.9);

    // Test Packaging classification
    const pkgResult = brandAssetRepository.classifyAssetHeuristic('carton-box-dieline-v2.pdf', 'application/pdf', 'Print & Packaging');
    assert.equal(pkgResult.category, 'Packaging');
    assert.ok(pkgResult.tags.includes('packaging'));

    // Test Social Media classification
    const socialResult = brandAssetRepository.classifyAssetHeuristic('instagram-carousel-summer-slide1.png', 'image/png', 'Social Media');
    assert.ok(socialResult.category === 'Social' || socialResult.category === 'Carousel' || socialResult.category === 'Instagram Post');
    assert.ok(socialResult.tags.includes('social'));

    // Test Photography classification
    const photoResult = brandAssetRepository.classifyAssetHeuristic('hero-product-shot.jpg', 'image/jpeg', 'Active');
    assert.equal(photoResult.category, 'Photography');
    assert.ok(photoResult.tags.includes('photography'));

    // Test Document classification
    const docResult = brandAssetRepository.classifyAssetHeuristic('compliance-specifications.pdf', 'application/pdf', 'Active');
    assert.equal(docResult.category, 'Document');
    assert.ok(docResult.tags.includes('document'));
  });

  // ===========================================================================
  // 4. MULTI-FILE UPLOAD & CHECKSUM DUPLICATE DETECTION
  // ===========================================================================
  it('4. Computes SHA-256 checksums and detects duplicate file content', async () => {
    const rawSvg = '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="25" fill="#FF7417"/></svg>';
    const buffer = Buffer.from(rawSvg, 'utf-8');

    // First upload
    const asset1 = await brandAssetRepository.create({
      workspaceId: wsId,
      businessId: wsId,
      name: 'Orange Dot Master',
      assetType: 'svg',
      category: 'Logo',
      section: 'Identity',
      mimeType: 'image/svg+xml',
      svgContent: rawSvg,
      createdBy: userId,
    });

    assert.ok(asset1.verifiedMetadata?.checksumSha256);
    const checksum = asset1.verifiedMetadata.checksumSha256;

    // Check duplicate detection
    const duplicate = await brandAssetRepository.checkDuplicateChecksum(wsId, checksum);
    assert.ok(duplicate, 'Duplicate asset must be detected by SHA-256 checksum');
    assert.equal(duplicate.assetId, asset1.assetId);
  });

  // ===========================================================================
  // 5. STRICT VIDEO EXCLUSION DIRECTIVE ENFORCEMENT
  // ===========================================================================
  it('5. Strictly rejects video uploads in accordance with BrainWise architectural directives', async () => {
    // Direct repository rejection
    await assert.rejects(
      async () => {
        await brandAssetRepository.create({
          workspaceId: wsId,
          businessId: wsId,
          name: 'Promo Reel 1080p',
          assetType: 'mp4',
          category: 'Social',
          section: 'Social Media',
          mimeType: 'video/mp4',
          createdBy: userId,
        });
      },
      /STRICT VIDEO EXCLUSION/
    );

    // Storage signed URL rejection
    await assert.rejects(
      async () => {
        await storageService.generateSignedUploadUrl({
          workspaceId: wsId,
          fileName: 'brand-commercial.mov',
          mimeType: 'video/quicktime',
          fileSizeBytes: 1048576,
          folder: 'marketing',
        });
      },
      /strictly prohibited|strictly excluded/i
    );
  });

  // ===========================================================================
  // 6. VERSION CREATION AND RESTORATION
  // ===========================================================================
  it('6. Creates versions and accurately restores previous versions', async () => {
    const baseAsset = await brandAssetRepository.create({
      workspaceId: wsId,
      businessId: wsId,
      name: 'Visiting Card Executive',
      assetType: 'svg',
      category: 'Collateral',
      section: 'Print & Packaging',
      mimeType: 'image/svg+xml',
      headlineText: 'John Doe · Managing Director',
      accentHex: '#252525',
      createdBy: userId,
    });

    const v1Id = baseAsset.currentVersionId;
    assert.ok(v1Id);

    // Create Version 2
    const v2 = await brandAssetRepository.createVersion(wsId, baseAsset.assetId, {
      authorId: userId,
      authorName: 'Senior Designer',
      changeDescription: 'Updated title to Senior Partner and accent to #FF7417',
      storagePath: '/mock/v2/card.svg',
      fileSizeBytes: 2048,
      mimeType: 'image/svg+xml',
      metadataSnapshot: {
        headlineText: 'John Doe · Senior Partner',
        accentHex: '#FF7417',
      },
    });

    assert.equal(v2.versionNumber, 2);

    // Verify asset updated to v2
    const assetV2 = await brandAssetRepository.getById(wsId, baseAsset.assetId);
    assert.equal(assetV2?.version, 2);
    assert.equal(assetV2?.currentVersionId, v2.versionId);

    // Restore Version 1 (creates Version 3 with Historical state)
    const restored = await brandAssetRepository.restoreVersion(wsId, baseAsset.assetId, v1Id);
    assert.ok(restored);
    assert.equal(restored.versionNumber, 3);

    // List all versions
    const allVersions = await brandAssetRepository.listVersions(wsId, baseAsset.assetId);
    assert.equal(allVersions.length, 3);
    assert.equal(allVersions[0].versionNumber, 3); // Ordered desc
    assert.equal(allVersions[1].versionNumber, 2);
    assert.equal(allVersions[2].versionNumber, 1);
  });
});
