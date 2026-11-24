/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { brandAssetRepository } from './repositories/brandAssetRepository';
import { assetEcosystemGatewayService } from './services/assetEcosystemGatewayService';
import { departmentEventBus, type DepartmentEvent } from './events/eventBus';

const TEST_WORKSPACE = 'ws_eco_test';
const TEST_USER = 'user_eco_lead';

describe('PHASE 9 — AssetLibrary Ecosystem Integration Gateway', () => {
  beforeEach(async () => {
    departmentEventBus.resetForTesting();
    // Reconcile and clean up workspace assets
    const existing = await brandAssetRepository.listByWorkspace(TEST_WORKSPACE, { limit: 200 });
    for (const a of existing) {
      await brandAssetRepository.deletePermanently(TEST_WORKSPACE, a.assetId);
    }
  });

  it('1. Business Brain: Synchronizes product metadata across linked assets and emits events', async () => {
    // 1. Create an asset linked to a product
    const asset = await brandAssetRepository.create({
      workspaceId: TEST_WORKSPACE,
      businessId: TEST_WORKSPACE,
      name: 'Organic Matcha 250g Jar Pack',
      section: 'packaging',
      type: 'packaging',
      productIds: ['prod_matcha_250'],
      approvalStatus: 'approved',
      createdBy: TEST_USER,
    });

    assert.ok(asset.assetId);
    assert.deepEqual(asset.productIds, ['prod_matcha_250']);

    // 2. Perform Business Brain product sync
    const syncResult = await assetEcosystemGatewayService.syncProductMetadata({
      workspaceId: TEST_WORKSPACE,
      productId: 'prod_matcha_250',
      productName: 'Ceremonial Organic Matcha 250g (Grade A)',
      sku: 'MTC-250-ORG-A',
      category: 'Beverages & Superfoods',
      variants: [
        { name: 'Single Jar', sku: 'MTC-250-S', size: '250g' },
        { name: 'Twin Pack', sku: 'MTC-250-T', size: '500g' },
      ],
      price: 1899,
      status: 'active',
    });

    assert.equal(syncResult.updatedAssetCount, 1);
    assert.deepEqual(syncResult.updatedAssetIds, [asset.assetId]);

    // 3. Verify asset reflects synced metadata
    const updated = await brandAssetRepository.findById(TEST_WORKSPACE, asset.assetId);
    assert.ok(updated);
    const details = updated.metadata?.productDetails as Record<string, unknown>;
    assert.ok(details);
    assert.equal(details.productName, 'Ceremonial Organic Matcha 250g (Grade A)');
    assert.equal(details.sku, 'MTC-250-ORG-A');
    assert.equal(details.variantsCount, 2);

    // 4. Verify audit trail event in DepartmentEventBus
    const recent = await departmentEventBus.getRecentEvents(TEST_WORKSPACE, 10, 'ASSET_UPDATED');
    assert.ok(recent.length >= 1);
    const event = recent.find((e) => e.resourceId === asset.assetId);
    assert.ok(event);
    assert.equal(event.metadata?.reason, 'BUSINESS_BRAIN_PRODUCT_SYNC');
  });

  it('2. BrandStudio: Ingests logos and brand identity collateral with versioning and event emission', async () => {
    const ingestResult = await assetEcosystemGatewayService.ingestBrandStudioCreative({
      workspaceId: TEST_WORKSPACE,
      userId: TEST_USER,
      assetName: 'BrainWise Primary Wordmark',
      description: 'Official horizontal logo for dark and light backgrounds',
      assetType: 'logo',
      section: 'identity',
      brandIdentityVersion: 'v2.1.0',
      svgContent: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 100"><text x="10" y="50" fill="#FF7417" font-weight="bold">BrainWise</text></svg>',
      tags: ['wordmark', 'primary-identity', 'vector'],
      tokens: {
        primaryColor: '#FF7417',
        fontFamily: 'Plus Jakarta Sans',
      },
      usageRules: {
        minClearspace: 24,
        doList: ['Use on white or stone backgrounds'],
        dontList: ['Do not rotate or distort'],
      },
    });

    assert.equal(ingestResult.success, true);
    assert.ok(ingestResult.asset.assetId);
    assert.equal(ingestResult.asset.section, 'Identity');
    assert.equal(ingestResult.asset.type, 'logo');
    assert.equal(ingestResult.asset.approvalStatus, 'approved');
    assert.ok(ingestResult.asset.tags.includes('brand-v:v2.1.0'));
    assert.ok(ingestResult.asset.tags.includes('brand-studio'));

    // Verify events emitted
    const events = await departmentEventBus.getRecentEvents(TEST_WORKSPACE, 10);
    const createdEvent = events.find(
      (e) => e.eventType === 'ASSET_CREATED' && e.resourceId === ingestResult.asset.assetId
    );
    assert.ok(createdEvent);

    const identityEvent = events.find(
      (e) => e.eventType === 'BRAND_IDENTITY_UPDATED' && e.resourceId === ingestResult.asset.assetId
    );
    assert.ok(identityEvent);
  });

  it('3. Campaign Studio: Discovers approved assets, binds campaign collection, and saves creatives', async () => {
    // Setup approved and unapproved assets
    const approvedAsset = await brandAssetRepository.create({
      workspaceId: TEST_WORKSPACE,
      businessId: TEST_WORKSPACE,
      name: 'Summer Splash Hero Banner',
      section: 'social',
      approvalStatus: 'approved',
      tags: ['summer', 'hero'],
      createdBy: TEST_USER,
    });

    const pendingAsset = await brandAssetRepository.create({
      workspaceId: TEST_WORKSPACE,
      businessId: TEST_WORKSPACE,
      name: 'Draft Mockup Banner',
      section: 'social',
      approvalStatus: 'pending',
      tags: ['summer'],
      createdBy: TEST_USER,
    });

    // 1. Discover approved only
    const discovered = await assetEcosystemGatewayService.discoverCampaignAssets({
      workspaceId: TEST_WORKSPACE,
      section: 'social',
      approvedOnly: true,
      tags: ['summer'],
    });

    assert.equal(discovered.length, 1);
    assert.equal(discovered[0].assetId, approvedAsset.assetId);

    // 2. Bind asset to campaign and create collection
    const bindResult = await assetEcosystemGatewayService.bindAssetsToCampaign({
      workspaceId: TEST_WORKSPACE,
      campaignId: 'camp_diwali_2026',
      campaignName: 'Diwali Festive Mega Launch',
      assetIds: [approvedAsset.assetId],
      createCollection: true,
      collectionName: 'Diwali 2026 Collateral Pack',
      userId: TEST_USER,
    });

    assert.equal(bindResult.success, true);
    assert.equal(bindResult.boundAssetCount, 1);
    assert.ok(bindResult.collectionId);

    // Check collection exists in repository
    const col = await brandAssetRepository.getCollection(TEST_WORKSPACE, bindResult.collectionId!);
    assert.ok(col);
    assert.equal(col.name, 'Diwali 2026 Collateral Pack');
    assert.deepEqual(col.assetIds, [approvedAsset.assetId]);

    // Check asset updated with campaignId and usageCount incremented
    const updatedApproved = await brandAssetRepository.findById(TEST_WORKSPACE, approvedAsset.assetId);
    assert.ok(updatedApproved?.campaignIds.includes('camp_diwali_2026'));
    assert.equal(updatedApproved?.usageCount, 1);

    // 3. Save campaign creative
    const creative = await assetEcosystemGatewayService.saveCampaignCreative({
      workspaceId: TEST_WORKSPACE,
      userId: TEST_USER,
      campaignId: 'camp_diwali_2026',
      campaignName: 'Diwali Festive Mega Launch',
      creativeName: 'Diwali Special Offer Carousel Slide 1',
      svgContent: '<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080"><rect width="100%" height="100%" fill="#FF7417"/><text x="540" y="540" fill="#FAFAF9">Diwali Sale</text></svg>',
      dimensions: { width: 1080, height: 1080 },
    });

    assert.ok(creative.assetId);
    assert.equal(creative.section, 'Social Media');
    assert.deepEqual(creative.campaignIds, ['camp_diwali_2026']);
  });

  it('4. Content Studio: Multi-format adaptation preserves parentAssetId, dimensions, and lineage', async () => {
    // 1. Create root parent asset (Square post 1080x1080)
    const parent = await brandAssetRepository.create({
      workspaceId: TEST_WORKSPACE,
      businessId: TEST_WORKSPACE,
      name: 'Brand Launch Announcement',
      section: 'social',
      dimensions: { width: 1080, height: 1080, aspectRatio: '1:1' },
      approvalStatus: 'approved',
      tags: ['launch', 'announcement'],
      createdBy: TEST_USER,
    });

    // 2. Adapt into Print Flyer (A5 1748x2480)
    const flyerDerivative = await assetEcosystemGatewayService.createAssetDerivative({
      workspaceId: TEST_WORKSPACE,
      userId: TEST_USER,
      parentAssetId: parent.assetId,
      targetFormat: 'flyer_print',
      dimensions: { width: 1748, height: 2480, unit: 'px' },
      nameSuffix: 'Print Flyer A5',
      notes: 'Adapted for in-store retail distribution',
    });

    assert.equal(flyerDerivative.success, true);
    assert.equal(flyerDerivative.parentAssetId, parent.assetId);
    assert.equal(flyerDerivative.derivativeAsset.parentAssetId, parent.assetId);
    assert.equal(flyerDerivative.derivativeAsset.section, 'Print & Packaging');
    assert.equal(flyerDerivative.derivativeAsset.dimensions?.width, 1748);
    assert.equal(flyerDerivative.derivativeAsset.dimensions?.height, 2480);
    assert.ok(flyerDerivative.derivativeAsset.name.includes('Print Flyer A5'));

    // 3. Adapt into Instagram Story (1080x1920)
    const storyDerivative = await assetEcosystemGatewayService.createAssetDerivative({
      workspaceId: TEST_WORKSPACE,
      userId: TEST_USER,
      parentAssetId: parent.assetId,
      targetFormat: 'story_vertical',
      dimensions: { width: 1080, height: 1920, unit: 'px' },
      nameSuffix: 'IG Story Vertical',
    });

    assert.equal(storyDerivative.success, true);
    assert.equal(storyDerivative.derivativeAsset.section, 'Social Media');
    assert.equal(storyDerivative.derivativeAsset.dimensions?.width, 1080);
    assert.equal(storyDerivative.derivativeAsset.dimensions?.height, 1920);

    // 4. Verify parent asset's lineage metadata
    const updatedParent = await brandAssetRepository.findById(TEST_WORKSPACE, parent.assetId);
    assert.ok(updatedParent);
    assert.equal(updatedParent.metadata?.derivativeCount, 2);
    const derivatives = updatedParent.metadata?.derivativeAssetIds as string[];
    assert.equal(derivatives.length, 2);
    assert.ok(derivatives.includes(flyerDerivative.derivativeAsset.assetId));
    assert.ok(derivatives.includes(storyDerivative.derivativeAsset.assetId));
  });

  it('5. Competitive Intelligence: Generates certified non-infringing creative opportunities', async () => {
    const opportunities = await assetEcosystemGatewayService.getCreativeOpportunities({
      workspaceId: TEST_WORKSPACE,
      productCategory: 'Organic Beverages',
    });

    assert.ok(opportunities.length >= 3);
    for (const opp of opportunities) {
      assert.ok(opp.opportunityId);
      assert.ok(opp.title);
      assert.ok(opp.competitorGap);
      assert.ok(opp.recommendedAngle);
      assert.ok(opp.suggestedFormats.length > 0);
      // Guarantee non-infringement guardrail
      assert.equal(opp.nonInfringementCertified, true);
      assert.ok(opp.actionableTags.length > 0);
    }
  });

  it('6. Analytics: Attributes performance metrics, updates usage counts, and ranks top assets', async () => {
    // 1. Create two test assets
    const assetA = await brandAssetRepository.create({
      workspaceId: TEST_WORKSPACE,
      businessId: TEST_WORKSPACE,
      name: 'High-Converting Value Prop Graphic',
      section: 'social',
      createdBy: TEST_USER,
    });

    const assetB = await brandAssetRepository.create({
      workspaceId: TEST_WORKSPACE,
      businessId: TEST_WORKSPACE,
      name: 'Moderate Engagement Infographic',
      section: 'social',
      createdBy: TEST_USER,
    });

    // 2. Record performance for Asset A: 10,000 imp, 600 clicks (CTR = 6.00%), 60 conversions (CR = 10.00%)
    const summaryA = await assetEcosystemGatewayService.recordAssetPerformance({
      workspaceId: TEST_WORKSPACE,
      assetId: assetA.assetId,
      campaignId: 'camp_001',
      channel: 'instagram',
      impressions: 10000,
      clicks: 600,
      conversions: 60,
      spend: 5000,
      revenue: 25000,
    });

    assert.equal(summaryA.totalImpressions, 10000);
    assert.equal(summaryA.totalClicks, 600);
    assert.equal(summaryA.totalConversions, 60);
    assert.equal(summaryA.ctr, 6);
    assert.equal(summaryA.conversionRate, 10);
    assert.equal(summaryA.roas, 5);

    // 3. Record performance for Asset B: 20,000 imp, 400 clicks (CTR = 2.00%), 20 conversions (CR = 5.00%)
    await assetEcosystemGatewayService.recordAssetPerformance({
      workspaceId: TEST_WORKSPACE,
      assetId: assetB.assetId,
      campaignId: 'camp_002',
      channel: 'facebook',
      impressions: 20000,
      clicks: 400,
      conversions: 20,
    });

    // 4. Check rank by CTR
    const topByCtr = await assetEcosystemGatewayService.listTopPerformingAssets(TEST_WORKSPACE, 'ctr', 10);
    assert.ok(topByCtr.length >= 2);
    assert.equal(topByCtr[0].assetId, assetA.assetId); // 6% > 2%
    assert.equal(topByCtr[1].assetId, assetB.assetId);

    // 5. Check rank by Impressions
    const topByImp = await assetEcosystemGatewayService.listTopPerformingAssets(TEST_WORKSPACE, 'impressions', 10);
    assert.equal(topByImp[0].assetId, assetB.assetId); // 20k > 10k
  });

  it('7. Guardrail: STRICT VIDEO EXCLUSION blocks any video generation or ingestion attempt', () => {
    // 1. Ingestion of video MIME type throws
    assert.throws(
      () => {
        assetEcosystemGatewayService.assertNoVideo({ mimeType: 'video/mp4' });
      },
      (err: Error) => {
        return (
          err.message.includes('STRICT_VIDEO_EXCLUSION') &&
          err.message.includes('BrainWise strictly excludes all AI video generation')
        );
      }
    );

    // 2. Video file extension throws
    assert.throws(
      () => {
        assetEcosystemGatewayService.assertNoVideo({ filename: 'campaign_promo.mov' });
      },
      (err: Error) => {
        return err.message.includes('STRICT_VIDEO_EXCLUSION');
      }
    );

    // 3. Video asset type throws
    assert.throws(
      () => {
        assetEcosystemGatewayService.assertNoVideo({ assetType: 'instagram_reel_video' });
      },
      (err: Error) => {
        return err.message.includes('STRICT_VIDEO_EXCLUSION');
      }
    );
  });

  it('8. Event Bus & Audit Trail: Validates idempotent event dispatch and persistent audit trail', async () => {
    let handledCount = 0;
    const unsubscribe = departmentEventBus.subscribe('ASSET_CREATED', () => {
      handledCount++;
    });

    const testAsset = await brandAssetRepository.create({
      workspaceId: TEST_WORKSPACE,
      businessId: TEST_WORKSPACE,
      name: 'Audit Trail Verification Graphic',
      section: 'active',
      createdBy: TEST_USER,
    });

    await departmentEventBus.emit({
      workspaceId: TEST_WORKSPACE,
      userId: TEST_USER,
      eventType: 'ASSET_CREATED',
      resourceId: testAsset.assetId,
      metadata: { check: 'audit_test' },
    });

    assert.equal(handledCount, 1);
    unsubscribe();

    // Verify persisted events queryable
    const events = await departmentEventBus.getRecentEvents(TEST_WORKSPACE, 20);
    assert.ok(events.length > 0);
    assert.ok(events.every((e) => e.workspaceId === TEST_WORKSPACE));
  });
});
