/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, type Request, type Response } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { requireWorkspaceMember } from '../../middleware/workspace';
import { askYourBusinessService } from '../../services/askYourBusinessService';

export const askYourBusinessRoutes = Router({ mergeParams: true });

askYourBusinessRoutes.use(authenticateToken);
askYourBusinessRoutes.use(requireWorkspaceMember);

function getVerifiedWorkspaceId(req: Request, res: Response): string | null {
  const paramWsId = req.params.workspaceId;
  const tokenWsId = req.workspace?.workspaceId;

  if (paramWsId && tokenWsId && paramWsId !== tokenWsId) {
    res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN_CROSS_WORKSPACE_ACCESS',
        message: 'Unauthorized access to another workspace business intelligence.',
      },
    });
    return null;
  }

  return tokenWsId || paramWsId;
}

/**
 * POST /api/v1/workspaces/:workspaceId/ask-business/query
 */
askYourBusinessRoutes.post('/query', async (req: Request, res: Response): Promise<void> => {
  const workspaceId = getVerifiedWorkspaceId(req, res);
  if (!workspaceId) return;

  const userId = req.user!.uid;
  const { query, conversationId, modelTier } = req.body;

  if (!query || typeof query !== 'string' || !query.trim()) {
    res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_QUERY',
        message: 'Query is required and must be a non-empty string.',
      },
    });
    return;
  }

  try {
    const result = await askYourBusinessService.askQuestion(workspaceId, userId, {
      query,
      conversationId,
      modelTier,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    const status =
      err.statusCode ||
      (err.code === 'INSUFFICIENT_CREDITS'
        ? 402
        : err.code === 'TRUTH_GUARDRAIL_VIOLATION'
          ? 422
          : 500);
    res.status(status).json({
      success: false,
      error: {
        code: err.code || 'INTERNAL_ERROR',
        message: err.message || 'Failed to process Ask Your Business query',
      },
    });
  }
});

/**
 * GET /api/v1/workspaces/:workspaceId/ask-business/conversations
 */
askYourBusinessRoutes.get('/conversations', async (req: Request, res: Response): Promise<void> => {
  const workspaceId = getVerifiedWorkspaceId(req, res);
  if (!workspaceId) return;

  try {
    const conversations = await askYourBusinessService.listConversations(workspaceId);
    res.json({
      success: true,
      data: conversations,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: err.message || 'Failed to list conversations',
      },
    });
  }
});

/**
 * GET /api/v1/workspaces/:workspaceId/ask-business/conversations/:conversationId
 */
askYourBusinessRoutes.get(
  '/conversations/:conversationId',
  async (req: Request, res: Response): Promise<void> => {
    const workspaceId = getVerifiedWorkspaceId(req, res);
    if (!workspaceId) return;

    const conversationId = req.params.conversationId as string;

    try {
      const history = await askYourBusinessService.getConversationHistory(
        workspaceId,
        conversationId
      );
      res.json({
        success: true,
        data: history,
      });
    } catch (err: any) {
      const status = err.message.includes('not found') ? 404 : 500;
      res.status(status).json({
        success: false,
        error: {
          code: status === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR',
          message: err.message || 'Failed to retrieve conversation history',
        },
      });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/ask-business/conversations/:conversationId/execute-tool
 */
askYourBusinessRoutes.post(
  '/conversations/:conversationId/execute-tool',
  async (req: Request, res: Response): Promise<void> => {
    const workspaceId = getVerifiedWorkspaceId(req, res);
    if (!workspaceId) return;

    const userId = req.user!.uid;
    const { toolId, toolName, parameters, confirmed } = req.body;

    if (!toolName || confirmed === undefined) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'toolName and confirmed are required.',
        },
      });
      return;
    }

    try {
      const result = await askYourBusinessService.executeToolAction(workspaceId, userId, {
        toolId: toolId || `tool-${Date.now()}`,
        toolName,
        parameters: parameters || {},
        confirmed: Boolean(confirmed),
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: {
          code: 'TOOL_EXECUTION_ERROR',
          message: err.message || 'Failed to execute tool action',
        },
      });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/ask-business/conversations/:conversationId/messages/:messageId/feedback
 */
askYourBusinessRoutes.post(
  '/conversations/:conversationId/messages/:messageId/feedback',
  async (req: Request, res: Response): Promise<void> => {
    const workspaceId = getVerifiedWorkspaceId(req, res);
    if (!workspaceId) return;

    const conversationId = req.params.conversationId as string;
    const messageId = req.params.messageId as string;
    const { rating, note } = req.body;

    if (!rating || (rating !== 'positive' && rating !== 'negative')) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_RATING',
          message: 'rating must be either "positive" or "negative"',
        },
      });
      return;
    }

    try {
      const updated = await askYourBusinessService.submitFeedback(
        workspaceId,
        conversationId,
        messageId,
        {
          rating,
          note,
        }
      );

      res.json({
        success: true,
        data: updated,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: err.message || 'Failed to submit feedback',
        },
      });
    }
  }
);
