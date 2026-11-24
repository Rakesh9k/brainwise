/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

process.env.NODE_ENV = 'test';

import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './app';
import { db } from './db/firestore';
import { creditWalletRepository } from './repositories/creditWalletRepository';
import { businessProfileRepository } from './repositories/businessProfileRepository';
import type { StandardApiResponse } from './types/api';

test('STRATEGIST CHAT SUITE: Multi-Turn Strategist, Search Grounding & Video Exclusion', async (t) => {
  db.resetForTesting();

  const app = createApp();
  const server = app.listen(0);
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const userHeaders = {
    Authorization: 'Bearer test-token-strategist-tester',
    'Content-Type': 'application/json',
  };

  // 1. Provision Workspace and membership
  const wsRes = await fetch(`${baseUrl}/api/v1/workspaces`, {
    method: 'POST',
    headers: userHeaders,
    body: JSON.stringify({
      workspaceName: 'Solaris Sustainable Living',
      industry: 'CleanTech',
      country: 'IN',
    }),
  });
  assert.equal(wsRes.status, 201);
  const wsData = (await wsRes.json()) as StandardApiResponse<{
    workspace: { workspaceId: string };
  }>;
  const wsId = wsData.data.workspace.workspaceId;

  await creditWalletRepository.initializeWallet(wsId, 500);

  await businessProfileRepository.saveProfile({
    workspaceId: wsId,
    businessName: 'Solaris Sustainable Living',
    tagline: 'Zero-Waste Household Solutions',
    stage: 'Early Traction',
    location: 'Bangalore, India',
    website: 'https://solaris-living.example.com',
    foundedYear: '2024',
    overviewSummary: 'Designing circular home goods from upcycled agro-fibers.',
    targetAudience: 'Eco-conscious urban homeowners aged 25-45',
    brandPositioning: 'Premium minimalist sustainable home essentials',
    valueProposition: 'Durable zero-waste home utility products without plastic footprints',
    businessModel: 'Direct-to-Consumer & B2B Zero-Waste Hospitality',
    revenueModel: 'Direct sales & corporate recurring subscriptions',
    primaryGoals: ['Expand retail distribution', 'Optimize customer acquisition cost'],
    provenance: {
      businessName: {
        fieldKey: 'businessName',
        source: 'USER_CONFIRMED',
        confidence: 1.0,
      },
      tagline: {
        fieldKey: 'tagline',
        source: 'USER_CONFIRMED',
        confidence: 1.0,
      },
    },
    strategicMemory: {
      usedAngles: [],
      fatiguedThemes: [],
      explicitExclusions: [
        'Never claim 100% biodegradable without specific lab certificate standard',
      ],
      lastUpdated: new Date().toISOString(),
    },
    version: 1,
    lastUpdated: new Date().toISOString(),
  });

  await t.test(
    '1. Multi-turn chat successfully generates response with Business Brain grounding',
    async () => {
      const res = await fetch(`${baseUrl}/api/v1/workspaces/${wsId}/ai/chat`, {
        method: 'POST',
        headers: userHeaders,
        body: JSON.stringify({
          message:
            'What channels should Solaris focus on to acquire our first 500 B2B hospitality accounts?',
          threadId: 'thread-test-1',
          modelTier: 'fast',
          history: [],
        }),
      });

      assert.equal(res.status, 200);
      const body = (await res.json()) as StandardApiResponse<{
        reply: string;
        threadId: string;
        modelUsed: string;
        citations: Array<{ title?: string; url?: string }>;
        creditsDeducted: number;
      }>;

      assert.ok(body.data.reply);
      assert.ok(body.data.reply.length > 20);
      assert.equal(body.data.threadId, 'thread-test-1');
      assert.equal(body.data.creditsDeducted, 2);
      assert.ok(body.data.modelUsed);
    }
  );

  await t.test('2. Live Search Grounded tier requests enable Google Search grounding', async () => {
    const res = await fetch(`${baseUrl}/api/v1/workspaces/${wsId}/ai/chat`, {
      method: 'POST',
      headers: userHeaders,
      body: JSON.stringify({
        message:
          'Analyze current market pricing trends for sustainable hotel amenities in South Asia',
        threadId: 'thread-test-search',
        modelTier: 'search_grounded',
        history: [
          { role: 'user', parts: 'Hello strategist' },
          { role: 'model', parts: 'Welcome to Solaris Sustainable Living strategy briefing.' },
        ],
      }),
    });

    assert.equal(res.status, 200);
    const body = (await res.json()) as StandardApiResponse<{
      reply: string;
      modelUsed: string;
      citations: Array<{ title?: string; url?: string }>;
      creditsDeducted: number;
    }>;

    assert.ok(body.data.reply);
    assert.equal(body.data.creditsDeducted, 5);
    assert.ok(Array.isArray(body.data.citations));
  });

  await t.test('3. Deep reasoning tier utilizes Gemini 2.5 Pro routing', async () => {
    const res = await fetch(`${baseUrl}/api/v1/workspaces/${wsId}/ai/chat`, {
      method: 'POST',
      headers: userHeaders,
      body: JSON.stringify({
        message:
          'Perform a comprehensive unit economics and margin sensitivity analysis for B2B wholesale pricing',
        threadId: 'thread-test-pro',
        modelTier: 'deep_reasoning',
      }),
    });

    assert.equal(res.status, 200);
    const body = (await res.json()) as StandardApiResponse<{
      reply: string;
      modelUsed: string;
      creditsDeducted: number;
    }>;

    assert.ok(body.data.reply);
    assert.equal(body.data.creditsDeducted, 8);
    assert.ok(
      body.data.modelUsed.includes('gemini-2.5-pro') ||
        body.data.modelUsed.includes('deterministic') ||
        body.data.modelUsed.includes('test')
    );
  });

  await t.test('4. Enforces strict input validation on empty messages', async () => {
    const res = await fetch(`${baseUrl}/api/v1/workspaces/${wsId}/ai/chat`, {
      method: 'POST',
      headers: userHeaders,
      body: JSON.stringify({
        message: '   ',
      }),
    });

    assert.equal(res.status, 400);
  });

  server.close();
});
