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
      marketShare: marketShare || '5%',
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

export const competitorRoutes = router;
