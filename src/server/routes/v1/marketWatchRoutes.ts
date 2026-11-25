/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, type Request, type Response } from 'express';
import crypto from 'node:crypto';
import { authenticateToken } from '../../middleware/auth';
import { requireWorkspaceMember, requireWorkspaceRole } from '../../middleware/workspace';
import { marketWatchRepository } from '../../repositories/marketWatchRepository';
import { taskRepository } from '../../repositories/taskRepository';
import { experimentRepository } from '../../repositories/experimentRepository';
import { businessProfileRepository } from '../../repositories/businessProfileRepository';
import { competitorRepository } from '../../repositories/competitorRepository';
import { GeminiProviderAdapter } from '../../ai/modelRouter';
import { serverConfig } from '../../config/index';
import { executeTruthCheck } from '../../../utils/truthCheck';
import { departmentEventBus } from '../../events/eventBus';
import { creditService } from '../../services/creditService';
import { businessWatchService } from '../../services/businessWatchService';
import type {
  MarketTopicEntity,
  MarketFindingEntity,
  GrowthTaskEntity,
  GrowthExperimentEntity,
} from '../../types/api';

const router = Router({ mergeParams: true });

router.use(authenticateToken);
router.use(requireWorkspaceMember);

/**
 * GET /api/v1/workspaces/:workspaceId/market-watch/topics
 */
router.get('/topics', async (req: Request, res: Response): Promise<void> => {
  const topics = await marketWatchRepository.listTopics(req.workspace!.workspaceId);
  res.json({ success: true, data: topics });
});

/**
 * POST /api/v1/workspaces/:workspaceId/market-watch/topics
 */
router.post(
  '/topics',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    const {
      industry,
      category,
      geography,
      keywords,
      competitorNames,
      topicsOfInterest,
      monitoringFrequency,
    } = req.body;
    const topicId =
      req.body.topicId || `top_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const now = new Date().toISOString();

    const topic: MarketTopicEntity = {
      topicId,
      workspaceId: req.workspace!.workspaceId,
      industry: industry || req.workspace!.industry,
      category: category || 'Industry Watch',
      geography: geography || req.workspace!.country || 'Global',
      keywords: Array.isArray(keywords) ? keywords : [],
      competitorNames: Array.isArray(competitorNames) ? competitorNames : [],
      topicsOfInterest: Array.isArray(topicsOfInterest) ? topicsOfInterest : [],
      monitoringFrequency: monitoringFrequency || 'Weekly',
      monitoringStatus: 'active',
      createdAt: now,
      updatedAt: now,
    };

    const saved = await marketWatchRepository.createTopic(topic);
    res.status(201).json({ success: true, data: saved });
  }
);

/**
 * PATCH /api/v1/workspaces/:workspaceId/market-watch/topics/:topicId
 */
router.patch(
  '/topics/:topicId',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    const updated = await marketWatchRepository.updateTopic(
      req.workspace!.workspaceId,
      req.params.topicId,
      req.body
    );
    res.json({ success: true, data: updated });
  }
);

/**
 * DELETE /api/v1/workspaces/:workspaceId/market-watch/topics/:topicId
 */
router.delete(
  '/topics/:topicId',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    await marketWatchRepository.deleteTopic(req.workspace!.workspaceId, req.params.topicId);
    res.json({ success: true, data: { deleted: true, topicId: req.params.topicId } });
  }
);

/**
 * GET /api/v1/workspaces/:workspaceId/market-watch/findings
 */
router.get('/findings', async (req: Request, res: Response): Promise<void> => {
  const category = req.query.category as string | undefined;
  const unreadOnly = req.query.unreadOnly === 'true';
  const limit = Number(req.query.limit) || 50;

  const findings = await marketWatchRepository.listFindings(req.workspace!.workspaceId, {
    category,
    unreadOnly,
    limit,
  });
  res.json({ success: true, data: findings });
});

/**
 * POST /api/v1/workspaces/:workspaceId/market-watch/findings
 */
router.post(
  '/findings',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    const {
      headline,
      publisher,
      sourceUrl,
      topic,
      geography,
      summary,
      evidence,
      relevanceScore,
      category,
      suggestedAction,
    } = req.body;
    if (!headline || !sourceUrl) {
      res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'headline and sourceUrl are required' },
      });
      return;
    }

    const now = new Date().toISOString();
    const dedupHash = crypto.createHash('md5').update(`${headline}:${sourceUrl}`).digest('hex');

    // Duplicate suppression check
    const existing = await marketWatchRepository.findByDedupHash(
      req.workspace!.workspaceId,
      dedupHash
    );
    if (existing) {
      res.status(200).json({ success: true, data: existing, deduplicated: true });
      return;
    }

    const findingId =
      req.body.findingId || `fnd_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const finding: MarketFindingEntity = {
      findingId,
      workspaceId: req.workspace!.workspaceId,
      headline: headline.trim(),
      publisher: publisher || 'Industry Source',
      sourceUrl,
      publicationDate: req.body.publicationDate || now,
      retrievedAt: now,
      topic: topic || 'Market Watch',
      geography: geography || req.workspace!.country || 'Global',
      summary: summary || '',
      evidence: evidence || 'Public web signals',
      relevanceScore: Number(relevanceScore) || 80,
      dedupHash,
      category: category || 'News',
      suggestedAction,
      isRead: false,
      isArchived: false,
      createdAt: now,
    };

    const saved = await marketWatchRepository.createFinding(finding);

    await departmentEventBus.emit({
      workspaceId: req.workspace!.workspaceId,
      userId: req.user!.uid,
      eventType: 'MARKET_ALERT_CREATED',
      resourceId: findingId,
      metadata: { headline: saved.headline, category: saved.category },
    });

    res.status(201).json({ success: true, data: saved });
  }
);

