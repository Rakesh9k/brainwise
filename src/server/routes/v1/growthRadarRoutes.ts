/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, type Request, type Response } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { requireWorkspaceMember, requireWorkspaceRole } from '../../middleware/workspace';
import { growthRadarService } from '../../services/growthRadarService';
import { growthRadarRepository } from '../../repositories/growthRadarRepository';

export const growthRadarRoutes = Router({ mergeParams: true });

growthRadarRoutes.use(authenticateToken);
growthRadarRoutes.use(requireWorkspaceMember);

/**
 * GET /api/v1/workspaces/:workspaceId/growth-radar
 * Retrieves summary and classified opportunities
 */
growthRadarRoutes.get('/', async (req: Request, res: Response): Promise<void> => {
  const workspaceId = req.workspace!.workspaceId;
  const summary = await growthRadarService.getRadarSummary(workspaceId);
  res.json({
    success: true,
    data: summary,
  });
});

/**
 * POST /api/v1/workspaces/:workspaceId/growth-radar/analyze
 * Triggers full workspace proactive opportunity analysis
 */
growthRadarRoutes.post(
  '/analyze',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    const workspaceId = req.workspace!.workspaceId;
    const { customWeights } = req.body || {};

    const summary = await growthRadarService.analyzeWorkspace(workspaceId, {
      customWeights,
      triggerSource: 'MANUAL_API_TRIGGER',
    });

    res.json({
      success: true,
      data: summary,
    });
  }
);

/**
 * GET /api/v1/workspaces/:workspaceId/growth-radar/:opportunityId
 * Retrieves detailed opportunity record
 */
growthRadarRoutes.get('/:opportunityId', async (req: Request, res: Response): Promise<void> => {
  const workspaceId = req.workspace!.workspaceId;
  const { opportunityId } = req.params;

  const opportunity = await growthRadarRepository.findById(workspaceId, opportunityId);
  if (!opportunity) {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Opportunity '${opportunityId}' not found.`,
        category: 'NOT_FOUND',
        retryable: false,
      },
    });
    return;
  }

  res.json({
    success: true,
    data: opportunity,
  });
});

/**
 * POST /api/v1/workspaces/:workspaceId/growth-radar/:opportunityId/transition
 * Transitions opportunity through lifecycle (ACCEPT, REJECT, DEFER, ASSIGN, etc.)
 */
growthRadarRoutes.post(
  '/:opportunityId/transition',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    const workspaceId = req.workspace!.workspaceId;
    const { opportunityId } = req.params;
    const { action, rejectionReason, deferredUntil, assignedToUserId, note } = req.body || {};

    if (!action) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_ACTION',
          message: 'action is required for lifecycle transition.',
          category: 'VALIDATION_ERROR',
          retryable: false,
        },
      });
      return;
    }

    try {
      const updated = await growthRadarService.transitionOpportunity({
        workspaceId,
        opportunityId,
        action,
        actorId: req.user?.uid || 'user',
        rejectionReason,
        deferredUntil,
        assignedToUserId,
        note,
      });

      res.json({
        success: true,
        data: updated,
      });
    } catch (err: any) {
      res.status(err.statusCode || 500).json({
        success: false,
        error: {
          code: 'TRANSITION_ERROR',
          message: err.message,
          category: 'INTERNAL_ERROR',
          retryable: false,
        },
      });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/growth-radar/:opportunityId/convert-task
 * Converts opportunity into a real department task
 */
growthRadarRoutes.post(
  '/:opportunityId/convert-task',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    const workspaceId = req.workspace!.workspaceId;
    const { opportunityId } = req.params;

    try {
      const result = await growthRadarService.convertOpportunityToTask({
        workspaceId,
        opportunityId,
        userRole: req.membership?.role || 'owner',
        userId: req.user?.uid || 'user',
      });

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      res.status(err.statusCode || 500).json({
        success: false,
        error: {
          code: 'TASK_CONVERSION_ERROR',
          message: err.message,
          category: 'INTERNAL_ERROR',
          retryable: false,
        },
      });
    }
  }
);
