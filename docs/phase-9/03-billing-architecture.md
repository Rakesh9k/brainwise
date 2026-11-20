# BrainWise Commercial Infrastructure — Architecture Specification

**Document ID:** BW-DOC-P9-003  
**Status:** Approved & Implemented  
**Date:** 2026-11-20  
**Phase:** 9 (Commercial Infrastructure)  

---

## 1. High-Level Architecture Overview

Phase 9 transforms BrainWise from an internal business operating platform into a production-grade commercial SaaS platform. The commercial infrastructure coordinates payment gateways, recurring subscriptions, an atomic multi-pool credit economy, centralized feature barriers, automated GST tax invoicing, and dispute/refund workflows.

```
+-----------------------------------------------------------------------------------+
|                              BRAINWISE CLIENT (React 19)                         |
|   +--------------------------+  +------------------------+  +-------------------+ |
|   | BillingDashboardView.tsx |  | PlanSwitcher / Hero Pro|  | MultiPoolWalletUI | |
|   +--------------------------+  +------------------------+  +-------------------+ |
+------------------------------------------+----------------------------------------+
                                           | HTTPS / REST
                                           v
+-----------------------------------------------------------------------------------+
|                             BACKEND API ROUTER (/api/v1)                          |
|   +-------------------+  +-----------------------+  +---------------------------+ |
|   |   billingRoutes   |  |  billingWebhookRoutes |  |    adminBillingRouter     | |
|   +-------------------+  +-----------------------+  +---------------------------+ |
+-------+-----------------------------+-----------------------------+---------------+
        |                             |                             |
        v                             v                             v
+------------------+        +-------------------+         +-------------------+
|  BillingManager  |        | SubscriptionEngine|         |   CreditEngine    |
|  - Cashfree /    |        | - Lifecycle       |         | - Multi-Pool      |
|    Mitra Gateway |        | - Proration       |         | - Priority Deduct |
|  - HMAC Sign     |        | - Auto-Renewals   |         | - 2-Phase Locks   |
+-------+----------+        +---------+---------+         +---------+---------+
        |                             |                             |
        +-----------------------------+-----------------------------+
                                      |
        +-----------------------------+-----------------------------+
        |                             |                             |
        v                             v                             v
+------------------+        +-------------------+         +-------------------+
| EntitlementEngine|        |  InvoiceService   |         |   RefundService   |
| - Limit Checks   |        | - 18% GST Engine  |         | - Gateway Refund  |
| - Feature Gating |        | - Sequential INVs |         | - Credit Clawback |
+------------------+        +-------------------+         +-------------------+
```

---

## 2. Architectural Principles & Invariants

1. **Strict Video Exclusion:** Zero video generation, video rendering, or video credit consumption exists in BrainWise.
2. **Two-Phase Reservation Protocol (ADR-006):** No AI generation can consume credits directly. A reservation lock (`holdCredits`) is atomically acquired. Only on successful generation and Truth Check clearance is the reservation committed (`commitCredits`). On failure or forbidden claim rejection, the lock is automatically released (`releaseCredits`) with zero net balance change.
3. **Multi-Pool Consumption Priority:**
   - Priority 1: `promotional` pool (expires soonest).
   - Priority 2: `subscription` pool (resets monthly with subscription cycle).
   - Priority 3: `welcome` pool (initial onboarding grant).
   - Priority 4: `purchased` pool (never expires; rolls over perpetually).
4. **Multi-Tenant Path Isolation:** All financial, subscription, and ledger records are strictly partitioned under `workspaces/{workspaceId}/...`. Cross-tenant financial inspection is impossible.
5. **Idempotent Webhook Processing:** All incoming payment webhooks are cryptographically authenticated via HMAC-SHA256 and checked against `system/billing_webhooks/{eventId}` to prevent replay attacks and double-crediting.
