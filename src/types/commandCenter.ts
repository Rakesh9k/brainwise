/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type StandardDepartmentType =
  | 'STRATEGY'
  | 'MARKETING'
  | 'RESEARCH'
  | 'CREATIVE'
  | 'SALES'
  | 'FINANCE'
  | 'ANALYTICS'
  | 'CUSTOMER_SUCCESS';

export type AgentType =
  | 'STRATEGY_AGENT'
  | 'RESEARCH_AGENT'
  | 'IDEA_AGENT'
  | 'CREATIVE_AGENT'
  | 'CAMPAIGN_AGENT'
  | 'OPERATIONS_AGENT'
  | 'PUBLISHING_AGENT';

export type ToolRiskLevel =
  'LEVEL_1_READ_ONLY' | 'LEVEL_2_REVERSIBLE_INTERNAL' | 'LEVEL_3_EXTERNAL_CONSEQUENTIAL';

export type WorkflowStatus =
  | 'INITIALIZING'
  | 'IN_PROGRESS'
  | 'WAITING_FOR_INFO'
  | 'WAITING_FOR_APPROVAL'
  | 'PAUSED'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'REJECTED';

export type WorkflowTaskStatus =
  'PENDING' | 'READY' | 'RUNNING' | 'WAITING_FOR_APPROVAL' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface WorkflowTaskNode {
  taskId: string;
  title: string;
  description: string;
  department: StandardDepartmentType;
  assignedAgent: AgentType;
  riskLevel: ToolRiskLevel;
  dependencies: string[]; // prerequisite taskIds
  inputPayload: Record<string, unknown>;
  outputResult?: Record<string, unknown>;
  status: WorkflowTaskStatus;
  requiresApproval: boolean;
  approvalRequestId?: string;
  costEstimate: number;
  costActual: number;
  retryCount: number;
  maxRetries: number;
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
}

export interface BusinessWorkflowEntity {
  workflowId: string;
  workspaceId: string;
  objective: string;
  budgetLimit?: number;
  currency: string;
  deadlineDays?: number;
  status: WorkflowStatus;
  progressPercentage: number;
  tasks: WorkflowTaskNode[];
  missingInfoNeeded?: string[];
  missingInfoResponses?: Record<string, string>;
  totalCostEstimate: number;
  totalCostActual: number;
  idempotencyKey?: string;
  finalOutcomeSummary?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface ApprovalRequestEntity {
  requestId: string;
  workspaceId: string;
  workflowId: string;
  taskId: string;
  actionTitle: string;
  actionDescription: string;
  department: StandardDepartmentType;
  agent: AgentType;
  riskLevel: 'LEVEL_3_EXTERNAL_CONSEQUENTIAL';
  consequentialDetails: {
    budgetImpact?: number;
    currency?: string;
    targetChannel?: string;
    pricingChanges?: Record<string, unknown>;
    contentPreview?: string;
    policyChanges?: string[];
    expectedOutcome?: string;
  };
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  decidedBy?: string;
  decisionReason?: string;
  decidedAt?: string;
  createdAt: string;
}

export interface CommandCenterSummaryResponse {
  activeObjectives: Array<{
    workflowId: string;
    objective: string;
    status: WorkflowStatus;
    progress: number;
  }>;
  activeWorkflows: BusinessWorkflowEntity[];
  pendingApprovals: ApprovalRequestEntity[];
  departmentAssignments: Record<string, number>;
  taskStats: {
    completed: number;
    running: number;
    failed: number;
    pendingApproval: number;
  };
  costs: {
    totalEstimated: number;
    totalActual: number;
    currency: string;
  };
  recentAuditLogs: Array<{
    logId: string;
    agent: string;
    action: string;
    riskLevel: string;
    authorized: boolean;
    costIncurred: number;
    timestamp: string;
  }>;
  nextRecommendedAction: string;
}
