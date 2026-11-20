# BRAINWISE PHASE 10 — PRODUCTION DEPLOYMENT & LAUNCH CHECKLIST

**Document ID:** `BW-P10-CHK-026`  
**Classification:** DevOps & Production Release Engineering  
**Status:** Certified & Verified  
**Date:** November 2026  

---

## 1. Executive Summary

This checklist establishes the pre-flight requirements, configuration baselines, secret provisioning, zero-downtime deployment strategy, and automated rollback triggers required for public production deployment of BrainWise.

---

## 2. Production Pre-Flight Checklist

### 2.1 Infrastructure & Security Baseline
- [x] **SSL/TLS Certificates:** Automated TLS 1.3 certificate provisioning via Google Cloud Certificate Manager with HTTP/2 and HTTP/3 support enabled.
- [x] **Cloud Armor WAF:** Active protection enabled with OWASP Top 10 rule bundles, IP rate limiting (100 req/min per IP), and geo-blocking policies.
- [x] **CORS Configuration:** Strictly restricted to production domains (`https://app.brainwise.ai`, `https://brainwise.ai`). Localhost and wildcard origins rejected in production.
- [x] **Security Headers:** Strict Content Security Policy (CSP), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Strict-Transport-Security: max-age=31536000; includeSubDomains`.
- [x] **Secrets in Secret Manager:** All API keys, database credentials, and webhook secrets stored in Google Cloud Secret Manager; zero plaintext secrets in environment variables or code repositories.

### 2.2 Database & Storage Readiness
- [x] **Cloud Firestore Production Database:** Multi-region deployment configured (`asia-south1`).
- [x] **Composite Indexes Deployed:** All composite indexes deployed via `firestore.indexes.json`.
- [x] **Security Rules Applied:** Production `firestore.rules` deployed with strict workspace membership checks.
- [x] **Automated Backups:** Daily export job scheduled to GCS WORM bucket (`asia-south1` / `asia-south2`).
- [x] **GCS Buckets:** Dedicated avatars and business assets bucket created with private ACLs and signed URL generation.

### 2.3 Third-Party API Production Credentials
- [x] **Google Gemini API:** Production enterprise quota enabled for `gemini-1.5-pro` and `gemini-1.5-flash`.
- [x] **Cashfree Payments:** Switched from sandbox (`sandbox.cashfree.com`) to production gateway (`api.cashfree.com`). Production webhook signature keys configured.
- [x] **Meta Ads API:** Production app approved with `ads_read` and `ads_management` scopes.
- [x] **Shopify Partner App:** Production API client credentials registered and installed.
- [x] **Tavily Search API:** Production search quota active with concurrency throttling.

---

## 3. Environment Variable Configuration Spec

The following production environment variables must be populated via Cloud Secret Manager:

```env
# Application
NODE_ENV=production
PORT=8080
APP_BASE_URL=https://app.brainwise.ai

# Database
FIRESTORE_PROJECT_ID=brainwise-production
GOOGLE_APPLICATION_CREDENTIALS=/secrets/gcp-service-account.json

# Authentication
FIREBASE_AUTH_EMULATOR_HOST=
JWT_SIGNING_SECRET=projects/123456/secrets/jwt-secret/versions/latest

# Payments & Billing
CASHFREE_APP_ID=projects/123456/secrets/cashfree-app-id/versions/latest
CASHFREE_SECRET_KEY=projects/123456/secrets/cashfree-secret-key/versions/latest
CASHFREE_ENV=production
CASHFREE_WEBHOOK_SECRET=projects/123456/secrets/cashfree-webhook/versions/latest

# AI & Search Providers
GEMINI_API_KEY=projects/123456/secrets/gemini-api-key/versions/latest
TAVILY_API_KEY=projects/123456/secrets/tavily-api-key/versions/latest

# Security & Encryption
ENCRYPTION_KEY_AES256=projects/123456/secrets/token-encryption-key/versions/latest
```

---

## 4. Deployment Strategy: Zero-Downtime Blue/Green Release

BrainWise utilizes a Blue/Green rolling update strategy orchestrated by Google Cloud Run:

```
                  [Global HTTP(S) Load Balancer]
                                │
             ┌──────────────────┴──────────────────┐
             ▼ (100% Current Traffic)              ▼ (0% Canary Traffic)
    [Blue Revision (v1.0.0)]              [Green Revision (v1.1.0)]
             │                                     │
             │                              1. Deploy Green Pods
             │                              2. Execute Smoke Tests
             │                              3. Shift Traffic: 10% -> 50% -> 100%
             │                                     │
             ▼                                     ▼
        [Decommission]                   [New Active Baseline]
```

### 4.1 Deployment Execution Steps
1. **Container Build:** Build multi-stage Docker image with unprivileged non-root user (`USER node`).
2. **Deploy Green:** Deploy new revision to Cloud Run with 0% traffic allocation.
3. **Internal Smoke Testing:** Execute synthetic transaction tests against internal tag URL (`green.brainwise.ai`).
4. **Traffic Migration:**
   - Shift 10% traffic to Green; monitor error rates for 5 minutes.
   - Shift 50% traffic to Green; monitor P95 latency for 5 minutes.
   - Shift 100% traffic to Green.
5. **Decommission Blue:** Retire previous revision after 30 minutes of stable metrics.

---

## 5. Automated Rollback Criteria

A rollback to the previous stable revision is automatically triggered by Cloud Monitoring if any of the following occur within the first 15 minutes of deployment:
- **Liveness/Readiness Failures:** Pod restart count $> 3$ or `/health/ready` returns non-200.
- **HTTP 5xx Spike:** 5xx error rate exceeds $0.5\%$ of total traffic over a 2-minute rolling window.
- **P95 Latency Degradation:** P95 response time exceeds $1,000\text{ ms}$ for 3 consecutive minutes.
- **Payment Verification Failure:** Cashfree webhook processing failure rate exceeds $1.0\%$.

---

## 6. Audit Verdict

**Production Deployment Checklist Status:** **100% READY & VERIFIED**  
- All pre-flight security, infrastructure, and credential checks passed.  
- Zero-downtime deployment pipeline and automated rollback triggers configured.
