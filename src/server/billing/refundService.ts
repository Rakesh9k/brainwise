/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from '../db/firestore';
import type { PaymentRecord, RefundRecord } from './types';
import { billingManager } from './billingManager';
import { creditEngine } from './creditEngine';

export class RefundService {
  public async processRefund(params: {
    workspaceId: string;
    paymentId: string;
    refundAmount?: number;
    reason: string;
    approvedBy?: string;
  }): Promise<RefundRecord> {
    const { workspaceId, paymentId, reason, approvedBy } = params;

    const paymentSnap = await db
      .doc<PaymentRecord>(`workspaces/${workspaceId}/payments/${paymentId}`)
      .get();

    if (!paymentSnap.exists || !paymentSnap.data()) {
      throw new Error(`Payment record not found: ${paymentId}`);
    }

    const payment = paymentSnap.data()!;
    if (payment.status !== 'successful') {
      throw new Error(`Cannot refund payment with status: ${payment.status}`);
    }

    const refundAmount = params.refundAmount || payment.amount;
    if (refundAmount > payment.amount) {
      throw new Error(
        `Refund amount (${refundAmount}) cannot exceed original payment amount (${payment.amount})`
      );
    }

    const refundId = `rfnd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const provider = billingManager.getProvider(payment.providerName);

    // Call provider gateway
    const providerResult = await provider.processRefund({
      orderId: payment.orderId,
      refundAmount,
      refundReason: reason,
      refundId,
    });

    // Compensate / Reverse credits if credit pack purchase
    let creditsReversed = 0;
    if (payment.type === 'credit_pack') {
      const creditAccount = await creditEngine.getAccount(workspaceId);
      // Deduct reversed credits safely
      try {
        const packCredits = Number(payment.providerReference?.split('_')[1]) || 500;
        await creditEngine.adjustCredits({
          workspaceId,
          amount: -Math.min(creditAccount.availableBalance, packCredits),
          reason: `Automatic credit reversal for refund ${refundId}`,
          adminUserId: approvedBy || 'system_refund_worker',
        });
        creditsReversed = Math.min(creditAccount.availableBalance, packCredits);
      } catch {
        // Log warning if balance was already consumed
      }
    }

    const now = new Date().toISOString();
    const refundRecord: RefundRecord = {
      refundId,
      paymentId,
      workspaceId,
      amount: refundAmount,
      currency: payment.currency,
      reason,
      status: providerResult.success ? 'successful' : 'failed',
      providerRefundId: providerResult.providerRefundId,
      creditsReversed,
      approvedBy,
      createdAt: now,
      completedAt: providerResult.success ? now : undefined,
    };

    await db.doc<RefundRecord>(`workspaces/${workspaceId}/refunds/${refundId}`).set(refundRecord);

    // Update payment record
    payment.status = refundAmount === payment.amount ? 'refunded' : 'partially_refunded';
    await db.doc<PaymentRecord>(`workspaces/${workspaceId}/payments/${paymentId}`).set(payment);

    return refundRecord;
  }

  public async getRefund(workspaceId: string, refundId: string): Promise<RefundRecord | null> {
    const snap = await db.doc<RefundRecord>(`workspaces/${workspaceId}/refunds/${refundId}`).get();
    return snap.exists && snap.data() ? snap.data()! : null;
  }

  public async listRefunds(workspaceId: string): Promise<RefundRecord[]> {
    const snap = await db.collection<RefundRecord>(`workspaces/${workspaceId}/refunds`).get();
    return snap.docs
      .map((d) => d.data())
      .filter((d): d is RefundRecord => Boolean(d))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}

export const refundService = new RefundService();
