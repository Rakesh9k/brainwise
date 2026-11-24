# BRAINWISE — GROWTH DIRECTOR & EXECUTION INTELLIGENCE SYSTEM
# INTELLIGENCE ENGINE & REASONING SPECIFICATION

> **Document ID:** `BW-GD-INTEL-2026-11`  
> **Status:** PRODUCTION INTELLIGENCE ENGINE SPECIFICATION  
> **Author:** Principal AI Systems Architect & AI Agent Engineer  

---

## 1. Intelligence Engine Architecture

The Growth Intelligence Engine operates as a deterministic decision-making coordination layer. Rather than delegating critical business logic to unconstrained LLMs, BrainWise uses a hybrid architecture:

1. **Deterministic Rules & Formulas**: Mathematical unit economics, ICE clamping, bounded modifiers, DAG dependency sorting, and threshold kill-switches execute via deterministic TypeScript logic.
2. **Context-Grounded Reasoning**: LLM reasoning is used strictly for interpretive synthesis, nuance extraction, and grounded narrative formulation, constrained by strict schemas and validated facts.

```
┌────────────────────────────────────────────────────────┐
│                   SHARED BUSINESS BRAIN                │
│       Validated Facts, ICP, Stage, Unit Economics      │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│               GROWTH DIAGNOSIS ENGINE                  │
│  - 15 Business Dimensions (Awareness to Capacity)      │
│  - Severity: CRITICAL | HIGH | MEDIUM | LOW            │
│  - Classification: CONFIRMED | PROBABLE | POTENTIAL    │
│  - INSUFFICIENT_EVIDENCE Guard (No false CRO calls)    │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│           GROWTH OPPORTUNITY INTELLIGENCE              │
│  - Competitor Whitespace vs Inbound Pricing Friction   │
│  - Strict Zero Video Filter (SVG / Outreach / Content) │
│  - Revenue Impact, CAC Reduction %, Difficulty         │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│           PRIORITIZATION & ICE SCORING ENGINE          │
│  - Raw ICE: Impact (1-10) * Confidence * Ease          │
│  - Multipliers: Urgency, Goal Fit, Capacity Feasibility│
│  - Anti-Orphan Rule: Mandatory Goal Traceability       │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│             CLOSED-LOOP STRATEGIC LEARNING             │
│  - 10 Memory Categories (Channel, Offer, Creative, etc)│
│  - Outcome: POSITIVE | NEGATIVE | INCONCLUSIVE         │
│  - Anti-Fatigue Suppression (Threshold >= 3)           │
│  - Promotion Rule: Directly Measured Facts -> Brain    │
└────────────────────────────────────────────────────────┘
```

---

## 2. Multi-Dimensional Growth Diagnosis Engine

### 2.1 The 15 Diagnosis Dimensions
The engine evaluates business constraints across:
1. `AWARENESS`: Top-of-funnel discovery, ICP reach.
2. `AUDIENCE_QUALITY`: Fit with high-intent decision-makers.
3. `TRAFFIC`: Inbound volume across qualified channels.
4. `LEAD_GENERATION`: Contact capture velocity.
5. `LEAD_QUALIFICATION`: ICP criteria validation.
6. `CONVERSION`: Funnel and checkout step initiation.
7. `SALES`: Deal velocity and demo conversion.
8. `REVENUE`: Monthly gross revenue and ARR expansion.
9. `RETENTION`: Day-14 and Day-60 active engagement.
10. `REPEAT_PURCHASES`: Expansion and reorder velocity.
11. `REFERRALS`: Viral coefficient $K$.
12. `CAC`: Cost per qualified acquired customer.
13. `LTV`: Cumulative gross customer contribution.
14. `GROSS_MARGIN`: Direct unit margin after delivery.
15. `OPERATIONAL_CAPACITY`: Founder and team bandwidth limits.

