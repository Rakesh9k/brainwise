/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, type Request, type Response } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { onboardingService } from '../../services/onboardingService';
import type { StandardApiResponse } from '../../types/api';

const router = Router();

router.use(authenticateToken);

/**
 * GET /api/v1/onboarding/session
 * Retrieves the user's active onboarding session and saved progress
 */
router.get('/session', async (req: Request, res: Response): Promise<void> => {
  const session = await onboardingService.getOrCreateSession(req.user!.uid);
  const response: StandardApiResponse<typeof session> = {
    success: true,
    data: session,
  };
  res.json(response);
});

/**
 * POST /api/v1/onboarding/save-answer
 * Idempotently auto-saves an onboarding answer and advances current stage/step
 */
router.post('/save-answer', async (req: Request, res: Response): Promise<void> => {
  const { stage, step, answer, status } = req.body;
  if (!stage || !step) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_PARAMETERS',
        message: 'stage and step are required to save onboarding progress.',
        category: 'VALIDATION_ERROR',
        retryable: false,
      },
    });
    return;
  }

  const session = await onboardingService.saveAnswer(req.user!.uid, {
    stage,
    step,
    answer: answer || {},
    status,
  });

  res.json({
    success: true,
    data: session,
  });
});

/**
 * POST /api/v1/onboarding/provision-workspace
 * Ensures a workspace exists based on captured onboarding details
 */
router.post('/provision-workspace', async (req: Request, res: Response): Promise<void> => {
  const result = await onboardingService.ensureWorkspaceFromOnboarding(req.user!.uid);
  res.json({
    success: true,
    data: result,
  });
});

/**
 * POST /api/v1/onboarding/complete
 * Marks onboarding completed
 */
router.post('/complete', async (req: Request, res: Response): Promise<void> => {
  const session = await onboardingService.completeSession(req.user!.uid);
  res.json({
    success: true,
    data: session,
  });
});

export const onboardingRoutes = router;
