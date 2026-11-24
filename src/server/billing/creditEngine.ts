/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from '../db/firestore';
import type {
  CreditPoolType,
  CreditTransactionType,
  EnhancedCreditLedgerEntry,
  MultiPoolCreditAccount,
} from './types';

export interface CreditReservationRecord {
  [key: string]: unknown;
  reservationId: string;
  workspaceId: string;
  userId?: string;
  featureId: string;
  amount: number;
  status: 'PENDING' | 'COMMITTED' | 'RELEASED';
  idempotencyKey?: string;
  createdAt: string;
  committedAt?: string;
  releasedAt?: string;
}

export class CreditEngine {
  public async getAccount(workspaceId: string): Promise<MultiPoolCreditAccount> {
    const docRef = db.doc<MultiPoolCreditAccount>(`workspaces/${workspaceId}/creditAccount/root`);
    const snap = await docRef.get();

    if (snap.exists && snap.data()) {
      return snap.data()!;
    }

    // Auto-initialize with Free plan 150 welcome credits
    return await this.initializeAccount(workspaceId, 150);
  }

  public async initializeAccount(
    workspaceId: string,
    initialWelcomeCredits = 150
  ): Promise<MultiPoolCreditAccount> {
    const now = new Date().toISOString();
    const account: MultiPoolCreditAccount = {
      workspaceId,
      availableBalance: initialWelcomeCredits,
      reservedCredits: 0,
      pools: {
        welcome: initialWelcomeCredits,
        subscription: 0,
        purchased: 0,
        promotional: 0,
      },
      lifetimeGranted: initialWelcomeCredits,
      lifetimeConsumed: 0,
      lastUpdated: now,
    };

    const docRef = db.doc<MultiPoolCreditAccount>(`workspaces/${workspaceId}/creditAccount/root`);
    await docRef.set(account);

    if (initialWelcomeCredits > 0) {
      const txId = `tx_init_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const ledgerEntry: EnhancedCreditLedgerEntry = {
        txId,
        workspaceId,
        type: 'WELCOME_GRANT',
        pool: 'welcome',
        amount: initialWelcomeCredits,
        balanceBefore: 0,
        balanceAfter: initialWelcomeCredits,
        featureId: 'ONBOARDING_WELCOME',
        notes: 'Welcome credits for new workspace creation',
        createdAt: now,
      };

      await db
        .doc<EnhancedCreditLedgerEntry>(
          `workspaces/${workspaceId}/creditAccount/root/ledger/${txId}`
        )
        .set(ledgerEntry);
    }

    return account;
  }

  public async holdCredits(params: {
    workspaceId: string;
    userId?: string;
    featureId: string;
    amount: number;
    idempotencyKey?: string;
  }): Promise<CreditReservationRecord> {
    const { workspaceId, userId, featureId, amount, idempotencyKey } = params;

    if (amount <= 0) {
      throw new Error(`Invalid credit reservation amount: ${amount}`);
    }

    return await db.runTransaction(async (transaction) => {
      const accountRef = db.doc<MultiPoolCreditAccount>(
        `workspaces/${workspaceId}/creditAccount/root`
      );
      const snap = await transaction.get(accountRef);

      if (!snap.exists || !snap.data()) {
        throw new Error(`Credit account not found for workspace: ${workspaceId}`);
      }

      const account = snap.data()!;
      if (account.availableBalance < amount) {
        throw new Error(
          `INSUFFICIENT_CREDITS: Required ${amount} credits, available balance is ${account.availableBalance} credits.`
        );
      }

      // Check idempotency if key provided
      if (idempotencyKey) {
        const existingSnap = await transaction.get(
          db.doc<CreditReservationRecord>(
            `workspaces/${workspaceId}/creditAccount/root/reservations/${idempotencyKey}`
          )
        );
        if (existingSnap.exists && existingSnap.data()) {
          return existingSnap.data()!;
        }
      }

      const reservationId = `res_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const now = new Date().toISOString();

      const reservation: CreditReservationRecord = {
        reservationId,
        workspaceId,
        userId,
        featureId,
        amount,
        status: 'PENDING',
        idempotencyKey,
        createdAt: now,
      };

      // Reserve credits
      account.reservedCredits += amount;
      account.availableBalance -= amount;
      account.lastUpdated = now;

      transaction.set(accountRef, account);
      transaction.set(
        db.doc<CreditReservationRecord>(
          `workspaces/${workspaceId}/creditAccount/root/reservations/${reservationId}`
        ),
        reservation
      );
      if (idempotencyKey) {
        transaction.set(
          db.doc<CreditReservationRecord>(
            `workspaces/${workspaceId}/creditAccount/root/reservations/${idempotencyKey}`
          ),
          reservation
        );
      }

      return reservation;
    });
  }

  public async commitCredits(params: {
    workspaceId: string;
    reservationId: string;
    featureId: string;
    notes?: string;
  }): Promise<{ remainingBalance: number; transaction: EnhancedCreditLedgerEntry }> {
    const { workspaceId, reservationId, featureId, notes } = params;

    return await db.runTransaction(async (transaction) => {
      const accountRef = db.doc<MultiPoolCreditAccount>(
        `workspaces/${workspaceId}/creditAccount/root`
      );
      const reservationRef = db.doc<CreditReservationRecord>(
        `workspaces/${workspaceId}/creditAccount/root/reservations/${reservationId}`
      );

      const [accountSnap, resSnap] = await Promise.all([
        transaction.get(accountRef),
        transaction.get(reservationRef),
      ]);

      if (!accountSnap.exists || !accountSnap.data()) {
        throw new Error(`Credit account not found for workspace: ${workspaceId}`);
      }
      if (!resSnap.exists || !resSnap.data()) {
        throw new Error(`Reservation not found: ${reservationId}`);
      }

      const account = accountSnap.data()!;
      const reservation = resSnap.data()!;

      if (reservation.status !== 'PENDING') {
        throw new Error(`Reservation ${reservationId} is already ${reservation.status}`);
      }

      const amountToDeduct = reservation.amount;
      const balanceBefore = account.availableBalance + reservation.amount; // pre-reservation balance
      let remainingDeduct = amountToDeduct;

      // Priority Deduction Order:
      // 1. Promotional (expiring soonest)
      // 2. Subscription (monthly allowance)
      // 3. Welcome (onboarding)
      // 4. Purchased (never expiring)
      const poolDeductions: Record<CreditPoolType, number> = {
        promotional: 0,
        subscription: 0,
        welcome: 0,
        purchased: 0,
        adjustment: 0,
      };

      const poolsPriority: Array<'promotional' | 'subscription' | 'welcome' | 'purchased'> = [
        'promotional',
        'subscription',
        'welcome',
        'purchased',
      ];

      for (const pool of poolsPriority) {
        if (remainingDeduct <= 0) break;
        const availableInPool = account.pools[pool] || 0;
        if (availableInPool > 0) {
          const deducted = Math.min(availableInPool, remainingDeduct);
          account.pools[pool] -= deducted;
          remainingDeduct -= deducted;
          poolDeductions[pool] = deducted;
        }
      }

      // Finalize account state
      account.reservedCredits = Math.max(0, account.reservedCredits - amountToDeduct);
      account.lifetimeConsumed += amountToDeduct;
      const now = new Date().toISOString();
      account.lastUpdated = now;

      // Mark reservation committed
      reservation.status = 'COMMITTED';
      reservation.committedAt = now;

      // Primary deducted pool tag
      const primaryPool: CreditPoolType =
        poolDeductions.promotional > 0
          ? 'promotional'
          : poolDeductions.subscription > 0
            ? 'subscription'
            : poolDeductions.welcome > 0
              ? 'welcome'
              : 'purchased';

      const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const ledgerEntry: EnhancedCreditLedgerEntry = {
        txId,
        workspaceId,
        userId: reservation.userId,
        type: 'CREDIT_SETTLEMENT',
        pool: primaryPool,
        amount: -amountToDeduct,
        balanceBefore,
        balanceAfter: account.availableBalance,
        featureId,
        reservationId,
        notes: notes || `Settlement for ${featureId}`,
        createdAt: now,
      };

      transaction.set(accountRef, account);
      transaction.set(reservationRef, reservation);
      transaction.set(
        db.doc<EnhancedCreditLedgerEntry>(
          `workspaces/${workspaceId}/creditAccount/root/ledger/${txId}`
        ),
        ledgerEntry
      );

      return {
        remainingBalance: account.availableBalance,
        transaction: ledgerEntry,
      };
    });
  }

  public async releaseCredits(params: {
    workspaceId: string;
    reservationId: string;
    reason: string;
  }): Promise<{ availableBalance: number }> {
    const { workspaceId, reservationId, reason } = params;

    return await db.runTransaction(async (transaction) => {
      const accountRef = db.doc<MultiPoolCreditAccount>(
        `workspaces/${workspaceId}/creditAccount/root`
      );
      const reservationRef = db.doc<CreditReservationRecord>(
        `workspaces/${workspaceId}/creditAccount/root/reservations/${reservationId}`
      );

      const [accountSnap, resSnap] = await Promise.all([
        transaction.get(accountRef),
        transaction.get(reservationRef),
      ]);

      if (!accountSnap.exists || !accountSnap.data()) {
        throw new Error(`Credit account not found for workspace: ${workspaceId}`);
      }
      if (!resSnap.exists || !resSnap.data()) {
        throw new Error(`Reservation not found: ${reservationId}`);
      }

      const account = accountSnap.data()!;
      const reservation = resSnap.data()!;

      if (reservation.status !== 'PENDING') {
        return { availableBalance: account.availableBalance };
      }

      // Rollback reservation lock
      account.reservedCredits = Math.max(0, account.reservedCredits - reservation.amount);
      account.availableBalance += reservation.amount;
      const now = new Date().toISOString();
      account.lastUpdated = now;

      reservation.status = 'RELEASED';
      reservation.releasedAt = now;

      const txId = `tx_rel_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const ledgerEntry: EnhancedCreditLedgerEntry = {
        txId,
        workspaceId,
        userId: reservation.userId,
        type: 'CREDIT_RELEASE',
        pool: 'adjustment',
        amount: 0,
        balanceBefore: account.availableBalance - reservation.amount,
        balanceAfter: account.availableBalance,
        featureId: reservation.featureId,
        reservationId,
        notes: `Released reservation: ${reason}`,
        createdAt: now,
      };

      transaction.set(accountRef, account);
      transaction.set(reservationRef, reservation);
      transaction.set(
        db.doc<EnhancedCreditLedgerEntry>(
          `workspaces/${workspaceId}/creditAccount/root/ledger/${txId}`
        ),
        ledgerEntry
      );

      return { availableBalance: account.availableBalance };
    });
  }

  public async grantCredits(params: {
    workspaceId: string;
    pool: CreditPoolType;
    amount: number;
    transactionType: CreditTransactionType;
    notes: string;
    paymentId?: string;
    subscriptionId?: string;
  }): Promise<MultiPoolCreditAccount> {
    const { workspaceId, pool, amount, transactionType, notes, paymentId, subscriptionId } = params;

    if (amount <= 0) {
      throw new Error(`Credit grant amount must be positive: ${amount}`);
    }

    // Idempotency: Prevent duplicate credit allocation for the same paymentId
    if (paymentId) {
      const existingLedger = await db
        .collection<EnhancedCreditLedgerEntry>(`workspaces/${workspaceId}/creditAccount/root/ledger`)
        .where('paymentId', '==', paymentId)
        .limit(1)
        .get();

      if (!existingLedger.empty) {
        console.info(
          `[CREDIT_ENGINE] Credits already granted for paymentId '${paymentId}'. Skipping duplicate allocation.`
        );
        return await this.getAccount(workspaceId);
      }
    }

    return await db.runTransaction(async (transaction) => {
      const accountRef = db.doc<MultiPoolCreditAccount>(
        `workspaces/${workspaceId}/creditAccount/root`
      );
      const snap = await transaction.get(accountRef);

      const account =
        snap.exists && snap.data()
          ? snap.data()!
          : {
              workspaceId,
              availableBalance: 0,
              reservedCredits: 0,
              pools: { welcome: 0, subscription: 0, purchased: 0, promotional: 0 },
              lifetimeGranted: 0,
              lifetimeConsumed: 0,
              lastUpdated: new Date().toISOString(),
            };

      const balanceBefore = account.availableBalance;
      account.availableBalance += amount;
      account.lifetimeGranted += amount;

      if (pool in account.pools) {
        account.pools[pool as keyof typeof account.pools] += amount;
      } else {
        account.pools.purchased += amount;
      }

      const now = new Date().toISOString();
      account.lastUpdated = now;

      const txId = `tx_grnt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const ledgerEntry: EnhancedCreditLedgerEntry = {
        txId,
        workspaceId,
        type: transactionType,
        pool,
        amount,
        balanceBefore,
        balanceAfter: account.availableBalance,
        paymentId,
        subscriptionId,
        notes,
        createdAt: now,
      };

      transaction.set(accountRef, account);
      transaction.set(
        db.doc<EnhancedCreditLedgerEntry>(
          `workspaces/${workspaceId}/creditAccount/root/ledger/${txId}`
        ),
        ledgerEntry
      );

      return account;
    });
  }

  public async adjustCredits(params: {
    workspaceId: string;
    amount: number; // positive or negative
    reason: string;
    adminUserId: string;
  }): Promise<MultiPoolCreditAccount> {
    const { workspaceId, amount, reason, adminUserId } = params;

    if (!reason || reason.trim().length < 5) {
      throw new Error(
        'Mandatory administrative reason (minimum 5 chars) is required for credit adjustments.'
      );
    }

    return await db.runTransaction(async (transaction) => {
      const accountRef = db.doc<MultiPoolCreditAccount>(
        `workspaces/${workspaceId}/creditAccount/root`
      );
      const snap = await transaction.get(accountRef);

      if (!snap.exists || !snap.data()) {
        throw new Error(`Credit account not found for workspace: ${workspaceId}`);
      }

      const account = snap.data()!;
      const balanceBefore = account.availableBalance;

      if (amount < 0 && account.availableBalance < Math.abs(amount)) {
        throw new Error(
          `Cannot deduct ${Math.abs(amount)} credits: account only has ${account.availableBalance} credits available.`
        );
      }

      account.availableBalance += amount;
      if (amount > 0) {
        account.pools.promotional += amount;
        account.lifetimeGranted += amount;
      } else {
        // Deduct from promotional/subscription/purchased
        let toDeduct = Math.abs(amount);
        for (const pool of ['promotional', 'subscription', 'welcome', 'purchased'] as const) {
          if (toDeduct <= 0) break;
          const avail = account.pools[pool];
          const dec = Math.min(avail, toDeduct);
          account.pools[pool] -= dec;
          toDeduct -= dec;
        }
      }

      const now = new Date().toISOString();
      account.lastUpdated = now;

      const txId = `tx_adj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const ledgerEntry: EnhancedCreditLedgerEntry = {
        txId,
        workspaceId,
        userId: adminUserId,
        type: 'ADJUSTMENT_GRANT',
        pool: 'adjustment',
        amount,
        balanceBefore,
        balanceAfter: account.availableBalance,
        notes: `Admin adjustment by ${adminUserId}: ${reason}`,
        createdAt: now,
      };

      transaction.set(accountRef, account);
      transaction.set(
        db.doc<EnhancedCreditLedgerEntry>(
          `workspaces/${workspaceId}/creditAccount/root/ledger/${txId}`
        ),
        ledgerEntry
      );

      return account;
    });
  }

  public async getLedger(workspaceId: string, limit = 50): Promise<EnhancedCreditLedgerEntry[]> {
    const snap = await db
      .collection<EnhancedCreditLedgerEntry>(`workspaces/${workspaceId}/creditAccount/root/ledger`)
      .limit(limit)
      .get();

    return snap.docs
      .map((d) => d.data())
      .filter((d): d is EnhancedCreditLedgerEntry => Boolean(d))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public async reconcile(workspaceId: string): Promise<{
    isBalanced: boolean;
    computedBalance: number;
    recordedBalance: number;
    difference: number;
  }> {
    const account = await this.getAccount(workspaceId);
    const ledger = await this.getLedger(workspaceId, 500);

    let sum = 0;
    for (const entry of ledger) {
      if (entry.type !== 'CREDIT_RELEASE') {
        sum += entry.amount;
      }
    }

    const recordedBalance = account.availableBalance + account.reservedCredits;
    const difference = sum - recordedBalance;

    return {
      isBalanced: difference === 0,
      computedBalance: sum,
      recordedBalance,
      difference,
    };
  }
}

export const creditEngine = new CreditEngine();
