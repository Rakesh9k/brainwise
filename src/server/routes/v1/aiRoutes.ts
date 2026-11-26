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
import { ideaIntelligenceService } from '../../services/ideaIntelligenceService';
import { creditService } from '../../services/creditService';
import { businessBrainService } from '../../services/businessBrainService';
import { db } from '../../db/firestore';
import { GeminiProviderAdapter } from '../../ai/modelRouter';
import { serverConfig } from '../../config/index';
import { executeTruthCheck } from '../../../utils/truthCheck';
import { sharedBusinessContextService } from '../../services/sharedBusinessContextService';
import { memoryService } from '../../services/memoryService';
import { growthRadarService } from '../../services/growthRadarService';
import { brandStudioService } from '../../services/brandStudioService';
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

  const result = await ideaIntelligenceService.orchestrateResearch({
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
    const radarSummary = await growthRadarService.analyzeWorkspace(workspaceId);

    const detectedOpps = [
      ...radarSummary.highestPriorityOpportunities,
      ...radarSummary.emergingOpportunities,
    ];

    const recs =
      detectedOpps.length > 0
        ? detectedOpps.slice(0, 5).map((opp) => ({
            department: opp.relevantDepartment || 'Growth Director',
            title: opp.title,
            description: opp.description,
            impact: opp.opportunityScore >= 75 ? ('High' as const) : ('Medium' as const),
            confidence: opp.confidence,
            reasoning: opp.potentialImpact,
            whatToDo: opp.title,
            whyToDoIt: opp.description,
            supportingResearch:
              opp.supportingEvidence.map((e) => `${e.title}: ${e.detail}`).join('; ') ||
              'Grounded in active Business Brain context',
            expectedBenefit: opp.potentialImpact,
            difficulty:
              opp.estimatedEffort === 'LOW'
                ? 'Low'
                : opp.estimatedEffort === 'MEDIUM'
                  ? 'Medium'
                  : 'High',
            estimatedCost: opp.requiredBudget.amount
              ? `${opp.requiredBudget.currency || '$'}${opp.requiredBudget.amount}`
              : '$0 (Internal)',
            priority:
              opp.opportunityScore >= 80
                ? ('high' as const)
                : opp.opportunityScore >= 60
                  ? ('medium' as const)
                  : ('low' as const),
          }))
        : [
            {
              department: 'Brand Studio',
              title: `Clarify ${profile.businessName} Differentiation`,
              description: `Highlight verified product attributes to establish clear pricing defense against local alternatives.`,
              impact: 'High' as const,
              confidence: 90,
              reasoning: 'Grounded in Business Brain verified products and market positioning.',
              whatToDo: `Clarify ${profile.businessName} Differentiation`,
              whyToDoIt:
                'Highlight verified product attributes to establish clear pricing defense.',
              supportingResearch: 'Grounded in Business Brain facts',
              expectedBenefit: 'Clear market differentiation',
              difficulty: 'Low',
              estimatedCost: '$0',
              priority: 'high' as const,
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
 * POST /api/v1/workspaces/:workspaceId/ai/weekly-plan
 * Generates a concrete 7-day AI weekly task schedule & measurable weekly goals
 * grounded in Business Brain, silent/explicit user location, and active Idea Intelligence report.
 */
router.post('/weekly-plan', async (req: Request, res: Response): Promise<void> => {
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
    const bodyBrain = req.body?.brain || {};
    const activeReport = req.body?.activeReport || null;
    const detectedLocation =
      typeof req.body?.detectedLocation === 'string' ? req.body.detectedLocation.trim() : '';

    // 3-layer silent location resolution:
    // 1. User-confirmed Business Brain location
    // 2. Client timezone-derived or Cloud Run / edge geo header
    // 3. Fallback
    const headerCity = (req.headers['x-appengine-city'] as string) || '';
    const headerCountry =
      (req.headers['x-appengine-country'] as string) ||
      (req.headers['cf-ipcountry'] as string) ||
      '';
    const headerLocation = [headerCity, headerCountry].filter(Boolean).join(', ');

    const effectiveLocation =
      (bodyBrain.location || profile.location || '').trim() ||
      detectedLocation ||
      headerLocation ||
      'Local & Regional Market';

    const businessName = bodyBrain.businessName || profile.businessName || 'Your Business';
    const industry = bodyBrain.industry || profile.industry || 'General Commerce';
    const stage = bodyBrain.stage || profile.stage || 'Early Traction';
    const targetAudience = bodyBrain.targetAudience || profile.targetAudience || 'Target buyers';
    const valueProp = bodyBrain.valueProposition || profile.valueProposition || '';

    const today = new Date();
    const formatDateOffset = (days: number) => {
      const d = new Date(today);
      d.setDate(d.getDate() + days);
      return d.toISOString().slice(0, 10);
    };

    const dayLabels = ['Today (Day 1)', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'];

    // Deterministic location-aware fallback
    const buildFallbackPlan = () => ({
      weeklyTheme: `7-Day Local Growth & Validation Sprint for ${businessName} (${effectiveLocation})`,
      effectiveLocation,
      goals: [
        {
          title: `Acquire 10 qualified local leads in ${effectiveLocation}`,
          description: `Weekly top-of-funnel acquisition target grounded in ${businessName} positioning.`,
          metric: 'Qualified Leads / Inquiries',
          currentValue: 0,
          targetValue: 10,
          unit: 'leads',
          targetDate: formatDateOffset(7),
        },
        {
          title: `Complete 7 consecutive daily growth actions`,
          description: `Maintain 100% weekly sprint velocity across positioning, outreach, and conversion.`,
          metric: 'Sprint Tasks Completed',
          currentValue: 0,
          targetValue: 7,
          unit: 'tasks',
          targetDate: formatDateOffset(7),
        },
      ],
      tasks: [
        {
          dayNumber: 1,
          dayLabel: dayLabels[0],
          title: `Audit top 3 local competitors in ${effectiveLocation} & sharpen ${businessName} offer hook`,
          description: `Compare pricing and positioning against local alternatives in ${effectiveLocation}.`,
          dueDate: formatDateOffset(0),
          priority: 'high' as const,
          estimatedMinutes: 35,
          department: 'Competitive Intelligence',
          isTodayPriority: true,
        },
        {
          dayNumber: 2,
          dayLabel: dayLabels[1],
          title: `Publish 1 high-intent static carousel or vector flyer tailored for ${targetAudience}`,
          description: `Create static visual collateral in Brand Studio highlighting ${valueProp || businessName}.`,
          dueDate: formatDateOffset(1),
          priority: 'high' as const,
          estimatedMinutes: 40,
          department: 'Brand Studio',
          isTodayPriority: false,
        },
        {
          dayNumber: 3,
          dayLabel: dayLabels[2],
          title: `Direct outreach to 15 warm prospects or local partners in ${effectiveLocation}`,
          description: `Run targeted regional outreach with a clear sample/discovery CTA.`,
          dueDate: formatDateOffset(2),
          priority: 'high' as const,
          estimatedMinutes: 45,
          department: 'Growth Director',
          isTodayPriority: false,
        },
        {
          dayNumber: 4,
          dayLabel: dayLabels[3],
          title: `Scan ${effectiveLocation} ${industry} market signals & pricing shifts`,
          description: `Review Market Watch for regional demand spikes or competitor moves.`,
          dueDate: formatDateOffset(3),
          priority: 'medium' as const,
          estimatedMinutes: 25,
          department: 'Market Watch',
          isTodayPriority: false,
        },
        {
          dayNumber: 5,
          dayLabel: dayLabels[4],
          title: `Follow up with Day 3 prospects & collect 3 structured buyer feedback quotes`,
          description: `Log real customer objections into Business Brain to refine messaging.`,
          dueDate: formatDateOffset(4),
          priority: 'high' as const,
          estimatedMinutes: 35,
          department: 'Growth Director',
          isTodayPriority: false,
        },
        {
          dayNumber: 6,
          dayLabel: dayLabels[5],
          title: `Refresh landing/catalog copy & test pricing anchor for ${effectiveLocation} buyers`,
          description: `Ensure all claims and prices match verified Business Brain facts.`,
          dueDate: formatDateOffset(5),
          priority: 'medium' as const,
          estimatedMinutes: 30,
          department: 'Brand Studio',
          isTodayPriority: false,
        },
        {
          dayNumber: 7,
          dayLabel: dayLabels[6],
          title: `Weekly Sprint Review: log goal progress & queue next week's highest-ROI test`,
          description: `Audit conversion rate and update Active Goals in Analytics & Growth Planner.`,
          dueDate: formatDateOffset(6),
          priority: 'medium' as const,
          estimatedMinutes: 25,
          department: 'Analytics',
          isTodayPriority: false,
        },
      ],
    });

    let plan = buildFallbackPlan();

    try {
      const provider = new GeminiProviderAdapter();
      const prompt = [
        `Generate a concrete, actionable 7-day weekly growth plan and 2 measurable weekly goals for:`,
        `Business: ${businessName}`,
        `Industry: ${industry}`,
        `Stage: ${stage}`,
        `Target Location / Market: ${effectiveLocation}`,
        `Target Audience: ${targetAudience}`,
        valueProp ? `Value Proposition: ${valueProp}` : '',
        activeReport
          ? `Active Idea Intelligence Report: "${activeReport.title || ''}" — ${activeReport.ideaSummary || ''}. Top opportunities: ${(activeReport.opportunities || []).slice(0, 2).map((o: any) => o.title).join('; ')}`
          : '',
        '',
        `STRICT RULES:`,
        `1. Tailor channels, partnerships, and tactics specifically to "${effectiveLocation}" and "${industry}".`,
        `2. STRICT VIDEO EXCLUSION: NEVER suggest video, reels, TikTok, or YouTube video creation. Visual tasks must be static carousels, SVG vector flyers, print collateral, or copywriting.`,
        `3. Return ONLY valid JSON (no markdown fences) matching this exact schema:`,
        `{`,
        `  "weeklyTheme": "string",`,
        `  "goals": [{ "title": "string", "description": "string", "metric": "string", "currentValue": 0, "targetValue": number, "unit": "string" }],`,
        `  "tasks": [{ "dayNumber": 1..7, "title": "string", "description": "string", "priority": "high"|"medium", "estimatedMinutes": number, "department": "Growth Director"|"Brand Studio"|"Competitive Intelligence"|"Market Watch"|"Analytics" }]`,
        `}`,
      ]
        .filter(Boolean)
        .join('\n');

      const aiRes = await provider.generate({
        model: serverConfig.geminiModel,
        prompt,
        systemInstruction:
          'You are BrainWise AI Chief Marketing Officer. Output strictly valid JSON with 2 measurable weekly goals and 7 daily tasks (Day 1 to Day 7). Never mention video or reels.',
        temperature: 0.35,
      });

      if (aiRes.text) {
        const cleaned = aiRes.text
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/```$/i, '')
          .trim();
        const parsed = JSON.parse(cleaned);

        if (Array.isArray(parsed.tasks) && parsed.tasks.length >= 5) {
          const validTasks = parsed.tasks.slice(0, 7).map((t: any, idx: number) => ({
            dayNumber: idx + 1,
            dayLabel: dayLabels[idx] || `Day ${idx + 1}`,
            title: String(t.title || `Day ${idx + 1} Growth Action`).slice(0, 140),
            description: String(t.description || '').slice(0, 260),
            dueDate: formatDateOffset(idx),
            priority: t.priority === 'high' ? ('high' as const) : ('medium' as const),
            estimatedMinutes: Math.max(15, Math.min(90, Number(t.estimatedMinutes) || 30)),
            department: String(t.department || 'Growth Director'),
            isTodayPriority: idx === 0,
          }));

          const validGoals =
            Array.isArray(parsed.goals) && parsed.goals.length > 0
              ? parsed.goals.slice(0, 2).map((g: any) => ({
                  title: String(g.title || 'Weekly Growth Target').slice(0, 120),
                  description: String(g.description || '').slice(0, 220),
                  metric: String(g.metric || 'Conversions'),
                  currentValue: 0,
                  targetValue: Math.max(1, Number(g.targetValue) || 10),
                  unit: String(g.unit || 'items'),
                  targetDate: formatDateOffset(7),
                }))
              : plan.goals;

          plan = {
            weeklyTheme: String(parsed.weeklyTheme || plan.weeklyTheme),
            effectiveLocation,
            goals: validGoals,
            tasks: validTasks,
          };
        }
      }
    } catch {
      // Gracefully use location-grounded deterministic fallback if Gemini parse/API fails
    }

    // Truth & Strict Video Exclusion guardrail
    const serialized = JSON.stringify(plan);
    const truthResult = executeTruthCheck(serialized, {
      verifiedPrices: [],
      forbiddenClaims: ['ai video', 'video reel', 'tiktok video', 'ffmpeg'],
    });
    if (!truthResult.passed) {
      plan = buildFallbackPlan();
    }

    const settlement = await creditService.settleCredits({
      workspaceId,
      reservation,
      featureId: 'FEAT-STR-001',
      notes: `7-Day AI Weekly Plan (${effectiveLocation})`,
    });

    res.json({
      ...plan,
      model: serverConfig.geminiModel,
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
        reason: err instanceof Error ? err.message : 'Weekly plan generation failed',
      });
    }
    throw err;
  }
});

/**
 * POST /api/v1/workspaces/:workspaceId/ai/brand-logo
 * Generates 3 differentiated vector logo concepts with sanitized SVG markup
 */
router.post('/brand-logo', async (req: Request, res: Response): Promise<void> => {
  try {
    const workspaceId = getWorkspaceId(req);
    const userId = req.user?.uid || 'anonymous';
    const {
      prompt,
      styleArchetype,
      mood,
      lockBrandColors,
      brand,
      referenceImageDataUrl,
      referenceImageName,
      businessIdea,
      competitors,
    } = req.body;

    const brandName = (brand?.brandName as string) || req.workspace?.workspaceName || 'BrainWise';

    const result = await brandStudioService.generateAiLogoConcepts({
      workspaceId,
      userId,
      brandName,
      prompt: prompt || `Modern brand logo for ${brandName}`,
      styleArchetype,
      mood,
      lockBrandColors,
      brand,
      referenceImageDataUrl,
      referenceImageName,
      businessIdea,
      competitors,
      idempotencyKey: req.headers['x-idempotency-key'] as string,
    });

    res.json({
      success: true,
      concepts: result.concepts,
      model: result.model,
      meta: {
        creditsDeducted: result.creditsDeducted,
        creditBalanceRemaining: result.creditBalanceRemaining,
      },
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'LOGO_GENERATION_FAILED', message: err.message },
    });
  }
});

/**
 * POST /api/v1/workspaces/:workspaceId/ai/brand-identity-chat
 * Conversational Brand Identity Studio assistant:
 * Accepts founder's natural-language preferences, grounds against Business Brain & Competitors,
 * and returns a conversational reply + structured Brand Identity patch (name, tagline, palette, typography, voice, logo style).
 */
router.post('/brand-identity-chat', async (req: Request, res: Response): Promise<void> => {
  try {
    const workspaceId = getWorkspaceId(req);
    const { message, brain, competitors, currentBrand, history } = req.body || {};
    const userMessage = String(message || '').trim();
    if (!userMessage) {
      res.status(400).json({
        success: false,
        error: { code: 'MISSING_MESSAGE', message: 'message is required' },
      });
      return;
    }

    const profile = await businessBrainService.getProfile(workspaceId).catch(() => null);
    const businessName =
      (brain?.businessName && brain.businessName !== 'My Venture' ? brain.businessName : '') ||
      profile?.businessName ||
      'Your Brand';
    const industry = brain?.industry || profile?.industry || 'Specialty Commerce';
    const location = brain?.location || profile?.location || 'India';
    const competitorSummary = Array.isArray(competitors) && competitors.length > 0
      ? competitors
          .slice(0, 5)
          .map((c: any) => `${c.name} (${c.category || 'Peer'}: ${c.positioning || ''})`)
          .join('; ')
      : 'No direct competitors profiled yet';

    const provider = new GeminiProviderAdapter();
    const prompt = [
      `You are BrainWise AI Brand Director helping a founder finalize their Brand Identity effortlessly.`,
      `Business: ${businessName} (${industry} in ${location})`,
      `Target Audience: ${brain?.targetAudience || profile?.targetAudience || 'Quality-conscious buyers'}`,
      `Competitors: ${competitorSummary}`,
      `Current Brand Draft: ${JSON.stringify({
        brandName: currentBrand?.brandName || businessName,
        tagline: currentBrand?.tagline || '',
        brandVoice: currentBrand?.brandVoice || '',
        palette: currentBrand?.palette || {},
      })}`,
      Array.isArray(history) && history.length > 0
        ? `Recent Chat:\n${history.slice(-4).map((h: any) => `${h.role}: ${h.text}`).join('\n')}`
        : '',
      `Founder Request: "${userMessage}"`,
      ``,
      `Respond in valid JSON ONLY (no markdown fences):`,
      `{`,
      `  "reply": "Concise, encouraging 2-3 sentence response explaining the tailored brand direction and how it differentiates from competitors.",`,
      `  "suggestedPatch": {`,
      `    "brandName": "${businessName}",`,
      `    "tagline": "Short memorable tagline (3-7 words)",`,
      `    "brandVoice": "Clear 1-sentence brand voice & tone rule",`,
      `    "palette": { "primary": "#hex", "secondary": "#hex", "accent": "#hex", "surface": "#FAF9F6" },`,
      `    "typography": { "heading": "Plus Jakarta Sans" | "Playfair Display" | "Instrument Serif" | "Space Grotesk", "body": "Inter" | "DM Sans" },`,
      `    "personalityTraits": ["Trait 1", "Trait 2", "Trait 3"],`,
      `    "recommendedLogoArchetype": "Minimal Geometric" | "Botanical / Craft Seal" | "Swiss Monogram" | "Modern Crest" | "Architectural Wordmark",`,
      `    "recommendedLogoMood": "Warm Tactile Craft" | "Swiss Editorial" | "Monochrome Luxury" | "Bold Geometric Tech"`,
      `  }`,
      `}`,
    ]
      .filter(Boolean)
      .join('\n');

    let reply = `I've updated ${businessName}'s brand direction to stand apart from local competitors with a cohesive palette, voice, and recommended logo style.`;
    let suggestedPatch: Record<string, any> = {
      brandName: businessName,
      tagline: `Crafted for ${location} — Unmistakably ${businessName}`,
      brandVoice: 'Warm, transparent, story-driven, and confident without generic hype.',
      palette: {
        primary: '#2C1E18',
        secondary: '#6B4F43',
        accent: '#D96B27',
        surface: '#FAF7F2',
      },
      typography: { heading: 'Playfair Display', body: 'Inter' },
      personalityTraits: ['Artisanal', 'Transparent', 'Memorable'],
      recommendedLogoArchetype: 'Botanical / Craft Seal',
      recommendedLogoMood: 'Warm Tactile Craft',
    };

    try {
      const aiRes = await provider.generate({
        model: serverConfig.geminiModel,
        prompt,
        systemInstruction:
          'You are a senior Brand Director. Return strictly valid JSON with "reply" and "suggestedPatch".',
        temperature: 0.4,
      });
      if (aiRes.text) {
        const cleaned = aiRes.text
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/```$/i, '')
          .trim();
        const parsed = JSON.parse(cleaned);
        if (parsed.reply) reply = String(parsed.reply);
        if (parsed.suggestedPatch && typeof parsed.suggestedPatch === 'object') {
          suggestedPatch = { ...suggestedPatch, ...parsed.suggestedPatch };
        }
      }
    } catch {
      // Use deterministic tailored patch above
    }

    res.json({
      success: true,
      reply,
      suggestedPatch,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'BRAND_CHAT_FAILED', message: err?.message || 'Brand chat error' },
    });
  }
});

/**
 * POST /api/v1/workspaces/:workspaceId/ai/social-creative
 * Generates multi-slide social carousel or static creative (STRICT VIDEO EXCLUSION)
 */
router.post('/social-creative', async (req: Request, res: Response): Promise<void> => {
  try {
    const workspaceId = getWorkspaceId(req);
    const userId = req.user?.uid || 'anonymous';
    const {
      platform = 'Carousel',
      angle = 'Educational Carousel',
      prompt,
      slideCount = 5,
      mood,
      regenerateSlideNumber,
      brand,
      brain,
    } = req.body;

    const result = await brandStudioService.generateSocialCreative({
      workspaceId,
      userId,
      platform,
      angle,
      prompt: prompt || 'Differentiated commercial strategy carousel',
      slideCount: Number(slideCount) || 5,
      mood,
      regenerateSlideNumber: regenerateSlideNumber ? Number(regenerateSlideNumber) : undefined,
      brand,
      brain,
      idempotencyKey: req.headers['x-idempotency-key'] as string,
    });

    res.json({
      success: true,
      creative: result.package,
      ...result.package,
      model: result.model,
      meta: {
        creditsDeducted: result.creditsDeducted,
        creditBalanceRemaining: result.creditBalanceRemaining,
      },
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'SOCIAL_CREATIVE_FAILED', message: err.message },
    });
  }
});

/**
 * POST /api/v1/workspaces/:workspaceId/ai/brand-asset
 * STRICT VIDEO EXCLUSION: SVG ONLY
 * Supports both single vector asset generation and 3 collateral variations
 */
router.post('/brand-asset', async (req: Request, res: Response): Promise<void> => {
  try {
    const workspaceId = getWorkspaceId(req);
    const userId = req.user?.uid || 'anonymous';
    const { name, category, conceptPrompt, prompt, surfaceMode, brand, brain } = req.body;

    // If request contains variations payload from BrandStudioPage collateral tab:
    if (category && (surfaceMode || prompt || brand)) {
      const result = await brandStudioService.generateCollateralVariations({
        workspaceId,
        userId,
        category: category || 'Packaging',
        prompt: prompt || conceptPrompt || 'Signature brand launch collateral',
        surfaceMode,
        brand,
        brain,
        idempotencyKey: req.headers['x-idempotency-key'] as string,
      });

      res.json({
        success: true,
        variations: result.variations,
        model: result.model,
        meta: {
          creditsDeducted: result.creditsDeducted,
          creditBalanceRemaining: result.creditBalanceRemaining,
        },
      });
      return;
    }

    // Default single asset vector generation:
    const result = await aiOrchestrationService.generateBrandAssetSvg({
      workspaceId,
      userId,
      name: name || 'Brand Asset',
      category: category || 'Collateral',
      conceptPrompt: conceptPrompt || 'Minimalist vector collateral',
      idempotencyKey: req.headers['x-idempotency-key'] as string,
    });

    res.json({
      success: true,
      asset: result.asset,
      svg: result.asset.svgContent,
      model: result.modelUsed,
      meta: {
        creditsDeducted: result.creditsDeducted,
        creditBalanceRemaining: result.creditBalanceRemaining,
      },
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'BRAND_ASSET_GENERATION_FAILED', message: err.message },
    });
  }
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
  const { message, threadId = `thread_${Date.now()}`, modelTier = 'fast', history = [] } = req.body;

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
  const creditCost = modelTier === 'deep_reasoning' ? 8 : modelTier === 'search_grounded' ? 5 : 2;

  let reservation: any;
  try {
    reservation = await creditService.reserveCredits({
      workspaceId,
      userId,
      featureId: 'FEAT-AI-CHAT',
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
    // 2. Fetch authoritative Shared Business Context for Grounding
    const profile = await businessBrainService.getProfile(workspaceId);
    const sharedContext = await sharedBusinessContextService.getBusinessContext({
      workspaceId,
      sessionId: threadId,
      taskType: 'STRATEGY',
    });

    const confirmedFacts: string[] = [];
    const inferredFacts: string[] = [];

    if (profile && profile.provenance) {
      for (const [key, item] of Object.entries(profile.provenance)) {
        const val = (profile as any)[key] ?? item.fieldKey;
        if (item.source === 'USER_CONFIRMED') {
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
      'GROUNDING CONTEXT (BUSINESS BRAIN & KNOWLEDGE GRAPH):',
      profile?.businessName ? `Business Name: ${profile.businessName}` : '',
      profile?.tagline ? `Tagline: ${profile.tagline}` : '',
      profile?.location ? `Location: ${profile.location}` : '',
      profile?.stage ? `Stage: ${profile.stage}` : '',
      profile?.valueProposition ? `Value Proposition: ${profile.valueProposition}` : '',
      profile?.targetAudience ? `Target Audience: ${profile.targetAudience}` : '',
      sharedContext.relevantProducts.length > 0
        ? `Confirmed Offerings:\n${sharedContext.relevantProducts.map((p) => `- ${p.name} ($${p.price})`).join('\n')}`
        : '',
      sharedContext.brandDirectives.voice.length > 0
        ? `Brand Voice: ${sharedContext.brandDirectives.voice.join(', ')}`
        : '',
      sharedContext.relevantConstraints.length > 0
        ? `Constraints & Boundaries:\n${sharedContext.relevantConstraints.map((c) => `- ${c}`).join('\n')}`
        : '',
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
    const model = modelTier === 'deep_reasoning' ? 'gemini-2.5-pro' : serverConfig.geminiModel;

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

    // 5. Update Working Memory
    await memoryService.appendConversationTurn({
      workspaceId,
      sessionId: threadId,
      userId,
      role: 'user',
      content: message.trim(),
    });
    await memoryService.appendConversationTurn({
      workspaceId,
      sessionId: threadId,
      userId,
      role: 'assistant',
      content: replyText,
    });

    // 6. Truth Check Guardrail
    const truthCheck = executeTruthCheck(replyText, {
      businessName: profile.businessName || 'Business',
      tagline: profile.tagline || '',
      industry: 'General Business',
      stage: profile.stage || 'Early Traction',
      location: profile.location || '',
      website: profile.website || '',
      foundedYear: profile.foundedYear || '2025',
      overviewSummary: profile.overviewSummary || '',
      targetAudience: profile.targetAudience || '',
      brandPositioning: profile.brandPositioning || '',
      valueProposition: profile.valueProposition || '',
      businessModel: profile.businessModel || '',
      revenueModel: profile.revenueModel || '',
      primaryGoals: profile.primaryGoals || [],
      products: sharedContext.relevantProducts.map((p) => ({
        id: (p.id as string) || 'p1',
        name: (p.name as string) || '',
        category: (p.category as string) || 'General',
        priceRange: `$${p.price}`,
        price: Number(p.price) || 0,
        description: (p.description as string) || '',
        marginEstimate: '60%',
      })),
      personas: [],
      documents: [],
      decisions: [],
      history: [],
      lastUpdated: new Date().toISOString(),
      strategicMemory: {
        usedAngles: (profile.strategicMemory?.usedAngles as any) || [],
        fatiguedThemes: profile.strategicMemory?.fatiguedThemes || [],
        explicitExclusions: profile.strategicMemory?.explicitExclusions || [],
        lastUpdated: new Date().toISOString(),
      },
    });

    if (truthCheck.status === 'REJECTED') {
      await creditService.refundCredits({
        workspaceId,
        reservation,
        reason: truthCheck.refundReason || 'Truth check guardrail rejected unverified assertions',
      });
      res.status(422).json({
        success: false,
        error: {
          code: 'TRUTH_GUARDRAIL_VIOLATION',
          message:
            'The generated strategic response violated Business Brain fact constraints. Credits refunded.',
          category: 'AI_ORCHESTRATION_ERROR',
        },
      });
      return;
    }

    const finalReply = truthCheck.remediatedContent || replyText;

    // 6. Settle Credit Reservation
    const settlement = await creditService.settleCredits({
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
        creditsDeducted: creditCost,
        creditBalanceRemaining: settlement.remainingBalance,
      },
      meta: {
        creditsDeducted: creditCost,
        creditBalanceRemaining: settlement.remainingBalance,
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
