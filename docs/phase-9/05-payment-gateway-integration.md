# BrainWise Commercial Infrastructure — Payment Gateway Integration

**Document ID:** BW-DOC-P9-005  
**Status:** Approved & Implemented  
**Date:** 2026-11-20  
**Phase:** 9 (Commercial Infrastructure)  

---

## 1. Provider Adapter Architecture (`IBillingProvider`)

BrainWise decouples billing orchestration from specific payment providers via the `IBillingProvider` contract:

```typescript
export interface IBillingProvider {
  readonly id: string;
  readonly name: string;
  createCheckoutSession(params: CheckoutParams): Promise<CheckoutResult>;
  verifyPayment(orderId: string): Promise<PaymentVerificationResult>;
  verifyWebhookSignature(payload: string, signature: string, timestamp?: string): boolean;
  processRefund(params: RefundParams): Promise<RefundResult>;
}
```

---

## 2. Cashfree & Mitra Implementation (`CashfreeProvider`)

1. **Checkout Flow:**
   - Client requests `POST /api/v1/workspaces/:workspaceId/billing/checkout` with `planId` or `packId`.
   - `CashfreeProvider.createCheckoutSession()` generates order session ID and returns checkout URL.
   - For sandboxing and unit testing, an internal in-memory store records orders and returns immediate payment verification tokens.
2. **Cryptographic Security:**
   - Signatures are generated using authenticated HMAC-SHA256 (`crypto.createHmac('sha256', secretKey)`).
   - Time-safe comparison (`crypto.timingSafeEqual`) prevents timing attacks.
   - Webhook timestamp validation prevents replay attacks older than 15 minutes.
3. **Refund Processing:**
   - `CashfreeProvider.processRefund()` executes refund against gateway orders.
   - Updates order status to `refunded` or `partially_refunded`.
