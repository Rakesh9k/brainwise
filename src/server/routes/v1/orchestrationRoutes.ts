/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, type Request, type Response } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { requireWorkspaceMember } from '../../middleware/workspace';
import { centralOrchestrationService } from '../../services/centralOrchestrationService';
import { workflowRepository } from '../../repositories/workflowRepository';
import { approvalRequestRepository } from '../../repositories/approvalRequestRepository';
import { approvalWorkflowService } from '../../services/approvalWorkflowService';
import type { WorkspaceRole, WorkflowStatus } from '../../types/api';

export const orchestrationRoutes = Router({ mergeParams: true });

orchestrationRoutes.use(authenticateToken);
orchestrationRoutes.use(requireWorkspaceMember);

/**
 * POST /api/v1/workspaces/:workspaceId/orchestration/workflows
 * Initiates an autonomous business workflow from a user objective
 */
orchestrationRoutes.post('/workflows', async (req: Request, res: Response): Promise<void> => {
  try {
    const workspaceId = req.workspace!.workspaceId;
    const userRole = (req.membership?.role || 'member') as WorkspaceRole;
    const { objective, budgetLimit, currency, deadlineDays, idempotencyKey, tasksOverride } =
      req.body;

    if (!objective || typeof objective !== 'string') {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'objective is required and must be a string.',
          retryable: false,
        },
      });
      return;
    }

    const workflow = await centralOrchestrationService.initiateWorkflow({
      workspaceId,
      objective,
      budgetLimit: budgetLimit !== undefined ? Number(budgetLimit) : undefined,
      currency,
      deadlineDays: deadlineDays !== undefined ? Number(deadlineDays) : undefined,
      userRole,
      idempotencyKey,
      tasksOverride,
    });

    res.status(201).json({
      success: true,
      data: workflow,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'WORKFLOW_INITIATION_FAILED', message: err.message, retryable: true },
    });
  }
});

/**
 * GET /api/v1/workspaces/:workspaceId/orchestration/workflows
 * Lists workflows for a workspace
 */
orchestrationRoutes.get('/workflows', async (req: Request, res: Response): Promise<void> => {
  try {
    const workspaceId = req.workspace!.workspaceId;
    const status = req.query.status as WorkflowStatus | undefined;

    const workflows = await workflowRepository.listWorkflows(workspaceId, status);
    res.json({ success: true, data: workflows });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'WORKFLOWS_FETCH_FAILED', message: err.message, retryable: true },
    });
  }
});

/**
 * GET /api/v1/workspaces/:workspaceId/orchestration/workflows/:workflowId
 * Retrieves detailed workflow execution status and task DAG
 */
orchestrationRoutes.get(
  '/workflows/:workflowId',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const workspaceId = req.workspace!.workspaceId;
      const workflowId = req.params.workflowId as string;

      const workflow = await workflowRepository.getWorkflow(workspaceId, workflowId);
      if (!workflow) {
        res.status(404).json({
          success: false,
          error: {
            code: 'WORKFLOW_NOT_FOUND',
            message: `Workflow '${workflowId}' not found.`,
            retryable: false,
          },
        });
        return;
      }

      res.json({ success: true, data: workflow });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'WORKFLOW_FETCH_FAILED', message: err.message, retryable: true },
      });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/orchestration/workflows/:workflowId/pause
 */
orchestrationRoutes.post(
  '/workflows/:workflowId/pause',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const workspaceId = req.workspace!.workspaceId;
      const workflowId = req.params.workflowId as string;

      const updated = await centralOrchestrationService.pauseWorkflow(workspaceId, workflowId);
      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'WORKFLOW_PAUSE_FAILED', message: err.message, retryable: false },
      });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/orchestration/workflows/:workflowId/resume
 */
orchestrationRoutes.post(
  '/workflows/:workflowId/resume',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const workspaceId = req.workspace!.workspaceId;
      const workflowId = req.params.workflowId as string;
      const userRole = (req.membership?.role || 'member') as WorkspaceRole;

      const updated = await centralOrchestrationService.resumeWorkflow(
        workspaceId,
        workflowId,
        userRole
      );
      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'WORKFLOW_RESUME_FAILED', message: err.message, retryable: true },
      });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/orchestration/workflows/:workflowId/cancel
 */
orchestrationRoutes.post(
  '/workflows/:workflowId/cancel',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const workspaceId = req.workspace!.workspaceId;
      const workflowId = req.params.workflowId as string;

      const updated = await centralOrchestrationService.cancelWorkflow(workspaceId, workflowId);
      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'WORKFLOW_CANCEL_FAILED', message: err.message, retryable: false },
      });
    }
  }
);

