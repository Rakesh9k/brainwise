/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getPlan,
  getCreditPack,
  getAllCreditPacks,
  calculatePlanAmount,
} from './billing/pricingConfig';
import { cashfreeProvider } from './billing/providers/cashfreeProvider';
import { billingManager } from './billing/billingManager';
import { creditEngine } from './billing/creditEngine';
import { subscriptionEngine } from './billing/subscriptionEngine';
import { entitlementEngine } from './billing/entitlementEngine';
import { creditPackService } from './billing/creditPackService';
import { invoiceService } from './billing/invoiceService';
import { refundService } from './billing/refundService';

// ============================================================================
// SUITE 1: PRICING CONFIGURATION & PLAN LIMITS
// ============================================================================
test('Phase 9 — Suite 1: Authoritative Commercial Plans & Pricing Configuration', () => {
  // 1. Free plan
  const free = getPlan('free');
  assert.equal(free.planId, 'free');
  assert.equal(free.pricing.INR.monthly, 0);
  assert.equal(free.limits.workspacesMax, 1);
  assert.equal(free.limits.monthlyCredits, 0);

  // 2. Starter plan (Exact prompt constraint: ₹2,763 / month)
  const starter = getPlan('starter');
  assert.equal(starter.planId, 'starter');
  assert.equal(starter.pricing.INR.monthly, 2763);
  assert.equal(starter.pricing.INR.annualMonthly, 2210);
  assert.equal(starter.pricing.INR.annualTotal, 26520);
  assert.equal(starter.limits.monthlyCredits, 800);
  assert.equal(starter.limits.competitorsMax, 5);

  // 3. Professional hero plan (Exact prompt constraint: ₹6,999 / month, Hero tier)
  const pro = getPlan('professional');
  assert.equal(pro.planId, 'professional');
  assert.equal(pro.pricing.INR.monthly, 6999);
  assert.equal(pro.pricing.INR.annualMonthly, 5599);
  assert.equal(pro.pricing.INR.annualTotal, 67188);
  assert.equal(pro.limits.monthlyCredits, 3000);
  assert.equal(pro.isPopular, true);
  assert.equal(pro.limits.priorityAiModels, true);
  assert.equal(pro.limits.exportPdfWhiteLabel, true);

  // 4. Business Enterprise plan
  const biz = getPlan('business');
  assert.equal(biz.planId, 'business');
  assert.equal(biz.pricing.INR.monthly, 16499);
  assert.equal(biz.pricing.INR.annualMonthly, 13199);
  assert.equal(biz.limits.monthlyCredits, 10000);
  assert.equal(biz.limits.workspacesMax, 10);

  // 5. Credit packs
  const packs = getAllCreditPacks();
  assert.equal(packs.length, 4);
  assert.equal(getCreditPack('pack_quick_500').creditQuantity, 500);
  assert.equal(getCreditPack('pack_quick_500').price, 1499);
  assert.equal(getCreditPack('pack_growth_1500').creditQuantity, 1500);
  assert.equal(getCreditPack('pack_growth_1500').price, 3999);
  assert.equal(getCreditPack('pack_growth_1500').isPopular, true);
  assert.equal(getCreditPack('pack_scale_5000').creditQuantity, 5000);
  assert.equal(getCreditPack('pack_scale_5000').price, 10999);
  assert.equal(getCreditPack('pack_enterprise_15000').creditQuantity, 15000);
  assert.equal(getCreditPack('pack_enterprise_15000').price, 27999);

  // 6. Annual 20% discount calculation helper
  const annualCalc = calculatePlanAmount('professional', 'annual', 'INR');
  assert.equal(annualCalc.unitAmount, 5599);
  assert.equal(annualCalc.totalAmount, 67188);

  const monthlyCalc = calculatePlanAmount('starter', 'monthly', 'INR');
  assert.equal(monthlyCalc.unitAmount, 2763);
  assert.equal(monthlyCalc.totalAmount, 2763);
});