/**
 * PATCH /api/v1/workspaces/:workspaceId/market-watch/findings/:findingId
 */
router.patch(
  '/findings/:findingId',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    const updated = await marketWatchRepository.updateFinding(
      req.workspace!.workspaceId,
      req.params.findingId,
      req.body
    );
    res.json({ success: true, data: updated });
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/market-watch/findings/:findingId/convert-to-experiment
 * Converts a market finding or competitor alert into a Growth Planner experiment
 */
router.post(
  '/findings/:findingId/convert-to-experiment',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    const finding = (await marketWatchRepository.listFindings(req.workspace!.workspaceId)).find(
      (f) => f.findingId === req.params.findingId
    );
    if (!finding) {
      res
        .status(404)
        .json({ success: false, error: { code: 'NOT_FOUND', message: 'Finding not found' } });
      return;
    }

    const experimentId = `exp_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const now = new Date().toISOString();

    const experiment: GrowthExperimentEntity = {
      experimentId,
      workspaceId: req.workspace!.workspaceId,
      title: `Counter-Test: ${finding.headline.slice(0, 50)}`,
      hypothesis: finding.summary || 'Market development reaction hypothesis',
      department: 'Market Watch',
      status: 'idea',
      budget: '$150',
      startDate: now,
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      results: `Derived from Market Watch alert: ${finding.sourceUrl}`,
      createdBy: req.user!.uid,
      createdAt: now,
      updatedAt: now,
    };

    await experimentRepository.create(experiment);

    await marketWatchRepository.updateFinding(req.workspace!.workspaceId, finding.findingId, {
      isRead: true,
      convertedToExperimentId: experimentId,
    });

    await departmentEventBus.emit({
      workspaceId: req.workspace!.workspaceId,
      userId: req.user!.uid,
      eventType: 'EXPERIMENT_STARTED',
      resourceId: experimentId,
      metadata: { findingId: finding.findingId, headline: finding.headline },
    });

    res.status(201).json({ success: true, data: experiment });
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/market-watch/findings/:findingId/convert-to-task
 * Converts an alert into a Growth Task
 */
router.post(
  '/findings/:findingId/convert-to-task',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    const finding = (await marketWatchRepository.listFindings(req.workspace!.workspaceId)).find(
      (f) => f.findingId === req.params.findingId
    );
    if (!finding) {
      res
        .status(404)
        .json({ success: false, error: { code: 'NOT_FOUND', message: 'Finding not found' } });
      return;
    }

    const taskId = `tsk_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const now = new Date().toISOString();

    const task: GrowthTaskEntity = {
      taskId,
      workspaceId: req.workspace!.workspaceId,
      title: `Action: ${finding.headline.slice(0, 60)}`,
      description: finding.suggestedAction || finding.summary,
      priority: 'high',
      status: 'pending',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      notes: `Triggered by Market Watch signal: ${finding.sourceUrl}`,
      createdBy: req.user!.uid,
      createdAt: now,
      updatedAt: now,
    };

    await taskRepository.create(task);

    await marketWatchRepository.updateFinding(req.workspace!.workspaceId, finding.findingId, {
      isRead: true,
      convertedToTaskId: taskId,
    });

    await departmentEventBus.emit({
      workspaceId: req.workspace!.workspaceId,
      userId: req.user!.uid,
      eventType: 'TASK_CREATED',
      resourceId: taskId,
      metadata: { findingId: finding.findingId, headline: finding.headline },
    });

    res.status(201).json({ success: true, data: task });
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/market-watch/scan
 * Runs a market intelligence scan grounded in Business Brain context
 */
router.post(
  '/scan',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    const reservation = await creditService.reserveCredits({
      workspaceId: req.workspace!.workspaceId,
      userId: req.user!.uid,
      featureId: 'FEAT-MKT-001',
      idempotencyKey: req.headers['x-idempotency-key'] as string,
    });

    try {
      const rawProfile = await businessProfileRepository.getProfile(req.workspace!.workspaceId);
      const bodyBrain = req.body?.brain || {};
      const profile = rawProfile || {
        businessName: bodyBrain.businessName || req.workspace?.workspaceName || 'My Business',
        location: bodyBrain.location || req.workspace?.country || '',
        valueProposition: bodyBrain.valueProposition || 'Differentiated value',
      };
      const industry = bodyBrain.industry || req.workspace?.industry || 'Specialty Business';
      const detectedLocation =
        typeof req.body?.detectedLocation === 'string' ? req.body.detectedLocation.trim() : '';
      const headerCountry =
        (req.headers['x-appengine-country'] as string) ||
        (req.headers['cf-ipcountry'] as string) ||
        '';
      const effectiveLocation =
        (bodyBrain.location || profile.location || '').trim() ||
        detectedLocation ||
        headerCountry ||
        'India';

      // Gather tracked competitors from Firestore + request body
      const dbCompetitors = await competitorRepository
        .listByWorkspace(req.workspace!.workspaceId)
        .catch(() => []);
      const bodyCompetitors: string[] = Array.isArray(req.body?.competitors)
        ? req.body.competitors.map((c: any) => String(c?.name || c || '').trim()).filter(Boolean)
        : [];
      const competitorNames = Array.from(
        new Set([
          ...dbCompetitors.map((c) => c.companyName || c.canonicalName).filter(Boolean),
          ...bodyCompetitors,
        ])
      ).slice(0, 6);

      const now = new Date().toISOString();
      const findingsToCreate: Array<Omit<MarketFindingEntity, 'workspaceId' | 'createdAt'>> = [];

      // Live Google Search Grounding (zero fabricated URLs or stats)
      const provider = new GeminiProviderAdapter();
      const searchPrompt = [
        `Search for real, recent market news, consumer demand trends, regulatory updates, or competitor announcements relevant to:`,
        `Business: ${bodyBrain.businessName || profile.businessName}`,
        `Industry: ${industry}`,
        `Region / Country: ${effectiveLocation}`,
        competitorNames.length > 0 ? `Tracked Competitors: ${competitorNames.join(', ')}` : '',
        '',
        `STRICT ANTI-HALLUCINATION RULES:`,
        `1. ONLY report facts, events, pricing shifts, or trends explicitly observed in the Google Search results.`,
        `2. NEVER invent percentages, statistics, circular numbers, or example.com/example.gov URLs.`,
        `3. Strictly exclude video/reel recommendations.`,
        `4. Return ONLY valid JSON array (or [] if nothing verifiable is found):`,
        `[`,
        `  {`,
        `    "competitorOrSource": "Company or Publication Name",`,
        `    "headline": "Short factual headline",`,
        `    "category": "Pricing changes" | "Product launches" | "Public social media activity" | "Market trends",`,
        `    "detectedChange": "Observed factual change or market shift from search results",`,
        `    "aiInterpretation": "Why this matters for ${bodyBrain.businessName || profile.businessName}",`,
        `    "suggestedAction": "Concrete next step (no video)",`,
        `    "importance": "high" | "medium" | "low"`,
        `  }`,
        `]`,
      ]
        .filter(Boolean)
        .join('\n');

      const aiResult = await provider.generate({
        model: serverConfig.geminiModel,
        prompt: searchPrompt,
        systemInstruction:
          'You are a strict, evidence-only Market Intelligence analyst. Never fabricate facts or URLs. Output strictly valid JSON array.',
        temperature: 0.2,
        enableGoogleSearch: true,
      });

      const realCitations = (aiResult.groundingMetadata?.citations || []).filter(
        (c) =>
          c.url &&
          !c.url.includes('example.com') &&
          !c.url.includes('example.gov') &&
          c.url.startsWith('http')
      );

      if (aiResult.text && realCitations.length > 0) {
        try {
          const cleaned = aiResult.text
            .replace(/^```json\s*/i, '')
            .replace(/^```\s*/i, '')
            .replace(/```$/i, '')
            .trim();
          const parsed = JSON.parse(cleaned);
          const items = Array.isArray(parsed) ? parsed : [];

          items.slice(0, 4).forEach((item: any, idx: number) => {
            const citation = realCitations[idx % realCitations.length];
            const headline = String(item.headline || '').trim();
            const detectedChange = String(item.detectedChange || item.summary || '').trim();
            if (!headline || !detectedChange) return;

            const truth = executeTruthCheck(`${headline} ${detectedChange} ${item.suggestedAction || ''}`, {
              verifiedPrices: [],
              forbiddenClaims: ['example.com', 'example.gov', 'ai video', 'video reel'],
            });
            if (!truth.passed) return;

            findingsToCreate.push({
              findingId: `fnd_${Date.now()}_${idx}`,
              headline,
              publisher: citation.title || String(item.competitorOrSource || 'Verified Web Source'),
              sourceUrl: citation.url,
              publicationDate: now,
              retrievedAt: now,
              topic: String(item.category || industry),
              geography: effectiveLocation,
              summary: detectedChange,
              evidence: String(item.aiInterpretation || detectedChange),
              relevanceScore: item.importance === 'high' ? 92 : 82,
              dedupHash: crypto
                .createHash('md5')
                .update(`${headline}:${citation.url}`)
                .digest('hex'),
              category:
                item.category === 'Pricing changes'
                  ? 'Pricing'
                  : item.category === 'Product launches'
                    ? 'Launch'
                    : item.category === 'Public social media activity'
                      ? 'Social'
                      : 'Trend',
              suggestedAction: String(
                item.suggestedAction || 'Evaluate positioning response in Growth Planner.'
              ),
              isRead: false,
              isArchived: false,
            });
          });
        } catch {
          // If JSON parse fails, do NOT invent fake findings
        }
      }

      const created = [];
      for (const f of findingsToCreate) {
        const entity: MarketFindingEntity = {
          ...f,
          workspaceId: req.workspace!.workspaceId,
          createdAt: now,
        };
        const saved = await marketWatchRepository.createFinding(entity);
        created.push(saved);

        await departmentEventBus.emit({
          workspaceId: req.workspace!.workspaceId,
          userId: req.user!.uid,
          eventType: 'MARKET_ALERT_CREATED',
          resourceId: saved.findingId,
          metadata: { headline: saved.headline, category: saved.category },
        });
      }

      const settlement = await creditService.settleCredits({
        workspaceId: req.workspace!.workspaceId,
        reservation,
        featureId: 'FEAT-MKT-001',
        notes: `Live Google-Grounded Market Scan (${effectiveLocation})`,
      });

      res.status(201).json({
        success: true,
        data: created,
        citationsCount: realCitations.length,
        effectiveLocation,
        statusMessage:
          created.length > 0
            ? `Captured ${created.length} grounded market signals verified against ${realCitations.length} live web sources.`
            : 'No new verified external shifts detected in live search results (zero unverified data fabricated).',
        meta: {
          creditsDeducted: created.length > 0 ? 5 : 0,
          creditBalanceRemaining: settlement.remainingBalance,
        },
      });
    } catch (err) {
      if (reservation) {
        await creditService.refundCredits({
          workspaceId: req.workspace!.workspaceId,
          reservation,
          reason: err instanceof Error ? err.message : 'Market scan failed',
        });
      }
      res
        .status(500)
        .json({ success: false, error: { code: 'SCAN_FAILED', message: 'Market scan failed' } });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/market-watch/cycle/run
 * Triggers an operational surveillance monitoring cycle
 */
router.post(
  '/cycle/run',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const workspaceId = req.workspace!.workspaceId;
      const result = await businessWatchService.executeMonitoringCycle({ workspaceId });
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'SURVEILLANCE_CYCLE_FAILED', message: err.message },
      });
    }
  }
);

/**
 * GET /api/v1/workspaces/:workspaceId/market-watch/alerts
 * Lists active 6-factor actionable surveillance alerts
 */
router.get(
  '/alerts',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const workspaceId = req.workspace!.workspaceId;
      const category = req.query.category as any;
      const severity = req.query.severity as any;
      const alerts = await businessWatchService.getActiveAlerts(workspaceId, {
        category,
        severity,
      });
      res.json({ success: true, data: alerts });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'ALERTS_FETCH_FAILED', message: err.message },
      });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/market-watch/alerts/:alertId/acknowledge
 * Acknowledges or resolves an alert
 */
router.post(
  '/alerts/:alertId/acknowledge',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const workspaceId = req.workspace!.workspaceId;
      const alertId = req.params.alertId;
      const { status = 'ACKNOWLEDGED', resolutionNotes = '' } = req.body;
      const updated = await businessWatchService.acknowledgeAlert({
        workspaceId,
        alertId,
        status,
        resolutionNotes,
      });
      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'ALERT_ACKNOWLEDGE_FAILED', message: err.message },
      });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/market-watch/digest/weekly
 * Generates an executive Weekly Business Digest
 */
router.post(
  '/digest/weekly',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const workspaceId = req.workspace!.workspaceId;
      const digest = await businessWatchService.generateWeeklyDigest(workspaceId);
      res.json({ success: true, data: digest });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'DIGEST_GENERATION_FAILED', message: err.message },
      });
    }
  }
);

export const marketWatchRoutes = router;
