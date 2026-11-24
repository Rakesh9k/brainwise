# BRAINWISE — GROWTH DIRECTOR & EXECUTION INTELLIGENCE SYSTEM
# INTEGRATION CONTRACTS & CROSS-DEPARTMENT SPECIFICATION

> **Document ID:** `BW-GD-INT-2026-11`  
> **Status:** PRODUCTION INTEGRATION SPECIFICATION  
> **Author:** Principal AI Systems Architect & Senior Full-Stack Engineer  

---

## 1. Upstream Department Integrations

Growth Director coordinates strategic intelligence from upstream departments:

| Department | Service / File | Data Contract | Growth Director Usage |
|---|---|---|---|
| **Business Brain** | `businessProfileRepository.getProfile(workspaceId)` | `BusinessProfileEntity` | Retrieves ICP, stage, value proposition, verified facts, and unit economics. |
| **Competitive Radar** | `competitorRepository.listByWorkspace(workspaceId)` | `CompetitorEntity[]` | Retrieves nearest competitors, competitor weaknesses, and pricing whitespace. |
| **Market Watch** | `marketWatchRepository.listTopics(workspaceId)` | `MarketTopicEntity[]` | Ingests market signals, regulatory shifts, and emerging industry demand. |
| **Idea Intelligence** | `researchRepository` / `understandIdeaApi` | `IdeaUnderstandingResult` | Ingests TAM/SAM/SOM sizing and initial problem-solution validation hypotheses. |

---

## 2. Downstream Department Integrations

Growth Director translates approved operational roadmaps into execution deliverables:

| Downstream Department | Event / Mechanism | Contract Payload | Operational Deliverable |
|---|---|---|---|
| **BrandStudio** | `TASK_CREATED` / Asset Generation | `BrandAssetEntity` | Requests compliant SVG stationery, flyers, and static carousel templates (zero video). |
| **Content Studio** | Copywriting Pack Trigger | `OutreachCopyRequest` | Generates 50-account personalized cold outreach copy and LinkedIn problem wedges. |
| **Executive Reports** | `growthRoadmaps` / `growthTasks` | `OperationalRoadmap` | Embeds 30/60/90-day operational roadmaps into executive investor and board dossiers. |
| **Department Event Bus** | `departmentEventBus.emit()` | `GROWTH_TASK_OUTCOME_RECORDED` | Broadcasts validated task outcomes to update channel weights across the operating system. |

---

## 3. REST API Contracts

### 3.1 `GET /api/v1/workspaces/:workspaceId/tasks/intelligence/overview`
**Description:** Returns the complete executive growth intelligence overview including diagnosis, bottlenecks, opportunities, capacity, roadmap, recommendations, and strategic memory.

**Response Schema (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "workspaceId": "ws_12345",
    "context": {
      "businessName": "Acme SaaS",
      "stage": "Early Traction",
      "freshness": {
        "completenessPercent": 95,
        "missingCriticalFields": []
      }
    },
    "diagnoses": [
      {
        "diagnosisId": "diag_123",
        "dimension": "AWARENESS",
        "problem": "Unvalidated demand in enterprise procurement",
        "severity": "HIGH",
        "classification": "CONFIRMED_BOTTLENECK",
        "recommendedCorrectiveAction": "Deploy 50-account outbound validation sprint"
      }
    ],
    "opportunities": [
      {
        "opportunityId": "opp_123",
        "title": "Direct Outbound Targeting Incumbent Whitespace",
        "estimatedRevenueImpactMonthly": 49900,
        "expectedCacReductionPercent": 28,
        "recommendedChannels": [
          { "channelName": "LinkedIn Outbound", "formatType": "OUTREACH_COPY" }
        ]
      }
    ],
    "capacity": {
      "founderWorkingHoursPerDay": 7,
      "weeklyTotalHours": 35,
      "committedHoursWeekly": 14.5,
      "isOverloaded": false
    },
    "focusSprintTasks": [],
    "recommendations": [],
    "riskAlerts": [],
    "whatNotToDo": []
  }
}
```

### 3.2 `POST /api/v1/workspaces/:workspaceId/tasks/roadmap/generate`
**Description:** Generates a new dynamic multi-horizon operational roadmap.

**Request Body:**
```json
{
  "focusCategory": "CUSTOMER_ACQUISITION"
}
```

**Response Schema (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "roadmapId": "rdm_1732289945000_v1",
    "workspaceId": "ws_12345",
    "executiveSummary": "Actionable Growth Roadmap targeting 3 primary opportunities...",
    "opportunities": [],
    "tasks": [],
    "horizonCounts": {
      "immediate7Days": 2,
      "shortTerm30Days": 2,
      "mediumTerm90Days": 1
    }
  }
}
```

### 3.3 `POST /api/v1/workspaces/:workspaceId/tasks/:taskId/outcome`
**Description:** Ingests task execution results, updates task status, and executes closed-loop strategic learning.

**Request Body:**
```json
{
  "status": "COMPLETED",
  "outcomeMet": true,
  "actualMetrics": {
    "Checkout Funnel Conversion Rate": 4.8
  },
  "notes": "Evidence badges mounted on pricing cards lifted conversion from 3.2% to 4.8%."
}
```

**Response Schema (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "task": {
      "taskId": "tsk_123",
      "status": "COMPLETED",
      "outcomeMet": true
    },
    "learningConsequence": {
      "actionTaken": "STRATEGY_REINFORCED",
      "channelAdjustment": "Increased confidence weight for Product action. Target exceeded.",
      "memoryPersisted": true
    }
  }
}
```

### 3.4 `POST /api/v1/workspaces/:workspaceId/tasks/intelligence/simulate`
**Description:** Parametric growth scenario simulator (Conservative, Expected, Optimistic).

**Request Body:**
```json
{
  "baselineRevenue": 50000,
  "monthlyBudget": 10000,
  "currentCac": 800,
  "currentConversionRatePercent": 3.2,
  "averageOrderValue": 499,
  "grossMarginPercent": 75
}
```

**Response Schema (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "simulationId": "sim_1732289945000",
    "currency": "INR",
    "scenarios": {
      "conservative": { "projectedRevenueMonthly": 57485, "effectiveCac": 1000 },
      "expected": { "projectedRevenueMonthly": 62475, "effectiveCac": 800 },
      "optimistic": { "projectedRevenueMonthly": 74925, "effectiveCac": 640 }
    },
    "confidenceDisclaimer": "Financial model projections represent parametric mathematical calculations..."
  }
}
```