// ============================================================================
// SUITE 2: BILLING PROVIDER ADAPTER & WEBHOOK SIGNATURE VERIFICATION
// ============================================================================
test('Phase 9 — Suite 2: Cashfree / Mitra Provider & Cryptographic Signatures', async () => {
  const provider = billingManager.getProvider('cashfree');
  assert.equal(provider.id, 'cashfree');
  assert.ok(provider.name.includes('Cashfree'));

  // 1. Checkout session creation
  const orderId = `test_ord_${Date.now()}`;
  const session = await provider.createCheckoutSession({
    orderId,
    orderAmount: 3260.34,
    orderCurrency: 'INR',
    customerEmail: 'test_founder@example.com',
    customerName: 'Aarav Patel',
    returnUrl: 'https://app.brainwise.com/settings/billing',
  });

  assert.ok(session.paymentSessionId.startsWith('session_'));
  assert.ok(session.checkoutUrl.includes(session.paymentSessionId));
  assert.equal(session.orderId, orderId);

  // 2. Payment verification
  const verification = await provider.verifyPayment(orderId);
  assert.equal(verification.isPaid, true);
  assert.equal(verification.paymentStatus, 'successful');
  assert.equal(verification.paymentMethod, 'UPI');

  // 3. HMAC-SHA256 signature generation and verification
  const payload = JSON.stringify({ type: 'PAYMENT_SUCCESS', order_id: orderId, amount: 3260.34 });
  const timestamp = '1771578000';
  const validSignature = cashfreeProvider.generateWebhookSignature(payload, timestamp);

  assert.equal(provider.verifyWebhookSignature(payload, validSignature, timestamp), true);

  // 4. Reject tampered signature
  const tamperedSignature = 'invalidsignaturebase64==';
  assert.equal(provider.verifyWebhookSignature(payload, tamperedSignature, timestamp), false);

  // 5. Reject tampered payload
  const tamperedPayload = JSON.stringify({
    type: 'PAYMENT_SUCCESS',
    order_id: orderId,
    amount: 0.01,
  });
  assert.equal(provider.verifyWebhookSignature(tamperedPayload, validSignature, timestamp), false);
});

// ============================================================================
// SUITE 3: MULTI-POOL CREDIT ECONOMY & PRIORITY CONSUMPTION
// ============================================================================
test('Phase 9 — Suite 3: Multi-Pool Credit Wallet, Priority Ordering & Reservation Locks', async () => {
  const workspaceId = `ws_credit_test_${Date.now()}`;

  // 1. Initialize account: 150 welcome credits
  const initial = await creditEngine.initializeAccount(workspaceId, 150);
  assert.equal(initial.availableBalance, 150);
  assert.equal(initial.pools.welcome, 150);
  assert.equal(initial.pools.subscription, 0);
  assert.equal(initial.pools.purchased, 0);

  // 2. Grant subscription credits (+800) and promotional credits (+200)
  await creditEngine.grantCredits({
    workspaceId,
    pool: 'subscription',
    amount: 800,
    transactionType: 'SUBSCRIPTION_GRANT',
    notes: 'Monthly Starter plan credit allowance',
  });

  await creditEngine.grantCredits({
    workspaceId,
    pool: 'promotional',
    amount: 200,
    transactionType: 'PROMOTIONAL_GRANT',
    notes: 'Launch promo bonus',
  });

  // Total balance: 150 + 800 + 200 = 1,150
  let account = await creditEngine.getAccount(workspaceId);
  assert.equal(account.availableBalance, 1150);
  assert.equal(account.pools.promotional, 200);
  assert.equal(account.pools.subscription, 800);
  assert.equal(account.pools.welcome, 150);

  // 3. Atomic Reservation Lock (Hold 300 credits)
  const reservation = await creditEngine.holdCredits({
    workspaceId,
    featureId: 'FEAT-RES-001',
    amount: 300,
  });

  assert.equal(reservation.status, 'PENDING');
  assert.equal(reservation.amount, 300);

  account = await creditEngine.getAccount(workspaceId);
  assert.equal(account.reservedCredits, 300);
  assert.equal(account.availableBalance, 850); // 1,150 - 300

  // 4. Commit Settlement with Priority Consumption:
  // Required 300 credits: consumes 200 promotional (expiring soonest) + 100 subscription.
  // Welcome (150) and Purchased (0) must remain completely untouched!
  const commitResult = await creditEngine.commitCredits({
    workspaceId,
    reservationId: reservation.reservationId,
    featureId: 'FEAT-RES-001',
    notes: 'Market Dossier generation',
  });

  assert.equal(commitResult.remainingBalance, 850);
  account = await creditEngine.getAccount(workspaceId);
  assert.equal(account.reservedCredits, 0);
  assert.equal(account.pools.promotional, 0); // fully consumed
  assert.equal(account.pools.subscription, 700); // 800 - 100 = 700
  assert.equal(account.pools.welcome, 150); // untouched

  // 5. Test Two-Phase Rollback (Release Reservation Lock)
  const res2 = await creditEngine.holdCredits({
    workspaceId,
    featureId: 'FEAT-BRD-001',
    amount: 50,
  });

  account = await creditEngine.getAccount(workspaceId);
  assert.equal(account.reservedCredits, 50);
  assert.equal(account.availableBalance, 800);

  // Simulated AI error / Truth Check rejection -> release reservation with 0 net loss
  const releaseResult = await creditEngine.releaseCredits({
    workspaceId,
    reservationId: res2.reservationId,
    reason: 'Upstream AI validation rejected forbidden claim',
  });

  assert.equal(releaseResult.availableBalance, 850);
  account = await creditEngine.getAccount(workspaceId);
  assert.equal(account.reservedCredits, 0);
  assert.equal(account.availableBalance, 850);

  // 6. Insufficient credits rejection
  await assert.rejects(
    async () => {
      await creditEngine.holdCredits({
        workspaceId,
        featureId: 'FEAT-EXP-SCALE',
        amount: 99999,
      });
    },
    { message: /INSUFFICIENT_CREDITS/ }
  );
});

