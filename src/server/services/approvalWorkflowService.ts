/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'node:crypto';
import { approvalRequestRepository } from '../repositories/approvalRequestRepository';
import { workflowRepository } from '../repositories/workflowRepository';
import type {
  ApprovalRequestEntity,
  StandardDepartmentType,
  AgentType,
  WorkspaceRole,
} from '../types/api';

export class ApprovalWorkflowService {
  /**
   * Creates an approval request when a Level 3 consequential task is reached
   */
  public async createApprovalRequest(params: {
    workspaceId: string;
    workflowId: string;
    taskId: string;
    actionTitle: string;
    actionDescription: string;
    department: StandardDepartmentType | string;
    agent: AgentType | string;
    consequentialDetails: ApprovalRequestEntity['consequentialDetails'];
  }): Promise<ApprovalRequestEntity> {
    const {
      workspaceId,
      workflowId,
      taskId,
      actionTitle,
      actionDescription,
      department,
      agent,
      consequentialDetails,
    } = params;

    const requestId = `req_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const now = new Date().toISOString();

    const request: ApprovalRequestEntity = {
      requestId,
      workspaceId,
      workflowId,
      taskId,
      actionTitle,
      actionDescription,
      department,
      agent,
      riskLevel: 'LEVEL_3_EXTERNAL_CONSEQUENTIAL',
      consequentialDetails,
      status: 'PENDING',
      createdAt: now,
    };

    const saved = await approvalRequestRepository.createRequest(request);

    // Update workflow status to WAITING_FOR_APPROVAL
    const workflow = await workflowRepository.getWorkflow(workspaceId, workflowId);
    if (workflow) {
      const updatedTasks = workflow.tasks.map((t) => {
        if (t.taskId === taskId) {
          return {
            ...t,
            status: 'WAITING_FOR_APPROVAL' as const,
            requiresApproval: true,
            approvalRequestId: requestId,
          };
        }
        return t;
      });

      await workflowRepository.updateWorkflow(workspaceId, workflowId, {
        status: 'WAITING_FOR_APPROVAL',
        tasks: updatedTasks,
      });
    }

    return saved;
  }

  /**
   * Processes a human decision (APPROVE or REJECT) on a pending Level 3 action
   */
  public async processDecision(params: {
    workspaceId: string;
    requestId: string;
    decision: 'APPROVE' | 'REJECT';
    userId: string;
    userRole: WorkspaceRole;
    reason?: string;
  }): Promise<ApprovalRequestEntity> {
    const { workspaceId, requestId, decision, userId, userRole, reason } = params;

    // RBAC: Only Admin or Owner may decide on Level 3 consequential actions
    if (userRole !== 'owner' && userRole !== 'admin') {
      const err: any = new Error(
        `AUTHORIZATION_ERROR: Role '${userRole}' lacks permission to approve Level 3 consequential actions. Requires 'admin' or 'owner'.`
      );
      err.statusCode = 403;
      throw err;
    }

    const request = await approvalRequestRepository.getRequest(workspaceId, requestId);
    if (!request) {
      throw new Error(`Approval request '${requestId}' not found in workspace '${workspaceId}'`);
    }

    if (request.status !== 'PENDING') {
      throw new Error(
        `Approval request '${requestId}' has already been decided (${request.status}).`
      );
    }

    const now = new Date().toISOString();
    const newStatus = decision === 'APPROVE' ? 'APPROVED' : 'REJECTED';

    const updated = await approvalRequestRepository.updateRequest(workspaceId, requestId, {
      status: newStatus,
      decidedBy: userId,
      decisionReason:
        reason || (decision === 'APPROVE' ? 'Approved by operator' : 'Rejected by operator'),
      decidedAt: now,
    });

    // Update corresponding workflow state
    const workflow = await workflowRepository.getWorkflow(workspaceId, request.workflowId);
    if (workflow) {
      if (decision === 'REJECT') {
        const updatedTasks = workflow.tasks.map((t) => {
          if (t.taskId === request.taskId) {
            return {
              ...t,
              status: 'CANCELLED' as const,
              errorMessage: `Rejected by user: ${reason || 'Operator declined action'}`,
            };
          }
          return t;
        });

        await workflowRepository.updateWorkflow(workspaceId, request.workflowId, {
          status: 'REJECTED',
          tasks: updatedTasks,
        });
      } else {
        // Mark task as ready to execute upon approval
        const updatedTasks = workflow.tasks.map((t) => {
          if (t.taskId === request.taskId) {
            return {
              ...t,
              status: 'READY' as const,
            };
          }
          return t;
        });

        await workflowRepository.updateWorkflow(workspaceId, request.workflowId, {
          status: 'IN_PROGRESS',
          tasks: updatedTasks,
        });
      }
    }

    return updated;
  }
}

export const approvalWorkflowService = new ApprovalWorkflowService();
