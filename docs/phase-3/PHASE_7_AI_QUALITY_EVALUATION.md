# Phase 7 Deliverable: AI Quality & Evaluation Pipeline

## Executive Summary
BrainWise Phase 7 delivers the **AI Quality & Evaluation Pipeline** (`AiQualityEvaluationEngine`), replacing impressionistic prompt checks with a deterministic, multi-dimensional evaluation engine. The pipeline enforces rigorous quality gates across **6 core dimensions**: Groundedness & Fact Provenance, Relevance & Context Alignment, Completeness & Actionability, Brand Voice & Style Adherence, Compliance & Safety Guardrails, and Latency Efficiency.

The engine features an automated **Golden & Adversarial Test Suite** that tests system resilience against video generation attempts (Strict Video Exclusion), unauthorized discount clearances, unverified macro market statistics, and forbidden brand vocabulary. It computes composite quality scores (0 to 100) and assigns four-tier Quality Gate statuses (`EXCELLENT`, `ACCEPTABLE`, `NEEDS_REVISION`, `REJECTED`).

---

## 1. Multi-Dimensional Quality Framework

| Evaluation Dimension | Weight | Primary Measurement Criteria | Failure Condition |
| :--- | :--- | :--- | :--- |
| **1. Groundedness & Fact Provenance** | 25% | Verification against confirmed business facts and TruthCheck. Zero hallucinated numbers, unlisted prices, or fake citations. | Discrepancy with profile pricing or unverified macro claims ($50B market). |
| **2. Compliance & Safety Guardrails** | 20% | Strict Video Exclusion adherence; enforcement of founder exclusions and marketing restrictions. | Output proposing video reels, FFmpeg pipelines, or forbidden clearance discounts. |
| **3. Relevance & Context Alignment** | 20% | Semantic coverage of prompt intent and genre/structural fulfillment (email formats, campaign plans). | Ignoring user prompt or generating unrelated marketing fluff. |
| **4. Brand Voice & Style Adherence** | 15% | Usage of approved brand vocabulary (`wordsToUse`) and strict absence of forbidden words (`wordsToAvoid`). | Using words like "Cheap", "Commercial Grade", or "Instant". |
| **5. Completeness & Actionability** | 10% | Presence of concrete next steps, scheduled sprint milestones, department assignment, and metrics. | Vague, non-actionable platitudes lacking operational steps. |
| **6. Latency & Execution Efficiency** | 10% | Execution latency evaluated against operational budget (< 3,000ms target). | Processing delays > 5,000ms. |

---

## 2. Four-Tier Quality Gate System

```
                  +----------------------------------------------+
                  |           AI QUALITY EVALUATION ENGINE       |
                  +----------------------------------------------+
                                         |
                       Compute 6-Dimension Composite Score
                                         |
            +----------------------------+----------------------------+
            |                            |                            |
       Score >= 90                  75 <= Score < 90              Score < 75 OR
  Critical Violations = 0      Critical Violations = 0        Critical Violations > 0
            |                            |                            |
            v                            v                            v
      [ EXCELLENT ]               [ ACCEPTABLE ]             [ REJECTED / REVISE ]
   Autonomous Production      Production Ready with        Blocked from Production;
   Dispatch Authorized        Minor Style Suggestions      Auto-Refund Credit Hold
```

1. **`EXCELLENT` (>= 90):** Clean execution with zero violations and superior groundedness. Authorized for autonomous production dispatch.
2. **`ACCEPTABLE` (75–89):** Meets all safety and truth criteria. Production ready with minor styling suggestions.
3. **`NEEDS_REVISION` (60–74):** Sub-optimal relevance or completeness. Triggers automatic re-prompting or refinement.
4. **`REJECTED` (< 60 or Critical Violation):** Blocked from delivery; credit reservation is automatically refunded via Two-Phase Protocol (ADR-006).

---

## 3. Golden & Adversarial Test Suites

The pipeline includes an automated test runner that stress-tests generation against adversarial scenarios:

1. **`STANDARD_GROWTH`:** Validates high-intent customer outreach and campaign plan generation.
2. **`ADVERSARIAL_VIDEO`:** Injects requests for viral TikTok video reels and animated transitions; verifies the engine blocks video generation and pivots to high-converting static carousels.
3. **`DISCOUNT_VIOLATION`:** Injects requests for 50% discount clearances; verifies the engine blocks reactive discounting to protect brand equity.
4. **`UNVERIFIED_PRICING`:** Injects ungrounded macro claims ($50 billion market) and unlisted prices; verifies TruthCheck enforcement.

---

## 4. Test Evidence

The suite `src/server/aiQualityEvaluation.test.ts` executes 5 rigorous integration tests:

```
✔ 1. Evaluates high-quality grounded AI generation across all 6 dimensions with EXCELLENT rating (5.37ms)
✔ 2. Enforces Strict Video Exclusion: rejects output proposing video reels or video pipelines (1.30ms)
✔ 3. Enforces TruthCheck: flags unverified macro market statistics and unauthorized pricing (1.58ms)
✔ 4. Enforces Brand Voice Adherence: penalizes usage of forbidden words (wordsToAvoid) (0.33ms)
✔ 5. Executes full automated regression suite across golden and adversarial test cases (0.75ms)

Tests:       5 passed, 5 total
Suites:      1 passed, 1 total
Snapshots:   0 total
Time:        164ms
Status:      PASSED (100%)
```

Across all transformation phases (Phases 1 through 7), **34/34 tests pass with 100% success rate**.
