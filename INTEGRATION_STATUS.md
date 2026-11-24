# BRAINWISE — ENTERPRISE INTEGRATION STATUS & PROVIDER INVENTORY

> **Document Type:** Production Readiness Certification Deliverable  
> **Classification:** Enterprise Infrastructure & External Integrations  
> **Status:** AUDITED & VERIFIED  
> **Date:** November 2026  
> **Workspace:** `d:\brainwise pro\brainwise (1)`

---

## 1. Executive Summary

This document provides the authoritative inventory and operational readiness matrix for all external third-party integrations, OAuth providers, data ingestion services, AI foundations, and FinTech gateways within BrainWise.

Every external adapter has been audited against:
1. API versioning & SDK deprecation status.
2. Real authentication mechanisms (OAuth 2.0 PKCE, API Key, HMAC signatures).
3. Zero-telemetry simulation compliance (UNCONNECTED vs CONNECTED state reporting).
4. Rate limiting, pagination, backoff, and idempotency guarantees.
5. Strict Video Exclusion compliance (no video ingestion/rendering APIs).

---

## 2. Comprehensive Provider Inventory

| Provider | Category | Auth Method | Scopes Required | Status | Rate Limit / SLA | Re-auth / Refresh Strategy |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Cashfree Payments** | Payment Gateway | App ID + Secret Key (`x-client-id`, `x-client-secret`) | N/A (Server-to-Server) | **PRODUCTION READY (v2023-08-01)** | 100 req/sec; 99.95% SLA | IP Whitelist + Secret Key in Secret Manager |
| **Google Analytics 4 (GA4)** | Web Analytics | OAuth 2.0 PKCE | `https://www.googleapis.com/auth/analytics.readonly` | **READY (Real API Adapter)** | 10 QPS per property, 25,000 req/day | Offline refresh token with 60-min automatic renewal |
| **Meta Graph / Instagram** | Social Analytics | OAuth 2.0 PKCE | `pages_read_engagement`, `instagram_basic`, `instagram_manage_insights` | **READY (Real API Adapter)** | 200 calls/hr/user (Standard Graph API) | 60-day Long-Lived Page Access Token with auto-extension |
| **LinkedIn Marketing** | Social Analytics | OAuth 2.0 PKCE | `r_organization_social`, `r_ads_reporting` | **READY (Real API Adapter)** | 500 req/day per organization | 60-day Refresh Token |
| **Google Search Console** | SEO & Search | OAuth 2.0 PKCE | `https://www.googleapis.com/auth/webmasters.readonly` | **READY (Real API Adapter)** | 1,200 QPM per site | Offline refresh token |
| **Google Business Profile** | Local SEO | OAuth 2.0 PKCE | `https://www.googleapis.com/auth/business.manage` | **READY (Real API Adapter)** | 300 QPM per account | Offline refresh token |
| **Google Gemini API** | LLM / Multimodal | Bearer API Key | N/A (Server-to-Server) | **PRODUCTION READY (`gemini-2.5-pro`, `gemini-2.5-flash`)** | Tier-dependent (1,000+ RPM) | Key rotation via Secret Manager |
| **Tavily / Google Search** | External Research | API Key (`tvly-...` / Google Serper) | N/A (Server-to-Server) | **PRODUCTION READY** | 100 req/min | API Key in Secret Manager |
| **Cloud Firestore** | Persistent Database | GCP ADC / Service Account JSON | Cloud Datastore User / Owner | **PRODUCTION READY (GCP SDK)** | 10,000 writes/sec | Automatic GCP IAM credential rotation |
| **Google Cloud Storage (GCS)** | Object Storage | GCP ADC / Service Account JSON | Storage Object Admin | **PRODUCTION READY** | Unlimited read/write scalability | Signed URLs (15-min TTL) |

---

## 3. Deep-Dive Integration Profiles

### 3.1 Cashfree Payment Gateway (`v2023-08-01`)
- **Adapter Location:** `src/server/billing/providers/cashfreeProvider.ts`
- **Routing & Webhooks:** `src/server/billing/billingWebhookRoutes.ts`
- **API Base URLs:**
  - Sandbox: `https://sandbox.cashfree.com/pg`
  - Production: `https://api.cashfree.com/pg`
