/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, type Request, type Response } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { requireWorkspaceMember, requireWorkspaceRole } from '../../middleware/workspace';
import { backgroundJobService } from '../../services/backgroundJobService';

const router = Router({ mergeParams: true });

router.use(authenticateToken);
router.use(requireWorkspaceMember);

/**
 * POST /api/v1/workspaces/:workspaceId/jobs
 * Creates and enqueues an asynchronous AI background job
 */
router.post(
  '/',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    const { jobType, inputPayload } = req.body;
    if (!jobType) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_JOB_TYPE',
          message: 'jobType is required',
          category: 'VALIDATION_ERROR',
          retryable: false,
        },
      });
      return;
    }

    const job = await backgroundJobService.createJob({
      workspaceId: req.workspace!.workspaceId,
      userId: req.user!.uid,
      jobType,
      inputPayload: inputPayload || {},
    });

    res.status(202).json({
      success: true,
      data: job,
    });
  }
);

/**
 * GET /api/v1/workspaces/:workspaceId/jobs
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const jobs = await backgroundJobService.listJobs(req.workspace!.workspaceId);
  res.json({
    success: true,
    data: jobs,
  });
});

/**
 * GET /api/v1/workspaces/:workspaceId/jobs/:jobId
 */
router.get('/:jobId', async (req: Request, res: Response): Promise<void> => {
  const job = await backgroundJobService.getJob(req.workspace!.workspaceId, req.params.jobId);
  if (!job) {
    res.status(404).json({
      success: false,
      error: {
        code: 'JOB_NOT_FOUND',
        message: `Job '${req.params.jobId}' not found.`,
        category: 'NOT_FOUND',
        retryable: false,
      },
    });
    return;
  }

  res.json({
    success: true,
    data: job,
  });
});

/**
 * POST /api/v1/workspaces/:workspaceId/jobs/:jobId/cancel
 */
router.post(
  '/:jobId/cancel',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const cancelled = await backgroundJobService.cancelJob(
        req.workspace!.workspaceId,
        req.params.jobId
      );
      res.json({
        success: true,
        data: cancelled,
      });
    } catch (err) {
      res.status(400).json({
        success: false,
        error: {
          code: 'CANNOT_CANCEL_JOB',
          message: err instanceof Error ? err.message : 'Failed to cancel job',
          category: 'INTERNAL_ERROR',
          retryable: false,
        },
      });
    }
  }
);

export const jobRoutes = router;
