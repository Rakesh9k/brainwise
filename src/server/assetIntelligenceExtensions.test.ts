/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { brandAssetRepository } from './repositories/brandAssetRepository';
import { productRepository } from './repositories/productRepository';
import { brandGuardianService } from './services/brandGuardianService';
import { assetIntelligenceExtensionsService, INDIC_FONT_REGISTRY } from './services/assetIntelligenceExtensionsService';

const TEST_WORKSPACE = 'ws_intelligence_ext';
const TEST_USER = 'user_intel_architect';

describe('BRAINWISE ASSETLIBRARY — ADVANCED INTELLIGENCE EXTENSIONS TEST SUITE', () => {
  beforeEach(async () => {
    // Purge test workspace
    const active = await brandAssetRepository.listByWorkspace(TEST_WORKSPACE, { limit: 200 });
    for (const a of active) {
      await brandAssetRepository.deletePermanently(TEST_WORKSPACE, a.assetId);
    }
  });

  // ===========================================================================
  // 1. AI ASSET AUTOPILOT
  // ===========================================================================
  it('1. AI Asset Autopilot: Automatically organizes approved uploads into sections, categories, and product links', async () => {
    // Seed verified product
    await productRepository.createProduct({
      productId: 'prod_wild_honey_500g',
      workspaceId: TEST_WORKSPACE,
      name: 'Wild Forest Raw Honey 500g',
      sku: 'VO-WFH-500',
      category: 'Food & Nutrition',
      pricing: { mrp: 699, costPrice: 280, sellingPrice: 649, currency: 'INR' },
      price: 699,
      status: 'Active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Upload unorganized asset
    const rawAsset = await brandAssetRepository.create({
      workspaceId: TEST_WORKSPACE,
      businessId: TEST_WORKSPACE,
      name: 'Wild Forest Raw Honey 500g Jar Label Dieline',
      section: 'Active',
      category: 'Collateral',
      approvalStatus: 'approved',
      createdBy: TEST_USER,
    });

    // Execute Autopilot
    const result = await assetIntelligenceExtensionsService.runAssetAutopilot(TEST_WORKSPACE, rawAsset.assetId);

    assert.equal(result.assignedSection, 'Print & Packaging');
    assert.equal(result.assignedCategory, 'Packaging');
    assert.ok(result.associatedProductIds.includes('prod_wild_honey_500g'));
    assert.ok(result.inferredTags.includes('product-linked'));
    assert.ok(result.confidenceScore >= 90);
  });

  // ===========================================================================
  // 2. BRAND DRIFT MONITOR
  // ===========================================================================
  it('2. Brand Drift Monitor: Continuously detects inconsistent brand assets and deprecated color tokens', async () => {
    await brandGuardianService.bootstrapDefaultIdentity(TEST_WORKSPACE);

    // Create off-brand asset with unauthorized neon pink
    await brandAssetRepository.create({
      workspaceId: TEST_WORKSPACE,
      businessId: TEST_WORKSPACE,
      name: 'Off-Brand Promotional Flyer',
      section: 'Active',
      category: 'Collateral',
      svgContent: `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><rect fill="#FF007F"/><text>Summer Sale</text></svg>`,
      approvalStatus: 'approved',
      createdBy: TEST_USER,
    });

    const driftScan = await assetIntelligenceExtensionsService.scanBrandDrift(TEST_WORKSPACE);
    assert.ok(driftScan.driftedAssetCount >= 1);
    assert.ok(driftScan.alerts.some((al) => al.driftType === 'color' && al.detectedValue === '#FF007F'));
  });

  // ===========================================================================
  // 3. PRODUCT CHANGE IMPACT ENGINE
  // ===========================================================================
  it('3. Product Change Impact Engine: Finds every packaging and collateral asset affected by a price change', async () => {
    // Seed product
    await productRepository.createProduct({
      productId: 'prod_herbal_elixir',
      workspaceId: TEST_WORKSPACE,
      name: 'Himalayan Herbal Elixir 200ml',
      sku: 'VO-HHE-200',
      category: 'Wellness',
      pricing: { mrp: 499, costPrice: 180, sellingPrice: 450, currency: 'INR' },
      price: 499,
      status: 'Active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Seed packaging asset with current price ₹499
    await brandAssetRepository.create({
      workspaceId: TEST_WORKSPACE,
      businessId: TEST_WORKSPACE,
      name: 'Herbal Elixir Label Print Ready',
      section: 'Print & Packaging',
      category: 'Packaging',
      productIds: ['prod_herbal_elixir'],
      headlineText: 'MRP: ₹499 Net Vol: 200ml',
      svgContent: `<svg><text>MRP: ₹499</text></svg>`,
      approvalStatus: 'approved',
      createdBy: TEST_USER,
    });

    // Run impact report for a price increase from ₹499 to ₹549
    const impact = await assetIntelligenceExtensionsService.evaluateProductChangeImpact({
      workspaceId: TEST_WORKSPACE,
      productId: 'prod_herbal_elixir',
      updatedData: { price: 549 },
    });

    assert.equal(impact.blastRadiusAssetCount, 1);
    assert.ok(impact.affectedSections.includes('Print & Packaging'));
    assert.equal(impact.impactedAssets[0].urgency, 'critical');
    assert.equal(impact.impactedAssets[0].newProductValue, '₹549');
  });

  // ===========================================================================
  // 4. CREATIVE DNA
  // ===========================================================================
  it('4. Creative DNA: Extracts aesthetic archetypes and performance drivers from successful collateral', async () => {
    await brandAssetRepository.create({
      workspaceId: TEST_WORKSPACE,
      businessId: TEST_WORKSPACE,
      name: 'High Performance Master Hero Banner',
      section: 'Social Media',
      category: 'Collateral',
      approvalStatus: 'approved',
      createdBy: TEST_USER,
    });

    const dna = await assetIntelligenceExtensionsService.extractCreativeDna(TEST_WORKSPACE);
    assert.ok(dna.topArchetypes.length >= 2);
    assert.ok(dna.topArchetypes[0].roasBenchmark > 4.0);
    assert.ok(dna.keyPerformanceDrivers.length > 0);
  });

  // ===========================================================================
  // 5. ASSET OPPORTUNITY FINDER
  // ===========================================================================
  it('5. Asset Opportunity Finder: Identifies catalog products with zero packaging or marketing coverage', async () => {
    // Seed product with zero assets
    await productRepository.createProduct({
      productId: 'prod_uncovered_soap',
      workspaceId: TEST_WORKSPACE,
      name: 'Artisanal Neem & Charcoal Soap 125g',
      sku: 'VO-NCS-125',
      category: 'Personal Care',
      pricing: { mrp: 299, costPrice: 90, sellingPrice: 249, currency: 'INR' },
      price: 299,
      status: 'Active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const report = await assetIntelligenceExtensionsService.findAssetOpportunities(TEST_WORKSPACE);
    assert.ok(report.underCoveredCount >= 1);
    const soapOpportunity = report.opportunities.find((o) => o.productId === 'prod_uncovered_soap');
    assert.ok(soapOpportunity);
    assert.equal(soapOpportunity.opportunityScore, 100);
    assert.ok(soapOpportunity.missingEssentialTypes.includes('Packaging Label / Box'));
  });

  // ===========================================================================
  // 6. SEASONAL ASSET PLANNER
  // ===========================================================================
  it('6. Seasonal Asset Planner: Generates calendar-aware festival and marketing event recommendations', () => {
    const plan = assetIntelligenceExtensionsService.generateSeasonalCalendar(TEST_WORKSPACE, 10); // Month 10 (October/Diwali)
    assert.ok(plan.length >= 5);
    const diwaliRec = plan.find((p) => p.eventId === 'evt_diwali');
    assert.ok(diwaliRec);
    assert.equal(diwaliRec.status, 'active');
    assert.ok(diwaliRec.suggestedCampaignAngle.includes('#FF7417'));
  });

  // ===========================================================================
  // 7. AI ASSET BRIEF GENERATOR
  // ===========================================================================
  it('7. AI Asset Brief Generator: Synthesizes business facts and guidelines into grounded creative briefs', async () => {
    const brief = await assetIntelligenceExtensionsService.generateCreativeBrief({
      workspaceId: TEST_WORKSPACE,
      objective: 'Diwali Premium Gifting Hamper Launch',
      targetChannel: 'Instagram',
    });

    assert.ok(brief.briefId);
    assert.ok(brief.deliverables.length >= 2);
    assert.ok(brief.brandGuidelines.mandatoryColors.length > 0);
    assert.ok(brief.groundedFacts.length > 0);
  });

  // ===========================================================================
  // 8. INTELLIGENT RIGHTS MONITOR
  // ===========================================================================
  it('8. Intelligent Rights Monitor: Alerts on expiring model releases and commercial software licenses', async () => {
    const alerts = await assetIntelligenceExtensionsService.auditRightsLicenses(TEST_WORKSPACE);
    assert.ok(alerts.length >= 2);
    assert.ok(alerts.some((al) => al.isExpired));
    assert.ok(alerts.some((al) => al.severity === 'critical'));
  });

  // ===========================================================================
  // 9. INDIC LOCALIZATION ENGINE (PRIORITY)
  // ===========================================================================
  describe('9. Indic Localization Engine (Hindi, Telugu, Tamil & Regional Parity)', () => {
    it('Maintains script-aware font mappings with appropriate line-height multipliers for matras', () => {
      // Hindi (Devanagari)
      const hiSpec = INDIC_FONT_REGISTRY.hi;
      assert.equal(hiSpec.scriptFamily, 'Devanagari');
      assert.equal(hiSpec.primaryFontFamily, 'Noto Sans Devanagari');
      assert.equal(hiSpec.lineHeightMultiplier, 1.3); // +30% for ascender/descender matras
      assert.equal(hiSpec.letterSpacingAdjustment, '0px'); // 0 tracking for shirorekha

      // Telugu
      const teSpec = INDIC_FONT_REGISTRY.te;
      assert.equal(teSpec.scriptFamily, 'Telugu');
      assert.equal(teSpec.primaryFontFamily, 'Noto Sans Telugu');
      assert.equal(teSpec.lineHeightMultiplier, 1.35); // +35% for complex Telugu vowel glyphs
      assert.equal(teSpec.letterSpacingAdjustment, '0px');

      // Tamil
      const taSpec = INDIC_FONT_REGISTRY.ta;
      assert.equal(taSpec.scriptFamily, 'Tamil');
      assert.equal(taSpec.primaryFontFamily, 'Noto Sans Tamil');
      assert.equal(taSpec.lineHeightMultiplier, 1.25);
    });

    it('Generates Hindi (Devanagari) creative derivative with font and layout preservation', async () => {
      // 1. Create master English creative
      const englishMaster = await brandAssetRepository.create({
        workspaceId: TEST_WORKSPACE,
        businessId: TEST_WORKSPACE,
        name: 'Wild Forest Raw Honey Hero Banner',
        section: 'Social Media',
        category: 'Collateral',
        headlineText: '100% Pure Himalayan Raw Forest Honey',
        subtext: 'Directly sourced from pristine high-altitude valleys',
        svgContent: `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080">
          <rect width="100%" height="100%" fill="#171717"/>
          <text x="540" y="520" text-anchor="middle" font-family="Plus Jakarta Sans" font-size="44" fill="#FAFAF9">100% Pure Himalayan Raw Forest Honey</text>
        </svg>`,
        approvalStatus: 'approved',
        createdBy: TEST_USER,
      });

      // 2. Localize to Hindi
      const hindiDerivative = await assetIntelligenceExtensionsService.localizeCreativeAsset({
        workspaceId: TEST_WORKSPACE,
        parentAssetId: englishMaster.assetId,
        targetLanguage: 'hi',
        translatedHeadline: '१००% शुद्ध हिमालयन प्राकृतिक कच्चा शहद',
        translatedBody: 'सीधे पहाड़ों से प्रमाणित शुद्धता',
        userId: TEST_USER,
      });

      assert.equal(hindiDerivative.targetLanguage, 'hi');
      assert.equal(hindiDerivative.scriptApplied, 'Devanagari');
      assert.equal(hindiDerivative.appliedFontFamily, 'Noto Sans Devanagari');
      assert.equal(hindiDerivative.lineHeightScale, 1.3);
      assert.equal(hindiDerivative.preservationScore, 98);

      // Verify asset repository registration
      const assetDoc = hindiDerivative.derivativeAsset;
      assert.equal(assetDoc.parentAssetId, englishMaster.assetId);
      assert.ok(assetDoc.name.includes('[Hindi]'));
      assert.ok(assetDoc.headlineText?.includes('१००% शुद्ध हिमालयन प्राकृतिक कच्चा शहद'));
      assert.ok(assetDoc.svgContent?.includes('Noto Sans Devanagari'));
    });

    it('Generates Telugu creative derivative preserving script glyphs and lineage', async () => {
      // Master asset
      const englishMaster = await brandAssetRepository.create({
        workspaceId: TEST_WORKSPACE,
        businessId: TEST_WORKSPACE,
        name: 'Organic Wellness Elixir Square Promo',
        section: 'Social Media',
        category: 'Collateral',
        headlineText: 'Pure Himalayan Wellness',
        svgContent: `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080"><rect width="100%" height="100%" fill="#171717"/><text x="540" y="540" font-family="Plus Jakarta Sans">Pure Himalayan Wellness</text></svg>`,
        approvalStatus: 'approved',
        createdBy: TEST_USER,
      });

      // Localize to Telugu
      const teluguDerivative = await assetIntelligenceExtensionsService.localizeCreativeAsset({
        workspaceId: TEST_WORKSPACE,
        parentAssetId: englishMaster.assetId,
        targetLanguage: 'te',
        translatedHeadline: '100% స్వచ్ఛమైన హిమాలయ సహజ అడవి తేనె',
        translatedBody: 'పర్వతాల నుండి నేరుగా సేకరించిన స్వచ్ఛత',
        userId: TEST_USER,
      });

      assert.equal(teluguDerivative.targetLanguage, 'te');
      assert.equal(teluguDerivative.scriptApplied, 'Telugu');
      assert.equal(teluguDerivative.appliedFontFamily, 'Noto Sans Telugu');
      assert.equal(teluguDerivative.lineHeightScale, 1.35);

      const assetDoc = teluguDerivative.derivativeAsset;
      assert.ok(assetDoc.name.includes('[Telugu]'));
      assert.ok(assetDoc.headlineText?.includes('స్వచ్ఛమైన'));
      assert.ok(assetDoc.svgContent?.includes('Noto Sans Telugu'));
    });
  });

  // ===========================================================================
  // 10. ASSET WASTE DETECTOR
  // ===========================================================================
  it('10. Asset Waste Detector: Finds stale drafts and redundant unreferenced storage', async () => {
    // Create stale draft
    await brandAssetRepository.create({
      workspaceId: TEST_WORKSPACE,
      businessId: TEST_WORKSPACE,
      name: 'Abandoned Temporary Rough Sketch',
      section: 'Active',
      category: 'Collateral',
      approvalStatus: 'draft',
      fileSize: 45000,
      createdBy: TEST_USER,
    });

    const audit = await assetIntelligenceExtensionsService.auditAssetWaste(TEST_WORKSPACE);
    assert.ok(audit.flaggedWasteCount >= 1);
    assert.ok(audit.wastedAssets.some((w) => w.wasteReason === 'stale_draft'));
  });

  // ===========================================================================
  // 11. CREATIVE EXPERIMENT TRACKER
  // ===========================================================================
  it('11. Creative Experiment Tracker: Links creative variants and computes statistical conversion uplift', async () => {
    const experiment = await assetIntelligenceExtensionsService.trackCreativeExperiment(TEST_WORKSPACE, {
      experimentName: 'Headline Contrast: Scientific Proof vs Emotional Purity',
      hypothesis: 'Scientific proof points will improve CTR by at least 15%',
      variantAId: 'asset_var_a',
      variantBId: 'asset_var_b',
      variantACtr: 2.1,
      variantBCtr: 3.2,
    });

    assert.equal(experiment.winningVariantId, 'asset_var_b');
    assert.ok(experiment.upliftPercentage! > 50);
    assert.equal(experiment.statisticalConfidence, 0.96);
  });

  // ===========================================================================
  // 12. CROSS-BRAND INTELLIGENCE
  // ===========================================================================
  it('12. Cross-Brand Intelligence: Prevents cross-contamination of brand identities and external marks', async () => {
    await brandGuardianService.bootstrapDefaultIdentity(TEST_WORKSPACE);

    // Create an asset with an illegal competitor-brand tag
    await brandAssetRepository.create({
      workspaceId: TEST_WORKSPACE,
      businessId: TEST_WORKSPACE,
      name: 'Unsanctioned External Logo Mark',
      section: 'Active',
      category: 'Brand Identity',
      tags: ['competitor-brand', 'external-mark'],
      approvalStatus: 'draft',
      createdBy: TEST_USER,
    });

    const audit = await assetIntelligenceExtensionsService.auditMultiBrandIsolation(TEST_WORKSPACE);
    assert.equal(audit.crossContaminationDetected, true);
    assert.ok(audit.violations.length >= 1);
  });
});
