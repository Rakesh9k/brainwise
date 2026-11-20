/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './app';
import { db } from './db/firestore';
import { workspaceService } from './services/workspaceService';
import { storageService } from './services/storageService';
import type { StandardApiError, StandardApiResponse } from './types/api';

test('Multi-Tenant Workspace Isolation Security Gate: Cross-workspace access is strictly forbidden', async () => {
  db.resetForTesting();
  const app = createApp();
  const server = app.listen(0);
  const port = (server.address() as any).port;

  try {
    // 1. Create Workspace A for Alice
    const { workspace: wsA } = await workspaceService.createWorkspace({
      ownerUserId: 'alice',
      workspaceName: 'Acme Coffee Studio',
      industry: 'Specialty Coffee',
    });

    // 2. Create Workspace B for Bob
    const { workspace: wsB } = await workspaceService.createWorkspace({
      ownerUserId: 'bob',
      workspaceName: 'Nova Software Ventures',
      industry: 'B2B SaaS',
    });

    // -------------------------------------------------------------------------
    // Test 1: Alice accesses Workspace A (Authorized -> 200 OK)
    // -------------------------------------------------------------------------
    const resAliceOwn = await fetch(
      `http://127.0.0.1:${port}/api/v1/workspaces/${wsA.workspaceId}`,
      {
        headers: { Authorization: 'Bearer test-token-alice' },
      }
    );
    assert.equal(resAliceOwn.status, 200);
    const bodyAliceOwn = (await resAliceOwn.json()) as StandardApiResponse<any>;
    assert.equal(bodyAliceOwn.success, true);
    assert.equal(bodyAliceOwn.data.workspaceId, wsA.workspaceId);

    // -------------------------------------------------------------------------
    // Test 2: Alice attempts to access Workspace B (UNAUTHORIZED -> 403 FORBIDDEN)
    // -------------------------------------------------------------------------
    const resAliceIntrusion = await fetch(
      `http://127.0.0.1:${port}/api/v1/workspaces/${wsB.workspaceId}`,
      {
        headers: { Authorization: 'Bearer test-token-alice' },
      }
    );
    assert.equal(resAliceIntrusion.status, 403);
    const bodyAliceIntrusion = (await resAliceIntrusion.json()) as StandardApiError;
    assert.equal(bodyAliceIntrusion.success, false);
    assert.equal(bodyAliceIntrusion.error.code, 'FORBIDDEN_WORKSPACE_ACCESS');

    // -------------------------------------------------------------------------
    // Test 3: Bob accesses Workspace B (Authorized -> 200 OK)
    // -------------------------------------------------------------------------
    const resBobOwn = await fetch(`http://127.0.0.1:${port}/api/v1/workspaces/${wsB.workspaceId}`, {
      headers: { Authorization: 'Bearer test-token-bob' },
    });
    assert.equal(resBobOwn.status, 200);
    const bodyBobOwn = (await resBobOwn.json()) as StandardApiResponse<any>;
    assert.equal(bodyBobOwn.success, true);
    assert.equal(bodyBobOwn.data.workspaceId, wsB.workspaceId);

    // -------------------------------------------------------------------------
    // Test 4: Bob attempts to access Workspace A (UNAUTHORIZED -> 403 FORBIDDEN)
    // -------------------------------------------------------------------------
    const resBobIntrusion = await fetch(
      `http://127.0.0.1:${port}/api/v1/workspaces/${wsA.workspaceId}`,
      {
        headers: { Authorization: 'Bearer test-token-bob' },
      }
    );
    assert.equal(resBobIntrusion.status, 403);
    const bodyBobIntrusion = (await resBobIntrusion.json()) as StandardApiError;
    assert.equal(bodyBobIntrusion.success, false);
    assert.equal(bodyBobIntrusion.error.code, 'FORBIDDEN_WORKSPACE_ACCESS');

    // -------------------------------------------------------------------------
    // Test 5: Sub-resource isolation: Bob attempts to access Alice's Business Brain
    // -------------------------------------------------------------------------
    const resBobBrainIntrusion = await fetch(
      `http://127.0.0.1:${port}/api/v1/workspaces/${wsA.workspaceId}/business-profile`,
      {
        headers: { Authorization: 'Bearer test-token-bob' },
      }
    );
    assert.equal(resBobBrainIntrusion.status, 403);
    const bodyBobBrainIntrusion = (await resBobBrainIntrusion.json()) as StandardApiError;
    assert.equal(bodyBobBrainIntrusion.error.code, 'FORBIDDEN_WORKSPACE_ACCESS');

    // -------------------------------------------------------------------------
    // Test 6: Storage Isolation: Cross-tenant download URL generation is blocked
    // -------------------------------------------------------------------------
    await assert.rejects(
      async () => {
        await storageService.generateSignedDownloadUrl({
          workspaceId: wsA.workspaceId,
          storagePath: `workspaces/${wsB.workspaceId}/brand/logo.svg`, // Mismatched workspace prefix
        });
      },
      (err: Error) => {
        assert.ok(err.message.includes('CROSS_TENANT_ACCESS_DENIED'));
        return true;
      }
    );
  } finally {
    server.close();
  }
});
