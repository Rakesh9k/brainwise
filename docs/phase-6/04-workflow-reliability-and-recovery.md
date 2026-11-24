# BrainWise Phase 6: Workflow Reliability, Resilience & Recovery

## 1. Reliability Imperatives

Multi-agent orchestration in production environments must be resilient against transient network dropouts, model provider rate limits, cold starts, and server restarts. Without robust fault tolerance, long-running business workflows fail silently, leaving orphan state, duplicated credit charges, and incomplete tasks.

BrainWise implements five core resilience mechanisms in `centralOrchestrationService.ts` and `workflowRepository.ts`:

---

## 2. Idempotency Key Architecture

Every workflow initiation request accepts an optional `idempotencyKey` (e.g., `diwali_campaign_2026_q4_v1`).

1. **Check on Ingestion:** When `initiateWorkflowFromObjective()` is invoked, the repository queries existing workflows for `workspaceId` and `idempotencyKey`:
   ```typescript
   if (idempotencyKey) {
     const existing = await workflowRepository.findWorkflowByIdempotencyKey(workspaceId, idempotencyKey);
     if (existing) {
       return existing; // Return existing workflow without re-running or re-billing
     }
   }
   ```
2. **Double-Click & Network Retry Protection:** If a user double-clicks "Launch Campaign" or a frontend network timeout re-transmits the POST request, the exact existing workflow is returned without spawning duplicate agents, initiating duplicate DAGs, or duplicating credit holds.

---

## 3. Retries with Exponential Backoff & Jitter

When a task fails due to a transient upstream error (e.g., Gemini API rate limit, network timeout, or transient tool failure):

```typescript
const maxRetries = agentSpec.maxRetries; // Defaults to 3
if (task.retryCount < maxRetries) {
  task.retryCount += 1;
  task.status = 'READY'; // Re-queue node for next execution loop
  
  // Calculate backoff delay: base * 2^(retryCount - 1)
  const backoffMs = Math.min(1000 * Math.pow(2, task.retryCount - 1), 10000);
  await new Promise(r => setTimeout(r, backoffMs));
} else {
  task.status = 'FAILED';
  task.error = `Exhausted maximum retry attempts (${maxRetries}): ${error.message}`;
}
```

- **Strategy, Research, Idea, Creative, Operations Agents:** Configured with `maxRetries: 3`.
- **Publishing Agent:** Configured with `maxRetries: 2` to prevent rapid duplicate posting attempts.

---

## 4. Dead-Letter Handling & Fail-Safe Halting

If a task node exhausts all retries:
1. The task is marked `status: 'FAILED'`.
2. The orchestrator checks if any remaining pending tasks do NOT depend on the failed task.
3. If the failed task is a blocking ancestor for downstream nodes, the overall workflow status transitions to `FAILED`.
4. Any reserved credit holds for downstream tasks are immediately released.
5. An alert entry is registered in `agentAuditLogRepository` with action `TASK_FAILED_DEAD_LETTER`.

---

## 5. Pause, Resume, and Cancellation Controls

Workspace operators maintain complete operational control over executing workflows:

### 5.1 Pause (`PAUSED`)
- Halts execution between DAG steps.
- Currently running atomic tasks finish their immediate turn; subsequent ready tasks remain in queue without dispatch.
- State is durably preserved in Firestore.

### 5.2 Resume (`IN_PROGRESS`)
- Transitions workflow status back to `IN_PROGRESS`.
- Re-evaluates DAG dependency readiness and resumes execution from the exact paused node.

### 5.3 Cancellation (`CANCELLED`)
- Immediately stops workflow progression.
- Any tasks in `PENDING` or `READY` status transition to `CANCELLED`.
- Any active credit reservations (`HOLD`) are unlocked and released back to the workspace.

---

## 6. Automated Crash Recovery (`recoverInterruptedWorkflows`)

If the backend server process crashes, restarts during deployment, or experiences an unhandled OS interruption while workflows are in progress:

1. **Recovery Sweep on Startup:** During server initialization, `centralOrchestrationService.recoverInterruptedWorkflows(workspaceId)` executes.
2. **Identification of Stale Executions:** The engine queries workflows with `status: 'IN_PROGRESS'` whose `updatedAt` exceeds the heartbeat threshold (e.g., > 10 minutes ago).
3. **Task Level Triage:**
   - Tasks left in `RUNNING` status are reset to `READY` (incrementing retry counter).
   - Tasks left in `WAITING_FOR_APPROVAL` remain safely paused pending human review.
   - Tasks already marked `COMPLETED` are preserved without re-execution.
4. **Resumption:** The workflow is safely transitioned back into the execution loop, picking up precisely where it was interrupted.
