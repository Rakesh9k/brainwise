# Phase 4 Deliverable: Customer Intelligence System

## Executive Summary
BrainWise Phase 4 delivers the **Customer Intelligence System** (`CustomerIntelligenceEngine`), transitioning BrainWise from static persona placeholders to an active, evidence-driven customer understanding engine. It constructs multi-dimensional **Ideal Customer Profile (ICP)** personas grounded directly in verified product catalogs, pricing realities, and brand guidelines; clusters unstructured customer feedback and reviews into an **Actionable Objection Handling Playbook** with brand-aligned rebuttals; identifies event-driven **Buying Triggers** linked strictly to high-converting static vector and carousel collateral; and predicts **Customer Churn Risk** through RFM transaction recency and behavioral friction signals.

---

## 1. Core Architecture & Capabilities

```
+--------------------------------------------------------------------------------------------------+
|                                    CUSTOMER INTELLIGENCE ENGINE                                  |
|                                                                                                  |
|   1. ICP Persona Generation       2. Objection Clustering         3. Buying Triggers             |
|   - Multi-tier archetypes         - Root-cause diagnostics        - Event-driven catalysts       |
|   - Jobs-to-be-done (F/E/S)       - Brand-aligned rebuttals       - Non-video campaign mapping   |
|   - Real catalog price grounding  - Prevention playbooks          - Life-events & budget cycles  |
|                                                                                                  |
|   4. Churn Risk & Retention       5. Cross-Service Sync           6. Department EventBus         |
|   - RFM recency dynamics          - BusinessDiagnosisEngine (D2)  - TARGET_AUDIENCE_UPDATED      |
|   - Ticket/complaint friction     - AudienceSegmentRepository     - SALES_OBJECTION_RECORDED     |
|   - Priority interventions        - Profile customerPersonas      - Real-time notification       |
+--------------------------------------------------------------------------------------------------+
```

### 1.1 ICP Persona Generation & Grounding
- **Catalog Pricing Alignment:** Personas analyze active product SKUs and average price points (e.g. ₹450 - ₹1,200) to compute realistic willingness-to-pay tiers (`LOW`, `MODERATE`, `HIGH`, `PREMIUM`) rather than arbitrary guesses.
- **Three-Tier Jobs-To-Be-Done (JTBD):** Maps *Functional* jobs (e.g., dial in consistent home espresso extraction), *Emotional* jobs (e.g., avoid morning disappointment and bitter beans), and *Social* jobs (e.g., be recognized as the resident taste curator).
- **Two-Tier Archetypes:** Derives distinct B2C primary buyers (e.g., "The Connoisseur Home Brewer") and B2B commercial champions (e.g., "The Boutique Cafe Operator").
- **Persistence & Bidirectional Sync:** Persists to `audienceSegmentRepository` and updates `businessProfileRepository.customerPersonas`, triggering cache invalidation across the shared business context service.

### 1.2 Unstructured Feedback Clustering & Objection Playbooks
- Ingests customer voice feedback from sales conversations, reviews, and `evidenceLakeRepository`.
- Clusters raw quotes into 7 structured objection categories:
  1. `PRICE_TOO_HIGH` (price-to-value justification)
  2. `LACK_OF_TRUST` (proof of freshness and taste guarantees)
  3. `ONBOARDING_COMPLEXITY` (catalog navigation, grind selection)
  4. `FEATURE_DEFICIT` (missing specifications or bundle options)
  5. `POOR_SUPPORT` (ticket resolution speed)
  6. `CONTRACT_LOCK_IN` (subscription flexibility)
  7. `TIMING_NOT_RIGHT` (budget and schedule misalignment)
- **Brand Identity Adherence:** Rebuttals strictly incorporate approved brand words (`wordsToUse`, e.g., "Single-Estate", "Artisanal", "Farm-to-Cup") and approved claims while avoiding restricted claims or forbidden words (`wordsToAvoid`).
- **Preventative Action:** Formulates structural fixes (e.g. cost-per-cup calculators, grind selection quizzes) to eliminate objections before they arise.

