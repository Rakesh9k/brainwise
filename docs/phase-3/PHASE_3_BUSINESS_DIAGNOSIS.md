# Phase 3 Deliverable: Comprehensive Business Diagnosis Engine

## Executive Summary
BrainWise Phase 3 delivers the **Comprehensive Business Diagnosis Engine** (`BusinessDiagnosisEngine`), elevating the system from superficial advice to an evidence-backed, multidimensional strategic diagnostic engine. Rather than generating generic SWOT bullet points or fragmented suggestions, this engine synthesizes verified product catalogs, user-confirmed value propositions, financial margins, brand rules, business goals, and real performance telemetry across **10 core dimensions of business health**.

The diagnosis explicitly applies Eliyahu Goldratt's **Theory of Constraints (ToC)** to isolate the single binding bottleneck choking business growth, formulates concrete sequenced remediation sprints, enforces high-conviction **"What NOT to do"** guardrails to protect capital and brand equity, and categorizes every diagnostic insight under strict **Fact Provenance** taxonomy (`CONFIRMED_FACT`, `CALCULATION`, `OBSERVED_EVIDENCE`, `AI_HYPOTHESIS`).

---

## 1. 10 Core Health Dimensions

The engine evaluates 10 orthogonal business health dimensions, producing scores (0–100), health tiers (`EXCELLENT`, `HEALTHY`, `MODERATE`, `AT_RISK`, `CRITICAL`), quantified key metrics, findings, identified vulnerabilities, and remediation directives:

| Dimension | Key Evaluated Metrics | Assessment Criteria |
| :--- | :--- | :--- |
| **1. Unit Economics & Contribution Margins** | Catalog unit prices, gross margin %, LTV:CAC ratio | Evaluates product unit pricing against gross margins. Detects margin compression, missing pricing architectures, and capital bleed. |
| **2. Product-Market Fit & Positioning** | Personas defined, pain points mapped, buying triggers | Measures alignment between customer pain points and verified value propositions. Flags weak differentiation or absent persona definition. |
| **3. Funnel Velocity & Conversion** | Monthly visitors, conversion rate %, sales cycle velocity | Measures conversion rates against industry baselines. Highlights top-of-funnel leaks or checkout friction. |
| **4. Customer Retention & Churn Dynamics** | Monthly churn %, repeat purchase rate, customer lifespan | Identifies churn risks. If monthly churn exceeds 5%, flags immediate retention crisis and halts acquisition scaling. |
| **5. Pricing Power & Elasticity** | Average order value (AOV), discount dependence, margins | Measures margin resilience and discount dependencies. Detects margin dilution and lack of pricing leverage. |
| **6. Brand Authority & Market Perception** | Voice guidelines, approved claims, negative keywords | Audits brand identity completeness, claim restrictions, and consistency across marketing touchpoints. |
| **7. Capital Efficiency & Burn Runway** | Marketing budget, CAC, months of runway, efficiency ratio | Checks marketing spend efficiency and customer acquisition cost against LTV payback periods. |
| **8. Operational Capacity & Delivery Bottlenecks** | Stated fulfillment capacity, lead times, throughput | Flags capacity limits (e.g. roastery capacity, service bandwidth) to prevent customer acquisition outpacing fulfillment. |
| **9. Regulatory & Strategic Compliance** | Restricted claims, geographic and legal exclusions | Audits compliance with industry-specific regulations and advertising standards (e.g. uncertified organic claims). |
| **10. Growth Leverage & Organic Flywheels** | Organic referral loops, subscriber growth, expansion revenue | Analyzes scalable organic growth vectors, subscriber retention loops, and expansion pathways. |

---

## 2. Theory of Constraints: Primary Bottleneck Isolation

A core failure of conventional AI tools is overwhelming founders with 20 unprioritized recommendations. Under Goldratt's Theory of Constraints:
> *A business system has at most ONE primary constraint at any given moment that dictates its maximum throughput. Any optimization made anywhere other than the primary constraint is an illusion.*

The `BusinessDiagnosisEngine` evaluates all dimensions and isolates the single lowest-scoring, high-severity bottleneck (`primaryConstraint`). It returns:
1. **Binding Problem:** A concise diagnosis of the exact bottleneck constraint.
2. **Theory of Constraints Explanation:** Why addressing this constraint unlocks business velocity while other initiatives will yield zero marginal ROI until resolved.
3. **Sequenced Remediation Sprints:** A numbered schedule of tactical execution sprints (Sprint 1 to 3) assigned to specific departments (Product, Marketing, Operations, Sales) with estimated time horizons and target impact.

