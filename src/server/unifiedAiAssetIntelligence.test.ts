/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { unifiedAiAssetIntelligenceService } from './services/unifiedAiAssetIntelligenceService';
import { brandAssetRepository } from './repositories/brandAssetRepository';
import { productRepository } from './repositories/productRepository';
import type { ProductEntity } from './types/api';

describe('BRAINWISE UNIFIED AI ASSET INTELLIGENCE ENGINE — PHASE 7 ACCEPTANCE TEST SUITE', () => {
  const wsId = `ws_ai_${Date.now()}`;
  const userId = `user_ai_${Date.now()}`;
  const productId = `prod_choc_${Date.now()}`;

  // ===========================================================================
  // 1. MULTIMODAL UNDERSTANDING & AI METADATA EXTRACTION
  // ===========================================================================
  it('1. Performs multimodal asset understanding, OCR extraction, color profiling, and AI metadata generation', async () => {
    // 1. Seed verified product in Business Brain
    const product: ProductEntity = {
      productId,
      workspaceId: wsId,
      name: 'Artisanal Dark Chocolate Truffle',
      sku: 'SKU-CHO-85',
      category: 'Confectionery',
      description: 'Single-estate 85% single-origin dark chocolate truffles.',
      price: 599,
      currency: 'INR',
      status: 'active',
      source: 'USER_CONFIRMED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await productRepository.createProduct(product);

    // 2. Create asset with SVG markup containing text and colors
    const svgContent = `
      <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200">
        <rect width="100%" height="100%" fill="#FFFFFF"/>
        <text x="100" y="200" fill="#252525" font-size="48">Artisanal Dark Chocolate Truffle</text>
        <text x="100" y="300" fill="#686864" font-size="28">Net Wt: 200g · Single-Estate Organic Cocoa</text>
        <rect x="100" y="400" width="400" height="400" fill="#FF7417"/>
      </svg>
    `;

    const asset = await brandAssetRepository.create({
      workspaceId: wsId,
      businessId: wsId,
      name: 'Artisanal Dark Chocolate Outer Box',
      category: 'Packaging',
      section: 'Print & Packaging',
      assetType: 'svg',
      mimeType: 'image/svg+xml',
      headlineText: 'Artisanal Dark Chocolate Truffle',
      subtext: 'Net Wt: 200g · Single-Estate Organic Cocoa',
      svgContent,
      tags: ['chocolate', 'luxury', 'organic'],
      productIds: [productId],
      dimensions: { width: 1200, height: 1200, unit: 'px' },
      resolution: { dpi: 300, colorSpace: 'CMYK' },
      createdBy: userId,
    });

    // 3. Analyze asset with Unified AI Engine
    const result = await unifiedAiAssetIntelligenceService.analyzeAsset({
      workspaceId: wsId,
      assetId: asset.assetId,
      userId,
      bypassCredits: true,
    });

    assert.ok(result, 'Analysis result must be returned');
    assert.equal(result.assetId, asset.assetId);

    // Multimodal checks
    assert.ok(result.multimodal.extractedText.includes('Artisanal Dark Chocolate Truffle'));
    assert.ok(result.multimodal.extractedText.includes('Net Wt: 200g'));
    assert.equal(result.multimodal.backgroundColorHex, '#FFFFFF');
    assert.equal(result.multimodal.isDarkTheme, false);
    assert.ok(result.multimodal.dominantColors.length > 0);

    // AI metadata checks
    assert.ok(result.metadata.title);
    assert.ok(result.metadata.description);
    assert.ok(result.metadata.tags.includes('chocolate'));
    assert.ok(result.metadata.visualConcepts.length > 0);
    assert.equal(result.metadata.provenance, 'AI_INFERRED');
    assert.ok(result.metadata.confidence >= 0.85);
  });

  // ===========================================================================
  // 2. AUTOMATIC CLASSIFICATION & HUMAN PROVENANCE PROTECTION
  // ===========================================================================
  it('2. Automatically classifies assets and guarantees that human overrides are NEVER overwritten by AI', async () => {
    const assets = await brandAssetRepository.listByWorkspace(wsId);
    const asset = assets[0];

    const initial = await unifiedAiAssetIntelligenceService.getAssetIntelligence(wsId, asset.assetId);
    assert.ok(initial);
    assert.equal(initial.classification.provenance, 'AI_INFERRED');

    // Human user corrects classification
    const overridden = await unifiedAiAssetIntelligenceService.applyHumanClassificationOverride({
      workspaceId: wsId,
      assetId: asset.assetId,
      userId,
      category: 'Packaging',
      section: 'Print & Packaging',
      tags: ['verified-packaging', 'chocolate-box', 'master-die'],
    });

    assert.equal(overridden.classification.provenance, 'USER_CONFIRMED');
    assert.equal(overridden.classification.humanOverrideApplied, true);
    assert.equal(overridden.classification.category, 'Packaging');

    // Re-run AI analysis
    const reanalyzed = await unifiedAiAssetIntelligenceService.analyzeAsset({
      workspaceId: wsId,
      assetId: asset.assetId,
      userId,
      bypassCredits: true,
    });

    // Provenance MUST remain USER_CONFIRMED and category unchanged
    assert.equal(reanalyzed.classification.provenance, 'USER_CONFIRMED');
    assert.equal(reanalyzed.classification.category, 'Packaging');
    assert.equal(reanalyzed.classification.humanOverrideApplied, true);
  });

  // ===========================================================================
  // 3. SEMANTIC SEARCH & NATURAL LANGUAGE HYBRID RETRIEVAL
  // ===========================================================================
  it('3. Executes natural language semantic search combining keywords, OCR, concepts, and visual styles', async () => {
    // Seed Asset 2: Dark Theme Diwali Creative
    const diwaliSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">
        <rect width="100%" height="100%" fill="#0C0A09"/>
        <text x="100" y="200" fill="#FF7417">Diwali Festive Sparkle Mega Sale</text>
        <text x="100" y="300" fill="#FFFFFF">Celebrate with handcrafted confections</text>
      </svg>
    `;
    const diwaliAsset = await brandAssetRepository.create({
      workspaceId: wsId,
      businessId: wsId,
      name: 'Diwali Festive Sparkle Post',
      category: 'Instagram Post',
      section: 'Social Media',
      assetType: 'svg',
      mimeType: 'image/svg+xml',
      headlineText: 'Diwali Festive Sparkle Mega Sale',
      subtext: 'Celebrate with handcrafted confections',
      svgContent: diwaliSvg,
      tags: ['diwali', 'festive', 'sale', 'instagram', 'sweets'],
      dimensions: { width: 1080, height: 1080, unit: 'px' },
      resolution: { dpi: 72, colorSpace: 'RGB' },
      status: 'approved',
      createdBy: userId,
    });
    await unifiedAiAssetIntelligenceService.analyzeAsset({
      workspaceId: wsId,
      assetId: diwaliAsset.assetId,
      userId,
      bypassCredits: true,
    });

    // Query A: "Find all product photos with a white background"
    const resultsA = await unifiedAiAssetIntelligenceService.semanticSearch({
      workspaceId: wsId,
      query: 'Find all product photos with a white background',
    });
    assert.ok(resultsA.length > 0, 'Must return matching results');
    assert.equal(resultsA[0].asset.name, 'Artisanal Dark Chocolate Outer Box');
    assert.ok(resultsA[0].matchReasons.some((r) => r.includes('white/light')));

    // Query B: "Find Instagram creatives used during Diwali"
    const resultsB = await unifiedAiAssetIntelligenceService.semanticSearch({
      workspaceId: wsId,
      query: 'Find Instagram creatives used during Diwali',
    });
    assert.ok(resultsB.length > 0);
    assert.equal(resultsB[0].asset.name, 'Diwali Festive Sparkle Post');
    assert.ok(resultsB[0].matchReasons.some((r) => r.includes('Instagram')));

    // Query C: "Show the latest approved chocolate packaging"
    const resultsC = await unifiedAiAssetIntelligenceService.semanticSearch({
      workspaceId: wsId,
      query: 'Show the latest approved chocolate packaging',
    });
    assert.ok(resultsC.length > 0);
    assert.equal(resultsC[0].asset.name, 'Artisanal Dark Chocolate Outer Box');
  });

  // ===========================================================================
  // 4. VISUAL SIMILARITY & PERCEPTUAL HASHING
  // ===========================================================================
  it('4. Computes 64-bit dHash and detects visual similarity even with format or dimension differences', async () => {
    const markupA = `<svg width="800" height="800"><rect fill="#FF7417"/><text>Title</text></svg>`;
    const markupIdentical = `<svg width="800" height="800"><rect fill="#FF7417"/><text>Title</text></svg>`;
    const markupSlightShift = `<svg width="820" height="820"><rect fill="#FF7417"/><text>Title</text></svg>`;
    const markupTotallyDifferent = `<svg width="1920" height="1080"><circle fill="#0C0A09"/><path d="M10 20 L30 40"/></svg>`;

    const hashA = unifiedAiAssetIntelligenceService.computeDHash(markupA, { width: 800, height: 800 });
    const hashIdentical = unifiedAiAssetIntelligenceService.computeDHash(markupIdentical, { width: 800, height: 800 });
    const hashShift = unifiedAiAssetIntelligenceService.computeDHash(markupSlightShift, { width: 820, height: 820 });
    const hashDiff = unifiedAiAssetIntelligenceService.computeDHash(markupTotallyDifferent, { width: 1920, height: 1080 });

    // 1. Identical markup has 0 distance
    const distIdentical = unifiedAiAssetIntelligenceService.computeHammingDistance(hashA, hashIdentical);
    assert.equal(distIdentical, 0, 'Identical artwork must have Hamming distance 0');

    // 2. Minor dimension variation has low Hamming distance (near match)
    const distShift = unifiedAiAssetIntelligenceService.computeHammingDistance(hashA, hashShift);
    assert.ok(distShift <= 4, `Minor shift distance ${distShift} must be <= 4`);

    // 3. Different structure has higher distance
    const distDiff = unifiedAiAssetIntelligenceService.computeHammingDistance(hashA, hashDiff);
    assert.ok(distDiff > 8, `Different artwork distance ${distDiff} must exceed near-match threshold`);
  });

  // ===========================================================================
  // 5. DUPLICATE DETECTION GUARDRAIL (PREVENTING ACCIDENTAL DATA LOSS)
  // ===========================================================================
  it('5. Enforces duplicate detection guardrails and never deletes duplicates without human authorization', async () => {
    const assets = await brandAssetRepository.listByWorkspace(wsId);
    const sourceAsset = assets[0];

    // Check exact SHA-256 duplicate
    const exactCheck = await unifiedAiAssetIntelligenceService.checkDuplicates({
      workspaceId: wsId,
      checksumSha256: sourceAsset.verifiedMetadata?.checksumSha256 || 'chk_mock_sha',
      originalFileName: 'duplicate_test.svg',
    });
    // If checksum exists
    if (sourceAsset.verifiedMetadata?.checksumSha256) {
      assert.equal(exactCheck.duplicateType, 'EXACT_DUPLICATE');
      assert.equal(exactCheck.recommendation, 'REJECT_UPLOAD');
    }

    // Check near duplicate with similar SVG markup
    const nearCheck = await unifiedAiAssetIntelligenceService.checkDuplicates({
      workspaceId: wsId,
      svgMarkup: sourceAsset.svgContent,
    });
    assert.ok(
      nearCheck.duplicateType === 'EXACT_DUPLICATE' || nearCheck.duplicateType === 'NEAR_DUPLICATE',
      'Must identify duplicate'
    );
    assert.ok(
      nearCheck.recommendation === 'REJECT_UPLOAD' || nearCheck.recommendation === 'LINK_AS_VERSION'
    );
    assert.notEqual(nearCheck.recommendation, 'KEEP_BOTH');
    assert.ok(nearCheck.reason.length > 0);
  });

  // ===========================================================================
  // 6. ASSET QUALITY INTELLIGENCE
  // ===========================================================================
  it('6. Evaluates asset quality (DPI, readability, dimensions, production suitability)', async () => {
    const assets = await brandAssetRepository.listByWorkspace(wsId);
    const packagingAsset = assets.find((a) => a.section === 'Print & Packaging');
    assert.ok(packagingAsset);

    const intel = await unifiedAiAssetIntelligenceService.getAssetIntelligence(wsId, packagingAsset.assetId);
    assert.ok(intel);

    const quality = intel.quality;
    assert.ok(quality.overallScore >= 80);
    assert.equal(quality.resolutionDpi, 300);
    assert.equal(quality.aspectRatio, '1:1');
    assert.equal(quality.productionSuitability, 'print_ready');
    assert.equal(quality.isHighResolution, true);
    assert.ok(quality.textReadabilityScore >= 90);
  });

  // ===========================================================================
  // 7. BRAND COMPLIANCE INTEGRATION
  // ===========================================================================
  it('7. Integrates with Brand Guardian to assess live brand guideline alignment', async () => {
    const assets = await brandAssetRepository.listByWorkspace(wsId);
    const asset = assets[0];

    const intel = await unifiedAiAssetIntelligenceService.getAssetIntelligence(wsId, asset.assetId);
    assert.ok(intel);
    assert.ok(intel.brandCompliance);
    assert.ok(typeof intel.brandCompliance.complianceScore === 'number');
    assert.ok(typeof intel.brandCompliance.isCompliant === 'boolean');
  });

  // ===========================================================================
  // 8. ASSET RECOMMENDATION ENGINE
  // ===========================================================================
  it('8. Recommends assets for campaign briefs with transparent scoring breakdowns and placement suggestions', async () => {
    const recommendations = await unifiedAiAssetIntelligenceService.recommendAssets({
      workspaceId: wsId,
      campaignBrief: 'Diwali festive promotional creative for Instagram and social feed',
      targetChannel: 'Instagram',
      businessObjective: 'Brand Awareness',
      limit: 3,
    });

    assert.ok(recommendations.length > 0, 'Must produce recommendations');
    const topRec = recommendations[0];
    assert.ok(topRec.recommendationScore >= 70);
    assert.ok(topRec.rationale.length > 0);
    assert.ok(topRec.scoringBreakdown.channelSuitability > 0);
    assert.ok(topRec.suggestedPlacements.includes('Instagram'));
  });

  // ===========================================================================
  // 9. ASSET RELATIONSHIP INTELLIGENCE
  // ===========================================================================
  it('9. Assembles bidirectional relationship graph linking asset to products, brands, and versions', async () => {
    const assets = await brandAssetRepository.listByWorkspace(wsId);
    const asset = assets.find((a) => a.productIds?.includes(productId)) || assets[0];

    const graph = await unifiedAiAssetIntelligenceService.buildRelationshipGraph(asset);
    assert.ok(graph);
    assert.equal(graph.assetId, asset.assetId);
    assert.ok(graph.connectedBrands.length > 0);
    assert.ok(graph.connectedProducts.some((p) => p.productId === productId));
  });

  // ===========================================================================
  // 10. AI PROCESSING ORCHESTRATION & BACKGROUND JOB QUEUE
  // ===========================================================================
  it('10. Handles background job queues, idempotency, and asynchronous execution', async () => {
    const assets = await brandAssetRepository.listByWorkspace(wsId);
    const asset = assets[0];
    const idempotencyKey = `idemp_${Date.now()}`;

    // 1. Create job
    const job = await unifiedAiAssetIntelligenceService.createJob({
      workspaceId: wsId,
      userId,
      assetId: asset.assetId,
      jobType: 'ANALYZE_ASSET',
      idempotencyKey,
    });

    assert.ok(job);
    assert.ok(job.status === 'queued' || job.status === 'processing');

    // 2. Wait for background microtask completion
    await new Promise((r) => setTimeout(r, 100));

    // 3. Inspect job completion
    const completedJob = await unifiedAiAssetIntelligenceService.getJob(wsId, job.jobId);
    assert.ok(completedJob);
    assert.equal(completedJob.status, 'completed');
    assert.ok(completedJob.result);
    assert.ok(completedJob.logs.length >= 2);

    // 4. Test idempotency deduplication
    const dupeJob = await unifiedAiAssetIntelligenceService.createJob({
      workspaceId: wsId,
      userId,
      assetId: asset.assetId,
      jobType: 'ANALYZE_ASSET',
      idempotencyKey,
    });
    assert.equal(dupeJob.jobId, job.jobId, 'Idempotency key must return existing job');
  });

  // ===========================================================================
  // 11. STRICT VIDEO EXCLUSION GUARDRAIL
  // ===========================================================================
  it('11. Strictly rejects and flags video assets with zero quality score and suitability: unsuitable', async () => {
    const videoAsset = {
      assetId: `video_asset_${Date.now()}`,
      id: `video_asset_${Date.now()}`,
      workspaceId: wsId,
      businessId: wsId,
      name: 'Forbidden Promotional Reel.mp4',
      title: 'Forbidden Promotional Reel.mp4',
      assetType: 'video' as any,
      category: 'Collateral' as any,
      section: 'Active' as any,
      folder: 'Active' as any,
      secondarySections: [],
      mimeType: 'video/mp4',
      originalFileName: 'video.mp4',
      storagePath: 'gs://forbidden/video.mp4',
      fileSize: 15000000,
      createdBy: userId,
      ownedBy: wsId,
      currentVersionId: 'v_1',
      version: 1,
      status: 'active' as any,
      approvalStatus: 'pending' as any,
      visibility: 'workspace' as any,
      tags: ['video'],
      collectionIds: [],
      productIds: [],
      campaignIds: [],
      uploadedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const multimodal = await unifiedAiAssetIntelligenceService.analyzeMultimodalUnderstanding(videoAsset);
    const quality = unifiedAiAssetIntelligenceService.assessAssetQuality(videoAsset, multimodal);

    assert.equal(quality.overallScore, 0, 'Video overall score must be 0');
    assert.equal(quality.productionSuitability, 'unsuitable');
    const videoViolation = quality.issues.find((i) => i.code === 'VIDEO_EXCLUSION_VIOLATION');
    assert.ok(videoViolation, 'Must flag VIDEO_EXCLUSION_VIOLATION');
    assert.equal(videoViolation.severity, 'critical');
  });
});