/**
 * GET /api/v1/workspaces/:workspaceId/orchestration/approvals
 * Lists pending or historical Level 3 approval requests
 */
orchestrationRoutes.get('/approvals', async (req: Request, res: Response): Promise<void> => {
  try {
    const workspaceId = req.workspace!.workspaceId;
    const status = req.query.status as any;

    const requests = await approvalRequestRepository.listRequests(workspaceId, status);
    res.json({ success: true, data: requests });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'APPROVALS_FETCH_FAILED', message: err.message, retryable: true },
    });
  }
});

/**
 * POST /api/v1/workspaces/:workspaceId/orchestration/approvals/:requestId/action
 * Submits an operator approval decision (APPROVE or REJECT)
 */
orchestrationRoutes.post(
  '/approvals/:requestId/action',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const workspaceId = req.workspace!.workspaceId;
      const requestId = req.params.requestId as string;
      const userId = req.user?.uid || 'user';
      const userRole = (req.body.userRole || req.membership?.role || 'member') as WorkspaceRole;
      const { decision, reason } = req.body;

      if (!decision || (decision !== 'APPROVE' && decision !== 'REJECT')) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'decision must be APPROVE or REJECT.',
            retryable: false,
          },
        });
        return;
      }

      const updated = await approvalWorkflowService.processDecision({
        workspaceId,
        requestId,
        decision,
        userId,
        userRole,
        reason,
      });

      if (decision === 'APPROVE') {
        await centralOrchestrationService.executeWorkflowSteps(
          workspaceId,
          updated.workflowId,
          userRole
        );
      }

      res.json({ success: true, data: updated });
    } catch (err: any) {
      const status = err.statusCode || 500;
      res.status(status).json({
        success: false,
        error: {
          code: status === 403 ? 'AUTHORIZATION_ERROR' : 'DECISION_FAILED',
          message: err.message || 'Failed to process approval decision',
          retryable: false,
        },
      });
    }
  }
);

/**
 * GET /api/v1/workspaces/:workspaceId/orchestration/command-center
 * Retrieves comprehensive Business Command Centre overview
 */
orchestrationRoutes.get('/command-center', async (req: Request, res: Response): Promise<void> => {
  try {
    const workspaceId = req.workspace!.workspaceId;
    const summary = await centralOrchestrationService.getCommandCenterSummary(workspaceId);
    res.json({ success: true, data: summary });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'COMMAND_CENTER_FETCH_FAILED', message: err.message, retryable: true },
    });
  }
});

/**
 * POST /api/v1/workspaces/:workspaceId/orchestration/recover
 * Recovers interrupted workflows after backend restart
 */
orchestrationRoutes.post('/recover', async (req: Request, res: Response): Promise<void> => {
  try {
    const workspaceId = req.workspace!.workspaceId;
    const userRole = (req.membership?.role || 'member') as WorkspaceRole;

    const recovered = await centralOrchestrationService.recoverInterruptedWorkflows(
      workspaceId,
      userRole
    );
    res.json({ success: true, data: recovered });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'RECOVERY_FAILED', message: err.message, retryable: true },
    });
  }
});

/**
 * POST /api/v1/workspaces/:workspaceId/orchestration/workflows/:workflowId/provide-info
 * Submits clarifying responses for a workflow in WAITING_FOR_INFO state
 */
orchestrationRoutes.post(
  '/workflows/:workflowId/provide-info',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const workspaceId = req.workspace!.workspaceId;
      const workflowId = req.params.workflowId as string;
      const userRole = (req.membership?.role || 'member') as WorkspaceRole;
      const { responses } = req.body;

      if (!responses || typeof responses !== 'object') {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'responses dictionary is required.',
            retryable: false,
          },
        });
        return;
      }

      const updated = await centralOrchestrationService.provideMissingInformation(
        workspaceId,
        workflowId,
        responses,
        userRole
      );
      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'PROVIDE_INFO_FAILED', message: err.message, retryable: false },
      });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/orchestration/workflows/:workflowId/tasks/:taskId/retry
 * Retries a failed task in a workflow
 */
orchestrationRoutes.post(
  '/workflows/:workflowId/tasks/:taskId/retry',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const workspaceId = req.workspace!.workspaceId;
      const workflowId = req.params.workflowId as string;
      const taskId = req.params.taskId as string;
      const userRole = (req.membership?.role || 'member') as WorkspaceRole;

      const updated = await centralOrchestrationService.retryTask(
        workspaceId,
        workflowId,
        taskId,
        userRole
      );
      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'TASK_RETRY_FAILED', message: err.message, retryable: false },
      });
    }
  }
);
