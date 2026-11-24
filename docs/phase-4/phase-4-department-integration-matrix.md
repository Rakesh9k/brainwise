# BRAINWISE — PHASE 4: DEPARTMENT INTEGRATION MATRIX

> **Master Architectural Reference for Departmental Grounding & Cross-Department Coordination**
> **Product Architecture Directive:** Single source of truth in Business Brain; strict video exclusion (SVG collateral only); zero duplicate knowledge stores; tenant isolation.

---

## 1. Executive Overview

Phase 4 establishes **Shared Intelligence Across All BrainWise Departments**. Prior to Phase 4, individual departments risked fragmenting context, maintaining disconnected assumptions, or requiring repeated manual re-entry of business facts.

Under the Phase 4 Unified Architecture:
1. **Business Brain** acts as the singular, authoritative Knowledge Foundation.
2. Every department retrieves its business context through the **Shared Context Contract** (`SharedBusinessContextService.getDepartmentContext()`), ensuring that a change made once to business profile, products, or positioning propagates immediately across all departments.
3. Cross-department coordination runs over a typed event bus (`DepartmentEventBus` and `DepartmentCoordinationService`) equipped with **hop-count limits and cycle prevention** (maximum 3 hops) to prevent runaway circular agent loops.
4. **Strict Video Exclusion** is architecturally hardcoded across all departments: video generation, video editing, reels, FFmpeg pipelines, and video rendering are permanently prohibited; visual outputs are restricted to high-DPI vector SVG collateral.

---

## 2. Department Integration Matrix

| Department ID | Department Name | Route Prefix | Context Access Type | Grounding Data from Business Brain | Downstream Dispatches | Integration Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `BUSINESS_BRAIN` | Knowledge Core | `/business-profile` | Full Read / Write | Complete entity graph, fact provenance (`USER_CONFIRMED`), products, brand identity, goals | Emits `BUSINESS_PROFILE_UPDATED`, invalidates shared context cache | **Active & Authoritative** |
| `IDEA_INTELLIGENCE` | Market Validation | `/research` | Read-Only | Business stage, industry, target audiences, problem statement | TAM/SAM/SOM sizing, commercial dossier, SWOT inputs to Strategy | **Active & Grounded** |
| `COMPETITIVE_INTELLIGENCE`| Rival Intelligence | `/competitors` | Read-Only | Brand positioning, value proposition, products & pricing | Emits `COMPETITOR_DISCOVERED`, feeds competitor pricing & gaps to Marketing | **Active & Grounded** |
| `MARKET_WATCH` | External Telemetry | `/market-watch`| Read-Only | Industry, location, primary goals | Emits `MARKET_ALERT_CREATED`, demand signals to Growth Planner | **Active & Grounded** |
| `BRAND_STUDIO` | Vector Identity Studio | `/assets` | Read-Only | Approved colors, typography, brand voice, forbidden claims | Generates high-DPI SVG vector collateral; **STRICT VIDEO EXCLUSION** | **Active & Grounded (SVG Only)** |
| `GROWTH_PLANNER` | Action Roadmaps | `/tasks` | Read / Write Tasks | Active business goals, operational capacity limits, episodic learnings | Generates sprint tasks, growth experiments, receives anomalies | **Active & Grounded** |
| `ANALYTICS_REPORTS` | Performance Intelligence | `/reports` | Read-Only | Verified KPIs vs AI estimates, goals, past experiment results | Emits `ANALYTICS_INSIGHT_DETECTED` to Strategy on performance anomalies | **Active & Grounded** |
| `STRATEGY` (Role) | Executive Strategist | `/reasoning` | Full Read / Write | SWOT, gaps, scored opportunities, scenario simulations, strategic memory | Recommends strategic decisions, approves consequential tasks | **Active & Grounded** |
| `MARKETING` (Role) | Campaign Engine | `/departments/MARKETING` | Role-Filtered Context | Approved voice, words to use/avoid, approved claims, monthly budget ceiling | Campaign briefs, anti-fatigue angle tracking, performance metrics to Analytics | **Active & Grounded** |
| `RESEARCH` (Role) | Knowledge Research | `/departments/RESEARCH` | Role-Filtered Context | Competitor profiles, market findings, verified sources with timestamps | Informs product positioning and market opportunities | **Active & Grounded** |
| `CREATIVE` (Role) | Visual Collateral | `/departments/CREATIVE` | Role-Filtered Context | Product details, approved colors, typography, vector SVG rules (No Video) | Vector SVG collateral, flyers, stationery, business cards | **Active & Grounded (SVG Only)** |
| `SALES` (Role) | Commercial Enablement | `/departments/SALES` | Role-Filtered Context | Product catalog, pricing tiers, customer pain points, buying objections | Emits `SALES_OBJECTION_RECORDED` to update customer personas | **Active & Grounded** |
| `FINANCE` (Role) | Fiscal Reality | `/departments/FINANCE` | Role-Restricted Context | Verified budgets, margins, unit costs (authorized roles only), cash limits | Constrains campaign budgets; never infers missing financial data (`'UNKNOWN'`) | **Active & Role-Protected** |
| `CUSTOMER_SUCCESS` (Role)| Support & Retention | `/departments/CUSTOMER_SUCCESS`| Role-Filtered Context | Operating policies, explicit exclusions, support hours, audience pain points | Customer FAQs, retention procedures, onboarding guidance | **Active & Grounded** |

