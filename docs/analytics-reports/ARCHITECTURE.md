# BRAINWISE ANALYTICS & REPORTS: ARCHITECTURE SPECIFICATION
**Document ID:** `docs/analytics-reports/ARCHITECTURE.md`  
**Status:** Production Architecture Specification  
**Version:** 1.0.0  

---

## 1. System Overview

BrainWise Analytics & Reports serves as the central deterministic performance intelligence layer of the operating system.

It bridges low-level transaction events and cross-department telemetry (Idea Intelligence, Market Watch, Competitive Radar, Brand Studio, Growth Planner) to provide mathematically verified, explainable, and reproducible business intelligence.

```
                               ┌──────────────────────────────────────────────────────────┐
                               │                    FRONTEND UI LAYER                     │
                               │  /business-performance  &  /reports                     │
                               │  (AnalyticsReportsPage.tsx & useAnalyticsIntelligence)   │
                               └────────────────────────────┬─────────────────────────────┘
                                                            │
                                                            ▼
                               ┌──────────────────────────────────────────────────────────┐
                               │                   REST API ROUTERS (v1)                  │
                               │  /api/v1/workspaces/:workspaceId/analytics               │
                               │  /api/v1/workspaces/:workspaceId/reports                 │
                               └─────────┬──────────────────────────────────┬─────────────┘
                                         │                                  │
                   ┌─────────────────────┴──────────────────┐               │
                   ▼                                        ▼               ▼
        ┌─────────────────────┐                  ┌─────────────────────┐ ┌──────────────────────┐
        │ Universal Metric    │                  │ Data Reconciliation │ │ Credit Service       │
        │ Registry & Engine   │                  │ & Health Center     │ │ (ADR-006 Two-Phase   │
        │ (9 Metric States)   │                  │ (dataHealthService) │ │ Reservation/Settle)  │
        └──────────┬──────────┘                  └──────────┬──────────┘ └──────────────────────┘
                   │                                        │
        ┌──────────┴──────────┬─────────────────────────────┴──────────┐
        ▼                     ▼                                        ▼
┌──────────────┐      ┌──────────────┐                        ┌──────────────┐
│ Financial &  │      │ Marketing    │                        │ Statistical  │
│ Revenue Eng. │      │ Attribution  │                        │ Intelligence │
│ (MRR, Cash)  │      │ (U-Shaped)   │                        │ (MDE, Power) │
└───────┬──────┘      └───────┬──────┘                        └───────┬──────┘
        │                     │                                       │
        └──────────┬──────────┴─────────────────────────────┬─────────┘
                   ▼                                        ▼
        ┌─────────────────────┐                  ┌─────────────────────┐
        │ Customer & Cohort   │                  │ Performance         │
        │ Intelligence Engine │                  │ Correlation Engine  │
        │ (Retention Matrix)  │                  │ (Pearson + Brain v) │
        └──────────┬──────────┘                  └──────────┬──────────┘
                   │                                        │
        ┌──────────┴────────────────────────────────────────┴──────────┐
        ▼                                                              ▼
┌─────────────────────────────┐                      ┌─────────────────────────────┐
│ Root Cause Analysis (RCA)   │                      │ Predictive Analytics Engine │
│ Variance Decomposition      │                      │ 3-Scenario Projections      │
└──────────────┬──────────────┘                      └──────────────┬──────────────┘
               │                                                    │
               └──────────────────────┬─────────────────────────────┘
                                      ▼
                      ┌───────────────────────────────┐
                      │ Executive Reporting Engine    │
                      │ & Report Validator            │
                      │ (Cryptographic SHA-256 Hash)  │
                      └───────────────┬───────────────┘
                                      │
                                      ▼
                      ┌───────────────────────────────┐
                      │ Decision Intelligence Engine  │
                      │ (Closed-Loop Outcome Tracking)│
                      └───────────────────────────────┘
```

---

## 2. Subsystem Breakdown

### 2.1 Universal Metric Registry (`metricRegistry.ts` & `metricCalculator.ts`)
- **Canonical Definition Authority:** Defines metric metadata, formulas, units, aggregation methods, business-model relevance, and validation boundaries.
- **Decimal Safety:** All calculations employ integer scaling or Banker's decimal rounding (`MetricCalculator.round()`) to avoid floating-point errors.
- **Zero-Denominator Guardrail:** Returns `null` and assigns `INSUFFICIENT_DATA` rather than throwing or producing `Infinity` / `NaN`.
- **9 Metric States:** `VERIFIED`, `PARTIALLY_VERIFIED`, `ESTIMATED`, `MODELED`, `FORECAST`, `INSUFFICIENT_DATA`, `STALE`, `UNAVAILABLE`, `INVALID`.

