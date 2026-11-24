# IdeaIntelligence — Master Upgrade & Architectural Plan

**Module:** Department 1 (Idea Intelligence)  
**Status:** Approved for Implementation  
**Architect:** Principal AI Systems Architect & Senior Full-Stack Engineer  
**Workspace:** `d:\brainwise pro\brainwise (1)`  

---

## 1. Target Architecture Overview

IdeaIntelligence will operate as an autonomous, multi-dimensional business research and opportunity validation engine. The architecture adheres to all Master Directives:
- **Zero Video / Static SVG Only** boundary.
- **Two-Phase Credit Reservation Protocol (ADR-006)**.
- **Persistent Business Brain Context (`src/types/brain.ts`)**.
- **Deterministic Truth Engine & Anti-Fatigue Verification**.
- **Client-Side Design Freeze (React 19)**: Existing layout aesthetics, typography tokens, and design components (`DesignSystem.tsx`, `DepartmentCards.tsx`) are preserved and enriched without visual regressions.

```
+--------------------------------------------------------------------------------+
|                             USER ENTRYPOINT                                    |
|             "I want to start a chocolate business in India."                   |
|                        (Single Natural Sentence)                               |
+--------------------------------------------------------------------------------+
                                       |
                                       v
+--------------------------------------------------------------------------------+
|                        IDEA UNDERSTANDING ENGINE                               |
|   Extracts: Concept, Industry, Sub-Industry, Category, Customer Personas,      |
|   Geography (Explicitly Disclosed Assumptions), Business Models, Incumbents,   |
|   Research Questions, Missing Data, and Key Assumptions.                       |
+--------------------------------------------------------------------------------+
                                       |
                   [User approves or optionally edits assumptions]
                                       |
                                       v
+--------------------------------------------------------------------------------+
|                     RESEARCH ORCHESTRATION ENGINE                              |
|   Coordinates 8 Logical Capabilities (Parallel & Evidence-Grounded):           |
|     1. Market Intelligence       5. Financial & Unit Economics Intelligence   |
|     2. Customer Intelligence     6. Business Model Intelligence                |
|     3. Competitor Intelligence   7. Risk & Barrier Intelligence                |
|     4. Opportunity Discovery     8. Validation Experiment Intelligence         |
+--------------------------------------------------------------------------------+
                                       |
                                       v
+--------------------------------------------------------------------------------+
|                        15-SECTION RESEARCH DOSSIER                             |
|   01. Executive Summary          06. Customer Pain Points  11. Revenue Model   |
|   02. Market Overview            07. Competitor Landscape  12. Startup Costs   |
|   03. TAM / SAM / SOM (Dual)     08. Pricing Analysis      13. Risks & Barriers|
|   04. Market Demand Signals      09. Market Opportunities  14. Experiments     |
|   05. Customer Segments          10. Business Models       15. Strategic Verdict|
+--------------------------------------------------------------------------------+
         |                                           |
         v                                           v
+-----------------------------+           +--------------------------------------+
| OPPORTUNITY DISCOVERY &     |           | CONVERSATIONAL DEEP RESEARCH ENGINE  |
| EMERGING PLAYERS RADAR      |           | - Persistent report session context  |
| - Attractiveness Scoring    |           | - ₹5 Lakh lean launch feasibility    |
| - White-space gaps          |           | - Sub-niche & competitor deep-dives  |
| - New entrant discovery     |           | - Real-time section metric updates   |
+-----------------------------+           +--------------------------------------+
         \                                           /
          --------------------   --------------------
                              \ /
                               v
+--------------------------------------------------------------------------------+
|                     IDEA REFINEMENT & FINALIZATION                             |
|   - Multi-direction comparison                                                 |
|   - Feasibility check (Budget, Timeline, Unit Economics)                       |
|   - Explicit User Approval Gate                                                |
|   - Graduation to Business Brain (`graduateIdeaToBrain`)                       |
+--------------------------------------------------------------------------------+
```

---

## 2. Logical Agent Specifications & Responsibilities

1. **Market Research Intelligence**:
   - Industry maturity, growth drivers, macroeconomic indicators, India-specific dynamics (UPI, tier 1-3 infrastructure, GST/FSSAI regulatory conditions).
2. **Customer Intelligence**:
   - Primary/secondary segments, purchase triggers, urgency levels, willingness-to-pay criteria, high-value early-adopter wedges.
3. **Competitor Intelligence**:
   - Direct, indirect, and emerging market entrants. Profiles pricing, distribution, positioning, strengths, and vulnerabilities without fabrication.
