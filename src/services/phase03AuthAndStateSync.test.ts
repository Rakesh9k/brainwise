/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BrainWiseApiClient,
  ApiError,
  AUTH_TOKEN_KEY,
  getStoredAuthToken,
  setStoredAuthToken,
} from './apiClient';
import {
  understandIdeaApi,
  generateAiDossier,
  sendConversationalResearchApi,
  finalizeIdeaApi,
} from '../utils/aiClient';

// Mock Web Storage API for Node environment
class MockStorage {
  private store: Map<string, string> = new Map();
  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  clear(): void {
    this.store.clear();
  }
}

// Attach mock sessionStorage and localStorage if running in Node
if (typeof globalThis.sessionStorage === 'undefined') {
  (globalThis as any).sessionStorage = new MockStorage();
}
if (typeof globalThis.localStorage === 'undefined') {
  (globalThis as any).localStorage = new MockStorage();
}

test('PHASE 03.1 - Unified auth token storage persists and clears canonical & legacy keys', () => {
  sessionStorage.clear();
  localStorage.clear();

  // 1. Initial state is null
  assert.equal(getStoredAuthToken(), null);

  // 2. Set token
  setStoredAuthToken('jwt_session_token_12345');
  assert.equal(sessionStorage.getItem(AUTH_TOKEN_KEY), 'jwt_session_token_12345');
  assert.equal(localStorage.getItem(AUTH_TOKEN_KEY), 'jwt_session_token_12345');
  assert.equal(getStoredAuthToken(), 'jwt_session_token_12345');

  // 3. Simulate legacy token present
  localStorage.setItem('brainwise_token', 'legacy_token');

  // 4. Logout / clear token
  setStoredAuthToken(null);
  assert.equal(sessionStorage.getItem(AUTH_TOKEN_KEY), null);
  assert.equal(localStorage.getItem(AUTH_TOKEN_KEY), null);
  assert.equal(localStorage.getItem('brainwise_token'), null);
  assert.equal(getStoredAuthToken(), null);
});

