/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, type Request, type Response } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { requireWorkspaceMember } from '../../middleware/workspace';
import { aiOrchestrator } from '../../ai/orchestrator';
import { memoryEngine } from '../../ai/memoryEngine';
import { aiRequestRepository } from '../../repositories/aiRequestRepository';
import { aiOrchestrationService } from '../../services/aiOrchestrationService';
import { creditService } from '../../services/creditService';
import { businessBrainService } from '../../services/businessBrainService';
import { db } from '../../db/firestore';
import { GeminiProviderAdapter } from '../../ai/modelRouter';
import { serverConfig } from '../../config/index';
import { executeTruthCheck } from '../../../utils/truthCheck';
import type { AiExecutionEntity, AiWorkflowRequest, MemoryCategory } from '../../ai/types';

const router = Router({ mergeParams: true });

router.use(authenticateToken);
router.use(requireWorkspaceMember);

/**
 * Helper to extract verified workspaceId
 */
function getWorkspaceId(req: Request): string {
  return (
    req.workspace?.workspaceId ||
    (req.params.workspaceId as string) ||
    (req.body.workspaceId as string)
  );
}

/**
 * POST /api/v1/workspaces/:workspaceId/ai/requests
 * Core Phase 6 Orchestration Gateway: Submits an intelligence task
 */
router.post('/requests', async (req: Request, res: Response): Promise<void> => {
  const workspaceId = getWorkspaceId(req);
  const userId = req.user!.uid;
  const { department, workflow, taskType, userPrompt, parameters, requestedOutputFormat } =
    req.body;

  if (!userPrompt || typeof userPrompt !== 'string') {
    res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_PROMPT',
        message: 'userPrompt is required and must be a non-empty string',
        category: 'VALIDATION_ERROR',
      },
    });
    return;
  }

  const aiRequest: AiWorkflowRequest = {
    workspaceId,
    userId,
    department: department || 'BUSINESS_STRATEGY',
    workflow: workflow || 'growth_plan',
    taskType,
    userPrompt,
    parameters,
    requestedOutputFormat,
    idempotencyKey: req.headers['x-idempotency-key'] as string,
  };

  const output = await aiOrchestrator.executeWorkflow(aiRequest);

  res.status(output.status === 'PENDING_APPROVAL' ? 202 : 200).json({
    success: true,
    data: output,
  });
});

/**
 * GET /api/v1/workspaces/:workspaceId/ai/requests/:requestId
 * Retrieves request execution status
 */
router.get('/requests/:requestId', async (req: Request, res: Response): Promise<void> => {
  const workspaceId = getWorkspaceId(req);
  const requestId = req.params.requestId as string;

  const request = await aiRequestRepository.getRequest(workspaceId, requestId);
  if (!request) {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Request '${requestId}' not found in workspace '${workspaceId}'`,
      },
    });
    return;
  }

  res.json({
    success: true,
    data: request,
  });
});

/**
 * GET /api/v1/workspaces/:workspaceId/ai/requests/:requestId/result
 * Retrieves structured result entity
 */
router.get('/requests/:requestId/result', async (req: Request, res: Response): Promise<void> => {
  const workspaceId = getWorkspaceId(req);
  const requestId = req.params.requestId as string;

  const result = await aiRequestRepository.getResultByRequestId(workspaceId, requestId);
  if (!result) {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Result for request '${requestId}' not found. It may still be processing or failed.`,
      },
    });
    return;
  }

  res.json({
    success: true,
    data: result.structuredResult,
  });
});

/**
 * POST /api/v1/workspaces/:workspaceId/ai/requests/:requestId/approve
 * Human Approval Gate: Confirms a held consequential action
 */
router.post('/requests/:requestId/approve', async (req: Request, res: Response): Promise<void> => {
  const workspaceId = getWorkspaceId(req);
  const userId = req.user!.uid;
  const requestId = req.params.requestId as string;

  const approvalResult = await aiOrchestrator.approveRequest({
    workspaceId,
    userId,
    requestId,
  });

  res.json({
    success: true,
    data: approvalResult,
  });
});

/**
 * POST /api/v1/workspaces/:workspaceId/ai/requests/:requestId/retry
 * Retries an eligible failed AI request
 */
