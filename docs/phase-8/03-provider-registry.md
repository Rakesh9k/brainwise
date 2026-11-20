# BRAINWISE — PHASE 8: THIRD-PARTY PROVIDER REGISTRY SPECIFICATION
**Document ID:** `docs/phase-8/03-provider-registry.md`  
**Phase:** 8 — External Integrations, Connectivity & Intelligent Automation Engine  
**Status:** Approved & Implemented in Production  

---

## 1. Provider Ecosystem Summary

BrainWise Phase 8 implements an enterprise suite of 9 third-party provider adapters. Each provider adheres to the `IIntegrationProvider` interface, providing predictable lifecycle hooks, health monitoring, error translation, and data normalization.

| # | Provider ID | Official Name | Category | Auth Type | Safety Classification | Production Status |
|---|-------------|---------------|----------|-----------|------------------------|-------------------|
| 1 | `google-research` | Google Search & Industry Research | Research | API Key / Managed | Cat A (Read-Only) | **Fully Implemented** |
| 2 | `google-analytics-4` | Google Analytics 4 | Website & SEO | OAuth 2.0 | Cat A (Read-Only) | **Fully Implemented** |
| 3 | `google-search-console` | Google Search Console | Website & SEO | OAuth 2.0 | Cat A (Read-Only) | **Fully Implemented** |
| 4 | `google-business-profile` | Google Business Profile | Local Business | OAuth 2.0 | Cat A / Cat C | **Implemented Awaiting Approval** |
| 5 | `email-service` | Transactional Email Gateway | Communication | API Key / SMTP | Cat C (External Write) | **Fully Implemented** |
| 6 | `meta-instagram` | Meta / Instagram Professional | Social Media | OAuth 2.0 | Cat A / Cat C | **Implemented Awaiting Approval** |
| 7 | `linkedin-marketing` | LinkedIn Pages & Ads | Social Media | OAuth 2.0 | Cat A / Cat C | **Implemented Awaiting Approval** |
| 8 | `youtube-data` | YouTube Data API (Analytics) | Social Media | OAuth 2.0 | Cat A (Read-Only) | **Fully Implemented (Read-Only)** |
| 9 | `google-drive` | Google Drive API | Storage & Docs | OAuth 2.0 | Cat A / Cat C | **Fully Implemented** |

---

## 2. Detailed Provider Specifications

### 2.1 Provider 1: Google Research & Search (`google-research`)
- **Adapter Location:** `src/server/integrations/providers/googleResearchProvider.ts`
- **Capabilities:** Grounded market research, competitor footprint scanning, pricing tier extraction, industry benchmark ingestion.
- **Authentication:** Server-side managed Custom Search API / Tavily research keys.
- **Data Ingestion:** Emits `market_research` and `industry_benchmark` records with full citation URLs, publication dates, and confidence scores.
- **Department Routing:** Feeds into Idea Intelligence, Competitive Intelligence, Market Watch, and Business Brain.

### 2.2 Provider 2: Google Analytics 4 (`google-analytics-4`)
- **Adapter Location:** `src/server/integrations/providers/googleAnalytics4Provider.ts`
- **Capabilities:** Active users, sessions, screen pageviews, user engagement rate, average session duration, top landing pages, and traffic acquisition channels.
- **Authentication:** OAuth 2.0 with PKCE. Required Scope: `https://www.googleapis.com/auth/analytics.readonly`.
- **Derived Analytics:** Computes 30-day and 7-day period-over-period delta percentages to automatically detect traffic growth or decline anomalies.
- **Department Routing:** Feeds into Growth Planner, Analytics & Reports, and Market Watch.

### 2.3 Provider 3: Google Search Console (`google-search-console`)
- **Adapter Location:** `src/server/integrations/providers/googleSearchConsoleProvider.ts`
- **Capabilities:** Organic search impressions, clicks, average click-through rate (CTR), and average search ranking position.
- **Authentication:** OAuth 2.0. Required Scope: `https://www.googleapis.com/auth/webmasters.readonly`.
- **Specialized Intelligence:** Identifies high-impression, low-CTR keywords to generate high-leverage meta-title and content optimization recommendations.
- **Department Routing:** Feeds into Growth Planner, Analytics & Reports, and Idea Intelligence.