test('PHASE 03.2 - BrainWiseApiClient automatically injects Bearer auth & X-Workspace-Id headers', async () => {
  let capturedHeaders: Record<string, string> = {};
  let capturedUrl = '';

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    capturedUrl = input.toString();
    capturedHeaders = (init?.headers as Record<string, string>) || {};
    return new Response(JSON.stringify({ success: true, data: { status: 'healthy' } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as typeof fetch;

  try {
    const client = new BrainWiseApiClient({
      activeWorkspaceId: 'ws_tenant_solstice',
    });
    client.setAuthToken('token_bearer_verified_abc');

    const result = await client.getHealth();
    assert.ok(result);
    assert.ok(capturedUrl.length > 0);
    assert.equal(capturedHeaders['Authorization'], 'Bearer token_bearer_verified_abc');
    assert.equal(capturedHeaders['X-Workspace-Id'], 'ws_tenant_solstice');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('PHASE 03.3 - BrainWiseApiClient normalizes errors into typed ApiError instances', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'UNAUTHORIZED_ACCESS',
          message: 'Workspace membership expired or invalid.',
          details: { workspaceId: 'ws_invalid' },
        },
      }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }) as typeof fetch;

  try {
    const client = new BrainWiseApiClient();
    await assert.rejects(
      async () => {
        await client.getBusinessProfile('ws_invalid');
      },
      (err: any) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.status, 403);
        assert.equal(err.code, 'UNAUTHORIZED_ACCESS');
        assert.equal(err.message, 'Workspace membership expired or invalid.');
        return true;
      }
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('PHASE 03.4 - Dynamic research methods call correct workspace routes without /workspaces/current', async () => {
  const originalFetch = globalThis.fetch;
  const calls: { url: string; headers: Record<string, string>; body?: any }[] = [];

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = input.toString();
    const headers = (init?.headers as Record<string, string>) || {};
    const body = init?.body ? JSON.parse(init.body as string) : undefined;
    calls.push({ url, headers, body });

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          ideaConcept: 'Specialty Cold Brew',
          industry: 'Food & Beverage',
          potentialCustomerGroups: ['Millennials'],
          geographicContext: { assumedLocation: 'Bangalore' },
          reply: 'Feasibility analysis indicates positive margins.',
          citedSources: ['BrainWise Grounded Benchmarks'],
          suggestedActions: ['Run tasting campaign'],
          status: 'finalized',
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }) as typeof fetch;

  try {
    setStoredAuthToken('auth_token_unit_test');

    // 1. understandIdeaApi
    const underRes = await understandIdeaApi('Cold brew for tech hubs', 'ws_craft_coffee');
    assert.ok(underRes);
    assert.ok(calls[0].url.includes('/api/v1/workspaces/ws_craft_coffee/research/understand-idea'));
    assert.equal(calls[0].url.includes('/workspaces/current/'), false);
    assert.equal(calls[0].headers['X-Workspace-Id'], 'ws_craft_coffee');
    assert.equal(calls[0].headers['Authorization'], 'Bearer auth_token_unit_test');

    // 2. sendConversationalResearchApi
    const convRes = await sendConversationalResearchApi({
      workspaceId: 'ws_craft_coffee',
      reportId: 'rep_123',
      query: 'What if budget is 5 Lakh?',
    });
    assert.ok(convRes);
    assert.ok(
      calls[1].url.includes(
        '/api/v1/workspaces/ws_craft_coffee/research/rep_123/conversation'
      )
    );
    assert.equal(calls[1].url.includes('/workspaces/current/'), false);
    assert.equal(calls[1].headers['X-Workspace-Id'], 'ws_craft_coffee');

    // 3. finalizeIdeaApi
    const finRes = await finalizeIdeaApi({
      workspaceId: 'ws_craft_coffee',
      reportId: 'rep_123',
    });
    assert.ok(finRes);
    assert.ok(
      calls[2].url.includes(
        '/api/v1/workspaces/ws_craft_coffee/research/rep_123/finalize'
      )
    );
    assert.equal(calls[2].url.includes('/workspaces/current/'), false);
    assert.equal(calls[2].headers['X-Workspace-Id'], 'ws_craft_coffee');
  } finally {
    globalThis.fetch = originalFetch;
    setStoredAuthToken(null);
  }
});

test('PHASE 03.5 - generateAiDossier sets X-Workspace-Id header and uses orchestrate route', async () => {
  let capturedUrl = '';
  let capturedHeaders: Record<string, string> = {};

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    capturedUrl = input.toString();
    capturedHeaders = (init?.headers as Record<string, string>) || {};
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          id: 'rep_gen_99',
          title: 'Validated Business Dossier',
          confidenceScore: 92,
        },
        meta: { modelUsed: 'gemini-1.5-pro' },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }) as typeof fetch;

  try {
    setStoredAuthToken('jwt_dossier_auth');
    const result = await generateAiDossier({
      workspaceId: 'ws_enterprise_dossier',
      ideaSummary: 'Autonomous B2B Coffee Subscriptions',
      industry: 'Beverage',
      targetMarket: 'Offices',
      geography: 'India',
      depth: 'Standard Validation',
      brain: {
        businessName: 'BeanDirect',
        industry: 'Beverage',
        stage: 'Expansion',
        location: 'Mumbai',
        brandPositioning: 'Premium workplace coffee',
        targetAudience: 'Tech startups',
      } as any,
    });

    assert.ok(result);
    assert.ok(
      capturedUrl.includes('/api/v1/workspaces/ws_enterprise_dossier/research/orchestrate')
    );
    assert.equal(capturedHeaders['X-Workspace-Id'], 'ws_enterprise_dossier');
    assert.equal(capturedHeaders['Authorization'], 'Bearer jwt_dossier_auth');
  } finally {
    globalThis.fetch = originalFetch;
    setStoredAuthToken(null);
  }
});

test('PHASE 03.6 - Workspace switching dynamically updates active workspace and header routing', async () => {
  const calls: { url: string; workspaceHeader?: string }[] = [];

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = input.toString();
    const headers = (init?.headers as Record<string, string>) || {};
    calls.push({ url, workspaceHeader: headers['X-Workspace-Id'] });
    return new Response(
      JSON.stringify({
        success: true,
        data: { activeWorkspaceId: 'ws_tenant_2', workspace: { id: 'ws_tenant_2' } },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }) as typeof fetch;

  try {
    const client = new BrainWiseApiClient({
      activeWorkspaceId: 'ws_tenant_1',
    });
    client.setAuthToken('user_auth_token');

    // 1. Initial call under tenant 1
    await client.getBusinessProfile('ws_tenant_1');
    assert.equal(calls[0].workspaceHeader, 'ws_tenant_1');
    assert.ok(calls[0].url.includes('/api/v1/workspaces/ws_tenant_1/business-profile'));

    // 2. Switch workspace to tenant 2
    await client.switchActiveWorkspace('ws_tenant_2');
    assert.equal(client.getActiveWorkspaceId(), 'ws_tenant_2');

    // 3. Subsequent call uses tenant 2
    await client.getBusinessProfile('ws_tenant_2');
    assert.equal(calls[2].workspaceHeader, 'ws_tenant_2');
    assert.ok(calls[2].url.includes('/api/v1/workspaces/ws_tenant_2/business-profile'));
  } finally {
    globalThis.fetch = originalFetch;
  }
});
