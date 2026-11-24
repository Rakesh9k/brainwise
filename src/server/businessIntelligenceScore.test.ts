/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { db } from './db/firestore';
import { businessIntelligenceScoreService } from './services/businessIntelligenceScoreService';
import { workspaceService } from './services/workspaceService';
import { businessBrainService } from './services/businessBrainService';
import { productRepository } from './repositories/productRepository';
import { documentRepository } from './repositories/documentRepository';
import { brandIdentityRepository } from './repositories/brandIdentityRepository';
import { goalRepository, competitorRepository } from './repositories/goalRepository';
import {
  calculateBusinessIntelligenceScore,
  DEFAULT_INTELLIGENCE_WEIGHTS,
} from '../utils/intelligenceScore';

test('ANTIGRAVITY ACCEPTANCE TEST 1: Empty business profile', async () => {
  db.resetForTesting();

  const { workspace } = await workspaceService.createWorkspace({
    ownerUserId: 'user_empty_01',
    workspaceName: '',
    industry: '',
  });
  const wsId = workspace.workspaceId;

  // Score an empty profile directly and via service
  const score = await businessIntelligenceScoreService.calculateAndSaveScore(wsId, {
    triggerEvent: 'EMPTY_PROFILE_TEST',
  });

  assert.ok(score);
  assert.equal(typeof score.overallScore, 'number');
  assert.ok(!isNaN(score.overallScore));
  assert.ok(score.overallScore <= 30, `Expected low baseline score, got ${score.overallScore}`);
  assert.equal(score.grade, 'F');
  assert.equal(score.readinessLabel, 'Action Required');
  assert.ok(score.criticalMissingCount >= 3, 'Should detect multiple critical missing fields');
  assert.ok(score.topRecommendations.length > 0, 'Should provide actionable recommendations');
  assert.equal(score.dimensions.productService.score, 0, 'Products should score 0 when empty');
});

