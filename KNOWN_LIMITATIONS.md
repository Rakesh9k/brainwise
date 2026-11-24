# BRAINWISE — KNOWN LIMITATIONS & ARCHITECTURAL BOUNDARIES

> **Document Type:** Production Readiness Certification Deliverable  
> **Classification:** Architectural Boundaries & Technical Constraints  
> **Status:** AUDITED & VERIFIED  
> **Date:** November 2026  
> **Workspace:** `d:\brainwise pro\brainwise (1)`

---

## 1. Absolute Product Boundary: Strict Video Exclusion

BrainWise has an absolute, non-negotiable architectural boundary regarding video assets:

```
+--------------------------------------------------------------------------+
|                       STRICT VIDEO EXCLUSION ZONE                        |
|                                                                          |
|  [X] NO AI Video Generation (Text-to-Video, Video Diffusion)             |
|  [X] NO Video Rendering, Video Pipelines, or Remotion Engine             |
|  [X] NO FFmpeg Processing or Video Transcoding                           |
|  [X] NO Video Editing or Reel Generation                                 |
|  [X] NO Video-Related Credit Allocations or Billing Tiers                |
+--------------------------------------------------------------------------+
```

### Approved Visual Marketing Collateral:
- **SVG Vector Brand Collateral:** Logos, business cards, letterheads, invoice templates, social media banners, vector icons.
- **Multi-Frame Static Carousels:** High-resolution multi-slide Instagram/LinkedIn image carousels with deterministic layout coordinates.
- **High-DPI Print-Ready Documents:** 300+ DPI vector and PDF exports for flyers, posters, menu cards, and packaging.
- **Deterministic Copywriting Packs:** Ad copy, email sequences, social posts, press releases, landing page copy validated through the Truth Engine.

---

## 2. Infrastructure & Dependency Limitations

### 2.1 Transitive `@grpc/grpc-js` Vulnerability
- **Severity:** High (DoS vulnerability via HTTP/2 rapid reset / unhandled stream cancellations).
- **Origin:** Deep dependency chain via `@firebase/firestore@3.x` bundled inside `firebase@9.23.0`.
- **Impact on BrainWise:**
  - In Cloud Run production environments using the official Node.js server (`server.ts`), Google Cloud client libraries (`@google-cloud/firestore`) are used for database operations rather than the client Firebase SDK.
  - The client bundle runs in the browser, where `@grpc/grpc-js` is not loaded or executed.
  - **Mitigation / Next Step:** Upgrade `firebase` client package to the latest modular release (`v11.x`) in the post-launch sprint.

### 2.2 Google Cloud Service Account Permissions
- In development/local environments without `GOOGLE_APPLICATION_CREDENTIALS` pointing to a real GCP Service Account key, the database layer falls back to the in-memory persistence emulator.
- Production environments on Google Cloud Run must have the Service Account granted:
  - `roles/datastore.user` (Cloud Datastore / Firestore User)
  - `roles/storage.objectAdmin` (GCS Object Admin)
  - `roles/secretmanager.secretAccessor` (Secret Manager Secret Accessor)

---

## 3. Third-Party Integration & Rate Limiting Boundaries

### 3.1 Cashfree Payment Gateway
- **Sandbox vs. Production Environment:**
  - Sandbox mode requires sandbox-generated app credentials (`TEST...`) and returns mock bank redirect pages.
  - Switching to production requires flipping `CASHFREE_ENVIRONMENT=PRODUCTION`, updating API keys, and whitelisting the egress IP of the Cloud Run cluster in the Cashfree Merchant Dashboard.
- **Webhook Latency:**
  - In rare bank gateway slowdowns, webhook events can arrive up to 120 seconds after payment completion. BrainWise handles this gracefully via polling fallback on the checkout return page (`/billing/success?order_id=...`).

### 3.2 External Analytics Adapters (GA4, Meta, LinkedIn, GSC, GBP)
- **Token Expiration:**
  - While Google offline tokens refresh automatically, Meta and LinkedIn user access tokens expire after 60 days of inactivity. Users must re-authorize when token invalidation occurs.
- **Quota Limits:**
  - GA4 Standard Properties allow up to 10 queries per second and 25,000 requests per day per property. BrainWise caches aggregated analytics metrics in Firestore for 4 hours to prevent quota exhaustion.

---

## 4. AI Orchestration & Generation Limits

### 4.1 Token Windows & Maximum Context Length
- Business Brain extraction accepts documents up to 50 MB (PDF, DOCX, CSV, TXT, images).
- Files exceeding 100 pages are processed in 20-page chunks with aggregated summarization to adhere to context length limits and prevent LLM attention degradation.

### 4.2 Rate Limiting & Two-Phase Credit Reservation
- All AI generation routes enforce credit reservations. If an account has insufficient credits, the request is immediately rejected with `402 Payment Required`.
- If an upstream AI provider times out (> 60s), the reservation is automatically rolled back, ensuring user credits are never lost to upstream outages.

---

## 5. Browser Compatibility
- Supported: Chrome 110+, Safari 16+, Edge 110+, Firefox 115+.
- Legacy browsers lacking CSS Grid subgrid or dynamic viewport units (`dvh`) may experience minor aesthetic differences, but all functional controls remain operational.
