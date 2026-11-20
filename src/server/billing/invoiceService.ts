/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from '../db/firestore';
import type { InvoiceRecord, PaymentRecord, TaxLineItem } from './types';
import { GST_RATE } from './pricingConfig';

export class InvoiceService {
  private readonly defaultSeller = {
    name: 'BrainWise SaaS Technologies Pvt. Ltd.',
    address: 'Indiranagar, 100ft Road, Bengaluru, Karnataka, India - 560038',
    gstin: '29AAAAA0000A1Z5',
    pan: 'AAAAA0000A',
  };

  public async generateInvoice(params: {
    payment: PaymentRecord;
    customerName: string;
    customerBillingAddress?: string;
    customerGstin?: string;
    isInterstate?: boolean;
  }): Promise<InvoiceRecord> {
    const { payment, customerName, customerBillingAddress, customerGstin, isInterstate } = params;

    const invoiceNumber = await this.getNextInvoiceNumber();
    const invoiceId = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Tax breakdown
    const taxAmount = payment.taxAmount;
    const taxes: TaxLineItem[] = [];

    if (isInterstate || (customerGstin && !customerGstin.startsWith('29'))) {
      taxes.push({
        type: 'IGST',
        rate: GST_RATE,
        amount: taxAmount,
      });
    } else {
      const halfRate = GST_RATE / 2;
      const halfAmount = Number((taxAmount / 2).toFixed(2));
      taxes.push(
        { type: 'CGST', rate: halfRate, amount: halfAmount },
        { type: 'SGST', rate: halfRate, amount: Number((taxAmount - halfAmount).toFixed(2)) }
      );
    }

    const itemDescription =
      payment.type === 'subscription'
        ? `BrainWise Subscription Plan (${payment.itemReferenceId.toUpperCase()})`
        : `BrainWise AI Credit Pack Top-Up (${payment.itemReferenceId})`;

    const invoice: InvoiceRecord = {
      invoiceId,
      invoiceNumber,
      workspaceId: payment.workspaceId,
      paymentId: payment.paymentId,
      customerName,
      customerEmail: payment.customerEmail,
      customerBillingAddress,
      customerGstin: customerGstin || payment.customerGstin,
      sellerDetails: this.defaultSeller,
      lineItems: [
        {
          description: itemDescription,
          quantity: 1,
          unitPrice: payment.baseAmount,
          amount: payment.baseAmount,
        },
      ],
      subtotal: payment.baseAmount,
      taxes,
      totalAmount: payment.amount,
      currency: payment.currency,
      paidAt: payment.completedAt || new Date().toISOString(),
      downloadUrl: `/api/v1/workspaces/${payment.workspaceId}/invoices/${invoiceId}/download`,
      status: 'paid',
    };

    await db
      .doc<InvoiceRecord>(`workspaces/${payment.workspaceId}/invoices/${invoiceId}`)
      .set(invoice);

    return invoice;
  }

  public async getInvoice(workspaceId: string, invoiceId: string): Promise<InvoiceRecord | null> {
    const snap = await db
      .doc<InvoiceRecord>(`workspaces/${workspaceId}/invoices/${invoiceId}`)
      .get();
    return snap.exists && snap.data() ? snap.data()! : null;
  }

