/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { db } from './db/firestore';

test('Database: CRUD operations on collections and subcollections', async () => {
  db.resetForTesting();

  // Create
  const docRef = db.doc('workspaces/ws_test_01/goals/g_101');
  await docRef.set({
    title: 'Achieve $100k ARR',
    currentValue: 25000,
    targetValue: 100000,
    status: 'on_track',
  });

  // Read
  const snap1 = await docRef.get();
  assert.equal(snap1.exists, true);
  assert.equal(snap1.data()?.title, 'Achieve $100k ARR');

  // Update
  await docRef.update({ currentValue: 45000 });
  const snap2 = await docRef.get();
  assert.equal(snap2.data()?.currentValue, 45000);

  // Delete
  await docRef.delete();
  const snap3 = await docRef.get();
  assert.equal(snap3.exists, false);
});

test('Database: Query filtering, ordering, and limits', async () => {
  db.resetForTesting();

  const colRef = db.collection('workspaces/ws_query_test/tasks');
  await colRef.add({ title: 'Task Alpha', priority: 'high', order: 1 });
  await colRef.add({ title: 'Task Beta', priority: 'low', order: 2 });
  await colRef.add({ title: 'Task Gamma', priority: 'high', order: 3 });

  // Where query
  const highPriority = await colRef.where('priority', '==', 'high').get();
  assert.equal(highPriority.size, 2);

  // Order and Limit
  const ordered = await colRef.orderBy('order', 'desc').limit(2).get();
  assert.equal(ordered.size, 2);
  assert.equal(ordered.docs[0].data()?.title, 'Task Gamma');
});

test('Database: Atomic transactions commit on success and rollback on failure', async () => {
  db.resetForTesting();

  const ref1 = db.doc<{ balance: number }>('accounts/acc_1');
  const ref2 = db.doc<{ balance: number }>('accounts/acc_2');

  await ref1.set({ balance: 500 });
  await ref2.set({ balance: 200 });

  // Successful transfer transaction
  await db.runTransaction(async (tx) => {
    const s1 = await tx.get(ref1);
    const s2 = await tx.get(ref2);
    tx.update(ref1, { balance: s1.data()!.balance - 100 });
    tx.update(ref2, { balance: s2.data()!.balance + 100 });
  });

  assert.equal((await ref1.get()).data()?.balance, 400);
  assert.equal((await ref2.get()).data()?.balance, 300);

  // Failing transaction (must rollback completely)
  await assert.rejects(async () => {
    await db.runTransaction(async (tx) => {
      const s1 = await tx.get(ref1);
      tx.update(ref1, { balance: s1.data()!.balance - 50 });
      throw new Error('SIMULATED_TRANSACTION_FAILURE');
    });
  }, /SIMULATED_TRANSACTION_FAILURE/);

  // Verify rollback: ref1 remains 400
  assert.equal((await ref1.get()).data()?.balance, 400);
});
