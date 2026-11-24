# BRAINWISE AI GROWTH AGENCY — DATA CONTRACTS & SCHEMAS

**Authority:** Master Engineering Directive — Phase 0 Data Model  
**Workspace:** `d:\brainwise pro\brainwise (1)`  

---

## 1. Growth Mission Hierarchy

```
[BusinessObjective]
         │
         ▼ (1 : N)
[GrowthStrategy]
         │
         ▼ (1 : N)
[GrowthMission]
         ├──► [Projects & Experiments]
         ├──► [ExecutionTasks]
         └──► [Deliverables & Evidence]
```

---

## 2. Core TypeScript Schemas

### 2.1 Growth Mission (`GrowthMissionEntity`)
```typescript
export type MissionLifecycleStatus =
  | 'DRAFT'
  | 'PROPOSED'
  | 'APPROVED'
  | 'PLANNED'
  | 'READY'
  | 'IN_PROGRESS'
  | 'BLOCKED'
  | 'REVIEW'
  | 'COMPLETED'
  | 'VERIFIED'
  | 'PAUSED'
  | 'CANCELLED'
  | 'FAILED'
  | 'ARCHIVED';

export type GrowthDepartmentType =
  | 'Marketing'
  | 'Content'
  | 'Acquisition'
  | 'Conversion'
  | 'Retention'
  | 'Partnerships'
  | 'Economics'
  | 'Orchestration';

export interface GrowthMissionEntity {
  missionId: string;
  workspaceId: string;
  strategyId?: string;
  objectiveId?: string;
  title: string;
  strategicRationale: string;
  department: GrowthDepartmentType;
  targetAudience: string;
  timeHorizon: '7_DAYS' | '30_DAYS' | '90_DAYS';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  budgetCap: number;
  currentExpenditure: number;
  startDate: string;
  endDate: string;
  ownerId: string;
  approvalRequired: boolean;
  isApproved: boolean;
  approvedBy?: string;
  approvedAt?: string;
  status: MissionLifecycleStatus;
  successCriteria: Array<{
    metricName: string;
    baselineValue: number;
    targetValue: number;
    unit: string;
  }>;
  taskIds: string[];
  experimentIds: string[];
  deliverableIds: string[];
  actualOutcomes?: {
    verifiedAt: string;
    metricsAchieved: Record<string, number>;
    summaryNotes: string;
    strategicLearnings: string[];
  };
  createdAt: string;
  updatedAt: string;
}
```

### 2.2 Execution Job & Queue (`GrowthExecutionJob`)
```typescript
export type ExecutionJobStatus =
  | 'QUEUED'
  | 'AWAITING_APPROVAL'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'TIMED_OUT';

export interface GrowthExecutionJob {
  jobId: string;
  workspaceId: string;
  missionId?: string;
  taskId?: string;
  actionType:
    | 'DISPATCH_OUTREACH_EMAIL'
    | 'SCHEDULE_SOCIAL_POST'
    | 'PUBLISH_EXPERIMENT_VARIANT'
    | 'SYNC_ANALYTICS_DATA'
    | 'NOTIFY_FOUNDER_ALERT';
  level: 1 | 2 | 3;
  idempotencyKey: string;
  payload: Record<string, unknown>;
  requiresApproval: boolean;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  status: ExecutionJobStatus;
  retryCount: number;
  maxRetries: number;
  executionReceipt?: {
    providerName: string;
    providerTransactionId: string;
    dispatchedAt: string;
    responsePayload?: Record<string, unknown>;
  };
  errorHistory: Array<{
    attemptNumber: number;
    errorMessage: string;
    occurredAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}
```

### 2.3 Strategic Memory Record (`CategorizedMemoryEntity`)
```typescript
export type MemoryCategoryType =
  | 'BUSINESS_MEMORY'
  | 'STRATEGIC_MEMORY'
  | 'CUSTOMER_MEMORY'
  | 'EXPERIMENT_MEMORY'
  | 'CAMPAIGN_MEMORY'
  | 'CHANNEL_MEMORY'
  | 'EXECUTION_MEMORY'
  | 'FOUNDER_PREFERENCE_MEMORY';

export interface CategorizedMemoryEntity {
  memoryId: string;
  workspaceId: string;
  category: MemoryCategoryType;
  entityKey: string; // e.g. "pricing_evidence_badges"
  observation: string;
  confidence: number; // 0.0 - 1.0
  evidenceSource: string; // e.g. "experiment_exp_4920"
  provenance: 'USER_CONFIRMED' | 'AI_INFERRED' | 'DIRECTLY_MEASURED';
  sampleSize?: number;
  outcomeLiftPercent?: number;
  fatigueCounter: number;
  isFatigued: boolean;
  status: 'ACTIVE' | 'SUPERSEDED' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
}
```

### 2.4 Growth Scenario Simulation (`WhatIfScenarioModel`)
```typescript
export interface WhatIfScenarioModel {
  scenarioId: string;
  workspaceId: string;
  name: string;
  description: string;
  hypothesis: string;
  inputs: {
    monthlyMarketingBudget: number;
    targetPrice: number;
    expectedConversionRate: number;
    targetCac: number;
    primaryChannel: string;
  };
  projections: {
    baseCase: {
      monthlyRevenue: number;
      customersAcquired: number;
      grossProfit: number;
      roas: number;
      paybackMonths: number;
    };
    bestCase: {
      monthlyRevenue: number;
      customersAcquired: number;
      grossProfit: number;
      roas: number;
      paybackMonths: number;
    };
    downsideCase: {
      monthlyRevenue: number;
      customersAcquired: number;
      grossProfit: number;
      roas: number;
      paybackMonths: number;
    };
  };
  sensitivityFactor: string;
  confidenceDisclaimer: string;
  isConvertedToMission: boolean;
  convertedMissionId?: string;
  createdAt: string;
}
```
