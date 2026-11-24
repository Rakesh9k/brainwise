# BRAINWISE AI GROWTH AGENCY — SYSTEM ARCHITECTURE

**Authority:** Master Engineering Directive — Phase 0 Architecture Blueprint  
**Workspace:** `d:\brainwise pro\brainwise (1)`  
**Product Version:** BrainWise 2.0 Production  

---

## 1. High-Level Agency Architecture

```
+───────────────────────────────────────────────────────────────────────────────────+
|                           SHARED BUSINESS BRAIN (V1 / V2)                         |
|   (Business Identity, ICP Personas, Pricing, Unit Economics, Founder Directives)   |
+───────────────────────────────────────────────────────────────────────────────────+
                                          │
                                          ▼
+───────────────────────────────────────────────────────────────────────────────────+
|                     SHARED GROWTH INTELLIGENCE FOUNDATION                         |
|  • Provenance & Confidence Scoring   • Contradiction & Freshness Detector         |
|  • Selective Context Retrieval       • 12 Business Model & Stage Adapters         |
+───────────────────────────────────────────────────────────────────────────────────+
                                          │
                    ┌─────────────────────┴─────────────────────┐
                    ▼                                           ▼
+───────────────────────────────────────+   +───────────────────────────────────────+
|     16-DIMENSION DIAGNOSIS ENGINE     |   |       GROWTH STRATEGY ARCHITECT       |
| • Root-Cause vs Symptom Separation    |   | • 5 Strategic Archetypes              |
| • Primary Bottleneck Pinpointing      |   | • Strategy Versioning & History       |
| • Continuous Re-Assessment Triggers   |   | • Multi-Scenario Comparisons          |
+───────────────────────────────────────+   +───────────────────────────────────────+
                    │                                           │
                    └─────────────────────┬─────────────────────┘
                                          ▼
+───────────────────────────────────────────────────────────────────────────────────+
|                     GROWTH MISSIONS & EXECUTION HIERARCHY                         |
|                                                                                   |
|  [Business Objective] ──► [Growth Strategy] ──► [Growth Mission]                  |
|                                                       │                           |
|       ┌───────────────────────────────────────────────┴───────────────┐           |
|       ▼                                                               ▼           |
|  [Projects & Controlled Experiments]                        [Execution Tasks]     |
|  (Hypothesis, Kill Switch, Sample Size)                     (ICE Score, Steps)    |
|       │                                                               │           |
|       └───────────────────────────────┬───────────────────────────────┘           |
|                                       ▼                                           |
|                   [Deliverables & Verification Receipts]                          |
+───────────────────────────────────────────────────────────────────────────────────+
                                          │
                                          ▼
+───────────────────────────────────────────────────────────────────────────────────+
|                     7 SPECIALIZED GROWTH DEPARTMENTS                              |
|  1. Growth Marketing Director           5. Customer Retention & Revenue Director  |
|  2. Content & Distribution Director     6. Partnership & Distribution Director    |
|  3. Sales & Customer Acquisition        7. Growth Economics & Financial Analyst   |
|  4. Conversion Optimization (CRO)                                                 |
+───────────────────────────────────────────────────────────────────────────────────+
                                          │
                                          ▼
+───────────────────────────────────────────────────────────────────────────────────+
|                    EXECUTION & AUTOMATION ENGINE (3 LEVELS)                       |
|                                                                                   |
|  • LEVEL 1: Strategic Intelligence & Opportunity Identification                   |
|  • LEVEL 2: Operational Preparation (Briefs, Outbound Copy, Experiment Configs)   |
|  • LEVEL 3: Authorized Execution (Outreach, Publishing, Webhooks, Status Sync)     |
|                                                                                   |
|  ┌─────────────────────────────────────────────────────────────────────────────┐  |
|  │  HUMAN APPROVAL GATE: Consequential actions (Email, Publishing, Ad Spend)    │  |
|  │  require explicit founder sign-off before dispatch. Zero rogue execution.   │  |
|  └─────────────────────────────────────────────────────────────────────────────┘  |
+───────────────────────────────────────────────────────────────────────────────────+
                                          │
                                          ▼
+───────────────────────────────────────────────────────────────────────────────────+
|                     CLOSED-LOOP LEARNING & STRATEGIC MEMORY                       |
|  • 8 Categorized Memory Pools (Business, Strategic, Customer, Experiment, etc.)    |
|  • Nuanced Fatigue Scoring (Attempts, Audience Overlap, Baseline Performance)     |
|  • Event Bus (`MISSION_COMPLETED`, `EXPERIMENT_CONCLUDED`, `METRIC_RECORDED`)      |
+───────────────────────────────────────────────────────────────────────────────────+
```

