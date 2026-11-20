# BrainWise Commercial Infrastructure — Administrative Billing Controls

**Document ID:** BW-DOC-P9-011  
**Status:** Approved & Implemented  
**Date:** 2026-11-20  
**Phase:** 9 (Commercial Infrastructure)  

---

## 1. Administrative Endpoints (`adminBillingRouter`)

BrainWise provides operational and financial support controls under `/api/v1/admin/billing`:

### 1.1 Manual Credit Adjustment
- **Endpoint:** `POST /api/v1/admin/billing/adjust-credits`
- **Payload:** `{ workspaceId: string, amount: number, reason: string, adminUserId?: string }`
- **Security Rule:** Mandatory reason (minimum 5 characters) is required. Adjustments are permanently audited in the ledger with `type: 'ADJUSTMENT_GRANT'` and the admin's user ID.

### 1.2 Administrative Refund Processing
- **Endpoint:** `POST /api/v1/admin/billing/refund`
- **Payload:** `{ workspaceId: string, paymentId: string, refundAmount?: number, reason: string, approvedBy?: string }`
- **Function:** Issues gateway refund and initiates credit clawback if applicable.

### 1.3 Ledger Reconciliation
- **Endpoint:** `GET /api/v1/admin/billing/reconcile/:workspaceId`
- **Function:** Verifies mathematical integrity between the sum of ledger entries and current wallet balance. Emits `{ isBalanced: boolean, computedBalance: number, recordedBalance: number, difference: number }`.
