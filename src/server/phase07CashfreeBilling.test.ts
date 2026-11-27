/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

process.env.NODE_ENV = 'test';
process.env.TEST_MODE = 'true';

import test from 'node:test';
import assert from 'node:assert/strict';
import { CashfreeProvider } from './billing/providers/cashfreeProvider';
import { orderRepository, type BillingOrderEntity } from './repositories/orderRepository';
import { subscriptionEngine } from './billing/subscriptionEngine';
import { creditEngine } from './billing/creditEngine';
import { billingManager } from './billing/billingManager';
import { createApp } from './app';
import { db } from './db/firestore';
import type { PaymentRecord } from './billing/types';

test('PHASE 07 — CASHFREE REAL PAYMENT & BILLING IMPLEMENTATION SUITE', async (t) => {
  const ws1 = `ws_billing_tenant1_${Date.now()}`;
  const ws2 = `ws_billing_tenant2_${Date.now()}`;
  const user1 = `usr_founder_1_${Date.now()}`;

  // Initialize accounts with default 150 welcome credits
  await creditEngine.initializeAccount(ws1, 150);
  await creditEngine.initializeAccount(ws2, 150);

  const testApp = createApp();
  const server = testApp.listen(0);
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const secretKey = 'test_cashfree_secret_key_123';
  const appId = 'TEST_CASHFREE_APP_ID_123';
  const provider = new CashfreeProvider({
    appId,
    secretKey,
    apiVersion: '2023-08-01',
    environment: 'sandbox',
  });

  try {
    // =========================================================================
    // 1. ORDER CREATION & CHECKOUT SESSION (REAL CASHFREE REQUEST FORMAT)
    // =========================================================================
    await t.test('1. Sandbox order creation generates valid Cashfree payment session', async () => {
      let capturedRequest: any = null;

      // Mock fetcher to simulate Cashfree Sandbox PG 200 OK response
      provider.setCustomFetcher(async (url: any, init: any) => {
        capturedRequest = { url: String(url), method: init.method, headers: init.headers, body: JSON.parse(init.body) };
        return new Response(
          JSON.stringify({
            cf_order_id: 'cf_ord_sandbox_882910',
            order_id: capturedRequest.body.order_id,
            entity: 'order',
            order_currency: 'INR',
            order_amount: capturedRequest.body.order_amount,
            order_status: 'ACTIVE',
            payment_session_id: 'session_cf_sandbox_xyz882910',
            order_expiry_time: new Date(Date.now() + 3600000).toISOString(),
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      });

      const orderId = `order_sub_test_${Date.now()}`;
      const session = await provider.createCheckoutSession({
        orderId,
        orderAmount: 3538.82, // Professional Plan + 18% GST
        orderCurrency: 'INR',
        customerEmail: 'founder@solstice.coffee',
        customerPhone: '9876543210',
        customerName: 'Aarav Patel',
        returnUrl: 'https://app.brainwise.com/settings?tab=subscription-billing&order_id={order_id}',
        metadata: {
          workspaceId: ws1,
          planId: 'professional',
          billingCycle: 'monthly',
        },
      });

      assert.equal(session.orderId, orderId);
      assert.equal(session.paymentSessionId, 'session_cf_sandbox_xyz882910');
      assert.ok(session.checkoutUrl.includes('session_cf_sandbox_xyz882910'));
      assert.equal(session.cfOrderId, 'cf_ord_sandbox_882910');

      // Verify outbound request headers and body adhere strictly to Cashfree API v3
      assert.equal(capturedRequest.method, 'POST');
      assert.ok(capturedRequest.url.endsWith('/orders'));
      assert.equal(capturedRequest.headers['x-client-id'], appId);
      assert.equal(capturedRequest.headers['x-client-secret'], secretKey);
      assert.equal(capturedRequest.headers['x-api-version'], '2023-08-01');
      assert.equal(capturedRequest.body.order_amount, 3538.82);
      assert.equal(capturedRequest.body.customer_details.customer_email, 'founder@solstice.coffee');
      assert.equal(capturedRequest.body.customer_details.customer_phone, '9876543210');
    });

    // =========================================================================
    // 2. INVALID CREDENTIALS & ERROR HANDLING
    // =========================================================================
    await t.test('2. Rejects order creation on invalid Cashfree credentials', async () => {
      const invalidProvider = new CashfreeProvider({
        appId: 'INVALID_APP_ID',
        secretKey: 'INVALID_SECRET',
        environment: 'sandbox',
      });

      invalidProvider.setCustomFetcher(async () => {
        return new Response(
          JSON.stringify({
            message: 'Authentication failed. Please check your credentials.',
            code: 'authentication_failed',
            type: 'authentication_error',
          }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      });

      await assert.rejects(
        async () => {
          await invalidProvider.createCheckoutSession({
            orderId: `order_fail_${Date.now()}`,
            orderAmount: 1178.82,
            orderCurrency: 'INR',
            customerEmail: 'test@example.com',
            customerName: 'Test User',
            returnUrl: 'https://app.brainwise.com/return',
          });
        },
        {
          message: /CASHFREE_ORDER_CREATION_FAILED \(401\)/,
        }
      );
    });

    // =========================================================================
    // 3. PERSISTENT ORDER REPOSITORY & STATE MACHINE
    // =========================================================================
    await t.test('3. Persistent order creation and state transitions', async () => {
      const orderId = `order_sub_statemachine_${Date.now()}`;
      const initialOrder: BillingOrderEntity = {
        orderId,
        cfOrderId: 'cf_ord_1001',
        workspaceId: ws1,
        userId: user1,
        type: 'subscription',
        itemReferenceId: 'professional',
        billingCycle: 'monthly',
        amount: 3538.82,
        baseAmount: 2999,
        taxAmount: 539.82,
        currency: 'INR',
        status: 'CREATED',
        paymentSessionId: 'session_statemachine_1001',
        checkoutUrl: 'https://payments-test.cashfree.com/forms/session_statemachine_1001',
        customerEmail: 'founder@solstice.coffee',
        customerName: 'Aarav Patel',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await orderRepository.create(initialOrder);

      const retrieved = await orderRepository.findById(ws1, orderId);
      assert.ok(retrieved);
      assert.equal(retrieved.status, 'CREATED');

      // Valid transition: CREATED -> PENDING
      const pendingOrder = await orderRepository.update(ws1, orderId, { status: 'PENDING' });
      assert.equal(pendingOrder.status, 'PENDING');

      // Valid transition: PENDING -> PAID
      const paidOrder = await orderRepository.update(ws1, orderId, {
        status: 'PAID',
        paidAt: new Date().toISOString(),
        providerPaymentId: 'cf_pay_998822',
        paymentMethod: 'UPI',
      });
      assert.equal(paidOrder.status, 'PAID');
      assert.equal(paidOrder.providerPaymentId, 'cf_pay_998822');

      // Invalid transition: PAID cannot transition backwards to PENDING or FAILED
      await assert.rejects(
        async () => {
          await orderRepository.update(ws1, orderId, { status: 'FAILED' });
        },
        {
          message: /Invalid state transition/,
        }
      );
    });

    // =========================================================================
    // 4. CRYPTOGRAPHIC WEBHOOK SIGNATURE VERIFICATION
    // =========================================================================
    await t.test('4. Webhook cryptographic HMAC-SHA256 signature verification', async () => {
      const rawPayload = JSON.stringify({
        data: {
          order: { order_id: 'order_test_sig', order_amount: 3538.82, order_currency: 'INR' },
          payment: { cf_payment_id: 881122, payment_status: 'SUCCESS', payment_amount: 3538.82 },
        },
        type: 'PAYMENT_SUCCESS_WEBHOOK',
      });

      const timestamp = String(Math.floor(Date.now() / 1000));
      const validSig = provider.generateWebhookSignature(rawPayload, timestamp);

      // 1. Valid signature passes
      assert.equal(provider.verifyWebhookSignature(rawPayload, validSig, timestamp), true);

      // 2. Tampered signature fails
      assert.equal(provider.verifyWebhookSignature(rawPayload, 'fake_invalid_signature==', timestamp), false);

      // 3. Tampered payload fails
      const tamperedPayload = rawPayload.replace('3538.82', '1.00');
      assert.equal(provider.verifyWebhookSignature(tamperedPayload, validSig, timestamp), false);

      // 4. Tampered timestamp fails
      assert.equal(provider.verifyWebhookSignature(rawPayload, validSig, '1122334455'), false);
    });

    // =========================================================================
    // 5. WEBHOOK IDEMPOTENCY & DUPLICATE PREVENTION
    // =========================================================================
    await t.test('5. Webhook idempotency prevents duplicate credit & plan allocation', async () => {
      const orderId = `order_sub_idempotent_${Date.now()}`;
      const cfPaymentId = `cf_pay_idemp_${Date.now()}`;

      // Create persistent order in CREATED state
      await orderRepository.create({
        orderId,
        workspaceId: ws1,
        userId: user1,
        type: 'subscription',
        itemReferenceId: 'professional',
        billingCycle: 'monthly',
        amount: 3538.82,
        baseAmount: 2999,
        taxAmount: 539.82,
        currency: 'INR',
        status: 'CREATED',
        paymentSessionId: 'sess_idemp',
        checkoutUrl: 'https://payments.cashfree.com/forms/sess_idemp',
        customerEmail: 'founder@solstice.coffee',
        customerName: 'Aarav Patel',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const accountBefore = await creditEngine.getAccount(ws1);
      const balanceBefore = accountBefore.availableBalance;

      const webhookPayload = {
        data: {
          order: {
            order_id: orderId,
            order_amount: 3538.82,
            order_currency: 'INR',
            order_tags: { workspaceId: ws1, planId: 'professional', billingCycle: 'monthly' },
          },
          payment: {
            cf_payment_id: cfPaymentId,
            payment_status: 'SUCCESS',
            payment_amount: 3538.82,
            payment_method: { upi: { channel: 'collect' } },
          },
          customer_details: {
            customer_email: 'founder@solstice.coffee',
            customer_name: 'Aarav Patel',
          },
        },
        type: 'PAYMENT_SUCCESS_WEBHOOK',
      };

      const rawBody = JSON.stringify(webhookPayload);
      const timestamp = String(Math.floor(Date.now() / 1000));
      // Using app default secret
      const defaultProvider = new CashfreeProvider();
      billingManager.registerProvider(defaultProvider);
      const signature = defaultProvider.generateWebhookSignature(rawBody, timestamp);

      // First webhook delivery
      const res1 = await fetch(`${baseUrl}/api/v1/billing/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-webhook-signature': signature,
          'x-webhook-timestamp': timestamp,
        },
        body: rawBody,
      });

      assert.equal(res1.status, 200);
      const json1 = await res1.json();
      assert.equal(json1.status, 'ok');

      // Verify plan is activated and credits granted
      const subAfter1 = await subscriptionEngine.getSubscription(ws1);
      assert.equal(subAfter1.planId, 'professional');
      assert.equal(subAfter1.status, 'active');

      const accountAfter1 = await creditEngine.getAccount(ws1);
      // Professional plan gives 3000 monthly credits
      assert.equal(accountAfter1.availableBalance, balanceBefore + 3000);

      // Second identical webhook delivery (replay/retry from Cashfree)
      const res2 = await fetch(`${baseUrl}/api/v1/billing/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-webhook-signature': signature,
          'x-webhook-timestamp': timestamp,
        },
        body: rawBody,
      });

      assert.equal(res2.status, 200);
      const json2 = await res2.json();
      assert.ok(json2.message.includes('already processed') || json2.message.includes('already fulfilled'));

      // Verify balance did NOT increment a second time
      const accountAfter2 = await creditEngine.getAccount(ws1);
      assert.equal(accountAfter2.availableBalance, balanceBefore + 3000);
    });

    // =========================================================================
    // 6. PAYMENT FAILURE & REJECTION (ZERO CREDITS ALLOCATED)
    // =========================================================================
    await t.test('6. Payment failure webhook updates order status to FAILED with zero credit allocation', async () => {
      const orderId = `order_sub_failed_${Date.now()}`;
      await orderRepository.create({
        orderId,
        workspaceId: ws1,
        userId: user1,
        type: 'subscription',
        itemReferenceId: 'scale',
        billingCycle: 'monthly',
        amount: 8258.82,
        baseAmount: 6999,
        taxAmount: 1259.82,
        currency: 'INR',
        status: 'CREATED',
        paymentSessionId: 'sess_failed',
        checkoutUrl: 'https://payments.cashfree.com/forms/sess_failed',
        customerEmail: 'failed@card.com',
        customerName: 'Declined Founder',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const accountBefore = await creditEngine.getAccount(ws1);

      const failPayload = {
        data: {
          order: {
            order_id: orderId,
            order_amount: 8258.82,
            order_currency: 'INR',
            order_tags: { workspaceId: ws1, planId: 'scale' },
          },
          payment: {
            cf_payment_id: `cf_fail_${Date.now()}`,
            payment_status: 'FAILED',
            payment_message: 'Insufficient balance in customer bank account',
          },
        },
        type: 'PAYMENT_FAILED_WEBHOOK',
      };

      const rawBody = JSON.stringify(failPayload);
      const timestamp = String(Math.floor(Date.now() / 1000));
      const defaultProvider = new CashfreeProvider();
      billingManager.registerProvider(defaultProvider);
      const signature = defaultProvider.generateWebhookSignature(rawBody, timestamp);

      const res = await fetch(`${baseUrl}/api/v1/billing/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-webhook-signature': signature,
          'x-webhook-timestamp': timestamp,
        },
        body: rawBody,
      });

      assert.equal(res.status, 200);

      // Verify order status is marked FAILED with failureReason
      const failedOrder = await orderRepository.findById(ws1, orderId);
      assert.ok(failedOrder);
      assert.equal(failedOrder.status, 'FAILED');
      assert.ok(failedOrder.failureReason?.includes('Insufficient balance'));

      // Verify account credits are untouched
      const accountAfter = await creditEngine.getAccount(ws1);
      assert.equal(accountAfter.availableBalance, accountBefore.availableBalance);
    });

    // =========================================================================
    // 7. CLIENT REDIRECT NEVER TRUSTED WITHOUT SERVER RECONCILIATION
    // =========================================================================
    await t.test('7. Client verify endpoint queries Cashfree PG and rejects unconfirmed orders', async () => {
      const orderId = `order_sub_unconfirmed_${Date.now()}`;
      const paymentId = `pay_unconfirmed_${Date.now()}`;

      // Create persistent payment in 'created' state
      const paymentRecord: PaymentRecord = {
        paymentId,
        orderId,
        workspaceId: ws1,
        amount: 3538.82,
        currency: 'INR',
        baseAmount: 2999,
        taxAmount: 539.82,
        taxRate: 0.18,
        status: 'created',
        type: 'subscription',
        itemReferenceId: 'professional',
        providerName: 'cashfree',
        customerEmail: 'founder@solstice.coffee',
        createdAt: new Date().toISOString(),
      };

      await db.doc(`workspaces/${ws1}/payments/${paymentId}`).set(paymentRecord);
      await orderRepository.create({
        orderId,
        workspaceId: ws1,
        type: 'subscription',
        itemReferenceId: 'professional',
        amount: 3538.82,
        baseAmount: 2999,
        taxAmount: 539.82,
        currency: 'INR',
        status: 'CREATED',
        paymentSessionId: 'sess_unconfirmed',
        checkoutUrl: 'https://payments.cashfree.com/forms/sess_unconfirmed',
        customerEmail: 'founder@solstice.coffee',
        customerName: 'Aarav Patel',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Browser redirects back and calls verify while gateway reports order still ACTIVE (unpaid)
      const unconfirmedProvider = new CashfreeProvider();
      unconfirmedProvider.setCustomFetcher(async (url: any) => {
        if (String(url).includes('/orders/')) {
          return new Response(
            JSON.stringify({
              order_id: orderId,
              order_status: 'ACTIVE', // still awaiting customer payment
              order_amount: 3538.82,
            }),
            { status: 200 }
          );
        }
        return new Response('[]', { status: 200 });
      });

      // Temporarily inject unconfirmed provider
      const billingManager = (await import('./billing/billingManager')).billingManager;
      billingManager.registerProvider(unconfirmedProvider);

      const verifyRes = await fetch(`${baseUrl}/api/v1/workspaces/${ws1}/billing/verify`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-token-founder',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId }),
      });

      assert.equal(verifyRes.status, 200);
      const verifyJson = await verifyRes.json();
      assert.equal(verifyJson.status, 'pending');
      assert.equal(verifyJson.data.paymentStatus, 'pending');

      // Verify order status in database is PENDING (not activated)
      const orderSnap = await orderRepository.findById(ws1, orderId);
      assert.equal(orderSnap?.status, 'PENDING');
    });

    // =========================================================================
    // 8. MULTI-TENANT WORKSPACE ISOLATION
    // =========================================================================
    await t.test('8. Multi-tenant workspace isolation across orders and billing history', async () => {
      const ws1Order = `ord_iso_ws1_${Date.now()}`;
      const ws2Order = `ord_iso_ws2_${Date.now()}`;

      await orderRepository.create({
        orderId: ws1Order,
        workspaceId: ws1,
        type: 'subscription',
        itemReferenceId: 'professional',
        amount: 3538.82,
        baseAmount: 2999,
        taxAmount: 539.82,
        currency: 'INR',
        status: 'PAID',
        paymentSessionId: 'sess_ws1',
        checkoutUrl: 'url1',
        customerEmail: 'ws1@test.com',
        customerName: 'WS1 User',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await orderRepository.create({
        orderId: ws2Order,
        workspaceId: ws2,
        type: 'subscription',
        itemReferenceId: 'scale',
        amount: 8258.82,
        baseAmount: 6999,
        taxAmount: 1259.82,
        currency: 'INR',
        status: 'PAID',
        paymentSessionId: 'sess_ws2',
        checkoutUrl: 'url2',
        customerEmail: 'ws2@test.com',
        customerName: 'WS2 User',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const ws1Orders = await orderRepository.listByWorkspace(ws1);
      const ws2Orders = await orderRepository.listByWorkspace(ws2);

      assert.ok(ws1Orders.some((o) => o.orderId === ws1Order));
      assert.ok(!ws1Orders.some((o) => o.orderId === ws2Order), 'Tenant 1 must not see Tenant 2 orders');

      assert.ok(ws2Orders.some((o) => o.orderId === ws2Order));
      assert.ok(!ws2Orders.some((o) => o.orderId === ws1Order), 'Tenant 2 must not see Tenant 1 orders');
    });
  } finally {
    server.close();
  }
});
