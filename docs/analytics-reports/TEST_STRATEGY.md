# BRAINWISE ANALYTICS & REPORTS: COMPREHENSIVE TEST STRATEGY
**Document ID:** `docs/analytics-reports/TEST_STRATEGY.md`  
**Status:** Canonical Test Strategy Document  
**Version:** 1.0.0  

---

## 1. Test Architecture & Coverage

The Analytics & Reports test suite validates deterministic accuracy, statistical rigour, multi-tenant security, financial integrity, and adversarial anti-hallucination defenses.

All test suites execute natively using Node.js `node:test` and `node:assert/strict` with zero flaky timeouts.

### Test Suites Inventory

| Suite | File | Tests | Coverage Focus |
|---|---|---|---|
| Universal Metric Registry | `src/server/metricRegistry.test.ts` | 7 | Canonical formulas, business-model filtering, decimal safety, zero-denominator handling, SLA staleness |
| Data Reconciliation & Health | `src/server/dataReconciliation.test.ts` | 4 | Source-imported record matching, discrepancy detection, refund checks, health status downgrade |
| Financial & Attribution | `src/server/financialAndAttribution.test.ts` | 4 | Revenue categorization (gross/net/cash/recognized), MRR waterfall, U-shaped multi-touch attribution |
| Statistical & Cross-Dept | `src/server/statisticalAndCrossDept.test.ts` | 5 | Sample size power calculations, two-proportion z-tests, Bayesian posteriors, IQR outlier detection, Pearson r |
| Predictive & Root Cause | `src/server/predictiveAndRootCause.test.ts` | 3 | 3-scenario forecasting fan-out uncertainty, minimum observation enforcement, mathematical RCA variance |
| Customer Cohorts & Reports | `src/server/cohortsAndExecutiveReport.test.ts` | 4 | RFM lifecycle stages, cohort retention heatmap, report narrative validation, immutable report persistence |
| Decision Intel & Assistant | `src/server/decisionAndAnalyticsApi.test.ts` | 3 | Closed-loop decision registration, outcome evaluation against target, grounded assistant responses |
| Security, Integrity & E2E | `src/server/analyticsProductionSecurityAndE2E.test.ts` | 5 | Multi-tenant isolation, ADR-006 two-phase reservation & refund, adversarial hallucination rejection, full E2E lifecycle |
| Unified 7-Section Dossier | `src/server/phase9UnifiedReport.test.ts` | 6 | Cross-department dossier assembly, calculation cards, evidence citations, HTML/CSV exports, strict video exclusion |

**Total Verified Tests: 41 Passing / 0 Failing / 0 Skipped.**

---

## 2. Adversarial AI Truth Testing

To guarantee that AI models never introduce manufactured certainty into business decisions:
- **Test Case 1:** The model generates a narrative with an inflated revenue claim ($85,000 when verified is $1,680) -> Validator rejects with `claimsAuditedCount: 1, unsupportedClaims: [85000]`.
- **Test Case 2:** The model alters CAC to look artificially favorable ($4.20 instead of $14.50) -> Validator flags numerical discrepancy and aborts report persistence.
- **Test Case 3:** The model ignores missing churn telemetry -> System assigns `INSUFFICIENT_DATA` and discloses limitation.
