# BRAINWISE — PHASE 4: DEPARTMENT COORDINATION & TASK PROTOCOL

> **Standard Task Execution Protocol, Deduplication, Human Approval Gates & Cross-Department Event Routing**
> **Product Architecture Directive:** Deterministic, reliable cross-department coordination without circular loops or duplicate tasks.

---

## 1. Standard Department Task Contract

All inter-departmental actions adhere to the `StandardDepartmentTaskEntity` schema:

```typescript
export interface StandardDepartmentTaskEntity {
  taskId: string;
  businessId: string; // workspaceId
  workspaceId: string;
  department: StandardDepartmentType | string;
  objective: string;
  inputContext: Record<string, unknown>;
  requestedAction: string;
  requiredOutputSchema?: Record<string, unknown>;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  dependencies: string[];               // taskIds that must complete before execution
  permissionRequirements: string[];     // Required permissions (e.g. ['admin'])
  approvalRequirements: {
    required: boolean;
    approved?: boolean;
    approvedBy?: string;
    approvedAt?: string;
    rejected?: boolean;
    rejectionReason?: string;
  };
  status: 'PENDING' | 'QUEUED' | 'RUNNING' | 'WAITING_APPROVAL' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  result?: Record<string, unknown>;
  errors?: string[];
  retryCount: number;
  maxRetries: number;
  idempotencyKey?: string;              // Deterministic deduplication key
  auditHistory: Array<{
    action: string;
    timestamp: string;
    actorId?: string;
    details?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}
```

---

## 2. Task Lifecycle & State Transitions

```
                    ┌──────────────┐
                    │ Task Submit  │
                    └──────┬───────┘
                           │
             ┌─────────────┴─────────────┐
             ▼                           ▼
     [Needs Approval?]           [Dependencies Met?]
      ├── Yes ──► WAITING_APPROVAL  ├── No  ──► PENDING (waiting on upstream task)
      └── No  ──► QUEUED            └── Yes ──► QUEUED
                       │
       ┌───────────────┴───────────────┐
       ▼                               ▼
[User Approves]                 [User Rejects]
   │                               │
   ▼                               ▼
 RUNNING                       CANCELLED
   │                    (Execution permanently blocked;
   │                     never executed silently)
   ├─── Error (retryCount < maxRetries) ──► Retries with backoff
   ├─── Max Retries Exceeded ─────────────► FAILED
   └─── Successful Completion ────────────► COMPLETED
```

---

## 3. Duplicate Task Prevention (Idempotency Engine)

1. **Deterministic Idempotency Key Generation:**
   ```
   idempotencyKey = `idem_${sha256(`${workspaceId}:${department}:${requestedAction}:${JSON.stringify(inputContext)}`).substring(0, 24)}`
   ```
2. **Atomic Verification:**
   - On task submission, `departmentTaskRepository.findByIdempotencyKey(workspaceId, key)` is checked.
   - If an existing task is found, the system immediately returns `{ task: existing, isDuplicate: true }` without enqueuing a duplicate background task.

---

## 4. Human Approval Gate & Silent Execution Guardrail

1. **Consequential Action Protection:**
   - Any task that has financial implications, external write actions, or critical priority is configured with `approvalRequirements.required = true`.
   - The task enters `WAITING_APPROVAL` and halts execution.
2. **Strict Rejection Enforcement:**
   - If rejected via `POST .../reject`, status moves to `CANCELLED` and `approvalRequirements.rejected` is set to `true`.
   - `departmentCoordinationService.processTaskWithRetry` explicitly asserts that cancelled/rejected tasks can never be processed:
     ```typescript
     if (task.status === 'CANCELLED') {
       throw new Error(`CANNOT_PROCESS: Task '${taskId}' was rejected and cancelled.`);
     }
     ```

---

## 5. Cross-Department Coordination & Event Routing

Departments coordinate asynchronously via the central `departmentEventBus` and `dispatchCoordinationEvent()`:

### 5.1 Coordination Workflows
1. **Research Finding $\to$ Marketing Context:**
   - `RESEARCH_FINDING_DISCOVERED` updates verified competitors and signals in the Business Brain, refreshing Marketing angles.
2. **Marketing Outcome $\to$ Analytics Telemetry:**
   - `MARKETING_CAMPAIGN_COMPLETED` dispatches conversion and impression outcomes to Analytics.
3. **Analytics Anomaly $\to$ Strategy Adjustment:**
   - `ANALYTICS_INSIGHT_DETECTED` (e.g. CAC spike or conversion drop) sends root-cause alerts to Strategy.
4. **Sales Objections $\to$ Ground Truth Personas:**
   - `SALES_OBJECTION_RECORDED` appends objections directly into the Business Brain customer personas and flushes the shared context cache.
5. **Creative Asset $\to$ Asset Vault:**
   - `CREATIVE_ASSET_APPROVED` verifies SVG vector compliance (**STRICT VIDEO EXCLUSION**) and catalogues collateral for team reuse.

### 5.2 Cycle Prevention & Hop Count Limiting
To eliminate infinite agent-to-agent feedback loops:
- Every event carries `hopCount: number` and `visitedDepartments: string[]`.
- **Max Hop Guardrail:** `MAX_HOPS = 3`. Any event chain exceeding 3 hops is rejected with `CYCLE_PREVENTION_BLOCKED`.
- **Duplicate Department Guardrail:** If an event attempts to re-trigger a department already present in `visitedDepartments`, it is rejected with `CIRCULAR_TRIGGER_PREVENTED`.
