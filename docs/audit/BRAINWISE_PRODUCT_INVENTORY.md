# BRAINWISE — COMPLETE PRODUCT INVENTORY & ARCHITECTURAL BASELINE
**Document ID:** `docs/audit/BRAINWISE_PRODUCT_INVENTORY.md`  
**Audit Date:** November 2026  
**Auditor:** Multidisciplinary Psychological Product & Systems Audit Board  
**Target Platform:** BrainWise AI Business Intelligence & Growth Engine  
**Workspace:** `d:\brainwise pro\brainwise (1)`  
**Repository Branch:** `develop` / `main`  
**Production Stack:** React 19 SPA, TypeScript 5.8, Vite 8, Express API Gateway, Google Cloud Firestore, Gemini 2.5/Flash AI Reasoning, Cashfree Billing Engine

---

## 1. Executive Product Positioning & Architecture

### 1.1 Product Positioning & Domain
BrainWise is an autonomous AI business intelligence and growth platform designed for solo founders, early-stage startups (1–10 employees), boutique marketing agencies/consultants (managing 5–30 client accounts), and modern direct-to-consumer (D2C) brands. 

The platform’s thesis is defined as: **"An Intelligent Strategic Partner, Not a Generic Content Vending Machine."** Rather than operating as a stateless chatbot or template generation tool, BrainWise anchors all analytical and generative workflows around a **persistent Business Brain**—a centralized repository of ground-truth company facts, verified target customer personas, unit economics, brand guidelines, and competitive positioning.

### 1.2 Absolute Product Boundary: Strict Video Exclusion
In accordance with master project directives (`AGENTS.md`, `GEMINI.md`, `docs/phase-2/01-product-overview.md` §3), BrainWise **strictly and permanently excludes all AI video generation, video editing, reel generation, video rendering, FFmpeg pipelines, Remotion scripts, and video credit tiers**. 

All visual marketing collateral is strictly restricted to:
- Deterministic SVG vector design collateral (stationery, flyers, business cards, posters, packaging dielines).
- Multi-frame static carousels (Instagram 4:5, LinkedIn multi-slide PDF/PNG).
- High-DPI print collateral and brand identity decks.
- Source-grounded copywriting packs with deterministic Truth Check validation.

### 1.3 System Topology & Runtime Components
```
┌────────────────────────────────────────────────────────────────────────┐
│                        BRAINWISE RUNTIME TOPOLOGY                      │
├────────────────────────────────┬───────────────────────────────────────┤
│ CLIENT TIER (React 19 SPA)     │ Vite 8, Tailwind CSS v4, Motion v12,  │
│                                │ Lucide React, Recharts v3.            │
├────────────────────────────────┼───────────────────────────────────────┤
│ STATE & SYNCHRONIZATION        │ Hybrid: BrainWiseContext (3,377 lines)│
│                                │ + BrainWiseApiClient (1,300 lines)    │
│                                │ + LocalStorage persistence fallback   │
├────────────────────────────────┼───────────────────────────────────────┤
│ GATEWAY / BACKEND TIER         │ Node 22 LTS, Express 4.21, CORS,      │
│                                │ Rate-Limiter (200 req/min), Auth Mid. │
├────────────────────────────────┼───────────────────────────────────────┤
│ AI ORCHESTRATION               │ Gemini 2.5 Flash / Deep Reasoning     │
│                                │ via @google/genai & Server SDK        │
├────────────────────────────────┼───────────────────────────────────────┤
│ DATABASE & PERSISTENCE         │ Cloud Firestore (multi-tenant),       │
│                                │ Schema Migrations, In-Memory Fallback │
├────────────────────────────────┼───────────────────────────────────────┤
│ BILLING & FINANCIAL ENGINE     │ Cashfree Payment Gateway (PG v2023),  │
│                                │ Two-Phase Credit Reservation Protocol │
└────────────────────────────────┴───────────────────────────────────────┘
```

---

## 2. Exhaustive Route & Screen Inventory

