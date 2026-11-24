/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { brandStudioService } from './services/brandStudioService';
import { brandIntelligenceEngine } from './services/brandIntelligenceEngine';
import { brandStudioRepository } from './repositories/brandStudioRepository';
import { creditService } from './services/creditService';
import { db } from './db/firestore';

describe('PHASE 6 — MASTER BRAND STUDIO & DETERMINISTIC COLLATERAL SUITE', () => {
  const workspaceA = `ws_brand_phase6_test_a_${Date.now()}`;
  const workspaceB = `ws_brand_phase6_test_b_${Date.now()}`;
  const testUserId = `user_brand_test_${Date.now()}`;

  // ---------------------------------------------------------------------------
  // 1. Differentiated Brand Strategy Proposal & Competitor Whitespace
  // ---------------------------------------------------------------------------
  it('1. Generates brand strategy proposal linked to competitor whitespace and persistent Business Brain', async () => {
    // Seed competitor into workspace
    await db.collection(`workspaces/${workspaceA}/competitors`).doc('comp_legacy_1').set({
      id: 'comp_legacy_1',
      workspaceId: workspaceA,
      companyName: 'LegacyCorp Analytics',
      positioning: 'Enterprise-only expensive legacy software with hidden pricing',
      pricingModel: 'Annual contracts starting at $10,000',
      createdAt: new Date().toISOString(),
    });

    const proposal = await brandStudioService.generateBrandStrategy({
      workspaceId: workspaceA,
      brandName: 'BrainWise Pro',
      userAnglePreference: 'Tactile Intelligence & Verifiable Truth',
      userId: testUserId,
    });

    assert.ok(proposal.proposalId.startsWith('bsp_'));
    assert.equal(proposal.workspaceId, workspaceA);
    assert.equal(proposal.brandName, 'BrainWise Pro');
    assert.ok(proposal.usp.length > 10);
    assert.ok(proposal.contrarianAngle.includes('LegacyCorp Analytics') || proposal.contrarianAngle.includes('incumbents'));
    assert.ok(proposal.personality.length >= 3);
    assert.ok(proposal.voiceDirectives.approvedClaims.length > 0);
    assert.ok(proposal.voiceDirectives.forbiddenClaims.some((c) => c.toLowerCase().includes('video')));
    assert.ok(proposal.competitorDifferentiators.length > 0);
  });

  // ---------------------------------------------------------------------------
  // 2. Strict 1.25 Modular Typography Ladder & Brand Tokens
  // ---------------------------------------------------------------------------
  it('2. Enforces strict 1.25 Modular Typography Ladder (Major Third) and design tokens', async () => {
    const proposal = await brandStudioService.generateBrandStrategy({
      workspaceId: workspaceB,
      brandName: 'ScaleSync',
      userId: testUserId,
    });

    const { typographyLadder, colorPalette } = proposal.visualIdentity;

    assert.equal(typographyLadder.ratio, 1.25);
    assert.equal(typographyLadder.headingFont, 'Plus Jakarta Sans');
    assert.equal(typographyLadder.bodyFont, 'Inter');
    assert.equal(typographyLadder.monoFont, 'JetBrains Mono');

    // Verify 1.25 scale steps: 16 * 1.25^n
    assert.ok(typographyLadder.scaleTokens.display.includes('48.8px'));
    assert.ok(typographyLadder.scaleTokens.h1.includes('39.1px'));
    assert.ok(typographyLadder.scaleTokens.h2.includes('31.3px'));
    assert.ok(typographyLadder.scaleTokens.h3.includes('25.0px'));
    assert.ok(typographyLadder.scaleTokens.body.includes('16.0px'));

    // Color tokens
    assert.equal(colorPalette.primary, '#171717');
    assert.equal(colorPalette.accent, '#FF7417');
  });

  // ---------------------------------------------------------------------------
  // 3. Deterministic Collateral: Vector Logo Generation
  // ---------------------------------------------------------------------------
  it('3. Generates pure sanitized SVG Vector Logo with exact geometry and zero external scripts', () => {
    const asset = brandStudioService.generateCollateralSvg({
      workspaceId: workspaceA,
      assetType: 'VECTOR_LOGO',
      brandName: 'BrainWise',
    });

    assert.equal(asset.assetType, 'VECTOR_LOGO');
    assert.equal(asset.dimensions.width, 512);
    assert.equal(asset.dimensions.height, 512);
    assert.ok(asset.svgMarkup.startsWith('<svg'));
    assert.ok(asset.svgMarkup.endsWith('</svg>'));
    assert.ok(!asset.svgMarkup.includes('<script'));
    assert.ok(asset.truthVerified);
  });

  // ---------------------------------------------------------------------------
  // 4. Deterministic Collateral: Business Card & Letterhead Print Collateral
  // ---------------------------------------------------------------------------
  it('4. Generates high-DPI business card and A4 stationery letterhead SVG assets', () => {
    const card = brandStudioService.generateCollateralSvg({
      workspaceId: workspaceA,
      assetType: 'BUSINESS_CARD_SVG',
      brandName: 'HyperGrowth AI',
      tagline: 'Continuous Market Intelligence',
    });

    assert.equal(card.assetType, 'BUSINESS_CARD_SVG');
    assert.equal(card.dimensions.width, 1050);
    assert.equal(card.dimensions.height, 600);
    assert.ok(card.svgMarkup.includes('HYPERGROWTH AI'));
    assert.ok(card.svgMarkup.includes('Continuous Market Intelligence'));

    const letterhead = brandStudioService.generateCollateralSvg({
      workspaceId: workspaceA,
      assetType: 'STATIONERY_LETTERHEAD_SVG',
      brandName: 'HyperGrowth AI',
    });

    assert.equal(letterhead.assetType, 'STATIONERY_LETTERHEAD_SVG');
    assert.equal(letterhead.dimensions.width, 1240);
    assert.equal(letterhead.dimensions.height, 1754);
    assert.ok(letterhead.svgMarkup.includes('HyperGrowth AI'));
  });

  // ---------------------------------------------------------------------------
  // 5. Deterministic Collateral: Commercial Poster & Flyer
  // ---------------------------------------------------------------------------
  it('5. Generates high-contrast commercial poster SVG layout', () => {
    const poster = brandStudioService.generateCollateralSvg({
      workspaceId: workspaceA,
      assetType: 'POSTER_FLYER_SVG',
      brandName: 'BrainWise OS',
      tagline: 'Zero Guesswork. Full Precision.',
    });

    assert.equal(poster.assetType, 'POSTER_FLYER_SVG');
    assert.equal(poster.dimensions.width, 1200);
    assert.equal(poster.dimensions.height, 1600);
    assert.ok(poster.svgMarkup.includes('BrainWise OS'));
    assert.ok(poster.svgMarkup.includes('Zero Guesswork. Full Precision.'));
    assert.ok(poster.svgMarkup.includes('ZERO VIDEO PIPELINES'));
  });

  // ---------------------------------------------------------------------------
  // 6. Strict Video Exclusion Certification
  // ---------------------------------------------------------------------------
  it('6. Certifies Strict Video Exclusion across all collateral options and generation pipelines', () => {
    const allowedTypes = [
      'VECTOR_LOGO',
      'BUSINESS_CARD_SVG',
      'STATIONERY_LETTERHEAD_SVG',
      'POSTER_FLYER_SVG',
      'STATIC_CAROUSEL_SVG',
    ];

    allowedTypes.forEach((type) => {
      const asset = brandStudioService.generateCollateralSvg({
        workspaceId: workspaceB,
        assetType: type as any,
        brandName: 'NoVideoGuarantee',
      });

      assert.ok(!asset.svgMarkup.toLowerCase().includes('<video'));
      assert.ok(!asset.svgMarkup.toLowerCase().includes('remotion'));
      assert.ok(!asset.svgMarkup.toLowerCase().includes('ffmpeg'));
      assert.ok(!asset.svgMarkup.toLowerCase().includes('.mp4'));
      assert.ok(asset.svgMarkup.startsWith('<svg'));
    });
  });

  // ---------------------------------------------------------------------------
  // 7. AI Logo Concepts Generation (3 Variations) & Credit Settlement
  // ---------------------------------------------------------------------------
  it('7. Generates 3 distinct AI vector logo concepts and settles 4 credits via Two-Phase protocol', async () => {
    const result = await brandStudioService.generateAiLogoConcepts({
      workspaceId: workspaceA,
      userId: testUserId,
      brandName: 'AeroSpace Precision',
      prompt: 'Minimal architectural monogram with high aerodynamic precision lines',
      styleArchetype: 'Architectural Monogram',
      mood: 'Swiss Editorial',
    });

    assert.equal(result.creditsDeducted, 4);
    assert.ok(result.concepts.length === 3);
    assert.ok(result.concepts.some((c) => c.markStyle === 'geometric'));
    assert.ok(result.concepts.some((c) => c.markStyle === 'monogram'));
    assert.ok(result.concepts.some((c) => c.markStyle === 'emblem'));

    result.concepts.forEach((concept) => {
      assert.ok(concept.customSvg.startsWith('<svg'));
      assert.ok(!concept.customSvg.includes('<script'));
      assert.ok(concept.accentColor.startsWith('#'));
      assert.ok(concept.rationale.length > 10);
    });
  });

  // ---------------------------------------------------------------------------
  // 8. Collateral Variations Generation (Packaging, Business Card, Poster)
  // ---------------------------------------------------------------------------
  it('8. Generates 3 collateral variations for Packaging with art direction notes and settled credits', async () => {
    const result = await brandStudioService.generateCollateralVariations({
      workspaceId: workspaceA,
      userId: testUserId,
      category: 'Packaging',
      prompt: 'Matte dark sleeve highlighting small-batch artisanal roasting freshness',
      surfaceMode: 'mixed',
      brand: {
        brandName: 'RoastCraft Co',
        tagline: 'Precision Roasted Single Origin',
        accentHex: '#FF7417',
      },
    });

    assert.equal(result.creditsDeducted, 5);
    assert.equal(result.variations.length, 3);
    assert.ok(result.variations[0].headlineText.includes('ROASTCRAFT'));
    assert.ok(result.variations[0].svgMotif.startsWith('<svg'));
    assert.ok(!result.variations[0].svgMotif.includes('<script'));
    assert.ok(result.variations.some((v) => v.darkVariant));
    assert.ok(result.variations.some((v) => !v.darkVariant));
  });

  // ---------------------------------------------------------------------------
  // 9. Multi-Slide Social Creative Generation & Single Slide Remix
  // ---------------------------------------------------------------------------
  it('9. Generates 5-slide educational social carousel and supports 1-credit single slide remix', async () => {
    // 5-slide carousel generation (4 credits)
    const result = await brandStudioService.generateSocialCreative({
      workspaceId: workspaceA,
      userId: testUserId,
      platform: 'Carousel',
      angle: 'Educational Carousel',
      prompt: 'Why legacy enterprise software charges 20x for manual data exports',
      slideCount: 5,
      brand: { brandName: 'BrainWise' },
    });

    assert.equal(result.creditsDeducted, 4);
    assert.equal(result.package.slides.length, 5);
    assert.ok(result.package.caption.includes('BrainWise'));
    assert.ok(result.package.hashtags.length >= 3);
    assert.ok(result.package.slides[0].artSvg.startsWith('<svg'));
    assert.equal(result.package.slides[0].slideNumber, 1);
    assert.equal(result.package.slides[4].slideNumber, 5);

    // 1-credit single slide remix
    const remixed = await brandStudioService.generateSocialCreative({
      workspaceId: workspaceA,
      userId: testUserId,
      platform: 'Carousel',
      angle: 'Educational Carousel',
      prompt: 'Refined conclusion with stronger CTA',
      slideCount: 1,
      regenerateSlideNumber: 3,
      brand: { brandName: 'BrainWise' },
    });

    assert.equal(remixed.creditsDeducted, 1); // 1 credit for single slide remix
    assert.equal(remixed.package.slides.length, 1);
    assert.equal(remixed.package.slides[0].slideNumber, 3);
  });

  // ---------------------------------------------------------------------------
  // 10. Shared Brand Intelligence Architecture (Context, Research, Competitor Visuals)
  // ---------------------------------------------------------------------------
  it('10. Compiles business brand profile, market intelligence, and competitor visual teardowns', async () => {
    // 1. Business Profile
    const profile = await brandIntelligenceEngine.compileBusinessBrandProfile({
      workspaceId: workspaceA,
      userId: testUserId,
    });
    assert.ok(profile.profileId.startsWith('bprof_'));
    assert.equal(profile.workspaceId, workspaceA);
    assert.ok(profile.brandPersonality.length >= 4);

    // 2. Market Intelligence
    const research = await brandIntelligenceEngine.analyzeMarketIntelligence({
      workspaceId: workspaceA,
      industry: 'B2B Software & Commercial Analytics',
    });
    assert.ok(research.researchId.startsWith('bres_'));
    assert.ok(research.visualTrends.some((t) => t.includes('1.25 Modular')));
    assert.ok(research.productPresentationStandards.length >= 3);

    // 3. Competitor Visual Intelligence
    const competitorVisuals = await brandIntelligenceEngine.analyzeCompetitorVisuals({
      workspaceId: workspaceA,
    });
    assert.ok(competitorVisuals.length >= 1);
    assert.ok(competitorVisuals[0].colorPalette.primary.startsWith('#'));
    assert.ok(competitorVisuals[0].contrarianOpportunities.length > 0);
  });

  // ---------------------------------------------------------------------------
  // 11. Creative Direction & Persistent Brand Memory Versioning
  // ---------------------------------------------------------------------------
  it('11. Formulates reasoned creative direction and persists versioned brand snapshot & design tokens', async () => {
    // Creative Direction
    const direction = await brandIntelligenceEngine.formulateCreativeDirection({
      workspaceId: workspaceA,
      userId: testUserId,
      brandName: 'BrainWise Commercial',
      styleArchetype: 'Swiss Editorial',
    });
    assert.equal(direction.typographyRecommendations.ratio, 1.25);
    assert.equal(direction.colorRecommendations.primary, '#171717');
    assert.equal(direction.colorRecommendations.accent, '#FF7417');

    // Persistent Snapshot
    const snapshot = await brandIntelligenceEngine.persistBrandSnapshot({
      workspaceId: workspaceA,
      userId: testUserId,
      brandName: 'BrainWise Commercial',
      tagline: 'Your AI Business Intelligence & Growth Operating System',
      direction,
      userAnglePreference: 'Direct Economic ROI & Zero Fluff',
    });

    assert.ok(snapshot.strategy.strategyId.startsWith('bstrat_'));
    assert.ok(snapshot.guidelines.guidelineId.startsWith('bguide_'));
    assert.ok(snapshot.tokens.tokenId.startsWith('btok_'));
    assert.ok(snapshot.identity.brandIdentityId.startsWith('bid_'));

    // Check tokens
    assert.ok(snapshot.tokens.cssVariables.includes('--bw-brand-primary: #171717'));
    assert.ok(snapshot.tokens.cssVariables.includes('--bw-type-ratio: 1.25'));

    // Check guideline document
    assert.ok(snapshot.guidelines.markdownFullDoc.includes('Modular Typography'));
    assert.ok(snapshot.guidelines.markdownFullDoc.includes('Strict Video Exclusion'));
  });

  // ---------------------------------------------------------------------------
  // 12. Explicit Approval Lifecycle & State Transitions
  // ---------------------------------------------------------------------------
  it('12. Enforces explicit approval workflow: records state transition and emits audit event', async () => {
    const approval = await brandStudioService.approveBrandResource({
      workspaceId: workspaceA,
      userId: testUserId,
      resourceType: 'BRAND_IDENTITY',
      resourceId: `bid_test_${Date.now()}`,
      resourceVersion: 2,
      notes: 'Creative director verified high-contrast WCAG AAA compliance and token ladder.',
    });

    assert.ok(approval.approvalId.startsWith('appr_'));
    assert.equal(approval.previousState, 'REVIEW');
    assert.equal(approval.newState, 'APPROVED');
    assert.equal(approval.approvedBy, testUserId);
  });

  // ---------------------------------------------------------------------------
  // 13. Brand Quality & Consistency Evaluation
  // ---------------------------------------------------------------------------
  it('13. Evaluates brand quality report: WCAG AAA contrast, 1.25 typography ladder, and SVG cleanliness', async () => {
    const report = await brandStudioService.evaluateBrandQuality({
      workspaceId: workspaceA,
      resourceType: 'BRAND_IDENTITY',
      resourceId: 'root',
    });

    assert.ok(report.reportId.startsWith('bqual_'));
    assert.ok(report.overallScore >= 95);
    assert.equal(report.metrics.contrastRatioScore, 100);
    assert.equal(report.metrics.typographyConformanceScore, 100);
    assert.equal(report.metrics.svgPurityScore, 100);
    assert.equal(report.passed, true);
  });

  // ---------------------------------------------------------------------------
  // 14. Brand Export Packaging & Signed URL Generation
  // ---------------------------------------------------------------------------
  it('14. Packages complete brand design bundle with signed download URL and settles 2 credits', async () => {
    const result = await brandStudioService.createExportPackage({
      workspaceId: workspaceA,
      userId: testUserId,
      format: 'SVG_BUNDLE',
    });

    assert.equal(result.creditsDeducted, 2);
    assert.ok(result.exportRecord.exportId.startsWith('bexp_'));
    assert.equal(result.exportRecord.status, 'READY');
    assert.ok(result.exportRecord.downloadUrl.startsWith('https://storage.googleapis.com/'));
    assert.ok(result.exportRecord.includedItems.length >= 4);
    assert.ok(result.exportRecord.includedItems.some((item) => item.includes('Brand Guidelines')));
  });

  // ---------------------------------------------------------------------------
  // 15. Credit Subsystem: Two-Phase Reservation & Auto-Refund on Error
  // ---------------------------------------------------------------------------
  it('15. Automatically refunds held credit reservation if generation pipeline fails', async () => {
    const initialWallet = await creditService.getWallet(workspaceA);
    const availableBefore = initialWallet.balance - initialWallet.reserved;

    // Simulate reservation
    const reservation = await creditService.reserveCredits({
      workspaceId: workspaceA,
      userId: testUserId,
      featureId: 'FEAT-BRD-001', // 5 credits
    });
    assert.ok(reservation);
    assert.equal(reservation.amount, 5);

    const heldWallet = await creditService.getWallet(workspaceA);
    const heldAvailable = heldWallet.balance - heldWallet.reserved;
    assert.equal(heldAvailable, availableBefore - 5);
    assert.equal(heldWallet.reserved, initialWallet.reserved + 5);

    // Rollback / refund
    await creditService.refundCredits({
      workspaceId: workspaceA,
      reservation,
      reason: 'Simulated pipeline interruption test',
    });

    const restoredWallet = await creditService.getWallet(workspaceA);
    const restoredAvailable = restoredWallet.balance - restoredWallet.reserved;
    assert.equal(restoredAvailable, availableBefore);
    assert.equal(restoredWallet.reserved, initialWallet.reserved);
  });

  // ---------------------------------------------------------------------------
  // 16. Multi-Tenant Workspace Data Isolation
  // ---------------------------------------------------------------------------
  it('16. Strictly enforces multi-tenant workspace isolation across all BrandStudio entities', async () => {
    const projectA = await brandStudioRepository.saveProject({
      projectId: `proj_a_${Date.now()}`,
      workspaceId: workspaceA,
      name: 'Project Alpha',
      description: 'Workspace A Brand Launch',
      status: 'APPROVED',
      activeVersion: 1,
      tags: ['SaaS'],
      createdBy: testUserId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const projectB = await brandStudioRepository.saveProject({
      projectId: `proj_b_${Date.now()}`,
      workspaceId: workspaceB,
      name: 'Project Beta',
      description: 'Workspace B Brand Launch',
      status: 'DRAFT',
      activeVersion: 1,
      tags: ['Retail'],
      createdBy: testUserId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const listA = await brandStudioRepository.listProjects(workspaceA);
    const listB = await brandStudioRepository.listProjects(workspaceB);

    assert.ok(listA.some((p) => p.projectId === projectA.projectId));
    assert.ok(!listA.some((p) => p.projectId === projectB.projectId));

    assert.ok(listB.some((p) => p.projectId === projectB.projectId));
    assert.ok(!listB.some((p) => p.projectId === projectA.projectId));
  });
});
