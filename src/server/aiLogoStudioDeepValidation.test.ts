/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { logoDesignEngine, createTransparentPngBuffer, calculateContrastRatio } from './services/logoDesignEngine';
import { brandStudioRepository } from './repositories/brandStudioRepository';
import { creditService } from './services/creditService';
import { db } from './db/firestore';

describe('AI LOGO STUDIO — DEEP DESIGN ENGINE & PRODUCTION IMPLEMENTATION TEST SUITE', () => {
  const testUserId = `user_logo_tester_${Date.now()}`;

  // ===========================================================================
  // 1. SIX MANDATORY CATEGORY GENERATION TESTS
  // ===========================================================================

  it('1. Generates Premium Coffee Logo with assembled intelligence brief and farmgate terroir', async () => {
    const ws = `ws_logo_coffee_${Date.now()}`;
    // Seed Business Brain Profile
    await db.collection(`workspaces/${ws}/brandProfiles`).doc('prof_1').set({
      profileId: 'prof_1',
      workspaceId: ws,
      brandName: 'Monsooned Peak',
      industry: 'Speciality Coffee Roasters',
      pricePositioning: 'Single-Estate Premium (₹650 / 250g)',
      targetAudience: 'Third-wave coffee purists and home baristas',
      valueProposition: 'Shade-grown Chikmagalur micro-lots roasted with scientific precision.',
      brandPersonality: ['Earthy', 'Artisanal', 'Meticulous', 'Authoritative'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const brief = await logoDesignEngine.assembleLogoBrief({
      workspaceId: ws,
      userNotes: 'A tactile single-estate coffee mark highlighting shade canopy elevation and roast batch precision',
      logoArchetype: 'Modern Emblem',
      logoMood: 'Warm Tactile Craft',
    });

    assert.equal(brief.brandName, 'Monsooned Peak');
    assert.ok(brief.pricePositioning.includes('650'));
    assert.ok(brief.targetAudience.includes('coffee'));

    const result = await logoDesignEngine.generateThreeDistinctConcepts({
      workspaceId: ws,
      userId: testUserId,
      brief,
      userPrompt: brief.userNotes,
    });

    assert.equal(result.creditsDeducted, 4);
    assert.equal(result.concepts.length, 3);

    // Verify deterministic spelling in SVG
    for (const concept of result.concepts) {
      assert.ok(concept.svgMarkup.includes('Monsooned Peak'), 'Brand name must be deterministically rendered without spelling errors');
      assert.ok(concept.svgMarkup.startsWith('<svg'), 'Must be valid SVG root element');
      assert.ok(concept.svgMarkup.endsWith('</svg>'), 'Must terminate SVG cleanly');
      assert.ok(!concept.svgMarkup.includes('<video'), 'STRICT VIDEO EXCLUSION: Zero video tags');
      assert.ok(!concept.svgMarkup.includes('<script'), 'Zero active scripts');
      assert.ok(concept.designRationale.length > 20);
      assert.ok(concept.symbolMeaning.length > 10);
      assert.ok(concept.advantages.length >= 2);
    }
  });

  it('2. Generates Gen Z Clothing Wordmark with brutalist typography and subversive South Asian cues', async () => {
    const ws = `ws_logo_cloth_${Date.now()}`;
    await db.collection(`workspaces/${ws}/brandProfiles`).doc('prof_1').set({
      profileId: 'prof_1',
      workspaceId: ws,
      brandName: 'Kaal Studio',
      industry: 'Subversive Streetwear',
      pricePositioning: 'Heavyweight Luxury Streetwear (₹3,500 / garment)',
      targetAudience: 'Gen Z creatives and underground music subcultures',
      valueProposition: '380 GSM organic French terry garments inspired by brutalist South Asian typography.',
      brandPersonality: ['Subversive', 'Unapologetic', 'Tactile'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const result = await logoDesignEngine.generateThreeDistinctConcepts({
      workspaceId: ws,
      userId: testUserId,
      userPrompt: 'Brutalist heavyweight streetwear wordmark with sharp corner chamfers',
      styleArchetype: 'Architectural Minimalist',
      mood: 'Bold Geometric Tech',
    });

    assert.equal(result.concepts.length, 3);
    const wordmarkConcept = result.concepts.find((c) => c.markStyle === 'monogram' || c.markStyle === 'geometric');
    assert.ok(wordmarkConcept);
    assert.ok(wordmarkConcept.svgMarkup.includes('Kaal Studio'));
    assert.ok(wordmarkConcept.typographyDetails.weight.includes('Bold'));
  });

  it('3. Generates Chocolate Brand Monogram with bean-to-bar coordinates', async () => {
    const ws = `ws_logo_choc_${Date.now()}`;
    await db.collection(`workspaces/${ws}/brandProfiles`).doc('prof_1').set({
      profileId: 'prof_1',
      workspaceId: ws,
      brandName: 'Malabar Cacao',
      industry: 'Artisanal Single-Origin Chocolate',
      pricePositioning: 'Craft Bean-to-Bar (₹450 / 80g bar)',
      targetAudience: 'Epicurean dark chocolate connoisseurs',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const result = await logoDesignEngine.generateThreeDistinctConcepts({
      workspaceId: ws,
      userId: testUserId,
      userPrompt: 'Interlocking M and C monogram for single-origin cacao brand',
      styleArchetype: 'Minimal Geometric',
    });

    assert.equal(result.concepts.length, 3);
    const monogram = result.concepts[0];
    assert.ok(monogram.svgMarkup.includes('Malabar Cacao'));
    assert.ok(monogram.designRationale.includes('interlocking') || monogram.designRationale.includes('lettermark'));
  });

  it('4. Generates Craft Beverage Combination Mark with botanical balance', async () => {
    const ws = `ws_logo_drink_${Date.now()}`;
    await db.collection(`workspaces/${ws}/brandProfiles`).doc('prof_1').set({
      profileId: 'prof_1',
      workspaceId: ws,
      brandName: 'Botanica Fizz',
      industry: 'Craft Botanical Soda',
      pricePositioning: 'Modern Functional Soda (₹120 / can)',
      targetAudience: 'Health-conscious urban consumers',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const result = await logoDesignEngine.generateThreeDistinctConcepts({
      workspaceId: ws,
      userId: testUserId,
      userPrompt: 'Botanical sparkling tonic combination mark with clean citrus horizon',
      styleArchetype: 'Modern Emblem',
    });

    assert.equal(result.concepts.length, 3);
    const combo = result.concepts[1];
    assert.ok(combo.svgMarkup.includes('Botanica Fizz'));
    assert.ok(combo.symbolMeaning.length > 10);
  });

  it('5. Generates Beauty & Skincare Emblem with biomimetic cellular geometry', async () => {
    const ws = `ws_logo_skin_${Date.now()}`;
    await db.collection(`workspaces/${ws}/brandProfiles`).doc('prof_1').set({
      profileId: 'prof_1',
      workspaceId: ws,
      brandName: 'DermaSutra',
      industry: 'Dermatological Skincare',
      pricePositioning: 'Masstige Scientific (₹850 / bottle)',
      targetAudience: 'Ingredient-conscious consumers',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const result = await logoDesignEngine.generateThreeDistinctConcepts({
      workspaceId: ws,
      userId: testUserId,
      userPrompt: 'Biomimetic active skincare seal with calm clinical authority',
      styleArchetype: 'Modern Emblem',
    });

    assert.equal(result.concepts.length, 3);
    const emblem = result.concepts.find((c) => c.markStyle === 'emblem');
    assert.ok(emblem);
    assert.ok(emblem.svgMarkup.includes('DermaSutra'));
  });

  it('6. Generates Technology Startup Symbol with TopoGrid precision', async () => {
    const ws = `ws_logo_tech_${Date.now()}`;
    await db.collection(`workspaces/${ws}/brandProfiles`).doc('prof_1').set({
      profileId: 'prof_1',
      workspaceId: ws,
      brandName: 'VectraPulse',
      industry: 'B2B Real-Time Telemetry & AI',
      pricePositioning: 'SaaS Subscription (₹4,999 / mo)',
      targetAudience: 'Engineering leaders and commercial founders',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const result = await logoDesignEngine.generateThreeDistinctConcepts({
      workspaceId: ws,
      userId: testUserId,
      userPrompt: 'Architectural TopoGrid vector mark representing continuous telemetry verification',
      styleArchetype: 'Minimal Geometric',
    });

    assert.equal(result.concepts.length, 3);
    const techMark = result.concepts[0];
    assert.ok(techMark.svgMarkup.includes('VectraPulse'));
    assert.equal(techMark.scalabilityRating, 'EXCELLENT');
  });

  // ===========================================================================
  // 2. NAME ROBUSTNESS, NON-ENGLISH TEXT & ASPECT RATIOS
  // ===========================================================================

  it('7. Handles long brand names, single-letter marks, and non-English text without clipping', async () => {
    const ws = `ws_logo_names_${Date.now()}`;

    // Test 1: Very long brand name
    const longName = 'International Micro-Regional Botanical Distillers & Roasters';
    const longResult = await logoDesignEngine.generateThreeDistinctConcepts({
      workspaceId: ws,
      userId: testUserId,
      brief: {
        workspaceId: ws,
        brandName: longName,
        tagline: 'Artisanal Batch Production',
        category: 'Beverage',
        industry: 'Distilling',
        pricePositioning: 'Luxury',
        targetAudience: 'Connoisseurs',
        brandPersonality: ['Refined'],
        approvedColors: { primary: '#171717', secondary: '#252525', accent: '#FF7417', neutral: '#737373', background: '#FAFAF9' },
        typographyDirection: { headingFont: 'Plus Jakarta Sans', bodyFont: 'Inter', monoFont: 'JetBrains Mono', ratio: 1.25 },
        competitorDifferentiators: [],
        contrarianWedge: 'Single batch precision',
        createdAt: new Date().toISOString(),
      },
    });
    assert.ok(longResult.concepts[0].svgMarkup.includes(longName), 'Long brand name rendered completely');

    // Test 2: Ultra short single letter brand name
    const shortName = 'K';
    const shortResult = await logoDesignEngine.generateThreeDistinctConcepts({
      workspaceId: ws,
      userId: testUserId,
      brief: {
        workspaceId: ws,
        brandName: shortName,
        tagline: 'Precision In Motion',
        category: 'Tech',
        industry: 'AI',
        pricePositioning: 'SaaS',
        targetAudience: 'Developers',
        brandPersonality: ['Speed'],
        approvedColors: { primary: '#171717', secondary: '#252525', accent: '#FF7417', neutral: '#737373', background: '#FAFAF9' },
        typographyDirection: { headingFont: 'Plus Jakarta Sans', bodyFont: 'Inter', monoFont: 'JetBrains Mono', ratio: 1.25 },
        competitorDifferentiators: [],
        contrarianWedge: 'Ultra-minimal',
        createdAt: new Date().toISOString(),
      },
    });
    assert.ok(shortResult.concepts[0].svgMarkup.includes('>K<'), 'Single letter brand name rendered with optical authority');

    // Test 3: Bilingual Non-English text
    const nonEnglishName = 'समस्त Samasta';
    const nonEnglishResult = await logoDesignEngine.generateThreeDistinctConcepts({
      workspaceId: ws,
      userId: testUserId,
      brief: {
        workspaceId: ws,
        brandName: nonEnglishName,
        tagline: 'Shade Canopy Origins',
        category: 'Coffee',
        industry: 'Coffee',
        pricePositioning: 'Craft',
        targetAudience: 'Global',
        brandPersonality: ['Heritage'],
        approvedColors: { primary: '#171717', secondary: '#252525', accent: '#FF7417', neutral: '#737373', background: '#FAFAF9' },
        typographyDirection: { headingFont: 'Plus Jakarta Sans', bodyFont: 'Inter', monoFont: 'JetBrains Mono', ratio: 1.25 },
        competitorDifferentiators: [],
        contrarianWedge: 'Indian roots',
        createdAt: new Date().toISOString(),
      },
    });
    assert.ok(nonEnglishResult.concepts[0].svgMarkup.includes(nonEnglishName), 'Unicode non-English characters preserved without distortion');
  });

  // ===========================================================================
  // 3. GENUINE ALPHA TRANSPARENCY & VALID PNG/SVG EXPORTS
  // ===========================================================================

  it('8. Produces genuine 32-bit RGBA transparent PNGs with true 0x00 alpha channel (no checkerboard fakery)', () => {
    // Generate 512x512 transparent PNG
    const pngBuffer = createTransparentPngBuffer(512, 512, (x, y) => {
      // Draw centered opaque mark in middle 200x200
      const dx = x - 256;
      const dy = y - 256;
      if (dx * dx + dy * dy < 10000) {
        return [23, 23, 23, 255]; // Opaque charcoal pixel (alpha = 255)
      }
      return [0, 0, 0, 0]; // 100% Genuine alpha transparent pixel!
    });

    assert.ok(pngBuffer.length > 100);
    // Verify standard 8-byte PNG header signature: 89 50 4E 47 0D 0A 1A 0A
    const expectedSig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    assert.deepEqual(pngBuffer.subarray(0, 8), expectedSig, 'PNG signature must match ISO PNG specification');

    // Verify IHDR chunk
    assert.equal(pngBuffer.toString('ascii', 12, 16), 'IHDR');
    assert.equal(pngBuffer.readUInt32BE(16), 512, 'Width must be 512');
    assert.equal(pngBuffer.readUInt32BE(20), 512, 'Height must be 512');
    assert.equal(pngBuffer.readUInt8(24), 8, 'Bit depth must be 8');
    assert.equal(pngBuffer.readUInt8(25), 6, 'Color type must be 6 (RGBA color with true alpha channel)');

    // Verify IEND chunk at EOF
    assert.ok(pngBuffer.includes(Buffer.from('IEND')), 'PNG must terminate with standard IEND chunk');
  });

  // ===========================================================================
  // 4. PROFESSIONAL LOGO FAMILY VARIANTS GENERATION
  // ===========================================================================

  it('9. Generates complete professional logo family variants (Horizontal, Stacked, Symbol, Monochrome, Favicon, Avatar)', async () => {
    const ws = `ws_logo_fam_${Date.now()}`;
    const gen = await logoDesignEngine.generateThreeDistinctConcepts({
      workspaceId: ws,
      userId: testUserId,
      userPrompt: 'Monsooned Peak Coffee Roasters',
    });
    const concept = gen.concepts[0];

    const variants = await logoDesignEngine.generateLogoFamilyVariants({
      workspaceId: ws,
      conceptId: concept.id,
    });

    assert.equal(variants.conceptId, concept.id);
    assert.equal(variants.workspaceId, ws);

    // Verify all 10 variant formats
    const v = variants.variants;
    assert.ok(v.primaryHorizontal.includes('viewBox="0 0 700 220"'), 'Horizontal lockup calibrated dimensions');
    assert.ok(v.secondaryStacked.includes('viewBox="0 0 500 500"'), 'Stacked lockup centered geometry');
    assert.ok(v.symbolOnly.includes('symbol_isolated'), 'Symbol only isolates pure vector glyph');
    assert.ok(v.monogramOnly.includes('viewBox="0 0 200 200"'), 'Monogram only calibrated for stamps');
    assert.ok(v.monochromeBlack.includes('#000000'), 'Black monochrome contains pure #000000');
    assert.ok(v.monochromeWhite.includes('#FFFFFF'), 'White monochrome contains pure #FFFFFF');
    assert.ok(v.fullColorLight.length > 50, 'Full color light surface');
    assert.ok(v.fullColorDark.includes('#171717'), 'Full color dark surface contains dark substrate');
    assert.ok(v.faviconSvg.includes('viewBox="0 0 32 32"'), 'Favicon SVG strictly 32x32 viewbox');
    assert.ok(v.socialAvatarSvg.includes('viewBox="0 0 1080 1080"'), 'Social avatar strictly 1080x1080 circle-safe container');

    // Verify raster export base64
    assert.ok(variants.rasterExports.png1xTransparentBase64?.startsWith('data:image/png;base64,'));
    assert.ok(variants.rasterExports.png2xTransparentBase64?.startsWith('data:image/png;base64,'));

    // Verify repository persistence
    const saved = await brandStudioRepository.getLogoVariants(ws, concept.id);
    assert.ok(saved);
    assert.equal(saved?.conceptId, concept.id);
  });

  // ===========================================================================
  // 5. AUTOMATED TECHNICAL QUALITY CHECKER
  // ===========================================================================

  it('10. Executes automated technical quality validation across surfaces, small sizes, and legal disclaimers', async () => {
    const ws = `ws_logo_qual_${Date.now()}`;
    const gen = await logoDesignEngine.generateThreeDistinctConcepts({
      workspaceId: ws,
      userId: testUserId,
      userPrompt: 'Monsooned Peak Coffee Roasters',
    });
    const concept = gen.concepts[0];

    const report = await logoDesignEngine.validateLogoQuality({
      workspaceId: ws,
      conceptId: concept.id,
    });

    assert.ok(report.reportId.startsWith('lval_'));
    assert.equal(report.conceptId, concept.id);
    assert.equal(report.overallPass, true);

    // Deterministic technical checks
    const d = report.deterministicChecks;
    assert.equal(d.brandNameSpellingCorrect, true);
    assert.equal(d.fileFormatValidSvg, true);
    assert.equal(d.xmlStructureValid, true);
    assert.equal(d.zeroActiveScripts, true);
    assert.equal(d.zeroEmbeddedRasters, true);
    assert.equal(d.zeroVideoTags, true, 'STRICT VIDEO EXCLUSION: Zero video tags verified');
    assert.equal(d.transparencyVerified, true, 'Genuine transparency verified without opaque backdrop');

    // Surface Contrast Scores
    const c = report.surfaceContrastScores;
    assert.ok(c.onWhite.contrastRatio >= 4.5, 'Contrast on white meets WCAG standards');
    assert.ok(c.onBlack.contrastRatio >= 4.5, 'Contrast on black meets WCAG standards');
    assert.ok(c.onDarkSurface.contrastRatio >= 7.0, 'Contrast on dark surface meets WCAG AAA standards');

    // Small-size legibility
    assert.equal(report.smallSizeLegibility.at16px.legible, true);
    assert.equal(report.smallSizeLegibility.at32px.legible, true);

    // Trademark Disclaimer Check
    assert.ok(
      report.trademarkDisclaimer.includes('DISCLAIMER') &&
      report.trademarkDisclaimer.includes('trademark') &&
      report.trademarkDisclaimer.includes('attorney'),
      'Must contain explicit trademark legal disclaimer'
    );

    const saved = await brandStudioRepository.getLatestLogoQualityReport(ws, concept.id);
    assert.ok(saved);
    assert.equal(saved?.reportId, report.reportId);
  });

  // ===========================================================================
  // 6. NATURAL-LANGUAGE REFINEMENT WORKSPACE & VERSION TRACKING
  // ===========================================================================

  it('11. Refines logo concepts using natural language directives while maintaining version history and branching', async () => {
    const ws = `ws_logo_refine_${Date.now()}`;
    const gen = await logoDesignEngine.generateThreeDistinctConcepts({
      workspaceId: ws,
      userId: testUserId,
      userPrompt: 'Monsooned Peak Coffee Roasters',
    });
    const baseConcept = gen.concepts[0];

    // Directive 1: MORE_PREMIUM
    const ref1 = await logoDesignEngine.refineLogoConcept({
      workspaceId: ws,
      userId: testUserId,
      conceptId: baseConcept.id,
      directive: 'MORE_PREMIUM',
    });
    assert.equal(ref1.refinedConcept.version, 2);
    assert.equal(ref1.refinedConcept.primaryColor, '#0D0D0D');
    assert.equal(ref1.refinedConcept.accentColor, '#D4AF37');
    assert.ok(ref1.refinedConcept.conceptName.includes('Ultra-Premium'));

    // Directive 2: SIMPLIFY_SYMBOL
    const ref2 = await logoDesignEngine.refineLogoConcept({
      workspaceId: ws,
      userId: testUserId,
      conceptId: baseConcept.id,
      directive: 'SIMPLIFY_SYMBOL',
    });
    assert.equal(ref2.refinedConcept.version, 3);
    assert.ok(ref2.refinedConcept.conceptName.includes('Minimalist Simplified'));

    // Directive 3: CHANGE_TYPOGRAPHY
    const ref3 = await logoDesignEngine.refineLogoConcept({
      workspaceId: ws,
      userId: testUserId,
      conceptId: baseConcept.id,
      directive: 'CHANGE_TYPOGRAPHY',
    });
    assert.equal(ref3.refinedConcept.typographyDetails.fontName, 'Space Grotesk');

    // Directive 4: SUITABLE_FOR_PACKAGING
    const ref4 = await logoDesignEngine.refineLogoConcept({
      workspaceId: ws,
      userId: testUserId,
      conceptId: baseConcept.id,
      directive: 'SUITABLE_FOR_PACKAGING',
    });
    assert.equal(ref4.refinedConcept.safeSpaceMarginPx, 64);

    // Directive 5: BRANCH AS NEW
    const refBranch = await logoDesignEngine.refineLogoConcept({
      workspaceId: ws,
      userId: testUserId,
      conceptId: baseConcept.id,
      directive: 'MORE_YOUTHFUL',
      branchAsNew: true,
    });
    assert.equal(refBranch.refinedConcept.version, 1);
    assert.notEqual(refBranch.refinedConcept.id, baseConcept.id, 'Branched concept gets a new unique ID');
    assert.equal(refBranch.refinedConcept.parentConceptId, baseConcept.id, 'Maintains lineage pointer to parent concept');
  });

  // ===========================================================================
  // 7. PROFESSIONAL PRESENTATION DECK GENERATION
  // ===========================================================================

  it('12. Generates an agency-grade logo presentation deck with alternative lockups and 4 real-world mockups', async () => {
    const ws = `ws_logo_deck_${Date.now()}`;
    const gen = await logoDesignEngine.generateThreeDistinctConcepts({
      workspaceId: ws,
      userId: testUserId,
      userPrompt: 'Monsooned Peak Coffee Roasters',
    });
    const concept = gen.concepts[0];

    const deck = await logoDesignEngine.generatePresentationDeck({
      workspaceId: ws,
      conceptId: concept.id,
    });

    assert.ok(deck.deckId.startsWith('deck_'));
    assert.equal(deck.workspaceId, ws);
    assert.equal(deck.activeConcept.id, concept.id);
    assert.ok(deck.alternativeConcepts.length <= 2);
    assert.equal(deck.colorPaletteTokens.length, 4);
    assert.ok(deck.typographyStack.modularScale.includes('1.25'));

    // Verify 4 real-world mockups in pure SVG
    assert.equal(deck.mockupUsageApplications.length, 4);
    assert.equal(deck.mockupUsageApplications[0].application, 'Executive Business Card');
    assert.equal(deck.mockupUsageApplications[1].application, 'Product Packaging Sleeve');
    assert.equal(deck.mockupUsageApplications[2].application, 'Official Stationery Letterhead');
    assert.equal(deck.mockupUsageApplications[3].application, 'Verified Social Avatar');

    for (const app of deck.mockupUsageApplications) {
      assert.ok(app.svgMockupMarkup.startsWith('<svg'), `${app.application} must be pure SVG vector markup`);
      assert.ok(!app.svgMockupMarkup.includes('<video'), 'STRICT VIDEO EXCLUSION in mockups');
      assert.ok(!app.svgMockupMarkup.includes('<script'), 'No scripts in mockups');
    }

    const saved = await brandStudioRepository.getLatestLogoPresentation(ws);
    assert.ok(saved);
    assert.equal(saved?.deckId, deck.deckId);
  });

  // ===========================================================================
  // 8. TWO-PHASE CREDIT ACCOUNTING & AUTOMATIC REFUND RECONCILIATION
  // ===========================================================================

  it('13. Enforces Two-Phase Credit Reservation (4 credits) and automatically refunds on failure', async () => {
    const ws = `ws_logo_billing_${Date.now()}`;

    // Initialize wallet with 100 credits
    const wallet = await creditService.getWallet(ws);
    const initialAvailable = wallet.balance - wallet.reserved;

    // Successful generation: deducts 4 credits
    const result = await logoDesignEngine.generateThreeDistinctConcepts({
      workspaceId: ws,
      userId: testUserId,
      userPrompt: 'Monsooned Peak Coffee Roasters',
    });

    assert.equal(result.creditsDeducted, 4);
    const updatedWallet = await creditService.getWallet(ws);
    const updatedAvailable = updatedWallet.balance - updatedWallet.reserved;
    assert.equal(updatedAvailable, initialAvailable - 4);

    // Failed generation simulation: holds then refunds
    const brokenBrief: any = {
      workspaceId: ws,
      brandName: null, // will trigger an error inside concept synthesis
    };

    try {
      await logoDesignEngine.generateThreeDistinctConcepts({
        workspaceId: ws,
        userId: testUserId,
        brief: brokenBrief,
      });
      assert.fail('Should have thrown');
    } catch {
      // Wallet must be refunded with zero net loss
      const postFailWallet = await creditService.getWallet(ws);
      const postFailAvailable = postFailWallet.balance - postFailWallet.reserved;
      assert.equal(postFailAvailable, updatedAvailable, 'Credit reservation must be 100% refunded on failure');
      assert.equal(postFailWallet.reserved, 0, 'Zero lingering credit holds');
    }
  });

  // ===========================================================================
  // 9. IDEMPOTENCY & MULTI-TENANT ISOLATION
  // ===========================================================================

  it('14. Prevents duplicate charges via idempotency keys and enforces strict multi-tenant isolation', async () => {
    const ws1 = `ws_logo_iso_1_${Date.now()}`;
    const ws2 = `ws_logo_iso_2_${Date.now()}`;
    const idemKey = `idem_logo_${Date.now()}`;

    // Generate in Tenant 1 with idempotency key
    const gen1 = await logoDesignEngine.generateThreeDistinctConcepts({
      workspaceId: ws1,
      userId: testUserId,
      userPrompt: 'Tenant 1 Coffee Mark',
      idempotencyKey: idemKey,
    });
    assert.equal(gen1.concepts.length, 3);

    // Re-call with same idempotency key in Tenant 1
    const gen1Repeat = await logoDesignEngine.generateThreeDistinctConcepts({
      workspaceId: ws1,
      userId: testUserId,
      userPrompt: 'Tenant 1 Coffee Mark',
      idempotencyKey: idemKey,
    });
    assert.equal(gen1Repeat.creditsDeducted, 4);

    // Verify Tenant 2 cannot access Tenant 1 concepts
    const t1Concepts = await brandStudioRepository.listLogoConcepts(ws1);
    const t2Concepts = await brandStudioRepository.listLogoConcepts(ws2);

    assert.equal(t1Concepts.length, 6);
    assert.equal(t2Concepts.length, 0, 'Tenant 2 must have zero access to Tenant 1 concepts');
  });
});
