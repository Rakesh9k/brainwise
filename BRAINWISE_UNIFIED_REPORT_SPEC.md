# BRAINWISE — DEPARTMENT 9: UNIFIED REPORT EXPERIENCE & 7-SECTION DOSSIER
## Master Technical Specification (Phase 9)
### The Interconnected Executive Business Intelligence Dossier

---

## 1. Executive Summary & Design Vision

Traditional SaaS platforms produce fragmented reports: a disconnected PDF for market sizing, an isolated competitor spreadsheet, and a static brand guide. 

The **Unified Executive Dossier (Phase 9)** unifies all 7 BrainWise intelligence departments into a single interconnected, evidence-backed business intelligence dossier:
1. **Section 1: Executive Verdict & Opportunity Scoring** (Idea Intelligence)
2. **Section 2: Market Sizing & Demand Dynamics** (Market Intelligence)
3. **Section 3: Competitive Whitespace & Positioning** (Competitive Intelligence)
4. **Section 4: Unit Economics & Financial Simulation** (Financial Intelligence)
5. **Section 5: Brand Identity & Collateral Blueprint** (Brand Studio)
6. **Section 6: Multi-Horizon Operational Roadmap** (Growth Director)
7. **Section 7: Continuous Surveillance & Watch Signals** (Business Watch)

---

## 2. Core Architectural Principles

```
+-----------------------------------------------------------------------------------+
|                        UNIFIED REPORT ORCHESTRATION                               |
+-----------------------------------------------------------------------------------+
          |                    |                    |                    |
          v                    v                    v                    v
  [Idea Intelligence]   [Market Sizing]      [Competitor Matrix]  [Financial Model]
       (Score Matrix)     (TAM/SAM/SOM)        (Whitespace)        (Unit Economics)
          |                    |                    |                    |
          +--------------------+--------------------+--------------------+
                                         |
                                         v
          +-------------------------------------------------------------+
          |  [Brand Studio]       [Growth Director]   [Business Watch]  |
          |  (1.25 Modular SVG)   (ICE Task Plan)     (6-Factor Alerts) |
          +-------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                       UNIFIED 7-SECTION EXECUTIVE DOSSIER                         |
|                                                                                   |
|  - Grounded in persistent Business Brain facts & Evidence Knowledge Graph         |
|  - Interactive Calculation Cards for every metric and score                       |
|  - Primary source citations with URL, verified date, and confidence band          |
|  - High-DPI Print-Ready HTML & RFC-Compliant CSV Exports                          |
|  - Strict Zero Video Guarantee                                                    |
+-----------------------------------------------------------------------------------+
```

---

## 3. Data Contracts & Schema Specification

### 3.1 Unified Executive Dossier Model (`UnifiedExecutiveDossier`)
```typescript
export interface UnifiedExecutiveDossier {
  dossierId: string;
  workspaceId: string;
  title: string;
  businessName: string;
  verdict: 'GO' | 'CAUTION' | 'NO_GO';
  overallScore: number; // 0-100
  generatedAt: string;

  // Section 1: Executive Verdict & Opportunity Scoring
  section1_ExecutiveSummary: {
    verdictRationale: string;
    scoreMatrix: {
      opportunityScore: number;
      marketScore: number;
      demandScore: number;
      competitionScore: number;
      financialFeasibilityScore: number;
      executionScore: number;
      riskScore: number;
    };
    keyOpportunities: string[];
    keyBlockers: string[];
    criticalAssumptions: string[];
  };

  // Section 2: Market Sizing & Demand Dynamics
  section2_MarketDynamics: {
    tamInr: number;
    samInr: number;
    somInr: number;
    calculationMethodology: string;
    statedAssumptions: string[];
    targetCustomerSegments: string[];
    indiaMarketSpecifics: {
      tierBreakdown: string;
      upiAdoptionTrend: string;
      msmeTaxNotes: string;
    };
  };

  // Section 3: Competitive Whitespace & Positioning
  section3_CompetitiveWhitespace: {
    trackedCompetitorCount: number;
    nearestRival: string;
    whitespaceOpportunity: string;
    positioningCoordinates: Array<{
      name: string;
      xPriceValue: number;
      yCompleteness: number;
    }>;
  };

  // Section 4: Unit Economics & Financial Simulation
  section4_FinancialFeasibility: {
    monthlyPrice: number;
    cac: number;
    ltv: number;
    ltvCacRatio: number;
    breakEvenCustomers: number;
    paybackMonths: number;
    startupCapEx: number;
    monthlyOpEx: number;
    sixMonthRunwayRequired: number;
    strategySimulation: {
      optionA_499: { revenue: number; marginPercent: number };
      optionB_799: { revenue: number; marginPercent: number };
      recommendedChoice: string;
    };
  };

  // Section 5: Brand Identity & Collateral Blueprint
  section5_BrandBlueprint: {
    usp: string;
    tagline: string;
    contrarianAngle: string;
    typographyLadder: {
      ratio: number; // 1.25
      headingFont: string;
      bodyFont: string;
      scaleDisplay: string;
      scaleH1: string;
    };
    colorPalette: {
      primary: string;
      accent: string;
      background: string;
    };
    collateralFormats: string[]; // Strict SVG / Static only; zero video
  };

  // Section 6: Growth Roadmap & Execution
  section6_GrowthRoadmap: {
    topOpportunities: string[];
    immediate7DayTasks: Array<{
      title: string;
      specificAction: string;
      iceScore: number;
      completionCriteria: string;
    }>;
    shortTerm30DayTasks: Array<{
      title: string;
      specificAction: string;
      iceScore: number;
    }>;
    mediumTerm90DayTasks: Array<{
      title: string;
      specificAction: string;
      iceScore: number;
    }>;
  };

  // Section 7: Continuous Surveillance & Business Watch
  section7_BusinessWatch: {
    healthScore: number;
    activeAlertsCount: number;
    topAlerts: Array<{
      whatChanged: string;
      severity: string;
      whyItMatters: string;
      recommendedResponse: string;
    }>;
    complianceState: string;
  };

  // Calculation Cards & Evidence Citations
  calculationCards: Array<{
    metricName: string;
    formula: string;
    inputs: Record<string, number | string>;
    result: number | string;
    explanation: string;
  }>;
  evidenceCitations: Array<{
    citationId: string;
    claimText: string;
    sourceType: string;
    sourceUrl?: string;
    verifiedAt: string;
    confidence: number;
  }>;
}
```

---

## 4. Citation & Calculation Transparency Engine

Every numeric claim must link to a **Calculation Card** or **Evidence Citation**:
1. **Calculation Card Format**:
   - Explicit formula: e.g. $\text{Break-Even Accounts} = \frac{\text{Fixed OpEx}}{\text{Unit Gross Profit}}$.
   - Raw inputs, timestamp, and mathematical explanation.
2. **Inline Citations**:
   - 4-tier credibility badge (`VERIFIED`, `CORROBORATED`, `ESTIMATED`, `UNVERIFIED`).

---

## 5. Export Architecture & Formats

- **High-DPI Print-Ready HTML**:
  - Full responsive layout with print `@media print` rules, vector graphics embedded as SVG, page breaks, and clean margins.
- **RFC-Compliant CSV Export**:
  - Structured multi-section CSV with proper header escaping for financial and spreadsheet modeling.
- **Strict Video Exclusion**:
  - Collateral blueprint and growth channels strictly prohibit video, Remotion, or FFmpeg pipelines.
