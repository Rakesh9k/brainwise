# BrainWise Competitive Intelligence — Research Pipeline & Execution Workflow

## 1. End-to-End Orchestration Flow

The competitive research pipeline operates autonomously through 8 discrete execution stages managed by `competitiveIntelligenceService.ts`.

```
[ Stage 1: Context Extraction ]
        │
        ▼
[ Stage 2: Competitor Discovery (10 Tiers) ]
        │
        ▼
[ Stage 3: Parallel Intelligence Engines ]
        ├── Product & Pricing Analysis
        ├── Marketing & Customer Voice Extraction
        └── Financial Signals & Trend Analysis
        │
        ▼
[ Stage 4: Evidence Lake Ingestion & Verification ]
        │
        ▼
[ Stage 5: Multi-Axis Benchmarking & 2D Euclidean Matrix ]
        │
        ▼
[ Stage 6: Market Opportunities & Strategic Playbooks ]
        │
        ▼
[ Stage 7: 24-Section Report Generation ]
        │
        ▼
[ Stage 8: Interactive AI Advisor Readiness ]
```

---

## 2. Stage Breakdown

### Stage 1: Business Context Framing
- **Input:** Single natural-language business idea (e.g., *"I want to launch an AI accounting tool for freelancers in the UK"*).
- **Processing:** `businessContextEngine.ts` parses 12 dimensions: Industry, Sub-industry, Product Category, Target Geography, Customer Segments, Business Models, Price Positioning, Distribution Models, Stage, Market Segments, Adjacent Industries, and a Dynamic Research Plan.
- **Output:** Structured `BusinessContextAnalysis` record.

### Stage 2: 10-Tier Competitor Discovery & Relevance Scoring
- **Processing:** `competitorDiscoveryEngine.ts` identifies rivals across 10 strategic tiers:
  1. `DIRECT`
  2. `INDIRECT`
  3. `SUBSTITUTE`
  4. `EMERGING`
  5. `LOCAL`
  6. `REGIONAL`
  7. `NATIONAL`
  8. `INTERNATIONAL`
  9. `ASPIRATIONAL`
  10. `POTENTIAL_DISRUPTOR`
- **Scoring:** Calculates 6-dimensional relevance (Product, Customer, Geography, Business Model, Pricing, Competitive Threat) on a 0–100 scale.
- **Canonical Resolution:** Normalizes names (e.g., *"Paul & Mike Farm to Bar Inc."* -> `paulandmike`) to prevent duplicate indexing.

### Stage 3: Parallel Domain Intelligence
- **Product & Pricing:** Extracts normalized product catalogs, calculates price ladders (min/max/average/median), and extracts positioning statements.
- **Marketing & Voice:** Synthesizes traffic estimates, social follower footprints, and clusters customer reviews into specific sentiment themes and pain points.
- **Financial & Market Trends:** Evaluates scale indicators with strict truth checking (`VERIFIED` vs `ESTIMATED` vs `UNAVAILABLE`) and categorizes macro trends into velocity phases (`EMERGING`, `ACCELERATING`, `PEAK`, `DECELERATING`).

### Stage 4: Evidence Lake Ingestion
- Populates `EvidenceClaim` records for every observation.
- Computes `authorityScore` (0–100) based on source credibility (official websites vs aggregators).
- Flags contradictions if pricing or revenue metrics from different sources diverge significantly.

### Stage 5: Explainable Benchmarking & Positioning
- `competitiveStrategyEngine.ts` scores each competitor across 5 transparent dimensions: Product Breadth, Brand Strength, Pricing Competitiveness, Customer Sentiment, and Innovation Velocity.
- Generates 2D Euclidean coordinates and determines whitespace opportunities and closest rivals.

### Stage 6: Strategic Recommendations
- Identifies actionable gaps across 12 strategic opportunity factors (e.g. Unmet Customer Pain Points, Underserved Niches, Pricing Whitespace, Channel Neglect).
- Formulates high-impact, actionable playbooks for competitive differentiation.

### Stage 7: 24-Section Synthesis & Persistence
- `competitiveReportEngine.ts` compiles all findings into a structured 24-section document.
- Generates markdown and JSON representations for export and client rendering.

### Stage 8: Conversational Advisor
- `competitiveAdvisorService.ts` indexes the project's evidence and dossier data.
- Responds to conversational inquiries with direct citations to ground truth evidence claims.
