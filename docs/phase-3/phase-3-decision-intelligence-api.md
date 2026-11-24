# BRAINWISE BUSINESS BRAIN — PHASE 3
## Deliverable 3.4: Decision Intelligence REST API Specification

---

### 1. Architectural Scope & Authentication

The **Decision Intelligence REST API** provides the unified programmatic interface for all business analysis, strategic reasoning, scenario planning, goal tracking, and decision history operations.

- **Base URL:** `/api/v1/workspaces/:workspaceId/reasoning`
- **Security Middleware:**
  - `authenticateToken`: Validates cryptographically signed Firebase Auth Bearer token.
  - `requireWorkspaceMember`: Enforces tenant boundary under `workspaces/{workspaceId}/members/{userId}`.
  - `requireWorkspaceRole`: Restricts write actions to `['owner', 'admin', 'member']`.

---

### 2. Endpoints Specification

#### 2.1 Business Health Assessment
Evaluates health across 8 operational dimensions, returning dimensional scores and maturity stage.

- **Method:** `GET /health`
- **Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "workspaceId": "ws_apex_01",
    "overallScore": 82,
    "maturityStage": "scaling",
    "dimensions": [
      {
        "dimension": "positioning",
        "score": 95,
        "status": "strong",
        "findings": ["Value proposition defined", "Tagline verified"],
        "evidence": [...]
      },
      {
        "dimension": "operational_limitations",
        "score": 90,
        "status": "strong",
        "findings": ["Monthly marketing budget verified at $5000", "Operating capacity verified: 100 kegs / week"]
      }
    ],
    "identifiedGaps": [],
    "criticalRisks": [],
    "evaluatedAt": "2026-11-20T10:00:00Z"
  }
}
```

---

#### 2.2 Evidence-Backed SWOT Analysis
Returns strengths, weaknesses, opportunities, threats, and detected brand contradictions.

- **Method:** `GET /swot`
- **Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "workspaceId": "ws_apex_01",
    "strengths": [
      {
        "id": "str_verified_catalog",
        "category": "strength",
        "statement": "Verified Commercial Catalog",
        "detail": "3 fully verified products with established pricing models.",
        "evidence": [...],
        "isAssumption": false,
        "confidence": 1.0,
        "importance": "high"
      }
    ],
    "weaknesses": [...],
    "opportunities": [
      {
        "id": "opp_digital_channel_expansion",
        "category": "opportunity",
        "statement": "Direct Digital Acquisition Channel Expansion",
        "detail": "Leverage outbound pipelines to capture unserved regional demand.",
        "isAssumption": true,
        "confidence": 0.75,
        "importance": "medium"
      }
    ],
    "threats": [...],
    "contradictionsDetected": [
      "Product 'Instant Cold Nitro Pods' description contains prohibited brand word 'Instant'."
    ],
    "generatedAt": "2026-11-20T10:00:00Z"
  }
}
```

---

#### 2.3 Root-Cause Performance Investigation
Investigates causes of suboptimal performance without defaulting to "spend more on ads".

