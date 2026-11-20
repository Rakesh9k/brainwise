/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from '../db/firestore';
import type { InvoiceRecord, PaymentRecord } from './types';
import { getCreditPack, GST_RATE } from './pricingConfig';
import { billingManager } from './billingManager';
import { creditEngine } from './creditEngine';
import { invoiceService } from './invoiceService';

export class CreditPackService {
  public async createPackOrder(params: {
    workspaceId: string;
    packId: string;
    customerEmail: string;
    customerName: string;
    customerPhone?: string;
    customerGstin?: string;
    returnUrl: string;
  }): Promise<{
    paymentSessionId: string;
    checkoutUrl: string;
    orderId: string;
    paymentId: string;
    totalAmount: number;
  }> {
    const {
      workspaceId,
      packId,
      customerEmail,
      customerName,
      customerPhone,
      customerGstin,
      returnUrl,
    } = params;

    const pack = getCreditPack(packId);
    const baseAmount = pack.price;
    const taxAmount = Number((baseAmount * GST_RATE).toFixed(2));
    const totalAmount = Number((baseAmount + taxAmount).toFixed(2));

    const orderId = `order_pack_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const provider = billingManager.getProvider();
    const session = await provider.createCheckoutSession({
      orderId,
      orderAmount: totalAmount,
      orderCurrency: pack.currency,
      customerEmail,
      customerPhone,
      customerName,
      returnUrl,
      metadata: {
        workspaceId,
        packId,
        creditQuantity: pack.creditQuantity,
      },
    });

    const now = new Date().toISOString();
    const paymentRecord: PaymentRecord = {
      paymentId,
      orderId,
      workspaceId,
      amount: totalAmount,
      currency: pack.currency,
      baseAmount,
      taxAmount,
      taxRate: GST_RATE,
      status: 'created',
      type: 'credit_pack',
      itemReferenceId: packId,
      providerName: 'cashfree',
      customerEmail,
      customerPhone,
      customerGstin,
      createdAt: now,
    };

    await db
      .doc<PaymentRecord>(`workspaces/${workspaceId}/payments/${paymentId}`)
      .set(paymentRecord);

    return {
      paymentSessionId: session.paymentSessionId,
      checkoutUrl: session.checkoutUrl,
      orderId,
      paymentId,
      totalAmount,
    };
  }

  public async completePackPurchase(params: {
    workspaceId: string;
    orderId: string;
    customerBillingAddress?: string;
  }): Promise<{
    success: boolean;
    creditsGranted: number;
    availableBalance: number;
    invoice: InvoiceRecord;
    payment: PaymentRecord;
  }> {
    const { workspaceId, orderId, customerBillingAddress } = params;

    // Find payment record by orderId
    const paymentsSnap = await db
      .collection<PaymentRecord>(`workspaces/${workspaceId}/payments`)
      .where('orderId', '==', orderId)
      .limit(1)
      .get();

    if (paymentsSnap.empty) {
      throw new Error(`Order payment record not found: ${orderId}`);
    }

    const paymentDoc = paymentsSnap.docs[0];
    const payment = paymentDoc?.data();

    if (!payment) {
      throw new Error(`Payment data not found for order: ${orderId}`);
    }

    if (payment.status === 'successful') {
      // Idempotent return
      const account = await creditEngine.getAccount(workspaceId);
      const invoices = await invoiceService.listInvoices(workspaceId);
      const invoice = invoices.find((inv) => inv.paymentId === payment.paymentId)!;
      return {
        success: true,
        creditsGranted: 0,
        availableBalance: account.availableBalance,
        invoice,
        payment,
      };
    }

    const provider = billingManager.getProvider(payment.providerName);
    const verification = await provider.verifyPayment(orderId);

    if (!verification.isPaid) {
      payment.status = 'failed';
      await db
        .doc<PaymentRecord>(`workspaces/${workspaceId}/payments/${payment.paymentId}`)
        .set(payment);
      throw new Error(`Payment verification failed for order ${orderId}`);
    }

    const pack = getCreditPack(payment.itemReferenceId);
    const now = new Date().toISOString();

    payment.status = 'successful';
    payment.providerReference = verification.providerReference;
    payment.paymentMethod = verification.paymentMethod;
    payment.completedAt = now;
    await db
      .doc<PaymentRecord>(`workspaces/${workspaceId}/payments/${payment.paymentId}`)
      .set(payment);

    // Grant purchased credits (permanent rollover, never expires)
    const updatedAccount = await creditEngine.grantCredits({
      workspaceId,
      pool: 'purchased',
      amount: pack.creditQuantity,
      transactionType: 'PURCHASED_GRANT',
      paymentId: payment.paymentId,
      notes: `Credit pack purchase: ${pack.name} (+${pack.creditQuantity} credits)`,
    });

    // Generate GST Tax Invoice
    const invoice = await invoiceService.generateInvoice({
      payment,
      customerName: payment.customerEmail.split('@')[0],
      customerBillingAddress,
      customerGstin: payment.customerGstin,
    });

    return {
      success: true,
      creditsGranted: pack.creditQuantity,
      availableBalance: updatedAccount.availableBalance,
      invoice,
      payment,
    };
  }
}

export const creditPackService = new CreditPackService();
