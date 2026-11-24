/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { printPrepressEngine, COLOR_PROFILE_TAC_LIMITS } from './services/printPrepressEngine';
import { vectorGlyphEngine } from './services/vectorGlyphEngine';
import { trademarkClearanceService } from './services/trademarkClearanceService';
import { creativeAssetsEngine } from './services/creativeAssetsEngine';
import { brandStudioRepository } from './repositories/brandStudioRepository';
import { creditService } from './services/creditService';

describe('BRAINWISE PREPRESS, PRINT BLEED, COLOR PROFILES, FONT OUTLINING & TRADEMARK CLEARANCE SUITE', () => {
  const testUserId = `user_prepress_${Date.now()}`;

  // ===========================================================================
  // 1. SUBSTRATE-SPECIFIC PHYSICAL PRINT BLEED & SAFE MARGIN TOLERANCES
  // ===========================================================================
  it('1. Enforces standard physical print bleed tolerances (3mm folding carton vs 5mm corrugated heavy board)', () => {
    // Folding Carton Default
    const cartonSpec = printPrepressEngine.getDefaultBleedSpec('FOLDING_CARTON');
    assert.strictEqual(cartonSpec.bleedMm, 3.0, 'Folding carton bleed must default to 3.0 mm');
    assert.strictEqual(cartonSpec.safeMarginMm, 5.0, 'Folding carton safe margin must default to 5.0 mm');
    assert.strictEqual(cartonSpec.includeCropMarks, true);

    // Corrugated Heavy Board
    const corrugatedSpec = printPrepressEngine.getDefaultBleedSpec('CORRUGATED_HEAVY_BOARD');
    assert.strictEqual(corrugatedSpec.bleedMm, 5.0, 'Corrugated heavy board bleed must be 5.0 mm to accommodate fluting');
    assert.strictEqual(corrugatedSpec.safeMarginMm, 8.0, 'Corrugated heavy board safe margin must be 8.0 mm');

    // Commercial Stationery
    const stationerySpec = printPrepressEngine.getDefaultBleedSpec('COMMERCIAL_STATIONERY');
    assert.strictEqual(stationerySpec.bleedMm, 3.0, 'Commercial stationery bleed must be 3.0 mm');
    assert.strictEqual(stationerySpec.safeMarginMm, 5.0, 'Commercial stationery safe margin must be 5.0 mm');

    // Label Sticker
    const labelSpec = printPrepressEngine.getDefaultBleedSpec('LABEL_STICKER');
    assert.strictEqual(labelSpec.bleedMm, 2.0, 'Label sticker bleed must be 2.0 mm');
    assert.strictEqual(labelSpec.safeMarginMm, 3.0, 'Label sticker safe margin must be 3.0 mm');
  });

  // ===========================================================================
  // 2. CMYK COLOR PROFILES & TOTAL AREA COVERAGE (TAC) CLAMPING
  // ===========================================================================
  it('2. Converts RGB to CMYK with profile-specific Total Area Coverage (TAC) ink limits (Fogra39 vs Fogra47 vs GRACoL)', () => {
    // Test Fogra39 (ISO Coated v2 - India/EU default)
    const fogra39 = printPrepressEngine.convertHexToCmyk('#171717', 'FOGRA39');
    assert.ok(fogra39.profileName.includes('Fogra39'), 'Expected Fogra39 profile name');
    assert.ok(fogra39.totalAreaCoverage <= 300, `Fogra39 TAC (${fogra39.totalAreaCoverage}%) must not exceed 300% ceiling`);
    assert.ok(fogra39.k > 80, 'Deep obsidian hex #171717 should yield high black (K) separation');

    // Test Fogra47 (Uncoated / Kraft paper)
    const fogra47 = printPrepressEngine.convertHexToCmyk('#000000', 'FOGRA47');
    assert.ok(fogra47.profileName.includes('Fogra47'), 'Expected Fogra47 profile name');
    assert.ok(fogra47.totalAreaCoverage <= 260, `Fogra47 TAC (${fogra47.totalAreaCoverage}%) must not exceed 260% ceiling to prevent ink bleeding`);

    // Test GRACoL 2013 (North American Commercial)
    const gracol = printPrepressEngine.convertHexToCmyk('#FF7417', 'GRACOL_2013');
    assert.ok(gracol.profileName.includes('GRACoL'), 'Expected GRACoL profile name');
    assert.strictEqual(gracol.c, 0, 'Pure orange should have 0% cyan');
    assert.ok(gracol.m >= 50 && gracol.m <= 60, 'Orange should have ~55% magenta');
    assert.ok(gracol.y > 85, 'Orange should have ~91% yellow');
  });

  // ===========================================================================
  // 3. PREPRESS MARKS WRAPPING (CROP LINES, REGISTRATION, COLOR BARS)
  // ===========================================================================
  it('3. Wraps SVG artwork with print prepress marks (crop lines, bleed guides, registration targets, CMYK swatches)', () => {
    const rawSvg = `<svg width="400" height="600" viewBox="0 0 400 600"><rect width="400" height="600" fill="#171717"/></svg>`;

    const prepressSvg = printPrepressEngine.wrapSvgWithPrepressMarks(
      rawSvg,
      {
        colorProfile: 'FOGRA39',
        bleedSpec: { bleedMm: 3, safeMarginMm: 5, trimWidthMm: 80, trimHeightMm: 160 },
      },
      { brandName: 'Aura Roast Specialty Coffee', jobTitle: 'Retail Folding Carton' }
    );

    assert.ok(prepressSvg.includes('<svg'), 'Prepress output must be valid SVG');
    assert.ok(prepressSvg.includes('class="crop-mark"'), 'Must include crop marks');
    assert.ok(prepressSvg.includes('class="reg-mark"'), 'Must include registration crosshairs');
    assert.ok(prepressSvg.includes('class="bleed-box"'), 'Must include bleed boundary box');
    assert.ok(prepressSvg.includes('class="safe-box"'), 'Must include safe area boundary box');
    assert.ok(prepressSvg.includes('id="cmyk_color_bars"'), 'Must include CMYK calibration control bars');
    assert.ok(prepressSvg.includes('Fogra39'), 'Metadata must indicate Fogra39 profile');
    assert.ok(prepressSvg.includes('AURA ROAST'), 'Metadata legend must include brand name');
  });

  // ===========================================================================
  // 4. FONT OUTLINING FOR VECTOR EXPORTS (ZERO FONT DEPENDENCY IN PRINT)
  // ===========================================================================
  it('4. Converts all <text> elements to closed mathematical <path> curves, eliminating missing font errors in prepress', () => {
    const inputSvg = `<svg width="800" height="400" viewBox="0 0 800 400">
  <rect width="800" height="400" fill="#FFFFFF"/>
  <text x="400" y="200" font-family="Plus Jakarta Sans" font-size="48" fill="#171717" text-anchor="middle">AURA ROAST</text>
  <text x="400" y="280" font-family="Inter" font-size="20" fill="#FF7417" text-anchor="middle">SINGLE ESTATE COFFEE</text>
</svg>`;

    // Test Outlined Paths Mode
    const outlined = vectorGlyphEngine.convertTextToOutlinesSvg(inputSvg, 'OUTLINED_PATHS');

    assert.strictEqual(outlined.originalTextNodesCount, 2, 'Must detect exactly 2 <text> nodes');
    assert.ok(outlined.convertedPathsCount > 10, 'Must convert text characters to vector glyph paths');
    assert.strictEqual(outlined.fontMode, 'OUTLINED_PATHS');
    assert.ok(!outlined.outlinedSvg.includes('<text'), 'Outlined SVG must have ZERO <text> elements remaining');
    assert.ok(outlined.outlinedSvg.includes('<path d="M'), 'Outlined SVG must contain vector path definitions');

    // Test Embedded Text Mode (Designer Editable Mode)
    const embedded = vectorGlyphEngine.convertTextToOutlinesSvg(inputSvg, 'EMBEDDED_TEXT');
    assert.strictEqual(embedded.fontMode, 'EMBEDDED_TEXT');
    assert.ok(embedded.outlinedSvg.includes('<text'), 'Embedded mode must retain <text> nodes for editing in Figma/Illustrator');
    assert.ok(embedded.outlinedSvg.includes('@import url'), 'Embedded mode must inject web font CSS declarations');
  });

  // ===========================================================================
  // 5. 8× ULTRA-HD PNG (4096PX) & 300 DPI CMYK TIFF EXPORT BUFFERS
  // ===========================================================================
  it('5. Generates 8× Ultra-HD (4096px) raster PNG and verified 300 DPI CMYK TIFF prepress buffers', () => {
    // 8x Ultra-HD PNG
    const png8x = printPrepressEngine.generate8xUltraHdPngBuffer(4096, 4096);
    assert.ok(png8x.length > 50000, '4096px PNG buffer must have substantive size');

    // Verify PNG Header & IHDR
    assert.strictEqual(png8x[0], 0x89);
    assert.strictEqual(png8x[1], 0x50);
    assert.strictEqual(png8x[2], 0x4e);
    assert.strictEqual(png8x[3], 0x47);
    assert.strictEqual(png8x.readUInt32BE(16), 4096, 'PNG width must be 4096px');
    assert.strictEqual(png8x.readUInt32BE(20), 4096, 'PNG height must be 4096px');
    assert.strictEqual(png8x[25], 6, 'PNG color type must be 6 (RGBA with alpha channel)');

    // 300 DPI CMYK TIFF
    const tiffBuf = printPrepressEngine.generate300DpiCmykTiffBuffer(300, 300, [0, 68, 91, 0]);
    assert.ok(tiffBuf.length > 500, 'TIFF buffer must have valid byte length');

    // Verify TIFF Header (Little Endian 'II' + 42)
    assert.strictEqual(tiffBuf.toString('ascii', 0, 2), 'II', 'TIFF magic bytes must be II');
    assert.strictEqual(tiffBuf.readUInt16LE(2), 42, 'TIFF version must be 42');
  });

  // ===========================================================================
  // 6. CREATIVE EXPORT PACKAGE INTEGRATION (8× PNG, TIFF, OUTLINING, MARKS)
  // ===========================================================================
  it('6. Integrates 8× resolution tier, CMYK TIFF, font outlining, and prepress marks into exportCreativePackage', async () => {
    const ws = `ws_export_prepress_${Date.now()}`;

    // Seed mock packaging artwork
    const pkg = await brandStudioRepository.savePackagingArtwork({
      packagingId: `pkg_${Date.now()}`,
      workspaceId: ws,
      productCategory: 'Coffee & Beverages',
      packagingType: 'Stand-Up Coffee Pouch',
      dielineType: 'Tuck-End',
      dimensionsMm: { width: 80, height: 160, depth: 50 },
      bleedMm: 3,
      safeAreaMarginMm: 5,
      resolutionDpi: 300,
      frontPanelSvg: '<svg width="200" height="400"><text x="100" y="200">COFFEE FRONT</text></svg>',
      backPanelSvg: '<svg width="200" height="400"><text x="100" y="200">COFFEE BACK</text></svg>',
      completeDielineSvg: `<svg width="600" height="400" viewBox="0 0 600 400"><rect width="600" height="400" fill="#171717"/><text x="300" y="200" font-size="32" fill="#FFFFFF">KAVERI RESERVE</text></svg>`,
      materialsRecommended: ['Kraft Paper with Foil Barrier'],
      finishingOptions: ['Matte Soft-Touch'],
      regulatoryLabels: {
        foodSafetyFssaiFda: true,
        allergenWarningRequired: false,
        netQuantityStatement: '250g',
        batchAndExpiryCoordinates: 'Bottom Flap',
        barcodePlacement: { type: 'EAN-13', coordinates: 'Back lower-right', clearSpaceMm: 5 },
        statutoryDisclaimer: 'FSSAI Lic No: 10019043002819',
      },
      productionReadiness: 'PRODUCTION_READY',
      guidelineVersion: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Test Outlined Prepress Export
    const outlinedPkg = await creativeAssetsEngine.exportCreativePackage({
      workspaceId: ws,
      assetType: 'packaging',
      assetId: pkg.packagingId,
      format: 'svg',
      fontMode: 'OUTLINED_PATHS',
      includePrepressMarks: true,
      colorProfile: 'FOGRA39',
      bleedMm: 3.0,
      safeMarginMm: 5.0,
    });

    assert.strictEqual(outlinedPkg.metadata.fontMode, 'OUTLINED_PATHS');
    assert.strictEqual(outlinedPkg.metadata.colorProfile, 'FOGRA39');
    assert.strictEqual(outlinedPkg.metadata.includePrepressMarks, true);
    assert.strictEqual(outlinedPkg.metadata.originalTextNodesCount, 1);

    // Test TIFF Prepress Export
    const tiffPkg = await creativeAssetsEngine.exportCreativePackage({
      workspaceId: ws,
      assetType: 'packaging',
      assetId: pkg.packagingId,
      format: 'tiff',
      resolutionTier: 'PRINT_300DPI',
    });

    assert.strictEqual(tiffPkg.mimeType, 'image/tiff');
    assert.strictEqual(tiffPkg.metadata.format, 'tiff');

    // Test 8x Ultra-HD Export
    const uhdPkg = await creativeAssetsEngine.exportCreativePackage({
      workspaceId: ws,
      assetType: 'packaging',
      assetId: pkg.packagingId,
      format: 'png',
      resolutionTier: '8x',
    });

    assert.strictEqual(uhdPkg.mimeType, 'image/png');
    assert.strictEqual(uhdPkg.metadata.resolutionTier, '8x');
  });

  // ===========================================================================
  // 7. PRELIMINARY TRADEMARK CLEARANCE: IDENTICAL CONFLICT DETECTION
  // ===========================================================================
  it('7. Detects high-risk identical collision against registered trademark records in target NICE class', async () => {
    const ws = `ws_tm_conflict_${Date.now()}`;

    // Test search against registered Indian mark "BLUE TOKAI" in Class 30/43
    const result = await trademarkClearanceService.performPreliminaryClearance({
      workspaceId: ws,
      userId: testUserId,
      wordmark: 'BLUE TOKAI',
      industryCategory: 'Coffee & Beverages',
      targetJurisdiction: 'INDIA_IP_INDIA',
    });

    const report = result.report;
    assert.strictEqual(report.queryWordmark, 'BLUE TOKAI');
    assert.strictEqual(report.riskLevel, 'HIGH_RISK');
    assert.strictEqual(report.exactMatchFound, true);
    assert.strictEqual(report.overallRiskScore, 100);
    assert.ok(report.conflictingMatches.length > 0);
    assert.strictEqual(report.conflictingMatches[0].markName, 'BLUE TOKAI');
    assert.strictEqual(report.conflictingMatches[0].jurisdiction, 'INDIA_IP_INDIA');
    assert.ok(report.clearanceRecommendation.includes('CRITICAL COLLISION'));
    assert.ok(report.clearanceRecommendation.includes('Section 11'));
    assert.ok(report.statutoryDisclaimer.includes('STATUTORY DISCLAIMER'));
  });

  // ===========================================================================
  // 8. PRELIMINARY TRADEMARK CLEARANCE: PHONETIC METAPHONE COLLISION
  // ===========================================================================
  it('8. Detects phonetic metaphone similarity for alternate spellings and phonetic twins', async () => {
    const ws = `ws_tm_phonetic_${Date.now()}`;

    // Phonetic spelling variation of "SLEEPY OWL" -> "SLEEPY OUL"
    const result = await trademarkClearanceService.performPreliminaryClearance({
      workspaceId: ws,
      userId: testUserId,
      wordmark: 'SLEEPY OUL',
      industryCategory: 'Coffee & Beverages',
      targetJurisdiction: 'INDIA_IP_INDIA',
    });

    const report = result.report;
    assert.ok(report.phoneticCollisionsCount > 0, 'Must detect phonetic collision with Sleepy Owl');
    assert.ok(['HIGH_RISK', 'MODERATE_RISK'].includes(report.riskLevel));
    assert.ok(report.conflictingMatches.some((m) => m.markName === 'SLEEPY OWL'));
  });

  // ===========================================================================
  // 9. PRELIMINARY TRADEMARK CLEARANCE: CLEAN DISTINCTIVE MARK
  // ===========================================================================
  it('9. Identifies clean distinctive brand name with zero direct collisions as favorable low risk', async () => {
    const ws = `ws_tm_clean_${Date.now()}`;

    const result = await trademarkClearanceService.performPreliminaryClearance({
      workspaceId: ws,
      userId: testUserId,
      wordmark: 'KAVERI ALTITUDE ROAST',
      industryCategory: 'Coffee & Beverages',
      targetJurisdiction: 'ALL',
    });

    const report = result.report;
    assert.strictEqual(report.riskLevel, 'LOW_RISK');
    assert.strictEqual(report.exactMatchFound, false);
    assert.ok(report.overallRiskScore < 45);
    assert.ok(report.clearanceRecommendation.includes('FAVORABLE CLEARANCE'));
    assert.ok(report.statutoryDisclaimer.includes('STATUTORY DISCLAIMER'));
  });

  // ===========================================================================
  // 10. TRADEMARK CLEARANCE TWO-PHASE CREDIT ACCOUNTING (2 CREDITS)
  // ===========================================================================
  it('10. Enforces Two-Phase Credit Reservation: 2 credits settled on completion and refunded on error', async () => {
    const ws = `ws_tm_credits_${Date.now()}`;

    const initialWallet = await creditService.getWallet(ws);
    const startCredits = initialWallet.balance;

    const scan = await trademarkClearanceService.performPreliminaryClearance({
      workspaceId: ws,
      userId: testUserId,
      wordmark: 'NEURAFLOW AI',
      industryCategory: 'Technology & SaaS',
    });

    assert.strictEqual(scan.creditsDeducted, 2, 'Trademark clearance must cost exactly 2 credits');
    const postWallet = await creditService.getWallet(ws);
    assert.strictEqual(postWallet.balance, startCredits - 2, 'Wallet balance must decrement by 2 credits');

    // Test failure rollback
    const failurePromise = trademarkClearanceService.performPreliminaryClearance({
      workspaceId: ws,
      userId: testUserId,
      wordmark: '', // triggers invalid input error
    });

    await assert.rejects(failurePromise, (err: any) => {
      assert.ok(err.message.includes('INVALID_INPUT'));
      return true;
    });

    const failedWallet = await creditService.getWallet(ws);
    assert.strictEqual(failedWallet.balance, postWallet.balance, 'Failed scan must trigger full credit rollback');
  });
});
