# BrainWise Phase 6: Human Approval & Autonomy Framework

## 1. Governance Overview

Unchecked agent autonomy in enterprise and business operations introduces catastrophic risks: unintended ad spend, incorrect public price drops, brand reputation damage from unsanctioned statements, and non-compliant marketing claims.

BrainWise implements a **3-Tier Autonomy & Human Approval Framework** managed by `approvalWorkflowService.ts` and integrated directly into `centralOrchestrationService.ts`.

---

## 2. The 3-Tier Autonomy Model

```
┌────────────────────────────────────────────────────────────────────────┐
│                        TIER 1: FULL AUTONOMY                           │
│  - Level 1 Tools (Read-Only) & Level 2 Tools (Internal Drafts)        │
│  - Agents autonomously read Brain facts, research web, generate SVGs,  │
│    assemble copywriting packs, and write internal draft tasks.         │
│  - Zero risk of external brand or financial impact.                   │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   TIER 2: SUPERVISED PROPOSALS                         │
│  - Operations that assemble external payload structures.               │
│  - Completed drafts and plans are bundled into an Approval Request.   │
│  - System validates facts, prices, exclusions, and formats.           │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                 TIER 3: MANDATORY HUMAN APPROVAL GATE                  │
│  - Level 3 Tools (External Consequential Actions).                     │
│  - System PAUSES execution in WAITING_FOR_APPROVAL.                    │
│  - RBAC Enforcement: Only 'owner' or 'admin' can Approve or Reject.   │
│  - External API invocation occurs ONLY after explicit signature.       │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Human Approval Gate Lifecycle

When a task node inside the DAG requires a `LEVEL_3_EXTERNAL_CONSEQUENTIAL` tool:

### Step 1: Pre-Gating Durable State Persistence
Before transitioning into a paused state, all preceding completed nodes (strategy briefs, competitor insights, creative SVG banners, ad copy packs) are durably written to Firestore. If the approval remains pending for days, zero workflow progress is lost.

### Step 2: Transition to `WAITING_FOR_APPROVAL`
The task node status is updated to `WAITING_FOR_APPROVAL`, and the overall workflow status transitions to `WAITING_FOR_APPROVAL`.

### Step 3: Creation of `ApprovalRequestEntity`
An immutable approval request document is written to `workspaces/{workspaceId}/approvals/{approvalId}`:
```typescript
interface ApprovalRequestEntity {
  id: string;
  workspaceId: string;
  workflowId: string;
  taskId: string;
  agentType: AgentType;
  toolName: string;
  riskLevel: ToolRiskLevel;
  title: string;
  description: string;
  proposedPayload: Record<string, any>;
  estimatedCostCredits: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  requestedAt: string;
  expiresAt?: string;
  decidedBy?: string;
  decidedAt?: string;
  decisionReason?: string;
}
```

### Step 4: Role-Based Authorization Check (RBAC)
When an action decision (`APPROVE` or `REJECT`) is submitted:
```typescript
const isAuthorized = userRole === 'owner' || userRole === 'admin';
if (!isAuthorized) {
  throw new Error(`Forbidden: Role '${userRole}' is not authorized to approve or reject Level 3 actions. Requires 'owner' or 'admin'.`);
}
```
Users with `member` or `viewer` roles are strictly prohibited from approving consequential actions.

### Step 5A: Execution on Approval (`APPROVED`)
1. The approval request record is marked `status: 'APPROVED'` with `decidedBy`, `decidedAt`, and optional comments.
2. The task node status transitions to `RUNNING`.
3. The Level 3 tool executes through `toolPermissionService.executeAuthorizedTool()`.
4. Output verification (Truth Check + Strict Video Exclusion) executes.
5. Credits are atomically settled, and downstream DAG tasks proceed.

### Step 5B: Handling on Rejection (`REJECTED`)
1. The approval request is marked `status: 'REJECTED'` with the user's rejection reason.
2. The task node transitions to `CANCELLED`.
3. The workflow safely halts or completes remaining independent branches, recording the rejection reason.
4. Any reserved credits are immediately released back to the workspace credit wallet.
5. An audit log entry is recorded: `ACTION_REJECTED_BY_USER`.
