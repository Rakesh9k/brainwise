# BrainWise Commercial Infrastructure — Invoicing, Taxes & Refunds

**Document ID:** BW-DOC-P9-009  
**Status:** Approved & Implemented  
**Date:** 2026-11-20  
**Phase:** 9 (Commercial Infrastructure)  

---

## 1. GST Compliance & Tax Calculation Engine

BrainWise invoices comply with Indian Goods and Services Tax (GST) regulations:

1. **Standard Tax Rate:** 18% GST.
2. **Intra-State Supplies (Karnataka to Karnataka):**
   - Central GST (CGST): 9%
   - State GST (SGST): 9%
3. **Inter-State Supplies (Karnataka to other Indian states or export):**
   - Integrated GST (IGST): 18%
4. **GSTIN Capture:**
   - Invoices capture customer GSTIN for B2B input tax credit (ITC) claims.
   - If no GSTIN is provided, categorized as B2C Consumer supply.

---

## 2. Sequential Invoice Numbering

Invoices are assigned non-repeating, sequential numbers via an atomic transaction on `system/invoice_counter`:
- Format: `INV-{YEAR}-{COUNTER:04d}` (e.g. `INV-2026-1001`).

---

## 3. Printable HTML & PDF Receipts

`invoiceService.renderInvoiceHtml()` renders an invoice layout including seller details, GSTIN, PAN, customer particulars, itemized line items, tax breakdown, and total paid amount. Available via `GET /api/v1/workspaces/:workspaceId/billing/invoices/:invoiceId/download`.

---

## 4. Refund Service & Credit Clawback (`RefundService`)

1. **Gateway Refund:** Dispatches refund instruction to payment gateway (`IBillingProvider.processRefund`).
2. **Status Mutation:** Updates payment record status to `refunded` or `partially_refunded`.
3. **Compensating Credit Deduction:**
   - If refunded transaction was a credit pack purchase, `creditEngine.adjustCredits()` clawbacks granted credits from the workspace wallet.
   - Records audit trail with authorizing supervisor / admin ID.
