# BrainWise Phase 6: Business Command Centre UI & API Contracts

## 1. Business Command Centre Architecture

The **Business Command Centre** provides business owners and operators with unified real-time visibility into all executing workflows, pending Level 3 human approvals, agent activities, and immutable audit trails.

### Design Freeze Compliance (React 19)
In strict accordance with the **Client-Side Design Freeze Directive**, all backend wiring is accomplished cleanly via typed API client methods in `src/services/apiClient.ts` without redesigning or restyling existing UI components.

---

## 2. Command Centre Summary Contract

### Endpoint: `GET /api/v1/workspaces/:workspaceId/orchestration/command-center`
Returns high-level telemetry and status across the entire orchestration engine.

#### Response Schema (`CommandCenterSummaryResponse`)
```typescript
interface CommandCenterSummaryResponse {
  workspaceId: string;
  activeWorkflowsCount: number;
  pendingApprovalsCount: number;
  completedTodayCount: number;
  systemHealth: {
    status: 'HEALTHY' | 'DEGRADED' | 'OUTAGE';
    activeAgentsCount: number;
    failedTasksLast24h: number;
    avgExecutionLatencyMs: number;
  };
  recentWorkflows: BusinessWorkflowEntity[];
  pendingApprovals: ApprovalRequestEntity[];
  recentAuditLogs: AgentAuditLogEntity[];
}
```

---

## 3. Complete REST API Specifications

All endpoints are mounted under `/api/v1/workspaces/:workspaceId/orchestration`:

| Method | Path | Description | Access Role |
|---|---|---|---|
| `GET` | `/command-center` | Fetch operational summary, counts, system health, and pending approvals. | All workspace members |
| `POST` | `/workflows` | Initiate a new autonomous workflow from a strategic business objective. | `member`, `admin`, `owner` |
| `GET` | `/workflows` | List workflows in the workspace with optional `status` filter and pagination. | All workspace members |
| `GET` | `/workflows/:workflowId` | Retrieve full workflow details, including full task DAG node statuses. | All workspace members |
| `POST` | `/workflows/:workflowId/pause` | Pause an actively running workflow between task boundaries. | `admin`, `owner` |
| `POST` | `/workflows/:workflowId/resume` | Resume execution of a paused workflow. | `admin`, `owner` |
| `POST` | `/workflows/:workflowId/cancel` | Cancel workflow and release any active credit holds. | `admin`, `owner` |
| `GET` | `/approvals` | List pending Level 3 approval requests requiring human review. | All workspace members |
| `POST` | `/approvals/:approvalId/decide`| Submit human decision (`APPROVE` or `REJECT`) for a gated action. | `admin`, `owner` strictly |
| `GET` | `/audit-logs` | Retrieve immutable execution telemetry, tool authorizations, and security events. | All workspace members |

---

## 4. Frontend Client Integration (`src/services/apiClient.ts`)

The BrainWise API Client exports 10 fully typed asynchronous methods:

```typescript
// Fetch Command Centre Overview
const summary = await apiClient.getCommandCenterSummary(workspaceId);

// Launch Workflow from Business Objective
const workflow = await apiClient.initiateWorkflow(workspaceId, {
  objective: "Launch Diwali Festive Campaign with 5000 budget",
  businessGoal: "Acquire 100 new gift box orders",
  budgetLimitCredits: 50,
  idempotencyKey: "diwali_launch_v1"
});

// Inspect Workflow DAG
const details = await apiClient.getWorkflowDetails(workspaceId, workflow.id);

// Pause / Resume / Cancel Workflows
await apiClient.pauseWorkflow(workspaceId, workflow.id);
await apiClient.resumeWorkflow(workspaceId, workflow.id);
await apiClient.cancelWorkflow(workspaceId, workflow.id);

// Query Pending Approvals
const approvals = await apiClient.getPendingApprovals(workspaceId);

// Decide Level 3 Gated Action (Admin / Owner)
await apiClient.decideApprovalRequest(workspaceId, approvalId, {
  decision: 'APPROVE', // or 'REJECT'
  userRole: 'owner',
  decisionReason: 'Verified copy and budget allocation.'
});

// Audit Trail Inspection
const logs = await apiClient.getAgentAuditLogs(workspaceId, { limit: 50 });
```

---

## 5. Audit Log Ledger Schema (`AgentAuditLogEntity`)

Every tool authorization, execution step, human decision, and security violation writes an immutable audit record:
```typescript
interface AgentAuditLogEntity {
  id: string;
  workspaceId: string;
  workflowId?: string;
  taskId?: string;
  agentType?: AgentType;
  toolName?: string;
  action: string;
  status: 'SUCCESS' | 'FAILURE' | 'BLOCKED' | 'PENDING_APPROVAL';
  riskLevel?: ToolRiskLevel;
  details?: Record<string, any>;
  ipAddress?: string;
  userId?: string;
  createdAt: string;
}
```
Records are write-once and cannot be mutated or purged by regular workspace members, providing complete regulatory and operational compliance.
