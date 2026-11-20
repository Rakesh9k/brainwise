# BrainWise Commercial Infrastructure — Commercial Readiness Signoff

**Document ID:** BW-DOC-P9-013  
**Status:** Approved & Implemented  
**Date:** 2026-11-20  
**Phase:** 9 (Commercial Infrastructure)  

---

## 1. Commercial Readiness Checklist

- [x] **Pricing Constraints Verified:**
  - Starter Plan set to exactly **₹2,763 / month** (Annual: ₹2,210 / month).
  - Professional Plan set to **₹6,999 / month** (Annual: ₹5,599 / month) as the hero/most popular tier with 3,000 monthly credits.
  - Business Enterprise Plan set to **₹16,499 / month** (Annual: ₹13,199 / month) with 10,000 credits.
  - Free Starter Plan set to ₹0 with 150 one-time welcome credits.
  - 4 standalone credit top-up packs (500, 1,500, 5,000, 15,000 credits) with permanent rollover.
- [x] **Strict Video Exclusion Guardrail:**
  - Confirmed 0 video generation, video editing, video rendering, or video credit usage across all billing schemas, plans, and credit deduction logic.
- [x] **Financial & Credit Integrity (Two-Phase Reservation Protocol):**
  - Zero client-side credit deductions.
  - All deductions executed atomically via `CreditEngine` (`holdCredits` -> `commitCredits` or `releaseCredits`).
  - Automatic refund on upstream generation failures or forbidden claims.
  - Priority deduction order enforced: Promotional -> Subscription -> Welcome -> Purchased.
- [x] **Centralized Feature Entitlements:**
  - `EntitlementEngine` guards feature barriers (`canAccessMarketIntelligence`, `priorityAiModels`, `exportPdfWhiteLabel`, quotas).
  - Express middleware blocks unauthorized API routes with `403 ENTITLEMENT_RESTRICTED`.
- [x] **Payment Gateway & Webhook Infrastructure:**
  - `CashfreeProvider` handles checkout sessions and HMAC-SHA256 signature verification.
  - Webhooks enforce idempotent processing via `system/billing_webhooks/{eventId}`.
- [x] **GST Tax Compliance & Receipts:**
  - Sequential tax invoice generation (`INV-YYYY-XXXX`).
  - 18% GST (CGST/SGST for intra-state, IGST for inter-state).
  - Printable HTML receipts generated for download.
- [x] **Multi-Tenant Isolation:**
  - Strict data partitioning under `workspaces/{workspaceId}/...`.
- [x] **Client-Side Design Freeze:**
  - UI components adhere strictly to frozen tokens and design system (`tokens.ts`, `DesignSystem.tsx`).
  - `BillingDashboardView.tsx` mounted seamlessly into `SettingsHelpPages.tsx`.
  - Landing page pricing section updated to reflect real INR pricing.
- [x] **Verification:**
  - 165 / 165 tests passing.
  - TypeScript compilation: 0 errors.
  - ESLint: 0 errors.
  - Prettier formatting: 100% compliant.
  - Production Vite build: 0 errors.
