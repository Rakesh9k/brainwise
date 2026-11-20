/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './app';
import type { StandardApiResponse } from './types/api';

test('Full API Integration: End-to-end workspace lifecycle, persistence, and legacy state migration', async () => {
  const app = createApp();
  const server = app.listen(0);
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;
  const authHeaders = {
    Authorization: 'Bearer test-token-e2e-user',
    'Content-Type': 'application/json',
  };

  try {
    // 1. Create Workspace
    const createWsRes = await fetch(`${baseUrl}/api/v1/workspaces`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        workspaceName: 'E2E Roastery',
        industry: 'Beverages',
        country: 'IN',
      }),
    });
    assert.equal(createWsRes.status, 201);
    const wsBody = (await createWsRes.json()) as StandardApiResponse<{
      workspace: { workspaceId: string };
    }>;
    const wsId = wsBody.data.workspace.workspaceId;

    // 2. Fetch Business Profile
    const brainRes = await fetch(`${baseUrl}/api/v1/workspaces/${wsId}/business-profile`, {
      headers: authHeaders,
    });
    assert.equal(brainRes.status, 200);
    const brainBody = (await brainRes.json()) as StandardApiResponse<{ businessName: string }>;
    assert.equal(brainBody.data.businessName, 'E2E Roastery');

    // 3. Create Goal
    const goalRes = await fetch(`${baseUrl}/api/v1/workspaces/${wsId}/goals`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        title: 'Reach 1,000 active subscribers',
        currentValue: 120,
        targetValue: 1000,
        unit: 'subscribers',
      }),
    });
    assert.equal(goalRes.status, 201);

    // 4. Create Competitor
    const compRes = await fetch(`${baseUrl}/api/v1/workspaces/${wsId}/competitors`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        name: 'Artisan Brew Co',
        positioning: 'Premium single-origin roasts',
        strengths: ['Brand loyalty', 'Direct farm trade'],
        weaknesses: ['Limited retail footprint'],
      }),
    });
    assert.equal(compRes.status, 201);

    // 5. Check Credit Wallet
    const creditRes = await fetch(`${baseUrl}/api/v1/workspaces/${wsId}/credits`, {
      headers: authHeaders,
    });
    assert.equal(creditRes.status, 200);
    const creditBody = (await creditRes.json()) as StandardApiResponse<{
      balance: number;
      monthlyQuota: number;
    }>;
    assert.ok(creditBody.data.balance === 150 || creditBody.data.balance === 800);

    // 6. Test Legacy Prototype Data Migration
    const legacyData = {
      brain: {
        businessName: 'Migrated Solstice Roastery',
        tagline: 'Farm-gate to espresso in 48 hours',
        stage: 'Growing Business',
      },
      goals: [
        {
          id: 'g_migrated_1',
          title: 'Open 2nd roastery location',
          currentValue: 40,
          targetValue: 100,
        },
      ],
      competitors: [{ id: 'c_migrated_1', name: 'Third Wave Roasters', marketShare: '18%' }],
      tasks: [
        {
          id: 't_migrated_1',
          title: 'Finalize retail lease agreement',
          priority: 'high',
          status: 'pending',
        },
      ],
    };

    const migrateRes = await fetch(`${baseUrl}/api/v1/workspaces/${wsId}/migrate`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ legacyState: legacyData }),
    });
    assert.equal(migrateRes.status, 200);
    const migrateBody = (await migrateRes.json()) as StandardApiResponse<{
      migrated: boolean;
      recordsMigrated: number;
    }>;
    assert.equal(migrateBody.data.migrated, true);
    assert.ok(migrateBody.data.recordsMigrated >= 4);

    // Verify migrated brain reflects on server
    const verifiedBrainRes = await fetch(`${baseUrl}/api/v1/workspaces/${wsId}/business-profile`, {
      headers: authHeaders,
    });
    const verifiedBrainBody = (await verifiedBrainRes.json()) as StandardApiResponse<{
      businessName: string;
    }>;
    assert.equal(verifiedBrainBody.data.businessName, 'Migrated Solstice Roastery');
  } finally {
    server.close();
  }
});
