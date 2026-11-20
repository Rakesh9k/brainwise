/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from '../db/firestore';
import type {
  CreditWalletEntity,
  CreditReservationEntity,
  CreditTransactionEntity,
} from '../types/api';

export class CreditWalletRepository {
  public async getWallet(workspaceId: string): Promise<CreditWalletEntity | null> {
    const snap = await db
      .doc<CreditWalletEntity>(`workspaces/${workspaceId}/creditWallet/rootWallet`)
      .get();
    return snap.exists && snap.data() ? snap.data()! : null;
  }

  public async initializeWallet(
    workspaceId: string,
    initialQuota = 800
  ): Promise<CreditWalletEntity> {
    const now = db.serverTimestamp();
    const existing = await this.getWallet(workspaceId);
    if (existing) return existing;

    const renewal = new Date();
    renewal.setDate(renewal.getDate() + 30);

    const entity: CreditWalletEntity = {
      workspaceId,
      balance: initialQuota,
      reserved: 0,
      monthlyQuota: initialQuota,
      quotaRenewalDate: renewal.toISOString(),
      lifetimeGranted: initialQuota,
      lifetimeConsumed: 0,
      updatedAt: now,
    };

    await db
      .doc<CreditWalletEntity>(`workspaces/${workspaceId}/creditWallet/rootWallet`)
      .set(entity);

    // Initial grant ledger entry
    const txId = `tx_grant_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const tx: CreditTransactionEntity = {
      txId,
      workspaceId,
      type: 'GRANT',
      amount: initialQuota,
      balanceBefore: 0,
      balanceAfter: initialQuota,
      featureId: 'FEAT-ONB-INIT',
      notes: 'Initial monthly plan allowance grant',
      createdAt: now,
    };
    await db
      .doc<CreditTransactionEntity>(
        `workspaces/${workspaceId}/creditWallet/rootWallet/transactions/${txId}`
      )
      .set(tx);

    return entity;
  }

  /**
   * Phase 1: Hold Credits (Atomic Reservation Lock)
   */
  public async holdCredits(params: {
    workspaceId: string;
    userId: string;
    featureId: string;
    amount: number;
    idempotencyKey: string;
  }): Promise<CreditReservationEntity> {
    const { workspaceId, userId, featureId, amount, idempotencyKey } = params;

    return await db.runTransaction(async (transaction) => {
      const walletRef = db.doc<CreditWalletEntity>(
        `workspaces/${workspaceId}/creditWallet/rootWallet`
      );
      const walletSnap = await transaction.get(walletRef);

      if (!walletSnap.exists || !walletSnap.data()) {
        throw new Error(`Credit wallet not found for workspace: ${workspaceId}`);
      }

      const wallet = walletSnap.data()!;
      const availableBalance = wallet.balance - wallet.reserved;

      if (availableBalance < amount) {
        throw new Error(
          `INSUFFICIENT_CREDITS: Required ${amount} credits, available balance is ${availableBalance} credits.`
        );
      }

      const reservationId = `res_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const now = db.serverTimestamp();
      const expiresAt = new Date(Date.now() + 120 * 1000).toISOString(); // 120s timeout lock

      const reservation: CreditReservationEntity = {
        reservationId,
        workspaceId,
        userId,
        featureId,
        amount,
        idempotencyKey,
        status: 'HOLD',
        expiresAt,
        createdAt: now,
      };

      // Atomic lock reservation
      const resRef = db.doc<CreditReservationEntity>(
        `workspaces/${workspaceId}/creditWallet/rootWallet/reservations/${reservationId}`
      );
      transaction.set(resRef, reservation);

      // Update wallet reserved pool
      transaction.update(walletRef, {
        reserved: wallet.reserved + amount,
        updatedAt: now,
      });

      return reservation;
    });
  }

  /**
   * Phase 2A: Commit Credits (Permanent Settlement)
   */
  public async commitCredits(params: {
    workspaceId: string;
    reservationId: string;
    featureId: string;
    notes?: string;
  }): Promise<{ transaction: CreditTransactionEntity; remainingBalance: number }> {
    const { workspaceId, reservationId, featureId, notes } = params;

    return await db.runTransaction(async (transaction) => {
      const walletRef = db.doc<CreditWalletEntity>(
        `workspaces/${workspaceId}/creditWallet/rootWallet`
      );
      const resRef = db.doc<CreditReservationEntity>(
        `workspaces/${workspaceId}/creditWallet/rootWallet/reservations/${reservationId}`
      );

      const [walletSnap, resSnap] = await Promise.all([
        transaction.get(walletRef),
        transaction.get(resRef),
      ]);

      if (!walletSnap.exists || !walletSnap.data()) {
        throw new Error(`Wallet not found for workspace: ${workspaceId}`);
      }
      if (!resSnap.exists || !resSnap.data()) {
        throw new Error(`Reservation not found: ${reservationId}`);
      }

      const wallet = walletSnap.data()!;
      const reservation = resSnap.data()!;

      if (reservation.status !== 'HOLD') {
        throw new Error(
          `Reservation ${reservationId} is not in HOLD state (current: ${reservation.status})`
        );
      }

      const debitAmount = reservation.amount;
      const balanceBefore = wallet.balance;
      const balanceAfter = wallet.balance - debitAmount;
      const newReserved = Math.max(0, wallet.reserved - debitAmount);
      const now = db.serverTimestamp();

      // Update reservation state
      transaction.update(resRef, { status: 'COMMITTED' });

      // Update wallet balance and reserved lock
      transaction.update(walletRef, {
        balance: balanceAfter,
        reserved: newReserved,
        lifetimeConsumed: (wallet.lifetimeConsumed || 0) + debitAmount,
        updatedAt: now,
      });

      // Append immutable ledger transaction
      const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const ledgerEntry: CreditTransactionEntity = {
        txId,
        workspaceId,
        userId: reservation.userId,
        type: 'SETTLEMENT',
        amount: -debitAmount,
        balanceBefore,
        balanceAfter,
        featureId,
        idempotencyKey: reservation.idempotencyKey,
        notes: notes || `Settled ${debitAmount} credits for ${featureId}`,
        createdAt: now,
      };

      const txRef = db.doc<CreditTransactionEntity>(
        `workspaces/${workspaceId}/creditWallet/rootWallet/transactions/${txId}`
      );
      transaction.set(txRef, ledgerEntry);

      return {
        transaction: ledgerEntry,
        remainingBalance: balanceAfter,
      };
    });
  }

  /**
   * Phase 2B: Refund / Release Credits (Rollback on Error or Truth Check Failure)
   */
  public async refundCredits(params: {
    workspaceId: string;
    reservationId: string;
    reason: string;
  }): Promise<{ releasedAmount: number; availableBalance: number }> {
    const { workspaceId, reservationId, reason } = params;

    return await db.runTransaction(async (transaction) => {
      const walletRef = db.doc<CreditWalletEntity>(
        `workspaces/${workspaceId}/creditWallet/rootWallet`
      );
      const resRef = db.doc<CreditReservationEntity>(
        `workspaces/${workspaceId}/creditWallet/rootWallet/reservations/${reservationId}`
      );

      const [walletSnap, resSnap] = await Promise.all([
        transaction.get(walletRef),
        transaction.get(resRef),
      ]);

      if (!walletSnap.exists || !walletSnap.data()) {
        throw new Error(`Wallet not found for workspace: ${workspaceId}`);
      }
      if (!resSnap.exists || !resSnap.data()) {
        // Already released or invalid, fail gracefully
        return { releasedAmount: 0, availableBalance: walletSnap.data()?.balance || 0 };
      }

      const wallet = walletSnap.data()!;
      const reservation = resSnap.data()!;

      if (reservation.status !== 'HOLD') {
        return { releasedAmount: 0, availableBalance: wallet.balance };
      }

      const releaseAmount = reservation.amount;
      const newReserved = Math.max(0, wallet.reserved - releaseAmount);
      const now = db.serverTimestamp();

      transaction.update(resRef, { status: 'RELEASED' });
      transaction.update(walletRef, {
        reserved: newReserved,
        updatedAt: now,
      });

      // Ledger entry for audit
      const txId = `tx_refund_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const refundEntry: CreditTransactionEntity = {
        txId,
        workspaceId,
        userId: reservation.userId,
        type: 'REFUND',
        amount: 0, // No balance change, just released lock
        balanceBefore: wallet.balance,
        balanceAfter: wallet.balance,
        featureId: reservation.featureId,
        idempotencyKey: reservation.idempotencyKey,
        notes: `Released ${releaseAmount} credits lock: ${reason}`,
        createdAt: now,
      };

      const txRef = db.doc<CreditTransactionEntity>(
        `workspaces/${workspaceId}/creditWallet/rootWallet/transactions/${txId}`
      );
      transaction.set(txRef, refundEntry);

      return {
        releasedAmount: releaseAmount,
        availableBalance: wallet.balance - newReserved,
      };
    });
  }

  public async listTransactions(workspaceId: string): Promise<CreditTransactionEntity[]> {
    const snap = await db
      .collection<CreditTransactionEntity>(
        `workspaces/${workspaceId}/creditWallet/rootWallet/transactions`
      )
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();
    return snap.docs.map((d) => d.data()).filter((d): d is CreditTransactionEntity => Boolean(d));
  }
}

export const creditWalletRepository = new CreditWalletRepository();
