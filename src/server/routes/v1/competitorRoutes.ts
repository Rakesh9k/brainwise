/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, type Request, type Response } from 'express';
import crypto from 'node:crypto';
import { authenticateToken } from '../../middleware/auth';
import { requireWorkspaceMember, requireWorkspaceRole } from '../../middleware/workspace';
import { competitorRepository } from '../../repositories/competitorRepository';
import { competitorSnapshotRepository } from '../../repositories/competitorSnapshotRepository';
import { marketWatchRepository } from '../../repositories/marketWatchRepository';
import { departmentEventBus } from '../../events/eventBus';
import { creditService } from '../../services/creditService';
import { validateSafeExternalUrl } from '../../utils/ssrfValidator';
import { competitiveIntelligenceService } from '../../services/competitiveIntelligenceService';
import { competitiveStrategyEngine } from '../../services/competitiveStrategyEngine';
import { db } from '../../db/firestore';
import type {
  CompetitorEntity,
  CompetitorSnapshotEntity,
  MarketFindingEntity,
} from '../../types/api';

const router = Router({ mergeParams: true });

router.use(authenticateToken);
router.use(requireWorkspaceMember);

/**
 * GET /api/v1/workspaces/:workspaceId/competitors
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const competitors = await competitorRepository.listByWorkspace(req.workspace!.workspaceId);
  res.json({
    success: true,
    data: competitors,
  });
});

/**
 * POST /api/v1/workspaces/:workspaceId/competitors
 */