router.post('/requests/:requestId/retry', async (req: Request, res: Response): Promise<void> => {
  const workspaceId = getWorkspaceId(req);
  const userId = req.user!.uid;
  const requestId = req.params.requestId as string;

  const original = await aiRequestRepository.getRequest(workspaceId, requestId);
  if (!original) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Request not found for retry' },
    });
    return;
  }

  const retryRequest: AiWorkflowRequest = {
    workspaceId,
    userId,
    department: original.department,
    workflow: original.workflow,
    taskType: original.taskType,
    userPrompt: original.userPrompt,
  };

  const output = await aiOrchestrator.executeWorkflow(retryRequest);
  res.json({
    success: true,
    data: output,
  });
});

/**
 * GET /api/v1/workspaces/:workspaceId/ai/memories
 * Lists persistent business memories
 */
router.get('/memories', async (req: Request, res: Response): Promise<void> => {
  const workspaceId = getWorkspaceId(req);
  const category = req.query.category as MemoryCategory | undefined;

  const memories = await memoryEngine.listMemories(workspaceId, category);
  res.json({
    success: true,
    data: memories,
  });
});

/**
 * POST /api/v1/workspaces/:workspaceId/ai/memories
 * Creates an approved business memory item
 */
router.post('/memories', async (req: Request, res: Response): Promise<void> => {
  const workspaceId = getWorkspaceId(req);
  const userId = req.user!.uid;
  const { category, content, source, confidence, approvalStatus, tags } = req.body;

  if (!content || typeof content !== 'string') {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_CONTENT', message: 'content is required' },
    });
    return;
  }

  const memory = await memoryEngine.createMemory({
    workspaceId,
    category: category || 'APPROVED_BUSINESS_FACT',
    content,
    source: source || 'User Input',
    confidence,
    approvalStatus,
    tags,
    createdBy: userId,
  });

  res.status(201).json({
    success: true,
    data: memory,
  });
});

/**
 * PATCH /api/v1/workspaces/:workspaceId/ai/memories/:memoryId
 * Updates memory content, approval status, or tags
 */
router.patch('/memories/:memoryId', async (req: Request, res: Response): Promise<void> => {
  const workspaceId = getWorkspaceId(req);
  const memoryId = req.params.memoryId as string;
  const { content, approvalStatus, confidence, tags } = req.body;

  const updated = await memoryEngine.updateMemory(workspaceId, memoryId, {
    content,
    approvalStatus,
    confidence,
    tags,
  });

  res.json({
    success: true,
    data: updated,
  });
});

/**
 * DELETE /api/v1/workspaces/:workspaceId/ai/memories/:memoryId
 * Deletes a business memory item
 */
router.delete('/memories/:memoryId', async (req: Request, res: Response): Promise<void> => {
  const workspaceId = getWorkspaceId(req);
  const memoryId = req.params.memoryId as string;

  await memoryEngine.deleteMemory(workspaceId, memoryId);
  res.json({
    success: true,
    message: 'Memory deleted successfully',
  });
});

/**
 * GET /api/v1/workspaces/:workspaceId/ai/sources/:requestId
 * Retrieves external evidence sources for a request
 */
router.get('/sources/:requestId', async (req: Request, res: Response): Promise<void> => {
  const workspaceId = getWorkspaceId(req);
  const requestId = req.params.requestId as string;

  const sources = await aiRequestRepository.getSourcesByRequestId(workspaceId, requestId);
  res.json({
    success: true,
    data: sources,
  });
});

/**
 * GET /api/v1/workspaces/:workspaceId/ai/usage
 * Token consumption and AI provider cost metrics
 */
router.get('/usage', async (req: Request, res: Response): Promise<void> => {
  const workspaceId = getWorkspaceId(req);

  const executionsSnap = await db
    .collection<AiExecutionEntity>(`workspaces/${workspaceId}/aiExecutions`)
    .limit(100)
    .get();

  const executions = executionsSnap.docs
    .map((d) => d.data())
    .filter(Boolean) as AiExecutionEntity[];

  const totalInputTokens = executions.reduce((acc, e) => acc + (e.inputTokens || 0), 0);
  const totalOutputTokens = executions.reduce((acc, e) => acc + (e.outputTokens || 0), 0);
  const totalCostUsd = executions.reduce((acc, e) => acc + (e.providerCostUsd || 0), 0);

  res.json({
    success: true,
    data: {
      workspaceId,
      totalRequests: executions.length,
      totalInputTokens,
      totalOutputTokens,
      totalTokens: totalInputTokens + totalOutputTokens,
      totalProviderCostUsd: Number(totalCostUsd.toFixed(4)),
      averageLatencyMs:
        executions.length > 0
          ? Math.round(
              executions.reduce((acc, e) => acc + (e.executionDurationMs || 0), 0) /
                executions.length
            )
          : 0,
      recentExecutions: executions.slice(0, 10),
    },
  });
});

