# BRAINWISE — PHASE 8: AUTOMATION ENGINE & SCHEDULER SPECIFICATION
**Document ID:** `docs/phase-8/06-automation-engine-and-scheduler.md`  
**Phase:** 8 — External Integrations, Connectivity & Intelligent Automation Engine  
**Status:** Approved & Implemented in Production  

---

## 1. Engine Overview

The BrainWise Automation Engine (`src/server/automation/automationEngine.ts`) and Scheduler (`src/server/automation/automationScheduler.ts`) provide autonomous, schedule-driven, and event-driven business operations.

Automations empower BrainWise to monitor third-party performance, synthesize cross-department intelligence, discover market anomalies, and prepare executive briefings without requiring manual user initiation.

```
                                +---------------------------+
                                |  TRIGGER SOURCE DETECTED  |
                                |  - Cron / Time Schedule   |
                                |  - Telemetry Metric Shift |
                                +-------------+-------------+
                                              |
                                              v
                                +---------------------------+
                                |  CONDITION EVALUATION     |
                                |  - PoP Delta Calculation  |
                                |  - Threshold Breach Check |
                                +-------------+-------------+
                                              |
                                              v
                                +---------------------------+
                                |   SAFETY CLASSIFICATION   |
                                +-------------+-------------+
                                              |
                     +------------------------+------------------------+
                     |                                                 |
                     v                                                 v
        [Category A / Category B]                             [Category C]
       (Read-Only / Internal Ops)                          (External Write Ops)
                     |                                                 |
                     v                                                 v
        +-------------------------+                       +-------------------------+
        | AUTO-DISPATCH EXECUTION |                       |   HUMAN APPROVAL GATE   |
        | - Ingest Latest Data    |                       | - Set requires_approval |
        | - Run Intelligence Job  |                       | - Log to Audit Ledger   |
        | - Save Execution State  |                       | - Block Outbound Action |
        +-------------------------+                       +------------+------------+
                                                                       |
                                                                       | (User Clicks "Approve")
                                                                       v
                                                          +-------------------------+
                                                          |  RESUME & DISPATCH      |
                                                          |  - Send Email/Drive Doc |
                                                          |  - Record Approver UID  |
                                                          +-------------------------+
```

---

## 2. Seven Pre-Built Production Templates

BrainWise ships with 7 pre-configured templates matching common business workflows:

| Template ID | Name | Frequency | Source Providers | Safety Category | Action Executed |
|-------------|------|-----------|------------------|-----------------|-----------------|
| `tmpl_daily_business_intel` | Daily Business Intelligence | Daily at 08:30 AM | GA4, GSC, Google Research | Cat B (Internal) | Consolidates 24h anomalies; drafts morning founder briefing |
| `tmpl_weekly_competitor_monitoring` | Weekly Competitor Monitoring | Mondays at 09:00 AM | Google Research | Cat B (Internal) | Scans digital footprints, detects pricing shifts, compiles memo |
| `tmpl_weekly_website_performance` | Weekly Website Performance | Mondays at 09:30 AM | Google Analytics 4 | Cat B (Internal) | 7-day PoP diffs, top landing pages, conversion recommendations |
| `tmpl_weekly_seo_monitoring` | Weekly SEO Monitoring | Tuesdays at 10:00 AM | Google Search Console | Cat B (Internal) | Uncovers high-impression low-CTR keywords, ranks dropping pages |
| `tmpl_monthly_business_intelligence` | Monthly Business Intelligence | 1st of Month at 09:00 AM | GA4, GSC, Research, GBP | Cat B (Internal) | Multi-channel performance audit, drafts board-level strategy report |
| `tmpl_integration_health_monitoring` | Integration Health Monitoring | Daily (Every 6h) | All Active Providers | Cat B (Internal) | Verifies token expirations, audits latency, alerts on sync faults |
| `tmpl_industry_trend_discovery` | Industry Trend Discovery | Wednesdays (Bi-weekly) | Google Research | Cat B (Internal) | Macroeconomic signals, consumer behavior changes, regulatory radar |

---

## 3. Three-Tier Safety Gate Architecture

In accordance with BrainWise architectural directives (ADR-008), automated actions are classified into three safety tiers:

### 3.1 Category A: Read-Only Operations
- **Scope:** Reading third-party APIs (GA4, GSC, YouTube analytics, Google Research).
- **Execution Mode:** 100% automated upon connection. No approval required.
- **Fail-Safe:** Network timeouts trigger automated backoff without side effects.

### 3.2 Category B: Internal Operations
- **Scope:** Generating AI dossiers, computing PoP deltas, updating internal competitor cards, posting in-app notifications.
- **Execution Mode:** Automated within workspace boundary.
- **Fail-Safe:** Governed by the Two-Phase Credit Reservation Protocol. If truth checks fail, credits are refunded.

### 3.3 Category C: External Write Operations
- **Scope:** Sending emails to external recipients, modifying external documents, or publishing social media updates.
- **Execution Mode:** **MANDATORY HUMAN APPROVAL GATE**.
- **Lifecycle:**
  1. Engine pauses execution and transitions status to `requires_approval`.
  2. Summary of proposed external action is displayed in the UI modal.
  3. Action remains blocked until an authorized workspace user calls `/api/v1/integrations/automations/executions/:id/approve`.
  4. Approver's UID and timestamp are recorded immutably in the audit ledger.

---

## 4. Execution State Persistence & Fault Tolerance

Execution runs are persisted in Firestore subcollections:
```
workspaces/{workspaceId}/automations/{automationId}/executions/{executionId}
```
Fields tracked:
- `status`: `queued` | `running` | `requires_approval` | `completed` | `failed` | `retrying`.
- `retryCount`: Up to 3 automatic retries for transient HTTP errors.
- `summary`: Human-readable outcome description.
- `resultPayload`: Structured output (report ID, message ID, file ID).
- `startedAt` & `completedAt`: ISO 8601 execution timing.
