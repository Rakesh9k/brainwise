# BRAINWISE — DEPARTMENT 7: BUSINESS WATCH & CONTINUOUS MONITORING SPECIFICATION
## Master Technical Specification (Phase 8)
### Operational 24/7 Surveillance, 6-Factor Actionable Alerts & Weekly Digest

---

## 1. Executive Summary & Department Objective

The **Business Watch (Department 7)** transforms BrainWise from an on-demand report generation tool into an active, continuous monitoring operating system. Rather than waiting for a founder to log in and request an audit, the Business Watch continuously tracks changes in the competitive landscape, market dynamics, regulatory landscape, customer sentiment, and internal execution pace.

### The Operational Reality Mandate
BrainWise **strictly forbids claiming continuous monitoring unless the underlying monitoring engine is fully operational**. Simulated alerts without real underlying evaluation are prohibited. Every alert must be grounded in real-world evidence, verified competitor snapshots, or actual workspace telemetry.

---

## 2. Core Architectural Pillars

```
+-----------------------------------------------------------------------------------+
|                            BUSINESS WATCH ENGINE                                  |
|                                                                                   |
|  [1. Competitor Watch]   --> Price changes, feature launches, positioning shifts  |
|  [2. Market Demand Watch] --> Search trend shifts, MSME regulatory updates (DPDPA) |
|  [3. Execution Health]    --> Goal lag, task bottlenecks, budget runway limits     |
|  [4. Sentiment Watch]     --> Customer review friction & competitor dissatisfaction|
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                        6-FACTOR ACTIONABLE ALERT SYNTHESIS                        |
|                                                                                   |
|  1. What changed          (Exact delta detected)                                  |
|  2. When it changed       (Timestamp of observed change)                          |
|  3. Evidence supporting   (Citations, source URLs, confidence score)               |
|  4. Why it matters        (Strategic significance)                                |
|  5. Potential impact      (Revenue, CAC, or market share risk)                    |
|  6. Recommended response  (Deterministic counter-action in Growth Director)       |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                       WEEKLY BUSINESS DIGEST & AUTOMATION                         |
|                                                                                   |
|  - Consolidated operational brief dispatched to founders                          |
|  - Anomaly escalation & strategic counter-measure generation                      |
+-----------------------------------------------------------------------------------+
```

---

## 3. Data Contracts & Type Definitions

### 3.1 6-Factor Actionable Alert Model (`BusinessWatchAlert`)
```typescript
export interface BusinessWatchAlert {
  alertId: string;
  workspaceId: string;
  category: 'COMPETITOR_MOVE' | 'MARKET_TREND' | 'REGULATORY_CHANGE' | 'CUSTOMER_SENTIMENT' | 'EXECUTION_ANOMALY';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  
  // 6-Factor Actionable Schema
  whatChanged: string;
  whenChanged: string; // ISO 8601
  evidence: {
    sourceType: 'COMPETITOR_WEBSITE' | 'GOVERNMENT_GAZETTE' | 'REVIEW_PLATFORM' | 'WORKSPACE_TELEMETRY';
    sourceUrl?: string;
    verifiedAt: string;
    confidence: number; // 0.0 - 1.0
  };
  whyItMatters: string;
  potentialImpact: {
    financialOrOperationalRisk: string;
    estimatedRevenueImpact?: number;
  };
  recommendedResponse: {
    actionTitle: string;
    targetDepartment: 'Marketing' | 'Sales' | 'Product' | 'Operations' | 'Finance';
    suggestedTaskTitle: string;
    urgencyDays: number;
  };

  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'DISMISSED' | 'RESOLVED';
  acknowledgedAt?: string;
  resolutionNotes?: string;
  createdAt: string;
  updatedAt: string;
}
```

### 3.2 Weekly Business Digest Model (`WeeklyBusinessDigest`)
```typescript
export interface WeeklyBusinessDigest {
  digestId: string;
  workspaceId: string;
  weekEndingDate: string;
  healthScore: number; // 0-100
  summary: string;
  competitorSurveillanceSummary: {
    competitorsMonitoredCount: number;
    activeMovesDetected: number;
    notableShifts: string[];
  };
  marketAndRegulatorySummary: {
    newTrendsIdentified: string[];
    complianceStatus: 'COMPLIANT' | 'NEEDS_ATTENTION' | 'CRITICAL_RISK';
  };
  executionVelocity: {
    goalsOnTrack: number;
    goalsLagging: number;
    tasksCompletedThisWeek: number;
  };
  topActionItems: Array<{
    priority: 'HIGH' | 'MEDIUM';
    action: string;
    ownerDepartment: string;
  }>;
  createdAt: string;
}
```

---

## 4. Operational Surveillance Cycle Execution

The monitoring cycle executes systematically across 4 operational evaluators:
1. **Competitor Evaluator**:
   - Queries `workspaces/{workspaceId}/competitors`.
   - Runs `competitorTrackingService` / `competitiveIntelligenceService` diff engine.
   - Detects price reductions, new feature announcements, or positioning rewrites.
2. **Market & Regulatory Evaluator**:
   - Monitors registered `marketTopics` and regional regulatory frameworks (DPDPA 2023, GST, MSME lending rates in India).
3. **Execution & Goal Velocity Evaluator**:
   - Compares goal target dates and current values. Alerts if progress $< 40\%$ when $> 50\%$ of time has elapsed.
4. **Sentiment & Anomaly Evaluator**:
   - Flags negative customer review patterns or high CAC spikes on marketing campaigns.

---

## 5. Security, Web Scraping & Privacy Boundaries

- **SSRF Immunity**: All crawled URLs must pass through `validateSafeExternalUrl()` to reject private network IPs (`127.0.0.1`, `169.254.169.254`, `10.0.0.0/8`).
- **Robots & Terms Compliance**: Scraping headers must identify BrainWise as a transparent research agent and respect `robots.txt` directives.
- **DPDPA 2023 Residency**: All alert data and surveillance history reside within the `asia-south1` (Mumbai) region.
- **Strict Video Exclusion**: Alert counter-actions must never recommend video pipelines, Remotion, or video generation.
