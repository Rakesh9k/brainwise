/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { brandIntelligenceEngine } from './services/brandIntelligenceEngine';
import { brandStudioRepository } from './repositories/brandStudioRepository';
import { db } from './db/firestore';
import type { CreativeRefinementDirective } from './types/brandStudio';

describe('BRAND IDENTITY STUDIO — DEEP INTELLIGENCE & PRODUCTION TEST SUITE', () => {
  const testUserId = `user_bi_tester_${Date.now()}`;

  // ===========================================================================
  // 1. TEN CATEGORY VALIDATION & BUSINESS DISCOVERY
  // ===========================================================================

  it('1. Category 1: Premium Speciality Coffee — Discovery, Terroir & Farmgate Ethics', async () => {
    const ws = `ws_coffee_${Date.now()}`;
    const result = await brandIntelligenceEngine.discoverBusinessBrandProfile({
      workspaceId: ws,
      userId: testUserId,
      rawIdea: 'A speciality coffee roaster called Monsooned Peak roasting single-estate Chikmagalur beans with complete farmgate transparency',
      targetCategory: 'Speciality Coffee',
    });

    assert.equal(result.profile.brandName, 'Monsooned Peak');
    assert.ok(result.profile.pricePositioning.includes('₹'));
    assert.ok(result.profile.targetAudience.toLowerCase().includes('coffee'));
    assert.ok(result.hypothesesVsConfirmed.inferredHypotheses.length > 0);
    assert.ok(result.hypothesesVsConfirmed.needsValidation.some((v) => v.toLowerCase().includes('trademark')));

    // Generate Comprehensive Strategy
    const strat = await brandIntelligenceEngine.generateComprehensiveBrandStrategy({
      workspaceId: ws,
      userId: testUserId,
    });

    assert.equal(strat.foundations.brandArchetype, 'The Creator / The Explorer');
    assert.ok(strat.foundations.brandStory.includes('Chikmagalur'));
    assert.ok(strat.messaging.taglineOptions.length >= 3);
    assert.ok(strat.messaging.messagingPillars.some((p) => p.pillar.includes('Single-Estate')));
    assert.ok(strat.messaging.wordsToAvoid.includes('Instant'));
  });

  it('2. Category 2: Gen Z Clothing — Subversive Cultural Streetwear & Heavyweight Silhouettes', async () => {
    const ws = `ws_clothing_${Date.now()}`;
    const result = await brandIntelligenceEngine.discoverBusinessBrandProfile({
      workspaceId: ws,
      userId: testUserId,
      rawIdea: 'An independent youth streetwear label called Kaal Studio crafting 380 GSM heavyweight French terry garments inspired by South Asian brutalism',
      targetCategory: 'Streetwear Apparel',
    });

    assert.equal(result.profile.brandName, 'Kaal Studio');
    assert.ok(result.profile.pricePositioning.includes('1,800'));

    const strat = await brandIntelligenceEngine.generateComprehensiveBrandStrategy({
      workspaceId: ws,
      userId: testUserId,
    });

    assert.equal(strat.foundations.brandArchetype, 'The Rebel / The Artist');
    assert.ok(strat.messaging.vocabulary.includes('Heavyweight') || strat.messaging.vocabulary.includes('GSM'));
    assert.ok(strat.messaging.wordsToAvoid.includes('Fast Fashion'));
    assert.ok(strat.audience.customerPersonas.some((p) => p.name.includes('Kabir')));
  });

  it('3. Category 3: Chocolate / FMCG — Bean-to-Bar Transparency & Ethical Sourcing', async () => {
    const ws = `ws_choc_${Date.now()}`;
    const result = await brandIntelligenceEngine.discoverBusinessBrandProfile({
      workspaceId: ws,
      userId: testUserId,
      rawIdea: 'A craft bean-to-bar dark chocolate maker named Malabar Cacao sourcing from organic Idukki cacao farmers without palm oil or preservatives',
      targetCategory: 'Confectionery Chocolate',
    });

    assert.equal(result.profile.brandName, 'Malabar Cacao');
    assert.ok(result.profile.pricePositioning.includes('320'));

    const strat = await brandIntelligenceEngine.generateComprehensiveBrandStrategy({
      workspaceId: ws,
      userId: testUserId,
    });

    assert.ok(strat.foundations.brandPositioning.length > 10);
    assert.ok(strat.messaging.valueProposition.length > 10);
  });

  it('4. Category 4: Beauty & Skincare — Clinical Biomimetic Actives & Adaptogenic Calm', async () => {
    const ws = `ws_skin_${Date.now()}`;
    const result = await brandIntelligenceEngine.discoverBusinessBrandProfile({
      workspaceId: ws,
      userId: testUserId,
      rawIdea: 'A clean dermatological skincare brand named DermaSutra uniting peptide science with cold-pressed gotu kola for barrier repair',
      targetCategory: 'Skincare',
    });

    assert.equal(result.profile.brandName, 'DermaSutra');
    assert.ok(result.profile.industry.toLowerCase().includes('beauty') || result.profile.industry.toLowerCase().includes('skincare'));
  });

  it('5. Category 5: Experiential Restaurant — Regional Culinary Narrative & Restorative Space', async () => {
    const ws = `ws_rest_${Date.now()}`;
    const result = await brandIntelligenceEngine.discoverBusinessBrandProfile({
      workspaceId: ws,
      userId: testUserId,
      rawIdea: 'An upscale micro-regional coastal dining room named Samudra Table offering heirloom Konkan recipes in an architectural stone sanctuary',
      targetCategory: 'Restaurant',
    });

    assert.equal(result.profile.brandName, 'Samudra Table');
    assert.ok(result.profile.pricePositioning.includes('Cover') || result.profile.pricePositioning.includes('₹'));
  });

  it('6. Category 6: Craft Soft Drinks — Botanical Tonics & Cold-Pressed Real Fruit', async () => {
    const ws = `ws_drink_${Date.now()}`;
    const result = await brandIntelligenceEngine.discoverBusinessBrandProfile({
      workspaceId: ws,
      userId: testUserId,
      rawIdea: 'A botanical sparkling soda called Botanica Fizz using real Alphonso puree and wild Himalayan herbs with zero refined sugar',
      targetCategory: 'Craft Beverages',
    });

    assert.equal(result.profile.brandName, 'Botanica Fizz');
    assert.ok(result.profile.pricePositioning.includes('330ml') || result.profile.pricePositioning.includes('₹'));
  });

  it('7. Category 7: Technology Startup — Verifiable B2B Intelligence & TopoGrid Precision', async () => {
    const ws = `ws_tech_${Date.now()}`;
    const result = await brandIntelligenceEngine.discoverBusinessBrandProfile({
      workspaceId: ws,
      userId: testUserId,
      rawIdea: 'An autonomous enterprise data monitoring platform called VectraPulse delivering real-time telemetry anomaly detection',
      targetCategory: 'B2B Software & AI',
    });

    assert.equal(result.profile.brandName, 'VectraPulse');
    assert.ok(result.profile.pricePositioning.includes('SaaS') || result.profile.pricePositioning.includes('₹'));
  });

  it('8. Category 8: Contemporary Jewellery — Recycled Solid Gold & Conflict-Free Provenance', async () => {
    const ws = `ws_jewel_${Date.now()}`;
    const result = await brandIntelligenceEngine.discoverBusinessBrandProfile({
      workspaceId: ws,
      userId: testUserId,
      rawIdea: 'A modern fine jewellery atelier named Aurum Veda crafting architectural 18k solid recycled gold earrings with lab-grown diamonds',
      targetCategory: 'Fine Jewellery',
    });

    assert.equal(result.profile.brandName, 'Aurum Veda');
    assert.ok(result.profile.pricePositioning.includes('₹'));
  });

  it('9. Category 9: Luxury Aesthetic Salon — Trichological Scalp Rituals & Calm Space', async () => {
    const ws = `ws_salon_${Date.now()}`;
    const result = await brandIntelligenceEngine.discoverBusinessBrandProfile({
      workspaceId: ws,
      userId: testUserId,
      rawIdea: 'A brutalist hair atelier and scalp sanctuary named Studio Kanso providing personalized Japanese head spas and master scissor cuts',
      targetCategory: 'Luxury Salon',
    });

    assert.equal(result.profile.brandName, 'Studio Kanso');
    assert.ok(result.profile.pricePositioning.includes('₹'));
  });

  it('10. Category 10: Healthcare Services — Preventative Diagnostics & Value-Based Care', async () => {
    const ws = `ws_health_${Date.now()}`;
    const result = await brandIntelligenceEngine.discoverBusinessBrandProfile({
      workspaceId: ws,
      userId: testUserId,
      rawIdea: 'A preventative health and metabolic care clinic named Aegis Health pairing continuous glucose monitoring with dedicated physician coaching',
      targetCategory: 'Clinical Healthcare',
    });

    assert.equal(result.profile.brandName, 'Aegis Health');
    assert.ok(result.profile.pricePositioning.includes('Subscription') || result.profile.pricePositioning.includes('₹'));
  });

  // ===========================================================================
  // 2. DISCOVERY VARIATIONS & PROVENANCE HANDLING
  // ===========================================================================

  it('11. Handles missing info gracefully by prompting targeted clarification questions', async () => {
    const ws = `ws_missing_${Date.now()}`;
    // Intentionally pass empty rawIdea and no industry/category
    const result = await brandIntelligenceEngine.discoverBusinessBrandProfile({
      workspaceId: ws,
      userId: testUserId,
    });

    assert.ok(result.profile.missingInformation.length > 0);
    assert.equal(result.profile.missingInformation[0].field, 'industry');
    assert.equal(result.profile.missingInformation[0].importance, 'CRITICAL');
    assert.equal(result.profile.status, 'NEEDS_INPUT');
  });

  it('12. Preserves and tags existing brand assets provided by an established business', async () => {
    const ws = `ws_existing_assets_${Date.now()}`;
    const assets = [
      { type: 'LOGO_VECTOR', url: 'https://storage.example.com/logo.svg', notes: 'Primary SVG logo' },
      { type: 'PACKAGING_DIE', url: 'https://storage.example.com/die.pdf', notes: 'Box die-cut specs' },
    ];

    const result = await brandIntelligenceEngine.discoverBusinessBrandProfile({
      workspaceId: ws,
      userId: testUserId,
      rawIdea: 'Refining our established brand identity for Urban Roast',
      existingBrandAssets: assets,
      targetCategory: 'Coffee',
    });

    assert.ok(result.hypothesesVsConfirmed.confirmedFacts.some((f) => f.includes('2 verified existing brand assets')));
    assert.equal(result.profile.provenance.assetCount, 2);
  });

  // ===========================================================================
  // 3. 12-DIMENSION COMPETITOR VISUAL TEARDOWNS & ANTI-IMITATION RULE
  // ===========================================================================

  it('13. Performs 12-dimension competitor teardowns, distinguishing verified facts vs hypotheses and enforcing anti-imitation', async () => {
    const ws = `ws_cva_${Date.now()}`;
    await brandIntelligenceEngine.discoverBusinessBrandProfile({
      workspaceId: ws,
      userId: testUserId,
      rawIdea: 'Monsooned Peak Coffee Roasters',
      targetCategory: 'Speciality Coffee',
    });

    const teardowns = await brandIntelligenceEngine.analyzeCompetitorVisualTeardowns({
      workspaceId: ws,
    });

    assert.ok(teardowns.analyses.length >= 2);
    const comp1 = teardowns.analyses[0];

    // Verify 12 dimensions
    assert.ok(comp1.logoStyle.length > 5, 'Dimension 1: logoStyle');
    assert.ok(comp1.colorPalette.primary, 'Dimension 2: colorPalette');
    assert.ok(comp1.typographyStyle.length > 3, 'Dimension 3: typographyStyle');
    assert.ok(comp1.packagingStyle.length > 3, 'Dimension 4: packagingStyle');
    assert.ok(comp1.websiteAesthetic.length > 3, 'Dimension 5: websiteAesthetic');
    assert.ok(comp1.socialMediaStyle.length > 3, 'Dimension 6: socialMediaStyle');
    assert.ok(comp1.visualPositioning.length > 3, 'Dimension 7: visualPositioning');
    assert.ok(comp1.sourceReferences.length >= 1, 'Dimension 8: sourceReferences');
    assert.ok(comp1.observationDate, 'Dimension 9: observationDate');
    assert.ok(comp1.confidenceLevel >= 0.8, 'Dimension 10: confidenceLevel');
    assert.ok(comp1.contrarianOpportunities.length > 0, 'Dimension 11: contrarianOpportunities');
    assert.ok(comp1.contrarianOpportunities.some((o) => o.includes('Anti-Imitation Directive')), 'Dimension 12: Anti-Imitation Rule');

    assert.ok(teardowns.overusedApproaches.length > 0);
    assert.ok(teardowns.underservedDirections.length > 0);
    assert.ok(teardowns.categoryExpectations.length > 0);
  });

  // ===========================================================================
  // 4. VISUAL WHITESPACE & DIFFERENTIATION ENGINE
  // ===========================================================================

  it('14. Identifies actionable visual whitespace specific to the business category', async () => {
    const ws = `ws_white_${Date.now()}`;
    await brandIntelligenceEngine.discoverBusinessBrandProfile({
      workspaceId: ws,
      userId: testUserId,
      rawIdea: 'Monsooned Peak Single Estate Coffee',
      targetCategory: 'Speciality Coffee',
    });

    const whitespace = await brandIntelligenceEngine.identifyVisualWhitespace({
      workspaceId: ws,
      category: 'Speciality Coffee',
    });

    assert.ok(whitespace.recommendedVisualDirection.includes('Indian Estate') || whitespace.recommendedVisualDirection.includes('Western Ghats'));
    assert.ok(whitespace.whyItWorks.length > 20);
    assert.ok(whitespace.targetAudienceRelevance.length > 20);
    assert.ok(whitespace.potentialAdvantages.length >= 2);
    assert.ok(whitespace.practicalExecutionGuidelines.some((g) => g.includes('Plus Jakarta Sans') || g.includes('Charcoal')));
    assert.ok(whitespace.nonNegotiableCategoryExpectations.some((e) => e.toLowerCase().includes('roast')));
  });

  // ===========================================================================
  // 5. THREE GENUINELY DIFFERENT CREATIVE DIRECTIONS
  // ===========================================================================

  it('15. Generates three distinct creative directions maintaining mathematical 1.25 modular scale', async () => {
    const ws = `ws_dirs_${Date.now()}`;
    await brandIntelligenceEngine.discoverBusinessBrandProfile({
      workspaceId: ws,
      userId: testUserId,
      rawIdea: 'Kaal Studio Streetwear',
      targetCategory: 'Clothing',
    });

    const directions = await brandIntelligenceEngine.generateThreeCreativeDirections({
      workspaceId: ws,
      userId: testUserId,
    });

    assert.equal(directions.length, 3);

    // Direction 1: Minimalist Architectural
    assert.equal(directions[0].styleArchetype, 'Architectural Minimalist');
    assert.equal(directions[0].typographyRecommendations.ratio, 1.25);
    assert.equal(directions[0].colorRecommendations.primary, '#171717');

    // Direction 2: Expressive Editorial
    assert.equal(directions[1].styleArchetype, 'Expressive Editorial');
    assert.equal(directions[1].typographyRecommendations.ratio, 1.25);
    assert.notEqual(directions[1].colorRecommendations.primary, directions[0].colorRecommendations.primary);

    // Direction 3: Botanical / Tactile Craft
    assert.equal(directions[2].styleArchetype, 'Botanical Craft');
    assert.equal(directions[2].typographyRecommendations.ratio, 1.25);
    assert.notEqual(directions[2].colorRecommendations.primary, directions[1].colorRecommendations.primary);

    // Verify persistence in repository
    const retrieved = await brandStudioRepository.listCreativeDirections(ws);
    assert.equal(retrieved.length, 3);
  });

  // ===========================================================================
  // 6. VISUAL MOODBOARDS WITH PURE SVG MOTIFS & ZERO VIDEO
  // ===========================================================================

  it('16. Generates visual moodboard with pure SVG vector motifs and certifies Strict Video Exclusion', async () => {
    const ws = `ws_mb_${Date.now()}`;
    const dirs = await brandIntelligenceEngine.generateThreeCreativeDirections({
      workspaceId: ws,
      userId: testUserId,
    });

    const moodboard = await brandIntelligenceEngine.generateVisualMoodboard({
      workspaceId: ws,
      direction: directionsCheck(dirs[0]),
    });

    function directionsCheck(d: any) {
      return d;
    }

    assert.ok(moodboard.moodboardId.startsWith('vmb_'));
    assert.equal(moodboard.workspaceId, ws);
    assert.equal(moodboard.colorInspiration.length, 5);
    assert.ok(moodboard.typographyReferences.styleDescription.includes('1.25'));

    // Verify SVG Motifs
    assert.ok(moodboard.graphicMotifs.length >= 3);
    for (const motif of moodboard.graphicMotifs) {
      assert.ok(motif.svgMarkup.startsWith('<svg'), 'Motif must be pure SVG markup');
      assert.ok(motif.svgMarkup.endsWith('</svg>'), 'Motif must terminate SVG markup cleanly');
      assert.ok(!motif.svgMarkup.includes('<script'), 'Zero malicious or active scripts');
      assert.ok(!motif.svgMarkup.includes('<video'), 'STRICT VIDEO EXCLUSION: No video tags');
    }

    // Verify Materials and Textures
    assert.ok(moodboard.textureReferences.length >= 3);
    assert.ok(moodboard.materialInspiration.length >= 3);
    assert.ok(moodboard.packagingInspiration.structure.length > 5);

    // Verify repository persistence
    const saved = await brandStudioRepository.getMoodboard(ws, moodboard.moodboardId);
    assert.ok(saved);
    assert.equal(saved?.moodboardId, moodboard.moodboardId);
  });

  // ===========================================================================
  // 7. BRAND POSITIONING & COMPETITOR MAP (2D STRATEGIC AXES)
  // ===========================================================================

  it('17. Generates 2D positioning map with whitespace quadrants and estimated competitor coordinates', async () => {
    const ws = `ws_pos_${Date.now()}`;
    await brandIntelligenceEngine.discoverBusinessBrandProfile({
      workspaceId: ws,
      userId: testUserId,
      rawIdea: 'Monsooned Peak Coffee Roasters',
      targetCategory: 'Speciality Coffee',
    });

    const posMap = await brandIntelligenceEngine.generatePositioningMap({
      workspaceId: ws,
      category: 'Speciality Coffee',
    });

    assert.ok(posMap.mapId.startsWith('pmap_'));
    assert.ok(posMap.xAxis.label.length > 5);
    assert.ok(posMap.yAxis.label.length > 5);
    assert.ok(posMap.userPlacement.x > 70 && posMap.userPlacement.y > 70, 'User brand placed in high-integrity quadrant');
    assert.equal(posMap.userPlacement.isEstimated, false);

    assert.ok(posMap.competitorPlacements.length >= 2);
    for (const comp of posMap.competitorPlacements) {
      assert.equal(comp.isEstimated, true, 'Competitor coordinates explicitly marked as estimated');
      assert.ok(comp.x >= 0 && comp.x <= 100);
      assert.ok(comp.y >= 0 && comp.y <= 100);
    }

    assert.ok(posMap.whitespaceQuadrants.length > 0);
    assert.ok(posMap.strategicUtilityExplanation.length > 20);

    const saved = await brandStudioRepository.getLatestPositioningMap(ws);
    assert.ok(saved);
    assert.equal(saved?.mapId, posMap.mapId);
  });

  // ===========================================================================
  // 8. BRAND STRATEGY VALIDATION (8-POINT SCORE MATRIX)
  // ===========================================================================

  it('18. Evaluates brand strategy across 8+ dimensions, returning scores and mandatory legal trademark disclaimer', async () => {
    const ws = `ws_val_${Date.now()}`;
    await brandIntelligenceEngine.discoverBusinessBrandProfile({
      workspaceId: ws,
      userId: testUserId,
      rawIdea: 'Monsooned Peak Coffee Roasters',
      targetCategory: 'Speciality Coffee',
    });

    const validation = await brandIntelligenceEngine.validateBrandStrategy({
      workspaceId: ws,
    });

    assert.ok(validation.validationId.startsWith('bval_'));
    assert.ok(validation.overallSuitabilityScore >= 80, 'High overall suitability');

    // Check all evaluation dimensions
    assert.ok(validation.evaluations.targetAudienceSuitability.score >= 80);
    assert.ok(validation.evaluations.categoryRelevance.score >= 80);
    assert.ok(validation.evaluations.differentiation.score >= 80);
    assert.ok(validation.evaluations.memorability.score >= 80);
    assert.ok(validation.evaluations.scalability.score >= 80);
    assert.ok(validation.evaluations.culturalAppropriateness.score >= 80);
    assert.ok(validation.evaluations.pricePositioning.score >= 80);
    assert.ok(validation.evaluations.productCompatibility.score >= 80);

    assert.ok(validation.strengths.length >= 3);
    assert.ok(validation.weaknesses.length >= 1);
    assert.ok(validation.recommendations.length >= 2);

    // Check Mandatory Trademark Disclaimer
    assert.ok(
      validation.trademarkDisclaimer.includes('DISCLAIMER') &&
      validation.trademarkDisclaimer.includes('trademark') &&
      validation.trademarkDisclaimer.includes('attorney'),
      'Must contain explicit trademark legal disclaimer'
    );

    const saved = await brandStudioRepository.getLatestValidationResult(ws);
    assert.ok(saved);
    assert.equal(saved?.validationId, validation.validationId);
  });

  // ===========================================================================
  // 9. CONVERSATIONAL AI CREATIVE DIRECTOR REFINEMENTS
  // ===========================================================================

  it('19. Executes conversational refinement directives while preserving underlying approved facts', async () => {
    const ws = `ws_refine_${Date.now()}`;
    await brandIntelligenceEngine.discoverBusinessBrandProfile({
      workspaceId: ws,
      userId: testUserId,
      rawIdea: 'Monsooned Peak Coffee Roasters',
      targetCategory: 'Speciality Coffee',
    });

    const dirs = await brandIntelligenceEngine.generateThreeCreativeDirections({
      workspaceId: ws,
      userId: testUserId,
    });
    const baseDir = dirs[0];

    // Directive 1: MORE_PREMIUM
    const ref1 = await brandIntelligenceEngine.refineCreativeDirection({
      workspaceId: ws,
      userId: testUserId,
      directive: 'MORE_PREMIUM',
      targetDirectionId: baseDir.directionId,
    });
    assert.ok(ref1.refinedDirection.title.includes('Ultra-Premium'));
    assert.equal(ref1.refinedDirection.colorRecommendations.primary, '#0D0D0D');
    assert.equal(ref1.refinedDirection.colorRecommendations.accent, '#D4AF37');
    assert.ok(ref1.refinedDirection.packagingDirection.finish.includes('Gold Foil'));

    // Directive 2: STRONGER_INDIAN_IDENTITY
    const ref2 = await brandIntelligenceEngine.refineCreativeDirection({
      workspaceId: ws,
      userId: testUserId,
      directive: 'STRONGER_INDIAN_IDENTITY',
      targetDirectionId: baseDir.directionId,
    });
    assert.ok(ref2.refinedDirection.title.includes('Deep Indian Heritage'));
    assert.equal(ref2.refinedDirection.colorRecommendations.secondary, '#7C2D12'); // Terracotta
    assert.equal(ref2.refinedDirection.colorRecommendations.accent, '#D97706');    // Saffron Amber
    assert.ok(ref2.refinedDirection.visualMetaphor.includes('Western Ghats') || ref2.refinedDirection.visualMetaphor.includes('Chettinad'));

    // Directive 3: MORE_YOUTHFUL
    const ref3 = await brandIntelligenceEngine.refineCreativeDirection({
      workspaceId: ws,
      userId: testUserId,
      directive: 'MORE_YOUTHFUL',
      targetDirectionId: baseDir.directionId,
    });
    assert.ok(ref3.refinedDirection.title.includes('Youth'));
    assert.equal(ref3.refinedDirection.colorRecommendations.accent, '#10B981'); // Mint

    // Directive 4: CUSTOM
    const ref4 = await brandIntelligenceEngine.refineCreativeDirection({
      workspaceId: ws,
      userId: testUserId,
      directive: 'CUSTOM',
      customPrompt: 'Emphasize night-harvested moonlit beans and starry indigo hues',
      targetDirectionId: baseDir.directionId,
    });
    assert.ok(ref4.refinedDirection.rationale.includes('moonlit beans'));
  });

  // ===========================================================================
  // 10. MULTI-TENANT ISOLATION
  // ===========================================================================

  it('20. Enforces strict multi-tenant isolation across all brand identity entities', async () => {
    const ws1 = `ws_iso_1_${Date.now()}`;
    const ws2 = `ws_iso_2_${Date.now()}`;

    // Seed Profile 1 in ws1
    await brandIntelligenceEngine.discoverBusinessBrandProfile({
      workspaceId: ws1,
      userId: testUserId,
      rawIdea: 'Brand 1 in Tenant A',
    });

    // Seed Profile 2 in ws2
    await brandIntelligenceEngine.discoverBusinessBrandProfile({
      workspaceId: ws2,
      userId: testUserId,
      rawIdea: 'Brand 2 in Tenant B',
    });

    const prof1 = await brandStudioRepository.getProfile(ws1);
    const prof2 = await brandStudioRepository.getProfile(ws2);

    assert.ok(prof1);
    assert.ok(prof2);
    assert.equal(prof1?.workspaceId, ws1);
    assert.equal(prof2?.workspaceId, ws2);
    assert.notEqual(prof1?.brandName, prof2?.brandName);

    // Verify moodboards isolated
    const dirs1 = await brandIntelligenceEngine.generateThreeCreativeDirections({
      workspaceId: ws1,
      userId: testUserId,
    });
    await brandIntelligenceEngine.generateVisualMoodboard({
      workspaceId: ws1,
      direction: dirs1[0],
    });

    const mbListWs1 = await brandStudioRepository.listMoodboards(ws1);
    const mbListWs2 = await brandStudioRepository.listMoodboards(ws2);

    assert.equal(mbListWs1.length, 1);
    assert.equal(mbListWs2.length, 0, 'Workspace 2 must have zero moodboards from Workspace 1');
  });
});
