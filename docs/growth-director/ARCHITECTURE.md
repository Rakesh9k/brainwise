# BRAINWISE — GROWTH DIRECTOR & EXECUTION INTELLIGENCE SYSTEM
# ARCHITECTURE SPECIFICATION

> **Document ID:** `BW-GD-ARCH-2026-11`  
> **Status:** PRODUCTION ARCHITECTURE SPECIFICATION  
> **Author:** Principal AI Systems Architect & Senior Full-Stack Engineer  

---

## 1. Architectural Overview & Design Philosophy

BrainWise Growth Director (Department 6) is the operational execution engine of the BrainWise operating system. Its primary responsibility is converting upstream strategic intelligence into disciplined operational execution, measurable business outcomes, and closed-loop strategic learning.

```
+----------------------------------------------------------------------------------------------------+
|                                    UPSTREAM STRATEGIC INTELLIGENCE                                 |
|                                                                                                    |
|  +--------------------+  +--------------------+  +--------------------+  +----------------------+  |
|  |   Business Brain   |  |  Competitive Radar |  |    Market Watch    |  |  Idea Intelligence   |  |
|  | (ICP, Unit Econ)   |  | (Whitespace, Gaps) |  | (Demand Signals)   |  | (Hypotheses, TAM)    |  |
|  +--------------------+  +--------------------+  +--------------------+  +----------------------+  |
+----------------------------------------------------------------------------------------------------+
                                                  │
                                                  ▼
+----------------------------------------------------------------------------------------------------+
|                         GROWTH INTELLIGENCE ORCHESTRATOR LAYER (CORE ENGINE)                       |
|                                                                                                    |
|  1. Business Context Engine           --> Assembles ground truth, provenance, freshness metadata   |
|  2. Growth Diagnosis Engine           --> Multi-dimensional bottleneck diagnosis (15 dimensions)   |
|  3. Growth Opportunity Engine         --> Evaluates revenue lift, CAC reduction, zero-video fit    |
|  4. Prioritization & ICE Engine       --> Impact × Confidence × Ease with bounded modifiers        |
|  5. Task Intelligence Engine          --> Enforces Anti-Vague mandate, lifecycle & DAG resolution   |
|  6. Resource & Capacity Engine        --> Founder hours, weekly bandwidth, overload prevention      |
|  7. Dynamic Roadmap Engine            --> 7-day, 30-day, 60-day, 90-day adaptive operational phases|
|  8. Growth Experiment Engine          --> Hypothesis validation, statistical sample, kill-switches |
|  9. Strategic Memory Engine           --> 10-category memory, anti-fatigue & idempotent learning   |
| 10. Financial & Simulation Engine     --> Unit economics, CAC/LTV, 3-tier scenario simulation       |
| 11. Growth Risk Monitor               --> Channel concentration, overload alerts & "What Not To Do"|
+----------------------------------------------------------------------------------------------------+
                                                  │
                                                  ▼
+----------------------------------------------------------------------------------------------------+
|                         DOWNSTREAM OPERATIONAL EXECUTION & CLOSED-LOOP FLOW                        |
|                                                                                                    |
|  +--------------------+  +--------------------+  +--------------------+  +----------------------+  |
|  | Today Focus Sprint |  | Multi-Horizon Tasks|  | Growth Experiments |  | Strategic Memory Log |  |
|  | (25m/45m Session)  |  | (Immediate/30/90d) |  | (Sample Protected) |  | (Facts & Exclusions) |  |
|  +--------------------+  +--------------------+  +--------------------+  +----------------------+  |
+----------------------------------------------------------------------------------------------------+
```

---

## 2. Core Architectural Pillars

### 2.1 Grounded Deterministic Intelligence
- **No Fabricated Facts**: Every growth diagnosis, task, and opportunity is grounded strictly in the persistent Business Brain (`src/types/brain.ts` & `src/server/repositories/businessProfileRepository.ts`).
- **Provenance Distinction**: Facts are marked as `USER_CONFIRMED`, `EXTERNALLY_VERIFIED`, `AI_INFERRED`, or `UNVERIFIED`. Unverified assumptions are never promoted to authoritative facts.
- **Data-Missing Guardrail**: The system never diagnoses a conversion problem when conversion telemetry is absent. Incomplete data generates an `INSUFFICIENT_EVIDENCE` diagnosis accompanied by measurement recommendations.

### 2.2 The Anti-Vague Task Mandate
- Buzzwords and generic instructions (`improve SEO`, `post regularly`, `increase brand awareness`) are strictly rejected by `growthTaskEngine.validateTaskQuality()`.
- Every admitted task requires:
  1. Concrete action verb (`Deploy`, `Interview`, `Mount`, `A/B Test`).
  2. Multi-step execution instructions.
  3. Grounded business objective.
  4. Quantitative success metrics (baseline, target, and unit).
  5. Unambiguous completion criteria.
  6. Explicit duration and budget estimates.
  7. Clear dependencies and recommended BrainWise tools.

### 2.3 Strict Zero-Video Boundary
- Growth Director strictly excludes all AI video generation, video editing, reel generation, Remotion scripts, FFmpeg pipelines, or video credits.
- Collateral recommendations are restricted to:
  - SVG vector collateral (stationery, flyers, business cards, posters).
  - Multi-frame static carousels.
  - High-DPI print collateral.
  - Deterministic copywriting packs.