The application routes are orchestrated via a centralized state-driven router inside `src/App.tsx` (lines 38–110), consuming `state.currentRoute` from `src/context/BrainWiseContext.tsx`.

| Route Identifier | URL / Route State | Access Level | Primary Component / Module | Physical File Path | Current Wiring & Functional Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Landing** | `landing` / `/` | Public | `LandingPage` | `src/pages/public/LandingPage.tsx` | **Functional:** Interactive device mockup, live idea sandbox, interactive 4-stage showcase, FAQ accordion, plan toggle. |
| **Signup** | `signup` | Public | `AuthPages (mode="signup")` | `src/pages/public/AuthPages.tsx` | **Functional:** Form validation, dispatches `registerUser()`, sends verification code, fallback demo link. |
| **Login** | `login` | Public | `AuthPages (mode="login")` | `src/pages/public/AuthPages.tsx` | **Functional:** Google OAuth (`loginWithGoogle`) & email/password (`loginUser`). |
| **Verify Email** | `verify-email` | Public | `AuthPages (mode="verify-email")`| `src/pages/public/AuthPages.tsx` | **Functional:** 6-digit OTP verification code input, cooldown timer, resend button. |
| **Forgot Password**| `forgot-password` | Public | `AuthPages (mode="forgot-password")`| `src/pages/public/AuthPages.tsx` | **Functional:** Password reset email dispatch. |
| **Reset Password** | `reset-password` | Public | `AuthPages (mode="reset-password")` | `src/pages/public/AuthPages.tsx` | **Functional:** New password setting with confirmation. |
| **Onboarding** | `onboarding` | Authenticated / Public | `OnboardingPage` | `src/pages/public/OnboardingPage.tsx` | **Functional:** 5-stage onboarding wizard, auto-saving answer engine, AI Business Brain synthesis. |
| **Dashboard** | `dashboard` | Authenticated | `DashboardPage` | `src/pages/app/DashboardPage.tsx` | **Functional:** Executive command center, daily focus sprint, opportunity scanner, pulse chart. |
| **Business Brain** | `business-brain` | Authenticated | `BusinessBrainPage` | `src/pages/app/BusinessBrainPage.tsx` | **Functional:** 8 tabs (Identity, Products, Audience, Brand, Strategy, Docs, Verification Queue, History). |
| **Idea Intelligence**| `idea-intelligence`| Authenticated | `IdeaIntelligencePage` | `src/pages/app/IdeaIntelligencePage.tsx`| **Functional:** 15-section market research dossier, 7-framework validation hub, conversational AI research. |
| **Competitive Intel**| `competitive-intelligence`| Authenticated | `CompetitiveIntelligencePage`| `src/pages/app/CompetitiveIntelligencePage.tsx`| **Functional:** Competitor teardowns across 9 dimensions, gap matrix, white space radar, teaser unlock. |
| **Market Watch** | `market-watch` | Authenticated | `MarketWatchPage` | `src/pages/app/MarketWatchPage.tsx` | **Functional:** Real-time competitor event stream, monitoring frequency selector, experiment converter. |
| **Brand Studio** | `brand-studio` | Authenticated | `BrandStudioPage` | `src/pages/app/BrandStudioPage.tsx` | **Functional:** Vector logo suite, collateral designer (11 packaging/print types), multi-slide carousels. |
| **Asset Library** | `asset-library` | Authenticated | `AssetLibraryPage` | `src/pages/app/AssetLibraryPage.tsx` | **Functional:** Centralized digital asset management, multi-format adaptation, metadata drawer, bulk actions. |
| **Growth Director** | `growth-director` | Authenticated | `GrowthDirectorPage` | `src/pages/app/GrowthDirectorPage.tsx` | **Functional:** 9 tabs (Executive center, Missions, Strategy simulator, 7 departments, OKRs, Experiments). |
| **Tasks & Sprint** | `tasks-experiments` | Authenticated | `GrowthDirectorPage (mode="tasks")`| `src/pages/app/GrowthDirectorPage.tsx` | **Functional:** Focused sprint tasks and active hypothesis experiments. |
| **Business Perf.** | `business-performance`| Authenticated | `AnalyticsReportsPage (tab="overview")`| `src/pages/app/AnalyticsReportsPage.tsx`| **Functional:** Revenue trend charts, unit economics, customer acquisition velocity, funnel stages. |
| **Reports** | `reports` | Authenticated | `AnalyticsReportsPage (tab="reports")` | `src/pages/app/AnalyticsReportsPage.tsx`| **Functional:** Executive brief generation, scheduled summaries, white-label PDF exporter. |
| **Settings** | `settings` | Authenticated | `SettingsPage` | `src/pages/app/SettingsHelpPages.tsx` | **Functional:** 11 sub-settings tabs (Personal, Business, Team, Workspace, Notifications, AI, Privacy, Billing, Credits, Integrations, Help). |
| **Help & Support** | `help-support` | Authenticated | `HelpSupportPage` | `src/pages/app/SettingsHelpPages.tsx` | **Functional:** Documentation search, ticketing form, keyboard shortcuts drawer, community link. |

