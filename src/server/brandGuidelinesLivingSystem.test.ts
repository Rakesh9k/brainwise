/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { brandGuidelinesEngine, hexToRgb, rgbToCmyk } from './services/brandGuidelinesEngine';
import { brandStudioRepository } from './repositories/brandStudioRepository';
import { brandStudioService } from './services/brandStudioService';
import { db } from './db/firestore';

describe('BRAND GUIDELINES — LIVING DESIGN SYSTEM & PRODUCTION IMPLEMENTATION TEST SUITE', () => {
  const testUserId = `user_guidelines_${Date.now()}`;

  // ===========================================================================
  // 1. COLOR CONVERSION UTILITIES (HEX, RGB, CMYK)
  // ===========================================================================
  it('1. Accurately converts HEX to RGB and CMYK with deterministic percentages', () => {
    // Pure Black
    const rgbBlack = hexToRgb('#000000');
    assert.deepEqual(rgbBlack, [0, 0, 0]);
    assert.equal(rgbToCmyk(0, 0, 0), 'C:0% M:0% Y:0% K:100%');

    // Pure White
    const rgbWhite = hexToRgb('#FFFFFF');
    assert.deepEqual(rgbWhite, [255, 255, 255]);
    assert.equal(rgbToCmyk(255, 255, 255), 'C:0% M:0% Y:0% K:0%');

    // BrainWise Accent Orange (#FF7417)
    const rgbOrange = hexToRgb('#FF7417');
    assert.deepEqual(rgbOrange, [255, 116, 23]);
    const cmykOrange = rgbToCmyk(255, 116, 23);
    assert.ok(cmykOrange.includes('C:0%'));
    assert.ok(cmykOrange.includes('K:0%'));
    assert.ok(cmykOrange.includes('M:55%'));
    assert.ok(cmykOrange.includes('Y:91%'));

    // Shorthand hex #F70
    const rgbShort = hexToRgb('#F70');
    assert.deepEqual(rgbShort, [255, 119, 0]);
  });

  // ===========================================================================
  // 2. AUTOMATIC BRAND BOOK GENERATION FROM BUSINESS BRAIN & IDENTITY
  // ===========================================================================
  it('2. Automatically generates a complete brand book from Business Brain and Brand Strategy', async () => {
    const ws = `ws_guide_gen_${Date.now()}`;

    // Seed Business Brain
    await db.collection(`workspaces/${ws}/brandProfiles`).doc('prof_1').set({
      profileId: 'prof_1',
      workspaceId: ws,
      brandName: 'Artisan Terra',
      industry: 'Direct-to-Consumer Organic Ceramics',
      pricePositioning: 'Heirloom Tier (₹2,400 per piece)',
      targetAudience: 'Conscious homeowners, architects, and fine dining restaurateurs',
      valueProposition: 'Hand-thrown stoneware with non-toxic botanical glazes and verifiable batch tracing.',
      brandPersonality: ['Earthy', 'Tactile', 'Minimalist', 'Timeless'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const book = await brandGuidelinesEngine.generateCompleteBrandBook({
      workspaceId: ws,
      createdBy: testUserId,
    });

    // Foundations
    assert.ok(book.bookId.startsWith('bbook_'));
    assert.equal(book.version, 1);
    assert.equal(book.status, 'APPROVED');
    assert.equal(book.foundations.brandName, 'Artisan Terra');
    assert.ok(book.foundations.values.length >= 3);
    assert.ok(book.foundations.audiencePersonas.length >= 2);

    // Logo System
    assert.ok(book.logoSystem.primaryLogoSvg.startsWith('<svg'));
    assert.ok(book.logoSystem.invertedLogoSvg.startsWith('<svg'));
    assert.ok(book.logoSystem.monochromeLogoSvg.startsWith('<svg'));
    assert.ok(book.logoSystem.clearSpaceRule.includes('1.5x'));
    assert.equal(book.logoSystem.minimumSizes.digitalPx, 32);
    assert.equal(book.logoSystem.minimumSizes.printMm, 12);
    assert.ok(book.logoSystem.incorrectUsageRules.length >= 4);

    // Colour System
    assert.ok(book.colorSystem.primaryPalette.primaryHex);
    assert.ok(book.colorSystem.primaryPalette.cmyk);
    assert.ok(book.colorSystem.accentPalette.accentHex);
    assert.ok(book.colorSystem.usageRatios.dominantPrimary.includes('60%'));
    assert.ok(book.colorSystem.contrastMatrix.length >= 3);
    for (const c of book.colorSystem.contrastMatrix) {
      assert.ok(c.ratio >= 4.5, `Contrast ratio must pass WCAG AA (got ${c.ratio})`);
    }

    // Typography Ladder
    assert.equal(book.typography.primaryFontFamily, 'Plus Jakarta Sans');
    assert.equal(book.typography.scaleRatio, 1.25);
    assert.equal(book.typography.typeLadder.h1.sizePx, 48);
    assert.equal(book.typography.typeLadder.body.sizePx, 16);

    // Visual Language
    assert.ok(book.visualLanguage.graphicMotifSvg.startsWith('<svg'));
    assert.ok(book.visualLanguage.photographyGuidelines.dos.length >= 3);

    // Communication
    assert.ok(book.communication.approvedClaims.length >= 3);
    assert.ok(book.communication.forbiddenClaims.length >= 3);

    // Applications tailored to DTC Ceramics
    assert.ok(book.applications.packaging);
    assert.ok(book.applications.packaging.specifications.includes('Stoneware'));
    assert.ok(book.applications.stationery);
    assert.ok(book.applications.socialMedia);
    assert.ok(book.applications.advertising);
  });

  // ===========================================================================
  // 3. LIVING SEMANTIC DESIGN TOKEN SYSTEM
  // ===========================================================================
  it('3. Compiles structured living design tokens across all semantic categories', async () => {
    const ws = `ws_guide_tokens_${Date.now()}`;

    const book = await brandGuidelinesEngine.generateCompleteBrandBook({
      workspaceId: ws,
      createdBy: testUserId,
    });

    const tokens = await brandStudioRepository.listLivingTokens(ws);
    assert.ok(tokens.length >= 15, `Must generate at least 15 comprehensive tokens (got ${tokens.length})`);

    const paths = tokens.map((t) => t.semanticPath);
    assert.ok(paths.includes('color.brand.primary'), 'Must include color.brand.primary');
    assert.ok(paths.includes('color.brand.accent'), 'Must include color.brand.accent');
    assert.ok(paths.includes('color.surface.primary'), 'Must include color.surface.primary');
    assert.ok(paths.includes('spacing.modular.base'), 'Must include spacing.modular.base');
    assert.ok(paths.includes('spacing.modular.large'), 'Must include spacing.modular.large');
    assert.ok(paths.includes('typography.family.primary'), 'Must include typography.family.primary');
    assert.ok(paths.includes('typography.scale.ratio'), 'Must include typography.scale.ratio');
    assert.ok(paths.includes('logo.clearspace.ratio'), 'Must include logo.clearspace.ratio');
    assert.ok(paths.includes('voice.tone.primary'), 'Must include voice.tone.primary');

    // Verify token metadata
    for (const token of tokens) {
      assert.ok(token.tokenId.startsWith('tok_'));
      assert.equal(token.workspaceId, ws);
      assert.equal(token.version, 1);
      assert.equal(token.status, 'APPROVED');
      assert.ok(token.description);
      assert.ok(token.modificationHistory.length >= 1);
    }
  });

  // ===========================================================================
  // 4. MACHINE-READABLE DESIGN RULES ENGINE
  // ===========================================================================
  it('4. Compiles machine-readable design rules with distinct severity levels', async () => {
    const ws = `ws_guide_rules_${Date.now()}`;

    await brandGuidelinesEngine.generateCompleteBrandBook({
      workspaceId: ws,
      createdBy: testUserId,
    });

    const rules = await brandStudioRepository.listDesignRules(ws);
    assert.ok(rules.length >= 7, `Must generate at least 7 comprehensive design rules (got ${rules.length})`);

    const severities = rules.map((r) => r.severity);
    assert.ok(severities.includes('MANDATORY'), 'Must include MANDATORY rules');
    assert.ok(severities.includes('RECOMMENDED'), 'Must include RECOMMENDED rules');
    assert.ok(severities.includes('CONTEXT_SPECIFIC'), 'Must include CONTEXT_SPECIFIC rules');

    const checkCodes = rules.map((r) => r.checkCode);
    assert.ok(checkCodes.includes('CHECK_PRIMARY_COLOR'));
    assert.ok(checkCodes.includes('CHECK_PRIMARY_FONT'));
    assert.ok(checkCodes.includes('CHECK_WCAG_CONTRAST'));
    assert.ok(checkCodes.includes('CHECK_FORBIDDEN_CLAIMS'));
    assert.ok(checkCodes.includes('CHECK_VIDEO_BANNED'));

    // Verify video ban rule is MANDATORY
    const videoBan = rules.find((r) => r.checkCode === 'CHECK_VIDEO_BANNED');
    assert.ok(videoBan);
    assert.equal(videoBan.severity, 'MANDATORY');
    assert.ok(videoBan.errorMessage.includes('STRICT VIDEO EXCLUSION'));
  });

  // ===========================================================================
  // 5. BRAND CONSISTENCY EVALUATOR (PASS, WARNING, FAIL & AUTO-REMEDIATION)
  // ===========================================================================
  it('5. Evaluates brand consistency, catches forbidden claims/video violations, and auto-remediates unapproved colors', async () => {
    const ws = `ws_guide_eval_${Date.now()}`;

    await brandGuidelinesEngine.generateCompleteBrandBook({
      workspaceId: ws,
      createdBy: testUserId,
    });

    // A. Clean compliant asset should PASS
    const cleanContent = `
      <svg viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="200" fill="#171717"/>
        <text x="40" y="80" fill="#FFFFFF" font-family="Plus Jakarta Sans">Artisan Terra Heirloom</text>
        <circle cx="200" cy="140" r="20" fill="#FF7417"/>
      </svg>
    `;
    const cleanReport = await brandGuidelinesEngine.evaluateBrandConsistency({
      workspaceId: ws,
      assetType: 'COLLATERAL',
      assetContent: cleanContent,
    });
    assert.equal(cleanReport.overallVerdict, 'PASS');
    assert.equal(cleanReport.status, 'PASSED');
    assert.equal(cleanReport.mandatoryViolationsCount, 0);

    // B. Forbidden Video Violation should FAIL with MANDATORY error
    const videoContent = `
      Join our new YouTube Reel with an automated AI video generated via Remotion and FFmpeg.
    `;
    const videoReport = await brandGuidelinesEngine.evaluateBrandConsistency({
      workspaceId: ws,
      assetType: 'COPY',
      assetContent: videoContent,
    });
    assert.equal(videoReport.overallVerdict, 'FAIL');
    assert.equal(videoReport.status, 'FAILED');
    assert.ok(videoReport.mandatoryViolationsCount >= 1);
    const videoViolation = videoReport.violations.find((v) => v.ruleCode === 'CHECK_VIDEO_BANNED');
    assert.ok(videoViolation);
    assert.equal(videoViolation.severity, 'MANDATORY');

    // C. Forbidden Claim Violation should trigger WARNING or FAIL
    const forbiddenContent = `
      Our guarantee is 100% effortless free passive income forever with guaranteed return on investment!
    `;
    const forbiddenReport = await brandGuidelinesEngine.evaluateBrandConsistency({
      workspaceId: ws,
      assetType: 'COPY',
      assetContent: forbiddenContent,
    });
    const claimViolation = forbiddenReport.violations.find((v) => v.ruleCode === 'CHECK_FORBIDDEN_CLAIMS');
    assert.ok(claimViolation, 'Must flag forbidden deceptive claims');

    // D. Auto-Remediation of unapproved hex color in SVG
    const unapprovedContent = `
      <svg viewBox="0 0 200 100" xmlns="http://www.w3.org/2000/svg">
        <rect width="200" height="100" fill="#999999"/>
        <circle cx="50" cy="50" r="30" fill="#00FF00"/>
        <text x="90" y="55" font-family="Comic Sans MS">Custom Motif</text>
      </svg>
    `;
    const remediatedReport = await brandGuidelinesEngine.evaluateBrandConsistency({
      workspaceId: ws,
      assetType: 'COLLATERAL',
      assetContent: unapprovedContent,
      autoRemediate: true,
    });
    assert.ok(remediatedReport.remediatedContent, 'Must produce autoRemediated content');
    // #00FF00 (unapproved lime) should be replaced with approved accent or primary
    assert.ok(!remediatedReport.remediatedContent.includes('#00FF00'), 'Unapproved lime hex must be remediated');
    assert.ok(
      remediatedReport.remediatedContent.includes('#FF7417') ||
      remediatedReport.remediatedContent.includes('#171717'),
      'Must replace with approved brand token'
    );
    // Comic Sans MS should be replaced with Plus Jakarta Sans
    assert.ok(!remediatedReport.remediatedContent.includes('Comic Sans MS'));
    assert.ok(remediatedReport.remediatedContent.includes('Plus Jakarta Sans'));
  });

  // ===========================================================================
  // 6. GUIDELINE IMPACT ANALYSIS ON ASSET REPOSITORY
  // ===========================================================================
  it('6. Conducts accurate impact analysis without mutating historical library assets', async () => {
    const ws = `ws_guide_impact_${Date.now()}`;

    await brandGuidelinesEngine.generateCompleteBrandBook({
      workspaceId: ws,
      createdBy: testUserId,
    });

    // Seed mock library assets in Firestore
    await db.collection(`workspaces/${ws}/brandAssets`).doc('asset_1').set({
      assetId: 'asset_1',
      workspaceId: ws,
      title: 'Legacy Business Card',
      category: 'stationery',
      status: 'active',
      metadata: { colorHexes: ['#171717', '#FF7417'], fonts: ['Plus Jakarta Sans'] },
      version: 1,
      createdAt: new Date().toISOString(),
    });

    await db.collection(`workspaces/${ws}/brandAssets`).doc('asset_2').set({
      assetId: 'asset_2',
      workspaceId: ws,
      title: 'Old Promotional Poster',
      category: 'collateral',
      status: 'active',
      metadata: { colorHexes: ['#FF7417', '#E6E6E2'], fonts: ['Plus Jakarta Sans'] },
      version: 1,
      createdAt: new Date().toISOString(),
    });

    // Analyze impact if accent color changes to #E05A00
    const impact = await brandGuidelinesEngine.analyzeGuidelineImpact({
      workspaceId: ws,
      proposedChanges: {
        accentHex: '#E05A00',
      },
    });

    assert.equal(impact.workspaceId, ws);
    assert.equal(impact.affectedAssetsCount, 2);
    assert.ok(impact.affectedAssetIds.includes('asset_1'));
    assert.ok(impact.affectedAssetIds.includes('asset_2'));
    assert.ok(impact.remediationAdvice.includes('2 downstream assets'));

    // Assert that asset_1 and asset_2 were NOT silently modified
    const a1Doc = await db.collection(`workspaces/${ws}/brandAssets`).doc('asset_1').get();
    assert.equal(a1Doc.data()?.version, 1);
    assert.deepEqual(a1Doc.data()?.metadata?.colorHexes, ['#171717', '#FF7417']);
  });

  // ===========================================================================
  // 7. BRAND BOOK PARAMETER UPDATES & VERSION MANAGEMENT
  // ===========================================================================
  it('7. Updates parameters, increments version, and updates living tokens', async () => {
    const ws = `ws_guide_update_${Date.now()}`;

    const bookV1 = await brandGuidelinesEngine.generateCompleteBrandBook({
      workspaceId: ws,
      createdBy: testUserId,
    });
    assert.equal(bookV1.version, 1);

    // Update accent color and positioning
    const bookV2 = await brandGuidelinesEngine.updateBrandBookParameters({
      workspaceId: ws,
      updatedBy: testUserId,
      updates: {
        foundations: {
          ...bookV1.foundations,
          positioning: 'Ultra-Luxury Bespoke Architectural Stoneware',
        },
        colorSystem: {
          ...bookV1.colorSystem,
          accentPalette: {
            ...bookV1.colorSystem.accentPalette,
            accentHex: '#D95D00',
          },
        },
      },
    });

    assert.equal(bookV2.version, 2);
    assert.equal(bookV2.foundations.positioning, 'Ultra-Luxury Bespoke Architectural Stoneware');
    assert.equal(bookV2.colorSystem.accentPalette.accentHex, '#D95D00');

    // Verify token was updated in repository
    const token = await brandStudioRepository.getLivingToken(ws, 'color.brand.accent');
    assert.ok(token);
    assert.equal(token.value, '#D95D00');
    assert.equal(token.version, 2);
    assert.ok(token.modificationHistory.length >= 2);

    // Verify latest book from repository is V2
    const fetchedLatest = await brandStudioRepository.getLatestBrandBook(ws);
    assert.ok(fetchedLatest);
    assert.equal(fetchedLatest.version, 2);
  });

  // ===========================================================================
  // 8. W3C DESIGN TOKENS JSON EXPORT FORMAT
  // ===========================================================================
  it('8. Exports valid W3C Design Tokens Community Group specification JSON', async () => {
    const ws = `ws_guide_w3c_${Date.now()}`;

    await brandGuidelinesEngine.generateCompleteBrandBook({
      workspaceId: ws,
      createdBy: testUserId,
    });

    const w3cTokens = await brandGuidelinesEngine.exportDesignTokensJson({ workspaceId: ws });

    assert.equal(w3cTokens.$schema, 'https://design-tokens.github.io/community-group/format/');
    assert.ok(w3cTokens.color);
    assert.ok(w3cTokens.color.brand);
    assert.ok(w3cTokens.color.brand.primary.$value);
    assert.equal(w3cTokens.color.brand.primary.$type, 'color');
    assert.ok(w3cTokens.spacing);
    assert.equal(w3cTokens.spacing.modular.base.$type, 'dimension');
    assert.equal(w3cTokens.spacing.modular.base.$value, '16px');
    assert.ok(w3cTokens.typography);
    assert.equal(w3cTokens.typography.family.primary.$type, 'fontFamily');
  });

  // ===========================================================================
  // 9. PRINTABLE A4 PDF DOCUMENT MARKUP EXPORT
  // ===========================================================================
  it('9. Generates high-DPI printable A4 PDF document markup with strict page budgeting', async () => {
    const ws = `ws_guide_pdf_${Date.now()}`;

    await brandGuidelinesEngine.generateCompleteBrandBook({
      workspaceId: ws,
      createdBy: testUserId,
    });

    const exportResult = await brandGuidelinesEngine.exportBrandBookPdfMarkup({ workspaceId: ws });

    assert.ok(exportResult.htmlPdfMarkup);
    assert.equal(exportResult.pageCount, 3);
    assert.ok(exportResult.htmlPdfMarkup.includes('@page { size: A4 portrait; margin: 0; }'));
    assert.ok(exportResult.htmlPdfMarkup.includes('width: 1240px;'));
    assert.ok(exportResult.htmlPdfMarkup.includes('min-height: 1754px;'));
    assert.ok(exportResult.htmlPdfMarkup.includes('01 / TYPOGRAPHIC HIERARCHY'));
    assert.ok(exportResult.htmlPdfMarkup.includes('02 / CHROMATIC DESIGN TOKENS'));
    assert.ok(exportResult.htmlPdfMarkup.includes('ISO 300 DPI PRINT STANDARD'));
  });

  // ===========================================================================
  // 10. MULTI-TENANT WORKSPACE ISOLATION
  // ===========================================================================
  it('10. Strictly isolates tokens, rules, and brand books between workspaces', async () => {
    const wsA = `ws_tenant_a_${Date.now()}`;
    const wsB = `ws_tenant_b_${Date.now()}`;

    // Tenant A: Coffee brand
    await brandGuidelinesEngine.generateCompleteBrandBook({
      workspaceId: wsA,
      createdBy: testUserId,
      overrides: {
        foundations: {
          brandName: 'Tenant A Coffee',
          purpose: 'Fair trade coffee',
          mission: 'Serve fine coffee',
          vision: 'Global roasters',
          values: ['Purity'],
          promise: 'Fresh beans',
          positioning: 'Premium Roast',
          personality: ['Bold'],
          brandStory: 'Started in Coorg',
          philosophy: 'Artisanal roasts',
          audiencePersonas: ['Baristas'],
        },
      },
    });

    // Tenant B: Tech brand
    await brandGuidelinesEngine.generateCompleteBrandBook({
      workspaceId: wsB,
      createdBy: testUserId,
      overrides: {
        foundations: {
          brandName: 'Tenant B Cloud',
          purpose: 'Fast servers',
          mission: 'Zero latency',
          vision: 'Decentralized cloud',
          values: ['Speed'],
          promise: '99.999% uptime',
          positioning: 'Ultra Edge Cloud',
          personality: ['Precise'],
          brandStory: 'Built in Bengaluru',
          philosophy: 'High throughput',
          audiencePersonas: ['Engineers'],
        },
      },
    });

    const bookA = await brandStudioRepository.getLatestBrandBook(wsA);
    const bookB = await brandStudioRepository.getLatestBrandBook(wsB);

    assert.equal(bookA?.foundations.brandName, 'Tenant A Coffee');
    assert.equal(bookB?.foundations.brandName, 'Tenant B Cloud');

    // Cross-tenant verification: workspace A cannot retrieve B's tokens
    const tokensA = await brandStudioRepository.listLivingTokens(wsA);
    const tokensB = await brandStudioRepository.listLivingTokens(wsB);

    for (const t of tokensA) {
      assert.equal(t.workspaceId, wsA);
    }
    for (const t of tokensB) {
      assert.equal(t.workspaceId, wsB);
    }
  });

  // ===========================================================================
  // 11. CROSS-STUDIO END-TO-END ENFORCEMENT & REMEDIATION
  // ===========================================================================
  it('11. Enforces active guidelines during collateral and social creative generation', async () => {
    const ws = `ws_cross_studio_${Date.now()}`;

    // Create custom V1 guideline with specific accent
    await brandGuidelinesEngine.generateCompleteBrandBook({
      workspaceId: ws,
      createdBy: testUserId,
      overrides: {
        foundations: {
          brandName: 'Hyperion Analytics',
          purpose: 'Data accuracy',
          mission: 'Eliminate forecasting errors',
          vision: 'Deterministic commerce',
          values: ['Integrity', 'Precision', 'Velocity'],
          promise: 'Zero hallucinated metrics',
          positioning: 'Forecasting for CFOs',
          personality: ['Authoritative', 'Meticulous'],
          brandStory: 'Founded by quantitative risk analysts',
          philosophy: 'Evidence over conjecture',
          audiencePersonas: ['Chief Financial Officers'],
        },
        colorSystem: {
          primaryPalette: {
            primaryHex: '#121212',
            cmyk: 'C:0% M:0% Y:0% K:93%',
            pantone: 'Pantone Neutral Black C',
          },
          accentPalette: {
            accentHex: '#E65100', // Deep Amber
            cmyk: 'C:0% M:65% Y:100% K:10%',
            pantone: 'Pantone 151 C',
          },
          secondaryPalette: [],
          neutralPalette: [],
          usageRatios: {
            dominantPrimary: '60%',
            secondaryNegative: '30%',
            accentFocal: '10%',
          },
          contrastMatrix: [],
        },
      },
    });

    // 1. Generate Collateral Variations through BrandStudioService
    const collateralResult = await brandStudioService.generateCollateralVariations({
      workspaceId: ws,
      userId: testUserId,
      category: 'Brochure',
      prompt: 'Quarterly financial transparency disclosure',
    });

    assert.equal(collateralResult.variations.length, 3);
    for (const v of collateralResult.variations) {
      assert.equal(v.guidelineVersion, 1);
      assert.ok(v.consistencyReport, 'Must have consistencyReport attached');
      assert.equal(v.consistencyReport.overallVerdict, 'PASS');
      assert.ok(v.svgMotif.includes('Hyperion'), 'Must feature brand name in SVG');
    }

    // 2. Generate Social Package through BrandStudioService
    const socialResult = await brandStudioService.generateSocialCreative({
      workspaceId: ws,
      userId: testUserId,
      platform: 'LinkedIn',
      angle: 'Contrarian CFO Unit Economics',
      prompt: 'Why traditional SaaS forecasts fail',
      slideCount: 3,
    });

    assert.equal(socialResult.package.slides.length, 3);
    assert.equal(socialResult.package.guidelineVersion, 1);
    assert.ok(socialResult.package.consistencyReport);
    assert.equal(socialResult.package.consistencyReport.overallVerdict, 'PASS');
  });
});
