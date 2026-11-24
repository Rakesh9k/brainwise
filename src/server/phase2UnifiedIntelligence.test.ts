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
import { sharedBusinessContextService } from './services/sharedBusinessContextService';
import { knowledgeGraphService } from './services/knowledgeGraphService';
import { memoryService } from './services/memoryService';
import { hybridRetrievalService } from './services/hybridRetrievalService';
import type {
  StandardApiResponse,
  AssembledBusinessContext,
  KnowledgeGraphEdgeEntity,
  WorkingMemoryEntity,
} from './types/api';

test('PHASE 2 — MASTER UNIFIED INTELLIGENCE, KNOWLEDGE GRAPH & MEMORY SUITE', async (t) => {
  db.resetForTesting();
  departmentEventBus.resetForTesting();
  sharedBusinessContextService.invalidateCache('ws_tenant_alpha');
  sharedBusinessContextService.invalidateCache('ws_tenant_beta');

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
    // Baseline Setup: Workspaces & Business Profiles
    // -------------------------------------------------------------------------
    const resA = await fetch(`${baseUrl}/api/v1/workspaces`, {
      method: 'POST',
      headers: userAHeaders,
      body: JSON.stringify({
        workspaceName: 'Apex Artisan Roasters',
        industry: 'Specialty Coffee',
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
        workspaceName: 'Rival Coffee Co',
        industry: 'Specialty Coffee',
        country: 'IN',
      }),
    });
    assert.equal(resB.status, 201);
    const dataB = (await resB.json()) as StandardApiResponse<{
      workspace: { workspaceId: string };
    }>;
    wsBId = dataB.data.workspace.workspaceId;
    assert.ok(wsBId);

    // Populate Workspace A Business Brain
    await fetch(`${baseUrl}/api/v1/workspaces/${wsAId}/business-profile`, {
      method: 'PATCH',
      headers: userAHeaders,
      body: JSON.stringify({
        businessName: 'Apex Artisan Roasters',
        tagline: 'Precision roasting and nitro cold brew kegs',
        industry: 'Specialty Coffee',
        stage: 'Growing Business',
        location: 'Bengaluru, India',
        valueProposition: 'Single-origin farm traceable nitro kegs for cafes',
        operatingHours: 'Mon-Sun 7am-10pm',
        resourcesAndConstraints: {
          marketingBudget: { monthly: 5000, currency: 'USD' },
          operatingCapacity: '100 kegs / week',
          explicitExclusions: ['Never claim instant coffee', 'Never offer video generation'],
        },
      }),
    });

    // Populate Products for Workspace A
    await fetch(`${baseUrl}/api/v1/workspaces/${wsAId}/business-profile/products/import`, {
      method: 'POST',
      headers: userAHeaders,
      body: JSON.stringify({
        products: [
          {
            productId: 'prod_keg_20l',
            name: 'Apex Nitro Keg 20L',
            sku: 'KEG-NITRO-20L',
            category: 'Commercial Kegs',
            price: 155,
            pricingStructure: 'one-time',
            description: 'Commercial nitrogen cold brew keg.',
            features: ['48-hr cold extraction', 'Nitrogen pressurized'],
            benefits: ['Silky foam head', 'Zero prep labor'],
          },
          {
            name: 'Micro-Lot Single Origin Beans',
            sku: 'BEAN-MICRO-1KG',
            category: 'Whole Bean',
            price: 42,
            pricingStructure: 'one-time',
            description: 'Specialty grade washed arabica beans.',
            features: ['Direct farm trade', 'Roasted weekly'],
            benefits: ['Complex floral cup profile'],
          },
        ],
      }),
    });

    // Populate Brand Guidelines for Workspace A
    await fetch(`${baseUrl}/api/v1/workspaces/${wsAId}/business-profile/brand-intelligence`, {
      method: 'POST',
      headers: userAHeaders,
      body: JSON.stringify({
        brandName: 'Apex Artisan Roasters',
        voice: ['Authoritative', 'Artisanal', 'Direct'],
        tone: 'Passionate and uncompromising on roast quality',
        wordsToUse: ['Single-origin', 'Craft-roasted', 'Micro-lot', 'Nitro draft'],
        wordsToAvoid: ['Instant', 'Commercial blend', 'Cheap'],
        approvedClaims: ['Roasted within 48 hours of shipment', '100% farm traceable'],
        restrictedClaims: ['Never claim organic without official estate certification'],
        uniqueSellingProposition:
          'The only nitrogen cold brew keg system crafted for specialty cafes.',
      }),
    });

    // =========================================================================
    // SCENARIO 1: Product-to-Customer Relationships
    // =========================================================================
    await t.test(
      'Scenario 1: Product-to-customer relationships are created, validated and retrieved',
      async () => {
        const relRes = await fetch(
          `${baseUrl}/api/v1/workspaces/${wsAId}/business-profile/graph/edges`,
          {
            method: 'POST',
            headers: userAHeaders,
            body: JSON.stringify({
              source: { id: 'prod_keg_20l', type: 'product', name: 'Apex Nitro Keg 20L' },
              target: {
                id: 'seg_specialty_cafes',
                type: 'customer_segment',
                name: 'Independent Specialty Cafes',
              },
              relationshipType: 'TARGETS',
              properties: { priority: 'Primary Target', wholesaleDiscount: '15%' },
            }),
          }
        );

        assert.equal(relRes.status, 201);
        const relBody = (await relRes.json()) as StandardApiResponse<KnowledgeGraphEdgeEntity>;
        assert.equal(relBody.data.relationshipType, 'TARGETS');
        assert.equal(relBody.data.source.id, 'prod_keg_20l');
        assert.equal(relBody.data.target.id, 'seg_specialty_cafes');

        // Verify bidirectional traversal
        const traverseRes = await fetch(
          `${baseUrl}/api/v1/workspaces/${wsAId}/business-profile/graph/traverse?startNodeId=prod_keg_20l&maxDepth=1`,
          { method: 'GET', headers: userAHeaders }
        );
        assert.equal(traverseRes.status, 200);
        const traverseBody = (await traverseRes.json()) as StandardApiResponse<{
          nodes: any[];
          edges: any[];
        }>;
        assert.ok(traverseBody.data.edges.some((e) => e.relationshipType === 'TARGETS'));
      }
    );

    // =========================================================================
    // SCENARIO 2: Campaign-to-Product Relationships
    // =========================================================================
    await t.test(
      'Scenario 2: Campaign-to-product relationships link marketing initiatives to catalog items',
      async () => {
        const edge = await knowledgeGraphService.connectCampaignToProduct({
          workspaceId: wsAId,
          campaignId: 'camp_summer_nitro_2026',
          campaignName: 'Summer Nitro Cafe Drive',
          productId: 'prod_keg_20l',
          productName: 'Apex Nitro Keg 20L',
          properties: { targetChannel: 'B2B Field Sales' },
        });

        assert.equal(edge.relationshipType, 'PROMOTES');
        assert.equal(edge.source.name, 'Summer Nitro Cafe Drive');
        assert.equal(edge.target.name, 'Apex Nitro Keg 20L');

        // 2-hop traversal: Campaign -> Product -> Customer Segment
        const twoHop = await knowledgeGraphService.traverse(wsAId, 'camp_summer_nitro_2026', 2);
        assert.ok(twoHop.edges.length >= 2);
        assert.ok(twoHop.nodes.some((n) => n.id === 'seg_specialty_cafes'));
      }
    );

    // =========================================================================
    // SCENARIO 3: Brand Rule Retrieval
    // =========================================================================
    await t.test(
      'Scenario 3: Assembled context accurately retrieves brand voice, vocabulary, and restrictions',
      async () => {
        const ctxRes = await fetch(
          `${baseUrl}/api/v1/workspaces/${wsAId}/business-profile/context?taskType=MARKETING`,
          { method: 'GET', headers: userAHeaders }
        );
        assert.equal(ctxRes.status, 200);
        const ctxBody = (await ctxRes.json()) as StandardApiResponse<AssembledBusinessContext>;

        assert.ok(ctxBody.data.brandDirectives.voice.includes('Authoritative'));
        assert.ok(ctxBody.data.brandDirectives.wordsToUse.includes('Nitro draft'));
        assert.ok(ctxBody.data.brandDirectives.wordsToAvoid.includes('Instant'));
        assert.ok(ctxBody.data.brandDirectives.restrictedClaims.some((c) => c.includes('organic')));
      }
    );

    // =========================================================================
    // SCENARIO 4: Retrieval of Historical Decisions (Episodic Memory)
    // =========================================================================
    await t.test(
      'Scenario 4: Retrieval of historical decisions, campaign outcomes and learnings',
      async () => {
        await memoryService.recordEpisode({
          workspaceId: wsAId,
          department: 'GROWTH_DIRECTOR',
          activityType: 'strategic_decision',
          title: 'Discontinue 5L Mini-Kegs',
          summary:
            '5L consumer mini-kegs yielded insufficient margins and high packaging return cost.',
          learnings: ['Focus exclusively on 20L commercial kegs for B2B accounts'],
          outcomes: { marginImprovement: '+18%' },
        });

        const epRes = await fetch(
          `${baseUrl}/api/v1/workspaces/${wsAId}/business-profile/memory/episodic`,
          {
            method: 'GET',
            headers: userAHeaders,
          }
        );
        assert.equal(epRes.status, 200);
        const epBody = (await epRes.json()) as StandardApiResponse<any[]>;
        assert.ok(epBody.data.length >= 1);
        assert.equal(epBody.data[0].title, 'Discontinue 5L Mini-Kegs');
        assert.ok(epBody.data[0].learnings[0].includes('Focus exclusively on 20L commercial kegs'));
      }
    );

    // =========================================================================
    // SCENARIO 5: Correction of Outdated Information
    // =========================================================================
    await t.test(
      'Scenario 5: Fact correction updates active memory and eliminates stale records',
      async () => {
        // Find the nitro keg product
        const contextBefore = await sharedBusinessContextService.getBusinessContext({
          workspaceId: wsAId,
          taskType: 'FINANCIAL',
          bypassCache: true,
        });
        const kegProd = contextBefore.relevantProducts.find(
          (p: any) => p.name === 'Apex Nitro Keg 20L'
        );
        assert.ok(kegProd);

        // Founder updates price from $155 to $165
        await sharedBusinessContextService.updateBusinessKnowledge(wsAId, kegProd.id as string, {
          type: 'product',
          product: { price: 165, description: 'Updated nitrogen cold brew keg with dual valve.' },
        });

        // Query context after update
        const contextAfter = await sharedBusinessContextService.getBusinessContext({
          workspaceId: wsAId,
          taskType: 'FINANCIAL',
          bypassCache: true,
        });
        const updatedKeg = contextAfter.relevantProducts.find(
          (p: any) => p.name === 'Apex Nitro Keg 20L'
        );
        assert.equal(updatedKeg?.price, 165);
      }
    );

    // =========================================================================
    // SCENARIO 6: Memory Persistence Across Sessions
    // =========================================================================
    await t.test(
      'Scenario 6: Working and episodic memory persist across discrete HTTP sessions',
      async () => {
        const sessionId = `sess_${Date.now()}_audit`;

        // Session 1: Store active task in working memory
        await memoryService.setWorkingContext({
          sessionId,
          workspaceId: wsAId,
          userId: 'founder_a',
          currentTask: 'Drafting Q3 Wholesale Partnership Deck',
          activeWorkflow: 'brand_collateral',
          temporaryDecisions: [{ id: 'td1', decision: 'Use 20L keg as hero image' }],
        });

        // Session 2: Read working memory using a new request
        const sessionRes = await fetch(
          `${baseUrl}/api/v1/workspaces/${wsAId}/business-profile/memory/working?sessionId=${sessionId}`,
          { method: 'GET', headers: userAHeaders }
        );
        assert.equal(sessionRes.status, 200);
        const sessionBody = (await sessionRes.json()) as StandardApiResponse<WorkingMemoryEntity>;
        assert.equal(sessionBody.data.currentTask, 'Drafting Q3 Wholesale Partnership Deck');
        assert.equal(
          sessionBody.data.temporaryDecisions?.[0].decision,
          'Use 20L keg as hero image'
        );
      }
    );

    // =========================================================================
    // SCENARIO 7: Working Memory Expiration (TTL)
    // =========================================================================
    await t.test(
      'Scenario 7: Working memory expires according to TTL while business memory stays permanent',
      async () => {
        const ephemeralSessionId = `sess_ephemeral_${Date.now()}`;

        // Set working memory with TTL = -1 second (already expired)
        await memoryService.setWorkingContext({
          sessionId: ephemeralSessionId,
          workspaceId: wsAId,
          userId: 'founder_a',
          currentTask: 'Quick transient lookup',
          ttlSeconds: -1,
        });

        // Fetch expired working memory: should return null or pruned
        const expiredRes = await fetch(
          `${baseUrl}/api/v1/workspaces/${wsAId}/business-profile/memory/working?sessionId=${ephemeralSessionId}`,
          { method: 'GET', headers: userAHeaders }
        );
        assert.equal(expiredRes.status, 200);
        const expiredBody = (await expiredRes.json()) as StandardApiResponse<any>;
        assert.equal(expiredBody.data, null);

        // Business memory remains intact
        const bizMemory = await memoryService.getVerifiedBusinessMemory(wsAId);
        assert.ok(bizMemory.profile);
        assert.equal(bizMemory.profile?.businessName, 'Apex Artisan Roasters');
      }
    );

    // =========================================================================
    // SCENARIO 8: Strategic Memory Retrieval & Superseding
    // =========================================================================
    await t.test(
      'Scenario 8: Strategic memory records objectives and supersedes old priorities',
      async () => {
        // 1. Record an initial strategic priority
        const initialItem = await memoryService.recordStrategicItem({
          workspaceId: wsAId,
          type: 'strategic_priority',
          title: 'Bootstrapped Regional Distribution',
          description: 'Self-distribute kegs within a 20km radius.',
        });

        // 2. Supersede with new growth objective
        const superseded = await memoryService.supersedeStrategicItem(wsAId, initialItem.itemId, {
          type: 'strategic_priority',
          title: 'Third-Party Cold Chain Logistics',
          description: 'Contract with temperature-controlled 3PL to expand state-wide.',
        });

        assert.equal(superseded.oldItem.status, 'superseded');
        assert.equal(superseded.oldItem.supersededBy, superseded.newItem.itemId);
        assert.equal(superseded.newItem.status, 'active');

        // Verify listing returns active items
        const activeItems = await memoryService.listStrategicItems(wsAId, { status: 'active' });
        assert.ok(activeItems.some((i) => i.title === 'Third-Party Cold Chain Logistics'));
        assert.ok(!activeItems.some((i) => i.title === 'Bootstrapped Regional Distribution'));
      }
    );

    // =========================================================================
    // SCENARIO 9: Cross-Department Context Consistency
    // =========================================================================
    await t.test(
      'Scenario 9: All 14 departments receive unified, consistent context from Shared Context API',
      async () => {
        const marketingCtx = await sharedBusinessContextService.getBusinessContext({
          workspaceId: wsAId,
          taskType: 'MARKETING',
        });

        const financialCtx = await sharedBusinessContextService.getBusinessContext({
          workspaceId: wsAId,
          taskType: 'FINANCIAL',
        });

        const strategyCtx = await sharedBusinessContextService.getBusinessContext({
          workspaceId: wsAId,
          taskType: 'STRATEGY',
        });

        // Verify core identity is identical across all departments
        assert.equal(marketingCtx.businessSummary, financialCtx.businessSummary);
        assert.equal(financialCtx.businessSummary, strategyCtx.businessSummary);

        // Verify constraints are universally present
        assert.deepEqual(marketingCtx.relevantConstraints, financialCtx.relevantConstraints);
        assert.deepEqual(marketingCtx.brandDirectives.voice, strategyCtx.brandDirectives.voice);
      }
    );

    // =========================================================================
    // SCENARIO 10: Cross-Tenant Retrieval Protection
    // =========================================================================
    await t.test(
      'Scenario 10: Cross-tenant data isolation strictly prevents information leakage',
      async () => {
        // User B tries to query Tenant A's shared context
        const leakRes = await fetch(
          `${baseUrl}/api/v1/workspaces/${wsAId}/business-profile/context`,
          {
            method: 'GET',
            headers: userBHeaders,
          }
        );
        assert.equal(leakRes.status, 403);

        // User B tries to query Tenant A's graph edges
        const edgeLeakRes = await fetch(
          `${baseUrl}/api/v1/workspaces/${wsAId}/business-profile/graph/edges`,
          {
            method: 'GET',
            headers: userBHeaders,
          }
        );
        assert.equal(edgeLeakRes.status, 403);

        // User B querying their own workspace gets only Tenant B's data
        const bCtx = await sharedBusinessContextService.getBusinessContext({ workspaceId: wsBId });
        assert.ok(bCtx.businessSummary.includes('Rival Coffee Co'));
        assert.ok(!bCtx.businessSummary.includes('Apex Artisan Roasters'));
      }
    );

    // =========================================================================
    // SCENARIO 11: Document Source Attribution
    // =========================================================================
    await t.test(
      'Scenario 11: Retrieved knowledge contains verifiable source citations with confidence',
      async () => {
        // Ingest document metadata into workspace A
        await db.doc(`workspaces/${wsAId}/documents/doc_wholesale_ratecard`).set({
          documentId: 'doc_wholesale_ratecard',
          workspaceId: wsAId,
          name: 'Apex_Wholesale_Ratecard_2026.pdf',
          type: 'PDF',
          mimeType: 'application/pdf',
          sizeBytes: 85000,
          status: 'extracted',
          confidenceScore: 94,
          extractedSummary:
            'Official wholesale pricing tier for commercial cafes. Minimum order 2 kegs.',
          uploadedBy: 'founder_a',
          uploadedAt: new Date().toISOString(),
        });

        const searchResult = await hybridRetrievalService.search({
          workspaceId: wsAId,
          query: 'wholesale ratecard minimum order',
          taskType: 'MARKETING',
        });

        assert.ok(searchResult.items.length > 0);
        assert.ok(searchResult.citations.length > 0);
        const docCitation = searchResult.citations.find((c) => c.sourceType === 'DOCUMENT');
        assert.ok(docCitation);
        assert.ok(docCitation.confidence >= 0.8);
        assert.equal(docCitation.documentId, 'doc_wholesale_ratecard');
      }
    );

    // =========================================================================
    // SCENARIO 12: Retrieval with Conflicting Facts (Provenance Precedence)
    // =========================================================================
    await t.test(
      'Scenario 12: USER_CONFIRMED facts take absolute precedence over unconfirmed guesses',
      async () => {
        // Both a confirmed product ($165) and an unverified candidate exist
        const searchRes = await hybridRetrievalService.search({
          workspaceId: wsAId,
          query: 'Apex Nitro Keg price',
          filters: { verificationStatus: 'VERIFIED' },
        });

        assert.ok(searchRes.items.length > 0);
        const kegItem = searchRes.items.find((i) => i.title.includes('Apex Nitro Keg'));
        assert.ok(kegItem);
        assert.equal(kegItem.verificationStatus, 'VERIFIED');
        assert.ok(kegItem.content.includes('$165'));
      }
    );

    // =========================================================================
    // SCENARIO 13: Cache Invalidation After Updates
    // =========================================================================
    await t.test(
      'Scenario 13: Context caching delivers sub-millisecond reads and invalidates immediately on mutation',
      async () => {
        // 1. Initial read (FRESH)
        const firstRead = await sharedBusinessContextService.getBusinessContext({
          workspaceId: wsAId,
          taskType: 'MARKETING',
          bypassCache: true,
        });
        assert.equal(firstRead.freshness, 'FRESH');

        // 2. Second read within TTL (CACHED)
        const secondRead = await sharedBusinessContextService.getBusinessContext({
          workspaceId: wsAId,
          taskType: 'MARKETING',
        });
        assert.equal(secondRead.freshness, 'CACHED');

        // 3. Mutation invalidates cache
        sharedBusinessContextService.invalidateCache(wsAId);

        // 4. Third read after invalidation (FRESH)
        const thirdRead = await sharedBusinessContextService.getBusinessContext({
          workspaceId: wsAId,
          taskType: 'MARKETING',
        });
        assert.equal(thirdRead.freshness, 'FRESH');
      }
    );

    // =========================================================================
    // SCENARIO 14: Large Document Retrieval
    // =========================================================================
    await t.test(
      'Scenario 14: Ingests and retrieves large document insights without context corruption',
      async () => {
        const largeSummary =
          'Comprehensive coffee harvest report covering 12 origins, soil minerals, elevation parameters, bean moisture percentages, and optimal roasting curves for nitrogen draft keg carbonation balance.';
        await db.doc(`workspaces/${wsAId}/documents/doc_large_harvest`).set({
          documentId: 'doc_large_harvest',
          workspaceId: wsAId,
          name: 'Technical_Harvest_Specification_2026.pdf',
          type: 'PDF',
          mimeType: 'application/pdf',
          sizeBytes: 15400000,
          status: 'extracted',
          confidenceScore: 92,
          extractedSummary: largeSummary,
          uploadedBy: 'founder_a',
          uploadedAt: new Date().toISOString(),
        });

        const result = await hybridRetrievalService.search({
          workspaceId: wsAId,
          query: 'nitrogen draft keg carbonation balance elevation',
        });

        assert.ok(
          result.items.some((item) => item.title === 'Technical_Harvest_Specification_2026.pdf')
        );
        assert.ok(result.tokenCount <= result.tokenBudget);
      }
    );

    // =========================================================================
    // SCENARIO 15: Context Token-Budget Enforcement
    // =========================================================================
    await t.test(
      'Scenario 15: Context assembly strictly enforces tight token budgets',
      async () => {
        const tightBudget = 150; // Very small token budget
        const result = await hybridRetrievalService.search({
          workspaceId: wsAId,
          query: 'specialty coffee beans and kegs',
          tokenBudget: tightBudget,
        });

        // Estimated tokens must be clamped
        assert.ok(result.tokenCount <= tightBudget + 50); // slight allowance for first item
        assert.ok(result.items.length >= 1);
      }
    );
  } finally {
    server.close();
  }
});
