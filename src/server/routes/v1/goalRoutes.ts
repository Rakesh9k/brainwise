/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, type Request, type Response } from 'express';
import crypto from 'node:crypto';
import { authenticateToken } from '../../middleware/auth';
import { requireWorkspaceMember, requireWorkspaceRole } from '../../middleware/workspace';
import { goalRepository } from '../../repositories/goalRepository';
import { kpiRepository } from '../../repositories/kpiRepository';
import type { BusinessGoalEntity, KpiObservationEntity } from '../../types/api';

const router = Router({ mergeParams: true });

router.use(authenticateToken);
router.use(requireWorkspaceMember);

/**
 * GET /api/v1/workspaces/:workspaceId/goals
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const goals = await goalRepository.listByWorkspace(req.workspace!.workspaceId);
  res.json({
    success: true,
    data: goals,
  });
});

/**
 * POST /api/v1/workspaces/:workspaceId/goals
 */
router.post(
  '/',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    const { title, description, category, currentValue, targetValue, unit, startDate, targetDate } =
      req.body;
    if (!title) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_TITLE',
          message: 'Goal title is required',
          category: 'VALIDATION_ERROR',
          retryable: false,
        },
      });
      return;
    }

    const goalId =
      req.body.goalId || `goal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const goal: BusinessGoalEntity = {
      goalId,
      workspaceId: req.workspace!.workspaceId,
      title: title.trim(),
      description: description || '',
      category: category || 'General',
      currentValue: Number(currentValue) || 0,
      targetValue: Number(targetValue) || 100,
      unit: unit || '%',
      startDate: startDate || now,
      targetDate: targetDate || now,
      status: 'on_track',
      createdBy: req.user!.uid,
      createdAt: now,
      updatedAt: now,
    };

    await goalRepository.create(goal);

    res.status(201).json({
      success: true,
      data: goal,
    });
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/goals/:goalId/observations
 * Records a KPI time-series measurement with source classification
 */
router.post(
  '/:goalId/observations',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    const { value, period, sourceType, notes } = req.body;
    if (value === undefined || value === null) {
      res.status(400).json({
        success: false,
        error: { code: 'MISSING_VALUE', message: 'value is required' },
      });
      return;
    }

    const observationId = `obs_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const now = new Date().toISOString();

    const observation: KpiObservationEntity = {
      observationId,
      kpiId: req.params.goalId,
      workspaceId: req.workspace!.workspaceId,
      value: Number(value),
      period: period || now.slice(0, 10),
      sourceType: sourceType || 'USER_ENTERED',
      recordedAt: now,
      notes,
    };

    await kpiRepository.recordObservation(observation);

    // Update parent goal currentValue as well
    await goalRepository.update(req.workspace!.workspaceId, req.params.goalId, {
      currentValue: Number(value),
    });

    res.status(201).json({
      success: true,
      data: observation,
    });
  }
);

/**
 * GET /api/v1/workspaces/:workspaceId/goals/:goalId/observations
 */
router.get('/:goalId/observations', async (req: Request, res: Response): Promise<void> => {
  const observations = await kpiRepository.listObservations(
    req.workspace!.workspaceId,
    req.params.goalId
  );
  res.json({
    success: true,
    data: observations,
  });
});

/**
 * GET /api/v1/workspaces/:workspaceId/goals/:goalId
 */
router.get('/:goalId', async (req: Request, res: Response): Promise<void> => {
  const goal = await goalRepository.findById(req.workspace!.workspaceId, req.params.goalId);
  if (!goal) {
    res.status(404).json({
      success: false,
      error: {
        code: 'GOAL_NOT_FOUND',
        message: `Goal with ID '${req.params.goalId}' not found.`,
        category: 'NOT_FOUND',
        retryable: false,
      },
    });
    return;
  }

  res.json({
    success: true,
    data: goal,
  });
});

/**
 * PATCH /api/v1/workspaces/:workspaceId/goals/:goalId
 */
router.patch(
  '/:goalId',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    const updated = await goalRepository.update(
      req.workspace!.workspaceId,
      req.params.goalId,
      req.body
    );
    res.json({
      success: true,
      data: updated,
    });
  }
);

/**
 * DELETE /api/v1/workspaces/:workspaceId/goals/:goalId
 */
router.delete(
  '/:goalId',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    await goalRepository.delete(req.workspace!.workspaceId, req.params.goalId);
    res.json({
      success: true,
      data: { deleted: true, goalId: req.params.goalId },
    });
  }
);

export const goalRoutes = router;