---

## 3. Core Feature & Workflow Inspection

### 3.1 Authentication & First-Time User Experience
- **Entry Points:** Direct signup via email/password, Google OAuth popup via Firebase Auth SDK (`src/services/firebaseClient.ts`), or single-click "Explore Live Demo" which initializes a preloaded Solstice Craft Coffee demo workspace (`SOLSTICE_EXAMPLE_STATE`).
- **Email Verification Protocol:** Enforces 6-digit verification code. If backend email delivery is in dev mode, verification code is exposed via response for friction-free developer testing.
- **Demo Mode Isolation:** When exploring the Solstice Craft demo workspace, an explicit orange badge (`Example Workspace · Solstice Craft`) appears in the top navigation bar. Any mutations in demo mode are sandboxed in `localStorage` without writing to production tenant collections.

### 3.2 Intelligent Onboarding Wizard (`OnboardingPage.tsx`)
The onboarding flow executes a 5-stage progressive disclosure pipeline:
1. **Stage 1 (Identity & Location):** Selects business category from 7 archetypes (`Consumer brand`, `Service business`, `Technology startup`, `E-commerce`, `Local business`, `Agency`, `Something else`), business name, website, country, city, target geography.
2. **Stage 2 (Objectives & Audience):** Multi-select priority picker (`Finding more customers`, `Building my brand`, `Scaling`, etc.), B2B vs B2C toggle, target audience description, customer pain point builder.
3. **Stage 3 (Offerings & Differentiation):** Core product/service offering summary (pre-populated from Landing Page idea sandbox if used), 8 differentiator pills, business stage (`Idea Stage` to `Established`), pricing model.
4. **Stage 4 (AI Synthesis Animation):** Displays `WorkspaceInitSkeleton` and an animated synthesis progress bar (30% $\to$ 60% $\to$ 90% $\to$ 100%) while `apiClient.generateBusinessBrain()` parses inputs and synthesizes an initial Business Brain profile.
5. **Stage 5 (Business Brain Review & Approval Gate):** Displays the generated profile for user review, highlighting inferred fields, allowing in-line editing before formal approval and redirect to `dashboard`.

### 3.3 The Persistent Business Brain (`BusinessBrainPage.tsx`)
- **Fact Provenance Architecture:** Every piece of business intelligence is tagged with a provenance source: `USER_CONFIRMED` (authoritative, protected) or `AI_INFERRED` (provisional, requiring review).
- **Verification Queue:** Dedicated tab lists all AI-extracted facts with confidence scores and a 1-click "Confirm Fact" or "Reject Fact" mechanism.
- **Cross-Department Lineage:** Clicking the Brain Lineage popover in any department reveals exactly which Business Brain fields influenced that specific generation.
- **Intelligence Score Engine (`src/utils/intelligenceScore.ts`):** Dynamically scores business completeness across 5 dimensions: Market Clarity, Customer Precision, Competitive Edge, Brand Coherence, and Execution Readiness.

