# BRAINWISE — GROWTH DIRECTOR & EXECUTION INTELLIGENCE SYSTEM
# DATA MODEL & SCHEMA SPECIFICATION

> **Document ID:** `BW-GD-DATA-2026-11`  
> **Status:** PRODUCTION DATA MODEL SPECIFICATION  
> **Author:** Principal AI Systems Architect & Data Architect  

---

## 1. Firestore Hierarchy & Tenant Partitioning

All Growth Director data entities are partitioned under the tenant workspace boundary:
```
workspaces/{workspaceId}/
  ├── growthTasks/{taskId}                  <-- High-fidelity growth task plans
  ├── tasks/{taskId}                        <-- Standard tasks (dual-persisted for UI compatibility)
  ├── growthRoadmaps/{roadmapId}            <-- Multi-horizon operational roadmaps
  ├── growthExperiments/{experimentId}      <-- Hypothesis experiments with kill-switches
  ├── strategicMemories/{memoryId}          <-- 10-category closed-loop learning records
  ├── businessFacts/{factId}                <-- Validated Business Brain facts
  └── growthScenarios/{simulationId}        <-- Parametric growth simulations
```

---

## 2. Entity Schemas & TypeScript Interfaces

### 2.1 Structured Growth Task (`StructuredGrowthTask`)
```typescript
export interface StructuredGrowthTask {
  taskId: string;                             // e.g. "tsk_1732289945000_imm_1"
  workspaceId: string;                        // Tenant isolation key
  title: string;                              // Descriptive deliverable name
  description: string;                        // Operational narrative
  actionVerb: string;                         // e.g. "Deploy", "Execute", "Mount", "A/B Test"
  executionSteps: string[];                   // Non-empty step-by-step guidance
  department: 'Marketing' | 'Sales' | 'Product' | 'Operations' | 'Finance' | 'Growth';
  timeHorizon: 'IMMEDIATE_7_DAYS' | 'SHORT_TERM_30_DAYS' | 'MEDIUM_TERM_60_DAYS' | 'LONG_TERM_90_DAYS';
  provenance:
    | 'MARKET_WATCH'
    | 'COMPETITIVE_RADAR'
    | 'IDEA_INTELLIGENCE'
    | 'BUSINESS_BRAIN'
    | 'GROWTH_DIAGNOSIS'
    | 'GROWTH_OPPORTUNITY'
    | 'AI_RECOMMENDATION'
    | 'USER_CREATED'
    | 'EXISTING_EXPERIMENT';
  sourceEntityId?: string;                    // Foreign key to originating report/signal
  relatedGoalIds: string[];                   // Mandatory: linked business objectives
  relatedOpportunityIds: string[];
  relatedExperimentIds: string[];
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  iceScore: {
    impact: number;                           // 1 - 10
    confidence: number;                       // 1 - 10
    ease: number;                             // 1 - 10
    rawComposite: number;                     // impact * confidence * ease (1 - 1000)
    urgencyModifier: number;                  // 0.9 - 1.2
    goalAlignmentModifier: number;            // 0.85 - 1.15
    feasibilityModifier: number;              // 0.8 - 1.0
    finalWeightedScore: number;               // Composite with modifiers
    scoringExplanation: string;
    confidenceClassification: 'HIGH' | 'MEDIUM' | 'LOW';
    evaluatedAt: string;                      // ISO timestamp
  };
  expectedOutcome: string;
  successMetrics: {
    metricName: string;                       // e.g. "Checkout Conversion Rate"
    baselineValue: number;                    // e.g. 3.2
    targetValue: number;                      // e.g. 4.5
    unit: string;                             // e.g. "%"
  };
  completionCriteria: string;                 // Unambiguous pass/fail definition
  estimatedDurationMinutes: number;           // e.g. 180 (3 hours)
  actualDurationMinutes?: number;
  requiredBudget: number;                     // In workspace currency
  requiredSkills: string[];
  suggestedTools: string[];                   // Specific tools (no vague advice)
  dependencies: string[];                     // Prerequisite task IDs or milestones
  blockedByTaskIds: string[];                 // Computed active blockers
  status:
    | 'PROPOSED'
    | 'VALIDATED'
    | 'APPROVED'
    | 'SCHEDULED'
    | 'IN_PROGRESS'
    | 'BLOCKED'
    | 'COMPLETED'
    | 'CANCELLED'
    | 'REJECTED'
    | 'ARCHIVED';
  scheduledDate?: string;
  deadline: string;                           // ISO date string
  completedAt?: string;
  outcomeMet?: boolean;                       // Target metric achieved
  executionOutcomeNotes?: string;
  actualExpenditure?: number;
  createdAt: string;
  updatedAt: string;
}
```

