/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, Request, Response } from 'express';
import { db } from '../../db/firestore';
import { billingManager } from '../../billing/billingManager';
import { subscriptionEngine } from '../../billing/subscriptionEngine';
import { creditPackService } from '../../billing/creditPackService';
import { invoiceService } from '../../billing/invoiceService';
import { getPlan, GST_RATE } from '../../billing/pricingConfig';
import type { PaymentRecord, WebhookEventRecord } from '../../billing/types';

export const billingWebhookRouter = Router();

billingWebhookRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const signature =
      (req.headers['x-webhook-signature'] as string) ||
      (req.headers['x-cashfree-signature'] as string) ||
      '';
    const timestamp = (req.headers['x-webhook-timestamp'] as string) || '';
    const rawPayload = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

    const provider = billingManager.getProvider();
    const isValid = provider.verifyWebhookSignature(rawPayload, signature, timestamp);

    if (!isValid) {
      res.status(401).json({
        status: 'error',
        error: { code: 'INVALID_WEBHOOK_SIGNATURE', message: 'Signature verification failed' },
      });
      return;
    }

    const payload = typeof req.body === 'object' ? req.body : JSON.parse(rawPayload);
    const eventId =
      payload.data?.order?.order_id || payload.event_id || payload.orderId || `evt_${Date.now()}`;
    const eventType = payload.type || payload.event || 'PAYMENT_SUCCESS';

    // Idempotency check in system/billing_webhooks
    const webhookDocRef = db.doc<WebhookEventRecord>(`system/billing_webhooks/${eventId}`);
    const existingSnap = await webhookDocRef.get();

    if (existingSnap.exists && existingSnap.data()?.processed) {
      res.status(200).json({ status: 'ok', message: 'Event already processed' });
      return;
    }

    const now = new Date().toISOString();
    const webhookRecord: WebhookEventRecord = {
      webhookId: eventId,
      provider: provider.id,
      eventType,
      eventId,
      processed: false,
      receivedAt: now,
    };

    // Dispatch event processing
    if (eventType === 'PAYMENT_SUCCESS' || eventType === 'ORDER_PAID') {
      const orderId = payload.data?.order?.order_id || payload.orderId;
      const workspaceId =
        payload.data?.order?.order_tags?.workspaceId ||
        payload.metadata?.workspaceId ||
        payload.workspaceId;

      if (workspaceId && orderId) {
        if (orderId.startsWith('order_pack_')) {
          await creditPackService.completePackPurchase({ workspaceId, orderId });
        } else if (orderId.startsWith('order_sub_')) {
          const planId =
            payload.data?.order?.order_tags?.planId ||
            payload.metadata?.planId ||
            payload.planId ||
            'professional';
          const billingCycle =
            payload.data?.order?.order_tags?.billingCycle ||
            payload.metadata?.billingCycle ||
            payload.billingCycle ||
            'monthly';

          await subscriptionEngine.activateSubscription({
            workspaceId,
            planId,
            billingCycle,
            currency: payload.data?.order?.order_currency || 'INR',
            providerSubscriptionId: orderId,
            paymentMethod: payload.data?.payment?.payment_method || 'UPI',
          });

          // Generate invoice for subscription
          const plan = getPlan(planId);
          const pricing = plan.pricing.INR;
          const baseAmount = billingCycle === 'annual' ? pricing.annualTotal : pricing.monthly;
          const taxAmount = Number((baseAmount * GST_RATE).toFixed(2));
          const totalAmount = Number((baseAmount + taxAmount).toFixed(2));

          const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          const payment: PaymentRecord = {
            paymentId,
            orderId,
            workspaceId,
            amount: totalAmount,
            currency: 'INR',
            baseAmount,
            taxAmount,
            taxRate: GST_RATE,
            status: 'successful',
            type: 'subscription',
            itemReferenceId: planId,
            providerName: 'cashfree',
            customerEmail:
              payload.data?.customer_details?.customer_email || 'founder@workspace.com',
            createdAt: now,
            completedAt: now,
          };

          await db
            .doc<PaymentRecord>(`workspaces/${workspaceId}/payments/${paymentId}`)
            .set(payment);

          await invoiceService.generateInvoice({
            payment,
            customerName: payload.data?.customer_details?.customer_name || 'Valued Founder',
          });
        }
      }
    } else if (eventType === 'SUBSCRIPTION_RENEWAL') {
      const workspaceId = payload.workspaceId || payload.data?.subscription?.workspaceId;
      if (workspaceId) {
        await subscriptionEngine.renewSubscription(workspaceId);
      }
    } else if (eventType === 'SUBSCRIPTION_CANCELLED') {
      const workspaceId = payload.workspaceId || payload.data?.subscription?.workspaceId;
      if (workspaceId) {
        await subscriptionEngine.cancelSubscription({ workspaceId, immediately: true });
      }
    }

    webhookRecord.processed = true;
    webhookRecord.processedAt = new Date().toISOString();
    await webhookDocRef.set(webhookRecord);

    res.status(200).json({ status: 'ok', processed: true, eventId });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ status: 'error', error: { message: errorMsg } });
  }
});
