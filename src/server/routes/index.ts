/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { authRoutes } from './v1/authRoutes';
import { workspaceRoutes } from './v1/workspaceRoutes';
import { businessProfileRoutes } from './v1/businessProfileRoutes';
import { productRoutes } from './v1/productRoutes';
import { goalRoutes } from './v1/goalRoutes';
import { competitorRoutes } from './v1/competitorRoutes';
import { researchRoutes } from './v1/researchRoutes';
import { recommendationRoutes } from './v1/recommendationRoutes';
import { experimentRoutes } from './v1/experimentRoutes';
import { taskRoutes } from './v1/taskRoutes';
import { assetRoutes } from './v1/assetRoutes';
import { integrationRoutes } from './v1/integrationRoutes';
import { billingRoutes, adminBillingRouter } from './v1/billingRoutes';
import { billingWebhookRouter } from './v1/billingWebhookRoutes';
import { supportRoutes } from './v1/supportRoutes';
import { jobRoutes } from './v1/jobRoutes';
import { aiRoutes } from './v1/aiRoutes';
import { onboardingRoutes } from './v1/onboardingRoutes';
import { marketWatchRoutes } from './v1/marketWatchRoutes';
import { executiveReportRoutes } from './v1/executiveReportRoutes';
import { businessReasoningRoutes } from './v1/businessReasoningRoutes';
import { departmentRoutes } from './v1/departmentRoutes';
import { learningRoutes } from './v1/learningRoutes';
import { orchestrationRoutes } from './v1/orchestrationRoutes';
import { growthRadarRoutes } from './v1/growthRadarRoutes';
import { growthAgencyRoutes } from './v1/growthAgencyRoutes';
import { askYourBusinessRoutes } from './v1/askYourBusinessRoutes';
import { evidenceRoutes } from './v1/evidenceRoutes';
import { analyticsRoutes } from './v1/analyticsRoutes';
import { serverConfig } from '../config/index';
import { db } from '../db/firestore';

export function createApiRouter(): Router {
  const router = Router();

  // Root Health Check with Database Status
  router.get('/health', async (_req, res) => {
    let dbStatus = 'healthy';
    try {
      // Light connectivity verification
      await db.doc('system_metadata/runtime_info').get();
    } catch {
      dbStatus = 'degraded';
    }

    res.json({
      ok: dbStatus === 'healthy',
      service: 'brainwise-backend',
      version: '1.0.0',
      nodeEnv: serverConfig.nodeEnv,
      database: {
        provider: db.providerName,
        persistent: db.isPersistent,
        status: dbStatus,
      },
      aiConfigured: Boolean(serverConfig.geminiApiKey),
      model: serverConfig.geminiModel,
      timestamp: new Date().toISOString(),
    });
  });

  // V1 API Sub-routers
  const v1 = Router();

  v1.use('/auth', authRoutes);
  v1.use('/users', authRoutes);
  v1.use('/onboarding', onboardingRoutes);

  // Top-level public idea understanding route (zero mutations/credits)
  v1.post('/research/understand-idea', async (req: Request, res: Response): Promise<void> => {
    try {
      const { ideaPrompt } = req.body;
      if (!ideaPrompt || !ideaPrompt.trim()) {
        res.status(400).json({
          success: false,
          error: { code: 'MISSING_PROMPT', message: 'ideaPrompt is required.' },
        });
        return;
      }
      const { ideaIntelligenceService } = await import('../services/ideaIntelligenceService');
      const understanding = await ideaIntelligenceService.understandIdea(ideaPrompt);
      res.json({
        success: true,
        data: understanding,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'IDEA_UNDERSTANDING_FAILED', message: err.message },
      });
    }
  });

  // Specific workspace sub-resources MUST be mounted BEFORE generic /workspaces router
  v1.use('/workspaces/:workspaceId/research', researchRoutes);
  v1.use('/workspaces/:workspaceId/business-profile', businessProfileRoutes);
  v1.use('/workspaces/:workspaceId/business-brain', businessProfileRoutes);
  v1.use('/workspaces/:workspaceId/products', productRoutes);
  v1.use('/workspaces/:workspaceId/documents', businessProfileRoutes);
  v1.use('/workspaces/:workspaceId/reasoning', businessReasoningRoutes);
  v1.use('/workspaces/:workspaceId/business-profile/reasoning', businessReasoningRoutes);
  v1.use('/workspaces/:workspaceId/departments', departmentRoutes);
  v1.use('/workspaces/:workspaceId/learning', learningRoutes);
  v1.use('/workspaces/:workspaceId/orchestration', orchestrationRoutes);
  v1.use('/workspaces/:workspaceId/growth-radar', growthRadarRoutes);
  v1.use('/workspaces/:workspaceId/growth-agency', growthAgencyRoutes);
  v1.use('/workspaces/:workspaceId/ask-business', askYourBusinessRoutes);
  v1.use('/workspaces/:workspaceId/evidence', evidenceRoutes);
  v1.use('/workspaces/:workspaceId/goals', goalRoutes);
  v1.use('/workspaces/:workspaceId/competitors', competitorRoutes);
  v1.use('/workspaces/:workspaceId/market-watch', marketWatchRoutes);
  v1.use('/workspaces/:workspaceId/reports', executiveReportRoutes);
  v1.use('/workspaces/:workspaceId/analytics', analyticsRoutes);
  v1.use('/workspaces/:workspaceId/recommendations', recommendationRoutes);
  v1.use('/workspaces/:workspaceId/experiments', experimentRoutes);
  v1.use('/workspaces/:workspaceId/tasks', taskRoutes);
  v1.use('/workspaces/:workspaceId/assets', assetRoutes);
  v1.use('/workspaces/:workspaceId/integrations', integrationRoutes);
  v1.use('/workspaces/:workspaceId/billing', billingRoutes);
  v1.use('/workspaces/:workspaceId/credits', (req: Request, res: Response, next: NextFunction) => {
    req.url = req.url === '/' || req.url === '' ? '/credits' : (req.url.startsWith('/transactions') ? '/ledger' : req.url);
    billingRoutes(req, res, next);
  });
  v1.use('/billing/webhook', billingWebhookRouter);
  v1.use('/billing/webhooks', billingWebhookRouter);
  v1.use('/admin/billing', adminBillingRouter);
  v1.use('/workspaces/:workspaceId/support', supportRoutes);
  v1.use('/workspaces/:workspaceId/jobs', jobRoutes);
  v1.use('/workspaces', workspaceRoutes);
  v1.use('/workspaces/:workspaceId/ai', aiRoutes);
  v1.use('/ai', aiRoutes);

  // Mount V1
  router.use('/v1', v1);

  // Backward compatibility aliases for existing AI routes
  router.use('/ai', aiRoutes);

  return router;
}