---

## 2. The 15 Functional Agency Responsibilities

Rather than spinning up 15 disconnected LLM instances that hallucinate and conflict with each other, BrainWise implements **15 coordinated functional capabilities** orchestrated through typed deterministic services and grounded LLM synthesis:

1. **Chief Growth Officer (CGO):** Synthesizes overall growth vision, aligns OKRs, monitors burn rate, and directs cross-department focus.
2. **Business Growth Strategist:** Formulates Go-To-Market playbooks, market penetration wedges, and strategic scenario comparisons.
3. **Market Research Analyst:** Ingests competitor whitespace, pricing shifts, and industry benchmarks from Competitive Intelligence and Market Watch.
4. **Growth Marketing Director:** Oversees multi-channel campaigns, target audience segmentation, and marketing budgets.
5. **Content & Distribution Director:** Engineers editorial calendars, content pillars, static carousel storyboards, and distribution velocity.
6. **Sales & Customer Acquisition Director:** Discovers ICP prospects, drafts personalized cold outreach wedges, and tracks pipeline stages.
7. **Conversion Optimization Director (CRO):** Audits landing pages, designs pricing card proof badges, and manages A/B conversion funnels.
8. **Customer Retention Director:** Identifies churn drivers, designs post-purchase onboarding sequences, and tracks cohort retention.
9. **Partnership & Distribution Director:** Discovers complementary co-marketing partners, influencer wedges, and affiliate programs.
10. **Financial Growth Analyst:** Computes CAC, LTV, gross margin, payback periods, and simulates what-if growth financial models.
11. **Growth Experimentation Specialist:** Formulates controlled hypotheses, sample-size criteria, stop-loss kill switches, and validates statistical significance.
12. **Growth Analytics Director:** Ingests GA4/GSC telemetry, reconciles attribution models, and flags sudden metric anomalies.
13. **Growth Operations Manager:** Enforces task dependencies, resolves workflow bottlenecks, and checks founder daily capacity.
14. **Strategic Intelligence Analyst:** Curates the 8 memory pools, detects theme fatigue, and maintains "What NOT To Do" directives.
15. **AI Growth Orchestrator:** The central managing director that coordinates requests, delegates tasks, resolves conflicting advice, and ensures credit integrity.

---

## 3. Execution Levels & Human-in-the-Loop Safety

| Level | Capability | Autonomy | Human Action Required |
| :---: | :--- | :---: | :---: |
| **Level 1** | Opportunity Discovery, Bottleneck Diagnosis, ICE Scoring, What-If Simulation | **Full AI** | None (Advisory only) |
| **Level 2** | Campaign Briefs, Outbound Sequences, Carousel Copy, Experiment Design | **Full AI** | Review and edit drafts |
| **Level 3** | Email Dispatch, Public Publishing, Budget Allocation, Status Mutations | **Gated** | **Explicit Founder Approval Required** |

---

## 4. Architectural Boundaries & Non-Negotiables

- **Strict Zero-Video Exclusion:** In strict accordance with workspace directives, the Growth Agency never produces, schedules, or allocates budget for video generation, FFmpeg pipelines, or Remotion scripts. All marketing collateral is strictly vector SVG, multi-slide static carousels, or deterministic copywriting packs.
- **Tenant Isolation:** All missions, projects, tasks, memory records, and analytics are scoped strictly to `workspaces/{workspaceId}/...`.
- **Two-Phase Credit Protocol (ADR-006):** Complex multi-horizon strategy and agency orchestration hold 20 credits in reserve. If upstream failure occurs or Truth Checks fail, the hold is released immediately with zero net deduction.