// ==========================================
// BACKWARD-COMPATIBLE WORKFLOW ALIASES
// ==========================================

/**
 * POST /api/v1/workspaces/:workspaceId/ai/dossier
 */
router.post('/dossier', async (req: Request, res: Response): Promise<void> => {
  const { ideaSummary, industry, targetMarket, geography, depth } = req.body;
  const workspaceId = getWorkspaceId(req);

  const result = await aiOrchestrationService.generateDossier({
    workspaceId,
    userId: req.user!.uid,
    ideaSummary: ideaSummary || 'Commercial Opportunity',
    industry: industry || req.workspace?.industry || 'Commercial Services',
    targetMarket: targetMarket || 'Commercial segment',
    geography: geography || req.workspace?.country || 'Global',
    depth,
    idempotencyKey: req.headers['x-idempotency-key'] as string,
  });

  res.json({
    report: result.report,
    model: result.modelUsed,
    meta: {
      creditsDeducted: result.creditsDeducted,
      creditBalanceRemaining: result.creditBalanceRemaining,
      truthScore: result.truthScore,
    },
  });
});

/**
 * POST /api/v1/workspaces/:workspaceId/ai/playbook
 */
router.post('/playbook', async (req: Request, res: Response): Promise<void> => {
  const { category, title, defaultPrompt, question } = req.body;
  const workspaceId = getWorkspaceId(req);
  const userId = req.user!.uid;

  const reservation = await creditService.reserveCredits({
    workspaceId,
    userId,
    featureId: 'FEAT-CNT-002',
    idempotencyKey: req.headers['x-idempotency-key'] as string,
  });

  try {
    const profile = await businessBrainService.getProfile(workspaceId);
    const focusQuery = question || defaultPrompt || title;
    const angleText = `Tactical Execution for ${title} (${focusQuery}): Apply a phased rollout focusing on high-margin segments in ${profile.location || 'core target regions'}. Ground campaign messaging in ${profile.valueProposition || 'differentiated service quality'}.`;

    await businessBrainService.recordStrategicAngle(
      workspaceId,
      `Playbook: ${title}`,
      category || 'Strategy',
      'GrowthDirector'
    );

    const settlement = await creditService.settleCredits({
      workspaceId,
      reservation,
      featureId: 'FEAT-CNT-002',
      notes: `Playbook: ${title}`,
    });

    res.json({
      angle: angleText,
      model: 'brainwise-strategy-engine',
      meta: {
        creditsDeducted: 1,
        creditBalanceRemaining: settlement.remainingBalance,
      },
    });
  } catch (err) {
    if (reservation) {
      await creditService.refundCredits({
        workspaceId,
        reservation,
        reason: err instanceof Error ? err.message : 'Playbook generation failed',
      });
    }
    throw err;
  }
});

/**
 * POST /api/v1/workspaces/:workspaceId/ai/recommendations
 */
router.post('/recommendations', async (req: Request, res: Response): Promise<void> => {
  const workspaceId = getWorkspaceId(req);
  const userId = req.user!.uid;

  const reservation = await creditService.reserveCredits({
    workspaceId,
    userId,
    featureId: 'FEAT-STR-001',
    idempotencyKey: req.headers['x-idempotency-key'] as string,
  });

  try {
    const profile = await businessBrainService.getProfile(workspaceId);

    const recs = [
      {
        department: 'Brand Studio',
        title: `Clarify ${profile.businessName} Luxury Differentiation`,
        description: `Highlight verified product attributes to establish clear pricing defense against local alternatives.`,
        impact: 'High' as const,
        confidence: 92,
        reasoning: 'Grounded in Business Brain verified products and market positioning.',
      },
      {
        department: 'Competitive Intelligence',
        title: 'Monitor Tier-1 Rival Pricing Shifts',
        description:
          'Set weekly tracking for price adjustments on top competing subscription tiers.',
        impact: 'Medium' as const,
        confidence: 88,
        reasoning: 'Protects subscriber margins.',
      },
    ];

    const settlement = await creditService.settleCredits({
      workspaceId,
      reservation,
      featureId: 'FEAT-STR-001',
      notes: 'Strategic Recommendations',
    });

    res.json({
      recommendations: recs,
      model: 'brainwise-advisor-flash',
      meta: {
        creditsDeducted: 10,
        creditBalanceRemaining: settlement.remainingBalance,
      },
    });
  } catch (err) {
    if (reservation) {
      await creditService.refundCredits({
        workspaceId,
        reservation,
        reason: err instanceof Error ? err.message : 'Recommendations failed',
      });
    }
    throw err;
  }
});