- **Method:** `POST /root-cause`
- **Request Body:**
```json
{
  "issueDescription": "Customer churn on mini cold brew keg reorders.",
  "observedMetric": "Repeat order rate dropped to 14%"
}
```
- **Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "issueId": "issue_1732098000000",
    "symptom": "Customer churn on mini cold brew keg reorders.",
    "hypotheses": [
      {
        "cause": "Packaging or Return Logistics Friction",
        "likelihood": "confirmed",
        "isCorrelationOnly": false,
        "evidenceNotes": "Historical precedent documented in decision: 'Discontinue 5L Consumer Mini-Kegs'.",
        "evidence": [...]
      }
    ],
    "identifiedRootCause": "Logistical and packaging friction confirmed by historical experiment records.",
    "recommendedInvestigationSteps": [
      "Survey churned prospects on valve leakage and return pickup friction.",
      "Review unit gross margin structure before allocating incremental advertising spend."
    ],
    "requiresMoreData": false
  }
}
```

---

#### 2.4 Strategic Recommendations & User Decision

##### A. Generate Strategies
- **Method:** `GET /strategies?goalId=goal_123` or `POST /strategies/generate`
- **Response (`200 OK`):**
```json
{
  "success": true,
  "data": [
    {
      "strategyId": "strat_b2b_1732098000000",
      "workspaceId": "ws_apex_01",
      "title": "Direct B2B Commercial Account Expansion",
      "objective": "Support Goal: 'Scale Nitro Keg Distribution' through direct wholesale distribution.",
      "reason": "Grounded in verified product 'Apex Nitro Keg 20L' ($165) and weekly capacity (100 kegs / week).",
      "supportingEvidence": [...],
      "requiredActions": [
        {
          "action": "Compile verified wholesale ratecard highlighting zero prep labor benefits.",
          "sequence": 1,
          "estimatedEffortDays": 2,
          "responsibleDepartment": "BRAND_STUDIO"
        }
      ],
      "responsibleDepartment": "GROWTH_DIRECTOR",
      "expectedOutcome": "Secure 3 to 5 initial recurring commercial supply agreements within capacity boundaries.",
      "budgetEstimate": 2000,
      "budgetCurrency": "USD",
      "requiredResources": ["Product specification collateral", "Wholesale pricing ratecard"],
      "risks": [
        {
          "risk": "Wholesale accounts request delivery beyond current capacity limits.",
          "severity": "medium",
          "mitigation": "Strictly enforce weekly throughput limit of 100 kegs / week."
        }
      ],
      "dependencies": ["Product: Apex Nitro Keg 20L"],
      "kpis": [
        {
          "metric": "Commercial Inquiries Generated",
          "target": "15 qualified cafes",
          "baseline": "0"
        }
      ],
      "measurementPeriod": "60 days",
      "status": "proposed"
    }
  ]
}
```

##### B. Apply User Decision
- **Method:** `POST /strategies/:strategyId/decision`
- **Request Body:**
```json
{
  "decision": "rejected",
  "userFeedback": "Cold brew mini-keg packaging logistics are too complex for our team right now.",
  "alternativesConsidered": [
    { "alternative": "Mini-kegs", "reasonRejected": "High packaging cost" }
  ]
}
```

---

#### 2.5 Opportunity Prioritisation Engine
- **Method:** `POST /opportunities/rank`
- **Request Body:**
```json
{
  "opportunities": [
    {
      "title": "B2B Specialty Cafe Keg Subscription",
      "description": "Contract with 20 cafes for weekly nitro draft keg supply.",
      "businessImpact": 90,
      "strategicAlignment": 95,
      "evidenceConfidence": 90,
      "feasibility": 85,
      "costEfficiency": 80
    }
  ]
}
```
- **Response (`200 OK`):**
```json
{
  "success": true,
  "data": [
    {
      "opportunityId": "opp_1_1732098000000",
      "title": "B2B Specialty Cafe Keg Subscription",
      "compositeScore": 90,
      "priorityTier": "high_priority",
      "factorContributions": {
        "businessImpact": 27.0,
        "strategicAlignment": 23.75,
        "evidenceConfidence": 18.0,
        "feasibility": 12.75,
        "costEfficiency": 8.0
      },
      "disclaimer": "Opportunity scores indicate relative strategic alignment under current business assumptions and do NOT imply guaranteed revenue, conversion, or commercial success."
    }
  ]
}
```

---

#### 2.6 Parametric Scenario Simulation
- **Method:** `POST /scenarios/simulate`
- **Request Body:**
```json
{
  "scenarioType": "budget_increase_20"
}
```
- **Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "scenarioType": "budget_increase_20",
    "title": "Marketing Budget Increase (+20%)",
    "scenarios": {
      "bestCase": {
        "caseType": "best_case",
        "projectedRevenueRange": { "min": 3500, "max": 5000, "midpoint": 4250 },
        "projectedCustomerGrowth": { "min": 8, "max": 14 },
        "estimatedCost": 6000,
        "netMarginEstimatePercent": 42,
        "keyAssumptions": ["Ad channel conversion rate remains constant at scale."],
        "operationalBottlenecks": ["Weekly dispatch capacity ceiling"]
      },
      "expectedCase": { ... },
      "downside": { ... }
    },
    "disclaimer": "Scenario planning outputs represent calculated parametric sensitivity models under explicit assumptions. They are planning tools and do NOT constitute financial forecasts, earnings guarantees, or predictive commitments."
  }
}
```

---

#### 2.7 Business Goal Management
- `GET /goals` — List goals by status, department, or parentGoalId.
- `POST /goals` — Create structured goal.
- `GET /goals/:goalId` — Retrieve specific goal.
- `PATCH /goals/:goalId` — Update goal metrics or status.
- `DELETE /goals/:goalId` — Delete goal.

---

#### 2.8 Decision History
- `GET /decisions` — List historical decisions by department or approval status.
- `POST /decisions` — Record decision with alternatives considered and user approval.
- `PATCH /decisions/:decisionId` — Update decision with actual result and lessons learned.
