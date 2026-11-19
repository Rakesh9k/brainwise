/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BrainWiseApiClient, ApiError } from './apiClient';

test('BrainWiseApiClient initializes with default options', () => {
  const client = new BrainWiseApiClient();
  assert.ok(client);
});

test('ApiError encapsulates status, code, and details', () => {
  const error = new ApiError('Unauthorized request', 401, 'AUTH_REQUIRED', {
    reason: 'Token expired',
  });
  assert.equal(error.name, 'ApiError');
  assert.equal(error.message, 'Unauthorized request');
  assert.equal(error.status, 401);
  assert.equal(error.code, 'AUTH_REQUIRED');
  assert.deepEqual(error.details, { reason: 'Token expired' });
});

test('BrainWiseApiClient attaches bearer token if getAuthToken is provided', async () => {
  let capturedHeader: string | undefined;

  // Mock global fetch for this isolated test
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    capturedHeader = (init?.headers as Record<string, string>)?.['Authorization'];
    return new Response(JSON.stringify({ ok: true, aiConfigured: true, model: 'gemini' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as typeof fetch;

  try {
    const client = new BrainWiseApiClient({
      getAuthToken: async () => 'test-firebase-id-token-xyz',
    });
    const health = await client.getHealth();
    assert.equal(health.ok, true);
    assert.equal(capturedHeader, 'Bearer test-firebase-id-token-xyz');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