### 2.2 Data Ingestion & Reconciliation (`dataReconciliationEngine.ts` & `dataHealthService.ts`)
- **Source Manifest Matching:** Compares raw source transactions (Stripe, Shopify, GA4, CSV) against normalized ledger records.
- **Discrepancy Detection:** Flags missing transactions, duplicate event hashes, conflicting amounts, and unprocessed refunds without modifying financial records.
- **Data Health Center:** Tracks connector status, auth validity, data freshness (hours), record counts, and historical coverage. Refuses to label incomplete connectors as healthy.

### 2.3 Financial & Revenue Intelligence (`financialIntelligenceEngine.ts`)
- **Strict Categorization:** Clearly isolates Gross Revenue, Net Revenue, Cash Collected, Recognized Revenue, Booked Revenue, and Recurring Revenue.
- **SaaS Pack:** MRR Waterfall (Starting, New, Expansion, Contraction, Churn), ARR, NRR %, GRR %, Quick Ratio.
- **Ecommerce Pack:** Gross Sales, Discounts, Refunds, Net Sales, AOV, Return Rate %, Category Profitability.
- **Service/Salon/Restaurant Pack:** Capacity Utilization %, Cancellation & No-Show Rate %, Average Transaction Value (ATV), Revenue Per Customer.

### 2.4 Marketing Attribution Engine (`marketingAttributionEngine.ts`)
- **Multi-Touch Models:** First-Touch, Last-Touch, Linear ($1/N$), Time-Decay (7-day half-life exponential decay), and Position-Based U-Shaped (40/20/40).
- **Assisted Conversions:** Tracks intermediate touchpoints contributing to customer journeys.
- **Unattributed Revenue Isolation:** Explicitly quarantines unmapped journeys into `UNATTRIBUTED` buckets.

### 2.5 Statistical Intelligence Engine (`statisticalIntelligenceEngine.ts`)
- **Power & MDE Calculations:** Calculates required sample size using baseline conversion rate, relative MDE, significance level ($\alpha=0.05$), and statistical power ($1-\beta=0.80$). Refuses $N \ge 30$ heuristic shortcuts.
- **Two-Proportion Z-Test & 95% Confidence Intervals:** Computes pooled and unpooled standard errors and p-values.
- **Bayesian Conjugate Updates:** Beta-Binomial conjugate posterior for probability that variant beats control.
- **Outlier Detection:** Interquartile Range (IQR) fence rule ($Q1 - 1.5\text{IQR}, Q3 + 1.5\text{IQR}$).

### 2.6 Predictive Analytics Engine (`predictiveAnalyticsEngine.ts`)
- **3-Scenario Forecasting:** Conservative, Expected, and Optimistic projections with expanding uncertainty confidence intervals.
- **Mandatory Uncertainty Disclosure:** Discloses methodology and limits; refuses to manufacture forecasts when historical observations $< 3$.

### 2.7 Root Cause Analysis Engine (`rootCauseAnalysisEngine.ts`)
- **Mathematical Variance Decomposition:** Decomposes revenue delta into Volume Effect ($\Delta V \times \text{Base Price}$), Pricing/AOV Effect ($\Delta \text{Price} \times \text{Current Volume}$), Refund Effect, and Churn Effect.
- **5 Epistemic Evidence Tiers:** `VERIFIED_OBSERVATION`, `STATISTICALLY_SUPPORTED`, `PLAUSIBLE_HYPOTHESIS`, `UNVERIFIED_ASSUMPTION`, `MISSING_EVIDENCE`.

### 2.8 Customer & Cohort Intelligence (`customerCohortEngine.ts`)
- **Customer Lifecycle Segmentation:** NEW, ACTIVE_REPEAT, VIP, AT_RISK, CHURNED via RFM analysis.
- **Cohort Retention Matrix:** Signup month cohorts tracked across months elapsed (0 to 6+).
- **Pareto Concentration:** Calculates revenue share of top 20% customers.

### 2.9 Executive Reporting & Validation (`executiveReportingEngine.ts` & `reportValidator.ts`)
- **Audited Narrative Synthesis:** Scans narrative text and validates every asserted number against verified metrics. Rejects unsupported quantitative claims.
- **Cryptographic Immutability:** Computes SHA-256 snapshot hash of all inputs and canonical metrics.
- **Dual Export:** High-DPI print-ready HTML and RFC-4180 CSV exports.

### 2.10 Decision Intelligence Engine (`decisionIntelligenceEngine.ts`)
- **Closed-Loop Execution:** Links strategic recommendations to measurable baselines, targets, review dates, and post-implementation outcome assessments.