// ============================================================================
// SUITE 4: SUBSCRIPTION LIFECYCLE MANAGEMENT ENGINE
// ============================================================================
test('Phase 9 — Suite 4: Subscription Activation, Renewal, Upgrade & Cancellation', async () => {
  const workspaceId = `ws_sub_test_${Date.now()}`;

  // 1. Initial state defaults to active Free plan
  const subInitial = await subscriptionEngine.getSubscription(workspaceId);
  assert.equal(subInitial.planId, 'free');
  assert.equal(subInitial.status, 'active');

  // 2. Activate Starter Plan (₹2,763/mo)
  const subStarter = await subscriptionEngine.activateSubscription({
    workspaceId,
    planId: 'starter',
    billingCycle: 'monthly',
    currency: 'INR',
    paymentMethod: 'UPI',
  });

  assert.equal(subStarter.planId, 'starter');
  assert.equal(subStarter.unitAmount, 2763);
  assert.equal(subStarter.status, 'active');
  assert.equal(subStarter.cancelAtPeriodEnd, false);

  // Check 800 monthly credits granted to subscription pool
  let account = await creditEngine.getAccount(workspaceId);
  assert.equal(account.pools.subscription, 800);

  // 3. Renew Subscription (Advances period and refreshes allowance)
  const subRenewed = await subscriptionEngine.renewSubscription(workspaceId);
  assert.equal(subRenewed.status, 'active');
  account = await creditEngine.getAccount(workspaceId);
  assert.equal(account.pools.subscription, 1600); // 800 initial + 800 renewal

  // 4. Upgrade to Professional Hero Tier (₹6,999/mo)
  const upgradeResult = await subscriptionEngine.upgradeSubscription({
    workspaceId,
    newPlanId: 'professional',
    billingCycle: 'annual',
  });

  assert.equal(upgradeResult.subscription.planId, 'professional');
  assert.equal(upgradeResult.subscription.unitAmount, 5599); // annual equivalent
  assert.equal(upgradeResult.proratedCreditsGranted, 2200); // 3,000 - 800 delta

  // 5. Schedule Downgrade / Cancellation at period end
  const subCancelled = await subscriptionEngine.scheduleDowngrade({
    workspaceId,
    targetPlanId: 'starter',
  });
  assert.equal(subCancelled.cancelAtPeriodEnd, true);
  assert.equal(subCancelled.status, 'cancellation_scheduled');

  // 6. Reactivate Subscription
  const subReactivated = await subscriptionEngine.reactivateSubscription(workspaceId);
  assert.equal(subReactivated.status, 'active');
  assert.equal(subReactivated.cancelAtPeriodEnd, false);
});

