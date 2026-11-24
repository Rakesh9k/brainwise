/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

process.env.NODE_ENV = 'test';

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './app';
import { db } from './db/firestore';
import { businessMetricRepository } from './repositories/businessMetricRepository';
import { campaignPerformanceRepository } from './repositories/campaignPerformanceRepository';
import { proactiveInsightRepository } from './repositories/proactiveInsightRepository';
import { goalRepository, competitorRepository } from './repositories/goalRepository';
import { businessProfileRepository } from './repositories/businessProfileRepository';
import { productRepository } from './repositories/productRepository';
import { learningEngineService } from './services/learningEngineService';
import { memoryService } from './services/memoryService';
import { scheduledIntelligenceService } from './services/scheduledIntelligenceService';

test('PHASE 5 — CONTINUOUS LEARNING AND PROACTIVE BUSINESS INTELLIGENCE MASTER SUITE', async (t) => {
  db.resetForTesting();

  const app = createApp();
  const server = app.listen(0);
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const userHeaders = {
    Authorization: 'Bearer test-token-founder-alpha',
    'Content-Type': 'application/json',
  };

  const userBHeaders = {
    Authorization: 'Bearer test-token-founder-beta',
    'Content-Type': 'application/json',
  };

  let wsAId = '';
  let wsBId = '';

  try {
    // -------------------------------------------------------------------------
    // Setup: Initialize Two Isolated Workspaces (Tenant A and Tenant B)
    // -------------------------------------------------------------------------
    const resA = await fetch(`${baseUrl}/api/v1/workspaces`, {
      method: 'POST',
      headers: userHeaders,
      body: JSON.stringify({
        workspaceName: 'Apex Roasters Global',
        industry: 'Specialty Coffee',
        country: 'IN',
      }),
    });
    assert.strictEqual(resA.status, 201);
    const dataA = (await resA.json()) as any;
    wsAId = dataA.data.workspace.workspaceId;

    const resB = await fetch(`${baseUrl}/api/v1/workspaces`, {
      method: 'POST',
      headers: userBHeaders,
      body: JSON.stringify({
        workspaceName: 'Rival Botanicals',
        industry: 'Herbal Tea',
        country: 'IN',
      }),
    });
    assert.strictEqual(resB.status, 201);
    const dataB = (await resB.json()) as any;
    wsBId = dataB.data.workspace.workspaceId;

    // Seed profile, product, goal, competitor for Tenant A
    await businessProfileRepository.saveProfile({
      workspaceId: wsAId,
      businessName: 'Apex Roasters Global',
      industry: 'Specialty Coffee',
      tagline: 'Farm-to-Cup Artisanal Roasts',
      overviewSummary:
        'Single-estate ethically sourced specialty coffee beans roasted in small batches.',
      businessModel: 'D2C E-commerce and B2B Roastery',
      stage: 'Early Traction',
      location: 'Coorg & Bangalore, India',
      website: 'https://apexroasters.com',
      foundedYear: '2023',
      brandPositioning: 'Artisanal Single-Estate Transparency',
      revenueModel: 'Direct sales & subscriptions',
      targetAudience: 'Discerning coffee enthusiasts and boutique cafes.',
      valueProposition: 'Direct-trade traceability and precision medium roast profiles.',
      brandVoice: ['Sophisticated', 'Artisanal', 'Transparent'],
      brandPersonality: ['Artisanal', 'Traceable'],
      primaryGoals: ['Scale direct subscriptions'],
      provenance: {},
      strategicMemory: {
        usedAngles: [],
        fatiguedThemes: [],
        explicitExclusions: [],
        lastUpdated: new Date().toISOString(),
      },
      version: 1,
      lastUpdated: new Date().toISOString(),
      resourcesAndConstraints: {
        marketingBudget: {
          monthly: 5000,
          currency: 'USD',
        },
      },
    });

    await productRepository.createProduct({
      productId: 'prod_monsooned_malabar',
      workspaceId: wsAId,
      name: 'Monsooned Malabar Reserve',
      description: 'Aged arabica bean with intense crema and low acidity.',
      category: 'Single Origin',
      price: 28,
      currency: 'USD',
      features: ['Monsooned curing', 'Low acidity'],
      benefits: ['Smooth rich crema'],
      targetCustomer: 'Pour-over and espresso connoisseurs',
      differentiation: 'Direct trade aged arabica',
      status: 'active',
      source: 'USER_CONFIRMED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const activeGoal = await goalRepository.createGoal({
      goalId: 'goal_subscriptions_100',
      workspaceId: wsAId,
      title: 'Acquire 100 Direct Coffee Subscriptions',
      category: 'acquisition',
      targetValue: 100,
      currentValue: 15,
      unit: 'subscribers',
      targetDate: '2026-12-31',
      status: 'on_track',
    });

    await competitorRepository.create({
      competitorId: 'comp_industrial_coffee',
      workspaceId: wsAId,
      name: 'Industrial Coffee Co',
      website: 'https://industrialcoffee.example.com',
      industry: 'Specialty Coffee',
      location: 'National',
      strengths: ['Mass distribution', 'Low price point'],
      weaknesses: ['Opaque sourcing', 'Industrial over-roasting'],
      positioning: 'Convenience mass market',
      pricingRange: 'Budget',
      marketShare: 'High',
      monitoringFrequency: 'Weekly',
      isMonitored: true,
      lastResearched: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // =========================================================================
    // Test 1: Campaign Performance Ingestion (Calculations: CTR, CVR, CPA, ROAS)
    // =========================================================================
    await t.test('Test 1: Campaign performance ingestion and derived calculations', async () => {
      const expRes = await fetch(`${baseUrl}/api/v1/workspaces/${wsAId}/learning/campaigns`, {
        method: 'POST',
        headers: userHeaders,
        body: JSON.stringify({
          campaignName: 'Instagram Micro-Lot Launch',
          objective: 'Drive direct web-store orders',
          hypothesis: 'Artisan roast process video will lower CPA under $15',
          channel: 'Instagram',
          executionDate: '2026-11-01',
          budget: 1000,
          cost: 800,
          impressions: 20000,
          clicks: 1000,
          leads: 120,
          conversions: 60,
          revenue: 3600,
          currency: 'USD',
          connectedGoalId: activeGoal.goalId,
        }),
      });

      assert.strictEqual(expRes.status, 201);
      const expBody = (await expRes.json()) as any;
      assert.strictEqual(expBody.success, true);
      const exp = expBody.data;

      // Assert derived calculations:
      // CTR: (1000 / 20000) * 100 = 5%
      // CVR: (60 / 1000) * 100 = 6%
      // CPA: 800 / 60 = 13.33
      // ROAS: 3600 / 800 = 4.5
      assert.strictEqual(exp.conversionMetrics.ctr, 5);
      assert.strictEqual(exp.conversionMetrics.cvr, 6);
      assert.strictEqual(exp.conversionMetrics.cpa, 13.33);
      assert.strictEqual(exp.conversionMetrics.roas, 4.5);
      assert.strictEqual(exp.outcome, 'SUCCESS');
      assert.strictEqual(exp.sampleSizeAdequate, true);
      assert.strictEqual(exp.attributionConfidence, 'HIGH');
    });

    // =========================================================================
    // Test 2: Missing Analytics Data Handling (Inconclusive / Unknown)
    // =========================================================================
    await t.test(
      'Test 2: Missing analytics data handling (INCONCLUSIVE and UNKNOWN metrics)',
      async () => {
        const expRes = await fetch(`${baseUrl}/api/v1/workspaces/${wsAId}/learning/campaigns`, {
          method: 'POST',
          headers: userHeaders,
          body: JSON.stringify({
            campaignName: 'Podcast Sponsorship Pilot',
            objective: 'Brand awareness',
            hypothesis: 'Host-read mention will generate buzz',
            channel: 'Podcast',
            executionDate: '2026-11-05',
            budget: 500,
            cost: 500,
            clicks: 0,
            conversions: 0,
            currency: 'USD',
          }),
        });

        assert.strictEqual(expRes.status, 201);
        const expBody = (await expRes.json()) as any;
        const exp = expBody.data;

        assert.strictEqual(exp.outcome, 'INCONCLUSIVE');
        assert.strictEqual(exp.conversionMetrics.ctr, undefined);
        assert.strictEqual(exp.conversionMetrics.cvr, undefined);
        assert.strictEqual(exp.conversionMetrics.cpa, undefined);
        assert.strictEqual(exp.conversionMetrics.roas, undefined);
        assert.strictEqual(exp.sampleSizeAdequate, false);
        assert.strictEqual(exp.attributionConfidence, 'LOW');
      }
    );

    // =========================================================================
    // Test 3: Duplicate Events Deduplication (Idempotency Key)
    // =========================================================================
    await t.test('Test 3: Duplicate metric events deduplication with idempotency key', async () => {
      const payload = {
        metricType: 'CONVERSION',
        metricName: 'Checkout Purchase',
        definition: 'Completed web checkout purchase',
        value: 1,
        currency: 'USD',
        measurementPeriod: { startDate: '2026-11-01', endDate: '2026-11-01' },
        source: 'Shopify Webhook',
        attributionModel: 'LAST_TOUCH',
        idempotencyKey: 'shopify_order_998811',
      };

      // Ingest once
      const res1 = await fetch(`${baseUrl}/api/v1/workspaces/${wsAId}/learning/metrics`, {
        method: 'POST',
        headers: userHeaders,
        body: JSON.stringify(payload),
      });
      assert.strictEqual(res1.status, 201);
      const body1 = (await res1.json()) as any;

      // Ingest identical duplicate
      const res2 = await fetch(`${baseUrl}/api/v1/workspaces/${wsAId}/learning/metrics`, {
        method: 'POST',
        headers: userHeaders,
        body: JSON.stringify(payload),
      });
      assert.strictEqual(res2.status, 200, 'Duplicate returns 200 with meta.isDuplicate: true');
      const body2 = (await res2.json()) as any;
      assert.strictEqual(body2.meta.isDuplicate, true);

      // Idempotency: exact same metric event ID returned without creating a new duplicate
      assert.strictEqual(body1.data.metricId, body2.data.metricId);

      const allMetrics = await businessMetricRepository.listByWorkspace(wsAId);
      const matches = allMetrics.filter((m) => m.idempotencyKey === 'shopify_order_998811');
      assert.strictEqual(matches.length, 1, 'Only one record must exist in repository');
    });

    // =========================================================================
    // Test 4: Incorrect Metric Attribution Separation (Vanity vs Commercial Revenue)
    // =========================================================================
    await t.test(
      'Test 4: Strict separation between vanity metrics and commercial revenue',
      async () => {
        // Ingest 50,000 views (vanity metric)
        await fetch(`${baseUrl}/api/v1/workspaces/${wsAId}/learning/metrics`, {
          method: 'POST',
          headers: userHeaders,
          body: JSON.stringify({
            metricType: 'VIEW',
            metricName: 'Instagram Video Views',
            definition: 'Reel view count',
            value: 50000,
            measurementPeriod: { startDate: '2026-11-01', endDate: '2026-11-01' },
            source: 'Instagram Organic',
            attributionModel: 'UNATTRIBUTED',
          }),
        });

        // Ingest $1,400 revenue (commercial metric)
        await fetch(`${baseUrl}/api/v1/workspaces/${wsAId}/learning/metrics`, {
          method: 'POST',
          headers: userHeaders,
          body: JSON.stringify({
            metricType: 'REVENUE',
            metricName: 'Store Checkout GMV',
            definition: 'Store Checkout GMV',
            value: 1400,
            currency: 'USD',
            measurementPeriod: { startDate: '2026-11-01', endDate: '2026-11-01' },
            source: 'Stripe Webhook',
            attributionModel: 'FIRST_TOUCH',
          }),
        });

        const metrics = await businessMetricRepository.listByWorkspace(wsAId);
        const vanity = metrics.filter((m) => m.metricType === 'VIEW' || m.metricType === 'CLICK');
        const commercial = metrics.filter(
          (m) => m.metricType === 'REVENUE' || m.metricType === 'CONVERSION'
        );

        assert.strictEqual(
          vanity.some((v) => v.metricType === 'VIEW' && v.value === 50000),
          true
        );
        assert.strictEqual(
          commercial.some((c) => c.metricType === 'REVENUE' && c.value === 1400),
          true
        );

        // Verify scheduled intelligence report synthesizes correctly
        const report = await scheduledIntelligenceService.generateReport({
          workspaceId: wsAId,
          frequency: 'DAILY',
        });
        assert.ok(report.summary.length > 0);
        assert.strictEqual(report.notificationDispatched, true);
      }
    );

    // =========================================================================
    // Test 5: Performance Decline Detection (CPA spike / Failure Trigger)
    // =========================================================================
    await t.test('Test 5: Performance decline detection generates proactive alert', async () => {
      // Ingest a failing campaign experiment with high CPA
      await fetch(`${baseUrl}/api/v1/workspaces/${wsAId}/learning/campaigns`, {
        method: 'POST',
        headers: userHeaders,
        body: JSON.stringify({
          campaignName: 'Generic Facebook Retargeting',
          objective: 'Conversion',
          hypothesis: 'Standard discounts will convert cart abandoners',
          channel: 'Facebook',
          executionDate: '2026-11-10',
          budget: 1500,
          cost: 1400,
          impressions: 15000,
          clicks: 300,
          leads: 10,
          conversions: 8,
          revenue: 200,
          currency: 'USD',
        }),
      });

      // Trigger proactive evaluation
      const evalRes = await fetch(
        `${baseUrl}/api/v1/workspaces/${wsAId}/learning/proactive/evaluate`,
        {
          method: 'POST',
          headers: userHeaders,
        }
      );
      assert.strictEqual(evalRes.status, 200);
      const evalBody = (await evalRes.json()) as any;
      const insights = evalBody.data;

      const dropAlert = insights.find((i: any) => i.triggerType === 'PERFORMANCE_DROP');
      assert.ok(dropAlert, 'Must generate PERFORMANCE_DROP alert');
      assert.strictEqual(dropAlert.priority, 'HIGH');
      assert.strictEqual(dropAlert.relevantDepartment, 'MARKETING');
      assert.strictEqual(dropAlert.status, 'ACTIVE');
      assert.ok(dropAlert.suggestedAction.includes('Facebook'));
    });

    // =========================================================================
    // Test 6: Opportunity Generation (Underpromoted Product Discovery)
    // =========================================================================
    await t.test('Test 6: Proactive opportunity generation for underpromoted product', async () => {
      // Evaluates triggers where 'Monsooned Malabar Reserve' has had no campaigns yet
      const allInsights = await proactiveInsightRepository.listByWorkspace(wsAId);
      const prodOpportunity = allInsights.find((i) => i.triggerType === 'UNDERPROMOTED_PRODUCT');

      assert.ok(prodOpportunity, 'Must generate UNDERPROMOTED_PRODUCT opportunity');
      assert.ok(prodOpportunity.title.includes('Monsooned Malabar Reserve'));
      assert.strictEqual(prodOpportunity.relevantDepartment, 'MARKETING');
      assert.strictEqual(prodOpportunity.confidenceBand, 'CONFIRMED');
    });

    // =========================================================================
    // Test 7: Weak Evidence Handling (Marked SUSPECTED, Not Permanent Rule)
    // =========================================================================
    await t.test(
      'Test 7: Weak evidence handling creates SUSPECTED pattern with isPermanentRule: false',
      async () => {
        // Record only 1 isolated experiment on TikTok
        await campaignPerformanceRepository.create({
          experimentId: 'exp_tiktok_pilot',
          workspaceId: wsAId,
          campaignName: 'TikTok Roasting Clips',
          objective: 'Top of funnel discovery',
          hypothesis: 'Bite-sized coffee bean origin clips will lower CPC',
          targetAudience: 'Gen-Z and young professionals',
          channel: 'TikTok',
          budget: 150,
          cost: 150,
          currency: 'USD',
          executionDate: '2026-11-12',
          results: {
            clicks: 80,
            leads: 3,
            conversions: 2,
            revenue: 60,
          },
          conversionMetrics: {
            ctr: 2.0,
            cvr: 2.5,
            cpa: 75,
            roas: 0.4,
          },
          sampleSizeAdequate: false,
          attributionConfidence: 'LOW',
          outcome: 'FAILURE',
          lessonsLearned: ['Short videos had views but high drop-off on web checkout.'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        // Synthesize patterns
        const patternsRes = await fetch(
          `${baseUrl}/api/v1/workspaces/${wsAId}/learning/patterns/synthesize`,
          {
            method: 'POST',
            headers: userHeaders,
          }
        );
        assert.strictEqual(patternsRes.status, 200);
        const patternsBody = (await patternsRes.json()) as any;
        const patterns = patternsBody.data;

        const tiktokPattern = patterns.find((p: any) => p.title.includes('TikTok'));
        assert.ok(tiktokPattern, 'Must identify TikTok pattern');
        assert.strictEqual(tiktokPattern.confidenceBand, 'SUSPECTED');
        assert.strictEqual(tiktokPattern.confidence < 0.85, true);
        assert.strictEqual(
          tiktokPattern.isPermanentRule,
          false,
          'Guardrail: must never become permanent business rule without rigorous sample'
        );
      }
    );

    // =========================================================================
    // Test 8: User Rejection Capture (Rejection reason & metadata)
    // =========================================================================
    let targetInsightId = '';
    await t.test('Test 8: User rejection capture with audit reason', async () => {
      const activeInsights = await proactiveInsightRepository.listByWorkspace(wsAId);
      assert.ok(activeInsights.length > 0);
      targetInsightId = activeInsights[0].insightId;

      const actRes = await fetch(
        `${baseUrl}/api/v1/workspaces/${wsAId}/learning/recommendations/act`,
        {
          method: 'POST',
          headers: userHeaders,
          body: JSON.stringify({
            insightId: targetInsightId,
            action: 'REJECT',
            reason: 'We are currently transitioning warehouse packaging partners until next month.',
            userRole: 'owner',
          }),
        }
      );

      assert.strictEqual(actRes.status, 200);
      const actBody = (await actRes.json()) as any;
      assert.strictEqual(actBody.success, true);
      assert.strictEqual(actBody.data.status, 'DISMISSED');
      assert.ok(actBody.data.dismissalMetadata);
      assert.strictEqual(
        actBody.data.dismissalMetadata.reason,
        'We are currently transitioning warehouse packaging partners until next month.'
      );
    });

    // =========================================================================
    // Test 9: Dismissed Recommendation Suppression (Delta < 25% Guardrail)
    // =========================================================================
    await t.test(
      'Test 9: Suppress dismissed recommendation from regenerating unless material delta >= 25%',
      async () => {
        // Re-evaluate triggers immediately
        const reEvalRes = await fetch(
          `${baseUrl}/api/v1/workspaces/${wsAId}/learning/proactive/evaluate`,
          {
            method: 'POST',
            headers: userHeaders,
          }
        );
        assert.strictEqual(reEvalRes.status, 200);
        const reEvalBody = (await reEvalRes.json()) as any;
        const reEvalInsights = reEvalBody.data;

        // The rejected insight must NOT be recreated or re-surfaced
        const reAppeared = reEvalInsights.find((i: any) => i.insightId === targetInsightId);
        assert.strictEqual(
          reAppeared,
          undefined,
          'Dismissed recommendation must remain suppressed'
        );
      }
    );

    // =========================================================================
    // Test 10: Scheduled Report Generation (Daily/Weekly Business Review)
    // =========================================================================
    await t.test(
      'Test 10: Scheduled intelligence report generation with run-rate and alerts',
      async () => {
        const genRes = await fetch(
          `${baseUrl}/api/v1/workspaces/${wsAId}/learning/reports/generate`,
          {
            method: 'POST',
            headers: userHeaders,
            body: JSON.stringify({
              frequency: 'WEEKLY',
              reportType: 'WEEKLY_REVIEW',
            }),
          }
        );

        assert.strictEqual(genRes.status, 201);
        const genBody = (await genRes.json()) as any;
        const report = genBody.data;

        assert.strictEqual(report.reportType, 'WEEKLY_REVIEW');
        assert.strictEqual(report.workspaceId, wsAId);
        assert.ok(report.summary.length > 20);
        assert.strictEqual(report.notificationDispatched, true);
        assert.ok(Object.keys(report.goalProgressSummary).length >= 1);
      }
    );

    // =========================================================================
    // Test 11: Cross-Tenant Learning Isolation (Zero Leakage)
    // =========================================================================
    await t.test(
      'Test 11: Cross-tenant learning isolation guarantees zero data leakage',
      async () => {
        // Ingest private metric for Tenant B
        await fetch(`${baseUrl}/api/v1/workspaces/${wsBId}/learning/metrics`, {
          method: 'POST',
          headers: userBHeaders,
          body: JSON.stringify({
            metricType: 'REVENUE',
            definition: 'Boutique Chamomile Tea GMV',
            value: 9999,
            currency: 'USD',
            measurementPeriod: 'DAILY',
            source: 'Boutique POS',
            attributionModel: 'DIRECT',
          }),
        });

        // Tenant A attempts to fetch metrics
        const resA = await fetch(`${baseUrl}/api/v1/workspaces/${wsAId}/learning/metrics`, {
          method: 'GET',
          headers: userHeaders,
        });
        const dataA = (await resA.json()) as any;
        const metricsA = dataA.data;

        const hasTenantBMetric = metricsA.some(
          (m: any) => m.definition.includes('Chamomile') || m.value === 9999
        );
        assert.strictEqual(hasTenantBMetric, false, 'Tenant A must NEVER see Tenant B metrics');

        // Tenant A queries patterns
        const patA = await learningEngineService.listPatterns(wsAId);
        const hasTenantBPattern = patA.some(
          (p: any) => p.title.includes('Chamomile') || p.workspaceId === wsBId
        );
        assert.strictEqual(
          hasTenantBPattern,
          false,
          'Tenant A must NEVER see Tenant B learned patterns'
        );
      }
    );

    // =========================================================================
    // Test 12: Business Goal Progress Updates
    // =========================================================================
    await t.test('Test 12: Business goal progress updates on campaign success', async () => {
      // activeGoal started at 15 subscribers.
      // Test 1 added 60 conversions with connectedGoalId = activeGoal.goalId.
      const updatedGoal = await goalRepository.findById(wsAId, activeGoal.goalId);
      assert.ok(updatedGoal);
      assert.strictEqual(updatedGoal.currentValue, 75, 'Goal progress should reflect 15 + 60 = 75');
      assert.strictEqual(updatedGoal.status, 'on_track');

      // Ingest another experiment with 30 conversions to reach 105 (exceeding 100 target)
      await fetch(`${baseUrl}/api/v1/workspaces/${wsAId}/learning/campaigns`, {
        method: 'POST',
        headers: userHeaders,
        body: JSON.stringify({
          campaignName: 'Black Friday Espresso Sprint',
          objective: 'Direct subscriptions',
          hypothesis: 'Gift bundle conversion',
          channel: 'Email',
          executionDate: '2026-11-20',
          budget: 200,
          cost: 180,
          clicks: 250,
          conversions: 30,
          revenue: 1200,
          currency: 'USD',
          connectedGoalId: activeGoal.goalId,
        }),
      });

      const achievedGoal = await goalRepository.findById(wsAId, activeGoal.goalId);
      assert.ok(achievedGoal);
      assert.strictEqual(achievedGoal.currentValue, 100, 'Current value capped at 100 target');
      assert.strictEqual(
        achievedGoal.status,
        'achieved',
        'Goal status must transition to achieved'
      );
    });

    // =========================================================================
    // Test 13: Historical Strategy Improvement (Episodic Memory Grounding)
    // =========================================================================
    await t.test(
      'Test 13: Historical strategy improvement grounds next decisions in prior learnings',
      async () => {
        const episodes = await memoryService.listEpisodes(wsAId);
        assert.ok(episodes.length >= 2, 'Episodes must be recorded in episodic memory');

        const successEpisode = episodes.find((e: any) => e.title.includes('Instagram Micro-Lot'));
        assert.ok(successEpisode);
        assert.strictEqual(successEpisode.activityType, 'experiment_success');
        assert.ok(successEpisode.learnings.length > 0);
      }
    );

    // =========================================================================
    // Test 14: Stale Insight Expiration
    // =========================================================================
    await t.test('Test 14: Stale insights automatically expire past expirationDate', async () => {
      // Create an insight with an expirationDate in the past
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const stale = await proactiveInsightRepository.create({
        insightId: 'ins_stale_flash_sale',
        workspaceId: wsAId,
        triggerType: 'MARKET_OPPORTUNITY',
        title: 'Expired Weekend Flash Promo',
        description: 'Temporary flash opportunity has elapsed.',
        reason: 'Expired opportunity.',
        evidence: [],
        sources: ['Manual Promo'],
        confidence: 0.9,
        confidenceBand: 'CONFIRMED',
        priority: 'LOW',
        businessImpact: 'None',
        suggestedAction: 'Archive',
        relevantDepartment: 'MARKETING',
        status: 'ACTIVE',
        expirationDate: pastDate,
        createdAt: pastDate,
        updatedAt: pastDate,
      });

      assert.strictEqual(stale.status, 'ACTIVE');

      // Run evaluateTriggers or expireStaleInsights
      await proactiveInsightRepository.expireStaleInsights(wsAId);

      const refreshed = await proactiveInsightRepository.findById(wsAId, 'ins_stale_flash_sale');
      assert.ok(refreshed);
      assert.strictEqual(
        refreshed.status,
        'EXPIRED',
        'Insight must transition to EXPIRED when expirationDate has passed'
      );
    });
  } finally {
    server.close();
  }
});
