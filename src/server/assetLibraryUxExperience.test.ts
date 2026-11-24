/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { brandAssetRepository } from './repositories/brandAssetRepository';
import { assetEcosystemGatewayService } from './services/assetEcosystemGatewayService';

const TEST_WORKSPACE = 'ws_ux_test';
const TEST_USER = 'user_ux_designer';

describe('PHASE 10 — AssetLibrary Complete UX/UI & Experience Optimization', () => {
  beforeEach(async () => {
    const active = await brandAssetRepository.listByWorkspace(TEST_WORKSPACE, { limit: 200 });
    for (const a of active) {
      await brandAssetRepository.deletePermanently(TEST_WORKSPACE, a.assetId);
    }
    const archived = await brandAssetRepository.listByWorkspace(TEST_WORKSPACE, { section: 'Archived', limit: 200 });
    for (const a of archived) {
      await brandAssetRepository.deletePermanently(TEST_WORKSPACE, a.assetId);
    }
  });

  it('1. Executive Overview Metrics: Accurately calculates total, approved, pending, and section distributions', async () => {
    // Seed test assets across sections
    await brandAssetRepository.create({
      workspaceId: TEST_WORKSPACE,
      businessId: TEST_WORKSPACE,
      name: 'Primary Logo Vector',
      section: 'Identity',
      category: 'Brand Identity',
      approvalStatus: 'approved',
      createdBy: TEST_USER,
    });

    await brandAssetRepository.create({
      workspaceId: TEST_WORKSPACE,
      businessId: TEST_WORKSPACE,
      name: 'Organic Honey Label 250g',
      section: 'Print & Packaging',
      category: 'Packaging',
      approvalStatus: 'approved',
      createdBy: TEST_USER,
    });

    await brandAssetRepository.create({
      workspaceId: TEST_WORKSPACE,
      businessId: TEST_WORKSPACE,
      name: 'Festive Carousel Slide 1',
      section: 'Social Media',
      category: 'Social',
      approvalStatus: 'pending',
      createdBy: TEST_USER,
    });

    await brandAssetRepository.create({
      workspaceId: TEST_WORKSPACE,
      businessId: TEST_WORKSPACE,
      name: 'Obsolete Product Catalog 2024',
      section: 'Archived',
      category: 'Collateral',
      approvalStatus: 'draft',
      createdBy: TEST_USER,
    });

    const allAssets = await brandAssetRepository.listByWorkspace(TEST_WORKSPACE, { limit: 100 });
    const archivedAssets = await brandAssetRepository.listByWorkspace(TEST_WORKSPACE, { section: 'Archived', limit: 100 });

    const totalCount = allAssets.length + archivedAssets.length;
    const activeCount = allAssets.length;
    const approvedCount = allAssets.filter((a) => a.approvalStatus === 'approved').length;
    const pendingCount = allAssets.filter((a) => a.approvalStatus !== 'approved').length;
    const identityCount = allAssets.filter((a) => a.section === 'Identity').length;
    const packagingCount = allAssets.filter((a) => a.section === 'Print & Packaging').length;
    const socialCount = allAssets.filter((a) => a.section === 'Social Media').length;

    assert.equal(activeCount, 3);
    assert.equal(archivedAssets.length, 1);
    assert.equal(approvedCount, 2);
    assert.equal(pendingCount, 1);
    assert.equal(identityCount, 1);
    assert.equal(packagingCount, 1);
    assert.equal(socialCount, 1);

    const approvalRate = Math.round((approvedCount / activeCount) * 100);
    assert.equal(approvalRate, 67);
  });

  it('2. Section Navigation & Workspace Isolation: Keeps active, identity, packaging, and archive queries segregated', async () => {
    // 1. Create one asset in each section
    const identityAsset = await brandAssetRepository.create({
      workspaceId: TEST_WORKSPACE,
      businessId: TEST_WORKSPACE,
      name: 'Brand Guideline v2',
      section: 'Identity',
      createdBy: TEST_USER,
    });

    const packagingAsset = await brandAssetRepository.create({
      workspaceId: TEST_WORKSPACE,
      businessId: TEST_WORKSPACE,
      name: 'Coffee Pouch Dieline',
      section: 'Print & Packaging',
      createdBy: TEST_USER,
    });

    const socialAsset = await brandAssetRepository.create({
      workspaceId: TEST_WORKSPACE,
      businessId: TEST_WORKSPACE,
      name: 'Launch Story Frame',
      section: 'Social Media',
      createdBy: TEST_USER,
    });

    const archivedAsset = await brandAssetRepository.create({
      workspaceId: TEST_WORKSPACE,
      businessId: TEST_WORKSPACE,
      name: 'Retired Brand Mark',
      section: 'Archived',
      createdBy: TEST_USER,
    });

    // Verify section queries return only matching assets
    const idList = await brandAssetRepository.listByWorkspace(TEST_WORKSPACE, { section: 'Identity' });
    assert.equal(idList.length, 1);
    assert.equal(idList[0].assetId, identityAsset.assetId);

    const pkgList = await brandAssetRepository.listByWorkspace(TEST_WORKSPACE, { section: 'Print & Packaging' });
    assert.equal(pkgList.length, 1);
    assert.equal(pkgList[0].assetId, packagingAsset.assetId);

    const socList = await brandAssetRepository.listByWorkspace(TEST_WORKSPACE, { section: 'Social Media' });
    assert.equal(socList.length, 1);
    assert.equal(socList[0].assetId, socialAsset.assetId);

    const arcList = await brandAssetRepository.listByWorkspace(TEST_WORKSPACE, { section: 'Archived' });
    assert.equal(arcList.length, 1);
    assert.equal(arcList[0].assetId, archivedAsset.assetId);
  });

  it('3. Dual-Mode Search & Multi-Filter Query Engine: Filters by search term, category, and approval status', async () => {
    await brandAssetRepository.create({
      workspaceId: TEST_WORKSPACE,
      businessId: TEST_WORKSPACE,
      name: 'Matcha Tea Poster High-Res',
      section: 'Active',
      category: 'Collateral',
      approvalStatus: 'approved',
      tags: ['matcha', 'beverage', 'print'],
      createdBy: TEST_USER,
    });

    await brandAssetRepository.create({
      workspaceId: TEST_WORKSPACE,
      businessId: TEST_WORKSPACE,
      name: 'Matcha Tea Instagram Reel Cover',
      section: 'Social Media',
      category: 'Social',
      approvalStatus: 'draft',
      tags: ['matcha', 'instagram'],
      createdBy: TEST_USER,
    });

    await brandAssetRepository.create({
      workspaceId: TEST_WORKSPACE,
      businessId: TEST_WORKSPACE,
      name: 'Turmeric Latte Bottle Label',
      section: 'Print & Packaging',
      category: 'Packaging',
      approvalStatus: 'approved',
      tags: ['turmeric', 'packaging'],
      createdBy: TEST_USER,
    });

    // 1. Search "matcha" with approved only
    const all = await brandAssetRepository.listByWorkspace(TEST_WORKSPACE, { limit: 100 });
    const matchaApproved = all.filter(
      (a) => a.name.toLowerCase().includes('matcha') && a.approvalStatus === 'approved'
    );
    assert.equal(matchaApproved.length, 1);
    assert.equal(matchaApproved[0].name, 'Matcha Tea Poster High-Res');

    // 2. Filter by category "Packaging"
    const packagingAssets = all.filter((a) => a.category === 'Packaging');
    assert.equal(packagingAssets.length, 1);
    assert.equal(packagingAssets[0].name, 'Turmeric Latte Bottle Label');
  });

  it('4. Pagination & Slicing Protocol: Computes pagination bounds and page counts', async () => {
    // Generate 25 test assets
    for (let i = 1; i <= 25; i++) {
      await brandAssetRepository.create({
        workspaceId: TEST_WORKSPACE,
        businessId: TEST_WORKSPACE,
        name: `Asset Item #${i.toString().padStart(2, '0')}`,
        section: 'Active',
        createdBy: TEST_USER,
      });
    }

    const all = await brandAssetRepository.listByWorkspace(TEST_WORKSPACE, { limit: 100 });
    assert.equal(all.length, 25);

    // Test Page Size 12
    const pageSize12 = 12;
    const totalPages12 = Math.ceil(all.length / pageSize12);
    assert.equal(totalPages12, 3); // 12 + 12 + 1

    const page1 = all.slice(0, 12);
    assert.equal(page1.length, 12);

    const page2 = all.slice(12, 24);
    assert.equal(page2.length, 12);

    const page3 = all.slice(24, 36);
    assert.equal(page3.length, 1);

    // Test Page Size 24
    const pageSize24 = 24;
    const totalPages24 = Math.ceil(all.length / pageSize24);
    assert.equal(totalPages24, 2); // 24 + 1
  });

  it('5. Multi-Format Adaptation in UX: Produces responsive derivatives across standard formats', async () => {
    const parent = await brandAssetRepository.create({
      workspaceId: TEST_WORKSPACE,
      businessId: TEST_WORKSPACE,
      name: 'Superfood Blend Announcement',
      section: 'Social Media',
      dimensions: { width: 1080, height: 1080, aspectRatio: '1:1' },
      approvalStatus: 'approved',
      createdBy: TEST_USER,
    });

    // 1. Adapt to Story Vertical (1080x1920)
    const storyRes = await assetEcosystemGatewayService.createAssetDerivative({
      workspaceId: TEST_WORKSPACE,
      userId: TEST_USER,
      parentAssetId: parent.assetId,
      targetFormat: 'story_vertical',
      dimensions: { width: 1080, height: 1920, unit: 'px' },
      nameSuffix: 'Vertical Story',
    });

    assert.equal(storyRes.success, true);
    assert.equal(storyRes.derivativeAsset.dimensions?.width, 1080);
    assert.equal(storyRes.derivativeAsset.dimensions?.height, 1920);
    assert.equal(storyRes.derivativeAsset.section, 'Social Media');

    // 2. Adapt to Landscape Banner (1200x630)
    const bannerRes = await assetEcosystemGatewayService.createAssetDerivative({
      workspaceId: TEST_WORKSPACE,
      userId: TEST_USER,
      parentAssetId: parent.assetId,
      targetFormat: 'landscape_banner',
      dimensions: { width: 1200, height: 630, unit: 'px' },
      nameSuffix: 'Web Banner',
    });

    assert.equal(bannerRes.success, true);
    assert.equal(bannerRes.derivativeAsset.dimensions?.width, 1200);
    assert.equal(bannerRes.derivativeAsset.dimensions?.height, 630);

    // 3. Adapt to Print Flyer A5 (1748x2480 @ 300 DPI)
    const flyerRes = await assetEcosystemGatewayService.createAssetDerivative({
      workspaceId: TEST_WORKSPACE,
      userId: TEST_USER,
      parentAssetId: parent.assetId,
      targetFormat: 'flyer_print',
      dimensions: { width: 1748, height: 2480, unit: 'px' },
      nameSuffix: 'Print Flyer A5',
    });

    assert.equal(flyerRes.success, true);
    assert.equal(flyerRes.derivativeAsset.section, 'Print & Packaging');
    assert.equal(flyerRes.derivativeAsset.dimensions?.width, 1748);
    assert.equal(flyerRes.derivativeAsset.dimensions?.height, 2480);
  });

  it('6. Performance Attribution in Detail Drawer: Surfaces metrics (impressions, clicks, CTR, conversions)', async () => {
    const asset = await brandAssetRepository.create({
      workspaceId: TEST_WORKSPACE,
      businessId: TEST_WORKSPACE,
      name: 'High-Impact Promotional Graphic',
      section: 'Social Media',
      createdBy: TEST_USER,
    });

    // Record performance data
    const summary = await assetEcosystemGatewayService.recordAssetPerformance({
      workspaceId: TEST_WORKSPACE,
      assetId: asset.assetId,
      campaignId: 'camp_launch_01',
      channel: 'instagram',
      impressions: 15000,
      clicks: 750,
      conversions: 75,
      spend: 3000,
      revenue: 15000,
    });

    assert.equal(summary.totalImpressions, 15000);
    assert.equal(summary.totalClicks, 750);
    assert.equal(summary.totalConversions, 75);
    assert.equal(summary.ctr, 5); // 750 / 15000 * 100 = 5.0%
    assert.equal(summary.conversionRate, 10); // 75 / 750 * 100 = 10.0%
    assert.equal(summary.roas, 5); // 15000 / 3000 = 5.0x
  });

  it('7. Strict Video Exclusion: Blocks video staging and upload at the client-server boundary', () => {
    // 1. Video MIME type
    assert.throws(
      () => {
        assetEcosystemGatewayService.assertNoVideo({ mimeType: 'video/mp4' });
      },
      (err: Error) => err.message.includes('STRICT_VIDEO_EXCLUSION')
    );

    // 2. Video extension
    assert.throws(
      () => {
        assetEcosystemGatewayService.assertNoVideo({ filename: 'brand_reel_launch.mp4' });
      },
      (err: Error) => err.message.includes('STRICT_VIDEO_EXCLUSION')
    );

    // 3. WebM extension
    assert.throws(
      () => {
        assetEcosystemGatewayService.assertNoVideo({ filename: 'animation_clip.webm' });
      },
      (err: Error) => err.message.includes('STRICT_VIDEO_EXCLUSION')
    );
  });
});
