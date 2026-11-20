/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './app';
import { db } from './db/firestore';
import type { StandardApiError, StandardApiResponse } from './types/api';

test('Authentication: Rejects requests missing Authorization header with 401', async () => {
  const app = createApp();
  const server = app.listen(0);
  const port = (server.address() as any).port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/v1/users/me`);
    assert.equal(res.status, 401);
    const body = (await res.json()) as StandardApiError;
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'UNAUTHENTICATED');
  } finally {
    server.close();
  }
});

test('Authentication: Rejects empty Bearer token with 401', async () => {
  const app = createApp();
  const server = app.listen(0);
  const port = (server.address() as any).port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/v1/users/me`, {
      headers: { Authorization: 'Bearer   ' },
    });
    assert.equal(res.status, 401);
    const body = (await res.json()) as StandardApiError;
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'INVALID_TOKEN');
  } finally {
    server.close();
  }
});

test('Authentication: Accepts valid dev/test bearer token and returns user profile', async () => {
  db.resetForTesting();
  const app = createApp();
  const server = app.listen(0);
  const port = (server.address() as any).port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/v1/users/me`, {
      headers: { Authorization: 'Bearer test-token-alice' },
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as StandardApiResponse<{
      user: { uid: string; email: string };
    }>;
    assert.equal(body.success, true);
    assert.equal(body.data.user.uid, 'alice');
    assert.equal(body.data.user.email, 'alice@brain-wise.com');
  } finally {
    server.close();
  }
});