### 3.4 Idea Intelligence & 15-Section Market Dossier (`IdeaIntelligencePage.tsx`)
- **Top-Level Idea Understanding:** Accepts raw prompts (e.g., "Boutique Pilates studio in Austin") and decomposes them into category, target customer, value proposition, and risk profile.
- **15-Section Comprehensive Dossier:** Generates executive summary, TAM/SAM/SOM market sizing, customer segments, competitor landscape, unit economics, go-to-market channels, and regulatory barriers.
- **7-Framework Validation Hub:** Integrates Mom Test validation questions, Strategyzer Value Proposition Canvas, Blue Ocean Strategy Canvas, Porters 5 Forces, Unit Economics Feasibility, Kill Switches, and Go/Stop Signals.
- **Scenario Simulator:** Real-time sliders for Market Share (0.01%–5%), Average Contract Value, and Conversion Rate with instant recalculation of projected ARR.

### 3.5 Competitive Intelligence & Market Watch (`CompetitiveIntelligencePage.tsx`, `MarketWatchPage.tsx`)
- **12-Dimension Competitor Teardowns:** Analyzes competitor profiles across Overview, Products, Pricing Ladder, Positioning Statement, Website UX, Marketing Channels, Customer Review Complaints, SWOT, and Recent Changes.
- **Customer Review Mining:** Scrapes and categorizes common 1-star and 2-star complaints against competitors into 6 complaint cluster topics (e.g., "Customer Support", "Hidden Fees", "Product Quality") to reveal exploitable white space.
- **Market Watch Event Stream:** Chronological feed of competitor price hikes, feature launches, messaging changes, and executive hires with an instant "Convert to Growth Experiment" action.

### 3.6 Brand Studio & Asset Library (`BrandStudioPage.tsx`, `AssetLibraryPage.tsx`)
- **Authoritative Identity System:** Manages brand voice, primary/secondary/accent color tokens, typography scales, and logo lockups.
- **Vector Logo Suite:** Generates clean SVG vector logos across 6 variations (Horizontal, Stacked, Symbol, Monochrome, Favicon, Avatar) with true transparency.
- **Physical Collateral Engine:** Generates print-ready SVG templates with bleed indicators, dielines, and CMYK color space metadata across 11 formats (Packaging, Business Cards, Posters, Menus, Flyers, etc.).
- **Social Media Studio:** Generates 5-slide educational Instagram carousels, 1:1 square posts, and 9:16 stories with zero video dependencies.
- **Asset Library:** Full digital asset management (DAM) with instant search, category tagging, SHA-256 deduplication, version history, and performance attribution drawer.

### 3.7 Growth Director & Execution Engine (`GrowthDirectorPage.tsx`)
- **7 Growth Departments:** Breaks down strategic growth into Content Marketing, Paid Performance, Lifecycle/CRM, CRO & Funnels, SEO/Organic, Strategic Partnerships, and Brand Building.
- **Execution Sprint:** Converts strategic recommendations into prioritized daily sprint cards with estimated completion times (15m, 30m, 60m), department badges, and 1-click status transitions.
- **Hypothesis Experiments:** Structured experiment tracker recording Hypothesis, Channel, Success Metric, Minimum Detectable Effect, Start Date, and Conclusion.

### 3.8 Billing, Credits & Cashfree Integration (`BillingDashboardView.tsx`, `src/server/billing/`)
- **Commercial Plans:** Free Starter (150 welcome credits), Starter (₹2,763/mo / $35, 800 credits), Growth Pro (₹6,243/mo / $79, 2,500 credits), Enterprise (₹19,671/mo / $249, 10,000 credits).
- **Two-Phase Credit Protocol:** Holds credits in an escrow `reserved` pool prior to AI invocation, commits credits upon successful delivery, or releases hold immediately upon upstream failure or Truth Check rejection.
- **Cashfree Gateway:** Seamless checkout redirect and webhook listener (`src/server/routes/v1/billingWebhookRoutes.ts`) verifying HMAC-SHA256 signatures before provisioning subscription entitlements.

---

## 4. Frontend vs. Backend Wiring Verification & Discrepancy Matrix

