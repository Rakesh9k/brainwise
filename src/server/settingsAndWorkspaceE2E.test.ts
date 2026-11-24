/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './app';
import { db } from './db/firestore';
import { workspaceService } from './services/workspaceService';
import type { StandardApiResponse } from './types/api';

test('Settings & Workspace E2E Integration Suite', async (t) => {
  db.resetForTesting();
  const app = createApp();
  const server = app.listen(0);
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;
  const authHeaders = {
    Authorization: 'Bearer test-token-founder',
    'Content-Type': 'application/json',
  };

  let workspaceId = '';

  try {
    await t.test('1. Creates new workspace anchor and validates initial state', async () => {
      const res = await fetch(`${baseUrl}/api/v1/workspaces`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          workspaceName: 'Solstice Roasters HQ',
          industry: 'Specialty Coffee',
          country: 'IN',
          timezone: 'Asia/Kolkata (IST)',
          currency: 'INR',
        }),
      });

      assert.equal(res.status, 201);
      const json = (await res.json()) as StandardApiResponse<any>;
      assert.equal(json.success, true);
      workspaceId = json.data.workspace.workspaceId;
      assert.ok(workspaceId);
      assert.equal(json.data.workspace.workspaceName, 'Solstice Roasters HQ');
    });

    await t.test('2. Invites team member with email & role, then verifies in roster', async () => {
      const inviteRes = await fetch(`${baseUrl}/api/v1/workspaces/${workspaceId}/members`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          name: 'Elena Rostova',
          email: 'elena@solstice.coffee',
          role: 'member',
        }),
      });

      assert.equal(inviteRes.status, 201);
      const inviteJson = (await inviteRes.json()) as StandardApiResponse<any>;
      assert.equal(inviteJson.success, true);
      assert.equal(inviteJson.data.email, 'elena@solstice.coffee');
      assert.equal(inviteJson.data.role, 'member');

      const listRes = await fetch(`${baseUrl}/api/v1/workspaces/${workspaceId}/members`, {
        headers: authHeaders,
      });

      assert.equal(listRes.status, 200);
      const listJson = (await listRes.json()) as StandardApiResponse<any[]>;
      assert.ok(Array.isArray(listJson.data));
      const invited = listJson.data.find((m: any) => m.email === 'elena@solstice.coffee');
      assert.ok(invited);
      assert.equal(invited.name, 'Elena Rostova');
    });

    await t.test('3. Generates shareable cryptographic invitation link with 7-day expiry', async () => {
      const res = await fetch(`${baseUrl}/api/v1/workspaces/${workspaceId}/invitations`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          email: 'advisor@venture.in',
          role: 'Strategist',
        }),
      });

      assert.equal(res.status, 200);
      const json = (await res.json()) as StandardApiResponse<any>;
      assert.equal(json.success, true);
      assert.ok(json.data.inviteToken.startsWith('inv_'));
      assert.ok(json.data.inviteLink.includes('inviteToken='));
      assert.ok(json.data.expiresAt);
    });

    await t.test('4. Updates workspace preferences: department AI reasoning tiers & webhooks', async () => {
      const patchRes = await fetch(`${baseUrl}/api/v1/workspaces/${workspaceId}`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({
          preferences: {
            dateFormat: 'MMM D, YYYY',
            defaultLandingView: 'growth-director',
            compactDensity: true,
            departmentAiTiers: {
              ideaIntelligence: 'deep_reasoning',
              competitiveIntelligence: 'deep_reasoning',
              brandStudio: 'balanced',
              growthDirector: 'fast',
            },
          },
          webhooks: {
            slackWebhookUrl: 'https://hooks.slack.com/services/T00/B00/X00',
            discordWebhookUrl: 'https://discord.com/api/webhooks/123/abc',
          },
        }),
      });

      assert.equal(patchRes.status, 200);
      const patchJson = (await patchRes.json()) as StandardApiResponse<any>;
      assert.equal(patchJson.success, true);

      const getRes = await fetch(`${baseUrl}/api/v1/workspaces/${workspaceId}`, {
        headers: authHeaders,
      });

      assert.equal(getRes.status, 200);
      const getJson = (await getRes.json()) as StandardApiResponse<any>;
      assert.equal(getJson.data.preferences?.compactDensity, true);
      assert.equal(
        getJson.data.preferences?.departmentAiTiers?.ideaIntelligence,
        'deep_reasoning'
      );
      assert.equal(
        getJson.data.webhooks?.slackWebhookUrl,
        'https://hooks.slack.com/services/T00/B00/X00'
      );
    });

    await t.test('5. Manages Brand Guardrails & Negative Rules (exclusions API)', async () => {
      // Add negative rule
      const addRes = await fetch(
        `${baseUrl}/api/v1/workspaces/${workspaceId}/business-profile/exclusions`,
        {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ rule: 'guaranteed 100x return' }),
        }
      );

      assert.equal(addRes.status, 200);
      const addJson = (await addRes.json()) as StandardApiResponse<any>;
      assert.equal(addJson.success, true);

      // Remove negative rule
      const delRes = await fetch(
        `${baseUrl}/api/v1/workspaces/${workspaceId}/business-profile/exclusions`,
        {
          method: 'DELETE',
          headers: authHeaders,
          body: JSON.stringify({ rule: 'guaranteed 100x return' }),
        }
      );

      assert.equal(delRes.status, 200);
      const delJson = (await delRes.json()) as StandardApiResponse<any>;
      assert.equal(delJson.success, true);
    });

    await t.test('6. Executes DPDPA 2023 Section 12 Data Erasure with statutory tax notice', async () => {
      const eraseRes = await fetch(`${baseUrl}/api/v1/workspaces/${workspaceId}/dpdpa-erasure`, {
        method: 'DELETE',
        headers: authHeaders,
      });

      assert.equal(eraseRes.status, 200);
      const eraseJson = (await eraseRes.json()) as StandardApiResponse<any>;
      assert.equal(eraseJson.success, true);
      assert.equal(eraseJson.data.status, 'DATA_PURGED_DPDPA_COMPLIANT');
      assert.ok(eraseJson.data.purgedCategories.includes('businessBrain'));
      assert.ok(eraseJson.data.retainedCategories.includes('taxInvoices'));
      assert.ok(eraseJson.data.legalNotice.includes('Companies Act'));
    });
  } finally {
    server.close();
  }
});