// ============================================================================
// SUITE 5: CENTRALIZED FEATURE ENTITLEMENTS & BARRIERS
// ============================================================================
test('Phase 9 — Suite 5: Centralized Feature Barriers & Plan Entitlement Checks', async () => {
  const workspaceId = `ws_entitle_test_${Date.now()}`;

  // 1. In Free plan: priority models and white-label PDF are restricted
  await subscriptionEngine.createDefaultFreeSubscription(workspaceId);

  const modelCheck = await entitlementEngine.checkEntitlement(workspaceId, 'priorityAiModels');
  assert.equal(modelCheck.allowed, false);
  assert.equal(modelCheck.upgradeRequired, true);

  const pdfCheck = await entitlementEngine.checkEntitlement(workspaceId, 'exportPdfWhiteLabel');
  assert.equal(pdfCheck.allowed, false);

  // Free plan competitor limit: 2
  const compWithin = await entitlementEngine.checkEntitlement(workspaceId, 'competitorsMax', 1);
  assert.equal(compWithin.allowed, true);

  const compExceeded = await entitlementEngine.checkEntitlement(workspaceId, 'competitorsMax', 2);
  assert.equal(compExceeded.allowed, false);
  assert.equal(compExceeded.upgradeRequired, true);

  // 2. Upgrade to Professional hero tier: unlocks priority models, white-label PDF, 20 competitors
  await subscriptionEngine.activateSubscription({
    workspaceId,
    planId: 'professional',
    billingCycle: 'monthly',
    currency: 'INR',
  });

  const proModelCheck = await entitlementEngine.checkEntitlement(workspaceId, 'priorityAiModels');
  assert.equal(proModelCheck.allowed, true);

  const proPdfCheck = await entitlementEngine.checkEntitlement(workspaceId, 'exportPdfWhiteLabel');
  assert.equal(proPdfCheck.allowed, true);

  const proCompCheck = await entitlementEngine.checkEntitlement(workspaceId, 'competitorsMax', 19);
  assert.equal(proCompCheck.allowed, true);
});

// ============================================================================
// SUITE 6: CREDIT PACK PURCHASING & PERMANENT ROLLOVER
// ============================================================================
test('Phase 9 — Suite 6: Credit Pack Order Creation, Fulfillment & Permanent Rollover', async () => {
  const workspaceId = `ws_pack_test_${Date.now()}`;
  await creditEngine.initializeAccount(workspaceId, 0);

  // 1. Order Growth Pack (1,500 credits @ ₹3,999)
  const orderRes = await creditPackService.createPackOrder({
    workspaceId,
    packId: 'pack_growth_1500',
    customerEmail: 'founder@solsticecoffee.com',
    customerName: 'Ananya Sharma',
    customerGstin: '29ABCDE1234F1Z5',
    returnUrl: 'https://app.brainwise.com/settings/billing',
  });

  assert.ok(orderRes.orderId.startsWith('order_pack_'));
  assert.ok(orderRes.totalAmount > 3999); // ₹3,999 + 18% GST = ₹4,718.82

  // 2. Complete purchase (Simulate payment gateway return)
  const completeRes = await creditPackService.completePackPurchase({
    workspaceId,
    orderId: orderRes.orderId,
    customerBillingAddress: 'Bengaluru, Karnataka',
  });

  assert.equal(completeRes.success, true);
  assert.equal(completeRes.creditsGranted, 1500);
  assert.equal(completeRes.payment.status, 'successful');

  // Verify credits are placed strictly in the 'purchased' pool (permanent rollover)
  const account = await creditEngine.getAccount(workspaceId);
  assert.equal(account.pools.purchased, 1500);
  assert.equal(account.availableBalance, 1500);

  // 3. Tax Invoice emitted with GST breakdown
  assert.ok(completeRes.invoice.invoiceNumber.startsWith('INV-'));
  assert.equal(completeRes.invoice.status, 'paid');
  assert.equal(completeRes.invoice.taxes.length, 2); // CGST + SGST for Karnataka
});

