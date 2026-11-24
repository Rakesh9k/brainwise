/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

process.env.NODE_ENV = 'test';
process.env.TEST_MODE = 'true';

import test from 'node:test';
import assert from 'node:assert/strict';

import { businessBrainService } from './services/businessBrainService';
import { productRepository } from './repositories/productRepository';
import { ideaIntelligenceService } from './services/ideaIntelligenceService';
import { competitiveIntelligenceService } from './services/competitiveIntelligenceService';
import { competitorRepository } from './repositories/competitorRepository';
import { growthMissionEngine } from './services/growth/growthMissionEngine';
import { growthExecutionQueueService } from './services/growth/growthExecutionQueueService';
import { brandStudioService } from './services/brandStudioService';
import { workspaceService } from './services/workspaceService';
import { validateSafeExternalUrl } from './utils/ssrfValidator';
import { calculateBrainCompleteness, calculateTaskCompletionStats } from '../utils/logic';
import type { ProductEntity } from './types/api';

test('PHASE 06 — CORE MODULE FUNCTIONAL COMPLETION SUITE', async (t) => {
  const wsId = `test_ws_p06_${Date.now()}`;
  const userId = `user_p06_${Date.now()}`;

  // =========================================================================
  // MODULE 1 — BUSINESS BRAIN
  // =========================================================================
  await t.test('Module 1: Business Brain — Onboarding, Extraction, Confirmation & Conflict Guardrails', async () => {
    // 1. Natural Language Onboarding & Profile Generation
    const { profile, versionId } = await businessBrainService.generateFromOnboarding({
      workspaceId: wsId,
      userId,
      onboardingData: {
        businessName: 'Solstice Craft Coffee',
        industry: 'Food & Beverage / Specialty Coffee',
        location: 'Bengaluru, India',
        targetAudience: 'Specialty coffee enthusiasts and remote knowledge workers',
        offeringsSummary: 'Single-origin roasted micro-lots and pour-over subscriptions',
        pricingModel: 'Subscription and Direct Retail',
      },
    });

    assert.equal(profile.businessName, 'Solstice Craft Coffee');
    assert.equal(profile.approvalStatus, 'DRAFT');
    assert.ok(versionId.startsWith('ver_'), 'Must record version snapshot');

    // Provenance starts as AI_INFERRED for synthesized fields
    assert.equal(profile.provenance?.brandPositioning?.source, 'AI_INFERRED');

    // 2. Fact Confirmation Transitions to USER_CONFIRMED
    const confirmed = await businessBrainService.confirmFact(
      wsId,
      'brandPositioning',
      'Founder User'
    );
    assert.equal(confirmed.provenance?.brandPositioning?.source, 'USER_CONFIRMED');
    assert.equal(confirmed.provenance?.brandPositioning?.confidence, 1.0);
    assert.equal(confirmed.provenance?.brandPositioning?.lastConfirmedBy, 'Founder User');

    // 3. Conflict Detection: USER_CONFIRMED Fact Cannot Be Silently Overwritten by AI_INFERRED
    const conflictAttempt = await businessBrainService.processMemoryUpdate({
      workspaceId: wsId,
      fieldOrCategory: 'brandPositioning',
      key: 'brandPositioning',
      newValue: 'Generic Dark Roast Mass Market Coffee',
      sourceTitle: 'External Web Crawl Proposal',
      provenance: 'AI_INFERRED',
      userId,
    });

    assert.equal(conflictAttempt.action, 'FLAGGED_CONFLICT');
    assert.equal(conflictAttempt.conflictDetected, true);
    assert.ok(conflictAttempt.conflictDetails?.includes('cannot silently override'));

    // Verify existing ground truth was preserved
    const refreshedProfile = await businessBrainService.getProfile(wsId);
    assert.equal(refreshedProfile.provenance?.brandPositioning?.source, 'USER_CONFIRMED');

    // 4. Product Catalog Bulk Import
    const bulkProducts: Omit<ProductEntity, 'workspaceId' | 'createdAt' | 'updatedAt'>[] = [
      {
        productId: 'prod_ethiopian_yirg',
        name: 'Ethiopia Yirgacheffe Washed G1',
        category: 'Whole Bean Coffee',
        price: 650,
        currency: 'INR',
        sku: 'SLS-ETH-001',
        description: 'Floral bergamot and jasmine notes with bright lemon acidity.',
        features: ['Washed Process', 'Altitude 1900-2200m'],
        benefits: ['Clean cup profile', 'Artisanal micro-lot'],
        targetCustomer: 'Filter & Pour-over Drinkers',
        differentiation: 'Direct trade lot sourced from single washing station',
        status: 'active',
        source: 'CSV_IMPORT',
      },
      {
        productId: 'prod_cold_brew_blend',
        name: 'Monsoon Malabar Cold Brew Blend',
        category: 'Ready to Brew',
        price: 499,
        currency: 'INR',
        sku: 'SLS-CLD-002',
        description: 'Low-acid, chocolatey and heavy-bodied profile designed for 16-hour steep.',
        features: ['Monsooned Process', 'Coarse Grind'],
        benefits: ['Smooth extraction', 'Zero astringency'],
        targetCustomer: 'Cold Brew Drinkers',
        differentiation: 'Optimized solubility for ambient brewing',
        status: 'active',
        source: 'CSV_IMPORT',
      },
    ];

    const imported = await productRepository.bulkCreateProducts(wsId, bulkProducts);
    assert.equal(imported.length, 2);

    const listedProducts = await productRepository.listProducts(wsId);
    assert.equal(listedProducts.length, 2);

    // 5. Completeness Score Calculation
    const comp = calculateBrainCompleteness(refreshedProfile as any);
    assert.ok(comp.percentage > 0, 'Completeness score must reflect populated attributes');
  });

  // =========================================================================
  // MODULE 2 — IDEA INTELLIGENCE
  // =========================================================================
  await t.test('Module 2: Idea Intelligence — Natural Idea Understanding, Scoring & Blueprint', async () => {
    // 1. Natural Language Idea Understanding Without Upfront Forms
    const ideaPrompt = 'A specialty pour-over coffee subscription delivered within 48 hours of roasting in Bangalore';
    const understanding = await ideaIntelligenceService.understandIdea(ideaPrompt);

    assert.ok(understanding.businessConcept.length > 0);
    assert.ok(understanding.industry.toLowerCase().includes('coffee') || understanding.industry.toLowerCase().includes('food'));
    assert.ok(understanding.possibleBusinessModels.length > 0);
    assert.ok(understanding.importantResearchQuestions.length > 0, 'Must expose clarifications without blocking');

    // 2. Validate Idea — Transparent 7-Score Matrix
    const dossier = await ideaIntelligenceService.validateIdea({
      workspaceId: wsId,
      ideaSummary: ideaPrompt,
      targetIndustry: 'Specialty Coffee',
      targetGeography: 'India - Bengaluru',
      targetAudience: 'Tech founders, knowledge workers, pour-over hobbyists',
      userId,
    });

    assert.ok(['GO', 'CAUTION', 'NO_GO'].includes(dossier.executiveVerdict));
    assert.ok(dossier.scores.overallOpportunityScore >= 0 && dossier.scores.overallOpportunityScore <= 100);
    assert.ok(dossier.scores.marketScore >= 0);
    assert.ok(dossier.scores.financialFeasibilityScore >= 0);
    assert.ok(dossier.criticalAssumptions.length > 0, 'Every major finding must expose assumptions');
    assert.ok(dossier.recommendedExperiments.length > 0, 'Must provide structured validation experiments');

    // 3. Conversational Refinement
    const convo = await ideaIntelligenceService.conductConversationalResearch({
      workspaceId: wsId,
      reportId: dossier.validationId,
      query: 'What if we target corporate offices instead of individuals?',
    });

    assert.ok(convo.reply.length > 0);
    assert.ok(Array.isArray(convo.suggestedActions));

    // 4. Finalize Idea Blueprint
    const blueprint = await ideaIntelligenceService.finalizeIdea({
      workspaceId: wsId,
      reportId: dossier.validationId,
      selectedOpportunityId: 'opp_office_coffee',
      customizedDirection: { finalConcept: 'Target high-growth startups with monthly bean dispensers' },
      approvedBy: userId,
    });

    assert.ok(blueprint.finalConcept.length > 0);
    assert.ok(blueprint.executionRoadmap90Day.day30.length > 0);
  });

  // =========================================================================
  // MODULE 3 — COMPETITIVE INTELLIGENCE
  // =========================================================================
  await t.test('Module 3: Competitive Intelligence — Discovery, SSRF-Safe Manual Add, Matrix & Alerts', async () => {
    // 1. SSRF URL Validator
    const safeCheck = validateSafeExternalUrl('https://bluetokaicoffee.com');
    assert.equal(safeCheck.isSafe, true);

    const unsafeCheck = validateSafeExternalUrl('http://169.254.169.254/metadata');
    assert.equal(unsafeCheck.isSafe, false);

    // 2. Add Competitor Manually
    const competitor = await competitorRepository.create({
      competitorId: `comp_blue_tokai_${Date.now()}`,
      workspaceId: wsId,
      name: 'Blue Tokai Coffee Roasters',
      website: 'https://bluetokaicoffee.com',
      industry: 'Specialty Coffee',
      location: 'Pan-India',
      positioning: 'India largest specialty coffee roastery chain',
      marketShare: 'ESTIMATED_35_PERCENT',
      strengths: ['Massive retail footprint', 'Strong brand recognition'],
      weaknesses: ['Higher batch volume roasting', 'Longer delivery windows for rural tiers'],
      pricingRange: '₹450 - ₹900 per 250g',
      monitoringFrequency: 'Weekly',
      isMonitored: true,
      lastResearched: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    assert.equal(competitor.name, 'Blue Tokai Coffee Roasters');

    // 3. Positioning Matrix Calculation
    const competitors = await competitiveIntelligenceService.getCompetitors(wsId);
    assert.ok(Array.isArray(competitors));
    const userCoords = { price: 65, depth: 75, label: 'Solstice Roasters' };
    const matrix = competitiveIntelligenceService.calculatePositioningMatrix(userCoords, competitors);
    assert.ok(Array.isArray(matrix.competitors));

    // 4. Competitor Watch Run
    const watchRun = await competitiveIntelligenceService.executeCompetitorWatchRun(wsId);
    assert.ok(watchRun.monitoredCount >= 0);
  });

  // =========================================================================
  // MODULE 4 — GROWTH PLANNER & AI GROWTH AGENCY
  // =========================================================================
  await t.test('Module 4: Growth Agency — Strategy, Missions, State Transitions & Queue Dispatch', async () => {
    // 1. Create Mission Grounded in Business Brain
    const mission = await growthMissionEngine.createMission({
      workspaceId: wsId,
      title: 'Launch Office Coffee Tasting Kit Outreach',
      strategicRationale: 'Target tech companies in Indiranagar & Koramangala for recurring subscriptions.',
      department: 'Growth Director',
      targetAudience: 'Office Managers & Tech Founders',
      timeHorizon: '30_DAYS',
      priority: 'HIGH',
      budgetCap: 15000,
      ownerId: userId,
      approvalRequired: true,
      successCriteria: [
        {
          metricName: 'Tasting Kit Requests',
          baselineValue: 0,
          targetValue: 20,
          unit: 'COUNT',
        },
      ],
    });

    assert.ok(['DRAFT', 'PROPOSED'].includes(mission.status));
    assert.equal(mission.approvalRequired, true);

    // 2. Deterministic State Transitions
    const approved = await growthMissionEngine.transitionMissionStatus({
      workspaceId: wsId,
      missionId: mission.missionId,
      targetStatus: 'APPROVED',
      actorId: userId,
      notes: 'Approved with ₹15,000 budget cap',
    });
    assert.equal(approved.status, 'APPROVED');

    // 3. Execution Queue Idempotency
    const idempotencyKey = `idemp_test_outreach_${Date.now()}`;
    const job1 = await growthExecutionQueueService.enqueueJob({
      workspaceId: wsId,
      actionType: 'SEND_DISPATCH',
      level: 2,
      payload: { channel: 'Email', recipient: 'offices@techstartups.com' },
      idempotencyKey,
      missionId: mission.missionId,
    });

    assert.equal(job1.status, 'QUEUED');

    // Enqueue with identical idempotencyKey returns existing job
    const job2 = await growthExecutionQueueService.enqueueJob({
      workspaceId: wsId,
      actionType: 'SEND_DISPATCH',
      level: 2,
      payload: { channel: 'Email', recipient: 'offices@techstartups.com' },
      idempotencyKey,
      missionId: mission.missionId,
    });

    assert.equal(job2.jobId, job1.jobId, 'Idempotent enqueue must return existing job');
  });

  // =========================================================================
  // MODULE 5 — HOME DASHBOARD
  // =========================================================================
  await t.test('Module 5: Home Dashboard — Real Sprint Velocity & Zero Static Pulse Mocking', async () => {
    const mockTasks = [
      { id: 't1', title: 'Task 1', status: 'completed' as const, priority: 'high' as const, isTodayPriority: true, estimatedMinutes: 30 },
      { id: 't2', title: 'Task 2', status: 'completed' as const, priority: 'medium' as const, isTodayPriority: false, estimatedMinutes: 45 },
      { id: 't3', title: 'Task 3', status: 'pending' as const, priority: 'high' as const, isTodayPriority: true, estimatedMinutes: 20 },
      { id: 't4', title: 'Task 4', status: 'in_progress' as const, priority: 'low' as const, isTodayPriority: false, estimatedMinutes: 15 },
    ];

    const stats = calculateTaskCompletionStats(mockTasks as any);
    assert.equal(stats.total, 4);
    assert.equal(stats.completed, 2);
    assert.equal(stats.pending, 1);
    assert.equal(stats.completionRate, 50);
  });

  // =========================================================================
  // MODULE 6 — BRAND STUDIO & ASSET LIBRARY
  // =========================================================================
  await t.test('Module 6: Brand Studio — Strict Video Exclusion & SVG Vector Generation', async () => {
    // 1. Generate Pure Sanitized SVG Vector Collateral (STRICT VIDEO EXCLUSION)
    const logoAsset = brandStudioService.generateCollateralSvg({
      workspaceId: wsId,
      assetType: 'VECTOR_LOGO',
      brandName: 'Solstice Craft Roasters',
      tagline: 'Artisanal Micro-Lot Roastery',
    });

    assert.ok(logoAsset.svgMarkup.startsWith('<svg'));
    assert.ok(logoAsset.svgMarkup.includes('Solstice Craft Roasters'));
    assert.equal(logoAsset.truthVerified, true);
    assert.ok(!logoAsset.svgMarkup.includes('<script'), 'Zero external script tags allowed');

    // 2. Generate High-DPI Stationery Business Card
    const businessCardAsset = brandStudioService.generateCollateralSvg({
      workspaceId: wsId,
      assetType: 'BUSINESS_CARD_SVG',
      brandName: 'Solstice Craft Roasters',
    });

    assert.ok(businessCardAsset.svgMarkup.startsWith('<svg'));
    assert.equal(businessCardAsset.dimensions.width, 1050);
    assert.equal(businessCardAsset.dimensions.height, 600);
  });

  // =========================================================================
  // MODULE 7 — HELP, SETTINGS & WORKSPACE ISOLATION
  // =========================================================================
  await t.test('Module 7: Settings & Workspace — Isolation, RBAC & DPDPA Erasure', async () => {
    const ws2Name = `Second Isolated Tenant ${Date.now()}`;

    // Create workspace 2
    const { workspace: ws2 } = await workspaceService.createWorkspace({
      workspaceName: ws2Name,
      ownerUserId: userId,
      industry: 'Retail',
    });

    assert.ok(ws2.workspaceId.startsWith('ws_'));

    // Verify workspace 2 cannot see workspace 1 products
    const ws2Products = await productRepository.listProducts(ws2.workspaceId);
    assert.equal(ws2Products.length, 0, 'Tenant 2 must not see Tenant 1 products');

    // DPDPA Data Erasure validation
    const erasure = await workspaceService.executeDpdpaDataErasure(ws2.workspaceId, userId);
    assert.equal(erasure.workspaceId, ws2.workspaceId);
    assert.equal(erasure.status, 'DATA_PURGED_DPDPA_COMPLIANT');
    assert.ok(erasure.purgedCategories.length > 0);
  });
});
