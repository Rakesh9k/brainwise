/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { brandAssetRepository } from './repositories/brandAssetRepository';
import { productRepository } from './repositories/productRepository';
import { brandGuardianService } from './services/brandGuardianService';
import { socialMediaIntelligenceService, PLATFORM_SPECS_CATALOG } from './services/socialMediaIntelligenceService';

const TEST_WORKSPACE = 'ws_social_intelligence';
const TEST_USER = 'user_social_strategist';

describe('PHASE 5 — BUILD THE SOCIAL MEDIA ASSET INTELLIGENCE SYSTEM', () => {
  beforeEach(async () => {
    // Purge test workspace
    const active = await brandAssetRepository.listByWorkspace(TEST_WORKSPACE, { limit: 200 });
    for (const a of active) {
      await brandAssetRepository.deletePermanently(TEST_WORKSPACE, a.assetId);
    }
  });

  // ===========================================================================
  // 1. PLATFORM-SPECIFIC LIBRARY & CONFIGURABLE FORMATS
  // ===========================================================================
  it('1. Platform-Specific Library: Exposes configurable platform format catalog and safe zones', () => {
    const allSpecs = socialMediaIntelligenceService.getPlatformSpecifications();
    assert.ok(allSpecs.length >= 10);

    // Instagram Specs
    const igPost = socialMediaIntelligenceService.getSpecification('instagram', 'square_post');
    assert.equal(igPost.dimensions.width, 1080);
    assert.equal(igPost.dimensions.height, 1080);
    assert.equal(igPost.aspectRatio, '1:1');

    const igStory = socialMediaIntelligenceService.getSpecification('instagram', 'story_slide');
    assert.equal(igStory.dimensions.height, 1920);
    assert.equal(igStory.safeZones.topPx, 250); // Header safe clearance
    assert.equal(igStory.safeZones.bottomPx, 250); // Input safe clearance

    const igReelCover = socialMediaIntelligenceService.getSpecification('instagram', 'reel_cover');
    assert.equal(igReelCover.dimensions.height, 1920);
    assert.ok(igReelCover.safeZones.specialZones?.some((z) => z.name === 'Grid Preview Safe Area'));

    // YouTube Thumbnail Spec with Duration Badge Clearance
    const ytThumb = socialMediaIntelligenceService.getSpecification('youtube', 'youtube_thumbnail');
    assert.equal(ytThumb.dimensions.width, 1280);
    assert.equal(ytThumb.dimensions.height, 720);
    assert.ok(ytThumb.safeZones.specialZones?.some((z) => z.name === 'Timestamp Badge Safe Zone'));

    // LinkedIn Banner Spec
    const liBanner = socialMediaIntelligenceService.getSpecification('linkedin', 'landscape_banner');
    assert.equal(liBanner.dimensions.width, 1200);
    assert.equal(liBanner.dimensions.height, 627);
  });

  // ===========================================================================
  // 2. CREATIVE METADATA
  // ===========================================================================
  it('2. Creative Metadata: Persists exhaustive creative parameters, safe zones, and derivative relationships', async () => {
    const asset = await brandAssetRepository.create({
      workspaceId: TEST_WORKSPACE,
      businessId: TEST_WORKSPACE,
      name: 'Spring Equinox Elixir Square Feed Ad',
      section: 'Social Media',
      category: 'Collateral',
      approvalStatus: 'approved',
      headlineText: 'Pure Himalayan Purity',
      subtext: 'Directly sourced from high-altitude valleys',
      metadata: {
        platform: 'instagram',
        contentType: 'square_post',
        aspectRatio: '1:1',
        dimensions: { width: 1080, height: 1080 },
        campaignId: 'camp_spring_2026',
        campaignName: 'Spring Harvest',
        targetAudience: 'Health conscious urban professionals',
        objective: 'conversion',
        callToAction: 'Order Today · Free Delivery',
        publicationStatus: 'scheduled',
        publicationDate: '2026-04-01T10:00:00Z',
        safeZoneCompliant: true,
      },
      createdBy: TEST_USER,
    });

    const retrieved = await brandAssetRepository.findById(TEST_WORKSPACE, asset.assetId);
    assert.ok(retrieved);
    assert.equal(retrieved.metadata?.platform, 'instagram');
    assert.equal(retrieved.metadata?.objective, 'conversion');
    assert.equal(retrieved.metadata?.safeZoneCompliant, true);
  });

  // ===========================================================================
  // 3. PLATFORM ADAPTATION ENGINE
  // ===========================================================================
  it('3. Platform Adaptation Engine: Adapts source asset into multi-platform variations without stretching or cropping', async () => {
    await brandGuardianService.bootstrapDefaultIdentity(TEST_WORKSPACE);

    // Master 1:1 creative
    const masterCreative = await brandAssetRepository.create({
      workspaceId: TEST_WORKSPACE,
      businessId: TEST_WORKSPACE,
      name: 'Wild Forest Raw Honey Master Collateral',
      section: 'Social Media',
      category: 'Collateral',
      headlineText: '100% Raw Forest Honey',
      subtext: 'Single-origin wild harvest',
      svgContent: `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080"><rect width="100%" height="100%" fill="#171717"/><text x="540" y="540" font-family="Plus Jakarta Sans">100% Raw Forest Honey</text></svg>`,
      approvalStatus: 'approved',
      createdBy: TEST_USER,
    });

    // Adapt to Instagram Reel Cover (9:16) and YouTube Thumbnail (16:9)
    const adaptation = await socialMediaIntelligenceService.adaptAssetToPlatforms({
      workspaceId: TEST_WORKSPACE,
      sourceAssetId: masterCreative.assetId,
      targetFormats: [
        { platform: 'instagram', contentType: 'reel_cover' },
        { platform: 'youtube', contentType: 'youtube_thumbnail' },
      ],
      userId: TEST_USER,
    });

    assert.equal(adaptation.adaptedDerivatives.length, 2);

    // Verify Reel cover adaptation
    const reelDeriv = adaptation.adaptedDerivatives.find((d) => d.contentType === 'reel_cover');
    assert.ok(reelDeriv);
    assert.equal(reelDeriv.dimensions.height, 1920);
    assert.ok(reelDeriv.safeZoneCompliance.isCompliant);
    assert.ok(reelDeriv.svgContent.includes('Grid Preview Safe Guide'));

    // Verify YouTube thumbnail adaptation
    const ytDeriv = adaptation.adaptedDerivatives.find((d) => d.contentType === 'youtube_thumbnail');
    assert.ok(ytDeriv);
    assert.equal(ytDeriv.dimensions.width, 1280);
    assert.equal(ytDeriv.dimensions.height, 720);
    assert.ok(ytDeriv.safeZoneCompliance.isCompliant);

    // Verify lineage in DAM
    const updatedMaster = await brandAssetRepository.findById(TEST_WORKSPACE, masterCreative.assetId);
    assert.ok(updatedMaster?.derivativeAssetIds && updatedMaster.derivativeAssetIds.length >= 2);
  });

  // ===========================================================================
  // 4. AI CREATIVE GENERATION (SOCIAL & CAROUSELS)
  // ===========================================================================
  it('4. AI Creative Generation: Generates multi-slide carousels and Reel covers grounded in brand guidelines', async () => {
    await brandGuardianService.bootstrapDefaultIdentity(TEST_WORKSPACE);

    // Generate 5-slide educational carousel
    const carouselRes = await socialMediaIntelligenceService.generateSocialCreative({
      workspaceId: TEST_WORKSPACE,
      userId: TEST_USER,
      platform: 'instagram',
      contentType: 'carousel_multi_slide',
      promptHeadline: '5 Signs Your Honey Has Been Compromised',
      subheadline: 'Learn how mass-market brands dilute wild honey with rice syrup.',
      callToAction: 'Read Botanical Report',
    });

    assert.ok(carouselRes.assetId);
    assert.equal(carouselRes.contentType, 'carousel_multi_slide');
    assert.equal(carouselRes.socialMetadata.carouselSlideCount, 5);
    assert.ok(carouselRes.svgContent.includes('SLIDE 1 OF 5'));

    // Generate static YouTube Thumbnail
    const thumbRes = await socialMediaIntelligenceService.generateSocialCreative({
      workspaceId: TEST_WORKSPACE,
      userId: TEST_USER,
      platform: 'youtube',
      contentType: 'youtube_thumbnail',
      promptHeadline: 'How Raw Honey Is Actually Harvested',
      callToAction: 'Watch Documentary',
    });

    assert.equal(thumbRes.dimensions.width, 1280);
    assert.equal(thumbRes.dimensions.height, 720);
    assert.ok(thumbRes.groundedIn.brandName);
  });

  // ===========================================================================
  // 5. CAMPAIGN STUDIO INTEGRATION
  // ===========================================================================
  it('5. Campaign Studio Integration: Binds creative variations into campaign collections with event emission', async () => {
    const a1 = await brandAssetRepository.create({
      workspaceId: TEST_WORKSPACE,
      businessId: TEST_WORKSPACE,
      name: 'Festive Wild Honey Reel Cover',
      section: 'Social Media',
      category: 'Collateral',
      approvalStatus: 'approved',
      createdBy: TEST_USER,
    });

    const a2 = await brandAssetRepository.create({
      workspaceId: TEST_WORKSPACE,
      businessId: TEST_WORKSPACE,
      name: 'Festive Honey Story Slide',
      section: 'Social Media',
      category: 'Collateral',
      approvalStatus: 'approved',
      createdBy: TEST_USER,
    });

    const campaignBinding = await socialMediaIntelligenceService.bindCreativesToCampaign({
      workspaceId: TEST_WORKSPACE,
      campaignId: 'camp_diwali_2026',
      campaignName: 'Diwali Golden Harvest',
      assetIds: [a1.assetId, a2.assetId],
      userId: TEST_USER,
    });

    assert.equal(campaignBinding.campaignId, 'camp_diwali_2026');
    assert.equal(campaignBinding.totalAssetsCount, 2);
    assert.equal(campaignBinding.approvedCount, 2);
    assert.ok(campaignBinding.collectionId);

    // Verify campaignId attached to individual assets
    const updatedA1 = await brandAssetRepository.findById(TEST_WORKSPACE, a1.assetId);
    assert.ok(updatedA1?.campaignIds?.includes('camp_diwali_2026'));
  });

  // ===========================================================================
  // 6. PERFORMANCE INTELLIGENCE & TELEMETRY
  // ===========================================================================
  it('6. Performance Intelligence: Ingests social analytics telemetry and computes CTR, engagement, and ROAS', async () => {
    const asset = await brandAssetRepository.create({
      workspaceId: TEST_WORKSPACE,
      businessId: TEST_WORKSPACE,
      name: 'Performance Tracked Story Creative',
      section: 'Social Media',
      category: 'Collateral',
      approvalStatus: 'approved',
      createdBy: TEST_USER,
    });

    const summary = await socialMediaIntelligenceService.ingestPerformanceMetrics({
      workspaceId: TEST_WORKSPACE,
      assetId: asset.assetId,
      platform: 'instagram',
      channel: 'instagram_stories',
      reportingDate: '2026-11-20',
      reach: 50000,
      impressions: 65000,
      clicks: 2800,
      saves: 450,
      shares: 320,
      conversions: 180,
      spend: 500,
      revenue: 4200,
      provenance: 'API_DIRECT',
    });

    assert.equal(summary.totalImpressions, 65000);
    assert.equal(summary.totalClicks, 2800);
    assert.equal(summary.ctr, 4.31); // 2800 / 65000 * 100
    assert.equal(summary.engagementRate, 7.14); // (2800 + 450 + 320) / 50000 * 100
    assert.equal(summary.roas, 8.4); // 4200 / 500
  });

  // ===========================================================================
  // 7. CREATIVE PERFORMANCE MEMORY
  // ===========================================================================
  it('7. Creative Performance Memory: Identifies visual patterns while explicitly cautioning against confusing correlation with causation', async () => {
    const memoryPatterns = await socialMediaIntelligenceService.extractCreativePerformanceMemory(TEST_WORKSPACE);
    assert.ok(memoryPatterns.length >= 2);

    const carouselPattern = memoryPatterns.find((p) => p.dominantFormat === 'carousel_multi_slide');
    assert.ok(carouselPattern);
    assert.ok(carouselPattern.averageEngagementRate > 5.0);
    assert.ok(carouselPattern.evidenceBasedRecommendation.toLowerCase().includes('educational'));
    // Mandatory Causation Caution Check
    assert.ok(carouselPattern.causationCaution.toLowerCase().includes('correlated') || carouselPattern.causationCaution.toLowerCase().includes('correlation'));
  });

  // ===========================================================================
  // 8. CREATIVE REPURPOSING
  // ===========================================================================
  it('8. Creative Repurposing: Repurposes existing collateral into a target platform format with lineage', async () => {
    await brandGuardianService.bootstrapDefaultIdentity(TEST_WORKSPACE);

    // Existing print label asset
    const labelAsset = await brandAssetRepository.create({
      workspaceId: TEST_WORKSPACE,
      businessId: TEST_WORKSPACE,
      name: 'Wild Forest Honey Glass Jar Label 500g',
      section: 'Print & Packaging',
      category: 'Packaging',
      headlineText: 'Wild Forest Raw Honey',
      subtext: 'Net Wt: 500g · Certified Himalayan',
      svgContent: `<svg width="800" height="400"><text>Wild Forest Raw Honey</text></svg>`,
      approvalStatus: 'approved',
      createdBy: TEST_USER,
    });

    // Repurpose to Instagram Story (9:16)
    const repurposed = await socialMediaIntelligenceService.repurposeAsset({
      workspaceId: TEST_WORKSPACE,
      sourceAssetId: labelAsset.assetId,
      targetPlatform: 'instagram',
      targetContentType: 'story_slide',
      userId: TEST_USER,
    });

    assert.ok(repurposed.derivativeAssetId);
    assert.equal(repurposed.platform, 'instagram');
    assert.equal(repurposed.contentType, 'story_slide');
    assert.equal(repurposed.dimensions.height, 1920);

    const derivativeDoc = await brandAssetRepository.findById(TEST_WORKSPACE, repurposed.derivativeAssetId);
    assert.equal(derivativeDoc?.parentAssetId, labelAsset.assetId);
    assert.equal(derivativeDoc?.section, 'Social Media');
  });

  // ===========================================================================
  // 9. GUARDRAIL — STRICT VIDEO EXCLUSION
  // ===========================================================================
  it('9. Guardrail: Strictly intercepts and rejects video generation and pipeline execution', async () => {
    await assert.rejects(
      async () => {
        await socialMediaIntelligenceService.generateSocialCreative({
          workspaceId: TEST_WORKSPACE,
          userId: TEST_USER,
          platform: 'instagram',
          contentType: 'square_post',
          promptHeadline: 'Generate an MP4 video clip for Instagram',
        });
      },
      (err: Error) => {
        return (
          err.message.includes('STRICT_VIDEO_EXCLUSION') &&
          err.message.includes('strictly excludes all AI video generation')
        );
      }
    );
  });
});