### 2.4 Controlled Autonomy Modes
1. **Advisory Mode**: AI proposes diagnoses, tasks, and roadmaps; founder manually accepts, schedules, and marks progress.
2. **Assisted Execution**: AI drafts campaign copy packs and prepares SVG collateral briefs; founder approves before distribution.
3. **Controlled Autonomy**: Bounded execution with strict spending limits, requiring explicit founder approval for financial commitments, external messaging, or strategy updates.

---

## 3. Subsystem Breakdown

### 3.1 Business Context Engine (`growthContextEngine.ts`)
- Retrieves profile, active goals, competitors, market signals, and validated business facts.
- Computes freshness metadata: completeness score $(20..100\%)$ and missing critical fields list.

### 3.2 Growth Diagnosis Engine (`growthDiagnosisEngine.ts`)
- Evaluates 15 business dimensions: Awareness, Audience Quality, Traffic, Lead Generation, Qualification, Conversion, Sales, Revenue, Retention, Repeat Purchases, Referrals, CAC, LTV, Gross Margin, and Capacity.
- Categorizes bottlenecks:
  - `CONFIRMED_BOTTLENECK` (Backed by direct telemetry or stage attributes)
  - `PROBABLE_BOTTLENECK` (High probability based on unit economics or market indicators)
  - `POTENTIAL_BOTTLENECK` (Indicative or seasonal)
  - `INSUFFICIENT_EVIDENCE` (Data missing; recommends instrumentation)

### 3.3 Growth Prioritization Engine (`growthPrioritizationEngine.ts`)
- Computes deterministic ICE scores clamped to $1..10$:
  $$\text{Raw ICE} = \text{Impact} \times \text{Confidence} \times \text{Ease} \quad (1..1000)$$
- Applies bounded multiplicative modifiers:
  $$\text{Final Score} = \text{Raw ICE} \times M_{\text{urgency}} \times M_{\text{goal}} \times M_{\text{feasibility}}$$
  - $M_{\text{urgency}} \in [0.9, 1.2]$
  - $M_{\text{goal}} \in [0.85, 1.15]$
  - $M_{\text{feasibility}} \in [0.8, 1.0]$
- Evaluates OKR progress velocity and goal health (`ON_TRACK`, `AT_RISK`, `CRITICAL`).

### 3.4 Task Intelligence & Dependency Engine (`growthTaskEngine.ts`)
- Executes cycle detection via Depth-First Search (DFS) on directed dependency graphs.
- Automatically marks tasks as `BLOCKED` if prerequisites are pending.
- Re-enables tasks to `SCHEDULED` upon prerequisite completion.

### 3.5 Resource & Capacity Engine (`growthCapacityEngine.ts`)
- Evaluates founder working hours per day, team size, and monthly marketing budgets.
- Calculates weekly committed hours vs available hours and flags overload ($> 100\%$ utilization).
- Implements upgraded `selectFocusSprintTasks()`: Filters out blocked tasks, prioritizes goal-aligned high-ICE items fitting the 25m or 45m sprint duration.

### 3.6 Dynamic Roadmap Engine (`growthRoadmapEngine.ts`)
- Generates 4 sequential horizons:
  - **Immediate (Days 1–7)**: Quick wins, conversion instrumentation, ICP validation.
  - **30-Day Horizon**: Initial acquisition experiments, CRO, distribution.
  - **60-Day Horizon**: Retention mechanics, referral loops, channel evaluation.
  - **90-Day Horizon**: Scaling proven channels, unit economics hardening.
- Supports versioning and section-level updates without overwriting user customizations.

### 3.7 Growth Experiment Engine (`growthExperimentEngine.ts`)
- Enforces statistical sample thresholds before evaluating rate/cost kill switches.
- Distinguishes hypothesis rejection (`HYPOTHESIS_REJECTED`) from execution failure (`EXECUTION_FAILURE`) or tracking disruption (`MEASUREMENT_FAILURE`).

### 3.8 Strategic Memory Engine (`growthStrategicMemoryEngine.ts`)
- Organizes learnings into 10 explicit categories.
- Tracks theme-specific failure counts and applies anti-fatigue suppression when failures reach $\ge 3$.
- Requires `DIRECTLY_MEASURED` or `INDEPENDENTLY_VERIFIED` evidence with sample size $\ge 10$ before promoting learnings to the Business Brain.
- Enforces idempotent event ingestion to prevent duplicate memory creation.

### 3.9 Financial & Scenario Engine (`growthFinancialEngine.ts`)
- Evaluates unit economics: CAC, AOV, LTV, LTV:CAC, payback period, gross margin, ROAS, break-even CAC.
- Runs 3-tier scenario simulations (Conservative, Expected, Optimistic).
- Includes strict disclaimer certifying models as parametric calculations rather than guaranteed returns.

### 3.10 Recommendation Engine & What-Not-To-Do (`growthRecommendationEngine.ts`)
- Synthesizes grounded recommendations with validity dates and semantic deduplication.
- Generates actionable "Stop, Avoid, Postpone" directives protecting founder bandwidth.