4. **Opportunity Discovery Intelligence**:
   - Uncovers underserved segments, premiumization wedges, distribution white spaces, regional expansion angles, and Blue Ocean moves.
5. **Financial Intelligence**:
   - Unit economics (CAC, LTV, payback, gross/contribution margins), transparent break-even models, lean launch budget scenarios (e.g. ₹5 Lakh vs ₹25 Lakh).
6. **Business Model Intelligence**:
   - Evaluates D2C, B2B, Marketplace, Subscription, and Hybrid structures with complexity and margin trade-offs.
7. **Risk Intelligence**:
   - Operational, regulatory, customer acquisition, and platform dependency risks with explicit mitigation playbooks.
8. **Validation Intelligence**:
   - Actionable, low-cost smoke tests, pre-order landing page experiments, customer discovery scripts, and quantifiable kill-switch failure conditions.

---

## 3. Database & Schema Enhancements

### 3.1 Entity Expansion (`src/server/types/api.ts` & `src/types/brainwise.ts`)
Update `ResearchReportEntity` to store the complete 15-section payload in Firestore (`workspaces/{workspaceId}/researchReports/{reportId}`) so that:
- Refreshes, multiple tabs, and session recoveries preserve all detailed sections.
- Reports retain `conversationalHistory`, `emergingPlayers`, `opportunityAttractivenessMatrix`, and `finalizationStatus`.

---

## 4. API Endpoints Specification

| Method | Path | Auth / Role | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/workspaces/:workspaceId/research/understand-idea` | Member+ | Takes raw prompt sentence, returns 12-dimension extraction & disclosed assumptions. |
| `POST` | `/api/v1/workspaces/:workspaceId/research/orchestrate` | Member+ | Executes 8-agent orchestrated research, produces complete 15-section dossier, reserves & settles credits. |
| `POST` | `/api/v1/workspaces/:workspaceId/research/:reportId/conversation` | Member+ | Conversational research endpoint for interactive follow-ups and budget feasibility checks. |
| `GET`  | `/api/v1/workspaces/:workspaceId/research/emerging-players` | Member+ | Retrieves emerging startup entrants and tracking signals for the industry/geography. |
| `POST` | `/api/v1/workspaces/:workspaceId/research/:reportId/finalize` | Member+ | Finalizes selected business direction, computes 90-day roadmap, gates Business Brain graduation. |

---

## 5. Frontend UX Refinements (`IdeaIntelligencePage.tsx`)

- **Instant Natural Input (Step 1)**: Primary search/input field at the top of the page with single-click submission (`Research this idea`).
- **Idea Understanding Confirmation (Step 2)**: Crisp card displaying the AI's understanding, identified industry, assumed geography, and initial hypothesis, with immediate "Launch Autonomous Research" button and optional inline adjustments.
- **Evidence-Grounded Progress (Step 3)**: Live task progression reflecting active agent capabilities and source verification rather than arbitrary timer loops.
- **Expanded Report View (Step 4)**:
  - All 15 sections rendered with collapsible detail cards, mathematical formula cards, and evidence citations.
  - Interactive **Opportunity Discovery Matrix** with deep-dive action buttons.
  - Dedicated **Emerging Players Radar** with verified source links.
  - Persistent **Conversational Deep Research Drawer** for real-time questions (e.g. ₹5 Lakh budget tests).
  - **Idea Finalization & Graduation Bar** with explicit confirmation.

---

## 6. Implementation Stages & Verification Strategy

- **Stage 1 (Repairs & Types)**: Fix `ideaIntelligenceService.ts` TypeScript errors, truth check arguments, and align schemas.
- **Stage 2 (Idea Understanding Engine)**: Implement `understandIdea` with semantic parsing, smart geographic defaults, and assumption disclosure.
- **Stage 3 (Research Orchestrator & 15 Sections)**: Build multi-agent synthesizer connecting to `researchEngine` and `evidenceEngineService` with Gemini generation and deterministic fallbacks.
- **Stage 4 (Opportunity & Emerging Radar)**: Implement structured opportunity attractiveness scoring and new entrant discovery.
- **Stage 5 (Conversational Research & Budget Feasibility)**: Implement conversational query handler with persistent context and financial recalculation.
- **Stage 6 (Idea Finalization & Business Brain)**: Implement finalization logic and hook to `graduateIdeaToBrain`.
- **Stage 7 (Frontend Integration)**: Wire all endpoints to `IdeaIntelligencePage.tsx` adhering to React 19 design freeze.
- **Stage 8 (Testing & Verification)**: Run automated tests for all 9 scenarios specified in the master brief.
