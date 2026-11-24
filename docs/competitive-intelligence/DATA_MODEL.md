# BrainWise Competitive Intelligence — Data Model & Schema Specifications

The Competitive Intelligence system uses strongly typed TypeScript schemas (`src/server/types/competitiveIntelligence.ts`) backed by multi-tenant Firestore documents and subcollections (`src/server/repositories/competitiveIntelligenceRepository.ts`).

---

## 1. Primary Entity Collections

```
workspaces/{workspaceId}/
  ├── competitive_projects/{projectId}
  │     ├── competitors/{competitorId}
  │     └── dossiers/{competitorId}
  ├── competitive_evidence/{claimId}
  ├── competitive_reports/{reportId}
  └── competitive_advisor_chats/{sessionId}
```

---

## 2. Core Schemas

### 2.1 BusinessContextAnalysis
Extracts 12 structured dimensions from natural language:
```typescript
interface BusinessContextAnalysis {
  businessIdea: string;
  industry: string;
  subIndustry: string;
  category: string;
  targetGeography: string;
  customerSegments: string[];
  intendedBusinessModel: string[];
  pricePositioning: 'Budget' | 'Value' | 'Mid-Market' | 'Premium' | 'Luxury';
  distributionModel: string[];
  businessStage: 'Concept' | 'Pre-Launch' | 'Early-Stage' | 'Growth' | 'Mature';
  potentialMarketSegments: string[];
  relevantAdjacentIndustries: string[];
  dynamicResearchPlan: DynamicResearchPlanItem[];
  analyzedAt: string;
}
```

### 2.2 DiscoveredCompetitor
Covers 10 competitor tiers and 6-factor relevance:
```typescript
interface DiscoveredCompetitor {
  id: string;
  name: string;
  canonicalName: string;
  website: string;
  headquarters: string;
  geography: string;
  category: string;
  productCategory: string;
  businessModel: string;
  targetAudience: string;
  positioning: string;
  relevanceToUser: string;
  reasonForInclusion: string;
  tier:
    | 'DIRECT'
    | 'INDIRECT'
    | 'SUBSTITUTE'
    | 'EMERGING'
    | 'LOCAL'
    | 'REGIONAL'
    | 'NATIONAL'
    | 'INTERNATIONAL'
    | 'ASPIRATIONAL'
    | 'POTENTIAL_DISRUPTOR';
  relevanceScore: number; // 0 - 100
  scoreBreakdown: {
    productSimilarity: number;
    customerOverlap: number;
    geographicOverlap: number;
    businessModelSimilarity: number;
    pricingOverlap: number;
    competitiveThreat: number;
  };
  discoverySource: string;
  evidenceSnippets: string[];
  confidence: number;
  userExcluded?: boolean;
  userBookmarked?: boolean;
}
```

### 2.3 EvidenceClaim
Anchors all intelligence in verifiable facts:
```typescript
interface EvidenceClaim {
  id: string;
  workspaceId: string;
  competitorId?: string;
  claimTopic: string;
  claimValue: string | number | boolean;
  claimCategory: 'PRICING' | 'PRODUCT' | 'FINANCIAL' | 'MARKETING' | 'CUSTOMER_FEEDBACK' | 'TRAFFIC';
  sourceUrl: string;
  sourceType: 'OFFICIAL_WEBSITE' | 'REGULATORY_FILING' | 'CUSTOMER_REVIEW' | 'NEWS_REPORT' | 'INDUSTRY_AGGREGATOR';
  authorityScore: number; // 0 - 100
  verificationStatus: 'VERIFIED' | 'ESTIMATED' | 'UNAVAILABLE';
  freshnessTimestamp: string;
  contradictionFlags?: string[];
}
```

### 2.4 CompetitiveMatrix2D
Positions user and rivals in 2D Euclidean space:
```typescript
interface CompetitiveMatrix2D {
  xAxis: { name: string; minLabel: string; maxLabel: string };
  yAxis: { name: string; minLabel: string; maxLabel: string };
  userCoordinates: { x: number; y: number; label: string };
  competitorCoordinates: Array<{
    competitorId: string;
    competitorName: string;
    x: number;
    y: number;
    distanceFromUser: number; // Math.sqrt((x1-x2)^2 + (y1-y2)^2)
    quadrant: 'Niche Leaders' | 'Value Players' | 'Market Giants' | 'Disruptive Challengers';
  }>;
  nearestRival: { competitorName: string; distance: number };
  whitespaceOpportunity: string;
}
```

### 2.5 ComprehensiveCompetitiveReport
Full 24-section synthesis:
```typescript
interface ComprehensiveCompetitiveReport {
  id: string;
  workspaceId: string;
  businessIdea: string;
  generatedAt: string;
  executiveSummary: {
    marketContext: string;
    keyThreats: string[];
    primaryOpportunities: string[];
    recommendedAction: string;
  };
  sections: Array<{
    sectionNumber: number;
    title: string;
    summary: string;
    keyFindings: string[];
    metricsTable?: Record<string, any>;
    strategicImplications: string;
    evidenceCitations: string[];
  }>;
  exportMarkdown: string;
}
```