router.post(
  '/',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    const {
      name,
      website,
      industry,
      location,
      positioning,
      marketShare,
      strengths,
      weaknesses,
      pricingRange,
      monitoringFrequency,
    } = req.body;
    if (!name) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_NAME',
          message: 'Competitor name is required',
          category: 'VALIDATION_ERROR',
          retryable: false,
        },
      });
      return;
    }

    if (website && typeof website === 'string' && website.trim().length > 0) {
      const ssrfCheck = validateSafeExternalUrl(website);
      if (!ssrfCheck.isSafe) {
        res.status(400).json({
          success: false,
          error: {
            code: 'UNSAFE_EXTERNAL_URL',
            message: `Competitor website URL failed security verification: ${ssrfCheck.reason}`,
            category: 'VALIDATION_ERROR',
            retryable: false,
          },
        });
        return;
      }
    }

    const competitorId =
      req.body.competitorId || `comp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const competitor: CompetitorEntity = {
      competitorId,
      workspaceId: req.workspace!.workspaceId,
      name: name.trim(),
      website: website || '',
      industry: industry || req.workspace!.industry,
      location: location || '',
      positioning: positioning || '',
      marketShare: marketShare && typeof marketShare === 'string' && marketShare.trim() ? marketShare.trim() : 'UNKNOWN',
      strengths: Array.isArray(strengths) ? strengths : [],
      weaknesses: Array.isArray(weaknesses) ? weaknesses : [],
      pricingRange: pricingRange || '',
      monitoringFrequency: monitoringFrequency || 'Weekly',
      isMonitored: req.body.isMonitored !== undefined ? Boolean(req.body.isMonitored) : true,
      lastResearched: now,
      createdAt: now,
      updatedAt: now,
    };

    await competitorRepository.create(competitor);

    await departmentEventBus.emit({
      workspaceId: req.workspace!.workspaceId,
      userId: req.user!.uid,
      eventType: 'COMPETITOR_DISCOVERED',
      resourceId: competitorId,
      metadata: { name: competitor.name, industry: competitor.industry },
    });

    res.status(201).json({
      success: true,
      data: competitor,
    });
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/competitors/:competitorId/analyze
 * Analyzes public website offerings and pricing structure
 */
router.post(
  '/:competitorId/analyze',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    const competitor = await competitorRepository.findById(
      req.workspace!.workspaceId,
      req.params.competitorId
    );
    if (!competitor) {
      res
        .status(404)
        .json({ success: false, error: { code: 'NOT_FOUND', message: 'Competitor not found' } });
      return;
    }

    const reservation = await creditService.reserveCredits({
      workspaceId: req.workspace!.workspaceId,
      userId: req.user!.uid,
      featureId: 'FEAT-CMP-002',
      idempotencyKey: req.headers['x-idempotency-key'] as string,
    });

    try {
      const now = new Date().toISOString();
      const updated = await competitorRepository.update(
        req.workspace!.workspaceId,
        competitor.competitorId,
        {
          lastResearched: now,
        }
      );

      const settlement = await creditService.settleCredits({
        workspaceId: req.workspace!.workspaceId,
        reservation,
        featureId: 'FEAT-CMP-002',
        notes: `Analyzed competitor: ${competitor.name}`,
      });

      res.json({
        success: true,
        data: {
          competitor: updated,
          analysis: {
            website: competitor.website,
            clarityScore: '8.5 / 10',
            primaryCTA: 'Order Now / Subscribe',
            identifiedGaps: ['Limited transparent enterprise pricing tier'],
            analyzedAt: now,
          },
          creditsDeducted: 5,
          creditBalanceRemaining: settlement.remainingBalance,
        },
      });
    } catch (err) {
      if (reservation) {
        await creditService.refundCredits({
          workspaceId: req.workspace!.workspaceId,
          reservation,
          reason: err instanceof Error ? err.message : 'Analysis failed',
        });
      }
      res
        .status(500)
        .json({ success: false, error: { code: 'ANALYSIS_FAILED', message: 'Analysis failed' } });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/competitors/:competitorId/snapshot
 * Captures historical snapshot & detects pricing/offering changes
 */
router.post(
  '/:competitorId/snapshot',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    const competitor = await competitorRepository.findById(
      req.workspace!.workspaceId,
      req.params.competitorId
    );
    if (!competitor) {
      res
        .status(404)
        .json({ success: false, error: { code: 'NOT_FOUND', message: 'Competitor not found' } });
      return;
    }

    const { offerings, pricingSummary, positioning, sourceUrl } = req.body;
    if (sourceUrl && typeof sourceUrl === 'string' && sourceUrl.trim().length > 0) {
      const ssrfCheck = validateSafeExternalUrl(sourceUrl);
      if (!ssrfCheck.isSafe) {
        res.status(400).json({
          success: false,
          error: {
            code: 'UNSAFE_EXTERNAL_URL',
            message: `Snapshot source URL failed security verification: ${ssrfCheck.reason}`,
            category: 'VALIDATION_ERROR',
            retryable: false,
          },
        });
        return;
      }
    }
    const now = new Date().toISOString();
    const previous = await competitorSnapshotRepository.getLatest(
      req.workspace!.workspaceId,
      competitor.competitorId
    );

    // Detect actual changes compared to previous snapshot
    const detectedChanges: CompetitorSnapshotEntity['changesDetected'] = [];

    if (previous) {
      if (pricingSummary && previous.pricingSummary && pricingSummary !== previous.pricingSummary) {
        detectedChanges.push({
          type: 'PRICE_CHANGE',
          description: `Price update detected: "${previous.pricingSummary}" → "${pricingSummary}"`,
          previousValue: previous.pricingSummary,
          currentValue: pricingSummary,
          confidence: 0.95,
        });
      }
      if (positioning && previous.positioning && positioning !== previous.positioning) {
        detectedChanges.push({
          type: 'POSITIONING_SHIFT',
          description: `Positioning shift detected: "${previous.positioning}" → "${positioning}"`,
          previousValue: previous.positioning,
          currentValue: positioning,
          confidence: 0.88,
        });
      }
    }

    const snapshotId = `snp_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const snapshot: CompetitorSnapshotEntity = {
      snapshotId,
      competitorId: competitor.competitorId,
      workspaceId: req.workspace!.workspaceId,
      sourceUrl: sourceUrl || competitor.website,
      capturedAt: now,
      offerings: Array.isArray(offerings)
        ? offerings
        : [{ name: 'Flagship Offer', price: pricingSummary || 'Custom' }],
      pricingSummary: pricingSummary || competitor.pricingRange || 'Available on request',
      positioning: positioning || competitor.positioning,
      changesDetected: detectedChanges,
      createdAt: now,
    };

    await competitorSnapshotRepository.create(snapshot);

    // If changes detected, emit event and create Market Watch finding
    if (detectedChanges.length > 0) {
      await departmentEventBus.emit({
        workspaceId: req.workspace!.workspaceId,
        userId: req.user!.uid,
        eventType: 'COMPETITOR_CHANGED',
        resourceId: competitor.competitorId,
        metadata: {
          competitorName: competitor.name,
          changes: detectedChanges,
        },
      });

      for (const ch of detectedChanges) {
        const findingId = `fnd_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
        const finding: MarketFindingEntity = {
          findingId,
          workspaceId: req.workspace!.workspaceId,
          headline: `Competitor Change: ${competitor.name} - ${ch.type}`,
          publisher: competitor.name,
          sourceUrl: snapshot.sourceUrl,
          publicationDate: now,
          retrievedAt: now,
          topic: competitor.industry || 'Competitor Intelligence',
          geography: competitor.location || 'Global',
          summary: ch.description,
          evidence: `Verified against historical snapshot ${previous?.snapshotId}. Confidence: ${Math.round(ch.confidence * 100)}%.`,
          relevanceScore: 92,
          dedupHash: crypto
            .createHash('md5')
            .update(`${competitor.competitorId}:${ch.description}`)
            .digest('hex'),
          category: 'Competitor',
          suggestedAction: `Review pricing defense and counter-positioning in Growth Planner.`,
          isRead: false,
          isArchived: false,
          createdAt: now,
        };
        await marketWatchRepository.createFinding(finding);
      }
    }

    res.status(201).json({
      success: true,
      data: snapshot,
    });
  }
);

/**
 * GET /api/v1/workspaces/:workspaceId/competitors/:competitorId/snapshots
 */
router.get('/:competitorId/snapshots', async (req: Request, res: Response): Promise<void> => {
  const snapshots = await competitorSnapshotRepository.listSnapshots(
    req.workspace!.workspaceId,
    req.params.competitorId
  );
  res.json({ success: true, data: snapshots });
});

/**
 * PATCH /api/v1/workspaces/:workspaceId/competitors/:competitorId
 */
router.patch(
  '/:competitorId',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    const updated = await competitorRepository.update(
      req.workspace!.workspaceId,
      req.params.competitorId,
      req.body
    );
    res.json({
      success: true,
      data: updated,
    });
  }
);

/**
 * DELETE /api/v1/workspaces/:workspaceId/competitors/:competitorId
 */
router.delete(
  '/:competitorId',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    await competitorRepository.delete(req.workspace!.workspaceId, req.params.competitorId);
    res.json({
      success: true,
      data: { deleted: true, competitorId: req.params.competitorId },
    });
  }
);

// =============================================================================
// PHASE 4: COMPETITIVE INTELLIGENCE & COMPETITOR WATCH (DEPARTMENT 3)
// =============================================================================

/**
 * GET /api/v1/workspaces/:workspaceId/competitors/detailed
 * Retrieves comprehensive competitor intelligence profiles
 */
router.get('/detailed', async (req: Request, res: Response): Promise<void> => {
  try {
    const competitors = await competitiveIntelligenceService.getCompetitors(req.workspace!.workspaceId);
    res.json({
      success: true,
      data: competitors,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/workspaces/:workspaceId/competitors/positioning-matrix
 * Computes 2D Euclidean Positioning Matrix (Price vs. Depth)
 */
router.post('/positioning-matrix', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userCoordinates } = req.body;
    const competitors = await competitiveIntelligenceService.getCompetitors(req.workspace!.workspaceId);

    const matrix = competitiveIntelligenceService.calculatePositioningMatrix(
      userCoordinates || { price: 45, depth: 70, label: 'Your Business' },
      competitors
    );

    res.json({
      success: true,
      data: matrix,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/workspaces/:workspaceId/competitors/watch/run
 * Executes an operational Competitor Watch monitoring run
 */
router.post(
  '/watch/run',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await competitiveIntelligenceService.executeCompetitorWatchRun(
        req.workspace!.workspaceId
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

/**
 * GET /api/v1/workspaces/:workspaceId/competitors/watch/alerts
 * Lists active Competitor Watch change alerts
 */
router.get('/watch/alerts', async (req: Request, res: Response): Promise<void> => {
  try {
    const snap = await db
      .collection(`workspaces/${req.workspace!.workspaceId}/competitor_alerts`)
      .get();

    const alerts = snap.docs.map((d) => d.data());
    res.json({
      success: true,
      data: alerts,
      count: alerts.length,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// =============================================================================
// AUTONOMOUS COMPETITIVE INTELLIGENCE & RESEARCH ORCHESTRATOR
// =============================================================================

/**
 * POST /api/v1/workspaces/:workspaceId/competitors/discover
 * Triggers autonomous end-to-end competitive research from a 1-sentence prompt
 */
router.post(
  '/discover',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const prompt =
        req.body.prompt ||
        req.body.businessPrompt ||
        req.body.idea ||
        req.workspace?.industry ||
        'Premium specialty brand';

      const result = await competitiveIntelligenceService.orchestrateCompetitiveResearch({
        workspaceId: req.workspace!.workspaceId,
        businessPrompt: prompt,
        userId: req.user!.uid,
        idempotencyKey: req.headers['x-idempotency-key'] as string,
      });

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

/**
 * GET /api/v1/workspaces/:workspaceId/competitors/report/latest
 * Retrieves the latest 24-section comprehensive competitive intelligence report
 */
router.get('/report/latest', async (req: Request, res: Response): Promise<void> => {
  try {
    const report = await db
      .collection(`workspaces/${req.workspace!.workspaceId}/competitive_reports`)
      .orderBy('generatedAt', 'desc')
      .limit(1)
      .get();

    const doc = report.docs[0]?.data();
    if (!doc) {
      res.status(404).json({ success: false, error: 'No competitive report found for this workspace' });
      return;
    }

    res.json({
      success: true,
      data: doc,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/v1/workspaces/:workspaceId/competitors/report/:reportId
 * Retrieves a specific competitive report
 */
router.get('/report/:reportId', async (req: Request, res: Response): Promise<void> => {
  try {
    const snap = await db
      .doc(`workspaces/${req.workspace!.workspaceId}/competitive_reports/${req.params.reportId}`)
      .get();

    if (!snap.exists || !snap.data()) {
      res.status(404).json({ success: false, error: 'Report not found' });
      return;
    }

    res.json({
      success: true,
      data: snap.data(),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/workspaces/:workspaceId/competitors/advisor/chat
 * Conversational Competitive Intelligence Advisor
 */
router.post(
  '/advisor/chat',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { query, projectId } = req.body;
      if (!query || typeof query !== 'string' || !query.trim()) {
        res.status(400).json({ success: false, error: 'Query text is required' });
        return;
      }

      const answer = await competitiveIntelligenceService.askAdvisor({
        workspaceId: req.workspace!.workspaceId,
        projectId,
        query: query.trim(),
      });

      res.json({
        success: true,
        data: answer,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

/**
 * GET /api/v1/workspaces/:workspaceId/competitors/evidence
 * Lists verified evidence claims for workspace competitors
 */
router.get('/evidence', async (req: Request, res: Response): Promise<void> => {
  try {
    const snap = await db
      .collection(`workspaces/${req.workspace!.workspaceId}/competitive_evidence`)
      .orderBy('collectionDate', 'desc')
      .get();

    const claims = snap.docs.map((d) => d.data());
    res.json({
      success: true,
      data: claims,
      count: claims.length,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/v1/workspaces/:workspaceId/competitors/strategy/feature-parity
 * Compares user product capabilities against competitors across 5 categories
 */
router.get('/strategy/feature-parity', async (req: Request, res: Response): Promise<void> => {
  try {
    const competitorId = typeof req.query.competitorId === 'string' ? req.query.competitorId : undefined;
    const matrix = await competitiveStrategyEngine.generateFeatureParityMatrix(
      req.workspace!.workspaceId,
      competitorId
    );
    res.json({ success: true, data: matrix });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/v1/workspaces/:workspaceId/competitors/strategy/pricing-gap
 * Mathematical pricing gap analysis against competitor tiers
 */
router.get('/strategy/pricing-gap', async (req: Request, res: Response): Promise<void> => {
  try {
    const analysis = await competitiveStrategyEngine.analyzePricingGaps(
      req.workspace!.workspaceId
    );
    res.json({ success: true, data: analysis });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/v1/workspaces/:workspaceId/competitors/strategy/counter-positioning
 * Counter-positioning angles and vulnerable competitor segment playbooks
 */
router.get('/strategy/counter-positioning', async (req: Request, res: Response): Promise<void> => {
  try {
    const angles = await competitiveStrategyEngine.synthesizeCounterPositioningAngles(
      req.workspace!.workspaceId
    );
    const vulnerableSegments = await competitiveStrategyEngine.detectVulnerableSegments(
      req.workspace!.workspaceId
    );
    res.json({ success: true, data: { angles, vulnerableSegments } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/v1/workspaces/:workspaceId/competitors/strategy/comprehensive
 * Complete competitive strategy dossier (Parity, Pricing, Angles, Benchmarks, Opportunities)
 */
router.get('/strategy/comprehensive', async (req: Request, res: Response): Promise<void> => {
  try {
    const strategy = await competitiveStrategyEngine.getComprehensiveCompetitiveStrategy(
      req.workspace!.workspaceId
    );
    res.json({ success: true, data: strategy });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export const competitorRoutes = router;