### 2.4 Provider 4: Google Business Profile (`google-business-profile`)
- **Adapter Location:** `src/server/integrations/providers/googleBusinessProfileProvider.ts`
- **Capabilities:** Local search impressions, Google Maps views, customer phone call clicks, direction request inquiries, and review sentiment scores.
- **Authentication:** OAuth 2.0. Required Scope: `https://www.googleapis.com/auth/business.manage`.
- **Approval Classification:** *Implemented Awaiting Approval* (Requires Google Organization Verification in production GCP Console). Fallback mock telemetry active for sandbox environments.
- **Department Routing:** Feeds into Growth Planner, Competitive Intelligence, and Analytics & Reports.

### 2.5 Provider 5: Transactional Email Gateway (`email-service`)
- **Adapter Location:** `src/server/integrations/providers/emailProvider.ts`
- **Capabilities:** Outbound transactional email delivery, founder briefing dispatch, board report delivery, automated integration health warnings.
- **Authentication:** Managed Resend API gateway or custom SMTP relay credentials.
- **Safety Safeguards:**
  - Idempotency deduplication keys prevent accidental duplicate sends.
  - Three-Tier Safety Gate: Class C external write enforcement ensures human approval before automated outbound emails are dispatched.
- **Department Routing:** Feeds into Analytics & Reports, Settings & Administration.

### 2.6 Provider 6: Meta / Instagram Professional (`meta-instagram`)
- **Adapter Location:** `src/server/integrations/providers/metaInstagramProvider.ts`
- **Capabilities:** Instagram business profile follower count, 30-day impressions, organic reach, and engagement rate across static carousel posts.
- **Authentication:** OAuth 2.0 via Facebook Graph API v19.0. Scopes: `instagram_basic`, `pages_show_list`, `instagram_manage_insights`.
- **Approval Classification:** *Implemented Awaiting Approval* (Requires Meta App Review for business verification). High-fidelity local adapter active for staging.
- **Department Routing:** Feeds into Brand Studio, Growth Planner, and Analytics & Reports.

### 2.7 Provider 7: LinkedIn Marketing & Company Pages (`linkedin-marketing`)
- **Adapter Location:** `src/server/integrations/providers/linkedinProvider.ts`
- **Capabilities:** Company page follower count, monthly impressions, visitor demographics (industry breakdown, seniority distribution), and click-through rates.
- **Authentication:** OAuth 2.0. Scopes: `r_organization_social`, `rw_organization_admin`.
- **Approval Classification:** *Implemented Awaiting Approval* (Subject to LinkedIn Developer Enterprise App Review).
- **Department Routing:** Feeds into Brand Studio, Growth Planner, and Market Watch.

### 2.8 Provider 8: YouTube Data API (`youtube-data`)
- **Adapter Location:** `src/server/integrations/providers/youtubeProvider.ts`
- **Capabilities:** Channel subscriber count, lifetime channel views, video view velocity, and audience retention metrics.
- **Authentication:** OAuth 2.0. Scope: `https://www.googleapis.com/auth/youtube.readonly`.
- **CRITICAL ARCHITECTURAL DIRECTIVE (STRICT VIDEO EXCLUSION):**
  - BrainWise explicitly excludes AI video generation, video editing, reel generation, or video credits.
  - YouTube Data API is dedicated strictly to analytical read-only channel telemetry. Write action execution is permanently blocked and rejected with an architectural boundary error.
- **Department Routing:** Feeds into Analytics & Reports and Growth Planner.

### 2.9 Provider 9: Google Drive API (`google-drive`)
- **Adapter Location:** `src/server/integrations/providers/googleDriveProvider.ts`
- **Capabilities:** Automated executive report export, PDF dossier syncing, strategy scorecard distribution to shared company Google Drive folders.
- **Authentication:** OAuth 2.0. Scope: `https://www.googleapis.com/auth/drive.file` (Restricted to files opened or created by BrainWise).
- **Safety Safeguards:** Limited strictly to user-designated BrainWise folders (`drive.file`), preventing broad drive access.
- **Department Routing:** Feeds into Analytics & Reports, Business Brain, and Brand Studio.
