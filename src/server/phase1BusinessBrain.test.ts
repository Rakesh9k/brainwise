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
import type { StandardApiResponse } from './types/api';
import { validateSafeExternalUrl } from './utils/ssrfValidator';
import { executeTruthCheck } from '../utils/truthCheck';

test('PHASE 1 — MASTER BUSINESS BRAIN: BUSINESS KNOWLEDGE FOUNDATION SUITE', async (t) => {
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
  let docId = '';
  let verificationItemId = '';

  try {
    // -------------------------------------------------------------------------
    // SCENARIO 1: New Business Registration (Workspace + Owner User)
    // -------------------------------------------------------------------------
    await t.test(
      'Scenario 1: New business registration & initial workspace provisioning',
      async () => {
        const resA = await fetch(`${baseUrl}/api/v1/workspaces`, {
          method: 'POST',
          headers: userAHeaders,
          body: JSON.stringify({
            workspaceName: 'Apex Artisan Roasters',
            industry: 'Specialty Food & Beverage',
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
            workspaceName: 'Luxe Wellness Spa',
            industry: 'Health & Wellness',
            country: 'IN',
          }),
        });
        assert.equal(resB.status, 201);
        const dataB = (await resB.json()) as StandardApiResponse<{
          workspace: { workspaceId: string };
        }>;
        wsBId = dataB.data.workspace.workspaceId;
        assert.ok(wsBId);
        assert.notEqual(wsAId, wsBId);
      }
    );

    // -------------------------------------------------------------------------
    // SCENARIO 2: Business Profile Creation with Fact Provenance
    // -------------------------------------------------------------------------
    await t.test('Scenario 2: Business profile creation with initial fact provenance', async () => {
      const profilePatch = {
        legalName: 'Apex Roastery Foods Pvt Ltd',
        displayName: 'Apex Artisan Roasters',
        tagline: 'Single-origin precision roasting and nitro draft brews',
        industry: 'Specialty Food & Beverage',
        subIndustry: 'Commercial Coffee & Wholesale',
        stage: 'Growing Business',
        businessSize: '11-50 Employees',
        location: 'Bengaluru, India',
        serviceAreas: ['Bengaluru', 'Mumbai', 'Delhi NCR'],
        operationType: 'hybrid',
        website: 'https://apexroasters.com',
        operatingHours: 'Mon-Sat 7:00 AM - 9:00 PM IST',
        overviewSummary:
          'Artisanal roastery offering micro-lot beans and commercial keg distribution.',
        brandPositioning: 'Farm-traceable specialty coffee engineered for culinary cafes.',
        valueProposition: 'Fresh roasted within 48 hours with nitrogen sealed keg stability.',
        strengths: ['Direct farm relationships', 'In-house nitro kegging facility'],
        weaknesses: ['Limited international cold chain logistics'],
        primaryGoals: ['Expand commercial cafe footprint to 50 locations by Q4'],
      };

      const res = await fetch(`${baseUrl}/api/v1/workspaces/${wsAId}/business-profile`, {
        method: 'PATCH',
        headers: userAHeaders,
        body: JSON.stringify(profilePatch),
      });
      assert.equal(res.status, 200);
      const body = (await res.json()) as StandardApiResponse<{
        legalName: string;
        displayName: string;
        subIndustry: string;
        operationType: string;
        strengths: string[];
        provenance: Record<string, { source: string }>;
      }>;

      assert.equal(body.data.legalName, 'Apex Roastery Foods Pvt Ltd');
      assert.equal(body.data.displayName, 'Apex Artisan Roasters');
      assert.equal(body.data.subIndustry, 'Commercial Coffee & Wholesale');
      assert.equal(body.data.operationType, 'hybrid');
      assert.ok(body.data.strengths.includes('Direct farm relationships'));

      // Confirm fact elevation
      const confirmRes = await fetch(
        `${baseUrl}/api/v1/workspaces/${wsAId}/business-profile/confirm-fact`,
        {
          method: 'POST',
          headers: userAHeaders,
          body: JSON.stringify({ fieldKey: 'valueProposition' }),
        }
      );
      assert.equal(confirmRes.status, 200);
      const confirmBody = (await confirmRes.json()) as StandardApiResponse<{
        provenance: Record<string, { source: string }>;
      }>;
      assert.equal(confirmBody.data.provenance.valueProposition.source, 'USER_CONFIRMED');
    });

    // -------------------------------------------------------------------------
    // SCENARIO 3: Restaurant Menu Upload & Parsing
    // -------------------------------------------------------------------------
    await t.test('Scenario 3: Restaurant menu upload & automated extraction', async () => {
      const menuText = `
Apex Roastery Cafe Menu
Starters
Cold Brew Nitro Shot - Single origin Ethiopian steep - $6.50
Artisan Sourdough Toast - Whipped salted butter - $8.00
Mains
Signature Tasting Platter - Chef seasonal pairing - $24.00
Cold Brew Keg Pour - 500ml draft nitro - $9.50
Desserts
Affogato Decadence - Espresso poured over vanilla gelato - $9.00
Beverages
Batch Brew Flight - Three distinct roast profiles - $12.00
      `;

      const res = await fetch(
        `${baseUrl}/api/v1/workspaces/${wsAId}/business-profile/extract-document`,
        {
          method: 'POST',
          headers: userAHeaders,
          body: JSON.stringify({
            documentName: 'Apex_Cafe_Menu_Autumn.pdf',
            documentType: 'PDF',
            documentContent: menuText,
          }),
        }
      );
      assert.equal(res.status, 200);
      const body = (await res.json()) as StandardApiResponse<{
        extracted: {
          products: Array<{ name: string; price: number; category: string }>;
          identity: { industry: string };
        };
        documentId: string;
        verificationItems: Array<{ itemId: string; fieldKey: string; proposedValue: any }>;
      }>;

      assert.ok(body.data.extracted.products.length >= 3);
      const nitro = body.data.extracted.products.find((p) =>
        p.name.includes('Cold Brew Nitro Shot')
      );
      assert.ok(nitro);
      assert.equal(nitro?.price, 6.5);
      docId = body.data.documentId;
      assert.ok(docId);

      // Verify verification item creation
      assert.ok(body.data.verificationItems.length > 0);
      verificationItemId = body.data.verificationItems[0].itemId;
      assert.ok(verificationItemId);
    });

    // -------------------------------------------------------------------------
    // SCENARIO 4: Salon / Service Catalogue Upload & Extraction
    // -------------------------------------------------------------------------
    await t.test('Scenario 4: Salon service catalogue upload & extraction', async () => {
      const salonText = `
Luxe Wellness & Spa Service Menu
Hair & Styling
Precision Creative Haircut - 45 mins - $65.00
Balayage Color Infusion - 120 mins - $185.00
Facial & Skin Treatments
Hydra-Glow Facial Therapy - 60 mins - $110.00
Deep Tissue Renewal Massage - 75 mins - $130.00
Target Customer: Urban professionals seeking restorative organic personal care.
      `;

      const res = await fetch(
        `${baseUrl}/api/v1/workspaces/${wsBId}/business-profile/extract-document`,
        {
          method: 'POST',
          headers: userBHeaders,
          body: JSON.stringify({
            documentName: 'Luxe_Spa_Services.docx',
            documentType: 'DOCX',
            documentContent: salonText,
          }),
        }
      );
      assert.equal(res.status, 200);
      const body = (await res.json()) as StandardApiResponse<{
        extracted: {
          services: Array<{ name: string; price: number; duration: string }>;
        };
      }>;

      assert.ok(body.data.extracted.services.length >= 3);
      const haircut = body.data.extracted.services.find((s) =>
        s.name.includes('Precision Creative Haircut')
      );
      assert.ok(haircut);
      assert.equal(haircut?.price, 65);
      assert.equal(haircut?.duration, '45 mins');
    });

    // -------------------------------------------------------------------------
    // SCENARIO 5: Product Catalogue Import (CSV Parsing & Bulk Creation)
    // -------------------------------------------------------------------------
    await t.test('Scenario 5: Product catalogue bulk import with duplicate detection', async () => {
      const productsToImport = [
        {
          name: 'Apex Nitro Keg 20L',
          sku: 'KEG-NITRO-20L',
          category: 'Commercial Kegs',
          price: 140,
          cost: 55,
          margin: 60.7,
          pricingStructure: 'recurring',
          availability: 'in_stock',
          description: '20-liter commercial keg of nitrogen-charged Ethiopian cold brew.',
        },
        {
          name: 'Single Origin Whole Bean (Guatemala)',
          sku: 'BEAN-GUAT-250G',
          category: 'Retail Beans',
          price: 18,
          cost: 7,
          margin: 61.1,
          pricingStructure: 'one-time',
          availability: 'in_stock',
          description: 'Micro-lot whole beans with notes of dark cacao and orange blossom.',
        },
      ];

      const res = await fetch(
        `${baseUrl}/api/v1/workspaces/${wsAId}/business-profile/products/import`,
        {
          method: 'POST',
          headers: userAHeaders,
          body: JSON.stringify({
            products: productsToImport,
            updateExisting: false,
          }),
        }
      );
      assert.equal(res.status, 200);
      const body = (await res.json()) as StandardApiResponse<{
        created: Array<{ productId: string; name: string }>;
        updated: Array<any>;
        duplicates: Array<any>;
      }>;

      assert.equal(body.data.created.length, 2);
      assert.equal(body.data.duplicates.length, 0);
    });

    // -------------------------------------------------------------------------
    // SCENARIO 6: Website Information Extraction & SSRF Validation
    // -------------------------------------------------------------------------
    await t.test('Scenario 6: SSRF protection gate blocks private network addresses', async () => {
      // 1. SSRF Validator unit checks
      assert.equal(validateSafeExternalUrl('http://127.0.0.1/admin').isSafe, false);
      assert.equal(validateSafeExternalUrl('http://localhost:3000').isSafe, false);
      assert.equal(
        validateSafeExternalUrl('http://169.254.169.254/latest/meta-data').isSafe,
        false
      );
      assert.equal(validateSafeExternalUrl('http://10.0.0.1/internal').isSafe, false);
      assert.equal(validateSafeExternalUrl('http://192.168.1.1').isSafe, false);
      assert.equal(validateSafeExternalUrl('https://apexroasters.com').isSafe, true);

      // 2. HTTP Endpoint SSRF rejection
      const ssrfAttackRes = await fetch(
        `${baseUrl}/api/v1/workspaces/${wsAId}/business-profile/extract-url`,
        {
          method: 'POST',
          headers: userAHeaders,
          body: JSON.stringify({ url: 'http://169.254.169.254/metadata' }),
        }
      );
      assert.equal(ssrfAttackRes.status, 400);
      const ssrfBody = (await ssrfAttackRes.json()) as {
        success: false;
        error: { code: string; message: string };
      };
      assert.equal(ssrfBody.error?.code, 'SSRF_BLOCKED');
    });

    // -------------------------------------------------------------------------
    // SCENARIO 7: Duplicate Product Detection
    // -------------------------------------------------------------------------
    await t.test(
      'Scenario 7: Duplicate product detection flags matching SKU/Name without duplicate records',
      async () => {
        const duplicateProduct = [
          {
            name: 'Apex Nitro Keg 20L',
            sku: 'KEG-NITRO-20L',
            category: 'Commercial Kegs',
            price: 155, // Updated price
            description: 'Revised nitro keg formulation.',
          },
        ];

        // Test 7A: Without overwrite, flags duplicate and skips creation
        const resSkip = await fetch(
          `${baseUrl}/api/v1/workspaces/${wsAId}/business-profile/products/import`,
          {
            method: 'POST',
            headers: userAHeaders,
            body: JSON.stringify({
              products: duplicateProduct,
              updateExisting: false,
            }),
          }
        );
        assert.equal(resSkip.status, 200);
        const bodySkip = (await resSkip.json()) as StandardApiResponse<{
          created: any[];
          duplicates: Array<{ name: string; sku: string }>;
        }>;
        assert.equal(bodySkip.data.created.length, 0);
        assert.equal(bodySkip.data.duplicates.length, 1);

        // Test 7B: With overwrite=true, updates existing product in place
        const resUpdate = await fetch(
          `${baseUrl}/api/v1/workspaces/${wsAId}/business-profile/products/import`,
          {
            method: 'POST',
            headers: userAHeaders,
            body: JSON.stringify({
              products: duplicateProduct,
              updateExisting: true,
            }),
          }
        );
        assert.equal(resUpdate.status, 200);
        const bodyUpdate = (await resUpdate.json()) as StandardApiResponse<{
          updated: Array<{ name: string; price: number }>;
        }>;
        assert.equal(bodyUpdate.data.updated.length, 1);
        assert.equal(bodyUpdate.data.updated[0].price, 155);
      }
    );

    // -------------------------------------------------------------------------
    // SCENARIO 8: Verification Queue: Reject & Edit/Approve
    // -------------------------------------------------------------------------
    await t.test('Scenario 8: Verification queue approval, editing, and rejection', async () => {
      // 1. Fetch verification queue
      const queueRes = await fetch(
        `${baseUrl}/api/v1/workspaces/${wsAId}/business-profile/verification-queue`,
        {
          method: 'GET',
          headers: userAHeaders,
        }
      );
      assert.equal(queueRes.status, 200);
      const queueBody = (await queueRes.json()) as StandardApiResponse<Array<{ itemId: string }>>;
      assert.ok(queueBody.data.length > 0);
      const targetId = queueBody.data[0].itemId;

      // 2. Edit & Approve item
      const approveRes = await fetch(
        `${baseUrl}/api/v1/workspaces/${wsAId}/business-profile/verification-queue/${targetId}/verify`,
        {
          method: 'POST',
          headers: userAHeaders,
          body: JSON.stringify({
            action: 'edit',
            editedValue: {
              name: 'Cold Brew Nitro Shot (Reserve Edition)',
              price: 7.5,
              category: 'Beverages',
              pricingStructure: 'one-time',
            },
          }),
        }
      );
      assert.equal(approveRes.status, 200);

      // 3. Reject an invalid item
      const remainingPending = queueBody.data.filter((i) => i.itemId !== targetId);
      const rejectTargetId = remainingPending.length > 0 ? remainingPending[0].itemId : targetId;
      const rejectRes = await fetch(
        `${baseUrl}/api/v1/workspaces/${wsAId}/business-profile/verification-queue/${rejectTargetId}/verify`,
        {
          method: 'POST',
          headers: userAHeaders,
          body: JSON.stringify({ action: 'reject' }),
        }
      );
      assert.equal(rejectRes.status, 200);
    });

    // -------------------------------------------------------------------------
    // SCENARIO 9: Missing Information Detection & Follow-Up Questions
    // -------------------------------------------------------------------------
    await t.test(
      'Scenario 9: Gap analysis identifies missing domain data and produces questions',
      async () => {
        const res = await fetch(
          `${baseUrl}/api/v1/workspaces/${wsAId}/business-profile/missing-info`,
          {
            method: 'GET',
            headers: userAHeaders,
          }
        );
        assert.equal(res.status, 200);
        const body = (await res.json()) as StandardApiResponse<{
          completenessScore: number;
          gaps: Array<{ domain: string; missingFields: string[]; followUpQuestion: string }>;
        }>;

        assert.ok(body.data.completenessScore >= 0 && body.data.completenessScore <= 100);
        assert.ok(Array.isArray(body.data.gaps));
        if (body.data.gaps.length > 0) {
          assert.ok(body.data.gaps[0].followUpQuestion.length > 5);
        }
      }
    );

    // -------------------------------------------------------------------------
    // SCENARIO 10: Profile Updates & Version Snapshots
    // -------------------------------------------------------------------------
    await t.test('Scenario 10: Profile updates are recorded with version history', async () => {
      const updateRes = await fetch(`${baseUrl}/api/v1/workspaces/${wsAId}/business-profile`, {
        method: 'PATCH',
        headers: userAHeaders,
        body: JSON.stringify({
          operatingHours: 'Mon-Sun 6:30 AM - 10:00 PM IST',
          tagline: 'Engineering the next era of cold brew excellence.',
        }),
      });
      assert.equal(updateRes.status, 200);

      const versionsRes = await fetch(
        `${baseUrl}/api/v1/workspaces/${wsAId}/business-profile/versions`,
        {
          method: 'GET',
          headers: userAHeaders,
        }
      );
      assert.equal(versionsRes.status, 200);
      const versionsBody = (await versionsRes.json()) as StandardApiResponse<
        Array<{ versionId: string; versionNumber: number }>
      >;
      assert.ok(versionsBody.data.length >= 1);
    });

    // -------------------------------------------------------------------------
    // SCENARIO 11: Cross-Tenant Security Gate (Tenant Isolation)
    // -------------------------------------------------------------------------
    await t.test('Scenario 11: Cross-tenant data isolation strictly enforced', async () => {
      // User B attempts to access Workspace A's documents
      const crossDocRes = await fetch(
        `${baseUrl}/api/v1/workspaces/${wsAId}/business-profile/documents`,
        {
          method: 'GET',
          headers: userBHeaders,
        }
      );
      assert.equal(crossDocRes.status, 403);

      // User B attempts to access Workspace A's products
      const crossProdRes = await fetch(
        `${baseUrl}/api/v1/workspaces/${wsAId}/business-profile/products`,
        {
          method: 'GET',
          headers: userBHeaders,
        }
      );
      assert.equal(crossProdRes.status, 403);

      // User B attempts to access Workspace A's verification queue
      const crossQueueRes = await fetch(
        `${baseUrl}/api/v1/workspaces/${wsAId}/business-profile/verification-queue`,
        {
          method: 'GET',
          headers: userBHeaders,
        }
      );
      assert.equal(crossQueueRes.status, 403);
    });

    // -------------------------------------------------------------------------
    // SCENARIO 12: Document Upload Failure Handling & Reprocess
    // -------------------------------------------------------------------------
    await t.test('Scenario 12: Handles document reprocessing gracefully', async () => {
      // Reprocess existing document
      const reprocessRes = await fetch(
        `${baseUrl}/api/v1/workspaces/${wsAId}/business-profile/documents/${docId}/reprocess`,
        {
          method: 'POST',
          headers: userAHeaders,
        }
      );
      assert.equal(reprocessRes.status, 200);
      const reprocessBody = (await reprocessRes.json()) as StandardApiResponse<{
        job: { status: string };
      }>;
      assert.equal(reprocessBody.data.job.status, 'completed');
    });

    // -------------------------------------------------------------------------
    // SCENARIO 13: Persistence Across Sessions & Login Hydration
    // -------------------------------------------------------------------------
    await t.test(
      'Scenario 13: Re-authenticating retrieves verified facts, brand intelligence and constraints',
      async () => {
        // 1. Update brand intelligence & constraints
        await fetch(`${baseUrl}/api/v1/workspaces/${wsAId}/business-profile/brand-intelligence`, {
          method: 'POST',
          headers: userAHeaders,
          body: JSON.stringify({
            brandName: 'Apex Artisan Roasters',
            voice: ['Artisanal', 'Authoritative', 'Gastronomic'],
            wordsToUse: ['Micro-lot', 'Single-origin', 'Nitrogen-charged'],
            wordsToAvoid: ['Instant', 'Synthetic', 'Low-grade'],
            uniqueSellingProposition:
              'Fresh roasted within 48 hours with nitrogen sealed keg stability.',
          }),
        });

        await fetch(
          `${baseUrl}/api/v1/workspaces/${wsAId}/business-profile/resources-constraints`,
          {
            method: 'PATCH',
            headers: userAHeaders,
            body: JSON.stringify({
              marketingBudget: { monthly: 4500, annual: 54000, currency: 'USD' },
              teamCapabilities: ['Roasting', 'Cold Brew Formulation', 'Direct Sales'],
              operatingCapacity: 'Up to 250 kegs per week',
            }),
          }
        );

        // 2. Fetch full profile with a fresh user session
        const getProfileRes = await fetch(
          `${baseUrl}/api/v1/workspaces/${wsAId}/business-profile`,
          {
            method: 'GET',
            headers: userAHeaders,
          }
        );
        assert.equal(getProfileRes.status, 200);
        const profileBody = (await getProfileRes.json()) as StandardApiResponse<{
          legalName: string;
          resourcesAndConstraints: { marketingBudget: { monthly: number } };
          provenance: Record<string, { source: string }>;
        }>;

        assert.equal(profileBody.data.legalName, 'Apex Roastery Foods Pvt Ltd');
        assert.equal(profileBody.data.resourcesAndConstraints.marketingBudget.monthly, 4500);
        assert.equal(profileBody.data.provenance.valueProposition.source, 'USER_CONFIRMED');
      }
    );

    // -------------------------------------------------------------------------
    // SCENARIO 14: Deterministic Truth Check & Strict Video Exclusion
    // -------------------------------------------------------------------------
    await t.test(
      'Scenario 14: Truth Engine verifies ground truth and strictly excludes video generation',
      async () => {
        const mockBrain = {
          businessName: 'Apex Artisan Roasters',
          tagline: 'Single-origin precision roasting',
          industry: 'Specialty Food & Beverage',
          location: 'Bengaluru, India',
          website: 'https://apexroasters.com',
          foundedYear: '2024',
          overviewSummary: 'Precision roasting and nitro cold brew kegs.',
          targetAudience: 'Specialty cafes and coffee connoisseurs',
          brandPositioning: 'Farm-traceable specialty coffee',
          businessModel: 'Wholesale & Retail',
          revenueModel: 'Direct sales & keg subscriptions',
          valueProposition: 'Fresh roasted within 48 hours',
          stage: 'Growing Business' as const,
          primaryGoals: ['Expand commercial footprint'],
          products: [
            {
              id: 'prod-1',
              name: 'Apex Nitro Keg 20L',
              category: 'Commercial Kegs',
              priceRange: '$155.00',
              price: 155,
              description: 'Commercial 20L keg.',
              marginEstimate: '60%',
            },
          ],
          personas: [],
          documents: [],
          decisions: [],
          history: [],
          lastUpdated: '2026-11-20',
          strategicMemory: {
            usedAngles: [],
            fatiguedThemes: [],
            explicitExclusions: ['Never claim instant coffee', 'Never offer video generation'],
            lastUpdated: '2026-11-20',
          },
        };

        // Factual grounded copy passes
        const validCopy =
          'Apex Artisan Roasters offers the Apex Nitro Keg 20L for $155.00 with farm-traceable coffee.';
        const validCheck = executeTruthCheck(validCopy, mockBrain);
        assert.equal(validCheck.isValid, true);
        assert.equal(validCheck.status, 'VERIFIED');

        // Price hallucination caught and remediated
        const hallucinatedPriceCopy = 'Get the Apex Nitro Keg 20L for only $29.99 today!';
        const priceCheck = executeTruthCheck(hallucinatedPriceCopy, mockBrain);
        assert.equal(priceCheck.status, 'REMEDIATED');
        assert.ok(priceCheck.violations.some((v) => v.type === 'PRICE_HALLUCINATION'));
        assert.ok(priceCheck.remediatedContent?.includes('$155'));

        // Explicit exclusion caught: video generation strictly forbidden
        const videoCopy = 'Ask us about video generation and marketing reels for cafes.';
        const videoCheck = executeTruthCheck(videoCopy, mockBrain);
        assert.ok(videoCheck.violations.some((v) => v.type === 'EXCLUSION_BREACH'));

        // Severe exclusion breach with fabricated claim triggers refund safeguard
        const severeCopy =
          'Try our instant coffee with guaranteed 10x ROI on your daily productivity!';
        const severeCheck = executeTruthCheck(severeCopy, mockBrain);
        assert.equal(severeCheck.isValid, false);
        assert.equal(severeCheck.status, 'REJECTED');
        assert.equal(severeCheck.refundTriggered, true);
        assert.ok(severeCheck.violations.some((v) => v.type === 'EXCLUSION_BREACH'));
        assert.ok(severeCheck.violations.some((v) => v.type === 'FABRICATED_CLAIM'));
      }
    );
  } finally {
    server.close();
  }
});
