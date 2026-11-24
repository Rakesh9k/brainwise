/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { brandGuardianService } from './services/brandGuardianService';
import { brandAssetRepository } from './repositories/brandAssetRepository';
import { businessProfileRepository } from './repositories/businessProfileRepository';

describe('BRAINWISE AUTHORITATIVE BRAND IDENTITY SYSTEM — PHASE 3 ACCEPTANCE TEST SUITE', () => {
  const wsId = `ws_identity_${Date.now()}`;
  const userId = `user_identity_${Date.now()}`;

  // ===========================================================================
  // 1. AUTHORITATIVE BRAND IDENTITY BOOTSTRAP & 10 LOGO VARIANTS
  // ===========================================================================
  it('1. Bootstraps authoritative brand identity with all 10 standard logo variants, aspect ratios, and clear space rules', async () => {
    // Seed Business Brain profile
    await businessProfileRepository.saveProfile({
      workspaceId: wsId,
      businessName: 'Solstice Botanicals',
      tagline: 'High-Altitude Organic Flora',
      stage: 'Growth',
      location: 'Shimla, India',
      website: 'https://solsticebotanicals.com',
      foundedYear: '2024',
      overviewSummary: 'Artisanal cold-extracted botanicals and clean skincare.',
      targetAudience: 'Conscious luxury consumers seeking clean verified botanicals.',
      brandPositioning: 'Purity guaranteed through cold-extraction.',
      valueProposition: 'Single-estate botanical potency.',
      businessModel: 'D2C',
      revenueModel: 'Omnichannel retail',
      primaryGoals: ['Expand national retail presence'],
      provenance: {
        businessName: { source: 'USER_CONFIRMED', verifiedAt: new Date().toISOString() },
      },
      strategicMemory: { usedAngles: [], fatiguedThemes: [], explicitExclusions: [], lastUpdated: new Date().toISOString() },
      approvalStatus: 'APPROVED',
      lastUpdated: new Date().toISOString(),
      version: 1,
    });

    const identity = await brandGuardianService.bootstrapDefaultIdentity(wsId);

    assert.ok(identity, 'Authoritative identity must be bootstrapped');
    assert.equal(identity.brandName, 'Solstice Botanicals');
    assert.equal(identity.version, 1);
    assert.equal(identity.status, 'active');
    assert.ok(identity.effectiveFrom);

    // Verify all 10 standard logo variants exist
    const expectedVariants = [
      'primary',
      'secondary',
      'horizontal',
      'vertical',
      'iconOnly',
      'monochrome',
      'white',
      'dark',
      'favicon',
      'appIcon',
    ];

    for (const v of expectedVariants) {
      const variant = (identity.logos as any)[v];
      assert.ok(variant, `Variant '${v}' must be defined`);
      assert.ok(variant.svgMarkup.includes('<svg'), `Variant '${v}' must have valid SVG markup`);
      assert.ok(variant.aspectRatio > 0, `Variant '${v}' must have positive aspect ratio`);
      assert.ok(variant.dimensions.width > 0, `Variant '${v}' must specify width`);
      assert.ok(variant.clearSpaceMultiplier > 0, `Variant '${v}' must specify clear space rule`);
      assert.ok(variant.minWidthPx > 0, `Variant '${v}' must specify minimum digital width`);
      assert.ok(variant.minWidthPrintMm > 0, `Variant '${v}' must specify minimum print size in mm`);
      assert.equal(variant.isApproved, true);
    }
  });

  // ===========================================================================
  // 2. STRUCTURED BRAND DESIGN TOKENS (60-30-10 & TYPOGRAPHY HIERARCHY)
  // ===========================================================================
  it('2. Maintains structured, machine-readable brand tokens and design system tokens', async () => {
    const identity = await brandGuardianService.getAuthoritativeIdentity(wsId);
    assert.ok(identity.tokens, 'Tokens must be present');

    // Color tokens
    const { colors } = identity.tokens;
    assert.ok(colors.primary.hex);
    assert.ok(colors.primary.cmyk.includes('C:'));
    assert.equal(colors.primary.roleRatioPct, 60, 'Primary color role ratio must be 60%');
    assert.equal(colors.secondary.roleRatioPct, 30, 'Secondary color role ratio must be 30%');
    assert.equal(colors.accent.roleRatioPct, 10, 'Accent color role ratio must be 10%');

    // Typography tokens
    const { typography } = identity.tokens;
    assert.ok(typography.display.sizePx >= 40);
    assert.ok(typography.heading.family);
    assert.ok(typography.body.family);

    // Exportable JSON tokens
    const tokensJson = await brandGuardianService.exportDesignTokensJson(wsId);
    const parsed = JSON.parse(tokensJson);
    assert.equal(parsed.name, 'Solstice Botanicals');
    assert.ok(parsed.color.primary.$value);
  });

  // ===========================================================================
  // 3. BUSINESS BRAIN CONNECTION & PROVENANCE INTEGRITY
  // ===========================================================================
  it('3. Connects with Business Brain without creating competing sources of truth', async () => {
    // Update profile in Business Brain
    await businessProfileRepository.saveProfile({
      workspaceId: wsId,
      businessName: 'Solstice Botanicals Pure',
      tagline: 'High-Altitude Active Botanicals',
      stage: 'Scaling',
      location: 'Shimla, India',
      website: 'https://solsticebotanicals.com',
      foundedYear: '2024',
      overviewSummary: 'Pure cold-extracted botanical formulations.',
      targetAudience: 'Conscious consumers',
      brandPositioning: 'Pure potency',
      valueProposition: 'Potent botanicals',
      businessModel: 'D2C',
      revenueModel: 'Direct sales',
      primaryGoals: ['Expand sales'],
      provenance: {},
      strategicMemory: { usedAngles: [], fatiguedThemes: [], explicitExclusions: [], lastUpdated: new Date().toISOString() },
      approvalStatus: 'APPROVED',
      lastUpdated: new Date().toISOString(),
      version: 2,
    });

    const synced = await brandGuardianService.syncWithBusinessBrain(wsId);
    assert.equal(synced.brandName, 'Solstice Botanicals Pure');
    assert.equal(synced.tagline, 'High-Altitude Active Botanicals');
    assert.equal(synced.businessBrainSync.isAuthoritative, true);
    assert.equal(synced.version, 2, 'Version must increment on authoritative sync');
  });

  // ===========================================================================
  // 4. BRAND GUARDIAN AI: COMPLIANCE CHECKER & REMEDIATION
  // ===========================================================================
  it('4. Executes deterministic Brand Guardian compliance checks, off-brand detection, and auto-remediation', async () => {
    const identity = await brandGuardianService.getAuthoritativeIdentity(wsId);
    const primaryHex = identity.tokens.colors.primary.hex;
    const accentHex = identity.tokens.colors.accent.hex;

    // Test A: 100% Compliant Asset
    const compliantSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 200">
      <rect width="600" height="200" fill="#FAFAF9"/>
      <text x="30" y="50" font-family="Plus Jakarta Sans" fill="${primaryHex}">Pure Himalayan Cold-Pressed Serum</text>
      <circle cx="50" cy="120" r="20" fill="${accentHex}"/>
    </svg>`;

    const compliantReport = await brandGuardianService.evaluateAssetCompliance({
      workspaceId: wsId,
      assetTitle: 'Compliant Banner',
      svgMarkup: compliantSvg,
      headlineText: 'Pure Himalayan Cold-Pressed Serum',
      subtext: 'Crafted with verified cold-pressed botanicals.',
    });

    assert.ok(compliantReport.overallScore >= 90, 'Compliant asset must score >= 90');
    assert.equal(compliantReport.status, 'compliant');
    assert.equal(compliantReport.detectedOffBrandColors.length, 0);
    assert.ok(compliantReport.disclaimer.includes('AI-assisted brand compliance evaluation advisory'));

    // Test B: Asset with Off-Brand Unauthorized Color (#00FFFF Cyan) and Prohibited Claim
    const offBrandSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 200">
      <rect width="600" height="200" fill="#00FFFF"/>
      <text x="30" y="50" font-family="Comic Sans MS" fill="#00FFFF">Instant Riches Miracle Cure</text>
    </svg>`;

    const violationReport = await brandGuardianService.evaluateAssetCompliance({
      workspaceId: wsId,
      assetTitle: 'Violating Flyer',
      svgMarkup: offBrandSvg,
      headlineText: 'Instant Riches Miracle Cure',
      subtext: 'World’s only guaranteed instant riches solution.',
      autoRemediate: true,
    });

    assert.ok(violationReport.overallScore < 70, 'Violating asset must score < 70');
    assert.notEqual(violationReport.status, 'compliant');
    assert.ok(violationReport.detectedOffBrandColors.length > 0, 'Off-brand color must be flagged');
    assert.ok(violationReport.detectedOffBrandFonts.length > 0, 'Unapproved font must be flagged');
    assert.ok(violationReport.detectedProhibitedClaims.length > 0, 'Prohibited claim must be caught');
    assert.ok(violationReport.remediatedSvg, 'Remediated SVG must be generated');
    assert.ok(!violationReport.remediatedSvg.includes('#00FFFF'), 'Unapproved color must be replaced in remediated SVG');
  });

  // ===========================================================================
  // 5. BRAND DRIFT SCANNING ACROSS MULTI-CHANNEL ASSETS
  // ===========================================================================
  it('5. Scans workspace collateral and accurately identifies brand drift and drifted assets', async () => {
    // Create an aligned asset
    await brandAssetRepository.create({
      workspaceId: wsId,
      businessId: wsId,
      name: 'Aligned Product Label',
      assetType: 'svg',
      category: 'Label',
      section: 'Print & Packaging',
      mimeType: 'image/svg+xml',
      accentHex: '#FF7417',
      createdBy: userId,
    });

    // Create a drifted asset with legacy unapproved accent hex
    await brandAssetRepository.create({
      workspaceId: wsId,
      businessId: wsId,
      name: 'Legacy Summer Post',
      assetType: 'svg',
      category: 'Instagram Post',
      section: 'Social Media',
      mimeType: 'image/svg+xml',
      accentHex: '#990099', // Drifts significantly from #FF7417
      createdBy: userId,
    });

    const driftReport = await brandGuardianService.detectBrandDrift(wsId);
    assert.ok(driftReport, 'Drift report must be produced');
    assert.ok(driftReport.totalAssetsScanned >= 2);
    assert.ok(driftReport.driftedAssetsCount >= 1, 'At least 1 drifted asset must be detected');
    assert.ok(driftReport.driftPercentage > 0);

    const driftedItem = driftReport.driftItems.find((i) => i.assetTitle === 'Legacy Summer Post');
    assert.ok(driftedItem, 'Legacy Summer Post must be identified as drifted');
    assert.ok(driftedItem.driftReasons.length > 0);
  });

  // ===========================================================================
  // 6. BRAND IDENTITY VERSIONING & IMPACT ANALYSIS
  // ===========================================================================
  it('6. Preserves historical guidelines, creates new versions, and computes impact analysis', async () => {
    const current = await brandGuardianService.getAuthoritativeIdentity(wsId);
    assert.equal(current.status, 'active');

    // Create new identity version v3 with updated accent color
    const v3 = await brandGuardianService.saveAuthoritativeIdentity(
      wsId,
      {
        versionLabel: 'v3.0.0 - Autumn Refinement',
        tokens: {
          ...current.tokens,
          colors: {
            ...current.tokens.colors,
            accent: {
              ...current.tokens.colors.accent,
              hex: '#FF5500',
            },
          },
        },
        changelog: 'Refined brand accent to #FF5500 for autumnal brand campaign.',
      },
      userId
    );

    assert.equal(v3.version, current.version + 1);
    assert.equal(v3.status, 'active');
    assert.equal(v3.tokens.colors.accent.hex, '#FF5500');

    // Verify historical version is preserved
    const versions = await brandGuardianService.listIdentityVersions(wsId);
    assert.ok(versions.length >= 2, 'Multiple historical versions must be preserved');
    const oldV = versions.find((v) => v.identityId === current.identityId);
    assert.ok(oldV);
    assert.equal(oldV.status, 'superseded', 'Old version must be marked superseded');
    assert.ok(oldV.effectiveTo, 'Old version must have effectiveTo date set');

    // Run impact analysis for proposed changes (e.g. changing accent to #E63946)
    const impact = await brandGuardianService.analyzeIdentityImpact(wsId, {
      colors: { accent: '#E63946' },
    });
    assert.ok(impact);
    assert.equal(impact.colorChanges.length, 1);
  });
});
