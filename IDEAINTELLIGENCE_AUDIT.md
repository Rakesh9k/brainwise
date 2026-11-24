# IdeaIntelligence — Comprehensive System Audit & Baseline Report

**Execution Mode:** Audit → Improve → Fix → Verify  
**Date:** 2026-11-22  
**Auditor:** Principal AI Systems Architect & Senior Full-Stack Engineer  
**Workspace:** `d:\brainwise pro\brainwise (1)`  

---

## 1. Executive Summary

IdeaIntelligence is designed as Department 1 of the BrainWise 7-department autonomous operating system. Its mandate is to take raw, early-stage business concepts and autonomously transform them into rigorous, evidence-grounded commercial research dossiers, opportunity discoveries, competitor intelligence matrices, and validation roadmaps.

This comprehensive audit evaluated the entire IdeaIntelligence stack across frontend interfaces, server-side APIs, AI orchestration agents, database repositories, evidence retrieval pipelines, and financial models.

### Key Audit Verdict
While a polished React 19 UI shell with a 15-section report viewer already exists in `src/pages/app/IdeaIntelligencePage.tsx`, the underlying system suffers from **critical functional gaps, hardcoded mock outputs, rigid multi-step form gating, and disconnected backend pipelines**. Specifically, single-sentence idea inputs were forced through a 7-step onboarding wizard, server-side validation returned hardcoded strings tailored only to BrainWise itself, deep research was not wired to all 15 sections, conversational follow-ups were missing, and the opportunity discovery engine lacked interactive exploration.

---

## 2. Inventory of Existing Implementation

| Layer | File / Route | Current State & Capability |
| :--- | :--- | :--- |
| **Frontend Page** | `src/pages/app/IdeaIntelligencePage.tsx` | Contains 4 views: `home`, `wizard` (7-step form), `progress` (timer simulation), `report` (15 sections). Uses local state + `BrainWiseContext`. |
| **Frontend Client** | `src/utils/aiClient.ts` | Calls `/api/ai/dossier` or falls back to `buildDynamicDossier` in `src/utils/logic.ts`. |
| **Frontend Logic** | `src/utils/logic.ts` (`buildDynamicDossier`) | Generates a 15-section synthetic dossier from template strings and fixed multipliers. |
| **Server Routes** | `src/server/routes/v1/researchRoutes.ts` | Endpoints: `GET /`, `POST /` (generates dossier via `aiOrchestrationService`), `GET /:reportId`, `POST /validate-idea`, `POST /market-sizing`, `GET /market-intelligence`, `POST /:reportId/convert-to-experiment`, `POST /:reportId/convert-to-tasks`. |
| **Server Routes (Legacy)** | `src/server/routes/v1/aiRoutes.ts` | Alias `POST /dossier` forwarding to `aiOrchestrationService.generateDossier`. |
| **Core Service** | `src/server/services/ideaIntelligenceService.ts` | Contains `validateIdea` with hardcoded scores and static text; contains compile errors in `truthCheck` call and parameter types. |
| **Market Sizing** | `src/server/services/marketIntelligenceService.ts` | Dual top-down and bottom-up sizing calculations with India-specific benchmarks. |
| **Research Engine** | `src/server/ai/researchEngine.ts` | Multi-vector sub-query decomposition, Tavily search (with fallback benchmarks), fact extraction, and Evidence Lake ingestion. |
| **AI Orchestrator** | `src/server/services/aiOrchestrationService.ts` | `generateDossier` only queries Gemini for 5 fields (`tamBillion`, `samSharePct`, `somSharePct`, `cagr`, `growthDrivers`), leaving the remaining 10 sections absent from backend persistence. |
| **Repository** | `src/server/repositories/researchRepository.ts` | Firestore collection `workspaces/{workspaceId}/researchReports`. |
| **Database Model** | `src/server/types/api.ts` (`ResearchReportEntity`) | Partial schema missing detailed section fields found in frontend `ResearchReport`. |

---

## 3. Detailed Gap & Defect Analysis

### 3.1 Critical Bugs & Compile Errors (Priority: CRITICAL)
1. **TypeScript Typecheck Failure in `ideaIntelligenceService.ts`**:
   - `executeTruthCheck` invoked with 3 arguments (`(content, array, array)`) instead of 2 (`(content, BusinessBrainData)`).
   - Property `remediatedText` accessed instead of `remediatedContent`.
   - Unused `userId` parameter causing `TS6133`.
2. **Hardcoded Mock Intelligence in `ideaIntelligenceService.ts`**:
   - `baseMarket = isIndianMarket ? 82 : 78; baseDemand = 80; baseCompetition = 65...`
   - Hardcoded problem: *"Founders lack accurate, continuous market and competitive intelligence, relying on intuition or fragmented static reports."* regardless of whether the user entered a chocolate business, salon, or SaaS platform.
