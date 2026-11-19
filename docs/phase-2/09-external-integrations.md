# BrainWise Phase 2 — 09: External Integration Register & Third-Party APIs

**Document ID:** `docs/phase-2/09-external-integrations.md`  
**Version:** `2.0.0`  
**Date:** November 19, 2026  
**Auditor:** API Architect & Principal Systems Engineer  
**Status:** APPROVED & BINDING  

---

## 1. Executive Summary

This document provides a comprehensive evaluation of all third-party external services and APIs integrated into BrainWise. 

Every integration is documented with its official API documentation link, required OAuth scopes, authentication protocol, rate limits, unit pricing, failure behaviors, and mandatory platform approval prerequisites.

**Explicit Scope Restriction:** All video generation providers (Runway, Pika, Kling, LTX-Video, Wan 2.2, Google Veo, Sora) are strictly excluded from the integration registry.

---

## 2. Master External Integration Register

| Integration | Provider | Primary Purpose | Auth Protocol | Approval Requirement | Production Status |
|---|---|---|---|---|---|
| **Google Gemini 2.5 Flash / Pro** | Google Cloud / Gen AI | Structured copy, dossiers, roadmaps, fact extraction | Server API Key (Secret Manager) | None (Standard GCP billing) | **Available Now** |
| **Google Imagen 3** | Google Cloud / Gen AI | Static brand imagery, background textures | Server API Key (Secret Manager) | None (Standard GCP billing) | **Available Now** |
| **Tavily Search API** | Tavily | Public competitor domain research & market discovery | Server Bearer Token | None (Commercial API key) | **Available Now** |
| **Cashfree Payment Gateway** | Cashfree Payments | Indian INR UPI, Card, Netbanking subscriptions | App ID + Secret HMAC-SHA256 | KYC Verification Completed | **Available Now** |
| **Stripe Payments** | Stripe | International USD credit card billing fallback | Secret Key + Webhook Secret | Standard Stripe Account | **Available Now** |
| **Meta Graph API v19.0** | Meta for Developers | Instagram Professional & Facebook Page publishing | OAuth 2.0 User Access Token | **Requires Meta App Review** | **Backend Ready (UI Deferred)** |
| **LinkedIn Marketing API** | LinkedIn / Microsoft | Company Page & Personal Profile static post publishing | OAuth 2.0 Authorization Code | **Requires Developer App Approval** | **Backend Ready (UI Deferred)** |
| **Resend / SendGrid** | Resend | Transactional emails (verification, invites, invoices) | Server API Key | Domain DNS Verification (DKIM/SPF) | **Available Now** |

---

## 3. Deep-Dive Integration Specifications

### 3.1 Google Gen AI SDK (Gemini 2.5 Flash & Pro)
- **Official Documentation:** `https://ai.google.dev/docs`
- **Supported Models:** `gemini-2.5-flash`, `gemini-2.5-pro`
- **Required Scopes / Credentials:** Server API Key (`GEMINI_API_KEY`) stored in Google Cloud Secret Manager.
- **Rate Limits:** Default Tier-2 quotas: 1,000 Requests Per Minute (RPM), 4,000,000 Tokens Per Minute (TPM).
- **Unit Pricing:**
  - Flash: $0.075 / 1M input tokens, $0.30 / 1M output tokens.
  - Pro: $1.25 / 1M input tokens, $5.00 / 1M output tokens.
- **Failure Scenarios:** Upstream timeout (18s deadline), Safety block (`HARM_CATEGORY`), Rate limiting (`429`).
- **Fallback Strategy:** Auto-retry once; if unresolved, falls back to deterministic local generators in `src/utils/logic.ts` and triggers automatic credit refund.

### 3.2 Tavily Search API (Competitor & Trend Discovery)
- **Official Documentation:** `https://docs.tavily.com`
- **Primary Purpose:** Clean, LLM-optimized web text extraction without fragile DOM scraping.
- **Authentication:** `Bearer tvly-...` passed in `Authorization` header.
- **Rate Limits:** 100 requests per minute on standard tier.
- **Pricing:** $0.005 per search request ($5 per 1,000 searches).
- **Failure Scenarios:** Domain timeout, invalid URL, search quota exceeded.
- **Fallback Strategy:** Allows user to enter competitor pricing and positioning manually if automated discovery fails.

### 3.3 Cashfree Payments (PG & Recurring Subscriptions)
- **Official Documentation:** `https://docs.cashfree.com/docs/payment-gateway`
- **Authentication:** Server headers `x-client-id` and `x-client-secret`.
- **Webhook Security:** Cryptographically verified using `x-webhook-signature` with HMAC-SHA256.
- **Pricing:** 1.95% per transaction on domestic Indian payment methods.
- **Failure Scenarios:** User drops off checkout, bank declines card, webhook delivery delayed.
- **Reconciliation Worker:** Scheduled Cloud Function queries Cashfree `/pg/orders/:order_id` every 15 minutes to reconcile pending payments.

### 3.4 Meta Graph API v19.0 (Instagram & Facebook Publishing)
- **Official Documentation:** `https://developers.facebook.com/docs/graph-api`
- **Required OAuth Scopes:**
  - `instagram_basic`
  - `instagram_content_publish`
  - `pages_show_list`
  - `pages_read_engagement`
  - `pages_manage_posts`
- **Approval Prerequisite:** **Meta App Review** is mandatory before public users can connect their accounts.
- **Token Management:**
  - Short-lived user token exchanged for 60-day Long-Lived Page Access Token.
  - Encrypted in Firestore using AES-256-GCM.
- **Publishing Limits:** 25 published posts per 24 hours per Instagram account.

### 3.5 LinkedIn Marketing API v2
- **Official Documentation:** `https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/share-on-linkedin`
- **Required OAuth Scopes:** `w_member_social`, `w_organization_social`
- **Approval Prerequisite:** LinkedIn Developer Portal verification.
- **Token Management:** 60-day OAuth token with refresh token rotation.
- **Publishing Formats:** Static single images (PNG/JPEG) up to 10MB; text up to 3,000 characters.

### 3.6 Resend (Transactional Email Delivery)
- **Official Documentation:** `https://resend.com/docs`
- **Primary Purpose:** 6-digit verification codes, password reset links, team invites, and PDF tax invoices.
- **Authentication:** API Key (`re_...`) via server-side SDK.
- **Pricing:** Free tier up to 3,000 emails/month; $20/month for 50,000 emails.
- **Delivery SLAs:** 99.9% delivery rate with automated DKIM, SPF, and DMARC verification.
