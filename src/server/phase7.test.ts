/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

process.env.NODE_ENV = 'test';

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './app';
import { db } from './db/firestore';
import { departmentEventBus } from './events/eventBus';
import { departmentRegistry } from './departments/framework';
import type { StandardApiResponse } from './types/api';

test('PHASE 7 — MASTER END-TO-END SUITE: ALL 7 DEPARTMENTS CONNECTED', async (t) => {
  db.resetForTesting();
  departmentEventBus.resetForTesting();

  const app = createApp();
  const server = app.listen(0);
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const userAHeaders = {
    Authorization: 'Bearer test-token-founder-a',
    'Content-Type': 'application/json',
  };

  const userBHeaders = {
    Authorization: 'Bearer test-token-founder-b',
    'Content-Type': 'application/json',
  };

  let wsAId = '';
  let wsBId = '';

  try {
    // -------------------------------------------------------------------------
    // SETUP: Create 2 Independent Workspaces (Tenant A & Tenant B)
    // -------------------------------------------------------------------------
    await t.test('Setup: Provision Workspace A and Workspace B', async () => {
      const resA = await fetch(`${baseUrl}/api/v1/workspaces`, {
        method: 'POST',
        headers: userAHeaders,
        body: JSON.stringify({
          workspaceName: 'Apex Roastery & Cafe',
          industry: 'Specialty Coffee & Beverages',
          country: 'IN',
        }),
      });
      assert.equal(resA.status, 201);
      const dataA = (await resA.json()) as StandardApiResponse<{
        workspace: { workspaceId: string };
      }>;
      wsAId = dataA.data.workspace.workspaceId;
      assert.ok(wsAId);

      const resB = await fetch(`${baseUrl}/api/v1/workspaces`, {
        method: 'POST',
        headers: userBHeaders,
        body: JSON.stringify({
          workspaceName: 'Zenith Logistics Cloud',
          industry: 'Enterprise Software',
          country: 'US',
        }),
      });
      assert.equal(resB.status, 201);
      const dataB = (await resB.json()) as StandardApiResponse<{
        workspace: { workspaceId: string };
      }>;
      wsBId = dataB.data.workspace.workspaceId;
      assert.ok(wsBId);
    });

    // -------------------------------------------------------------------------
    // 7B: Shared Department Framework & Event Bus
    // -------------------------------------------------------------------------
    await t.test('Phase 7B: Shared Department Framework & Registry', async () => {
      const allDepts = departmentRegistry.listAll();
      assert.equal(allDepts.length, 7);
      assert.equal(allDepts[0].departmentId, 'BUSINESS_BRAIN');
      assert.equal(allDepts[1].departmentId, 'IDEA_INTELLIGENCE');
      assert.equal(allDepts[2].departmentId, 'COMPETITIVE_INTELLIGENCE');
      assert.equal(allDepts[3].departmentId, 'MARKET_WATCH');
      assert.equal(allDepts[4].departmentId, 'BRAND_STUDIO');
      assert.equal(allDepts[5].departmentId, 'GROWTH_PLANNER');
      assert.equal(allDepts[6].departmentId, 'ANALYTICS_REPORTS');

      let capturedEvent = false;
      const unsubscribe = departmentEventBus.subscribe('BUSINESS_PROFILE_UPDATED', (ev) => {
        if (ev.workspaceId === wsAId) capturedEvent = true;
      });

      await departmentEventBus.emit({
        workspaceId: wsAId,
        userId: 'founder-a',
        eventType: 'BUSINESS_PROFILE_UPDATED',
        resourceId: wsAId,
        metadata: { field: 'brandPositioning' },
      });

      assert.equal(capturedEvent, true);
      unsubscribe();
    });

    // -------------------------------------------------------------------------
    // SCENARIO A: Department 1 — Business Brain Management & Catalogues
    // -------------------------------------------------------------------------
    await t.test(
      'Scenario A: Business Brain Profile, Product Catalogue & Document Extraction',
      async () => {
        // 1. Update Profile & Positioning
        const patchRes = await fetch(`${baseUrl}/api/v1/workspaces/${wsAId}/business-profile`, {
          method: 'PATCH',
          headers: userAHeaders,
          body: JSON.stringify({
            tagline: 'Farm-direct micro-lots roasted to perfection',
            brandPositioning:
              'Specialty single-origin coffee with complete supply chain transparency',
            valueProposition: 'Uncompromised cup quality roasted within 48 hours of shipment',
          }),
        });
        assert.equal(patchRes.status, 200);

        // 2. Add Product to Catalogue
        const prodRes = await fetch(
          `${baseUrl}/api/v1/workspaces/${wsAId}/business-profile/products`,
          {
            method: 'POST',
            headers: userAHeaders,
            body: JSON.stringify({
              name: 'Estate Reserve Ethiopian Yirgacheffe',
              category: 'Single Origin Whole Bean',
              description: 'Floral bergamot and jasmine notes with honey sweetness',
              price: 24,
              currency: 'USD',
              features: ['Light roast', 'Washed process', 'Elevation 2100m'],
              benefits: ['Clean cup profile', 'Ethically sourced direct-trade'],
              targetCustomer: 'Third-wave coffee enthusiasts & home brewers',
              differentiation: 'Direct farm relationship with zero wholesale middlemen',
            }),
          }
        );
        assert.equal(prodRes.status, 201);
        const prodBody = (await prodRes.json()) as StandardApiResponse<{
          productId: string;
          name: string;
        }>;
        assert.equal(prodBody.data.name, 'Estate Reserve Ethiopian Yirgacheffe');

        // 3. Add Service to Catalogue
        const srvRes = await fetch(
          `${baseUrl}/api/v1/workspaces/${wsAId}/business-profile/services`,
          {
            method: 'POST',
            headers: userAHeaders,
            body: JSON.stringify({
              name: 'Corporate Coffee Subscription & Barista Bar',
              category: 'B2B Subscriptions',
              description:
                'Weekly fresh bean delivery plus commercial espresso machine maintenance',
              price: 450,
              pricingModel: 'Monthly recurring',
              targetCustomer: 'Tech offices & creative studios with 20-100 staff',
              benefits: ['Boosts workplace morale', 'Dedicated account manager'],
            }),
          }
        );
        assert.equal(srvRes.status, 201);

        // 4. Add Audience Segment
        const audRes = await fetch(
          `${baseUrl}/api/v1/workspaces/${wsAId}/business-profile/audience`,
          {
            method: 'POST',
            headers: userAHeaders,
            body: JSON.stringify({
              name: 'Discerning Home Brewers',
              type: 'B2C',
              needs: ['Fresh roast date transparency', 'Brew guides by grind size'],
              painPoints: ['Stale supermarket coffee with vague origins'],
              buyingMotivations: ['Superior sensory experience', 'Ethical producer support'],
              geography: 'Urban metropolitan areas',
              isConfirmed: true,
            }),
          }
        );
        assert.equal(audRes.status, 201);

        // 5. Test Document Extraction with Fact Provenance
        const docExtractRes = await fetch(
          `${baseUrl}/api/v1/workspaces/${wsAId}/business-profile/extract-document`,
          {
            method: 'POST',
            headers: userAHeaders,
            body: JSON.stringify({
              documentName: 'Wholesale_Catalog_2026.pdf',
              documentContent: `Apex Roastery wholesale price sheet. Single Origin Cold Brew Kegs $120. Cold brew nitro blend for retail cafes. Customer target: Boutique bakeries and specialty cafes.`,
            }),
          }
        );
        assert.equal(docExtractRes.status, 200);
        const docExtractBody = (await docExtractRes.json()) as StandardApiResponse<{
          extracted: { detectedProducts: Array<{ name: string }> };
          provenance: string;
          requiresUserApproval: boolean;
        }>;
        assert.equal(docExtractBody.data.provenance, 'AI_INFERRED');
        assert.equal(docExtractBody.data.requiresUserApproval, true);
        assert.ok(docExtractBody.data.extracted.detectedProducts.length > 0);

        // 6. Confirm a fact
        const confirmRes = await fetch(
          `${baseUrl}/api/v1/workspaces/${wsAId}/business-profile/confirm-fact`,
          {
            method: 'POST',
            headers: userAHeaders,
            body: JSON.stringify({ fieldKey: 'valueProposition' }),
          }
        );
        assert.equal(confirmRes.status, 200);
      }
    );

    // -------------------------------------------------------------------------
    // SCENARIO B: Department 2 — Idea to Market Validation & Action
    // -------------------------------------------------------------------------
    let createdReportId = '';
    await t.test(
      'Scenario B: Idea Intelligence Validation & Conversion to Experiments/Tasks',
      async () => {
        // 1. Generate Research Dossier
        const dossierRes = await fetch(`${baseUrl}/api/v1/workspaces/${wsAId}/research`, {
          method: 'POST',
          headers: userAHeaders,
          body: JSON.stringify({
            ideaSummary: 'Ready-to-drink Nitro Cold Brew cans with zero sugar and adaptogens',
            industry: 'Specialty Beverage',
            targetMarket: 'Health-conscious urban professionals',
            geography: 'India',
            depth: 'Full Dossier',
          }),
        });
        assert.equal(dossierRes.status, 201);
        const dossierBody = (await dossierRes.json()) as StandardApiResponse<{
          reportId: string;
          title: string;
          tamValue: string;
        }>;
        createdReportId = dossierBody.data.reportId;
        assert.ok(createdReportId);
        assert.ok(dossierBody.data.title);

        // 2. Convert Report Finding to Growth Experiment
        const expRes = await fetch(
          `${baseUrl}/api/v1/workspaces/${wsAId}/research/${createdReportId}/convert-to-experiment`,
          {
            method: 'POST',
            headers: userAHeaders,
            body: JSON.stringify({
              experimentTitle: 'Test Adaptogen Cold Brew Can Demand at Farmers Market',
              hypothesis:
                'Consumers will pay a 25% premium for functional adaptogenic canned cold brew',
              budget: '$250',
            }),
          }
        );
        assert.equal(expRes.status, 201);
        const expBody = (await expRes.json()) as StandardApiResponse<{
          experimentId: string;
          title: string;
        }>;
        assert.ok(expBody.data.experimentId);

        // 3. Convert Report Finding to Growth Tasks
        const taskRes = await fetch(
          `${baseUrl}/api/v1/workspaces/${wsAId}/research/${createdReportId}/convert-to-tasks`,
          {
            method: 'POST',
            headers: userAHeaders,
            body: JSON.stringify({
              tasks: [
                {
                  title: 'Formulate small-batch L-Theanine & Lion’s Mane cold brew recipe',
                  priority: 'high',
                },
                { title: 'Design aluminum can label mockups in Brand Studio', priority: 'medium' },
              ],
            }),
          }
        );
        assert.equal(taskRes.status, 201);
        const taskBody = (await taskRes.json()) as StandardApiResponse<
          Array<{ taskId: string; title: string }>
        >;
        assert.equal(taskBody.data.length, 2);
      }
    );

    // -------------------------------------------------------------------------
    // SCENARIO C: Department 3 — Competitor Discovery, Analysis, & Snapshots
    // -------------------------------------------------------------------------
    let compId = '';
    await t.test(
      'Scenario C: Competitive Intelligence Discovery, Snapshots & Change Detection',
      async () => {
        // 1. Discover & Add Competitor
        const createCompRes = await fetch(`${baseUrl}/api/v1/workspaces/${wsAId}/competitors`, {
          method: 'POST',
          headers: userAHeaders,
          body: JSON.stringify({
            name: 'Urban Roasters Co',
            website: 'https://urbanroasters.example.com',
            industry: 'Specialty Coffee',
            location: 'Mumbai, India',
            positioning: 'Commercial grade specialty coffee for cafes',
            pricingRange: '₹600 - ₹900 per 250g',
            monitoringFrequency: 'Weekly',
          }),
        });
        assert.equal(createCompRes.status, 201);
        const compBody = (await createCompRes.json()) as StandardApiResponse<{
          competitorId: string;
          name: string;
        }>;
        compId = compBody.data.competitorId;
        assert.ok(compId);

        // 2. Perform Website Analysis
        const analyzeRes = await fetch(
          `${baseUrl}/api/v1/workspaces/${wsAId}/competitors/${compId}/analyze`,
          {
            method: 'POST',
            headers: userAHeaders,
          }
        );
        assert.equal(analyzeRes.status, 200);

        // 3. Capture Initial Baseline Snapshot
        const snap1Res = await fetch(
          `${baseUrl}/api/v1/workspaces/${wsAId}/competitors/${compId}/snapshot`,
          {
            method: 'POST',
            headers: userAHeaders,
            body: JSON.stringify({
              pricingSummary: '₹750 per 250g bag',
              positioning: 'Single Origin Roaster',
              offerings: [{ name: 'Monsoon Malabar', price: '₹750' }],
            }),
          }
        );
        assert.equal(snap1Res.status, 201);

        // 4. Capture Subsequent Snapshot with Detected Price Change
        let detectedAlert = false;
        const unregister = departmentEventBus.subscribe('COMPETITOR_CHANGED', (ev) => {
          if (ev.workspaceId === wsAId) detectedAlert = true;
        });

        const snap2Res = await fetch(
          `${baseUrl}/api/v1/workspaces/${wsAId}/competitors/${compId}/snapshot`,
          {
            method: 'POST',
            headers: userAHeaders,
            body: JSON.stringify({
              pricingSummary: '₹850 per 250g bag', // Changed from ₹750
              positioning: 'Single Origin Roaster',
              offerings: [{ name: 'Monsoon Malabar', price: '₹850' }],
            }),
          }
        );
        assert.equal(snap2Res.status, 201);
        const snap2Body = (await snap2Res.json()) as StandardApiResponse<{
          changesDetected: Array<{ type: string; previousValue: string; currentValue: string }>;
        }>;
        assert.equal(snap2Body.data.changesDetected.length, 1);
        assert.equal(snap2Body.data.changesDetected[0].type, 'PRICE_CHANGE');
        assert.equal(detectedAlert, true);
        unregister();
      }
    );

    // -------------------------------------------------------------------------
    // SCENARIO D: Department 4 — Market Watch & Intelligence Feed
    // -------------------------------------------------------------------------
    await t.test(
      'Scenario D: Market Watch Topic Configuration, Scan & Alert Conversion',
      async () => {
        // 1. Create Market Topic
        const topicRes = await fetch(`${baseUrl}/api/v1/workspaces/${wsAId}/market-watch/topics`, {
          method: 'POST',
          headers: userAHeaders,
          body: JSON.stringify({
            industry: 'Specialty Beverage',
            category: 'Cold Brew & Functional Beverages',
            keywords: ['nitro cold brew', 'adaptogens', 'arabica pricing'],
            topicsOfInterest: ['green coffee commodity prices', 'canned beverage compliance'],
            monitoringFrequency: 'Daily',
          }),
        });
        assert.equal(topicRes.status, 201);

        // 2. Run Market Scan
        const scanRes = await fetch(`${baseUrl}/api/v1/workspaces/${wsAId}/market-watch/scan`, {
          method: 'POST',
          headers: userAHeaders,
        });
        assert.equal(scanRes.status, 201);
        const scanBody = (await scanRes.json()) as StandardApiResponse<
          Array<{ findingId: string; headline: string }>
        >;
        assert.ok(scanBody.data.length >= 2);
        const targetFinding = scanBody.data[0];

        // 3. Convert Finding to Task
        const findingTaskRes = await fetch(
          `${baseUrl}/api/v1/workspaces/${wsAId}/market-watch/findings/${targetFinding.findingId}/convert-to-task`,
          {
            method: 'POST',
            headers: userAHeaders,
          }
        );
        assert.equal(findingTaskRes.status, 201);

        // 4. Duplicate Suppression Check: Submitting same headline + sourceUrl returns deduplicated
        const dedupRes = await fetch(
          `${baseUrl}/api/v1/workspaces/${wsAId}/market-watch/findings`,
          {
            method: 'POST',
            headers: userAHeaders,
            body: JSON.stringify({
              headline: targetFinding.headline,
              sourceUrl: 'https://industryintelligence.example.com/trends/growth',
            }),
          }
        );
        assert.equal(dedupRes.status, 200);
        const dedupBody = (await dedupRes.json()) as { deduplicated?: boolean };
        assert.equal(dedupBody.deduplicated, true);
      }
    );

    // -------------------------------------------------------------------------
    // SCENARIO E: Department 5 — Brand Studio (STRICT VIDEO EXCLUSION - SVG ONLY)
    // -------------------------------------------------------------------------
    await t.test(
      'Scenario E: Brand Studio Identity Locking & Vector SVG Collateral Generation',
      async () => {
        // 1. Lock Brand Identity Guidelines
        const brandIdRes = await fetch(
          `${baseUrl}/api/v1/workspaces/${wsAId}/assets/brand-identity`,
          {
            method: 'POST',
            headers: userAHeaders,
            body: JSON.stringify({
              brandName: 'Apex Roastery',
              tagline: 'Grounded in Elevation',
              mission:
                'Deliver uncompromised single-origin coffee with absolute supply chain transparency.',
              palette: {
                primary: '#FF7417',
                secondary: '#1C1917',
                accent: '#D97706',
                neutral: '#78716C',
                background: '#FAF9F6',
              },
              typography: {
                heading: 'Plus Jakarta Sans',
                body: 'Inter',
              },
              visualDirection: 'Clean geometric vectors and disciplined typography',
              approvalStatus: 'APPROVED',
            }),
          }
        );
        assert.equal(brandIdRes.status, 201);
        const brandIdBody = (await brandIdRes.json()) as StandardApiResponse<{
          version: number;
          approvalStatus: string;
        }>;
        assert.equal(brandIdBody.data.approvalStatus, 'APPROVED');
        assert.ok(brandIdBody.data.version >= 1);

        // 2. Generate Brand Vector SVG Asset (STRICT VIDEO EXCLUSION)
        const genAssetRes = await fetch(`${baseUrl}/api/v1/workspaces/${wsAId}/assets/generate`, {
          method: 'POST',
          headers: userAHeaders,
          body: JSON.stringify({
            name: 'Apex Modern Monogram Emblem',
            category: 'Logos',
            conceptPrompt: 'Geometric coffee bean interwoven with mountain peak',
          }),
        });
        assert.equal(genAssetRes.status, 201);
        const genAssetBody = (await genAssetRes.json()) as StandardApiResponse<{
          assetType: string;
          svgContent?: string;
        }>;
        assert.equal(genAssetBody.data.assetType, 'svg');
        assert.ok(genAssetBody.data.svgContent?.includes('<svg'));
        assert.ok(!genAssetBody.data.svgContent?.includes('<script')); // Sanitized!
      }
    );

    // -------------------------------------------------------------------------
    // SCENARIO F: Department 6 & 7 — Growth Experiment to Analytics Outcome Loop
    // -------------------------------------------------------------------------
    await t.test(
      'Scenario F: Growth Experiment Outcome, KPI Recording & Executive Report',
      async () => {
        // 1. Create a Growth Experiment in 'running' state
        const expCreateRes = await fetch(`${baseUrl}/api/v1/workspaces/${wsAId}/experiments`, {
          method: 'POST',
          headers: userAHeaders,
          body: JSON.stringify({
            title: 'Direct-to-Consumer Sample Box Promotion',
            hypothesis:
              'Offering a 3-pack 100g sample flight will lift first-time buyer conversion by 30%',
            department: 'Brand Studio',
            budget: '$300',
            status: 'running',
          }),
        });
        assert.equal(expCreateRes.status, 201);
        const expData = (await expCreateRes.json()) as StandardApiResponse<{
          experimentId: string;
        }>;
        const testExpId = expData.data.experimentId;

        // 2. Complete Experiment with recorded outcomes
        const completeRes = await fetch(
          `${baseUrl}/api/v1/workspaces/${wsAId}/experiments/${testExpId}/complete`,
          {
            method: 'POST',
            headers: userAHeaders,
            body: JSON.stringify({
              results:
                'Achieved 34% lift in first-time buyer conversion across 120 sample flight orders.',
              learnings:
                'Home brewers strongly prefer sampling multiple origins before committing to full 250g bags.',
            }),
          }
        );
        assert.equal(completeRes.status, 200);

        // 3. Analyze Experiment & Persist to Business Memory
        const analyzeExpRes = await fetch(
          `${baseUrl}/api/v1/workspaces/${wsAId}/experiments/${testExpId}/analyze`,
          {
            method: 'POST',
            headers: userAHeaders,
            body: JSON.stringify({
              actualMetrics: {
                conversionLift: '34%',
                sampleBoxesSold: 120,
                customerAcquisitionCost: '$8.50',
              },
              learnings: 'Sample flight strategy lowers customer acquisition friction by 40%.',
            }),
          }
        );
        assert.equal(analyzeExpRes.status, 200);

        // 4. Create Business Goal & Record KPI Observation
        const goalRes = await fetch(`${baseUrl}/api/v1/workspaces/${wsAId}/goals`, {
          method: 'POST',
          headers: userAHeaders,
          body: JSON.stringify({
            title: 'Monthly Recurring Subscribers',
            currentValue: 85,
            targetValue: 250,
            unit: 'subscribers',
          }),
        });
        assert.equal(goalRes.status, 201);
        const goalBody = (await goalRes.json()) as StandardApiResponse<{ goalId: string }>;
        const goalId = goalBody.data.goalId;

        const obsRes = await fetch(
          `${baseUrl}/api/v1/workspaces/${wsAId}/goals/${goalId}/observations`,
          {
            method: 'POST',
            headers: userAHeaders,
            body: JSON.stringify({
              value: 110,
              sourceType: 'USER_ENTERED',
              notes: 'Added 25 new office subscribers from B2B campaign',
            }),
          }
        );
        assert.equal(obsRes.status, 201);

        // 5. Generate Weekly Executive Intelligence Report
        const repRes = await fetch(`${baseUrl}/api/v1/workspaces/${wsAId}/reports/generate`, {
          method: 'POST',
          headers: userAHeaders,
          body: JSON.stringify({
            reportType: 'WEEKLY_INTELLIGENCE',
            title: 'Executive Intelligence Brief — Apex Roastery Q4',
          }),
        });
        assert.equal(repRes.status, 201);
        const repBody = (await repRes.json()) as StandardApiResponse<{
          reportId: string;
          title: string;
          businessBrainVersion: number;
          taskProgress: { completed: number };
          executiveSummary: string;
        }>;
        assert.ok(repBody.data.reportId);
        assert.ok(repBody.data.businessBrainVersion >= 1);
        assert.ok(repBody.data.executiveSummary.includes('Apex Roastery'));

        // 6. Test CSV Export
        const csvRes = await fetch(
          `${baseUrl}/api/v1/workspaces/${wsAId}/reports/${repBody.data.reportId}/export-csv`,
          {
            headers: userAHeaders,
          }
        );
        assert.equal(csvRes.status, 200);
        assert.equal(csvRes.headers.get('content-type'), 'text/csv; charset=utf-8');
        const csvText = await csvRes.text();
        assert.ok(csvText.includes('Report Title'));
      }
    );

    // -------------------------------------------------------------------------
    // SCENARIO G: Cross-Department Positioning Version Tracking
    // -------------------------------------------------------------------------
    await t.test(
      'Scenario G: Positioning Change Increments Version & Reflects in Downstream Reports',
      async () => {
        // 1. Fetch current profile version
        const p1Res = await fetch(`${baseUrl}/api/v1/workspaces/${wsAId}/business-profile`, {
          headers: userAHeaders,
        });
        const p1 = ((await p1Res.json()) as StandardApiResponse<{ version: number }>).data;
        const initialVersion = p1.version;

        // 2. Approve Profile to produce locked version
        const approveRes = await fetch(
          `${baseUrl}/api/v1/workspaces/${wsAId}/business-profile/approve`,
          {
            method: 'POST',
            headers: userAHeaders,
          }
        );
        assert.equal(approveRes.status, 200);
        const approvedProfile = (
          (await approveRes.json()) as StandardApiResponse<{ profile: { version: number } }>
        ).data.profile;
        assert.ok(approvedProfile.version > initialVersion);

        // 3. Subsequent Executive Report records the new version
        const repRes = await fetch(`${baseUrl}/api/v1/workspaces/${wsAId}/reports/generate`, {
          method: 'POST',
          headers: userAHeaders,
          body: JSON.stringify({
            title: 'Post-Approval Strategic Brief',
          }),
        });
        assert.equal(repRes.status, 201);
        const repBody = (
          (await repRes.json()) as StandardApiResponse<{ businessBrainVersion: number }>
        ).data;
        assert.equal(repBody.businessBrainVersion, approvedProfile.version);
      }
    );

    // -------------------------------------------------------------------------
    // SCENARIO H: Multi-Tenant Security & Isolation Gate
    // -------------------------------------------------------------------------
    await t.test(
      'Scenario H: Multi-User Security: Tenant B cannot access Tenant A records',
      async () => {
        // User B tries to read Workspace A's business profile -> 403 Forbidden
        const brainDeny = await fetch(`${baseUrl}/api/v1/workspaces/${wsAId}/business-profile`, {
          headers: userBHeaders,
        });
        assert.equal(brainDeny.status, 403);

        // User B tries to read Workspace A's products -> 403 Forbidden
        const prodDeny = await fetch(
          `${baseUrl}/api/v1/workspaces/${wsAId}/business-profile/products`,
          {
            headers: userBHeaders,
          }
        );
        assert.equal(prodDeny.status, 403);

        // User B tries to read Workspace A's competitors -> 403 Forbidden
        const compDeny = await fetch(`${baseUrl}/api/v1/workspaces/${wsAId}/competitors`, {
          headers: userBHeaders,
        });
        assert.equal(compDeny.status, 403);

        // User B tries to read Workspace A's research dossier -> 403 Forbidden
        const resDeny = await fetch(`${baseUrl}/api/v1/workspaces/${wsAId}/research`, {
          headers: userBHeaders,
        });
        assert.equal(resDeny.status, 403);

        // User B tries to read Workspace A's market watch findings -> 403 Forbidden
        const mwDeny = await fetch(`${baseUrl}/api/v1/workspaces/${wsAId}/market-watch/findings`, {
          headers: userBHeaders,
        });
        assert.equal(mwDeny.status, 403);

        // User B tries to read Workspace A's brand assets -> 403 Forbidden
        const assetDeny = await fetch(`${baseUrl}/api/v1/workspaces/${wsAId}/assets`, {
          headers: userBHeaders,
        });
        assert.equal(assetDeny.status, 403);

        // User B tries to read Workspace A's tasks -> 403 Forbidden
        const taskDeny = await fetch(`${baseUrl}/api/v1/workspaces/${wsAId}/tasks`, {
          headers: userBHeaders,
        });
        assert.equal(taskDeny.status, 403);

        // User B tries to read Workspace A's reports -> 403 Forbidden
        const repDeny = await fetch(`${baseUrl}/api/v1/workspaces/${wsAId}/reports`, {
          headers: userBHeaders,
        });
        assert.equal(repDeny.status, 403);
      }
    );
  } finally {
    server.close();
  }
});
