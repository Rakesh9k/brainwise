# Phase 5: Production Deployment Checklist
## Cloud Infrastructure, Environment Variables, Security Secrets & Staging Verification

**Document Version:** 1.0.0  
**Phase Status:** COMPLETE & VERIFIED  
**Date:** November 20, 2026  
**Target Environment:** Google Cloud Run (Backend API) + Firebase Hosting (Client Frontend) + Cloud Firestore + Cloud Storage

---

## 1. Environment Variable Specifications

Configure the following environment variables in Google Secret Manager or Cloud Run runtime environment:

| Variable Name | Required | Default / Example | Security Classification | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `NODE_ENV` | Yes | `production` | Public | Node.js execution mode |
| `PORT` | Yes | `8080` | Public | HTTP port for Cloud Run container |
| `CORS_ORIGIN` | Yes | `https://brain-wise.com,https://app.brain-wise.com` | Internal | Strict CORS origin allowlist |
| `FIREBASE_PROJECT_ID` | Yes | `brainwise-saas` | Public | GCP Project Identifier |
| `GCS_BUCKET_NAME` | Yes | `brainwise-saas-assets` | Public | Cloud Storage bucket for brand assets |
| `GEMINI_API_KEY` | Yes | `AIzaSy...` | Secret (Secret Manager) | Google GenAI API key |
| `GEMINI_MODEL` | Yes | `gemini-3.8-flash` | Internal | Model designation for AI synthesis |
| `DEV_BYPASS_AUTH` | Yes | `false` | Critical Secret | **MUST BE FALSE** in production |
| `SMTP_HOST` | Optional | `smtp.sendgrid.net` | Internal | Transactional email provider host |
| `SMTP_USER` | Optional | `apikey` | Internal | Email provider username |
| `SMTP_PASS` | Optional | `SG.xyz...` | Secret | Email provider credentials |

> [!CAUTION]
> In production environments, `DEV_BYPASS_AUTH` must **NEVER** be set to `true`. The backend automatically fails closed if this flag is enabled when `NODE_ENV=production`.

---

## 2. Infrastructure Provisioning Checklist

### 2.1 Google Cloud Firestore
- [x] Firestore in Native Mode provisioned in the primary region (`asia-south1` or `us-central1`).
- [x] Firestore security rules deployed matching `docs/phase-5/03-database-documentation.md`.
- [x] Single-field index exemptions and composite indexes created for:
  - `users`: `email` (ASC), `verificationToken` (ASC)
  - `workspaces/{id}/business_brain_versions`: `versionNumber` (DESC)
  - `onboarding_sessions`: `userId` (ASC)

### 2.2 Google Cloud Storage
- [x] Bucket `brainwise-saas-assets` created with Uniform Bucket-Level Access.
- [x] CORS configuration applied to bucket allowing `PUT` and `GET` from `https://app.brain-wise.com`.
- [x] Retention policy and lifecycle rules set (e.g. 30 days for temporary exports).

### 2.3 Cloud Run (API Backend)
- [x] Docker container built using Node.js 22 LTS alpine base.
- [x] Health check endpoint configured at `GET /health` responding with `200 OK`.
- [x] Minimum container instances set to 1 (prevent cold start latency during customer onboarding).
- [x] Service account assigned `roles/datastore.user` and `roles/storage.objectAdmin`.

### 2.4 Client Hosting (Firebase Hosting / CDN)
- [x] Single Page Application (SPA) rewrite rules configured in `firebase.json` directing all non-asset routes to `/index.html`.
- [x] Content Security Policy (CSP) headers configured to disallow inline scripts outside bundled hashes.
- [x] Strict-Transport-Security (HSTS), X-Content-Type-Options, and X-Frame-Options headers applied.

---

## 3. Staging Smoke Test Verification Sequence

Before directing live founder traffic to the platform, execute the following manual smoke test:

1. **Self-Service Registration:**
   - Navigate to `/register`.
   - Submit new user credentials.
   - Confirm receipt of 6-digit numeric verification code.
2. **Email Verification:**
   - Enter 6-digit code on `/verify-email`.
   - Verify immediate transition to `/onboarding`.
3. **Conversational Funnel:**
   - Complete Stage 1 (Identity & Location).
   - Refresh browser or open in private tab. Verify answers remain populated via autosave.
   - Complete Stage 2 (Objectives & Audience) and Stage 3 (Offerings & Differentiation).
4. **AI Business Brain Review:**
   - Watch the synthesis animation complete in `< 5` seconds.
   - Verify Fact Provenance badges (`USER_CONFIRMED` vs `AI_INFERRED`) on the review screen.
   - Click "Approve Business Brain".
5. **Dashboard Onboarding Transition:**
   - Confirm seamless redirection to `/dashboard` with founder's personalized business context rendered.
