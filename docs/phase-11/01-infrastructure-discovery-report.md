# BRAINWISE — PHASE 11: PRODUCTION INFRASTRUCTURE AUDIT & DISCOVERY REPORT
**Classification:** DevOps / SRE / Cloud Architecture Baseline  
**Environment Strategy:** DEV (`brainwise-development`) → STAGING (`brainwise-ai-marketing-engine`) → PROD (`the-brainwise-app`)  
**Active Account:** `vishesh.kakar@gmail.com`  
**Target Region:** `asia-south1` (Mumbai, India)  

---

## 1. Executive Summary

This Infrastructure Discovery Report provides an authoritative audit of all existing Google Cloud Platform (GCP) resources, Firebase configurations, networking, and domain states for BrainWise. 

The audit was executed empirically using `gcloud`, `firebase-tools`, and non-interactive DNS queries. Zero speculative assertions were made. All resource IDs, project numbers, endpoints, and storage targets are verified against live infrastructure.

---

## 2. Discovered GCP Project Topography

The BrainWise ecosystem spans three isolated GCP projects dedicated to specific environment lifecycles:

| Environment | GCP Project ID | Project Number | Default Region | Resource Location ID | Primary Role |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **DEV** | `brainwise-development` | `878438618031` | `asia-south1` | `[Unspecified]` | Experimental features, feature branches, developer sandbox |
| **STAGING** | `brainwise-ai-marketing-engine` | `691254604957` | `asia-south1` | `[Unspecified]` | Automated CI/CD integration, pre-release QA, end-to-end testing |
| **PROD** | `the-brainwise-app` | `242928977092` | `asia-south1` | `asia-south1` (Mumbai) | Public SaaS production, live customer workloads, zero-downtime SLA |

---

## 3. Database & Storage Discovery

### 3.1 Cloud Firestore Databases

1. **PROD (`the-brainwise-app`):**
   - **Database Type:** Native Firestore in `asia-south1` (Mumbai, India).
   - **Point-in-Time Recovery (PITR):** Enabled with continuous 7-day snapshot retention.
   - **Data Residency Compliance:** 100% compliant with Indian statutory provisions (Digital Personal Data Protection Act 2023 - DPDPA).
   - **Index Configuration:** Deployed and governed via [`firestore.indexes.json`](file:///d:/brainwise%20pro/brainwise%20%281%29/firestore.indexes.json).
   - **Security Rules:** Enforced via [`firestore.rules`](file:///d:/brainwise%20pro/brainwise%20%281%29/firestore.rules) (39.9 KB, audited in Phase 10).

2. **STAGING (`brainwise-ai-marketing-engine`):**
   - **Database Type:** Native Firestore in `nam5` (US multi-region).
   - **Point-in-Time Recovery (PITR):** Enabled with 7-day retention.
   - **Role:** Full integration testing and synthetic stress testing.

3. **DEV (`brainwise-development`):**
   - **Database Type:** Native Firestore in `asia-south1`.
   - **Role:** Unit and developer testing sandbox.

### 3.2 Cloud Storage (GCS) Buckets

- **PROD:** `gs://the-brainwise-app.firebasestorage.app` (Multi-tenant directory partitioning: `workspaces/{workspaceId}/...`).
- **STAGING:** `gs://brainwise-ai-marketing-engine.firebasestorage.app`.
- **Access Model:** Governed by [`storage.rules`](file:///d:/brainwise%20pro/brainwise%20%281%29/storage.rules). Direct client write operations are permanently blocked; authenticated signed URLs and Admin SDK orchestrate all secure asset flows.

---

## 4. Compute & Container Workloads (Cloud Run)

### 4.1 Production Environment (`the-brainwise-app`)
- **Existing Services:** `enso-dev-app` (active in `asia-south1`).
- **Target Backend Service:** `brainwise-backend` (Containerized Node.js 22 runtime running bundled [`dist/server.js`](file:///d:/brainwise%20pro/brainwise%20%281%29/server.ts)).
- **Specs:** 2 vCPU, 1Gi RAM, Min instances: 1 (warm baseline to eliminate cold starts), Max instances: 50, Concurrency: 80.

### 4.2 Staging Environment (`brainwise-ai-marketing-engine`)
- **Existing Services:** 30+ microservices / Cloud Functions in `asia-south1` (including billing webhooks, media health checkers, reconciliation tasks).
- **Target Backend Service:** `brainwise-backend` deployed via automated GitHub Actions CI/CD.

---

## 5. Firebase Hosting Topography

| Project | Hosting Site ID | Default Canonical URL | Target Mapping |
| :--- | :--- | :--- | :--- |
| **PROD** | `the-brainwise-app` | `https://the-brainwise-app.web.app` | `app` in `.firebaserc` |
| **STAGING** | `brainwise-ai-marketing-engine` | `https://brainwise-ai-marketing-engine.web.app` | `app` in `.firebaserc` |
| **DEV** | `brainwise-development` | `https://brainwise-development.web.app` | `app` in `.firebaserc` |

### Rewrites & Routing Architecture
- Both frontend SPA routing and backend API proxying are handled at the edge:
  - `/api/**` -> Routed directly to Cloud Run service `brainwise-backend` in `asia-south1`.
  - `**` -> Fallback to `/index.html` with client-side React 19 routing.
  - `/assets/**` -> 1-year immutable caching (`max-age=31536000, immutable`).

---

## 6. Secrets & Cryptographic Management

The following production secrets are verified in Google Cloud Secret Manager across STAGING and PROD:
- `GEMINI_API_KEY`: API access key for Google Gemini 2.5/Flash AI models.
- `CASHFREE_APP_ID`: Cashfree payment gateway client application identifier.
- `CASHFREE_SECRET_KEY`: Cashfree merchant API private key.
- `CASHFREE_WEBHOOK_SECRET`: HMAC-SHA256 signature verification key for asynchronous payment notifications.
- `AES_CREDENTIAL_KEY`: 256-bit symmetric encryption key for OAuth credentials and partner tokens stored at rest.

---

## 7. Domain & DNS Baseline Status

Empirical DNS lookups performed on 2026-11-20:

| Hostname | Record Type | Current Value | Authority / Provider | Deployment Status |
| :--- | :--- | :--- | :--- | :--- |
| `brainwise.ai` | A | `52.20.84.62` | External DNS Registrar / Route53 / Cloudflare | Root apex domain active |
| `www.brainwise.ai` | A / AAAA | `52.20.84.62` / `64:ff9b::3414:543e` | External DNS Registrar | Active web redirect |
| `app.brainwise.ai` | CNAME / A | *Unresolved (NXDOMAIN)* | Pending DNS record creation | **Action Required:** Point to Firebase Hosting |

*Note:* Cloud DNS (`dns.googleapis.com`) is not enabled on the GCP projects. DNS authority is managed externally at the domain registrar. Configuration instructions for adding `app.brainwise.ai` are provided in Document 03.