3. **Backend-Frontend Schema Mismatch**:
   - `ResearchReportEntity` in `src/server/types/api.ts` only stores high-level TAM metrics and a summary. The 15 distinct sections (`marketOverview`, `customerSegments`, `pricingAnalysis`, `startupCostEstimates`, etc.) are stripped or generated only client-side in `buildDynamicDossier`.
   - When users refresh or reload a saved report from Firestore, detailed sections fail to hydrate unless reconstituted from local storage.

### 3.2 User Experience & Flow Obstacles (Priority: HIGH)
1. **Mandatory 7-Step Questionnaire Obstacle**:
   - Starting research forces the user through 7 sequential wizard screens: (1) Concept prompt, (2) Industry, (3) Target Market, (4) Geography, (5) Depth Tier, (6) Review, (7) Launch.
   - Violates the core product directive: *"The user should be able to enter one simple sentence (e.g. 'I want to start a chocolate business in India') and immediately initiate meaningful research without filling lengthy forms."*
2. **Artificial Progress Simulation**:
   - Research progress page uses `window.setInterval` advancing an arbitrary index every 340ms, decoupled from actual agent tasks, evidence ingestion, or verification steps.
3. **Missing Conversational Deep Research Interface**:
   - Users cannot interactively ask follow-up questions (e.g., *"Can I start this business with ₹5 lakh?"*, *"Explore premium gifting in Hyderabad"*, *"Find emerging chocolate brands in India"*).
4. **Missing Emerging Players Radar & Interactive Opportunity Cards**:
   - Opportunities are listed as plain text strings rather than structured, score-backed opportunity vectors with one-click deep investigation.
5. **No Structured Idea Finalization Workflow**:
   - Users have no comparison panel or structured approval step to validate assumptions, customize target UVP, pricing, and 90-day roadmap before graduating the idea to Business Brain.

### 3.3 AI Agent Orchestration & Research Deficiencies (Priority: HIGH)
1. **Single-Prompt Shallow AI Call**:
   - `aiOrchestrationService.generateDossier` executed a single prompt asking for 5 JSON fields. The 8 specialized agent roles (Market, Customer, Competitor, Opportunity, Financial, Business Model, Risk, Validation) were not logically orchestrated.
2. **Disconnected Evidence Lake & External Verification**:
   - While `researchEngine.ts` and `evidenceLakeRepository.ts` exist, `aiOrchestrationService` did not query or ingest real verified evidence citations into the generated report's `sources` array.

### 3.4 Financial & Economic Modelling Limitations (Priority: MEDIUM)
1. **Rigid Startup Cost Estimates**:
   - Startup cost calculations were not parameterized by user budget constraints (e.g. ₹5 Lakh lean launch vs. institutional scale).
2. **Unit Economics & Sensitivity Bounds**:
   - Sensitivity matrices in the frontend used fixed template baselines rather than dynamically computing break-even units from the specific idea's margins and pricing tiers.

---

## 4. Priority Classification Matrix

| Item | Area | Description | Severity | Target Resolution |
| :--- | :--- | :--- | :--- | :--- |
| **BUG-01** | Backend Service | Type errors and broken `executeTruthCheck` signature in `ideaIntelligenceService.ts` | **Critical** | Fix signature, align with `BusinessBrainData`, ensure `tsc --noEmit` passes. |
| **BUG-02** | AI / Data | Hardcoded BrainWise-specific copy returned for any user business idea | **Critical** | Implement dynamic Idea Understanding Engine & Orchestrator generating tailored findings for any industry. |
| **FEAT-01**| UX / Flow | Mandatory 7-step wizard blocks single-sentence natural language input | **High** | Replace wizard gate with 1-Sentence Natural Language Input → Idea Understanding Screen → Research Execution. |
| **FEAT-02**| AI Orchestration | Multi-agent research missing; only 5 metrics generated | **High** | Implement 8-agent logical orchestration producing comprehensive data for all 15 sections. |
| **FEAT-03**| Deep Research | Conversational follow-up engine missing | **High** | Add persistent conversational research endpoint and interactive drawer in report view. |
| **FEAT-04**| Opportunity | Opportunity Discovery Engine & Emerging Players Radar lack interactive depth | **High** | Implement structured Opportunity scoring and Emerging Players Radar with verified sources. |
| **FEAT-05**| Finalization | No structured idea finalization or budget feasibility calculator | **High** | Build Idea Finalization modal with ₹5L lean launch calculation and explicit approval gating before graduation. |
| **PERF-01**| Backend / DB | Report entities missing full 15-section persistence in Firestore | **High** | Expand `ResearchReportEntity` and `researchRepository` to persist complete dossier structures. |

---

## 5. Baseline Test Status
- `npm test` runs 61 suites with 518 passing tests. Existing failures were localized to Phase 2/3 reasoning mock checks.
- `src/server/phase3IdeaMarketIntelligence.test.ts` passed (5/5 tests).
- Client build (`npm run build:client`) succeeded in 590ms.
- Server build (`npm run build:server`) succeeded in 20ms.

Proceed to **Phase B: Architecture and Implementation Plan** (`IDEAINTELLIGENCE_UPGRADE_PLAN.md`).