### Example ToC Output:
```json
{
  "dimension": "FUNNEL_VELOCITY",
  "title": "Severe Conversion Funnel Bottleneck",
  "bindingProblem": "Tracked conversion rate is 1.1%, significantly below the 2.5% industry benchmark.",
  "theoryOfConstraintsExplanation": "Pouring marketing budget or increasing traffic while conversion rate is 1.1% will waste acquisition spend. Optimizing the checkout flow and value proposition above the fold will unlock ROI for all upstream channels.",
  "severity": "CRITICAL",
  "immediateRemediationSprints": [
    {
      "sprintNumber": 1,
      "actionTitle": "Funnel Drop-Off Audit & Single-Click Checkout",
      "responsibleDepartment": "Product & Tech",
      "estimatedDays": 7,
      "expectedImpact": "Recover 15-25% of abandoned checkout sessions"
    },
    {
      "sprintNumber": 2,
      "actionTitle": "Social Proof & Trust Badge Placement",
      "responsibleDepartment": "Marketing & Creative",
      "estimatedDays": 5,
      "expectedImpact": "Increase landing page visitor-to-cart transition by 20%"
    }
  ]
}
```

---

## 3. High-Conviction "What NOT To Do" Directives

Most strategic failures stem from taking premature or counter-productive actions. The diagnosis engine generates explicit, high-conviction **"What NOT to do"** directives classified under risk categories (`CAPITAL_WASTE`, `BRAND_DILUTION`, `OPERATIONAL_CHAOS`, `LEGAL_EXPOSURE`):

1. **Pre-Launch / Sparse Profiles:**
   - *Prohibited:* "Do NOT run paid advertising campaigns (Meta/Google Ads)."
   - *Rationale:* Running ads without verified pricing, live catalog, or tested checkout bleeds cash with zero conversion.
2. **High Churn Scenarios (> 5% monthly churn):**
   - *Prohibited:* "Do NOT pour budget into top-of-funnel customer acquisition."
   - *Rationale:* Pouring new users into a leaky bucket accelerates burn and burns through addressable market reputation.
3. **Low Margin / Pricing Scenarios:**
   - *Prohibited:* "Do NOT offer reactive clearance discounts or price slashing."
   - *Rationale:* Erodes brand positioning and shrinks already thin contribution margins without fixing underlying conversion resistance.
4. **Strict Scope Directives:**
   - *Prohibited:* "Do NOT invest in expensive video production or speculative media formats."
   - *Rationale:* High production costs with uncertain attribution; focus on high-converting static vector collateral, carousels, and verified direct response copywriting.

---

## 4. Strict Fact Provenance Taxonomy in SWOT

Every observation in the SWOT matrix and findings array includes an explicit `classification`:

- `CONFIRMED_FACT`: Directly verified from business profile, catalog, or user-confirmed settings (e.g. "Direct-Trade Arabica roasted fresh").
- `CALCULATION`: Deterministic mathematical deduction from verified numbers (e.g. "Catalog average unit price is ₹450 with 72% gross margin").
- `OBSERVED_EVIDENCE`: Empirical telemetry or historical performance metrics (e.g. "Tracked monthly churn is 2.8% across 4,500 visitors").
- `AI_HYPOTHESIS`: Inferential strategic hypothesis requiring user validation before adoption (e.g. "Potential risk of boutique roastery supply chain disruption").

This guarantees that unverified AI hypotheses are **never** presented as confirmed business truth.

---

## 5. API Endpoints

Three dedicated REST endpoints have been exposed in `src/server/routes/v1/businessReasoningRoutes.ts`:

1. `GET /api/v1/workspaces/:workspaceId/reasoning/comprehensive-diagnosis`
   - Returns the full 10-dimensional diagnostic report, overall health score, maturity stage, primary constraint, what-not-to-do directives, SWOT matrix, data confidence score, and citations.
2. `GET /api/v1/workspaces/:workspaceId/reasoning/primary-constraint`
   - Returns the isolated Theory of Constraints primary bottleneck and sequenced remediation sprints.
3. `GET /api/v1/workspaces/:workspaceId/reasoning/what-not-to-do`
   - Returns the active prohibited actions to guard capital, brand, and operations.

---

## 6. Verification and Test Results

The suite `src/server/businessDiagnosisEngine.test.ts` executes 5 rigorous end-to-end tests:

```
✔ 1. Evaluates all 10 business health dimensions on a mature, verified business profile (2.22ms)
✔ 2. Correctly flags missing data and critical gaps in a sparse / pre-launch business (0.38ms)
✔ 3. Theory of Constraints: Pinpoints the single Primary Constraint and creates sequenced remediation sprints (0.23ms)
✔ 4. Asserts "What NOT to do" directives to protect capital, brand and bandwidth (0.34ms)
✔ 5. Generates grounded SWOT matrix with explicit fact provenance classification (0.28ms)

Tests:       5 passed, 5 total
Suites:      1 passed, 1 total
Snapshots:   0 total
Time:        464ms
Status:      PASSED (100%)
```

---

## 7. Acceptance Criteria Checklist

- [x] All 10 business health dimensions implemented with quantified scoring and metrics.
- [x] Goldratt's Theory of Constraints bottleneck isolation implemented.
- [x] Sequenced remediation sprints with cross-department assignment generated.
- [x] High-conviction "What NOT to do" directives preventing capital waste and brand dilution.
- [x] SWOT matrix grounded in strict 4-tier fact provenance taxonomy.
- [x] Full REST API integration with workspace tenant isolation.
- [x] 100% test pass rate with zero flaky tests or mock fallacies.
- [x] Strict video exclusion and financial integrity directives preserved.