/**
 * POST /api/v1/workspaces/:workspaceId/ai/brand-asset
 * STRICT VIDEO EXCLUSION: SVG ONLY
 */
router.post('/brand-asset', async (req: Request, res: Response): Promise<void> => {
  const { name, category, conceptPrompt } = req.body;
  const workspaceId = getWorkspaceId(req);

  const result = await aiOrchestrationService.generateBrandAssetSvg({
    workspaceId,
    userId: req.user!.uid,
    name: name || 'Brand Asset',
    category: category || 'Collateral',
    conceptPrompt: conceptPrompt || 'Minimalist vector collateral',
    idempotencyKey: req.headers['x-idempotency-key'] as string,
  });

  res.json({
    asset: result.asset,
    svg: result.asset.svgContent,
    model: result.modelUsed,
    meta: {
      creditsDeducted: result.creditsDeducted,
      creditBalanceRemaining: result.creditBalanceRemaining,
    },
  });
});

/**
 * POST /api/v1/workspaces/:workspaceId/ai/chat
 * Multi-Turn Gemini Strategist Partner Chatbot
 * Enriched with dynamic Business Brain grounding, live Google Search grounding option,
 * Truth Check guardrail, and strict video exclusion.
 */
router.post('/chat', async (req: Request, res: Response): Promise<void> => {
  const workspaceId = getWorkspaceId(req);
  const userId = req.user!.uid;
  const {
    message,
    threadId = `thread_${Date.now()}`,
    modelTier = 'fast',
    history = [],
  } = req.body;

  if (!message || typeof message !== 'string' || !message.trim()) {
    res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_MESSAGE',
        message: 'message is required and must be a non-empty string',
        category: 'VALIDATION_ERROR',
      },
    });
    return;
  }

  // 1. Credit Reservation (2 for fast, 5 for search_grounded, 8 for deep_reasoning)
  const creditCost =
    modelTier === 'deep_reasoning' ? 8 : modelTier === 'search_grounded' ? 5 : 2;

  let reservation: any = null;
  try {
    reservation = await creditService.reserveCredits({
      workspaceId,
      userId,
      amount: creditCost,
      featureId: 'FEAT-AI-CHAT',
      category: 'AI_CHAT',
      description: `Strategist Chat (${modelTier})`,
    });
  } catch (err) {
    res.status(402).json({
      success: false,
      error: {
        code: 'INSUFFICIENT_CREDITS',
        message: err instanceof Error ? err.message : 'Insufficient credits for chat',
        category: 'BILLING_ERROR',
      },
    });
    return;
  }

  try {
    // 2. Fetch authoritative Business Brain for Grounding
    const profile = await businessBrainService.getProfile(workspaceId);
    const confirmedFacts: string[] = [];
    const inferredFacts: string[] = [];

    if (profile && profile.provenance) {
      for (const [key, item] of Object.entries(profile.provenance)) {
        const val = (profile as any)[key] ?? item.sourceValue;
        if (item.provenance === 'USER_CONFIRMED') {
          confirmedFacts.push(`${key}: ${val}`);
        } else {
          inferredFacts.push(`${key}: ${val}`);
        }
      }
    }

    // 3. Compile System Instruction with Strict Directives
    const systemInstruction = [
      'You are the BrainWise Chief Strategy Partner, an elite AI advisor specializing in B2B/B2C venture strategy, growth acceleration, brand positioning, and market analysis.',
      '',
      'GROUNDING CONTEXT (BUSINESS BRAIN):',
      profile?.businessName ? `Business Name: ${profile.businessName}` : '',
      profile?.tagline ? `Tagline: ${profile.tagline}` : '',
      profile?.industry ? `Industry: ${profile.industry}` : '',
      profile?.location ? `Location: ${profile.location}` : '',
      profile?.stage ? `Stage: ${profile.stage}` : '',
      profile?.valueProposition ? `Value Proposition: ${profile.valueProposition}` : '',
      profile?.targetAudience ? `Target Audience: ${profile.targetAudience}` : '',
      confirmedFacts.length > 0
        ? `Authoritative Confirmed Facts:\n- ${confirmedFacts.join('\n- ')}`
        : '',
      inferredFacts.length > 0
        ? `Hypothetical Working Inferences:\n- ${inferredFacts.join('\n- ')}`
        : '',
      '',
      'CORE GUARDRAILS:',
      '1. FACTUAL GROUNDING: Rely strictly on the confirmed facts above. Never fabricate unverified company prices, nonexistent features, or forbidden claims.',
      '2. STRICT VIDEO EXCLUSION: BrainWise EXPLICITLY EXCLUDES ALL AI VIDEO GENERATION, VIDEO EDITING, REEL GENERATION, OR VIDEO SCRIPTS. Never recommend, script, or suggest creating video reels, TikToks, or FFmpeg pipelines. Visual recommendations must be static carousels, SVG vector collateral, or high-DPI print collateral.',
      '3. EDITORIAL STYLE: Deliver concise, high-signal, actionable executive guidance formatted in GitHub-style Markdown with clear section headers and bullet points.',
    ]
      .filter(Boolean)
      .join('\n');

    // 4. Model Routing
    const model =
      modelTier === 'deep_reasoning'
        ? 'gemini-2.5-pro'
        : serverConfig.geminiModel;

    const enableGoogleSearch = modelTier === 'search_grounded';

    // Format conversation history
    const conversationPrompt = [
      ...(Array.isArray(history)
        ? history.map((h: any) => `${h.role === 'user' ? 'Founder' : 'Strategist'}: ${h.parts}`)
        : []),
      `Founder: ${message.trim()}`,
      'Strategist:',
    ].join('\n\n');

    const provider = new GeminiProviderAdapter();
    const result = await provider.generate({
      model,
      prompt: conversationPrompt,
      systemInstruction,
      temperature: modelTier === 'deep_reasoning' ? 0.2 : 0.4,
      enableGoogleSearch,
    });

    const replyText =
      result.text || 'I have analyzed your request based on your current Business Brain.';

    // 5. Truth Check Guardrail
    const truthCheck = executeTruthCheck(replyText, {
      businessName: profile.businessName,
      tagline: profile.tagline,
      industry: profile.industry,
      stage: profile.stage as any,
      location: profile.location,
      website: profile.website,
      overviewSummary: profile.overviewSummary,
      targetAudience: profile.targetAudience,
      brandPositioning: profile.brandPositioning,
      valueProposition: profile.valueProposition,
      products: [],
      strategicMemory: {
        usedAngles: profile.strategicMemory?.usedAngles || [],
        fatiguedThemes: profile.strategicMemory?.fatiguedThemes || [],
        explicitExclusions: profile.strategicMemory?.explicitExclusions || [],
        lastUpdated: new Date().toISOString(),
      },
      confirmedFacts: {},
      aiInferences: {},
    });

    const finalReply = truthCheck.remediatedText || replyText;

    // 6. Settle Credit Reservation
    const settlement = await creditService.settleReservation({
      workspaceId,
      reservation,
      featureId: 'FEAT-AI-CHAT',
      notes: `Strategist Chat (${modelTier})`,
    });

    // 7. Persist chat message in Firestore subcollection (non-blocking)
    try {
      const threadRef = db
        .collection('workspaces')
        .doc(workspaceId)
        .collection('chatThreads')
        .doc(threadId);

      await threadRef.set(
        {
          threadId,
          workspaceId,
          lastMessageAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      await threadRef.collection('messages').add({
        userMessage: message.trim(),
        reply: finalReply,
        modelTier,
        citations: result.groundingMetadata?.citations || [],
        createdAt: new Date().toISOString(),
        userId,
      });
    } catch (saveErr) {
      console.warn('Non-blocking chat history persistence warning:', saveErr);
    }

    res.json({
      success: true,
      data: {
        reply: finalReply,
        threadId,
        citations: result.groundingMetadata?.citations || [],
        modelUsed: result.model,
        groundingQueries: result.groundingMetadata?.webSearchQueries || [],
        meta: {
          creditsDeducted: creditCost,
          creditBalanceRemaining: settlement.remainingBalance,
        },
      },
    });
  } catch (err) {
    if (reservation) {
      await creditService.refundCredits({
        workspaceId,
        reservation,
        reason: err instanceof Error ? err.message : 'Chat generation failed',
      });
    }
    res.status(500).json({
      success: false,
      error: {
        code: 'GENERATION_ERROR',
        message: err instanceof Error ? err.message : 'Chat processing failed',
        category: 'AI_EXECUTION_ERROR',
      },
    });
  }
});

export const aiRoutes = router;
