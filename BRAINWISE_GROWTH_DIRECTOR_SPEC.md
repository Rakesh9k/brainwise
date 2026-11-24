# BRAINWISE — DEPARTMENT 6: GROWTH DIRECTOR & EXECUTION SPECIFICATION
## Master Technical Specification (Phase 7)
### Transforming Strategy into Operational Execution & Closed-Loop Learning

---

## 1. Executive Summary & Department Objective

The **Growth Director (Department 6)** is BrainWise's operational execution engine. While Departments 1–5 produce strategic clarity (Idea Validation, Market Sizing, Competitor Whitespace, Financial Feasibility, and Differentiated Brand Identity), the Growth Director translates this intelligence into an actionable, prioritized, multi-horizon operational roadmap.

### The Anti-Vague Mandate
Standard AI systems generate superficial recommendations such as:
- *"Improve SEO"*
- *"Post regularly on social media"*
- *"Run digital ads"*

BrainWise **strictly forbids vague advice**. Every generated task and experiment must contain deterministic actions, concrete dependencies, tool recommendations, quantitative success metrics, and unambiguous completion criteria.

---

## 2. Core Architectural Pillars

```
+-----------------------------------------------------------------------------------+
|                            SHARED BUSINESS BRAIN                                  |
|         (Target ICP, Unit Economics, Competitor Whitespace, Brand Directives)       |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                        GROWTH DIRECTOR SERVICE                                    |
|                                                                                   |
|  1. Growth Opportunity Synthesis   --> Cross-references CAC, LTV, Whitespace      |
|  2. Multi-Horizon Task Generator   --> 7-Day, 30-Day, 90-Day Operational Plan     |
|  3. Deterministic Prioritization   --> ICE Scoring (Impact x Confidence x Ease)   |
|  4. Hypothesis Experiment Engine   --> Controlled Tests with Kill-Switch Triggers  |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                        CLOSED-LOOP LEARNING ENGINE                                |
|                                                                                   |
|  Task / Experiment Outcome Recorded:                                             |
|  - If Hypothesis Validated  --> Persist Approved Fact & Reinforce Channel        |
|  - If Underperformed/Failed --> Register Channel Fatigue & Refine Strategy        |
+-----------------------------------------------------------------------------------+
```

---

## 3. Data Contracts & Type Definitions

### 3.1 Growth Task Model (`GrowthTaskPlan`)
```typescript
export interface GrowthTaskPlan {
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
    compositeScore: number; // (Impact * Confidence * Ease)
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
  completedAt?: string;
  outcomeNotes?: string;
  createdAt: string;
  updatedAt: string;
}
```

### 3.2 Growth Opportunity Model
```typescript
export interface GrowthOpportunity {
  opportunityId: string;
  workspaceId: string;
  title: string;
  category: 'CUSTOMER_ACQUISITION' | 'CONVERSION_OPTIMIZATION' | 'RETENTION' | 'REFERRAL_VIRALITY' | 'PRICING_POWER';
  summary: string;
  rationale: string;
  estimatedRevenueImpactMonthly: number;
  expectedCacReductionPercent?: number;
  recommendedChannels: Array<{
    channelName: string;
    strategicFit: number; // 0-100%
    expectedCac: number;
    formatType: 'SVG_COLLATERAL' | 'OUTREACH_COPY' | 'CONTENT_PACK'; // Strict zero video
  }>;
  riskAssessment: {
    level: 'LOW' | 'MEDIUM' | 'HIGH';
    mitigationStrategy: string;
  };
  supportingEvidenceIds: string[];
  createdAt: string;
}
```

### 3.3 Closed-Loop Outcome Submission
```typescript
export interface TaskOutcomeSubmission {
  taskId: string;
  workspaceId: string;
  status: 'COMPLETED' | 'ABANDONED';
  outcomeMet: boolean;
  actualMetrics?: Record<string, number>;
  notes: string;
  learningsToPersist?: string[];
}
```

---

## 4. Deterministic Prioritization: ICE Scoring Engine

To eliminate subjective guesswork, tasks are ranked using the **ICE Scoring Framework**:
$$\text{ICE Composite} = \text{Impact} \times \text{Confidence} \times \text{Ease}$$
Where:
- **Impact (1–10)**: Estimated lift in revenue, customer conversion, or CAC reduction. Grounded in Business Brain financial targets.
- **Confidence (1–10)**: Evidentiary backing. Tasks with validated competitors or corroborating evidence receive $\ge 8$; unverified assumptions receive $\le 5$.
- **Ease (1–10)**: Inverse of required effort, cost, and cross-team dependencies. Tasks executable in $< 4$ hours score $\ge 8$.

---

## 5. Multi-Horizon Roadmap Architecture

1. **Immediate Actions (Next 7 Days)**:
   - High-confidence, low-effort validation experiments and foundational instrumentations.
   - Example: *"Deploy 20 direct LinkedIn outbound messages using the ₹499 transparent pricing angle; measure reply rate."*
2. **Short-Term Actions (Next 30 Days)**:
   - Channel testing, landing page conversion experiments, and SVG collateral distribution.
   - Example: *"A/B test value proposition headlines focusing on deterministic evidence vs generic speed."*
3. **Medium-Term Actions (Next 90 Days)**:
   - Customer retention loops, referral mechanics, and annual contract packaging.
   - Example: *"Implement automated NPS trigger on Day 14 post-onboarding with 1-click referral discount."*

---

## 6. Closed-Loop Learning Protocol

When a founder marks a task or experiment as complete:
1. **Outcome Assessment**:
   - The system compares `actualMetrics` against `successMetrics`.
2. **Business Brain Grounding**:
   - If positive ($+\ge 15\%$ lift): records verified insight in `businessBrainService` and increases channel weight in `learningEngineService`.
   - If negative/failed: triggers strategy refinement, logs the failure in `strategicMemory` as a fatigued/avoided theme to prevent repeating ineffective marketing angles.
3. **Event Emission**:
   - Emits `TASK_OUTCOME_RECORDED` to notify other departments.

---

## 7. Strict Product Boundaries
- **Zero Video Exclusion**: All growth collateral tasks strictly prescribe SVG vector templates, static carousels, or deterministic copywriting packs. FFmpeg, Remotion, and video generation are permanently excluded.
- **Multi-Tenant Isolation**: All roadmaps, tasks, and experiment outcomes are partitioned under `workspaces/{workspaceId}/...`.