// ============================================================================
// SUITE 7: GST INVOICING, TAXES & RECEIPT GENERATION
// ============================================================================
test('Phase 9 — Suite 7: GST Tax Invoices, Sequential Numbering & HTML Receipt Rendering', async () => {
  const workspaceId = `ws_inv_test_${Date.now()}`;

  const payment = {
    paymentId: `pay_${Date.now()}`,
    orderId: `ord_${Date.now()}`,
    workspaceId,
    amount: 3260.34,
    currency: 'INR' as const,
    baseAmount: 2763.0,
    taxAmount: 497.34,
    taxRate: 0.18,
    status: 'successful' as const,
    type: 'subscription' as const,
    itemReferenceId: 'starter',
    providerName: 'cashfree' as const,
    customerEmail: 'billing@artisanroasters.in',
    customerGstin: '29AABCB1234P1Z2',
    createdAt: new Date().toISOString(),
  };

  // 1. Generate Invoice (Karnataka intra-state: CGST 9% + SGST 9%)
  const invoice = await invoiceService.generateInvoice({
    payment,
    customerName: 'Artisan Roasters Pvt. Ltd.',
    customerBillingAddress: 'Whitefield, Bengaluru, KA',
    customerGstin: '29AABCB1234P1Z2',
  });

  assert.ok(invoice.invoiceNumber.startsWith('INV-'));
  assert.equal(invoice.totalAmount, 3260.34);
  assert.equal(
    invoice.taxes.some((t) => t.type === 'CGST'),
    true
  );
  assert.equal(
    invoice.taxes.some((t) => t.type === 'SGST'),
    true
  );

  // 2. Inter-state IGST calculation (e.g. Maharashtra customer GSTIN starting with '27')
  const interStatePayment = { ...payment, paymentId: `pay_inter_${Date.now()}` };
  const igstInvoice = await invoiceService.generateInvoice({
    payment: interStatePayment,
    customerName: 'Mumbai Digital Ventures',
    customerGstin: '27AABCM5678Q1Z3',
    isInterstate: true,
  });

  assert.equal(igstInvoice.taxes.length, 1);
  assert.equal(igstInvoice.taxes[0].type, 'IGST');
  assert.equal(igstInvoice.taxes[0].rate, 0.18);

  // 3. Render printable HTML receipt
  const html = invoiceService.renderInvoiceHtml(invoice);
  assert.ok(html.includes('TAX INVOICE'));
  assert.ok(html.includes(invoice.invoiceNumber));
  assert.ok(html.includes('BrainWise SaaS Technologies'));
  assert.ok(html.includes('29AAAAA0000A1Z5'));
});

// ============================================================================
// SUITE 8: REFUND SERVICE & COMPENSATING CREDIT REVERSAL
// ============================================================================
test('Phase 9 — Suite 8: Gateway Refund Processing & Automatic Credit Clawback', async () => {
  const workspaceId = `ws_refund_test_${Date.now()}`;
  await creditEngine.initializeAccount(workspaceId, 0);

  // 1. Purchase a pack
  const orderRes = await creditPackService.createPackOrder({
    workspaceId,
    packId: 'pack_quick_500',
    customerEmail: 'refund_test@example.com',
    customerName: 'Test Refund User',
    returnUrl: 'https://app.brainwise.com/settings/billing',
  });

  const completeRes = await creditPackService.completePackPurchase({
    workspaceId,
    orderId: orderRes.orderId,
  });

  let account = await creditEngine.getAccount(workspaceId);
  assert.equal(account.availableBalance, 500);

  // 2. Process Refund
  const refund = await refundService.processRefund({
    workspaceId,
    paymentId: completeRes.payment.paymentId,
    reason: 'Customer accidental double charge',
    approvedBy: 'compliance_officer_1',
  });

  assert.equal(refund.status, 'successful');
  assert.equal(refund.amount, completeRes.payment.amount);
  assert.ok(refund.creditsReversed && refund.creditsReversed > 0);

  // Verify credit clawback
  account = await creditEngine.getAccount(workspaceId);
  assert.equal(account.availableBalance, 0);
});

