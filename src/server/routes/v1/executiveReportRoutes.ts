/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, type Request, type Response } from 'express';
import crypto from 'node:crypto';
import { authenticateToken } from '../../middleware/auth';
import { requireWorkspaceMember, requireWorkspaceRole } from '../../middleware/workspace';
import { executiveReportRepository } from '../../repositories/executiveReportRepository';
import { businessProfileRepository } from '../../repositories/businessProfileRepository';
import { competitorRepository } from '../../repositories/competitorRepository';
import { marketWatchRepository } from '../../repositories/marketWatchRepository';
import { experimentRepository } from '../../repositories/experimentRepository';
import { taskRepository } from '../../repositories/taskRepository';
import { goalRepository } from '../../repositories/goalRepository';
import { departmentEventBus } from '../../events/eventBus';
import { creditService } from '../../services/creditService';
import { unifiedReportService } from '../../services/unifiedReportService';
import type { ExecutiveReportEntity } from '../../types/api';

const router = Router({ mergeParams: true });

router.use(authenticateToken);
router.use(requireWorkspaceMember);

/**
 * GET /api/v1/workspaces/:workspaceId/reports
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const reports = await executiveReportRepository.listByWorkspace(req.workspace!.workspaceId);
  res.json({ success: true, data: reports });
});

/**
 * POST /api/v1/workspaces/:workspaceId/reports/generate
 * Synthesizes an executive report from live workspace state
 * Credits: 5 credits (FEAT-REP-001)
 */
router.post(
  '/generate',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    const { reportType, title } = req.body;
    const workspaceId = req.workspace!.workspaceId;
    const userId = req.user!.uid;

    const reservation = await creditService.reserveCredits({
      workspaceId,
      userId,
      featureId: 'FEAT-REP-001',
      idempotencyKey: req.headers['x-idempotency-key'] as string,
    });

    try {
      const now = new Date().toISOString();
      const rawProfile = await businessProfileRepository.getProfile(workspaceId);
      const profile = rawProfile || {
        businessName: req.workspace?.workspaceName || 'My Business',
        version: 1,
        valueProposition: 'Differentiated quality',
        approvalStatus: 'APPROVED' as const,
      };
      const competitors = await competitorRepository.listByWorkspace(workspaceId);
      const findings = await marketWatchRepository.listFindings(workspaceId, { limit: 10 });
      const experiments = await experimentRepository.listByWorkspace(workspaceId);
      const tasks = await taskRepository.listByWorkspace(workspaceId);
      const goals = await goalRepository.listByWorkspace(workspaceId);

      const completedTasks = tasks.filter((t) => t.status === 'completed').length;
      const pendingTasks = tasks.filter(
        (t) => t.status === 'pending' || t.status === 'in_progress'
      ).length;

      const reportId = `rep_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      const report: ExecutiveReportEntity = {
        reportId,
        workspaceId,
        reportType: reportType || 'WEEKLY_INTELLIGENCE',
        title: title || `Weekly Intelligence Brief - ${profile.businessName}`,
        period: `${now.slice(0, 10)} (W${Math.ceil(new Date().getDate() / 7)})`,
        executiveSummary: `${profile.businessName} maintained operational velocity with ${completedTasks} completed action items and ${experiments.filter((e) => e.status === 'completed').length} completed growth experiments. Business Brain is currently version ${profile.version} (${profile.approvalStatus || 'APPROVED'}).`,
        businessUpdates: [
          `Ground Truth: Value proposition firmly grounded in "${profile.valueProposition || 'differentiated quality'}".`,
          `Operational Pace: ${completedTasks} tasks executed across priority sprints.`,
        ],
        marketDevelopments: findings.slice(0, 4).map((f) => `${f.headline} (${f.publisher})`),
        competitorChanges: competitors
          .slice(0, 3)
          .map(
            (c) =>
              `${c.name}: Tracked in ${c.industry}. Status: ${c.isMonitored ? 'Active Watchlist' : 'Paused'}`
          ),
        activeExperiments: experiments.map((e) => ({
          title: e.title,
          status: e.status,
          outcome: e.results,
        })),
        taskProgress: {
          completed: completedTasks,
          pending: pendingTasks,
          overdue: 0,
        },
        goalProgress: goals.map((g) => ({
          title: g.title || '',
          current: g.currentValue,
          target: g.targetValue,
          unit: g.unit,
        })),
        recommendedActions: [
          `Accelerate high-margin experiments for ${profile.businessName}.`,
          `Review rival pricing shifts in Competitive Intelligence watchlist.`,
        ],
        businessBrainVersion: profile.version,
        sourceReferences: findings.map((f) => f.sourceUrl).filter(Boolean),
        createdAt: now,
      };

      const saved = await executiveReportRepository.create(report);

      await departmentEventBus.emit({
        workspaceId,
        userId,
        eventType: 'REPORT_GENERATED',
        resourceId: reportId,
        metadata: { title: saved.title, reportType: saved.reportType },
      });

      const settlement = await creditService.settleCredits({
        workspaceId,
        reservation,
        featureId: 'FEAT-REP-001',
        notes: `Executive Report: ${saved.title}`,
      });

      res.status(201).json({
        success: true,
        data: saved,
        meta: {
          creditsDeducted: 5,
          creditBalanceRemaining: settlement.remainingBalance,
        },
      });
    } catch (err) {
      if (reservation) {
        await creditService.refundCredits({
          workspaceId,
          reservation,
          reason: err instanceof Error ? err.message : 'Report generation failed',
        });
      }
      res.status(500).json({
        success: false,
        error: { code: 'REPORT_FAILED', message: 'Report generation failed' },
      });
    }
  }
);

/**
 * GET /api/v1/workspaces/:workspaceId/reports/:reportId
 */
router.get('/:reportId', async (req: Request, res: Response): Promise<void> => {
  const report = await executiveReportRepository.get(
    req.workspace!.workspaceId,
    req.params.reportId
  );
  if (!report) {
    res
      .status(404)
      .json({ success: false, error: { code: 'NOT_FOUND', message: 'Report not found' } });
    return;
  }
  res.json({ success: true, data: report });
});

/**
 * GET /api/v1/workspaces/:workspaceId/reports/:reportId/export-csv
 */
router.get('/:reportId/export-csv', async (req: Request, res: Response): Promise<void> => {
  const report = await executiveReportRepository.get(
    req.workspace!.workspaceId,
    req.params.reportId
  );
  if (!report) {
    res
      .status(404)
      .json({ success: false, error: { code: 'NOT_FOUND', message: 'Report not found' } });
    return;
  }

  const rows = [
    ['Metric', 'Value'],
    ['Report Title', `"${report.title.replace(/"/g, '""')}"`],
    ['Report Type', report.reportType],
    ['Period', report.period],
    ['Brain Version', String(report.businessBrainVersion)],
    ['Tasks Completed', String(report.taskProgress.completed)],
    ['Tasks Pending', String(report.taskProgress.pending)],
    ['Active Experiments', String(report.activeExperiments.length)],
    ['Executive Summary', `"${report.executiveSummary.replace(/"/g, '""')}"`],
  ];

  const csvContent = rows.map((r) => r.join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${report.reportId}.csv"`);
  res.send(csvContent);
});

