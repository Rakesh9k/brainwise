/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from '../db/firestore';
import type { BillingCycle, Currency, SubscriptionRecord } from './types';
import { getPlan } from './pricingConfig';
import { creditEngine } from './creditEngine';

export class SubscriptionEngine {
  public async getSubscription(workspaceId: string): Promise<SubscriptionRecord> {
    const snap = await db
      .doc<SubscriptionRecord>(`workspaces/${workspaceId}/subscription/current`)
      .get();

    if (snap.exists && snap.data()) {
      return snap.data()!;
    }

    // Default to Free Plan
    return await this.createDefaultFreeSubscription(workspaceId);
  }

  public async createDefaultFreeSubscription(workspaceId: string): Promise<SubscriptionRecord> {
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setFullYear(now.getFullYear() + 10); // Free plan effectively perpetual

    const freeRecord: SubscriptionRecord = {
      subscriptionId: `sub_free_${workspaceId}`,
      workspaceId,
      planId: 'free',
      planName: 'Free Starter',
      status: 'active',
      billingCycle: 'monthly',
      currency: 'INR',
      unitAmount: 0,
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: periodEnd.toISOString(),
      cancelAtPeriodEnd: false,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    await db
      .doc<SubscriptionRecord>(`workspaces/${workspaceId}/subscription/current`)
      .set(freeRecord);

    return freeRecord;
  }

  public async activateSubscription(params: {
    workspaceId: string;
    planId: string;
    billingCycle: BillingCycle;
    currency: Currency;
    providerSubscriptionId?: string;
    providerCustomerId?: string;
    paymentMethod?: string;
    paymentId?: string;
  }): Promise<SubscriptionRecord> {
    const {
      workspaceId,
      planId,
      billingCycle,
      currency,
      providerSubscriptionId,
      providerCustomerId,
      paymentMethod,
      paymentId,
    } = params;

    const plan = getPlan(planId);
    const now = new Date();
    const periodEnd = new Date(now);

    if (billingCycle === 'annual') {
      periodEnd.setFullYear(now.getFullYear() + 1);
    } else {
      periodEnd.setDate(now.getDate() + 30);
    }

    const pricing = plan.pricing[currency] || plan.pricing.INR;
    const unitAmount = billingCycle === 'annual' ? pricing.annualMonthly : pricing.monthly;

    const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const record: SubscriptionRecord = {
      subscriptionId,
      workspaceId,
      planId: plan.planId,
      planName: plan.name,
      status: 'active',
      billingCycle,
      currency,
      unitAmount,
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: periodEnd.toISOString(),
      nextBillingDate: periodEnd.toISOString(),
      cancelAtPeriodEnd: false,
      providerSubscriptionId,
      providerCustomerId,
      paymentMethod,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    await db.doc<SubscriptionRecord>(`workspaces/${workspaceId}/subscription/current`).set(record);

    // Grant monthly subscription credits
    const monthlyCredits = plan.limits.monthlyCredits;
    if (monthlyCredits > 0) {
      await creditEngine.grantCredits({
        workspaceId,
        pool: 'subscription',
        amount: monthlyCredits,
        transactionType: 'SUBSCRIPTION_GRANT',
        subscriptionId,
        paymentId,
        notes: `Subscription activation credit allowance for ${plan.name} (${billingCycle})`,
      });
    }

    return record;
  }

  public async renewSubscription(
    workspaceId: string,
    paymentId?: string
  ): Promise<SubscriptionRecord> {
    const current = await this.getSubscription(workspaceId);
    if (current.status !== 'active' && current.status !== 'cancellation_scheduled') {
      throw new Error(`Cannot renew inactive subscription with status: ${current.status}`);
    }

    const plan = getPlan(current.planId);
    const now = new Date();
    const newEnd = new Date(now);

    if (current.billingCycle === 'annual') {
      newEnd.setFullYear(now.getFullYear() + 1);
    } else {
      newEnd.setDate(now.getDate() + 30);
    }

    current.currentPeriodStart = now.toISOString();
    current.currentPeriodEnd = newEnd.toISOString();
    current.nextBillingDate = newEnd.toISOString();
    current.status = 'active';
    current.cancelAtPeriodEnd = false;
    current.updatedAt = now.toISOString();

    await db.doc<SubscriptionRecord>(`workspaces/${workspaceId}/subscription/current`).set(current);

    // Refresh monthly subscription credits
    if (plan.limits.monthlyCredits > 0) {
      await creditEngine.grantCredits({
        workspaceId,
        pool: 'subscription',
        amount: plan.limits.monthlyCredits,
        transactionType: 'SUBSCRIPTION_GRANT',
        subscriptionId: current.subscriptionId,
        paymentId,
        notes: `Monthly renewal allowance refresh for ${plan.name}`,
      });
    }

    return current;
  }

  public async upgradeSubscription(params: {
    workspaceId: string;
    newPlanId: string;
    billingCycle?: BillingCycle;
    paymentId?: string;
  }): Promise<{ subscription: SubscriptionRecord; proratedCreditsGranted: number }> {
    const { workspaceId, newPlanId, billingCycle, paymentId } = params;
    const current = await this.getSubscription(workspaceId);
    const newPlan = getPlan(newPlanId);

    const cycle = billingCycle || current.billingCycle;
    const now = new Date();
    const periodEnd = new Date(now);

    if (cycle === 'annual') {
      periodEnd.setFullYear(now.getFullYear() + 1);
    } else {
      periodEnd.setDate(now.getDate() + 30);
    }

    const pricing = newPlan.pricing[current.currency] || newPlan.pricing.INR;
    const unitAmount = cycle === 'annual' ? pricing.annualMonthly : pricing.monthly;

    const oldPlan = getPlan(current.planId);
    const creditDelta = Math.max(0, newPlan.limits.monthlyCredits - oldPlan.limits.monthlyCredits);

    current.planId = newPlan.planId;
    current.planName = newPlan.name;
    current.billingCycle = cycle;
    current.unitAmount = unitAmount;
    current.status = 'active';
    current.cancelAtPeriodEnd = false;
    current.currentPeriodStart = now.toISOString();
    current.currentPeriodEnd = periodEnd.toISOString();
    current.nextBillingDate = periodEnd.toISOString();
    current.updatedAt = now.toISOString();

    await db.doc<SubscriptionRecord>(`workspaces/${workspaceId}/subscription/current`).set(current);

    // Grant delta credits immediately
    if (creditDelta > 0) {
      await creditEngine.grantCredits({
        workspaceId,
        pool: 'subscription',
        amount: creditDelta,
        transactionType: 'SUBSCRIPTION_GRANT',
        subscriptionId: current.subscriptionId,
        paymentId,
        notes: `Upgrade allowance boost from ${oldPlan.name} to ${newPlan.name}`,
      });
    }

    return {
      subscription: current,
      proratedCreditsGranted: creditDelta,
    };
  }

  public async scheduleDowngrade(params: {
    workspaceId: string;
    targetPlanId: string;
  }): Promise<SubscriptionRecord> {
    const { workspaceId, targetPlanId } = params;
    const current = await this.getSubscription(workspaceId);

    // Verify target plan exists
    getPlan(targetPlanId);

    const now = new Date().toISOString();
    current.cancelAtPeriodEnd = true;
    current.status = 'cancellation_scheduled';
    current.scheduledDowngradePlanId = targetPlanId;
    current.updatedAt = now;

    await db.doc<SubscriptionRecord>(`workspaces/${workspaceId}/subscription/current`).set(current);

    return current;
  }

  public async cancelSubscription(params: {
    workspaceId: string;
    immediately?: boolean;
    reason?: string;
  }): Promise<SubscriptionRecord> {
    const { workspaceId, immediately, reason } = params;
    const current = await this.getSubscription(workspaceId);
    const now = new Date().toISOString();

    if (immediately) {
      current.status = 'cancelled';
      current.cancelledAt = now;
      current.cancelReason = reason || 'Immediate cancellation requested';
      current.updatedAt = now;
    } else {
      current.status = 'cancellation_scheduled';
      current.cancelAtPeriodEnd = true;
      current.cancelledAt = now;
      current.cancelReason = reason || 'Cancellation scheduled for period end';
      current.updatedAt = now;
    }

    await db.doc<SubscriptionRecord>(`workspaces/${workspaceId}/subscription/current`).set(current);

    return current;
  }

  public async reactivateSubscription(workspaceId: string): Promise<SubscriptionRecord> {
    const current = await this.getSubscription(workspaceId);
    if (current.status !== 'cancellation_scheduled') {
      throw new Error(
        `Only subscriptions scheduled for cancellation can be reactivated. Current status: ${current.status}`
      );
    }

    const now = new Date().toISOString();
    current.status = 'active';
    current.cancelAtPeriodEnd = false;
    current.scheduledDowngradePlanId = undefined;
    current.cancelledAt = undefined;
    current.cancelReason = undefined;
    current.updatedAt = now;

    await db.doc<SubscriptionRecord>(`workspaces/${workspaceId}/subscription/current`).set(current);

    return current;
  }
}

export const subscriptionEngine = new SubscriptionEngine();
