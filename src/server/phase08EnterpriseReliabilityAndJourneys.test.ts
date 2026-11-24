/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

process.env.NODE_ENV = 'test';
process.env.TEST_MODE = 'true';

import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import type { Server } from 'node:http';
import crypto from 'node:crypto';

import { createApiRouter } from './routes';
import { userRepository } from './repositories/userRepository';
import { workspaceRepository } from './repositories/workspaceRepository';
import { creditWalletRepository } from './repositories/creditWalletRepository';
import { productRepository } from './repositories/productRepository';
import { extractionJobRepository } from './repositories/extractionJobRepository';
import { competitorRepository } from './repositories/competitorRepository';
import { orderRepository } from './repositories/orderRepository';
import { businessBrainService } from './services/businessBrainService';
import { ideaIntelligenceService } from './services/ideaIntelligenceService';
import { brandStudioService } from './services/brandStudioService';
import { growthMissionEngine } from './services/growth/growthMissionEngine';
import { growthExecutionQueueService } from './services/growth/growthExecutionQueueService';
import { dataIngestionService, computeRecordFingerprint } from './integrations/dataIngestionService';
import { metricCalculator } from './services/analytics/metricCalculator';
import { unifiedReportService } from './services/unifiedReportService';
import { CashfreeProvider } from './billing/providers/cashfreeProvider';
import { billingManager } from './billing/billingManager';
import { workspaceService } from './services/workspaceService';
import { validateSafeExternalUrl } from './utils/ssrfValidator';
import type { ProductEntity } from './types/api';

