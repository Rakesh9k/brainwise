# BRAINWISE — PHASE 4: SHARED CONTEXT CONTRACTS

> **Technical Specification for Standard Department Context Payload, Slices, and Cache Protocol**
> **Product Architecture Directive:** Authoritative ground truth assembled with permission-controlled sensitivity filtering and sub-5ms cached delivery.

---

## 1. Context Contract Overview

Every BrainWise department consumes context through the unified contract `DepartmentContextResponse`. This ensures:
- No department operates on disconnected assumptions.
- Financial margins and sensitive ledgers are automatically redacted for non-authorized roles.
- Strict video exclusion directives are deterministically injected for creative generation.
- Real-time cache invalidation immediately propagates ground-truth edits to all department views.

---

## 2. Master Schema Specification (`DepartmentContextResponse`)

```typescript
export interface DepartmentContextResponse {
  workspaceId: string;
  department: StandardDepartmentType | string;
  
  // 1. Core Ground Truth Identity
  businessIdentity: {
    name: string;
    stage: string;
    tagline?: string;
    positioning?: string;
    category?: string;
    location?: string;
    overviewSummary?: string;
  };
  
  // 2. Verified Catalogue (Redacted by Role & Department)
  relevantProducts: Array<{
    id: string;
    name: string;
    category?: string;
    price?: number;
    currency?: string;
    description?: string;
    features?: string[];
    benefits?: string[];
    unitCost?: number | 'UNKNOWN';       // REDACTED unless FINANCE/STRATEGY
    marginPercent?: number | 'UNKNOWN';  // REDACTED unless FINANCE/STRATEGY
  }>;
  
  // 3. Customer Personas & Real-Time Objections
  targetAudiences: Array<{
    name?: string;
    demographics?: string;
    painPoints?: string[];
    buyingMotivations?: string[];
    objections?: string[];
  }>;
  
  // 4. Approved Brand Guidelines & Guardrails
  brandDirectives: {
    voice: string[];
    wordsToUse: string[];
    wordsToAvoid: string[];
    approvedClaims: string[];
    restrictedClaims: string[];
    visualStyle?: {
      primaryColor?: string;
      secondaryColor?: string;
      fontFamily?: string;
      svgOnly: boolean;                 // MANDATORY: STRICT VIDEO EXCLUSION
    };
  };
  
  // 5. Active Measurable Objectives
  businessObjectives: Array<{
    id?: string;
    title: string;
    targetMetric?: string;
    targetValue?: number | string;
    status?: string;
  }>;
  
  // 6. Hard Operating & Budgetary Constraints
  applicableConstraints: string[];
  
  // 7. Episodic Memory (Historical Lessons & Decisions)
  historicalEpisodes: Array<{
    title: string;
    summary: string;
    learnings: string[];
  }>;
  
  // 8. Performance Track Record
  pastPerformance: {
    benchmarks?: Record<string, unknown>;
    experimentsRun?: number;
    recentOutcomes?: string[];
  };
  
  // 9. Supporting Citations & Traceability
  supportingEvidence: KnowledgeSourceCitation[];
  
  // 10. Operational Metadata
  freshness: 'FRESH' | 'CACHED' | 'STALE';
  confidenceScore: number;               // 0.0 - 1.0
  tokenCount: number;
  tokenBudget?: number;
  dataRedactions: string[];              // List of redacted fields
  departmentSlice?: Record<string, unknown>; // Tailored departmental payload
}
```

---

## 3. Department-Specific Slices (`departmentSlice`)

The `departmentSlice` delivers high-relevance domain telemetry tailored specifically to each department:

### 3.1 `STRATEGY` Slice
```json
{
  "positioning": "Premium artisanal single-origin coffee with ethical direct-trade credentials",
  "competitorCount": 3,
  "activeGoalsCount": 2,
  "businessStage": "Growing Business",
  "coreDifferentiator": "Direct-trade, farm-gate price transparency with 48-hour roasting dispatch"
}
```

### 3.2 `MARKETING` Slice
```json
{
  "monthlyBudget": 3500,
  "approvedBrandVoice": ["Bold", "Authentic", "Artisanal"],
  "customerSegmentsCount": 2,
  "brandGuidelinesApproved": true
}
```

### 3.3 `RESEARCH` Slice
```json
{
  "competitorCount": 3,
  "competitors": [
    {
      "name": "Blue Tokai Coffee",
      "strengths": ["Extensive cafe network", "Brand awareness"],
      "weaknesses": ["Higher delivery times for Tier 2 cities"],
      "pricingTiers": ["$22 - $28 per 250g"]
    }
  ],
  "sourcesVerified": true,
  "researchTimestamp": "2026-11-20T12:00:00.000Z"
}
```

### 3.4 `CREATIVE` Slice (Strict Video Exclusion Enforced)
```json
{
  "approvedColors": {
    "primaryColor": "#78350F",
    "secondaryColor": "#D97706",
    "fontFamily": "Cinzel",
    "svgOnly": true
  },
  "svgCollateralOnly": true,
  "wordsToAvoid": ["Cheap", "Commercial blend", "Instant", "Discount"],
  "approvedClaims": ["100% Single-Origin Arabica", "Directly sourced from estate partners"],
  "videoGenerationExcluded": true
}
```

### 3.5 `SALES` Slice
```json
{
  "productCatalog": [
    { "name": "Monsoon Malabar Estate Roast", "price": 24, "features": ["Estate harvested"] }
  ],
  "objectionsCatalog": [
    "High initial equipment cost",
    "Subscription commitment length is too rigid"
  ],
  "buyingMotivations": ["Fresh roast date", "Complex tasting notes"]
}
```

### 3.6 `FINANCE` Slice
```json
{
  "verifiedBudget": 3500,
  "financialAccessGranted": true,
  "currency": "USD"
}
```
*(When accessed by non-finance roles, `verifiedBudget` is `'REDACTED'`, `financialAccessGranted` is `false`, and `unitCost` / `marginPercent` are set to `'UNKNOWN'`)*.

### 3.7 `ANALYTICS` Slice
```json
{
  "trackedGoals": [
    { "id": "goal_1", "title": "Scale Direct-to-Consumer Monthly Subscribers to 1,500", "targetValue": 1500 }
  ],
  "pastExperimentsCount": 5,
  "attributionModel": "FIRST_TOUCH_AND_LAST_TOUCH"
}
```

### 3.8 `CUSTOMER_SUCCESS` Slice
```json
{
  "operatingPolicies": [
    "No cash refunds after 14 days",
    "No phone support on Sundays"
  ],
  "audiencePainPoints": [
    "Stale supermarket beans",
    "Lack of origin transparency"
  ],
  "supportHours": "Standard Business Hours"
}
```

---

## 4. Cache & Invalidation Protocol

1. **Deterministic Cache Keying:**
   ```
   cacheKey = `${workspaceId}__dept_${department}__role_${userRole}`
   ```
2. **TTL Strategy:**
   - In-memory cache TTL: **5 minutes** (300,000 ms).
   - If accessed within TTL: payload returned with `freshness: 'CACHED'`.
   - If TTL expired: deleted and reassembled with `freshness: 'FRESH'`.
3. **Instant Mutation Invalidation:**
   - When `BUSINESS_PROFILE_UPDATED`, `PRODUCT_UPDATED`, or `SALES_OBJECTION_RECORDED` fires, `sharedBusinessContextService.invalidateCache(workspaceId)` immediately purges all department and role cache entries for that tenant.
   - Subsequent calls are guaranteed to observe the latest ground truth.
