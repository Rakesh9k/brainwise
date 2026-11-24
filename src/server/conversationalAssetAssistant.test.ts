/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { conversationalAssetAssistantService } from './services/conversationalAssetAssistantService';
import { brandAssetRepository } from './repositories/brandAssetRepository';
import { productRepository } from './repositories/productRepository';
import { businessProfileRepository } from './repositories/businessProfileRepository';
import { brandGuardianService } from './services/brandGuardianService';
import type { ProductEntity } from './types/api';

describe('BRAINWISE CONVERSATIONAL ASSET INTELLIGENCE ASSISTANT — PHASE 8 ACCEPTANCE TEST SUITE', () => {
  const wsId = `ws_chat_${Date.now()}`;
  const userId = `user_chat_${Date.now()}`;
  const productId = `prod_truffle_${Date.now()}`;
  let logoAssetId = '';
  let packagingAssetId = '';
  let socialAssetId = '';

  // ===========================================================================
  // 1. ENVIRONMENT BOOTSTRAP & BUSINESS BRAIN SEEDING
  // ===========================================================================
  it('1. Seeds Business Brain and registers cross-departmental assets', async () => {
    // 1. Seed Business Profile
    await businessProfileRepository.saveProfile({
      workspaceId: wsId,
      businessName: 'Solstice Botanicals',
      tagline: 'High-Altitude Organic Confections & Botanicals',
      stage: 'Growth',
      location: 'Shimla, India',
      website: 'https://solsticebotanicals.com',
      foundedYear: '2024',
      overviewSummary: 'Artisanal organic dark chocolate and wild botanical elixirs.',
      targetAudience: 'Conscious luxury consumers seeking clean verified botanicals.',
      brandPositioning: 'Purity guaranteed through single-origin harvesting.',
      valueProposition: 'Single-estate botanical potency.',
      businessModel: 'D2C',
      revenueModel: 'Omnichannel retail',
      primaryGoals: ['Expand luxury retail footprint'],
      provenance: {
        businessName: { source: 'USER_CONFIRMED', verifiedAt: new Date().toISOString() },
      },
      strategicMemory: { usedAngles: [], fatiguedThemes: [], explicitExclusions: [], lastUpdated: new Date().toISOString() },
      approvalStatus: 'APPROVED',
      lastUpdated: new Date().toISOString(),
      version: 1,
    });

    // 2. Seed Product in Business Brain
    const product: ProductEntity = {
      productId,
      workspaceId: wsId,
      name: 'Single-Estate Dark Chocolate Box',
      sku: 'SKU-CHO-85',
      category: 'Confectionery',
      description: '85% single-origin dark chocolate truffles.',
      price: 699,
      currency: 'INR',
      status: 'active',
      source: 'USER_CONFIRMED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await productRepository.createProduct(product);

    // 3. Bootstrap Authoritative Brand Identity
    await brandGuardianService.bootstrapDefaultIdentity(wsId);

    // 4. Seed Assets in DAM across sections
    // Asset 1: Approved Logo in Identity
    const logo = await brandAssetRepository.create({
      workspaceId: wsId,
      businessId: wsId,
      name: 'Solstice Primary Wordmark Logo',
      category: 'Logo',
      section: 'Identity',
      assetType: 'svg',
      mimeType: 'image/svg+xml',
      headlineText: 'Solstice Botanicals',
      svgContent: '<svg width="800" height="200"><rect fill="#FFFFFF"/><text fill="#FF7417">SOLSTICE</text></svg>',
      tags: ['logo', 'primary', 'approved'],
      approvalStatus: 'approved',
      status: 'active',
      createdBy: userId,
    });
    logoAssetId = logo.assetId;

    // Asset 2: Packaging in Print & Packaging
    const pkg = await brandAssetRepository.create({
      workspaceId: wsId,
      businessId: wsId,
      name: 'Single-Estate Dark Chocolate Outer Carton',
      category: 'Packaging',
      section: 'Print & Packaging',
      assetType: 'svg',
      mimeType: 'image/svg+xml',
      headlineText: 'Single-Estate Dark Chocolate Box',
      subtext: 'Net Wt: 200g · MRP: ₹699',
      svgContent: '<svg width="800" height="1600"><rect fill="#FFFFFF"/><text fill="#252525">MRP: 699</text></svg>',
      tags: ['packaging', 'carton', 'dieline', 'SKU-CHO-85'],
      productIds: [productId],
      dimensions: { width: 800, height: 1600, unit: 'px' },
      resolution: { dpi: 300, colorSpace: 'CMYK' },
      approvalStatus: 'approved',
      status: 'active',
      createdBy: userId,
    });
    packagingAssetId = pkg.assetId;

    // Asset 3: Approved Social Post in Social Media
    const social = await brandAssetRepository.create({
      workspaceId: wsId,
      businessId: wsId,
      name: 'Diwali Festive Sparkle Carousel',
      category: 'Carousel',
      section: 'Social Media',
      assetType: 'svg',
      mimeType: 'image/svg+xml',
      headlineText: 'Celebrate Diwali with Solstice Botanicals',
      svgContent: '<svg width="1080" height="1080"><rect fill="#0C0A09"/><text fill="#FF7417">Diwali Sale</text></svg>',
      tags: ['diwali', 'social', 'instagram', 'carousel'],
      dimensions: { width: 1080, height: 1080, unit: 'px' },
      resolution: { dpi: 72, colorSpace: 'RGB' },
      approvalStatus: 'approved',
      status: 'active',
      createdBy: userId,
    });
    socialAssetId = social.assetId;

    assert.ok(logoAssetId);
    assert.ok(packagingAssetId);
    assert.ok(socialAssetId);
  });

  // ===========================================================================
  // 2. CONVERSATIONAL SEARCH CAPABILITIES
  // ===========================================================================
  it('2. Resolves cross-section natural-language asset searches with explainability', async () => {
    // Query 1: Approved Logos
    const resLogos = await conversationalAssetAssistantService.processQuery({
      workspaceId: wsId,
      userId,
      userRole: 'member',
      query: 'Find all approved logos',
    });

    assert.ok(resLogos.message.content.includes('approved logo'));
    assert.ok(resLogos.referencedAssets.some((a) => a.category === 'Logo'));
    assert.ok(resLogos.message.explainability.facts.length > 0);
    assert.equal(resLogos.message.groundedIn.businessName, 'Solstice Botanicals');

    // Query 2: Product images for SKU
    const resSku = await conversationalAssetAssistantService.processQuery({
      workspaceId: wsId,
      userId,
      userRole: 'member',
      query: 'Show product images for SKU-CHO-85',
    });

    assert.ok(resSku.referencedAssets.some((a) => a.productIds?.includes(productId)));
    assert.ok(resSku.message.content.includes('Single-Estate Dark Chocolate Box'));

    // Query 3: High-performing social creatives
    const resSocial = await conversationalAssetAssistantService.processQuery({
      workspaceId: wsId,
      userId,
      userRole: 'member',
      query: 'Find high-performing social creatives',
    });

    assert.ok(resSocial.referencedAssets.some((a) => a.section === 'Social Media'));
    assert.ok(resSocial.message.content.includes('social creative'));

    // Query 4: Unused assets
    const resUnused = await conversationalAssetAssistantService.processQuery({
      workspaceId: wsId,
      userId,
      userRole: 'member',
      query: 'Find unused assets',
    });
    assert.ok(resUnused.message.content.includes('unreferenced'));
  });

  // ===========================================================================
  // 3. CONVERSATIONAL ANALYSIS CAPABILITIES
  // ===========================================================================
  it('3. Performs asset compliance, visual comparisons, and duplicate analyses', async () => {
    // 1. Brand Compliance Analysis
    const resCompliance = await conversationalAssetAssistantService.processQuery({
      workspaceId: wsId,
      userId,
      userRole: 'member',
      query: 'Run a brand compliance check on our assets',
    });

    assert.ok(resCompliance.message.content.includes('Brand Guardian Compliance Analysis'));
    assert.ok(resCompliance.message.content.includes('Overall Compliance Score'));
    assert.ok(resCompliance.message.explainability.facts.length > 0);

    // 2. Asset Comparison
    const resCompare = await conversationalAssetAssistantService.processQuery({
      workspaceId: wsId,
      userId,
      userRole: 'member',
      query: 'Compare the logo and packaging assets',
    });

    assert.ok(resCompare.message.content.includes('Asset Comparison Analysis'));
    assert.ok(resCompare.message.content.includes('Visual Similarity'));
    assert.equal(resCompare.referencedAssets.length, 2);

    // 3. Duplicate Analysis
    const resDupe = await conversationalAssetAssistantService.processQuery({
      workspaceId: wsId,
      userId,
      userRole: 'member',
      query: 'Run duplicate analysis across our asset library',
    });

    assert.ok(resDupe.message.content.includes('Duplicate Analysis'));
    assert.ok(resDupe.message.content.includes('Recommendation'));
  });

  // ===========================================================================
  // 4. SAFE ACTION CAPABILITIES (DIRECT EXECUTION WITH AUDIT LOG)
  // ===========================================================================
  it('4. Executes safe actions (create collection, add tags, create review tasks)', async () => {
    // 1. Create Collection
    const resColl = await conversationalAssetAssistantService.processQuery({
      workspaceId: wsId,
      userId,
      userRole: 'member',
      query: 'Create collection Winter Confectionery Launch with these assets',
    });

    assert.ok(resColl.actionExecuted, 'Action must be executed');
    assert.equal(resColl.actionExecuted.actionType, 'CREATE_COLLECTION');
    assert.equal(resColl.actionExecuted.success, true);
    assert.ok(resColl.message.content.includes('Winter Confectionery Launch'));

    // 2. Add Tag
    const resTag = await conversationalAssetAssistantService.processQuery({
      workspaceId: wsId,
      userId,
      userRole: 'member',
      query: 'Add tag seasonal-pack to the packaging asset',
    });

    assert.ok(resTag.actionExecuted);
    assert.equal(resTag.actionExecuted.actionType, 'ADD_TAGS');
    assert.ok(resTag.message.content.includes('seasonal-pack'));

    // 3. Create Review Task
    const resTask = await conversationalAssetAssistantService.processQuery({
      workspaceId: wsId,
      userId,
      userRole: 'member',
      query: 'Create a review task for pre-press packaging',
    });

    assert.ok(resTask.actionExecuted);
    assert.equal(resTask.actionExecuted.actionType, 'CREATE_REVIEW_TASK');
    assert.ok(resTask.message.content.includes('review task'));
  });

  // ===========================================================================
  // 5. CONFIRMATION AND SAFETY FLOW (TWO-STEP ACTION PROTOCOL)
  // ===========================================================================
  it('5. Enforces two-step confirmation protocol for sensitive bulk operations', async () => {
    // Create draft assets to archive
    const draft1 = await brandAssetRepository.create({
      workspaceId: wsId,
      businessId: wsId,
      name: 'Draft Label Variant A',
      category: 'Label',
      section: 'Active',
      status: 'draft',
      createdBy: userId,
    });
    const draft2 = await brandAssetRepository.create({
      workspaceId: wsId,
      businessId: wsId,
      name: 'Draft Label Variant B',
      category: 'Label',
      section: 'Active',
      status: 'draft',
      createdBy: userId,
    });

    // Step 1: Request bulk archival
    const initialRes = await conversationalAssetAssistantService.processQuery({
      workspaceId: wsId,
      userId,
      userRole: 'admin',
      query: 'Archive all draft label assets',
    });

    // Must NOT execute immediately — must return pending confirmation!
    assert.ok(initialRes.pendingConfirmation, 'Must return pending confirmation request');
    assert.ok(!initialRes.actionExecuted, 'Must NOT execute action immediately');
    assert.equal(initialRes.pendingConfirmation.actionType, 'BULK_ARCHIVE');
    assert.ok(initialRes.pendingConfirmation.affectedAssets.length > 0);
    assert.ok(initialRes.message.content.includes('sensitive operation'));

    const token = initialRes.pendingConfirmation.confirmationToken;

    // Step 2: Confirm action with confirmationToken
    const confirmedRes = await conversationalAssetAssistantService.processQuery({
      workspaceId: wsId,
      userId,
      userRole: 'admin',
      conversationId: initialRes.conversationId,
      query: 'Confirm',
      confirmationToken: token,
    });

    assert.ok(confirmedRes.actionExecuted, 'Action must be executed after confirmation');
    assert.equal(confirmedRes.actionExecuted.actionType, 'BULK_ARCHIVE');
    assert.equal(confirmedRes.actionExecuted.success, true);
    assert.ok(confirmedRes.message.content.includes('Action Confirmed and Executed'));

    // Verify assets are now archived in repository
    const archived1 = await brandAssetRepository.getById(wsId, draft1.assetId);
    assert.equal(archived1?.section, 'Archived');
  });

  // ===========================================================================
  // 6. PERMISSION ENFORCEMENT & FAILURE RECOVERY
  // ===========================================================================
  it('6. Enforces RBAC permissions and rejects unauthorized destructive operations', async () => {
    // Viewer role trying to archive
    await assert.rejects(
      async () => {
        await conversationalAssetAssistantService.processQuery({
          workspaceId: wsId,
          userId,
          userRole: 'viewer',
          query: 'Archive all draft assets',
        });
      },
      (err: any) => {
        assert.ok(err.message.includes('PERMISSION_DENIED'));
        return true;
      }
    );

    // Member role trying to execute permanent delete (requires admin or owner)
    await assert.rejects(
      async () => {
        await conversationalAssetAssistantService.processQuery({
          workspaceId: wsId,
          userId,
          userRole: 'member',
          query: 'Delete Solstice Primary Wordmark Logo permanently',
        });
      },
      (err: any) => {
        assert.ok(err.message.includes('PERMISSION_DENIED'));
        return true;
      }
    );
  });

  // ===========================================================================
  // 7. ABSOLUTE GUARDRAIL: STRICT VIDEO EXCLUSION
  // ===========================================================================
  it('7. Strictly intercepts and refuses video generation and editing requests', async () => {
    const res = await conversationalAssetAssistantService.processQuery({
      workspaceId: wsId,
      userId,
      userRole: 'admin',
      query: 'Generate a video promo reel in MP4 format for our dark chocolate',
    });

    assert.ok(res.message.content.includes('strictly excludes all AI video generation'));
    assert.ok(res.message.content.includes('Master Architectural Directives'));
    assert.ok(res.message.explainability.facts.some((f) => f.includes('excludes all video processing')));
    assert.equal(res.referencedAssets.length, 0);
  });
});
