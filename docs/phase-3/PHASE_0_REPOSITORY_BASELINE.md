# BRAINWISE — PHASE 0: REPOSITORY DISCOVERY & ARCHITECTURAL BASELINE
**Document:** `docs/phase-3/PHASE_0_REPOSITORY_BASELINE.md`  
**Date:** November 27, 2026  
**Auditor / Architect:** Principal AI Architect, Staff Software Engineer & Security Architect  
**Status:** COMPLETE & EMPIRICALLY VERIFIED  

---

## 1. Executive Summary & Purpose

Phase 0 establishes the empirical ground-truth baseline of the entire BrainWise codebase (`d:\brainwise pro\brainwise (1)`). Before executing any architectural refactoring, we have cataloged and verified:
- **72 Backend Services** in `src/server/services/`
- **48 Data Repositories** in `src/server/repositories/`
- **29 API Route Modules** with **123 Active Endpoints** in `src/server/routes/v1/`
- **13 AI Orchestration Modules** in `src/server/ai/`
- **8 Integration Providers** in `src/server/integrations/`
- **845 Automated Tests** across **73 Test Suites** (839 passing, 6 isolated contract failures)
- All **14 Master PRD Departments** and their actual code mapping

The central finding of this baseline audit confirms:
> **BrainWise has an exceptionally solid deterministic core (credit reservations, TruthCheck, SVG vector generation, multi-tenant Firestore isolation), but suffers from severe cognitive fragmentation. Out of 72 services, only 8 genuinely invoke an LLM. Over 28 services are static templates or heuristic string generators acting as "simulated AI" without live research or adaptive reasoning.**

---

## 2. Full-Stack Architecture Inventory

### 2.1 Frontend Architecture (React 19 & Vite)
- **Framework:** React 19 (`react: 19.0.1`, `react-dom: 19.0.1`, `vite: 8.3.0`, `@tailwindcss/vite: 4.3.3`)
- **State Management:** `BrainWiseContext.tsx` (3,380 lines) acting as the global client-side state container.
- **Client Transport:** `src/services/apiClient.ts` (401 public async methods) connecting the UI to backend REST endpoints.
- **Client AI Bridge:** `src/utils/aiClient.ts` handling client-side workspace validation and fallback routing.
- **Key App Pages:**
  - `DashboardPage.tsx` (72.8 KB): Central founder cockpit and KPI tracker.
  - `BusinessBrainPage.tsx` (192.7 KB): Business Brain profile, products, personas, documents, and fact verification queue.
  - `BrandStudioPage.tsx` (215.8 KB): Logo design, typography tokens, stationery, and visual moodboards.
  - `IdeaIntelligencePage.tsx` (175.9 KB): Commercial TAM/SAM/SOM validation and market dossiers.
  - `GrowthDirectorPage.tsx` (122.9 KB): Growth agency missions, department task queues, and sprint execution.
  - `CompetitiveIntelligencePage.tsx` (139.8 KB): Competitor tracking, gap teardowns, and whitespace matrices.
  - `AssetLibraryPage.tsx` (153.1 KB): Asset lifecycle management, collections, and print-packaging prepress.
  - `AnalyticsReportsPage.tsx` (39.7 KB): Attribution telemetry, funnel metrics, and executive reports.

### 2.2 Backend Architecture (Node.js & Express)
- **Server Entrypoint:** `server.ts` (Express 4.21.2) bundling via `esbuild` to `dist/server.js`.
- **Database Layer:** Dual-mode persistence in `src/server/db/firestore.ts`:
  - Production: Google Cloud Firestore Native SDK.
  - Local/Dev/Test: In-memory document database adapter with collection-level indexing and tenant-scoped document maps.
- **Authentication & Security:** `authService.ts` and `src/server/middleware/auth.ts`:
  - Bearer token authentication via Firebase Auth / cryptographically signed session tokens.
  - Multi-tenant workspace validation via `X-Workspace-Id` header and role validation (`owner`, `admin`, `member`, `viewer`, `guest`).
- **File Storage:** `src/server/services/storageService.ts` managing Google Cloud Storage (GCS) signed upload/download URLs and local disk fallback (`.brainwise_local_storage`).
- **Billing & Subscriptions:** `src/server/billing/` and `creditService.ts`:
  - Cashfree PG integration (v2023-08-01) with HMAC-SHA256 cryptographic webhook verification.
  - ADR-006 Two-Phase Credit Reservation Protocol with atomic hold/settle/refund lifecycle.

---

## 3. The 14 PRD Departments: Service Mapping & Cognitive Reality