### 2.2 Operational Roadmap Version (`AdaptiveRoadmapVersion`)
```typescript
export interface AdaptiveRoadmapVersion {
  roadmapId: string;                          // e.g. "rdm_1732289945000_v1"
  version: number;                            // Incremented on refresh
  workspaceId: string;
  executiveSummary: string;
  phases: Array<{
    phaseId: string;
    horizon: 'IMMEDIATE_7_DAYS' | 'SHORT_TERM_30_DAYS' | 'MEDIUM_TERM_60_DAYS' | 'LONG_TERM_90_DAYS';
    title: string;
    strategicObjective: string;
    expectedBusinessOutcome: string;
    keyMilestones: string[];
    tasks: StructuredGrowthTask[];
    dependencies: string[];
    requiredBudget: number;
    requiredHours: number;
    exitCriteria: string;
  }>;
  totalBudget: number;
  totalHours: number;
  capacityFeasibility: {
    isFeasible: boolean;
    bottleneckReason?: string;
  };
  changeSummary?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}
```

### 2.3 Categorized Strategic Memory Record (`CategorizedStrategicMemoryRecord`)
```typescript
export interface CategorizedStrategicMemoryRecord {
  memoryId: string;                          // e.g. "mem_outcome_tsk_123"
  workspaceId: string;
  category:
    | 'CHANNEL_MEMORY'
    | 'AUDIENCE_MEMORY'
    | 'OFFER_MEMORY'
    | 'CREATIVE_ANGLE_MEMORY'
    | 'CAMPAIGN_FORMAT_MEMORY'
    | 'EXPERIMENT_MEMORY'
    | 'GROWTH_LEARNING'
    | 'OPERATIONAL_LEARNING'
    | 'FINANCIAL_LEARNING'
    | 'MARKET_COMPETITIVE_LEARNING';
  entityId: string;                          // Task ID or Experiment ID
  theme: string;                             // Normalized theme key
  observation: string;                       // Concrete result narrative
  hypothesis?: string;
  outcomeClassification: 'POSITIVE' | 'NEGATIVE' | 'INCONCLUSIVE' | 'NEUTRAL';
  executionSuccess: boolean;
  evidenceQuality:
    | 'DIRECTLY_MEASURED'
    | 'INDEPENDENTLY_VERIFIED'
    | 'USER_REPORTED'
    | 'INFERRED'
    | 'UNVERIFIED';
  sampleSize: number;
  confidenceScore: number;                   // 0.0 - 1.0 bounded
  applicabilityConditions: string[];
  fatigueScore: number;                      // Consecutive failure count
  isFatigued: boolean;                       // true if fatigueScore >= 3
  createdAt: string;
  lastValidatedAt: string;
  version: number;
}
```

### 2.4 Structured Growth Experiment (`StructuredGrowthExperiment`)
```typescript
export interface StructuredGrowthExperiment {
  experimentId: string;
  workspaceId: string;
  title: string;
  hypothesis: string;
  businessObjective: string;
  problemBeingTested: string;
  targetAudience: string;
  channel: string;
  proposedIntervention: string;
  baselineMetric: {
    metricName: string;
    value: number;
    unit: string;
  };
  primaryMetric: {
    metricName: string;
    targetValue: number;
    unit: string;
  };
  secondaryMetrics: Array<{
    metricName: string;
    targetValue: number;
    unit: string;
  }>;
  expectedOutcome: string;
  minMeaningfulResult: string;
  budgetCap: number;
  currentExpenditure: number;
  startDate: string;
  endDate: string;
  killSwitch: {
    minSampleSize: number;                  // Guard against premature stop
    currentSampleSize: number;
    stopThresholdValue: number;
    metricName: string;
    comparison: 'LESS_THAN' | 'GREATER_THAN';
    budgetCap: number;
    currentExpenditure: number;
    isTriggered: boolean;
    triggeredReason?: string;
  };
  dependencies: string[];
  ownerId: string;
  status:
    | 'DRAFT'
    | 'VALIDATED'
    | 'PLANNED'
    | 'APPROVED'
    | 'ACTIVE'
    | 'PAUSED'
    | 'COMPLETED'
    | 'ABORTED'
    | 'INCONCLUSIVE';
  hypothesisEvaluation?:
    | 'HYPOTHESIS_SUPPORTED'
    | 'HYPOTHESIS_REJECTED'
    | 'INCONCLUSIVE'
    | 'EXECUTION_FAILURE'
    | 'MEASUREMENT_FAILURE'
    | 'EXTERNAL_DISRUPTION';
  evidenceNotes?: string;
  lessonsLearned?: string;
  createdAt: string;
  updatedAt: string;
}
```
