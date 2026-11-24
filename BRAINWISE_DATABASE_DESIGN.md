# BRAINWISE — MASTER DATABASE DESIGN SPECIFICATION
## Google Cloud Firestore (Native Mode, asia-south1 Mumbai)
### Master Technical Document 03

---

## 1. Storage Engine & Regional Topology

- **Database Engine**: Google Cloud Firestore (Native Mode).
- **Region**: `asia-south1` (Mumbai, India) fulfilling statutory data localization requirements under the Indian Digital Personal Data Protection Act (DPDPA 2023).
- **Multi-Tenancy Model**: Hierarchical, path-isolated sub-collections under `workspaces/{workspaceId}/...`. Cross-tenant querying is strictly prevented by schema design and RBAC middleware.

---

## 2. Master Entity Relationship & Collection Map

```
workspaces/{workspaceId}
├── businessProfile/main                     (Current Ground Truth & Profile)
├── businessBrainVersions/{versionId}        (Immutable Historical Snapshots)
├── businessFacts/{factId}                   (Discrete Facts with Provenance Tagging)
├── evidenceFindings/{findingId}             (4-Tier Evidence Lake Findings)
├── evidenceEdges/{edgeId}                   (Knowledge Graph Semantic Edges)
├── contradictionReports/{reportId}          (Evidence Discrepancies & Resolutions)
├── competitors/{competitorId}               (14-Dimension Competitor Profiles)
├── competitor_alerts/{alertId}              (Competitor Watch Delta Alerts)
├── marketTopics/{topicId}                   (Monitored Market & Industry Topics)
├── marketFindings/{findingId}               (Market Research Clippings & Findings)
├── financialSimulations/{simulationId}      (Strategy Simulator Comparison Runs)
├── brandAssets/{assetId}                    (Sanitized Vector SVG Collateral)
├── growthTasks/{taskId}                     (Multi-Horizon Tasks with ICE Scores)
├── tasks/{taskId}                           (Dual-Persisted UI Tasks)
├── growthRoadmaps/{roadmapId}               (Generated Operational Roadmaps)
├── goals/{goalId}                           (Business Goals & Milestones)
├── campaignPerformance/{experimentId}       (Growth Experiments & Real Metrics)
├── businessWatchAlerts/{alertId}            (6-Factor Actionable Surveillance Alerts)
├── weeklyDigests/{digestId}                 (Consolidated Weekly Intelligence Briefs)
├── executiveDossiers/{dossierId}            (Unified 7-Section Executive Dossiers)
├── creditTransactions/{txnId}               (Atomic Two-Phase Billing Ledger)
└── agentAuditLogs/{logId}                   (Autonomous Agent Execution Audit Trail)
```

---

## 3. Core Collection Schemas

### 3.1 `businessFacts` (Persistent Business Brain Facts)
```typescript
export interface BusinessFactDocument {
  factId: string;
  workspaceId: string;
  category: 'CORE_IDENTITY' | 'PRICING' | 'TARGET_ICP' | 'PRODUCT_FEATURE' | 'CONSTRAINTS' | 'VALIDATED_GROWTH_RESULT';
  attribute: string;
  value: string;
  provenance: 'USER_CONFIRMED' | 'AI_INFERRED';
  confidence: number; // 0.0 - 1.0 (USER_CONFIRMED is always 1.0)
  source?: string;
  evidenceRefId?: string;
  supersededBy?: string;
  createdAt: string; // ISO 8601
  updatedAt: string;
}
```

### 3.2 `evidenceFindings` (Evidence Lake)
```typescript
export interface EvidenceFindingDocument {
  findingId: string;
  workspaceId: string;
  claim: string;
  classification: 'VERIFIED' | 'CORROBORATED' | 'ESTIMATED' | 'UNVERIFIED';
  sourceTitle: string;
  sourceUrl?: string;
  sourceType: 'GOVERNMENT_GAZETTE' | 'STATUTORY_CODE' | 'ACADEMIC_STUDY' | 'INDUSTRY_REPORT' | 'COMPANY_WEBSITE' | 'ESTIMATED_MODEL';
  territory: string; // e.g. "India", "Global"
  confidenceScore: number;
  corroboratingSourceCount: number;
  extractedDate: string;
  createdAt: string;
}
```

### 3.3 `growthTasks` (Growth Director Tasks)
```typescript
export interface GrowthTaskPlanDocument {
  taskId: string;
  workspaceId: string;
  title: string;
  department: 'Marketing' | 'Sales' | 'Product' | 'Operations' | 'Finance';
  timeHorizon: 'IMMEDIATE_7_DAYS' | 'SHORT_TERM_30_DAYS' | 'MEDIUM_TERM_90_DAYS';
  specificAction: string;
  expectedOutcome: string;
  estimatedEffortHours: number;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  iceScore: {
    impact: number;      // 1-10
    confidence: number;  // 1-10
    ease: number;        // 1-10
    compositeScore: number; // impact * confidence * ease
  };
  dependencies: string[];
  suggestedTools: string[];
  successMetrics: {
    metricName: string;
    baselineValue: number;
    targetValue: number;
    unit: string;
  };
  completionCriteria: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED' | 'ABANDONED';
  outcomeMet?: boolean;
  actualMetrics?: Record<string, number>;
  outcomeNotes?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}
```

### 3.4 `businessWatchAlerts` (Surveillance Alerts)
```typescript
export interface BusinessWatchAlertDocument {
  alertId: string;
  workspaceId: string;
  category: 'COMPETITOR_MOVE' | 'MARKET_TREND' | 'REGULATORY_CHANGE' | 'CUSTOMER_SENTIMENT' | 'EXECUTION_ANOMALY';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  whatChanged: string;
  whenChanged: string;
  evidence: {
    sourceType: string;
    sourceUrl?: string;
    verifiedAt: string;
    confidence: number;
  };
  whyItMatters: string;
  potentialImpact: {
    financialOrOperationalRisk: string;
    estimatedRevenueImpact?: number;
  };
  recommendedResponse: {
    actionTitle: string;
    targetDepartment: string;
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

### 3.5 `creditTransactions` (Two-Phase Reservation Ledger)
```typescript
export interface CreditTransactionDocument {
  transactionId: string;
  workspaceId: string;
  userId: string;
  featureId: string;
  status: 'RESERVED' | 'SETTLED' | 'REFUNDED';
  amount: number;
  remainingBalance: number;
  idempotencyKey: string;
  reservedAt: string;
  settledAt?: string;
  refundedAt?: string;
  notes?: string;
}
```

---

## 4. Indexing & Query Optimization Directives

1. **Composite Indexes**:
   - `workspaces/{workspaceId}/growthTasks` $\to$ `timeHorizon ASC, iceScore.compositeScore DESC`
   - `workspaces/{workspaceId}/businessWatchAlerts` $\to$ `status ASC, severity DESC, createdAt DESC`
   - `workspaces/{workspaceId}/evidenceFindings` $\to$ `classification ASC, confidenceScore DESC`
   - `workspaces/{workspaceId}/competitors` $\to$ `isMonitored ASC, updatedAt DESC`
2. **Idempotency Queries**:
   - Queries by `idempotencyKey` utilize single-field index with `.limit(1)` for $O(1)$ lookups.
3. **Partitioning**:
   - Historical snapshots in `businessBrainVersions` are append-only to prevent write lock contention.