### 1.3 Buying Trigger Synthesis & Strict Video Exclusion
- Synthesizes event-driven buying triggers (e.g. purchasing a new grinder/brewer, quarterly budget resets, incumbent vendor price hikes).
- Maps each trigger directly to non-video creative formats:
  - `STATIC_CAROUSEL`: Multi-frame educational carousel detailing origin and extraction.
  - `PRINT_COLLATERAL`: High-DPI flyer or packaging insert.
  - `OUTREACH_SEQUENCE`: Multi-step consultative email sequence.
  - `RETARGETING_COPY`: Direct response ad copy.
- **Strict Video Exclusion:** Adheres 100% to project directives — zero video generation, video scripts, or video credits.

### 1.4 RFM Churn Risk Prediction & Retention Intervention
- Evaluates customer order frequency, monetary value, and recency days:
  - Active: Order within last 30 days (`LOW` risk).
  - Lapsing: 40–60 days inactive (`ELEVATED` risk).
  - Lapsed: 60–90 days inactive (`HIGH` risk).
  - Critical: >90 days inactive or active customer with open support complaints (`CRITICAL` risk).
- Formulates prioritized, concrete retention interventions:
  - `P0_IMMEDIATE` (`CONCIERGE_CHECK_IN`): Founder or customer success head outreach for unresolved complaints.
  - `P1_WITHIN_48H` (`WIN_BACK_OFFER`): Replenishment voucher for lapsed repeat buyers.
  - `P2_ROUTINE` (`PRODUCT_REORDER_REMINDER`): Automated 1-click reorder email timed to bean depletion.

---

## 2. API Contracts

Four REST endpoints have been implemented in `src/server/routes/v1/businessReasoningRoutes.ts`:

1. `GET /api/v1/workspaces/:workspaceId/reasoning/customer-intelligence`
   - Returns the complete customer intelligence dossier (Personas, Objections, Triggers, Churn Assessment, Citations).
2. `POST /api/v1/workspaces/:workspaceId/reasoning/customer-personas/generate`
   - Generates or regenerates ICP personas with custom segmentation options (`targetSegment: 'B2B' | 'B2C'`).
3. `POST /api/v1/workspaces/:workspaceId/reasoning/objection-playbook`
   - Clusters custom feedback arrays and synthesizes brand-grounded rebuttals.
4. `POST /api/v1/workspaces/:workspaceId/reasoning/churn-risk`
   - Accepts transaction logs and unresolved complaints, returning customer-level churn scores and interventions.

---

## 3. Synergy with Existing Systems

1. **BusinessDiagnosisEngine:**
   - Dimension 2 (`MARKET_FIT_POSITIONING`) automatically integrates personas from `audienceSegmentRepository` and `businessProfileRepository`. When `CustomerIntelligenceEngine` synthesizes personas, the positioning health score elevates to `EXCELLENT` (>= 80).
2. **UnifiedAiOrchestrator:**
   - Informs `generateMarketingCampaignAsync` and `generateOutreachSequenceAsync` with verified customer pain points and willingness-to-pay tiers.
3. **DepartmentEventBus:**
   - Automatically emits `TARGET_AUDIENCE_UPDATED` and `SALES_OBJECTION_RECORDED` events, notifying Marketing, Sales, and Product departments in real-time.

---

## 4. Test Evidence

The suite `src/server/customerIntelligence.test.ts` executes 5 comprehensive integration tests:

```
✔ 1. Generates and enriches tailored ICP personas grounded in catalog pricing & context (3.06ms)
✔ 2. Clusters raw customer objections and generates brand-aligned rebuttal playbooks (0.79ms)
✔ 3. Synthesizes event-driven buying triggers linked to non-video campaign formats (0.18ms)
✔ 4. Predicts customer churn risk with RFM transaction telemetry and friction signals (0.36ms)
✔ 5. Synergizes with BusinessDiagnosisEngine: customer intelligence elevates positioning health (0.81ms)

Tests:       5 passed, 5 total
Suites:      1 passed, 1 total
Snapshots:   0 total
Time:        538ms
Status:      PASSED (100%)
```

Across all transformation phases (Phase 1, Phase 2, Phase 3, Phase 4), **19/19 tests pass with 100% success rate**.
