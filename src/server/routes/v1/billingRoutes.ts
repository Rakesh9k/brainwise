/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, Request, Response } from 'express';
import { db } from '../../db/firestore';
import {
  getAllPlans,
  getAllCreditPacks,
  getPlan,
  GST_RATE,
  calculatePlanAmount,
} from '../../billing/pricingConfig';
import { subscriptionEngine } from '../../billing/subscriptionEngine';
import { creditEngine } from '../../billing/creditEngine';
import { creditPackService } from '../../billing/creditPackService';
import { invoiceService } from '../../billing/invoiceService';
import { refundService } from '../../billing/refundService';
import { entitlementEngine } from '../../billing/entitlementEngine';
import { billingManager } from '../../billing/billingManager';
import { orderRepository, type BillingOrderEntity } from '../../repositories/orderRepository';
import type { PaymentRecord } from '../../billing/types';

export const billingRouter = Router({ mergeParams: true });
export const billingRoutes = billingRouter;

// -------------------------------------------------------------
// 1. PUBLIC CATALOG ENDPOINTS
// -------------------------------------------------------------
billingRouter.get('/plans', (_req: Request, res: Response) => {
  res.json({
    status: 'success',
    data: { plans: getAllPlans() },
  });
});

billingRouter.get('/credit-packs', (_req: Request, res: Response) => {
  res.json({
    status: 'success',
    data: { packs: getAllCreditPacks() },
  });
});

