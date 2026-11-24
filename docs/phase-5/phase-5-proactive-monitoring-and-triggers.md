# BrainWise Business Brain — Phase 5: Proactive Monitoring & Business Triggers

## 1. Executive Summary

BrainWise proactively monitors business state, commercial risks, and market opportunities without waiting for manual user initiation. The proactive monitoring engine (`proactiveIntelligenceService.ts`) runs background evaluations against 8 canonical trigger conditions, ensuring founders and operators receive timely, evidence-backed warnings and growth suggestions.

---

## 2. The 8 Proactive Business Triggers

| Trigger Identifier | Trigger Type | Condition & Evaluation Logic | Default Expiration | Priority |
| :--- | :--- | :--- | :--- | :--- |
| **`PERFORMANCE_DROP`** | Event-Driven | A campaign records high CPA, low CVR, or ROAS $< 0.60$. Indicates creative fatigue or channel saturation. | 14 Days | `HIGH` |
| **`GOAL_BEHIND`** | Scheduled / Continuous | Goal progress velocity $< 40\%$ of expected run-rate relative to deadline. | 30 Days | `HIGH` |
| **`BUDGET_CEILING`** | Financial Guardrail | Monthly campaign spend reaches or exceeds $85\%$ of the configured marketing budget constraint. | 7 Days | `CRITICAL` |
| **`UNDERPROMOTED_PRODUCT`** | Portfolio Scan | Active product in catalog with zero marketing experiments or recent campaigns. | 30 Days | `MEDIUM` |
| **`COMPETITOR_ACTIVITY`** | Competitive Scan | Discovery of competitor weakness or positioning contrast opportunity. | 21 Days | `MEDIUM` |
| **`MARKET_OPPORTUNITY`** | Seasonal / Trends | Upcoming seasonal shopping window or industry surge identified. | 45 Days | `MEDIUM` |
| **`RECURRING_OBJECTION`** | Customer Telemetry | Recurring sales friction reported across $\ge 2$ customer personas. | 30 Days | `MEDIUM` |
| **`STALE_KNOWLEDGE`** | Knowledge Lifecycle | Business profile, brand tokens, or pricing unverified for $\ge 90$ days. | 14 Days | `LOW` |

---

## 3. Evidence Grounding Schema

Every proactive insight (`ProactiveInsightEntity`) emitted by the system contains explicit verifiable evidence:

```typescript
export interface ProactiveInsightEntity {
  insightId: string;
  workspaceId: string;
  triggerType: ProactiveTriggerType;
  title: string;
  description: string;
  reason: string;
  evidence: KnowledgeSourceCitation[]; // Exact pointers to experiments, goals, or profile facts
  sources: string[];
  confidence: number;
  confidenceBand: ConfidenceBand;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  businessImpact: string;
  suggestedAction: string;
  relevantDepartment: StandardDepartmentType;
  status: 'ACTIVE' | 'DISMISSED' | 'ACCEPTED' | 'EXPIRED';
  expirationDate: string; // ISO 8601
  createdAt: string;
  updatedAt: string;
}
```

---

## 4. Automatic Stale Insight Expiration

To prevent user notification fatigue and clutter from outdated recommendations:
1. Every proactive insight is created with an explicit `expirationDate`.
2. Prior to any evaluation run, the system calls `expireStaleInsights(workspaceId)`.
3. Any active insight where `expirationDate < now` is transitioned from `'ACTIVE'` to `'EXPIRED'`.
4. Expired insights are automatically filtered out from active dashboard views and executive summaries.

---

## 5. Security & Multi-Tenancy

Trigger evaluation executes exclusively within the authenticated workspace context:
- No cross-tenant data aggregation occurs.
- Trigger thresholds (e.g., budget ceiling) evaluate strictly against `workspaces/{workspaceId}/businessProfile`.
- Insights are stored isolated under `workspaces/{workspaceId}/proactiveInsights/{insightId}`.