---

## 3. Department Data Flow Architecture

```
                             ┌───────────────────────────────┐
                             │     BUSINESS BRAIN CORE       │
                             │  (Single Ground Truth Anchor) │
                             └───────────────┬───────────────┘
                                             │
                       ┌─────────────────────┴─────────────────────┐
                       ▼                                           ▼
         ┌───────────────────────────┐               ┌───────────────────────────┐
         │  Shared Context Service   │               │   Department Event Bus    │
         │ (Role & Dept Sensitivity) │               │   (Cycle & Hop Prevention)│
         └─────────────┬─────────────┘               └─────────────┬─────────────┘
                       │                                           │
       ┌───────────────┼───────────────┐                           │
       ▼               ▼               ▼                           ▼
┌──────────────┐┌──────────────┐┌──────────────┐            ┌───────────────────────────┐
│  Marketing   ││   Creative   ││    Sales     │◄───────────┤ Cross-Dept Coordination:  │
│  Context     ││ (SVG Only)   ││  Context     │            │ - Research -> Marketing   │
└──────────────┘└──────────────┘└──────────────┘            │ - Sales -> Brain Personas │
       ▲               ▲               ▲                    │ - Analytics -> Strategy   │
       │               │               │                    │ - Profile Update -> All   │
┌──────────────┐┌──────────────┐┌──────────────┐            └───────────────────────────┘
│   Strategy   ││   Finance    ││ Cust Success │
│  (SWOT/Gaps) ││ (Role-Gated) ││ (Policies)   │
└──────────────┘└──────────────┘└──────────────┘
```

---

## 4. Architectural Rules & Constraints

1. **Strict Video Exclusion:**
   - Any asset or task specifying video, reels, FFmpeg, or text-to-video is blocked immediately.
   - Creative context explicitly flags `svgOnly: true` and `videoGenerationExcluded: true`.

2. **Fact Provenance Respect:**
   - `USER_CONFIRMED_FACT` entities are authoritative and possess confidence score `1.0`.
   - `AI_INFERRED_FACT` entities are strictly secondary and never override confirmed user facts.

3. **Financial Truth & Data Redaction:**
   - Unit margins, unit costs, and internal ledgers are accessible **only** to `owner` and `admin` roles in `FINANCE` and `STRATEGY` departments.
   - For all other roles and departments, margins and unit costs are redacted to `'UNKNOWN'` and logged in `dataRedactions`.
