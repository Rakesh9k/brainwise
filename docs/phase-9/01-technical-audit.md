# BRAINWISE — PHASE 9: TECHNICAL AUDIT & BASELINE ASSESSMENT
**Document ID:** `docs/phase-9/01-technical-audit.md`  
**Phase:** 9 — Commercial Infrastructure: Payments, Subscriptions, Pricing & Credit Management  
**Classification:** FinOps & Production Architecture Audit  
**Auditor:** Principal FinOps Architect & Backend Engineer  
**Date:** 2026-11-20  
**Status:** Approved Baseline  

---

## 1. Executive Summary

Phase 9 transforms BrainWise into a commercially viable, revenue-generating SaaS platform operating initially in the Indian market with multi-currency readiness.

This technical audit evaluates the existing codebase across 16 dimensions: frontend design system, backend services, database schema, authentication, multi-tenancy, credit subsystem, subscription models, AI orchestration, payment gateways, and administrative tooling.

---

## 2. Comprehensive System Inventory

### 2.1 Existing Working Functionality
- **Two-Phase Credit Reservation Protocol (ADR-006):**
  - Fully implemented in `src/server/repositories/creditWalletRepository.ts` and `src/server/services/creditService.ts`.
  - Atomic Firestore transactions handle `holdCredits` (with a 120-second timeout lock) and `commitCredits` (permanent debit and immutable transaction appending).
  - `rollbackCredits` and `refundCredits` safely release reservation locks on upstream AI timeout or Deterministic Truth Check failure.
  - Backed by automated verification in `src/server/credits.test.ts` and `src/server/phase6.test.ts`.
- **Multi-Tenant Workspace Security:**
  - Strict tenant isolation enforced under `workspaces/{workspaceId}/...`.
  - Cross-tenant data leakage is prevented via middleware (`src/server/middleware/workspace.ts`).
- **Operation Pricing Registry:**
  - `CREDIT_FEATURE_COSTS` in `creditService.ts` assigns discrete credit costs (`FEAT-CNT-001`, `FEAT-RES-001`, `FEAT-STR-001`, etc.) for AI generation tasks.
- **REST Endpoints for Basic Wallet Inspection:**
  - `GET /api/v1/workspaces/:workspaceId/credits`
  - `GET /api/v1/workspaces/:workspaceId/credits/transactions`
  - `GET /api/v1/workspaces/:workspaceId/subscription`

### 2.2 Incomplete & Mocked Functionality
- **Client-Side Subscription Management:**
  - In `src/pages/app/SettingsHelpPages.tsx` (lines 770–905), plan selection is a pure frontend mock:
    - Hardcoded USD prices ($29, $79, $189).
    - Calls `updateSubscription({ plan: plan.name })` which mutates local React state in `BrainWiseContext`.
    - No payment gateway integration, checkout redirect, or verified server receipt.
- **Public Landing Page Pricing Cards:**
  - In `src/pages/public/LandingPage.tsx` (lines 960–1050), hardcoded card triad ($29, $79, $189) with client-only billing toggle.
- **Subscription Model Limitations:**
  - `SubscriptionRepository` (`src/server/repositories/integrationRepository.ts`) only performs a simple get/set of a root document.
  - Lacks subscription lifecycle states (`active`, `past_due`, `cancelled`, `grace_period`, `paused`), renewal dates, cancellation scheduling, or proration.
- **Zero Payment Gateway Wiring:**
  - No provider abstraction layer exists for Cashfree, Razorpay, or Mitra.
  - No server-side order creation, payment verification, or cryptographic webhook signature validation.
- **Zero Invoicing & Tax Calculation:**
  - No PDF or HTML invoice generation.
  - No support for Indian Goods & Services Tax (GST), GSTIN validation, or state place-of-supply rules.
- **Zero Credit Top-Up / Packs:**
  - Users cannot purchase standalone credit packs outside of their monthly plan allocation.
- **Zero Centralized Feature Entitlement Engine:**
  - Feature access (e.g. number of competitors, integrations, deep research access) is checked inconsistently rather than through an authoritative backend entitlement engine.

