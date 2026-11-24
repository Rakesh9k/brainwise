# BrainWise Competitive Intelligence — Architecture & System Design

## 1. System Overview

The Competitive Intelligence system is designed as an autonomous, multi-agent intelligence pipeline operating on top of the BrainWise Persistent Business Brain. Rather than executing a monolithic LLM prompt, the system orchestrates 18 specialized intelligence engines feeding into a shared Evidence Lake.

```
                           +----------------------------------------+
                           |     User Natural Language Prompt       |
                           |  "I want to start a premium chocolate  |
                           |             brand in India"            |
                           +----------------------------------------+
                                               |
                                               v
                               +-------------------------------+
                               |  Business Context Engine      |
                               |  - 12 Dimension Extraction    |
                               |  - Dynamic Research Plan      |
                               +-------------------------------+
                                               |
                                               v
                               +-------------------------------+
                               |  Competitor Discovery Engine  |
                               |  - 10 Discovery Tiers         |
                               |  - 6-Factor Relevance Score   |
                               |  - Canonical Resolution       |
                               +-------------------------------+
                                               |
                     +-------------------------+-------------------------+
                     |                         |                         |
                     v                         v                         v
       +---------------------------+ +--------------------+ +---------------------------+
       | Product & Pricing Engine  | | Marketing & Voice  | | Financial & Trends Engine |
       | - Normalized Catalogs     | | - Customer Reviews | | - Honest Scale Signals    |
       | - Price Tier Ladders      | | - Pain Point Themes| | - Velocity Phases         |
       | - Positioning Statements  | | - SEO Footprints   | | - Threat Matrix           |
       +---------------------------+ +--------------------+ +---------------------------+
                     \                         |                         /
                      \                        |                        /
                       v                       v                       v
                      +-------------------------------------------------+
                      |           Competitive Evidence Lake             |
                      |  - Raw Claims & Verifications (VERIFIED/EST)    |
                      |  - Authority Ratings & Freshness Decay          |
                      |  - Contradiction & Anomaly Detection            |
                      +-------------------------------------------------+
                                               |
                     +-------------------------+-------------------------+
                     |                                                   |
                     v                                                   v
       +-------------------------------+                   +-------------------------------+
       | Competitive Strategy Engine   |                   | Competitor Watch Engine       |
       | - Multi-Axis Benchmarks       |                   | - Snapshot Diffs              |
       | - 2D Euclidean Distance       |                   | - Price/Feature Drift Alerts  |
       | - 12-Factor Opportunities     |                   | - 6-Factor Actionable Advice  |
       +-------------------------------+                   +-------------------------------+
                     |                                                   |
                     +-------------------------+-------------------------+
                                               |
                                               v
                               +-------------------------------+
                               |   Comprehensive Report Engine |
                               |   - 24 Structured Sections    |
                               |   - Markdown & JSON Exports   |
                               +-------------------------------+
                                               |
                                               v
                               +-------------------------------+
                               | Conversational Advisor Engine |
                               | - Ground Truth Citations      |
                               | - Proactive Follow-up Actions |
                               +-------------------------------+
```

---

## 2. Component Directory & File Structure

```
src/
├── pages/app/
│   └── CompetitiveIntelligencePage.tsx        # React 19 Frontend UI Dashboard
├── services/
│   └── apiClient.ts                          # Client API bindings
└── server/
    ├── types/
    │   └── competitiveIntelligence.ts         # Master TypeScript data contracts
    ├── repositories/
    │   └── competitiveIntelligenceRepository.ts# Data access & Firestore persistence
    ├── services/
    │   ├── businessContextEngine.ts           # Module 1: Business Context Extraction
    │   ├── competitorDiscoveryEngine.ts       # Module 2: 10-Tier Discovery & Scoring
    │   ├── productAndPricingEngine.ts         # Modules 4, 5, 6: Products, Pricing, Brand
    │   ├── marketingAndVoiceEngine.ts         # Modules 7, 8, 9: Marketing, Reviews, SEO
    │   ├── financialAndTrendsEngine.ts        # Modules 10, 11: Scale & Market Trends
    │   ├── competitiveStrategyEngine.ts       # Modules 12, 13, 14: Strategy & Benchmarks
    │   ├── competitiveEvidenceService.ts      # Module 15: Ground Truth Evidence Lake
    │   ├── competitiveReportEngine.ts         # Module 18: 24-Section Synthesis
    │   ├── competitiveAdvisorService.ts       # Module 24: Interactive AI Advisor
    │   └── competitiveIntelligenceService.ts  # Master Coordinator & Orchestrator
    └── routes/v1/
        └── competitorRoutes.ts                # Express REST Endpoints
```

---

## 3. Core Architectural Directives

### 3.1 Two-Phase Credit Reservation Protocol (ADR-006)
- The orchestrator checks and reserves credits atomically before launching intelligence scans (`creditService.reserveCredits`).
- If an upstream failure, timeout, or security violation occurs, the system triggers `creditService.releaseReservedCredits`.
- Upon successful evidence lake population and report generation, the orchestrator commits the deduction via `creditService.commitReservedCredits`.

### 3.2 Evidence Lake & Truth Checking
- No financial or pricing metric is accepted without provenance.
- Claims carry strict verification levels:
  - `VERIFIED`: Confirmed via authoritative direct sources (regulatory filings, official pricing pages).
  - `ESTIMATED`: Triangulated via industry heuristics and search signals.
  - `UNAVAILABLE`: Explicitly flagged to prevent false precision or hallucination.
- Contradiction detection alerts users when disparate sources report conflicting metrics (e.g. price variances > 25%).

### 3.3 Strict Multi-Tenancy & SSRF Protection
- All data access in `competitiveIntelligenceRepository.ts` requires a valid `workspaceId`.
- Outbound crawler requests validate target URLs with `ssrfValidator.ts` to reject private IPv4/IPv6 ranges, loopback interfaces, and cloud metadata endpoints (`169.254.169.254`).
