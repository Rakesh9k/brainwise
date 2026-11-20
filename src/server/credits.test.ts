/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { db } from './db/firestore';
import { creditService } from './services/creditService';
import { creditWalletRepository } from './repositories/creditWalletRepository';

test('Credit Subsystem: Two-Phase Reservation Protocol (ADR-006)', async () => {
  db.resetForTesting();
  const wsId = 'ws_fin_test_01';
  const userId = 'usr_fin_01';

  // 1. Initialize Wallet with 10 credits for test
  await creditWalletRepository.initializeWallet(wsId, 10);
  const initialWallet = await creditService.getWallet(wsId);
  assert.equal(initialWallet.balance, 10);
  assert.equal(initialWallet.reserved, 0);

  // 2. Phase 1: Hold 8 credits for Market Dossier (FEAT-RES-001)
  const reservation = await creditService.reserveCredits({
    workspaceId: wsId,
    userId,
    featureId: 'FEAT-RES-001', // 8 credits
    idempotencyKey: 'idem_test_001',
  });
  assert.ok(reservation);
  assert.equal(reservation.amount, 8);
  assert.equal(reservation.status, 'HOLD');

  const lockedWallet = await creditService.getWallet(wsId);
  assert.equal(lockedWallet.balance, 10);
  assert.equal(lockedWallet.reserved, 8); // 8 credits locked

  // 3. Insufficient Credits: Attempt to reserve another 5 credits (available = 10 - 8 = 2 < 5)
  await assert.rejects(async () => {
    await creditService.reserveCredits({
      workspaceId: wsId,
      userId,
      featureId: 'FEAT-BRD-001', // 5 credits
    });
  }, /INSUFFICIENT_CREDITS/);

  // 4. Phase 2A: Permanent Settlement
  const settlement = await creditService.settleCredits({
    workspaceId: wsId,
    reservation,
    featureId: 'FEAT-RES-001',
    notes: 'Dossier generated successfully',
  });

  assert.equal(settlement.remainingBalance, 2); // 10 - 8 = 2
  const settledWallet = await creditService.getWallet(wsId);
  assert.equal(settledWallet.balance, 2);
  assert.equal(settledWallet.reserved, 0);

  // 5. Verify immutable double-entry ledger
  const txs = await creditService.listTransactions(wsId);
  assert.ok(txs.length >= 2); // 1 INITIAL GRANT + 1 SETTLEMENT
  const settleTx = txs.find((t) => t.type === 'SETTLEMENT');
  assert.ok(settleTx);
  assert.equal(settleTx.amount, -8);
  assert.equal(settleTx.balanceBefore, 10);
  assert.equal(settleTx.balanceAfter, 2);
});

test('Credit Subsystem: Rollback and auto-refund on failed generation', async () => {
  db.resetForTesting();
  const wsId = 'ws_rollback_test';
  const userId = 'usr_fin_02';

  await creditWalletRepository.initializeWallet(wsId, 100);

  // Hold 5 credits for Brand Asset
  const reservation = await creditService.reserveCredits({
    workspaceId: wsId,
    userId,
    featureId: 'FEAT-BRD-001', // 5 credits
  });

  assert.ok(reservation);
  const midWallet = await creditService.getWallet(wsId);
  assert.equal(midWallet.reserved, 5);

  // Simulate upstream error -> Trigger Refund
  const refundResult = await creditService.refundCredits({
    workspaceId: wsId,
    reservation,
    reason: 'Upstream Gemini timeout safeguard',
  });

  assert.equal(refundResult.availableBalance, 100);

  const finalWallet = await creditService.getWallet(wsId);
  assert.equal(finalWallet.balance, 100); // Balance untouched
  assert.equal(finalWallet.reserved, 0); // Reserved lock released

  // Ledger records refund event for audit
  const txs = await creditService.listTransactions(wsId);
  const refundTx = txs.find((t) => t.type === 'REFUND');
  assert.ok(refundTx);
});
