/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from '../db/firestore';

export type BillingOrderStatus =
  | 'CREATED'
  | 'PENDING'
  | 'PAID'
  | 'FAILED'
  | 'EXPIRED'
  | 'REFUNDED'
  | 'CANCELLED';

export interface BillingOrderEntity {
  [key: string]: unknown;
  orderId: string;
  cfOrderId?: string;
  workspaceId: string;
  userId?: string;
  type: 'subscription' | 'credit_pack';
  itemReferenceId: string; // planId or packId
  billingCycle?: 'monthly' | 'annual';
  amount: number;
  baseAmount: number;
  taxAmount: number;
  currency: 'INR' | 'USD';
  status: BillingOrderStatus;
  paymentSessionId: string;
  checkoutUrl: string;
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  customerGstin?: string;
  providerPaymentId?: string;
  paymentMethod?: string;
  paidAt?: string;
  failureReason?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export class OrderRepository {
  public async create(order: BillingOrderEntity): Promise<BillingOrderEntity> {
    const now = new Date().toISOString();
    const entity: BillingOrderEntity = {
      ...order,
      createdAt: order.createdAt || now,
      updatedAt: now,
    };

    await db
      .doc<BillingOrderEntity>(`workspaces/${order.workspaceId}/orders/${order.orderId}`)
      .set(entity);

    // Also index in global index for webhook lookup if workspaceId is not in tags
    await db
      .doc<{ workspaceId: string; orderId: string; createdAt: string }>(
        `system/billing_orders_index/${order.orderId}`
      )
      .set({
        workspaceId: order.workspaceId,
        orderId: order.orderId,
        createdAt: now,
      });

    return entity;
  }

  public async findById(
    workspaceId: string,
    orderId: string
  ): Promise<BillingOrderEntity | null> {
    const snap = await db
      .doc<BillingOrderEntity>(`workspaces/${workspaceId}/orders/${orderId}`)
      .get();
    return snap.exists && snap.data() ? snap.data()! : null;
  }

  public async findByOrderId(orderId: string): Promise<BillingOrderEntity | null> {
    // Check global index first
    const indexSnap = await db
      .doc<{ workspaceId: string; orderId: string }>(`system/billing_orders_index/${orderId}`)
      .get();

    if (indexSnap.exists && indexSnap.data()) {
      const { workspaceId } = indexSnap.data()!;
      return await this.findById(workspaceId, orderId);
    }

    return null;
  }

  public async update(
    workspaceId: string,
    orderId: string,
    updates: Partial<BillingOrderEntity>
  ): Promise<BillingOrderEntity> {
    const existing = await this.findById(workspaceId, orderId);
    if (!existing) {
      throw new Error(`Order not found: ${orderId} in workspace: ${workspaceId}`);
    }

    // State machine guardrails
    if (existing.status === 'PAID' && updates.status && updates.status !== 'PAID' && updates.status !== 'REFUNDED') {
      throw new Error(`Invalid state transition: Cannot change status of PAID order '${orderId}' to '${updates.status}'`);
    }

    if (existing.status === 'REFUNDED' && updates.status && updates.status !== 'REFUNDED') {
      throw new Error(`Invalid state transition: Cannot change status of REFUNDED order '${orderId}' to '${updates.status}'`);
    }

    const updated: BillingOrderEntity = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await db
      .doc<BillingOrderEntity>(`workspaces/${workspaceId}/orders/${orderId}`)
      .set(updated);

    return updated;
  }

  public async listByWorkspace(workspaceId: string): Promise<BillingOrderEntity[]> {
    const snap = await db
      .collection<BillingOrderEntity>(`workspaces/${workspaceId}/orders`)
      .orderBy('createdAt', 'desc')
      .get();

    return snap.docs
      .map((d) => d.data())
      .filter((d): d is BillingOrderEntity => Boolean(d));
  }
}

export const orderRepository = new OrderRepository();