---

## 3. Database Models & Schema Audit

### 3.1 Existing Collections in Firestore
- `workspaces/{workspaceId}/creditWallet/rootWallet`: Stores wallet balance, reserved credits, and lifetime counters.
- `workspaces/{workspaceId}/creditWallet/rootWallet/transactions/{txId}`: Immutable transaction records.
- `workspaces/{workspaceId}/creditWallet/rootWallet/reservations/{resId}`: Active temporary reservation locks.
- `workspaces/{workspaceId}/subscriptions/rootSubscription`: Basic plan metadata.

### 3.2 Required Schema Enhancements for Phase 9
1. **Authoritative Plans Collection:** `system/pricing/plans/{planId}` (Centralized plan definitions with INR and multi-currency pricing, feature limits, and credit allowances).
2. **Subscriptions Subcollection:** `workspaces/{workspaceId}/subscriptions/{subId}` (Detailed lifecycle states, provider subscription IDs, billing cycles, cancellation dates, and payment references).
3. **Payments Subcollection:** `workspaces/{workspaceId}/payments/{paymentId}` (Order ID, provider reference, amount, currency, tax breakdown, status, payment method).
4. **Invoices Subcollection:** `workspaces/{workspaceId}/invoices/{invoiceId}` (Sequential invoice number, customer billing details, line items, GST breakdown, PDF download URL).
5. **Credit Packs Collection:** `system/pricing/credit_packs/{packId}` (Configurable additional credit top-up packages).
6. **Payment Webhook Audit Ledger:** `system/billing_webhooks/{webhookId}` (Raw event payload, provider signature, processed timestamp, idempotency key).

---

## 4. Gap Analysis & Roadmap

| Architectural Layer | Current State | Phase 9 Production Requirement | Status |
|---|---|---|---|
| **Commercial Plan Model** | Hardcoded USD mock | 4-tier model (Free, Starter ₹2,763, Professional, Business) in INR & USD | Missing |
| **Payment Gateway Adapter** | None | Provider-agnostic adapter (Cashfree / Razorpay / Mitra) | Missing |
| **Checkout Workflow** | Mock state update | Server-side order creation, provider checkout session, verified return | Missing |
| **Webhook Processing** | None | Cryptographic signature validation, idempotency, asynchronous worker | Missing |
| **Subscription Lifecycle** | Static document | Full state machine (Activate, Renew, Upgrade, Downgrade, Cancel, Grace) | Missing |
| **Credit Ledger** | Basic settlement/refund | Multi-category credits (welcome, subscription, purchased, promotional) | Partial |
| **Credit Packs** | None | Configurable standalone top-up purchasing with instant verified grant | Missing |
| **Centralized Entitlements**| Ad-hoc | Authoritative backend engine evaluating plan features and limits | Missing |
| **Invoicing & Taxes** | None | Automated GST-compliant invoices with PDF/HTML download | Missing |
| **Billing UI** | Mock plan switcher | Real Billing Center (Overview, Credit Wallet, Invoices, Plan Manager) | Incomplete |
| **Admin Billing Controls** | None | Admin endpoints & panel for refunds, manual credit adjustments, plan edits | Missing |

---

## 5. Architectural Directives for Phase 9

1. **STRICT VIDEO EXCLUSION:** BrainWise EXPLICITLY EXCLUDES all video generation, rendering, and video credits. No video packages or video credit models shall be introduced.
2. **Client-Side Design Freeze (React 19):** No arbitrary restyling of UI components. Billing views must use the established design system tokens (`tokens.ts`, `DesignSystem.tsx`, `LiquidMotion.tsx`).
3. **Two-Phase Credit Reservation Protocol (ADR-006):** Maintain atomic Firestore transactions. Never trust frontend calculations for credit deduction or balance checks.
4. **No Premature Activation:** Never activate subscriptions or allocate credits based purely on frontend redirects. Only cryptographically verified webhook events or authoritative backend API verification may grant credits.
