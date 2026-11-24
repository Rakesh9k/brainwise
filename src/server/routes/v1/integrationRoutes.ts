/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, type Request, type Response } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { requireWorkspaceMember, requireWorkspaceRole } from '../../middleware/workspace';
import { integrationManager } from '../../integrations/integrationManager';
import { dataIngestionService } from '../../integrations/dataIngestionService';
import { integrationAuditService } from '../../integrations/integrationAuditService';
import { automationEngine } from '../../automation/automationEngine';
import { AUTOMATION_TEMPLATES } from '../../automation/templates';

const router = Router({ mergeParams: true });

router.use(authenticateToken);
router.use(requireWorkspaceMember);

// =============================================================================
// Integration Registry & Connections
// =============================================================================

/**
 * GET /api/v1/workspaces/:workspaceId/integrations
 * Lists all available providers with active connection states.
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const integrations = await integrationManager.getAvailableIntegrations(
    req.workspace!.workspaceId
  );
  res.json({
    success: true,
    data: integrations,
  });
});

/**
 * GET /api/v1/workspaces/:workspaceId/integrations/audit-logs
 * Retrieves immutable audit records for the workspace.
 */
router.get('/audit-logs', async (req: Request, res: Response): Promise<void> => {
  const logs = await integrationAuditService.listEvents(req.workspace!.workspaceId);
  res.json({
    success: true,
    data: logs,
  });
});

/**
 * GET /api/v1/workspaces/:workspaceId/integrations/data-records
 * Retrieves normalized ingested telemetry across all or specific providers.
 */
router.get('/data-records', async (req: Request, res: Response): Promise<void> => {
  const category = req.query.category as string | undefined;
  const integrationId = req.query.integrationId as string | undefined;
  const records = await dataIngestionService.getWorkspaceRecords(req.workspace!.workspaceId, {
    category,
    integrationId,
    limit: 50,
  });

  res.json({
    success: true,
    data: records,
  });
});

/**
 * POST /api/v1/workspaces/:workspaceId/integrations/initiate
 * Starts connection lifecycle (generates OAuth URL or returns instructions).
 */
router.post(
  '/initiate',
  requireWorkspaceRole(['owner', 'admin']),
  async (req: Request, res: Response): Promise<void> => {
    const { providerId, redirectUri } = req.body;
    if (!providerId) {
      res.status(400).json({
        success: false,
        error: { code: 'MISSING_PROVIDER_ID', message: 'providerId is required' },
      });
      return;
    }

    try {
      const result = await integrationManager.startConnection(
        req.workspace!.workspaceId,
        providerId,
        redirectUri || 'http://localhost:3000/api/v1/integrations/oauth/callback',
        req.user?.uid
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: { code: 'INITIATE_FAILED', message: err.message },
      });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/integrations/oauth/callback
 * Exchanges authorization code and saves encrypted credentials.
 */
router.post(
  '/oauth/callback',
  requireWorkspaceRole(['owner', 'admin']),
  async (req: Request, res: Response): Promise<void> => {
    const { providerId, code, state, redirectUri } = req.body;
    if (!providerId || !code || !state) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_OAUTH_PARAMS',
          message: 'providerId, code, and state are required',
        },
      });
      return;
    }

    try {
      const connection = await integrationManager.completeOAuthConnection({
        workspaceId: req.workspace!.workspaceId,
        providerId,
        code,
        state,
        redirectUri: redirectUri || 'http://localhost:3000/api/v1/integrations/oauth/callback',
        actorId: req.user?.uid,
      });

      res.json({
        success: true,
        data: connection,
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: { code: 'OAUTH_EXCHANGE_FAILED', message: err.message },
      });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/integrations/connect-managed
 * Connects API key or managed integration provider.
 */
router.post(
  '/connect-managed',
  requireWorkspaceRole(['owner', 'admin']),
  async (req: Request, res: Response): Promise<void> => {
    const { providerId, apiKey, extra } = req.body;
    if (!providerId) {
      res.status(400).json({
        success: false,
        error: { code: 'MISSING_PROVIDER_ID', message: 'providerId is required' },
      });
      return;
    }

    try {
      const connection = await integrationManager.connectApiKeyProvider({
        workspaceId: req.workspace!.workspaceId,
        providerId,
        apiKey,
        extra,
        actorId: req.user?.uid,
      });

      res.json({
        success: true,
        data: connection,
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: { code: 'CONNECT_FAILED', message: err.message },
      });
    }
  }
);

/**
 * GET /api/v1/workspaces/:workspaceId/integrations/:integrationId
 */
router.get('/:integrationId', async (req: Request, res: Response): Promise<void> => {
  const connection = await integrationManager.getConnection(
    req.workspace!.workspaceId,
    req.params.integrationId
  );
  if (!connection) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Integration not found' },
    });
    return;
  }
  res.json({
    success: true,
    data: connection,
  });
});

