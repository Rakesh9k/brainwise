# Phase 9 Deliverable: Actionable Recommendation Engine

## Executive Summary
BrainWise Phase 9 delivers the **Actionable Recommendation Engine** (`ActionableRecommendationEngine`), transforming strategic recommendations from open-ended, passive text into prioritized, mathematically scored, and sequenced tactical playbooks. The engine prioritizes initiatives using dual **RICE** (Reach, Impact, Confidence, Effort) and **ICE** scoring frameworks; isolates the single top-priority bottleneck recommendation (`P0_CRITICAL`); outlines multi-step tactical execution playbooks complete with department ownership, estimated hours, budget caps, and concrete non-video deliverables; enforces high-conviction **"What NOT To Do"** directives; and provides an audited **Human Approval Gate** that converts approved recommendations directly into active growth tasks in `taskRepository`.

---

## 1. Architectural Architecture & Core Pillars

```
+--------------------------------------------------------------------------------------------------+
|                                ACTIONABLE RECOMMENDATION ENGINE                                  |
|                                                                                                  |
|   1. Dual RICE & ICE Scoring      2. Sequenced Playbooks          3. "What NOT To Do" Directives |
|   - Reach (Visitors / Orders)     - Numbered sprint steps (1-3)   - Strict Video Exclusion       |
|   - Impact (1 to 10 Scale)        - Department ownership assigned - Premature ad spend limits    |
|   - Confidence (0.1 to 1.0)       - Hours, budget & deliverables  - Anti-discounting guardrails  |
|   - Effort (1 to 10 Scale)        - Risk tiering (Low/Med/High)   - Preserves capital & brand    |
|                                                                                                  |
|   4. Human Approval Gate          5. Task Creation Handoff        6. Cross-Department EventBus   |
|   - Owner / Admin role check      - Converts steps to TaskEntity  - Emits TASK_CREATED           |
|   - Audited timestamp & actor     - Due dates sequenced by week   - Synchronized with Roadmap    |
|   - Zero unauthorized execution   - Status tracked in TaskRepo    - Real-time updates            |
+--------------------------------------------------------------------------------------------------+
```

### 1.1 Dual RICE & ICE Prioritization Scoring
Every candidate recommendation is quantitatively evaluated:
$$\text{RICE Score} = \frac{\text{Reach} \times \text{Impact} \times \text{Confidence}}{\text{Effort}}$$
$$\text{ICE Score} = \text{Impact} \times \text{Confidence} \times (11 - \text{Effort}) \times 10$$
- **Priority Tiers:**
  - `P0_CRITICAL`: Directly resolves the Primary Constraint identified by Theory of Constraints.
  - `P1_HIGH`: High RICE score with immediate contribution margin or AOV expansion.
  - `P2_MEDIUM`: Secondary optimization with moderate reach or higher effort.
  - `P3_LOW`: Exploratory or long-tail optimizations.

### 1.2 Sequenced Tactical Playbooks
Rather than leaving execution ambiguous, recommendations feature 2 to 4 structured playbook steps:
- `stepNumber`: Sequenced ordinal milestone.
- `department`: Department ownership (`Marketing`, `Product`, `Sales`, `Operations`, `Finance`, `Growth`).
- `estimatedHours` & `estimatedBudget`: Concrete operational resource requirements.
- `deliverable`: Strict vector/static collateral (e.g., BrandStudio 5-slide static carousel, 1-click checkout flow).
- **Strict Video Exclusion:** All deliverables prohibit video generation, reels, or video pipelines.

### 1.3 High-Conviction "What NOT To Do" Directives
Protects founders from high-cost, low-yield strategic missteps:
1. `dir_no_video`: Forbids speculative investment in AI video generation, video reels, and Remotion pipelines.
2. `dir_no_discount`: Forbids reactive 50% discount clearances that erode brand equity and destroy contribution margin.
3. `dir_no_premature_ads`: Forbids scaling paid ad spend while checkout conversion rate is below 2.0% or monthly churn exceeds 5%.

### 1.4 Human Approval Workflow & Task Creation Handoff
- Consequential changes (pricing modifications, budget commitments > ₹10,000) mandate human founder approval (`requiresHumanApproval: true`).
- Upon approval via `approveAndConvertToTasks()`, the engine automatically:
  1. Instantiates discrete `GrowthTaskEntity` records in `taskRepository` for each playbook step.
  2. Sets realistic due dates staged across weekly sprint intervals.
  3. Publishes `TASK_CREATED` events to `departmentEventBus`, alerting assigned departments in real-time.

---

## 2. API Endpoints

Two dedicated REST endpoints have been implemented in `src/server/routes/v1/recommendationRoutes.ts`:

1. `GET /api/v1/workspaces/:workspaceId/recommendations/prioritized`
   - Returns the full prioritized recommendation dossier, RICE/ICE scores, primary focus bottleneck, and prohibited directives.
2. `POST /api/v1/workspaces/:workspaceId/recommendations/:recommendationId/convert-to-tasks`
   - Executes human approval handoff, converting playbook steps into active tasks and emitting coordination events.

---

## 3. Test Evidence

The suite `src/server/actionableRecommendations.test.ts` executes 3 comprehensive integration tests:

```
✔ 1. Generates RICE and ICE scored recommendations with sequenced tactical playbooks (2.35ms)
✔ 2. Enforces high-conviction "What NOT To Do" negative recommendations (0.37ms)
✔ 3. Human Approval Workflow: converts approved recommendation into active growth tasks (1.22ms)

Tests:       3 passed, 3 total
Suites:      1 passed, 1 total
Snapshots:   0 total
Time:        613ms
Status:      PASSED (100%)
```

Across all transformation phases (Phases 1 through 9), **41/41 tests pass with 100% success rate**.