// ============================================================================
// SUITE 9: ADMINISTRATIVE BILLING CONTROLS & LEDGER RECONCILIATION
// ============================================================================
test('Phase 9 — Suite 9: Admin Credit Adjustments & Ledger Balance Reconciliation', async () => {
  const workspaceId = `ws_admin_test_${Date.now()}`;
  await creditEngine.initializeAccount(workspaceId, 150);

  // 1. Admin credit adjustment with mandatory audit reason
  const updatedAccount = await creditEngine.adjustCredits({
    workspaceId,
    amount: 500,
    reason: 'Customer goodwill compensation for incident INC-492',
    adminUserId: 'admin_security_lead',
  });

  assert.equal(updatedAccount.availableBalance, 650);

  // 2. Reject adjustment missing mandatory reason
  await assert.rejects(
    async () => {
      await creditEngine.adjustCredits({
        workspaceId,
        amount: 100,
        reason: '',
        adminUserId: 'admin_security_lead',
      });
    },
    { message: /Mandatory administrative reason/ }
  );

  // 3. Reconciliation verification (sum of ledger entries strictly equals wallet balance)
  const reconciliation = await creditEngine.reconcile(workspaceId);
  assert.equal(reconciliation.isBalanced, true);
  assert.equal(reconciliation.difference, 0);
  assert.equal(reconciliation.recordedBalance, 650);
});

// ============================================================================
// SUITE 10: MULTI-TENANT WORKSPACE BILLING ISOLATION
// ============================================================================
test('Phase 9 — Suite 10: Multi-Tenant Workspace Billing Security Isolation', async () => {
  const wsTenantA = `ws_tenant_a_${Date.now()}`;
  const wsTenantB = `ws_tenant_b_${Date.now()}`;

  // Tenant A: starter plan with 800 credits
  await creditEngine.initializeAccount(wsTenantA, 150);
  await subscriptionEngine.activateSubscription({
    workspaceId: wsTenantA,
    planId: 'starter',
    billingCycle: 'monthly',
    currency: 'INR',
  });

  // Tenant B: free plan with 150 credits
  await creditEngine.initializeAccount(wsTenantB, 150);
  await subscriptionEngine.createDefaultFreeSubscription(wsTenantB);

  // Invoices for Tenant A
  await invoiceService.generateInvoice({
    payment: {
      paymentId: `pay_a_${Date.now()}`,
      orderId: `ord_a_${Date.now()}`,
      workspaceId: wsTenantA,
      amount: 3260.34,
      currency: 'INR',
      baseAmount: 2763.0,
      taxAmount: 497.34,
      taxRate: 0.18,
      status: 'successful',
      type: 'subscription',
      itemReferenceId: 'starter',
      providerName: 'cashfree',
      customerEmail: 'tenant_a@example.com',
      createdAt: new Date().toISOString(),
    },
    customerName: 'Tenant A Roastery',
  });

  // Verify Tenant A records
  const accountA = await creditEngine.getAccount(wsTenantA);
  const subA = await subscriptionEngine.getSubscription(wsTenantA);
  const invoicesA = await invoiceService.listInvoices(wsTenantA);

  assert.equal(accountA.availableBalance, 950); // 150 + 800
  assert.equal(subA.planId, 'starter');
  assert.equal(invoicesA.length, 1);

  // Verify Tenant B cannot access or see Tenant A records
  const accountB = await creditEngine.getAccount(wsTenantB);
  const subB = await subscriptionEngine.getSubscription(wsTenantB);
  const invoicesB = await invoiceService.listInvoices(wsTenantB);

  assert.equal(accountB.availableBalance, 150);
  assert.equal(subB.planId, 'free');
  assert.equal(invoicesB.length, 0); // Tenant B has zero invoices from Tenant A
});