- **Authentication:** `x-client-id`, `x-client-secret`, `x-api-version: 2023-08-01`.
- **Order Lifecycle:**
  1. `createOrder()` emits customer details, return URL, and notify URL.
  2. Receives `payment_session_id` and order status `ACTIVE`.
  3. Returns checkout session to frontend SDK.
- **Webhook Signature Verification:**
  - Uses raw binary request body buffer.
  - Generates HMAC-SHA256 signature using `CASHFREE_SECRET_KEY` and compares against `x-webhook-signature`.
  - Replay protection: Verifies timestamp window within 5 minutes.
- **Error Handling:** Translates 400/401/409 into typed `CASHFREE_ORDER_CREATION_FAILED` errors. Retries network timeouts up to 3 times with exponential jitter.

### 3.2 Google Analytics 4 (GA4) Data API
- **Adapter Location:** `src/server/integrations/googleAnalytics4Provider.ts`
- **Protocol:** REST via Google API Client (`https://analyticsdata.googleapis.com/v1beta/properties/{propertyId}:runReport`).
- **Telemetry Reality:**
  - When credentials or property ID are missing/invalid, adapter returns status `UNCONNECTED`.
  - Zero hardcoded mock numbers are emitted in production mode.
  - Queries real dimensions (`date`, `sessionDefaultChannelGroup`) and metrics (`activeUsers`, `sessions`, `conversions`, `totalRevenue`).

### 3.3 Meta Graph API (Instagram Insights)
- **Adapter Location:** `src/server/integrations/metaInstagramProvider.ts`
- **Protocol:** Meta Graph API `v19.0` (`https://graph.facebook.com/v19.0/{pageOrInstagramId}/insights`).
- **Telemetry Reality:**
  - Returns `UNCONNECTED` status when page access token or page ID is missing.
  - Real metric queries: `impressions`, `reach`, `profile_views`, `accounts_engaged`.
  - Handles Meta rate limit headers (`x-app-usage`, `x-business-use-case-usage`).

### 3.4 Google Search Console (GSC)
- **Adapter Location:** `src/server/integrations/googleSearchConsoleProvider.ts`
- **Protocol:** `https://www.googleapis.com/webmasters/v3/sites/{siteUrl}/searchAnalytics/query`.
- **Metrics Collected:** Clicks, impressions, CTR, average position by query, page, country, and device.
- **Zero-Mock Policy:** Unconnected workspaces return clean zero/unconnected status without synthetic growth projections.

### 3.5 AI Research & Truth Grounding Engines
- **Adapters:** `src/server/ai/researchEngine.ts`, `src/server/ai/competitorDiscoveryEngine.ts`
- **Models:** Gemini 2.5 Pro (complex extraction, dossier generation) and Gemini 2.5 Flash (sentiment, categorization, rapid scan).
- **Grounding Protocol:**
  - Fact extraction strictly attributes facts to source files/URLs.
  - Anti-fatigue memory checks (`strategicMemory.ts`) prevent duplicate angles.
  - Truth Check (`truthCheck.ts`) validates all copy against `USER_CONFIRMED` business facts before delivery.

---

## 4. Disconnected State Compliance Matrix

BrainWise enforces a strict UX policy regarding unintegrated third-party accounts:

| Feature Area | Connected Behavior | Disconnected Behavior |
| :--- | :--- | :--- |
| **Analytics Dashboard** | Displays real timeseries, traffic channels, and live conversion funnel. | Displays empty state with "Connect GA4" callout. Never shows fabricated trends. |
| **Social Monitoring** | Ingests real post reach, comment sentiment, and engagement rates. | Displays "Connect Social Channels" prompt with OAuth links. |
| **Competitor Discovery** | Live SERP and web scraping of real competitor domains with source citations. | Uses curated industry baselines explicitly marked as `ESTIMATE` or `AI_INFERRED`. |
| **Keyword Rankings** | Real organic rank queries via Google Search Console API. | Displays "Connect Search Console" badge. Zero fake keyword positions. |

---

## 5. Security & Isolation Controls
1. **OAuth Token Storage:** All access and refresh tokens are encrypted at rest using AES-256-GCM before writing to Firestore.
2. **Tenant Scoping:** Every integration token is bound strictly to `workspaces/{workspaceId}/integrations/{providerId}`. Cross-tenant access is structurally impossible.
3. **Webhook Endpoints:** Only accept requests containing valid cryptographic signatures; unauthenticated or malformed payloads receive instant `401 Unauthorized`.
