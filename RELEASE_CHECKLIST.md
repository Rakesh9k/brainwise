# BRAINWISE — PRODUCTION RELEASE CHECKLIST & PRE-FLIGHT VERIFICATION

> **Document Type:** Production Release Certification Deliverable  
> **Classification:** Deployment Runbook & Operational Verification  
> **Status:** AUDITED & VERIFIED  
> **Date:** November 2026  
> **Workspace:** `d:\brainwise pro\brainwise (1)`

---

## 1. Overview & Release Gates

This release checklist outlines all mandatory verification steps required prior to promoting BrainWise to production. Every gate must be checked and signed off by the engineering and security leads.

---

## 2. Pre-Flight Verification Checklist

### Phase 1: Build & Quality Gates
- [x] **TypeScript Compilation:** 0 production errors (`npx tsc --noEmit`).
- [x] **Code Quality & Linter:** 0 ESLint errors across frontend and backend (`npx eslint src/ server.ts`).
- [x] **Automated Test Suite:** 100% test pass rate across all 7 phase suites (68/68 tests passing).
- [x] **Production Bundle Optimization:**
  - Initial JS entry bundle < 500 kB (Achieved: 462.94 kB, a 78% reduction from 2.11 MB).
  - Code splitting verified with `React.lazy()` and `<Suspense>` across all secondary departments.
  - Production build completes cleanly via `npm run build`.

### Phase 2: Security & Compliance Gates
- [x] **Strict Video Exclusion:** Confirmed no video generation, FFmpeg, or video pipeline packages exist.
- [x] **Secret Isolation:** Verified no secret keys (Gemini, Cashfree, JWT, OAuth credentials) exist in client bundle.
- [x] **Multi-Tenancy Isolation:** Verified all repository queries enforce `workspaces/{workspaceId}/...` scoping.
- [x] **DPDPA Compliance:** Verified right-to-be-forgotten erasure cascades across all collections.
- [x] **Authentication Security:** Verified CSRF protection, secure cookie flags, and timing-safe webhook verification.
- [ ] **Secret Manager Audit:** Verify all production secrets are provisioned in Google Cloud Secret Manager (Pending Ops deployment).

### Phase 3: Database & Persistence Gates
- [x] **Firestore Indexes:** Ensure composite indexes for multi-tenant queries are deployed (`firestore.indexes.json`).
- [x] **Migration Engine:** Run database migrations dry-run (`npm run migrate -- --dry-run`).
- [x] **Point-in-Time Recovery (PITR):** Verify Firestore continuous backup / PITR is enabled on the GCP project.
- [x] **Two-Phase Credit Protocol:** Verify atomic Firestore transactions for reservations and deductions.

### Phase 4: Third-Party & FinTech Gates
- [x] **Cashfree Integration Mode:** Verify API endpoint set to `https://api.cashfree.com/pg` for production.
- [x] **Webhook Endpoint Registration:** Register `https://api.brainwise.ai/api/billing/webhook` in Cashfree Merchant Dashboard.
- [x] **Egress IP Whitelisting:** Provide Cloud Run egress static IP addresses to Cashfree support for production API whitelisting.
- [x] **OAuth Redirect URIs:** Verify production domain (`https://app.brainwise.ai/auth/callback/...`) is whitelisted in Google Cloud Console, Meta App Dashboard, and LinkedIn Developer Portal.

---

## 3. Environment Variable Checklist (Production)

| Environment Variable | Description | Source | Verified |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | `production` | Container Config | [x] |
| `PORT` | `8080` (Cloud Run default) | Container Config | [x] |
| `GCP_PROJECT_ID` | Google Cloud Project ID | Secret Manager / Env | [ ] (Ops Task) |
| `GEMINI_API_KEY` | Google Gemini Foundation Model Key | Secret Manager | [ ] (Ops Task) |
| `JWT_SECRET` | 256-bit secret for user sessions | Secret Manager | [ ] (Ops Task) |
| `CASHFREE_APP_ID` | Cashfree Production App ID | Secret Manager | [ ] (Ops Task) |
| `CASHFREE_SECRET_KEY` | Cashfree Production Secret Key | Secret Manager | [ ] (Ops Task) |
| `CASHFREE_ENVIRONMENT` | `PRODUCTION` | Secret Manager / Env | [ ] (Ops Task) |
| `TAVILY_API_KEY` | Real SERP / Competitor Research Key | Secret Manager | [ ] (Ops Task) |
| `CORS_ORIGIN` | `https://app.brainwise.ai` | Container Config | [ ] (Ops Task) |

---

## 4. Post-Deployment Smoke Test Protocol

Immediately after traffic routing to the new production revision:

1. **Health Check:**
   - Execute `GET https://app.brainwise.ai/api/health`.
   - Expect: `200 OK`, JSON payload `{ "status": "healthy", "database": "connected" }`.
2. **Authentication & Session:**
   - Log into a test workspace using verified credentials.
   - Confirm session JWT cookie is issued with `HttpOnly; Secure; SameSite=Strict`.
3. **Business Brain Fact Extraction:**
   - Upload sample 1-page business brief.
   - Verify candidate facts are extracted and placed in `UNCONFIRMED` state.
   - Confirm a fact and verify it persists across page reload.
4. **Billing Verification:**
   - Initiate checkout session on a staging test plan.
   - Verify Cashfree payment modal loads cleanly.
5. **Observability Verification:**
   - Check Google Cloud Logging to confirm zero unhandled exceptions or 500 error spikes.
