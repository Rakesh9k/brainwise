/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

process.env.NODE_ENV = 'test';

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './app';
import { db } from './db/firestore';
import { campaignPerformanceRepository } from './repositories/campaignPerformanceRepository';
import { structuredInsightRepository } from './repositories/structuredInsightRepository';
import { businessProfileRepository } from './repositories/businessProfileRepository';
import type { StructuredBusinessInsight } from '../types/continuousLearning';

test('FEATURE 4: CONTINUOUS BUSINESS LEARNING — 12 ACCEPTANCE TESTS MASTER SUITE', async (t) => {
  db.resetForTesting();

  const app = createApp();
  const server = app.listen(0);
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const userHeadersA = {
    Authorization: 'Bearer test-token-founder-alpha',
    'Content-Type': 'application/json',
  };

  const userHeadersB = {
    Authorization: 'Bearer test-token-founder-beta',
    'Content-Type': 'application/json',
  };

  let wsAId = '';
  let wsBId = '';

  try {
    // -------------------------------------------------------------------------
    // Setup: Initialize Two Isolated Workspaces (Tenant A & Tenant B)
    // -------------------------------------------------------------------------
    const resA = await fetch(`${baseUrl}/api/v1/workspaces`, {
      method: 'POST',
      headers: userHeadersA,
      body: JSON.stringify({
        workspaceName: 'Artisan Coffee Roasters',
        industry: 'Specialty Coffee',
        country: 'IN',
      }),
    });
    assert.strictEqual(resA.status, 201);
    const dataA = (await resA.json()) as any;
    wsAId = dataA.data.workspace.workspaceId;

    const resB = await fetch(`${baseUrl}/api/v1/workspaces`, {
      method: 'POST',
      headers: userHeadersB,
      body: JSON.stringify({
        workspaceName: 'Herbal Infusions Ltd',
        industry: 'Wellness Tea',
        country: 'IN',
      }),
    });
    assert.strictEqual(resB.status, 201);
    const dataB = (await resB.json()) as any;
    wsBId = dataB.data.workspace.workspaceId;

    // Seed Profile for Workspace A
    await businessProfileRepository.saveProfile({
      workspaceId: wsAId,
      businessName: 'Artisan Coffee Roasters',
      industry: 'Specialty Coffee',
      tagline: 'Direct-Trade Single-Origin Roastery',
      overviewSummary: 'Precision medium roasts directly sourced from estate farmers.',
      businessModel: 'D2C E-commerce and Subscriptions',
      stage: 'Early Traction',
      location: 'Bangalore, India',
      brandPositioning: 'Artisanal Traceability & Premium Roast Quality',
      customerPersonas: [
        {
          name: 'Home Barista Connoisseur',
          painPoints: ['Inconsistent commercial beans', 'Opaque harvest dates'],
          objections: ['High shipping cost', 'Unfamiliar brewing equipment needed'],
        },
      ] as any,
      provenance: {},
      strategicMemory: {
        usedAngles: [],
        fatiguedThemes: [],
        explicitExclusions: [],
        lastUpdated: new Date().toISOString(),
      },
      version: 1,
      lastUpdated: new Date().toISOString(),
    } as any);

    // =========================================================================
    // Acceptance Test 1: Successful Campaign Learning
    // =========================================================================
    await t.test(
      'Scenario 1: Successful campaign learning derives confirmed insights',
      async () => {
        const expPayload = {
          campaignName: 'Instagram Micro-Lot Craft Story',
          objective: 'Drive web subscriptions',
          hypothesis:
            'Artisan roast process video and origin story will achieve CPA < $15 and ROAS > 3.0',
          strategy: 'EDUCATIONAL_CONTENT',
          targetAudience: 'Home Barista Connoisseurs',
          channel: 'Instagram',
          budget: 1000,
          cost: 800,
          currency: 'USD',
          executionDate: '2026-11-01',
          successCriteria: 'CPA under $15 and positive ROAS',
          baselineMetrics: { cpa: 22, cvr: 2.1 },
          dataSources: ['Meta Ads Manager', 'Shopify Storefront'],
          impressions: 25000,
          clicks: 1200,
          leads: 150,
          conversions: 65,
          revenue: 3900,
          targetConversions: 50,
        };

        const res = await fetch(`${baseUrl}/api/v1/workspaces/${wsAId}/learning/campaigns`, {
          method: 'POST',
          headers: userHeadersA,
          body: JSON.stringify(expPayload),
        });

        assert.strictEqual(res.status, 201);
        const body = (await res.json()) as any;
        assert.strictEqual(body.success, true);
        const exp = body.data;

        // Assert calculations:
        // CTR: (1200 / 25000) * 100 = 4.8%
        // CVR: (65 / 1200) * 100 = 5.42%
        // CPA: 800 / 65 = 12.31
        // ROAS: 3900 / 800 = 4.88
        assert.strictEqual(exp.conversionMetrics.ctr, 4.8);
        assert.strictEqual(exp.conversionMetrics.cvr, 5.42);
        assert.strictEqual(exp.conversionMetrics.cpa, 12.31);
        assert.strictEqual(exp.conversionMetrics.roas, 4.88);
        assert.strictEqual(exp.outcome, 'SUCCESS');
        assert.strictEqual(exp.finalAssessment, 'SUCCESS');
        assert.strictEqual(exp.sampleSizeAdequate, true);
        assert.strictEqual(exp.attributionConfidence, 'HIGH');
        assert.ok(exp.lessonsLearned.length > 0);

        // Synthesize patterns and structured insights
        const synRes = await fetch(
          `${baseUrl}/api/v1/workspaces/${wsAId}/learning/patterns/synthesize`,
          {
            method: 'POST',
            headers: userHeadersA,
          }
        );
        assert.strictEqual(synRes.status, 200);

        const insightsRes = await fetch(`${baseUrl}/api/v1/workspaces/${wsAId}/learning/insights`, {
          method: 'GET',
          headers: userHeadersA,
        });
        assert.strictEqual(insightsRes.status, 200);
        const insightsBody = (await insightsRes.json()) as any;
        const insights: StructuredBusinessInsight[] = insightsBody.data;

        // Must have learned messaging pattern or channel effectiveness
        const eduInsight = insights.find((i) => i.category === 'MESSAGING_PATTERN');
        assert.ok(eduInsight, 'Must generate MESSAGING_PATTERN insight');
        assert.ok(eduInsight.confidence >= 0.7);
        assert.strictEqual(eduInsight.sampleSizeAdequate, true);
        assert.ok(eduInsight.supportingEvidence.length >= 1);
        assert.ok(eduInsight.actionableRecommendation.length > 10);
      }
    );

    // =========================================================================
    // Acceptance Test 2: Failed Campaign Learning
    // =========================================================================
    await t.test(
      'Scenario 2: Failed campaign learning identifies underperforming tactics & root causes',
      async () => {
        const failPayload = {
          campaignName: 'Generic Black Friday Discount Sprint',
          objective: 'Drive flash sales',
          hypothesis: '25% site-wide discount banner will convert cart abandoners',
          strategy: 'DISCOUNT_PROMOTION',
          targetAudience: 'Price-sensitive shoppers',
          channel: 'Facebook',
          budget: 1500,
          cost: 1400,
          currency: 'USD',
          executionDate: '2026-11-05',
          successCriteria: 'CPA under $20 and ROAS > 2.0',
          impressions: 18000,
          clicks: 400,
          leads: 12,
          conversions: 8,
          revenue: 250,
          targetConversions: 40,
        };

        const res = await fetch(`${baseUrl}/api/v1/workspaces/${wsAId}/learning/campaigns`, {
          method: 'POST',
          headers: userHeadersA,
          body: JSON.stringify(failPayload),
        });

        assert.strictEqual(res.status, 201);
        const body = (await res.json()) as any;
        const exp = body.data;

        // CPA: 1400 / 8 = $175, ROAS: 250 / 1400 = 0.18
        assert.strictEqual(exp.conversionMetrics.cpa, 175);
        assert.strictEqual(exp.conversionMetrics.roas, 0.18);
        assert.strictEqual(exp.outcome, 'FAILURE');
        assert.strictEqual(exp.finalAssessment, 'FAILURE');
        assert.ok(
          exp.lessonsLearned.some((l: string) => l.includes('High CPA') || l.includes('fell short'))
        );

        // Synthesize patterns to verify failed strategy insight
        await fetch(`${baseUrl}/api/v1/workspaces/${wsAId}/learning/patterns/synthesize`, {
          method: 'POST',
          headers: userHeadersA,
        });

        const insightsRes = await fetch(
          `${baseUrl}/api/v1/workspaces/${wsAId}/learning/insights?category=FAILED_STRATEGY`,
          {
            method: 'GET',
            headers: userHeadersA,
          }
        );
        const insightsBody = (await insightsRes.json()) as any;
        const failedInsights: StructuredBusinessInsight[] = insightsBody.data;

        assert.ok(failedInsights.length >= 1, 'Must record FAILED_STRATEGY insight');
        const discFail = failedInsights.find(
          (f) => f.title.includes('Discount') || f.title.includes('Facebook')
        );
        assert.ok(discFail);
        assert.ok(discFail.tacticsToAvoid && discFail.tacticsToAvoid.length > 0);
      }
    );

    // =========================================================================
    // Acceptance Test 3: Incomplete Metrics Handling
    // =========================================================================
    await t.test(
      'Scenario 3: Incomplete metrics handled gracefully as INCONCLUSIVE with zero fabrication',
      async () => {
        const incompletePayload = {
          campaignName: 'Podcast Host Read Sponsorship',
          objective: 'Brand awareness and consideration',
          hypothesis: 'Specialty coffee podcast mention will drive discovery',
          channel: 'Podcast',
          budget: 600,
          cost: 600,
          currency: 'USD',
          executionDate: '2026-11-08',
          clicks: 0,
          conversions: 0,
          views: 0,
        };

        const res = await fetch(`${baseUrl}/api/v1/workspaces/${wsAId}/learning/campaigns`, {
          method: 'POST',
          headers: userHeadersA,
          body: JSON.stringify(incompletePayload),
        });

        assert.strictEqual(res.status, 201);
        const body = (await res.json()) as any;
        const exp = body.data;

        assert.strictEqual(exp.outcome, 'INCONCLUSIVE');
        assert.strictEqual(exp.finalAssessment, 'INCONCLUSIVE');
        assert.strictEqual(exp.sampleSizeAdequate, false);
        assert.strictEqual(exp.attributionConfidence, 'LOW');
        assert.strictEqual(exp.conversionMetrics.ctr, undefined);
        assert.strictEqual(exp.conversionMetrics.cvr, undefined);
        assert.strictEqual(exp.conversionMetrics.cpa, undefined);
        assert.strictEqual(exp.conversionMetrics.roas, undefined);
      }
    );

    // =========================================================================
    // Acceptance Test 4: Duplicate Analytics Events (Idempotency)
    // =========================================================================
    await t.test(
      'Scenario 4: Duplicate analytics events deduplicated via idempotency key',
      async () => {
        const metricPayload = {
          metricType: 'CONVERSION',
          metricName: 'Online Subscription Checkout',
          definition: 'Completed subscriber purchase',
          value: 1,
          currency: 'USD',
          measurementPeriod: { startDate: '2026-11-10', endDate: '2026-11-10' },
          source: 'Shopify Webhook',
          attributionModel: 'LAST_TOUCH',
          idempotencyKey: 'idem_shopify_checkout_sub_9944',
        };

        // Ingest once
        const res1 = await fetch(`${baseUrl}/api/v1/workspaces/${wsAId}/learning/metrics`, {
          method: 'POST',
          headers: userHeadersA,
          body: JSON.stringify(metricPayload),
        });
        assert.strictEqual(res1.status, 201);
        const body1 = (await res1.json()) as any;
        assert.strictEqual(body1.meta.isDuplicate, false);

        // Ingest duplicate
        const res2 = await fetch(`${baseUrl}/api/v1/workspaces/${wsAId}/learning/metrics`, {
          method: 'POST',
          headers: userHeadersA,
          body: JSON.stringify(metricPayload),
        });
        assert.strictEqual(res2.status, 200, 'Duplicate returns 200 with meta.isDuplicate: true');
        const body2 = (await res2.json()) as any;
        assert.strictEqual(body2.meta.isDuplicate, true);
        assert.strictEqual(body1.data.metricId, body2.data.metricId);

        // Verify campaign idempotency as well
        const campaignPayload = {
          campaignName: 'Search Ads Trial',
          objective: 'Test Google Search terms',
          hypothesis: 'Single origin terms convert',
          channel: 'Google Search',
          budget: 300,
          cost: 300,
          clicks: 150,
          conversions: 10,
          idempotencyKey: 'idem_google_search_batch_01',
        };

        const cRes1 = await fetch(`${baseUrl}/api/v1/workspaces/${wsAId}/learning/campaigns`, {
          method: 'POST',
          headers: userHeadersA,
          body: JSON.stringify(campaignPayload),
        });
        assert.strictEqual(cRes1.status, 201);
        const cBody1 = (await cRes1.json()) as any;

        const cRes2 = await fetch(`${baseUrl}/api/v1/workspaces/${wsAId}/learning/campaigns`, {
          method: 'POST',
          headers: userHeadersA,
          body: JSON.stringify(campaignPayload),
        });
        assert.strictEqual(cRes2.status, 200);
        const cBody2 = (await cRes2.json()) as any;
        assert.strictEqual(cBody2.meta.isDuplicate, true);
        assert.strictEqual(cBody1.data.experimentId, cBody2.data.experimentId);
      }
    );

    // =========================================================================
    // Acceptance Test 5: Small Sample Sizes
    // =========================================================================
    await t.test(
      'Scenario 5: Small sample sizes flagged as SUSPECTED and cannot automatically become permanent rules',
      async () => {
        // Record an isolated TikTok experiment with only 25 clicks
        await campaignPerformanceRepository.create({
          experimentId: 'exp_tiktok_pilot_small',
          workspaceId: wsAId,
          campaignName: 'TikTok Coffee Hacks Pilot',
          objective: 'Gen Z discovery',
          hypothesis: '15-second latte art hacks will drive viral traffic',
          targetAudience: 'College Students & Gen-Z',
          channel: 'TikTok',
          budget: 80,
          cost: 80,
          currency: 'USD',
          executionDate: '2026-11-12',
          results: { clicks: 25, conversions: 1, revenue: 20 },
          conversionMetrics: { cvr: 4.0, cpa: 80 },
          outcome: 'FAILURE',
          sampleSizeAdequate: false,
          attributionConfidence: 'LOW',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        // Synthesize patterns
        await fetch(`${baseUrl}/api/v1/workspaces/${wsAId}/learning/patterns/synthesize`, {
          method: 'POST',
          headers: userHeadersA,
        });

        const patternsRes = await fetch(`${baseUrl}/api/v1/workspaces/${wsAId}/learning/patterns`, {
          method: 'GET',
          headers: userHeadersA,
        });
        const patterns = ((await patternsRes.json()) as any).data;
        const tiktokPattern = patterns.find((p: any) => p.title.includes('TikTok'));

        assert.ok(tiktokPattern, 'Must detect TikTok pattern');
        assert.strictEqual(tiktokPattern.confidenceBand, 'SUSPECTED');
        assert.strictEqual(tiktokPattern.sampleSize, 25);
        assert.strictEqual(
          tiktokPattern.isPermanentRule,
          false,
          'Weak evidence must NOT be a permanent rule'
        );

        // Attempt to promote to permanent rule via API without adequate sample size
        const insights = await structuredInsightRepository.listByWorkspace(wsAId);
        const tiktokInsight = insights.find((i) => i.title.includes('TikTok'));
        if (tiktokInsight) {
          const promoteRes = await fetch(
            `${baseUrl}/api/v1/workspaces/${wsAId}/learning/insights/${tiktokInsight.insightId}/promote-rule`,
            {
              method: 'POST',
              headers: userHeadersA,
            }
          );
          assert.strictEqual(
            promoteRes.status,
            400,
            'Guardrail: must reject promotion for small sample size'
          );
          const promoteBody = (await promoteRes.json()) as any;
          assert.ok(promoteBody.error.message.includes('inadequate sample size'));
        }
      }
    );

    // =========================================================================
    // Acceptance Test 6: Conflicting Campaign Outcomes
    // =========================================================================
    await t.test(
      'Scenario 6: Conflicting campaign outcomes detected and annotated with caveats',
      async () => {
        // Ingest YouTube Campaign 1: SUCCESS
        await campaignPerformanceRepository.create({
          experimentId: 'exp_yt_success',
          workspaceId: wsAId,
          campaignName: 'YouTube Espresso Guide Q3',
          hypothesis: 'Long-form brew guide drives high conversions',
          channel: 'YouTube',
          executionDate: '2026-11-01',
          budget: 500,
          cost: 500,
          results: { clicks: 300, conversions: 25, revenue: 1500 },
          conversionMetrics: { cpa: 20, roas: 3.0 },
          outcome: 'SUCCESS',
          sampleSizeAdequate: true,
          attributionConfidence: 'HIGH',
        });

        // Ingest YouTube Campaign 2: FAILURE
        await campaignPerformanceRepository.create({
          experimentId: 'exp_yt_failure',
          workspaceId: wsAId,
          campaignName: 'YouTube Quick Shorts Q4',
          hypothesis: 'Short video ads convert quickly',
          channel: 'YouTube',
          executionDate: '2026-11-14',
          budget: 500,
          cost: 500,
          results: { clicks: 200, conversions: 2, revenue: 50 },
          conversionMetrics: { cpa: 250, roas: 0.1 },
          outcome: 'FAILURE',
          sampleSizeAdequate: true,
          attributionConfidence: 'HIGH',
        });

        // Synthesize patterns
        await fetch(`${baseUrl}/api/v1/workspaces/${wsAId}/learning/patterns/synthesize`, {
          method: 'POST',
          headers: userHeadersA,
        });

        const insightsRes = await fetch(`${baseUrl}/api/v1/workspaces/${wsAId}/learning/insights`, {
          method: 'GET',
          headers: userHeadersA,
        });
        const insights: StructuredBusinessInsight[] = ((await insightsRes.json()) as any).data;
        const ytConflict = insights.find(
          (i) => i.title.includes('YouTube') && i.conflictingEvidenceDetected
        );

        assert.ok(ytConflict, 'Must detect conflicting outcomes on YouTube');
        assert.strictEqual(ytConflict.conflictingEvidenceDetected, true);
        assert.strictEqual(ytConflict.confidenceBand, 'SUSPECTED');
        assert.ok(ytConflict.limitations.includes('Conflicting outcomes detected'));
        assert.ok(ytConflict.actionableRecommendation.includes('controlled A/B test'));
      }
    );

    // =========================================================================
    // Acceptance Test 7: Historical Insight Retrieval
    // =========================================================================
    await t.test(
      'Scenario 7: Historical insight retrieval returns structured, evidence-backed knowledge',
      async () => {
        const res = await fetch(`${baseUrl}/api/v1/workspaces/${wsAId}/learning/insights`, {
          method: 'GET',
          headers: userHeadersA,
        });

        assert.strictEqual(res.status, 200);
        const body = (await res.json()) as any;
        const insights: StructuredBusinessInsight[] = body.data;

        assert.ok(insights.length >= 3, 'Must have accumulated multiple structured insights');

        for (const ins of insights) {
          assert.ok(ins.insightId);
          assert.ok(ins.workspaceId === wsAId);
          assert.ok(ins.category);
          assert.ok(ins.title);
          assert.ok(ins.insight);
          assert.ok(Array.isArray(ins.supportingEvidence));
          assert.ok(ins.timePeriod && ins.timePeriod.startDate);
          assert.ok(typeof ins.confidence === 'number');
          assert.ok(ins.confidenceBand);
          assert.ok(typeof ins.sampleSize === 'number');
          assert.ok(ins.limitations);
          assert.ok(ins.reviewDate);
          assert.ok(ins.status);
        }
      }
    );

    // =========================================================================
    // Acceptance Test 8: New Evidence Overriding an Old Insight (Superseding)
    // =========================================================================
    await t.test(
      'Scenario 8: New decisive evidence supersedes and links older contradicted insight',
      async () => {
        // 1. Seed an old failed insight for Facebook from Test 2
        const insightsBefore = await structuredInsightRepository.listByWorkspace(wsAId);
        const oldFbInsight = insightsBefore.find(
          (i) =>
            i.status === 'ACTIVE' &&
            i.category === 'FAILED_STRATEGY' &&
            i.title.includes('Facebook')
        );
        assert.ok(oldFbInsight, 'Old Facebook failed insight must exist');

        // 2. Ingest 3 new successful Facebook campaigns with extensive sample sizes
        for (let i = 1; i <= 3; i++) {
          await campaignPerformanceRepository.create({
            experimentId: `exp_fb_redeemed_${i}`,
            workspaceId: wsAId,
            campaignName: `Facebook Origin Retargeting Sprint ${i}`,
            hypothesis: 'Artisan origin video overcomes previous ad fatigue',
            channel: 'Facebook',
            executionDate: `2026-11-1${i + 5}`,
            budget: 800,
            cost: 600,
            results: { clicks: 800, conversions: 50, revenue: 3000 },
            conversionMetrics: { cpa: 12, roas: 5.0 },
            outcome: 'SUCCESS',
            sampleSizeAdequate: true,
            attributionConfidence: 'HIGH',
          });
        }

        // 3. Re-synthesize
        await fetch(`${baseUrl}/api/v1/workspaces/${wsAId}/learning/patterns/synthesize`, {
          method: 'POST',
          headers: userHeadersA,
        });

        // 4. Verify old insight is now SUPERSEDED
        const updatedOld = await structuredInsightRepository.findById(
          wsAId,
          oldFbInsight.insightId
        );
        assert.ok(updatedOld);
        assert.strictEqual(
          updatedOld.status,
          'SUPERSEDED',
          'Older failed insight must be transitioned to SUPERSEDED'
        );
        assert.ok(updatedOld.supersededBy, 'Must link to supersededBy insight ID');
      }
    );

    // =========================================================================
    // Acceptance Test 9: User Correction of an Insight
    // =========================================================================
    await t.test(
      'Scenario 9: User correction updates insight wording, rationale, and audit history',
      async () => {
        const insights = await structuredInsightRepository.listByWorkspace(wsAId, {
          status: 'ACTIVE',
        });
        assert.ok(insights.length > 0);
        const target = insights[0];

        const correctionPayload = {
          note: 'Clarified that this applies primarily to Single Origin Arabica, not commercial robusta.',
          newInsightText:
            'Artisanal Single-Origin Arabica storytelling achieves 4.8x ROAS among coffee enthusiasts.',
          newActionableRecommendation:
            'Focus on Single-Origin Arabica estate stories for Q1 promotions.',
        };

        const res = await fetch(
          `${baseUrl}/api/v1/workspaces/${wsAId}/learning/insights/${target.insightId}/correct`,
          {
            method: 'PATCH',
            headers: userHeadersA,
            body: JSON.stringify(correctionPayload),
          }
        );

        assert.strictEqual(res.status, 200);
        const body = (await res.json()) as any;
        const updated = body.data;

        assert.strictEqual(updated.insight, correctionPayload.newInsightText);
        assert.strictEqual(
          updated.actionableRecommendation,
          correctionPayload.newActionableRecommendation
        );
        assert.strictEqual(updated.version, (target.version || 1) + 1);
        assert.ok(updated.userCorrection);
        assert.strictEqual(updated.userCorrection.note, correctionPayload.note);
        assert.ok(updated.userCorrection.correctedAt);
      }
    );

    // =========================================================================
    // Acceptance Test 10: Stale Insight Handling (Confidence Decay)
    // =========================================================================
    await t.test(
      'Scenario 10: Stale insights older than 90 days experience confidence decay and transition to STALE',
      async () => {
        // Create an insight dated 100 days in the past
        const hundredDaysAgo = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString();
        await structuredInsightRepository.create({
          insightId: 'ins_decay_90days',
          workspaceId: wsAId,
          fingerprint: 'fp_decay_90',
          category: 'CHANNEL_EFFECTIVENESS',
          title: 'Old Pinterest Test Promo',
          insight: 'Pinterest had moderate pin clicks.',
          supportingEvidence: [],
          source: ['Pinterest'],
          timePeriod: { startDate: hundredDaysAgo, endDate: hundredDaysAgo },
          confidence: 0.88,
          confidenceBand: 'CONFIRMED',
          sampleSize: 150,
          sampleSizeAdequate: true,
          businessRelevance: 'LOW',
          limitations: '',
          reviewDate: hundredDaysAgo,
          status: 'ACTIVE',
          isPermanentRule: false,
          requiresApproval: true,
          conflictingEvidenceDetected: false,
          actionableRecommendation: 'Test Pinterest again',
          version: 1,
          createdAt: hundredDaysAgo,
          updatedAt: hundredDaysAgo,
        });

        // Create an insight dated 200 days in the past
        const twoHundredDaysAgo = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString();
        await structuredInsightRepository.create({
          insightId: 'ins_stale_200days',
          workspaceId: wsAId,
          fingerprint: 'fp_stale_200',
          category: 'SEASONAL_PATTERN',
          title: 'Spring 2024 Flash Promo',
          insight: 'Spring promo had temporary surge.',
          supportingEvidence: [],
          source: ['Spring Sale'],
          timePeriod: { startDate: twoHundredDaysAgo, endDate: twoHundredDaysAgo },
          confidence: 0.8,
          confidenceBand: 'CONFIRMED',
          sampleSize: 120,
          sampleSizeAdequate: true,
          businessRelevance: 'LOW',
          limitations: '',
          reviewDate: twoHundredDaysAgo,
          status: 'ACTIVE',
          isPermanentRule: false,
          requiresApproval: true,
          conflictingEvidenceDetected: false,
          actionableRecommendation: 'Archive',
          version: 1,
          createdAt: twoHundredDaysAgo,
          updatedAt: twoHundredDaysAgo,
        });

        // Apply confidence decay via API
        const decayRes = await fetch(
          `${baseUrl}/api/v1/workspaces/${wsAId}/learning/insights/decay`,
          {
            method: 'POST',
            headers: userHeadersA,
            body: JSON.stringify({}),
          }
        );
        assert.strictEqual(decayRes.status, 200);

        // Verify 100-day-old insight decayed confidence (0.88 * 0.75 = 0.66)
        const refreshed90 = await structuredInsightRepository.findById(wsAId, 'ins_decay_90days');
        assert.ok(refreshed90);
        assert.ok(refreshed90.confidence < 0.88, 'Confidence must decay after 90 days');
        assert.strictEqual(refreshed90.confidence, 0.66);
        assert.ok(refreshed90.limitations.includes('Confidence decayed due to 90+ days'));

        // Verify 200-day-old insight transitioned to STALE
        const refreshed200 = await structuredInsightRepository.findById(wsAId, 'ins_stale_200days');
        assert.ok(refreshed200);
        assert.strictEqual(refreshed200.status, 'STALE');
        assert.strictEqual(refreshed200.confidenceBand, 'STALE');
      }
    );

    // =========================================================================
    // Acceptance Test 11: Tenant Isolation
    // =========================================================================
    await t.test(
      'Scenario 11: Strict multi-tenant isolation guarantees zero learning leakage between businesses',
      async () => {
        // Ingest private experiment and insight for Tenant B
        await campaignPerformanceRepository.create({
          experimentId: 'exp_tenant_b_exclusive',
          workspaceId: wsBId,
          campaignName: 'Secret Chamomile Wellness Launch',
          hypothesis: 'Holistic stress relief converts at $5 CPA',
          channel: 'Pinterest',
          budget: 500,
          cost: 500,
          results: { clicks: 600, conversions: 50, revenue: 2500 },
          conversionMetrics: { cpa: 10, roas: 5.0 },
          outcome: 'SUCCESS',
          sampleSizeAdequate: true,
          attributionConfidence: 'HIGH',
          executionDate: new Date().toISOString(),
        });

        await structuredInsightRepository.create({
          insightId: 'ins_tenant_b_exclusive',
          workspaceId: wsBId,
          fingerprint: 'fp_tenant_b',
          category: 'PRODUCT_PERFORMANCE',
          title: 'Secret Chamomile Blend Outperforms',
          insight: 'Herbal tea subscribers convert 3x higher on weekend mornings.',
          supportingEvidence: [],
          source: ['Tenant B POS'],
          timePeriod: { startDate: '2026-11-01', endDate: '2026-11-20' },
          confidence: 0.95,
          confidenceBand: 'CONFIRMED',
          sampleSize: 600,
          sampleSizeAdequate: true,
          businessRelevance: 'HIGH',
          limitations: '',
          reviewDate: '2027-02-01',
          status: 'ACTIVE',
          isPermanentRule: true,
          requiresApproval: false,
          conflictingEvidenceDetected: false,
          actionableRecommendation: 'Scale Chamomile inventory',
          version: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        // Tenant A queries insights
        const resA = await fetch(`${baseUrl}/api/v1/workspaces/${wsAId}/learning/insights`, {
          method: 'GET',
          headers: userHeadersA,
        });
        const dataA = (await resA.json()) as any;
        const insightsA: StructuredBusinessInsight[] = dataA.data;

        const hasTenantBData = insightsA.some(
          (i) =>
            i.workspaceId === wsBId ||
            i.title.includes('Chamomile') ||
            i.insight.includes('Herbal tea')
        );
        assert.strictEqual(
          hasTenantBData,
          false,
          'Tenant A must NEVER see Tenant B learning insights'
        );

        // Tenant A attempts direct fetch of Tenant B insight
        const directRes = await fetch(
          `${baseUrl}/api/v1/workspaces/${wsAId}/learning/insights/ins_tenant_b_exclusive`,
          {
            method: 'GET',
            headers: userHeadersA,
          }
        );
        assert.strictEqual(
          directRes.status,
          404,
          'Direct access to foreign tenant insight must 404'
        );
      }
    );

    // =========================================================================
    // Acceptance Test 12: Strategy Generation Using Historical Learning (Comparative Evidence)
    // =========================================================================
    await t.test(
      'Scenario 12: Strategy generation demonstrates comparative evidence (With vs Without learning)',
      async () => {
        const res = await fetch(
          `${baseUrl}/api/v1/workspaces/${wsAId}/learning/strategy/recommend`,
          {
            method: 'POST',
            headers: userHeadersA,
            body: JSON.stringify({
              objective: 'Scale direct monthly coffee bean subscriptions for Q1',
              targetAudience: 'Discerning Espresso Enthusiasts',
              product: 'Monsooned Malabar Reserve',
              budget: 3000,
            }),
          }
        );

        assert.strictEqual(res.status, 200);
        const body = (await res.json()) as any;
        assert.strictEqual(body.success, true);
        const strat = body.data;

        // Assert Comparative Elements:
        assert.ok(strat.withLearning, 'Must return withLearning strategy');
        assert.ok(strat.withoutLearning, 'Must return withoutLearning strategy');
        assert.ok(strat.comparativeAnalysis, 'Must return comparativeAnalysis');

        // 1. Without Learning (Naive default)
        assert.ok(strat.withoutLearning.recommendedStrategy.includes('Discount'));
        assert.strictEqual(strat.withoutLearning.tacticsToAvoid.length, 0);

        // 2. With Learning (Grounded in business memory and proven outcomes)
        assert.ok(
          strat.withLearning.recommendedStrategy.includes('Educational') ||
            strat.withLearning.recommendedStrategy.includes('Storytelling')
        );
        assert.ok(
          strat.withLearning.tacticsToAvoid.length >= 1,
          'Must have populated tacticsToAvoid'
        );
        assert.ok(
          strat.withLearning.tacticsToAvoid.some((t: string) =>
            t.toLowerCase().includes('discount')
          )
        );
        assert.ok(strat.withLearning.groundingInsights.length >= 1);
        assert.ok(strat.withLearning.rationale.includes('verified historical business insights'));

        // 3. Comparative Analysis
        assert.ok(strat.comparativeAnalysis.keyDifferences.length >= 2);
        assert.ok(strat.comparativeAnalysis.expectedRiskReduction.length > 10);
        assert.ok(strat.comparativeAnalysis.lessonsApplied >= 1);
      }
    );
  } finally {
    server.close();
  }
});
