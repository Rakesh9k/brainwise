# BRAINWISE BUSINESS BRAIN — PHASE 3
## Deliverable 3.2: Opportunity Prioritisation & Scoring Engine

---

### 1. Architectural Mission

Founders are constantly bombarded with growth ideas: launching new products, opening new channels, investing in paid search, attending trade shows, or revamping packaging. Without a structured prioritization model, teams succumb to "shiny object syndrome" and squander working capital.

The **BrainWise Opportunity Prioritisation Engine** ([`opportunityScoringService.ts`](file:///d:/brainwise%20pro/brainwise%20(1)/src/server/services/opportunityScoringService.ts)) evaluates every prospective business initiative using a transparent, multi-factor mathematical scoring model.

---

### 2. The 5-Factor Mathematical Model

Every candidate opportunity is rated on five distinct dimensions from $0$ to $100$:

$$\text{CompositeScore} = \sum_{i=1}^{5} (R_i \times W_i)$$

Where $R_i$ is the raw factor score ($0-100$) and $W_i$ is the normalized weight:

| Factor | Notation | Suggested Weight ($W_i$) | Architectural Rationale |
| :--- | :---: | :---: | :--- |
| **Potential Business Impact** | $R_{\text{impact}}$ | **30%** ($0.30$) | Measures revenue magnitude, market expansion, and enterprise value upside. |
| **Strategic Goal Alignment** | $R_{\text{alignment}}$ | **25%** ($0.25$) | Measures direct contribution to active quarterly business goals (`goalRepository`). |
| **Evidence Confidence** | $R_{\text{evidence}}$ | **20%** ($0.20$) | Penalizes ungrounded speculation; rewards initiatives backed by verified data. |
| **Implementation Feasibility** | $R_{\text{feasibility}}$ | **15%** ($0.15$) | Evaluates team bandwidth, technical complexity, and regulatory friction. |
| **Cost Efficiency** | $R_{\text{cost}}$ | **10%** ($0.10$) | Ratio of expected return against required upfront capital expenditure. |

$$\sum W_i = 0.30 + 0.25 + 0.20 + 0.15 + 0.10 = 1.00$$

---

### 3. Transparent Factor Contribution Decomposition

A core tenet of BrainWise reasoning is **complete explainability**. The scoring engine never returns an opaque number; it decomposes the exact point contribution of each factor:

$$\text{Contribution}_i = \text{round}\left(R_i \times W_i, 2\right)$$

#### Concrete Example: B2B Specialty Cafe Keg Subscription
Given raw scores:
- Business Impact: $90$
- Strategic Goal Alignment: $95$
- Evidence Confidence: $90$
- Implementation Feasibility: $85$
- Cost Efficiency: $80$

The engine computes:
$$\text{Impact Contribution} = 90 \times 0.30 = 27.00$$
$$\text{Alignment Contribution} = 95 \times 0.25 = 23.75$$
$$\text{Evidence Contribution} = 90 \times 0.20 = 18.00$$
$$\text{Feasibility Contribution} = 85 \times 0.15 = 12.75$$
$$\text{Cost Contribution} = 80 \times 0.10 = 8.00$$
$$\mathbf{\text{Composite Score}} = 27.00 + 23.75 + 18.00 + 12.75 + 8.00 = \mathbf{89.5} \approx \mathbf{90}$$

---

### 4. Opportunity Classification Tiers

Opportunities are grouped into five actionable priority tiers based on composite scores and user override state:

| Priority Tier | Composite Score Range | Operational Directive |
| :--- | :---: | :--- |
| `high_priority` | **$\ge 75$** | Primary focus for active sprint planning. Immediate resourcing. |
| `medium_priority` | **$50 - 74$** | Secondary backlog. Resourced when primary initiatives reach steady state. |
| `low_priority` | **$< 50$** | High friction or low alignment. Kept on ice. |
| `deferred` | User Set | Postponed to a future quarter; excluded from active departmental workflows. |
| `rejected` | User Set | Explicitly disapproved by founder; permanently suppressed from recommendations. |

---

### 5. Mandatory Reasoning Safeguards

#### 5.1 Non-Guarantee Revenue Disclaimer
Every opportunity payload emitted by the engine includes a mandatory, non-negotiable legal disclaimer:
> *"Opportunity scores indicate relative strategic alignment under current business assumptions and do NOT imply guaranteed revenue, conversion, or commercial success."*

#### 5.2 Zero False-Precision Financials
The engine strictly prohibits presenting unverified speculative returns as exact financial promises. Estimated returns are labeled as calculated range bands with explicit assumptions rather than point predictions.
