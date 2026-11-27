# Phase 6 Deliverable: Growth Experimentation & Attribution Platform

## Executive Summary
BrainWise Phase 6 delivers the **Growth Experimentation & Attribution Platform** (`ExperimentationPlatform`), transitioning growth experiments from unvalidated task lists into a mathematically rigorous experimentation and attribution engine. It synthesizes testable growth hypotheses directly linked to the workspace's diagnosed **Primary Constraints** and competitive gaps; computes **Minimum Detectable Effect (MDE)** sample size requirements and statistical power; evaluates two-sample proportion z-scores, p-values, and 95% confidence intervals; tracks **Multi-Touch and Last-Touch Order Attribution**; and publishes lifecycle events to the **Department EventBus**.

In strict adherence to project directives, all generated challenger variants, creative prompts, and campaign formats enforce **Strict Video Exclusion** (limiting collateral to high-converting static carousels, print flyers, email outreach sequences, and landing page hero layouts).

---

## 1. Core Capabilities & Mathematical Architecture

```
+--------------------------------------------------------------------------------------------------+
|                             GROWTH EXPERIMENTATION & ATTRIBUTION PLATFORM                        |
|                                                                                                  |
|   1. Grounded Hypotheses          2. MDE Sample Size & Power      3. Statistical Significance    |
|   - "If [action] then [metric]    - Standard 2-sample formula     - Two-sample z-score & p-value |
|      increases by [lift]..."      - 80% Power / 95% Confidence    - 95% Confidence Intervals     |
|   - Linked to Primary Constraint  - Traffic velocity estimation   - Four-tier Decision Engine    |
|   - Structured A/B variants       - Low-traffic feasibility check - Winner graduation guidance   |
|                                                                                                  |
|   4. Touchpoint Attribution       5. Department EventBus          6. Strict Video Exclusion      |
|   - First-touch / Last-touch      - EXPERIMENT_STARTED            - Static multi-frame carousels |
|   - Order & revenue mapping       - EXPERIMENT_COMPLETED          - High-DPI print collateral    |
|   - ROAS & AOV calculation        - EXPERIMENT_ANALYSIS_COMPLETED - Landing page hero variants   |
+--------------------------------------------------------------------------------------------------+
```

### 1.1 Grounded Hypothesis Formulation
Every experiment begins with an evidence-grounded hypothesis tied directly to diagnosed bottlenecks:
$$\text{Hypothesis Formula: } \text{"If we [action], then [metric] will increase by [lift], because [evidence]."}$$
- **Variant A (Control):** Baseline headline, body copy, and call-to-action.
- **Variant B (Challenger):** Contrasting angle, proof point, and BrandStudio creative brief.
- **Strict Video Exclusion:** All briefs and formats explicitly exclude video generation, reels, or video pipelines.

### 1.2 MDE Sample Size & Statistical Power
Calculates the sample size needed to detect a statistically meaningful lift without false positives:
$$n_{\text{variant}} = \frac{2 \cdot (Z_{\alpha/2} + Z_\beta)^2 \cdot \bar{p} \cdot (1 - \bar{p})}{\delta^2}$$
where $\alpha = 0.05$ ($Z_{\alpha/2} = 1.96$), $\text{power} = 0.80$ ($Z_\beta = 0.8416$), $\bar{p}$ is the average pooled conversion rate, and $\delta = p_1 \cdot (\text{MDE}_{\%} / 100)$.
- Computes estimated test duration in days based on daily traffic velocity.
- Flags low-traffic warnings if runtime exceeds 45 days.

### 1.3 Statistical Significance Engine
Evaluates test outcomes using standard normal distribution approximations (Abramowitz & Stegun 7.1.26):
- Two-sample z-score and two-tailed p-value:
  $$p\text{-value} = 2 \cdot (1 - \Phi(|z|))$$
- 95% Confidence Interval for difference ($p_B - p_A$):
  $$\text{CI}_{95} = (p_B - p_A) \pm 1.96 \cdot \sqrt{\frac{p_A(1 - p_A)}{n_A} + \frac{p_B(1 - p_B)}{n_B}}$$
- Four-tier decision framework:
  1. `STATISTICALLY_SIGNIFICANT_WINNER` ($p < 0.05$, positive lift): Automatically graduate Variant B to 100% traffic.
  2. `STATISTICALLY_SIGNIFICANT_LOSER` ($p < 0.05$, negative lift): Immediately halt variant and revert to Control.
  3. `INCONCLUSIVE_NEUTRAL` ($p \ge 0.05$): Difference is statistical noise; pivot to higher-contrast hypothesis.
  4. `UNDERPOWERED_SAMPLE` ($n < \text{minimum sample}$): Insufficient data; keep running to avoid false conclusions.

### 1.4 Conversion Attribution & Order Tracking
- Maps customer purchases, orders, and revenue back to active experiment variants via touchpoint logs.
- Computes Total Attributed Revenue, Order Volume, Average Order Value (AOV), and Return on Ad Spend (ROAS).

---

## 2. API Endpoints

Four dedicated REST endpoints have been added to `src/server/routes/v1/experimentRoutes.ts`:

1. `POST /api/v1/workspaces/:workspaceId/experiments/hypothesize`
   - Generates grounded A/B hypotheses linked to primary constraint diagnosis and product catalog.
2. `POST /api/v1/workspaces/:workspaceId/experiments/sample-size`
   - Calculates required sample size per variant, runtime days, and feasibility.
3. `POST /api/v1/workspaces/:workspaceId/experiments/significance`
   - Evaluates two-sample z-score, p-value, relative lift, confidence intervals, and decision.
4. `POST /api/v1/workspaces/:workspaceId/experiments/:experimentId/attribution`
   - Aggregates multi-touch/last-touch order attribution for experiment variants.

---

## 3. Test Evidence

The suite `src/server/experimentation.test.ts` executes 5 rigorous integration tests:

```
✔ 1. Synthesizes grounded hypotheses directly from business diagnosis and primary constraints (6.15ms)
✔ 2. Computes sample size and statistical power based on MDE and traffic velocity (18.58ms)
✔ 3. Computes two-sample z-score, p-value, and confidence intervals to detect winners (0.54ms)
✔ 4. Aggregates multi-touch conversion attribution back to active experiment variants (0.35ms)
✔ 5. Publishes experiment lifecycle events on the department event bus (0.80ms)

Tests:       5 passed, 5 total
Suites:      1 passed, 1 total
Snapshots:   0 total
Time:        764ms
Status:      PASSED (100%)
```

Across all transformation phases (Phases 1 through 6), **29/29 tests pass with 100% success rate**.
