/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, type Request, type Response } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { requireWorkspaceMember, requireWorkspaceRole } from '../../middleware/workspace';
import { recommendationRepository } from '../../repositories/recommendationRepository';
import type { RecommendationEntity } from '../../types/api';

const router = Router({ mergeParams: true });

router.use(authenticateToken);
router.use(requireWorkspaceMember);

/**
 * GET /api/v1/workspaces/:workspaceId/recommendations
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const recommendations = await recommendationRepository.listByWorkspace(
    req.workspace!.workspaceId
  );
  res.json({
    success: true,
    data: recommendations,
  });
});

/**
 * POST /api/v1/workspaces/:workspaceId/recommendations
 */
router.post(
  '/',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    const { title, description, department, impact, confidence, reasoning, relatedGoalId } =
      req.body;
    if (!title || !description) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'title and description are required',
          category: 'VALIDATION_ERROR',
          retryable: false,
        },
      });
      return;
    }

    const recommendationId =
      req.body.recommendationId ||
      `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const rec: RecommendationEntity = {
      recommendationId,
      workspaceId: req.workspace!.workspaceId,
      title: title.trim(),
      description: description.trim(),
      department: department || 'General',
      impact: impact || 'Medium',
      confidence: Number(confidence) || 85,
      status: 'pending',
      reasoning: reasoning || '',
      relatedGoalId,
      createdAt: now,
      updatedAt: now,
    };

    await recommendationRepository.create(rec);

    res.status(201).json({
      success: true,
      data: rec,
    });
  }
);

/**
 * PATCH /api/v1/workspaces/:workspaceId/recommendations/:recommendationId
 */
router.patch(
  '/:recommendationId',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    const { status } = req.body;
    if (status !== 'accepted' && status !== 'rejected') {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: "status must be either 'accepted' or 'rejected'",
          category: 'VALIDATION_ERROR',
          retryable: false,
        },
      });
      return;
    }

    const updated = await recommendationRepository.updateStatus(
      req.workspace!.workspaceId,
      req.params.recommendationId,
      status
    );

    res.json({
      success: true,
      data: updated,
    });
  }
);

export const recommendationRoutes = router;