/**
 * POST /api/v1/workspaces/:workspaceId/integrations/:integrationId/sync
 */
router.post(
  '/:integrationId/sync',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await integrationManager.syncIntegration(
        req.workspace!.workspaceId,
        req.params.integrationId,
        req.user?.uid
      );
      res.json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: { code: 'SYNC_FAILED', message: err.message },
      });
    }
  }
);

/**
 * GET /api/v1/workspaces/:workspaceId/integrations/:integrationId/health
 */
router.get('/:integrationId/health', async (req: Request, res: Response): Promise<void> => {
  const health = await integrationManager.checkHealth(
    req.workspace!.workspaceId,
    req.params.integrationId
  );
  res.json({
    success: true,
    data: health,
  });
});

/**
 * DELETE /api/v1/workspaces/:workspaceId/integrations/:integrationId
 */
router.delete(
  '/:integrationId',
  requireWorkspaceRole(['owner', 'admin']),
  async (req: Request, res: Response): Promise<void> => {
    await integrationManager.disconnectIntegration(
      req.workspace!.workspaceId,
      req.params.integrationId,
      req.user?.uid
    );

    res.json({
      success: true,
      data: { disconnected: true, integrationId: req.params.integrationId },
    });
  }
);

// =============================================================================
// Automation Engine Endpoints
// =============================================================================

/**
 * GET /api/v1/workspaces/:workspaceId/integrations/automations/templates
 */
router.get('/automations/templates', async (_req: Request, res: Response): Promise<void> => {
  res.json({
    success: true,
    data: AUTOMATION_TEMPLATES,
  });
});

/**
 * GET /api/v1/workspaces/:workspaceId/integrations/automations
 */
router.get('/automations/list', async (req: Request, res: Response): Promise<void> => {
  const automations = await automationEngine.listAutomations(req.workspace!.workspaceId);
  res.json({
    success: true,
    data: automations,
  });
});

/**
 * POST /api/v1/workspaces/:workspaceId/integrations/automations
 */
router.post(
  '/automations/create',
  requireWorkspaceRole(['owner', 'admin']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const created = await automationEngine.createAutomation(req.workspace!.workspaceId, req.body);
      res.status(201).json({
        success: true,
        data: created,
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: { code: 'AUTOMATION_CREATE_FAILED', message: err.message },
      });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/integrations/automations/from-template
 */
router.post(
  '/automations/from-template',
  requireWorkspaceRole(['owner', 'admin']),
  async (req: Request, res: Response): Promise<void> => {
    const { templateId } = req.body;
    if (!templateId) {
      res.status(400).json({
        success: false,
        error: { code: 'MISSING_TEMPLATE_ID', message: 'templateId is required' },
      });
      return;
    }

    try {
      const created = await automationEngine.createFromTemplate(
        req.workspace!.workspaceId,
        templateId
      );
      res.status(201).json({
        success: true,
        data: created,
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: { code: 'TEMPLATE_INSTANTIATION_FAILED', message: err.message },
      });
    }
  }
);

/**
 * PATCH /api/v1/workspaces/:workspaceId/integrations/automations/:automationId
 */
router.patch(
  '/automations/:automationId',
  requireWorkspaceRole(['owner', 'admin']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const updated = await automationEngine.updateAutomation(
        req.workspace!.workspaceId,
        req.params.automationId,
        req.body
      );
      res.json({
        success: true,
        data: updated,
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: { code: 'UPDATE_FAILED', message: err.message },
      });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/integrations/automations/:automationId/trigger
 */
router.post(
  '/automations/:automationId/trigger',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const execution = await automationEngine.triggerExecution(
        req.workspace!.workspaceId,
        req.params.automationId,
        'MANUAL_TRIGGER',
        req.user?.uid
      );
      res.json({
        success: true,
        data: execution,
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: { code: 'TRIGGER_FAILED', message: err.message },
      });
    }
  }
);

/**
 * GET /api/v1/workspaces/:workspaceId/integrations/automations/:automationId/executions
 */
router.get(
  '/automations/:automationId/executions',
  async (req: Request, res: Response): Promise<void> => {
    const list = await automationEngine.listExecutions(
      req.workspace!.workspaceId,
      req.params.automationId
    );
    res.json({
      success: true,
      data: list,
    });
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/integrations/automations/:automationId/executions/:executionId/approve
 */
router.post(
  '/automations/:automationId/executions/:executionId/approve',
  requireWorkspaceRole(['owner', 'admin']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const approved = await automationEngine.approveExecution(
        req.workspace!.workspaceId,
        req.params.automationId,
        req.params.executionId,
        req.user?.uid || 'owner'
      );
      res.json({
        success: true,
        data: approved,
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: { code: 'APPROVAL_FAILED', message: err.message },
      });
    }
  }
);

export const integrationRoutes = router;