| Department ID & Name | Primary Route | Key Backend Services | Cognitive Nature | Real-World Assessment |
|---|---|---|---|---|
| **Dept 1: User & Workspace** | `/api/v1/workspaces`, `/api/v1/auth` | `authService.ts`, `workspaceService.ts` | 3. Deterministic | Robust RBAC, DPDPA Section 12 erasure, invite tokens. |
| **Dept 2: Onboarding** | `/api/v1/onboarding` | `onboardingService.ts`, `aiOrchestrationService.ts` | 1. Genuine AI / Hybrid | Synthesizes structured Business Brain from onboarding wizard; fallback uses deterministic profile. |
| **Dept 3: Business Brain** | `/api/v1/business-profile` | `businessBrainService.ts`, `businessContextEngine.ts`, `sharedBusinessContextService.ts` | 2. AI-Assisted Deterministic | Exceptional fact provenance schema (`USER_CONFIRMED` vs `AI_INFERRED`); caching works well. |
| **Dept 4: AI Brand Studio** | `/api/v1/assets/brand-identity`, `/api/v1/ai/brand-logo` | `logoDesignEngine.ts`, `brandGuidelinesEngine.ts`, `brandIntelligenceEngine.ts` | 4. Static Templates / Procedural Math | 2,234 lines in `brandIntelligenceEngine.ts` have zero AI calls; uses regex ternaries. `logoDesignEngine.ts` attempts Gemini SVG, falls back to procedural monograms. |
| **Dept 5: Marketing Strategy** | `/api/v1/growth`, `/api/v1/ai/playbook` | `growthDirectorService.ts`, `growthStrategyArchitect.ts`, `growthDepartmentEngines.ts` | 4. Static Templates | `growthDepartmentEngines.ts` outputs hardcoded outreach and campaign copy. Recommends SaaS bundles to restaurants. |
| **Dept 6: AI Content Studio** | `/api/v1/assets/creative` | `creativeAssetsEngine.ts`, `marketingAndVoiceEngine.ts` | 4. Procedural Layout | 2,576 lines of deterministic SVG layout generators; enforces strict zero-video boundary. |
| **Dept 7: Social Media** | `/api/v1/assets/social` | `socialMediaIntelligenceService.ts` | 4. Heuristics | Generates 5-slide educational carousels with 1:1 and 9:16 aspect ratios procedurally. |
| **Dept 8: Competitor Intelligence** | `/api/v1/competitors`, `/api/v1/market-watch` | `competitorDiscoveryEngine.ts`, `competitiveIntelligenceService.ts` | 1. Genuine AI / Hybrid | Calls Gemini 2.5 Flash for 6-10 competitors; fallback has substring bug (`repair` matches `ai` -> Zoho Books). |
| **Dept 9: Market Research** | `/api/v1/research`, `/api/v1/ai/dossier` | `researchEngine.ts`, `aiOrchestrationService.ts`, `ideaIntelligenceService.ts` | 1. Genuine AI / Hybrid | Uses Gemini for TAM/SAM/SOM sizing; researchEngine uses Tavily if keyed, returns PROVIDER_UNAVAILABLE when unkeyed. |
| **Dept 10: AI Marketing Advisor** | `/api/v1/ask-your-business`, `/api/v1/ai/chat` | `askYourBusinessService.ts`, `askYourBusinessRetrievalService.ts` | 1. Genuine AI / Hybrid | Grounded multi-turn chat with TruthCheck guardrails; retrieval is lexical string overlap, not vector embeddings. |
| **Dept 11: Task Management** | `/api/v1/tasks`, `/api/v1/department-coordination` | `departmentCoordinationService.ts`, `growthTaskEngine.ts` | 3. Deterministic | Task state machine (`QUEUED` -> `IN_PROGRESS` -> `COMPLETED`) with idempotency and human approval gates. |
| **Dept 12: Analytics & Reporting** | `/api/v1/analytics`, `/api/v1/reports` | `unifiedReportService.ts`, `marketingAttributionEngine.ts` | 3. Deterministic | Deterministic SHA-256 fingerprint deduplication; calculates conversion lifts; CSV/PDF report rendering. |
| **Dept 13: Billing & Credits** | `/api/v1/billing`, `/api/v1/credits` | `creditService.ts`, `billingRoutes.ts` | 3. Deterministic | Inviolable Cashfree checkout, webhook verification, multi-pool credit wallets, 100% atomic refund on AI error. |
| **Dept 14: Platform Admin** | `/api/v1/support`, `/api/v1/jobs` | `backgroundJobService.ts`, `auditService.ts`, `toolPermissionService.ts` | 3. Deterministic | System health monitoring, audit trail logging, SSRF defense, Cloud Task queue dispatch. |

---

## 4. Architectural Gaps & Non-Functional Baseline

1. **Statefulness in Serverless:**
   - Several services currently store in-memory maps (e.g. `sharedBusinessContextService.ts` has `private cache = new Map<string, CacheEntry>()`). In serverless cloud run instances, memory does not persist across cold starts.
2. **Missing Live Search in Default Setup:**
   - Without `TAVILY_API_KEY`, live web search is inactive. The system lacks Google Search Grounding by default on general queries.
3. **Absence of Vector Embeddings:**
   - `hybridRetrievalService.ts` computes simple token string overlaps instead of dense vector cosine similarity.
4. **Disconnected Telemetry Loop:**
   - When marketing tasks complete, analytics records telemetry, but no feedback loop calibrates future LLM prompt angles or adjusts recommendation confidence.
