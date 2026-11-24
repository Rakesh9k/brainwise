# BrainWise Phase 6: Autonomous Business Operations & Multi-Agent Orchestration Architecture

## 1. Executive Summary & Core Mission

Phase 6 transforms BrainWise into a coordinated, controlled autonomous business execution platform. Rather than acting as a simple chatbot or single-turn prompter, the **Central Orchestration Engine** accepts high-level strategic business objectives, breaks them down into deterministic Directed Acyclic Graphs (DAGs) of discrete subtasks, delegates them across specialized department agents with strict least-privilege tool boundaries, and coordinates durable execution across the platform.

### Core Architectural Principle
> **CONTROLLED AUTONOMY WITH HUMAN-IN-THE-LOOP SAFEGUARDS.**
> Autonomy without governance produces hallucinated actions, unauthorized spend, and brand damage. BrainWise enforces strict risk tiering, deterministic DAG execution, cost ceilings, atomic two-phase credit reservations, and mandatory human sign-off for any consequential external operations.

---

## 2. Logical Architecture Diagram

```
                    USER / BUSINESS OWNER
                             │
                             ▼
              BUSINESS COMMAND CENTRE (UI)
                             │
                             ▼
          API GATEWAY (/api/v1/workspaces/:ws/orchestration)
                             │
                             ▼
              CENTRAL ORCHESTRATION SERVICE
        ┌────────────────────┴────────────────────┐
        ▼                                         ▼
OBJECTIVE DECOMPOSER                    CONTEXT GROUNDING ENGINE
(Generates Task DAG)                    (Persistent Business Brain)
        │                                         │
        └────────────────────┬────────────────────┘
                             ▼
                     DAG EXECUTION LOOP
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
   DEPENDENCY           COST CEILING           STATUS
   RESOLUTION            VALIDATION           TRACKER
        │                    │                    │
        └────────────────────┼────────────────────┘
                             ▼
                SPECIALIZED AGENT REGISTRY
  ┌──────────────┬──────────────┬──────────────┬──────────────┐
  │   STRATEGY   │   RESEARCH   │     IDEA     │   CREATIVE   │
  │    AGENT     │    AGENT     │    AGENT     │    AGENT     │
  └──────────────┴──────────────┴──────────────┴──────────────┘
  ┌──────────────┬──────────────┬──────────────┐
  │   CAMPAIGN   │  OPERATIONS  │  PUBLISHING  │
  │    AGENT     │    AGENT     │    AGENT     │
  └──────────────┴──────────────┴──────────────┘
                             │
                             ▼
               TOOL PERMISSION & GOVERNANCE GATE
  ┌───────────────────────────────────────────────────────────┐
  │ 1. Least-Privilege Agent Authorization Check              │
  │ 2. Multi-Tenant Isolation (workspaces/{ws}/...)          │
  │ 3. Prompt Injection Defense (<untrusted_external_data>)  │
  │ 4. Risk Tier Classification (Level 1, 2, or 3)           │
  └──────────────────────────┬────────────────────────────────┘
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
   [Level 1 & Level 2]               [Level 3 Consequential]
   Autonomous Execution             HUMAN APPROVAL GATE
            │                       (State: WAITING_FOR_APPROVAL)
            │                                 │
            │                         [User Decision]
            │                        ┌────────┴────────┐
            │                        ▼                 ▼
            │                   [Approved]        [Rejected]
            │                        │                 │
            ▼                        ▼                 ▼
       TOOL EXECUTION          TOOL EXECUTION     TERMINATE BRANCH
            │                        │                 │
            └────────────────┬───────┘                 │
                             ▼                         ▼
                   OUTPUT VERIFICATION            AUDIT RECORD
             (Strict Video Exclusion Check +
              Deterministic Truth Check)
                             │
                             ▼
                 TWO-PHASE CREDIT SETTLEMENT
                   (Settle / Release Hold)
                             │
                             ▼
                   DURABLE DAG PROGRESSION
               (Persist State to Firestore)
```

---

## 3. Workflow Lifecycle & State Machine