/**
 * POST /api/v1/workspaces/:workspaceId/reports/dossier/generate
 * Generates an interconnected 7-section Unified Executive Dossier
 */
router.post(
  '/dossier/generate',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const workspaceId = req.workspace!.workspaceId;
      const { title, monthlyPrice } = req.body;
      const dossier = await unifiedReportService.generateUnifiedDossier({
        workspaceId,
        title,
        monthlyPrice,
      });
      res.json({ success: true, data: dossier });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'DOSSIER_GENERATION_FAILED', message: err.message },
      });
    }
  }
);

/**
 * GET /api/v1/workspaces/:workspaceId/reports/dossier/:dossierId
 * Retrieves a unified executive dossier
 */
router.get(
  '/dossier/:dossierId',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const workspaceId = req.workspace!.workspaceId;
      const dossier = await unifiedReportService.getDossier(workspaceId, req.params.dossierId);
      if (!dossier) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Dossier not found' } });
        return;
      }
      res.json({ success: true, data: dossier });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'DOSSIER_FETCH_FAILED', message: err.message },
      });
    }
  }
);

/**
 * GET /api/v1/workspaces/:workspaceId/reports/dossier/:dossierId/export-html
 * Returns self-contained, print-ready HTML for the dossier
 */
router.get(
  '/dossier/:dossierId/export-html',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const workspaceId = req.workspace!.workspaceId;
      const dossier = await unifiedReportService.getDossier(workspaceId, req.params.dossierId);
      if (!dossier) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Dossier not found' } });
        return;
      }
      const html = unifiedReportService.formatHtmlExport(dossier);
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'HTML_EXPORT_FAILED', message: err.message },
      });
    }
  }
);

/**
 * GET /api/v1/workspaces/:workspaceId/reports/dossier/:dossierId/export-csv
 * Returns structured CSV data export for the dossier
 */
router.get(
  '/dossier/:dossierId/export-csv',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const workspaceId = req.workspace!.workspaceId;
      const dossier = await unifiedReportService.getDossier(workspaceId, req.params.dossierId);
      if (!dossier) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Dossier not found' } });
        return;
      }
      const csv = unifiedReportService.formatCsvExport(dossier);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${dossier.dossierId}.csv"`);
      res.send(csv);
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'CSV_EXPORT_FAILED', message: err.message },
      });
    }
  }
);

export const executiveReportRoutes = router;