### 2.2 The Missing Data Guardrail
Standard AI systems invent conversion bottlenecks without verifying whether web analytics are installed. BrainWise **strictly enforces the Missing Data Guardrail**:
- If `trackedConversionRate` and `monthlyVisitors` are missing:
  - Classification: `INSUFFICIENT_EVIDENCE`.
  - Severity: `MEDIUM`.
  - Problem: *"Conversion efficiency cannot be verified due to lack of instrumented funnel analytics."*
  - Corrective Action: *"Deploy basic conversion instrumentation before increasing external marketing spend."*

---

## 3. Prioritization & ICE Scoring Engine

### 3.1 Rubric Specifications
- **Impact (1–10)**:
  - 9–10: Direct $> 25\%$ revenue lift or $> 30\%$ CAC reduction.
  - 7–8: Substantial efficiency gain or conversion lift ($10\% - 25\%$).
  - 4–6: Incremental workflow or operational convenience.
  - 1–3: Marginal or speculative improvement.
- **Confidence (1–10)**:
  - 9–10: Corroborated by directly measured analytics or verified historical experiment.
  - 7–8: Backed by verified competitor whitespace and Business Brain facts.
  - 4–6: Informed assumption or external industry analog.
  - 1–3: Speculative unvalidated hypothesis.
- **Ease (1–10)**:
  - 9–10: Executable in $< 2$ hours by solo founder with existing tools.
  - 7–8: Executable in $2 - 6$ hours with standard collateral.
  - 4–6: Multi-day effort requiring new instrumentation or assets.
  - 1–3: Multi-week complex technical integration.

### 3.2 Bounded Multipliers
$$\text{Final Score} = \text{Raw ICE} \times M_{\text{urgency}} \times M_{\text{goal}} \times M_{\text{feasibility}}$$
- $M_{\text{urgency}}$: Critical deadline or active bottleneck = $1.20$; standard = $1.0$; low = $0.90$.
- $M_{\text{goal}}$: Aligned with primary goal = up to $1.15$; unrelated = $0.85$.
- $M_{\text{feasibility}}$: Workload within available founder capacity = $1.0$; exceeds bandwidth = $0.80$.

---

## 4. Closed-Loop Strategic Memory & Anti-Fatigue Protocol

### 4.1 Ten Domain Categories
1. `CHANNEL_MEMORY`: Performance of specific acquisition paths.
2. `AUDIENCE_MEMORY`: Segment responsiveness and pain-point resonance.
3. `OFFER_MEMORY`: Pricing packages, trial structures, and guarantee terms.
4. `CREATIVE_ANGLE_MEMORY`: Contrarian hooks, proof angles, and messaging.
5. `CAMPAIGN_FORMAT_MEMORY`: SVG carousels vs cold outreach copy.
6. `EXPERIMENT_MEMORY`: Hypothesis validity records.
7. `GROWTH_LEARNING`: Stage-specific operational insights.
8. `OPERATIONAL_LEARNING`: Execution friction and tooling efficiencies.
9. `FINANCIAL_LEARNING`: Realized CAC, payback, and churn.
10. `MARKET_COMPETITIVE_LEARNING`: Competitor reactions and market shifts.

### 4.2 Anti-Fatigue Intelligence
- **Fatigue Threshold**: $\ge 3$ consecutive underperformances flags a theme as `isFatigued: true`.
- **Suppression Mechanism**: `growthRecommendationEngine` filters out fatigued themes, preventing the AI from repeatedly recommending failing angles.
- **Nuanced Fatigue**: Channel fatigue is distinct from creative fatigue. If a specific creative angle fails on LinkedIn, the LinkedIn channel is not banned; only the failed angle is suppressed.

### 4.3 Idempotency & Fact Promotion
- Duplicate submissions of the same learning event are rejected via transactional memory checks (`isDuplicate: true`).
- Promotion to `workspaces/{workspaceId}/businessFacts` occurs **only** when evidence is `DIRECTLY_MEASURED` or `INDEPENDENTLY_VERIFIED` with sample size $\ge 10$ and positive or confirmed negative outcome.