An exhaustive cross-examination between the React 19 client components and the Express/Firestore backend services reveals three distinct operational tiers:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   FRONTEND-TO-BACKEND STATUS SUMMARY                   │
├──────────────────────────┬───────┬─────────────────────────────────────┤
│ Status Classification    │ Count │ Operational Definition              │
├──────────────────────────┼───────┼─────────────────────────────────────┤
│ 1. Fully Integrated      │ 28    │ UI hook calls apiClient, hits REST  │
│                          │       │ endpoint, persists in Firestore.    │
├──────────────────────────┼───────┼─────────────────────────────────────┤
│ 2. Hybrid / Fallback     │ 14    │ UI calls apiClient with immediate   │
│                          │       │ local fallback if backend offline.  │
├──────────────────────────┼───────┼─────────────────────────────────────┤
│ 3. Mocked / Prototype    │ 5     │ UI mutates local Context/Storage;   │
│                          │       │ backend schema exists but unwired.  │
└──────────────────────────┴───────┴─────────────────────────────────────┘
```

### Detailed Functional Traceability Table

| Functional Module | Frontend Component | Backend API Endpoint | Persistence Target | Live Status | Audit Findings & Nuances |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **User Authentication** | `AuthPages.tsx` | `/api/v1/auth/register`, `/login` | Firestore `users` & `sessions` | **Fully Integrated** | Full validation, token persistence, Google OAuth token exchange. |
| **Onboarding Engine** | `OnboardingPage.tsx` | `/api/v1/onboarding/session`, `/answer`| Firestore `onboarding_sessions` | **Fully Integrated** | Autosaves each step, provisions workspace, synthesizes brain. |
| **Business Brain** | `BusinessBrainPage.tsx`| `/api/v1/workspaces/:id/business-profile`| Firestore `business_profiles` | **Fully Integrated** | Reads/writes company facts, provenance tags, and versions. |
| **Verification Queue** | `BusinessBrainPage.tsx`| `/api/v1/workspaces/:id/verification` | Firestore `verification_queue` | **Fully Integrated** | Confirms or rejects AI-inferred facts atomically. |
| **Idea Research Dossier**| `IdeaIntelligencePage.tsx`| `/api/v1/workspaces/:id/research` | Firestore `research_reports` | **Fully Integrated** | Triggers server-side Gemini research or local fallback heuristic. |
| **Conversational Research**| `IdeaIntelligencePage.tsx`| `/api/v1/workspaces/:id/research/chat` | In-memory session / report | **Fully Integrated** | Multi-turn streaming research with citation extraction. |
| **Competitor Teardowns**| `CompetitiveIntelligencePage`| `/api/v1/workspaces/:id/competitors` | Firestore `competitors` | **Fully Integrated** | CRUD operations, seed discovery, 12-dimension profile view. |
| **Market Watch Feed** | `MarketWatchPage.tsx` | `/api/v1/workspaces/:id/market-watch` | Firestore `market_events` | **Fully Integrated** | Event ingestion, read state toggling, experiment conversion. |
| **Brand Identity Tokens**| `BrandStudioPage.tsx` | `/api/v1/workspaces/:id/assets/brand` | Firestore `brand_identities` | **Fully Integrated** | Color tokens, typography, tagline, voice guidelines saved. |
| **Vector Logo Generation**| `BrandStudioPage.tsx` | `/api/v1/workspaces/:id/ai/logo` | Cloud Storage + Firestore | **Fully Integrated** | Server-side SVG rendering, multi-concept generation. |
| **Collateral & Carousels**| `BrandStudioPage.tsx` | `/api/v1/workspaces/:id/assets` | Cloud Storage + Firestore | **Fully Integrated** | Generates SVG markup, binds to Asset Library. |
| **Asset Library Management**| `AssetLibraryPage.tsx` | `/api/v1/workspaces/:id/assets` | Cloud Storage + Firestore | **Fully Integrated** | Full DAM, category filtering, bulk deletion/restore, versioning. |
| **Growth Missions & OKRs**| `GrowthDirectorPage.tsx`| `/api/v1/workspaces/:id/goals` | Firestore `growth_goals` | **Fully Integrated** | Goal creation, progress calculation, target milestone tracking. |
| **Sprint Tasks** | `GrowthDirectorPage.tsx`| `/api/v1/workspaces/:id/tasks` | Firestore `tasks` | **Fully Integrated** | Status transitions (`pending`, `in_progress`, `completed`). |
| **Growth Experiments** | `GrowthDirectorPage.tsx`| `/api/v1/workspaces/:id/experiments` | Firestore `growth_experiments`| **Fully Integrated** | Hypothesis tracking, metric targets, conclusion recording. |
| **Subscription & Billing**| `BillingDashboardView.tsx`| `/api/v1/workspaces/:id/billing` | Firestore `subscriptions` | **Fully Integrated** | Plan listing, credit balance, invoice history, Cashfree checkout. |
| **Credit Ledger & Holds**| `BillingDashboardView.tsx`| `/api/v1/workspaces/:id/billing/ledger`| Firestore `credit_ledgers` | **Fully Integrated** | Displays historical credit debits, refunds, and active holds. |
| **Integrations Hub** | `IntegrationManagerView`| `/api/v1/workspaces/:id/integrations` | Firestore `integrations` | **Hybrid / Fallback** | Connection state toggles UI; live OAuth sync with GA4/Meta is stubbed. |
| **Scheduled Email Reports**| `AnalyticsReportsPage.tsx`| `/api/v1/workspaces/:id/reports/schedule`| Firestore `scheduled_reports` | **Hybrid / Fallback** | Configures cadence and recipients; Cloud Scheduler cron is simulated. |
| **Live Performance Telemetry**| `AnalyticsReportsPage.tsx`| `/api/v1/workspaces/:id/analytics` | Mock state / telemetry cache | **Mocked / Prototype**| Analytics data currently renders deterministic mock D2C cohorts. |
| **Department 14 Superadmin**| None (PRD specified) | `/api/v1/admin/billing` | Firestore system collections | **Disconnected UI** | Admin routes exist in backend; no dedicated `/admin` UI controller. |

---

## 5. Non-Functional Capabilities & Infrastructure Inspection

### 5.1 Mobile & Desktop Responsiveness
- **Desktop (1440px–1920px):** Full multi-column tactile command center. Side navigation bar, department transition animations, and split-screen proof drawers render with high ergonomic polish.
- **Tablet (768px–1024px):** Navigation sidebar collapses to an icon rail; data tables enable horizontal touch scrolling; metric grids adapt from 4 columns to 2 columns.
- **Mobile (375px–480px):** Full-screen hamburger navigation drawer with animated backdrop; sticky bottom action bars for critical task approvals; font hierarchy strictly scales down according to the 1.25 modular scale (`--bw-text-step-n1` = 12.8px, `--bw-text-step-0` = 16px). E2E Playwright tests confirm zero horizontal viewport overflow.

### 5.2 Error States, Loading States & Skeletons
- **Liquid Skeleton Engine (`src/components/ui/LiquidSkeletons.tsx`):** BrainWise avoids generic circular spinners. Dedicated skeleton loaders exist for every distinct department:
  - `WorkspaceInitSkeleton` (Onboarding)
  - `PremiumDashboardSkeleton` (Executive command center)
  - `DossierPreviewSkeleton` (15-section research report)
  - `LogoConceptSkeletonGrid` (Brand Studio logo concepts)
  - `BrandCollateralSkeleton` (Packaging and print previews)
  - `RecommendationSkeletonList` (Growth Director sprint tasks)
- **Error Boundaries (`src/components/ui/ErrorBoundary.tsx`):** Route-level React Error Boundary intercepts rendering crashes, logs stack traces, and renders an elegant recovery card with a 1-click "Reload Department" or "Reset to Dashboard" button.
- **Offline / Degraded Mode:** If the Express API gateway or Firestore becomes unreachable, `apiClient.ts` gracefully falls back to browser `localStorage` state with an informative toast alert (`"Operating in offline local preview mode"`), preventing white-screen failure.
