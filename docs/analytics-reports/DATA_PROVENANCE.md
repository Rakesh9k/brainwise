# BRAINWISE DATA PROVENANCE & FACT VERIFICATION SPECIFICATION
**Document ID:** `docs/analytics-reports/DATA_PROVENANCE.md`  
**Status:** Living Engineering Standard  
**Version:** 1.0.0  

---

## 1. Core Principle: Provenance Primacy

In BrainWise Analytics & Reports, **every numerical metric displayed or synthesized in executive reports must trace back to an authorized, verifiable source**.

No AI assistant, LLM summarizer, or dashboard calculation is permitted to fabricate, extrapolate, or alter financial numbers.

---

## 2. Nine Explicit Metric States

| State | Definition | Display Badge Tone | Allowed in Executive Briefs? |
|---|---|---|---|
| `VERIFIED` | Fully reconciled against authoritative payment/storefront records within freshness SLA | Green (`success`) | **Yes** (Authoritative) |
| `PARTIALLY_VERIFIED` | Derived from mixed authoritative sources with complete reconciliations | Green/Neutral | **Yes** (With note) |
| `ESTIMATED` | Calculated via statistically representative sample or empirical proxy | Amber (`accent`) | **Yes** (Clearly labeled) |
| `MODELED` | Synthesized using economic benchmark or scenario simulator | Blue (`info`) | **Yes** (Labeled as Modeled) |
| `FORECAST` | Mathematical projection of future horizon (not actuals) | Purple (`accent`) | **Yes** (Mandatory uncertainty disclosure) |
| `INSUFFICIENT_DATA` | Denominator zero, missing essential fields, or sample $< \text{Required } N$ | Muted / Gray | **No** (Disclosed limitation) |
| `STALE` | Record timestamp exceeds max allowed freshness hours (SLA breached) | Warning / Orange | **No** (Requires connector refresh) |
| `UNAVAILABLE` | Connector disconnected or zero observations available | Muted / Gray | **No** (Action to connect) |
| `INVALID` | Violated boundary validation (e.g. negative CAC, CTR $> 100\%$) | Red (`critical`) | **No** (Quarantined) |

---

## 3. Data Lineage Matrix

```
[External Sources]
  ├── Stripe / Payment Gateway ──► Source Records ──┐
  ├── Shopify / Storefront DB   ──► Source Records ──┼──► [Data Reconciliation Engine]
  ├── GA4 / Ads Pixels         ──► Source Records ──┘          │
  └── Local Workspace Activity (Tasks, Goals)                 │ Matches & audits
                                                              ▼
                                                   [Normalized Ledger Records]
                                                              │
                                                              ▼
                                                   [Metric Calculator]
                                                              │ Applies Canonical Formulas
                                                              ▼
                                                   [Immutable Metric Snapshot]
                                                   (SHA-256 Digest Attached)
                                                              │
                                                              ▼
                                                   [Executive Reporting Engine]
                                                              │ Validates Narrative Claims
                                                              ▼
                                                   [Audited Executive Report]
```

---

## 4. Fact Grounding & Anti-Hallucination Guardrails

1. **Numerical Claim Extraction:** The `ReportValidator` extracts all numerical assertions ($ amounts, percentages, counts) from generated report text using regular expressions.
2. **Tolerance Bounds:** Checks extracted numbers against verified canonical metrics within a strict $\le 1.0\%$ rounding tolerance.
3. **Rejection Trigger:** If any number in the narrative does not correspond to a verified metric in the snapshot, the report creation is **aborted with `REJECTED_AUDIT_FAILURE`** and reserved credits are automatically refunded to the workspace wallet.
