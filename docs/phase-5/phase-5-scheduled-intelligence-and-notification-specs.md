# BrainWise Business Brain — Phase 5: Scheduled Intelligence & Notification Specifications

## 1. Executive Summary

Scheduled Intelligence (`scheduledIntelligenceService.ts`) synthesizes periodic executive digests and monitors business trajectory across all 14 departments. Rather than requiring users to manually compile spreadsheets or run queries, BrainWise compiles automated Daily Business Summaries, Weekly Reviews, and Monthly Growth Audits dispatched via in-app notifications and email summaries.

---

## 2. Scheduled Report Types & Cadences

| Report Type | Frequency | Core Contents | Intended Audience |
| :--- | :--- | :--- | :--- |
| **`BUSINESS_SUMMARY`** | Daily | Active anomalies, revenue generated, leads captured, goal run-rates. | Founder, Chief of Staff |
| **`WEEKLY_REVIEW`** | Weekly | Department highlights, top growth opportunities, experiment ROI, budget spend. | Executive Team |
| **`MONTHLY_GROWTH`** | Monthly | TAM/SAM expansion, customer acquisition costs, macro trends, quarter pacing. | Board, Founders |
| **`CAMPAIGN_MONITOR`** | Real-Time / Daily | Channel-by-channel CTR, CVR, CPA, ROAS and saturation alarms. | Marketing Team |
| **`GOAL_TRACKER`** | Weekly | Goal velocity, run-rate tracking, overdue milestone interventions. | Operations |
| **`COMPETITOR_MONITOR`** | Bi-Weekly | Competitor price shifts, new product launches, positioning whitespace. | Strategy & Product |
| **`OPPORTUNITY_DIGEST`** | Weekly | Curated list of high-confidence commercial opportunities. | Growth Director |

---

## 3. Scheduled Report Schema (`ScheduledIntelligenceReportEntity`)

```typescript
export interface ScheduledIntelligenceReportEntity {
  reportId: string;
  workspaceId: string;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  reportType:
    | 'BUSINESS_SUMMARY'
    | 'WEEKLY_REVIEW'
    | 'MONTHLY_GROWTH'
    | 'CAMPAIGN_MONITOR'
    | 'GOAL_TRACKER'
    | 'COMPETITOR_MONITOR'
    | 'OPPORTUNITY_DIGEST';
  summary: string;
  keyFindings: string[];
  activeAnomalies: string[];
  topOpportunities: string[];
  goalProgressSummary: Record<string, { current: number; target: number; onTrack: boolean }>;
  channel: 'IN_APP' | 'EMAIL';
  notificationDispatched: boolean;
  generatedAt: string;
}
```

---

## 4. Multi-Channel Notification Dispatch

### 4.1 In-App Notification Delivery
- Persisted to `workspaces/{workspaceId}/scheduledReports/{reportId}`.
- Instantly accessible from the Reports and Dashboard departments.
- Emits real-time reactive event across the client application.

### 4.2 Email Notification Delivery
- When `channel === 'EMAIL'`, formats a deterministic HTML digest.
- Follows the BrainWise brand typography and token standards.
- Includes direct deep-links to specific departments (Brand Studio, Growth Planner, Business Brain).

---

## 5. Goal Run-Rate Tracking Engine

During report compilation, all active business goals are evaluated:
$$\text{RunRate} = \frac{\text{CurrentValue}}{\text{TargetValue}}$$
- If $\text{RunRate} \ge 0.50$ (or on track relative to elapsed time), the goal is flagged as `onTrack: true`.
- If $\text{RunRate} < 0.50$, it is flagged as `onTrack: false` and automatically appended to `activeAnomalies`.
- Overachieved goals ($\text{CurrentValue} \ge \text{TargetValue}$) automatically trigger completion milestones.
