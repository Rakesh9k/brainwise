/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { printPackagingService } from './services/printPackagingService';
import { productRepository } from './repositories/productRepository';
import { brandAssetRepository } from './repositories/brandAssetRepository';
import type { ProductEntity } from './types/api';

describe('BRAINWISE PRINT & PACKAGING INTELLIGENCE — PHASE 4 ACCEPTANCE TEST SUITE', () => {
  const wsId = `ws_pkg_${Date.now()}`;
  const userId = `user_pkg_${Date.now()}`;
  const productId = `prod_serum_${Date.now()}`;

  // ===========================================================================
  // 1. PACKAGING ASSET CREATION & BUSINESS BRAIN PRODUCT LINKAGE
  // ===========================================================================
  it('1. Creates packaging asset linked to verified Business Brain product and cross-registers in unified DAM', async () => {
    // 1. Seed verified product in Business Brain productRepository
    const product: ProductEntity = {
      productId,
      workspaceId: wsId,
      name: 'Wild Rose Rejuvenating Serum',
      sku: 'SKU-BOT-001',
      category: 'Skincare',
      description: 'Cold-pressed high-altitude wild rose organic serum.',
      price: 899,
      currency: 'INR',
      status: 'active',
      source: 'USER_CONFIRMED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await productRepository.createProduct(product);

    // 2. Create packaging asset
    const pkg = await printPackagingService.createPackagingAsset({
      workspaceId: wsId,
      name: 'Wild Rose Folding Outer Carton',
      packagingType: 'Box',
      productId,
      widthMm: 80,
      heightMm: 160,
      depthMm: 40,
      bleedMm: 3.0,
      safeMarginMm: 5.0,
      resolutionDpi: 300,
      colorSpace: 'CMYK',
      colorProfile: 'FOGRA39',
      createdBy: userId,
    });

    assert.ok(pkg, 'Packaging asset must be created');
    assert.equal(pkg.workspaceId, wsId);
    assert.equal(pkg.section, 'Print & Packaging');
    assert.equal(pkg.packagingType, 'Box');
    assert.equal(pkg.productAssociation.productId, productId);
    assert.equal(pkg.productAssociation.productName, 'Wild Rose Rejuvenating Serum');
    assert.equal(pkg.productAssociation.sku, 'SKU-BOT-001');

    // Verify dieline generation
    assert.ok(pkg.productionMetadata.dieline?.dielineSvg?.includes('<svg'), 'Dieline SVG must be generated');
    assert.ok(pkg.productionMetadata.dieline?.dielineSvg?.includes('#FF0000'), 'Dieline must contain red cut line');
    assert.ok(pkg.productionMetadata.dieline?.dielineSvg?.includes('#00FF00'), 'Dieline must contain green crease line');
    assert.ok(pkg.productionMetadata.dieline?.dielineSvg?.includes('#FF00FF'), 'Dieline must contain magenta bleed line');

    // 3. Verify cross-registration in brandAssetRepository
    const damAsset = await brandAssetRepository.getById(wsId, pkg.assetId);
    assert.ok(damAsset, 'Packaging asset must be cross-registered in unified BrandAssetRepository');
    assert.equal(damAsset.section, 'Print & Packaging');
    assert.equal(damAsset.category, 'Packaging');
    assert.ok(damAsset.productIds?.includes(productId), 'Product association must persist in DAM registry');
  });

  // ===========================================================================
  // 2. PRINT PRODUCTION METADATA SPECIFICATION CONFORMANCE
  // ===========================================================================
  it('2. Stores exhaustive print production metadata and press specifications', async () => {
    const pkgList = await printPackagingService.listPackagingAssets(wsId, { productId });
    assert.ok(pkgList.length > 0, 'At least 1 packaging asset must exist');
    const pkg = pkgList[0];

    const meta = pkg.productionMetadata;
    assert.equal(meta.widthMm, 80);
    assert.equal(meta.heightMm, 160);
    assert.equal(meta.depthMm, 40);
    assert.equal(meta.measurementUnit, 'mm');
    assert.equal(meta.bleedMm, 3.0);
    assert.equal(meta.safeMarginMm, 5.0);
    assert.equal(meta.resolutionDpi, 300);
    assert.equal(meta.colorSpace, 'CMYK');
    assert.equal(meta.colorProfile, 'FOGRA39');
    assert.equal(meta.fileFormat, 'PDF/X-1a');
    assert.ok(meta.embeddedFonts.includes('Plus Jakarta Sans'));

    // Check printer specifications
    assert.equal(meta.printer.pressType, 'Offset');
    assert.equal(meta.printer.substrate, '350 GSM Cyber XLC Folding Box Board');
    assert.ok(meta.printer.specialInks?.includes('Pantone 871 C Gold'));
  });

  // ===========================================================================
  // 3. DETERMINISTIC PRE-FLIGHT PRINT READINESS ENGINE
  // ===========================================================================
  it('3. Performs deterministic pre-flight readiness checks (DPI, bleed, margin, CMYK, TAC, dielines)', async () => {
    const pkgList = await printPackagingService.listPackagingAssets(wsId, { productId });
    const assetId = pkgList[0].assetId;

    // Evaluate valid asset
    const report = await printPackagingService.evaluatePrintReadiness(wsId, assetId);

    assert.ok(report, 'Pre-flight report must be generated');
    assert.equal(report.isPrintReady, true, 'Standard compliant asset must be marked Print Ready');
    assert.ok(report.overallScore >= 90, 'Score should be >= 90 for optimal artwork');
    assert.equal(report.totalAreaCoveragePct, 280);
    assert.ok(report.disclaimer.includes('Deterministic pre-flight verification advisory'));

    // Verify individual check items
    const checkIds = report.checks.map((c) => c.checkId);
    assert.ok(checkIds.includes('check_dpi'), 'Must verify resolution DPI');
    assert.ok(checkIds.includes('check_bleed'), 'Must verify physical bleed margin');
    assert.ok(checkIds.includes('check_safe_margin'), 'Must verify safe inner margin');
    assert.ok(checkIds.includes('check_color_space'), 'Must verify CMYK process color space');
    assert.ok(checkIds.includes('check_tac_limit'), 'Must verify Total Area Coverage limit');
    assert.ok(checkIds.includes('check_dieline'), 'Must verify vector dieline cut and crease lines');

    // Create a sub-optimal / invalid asset (e.g. RGB, insufficient bleed 1.0mm, low DPI 120)
    const badPkg = await printPackagingService.createPackagingAsset({
      workspaceId: wsId,
      name: 'Uncalibrated Draft Box',
      packagingType: 'Box',
      productId,
      widthMm: 80,
      heightMm: 160,
      bleedMm: 1.0, // FAILS (min 3.0mm)
      safeMarginMm: 2.0, // FAILS (min 4.0mm)
      resolutionDpi: 120, // FAILS (min 300 DPI)
      colorSpace: 'RGB', // FAILS (requires CMYK)
    });

    const badReport = await printPackagingService.evaluatePrintReadiness(wsId, badPkg.assetId);
    assert.equal(badReport.isPrintReady, false, 'Non-compliant asset must NOT be print ready');
    assert.ok(badReport.overallScore < 70, 'Non-compliant asset must receive low score');
    const criticalChecks = badReport.checks.filter((c) => c.severity === 'critical');
    assert.ok(criticalChecks.length >= 3, 'Must identify critical pre-flight failures');
  });

  // ===========================================================================
  // 4. PACKAGING OCR & CONTENT INTELLIGENCE WITH BUSINESS BRAIN CROSS-CHECK
  // ===========================================================================
  it('4. Extracts packaging content via OCR and flags price discrepancies against Business Brain', async () => {
    const pkgList = await printPackagingService.listPackagingAssets(wsId, { productId });
    const assetId = pkgList[0].assetId;

    // Artwork text matching Business Brain (Product price is 899)
    const compliantArtworkText = `
      <svg>
        <text class="title">Wild Rose Rejuvenating Serum</text>
        <text class="price">MRP: ₹899</text>
        <text class="net-qty">Net Wt: 50ml</text>
        <text class="ingredients">Ingredients: Aqua, Rose Damascena Flower Extract, Niacinamide, Hyaluronic Acid</text>
        <text class="barcode">8901234567890</text>
        <text class="batch">Batch No: B-2026-X</text>
        <text class="expiry">Best Before: 24 months from mfg</text>
        <text class="regulatory">FSSAI Lic. No. 10020011000123. Recyclable packaging ♳.</text>
      </svg>
    `;

    const report = await printPackagingService.extractPackagingContentIntelligence(
      wsId,
      assetId,
      compliantArtworkText
    );

    assert.ok(report, 'Content intelligence report must be generated');
    assert.equal(report.extractedContent.mrp, 899);
    assert.equal(report.extractedContent.netQuantity, '50ml');
    assert.ok(report.extractedContent.ingredients?.includes('Aqua'));
    assert.equal(report.extractedContent.barcodeText, '8901234567890');
    assert.equal(report.extractedContent.batchInfo, 'B-2026-X');
    assert.ok(report.extractedContent.regulatoryDeclarations?.includes('FSSAI License Declaration Present'));
    assert.ok(report.extractedContent.regulatoryDeclarations?.includes('Recyclable Packaging Symbol Present'));

    // Business Brain check
    assert.equal(report.businessBrainComparison.productMatched, true);
    assert.equal(report.businessBrainComparison.isCompliant, true);
    assert.equal(report.businessBrainComparison.discrepancies.length, 0);
    assert.ok(report.disclaimer.includes('Never certify regulatory compliance solely through AI'));

    // Artwork with Price Discrepancy (Art declares ₹699, Business Brain active price is ₹899)
    const conflictArtworkText = `
      <svg>
        <text>MRP: ₹699</text>
        <text>Net Wt: 50ml</text>
        <text>Ingredients: Aqua, Rosa Extract</text>
        <text>Batch No: B-2026-X</text>
        <text>Best Before: 12/2027</text>
      </svg>
    `;

    const conflictReport = await printPackagingService.extractPackagingContentIntelligence(
      wsId,
      assetId,
      conflictArtworkText
    );

    assert.equal(conflictReport.businessBrainComparison.isCompliant, false);
    assert.ok(conflictReport.businessBrainComparison.discrepancies.length > 0);
    const priceDiscrepancy = conflictReport.businessBrainComparison.discrepancies.find(
      (d) => d.field === 'mrp'
    );
    assert.ok(priceDiscrepancy, 'Price discrepancy must be detected');
    assert.equal(priceDiscrepancy.detectedOnPackaging, 699);
    assert.equal(priceDiscrepancy.verifiedInBusinessBrain, 899);
    assert.equal(priceDiscrepancy.severity, 'critical');
  });

  // ===========================================================================
  // 5. PRODUCTION WORKFLOW STATE MACHINE
  // ===========================================================================
  it('5. Advances through complete production workflow state machine with audit history', async () => {
    const pkgList = await printPackagingService.listPackagingAssets(wsId, { productId });
    const assetId = pkgList[0].assetId;

    // Transition 1: Draft -> Review
    let updated = await printPackagingService.advanceProductionWorkflow({
      workspaceId: wsId,
      assetId,
      targetStatus: 'Review',
      updatedBy: userId,
      notes: 'Packaging artwork submitted for pre-press QA review.',
    });
    assert.equal(updated.productionMetadata.workflowStatus, 'Review');

    // Transition 2: Review -> Approved
    updated = await printPackagingService.advanceProductionWorkflow({
      workspaceId: wsId,
      assetId,
      targetStatus: 'Approved',
      updatedBy: 'qa_lead',
      notes: 'Pre-flight verified. All clearances approved.',
    });
    assert.equal(updated.productionMetadata.workflowStatus, 'Approved');

    // Transition 3: Approved -> Print Ready
    updated = await printPackagingService.advanceProductionWorkflow({
      workspaceId: wsId,
      assetId,
      targetStatus: 'Print Ready',
      updatedBy: userId,
      notes: 'Separation plates generated with FOGRA39 ICC profile.',
    });
    assert.equal(updated.productionMetadata.workflowStatus, 'Print Ready');

    // Transition 4: Print Ready -> Sent to Vendor
    updated = await printPackagingService.advanceProductionWorkflow({
      workspaceId: wsId,
      assetId,
      targetStatus: 'Sent to Vendor',
      updatedBy: userId,
      vendorName: 'Apex Print Graphics Ltd',
      notes: 'Job dispatched to Heidelberg Speedmaster XL 106 press line.',
    });
    assert.equal(updated.productionMetadata.workflowStatus, 'Sent to Vendor');
    assert.equal(updated.productionMetadata.printer.vendorName, 'Apex Print Graphics Ltd');

    // Transition 5: Sent to Vendor -> In Production
    updated = await printPackagingService.advanceProductionWorkflow({
      workspaceId: wsId,
      assetId,
      targetStatus: 'In Production',
      updatedBy: 'vendor_rep',
      notes: 'Cylinders mounted; offset run in progress.',
    });
    assert.equal(updated.productionMetadata.workflowStatus, 'In Production');

    // Transition 6: In Production -> Completed
    updated = await printPackagingService.advanceProductionWorkflow({
      workspaceId: wsId,
      assetId,
      targetStatus: 'Completed',
      updatedBy: userId,
      notes: 'Batch of 5,000 folding cartons received in warehouse.',
    });
    assert.equal(updated.productionMetadata.workflowStatus, 'Completed');

    // Verify audit log has recorded all transitions
    const log = updated.productionMetadata.workflowAuditLog;
    assert.ok(log.length >= 7, 'Audit log must record initial draft and all 6 transitions');
    assert.equal(log[log.length - 1].status, 'Completed');
  });

  // ===========================================================================
  // 6. PACKAGING VERSION INTELLIGENCE & PRODUCT CHANGE DRIFT
  // ===========================================================================
  it('6. Detects packaging drift and version diffs when product details change in Business Brain', async () => {
    // When retail price changes from 899 to 999
    const driftResult = await printPackagingService.checkProductUpdatePackagingDrift(
      wsId,
      productId,
      { price: 999 }
    );

    assert.ok(driftResult.affectedAssets.length > 0, 'Must identify affected packaging assets');
    assert.ok(driftResult.versionDiffs.length > 0, 'Must compute version diffs');
    const diff = driftResult.versionDiffs[0];
    assert.ok(diff.priceChanges, 'Price change must be flagged');
    assert.equal(diff.priceChanges.oldPrice, 899);
    assert.equal(diff.priceChanges.newPrice, 999);
    assert.equal(diff.toVersion, diff.fromVersion + 1);
  });

  // ===========================================================================
  // 7. ABSOLUTE GUARDRAIL: STRICT VIDEO EXCLUSION
  // ===========================================================================
  it('7. Strictly enforces video exclusion across all print and packaging collateral', async () => {
    const pkgList = await printPackagingService.listPackagingAssets(wsId, { productId });
    for (const pkg of pkgList) {
      assert.notEqual(pkg.section, 'Video' as any);
      assert.notEqual(pkg.category, 'Video' as any);
      assert.ok(!pkg.name.toLowerCase().includes('.mp4'));
      assert.ok(!pkg.name.toLowerCase().includes('.mov'));
    }
  });
});
