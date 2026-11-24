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
import { orderRepository, type BillingOrderEntity } from '../../repositories/orderRepository';
import { auditService } from '../../services/auditService';
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
    const rawPayload =
      (req as any).rawBody || (typeof req.body === 'string' ? req.body : JSON.stringify(req.body));

    const provider = billingManager.getProvider();
    const isValid = provider.verifyWebhookSignature(rawPayload, signature, timestamp);

    if (!isValid) {
      await auditService.logSecurityEvent({
        action: 'WEBHOOK_SIGNATURE_VERIFICATION_FAILED',
        resource: 'billing/webhook',
        userId: 'anonymous_webhook_sender',
        details: {
          timestamp,
          hasSignature: Boolean(signature),
          ip: req.ip || req.socket.remoteAddress,
        },
      });

      res.status(401).json({
        status: 'error',
        error: { code: 'INVALID_WEBHOOK_SIGNATURE', message: 'Signature verification failed' },
      });
      return;
    }

    const payload = typeof req.body === 'object' ? req.body : JSON.parse(rawPayload);
    const eventType = payload.type || payload.event || 'PAYMENT_SUCCESS';

    const paymentCfId = payload.data?.payment?.cf_payment_id;
    const orderId =
      payload.data?.order?.order_id ||
      payload.order_id ||
      payload.data?.order_id ||
      payload.orderId;

    // Deterministic deduplication key
    const eventId = paymentCfId
      ? `cf_pay_${paymentCfId}_${eventType}`
      : orderId
        ? `cf_ord_${orderId}_${eventType}`
        : payload.event_id || `evt_${Date.now()}`;

    // Idempotency check in system/billing_webhooks
    const webhookDocRef = db.doc<WebhookEventRecord>(`system/billing_webhooks/${eventId}`);
    const existingSnap = await webhookDocRef.get();

    if (existingSnap.exists && existingSnap.data()?.processed) {
      console.info(`[BILLING_WEBHOOK] Duplicate webhook event ignored: ${eventId}`);
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

    // Resolve workspace and persistent order
    let workspaceId =
      payload.data?.order?.order_tags?.workspaceId ||
      payload.metadata?.workspaceId ||
      payload.workspaceId;

    let existingOrder: BillingOrderEntity | null = null;
    if (orderId) {
      if (workspaceId) {
        existingOrder = await orderRepository.findById(workspaceId, orderId);
      }
      if (!existingOrder) {
        existingOrder = await orderRepository.findByOrderId(orderId);
        if (existingOrder) {
          workspaceId = existingOrder.workspaceId;
        }
      }
    }

    // -------------------------------------------------------------------------
    // 1. PAYMENT SUCCESS / ORDER PAID
    // -------------------------------------------------------------------------
    if (
      eventType === 'PAYMENT_SUCCESS_WEBHOOK' ||
      eventType === 'ORDER_PAID' ||
      eventType === 'PAYMENT_SUCCESS'
    ) {
      if (workspaceId && orderId) {
        // Double-spending & duplicate entitlement protection: check if order already fulfilled
        if (existingOrder && existingOrder.status === 'PAID') {
          console.info(
            `[BILLING_WEBHOOK] Order ${orderId} already marked PAID. Skipping duplicate credit/plan allocation.`
          );
          webhookRecord.processed = true;
          webhookRecord.processedAt = now;
          await webhookDocRef.set(webhookRecord);
          res.status(200).json({ status: 'ok', message: 'Order already fulfilled' });
          return;
        }

        const cfPaymentReference = String(paymentCfId || existingOrder?.cfOrderId || orderId);
        const paymentMethod =
          typeof payload.data?.payment?.payment_method === 'object'
            ? Object.keys(payload.data.payment.payment_method)[0]?.toUpperCase() || 'UPI'
            : payload.data?.payment?.payment_method || 'UPI';

        if (orderId.startsWith('order_pack_')) {
          await creditPackService.completePackPurchase({ workspaceId, orderId });
        } else if (orderId.startsWith('order_sub_')) {
          const planId =
            existingOrder?.itemReferenceId ||
            payload.data?.order?.order_tags?.planId ||
            payload.metadata?.planId ||
            payload.planId ||
            'professional';

          const billingCycle =
            existingOrder?.billingCycle ||
            payload.data?.order?.order_tags?.billingCycle ||
            payload.metadata?.billingCycle ||
            payload.billingCycle ||
            'monthly';

          const currency =
            existingOrder?.currency || payload.data?.order?.order_currency || 'INR';

          const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

          // Activate subscription
          await subscriptionEngine.activateSubscription({
            workspaceId,
            planId,
            billingCycle,
            currency,
            providerSubscriptionId: orderId,
            paymentMethod,
            paymentId,
          });

          // Generate invoice for subscription
          const plan = getPlan(planId);
          const pricing = (plan.pricing as any)[currency] || plan.pricing.INR;
          const baseAmount = billingCycle === 'annual' ? pricing.annualTotal : pricing.monthly;
          const taxAmount = Number((baseAmount * GST_RATE).toFixed(2));
          const totalAmount = Number((baseAmount + taxAmount).toFixed(2));

          const payment: PaymentRecord = {
            paymentId,
            orderId,
            workspaceId,
            amount: totalAmount,
            currency,
            baseAmount,
            taxAmount,
            taxRate: GST_RATE,
            status: 'successful',
            type: 'subscription',
            itemReferenceId: planId,
            providerName: 'cashfree',
            providerReference: cfPaymentReference,
            paymentMethod,
            customerEmail:
              existingOrder?.customerEmail ||
              payload.data?.customer_details?.customer_email ||
              'founder@workspace.com',
            customerPhone:
              existingOrder?.customerPhone || payload.data?.customer_details?.customer_phone,
            customerGstin: existingOrder?.customerGstin,
            createdAt: now,
            completedAt: now,
          };

          await db
            .doc<PaymentRecord>(`workspaces/${workspaceId}/payments/${paymentId}`)
            .set(payment);

          await invoiceService.generateInvoice({
            payment,
            customerName:
              existingOrder?.customerName ||
              payload.data?.customer_details?.customer_name ||
              'Valued Founder',
          });

          // Update order to PAID
          if (existingOrder) {
            await orderRepository.update(workspaceId, orderId, {
              status: 'PAID',
              paidAt: now,
              providerPaymentId: cfPaymentReference,
              paymentMethod,
            });
          }
        }

        await auditService.log({
          workspaceId,
          actorUserId: existingOrder?.userId || 'system_cashfree_webhook',
          action: 'BILLING_PAYMENT_CONFIRMED',
          resourceType: 'order',
          resourceId: orderId,
          metadata: {
            eventType,
            cfPaymentId: paymentCfId,
            provider: 'cashfree',
          },
        });
      }
    }
    // -------------------------------------------------------------------------
    // 2. PAYMENT FAILED
    // -------------------------------------------------------------------------
    else if (eventType === 'PAYMENT_FAILED_WEBHOOK' || eventType === 'PAYMENT_FAILED') {
      const failReason =
        payload.data?.payment?.payment_message ||
        payload.data?.error_details?.error_description ||
        'Transaction declined by bank or gateway';

      if (workspaceId && orderId) {
        if (existingOrder && existingOrder.status !== 'PAID') {
          await orderRepository.update(workspaceId, orderId, {
            status: 'FAILED',
            failureReason: failReason,
          });
        }

        // Update payment record if exists
        const paymentsSnap = await db
          .collection<PaymentRecord>(`workspaces/${workspaceId}/payments`)
          .where('orderId', '==', orderId)
          .limit(1)
          .get();

        if (!paymentsSnap.empty) {
          const doc = paymentsSnap.docs[0];
          if (doc) {
            const p = doc.data();
            if (p) {
              p.status = 'failed';
              await db.doc<PaymentRecord>(`workspaces/${workspaceId}/payments/${p.paymentId}`).set(p);
            }
          }
        }

        await auditService.log({
          workspaceId,
          actorUserId: existingOrder?.userId || 'system_cashfree_webhook',
          action: 'BILLING_PAYMENT_FAILED',
          resourceType: 'order',
          resourceId: orderId,
          metadata: { reason: failReason, cfPaymentId: paymentCfId },
        });
      }
    }
    // -------------------------------------------------------------------------
    // 3. USER DROPPED / CANCELLED
    // -------------------------------------------------------------------------
    else if (
      eventType === 'PAYMENT_USER_DROPPED_WEBHOOK' ||
      eventType === 'PAYMENT_CANCELLED'
    ) {
      if (workspaceId && orderId && existingOrder && existingOrder.status !== 'PAID') {
        await orderRepository.update(workspaceId, orderId, {
          status: 'CANCELLED',
          failureReason: 'Customer dropped or cancelled payment window',
        });
      }
    }
    // -------------------------------------------------------------------------
    // 4. SUBSCRIPTION RENEWAL & CANCELLATION
    // -------------------------------------------------------------------------
    else if (eventType === 'SUBSCRIPTION_RENEWAL') {
      if (workspaceId) {
        await subscriptionEngine.renewSubscription(workspaceId);
      }
    } else if (eventType === 'SUBSCRIPTION_CANCELLED') {
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
    console.error('[BILLING_WEBHOOK_ERROR]', err);
    res.status(500).json({ status: 'error', error: { message: errorMsg } });
  }
});
