/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, type Request, type Response } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { requireWorkspaceMember, requireWorkspaceRole } from '../../middleware/workspace';
import { recommendationRepository } from '../../repositories/recommendationRepository';
import { actionableRecommendationEngine } from '../../services/actionableRecommendationEngine';
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

/**
 * GET /api/v1/workspaces/:workspaceId/recommendations/prioritized
 * Returns RICE/ICE-scored recommendations with sequenced playbooks and prohibited directives
 */
router.get('/prioritized', async (req: Request, res: Response): Promise<void> => {
  try {
    const report = await actionableRecommendationEngine.generatePrioritizedRecommendations(
      req.workspace!.workspaceId
    );
    res.json({ success: true, data: report });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/workspaces/:workspaceId/recommendations/:recommendationId/convert-to-tasks
 * Human approval handoff that creates active tasks from playbook steps
 */
router.post(
  '/:recommendationId/convert-to-tasks',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await actionableRecommendationEngine.approveAndConvertToTasks({
        workspaceId: req.workspace!.workspaceId,
        recommendationId: req.params.recommendationId,
        approvedBy: req.user!.displayName || req.user!.email || 'founder',
      });
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

export const recommendationRoutes = router;