test('ANTIGRAVITY ACCEPTANCE TEST 2: Partially completed profile', async () => {
  db.resetForTesting();

  const { workspace } = await workspaceService.createWorkspace({
    ownerUserId: 'user_partial_01',
    workspaceName: 'Nordic Roast Lab',
    industry: 'Food & Beverage',
  });
  const wsId = workspace.workspaceId;

  // Add basic identity and 1 product
  await businessBrainService.updateProfile(wsId, {
    location: 'Copenhagen, Denmark',
    overviewSummary: 'Artisanal roastery supplying sustainably sourced beans to boutique cafes.',
    valueProposition: 'Single-origin traceability roasted on energy-efficient bellwether machines.',
  });

  await productRepository.createProduct({
    productId: 'prod_part_1',
    workspaceId: wsId,
    name: 'Ethiopian Yirgacheffe',
    category: 'Whole Bean',
    description: 'Floral and citrus notes with washed process.',
    price: 22,
    currency: 'EUR',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as any);

  await businessBrainService.confirmFact(wsId, 'businessName', 'Founder');

  const score = await businessIntelligenceScoreService.calculateAndSaveScore(wsId);

  assert.ok(
    score.overallScore > 20,
    `Expected score > 20 for partial profile, got ${score.overallScore}`
  );
  assert.ok(
    score.dimensions.businessIdentity.score >= 40,
    'Identity dimension should be partially scored'
  );
  assert.ok(
    score.dimensions.productService.score > 30,
    'Product dimension should reflect added product'
  );
});

test('ANTIGRAVITY ACCEPTANCE TEST 3: Fully completed profile', async () => {
  db.resetForTesting();

  const { workspace } = await workspaceService.createWorkspace({
    ownerUserId: 'user_full_01',
    workspaceName: 'Apex Logistics SaaS',
    industry: 'Supply Chain Software',
  });
  const wsId = workspace.workspaceId;

  // 1. Identity & Provenance
  await businessBrainService.updateProfile(wsId, {
    businessName: 'Apex Logistics Software Inc.',
    legalName: 'Apex Logistics Software Inc.',
    industry: 'Supply Chain Software',
    tagline: 'Autonomous freight dispatching powered by predictive route planning.',
    businessModel: 'B2B SaaS',
    revenueModel: 'Annual recurring subscription with usage-based volume tiers',
    stage: 'Growing Business',
    businessSize: '11-50 Employees',
    location: 'Chicago, IL, USA',
    operationType: 'online',
    website: 'https://apexlogistics.io',
    foundedYear: '2021',
    overviewSummary:
      'Apex Logistics coordinates intermodal freight for mid-market 3PLs, cutting empty deadhead miles by 34%.',
    valueProposition: 'Real-time dock appointment scheduling with verified carrier telematics.',
    targetAudience:
      'Third-party logistics dispatchers and freight brokers moving 500+ loads monthly across North America.',
    customerPersonas: [
      {
        id: 'pers_1',
        name: 'Freight Operations Director',
        segment: 'Mid-Market 3PL',
        ageOrFirmographics: 'Fleet of 50-250 tractor trailers',
        painPoints: ['Manual phone check calls', 'Detention fees from delayed dock arrivals'],
        buyingTriggers: ['Automated EDI 214 status pushes', 'TMS API integration'],
        willingnessToPay: '$1,500/month per terminal',
      },
    ],
    primaryGoals: ['Achieve $5M ARR by Q4', 'Reduce carrier onboarding time to under 15 minutes'],
    resourcesAndConstraints: {
      marketingBudget: { monthly: 15000, annual: 180000, currency: 'USD' },
      operatingCapacity: 'Up to 2,500 daily active dispatched loads',
    },
  });

  // Confirm identity facts
  await businessBrainService.confirmFact(wsId, 'businessName', 'Founder');
  await businessBrainService.confirmFact(wsId, 'valueProposition', 'Founder');
  await businessBrainService.confirmFact(wsId, 'location', 'Founder');
  await businessBrainService.confirmFact(wsId, 'overviewSummary', 'Founder');

  // 2. Products
  await productRepository.createProduct({
    productId: 'prod_dispatch_core',
    workspaceId: wsId,
    name: 'Apex Dispatch Core',
    category: 'Software Platform',
    description:
      'Automated carrier load matching with live GPS tracking and automated rate confirmation generation.',
    price: 1200,
    currency: 'USD',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as any);

  // 3. Brand Identity
  await brandIdentityRepository.save({
    brandIdentityId: 'brand_apex_01',
    workspaceId: wsId,
    version: 1,
    voice: ['authoritative', 'precision-driven', 'reliable'],
    tone: ['direct', 'pragmatic'],
    uniqueSellingProposition:
      'The only logistics intelligence engine with verified 1-minute rate confirmations.',
    visualGuidelines: 'Clean industrial aesthetic, enterprise slate navy with amber signal accent.',
    updatedAt: new Date().toISOString(),
  } as any);

  // 4. Goals
  await goalRepository.create({
    goalId: 'goal_arr_5m',
    workspaceId: wsId,
    title: 'Scale ARR to $5,000,000',
    description: 'Grow contract subscription base across mid-market logistics brokers',
    category: 'revenue',
    currentValue: 3200000,
    targetValue: 5000000,
    unit: 'USD',
    startDate: new Date().toISOString(),
    targetDate: '2027-12-31',
    status: 'on_track',
    createdBy: 'user_full_01',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ownerUserId: 'user_full_01',
    progressPercentage: 64,
  });

  // 5. Competitors
  await competitorRepository.create({
    competitorId: 'comp_freight_rival',
    workspaceId: wsId,
    name: 'FreightPulse Technologies',
    priceRange: '$1,800 – $2,500 / month',
    strengths: ['Large legacy carrier network', 'Deep SAP integration'],
    weaknesses: ['Slow customer support', 'No real-time dynamic re-routing'],
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as any);
  await competitorRepository.create({
    competitorId: 'comp_load_track',
    workspaceId: wsId,
    name: 'LoadTrack Digital',
    priceRange: '$900 – $1,400 / month',
    strengths: ['Low price point'],
    weaknesses: ['Frequent API downtime', 'Limited carrier vetting tools'],
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as any);

  // 6. Supporting Document
  await documentRepository.createDocument({
    documentId: 'doc_apex_deck',
    workspaceId: wsId,
    name: 'Apex_Executive_Brief_2026.pdf',
    type: 'PDF',
    size: '2.4 MB',
    uploadedAt: new Date().toISOString(),
    usedByAI: true,
    status: 'verified',
    confidenceScore: 0.96,
  } as any);

  const fullScore = await businessIntelligenceScoreService.calculateAndSaveScore(wsId);

  assert.ok(
    fullScore.overallScore >= 75,
    `Expected comprehensive profile score >= 75, got ${fullScore.overallScore}`
  );
  assert.ok(
    fullScore.grade === 'A' || fullScore.grade === 'B',
    `Expected grade A or B, got ${fullScore.grade}`
  );
  assert.ok(fullScore.overallVerificationCoverage >= 60, 'Verification coverage should be robust');
  assert.equal(fullScore.criticalMissingCount, 0, 'No critical information should be missing');
});

test('ANTIGRAVITY ACCEPTANCE TEST 4: Unverified information penalty', async () => {
  const verifiedProfile = {
    businessName: 'BioHealth Labs',
    industry: 'Healthcare',
    location: 'Boston, MA',
    overviewSummary: 'Clinical diagnostics laboratory providing rapid blood biomarker analysis.',
    valueProposition: 'Same-day biomarker results validated against CLIA laboratory standards.',
    provenance: {
      businessName: { source: 'USER_CONFIRMED', confidence: 1.0 },
      valueProposition: { source: 'USER_CONFIRMED', confidence: 1.0 },
      overviewSummary: { source: 'USER_CONFIRMED', confidence: 1.0 },
      location: { source: 'USER_CONFIRMED', confidence: 1.0 },
    },
  };

  const unverifiedProfile = {
    ...verifiedProfile,
    provenance: {
      businessName: { source: 'AI_INFERRED', confidence: 0.6 },
      valueProposition: { source: 'AI_INFERRED', confidence: 0.5 },
      overviewSummary: { source: 'AI_INFERRED', confidence: 0.5 },
      location: { source: 'AI_INFERRED', confidence: 0.6 },
    },
  };

  const scoreVerified = calculateBusinessIntelligenceScore({
    workspaceId: 'ws_verif',
    profile: verifiedProfile,
  });

  const scoreUnverified = calculateBusinessIntelligenceScore({
    workspaceId: 'ws_unverif',
    profile: unverifiedProfile,
  });

  assert.ok(
    scoreVerified.dimensions.businessIdentity.verificationCoverage >
      scoreUnverified.dimensions.businessIdentity.verificationCoverage,
    'Verified profile must have higher verification coverage'
  );
  assert.ok(
    scoreVerified.dimensions.businessIdentity.score >
      scoreUnverified.dimensions.businessIdentity.score,
    'Verified profile must receive a higher dimension score than unverified'
  );
});

test('ANTIGRAVITY ACCEPTANCE TEST 5: Stale business information', async () => {
  const staleDate = new Date(Date.now() - 150 * 24 * 60 * 60 * 1000).toISOString(); // 150 days ago
  const freshDate = new Date().toISOString();

  const freshScore = calculateBusinessIntelligenceScore({
    workspaceId: 'ws_fresh',
    profile: {
      businessName: 'Fresh Corp',
      industry: 'Tech',
      location: 'Austin, TX',
      overviewSummary: 'High-velocity software development platform for regulated banks.',
      valueProposition: 'Instant compliance audits.',
      lastUpdated: freshDate,
    },
  });

  const staleScore = calculateBusinessIntelligenceScore({
    workspaceId: 'ws_stale',
    profile: {
      businessName: 'Stale Corp',
      industry: 'Tech',
      location: 'Austin, TX',
      overviewSummary: 'High-velocity software development platform for regulated banks.',
      valueProposition: 'Instant compliance audits.',
      lastUpdated: staleDate,
    },
  });

  assert.ok(
    freshScore.dimensions.businessIdentity.freshness >
      staleScore.dimensions.businessIdentity.freshness,
    'Fresh records must score higher freshness than records unupdated for 150 days'
  );
  assert.ok(staleScore.staleItemsCount > 0, 'Stale score must flag stale information warnings');
});

test('ANTIGRAVITY ACCEPTANCE TEST 6: Incorrect and invalid data penalties', async () => {
  const cleanScore = calculateBusinessIntelligenceScore({
    workspaceId: 'ws_clean',
    profile: {
      businessName: 'Clean Data Labs',
      industry: 'Analytics',
      location: 'Seattle, WA',
      overviewSummary: 'Enterprise data quality observatory.',
      valueProposition: 'Automated anomaly detection across distributed pipelines.',
      foundedYear: '2020',
    },
    products: [
      {
        name: 'Data Observability Agent',
        price: 250,
        description: 'Automated anomaly alerts across Snowflake and BigQuery',
      },
    ],
  });

  const corruptScore = calculateBusinessIntelligenceScore({
    workspaceId: 'ws_corrupt',
    profile: {
      businessName: 'Corrupt Data Labs',
      industry: 'Analytics',
      location: 'Seattle, WA',
      overviewSummary: 'Short', // < 25 chars triggers quality warning
      valueProposition: 'Automated anomaly detection across distributed pipelines.',
      foundedYear: '2099', // Future year triggers accuracy failure
    },
    products: [
      {
        name: 'Faulty Product',
        price: -50, // Negative price triggers alert
        description: '', // Missing description
      },
    ],
  });

  assert.ok(
    corruptScore.dataQualityIssuesCount >= 2,
    `Expected at least 2 data quality issues, found ${corruptScore.dataQualityIssuesCount}`
  );
  assert.ok(
    cleanScore.overallScore > corruptScore.overallScore,
    'Corrupt/invalid data must penalize the overall score'
  );
});

test('ANTIGRAVITY ACCEPTANCE TEST 7: Deleted product recalculation', async () => {
  db.resetForTesting();

  const { workspace } = await workspaceService.createWorkspace({
    ownerUserId: 'user_del_01',
    workspaceName: 'Roastery Collective',
    industry: 'Coffee',
  });
  const wsId = workspace.workspaceId;

  const prod = await productRepository.createProduct({
    productId: 'prod_to_delete',
    workspaceId: wsId,
    name: 'Specialty Cold Brew Keg',
    price: 95,
    category: 'Beverage',
    description: 'Nitrogen-infused cold brew keg for office kitchens.',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as any);

  const scoreWithProduct = await businessIntelligenceScoreService.calculateAndSaveScore(wsId);
  assert.ok(scoreWithProduct.dimensions.productService.score > 0);

  // Delete product
  await productRepository.deleteProduct(wsId, prod.productId);

  const scoreAfterDelete = await businessIntelligenceScoreService.calculateAndSaveScore(wsId, {
    triggerEvent: 'PRODUCT_DELETED',
  });

  assert.equal(
    scoreAfterDelete.dimensions.productService.score,
    0,
    'Product dimension score must drop to 0 after deleting only product'
  );
  assert.ok(
    scoreWithProduct.overallScore > scoreAfterDelete.overallScore,
    'Overall score must decrease upon deleting active catalogue product'
  );
});

test('ANTIGRAVITY ACCEPTANCE TEST 8: Newly uploaded document grounding', async () => {
  db.resetForTesting();

  const { workspace } = await workspaceService.createWorkspace({
    ownerUserId: 'user_doc_01',
    workspaceName: 'DocuBrand AI',
    industry: 'Marketing Technology',
  });
  const wsId = workspace.workspaceId;

  const scoreBeforeDoc = await businessIntelligenceScoreService.calculateAndSaveScore(wsId);

  await documentRepository.createDocument({
    documentId: 'doc_verified_01',
    workspaceId: wsId,
    name: 'Brand_Guidelines_And_Positioning_2026.pdf',
    type: 'PDF',
    size: '4.1 MB',
    uploadedAt: new Date().toISOString(),
    usedByAI: true,
    status: 'verified',
    confidenceScore: 0.94,
  } as any);

  const scoreAfterDoc = await businessIntelligenceScoreService.calculateAndSaveScore(wsId, {
    triggerEvent: 'DOCUMENT_UPLOADED',
  });

  assert.ok(
    scoreAfterDoc.dimensions.dataVerificationFreshness.evidenceAvailability >
      scoreBeforeDoc.dimensions.dataVerificationFreshness.evidenceAvailability,
    'Uploading grounded document must boost evidence availability'
  );
});

test('ANTIGRAVITY ACCEPTANCE TEST 9: Business profile update recalculation & versioning', async () => {
  db.resetForTesting();

  const { workspace } = await workspaceService.createWorkspace({
    ownerUserId: 'user_ver_01',
    workspaceName: 'Version Dynamics',
    industry: 'Operations',
  });
  const wsId = workspace.workspaceId;

  const v1 = await businessIntelligenceScoreService.calculateAndSaveScore(wsId, {
    triggerEvent: 'INITIAL',
  });
  assert.equal(v1.version, 1);

  await businessBrainService.updateProfile(wsId, {
    overviewSummary: 'Automated workflow execution engine for distributed operations teams.',
    valueProposition: 'Eliminates cross-team handoff delays through verified task routing.',
    location: 'Denver, CO',
  });

  const v2 = await businessIntelligenceScoreService.calculateAndSaveScore(wsId, {
    triggerEvent: 'PROFILE_UPDATED',
  });
  assert.equal(v2.version, 2);
  assert.ok(v2.scoreDelta !== undefined);
  assert.equal(v2.scoreDelta?.previousScore, v1.overallScore);
  assert.ok(v2.overallScore >= v1.overallScore);
});

test('ANTIGRAVITY ACCEPTANCE TEST 10: Recalculation accuracy and configurable weights', async () => {
  const profile = {
    businessName: 'Weight Test Corp',
    industry: 'Finance',
    location: 'New York, NY',
    overviewSummary: 'Autonomous underwriting platform for commercial loans.',
    valueProposition: 'Instant risk assessment on balance sheets.',
  };

  // Standard weights
  const defaultScore = calculateBusinessIntelligenceScore({
    workspaceId: 'ws_weights',
    profile,
    weights: DEFAULT_INTELLIGENCE_WEIGHTS,
  });

  // Custom weights heavily favoring business identity (80%) and productService (20%)
  const customScore = calculateBusinessIntelligenceScore({
    workspaceId: 'ws_weights',
    profile,
    weights: {
      businessIdentity: 80,
      productService: 20,
      customerIntelligence: 0,
      brandIntelligence: 0,
      goalsStrategy: 0,
      marketIntelligence: 0,
      resourcesConstraints: 0,
      dataVerificationFreshness: 0,
    },
  });

  const weightSum = Object.values(customScore.weights).reduce((a, b) => a + b, 0);
  assert.equal(weightSum, 100, 'Configurable weights must sum to exactly 100%');
  assert.notEqual(
    defaultScore.overallScore,
    customScore.overallScore,
    'Custom weights must influence the overall score'
  );
});

test('ANTIGRAVITY ACCEPTANCE TEST 11: Multi-tenant isolation', async () => {
  db.resetForTesting();

  // Create two distinct tenant workspaces
  const { workspace: wsA } = await workspaceService.createWorkspace({
    ownerUserId: 'owner_tenant_A',
    workspaceName: 'Tenant Alpha Biotech',
    industry: 'Biotechnology',
  });
  const { workspace: wsB } = await workspaceService.createWorkspace({
    ownerUserId: 'owner_tenant_B',
    workspaceName: 'Tenant Beta Retail',
    industry: 'Fashion Retail',
  });

  // Populate Tenant A with verified data
  await businessBrainService.updateProfile(wsA.workspaceId, {
    overviewSummary: 'CRISPR-based diagnostics for agricultural pathogen identification.',
    valueProposition: 'Field-deployable molecular assay kits.',
    location: 'Davis, CA',
  });
  await productRepository.createProduct({
    productId: 'prod_agri_1',
    workspaceId: wsA.workspaceId,
    name: 'PhytoCheck Portable Sequencer',
    price: 4500,
    category: 'Hardware',
    description: 'Handheld diagnostic device for vineyard virus detection',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as any);

  const scoreA = await businessIntelligenceScoreService.calculateAndSaveScore(wsA.workspaceId);
  const scoreB = await businessIntelligenceScoreService.calculateAndSaveScore(wsB.workspaceId);

  // Tenant B is empty and must NOT see Tenant A's products or profile
  assert.equal(scoreB.dimensions.productService.score, 0);
  assert.notEqual(scoreA.overallScore, scoreB.overallScore);
  assert.equal(scoreA.workspaceId, wsA.workspaceId);
  assert.equal(scoreB.workspaceId, wsB.workspaceId);

  // Tenant B history must be independent
  const histA = await businessIntelligenceScoreService.listScoreHistory(wsA.workspaceId);
  const histB = await businessIntelligenceScoreService.listScoreHistory(wsB.workspaceId);
  assert.equal(histA[0].workspaceId, wsA.workspaceId);
  assert.equal(histB[0].workspaceId, wsB.workspaceId);
});

test('ANTIGRAVITY ACCEPTANCE TEST 12: Score history maintenance and auditability', async () => {
  db.resetForTesting();

  const { workspace } = await workspaceService.createWorkspace({
    ownerUserId: 'user_hist_01',
    workspaceName: 'Continuum Robotics',
    industry: 'Robotics',
  });
  const wsId = workspace.workspaceId;

  // Calculation 1
  await businessIntelligenceScoreService.calculateAndSaveScore(wsId, {
    triggerEvent: 'INITIAL_EVAL',
  });

  // Calculation 2
  await businessBrainService.updateProfile(wsId, {
    location: 'Pittsburgh, PA',
    overviewSummary: 'Warehouse robotic arms for automated package sorting.',
  });
  await businessIntelligenceScoreService.calculateAndSaveScore(wsId, {
    triggerEvent: 'PROFILE_UPDATED',
  });

  // Calculation 3
  await productRepository.createProduct({
    productId: 'prod_arm_x1',
    workspaceId: wsId,
    name: 'Sorter Arm X1',
    price: 18000,
    category: 'Hardware',
    description: 'High-speed package induction robot',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as any);
  await businessIntelligenceScoreService.calculateAndSaveScore(wsId, {
    triggerEvent: 'PRODUCT_ADDED',
  });

  const history = await businessIntelligenceScoreService.listScoreHistory(wsId);

  assert.equal(history.length, 3, 'Should retain all 3 chronological version records');
  assert.equal(history[0].version, 3, 'History should be ordered desc with latest first');
  assert.equal(history[1].version, 2);
  assert.equal(history[2].version, 1);
  assert.equal(history[0].triggerEvent, 'PRODUCT_ADDED');
  assert.ok(
    history[0].deltaFromPrevious !== undefined,
    'Should calculate delta from previous version'
  );
});