  public async listInvoices(workspaceId: string): Promise<InvoiceRecord[]> {
    const snap = await db.collection<InvoiceRecord>(`workspaces/${workspaceId}/invoices`).get();
    return snap.docs
      .map((d) => d.data())
      .filter((d): d is InvoiceRecord => Boolean(d))
      .sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime());
  }

  public renderInvoiceHtml(invoice: InvoiceRecord): string {
    const taxRows = invoice.taxes
      .map(
        (t) => `
      <tr>
        <td style="padding: 8px 0; color: #555;">${t.type} (${(t.rate * 100).toFixed(0)}%):</td>
        <td style="padding: 8px 0; text-align: right; font-family: monospace;">${invoice.currency === 'INR' ? '₹' : '$'}${t.amount.toLocaleString()}</td>
      </tr>
    `
      )
      .join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Tax Invoice ${invoice.invoiceNumber}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; margin: 40px; color: #171717; line-height: 1.5; }
    .header { border-bottom: 2px solid #FF7417; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; }
    .title { font-size: 24px; font-weight: bold; color: #171717; }
    .inv-num { font-size: 14px; color: #666; font-family: monospace; }
    .parties { display: flex; justify-content: space-between; margin-bottom: 30px; }
    .table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    .table th { background: #F5F5F4; text-align: left; padding: 12px; border-bottom: 1px solid #E5E5E5; }
    .table td { padding: 12px; border-bottom: 1px solid #E5E5E5; }
    .totals { width: 300px; margin-left: auto; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="title">BRAINWISE</div>
      <div style="font-size: 12px; color: #666;">AI Business Management Platform</div>
    </div>
    <div style="text-align: right;">
      <div class="title" style="font-size: 20px;">TAX INVOICE</div>
      <div class="inv-num">${invoice.invoiceNumber}</div>
      <div style="font-size: 12px; color: #666;">Date: ${new Date(invoice.paidAt).toLocaleDateString()}</div>
    </div>
  </div>

  <div class="parties">
    <div>
      <strong>Sold By:</strong><br>
      ${invoice.sellerDetails.name}<br>
      ${invoice.sellerDetails.address}<br>
      GSTIN: ${invoice.sellerDetails.gstin} | PAN: ${invoice.sellerDetails.pan}
    </div>
    <div style="text-align: right;">
      <strong>Billed To:</strong><br>
      ${invoice.customerName}<br>
      ${invoice.customerEmail}<br>
      ${invoice.customerBillingAddress || 'Address on file'}<br>
      ${invoice.customerGstin ? `Customer GSTIN: ${invoice.customerGstin}` : 'Consumer / B2C'}
    </div>
  </div>

  <table class="table">
    <thead>
      <tr>
        <th>Description</th>
        <th style="text-align: center;">Qty</th>
        <th style="text-align: right;">Unit Price</th>
        <th style="text-align: right;">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${invoice.lineItems
        .map(
          (item) => `
        <tr>
          <td>${item.description}</td>
          <td style="text-align: center;">${item.quantity}</td>
          <td style="text-align: right; font-family: monospace;">${invoice.currency === 'INR' ? '₹' : '$'}${item.unitPrice.toLocaleString()}</td>
          <td style="text-align: right; font-family: monospace;">${invoice.currency === 'INR' ? '₹' : '$'}${item.amount.toLocaleString()}</td>
        </tr>
      `
        )
        .join('')}
    </tbody>
  </table>

  <div class="totals">
    <table style="width: 100%;">
      <tr>
        <td style="padding: 8px 0; color: #555;">Subtotal:</td>
        <td style="padding: 8px 0; text-align: right; font-family: monospace;">${invoice.currency === 'INR' ? '₹' : '$'}${invoice.subtotal.toLocaleString()}</td>
      </tr>
      ${taxRows}
      <tr style="border-top: 2px solid #171717; font-weight: bold; font-size: 16px;">
        <td style="padding: 12px 0;">Total Paid:</td>
        <td style="padding: 12px 0; text-align: right; font-family: monospace;">${invoice.currency === 'INR' ? '₹' : '$'}${invoice.totalAmount.toLocaleString()}</td>
      </tr>
    </table>
  </div>

  <div style="margin-top: 50px; font-size: 11px; color: #888; text-align: center; border-top: 1px solid #EEE; padding-top: 15px;">
    This is an electronically generated tax invoice compliant with Indian GST laws. No physical signature is required.
  </div>
</body>
</html>`;
  }

  private async getNextInvoiceNumber(): Promise<string> {
    const counterRef = db.doc<{ counter: number }>('system/invoice_counter');
    return await db.runTransaction(async (t) => {
      const snap = await t.get(counterRef);
      const current = snap.exists && snap.data() ? snap.data()!.counter : 1000;
      const next = current + 1;
      t.set(counterRef, { counter: next });
      const year = new Date().getFullYear();
      return `INV-${year}-${next.toString().padStart(4, '0')}`;
    });
  }
}

export const invoiceService = new InvoiceService();
