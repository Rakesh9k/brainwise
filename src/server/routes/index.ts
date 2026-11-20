/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from 'express';
import { authRoutes } from './v1/authRoutes';
import { workspaceRoutes } from './v1/workspaceRoutes';
import { businessProfileRoutes } from './v1/businessProfileRoutes';
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
import { jobRoutes } from './v1/jobRoutes';
import { aiRoutes } from './v1/aiRoutes';
import { onboardingRoutes } from './v1/onboardingRoutes';
import { marketWatchRoutes } from './v1/marketWatchRoutes';
import { executiveReportRoutes } from './v1/executiveReportRoutes';
import { serverConfig } from '../config/index';

export function createApiRouter(): Router {
  const router = Router();

  // Root Health Check
  router.get('/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'brainwise-backend',
      version: '1.0.0',
      nodeEnv: serverConfig.nodeEnv,
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
  v1.use('/workspaces', workspaceRoutes);
  v1.use('/workspaces/:workspaceId/business-profile', businessProfileRoutes);
  v1.use('/workspaces/:workspaceId/business-brain', businessProfileRoutes);
  v1.use('/workspaces/:workspaceId/goals', goalRoutes);
  v1.use('/workspaces/:workspaceId/competitors', competitorRoutes);
  v1.use('/workspaces/:workspaceId/research', researchRoutes);
  v1.use('/workspaces/:workspaceId/market-watch', marketWatchRoutes);
  v1.use('/workspaces/:workspaceId/reports', executiveReportRoutes);
  v1.use('/workspaces/:workspaceId/recommendations', recommendationRoutes);
  v1.use('/workspaces/:workspaceId/experiments', experimentRoutes);
  v1.use('/workspaces/:workspaceId/tasks', taskRoutes);
  v1.use('/workspaces/:workspaceId/assets', assetRoutes);
  v1.use('/workspaces/:workspaceId/integrations', integrationRoutes);
  v1.use('/workspaces/:workspaceId/billing', billingRoutes);
  v1.use('/workspaces/:workspaceId', billingRoutes);
  v1.use('/billing/webhook', billingWebhookRouter);
  v1.use('/billing', billingRoutes);
  v1.use('/admin/billing', adminBillingRouter);
  v1.use('/workspaces/:workspaceId/jobs', jobRoutes);
  v1.use('/workspaces/:workspaceId/ai', aiRoutes);
  v1.use('/ai', aiRoutes);

  // Mount V1
  router.use('/v1', v1);

  // Backward compatibility aliases for existing AI routes
  router.use('/ai', aiRoutes);

  return router;
}
