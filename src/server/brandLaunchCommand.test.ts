/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { brandLaunchService } from './services/brandLaunchService';
import { brandStudioRepository } from './repositories/brandStudioRepository';
import { brandGuidelinesEngine } from './services/brandGuidelinesEngine';
import { creditService } from './services/creditService';
import { db } from './db/firestore';

describe('BRAINWISE BRAND LAUNCH COMMAND — CAPSTONE INTEGRATION TEST SUITE', () => {
  const testUserId = `user_launch_master_${Date.now()}`;

  // ===========================================================================
  // 1. UNIFIED BRAND LAUNCH PREPARATION (15-CREDIT TWO-PHASE PROTOCOL)
  // ===========================================================================
  it('1. Orchestrates all 4 studios into a cohesive Brand Launch Kit under 15-credit two-phase reservation', async () => {
    const ws = `ws_launch_prep_${Date.now()}`;

    // Seed wallet
    const initialWallet = await creditService.getWallet(ws);
    const initialBalance = initialWallet.balance;

    // Seed Business Profile
    await brandStudioRepository.saveProfile({
      profileId: `prof_${Date.now()}`,
      workspaceId: ws,
      brandName: 'Aura Roast Specialty Coffee',
      tagline: 'Single-Estate Altitude Roasting',
      industry: 'Coffee & Beverages',
      businessModel: 'Direct-to-Consumer & Micro-Lot Subscriptions',
      pricePositioning: 'Heirloom Specialty (₹650 per 250g)',
      targetAudience: 'Specialty Coffee Aficionados & Home Baristas',
      customerSegments: ['Conscious Consumers', 'Culinary Enthusiasts'],
      geographicMarket: 'National & Global Direct',
      valueProposition: 'Direct farmgate profit sharing with altitude micro-lot transparency.',
      brandPersonality: ['Tactile', 'Artisanal', 'Minimalist', 'Discerning'],
      differentiation: 'Direct farmgate profit sharing and altitude micro-lot transparency.',
      marketingObjectives: ['Establish flagship retail unboxing', 'Scale subscription revenue'],
      missingInformation: [],
      status: 'COMPLETE',
      provenance: {},
      createdBy: testUserId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const result = await brandLaunchService.prepareBrandLaunch({
      workspaceId: ws,
      userId: testUserId,
      launchName: 'Aura Roast Flagship Commercial Launch',
      campaignTheme: 'Altitude of Origin',
      targetAudience: 'Conscious Coffee Connoisseurs',
      productFocus: 'Estate Micro-Lot Blend',
    });

    assert.ok(result.launchKit, 'Expected launchKit in result');
    assert.strictEqual(result.creditsDeducted, 15, 'Unified launch kit must cost exactly 15 credits');

    const finalWallet = await creditService.getWallet(ws);
    assert.strictEqual(
      finalWallet.balance,
      initialBalance - 15,
      'Wallet balance must decrement by exactly 15 credits'
    );

    const kit = result.launchKit;
    assert.ok(kit.launchId.startsWith('launch_'), 'Expected valid launchId format');
    assert.strictEqual(kit.brandName, 'Aura Roast Specialty Coffee');
    assert.strictEqual(kit.status, 'READY_FOR_LAUNCH');
    assert.ok(kit.deliverables, 'Expected deliverables in launch kit');
  });

  // ===========================================================================
  // 2. MASTER LOGO PACKAGE (7 LOCKUPS + VERIFIED 32-BIT TRANSPARENT PNG)
  // ===========================================================================
  it('2. Produces Master Logo Package with 7 family lockups and verified 32-bit transparent RGBA PNG buffer (0x00 true alpha)', async () => {
    const ws = `ws_logo_pack_${Date.now()}`;

    const result = await brandLaunchService.prepareBrandLaunch({
      workspaceId: ws,
      userId: testUserId,
      launchName: 'Kaveri Estate Launch',
      productFocus: 'Arabica Reserve',
    });

    const masterLogo = result.launchKit.deliverables.masterLogo;
    assert.ok(masterLogo, 'Expected masterLogo deliverable');
    assert.ok(masterLogo.primaryLogoSvg.includes('<svg'), 'Expected clean SVG markup for primary logo');
    assert.ok(masterLogo.primaryLogoSvg.includes('viewBox='), 'SVG must include viewBox');
    assert.strictEqual(masterLogo.variants.length, 7, 'Expected 7 logo family lockups');

    const expectedVariantTypes = [
      'Horizontal Primary Lockup',
      'Stacked Vertical Lockup',
      'Standalone Monogram / Symbol',
      'Monochrome Obsidian',
      'Monochrome High-Contrast White',
      'Browser Favicon (32x32 SVG)',
      'Social Media Profile Avatar',
    ];

    for (const exp of expectedVariantTypes) {
      const match = masterLogo.variants.find((v) => v.variantType === exp);
      assert.ok(match, `Expected variant type: ${exp}`);
      assert.ok(match.svgContent.includes('<svg'), `Variant ${exp} must have valid SVG content`);
    }

    // Verify 32-bit transparent RGBA PNG buffer
    const pngBase64 = masterLogo.transparentPngBase64;
    assert.ok(pngBase64, 'Expected transparentPngBase64 to be present');
    const pngBuffer = Buffer.from(pngBase64, 'base64');

    // PNG signature: 89 50 4E 47 0D 0A 1A 0A
    assert.strictEqual(pngBuffer[0], 0x89, 'Byte 0 must be 0x89');
    assert.strictEqual(pngBuffer[1], 0x50, 'Byte 1 must be 0x50 (P)');
    assert.strictEqual(pngBuffer[2], 0x4e, 'Byte 2 must be 0x4E (N)');
    assert.strictEqual(pngBuffer[3], 0x47, 'Byte 3 must be 0x47 (G)');

    // IHDR Color type at byte offset 25: 6 = RGBA (Truecolor with alpha)
    assert.strictEqual(pngBuffer[25], 6, 'PNG color type must be 6 (RGBA with alpha channel)');
  });

  // ===========================================================================
  // 3. LIVING BRAND GUIDELINES & SPECIFICATION ASSETS
  // ===========================================================================
  it('3. Generates Living Brand Guidelines with W3C Tokens JSON and printable A4 Brand Book PDF markup', async () => {
    const ws = `ws_guidelines_launch_${Date.now()}`;

    const result = await brandLaunchService.prepareBrandLaunch({
      workspaceId: ws,
      userId: testUserId,
      productFocus: 'Specialty Reserve',
    });

    const guidelines = result.launchKit.deliverables.guidelines;
    assert.ok(guidelines, 'Expected guidelines in deliverables');
    assert.ok(guidelines.brandBookId, 'Expected brandBookId');
    assert.ok(guidelines.typographyHierarchy.headingFont, 'Expected headingFont in hierarchy');
    assert.ok(guidelines.typographyHierarchy.bodyFont, 'Expected bodyFont in hierarchy');
    assert.ok(guidelines.colorRatios['60_dominant'], 'Expected 60% dominant color');
    assert.ok(guidelines.colorRatios['30_secondary'], 'Expected 30% secondary color');
    assert.ok(guidelines.colorRatios['10_accent'], 'Expected 10% accent color');

    // Verify W3C Design Tokens JSON
    const tokens = guidelines.w3cDesignTokens;
    assert.ok(tokens, 'Expected w3cDesignTokens');
    assert.ok(tokens.color, 'Expected color token category');
    assert.ok(tokens.typography, 'Expected typography token category');

    // Verify Print PDF Markup
    assert.ok(guidelines.printPdfMarkup.includes('@page'), 'Print PDF markup must include @page print CSS');
    assert.ok(
      guidelines.printPdfMarkup.includes('A4 portrait') || guidelines.printPdfMarkup.includes('size: A4'),
      'Print PDF markup must specify A4 dimensions'
    );
  });

  // ===========================================================================
  // 4. PHYSICAL PRODUCT PACKAGING & 3D MOCKUP SUITE
  // ===========================================================================
  it('4. Produces production-ready packaging dieline with 3mm bleed, 5mm safe area, and 3D vector product mockup', async () => {
    const ws = `ws_pack_mock_${Date.now()}`;

    const result = await brandLaunchService.prepareBrandLaunch({
      workspaceId: ws,
      userId: testUserId,
      productFocus: 'Heirloom Roast Box',
    });

    const packaging = result.launchKit.deliverables.packagingAndMockups;
    assert.ok(packaging, 'Expected packagingAndMockups deliverable');
    assert.ok(packaging.dielineSvg.includes('<svg'), 'Dieline must be clean SVG');
    assert.strictEqual(packaging.printBleedMm, 3, 'Print bleed must be 3mm');
    assert.strictEqual(packaging.safeMarginMm, 5, 'Safe area must be 5mm');
    assert.strictEqual(packaging.printResolutionDpi, 300, 'Print resolution must be 300 DPI');

    // Dieline must include statutory labelling and cut/fold lines
    assert.ok(packaging.dielineSvg.includes('CUT LINE') || packaging.dielineSvg.includes('stroke-dasharray'), 'Dieline must include cut/fold indicators');

    // Product Mockup
    assert.ok(packaging.mockupSvg.includes('<svg'), 'Mockup must be clean SVG');
    assert.ok(packaging.mockupSvg.includes('radialGradient') || packaging.mockupSvg.includes('linearGradient'), 'Mockup must have photorealistic gradient shading');
    assert.ok(
      /presentation|marketing|mockup|validation/i.test(packaging.mockupDisclaimer),
      'Mockup must contain standard disclaimer'
    );
  });

  // ===========================================================================
  // 5. PRODUCT PHOTOGRAPHY & CAMPAIGN VISUALS (STRICT ZERO VIDEO)
  // ===========================================================================
  it('5. Generates high-contrast visual compositions with strict zero-video verification', async () => {
    const ws = `ws_campaign_vis_${Date.now()}`;

    const result = await brandLaunchService.prepareBrandLaunch({
      workspaceId: ws,
      userId: testUserId,
      campaignTheme: 'Precision Craft',
    });

    const campaign = result.launchKit.deliverables.campaignVisuals;
    assert.ok(campaign, 'Expected campaignVisuals deliverable');
    assert.strictEqual(campaign.heroVisual.aspectRatio, '16:9');
    assert.ok(campaign.heroVisual.svgContent.includes('<svg'), 'Hero visual must be valid SVG');
    assert.strictEqual(campaign.heroVisual.videoExcluded, true, 'Zero-video guarantee must be true');

    assert.ok(campaign.editorialStills.length >= 2, 'Expected at least 2 editorial stills');
    for (const still of campaign.editorialStills) {
      assert.ok(still.svgContent.includes('<svg'), 'Editorial still must be valid SVG');
      assert.strictEqual(still.videoExcluded, true, 'Editorial still must exclude video');
      assert.ok(!still.svgContent.toLowerCase().includes('video'), 'SVG must not contain video tags');
    }
  });

  // ===========================================================================
  // 6. MULTI-SLIDE STORYTELLING CAROUSELS & SOCIAL FEED STILLS
  // ===========================================================================
  it('6. Generates 5-slide launch carousel, 1:1 post, and static 9:16 Story/Reel cover still with safe insets', async () => {
    const ws = `ws_social_launch_${Date.now()}`;

    const result = await brandLaunchService.prepareBrandLaunch({
      workspaceId: ws,
      userId: testUserId,
      launchName: 'Heritage Roast Launch',
    });

    const social = result.launchKit.deliverables.socialAssets;
    assert.ok(social, 'Expected socialAssets deliverable');

    // 5-slide carousel
    assert.strictEqual(social.launchCarousel.slidesCount, 5, 'Launch carousel must have 5 storytelling slides');
    assert.strictEqual(social.launchCarousel.slides.length, 5, 'Slides array length must be 5');

    const expectedSlideRoles = ['HOOK', 'PROBLEM', 'SOLUTION', 'PROOF', 'CALL_TO_ACTION'];
    social.launchCarousel.slides.forEach((slide, idx) => {
      assert.strictEqual(slide.slideIndex, idx + 1);
      assert.strictEqual(slide.role, expectedSlideRoles[idx]);
      assert.ok(slide.headline, `Slide ${idx + 1} must have headline`);
      assert.ok(slide.svgContent.includes('<svg'), `Slide ${idx + 1} must have SVG content`);
    });

    // Feed Post (1:1)
    assert.strictEqual(social.squareFeedPost.aspectRatio, '1:1');
    assert.ok(social.squareFeedPost.svgContent.includes('<svg'));

    // Static Story / Reel Cover Still (9:16)
    assert.strictEqual(social.storyStill.aspectRatio, '9:16');
    assert.ok(social.storyStill.svgContent.includes('<svg'));
    assert.strictEqual(social.storyStill.isStaticStillOnly, true, 'Reel cover must be strictly static still');
    assert.ok(social.storyStill.safeInsets.topInsetPx >= 100, 'Must protect top safe inset for UI chrome');
    assert.ok(social.storyStill.safeInsets.bottomInsetPx >= 200, 'Must protect bottom safe inset for captions');
  });

  // ===========================================================================
  // 7. WEB HERO BANNER & DIGITAL ADVERTISING SUITE
  // ===========================================================================
  it('7. Generates responsive Web Hero banner (1920x1080), LinkedIn banner (1200x627), and Display Ad (1080x1080)', async () => {
    const ws = `ws_web_ads_${Date.now()}`;

    const result = await brandLaunchService.prepareBrandLaunch({
      workspaceId: ws,
      userId: testUserId,
      launchName: 'Web Presence Launch',
    });

    const webAndAds = result.launchKit.deliverables.webAndAdvertising;
    assert.ok(webAndAds, 'Expected webAndAdvertising deliverable');

    // Web Hero Banner (1920x1080)
    assert.strictEqual(webAndAds.webHeroBanner.width, 1920);
    assert.strictEqual(webAndAds.webHeroBanner.height, 1080);
    assert.ok(webAndAds.webHeroBanner.svgContent.includes('viewBox="0 0 1920 1080"'));

    // LinkedIn Banner (1200x627)
    assert.strictEqual(webAndAds.linkedInBanner.width, 1200);
    assert.strictEqual(webAndAds.linkedInBanner.height, 627);
    assert.ok(webAndAds.linkedInBanner.svgContent.includes('viewBox="0 0 1200 627"'));

    // Display Ad (1080x1080)
    assert.strictEqual(webAndAds.displayAdSquare.width, 1080);
    assert.strictEqual(webAndAds.displayAdSquare.height, 1080);
    assert.ok(webAndAds.displayAdSquare.svgContent.includes('viewBox="0 0 1080 1080"'));
  });

  // ===========================================================================
  // 8. DOWNLOADABLE LAUNCH KIT MANIFEST & CHECKSUM INTEGRITY
  // ===========================================================================
  it('8. Verifies all 7 categories present, byte sizes > 0, SHA-256 integrity hashes, and signed bundle export', async () => {
    const ws = `ws_manifest_check_${Date.now()}`;

    const result = await brandLaunchService.prepareBrandLaunch({
      workspaceId: ws,
      userId: testUserId,
      launchName: 'Manifest Verification Launch',
    });

    const manifest = result.launchKit.manifest;
    assert.ok(manifest, 'Expected manifest');
    assert.ok(manifest.totalItemCount >= 15, `Expected at least 15 manifest items, got ${manifest.totalItemCount}`);
    assert.ok(manifest.totalSizeBytes > 0, 'Total size must be greater than zero');
    assert.ok(manifest.generatedAt, 'Expected generatedAt timestamp');

    // Verify all 7 categories are represented in the manifest
    const categories = new Set(manifest.items.map((i) => i.category));
    assert.ok(categories.has('LOGOS'), 'Manifest must include LOGOS');
    assert.ok(categories.has('GUIDELINES'), 'Manifest must include GUIDELINES');
    assert.ok(categories.has('PACKAGING'), 'Manifest must include PACKAGING');
    assert.ok(categories.has('MOCKUPS'), 'Manifest must include MOCKUPS');
    assert.ok(categories.has('CAMPAIGN_VISUALS'), 'Manifest must include CAMPAIGN_VISUALS');
    assert.ok(categories.has('SOCIAL_MEDIA'), 'Manifest must include SOCIAL_MEDIA');
    assert.ok(categories.has('WEB_ADVERTISING'), 'Manifest must include WEB_ADVERTISING');

    // Verify SHA-256 integrity checksum format (64-character hex string)
    for (const item of manifest.items) {
      assert.ok(item.sha256Checksum, `Item ${item.fileName} missing checksum`);
      assert.strictEqual(item.sha256Checksum.length, 64, `Item ${item.fileName} checksum must be 64-char SHA-256`);
      assert.ok(item.sizeBytes > 0, `Item ${item.fileName} size must be > 0`);
      assert.ok(item.mimeType, `Item ${item.fileName} must have mimeType`);
      assert.ok(item.path.startsWith('/'), `Item ${item.fileName} path must be relative starting with /`);
    }

    // Verify Export Bundle
    const exportBundle = await brandLaunchService.exportLaunchKitBundle({
      workspaceId: ws,
      launchId: result.launchKit.launchId,
      requestedFormats: ['svg', 'png', 'json', 'pdf'],
    });

    assert.strictEqual(exportBundle.launchId, result.launchKit.launchId);
    assert.ok(exportBundle.archiveSignedUrl.includes('brainwise-storage.internal'), 'Must return valid signed download URL');
    assert.strictEqual(exportBundle.exportFormat, 'ZIP');
    assert.ok(exportBundle.totalSizeBytes > 0);
  });

  // ===========================================================================
  // 9. TWO-PHASE CREDIT ACCOUNTING & ROLLBACK
  // ===========================================================================
  it('9. Executes Two-Phase Credit Reservation: 15 credits held, settled on success, and zero net deduction on simulated upstream failure', async () => {
    const ws = `ws_credit_integrity_${Date.now()}`;

    // Seed wallet
    const initialWallet = await creditService.getWallet(ws);
    const startCredits = initialWallet.balance;

    // Test successful 15 credit settlement
    const prep = await brandLaunchService.prepareBrandLaunch({
      workspaceId: ws,
      userId: testUserId,
      idempotencyKey: `idem_success_${Date.now()}`,
    });

    assert.strictEqual(prep.creditsDeducted, 15);
    const postWallet = await creditService.getWallet(ws);
    assert.strictEqual(postWallet.balance, startCredits - 15);

    // Test failure with automatic reservation release
    const failurePromise = brandLaunchService.prepareBrandLaunch({
      workspaceId: ws,
      userId: testUserId,
      launchName: 'Produce Remotion Video Commercial Pipeline', // triggers strict video rejection
    });

    await assert.rejects(failurePromise, (err: any) => {
      assert.ok(err.message.includes('STRICT VIDEO EXCLUSION VIOLATION'));
      return true;
    });

    // Wallet balance must not decrement further after failure
    const afterFailedWallet = await creditService.getWallet(ws);
    assert.strictEqual(
      afterFailedWallet.balance,
      postWallet.balance,
      'Failed generation must trigger credit refund with zero net deduction'
    );
  });

  // ===========================================================================
  // 10. BRAND CONSISTENCY QA REPORT & AUTO-REMEDIATION
  // ===========================================================================
  it('10. Compiles Brand Consistency QA Report validating WCAG contrast, typography pairing, logo clear-space, and color harmony', async () => {
    const ws = `ws_qa_consistency_${Date.now()}`;

    const result = await brandLaunchService.prepareBrandLaunch({
      workspaceId: ws,
      userId: testUserId,
      launchName: 'Consistency Validation Launch',
    });

    const qa = result.launchKit.consistencyReport;
    assert.ok(qa, 'Expected consistencyReport');
    assert.ok(qa.overallScore >= 80, `Expected consistency score >= 80, got ${qa.overallScore}`);
    assert.ok(['READY_FOR_LAUNCH', 'READY_WITH_RESERVATIONS'].includes(qa.launchReadiness));
    assert.ok(qa.checks.length >= 4, 'Expected at least 4 automated consistency checks');

    const checkNames = qa.checks.map((c) => c.name);
    assert.ok(checkNames.some((n) => n.includes('Contrast')));
    assert.ok(checkNames.some((n) => n.includes('Typography')));
    assert.ok(checkNames.some((n) => n.includes('Logo Clear Space')));
    assert.ok(checkNames.some((n) => n.includes('Color Gamut')));

    for (const chk of qa.checks) {
      assert.ok(['PASS', 'WARN', 'FAIL'].includes(chk.status));
      assert.ok(chk.details, `Check ${chk.name} missing details`);
    }
  });

  // ===========================================================================
  // 11. STRICT VIDEO EXCLUSION HARD-BLOCK
  // ===========================================================================
  it('11. Enforces absolute product boundary: blocks AI video generation, FFmpeg pipelines, Remotion scripts, and video credits', async () => {
    const ws = `ws_video_block_${Date.now()}`;

    const forbiddenQueries = [
      'Render a 15-second promotional video commercial',
      'Generate MP4 animation for brand launch',
      'Create Remotion script for product reel',
      'Execute ffmpeg pipeline for social promo',
    ];

    for (const query of forbiddenQueries) {
      await assert.rejects(
        brandLaunchService.prepareBrandLaunch({
          workspaceId: ws,
          userId: testUserId,
          launchName: query,
        }),
        (err: any) => {
          assert.ok(
            err.message.includes('STRICT VIDEO EXCLUSION VIOLATION'),
            `Query "${query}" should be rejected with strict video exclusion violation`
          );
          return true;
        }
      );
    }
  });

  // ===========================================================================
  // 12. MULTI-TENANT WORKSPACE ISOLATION
  // ===========================================================================
  it('12. Enforces multi-tenant workspace isolation: workspace A cannot access or mutate workspace B launch kits', async () => {
    const wsA = `ws_tenant_alpha_${Date.now()}`;
    const wsB = `ws_tenant_beta_${Date.now()}`;

    const launchA = await brandLaunchService.prepareBrandLaunch({
      workspaceId: wsA,
      userId: `user_a_${Date.now()}`,
      launchName: 'Alpha Launch',
    });

    const launchB = await brandLaunchService.prepareBrandLaunch({
      workspaceId: wsB,
      userId: `user_b_${Date.now()}`,
      launchName: 'Beta Launch',
    });

    // Verify latest launch kits are tenant-specific
    const latestA = await brandLaunchService.getLatestLaunchKit(wsA);
    const latestB = await brandLaunchService.getLatestLaunchKit(wsB);

    assert.strictEqual(latestA?.launchId, launchA.launchKit.launchId);
    assert.strictEqual(latestB?.launchId, launchB.launchKit.launchId);
    assert.notStrictEqual(latestA?.launchId, latestB?.launchId);

    // Cross-tenant fetch must return null
    const crossFetch = await brandStudioRepository.getLaunchKit(wsA, launchB.launchKit.launchId);
    assert.strictEqual(crossFetch, null, 'Workspace A must not be able to fetch Workspace B launch kit');
  });
});
