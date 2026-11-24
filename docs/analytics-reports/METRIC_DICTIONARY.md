# BRAINWISE UNIVERSAL METRIC DICTIONARY
**Document ID:** `docs/analytics-reports/METRIC_DICTIONARY.md`  
**Status:** Canonical Metric Reference  
**Version:** 1.0.0  

---

## 1. Principles of Metric Integrity

1. **No Silent Zeroing:** A missing observation is never converted to `0`. It is represented as `null` with verification state `INSUFFICIENT_DATA`.
2. **Deterministic Provenance:** All financial numbers are computed by deterministic backend logic with decimal-safe rounding. AI models may summarize or hypothesize, but never calculate numbers independently.
3. **9 Explicit Metric Verification States:**
   - `VERIFIED`: Source verified, reconciled, within freshness SLA.
   - `PARTIALLY_VERIFIED`: Some source data verified; non-critical fields estimated.
   - `ESTIMATED`: Computed via empirical sample or proxy.
   - `MODELED`: Synthesized using economic benchmark.
   - `FORECAST`: Statistical projection of future performance.
   - `INSUFFICIENT_DATA`: Missing essential inputs or zero denominator.
   - `STALE`: Freshness SLA breached.
   - `UNAVAILABLE`: Connector disconnected or no data available.
   - `INVALID`: Range or constraint validation violated.

---

## 2. Metric Specifications

### 2.1 Financial Metrics

| Metric ID | Canonical Name | Formula | Unit | Aggregation | Applicable Models |
|---|---|---|---|---|---|
| `REV_GROSS` | Gross Revenue | `Sum(Gross Transactions)` | Currency | SUM | All |
| `REV_NET` | Net Revenue | `Gross - (Refunds + Discounts + Chargebacks)` | Currency | SUM | All |
| `GROSS_PROFIT` | Gross Profit | `Net Revenue - COGS` | Currency | SUM | All |
| `CONTRIBUTION_MARGIN` | Contribution Margin | `((Net Revenue - Variable Costs) / Net Revenue) * 100` | % | RATIO | All |
| `OPEX` | Operating Expenses | `Sum(Payroll + Rent + Software + Overhead)` | Currency | SUM | All |
| `CASH_FLOW` | Net Operating Cash Flow | `Cash Inflows - Cash Outflows` | Currency | SUM | All |
| `BURN_RATE` | Net Monthly Burn Rate | `Outflows - Inflows (when Outflows > Inflows)` | Currency | LATEST | Startup, SaaS |
| `RUNWAY` | Cash Runway | `Liquid Cash / Monthly Burn Rate` | Months | LATEST | Startup, SaaS |
| `PROFITABILITY_NET` | Net Profit Margin | `(Net Income / Net Revenue) * 100` | % | RATIO | All |

### 2.2 Growth Metrics

| Metric ID | Canonical Name | Formula | Unit | Aggregation | Applicable Models |
|---|---|---|---|---|---|
| `GROWTH_RATE_REV` | Revenue Growth Rate (MoM) | `((Rev_Current - Rev_Prior) / Rev_Prior) * 100` | % | RATIO | All |
| `GROWTH_RATE_CUST` | Customer Growth Rate (MoM) | `((Cust_Current - Cust_Prior) / Cust_Prior) * 100` | % | RATIO | All |
| `GOAL_COMPLETION_RATE` | Strategic Goal Completion | `(Completed Goals / Active Goals) * 100` | % | AVERAGE | All |
| `GROWTH_VELOCITY` | Weekly Execution Velocity | `Tasks Completed + Experiments Concluded` | Count | SUM | All |

### 2.3 Marketing Metrics

| Metric ID | Canonical Name | Formula | Unit | Aggregation | Applicable Models |
|---|---|---|---|---|---|
| `MKT_REACH` | Total Qualified Reach | `Sum(De-duplicated Unique Audience Impressions)` | Count | SUM | All |
| `MKT_CTR` | Click-Through Rate (CTR) | `(Clicks / Impressions) * 100` | % | RATIO | All |
| `MKT_CVR` | Conversion Rate (CVR) | `(Conversions / Visitors) * 100` | % | RATIO | All |
| `MKT_CAC` | Customer Acquisition Cost | `Total Acquisition Spend / New Acquired Customers` | Currency | RATIO | All |
| `MKT_ROAS` | Return on Ad Spend (ROAS) | `Attributed Revenue / Ad Spend` | Ratio | RATIO | Ecom, D2C, SaaS |

### 2.4 Customer Metrics

| Metric ID | Canonical Name | Formula | Unit | Aggregation | Applicable Models |
|---|---|---|---|---|---|
| `CUST_RETENTION_RATE` | Cohort Retention Rate | `(Active Cohort End / Initial Cohort Size) * 100` | % | RATIO | SaaS, Ecom, Services |
| `CUST_CHURN_RATE` | Customer Churn Rate | `(Lost Customers / Starting Customers) * 100` | % | RATIO | SaaS, Services |
| `CUST_LTV` | Customer Lifetime Value | `(ARPU * Gross Margin %) / Churn Rate` | Currency | LATEST | All |
| `CUST_ARPU` | Average Revenue Per User | `Total Revenue / Total Active Users` | Currency | RATIO | All |

### 2.5 Business-Model Specific Metrics

#### SaaS Pack
- `SAAS_MRR`: Monthly Recurring Revenue (`Sum(Normalized Monthly Plan Value)`)
- `SAAS_ARR`: Annual Recurring Revenue (`MRR * 12`)
- `SAAS_NRR`: Net Revenue Retention % (`((Starting + Expansion - Contraction - Churn) / Starting) * 100`)
- `SAAS_LTV_CAC_RATIO`: LTV to CAC Ratio (`LTV / CAC`)

#### Ecommerce / D2C Pack
- `ECOM_AOV`: Average Order Value (`Net Sales / Completed Orders`)
- `ECOM_REPEAT_ORDER_RATE`: 90-Day Repeat Order % (`(Customers >= 2 orders / Total Customers) * 100`)

#### Restaurant, Salon & Professional Services Pack
- `SRV_UTILIZATION_RATE`: Capacity Utilization % (`(Fulfilled Hours / Available Hours) * 100`)
- `SRV_CANCELLATION_RATE`: Cancellation & No-Show Rate % (`(Cancelled / Scheduled) * 100`)
