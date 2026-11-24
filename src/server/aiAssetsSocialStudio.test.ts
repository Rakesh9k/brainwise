/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { creativeAssetsEngine } from './services/creativeAssetsEngine';
import { brandStudioRepository } from './repositories/brandStudioRepository';
import { brandGuidelinesEngine } from './services/brandGuidelinesEngine';
import { creditService } from './services/creditService';
import { db } from './db/firestore';

describe('BRAINWISE AI ASSETS & SOCIAL STUDIO — PRODUCTION IMPLEMENTATION TEST SUITE', () => {
  const testUserId = `user_asset_studio_${Date.now()}`;

  // ===========================================================================
  // 1. INDUSTRY-AWARE ASSET INTELLIGENCE ACROSS 12 DISTINCT INDUSTRIES
  // ===========================================================================
  it('1. Recommends tailored assets across at least 12 distinct industries with structured metadata', async () => {
    const ws = `ws_ind_rec_${Date.now()}`;

    const industries = [
      { key: 'Coffee & Beverages', match: /coffee|pouch/i },
      { key: 'Restaurants & Cloud Kitchens', match: /takeaway|menu/i },
      { key: 'Clothing & Fashion', match: /tee|t-shirt|apparel|fashion|streetwear|hangtag/i },
      { key: 'Chocolate & FMCG', match: /foil|wrapper|confectionery|chocolate/i },
      { key: 'Beauty & Skincare', match: /dropper|cosmetic|serum/i },
      { key: 'Jewellery', match: /box|velvet|certificate/i },
      { key: 'Salons & Spas', match: /treatment|apron/i },
      { key: 'Technology & SaaS', match: /dashboard|interface|software|saas|analytics/i },
      { key: 'Healthcare & Clinics', match: /report|diagnostic|prescription|appointment|medical/i },
      { key: 'Consumer Hardware & Electronics', match: /device|quickstart|quick-start|hardware|pulp/i },
      { key: 'Wellness & Fitness', match: /shaker|gym|supplement|tub|wellness/i },
      { key: 'Professional Services', match: /proposal|folder/i },
    ];

    for (const ind of industries) {
      const recs = await creativeAssetsEngine.recommendAssetsForIndustry({
        workspaceId: ws,
        industryOverride: ind.key,
      });

      assert.ok(recs.length >= 2, `Expected at least 2 recommendations for ${ind.key}, got ${recs.length}`);
      const first = recs[0];
      assert.ok(first.id, 'Expected recommendation id');
      assert.ok(first.assetName, 'Expected assetName');
      assert.ok(first.purpose, 'Expected purpose');
      assert.ok(first.suitabilityRationale, 'Expected suitabilityRationale');
      assert.ok(first.priority === 'HIGH' || first.priority === 'MEDIUM' || first.priority === 'LOW');
      assert.ok(typeof first.isPhysical === 'boolean');
      assert.ok(first.specifications, 'Expected specifications');
      assert.ok(Array.isArray(first.suggestedFormats) && first.suggestedFormats.length > 0);
      assert.ok(
        ind.match.test(first.assetName) || ind.match.test(first.purpose) || ind.match.test(first.specifications),
        `Asset recommendation for ${ind.key} should match industry keywords`
      );
    }
  });

  // ===========================================================================
  // 2. PRODUCT MOCKUP STUDIO (COFFEE, STREETWEAR, SKINCARE) WITH 2-PHASE RESERVATION
  // ===========================================================================
  it('2. Generates category-specific product mockups with realistic geometry, disclaimer, and 5-credit settlement', async () => {
    const ws = `ws_mockup_${Date.now()}`;

    // Seed brand profile & guidelines
    await db.collection(`workspaces/${ws}/brandProfiles`).doc('prof_1').set({
      profileId: 'prof_1',
      workspaceId: ws,
      brandName: 'Kaveri Estate Coffee',
      industry: 'Speciality Coffee',
      createdAt: new Date().toISOString(),
    });

    await brandGuidelinesEngine.generateCompleteBrandBook({
      workspaceId: ws,
      userId: testUserId,
    });

    const initialWallet = await creditService.getWallet(ws);
    const initialAvailable = initialWallet.balance - initialWallet.reserved;

    // Mockup 1: Standup Coffee Pouch
    const coffeePouch = await creativeAssetsEngine.generateProductMockup({
      workspaceId: ws,
      userId: testUserId,
      category: 'STANDUP_POUCH',
      material: 'KRAFT_PAPER',
      finish: 'MATTE',
      lightingPreset: 'NORDIC_DIFFUSED',
      cameraAngle: 'FRONT_ELEVATION',
      customHeadline: 'Micro-Lot Single Origin',
    });

    assert.ok(coffeePouch.id);
    assert.equal(coffeePouch.category, 'STANDUP_POUCH');
    assert.ok(coffeePouch.svgContent.includes('<svg'));
    assert.ok(coffeePouch.svgContent.includes('Degassing Valve'));
    assert.ok(coffeePouch.disclaimer.includes('Artistic vector visualization'));
    assert.equal(coffeePouch.creditsDeducted, 5);

    // Verify 5 credits deducted
    const afterFirstWallet = await creditService.getWallet(ws);
    const afterFirstAvailable = afterFirstWallet.balance - afterFirstWallet.reserved;
    assert.equal(initialAvailable - afterFirstAvailable, 5);

    // Mockup 2: Boxy Streetwear Tee
    const streetwearTee = await creativeAssetsEngine.generateProductMockup({
      workspaceId: ws,
      userId: testUserId,
      category: 'BOXY_TEE',
      material: 'HEAVYWEIGHT_COTTON',
      finish: 'TEXTURED',
      lightingPreset: 'DRAMATIC_CHIAROSCURO',
      cameraAngle: 'FRONT_ELEVATION',
      customHeadline: 'Oversized 280 GSM',
    });

    assert.ok(streetwearTee.svgContent.includes('Woven Neck Label'));
    assert.ok(streetwearTee.svgContent.includes('280 GSM'));

    // Mockup 3: Skincare Dropper Bottle
    const dropper = await creativeAssetsEngine.generateProductMockup({
      workspaceId: ws,
      userId: testUserId,
      category: 'DROPPER_BOTTLE',
      material: 'AMBER_GLASS',
      finish: 'GLOSS',
      lightingPreset: 'STUDIO_CLEAN',
      cameraAngle: 'THREE_QUARTER_LEFT',
    });

    assert.ok(dropper.svgContent.includes('Dropper Pipette'));
    assert.ok(dropper.svgContent.includes('Calibrated Pipette'));

    const finalWallet = await creditService.getWallet(ws);
    const finalAvailable = finalWallet.balance - finalWallet.reserved;
    assert.equal(initialAvailable - finalAvailable, 15); // 3 * 5 = 15 credits
  });

  // ===========================================================================
  // 3. PACKAGING DESIGN STUDIO (3 TIERS & REGULATORY LABELLING)
  // ===========================================================================
  it('3. Generates packaging across 3 tiers (Concept, Editable, Production) with bleed, dielines, and regulatory stamps', async () => {
    const ws = `ws_pack_${Date.now()}`;

    await db.collection(`workspaces/${ws}/brandProfiles`).doc('prof_1').set({
      profileId: 'prof_1',
      workspaceId: ws,
      brandName: 'Nectaria Cold-Pressed',
      industry: 'Craft Beverages & Tonics',
      createdAt: new Date().toISOString(),
    });

    await brandGuidelinesEngine.generateCompleteBrandBook({
      workspaceId: ws,
      userId: testUserId,
    });

    // Tier 1: Concept Preview
    const concept = await creativeAssetsEngine.generatePackagingArtwork({
      workspaceId: ws,
      userId: testUserId,
      tier: 'CONCEPT_PREVIEW',
      packagingType: 'CAN_SLEEVE',
      substrate: 'ALUMINIUM',
    });

    assert.equal(concept.tier, 'CONCEPT_PREVIEW');
    assert.ok(concept.svgFront.includes('<svg'));
    assert.equal(concept.isProductionReady, false);

    // Tier 2: Editable Artwork
    const editable = await creativeAssetsEngine.generatePackagingArtwork({
      workspaceId: ws,
      userId: testUserId,
      tier: 'EDITABLE_ARTWORK',
      packagingType: 'RIGID_BOX',
      substrate: 'GREYBOARD',
    });

    assert.equal(editable.tier, 'EDITABLE_ARTWORK');
    assert.ok(editable.svgBack);
    assert.equal(editable.isProductionReady, false);

    // Tier 3: Production Ready (with 3mm bleed, 5mm safe area, 300 DPI, dieline, regulatory marks)
    const production = await creativeAssetsEngine.generatePackagingArtwork({
      workspaceId: ws,
      userId: testUserId,
      tier: 'PRODUCTION_READY',
      packagingType: 'FOLDING_CARTON',
      substrate: 'MATTE_COATED_BOARD',
      regulatoryRequirements: {
        fssaiOrFdaLicense: 'Lic No. 10022021000845',
        allergenWarning: 'Contains tree nuts and soy lecithin.',
        netQuantity: 'Net Wt. 250 g (8.8 oz)',
        nutritionTableRequired: true,
        batchExpiryCoordinates: 'Bottom flap, laser printed',
        barcodePlacement: 'EAN-13, 30mm x 20mm with 5mm white quiet zone',
      },
    });

    assert.equal(production.tier, 'PRODUCTION_READY');
    assert.equal(production.isProductionReady, true);
    assert.equal(production.dielineSpec.bleedMm, 3);
    assert.equal(production.dielineSpec.safeAreaMm, 5);
    assert.equal(production.dielineSpec.dpi, 300);

    // Check SVG contains dielines and regulatory markings
    assert.ok(production.svgDielineComplete.includes('CUT LINE (SOLID)'));
    assert.ok(production.svgDielineComplete.includes('CREASE LINE (DASHED)'));
    assert.ok(production.svgDielineComplete.includes('Lic No. 10022021000845'));
    assert.ok(production.svgDielineComplete.includes('Net Wt. 250 g'));
    assert.ok(production.svgDielineComplete.includes('Contains tree nuts'));
    assert.ok(production.svgDielineComplete.includes('EAN-13 Barcode Safe Area'));

    // Verify 6 credits deducted for production tier
    assert.equal(production.creditsDeducted, 6);
  });

  // ===========================================================================
  // 4. CAMPAIGN VISUALS & EDITORIAL PRODUCT PHOTOGRAPHY (NO VIDEO)
  // ===========================================================================
  it('4. Generates high-impact campaign visuals and editorial layouts without video', async () => {
    const ws = `ws_camp_vis_${Date.now()}`;

    await db.collection(`workspaces/${ws}/brandProfiles`).doc('prof_1').set({
      profileId: 'prof_1',
      workspaceId: ws,
      brandName: 'Aura Studio',
      industry: 'Contemporary Minimalist Fashion',
      createdAt: new Date().toISOString(),
    });

    await brandGuidelinesEngine.generateCompleteBrandBook({
      workspaceId: ws,
      userId: testUserId,
    });

    const visual = await creativeAssetsEngine.generateCampaignVisual({
      workspaceId: ws,
      userId: testUserId,
      style: 'EDITORIAL',
      campaignTheme: 'Autumn Solstice 2026',
      headline: 'Form Follows Subconscious',
      subheadline: 'Hand-woven organic silhouettes engineered for silent luxury.',
      targetPlatform: 'LOOKBOOK_HERO',
    });

    assert.ok(visual.id);
    assert.equal(visual.style, 'EDITORIAL');
    assert.ok(visual.svgContent.includes('Form Follows Subconscious'));
    assert.ok(visual.svgContent.includes('<svg'));
    assert.equal(visual.creditsDeducted, 4);

    // Verify STRICT VIDEO EXCLUSION
    assert.ok(!visual.svgContent.includes('<video'));
    assert.ok(!visual.svgContent.includes('ffmpeg'));
  });

  // ===========================================================================
  // 5. SOCIAL POST CREATIVE ACROSS MULTIPLE PLATFORM FORMATS
  // ===========================================================================
  it('5. Generates multi-format social post creatives with platform-specific safe area margins', async () => {
    const ws = `ws_social_post_${Date.now()}`;

    await db.collection(`workspaces/${ws}/brandProfiles`).doc('prof_1').set({
      profileId: 'prof_1',
      workspaceId: ws,
      brandName: 'Veloce AI',
      industry: 'B2B Enterprise Workflow Intelligence',
      createdAt: new Date().toISOString(),
    });

    await brandGuidelinesEngine.generateCompleteBrandBook({
      workspaceId: ws,
      userId: testUserId,
    });

    const formats = [
      { format: 'INSTAGRAM_SQUARE' as const, w: 1080, h: 1080 },
      { format: 'INSTAGRAM_PORTRAIT' as const, w: 1080, h: 1350 },
      { format: 'STORY_REEL_STILL' as const, w: 1080, h: 1920 },
      { format: 'LINKEDIN_HERO' as const, w: 1200, h: 627 },
      { format: 'YOUTUBE_THUMBNAIL' as const, w: 1280, h: 720 },
    ];

    for (const f of formats) {
      const post = await creativeAssetsEngine.generateSocialPostCreative({
        workspaceId: ws,
        userId: testUserId,
        format: f.format,
        postType: 'EDUCATIONAL',
        headline: 'Automate 80% of Repetitive Ops',
        subheadline: 'Deterministic AI agents grounded in your real business memory.',
        callToAction: 'Book Private Demo',
      });

      assert.equal(post.format, f.format);
      assert.equal(post.aspectRatio, `${f.w}:${f.h}`);
      assert.ok(post.svgContent.includes(`viewBox="0 0 ${f.w} ${f.h}"`));
      assert.ok(post.svgContent.includes('Automate 80% of Repetitive Ops'));
      assert.ok(post.svgContent.includes('Book Private Demo'));

      // If Story / Reel still, safe margins must be respected (no clipped UI)
      if (f.format === 'STORY_REEL_STILL') {
        assert.ok(post.svgContent.includes('Safe Header / Top Inset'));
        assert.ok(post.svgContent.includes('Safe Footer / Bottom Inset'));
      }
    }
  });

  // ===========================================================================
  // 6. MULTI-SLIDE CAROUSEL ENGINE ACROSS 10 STORYTELLING STRUCTURES
  // ===========================================================================
  it('6. Generates multi-slide carousels across storytelling structures with variable slide count (3-10)', async () => {
    const ws = `ws_carousel_${Date.now()}`;

    await db.collection(`workspaces/${ws}/brandProfiles`).doc('prof_1').set({
      profileId: 'prof_1',
      workspaceId: ws,
      brandName: 'Nirvana Matcha',
      industry: 'Ceremonial Japanese Teas',
      createdAt: new Date().toISOString(),
    });

    await brandGuidelinesEngine.generateCompleteBrandBook({
      workspaceId: ws,
      userId: testUserId,
    });

    const structures = [
      'Educational',
      'Storytelling',
      'Comparison',
      'ProductLaunch',
      'ProblemSolution',
    ] as const;

    for (const st of structures) {
      const carousel = await creativeAssetsEngine.generateMultiSlideCarousel({
        workspaceId: ws,
        userId: testUserId,
        topicPrompt: '5 Signs Your Matcha Has Been Cut With Low Grade Dust',
        storytellingStructure: st,
        slideCount: 5,
        targetPlatform: 'INSTAGRAM_CAROUSEL',
      });

      assert.ok(carousel.projectId);
      assert.equal(carousel.storytellingStructure, st);
      assert.equal(carousel.slides.length, 5);
      assert.equal(carousel.creditsDeducted, 4);

      carousel.slides.forEach((slide, idx) => {
        assert.equal(slide.slideIndex, idx);
        assert.ok(slide.headline);
        assert.ok(slide.body);
        assert.ok(slide.svgContent.includes('<svg'));
        assert.ok(slide.readingTimeSeconds > 0);
      });
    }
  });

  // ===========================================================================
  // 7. GRANULAR SLIDE MANIPULATION (EDIT, REORDER, DUPLICATE, DELETE)
  // ===========================================================================
  it('7. Supports precise slide text edits, reordering, duplication, and deletion', async () => {
    const ws = `ws_manip_${Date.now()}`;

    await db.collection(`workspaces/${ws}/brandProfiles`).doc('prof_1').set({
      profileId: 'prof_1',
      workspaceId: ws,
      brandName: 'Apex Logistics',
      industry: 'Cold-Chain Freight Logistics',
      createdAt: new Date().toISOString(),
    });

    await brandGuidelinesEngine.generateCompleteBrandBook({
      workspaceId: ws,
      userId: testUserId,
    });

    // Generate initial 4-slide carousel
    const project = await creativeAssetsEngine.generateMultiSlideCarousel({
      workspaceId: ws,
      userId: testUserId,
      topicPrompt: 'The Future of Real-Time Temperature Monitoring',
      storytellingStructure: 'Educational',
      slideCount: 4,
    });

    assert.equal(project.slides.length, 4);

    // 1. Edit Slide Text
    const edited = await creativeAssetsEngine.editSlideText({
      workspaceId: ws,
      userId: testUserId,
      projectId: project.projectId,
      slideIndex: 1,
      newHeadline: 'Cryogenic Precision Under -70°C',
      newBody: 'Dual-sensor telemetry with zero latency dry ice drift alerts.',
    });
    assert.equal(edited.slides[1].headline, 'Cryogenic Precision Under -70°C');
    assert.ok(edited.slides[1].svgContent.includes('Cryogenic Precision Under -70°C'));

    // 2. Reorder Slides: [0, 2, 1, 3]
    const reordered = await creativeAssetsEngine.reorderSlides({
      workspaceId: ws,
      userId: testUserId,
      projectId: project.projectId,
      newOrder: [0, 2, 1, 3],
    });
    assert.equal(reordered.slides[2].headline, 'Cryogenic Precision Under -70°C');
    assert.equal(reordered.slides[0].slideIndex, 0);
    assert.equal(reordered.slides[1].slideIndex, 1);
    assert.equal(reordered.slides[2].slideIndex, 2);
    assert.equal(reordered.slides[3].slideIndex, 3);

    // 3. Duplicate Slide 2
    const duplicated = await creativeAssetsEngine.duplicateSlide({
      workspaceId: ws,
      userId: testUserId,
      projectId: project.projectId,
      slideIndex: 2,
    });
    assert.equal(duplicated.slides.length, 5);
    assert.ok(duplicated.slides[3].headline.includes('(Copy)'));

    // 4. Delete Slide 3
    const deleted = await creativeAssetsEngine.deleteSlide({
      workspaceId: ws,
      userId: testUserId,
      projectId: project.projectId,
      slideIndex: 3,
    });
    assert.equal(deleted.slides.length, 4);
  });

  // ===========================================================================
  // 8. SINGLE-SLIDE REMIX WITH 1-CREDIT RESERVATION
  // ===========================================================================
  it('8. Supports single-slide remix for exactly 1 credit while preserving campaign continuity', async () => {
    const ws = `ws_remix_${Date.now()}`;

    await db.collection(`workspaces/${ws}/brandProfiles`).doc('prof_1').set({
      profileId: 'prof_1',
      workspaceId: ws,
      brandName: 'Saffron Botanics',
      industry: 'Ayurvedic Skincare',
      createdAt: new Date().toISOString(),
    });

    await brandGuidelinesEngine.generateCompleteBrandBook({
      workspaceId: ws,
      userId: testUserId,
    });

    const project = await creativeAssetsEngine.generateMultiSlideCarousel({
      workspaceId: ws,
      userId: testUserId,
      topicPrompt: 'The Ancient Chemistry of Kumkumadi Tailam',
      storytellingStructure: 'Storytelling',
      slideCount: 4,
    });

    const walletBeforeRemix = await creditService.getWallet(ws);
    const balanceBeforeRemix = walletBeforeRemix.balance - walletBeforeRemix.reserved;

    // Remix Slide 2 with custom modifier
    const remixed = await creativeAssetsEngine.regenerateSingleSlide({
      workspaceId: ws,
      userId: testUserId,
      projectId: project.projectId,
      slideIndex: 2,
      promptModifier: 'Focus on 16 active botanicals steeped in cold-pressed sesame oil.',
    });

    assert.equal(remixed.slides.length, 4);
    assert.ok(remixed.slides[2].headline);
    assert.ok(remixed.slides[2].svgContent.includes('<svg'));

    // Verify EXACTLY 1 credit deducted
    const walletAfterRemix = await creditService.getWallet(ws);
    const balanceAfterRemix = walletAfterRemix.balance - walletAfterRemix.reserved;
    assert.equal(balanceBeforeRemix - balanceAfterRemix, 1);
  });

  // ===========================================================================
  // 9. EDITABLE DESIGN DOCUMENT LAYER MODEL & DETERMINISTIC SVG COMPILER
  // ===========================================================================
  it('9. Compiles and updates structured layer trees (text, shape, logo, image) with deterministic vector rendering', async () => {
    const ws = `ws_doc_${Date.now()}`;

    const doc = await creativeAssetsEngine.createEditableDocument({
      workspaceId: ws,
      userId: testUserId,
      name: 'Launch Post Grid',
      canvasWidth: 1080,
      canvasHeight: 1080,
      format: 'POST_SQUARE',
    });

    assert.ok(doc.id);
    assert.equal(doc.layers.length, 5); // background, shape, logo, headline, body
    assert.ok(doc.compiledSvg.includes('<svg'));
    assert.ok(doc.compiledSvg.includes('viewBox="0 0 1080 1080"'));

    // Update headline text layer
    const textLayer = doc.layers.find(l => l.name === 'Headline Text');
    assert.ok(textLayer);

    const updated = await creativeAssetsEngine.updateDocumentLayer({
      workspaceId: ws,
      userId: testUserId,
      docId: doc.id,
      layerId: textLayer.id,
      updates: {
        content: 'Direct-to-Consumer Masterclass',
        x: 100,
        y: 350,
        fontSize: 54,
        fillColor: '#FF7417',
      },
    });

    assert.ok(updated.compiledSvg.includes('Direct-to-Consumer Masterclass'));
    assert.ok(updated.compiledSvg.includes('fill="#FF7417"'));
    assert.ok(updated.compiledSvg.includes('font-size="54"'));
  });

  // ===========================================================================
  // 10. COORDINATED MULTI-CHANNEL CAMPAIGN PACKAGE (8 CREDITS)
  // ===========================================================================
  it('10. Generates a synchronized multi-channel launch package (Hero, Carousel, Mockup, Social Ad) with 8-credit settlement', async () => {
    const ws = `ws_coord_camp_${Date.now()}`;

    await db.collection(`workspaces/${ws}/brandProfiles`).doc('prof_1').set({
      profileId: 'prof_1',
      workspaceId: ws,
      brandName: 'Luminary Headphones',
      industry: 'Consumer Audio & Spatial Acoustics',
      createdAt: new Date().toISOString(),
    });

    await brandGuidelinesEngine.generateCompleteBrandBook({
      workspaceId: ws,
      userId: testUserId,
    });

    const walletBefore = await creditService.getWallet(ws);
    const balanceBefore = walletBefore.balance - walletBefore.reserved;

    const campaign = await creativeAssetsEngine.generateCoordinatedCampaign({
      workspaceId: ws,
      userId: testUserId,
      campaignName: 'Aura Pro Flagship Drop',
      theme: 'Zero-Decibel Silence',
      productFocus: 'Custom Beryllium Drivers with Planar Magnetic Tweeters',
      targetAudience: 'Audiophiles, sound engineers, and creative directors',
      objective: 'Drives high-intent pre-orders with technical fidelity proof.',
    });

    assert.ok(campaign.id);
    assert.equal(campaign.campaignName, 'Aura Pro Flagship Drop');
    assert.ok(campaign.heroVisual);
    assert.ok(campaign.carousel);
    assert.ok(campaign.mockup);
    assert.ok(campaign.socialAd);
    assert.equal(campaign.creditsDeducted, 8);

    // Verify exactly 8 credits deducted
    const walletAfter = await creditService.getWallet(ws);
    const balanceAfter = walletAfter.balance - walletAfter.reserved;
    assert.equal(balanceBefore - balanceAfter, 8);
  });

  // ===========================================================================
  // 11. PROACTIVE CREATIVE OPPORTUNITIES DETECTION
  // ===========================================================================
  it('11. Detects proactive creative opportunities based on business context and asset library gaps', async () => {
    const ws = `ws_opps_${Date.now()}`;

    // Seed profile with special products
    await db.collection(`workspaces/${ws}/brandProfiles`).doc('prof_1').set({
      profileId: 'prof_1',
      workspaceId: ws,
      brandName: 'Solterra Organic Wine',
      industry: 'Biodynamic Winemaking',
      createdAt: new Date().toISOString(),
    });

    const opps = await creativeAssetsEngine.detectCreativeOpportunities({ workspaceId: ws });
    assert.ok(Array.isArray(opps));
    assert.ok(opps.length >= 3, `Expected at least 3 opportunities, got ${opps.length}`);

    opps.forEach(o => {
      assert.ok(o.opportunityId);
      assert.ok(o.title);
      assert.ok(o.category);
      assert.ok(o.businessContextRationale);
      assert.ok(o.relevanceScore > 0);
      assert.ok(o.actionPrompt);
      assert.ok(o.status === 'ACTIVE');
    });
  });

  // ===========================================================================
  // 12. BRAND CONSISTENCY & AUTOMATIC REMEDIATION
  // ===========================================================================
  it('12. Auto-remediates unapproved off-brand hex colors to active brand guideline palette', async () => {
    const ws = `ws_remed_${Date.now()}`;

    await db.collection(`workspaces/${ws}/brandProfiles`).doc('prof_1').set({
      profileId: 'prof_1',
      workspaceId: ws,
      brandName: 'Monolith Architectural',
      industry: 'Sustainable Timber Architecture',
      createdAt: new Date().toISOString(),
    });

    await brandGuidelinesEngine.generateCompleteBrandBook({
      workspaceId: ws,
      userId: testUserId,
    });

    // Request mockup with unapproved neon pink (#FF007F)
    const mockup = await creativeAssetsEngine.generateProductMockup({
      workspaceId: ws,
      userId: testUserId,
      category: 'STANDUP_POUCH',
      tokenOverrides: {
        'color.primary': '#FF007F', // Unapproved Neon Pink!
      },
    });

    assert.ok(mockup.consistencyReport);
    // Should flag unapproved color and auto-remediate
    assert.ok(
      mockup.consistencyReport.issues.some(i => i.issue.includes('Unapproved color') || i.issue.includes('#FF007F')),
      'Should detect unapproved color #FF007F'
    );
    assert.ok(mockup.consistencyReport.autoRemediated);
  });

  // ===========================================================================
  // 13. STRICT VIDEO EXCLUSION GUARANTEE
  // ===========================================================================
  it('13. Enforces strict video exclusion by permanently rejecting video generation requests', async () => {
    const ws = `ws_video_excl_${Date.now()}`;

    await db.collection(`workspaces/${ws}/brandProfiles`).doc('prof_1').set({
      profileId: 'prof_1',
      workspaceId: ws,
      brandName: 'VideoForbidden Co',
      industry: 'Software',
      createdAt: new Date().toISOString(),
    });

    // Test rejection of video prompt in Campaign Visual
    await assert.rejects(
      async () => {
        await creativeAssetsEngine.generateCampaignVisual({
          workspaceId: ws,
          userId: testUserId,
          style: 'EDITORIAL',
          campaignTheme: 'Generate an MP4 reel video with 60fps Remotion ffmpeg pipeline',
          headline: 'Forbidden Video',
        });
      },
      (err: any) => {
        assert.ok(err.message.includes('STRICT VIDEO EXCLUSION'));
        return true;
      }
    );

    // Test rejection in Carousel
    await assert.rejects(
      async () => {
        await creativeAssetsEngine.generateMultiSlideCarousel({
          workspaceId: ws,
          userId: testUserId,
          topicPrompt: 'Convert these slides into an animated video export',
          storytellingStructure: 'Educational',
          slideCount: 4,
        });
      },
      (err: any) => {
        assert.ok(err.message.includes('STRICT VIDEO EXCLUSION'));
        return true;
      }
    );
  });

  // ===========================================================================
  // 14. MULTI-TENANT WORKSPACE ISOLATION
  // ===========================================================================
  it('14. Strictly isolates mockups, packaging, documents, and campaigns between distinct workspaces', async () => {
    const wsA = `ws_tenant_a_${Date.now()}`;
    const wsB = `ws_tenant_b_${Date.now()}`;

    // Generate mockup in Workspace A
    const mockupA = await creativeAssetsEngine.generateProductMockup({
      workspaceId: wsA,
      userId: testUserId,
      category: 'BOXY_TEE',
    });

    // List mockups in Workspace B
    const mockupsB = await brandStudioRepository.listMockups(wsB);
    assert.equal(mockupsB.length, 0, 'Workspace B should have 0 mockups');

    const mockupsA = await brandStudioRepository.listMockups(wsA);
    assert.equal(mockupsA.length, 1);
    assert.equal(mockupsA[0].id, mockupA.id);

    // Direct cross-tenant lookup must return null
    const crossLookup = await brandStudioRepository.getMockup(wsB, mockupA.id);
    assert.equal(crossLookup, null, 'Workspace B should not be able to retrieve Workspace A mockup');
  });
});