// -------------------------------------------------------------
// 2. WORKSPACE CHECKOUT & PAYMENT VERIFICATION
// -------------------------------------------------------------
billingRouter.post('/checkout', async (req: Request, res: Response): Promise<void> => {
  try {
    const workspaceId = req.params.workspaceId || req.body.workspaceId;
    const {
      type,
      planId,
      billingCycle = 'monthly',
      packId,
      currency = 'INR',
      customerEmail = 'founder@workspace.com',
      customerName = 'Founder',
      customerPhone,
      customerGstin,
      returnUrl = 'http://localhost:5173/settings?tab=subscription-billing',
    } = req.body;

    if (!workspaceId) {
      res.status(400).json({ status: 'error', error: { message: 'Workspace ID required' } });
      return;
    }

    if (type === 'credit_pack') {
      if (!packId) {
        res.status(400).json({
          status: 'error',
          error: { message: 'packId required for credit_pack checkout' },
        });
        return;
      }
      const session = await creditPackService.createPackOrder({
        workspaceId,
        packId,
        customerEmail,
        customerName,
        customerPhone,
        customerGstin,
        returnUrl,
      });
      res.status(200).json({ status: 'success', data: session });
      return;
    }

    // Default: Subscription checkout
    const plan = getPlan(planId || 'professional');
    const { totalAmount } = calculatePlanAmount(plan.planId, billingCycle, currency);
    const taxAmount = Number((totalAmount * GST_RATE).toFixed(2));
    const grandTotal = Number((totalAmount + taxAmount).toFixed(2));

    const orderId = `order_sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const provider = billingManager.getProvider();
    const session = await provider.createCheckoutSession({
      orderId,
      orderAmount: grandTotal,
      orderCurrency: currency,
      customerEmail,
      customerPhone,
      customerName,
      returnUrl,
      metadata: {
        workspaceId,
        planId: plan.planId,
        billingCycle,
      },
    });

    const now = new Date().toISOString();
    const paymentRecord: PaymentRecord = {
      paymentId,
      orderId,
      workspaceId,
      amount: grandTotal,
      currency,
      baseAmount: totalAmount,
      taxAmount,
      taxRate: GST_RATE,
      status: 'created',
      type: 'subscription',
      itemReferenceId: plan.planId,
      providerName: 'cashfree',
      customerEmail,
      customerPhone,
      customerGstin,
      createdAt: now,
    };

    await db
      .doc<PaymentRecord>(`workspaces/${workspaceId}/payments/${paymentId}`)
      .set(paymentRecord);

    const orderEntity: BillingOrderEntity = {
      orderId,
      cfOrderId: (session as any).cfOrderId,
      workspaceId,
      userId: (req as any).user?.uid,
      type: 'subscription',
      itemReferenceId: plan.planId,
      billingCycle,
      amount: grandTotal,
      baseAmount: totalAmount,
      taxAmount,
      currency,
      status: 'CREATED',
      paymentSessionId: session.paymentSessionId,
      checkoutUrl: session.checkoutUrl,
      customerEmail,
      customerName,
      customerPhone,
      customerGstin,
      metadata: {
        planId: plan.planId,
        billingCycle,
        paymentId,
      },
      createdAt: now,
      updatedAt: now,
    };
    await orderRepository.create(orderEntity);

    res.status(200).json({
      status: 'success',
      data: {
        paymentSessionId: session.paymentSessionId,
        checkoutUrl: session.checkoutUrl,
        orderId,
        paymentId,
        totalAmount: grandTotal,
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ status: 'error', error: { message: errorMsg } });
  }
});

billingRouter.post('/verify', async (req: Request, res: Response): Promise<void> => {
  try {
    const workspaceId = req.params.workspaceId || req.body.workspaceId;
    const { orderId, customerBillingAddress } = req.body;

    if (!workspaceId || !orderId) {
      res
        .status(400)
        .json({ status: 'error', error: { message: 'workspaceId and orderId required' } });
      return;
    }

    // Find payment record by orderId
    const paymentsSnap = await db
      .collection<PaymentRecord>(`workspaces/${workspaceId}/payments`)
      .where('orderId', '==', orderId)
      .limit(1)
      .get();

    if (paymentsSnap.empty) {
      res
        .status(404)
        .json({ status: 'error', error: { message: `Payment not found for order: ${orderId}` } });
      return;
    }

    const paymentDoc = paymentsSnap.docs[0];
    const payment = paymentDoc?.data();

    if (!payment) {
      res.status(404).json({
        status: 'error',
        error: { message: `Payment data not found for order: ${orderId}` },
      });
      return;
    }

    // Idempotent return if already fulfilled
    if (payment.status === 'successful') {
      const subscription = await subscriptionEngine.getSubscription(workspaceId);
      const invoices = await invoiceService.listInvoices(workspaceId);
      const invoice = invoices.find((inv) => inv.paymentId === payment.paymentId) || null;
      res.status(200).json({
        status: 'success',
        data: {
          subscription,
          payment,
          invoice,
          alreadyFulfilled: true,
        },
      });
      return;
    }

    if (payment.type === 'credit_pack') {
      const result = await creditPackService.completePackPurchase({
        workspaceId,
        orderId,
        customerBillingAddress,
      });
      res.status(200).json({ status: 'success', data: result });
      return;
    }

    // Fulfill subscription
    const provider = billingManager.getProvider(payment.providerName);
    const verification = await provider.verifyPayment(orderId);

    if (!verification.isPaid) {
      if (verification.paymentStatus === 'pending') {
        payment.status = 'pending';
        await db
          .doc<PaymentRecord>(`workspaces/${workspaceId}/payments/${payment.paymentId}`)
          .set(payment);
        await orderRepository
          .update(workspaceId, orderId, { status: 'PENDING' })
          .catch(() => {});
        res.status(200).json({
          status: 'pending',
          data: {
            orderId,
            paymentStatus: 'pending',
            message:
              'Payment is pending confirmation from gateway. Please wait or check your payment app.',
          },
        });
        return;
      }

      payment.status = verification.paymentStatus || 'failed';
      await db
        .doc<PaymentRecord>(`workspaces/${workspaceId}/payments/${payment.paymentId}`)
        .set(payment);
      await orderRepository
        .update(workspaceId, orderId, {
          status: 'FAILED',
          failureReason: `Payment verification returned status: ${verification.paymentStatus}`,
        })
        .catch(() => {});
      res.status(400).json({
        status: 'error',
        error: {
          code: 'PAYMENT_VERIFICATION_FAILED',
          message: `Payment verification failed (status: ${verification.paymentStatus})`,
        },
      });
      return;
    }

    const now = new Date().toISOString();
    payment.status = 'successful';
    payment.providerReference = verification.providerReference;
    payment.paymentMethod = verification.paymentMethod;
    payment.completedAt = now;
    await db
      .doc<PaymentRecord>(`workspaces/${workspaceId}/payments/${payment.paymentId}`)
      .set(payment);

    await orderRepository
      .update(workspaceId, orderId, {
        status: 'PAID',
        paidAt: now,
        providerPaymentId: verification.providerReference,
        paymentMethod: verification.paymentMethod,
      })
      .catch(() => {});

    const subscription = await subscriptionEngine.activateSubscription({
      workspaceId,
      planId: payment.itemReferenceId,
      billingCycle: 'monthly', // default monthly unless stored in metadata
      currency: payment.currency,
      providerSubscriptionId: orderId,
      paymentMethod: verification.paymentMethod,
      paymentId: payment.paymentId,
    });

    const invoice = await invoiceService.generateInvoice({
      payment,
      customerName: payment.customerEmail.split('@')[0],
      customerBillingAddress,
      customerGstin: payment.customerGstin,
    });

    res.status(200).json({
      status: 'success',
      data: {
        subscription,
        payment,
        invoice,
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ status: 'error', error: { message: errorMsg } });
  }
});

billingRouter.get('/orders', async (req: Request, res: Response): Promise<void> => {
  try {
    const workspaceId = req.params.workspaceId || (req.query.workspaceId as string);
    if (!workspaceId) {
      res.status(400).json({ status: 'error', error: { message: 'workspaceId required' } });
      return;
    }
    const orders = await orderRepository.listByWorkspace(workspaceId);
    res.status(200).json({ status: 'success', data: { orders } });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ status: 'error', error: { message: errorMsg } });
  }
});

// -------------------------------------------------------------
// 3. SUBSCRIPTION CONTROLS
// -------------------------------------------------------------
billingRouter.get('/subscription', async (req: Request, res: Response): Promise<void> => {
  try {
    const workspaceId = req.params.workspaceId;
    const subscription = await subscriptionEngine.getSubscription(workspaceId);
    const plan = getPlan(subscription.planId);
    res.json({
      status: 'success',
      data: { subscription, plan },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ status: 'error', error: { message: errorMsg } });
  }
});

billingRouter.post('/subscription/upgrade', async (req: Request, res: Response): Promise<void> => {
  try {
    const workspaceId = req.params.workspaceId;
    const { newPlanId, billingCycle } = req.body;
    const result = await subscriptionEngine.upgradeSubscription({
      workspaceId,
      newPlanId,
      billingCycle,
    });
    res.json({ status: 'success', data: result });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ status: 'error', error: { message: errorMsg } });
  }
});

billingRouter.post(
  '/subscription/downgrade',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const workspaceId = req.params.workspaceId;
      const { targetPlanId } = req.body;
      const subscription = await subscriptionEngine.scheduleDowngrade({
        workspaceId,
        targetPlanId,
      });
      res.json({ status: 'success', data: { subscription } });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ status: 'error', error: { message: errorMsg } });
    }
  }
);

billingRouter.post('/subscription/cancel', async (req: Request, res: Response): Promise<void> => {
  try {
    const workspaceId = req.params.workspaceId;
    const { immediately, reason } = req.body;
    const subscription = await subscriptionEngine.cancelSubscription({
      workspaceId,
      immediately,
      reason,
    });
    res.json({ status: 'success', data: { subscription } });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ status: 'error', error: { message: errorMsg } });
  }
});

billingRouter.post(
  '/subscription/reactivate',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const workspaceId = req.params.workspaceId;
      const subscription = await subscriptionEngine.reactivateSubscription(workspaceId);
      res.json({ status: 'success', data: { subscription } });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ status: 'error', error: { message: errorMsg } });
    }
  }
);

// -------------------------------------------------------------
// 4. CREDIT WALLET & MULTI-POOL BALANCES
// -------------------------------------------------------------
billingRouter.get('/credits', async (req: Request, res: Response): Promise<void> => {
  try {
    const workspaceId = req.params.workspaceId;
    const account = await creditEngine.getAccount(workspaceId);
    res.json({
      status: 'success',
      data: {
        account,
        balance: account.availableBalance,
        reserved: account.reservedCredits,
        pools: account.pools,
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ status: 'error', error: { message: errorMsg } });
  }
});

billingRouter.get('/ledger', async (req: Request, res: Response): Promise<void> => {
  try {
    const workspaceId = req.params.workspaceId;
    const limit = Number(req.query.limit) || 50;
    const entries = await creditEngine.getLedger(workspaceId, limit);
    res.json({
      status: 'success',
      data: { ledger: entries, count: entries.length },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ status: 'error', error: { message: errorMsg } });
  }
});

// REC-P1-08: Progressive Milestone Credit Refills
billingRouter.post('/claim-milestone', async (req: Request, res: Response): Promise<void> => {
  try {
    const workspaceId = req.params.workspaceId;
    const { milestoneKey } = req.body;
    if (!workspaceId || !milestoneKey) {
      res.status(400).json({ status: 'error', error: { message: 'milestoneKey is required' } });
      return;
    }

    const MILESTONES: Record<string, { credits: number; title: string }> = {
      verify_facts: { credits: 25, title: 'Verified 3 Ground-Truth Facts' },
      add_product: { credits: 25, title: 'Documented Flagship Offering' },
      track_competitor: { credits: 25, title: 'Mapped Category Rivals' },
      export_os: { credits: 50, title: 'Exported Master Business OS' },
      invite_collaborator: { credits: 50, title: 'Invited Strategic Collaborator' },
    };

    const milestone = MILESTONES[milestoneKey];
    if (!milestone) {
      res.status(400).json({ status: 'error', error: { message: `Unknown milestone '${milestoneKey}'` } });
      return;
    }

    const paymentId = `milestone_${workspaceId}_${milestoneKey}`;
    const account = await creditEngine.grantCredits({
      workspaceId,
      amount: milestone.credits,
      pool: 'promotional',
      paymentId,
      description: `Milestone Reward: ${milestone.title}`,
    });

    res.json({
      status: 'success',
      data: {
        claimed: true,
        milestoneKey,
        creditsGranted: milestone.credits,
        title: milestone.title,
        account,
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ status: 'error', error: { message: errorMsg } });
  }
});

// REC-P2-16: 60-Day Subscription Pause Option
billingRouter.post('/subscription/pause', async (req: Request, res: Response): Promise<void> => {
  try {
    const workspaceId = req.params.workspaceId;
    const { durationDays = 60, reason = 'Seasonal pause' } = req.body;

    const subDoc = db.doc(`workspaces/${workspaceId}/subscriptions/active`);
    const snap = await subDoc.get();
    const now = new Date();
    const resumeDate = new Date(now.getTime() + durationDays * 86400000).toISOString();

    if (snap.exists) {
      await subDoc.update({
        status: 'PAUSED',
        pausedAt: now.toISOString(),
        resumeDate,
        pauseReason: reason,
        updatedAt: now.toISOString(),
      });
    }

    res.json({
      status: 'success',
      data: {
        paused: true,
        resumeDate,
        message: `Subscription successfully paused for ${durationDays} days. All Business Brain memory and assets are preserved.`,
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ status: 'error', error: { message: errorMsg } });
  }
});

// -------------------------------------------------------------
// 5. INVOICES
// -------------------------------------------------------------
billingRouter.get('/invoices', async (req: Request, res: Response): Promise<void> => {
  try {
    const workspaceId = req.params.workspaceId;
    const invoices = await invoiceService.listInvoices(workspaceId);
    res.json({ status: 'success', data: { invoices } });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ status: 'error', error: { message: errorMsg } });
  }
});

billingRouter.get('/invoices/:invoiceId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { workspaceId, invoiceId } = req.params;
    const invoice = await invoiceService.getInvoice(workspaceId, invoiceId);
    if (!invoice) {
      res.status(404).json({ status: 'error', error: { message: 'Invoice not found' } });
      return;
    }
    res.json({ status: 'success', data: { invoice } });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ status: 'error', error: { message: errorMsg } });
  }
});

billingRouter.get(
  '/invoices/:invoiceId/download',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { workspaceId, invoiceId } = req.params;
      const invoice = await invoiceService.getInvoice(workspaceId, invoiceId);
      if (!invoice) {
        res.status(404).send('Invoice not found');
        return;
      }
      const html = invoiceService.renderInvoiceHtml(invoice);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      res.status(500).send(`Error generating invoice: ${errorMsg}`);
    }
  }
);

// -------------------------------------------------------------
// 6. ENTITLEMENT BARRIER CHECK
// -------------------------------------------------------------
billingRouter.get(
  '/entitlements/:featureKey',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { workspaceId, featureKey } = req.params;
      const currentUsage = Number(req.query.currentUsage) || 0;
      const result = await entitlementEngine.checkEntitlement(
        workspaceId,
        featureKey,
        currentUsage
      );
      res.json({ status: 'success', data: result });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ status: 'error', error: { message: errorMsg } });
    }
  }
);

// -------------------------------------------------------------
// 7. ADMINISTRATIVE BILLING CONTROLS
// -------------------------------------------------------------
export const adminBillingRouter = Router();

adminBillingRouter.post('/adjust-credits', async (req: Request, res: Response): Promise<void> => {
  try {
    const { workspaceId, amount, reason, adminUserId = 'system_admin' } = req.body;
    if (!workspaceId || amount === undefined || !reason) {
      res.status(400).json({
        status: 'error',
        error: { message: 'workspaceId, amount, and reason are required' },
      });
      return;
    }

    const updated = await creditEngine.adjustCredits({
      workspaceId,
      amount: Number(amount),
      reason,
      adminUserId,
    });

    res.json({ status: 'success', data: { account: updated } });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ status: 'error', error: { message: errorMsg } });
  }
});

adminBillingRouter.post('/refund', async (req: Request, res: Response): Promise<void> => {
  try {
    const { workspaceId, paymentId, refundAmount, reason, approvedBy = 'system_admin' } = req.body;
    if (!workspaceId || !paymentId || !reason) {
      res.status(400).json({
        status: 'error',
        error: { message: 'workspaceId, paymentId, and reason are required' },
      });
      return;
    }

    const refund = await refundService.processRefund({
      workspaceId,
      paymentId,
      refundAmount: refundAmount ? Number(refundAmount) : undefined,
      reason,
      approvedBy,
    });

    res.json({ status: 'success', data: { refund } });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ status: 'error', error: { message: errorMsg } });
  }
});

adminBillingRouter.get(
  '/reconcile/:workspaceId',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { workspaceId } = req.params;
      const report = await creditEngine.reconcile(workspaceId);
      res.json({ status: 'success', data: report });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ status: 'error', error: { message: errorMsg } });
    }
  }
);