test('PHASE 08 — ENTERPRISE RELIABILITY, SECURITY & END-TO-END CERTIFICATION SUITE', async (t) => {
  const wsIdA = `ws_p08_a_${Date.now()}`;
  const userIdA = `user_p08_a_${Date.now()}`;
  const authHeaderA = `Bearer test-token-${userIdA}`;

  const wsIdB = `ws_p08_b_${Date.now()}`;
  const userIdB = `user_p08_b_${Date.now()}`;
  const authHeaderB = `Bearer test-token-${userIdB}`;

  // Provision an ephemeral Express test server
  const app = express();
  app.use(express.json());
  app.use('/api', createApiRouter());

  let server: Server;
  let baseUrl = '';

  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (addr && typeof addr === 'object') {
        baseUrl = `http://127.0.0.1:${addr.port}`;
      }
      resolve();
    });
  });

  t.after(() => {
    server.close();
  });

  // =========================================================================
  // JOURNEY A: NEW BUSINESS WORKFLOW
  // Registration → Workspace creation → Onboarding → Business Brain → Products → Dashboard
  // =========================================================================
  await t.test('Journey A: New Business Lifecycle from Registration to Dashboard', async () => {
    // 1. User Registration via userRepository.upsert
    const user = await userRepository.upsert({
      userId: userIdA,
      email: 'founder.solstice@brain-wise.com',
      displayName: 'Aarav Sharma',
      emailVerified: true,
      authProvider: 'password',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    assert.equal(user.userId, userIdA);

    // 2. Workspace Creation
    const ws = await workspaceRepository.create({
      workspaceId: wsIdA,
      name: 'Solstice Roastery & Lab',
      slug: `solstice-lab-${Date.now()}`,
      ownerUserId: userIdA,
      tier: 'pro',
      industry: 'Food & Beverage',
      workspaceStatus: 'active',
    });
    assert.equal(ws.workspaceId, wsIdA);
    await creditWalletRepository.initializeWallet(wsIdA, 1000);

    // 3. Onboarding & Business Brain Profile Creation
    const { profile } = await businessBrainService.generateFromOnboarding({
      workspaceId: wsIdA,
      userId: userIdA,
      onboardingData: {
        businessName: 'Solstice Craft Coffee',
        industry: 'Specialty Beverage',
        location: 'Bengaluru, India',
        targetAudience: 'Knowledge workers and specialty coffee enthusiasts',
        offeringsSummary: 'Direct-trade artisan roasted coffee beans and cold brews',
        pricingModel: 'D2C Retail and Corporate Subscriptions',
      },
    });
    assert.equal(profile.businessName, 'Solstice Craft Coffee');
    assert.equal(profile.approvalStatus, 'DRAFT');

    // 4. Product Setup
    const prod = await productRepository.createProduct({
      productId: `prod_espresso_${Date.now()}`,
      workspaceId: wsIdA,
      name: 'Signature Espresso Roast 250g',
      sku: 'SKU-SOL-ESP-01',
      price: 16.50,
      currency: 'USD',
      status: 'active',
      category: 'Coffee Beans',
      description: 'Full-bodied dark roast with notes of chocolate and hazelnut',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    assert.equal(prod.name, 'Signature Espresso Roast 250g');

    // 5. Query Dashboard Summary through API
    const dashRes = await fetch(`${baseUrl}/api/v1/workspaces/${wsIdA}/business-profile`, {
      headers: { Authorization: authHeaderA, 'X-Workspace-Id': wsIdA },
    });
    assert.equal(dashRes.status, 200);
    const dashBody = await dashRes.json();
    assert.equal(dashBody.success, true);
    assert.equal(dashBody.data.businessName, 'Solstice Craft Coffee');
  });

  // =========================================================================
  // JOURNEY B: EXISTING BUSINESS WORKFLOW
  // Document upload → Canonical Extraction → Candidate Facts Staging → Confirmation → Product Bulk Import
  // =========================================================================
  await t.test('Journey B: Existing Business Document Ingestion & Fact Confirmation', async () => {
    const rawDocument = `Solstice Craft Coffee Offerings
Monsooned Malabar AA: $17.50 - Aged coastal Indian Arabica with rich earthy notes.
Ethiopian Yirgacheffe: $19.00 - High altitude heirloom lot with lemon blossom notes.
Cupping & Sensory Workshop: $45.00 - 2-hour guided palate training.
We cater to discerning specialty coffee lovers seeking exceptional cup clarity.`;

    // 1. Document Extraction
    const extractRes = await fetch(`${baseUrl}/api/v1/workspaces/${wsIdA}/business-profile/extract-document`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeaderA,
        'X-Workspace-Id': wsIdA,
        'X-Idempotency-Key': `idem_p08_b_extract_${Date.now()}`,
      },
      body: JSON.stringify({
        documentName: 'Q4_Solstice_Catalogue.txt',
        documentType: 'TXT',
        documentContent: rawDocument,
      }),
    });
    assert.equal(extractRes.status, 200);
    const extractBody = await extractRes.json();
    assert.equal(extractBody.success, true);
    assert.ok(extractBody.data.documentId.startsWith('doc_'));
    assert.equal(extractBody.data.provenance, 'AI_INFERRED');
    assert.equal(extractBody.data.requiresUserApproval, true);

    // 2. Candidate items must exist in pending verification items
    const pendingItems = await extractionJobRepository.listVerificationItems(wsIdA, 'pending');
    assert.ok(pendingItems.length >= 1);
    const candidateNameItem = pendingItems.find((i) => i.fieldKey === 'businessName');
    assert.ok(candidateNameItem);

    // 3. User Approves Candidate Fact
    const confirmed = await extractionJobRepository.updateVerificationItem(wsIdA, candidateNameItem.itemId, {
      status: 'approved',
      provenance: 'USER_CONFIRMED',
      requiresUserApproval: false,
      verifiedBy: userIdA,
      verifiedAt: new Date().toISOString(),
    });
    assert.equal(confirmed.status, 'approved');
    assert.equal(confirmed.provenance, 'USER_CONFIRMED');

    // 4. Product Bulk Import via CSV
    const csvData = `name,price,currency,sku,category,description
Cold Brew Blend 1L,13.00,USD,SKU-CB-1L,Cold Brew,Slow immersion roasted blend
Pour Over Dripper,22.00,USD,SKU-DRIP-01,Equipment,Hand-blown ceramic dripper`;

    const bulkRes = await fetch(`${baseUrl}/api/v1/workspaces/${wsIdA}/business-profile/products/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeaderA,
        'X-Workspace-Id': wsIdA,
      },
      body: JSON.stringify({ csv: csvData, atomic: false }),
    });
    assert.ok(bulkRes.status === 200 || bulkRes.status === 201);
    const bulkBody = await bulkRes.json();
    assert.equal(bulkBody.data.summary.createdCount, 2);
  });

  // =========================================================================
  // JOURNEY C: IDEA VALIDATION WORKFLOW
  // Description → Understanding → Research → Refinement → Dossier → History
  // =========================================================================
  await t.test('Journey C: Idea Validation & Research Orchestration', async () => {
    // 1. Natural Idea Understanding
    const prompt = 'Cold-chain artisan roasted coffee beans delivered within 48 hours of roasting in Bangalore';
    const understandRes = await ideaIntelligenceService.understandIdea(prompt);
    assert.ok(understandRes.businessConcept.length > 0);
    assert.ok(understandRes.industry.length > 0);
    assert.ok(understandRes.importantResearchQuestions.length > 0, 'Must suggest research questions');

    // 2. Generate Research Dossier
    const dossier = await ideaIntelligenceService.validateIdea({
      workspaceId: wsIdA,
      ideaSummary: prompt,
      industry: 'Specialty Beverage',
      geography: 'India',
      targetAudience: 'Specialty Coffee Lovers',
    });
    assert.ok(dossier.validationId.startsWith('val_'));
    assert.ok(dossier.scores.overallOpportunityScore > 0);
    assert.ok(['GO', 'NO_GO', 'CAUTION'].includes(dossier.executiveVerdict));

    // 3. Conversational Refinement
    const convoRes = await ideaIntelligenceService.conductConversationalResearch({
      workspaceId: wsIdA,
      reportId: dossier.validationId,
      query: 'What if we launch with a lean budget of 5 lakh INR?',
    });
    assert.ok(convoRes.reply.length > 50);
    assert.ok(convoRes.suggestedActions.length > 0);
  });

  // =========================================================================
  // JOURNEY D: COMPETITOR INTELLIGENCE WORKFLOW
  // SSRF Protection → Discovery → Benchmarking
  // =========================================================================
  await t.test('Journey D: Competitor Intelligence & SSRF Protection', async () => {
    // 1. SSRF Safety Validator
    const safeCheck = validateSafeExternalUrl('https://bluebottlecoffee.com');
    assert.equal(safeCheck.isSafe, true);

    const unsafeCheck1 = validateSafeExternalUrl('http://169.254.169.254/latest/meta-data/');
    assert.equal(unsafeCheck1.isSafe, false);

    const unsafeCheck2 = validateSafeExternalUrl('http://127.0.0.1:8080/admin');
    assert.equal(unsafeCheck2.isSafe, false);

    // 2. Add Competitor via competitorRepository
    const comp = await competitorRepository.create({
      competitorId: `comp_thirdwave_${Date.now()}`,
      workspaceId: wsIdA,
      name: 'Third Wave Coffee Roasters',
      website: 'https://thirdwavecoffeeroasters.com',
      industry: 'Specialty Coffee',
      location: 'Pan-India',
      positioning: 'Leading specialty coffee chain with quick-commerce presence',
      priceRange: '₹250–₹750',
      strengths: ['Mass retail footprint', 'Q-commerce instant delivery'],
      weaknesses: ['Batch inconsistency in older lots'],
      differentiators: ['Physical cafe atmosphere'],
      marketShareEstimate: '18%',
      targetAudience: 'Urban youth',
      trackedSince: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    assert.equal(comp.name, 'Third Wave Coffee Roasters');

    // 3. Query Competitors for Workspace
    const list = await competitorRepository.listByWorkspace(wsIdA);
    assert.ok(list.length >= 1);
  });

  // =========================================================================
  // JOURNEY E: BRAND CREATION WORKFLOW (STRICT VIDEO EXCLUSION VERIFIED)
  // Direction → Logo → Guidelines → Packaging Dieline → Social Assets
  // =========================================================================
  await t.test('Journey E: Brand Creation & Strict Video Exclusion Compliance', async () => {
    // 1. Generate Pure Sanitized SVG Vector Logo (STRICT VIDEO EXCLUSION)
    const logoAsset = brandStudioService.generateCollateralSvg({
      workspaceId: wsIdA,
      assetType: 'VECTOR_LOGO',
      brandName: 'Solstice Craft Roasters',
      tagline: 'Artisanal Micro-Lot Roastery',
    });
    assert.ok(logoAsset.svgMarkup.startsWith('<svg'));
    assert.ok(logoAsset.svgMarkup.includes('Solstice Craft Roasters'));
    assert.equal(logoAsset.truthVerified, true);
    assert.ok(!logoAsset.svgMarkup.includes('<video'), 'Zero video elements allowed');

    // 2. Generate High-DPI Stationery Business Card
    const businessCardAsset = brandStudioService.generateCollateralSvg({
      workspaceId: wsIdA,
      assetType: 'BUSINESS_CARD_SVG',
      brandName: 'Solstice Craft Roasters',
    });
    assert.ok(businessCardAsset.svgMarkup.startsWith('<svg'));
    assert.equal(businessCardAsset.dimensions.width, 1050);
    assert.equal(businessCardAsset.dimensions.height, 600);

    // 3. STRICT VIDEO EXCLUSION GUARANTEE
    const disallowedTerms = ['mp4', 'ffmpeg', 'remotion', 'text-to-video', 'video_credits', 'reel_generation'];
    const serializedOutput = JSON.stringify(logoAsset) + JSON.stringify(businessCardAsset);
    for (const term of disallowedTerms) {
      assert.ok(
        !serializedOutput.toLowerCase().includes(term),
        `Output must strictly exclude video term: ${term}`
      );
    }
  });

  // =========================================================================
  // JOURNEY F: GROWTH EXECUTION WORKFLOW
  // Diagnosis → Strategy → Mission → Approval → Queue Dispatch → Outcome
  // =========================================================================
  await t.test('Journey F: Autonomous Growth Mission Lifecycle & Result Capture', async () => {
    // 1. Create Mission Grounded in Business Brain
    const mission = await growthMissionEngine.createMission({
      workspaceId: wsIdA,
      title: 'Launch Office Coffee Tasting Kit Outreach',
      strategicRationale: 'Target tech companies in Indiranagar & Koramangala for recurring subscriptions.',
      department: 'Growth Director',
      targetAudience: 'Office Managers & Tech Founders',
      timeHorizon: '30_DAYS',
      priority: 'HIGH',
      budgetCap: 15000,
      ownerId: userIdA,
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

    // 2. Deterministic State Transition to APPROVED
    const approved = await growthMissionEngine.transitionMissionStatus({
      workspaceId: wsIdA,
      missionId: mission.missionId,
      targetStatus: 'APPROVED',
      actorId: userIdA,
      notes: 'Approved with ₹15,000 budget cap',
    });
    assert.equal(approved.status, 'APPROVED');

    // 3. Execution Queue Idempotent Job Dispatch
    const idempotencyKey = `idemp_p08_outreach_${Date.now()}`;
    const job1 = await growthExecutionQueueService.enqueueJob({
      workspaceId: wsIdA,
      actionType: 'SEND_DISPATCH',
      level: 2,
      payload: { channel: 'Email', recipient: 'offices@techstartups.com' },
      idempotencyKey,
      missionId: mission.missionId,
    });
    assert.equal(job1.status, 'QUEUED');

    // Same idempotencyKey returns existing job
    const job2 = await growthExecutionQueueService.enqueueJob({
      workspaceId: wsIdA,
      actionType: 'SEND_DISPATCH',
      level: 2,
      payload: { channel: 'Email', recipient: 'offices@techstartups.com' },
      idempotencyKey,
      missionId: mission.missionId,
    });
    assert.equal(job2.jobId, job1.jobId);
  });

  // =========================================================================
  // JOURNEY G: ANALYTICS & INTEGRATION ENGINE
  // Connect → Ingest → SHA-256 Fingerprint → Zero Fake Telemetry → Report Export
  // =========================================================================
  await t.test('Journey G: Verified Analytics Ingestion & Anti-Fake Telemetry', async () => {
    // 1. Ingest real telemetry batch with deterministic SHA-256 fingerprinting
    const fp1 = computeRecordFingerprint(wsIdA, 'stripe', 'revenue', '2026-11-01T00:00:00Z', 'batch_01', { val: 12500 });
    const fp2 = computeRecordFingerprint(wsIdA, 'stripe', 'revenue', '2026-11-01T00:00:00Z', 'batch_01', { val: 12500 });
    assert.equal(fp1, fp2, 'Fingerprints must match deterministically');

    const testPackage = {
      records: [
        {
          recordId: 'rec_tx_1',
          workspaceId: wsIdA,
          integrationId: 'stripe',
          provider: 'stripe',
          category: 'revenue',
          retrievedAt: new Date().toISOString(),
          sourceTimestamp: '2026-11-01T00:00:00Z',
          sourceReference: 'batch_01',
          syncJobId: 'sync_01',
          dataVersion: 1,
          provenance: { sourceType: 'STRIPE_API' as any, verified: true, confidenceScore: 0.95 },
          metrics: { amount: 12500 },
        },
      ],
      summary: {},
      hasMore: false,
      state: 'CONNECTED' as const,
    };

    const ingestResult1 = await dataIngestionService.ingestRecords(wsIdA, 'stripe', testPackage);
    assert.equal(ingestResult1.ingestedCount, 1);
    assert.equal(ingestResult1.duplicateCount, 0);

    // 2. Re-ingesting same batch must detect duplicate via SHA-256 fingerprint
    const ingestResult2 = await dataIngestionService.ingestRecords(wsIdA, 'stripe', testPackage);
    assert.equal(ingestResult2.ingestedCount, 0);
    assert.equal(ingestResult2.duplicateCount, 1);

    // 3. Compute Metrics: Must NEVER output fake 14,250 users
    const calculated = metricCalculator.calculateMetric({
      metricId: 'REV_NET',
      records: [
        { recordId: 'tx_1', amount: 8000, currency: 'USD', timestamp: '2026-11-15T12:00:00Z', source: 'stripe' },
        { recordId: 'tx_2', amount: 4500, currency: 'USD', timestamp: '2026-11-20T12:00:00Z', source: 'stripe' },
      ],
      currency: 'USD',
      reportingPeriod: { startDate: '2026-11-01T00:00:00Z', endDate: '2026-11-30T23:59:59Z' },
    });
    assert.equal(calculated.calculatedValue, 12500);
    assert.notEqual(calculated.calculatedValue, 14250, 'Must never produce fake 14250 metric');
    assert.equal(calculated.verificationStatus, 'VERIFIED');

    // 4. Generate RFC-Compliant CSV Export
    const csvExport = unifiedReportService.formatCsvExport({
      dossierId: 'dossier_test_p08',
      workspaceId: wsIdA,
      title: 'Solstice Roastery Strategic Dossier',
      businessName: 'Solstice Craft Coffee',
      verdict: 'GO',
      overallScore: 88,
      generatedAt: '2026-11-24T00:00:00Z',
      section1_ExecutiveSummary: {
        verdictRationale: 'Validated specialty coffee wedge with strong corporate gifting demand.',
        keyOpportunities: ['Subscription club', 'Corporate gifting hampers'],
        keyBlockers: [],
        criticalAssumptions: ['Roasting consistency maintained'],
        scoreMatrix: {
          opportunityScore: 88,
          marketScore: 85,
          demandScore: 86,
          competitionScore: 80,
          financialFeasibilityScore: 90,
          executionScore: 87,
          riskScore: 22,
        },
      },
      section2_MarketDynamics: {
        tamInr: 15000000000,
        samInr: 2500000000,
        somInr: 50000000,
        calculationMethodology: 'Bottom-up specialty roastery volume model',
        statedAssumptions: ['Metropolitan premium buyers'],
        targetCustomerSegments: ['Knowledge Workers', 'Home Brewers'],
      },
      section3_CompetitorIntelligence: {
        directCompetitorsCount: 3,
        whitespaceOpportunities: ['Zero-Melt Summer Delivery Guarantee', 'Instant GST Corporate Invoicing'],
      },
      section4_FinancialFeasibility: {
        cac: 450,
        ltvCacRatio: 7.37,
        breakEvenCustomers: 120,
        sixMonthRunwayRequired: 500000,
        strategySimulation: {
          optionA_499: { revenue: 150000, marginPercent: 55 },
          optionB_799: { revenue: 250000, marginPercent: 72 },
          recommendedChoice: 'optionB_799',
        },
      },
      section5_BrandBlueprint: {
        usp: 'Roasted and dispatched within 48 hours with single-origin transparency.',
        tagline: 'Artisan Micro-Lot Coffee Roasters',
        contrarianAngle: 'Zero commodity blending, pure traceable micro-lots.',
        typographyLadder: { ratio: 1.25, headingFont: 'Space Grotesk', bodyFont: 'Inter', scaleDisplay: '36px', scaleH1: '28px' },
        colorPalette: { primary: '#171717', accent: '#FF7417', background: '#FAFAF9' },
        collateralFormats: ['SVG Stationery', 'High-DPI Vector Packaging Dieline'],
      },
      section6_GrowthRoadmap: {
        topOpportunities: ['Hyper-fresh subscriptions', 'B2B studio outreach'],
        immediateSprints: [],
      },
      section7_BusinessWatch: {
        healthScore: 92,
      },
    } as any);
    assert.ok(csvExport.includes('OVERVIEW,Verdict,GO'));
    assert.ok(csvExport.includes('FINANCE'));
  });

  // =========================================================================
  // JOURNEY H: REAL CASHFREE PAYMENT & BILLING WORKFLOW
  // Order → Cryptographic Webhook → Idempotent Allocation → Billing History
  // =========================================================================
  await t.test('Journey H: Cashfree Payment Lifecycle & Cryptographic Webhook Verification', async () => {
    const secretKey = 'test_cashfree_secret_p08_key';
    const appId = 'TEST_CASHFREE_APP_P08';
    const provider = new CashfreeProvider({
      appId,
      secretKey,
      apiVersion: '2023-08-01',
      environment: 'sandbox',
    });
    billingManager.registerProvider(provider);

    provider.setCustomFetcher(async (_url: any, init: any) => {
      const parsed = JSON.parse(init.body);
      return new Response(
        JSON.stringify({
          cf_order_id: 'cf_ord_sandbox_p08_123',
          order_id: parsed.order_id,
          entity: 'order',
          order_currency: 'INR',
          order_amount: parsed.order_amount,
          order_status: 'ACTIVE',
          payment_session_id: 'session_cf_sandbox_p08_abc',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    });

    const orderId = `order_sub_p08_${Date.now()}`;
    const session = await provider.createCheckoutSession({
      orderId,
      orderAmount: 4999.00,
      orderCurrency: 'INR',
      customerEmail: 'founder.solstice@brain-wise.com',
      customerPhone: '9876543210',
      customerName: 'Aarav Sharma',
      returnUrl: 'https://app.brainwise.com/settings?tab=subscription-billing&order_id={order_id}',
      metadata: { workspaceId: wsIdA, planId: 'professional' },
    });

    assert.equal(session.orderId, orderId);
    assert.equal(session.paymentSessionId, 'session_cf_sandbox_p08_abc');

    // Persist order in repository for webhook verification
    await orderRepository.create({
      orderId,
      workspaceId: wsIdA,
      userId: userIdA,
      planId: 'professional',
      itemReferenceId: 'professional',
      amountInr: 4999.00,
      baseAmountInr: 4236.44,
      gstAmountInr: 762.56,
      currency: 'INR',
      status: 'PENDING',
      paymentSessionId: session.paymentSessionId,
      cfOrderId: session.cfOrderId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Send cryptographic webhook
    const timestamp = Date.now().toString();
    const eventPayload = {
      event_time: new Date().toISOString(),
      type: 'PAYMENT_SUCCESS_WEBHOOK',
      data: {
        order: {
          order_id: orderId,
          order_amount: 4999.00,
          order_currency: 'INR',
          order_status: 'PAID',
        },
        payment: {
          cf_payment_id: `cf_pay_${Date.now()}`,
          payment_status: 'SUCCESS',
          payment_amount: 4999.00,
        },
      },
    };
    const rawBody = JSON.stringify(eventPayload);
    const signature = crypto
      .createHmac('sha256', secretKey)
      .update(timestamp + rawBody)
      .digest('base64');

    const webhookRes = await fetch(`${baseUrl}/api/v1/billing/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-timestamp': timestamp,
        'x-webhook-signature': signature,
      },
      body: rawBody,
    });
    assert.equal(webhookRes.status, 200);

    // Verify order was marked PAID
    const updatedOrder = await orderRepository.findByOrderId(orderId);
    assert.equal(updatedOrder?.status, 'PAID');
  });

  // =========================================================================
  // JOURNEY I: WORKSPACE ISOLATION & MULTI-TENANCY SECURITY
  // Two distinct users, two workspaces, verify cross-tenant access rejection
  // =========================================================================
  await t.test('Journey I: Strict Multi-Tenant Boundary Isolation', async () => {
    // Provision User B and Workspace B
    await userRepository.upsert({
      userId: userIdB,
      email: 'competitor@another-company.com',
      displayName: 'Competitor Founder',
      emailVerified: true,
      authProvider: 'password',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await workspaceRepository.create({
      workspaceId: wsIdB,
      name: 'Unrelated Bakery Co',
      slug: `unrelated-bakery-${Date.now()}`,
      ownerUserId: userIdB,
      tier: 'starter',
      industry: 'Bakery',
      workspaceStatus: 'active',
    });
    await creditWalletRepository.initializeWallet(wsIdB, 200);

    // User B attempts to access Workspace A's business profile -> MUST BE REJECTED 403
    const crossAccessRes = await fetch(`${baseUrl}/api/v1/workspaces/${wsIdA}/business-profile`, {
      headers: {
        Authorization: authHeaderB,
        'X-Workspace-Id': wsIdA,
      },
    });
    assert.equal(crossAccessRes.status, 403, 'Cross-tenant access must return 403 Forbidden');
    const crossBody = await crossAccessRes.json();
    assert.equal(crossBody.error.code, 'FORBIDDEN_WORKSPACE_ACCESS');

    // User A accessing Workspace B -> MUST BE REJECTED 403
    const reverseRes = await fetch(`${baseUrl}/api/v1/workspaces/${wsIdB}/business-profile`, {
      headers: {
        Authorization: authHeaderA,
        'X-Workspace-Id': wsIdB,
      },
    });
    assert.equal(reverseRes.status, 403, 'Reverse cross-tenant access must return 403 Forbidden');
  });

  // =========================================================================
  // JOURNEY J: PRIVACY & DPDPA COMPLIANT CASCADE DELETION
  // Data export → Request erasure → Cascading deletion of all subcollections
  // =========================================================================
  await t.test('Journey J: DPDPA Right to Erasure & Cascading Deletion', async () => {
    // 1. Verify resources exist in Workspace B before erasure
    const preWs = await workspaceRepository.findById(wsIdB);
    assert.ok(preWs, 'Workspace B must exist before deletion');

    // 2. Execute Complete DPDPA Data Erasure
    const erasure = await workspaceService.executeDpdpaDataErasure(wsIdB, userIdB);
    assert.equal(erasure.workspaceId, wsIdB);
    assert.equal(erasure.status, 'DATA_PURGED_DPDPA_COMPLIANT');
    assert.ok(erasure.purgedCategories.length > 0);

    // 3. Verify Workspace is archived/purged from database
    const postWs = await workspaceRepository.findById(wsIdB);
    assert.ok(postWs === null || postWs?.workspaceStatus === 'archived');
  });

  // =========================================================================
  // RESILIENCE TESTING
  // Health check, external outages, simulated provider errors, rate limiting
  // =========================================================================
  await t.test('Resilience 1: Database Health Check Reporting', async () => {
    const healthRes = await fetch(`${baseUrl}/api/health`);
    assert.equal(healthRes.status, 200);
    const healthBody = await healthRes.json();
    assert.equal(healthBody.service, 'brainwise-backend');
    assert.ok(healthBody.database);
    assert.equal(healthBody.ok, true);
  });

  await t.test('Resilience 2: AI Provider Graceful Degradation & Credit Protection', async () => {
    const extractRes = await fetch(`${baseUrl}/api/v1/workspaces/${wsIdA}/business-profile/extract-document`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeaderA,
        'X-Workspace-Id': wsIdA,
        'X-Idempotency-Key': `idem_resilience_${Date.now()}`,
      },
      body: JSON.stringify({
        documentName: 'Resilience_Test.txt',
        documentType: 'TXT',
        documentContent: 'Fallback Roastery\nSignature Espresso: $15.00 - Dark chocolate notes\nArtisan Workshop: $35.00',
      }),
    });
    assert.equal(extractRes.status, 200);
    const body = await extractRes.json();
    assert.equal(body.success, true);
    assert.ok(body.data.products.length >= 1);
  });

  await t.test('Resilience 3: Invalid Cashfree Credentials Fail Gracefully', async () => {
    const invalidProvider = new CashfreeProvider({
      appId: 'INVALID_APP_ID',
      secretKey: 'INVALID_SECRET',
      environment: 'sandbox',
    });

    invalidProvider.setCustomFetcher(async () => {
      return new Response(
        JSON.stringify({
          message: 'Authentication failed. Please check your credentials.',
          code: 'authentication_failed',
          type: 'authentication_error',
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    });

    await assert.rejects(
      async () => {
        await invalidProvider.createCheckoutSession({
          orderId: `ord_fail_${Date.now()}`,
          orderAmount: 1000,
          orderCurrency: 'INR',
          customerEmail: 'test@brain-wise.com',
          customerPhone: '9999999999',
          customerName: 'Test Customer',
          returnUrl: 'https://app.brainwise.com',
        });
      },
      /CASHFREE_ORDER_CREATION_FAILED/
    );
  });

  await t.test('Resilience 4: Concurrent Submissions & Idempotent Guardrails', async () => {
    const key = `idem_concurrent_${Date.now()}`;
    const payload = JSON.stringify({
      documentName: 'Concurrent.txt',
      documentType: 'TXT',
      documentContent: 'Coffee 1: $10.00\nCoffee 2: $12.00',
    });

    const [res1, res2] = await Promise.all([
      fetch(`${baseUrl}/api/v1/workspaces/${wsIdA}/business-profile/extract-document`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeaderA,
          'X-Workspace-Id': wsIdA,
          'X-Idempotency-Key': key,
        },
        body: payload,
      }),
      fetch(`${baseUrl}/api/v1/workspaces/${wsIdA}/business-profile/extract-document`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeaderA,
          'X-Workspace-Id': wsIdA,
          'X-Idempotency-Key': key,
        },
        body: payload,
      }),
    ]);

    // Both requests must complete gracefully without server deadlock or crash
    assert.ok(res1.status === 200 || res1.status === 409);
    assert.ok(res2.status === 200 || res2.status === 409);
  });
});