Every workflow initiated in BrainWise follows a deterministic state machine managed by `centralOrchestrationService.ts`:

### 3.1 Workflow States
1. **`DRAFT`**: Workflow template or task DAG generated but not yet scheduled for execution.
2. **`IN_PROGRESS`**: Actively executing eligible nodes whose dependencies have succeeded.
3. **`WAITING_FOR_APPROVAL`**: Execution paused because a Level 3 consequential tool requires explicit human review and authorization. All completed upstream progress is durably saved.
4. **`PAUSED`**: Execution paused by workspace operator or system administrator.
5. **`COMPLETED`**: All tasks in the DAG completed successfully; episodic memory stored; final outputs aggregated.
6. **`FAILED`**: A critical task failed and exhausted all retry attempts, or an unrecoverable system error occurred.
7. **`CANCELLED`**: Execution explicitly aborted by an authorized user; all reserved credits immediately released.

### 3.2 Task Node States
Each individual task node inside the DAG progresses through:
- `PENDING` $\to$ `READY` $\to$ `RUNNING` $\to$ `COMPLETED`
- `READY` $\to$ `WAITING_FOR_APPROVAL` $\to$ `RUNNING` (upon approval) or `CANCELLED` (upon rejection)
- `RUNNING` $\to$ `FAILED` (with retry count tracking)

---

## 4. DAG Decomposition & Dependency Resolution

When a user submits an objective (e.g., *"Launch Diwali Campaign for Handcrafted Gift Boxes with 5000 budget"*):
1. **Business Brain Grounding:** The orchestrator retrieves verified business identity, approved products, brand voice, target audience, and active pricing.
2. **Deterministic Task Breakdown:** The objective is mapped into structured task nodes with explicit `dependencies`:
   - Task 1: Strategy Formulation (`STRATEGY_AGENT`) $\to$ Dependencies: `[]`
   - Task 2: Competitor Research (`RESEARCH_AGENT`) $\to$ Dependencies: `[Task 1]`
   - Task 3: Angle Generation (`IDEA_AGENT`) $\to$ Dependencies: `[Task 1]`
   - Task 4: Static Vector & Carousel Design (`CREATIVE_AGENT`) $\to$ Dependencies: `[Task 3]`
   - Task 5: Copywriting & Scheduling (`CAMPAIGN_AGENT`) $\to$ Dependencies: `[Task 2, Task 4]`
   - Task 6: Campaign Activation & Budget Commitment (`PUBLISHING_AGENT`) $\to$ Dependencies: `[Task 5]` *(Triggers Level 3 Approval)*
3. **Dependency Resolution Algorithm:** At each execution iteration, the engine filters for tasks in `PENDING` status whose upstream `dependencies` all report status `COMPLETED`.
4. **Cost Ceiling Guardrail:** Prior to running each task, the accumulated workflow credit cost is evaluated against `budgetLimitCredits`. If executing the task would exceed the ceiling, execution halts safely before credits are reserved.

---

## 5. Credit Reservation Integration (ADR-006)

In strict accordance with **ADR-006 (Two-Phase Credit Reservation Protocol)**:
- Credits are never deducted purely on the client side.
- Before a task executes, an atomic reservation (`HOLD`) is placed on the workspace credit balance.
- If upstream AI generation encounters an error, rate limit, or fails Truth Check verification, the reserved hold is automatically released with zero net charge to the business.
- Upon successful output verification and persistence, the reservation is atomically settled.

---

## 6. Multi-Tenant Isolation & Storage Paths

Every orchestration entity is strictly isolated within the workspace partition:
- **Workflows:** `workspaces/{workspaceId}/workflows/{workflowId}`
- **Approval Requests:** `workspaces/{workspaceId}/approvals/{approvalId}`
- **Agent Audit Ledger:** `workspaces/{workspaceId}/agent_audit_logs/{logId}`
- **Episodic Memories:** `workspaces/{workspaceId}/memories/{memoryId}`

Cross-tenant access attempts trigger an immediate `CROSS_TENANT_VIOLATION` security exception, aborting the request and recording an immutable audit entry.
