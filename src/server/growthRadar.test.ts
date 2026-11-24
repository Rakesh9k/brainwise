/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { db } from './db/firestore';
import { workspaceService } from './services/workspaceService';
import { businessBrainService } from './services/businessBrainService';
import { productRepository } from './repositories/productRepository';
import { goalRepository, competitorRepository } from './repositories/goalRepository';
import { growthRadarService } from './services/growthRadarService';
import { growthRadarRepository } from './repositories/growthRadarRepository';
import { departmentTaskRepository } from './repositories/departmentTaskRepository';
import { departmentEventBus, type DepartmentEvent } from './events/eventBus';
import { GROWTH_RADAR_DISCLAIMER } from '../types/growthRadar';

test('ANTIGRAVITY GROWTH RADAR TEST 1: Opportunity with strong evidence', async () => {
  db.resetForTesting();

  const { workspace } = await workspaceService.createWorkspace({
    ownerUserId: 'user_radar_01',
    workspaceName: 'AeroPulse Drones',
    industry: 'Autonomous Robotics',
  });
  const wsId = workspace.workspaceId;

  // Add verified offering
  await productRepository.createProduct({
    productId: 'prod_aero_surveyor',
    workspaceId: wsId,
    name: 'AeroPulse Surveyor Pro',
    category: 'Industrial Drone',
    description: 'Autonomous LiDAR mapping drone for civil engineering and mining sites.',
    price: 8500,
    currency: 'USD',
    features: ['High-density LiDAR', '45 min flight time', 'RTK accuracy'],
    benefits: ['Centimeter precision', 'Zero manual ground control points'],
    targetCustomer: 'Mining engineers and surveyors',
    differentiation: 'Integrated real-time edge processing',
    source: 'USER_CONFIRMED',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as any);

  await businessBrainService.confirmFact(wsId, 'businessName', 'Founder');
  await businessBrainService.confirmFact(wsId, 'valueProposition', 'Founder');

  // Add active business goal
  await goalRepository.create({
    goalId: 'goal_aero_revenue',
    workspaceId: wsId,
    title: 'Acquire 25 enterprise surveying customers',
    description: 'Grow direct fleet sales in mining and construction',
    category: 'revenue',
    currentValue: 4,
    targetValue: 25,
    unit: 'Clients',
    startDate: new Date().toISOString(),
    targetDate: '2027-06-30',
    status: 'in_progress',
    createdBy: 'user_radar_01',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const summary = await growthRadarService.analyzeWorkspace(wsId);

  assert.ok(summary.totalOpportunities > 0, 'Should detect at least 1 opportunity');
  const strongOpp = summary.highestPriorityOpportunities.find(
    (o) => o.type === 'UNDER_PROMOTED_PRODUCT'
  );

  assert.ok(strongOpp, 'Should identify under-promoted surveyor drone');
  assert.ok(
    strongOpp.opportunityScore >= 70,
    `Expected score >= 70, got ${strongOpp.opportunityScore}`
  );
  assert.equal(strongOpp.confidenceBand, 'HIGH');
  assert.ok(strongOpp.supportingEvidence.length > 0, 'Must have supporting evidence');
  assert.ok(strongOpp.supportingEvidence[0].confidence >= 0.85, 'Evidence confidence must be high');
  assert.equal(strongOpp.disclaimer, GROWTH_RADAR_DISCLAIMER);
});

test('ANTIGRAVITY GROWTH RADAR TEST 2: Opportunity with weak evidence', async () => {
  db.resetForTesting();

  const { workspace } = await workspaceService.createWorkspace({
    ownerUserId: 'user_radar_02',
    workspaceName: 'Speculative Commerce',
    industry: 'Consumer Goods',
  });
  const wsId = workspace.workspaceId;

  // Unconfirmed product with missing pricing and no verified facts
  await productRepository.createProduct({
    productId: 'prod_spec_01',
    workspaceId: wsId,
    name: 'Conceptual Energy Scent',
    category: 'Aromatherapy',
    description: 'Experimental desk diffuser scent.',
    price: 0,
    currency: '',
    source: 'AI_INFERRED',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as any);

  const summary = await growthRadarService.analyzeWorkspace(wsId);
  const weakOpp =
    summary.highestPriorityOpportunities.find((o) => o.title.includes('Conceptual Energy Scent')) ||
    summary.emergingOpportunities.find((o) => o.title.includes('Conceptual Energy Scent'));

  if (weakOpp) {
    assert.ok(
      weakOpp.confidence <= 75,
      `Expected lower confidence (<= 75) for AI-inferred offering, got ${weakOpp.confidence}`
    );
  }

  // Should flag operational risk for inconsistent/missing pricing
  const pricingRisk = summary.businessRisks.find((r) => r.type === 'INCONSISTENT_PRICING');
  assert.ok(pricingRisk, 'Should flag operational risk for unpriced product');
});

test('ANTIGRAVITY GROWTH RADAR TEST 3: Missing financial information (Zero False Precision)', async () => {
  db.resetForTesting();

  const { workspace } = await workspaceService.createWorkspace({
    ownerUserId: 'user_radar_03',
    workspaceName: 'Boutique Coaching Lab',
    industry: 'Professional Training',
  });
  const wsId = workspace.workspaceId;

  await productRepository.createProduct({
    productId: 'prod_coach_01',
    workspaceId: wsId,
    name: 'Executive Leadership Immersion',
    category: 'Consulting',
    description: '12-week bespoke executive coaching cohort.',
    price: 3500,
    currency: 'USD',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as any);

  const summary = await growthRadarService.analyzeWorkspace(wsId);

  for (const opp of summary.highestPriorityOpportunities) {
    // Verify no fabricated revenue promises
    assert.ok(
      !opp.potentialImpact.includes('Guaranteed $'),
      'Must not guarantee exact revenue amounts'
    );
    assert.ok(
      opp.disclaimer.includes('do NOT imply guaranteed revenue'),
      'Must contain revenue disclaimer'
    );
    // Required budget is an explicit estimate or zero note
    assert.ok(typeof opp.requiredBudget.isEstimate === 'boolean');
  }
});

test('ANTIGRAVITY GROWTH RADAR TEST 4: Duplicate opportunity detection and anti-fatigue', async () => {
  db.resetForTesting();

  const { workspace } = await workspaceService.createWorkspace({
    ownerUserId: 'user_radar_04',
    workspaceName: 'Artisan Ceramics Studio',
    industry: 'Home Decor',
  });
  const wsId = workspace.workspaceId;

  await productRepository.createProduct({
    productId: 'prod_vase_01',
    workspaceId: wsId,
    name: 'Terracotta Wabi Vase',
    category: 'Vases',
    description: 'Hand-thrown textured terracotta flower vase.',
    price: 78,
    currency: 'EUR',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as any);

  // Scan 1
  const summary1 = await growthRadarService.analyzeWorkspace(wsId);
  const count1 = summary1.totalOpportunities;
  assert.ok(count1 > 0);

  // Scan 2 immediately after without data changes
  const summary2 = await growthRadarService.analyzeWorkspace(wsId);
  assert.equal(
    summary2.totalOpportunities,
    count1,
    'Subsequent scan without data changes must not duplicate opportunities'
  );
});

test('ANTIGRAVITY GROWTH RADAR TEST 5: Opportunity ranking (5-factor formula & custom weights)', async () => {
  db.resetForTesting();

  const { workspace } = await workspaceService.createWorkspace({
    ownerUserId: 'user_radar_05',
    workspaceName: 'Fintech Analytics Suite',
    industry: 'Financial Software',
  });
  const wsId = workspace.workspaceId;

  await productRepository.createProduct({
    productId: 'prod_api_stream',
    workspaceId: wsId,
    name: 'Order Flow Stream API',
    category: 'Data API',
    description: 'Real-time WebSocket feed of institutional order flow.',
    price: 2400,
    currency: 'USD',
    source: 'USER_CONFIRMED',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as any);

  await competitorRepository.create({
    competitorId: 'comp_data_rival',
    workspaceId: wsId,
    name: 'LegacyFlow Corp',
    pricingRange: '$4,500 – $6,000 / month',
    strengths: ['Brand history'],
    weaknesses: ['Slow legacy REST polling instead of WebSockets'],
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as any);

  // Default weights
  const defaultSummary = await growthRadarService.analyzeWorkspace(wsId);
  const opps = defaultSummary.highestPriorityOpportunities;

  // Verify descending sort order
  for (let i = 0; i < opps.length - 1; i++) {
    assert.ok(
      opps[i].opportunityScore >= opps[i + 1].opportunityScore,
      `Opportunity at index ${i} (${opps[i].opportunityScore}) should be >= index ${i + 1} (${opps[i + 1].opportunityScore})`
    );
  }

  // Custom weights heavily favoring cost efficiency & feasibility
  const customSummary = await growthRadarService.analyzeWorkspace(wsId, {
    customWeights: {
      businessImpact: 0.1,
      strategicAlignment: 0.1,
      evidenceConfidence: 0.1,
      feasibility: 0.35,
      costEfficiency: 0.35,
    },
  });

  assert.ok(customSummary.totalOpportunities > 0);
});

test('ANTIGRAVITY GROWTH RADAR TEST 6: User rejection and dismissal suppression', async () => {
  db.resetForTesting();

  const { workspace } = await workspaceService.createWorkspace({
    ownerUserId: 'user_radar_06',
    workspaceName: 'Solar Grid AI',
    industry: 'Clean Energy',
  });
  const wsId = workspace.workspaceId;

  await productRepository.createProduct({
    productId: 'prod_solar_opt',
    workspaceId: wsId,
    name: 'Inverter Telemetry Gateway',
    category: 'Hardware',
    description: 'IoT gateway connecting residential microinverters to smart grid.',
    price: 450,
    currency: 'USD',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as any);

  const initialSummary = await growthRadarService.analyzeWorkspace(wsId);
  const targetOpp = initialSummary.highestPriorityOpportunities[0];
  assert.ok(targetOpp, 'Should have an active opportunity to reject');

  // Reject opportunity
  const rejected = await growthRadarService.transitionOpportunity({
    workspaceId: wsId,
    opportunityId: targetOpp.opportunityId,
    action: 'REJECT',
    actorId: 'user_radar_06',
    rejectionReason: 'Not pursuing hardware marketing until Q3 firmware release.',
  });

  assert.equal(rejected.lifecycleState, 'REJECTED');
  assert.equal(
    rejected.rejectionReason,
    'Not pursuing hardware marketing until Q3 firmware release.'
  );

  // Subsequent scan must suppress the rejected opportunity (anti-fatigue)
  const afterRejectSummary = await growthRadarService.analyzeWorkspace(wsId);
  const activeIds = afterRejectSummary.highestPriorityOpportunities.map((o) => o.opportunityId);
  assert.ok(
    !activeIds.includes(targetOpp.opportunityId),
    'Rejected opportunity must be suppressed from active lists'
  );
});

test('ANTIGRAVITY GROWTH RADAR TEST 7: Deferred opportunity and automatic reopening', async () => {
  db.resetForTesting();

  const { workspace } = await workspaceService.createWorkspace({
    ownerUserId: 'user_radar_07',
    workspaceName: 'Peak Performance Gear',
    industry: 'Athletic Wear',
  });
  const wsId = workspace.workspaceId;

  await productRepository.createProduct({
    productId: 'prod_gear_01',
    workspaceId: wsId,
    name: 'Merino Thermal Baselayer',
    category: 'Apparel',
    description: '250gsm merino wool thermal top for alpine mountaineering.',
    price: 130,
    currency: 'EUR',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as any);

  const summary = await growthRadarService.analyzeWorkspace(wsId);
  const opp = summary.highestPriorityOpportunities[0];
  assert.ok(opp);

  // Defer until future date (2 days from now)
  const deferDate = new Date(Date.now() + 2 * 86400000).toISOString();
  const deferred = await growthRadarService.transitionOpportunity({
    workspaceId: wsId,
    opportunityId: opp.opportunityId,
    action: 'DEFER',
    deferredUntil: deferDate,
  });

  assert.equal(deferred.lifecycleState, 'DEFERRED');
  assert.equal(deferred.deferredUntil, deferDate);

  // Re-scanning before deferDate keeps it deferred
  const scanDuringDefer = await growthRadarService.analyzeWorkspace(wsId);
  const activeIdsDuring = scanDuringDefer.highestPriorityOpportunities.map((o) => o.opportunityId);
  assert.ok(
    !activeIdsDuring.includes(opp.opportunityId),
    'Deferred opportunity must remain hidden while deferred'
  );

  // Re-scanning after deferDate (simulate now = 3 days later)
  const futureNow = new Date(Date.now() + 3 * 86400000);
  await growthRadarService.analyzeWorkspace(wsId, { now: futureNow });
  const reopenedOpp = await growthRadarRepository.findById(wsId, opp.opportunityId);
  assert.equal(
    reopenedOpp?.lifecycleState,
    'READY',
    'Opportunity should automatically reopen to READY after deferred date passes'
  );
});

test('ANTIGRAVITY GROWTH RADAR TEST 8: Opportunity expiration past relevance window', async () => {
  db.resetForTesting();

  const { workspace } = await workspaceService.createWorkspace({
    ownerUserId: 'user_radar_08',
    workspaceName: 'Seasonal Bloomers',
    industry: 'Floristry',
  });
  const wsId = workspace.workspaceId;

  await productRepository.createProduct({
    productId: 'prod_flower_01',
    workspaceId: wsId,
    name: 'Mother’s Day Peony Box',
    category: 'Arrangements',
    description: 'Limited seasonal peony box with satin wrap.',
    price: 90,
    currency: 'USD',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as any);

  // Create opportunity with expiration 5 days ago
  const pastExpiration = new Date(Date.now() - 5 * 86400000).toISOString();
  const created = await growthRadarRepository.create({
    opportunityId: 'opp_seasonal_expired_01',
    workspaceId: wsId,
    category: 'MARKETING',
    type: 'SEASONAL_CAMPAIGN',
    title: 'Mother’s Day Promotion Sprint',
    description: 'Promote Mother’s day box arrangements.',
    potentialImpact: 'Seasonal holiday spike.',
    opportunityScore: 78,
    rawFactors: {
      businessImpact: 80,
      goalAlignment: 80,
      evidenceConfidence: 80,
      feasibility: 80,
      costEfficiency: 70,
    },
    factorContributions: {
      businessImpact: 24,
      goalAlignment: 20,
      evidenceConfidence: 16,
      feasibility: 12,
      costEfficiency: 7,
    },
    confidence: 80,
    confidenceBand: 'HIGH',
    supportingEvidence: [],
    estimatedEffort: 'LOW',
    requiredBudget: { isEstimate: false },
    relevantDepartment: 'MARKETING',
    dependencies: [],
    recommendedAction: 'Deploy seasonal ads',
    lifecycleState: 'READY',
    lifecycleHistory: [],
    expirationDate: pastExpiration,
    rediscoveredCount: 0,
    evidenceFingerprint: 'seasonal_peony_old_fp',
    disclaimer: GROWTH_RADAR_DISCLAIMER,
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    version: 1,
  });

  const expiredCount = await growthRadarRepository.expireStaleOpportunities(wsId);
  assert.ok(expiredCount >= 1, 'Should expire at least 1 opportunity');

  const reloaded = await growthRadarRepository.findById(wsId, created.opportunityId);
  assert.equal(reloaded?.lifecycleState, 'EXPIRED');
});

test('ANTIGRAVITY GROWTH RADAR TEST 9: New evidence updating an existing opportunity', async () => {
  db.resetForTesting();

  const { workspace } = await workspaceService.createWorkspace({
    ownerUserId: 'user_radar_09',
    workspaceName: 'SaaS Pulse Analytics',
    industry: 'Software',
  });
  const wsId = workspace.workspaceId;

  await productRepository.createProduct({
    productId: 'prod_seat_sub',
    workspaceId: wsId,
    name: 'Team Collaboration Seat',
    category: 'Software Tier',
    description: 'Per-user seat for analytics dashboard.',
    price: 35,
    currency: 'USD',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as any);

  // Scan 1: Baseline
  const summary1 = await growthRadarService.analyzeWorkspace(wsId);
  const opp1 = summary1.highestPriorityOpportunities[0];
  assert.ok(opp1);

  // Reject the opportunity initially
  await growthRadarService.transitionOpportunity({
    workspaceId: wsId,
    opportunityId: opp1.opportunityId,
    action: 'REJECT',
    rejectionReason: 'Focusing on single founders first.',
  });

  // Now, introduce NEW evidence: Competitor charges $95 with slow support!
  await competitorRepository.create({
    competitorId: 'comp_saas_giant',
    workspaceId: wsId,
    name: 'EnterpriseMetrics Cloud',
    pricingRange: '$85 – $120 / seat',
    weaknesses: ['Poor customer onboarding and high churn'],
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as any);

  // Scan 2: New evidence should discover differentiation & pricing headroom
  const summary2 = await growthRadarService.analyzeWorkspace(wsId);
  const compOpp = summary2.highestPriorityOpportunities.find(
    (o) => o.type === 'COMPETITOR_DIFFERENTIATION' || o.type === 'PRICING_OPTIMIZATION'
  );

  assert.ok(compOpp, 'New competitor evidence must generate fresh opportunities');
  assert.ok(compOpp.supportingEvidence.some((e) => e.sourceType === 'COMPETITOR'));
});

test('ANTIGRAVITY GROWTH RADAR TEST 10: Department task creation from opportunity', async () => {
  db.resetForTesting();

  const { workspace } = await workspaceService.createWorkspace({
    ownerUserId: 'user_radar_10',
    workspaceName: 'Nordic Roast Collective',
    industry: 'Specialty Coffee',
  });
  const wsId = workspace.workspaceId;

  await productRepository.createProduct({
    productId: 'prod_cold_keg',
    workspaceId: wsId,
    name: 'Office Nitrogen Cold Brew Keg',
    category: 'Beverage',
    description: '20L cold brew keg on auto-ship weekly.',
    price: 110,
    currency: 'EUR',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as any);

  const summary = await growthRadarService.analyzeWorkspace(wsId);
  const opp = summary.highestPriorityOpportunities[0];
  assert.ok(opp);

  // Convert to task
  const { opportunity: updatedOpp, task } = await growthRadarService.convertOpportunityToTask({
    workspaceId: wsId,
    opportunityId: opp.opportunityId,
    userRole: 'owner',
    userId: 'user_radar_10',
  });

  assert.equal(updatedOpp.lifecycleState, 'IN_PROGRESS');
  assert.equal(updatedOpp.assignedDepartmentTaskId, task.taskId);

  // Check task repository
  const savedTask = await departmentTaskRepository.findById(wsId, task.taskId);
  assert.ok(savedTask, 'Task must be persisted in departmentTaskRepository');
  assert.equal(savedTask?.objective, opp.title);
  assert.equal(savedTask?.department, opp.relevantDepartment);
  assert.ok(savedTask?.status === 'QUEUED' || savedTask?.status === 'PENDING');
});

test('ANTIGRAVITY GROWTH RADAR TEST 11: Notification delivery on high-priority detection', async () => {
  db.resetForTesting();

  const { workspace } = await workspaceService.createWorkspace({
    ownerUserId: 'user_radar_11',
    workspaceName: 'Security Perimeter Shield',
    industry: 'Cybersecurity',
  });
  const wsId = workspace.workspaceId;

  // Setup unverified claims to trigger operational risk notification
  await businessBrainService.updateProfile(wsId, {
    provenance: {
      fact_a: { fieldKey: 'fact_a', source: 'AI_INFERRED', confidence: 0.5 },
      fact_b: { fieldKey: 'fact_b', source: 'AI_INFERRED', confidence: 0.5 },
      fact_c: { fieldKey: 'fact_c', source: 'AI_INFERRED', confidence: 0.5 },
    },
  });

  let notificationReceived = false;
  let receivedEvent: DepartmentEvent | null = null;

  const unsubscribe = departmentEventBus.subscribe('DEPARTMENT_COORDINATION_EVENT', (evt) => {
    if (
      evt.workspaceId === wsId &&
      evt.metadata?.action === 'HIGH_PRIORITY_GROWTH_OPPORTUNITY_DETECTED'
    ) {
      notificationReceived = true;
      receivedEvent = evt;
    }
  });

  try {
    await growthRadarService.analyzeWorkspace(wsId);
    assert.ok(
      notificationReceived,
      'Must emit coordination notification for high-priority risk detection'
    );
    assert.equal((receivedEvent as any)?.workspaceId, wsId);
  } finally {
    unsubscribe();
  }
});

test('ANTIGRAVITY GROWTH RADAR TEST 12: Cross-tenant isolation', async () => {
  db.resetForTesting();

  // Tenant A: Aerospace
  const { workspace: wsA } = await workspaceService.createWorkspace({
    ownerUserId: 'user_tenant_a',
    workspaceName: 'Quantum Satellites',
    industry: 'Aerospace',
  });

  // Tenant B: Health Food
  const { workspace: wsB } = await workspaceService.createWorkspace({
    ownerUserId: 'user_tenant_b',
    workspaceName: 'Organic Greens Co',
    industry: 'Health & Nutrition',
  });

  // Add high-end satellite propulsion to Tenant A
  await productRepository.createProduct({
    productId: 'prod_sat_ion',
    workspaceId: wsA.workspaceId,
    name: 'Ion Plasma Thruster',
    category: 'Propulsion',
    description: 'Hall-effect thruster for cubesats.',
    price: 45000,
    currency: 'USD',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as any);

  // Add salad greens to Tenant B
  await productRepository.createProduct({
    productId: 'prod_salad_mix',
    workspaceId: wsB.workspaceId,
    name: 'Baby Spinach Family Pack',
    category: 'Fresh Produce',
    description: 'Triple-washed organic spinach.',
    price: 6,
    currency: 'USD',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as any);

  const summaryA = await growthRadarService.analyzeWorkspace(wsA.workspaceId);
  const summaryB = await growthRadarService.analyzeWorkspace(wsB.workspaceId);

  // Tenant B must have ZERO references to Ion Plasma Thruster or Aerospace
  const bTitles = summaryB.highestPriorityOpportunities.map((o) => o.title).join(' ');
  const bEvidence = JSON.stringify(
    summaryB.highestPriorityOpportunities.map((o) => o.supportingEvidence)
  );
  assert.ok(!bTitles.includes('Ion Plasma Thruster'), 'Tenant B must not see Tenant A products');
  assert.ok(
    !bEvidence.includes('prod_sat_ion'),
    'Tenant B evidence must not reference Tenant A product IDs'
  );

  // Tenant A must have ZERO references to Spinach
  const aTitles = summaryA.highestPriorityOpportunities.map((o) => o.title).join(' ');
  assert.ok(!aTitles.includes('Baby Spinach'), 'Tenant A must not see Tenant B products');

  // Verify DB isolation
  const listA = await growthRadarRepository.listByWorkspace(wsA.workspaceId);
  const listB = await growthRadarRepository.listByWorkspace(wsB.workspaceId);
  for (const opp of listA) {
    assert.equal(opp.workspaceId, wsA.workspaceId);
  }
  for (const opp of listB) {
    assert.equal(opp.workspaceId, wsB.workspaceId);
  }
});
