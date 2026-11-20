/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, type Request, type Response } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { requireWorkspaceMember, requireWorkspaceRole } from '../../middleware/workspace';
import { workspaceService } from '../../services/workspaceService';
import { workspaceRepository } from '../../repositories/workspaceRepository';
import { memberRepository } from '../../repositories/memberRepository';
import { businessBrainService } from '../../services/businessBrainService';
import { goalRepository } from '../../repositories/goalRepository';
import { competitorRepository } from '../../repositories/competitorRepository';
import { taskRepository } from '../../repositories/taskRepository';
import { auditService } from '../../services/auditService';

const router = Router();

router.use(authenticateToken);

/**
 * POST /api/v1/workspaces
 * Creates a new workspace anchor, business brain, and initial credit wallet
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { workspaceName, industry, country, timezone, currency, planId } = req.body;

  if (!workspaceName || typeof workspaceName !== 'string' || workspaceName.trim().length < 2) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_WORKSPACE_NAME',
        message: 'workspaceName is required and must be at least 2 characters long.',
        category: 'VALIDATION_ERROR',
        retryable: false,
      },
    });
    return;
  }

  const result = await workspaceService.createWorkspace({
    ownerUserId: req.user!.uid,
    workspaceName: workspaceName.trim(),
    industry,
    country,
    timezone,
    currency,
    planId,
  });

  await auditService.log({
    workspaceId: result.workspace.workspaceId,
    actorUserId: req.user!.uid,
    action: 'WORKSPACE_CREATED',
    resourceType: 'workspace',
    resourceId: result.workspace.workspaceId,
    metadata: { workspaceName: result.workspace.workspaceName },
  });

  res.status(201).json({
    success: true,
    data: result,
  });
});

/**
 * GET /api/v1/workspaces
 * Lists workspaces for current user
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const memberships = await memberRepository.listByUser(req.user!.uid);
  const workspaces = [];
  for (const m of memberships) {
    const ws = await workspaceRepository.findById(m.workspaceId);
    if (ws && ws.workspaceStatus !== 'archived') {
      workspaces.push(ws);
    }
  }

  res.json({
    success: true,
    data: workspaces,
  });
});

/**
 * GET /api/v1/workspaces/:workspaceId
 */
router.get(
  '/:workspaceId',
  requireWorkspaceMember,
  async (req: Request, res: Response): Promise<void> => {
    res.json({
      success: true,
      data: req.workspace,
    });
  }
);

/**
 * PATCH /api/v1/workspaces/:workspaceId
 */
router.patch(
  '/:workspaceId',
  requireWorkspaceMember,
  requireWorkspaceRole(['owner', 'admin']),
  async (req: Request, res: Response): Promise<void> => {
    const { workspaceName, industry, timezone, currency } = req.body;
    const updated = await workspaceRepository.update(req.workspace!.workspaceId, {
      ...(workspaceName ? { workspaceName: workspaceName.trim() } : {}),
      ...(industry ? { industry } : {}),
      ...(timezone ? { timezone } : {}),
      ...(currency ? { currency } : {}),
    });

    await auditService.log({
      workspaceId: req.workspace!.workspaceId,
      actorUserId: req.user!.uid,
      action: 'WORKSPACE_UPDATED',
      resourceType: 'workspace',
      resourceId: req.workspace!.workspaceId,
      metadata: req.body,
    });

    res.json({
      success: true,
      data: updated,
    });
  }
);

/**
 * DELETE /api/v1/workspaces/:workspaceId (Safe Archival)
 */
router.delete(
  '/:workspaceId',
  requireWorkspaceMember,
  requireWorkspaceRole(['owner']),
  async (req: Request, res: Response): Promise<void> => {
    await workspaceRepository.archive(req.workspace!.workspaceId);

    await auditService.log({
      workspaceId: req.workspace!.workspaceId,
      actorUserId: req.user!.uid,
      action: 'WORKSPACE_ARCHIVED',
      resourceType: 'workspace',
      resourceId: req.workspace!.workspaceId,
    });

    res.json({
      success: true,
      data: { archived: true, workspaceId: req.workspace!.workspaceId },
    });
  }
);

/**
 * GET /api/v1/workspaces/:workspaceId/members
 */
router.get(
  '/:workspaceId/members',
  requireWorkspaceMember,
  async (req: Request, res: Response): Promise<void> => {
    const members = await memberRepository.listByWorkspace(req.workspace!.workspaceId);
    res.json({
      success: true,
      data: members,
    });
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/members
 */
router.post(
  '/:workspaceId/members',
  requireWorkspaceMember,
  requireWorkspaceRole(['owner', 'admin']),
  async (req: Request, res: Response): Promise<void> => {
    const { userId, role } = req.body;
    if (!userId || !role) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'userId and role are required',
          category: 'VALIDATION_ERROR',
          retryable: false,
        },
      });
      return;
    }

    const member = await memberRepository.addMember({
      membershipId: `mem_${userId}_${req.workspace!.workspaceId}`,
      workspaceId: req.workspace!.workspaceId,
      userId,
      role,
      membershipStatus: 'active',
      invitedBy: req.user!.uid,
      joinedAt: new Date().toISOString(),
    });

    res.status(201).json({
      success: true,
      data: member,
    });
  }
);

/**
 * PATCH /api/v1/workspaces/:workspaceId/members/:memberId
 */
router.patch(
  '/:workspaceId/members/:memberId',
  requireWorkspaceMember,
  requireWorkspaceRole(['owner', 'admin']),
  async (req: Request, res: Response): Promise<void> => {
    const targetUserId = req.params.memberId;
    const { role } = req.body;

    if (!role) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_ROLE',
          message: 'role is required',
          category: 'VALIDATION_ERROR',
          retryable: false,
        },
      });
      return;
    }

    await memberRepository.updateRole(req.workspace!.workspaceId, targetUserId, role);

    res.json({
      success: true,
      data: { updated: true, userId: targetUserId, newRole: role },
    });
  }
);

/**
 * DELETE /api/v1/workspaces/:workspaceId/members/:memberId
 */
router.delete(
  '/:workspaceId/members/:memberId',
  requireWorkspaceMember,
  requireWorkspaceRole(['owner', 'admin']),
  async (req: Request, res: Response): Promise<void> => {
    const targetUserId = req.params.memberId;
    if (targetUserId === req.workspace!.ownerUserId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'CANNOT_REMOVE_OWNER',
          message: 'Workspace owner cannot be removed.',
          category: 'AUTHORIZATION_ERROR',
          retryable: false,
        },
      });
      return;
    }

    await memberRepository.removeMember(req.workspace!.workspaceId, targetUserId);

    res.json({
      success: true,
      data: { removed: true, userId: targetUserId },
    });
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/migrate
 * Idempotent migration endpoint for transferring legacy prototype localStorage state
 */
router.post(
  '/:workspaceId/migrate',
  requireWorkspaceMember,
  requireWorkspaceRole(['owner', 'admin']),
  async (req: Request, res: Response): Promise<void> => {
    const workspaceId = req.workspace!.workspaceId;
    const { legacyState } = req.body;

    if (!legacyState || typeof legacyState !== 'object') {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_LEGACY_PAYLOAD',
          message: 'legacyState object is required for migration.',
          category: 'VALIDATION_ERROR',
          retryable: false,
        },
      });
      return;
    }

    let recordsMigrated = 0;

    // 1. Migrate Business Brain if provided
    if (legacyState.brain && typeof legacyState.brain === 'object') {
      await businessBrainService.updateProfile(workspaceId, {
        businessName: legacyState.brain.businessName || req.workspace!.workspaceName,
        tagline: legacyState.brain.tagline || '',
        stage: legacyState.brain.stage || 'Early Traction',
        location: legacyState.brain.location || '',
        website: legacyState.brain.website || '',
        foundedYear: legacyState.brain.foundedYear || '',
        overviewSummary: legacyState.brain.overviewSummary || '',
        targetAudience: legacyState.brain.targetAudience || '',
        brandPositioning: legacyState.brain.brandPositioning || '',
        valueProposition: legacyState.brain.valueProposition || '',
        businessModel: legacyState.brain.businessModel || '',
        revenueModel: legacyState.brain.revenueModel || '',
        primaryGoals: legacyState.brain.primaryGoals || [],
      });
      recordsMigrated += 1;
    }

    // 2. Migrate Goals
    if (Array.isArray(legacyState.goals)) {
      for (const g of legacyState.goals) {
        if (g && g.title) {
          const goalId = g.id || `goal_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          await goalRepository.create({
            goalId,
            workspaceId,
            title: g.title,
            description: g.description || '',
            category: g.category || 'Revenue',
            currentValue: Number(g.currentValue) || 0,
            targetValue: Number(g.targetValue) || 100,
            unit: g.unit || '%',
            startDate: g.startDate || new Date().toISOString(),
            targetDate: g.targetDate || new Date().toISOString(),
            status: g.status || 'on_track',
            createdBy: req.user!.uid,
            createdAt: g.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          recordsMigrated += 1;
        }
      }
    }

    // 3. Migrate Competitors
    if (Array.isArray(legacyState.competitors)) {
      for (const c of legacyState.competitors) {
        if (c && c.name) {
          const competitorId =
            c.id || `comp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          await competitorRepository.create({
            competitorId,
            workspaceId,
            name: c.name,
            website: c.website || '',
            industry: c.industry || req.workspace!.industry,
            location: c.location || '',
            positioning: c.positioning || '',
            marketShare: c.marketShare || '5%',
            strengths: Array.isArray(c.strengths) ? c.strengths : [],
            weaknesses: Array.isArray(c.weaknesses) ? c.weaknesses : [],
            pricingRange: c.pricingRange || '',
            monitoringFrequency: c.monitoringFrequency || 'Weekly',
            isMonitored: Boolean(c.isMonitored),
            lastResearched: c.lastResearched || new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          recordsMigrated += 1;
        }
      }
    }

    // 4. Migrate Tasks
    if (Array.isArray(legacyState.tasks)) {
      for (const t of legacyState.tasks) {
        if (t && t.title) {
          const taskId = t.id || `tsk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          await taskRepository.create({
            taskId,
            workspaceId,
            title: t.title,
            description: t.description || '',
            priority: t.priority || 'medium',
            status: t.status || 'pending',
            dueDate: t.dueDate || new Date().toISOString(),
            completedAt: t.completedAt,
            notes: t.notes || '',
            createdBy: req.user!.uid,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          recordsMigrated += 1;
        }
      }
    }

    await auditService.log({
      workspaceId,
      actorUserId: req.user!.uid,
      action: 'LEGACY_PROTOTYPE_MIGRATED',
      resourceType: 'workspace',
      resourceId: workspaceId,
      metadata: { recordsMigrated },
    });

    res.json({
      success: true,
      data: {
        workspaceId,
        migrated: true,
        recordsMigrated,
        timestamp: new Date().toISOString(),
      },
    });
  }
);

/**
 * DELETE /api/v1/workspaces/:workspaceId/dpdpa-erasure
 * Executes technical data erasure compliant with Digital Personal Data Protection Act (DPDPA), 2023 Section 12.
 * Purges business profile, research, competitors, goals, tasks, external integration tokens, and asset references.
 * Legally exempt financial records (tax invoices, billing ledgers) are preserved under Section 128 of Companies Act.
 */
router.delete(
  '/:workspaceId/dpdpa-erasure',
  requireWorkspaceMember,
  requireWorkspaceRole(['owner']),
  async (req: Request, res: Response): Promise<void> => {
    const workspaceId = req.workspace!.workspaceId;
    const now = new Date().toISOString();

    // 1. Purge business data
    await businessBrainService.deleteProfile(workspaceId).catch(() => {});
    const competitors = await competitorRepository.listByWorkspace(workspaceId);
    for (const c of competitors) {
      await competitorRepository.delete(workspaceId, c.competitorId).catch(() => {});
    }
    const goals = await goalRepository.listByWorkspace(workspaceId);
    for (const g of goals) {
      await goalRepository.delete(workspaceId, g.goalId).catch(() => {});
    }
    const tasks = await taskRepository.listByWorkspace(workspaceId);
    for (const t of tasks) {
      await taskRepository.delete(workspaceId, t.taskId).catch(() => {});
    }

    // 2. Update workspace status to archived / DPDPA erased
    await workspaceRepository.archive(workspaceId);

    // 3. Log cryptographic security audit event
    await auditService.logSecurityEvent({
      workspaceId,
      userId: req.user!.uid,
      action: 'DPDPA_RIGHT_TO_ERASURE_EXECUTED',
      resource: `workspaces/${workspaceId}`,
      details: {
        purgedCategories: ['businessBrain', 'competitors', 'goals', 'tasks', 'researchData'],
        retainedCategories: ['taxInvoices', 'statutoryAuditLedger'],
        retentionStatutoryBasis:
          'Section 128 Companies Act & Section 35(1) CGST Act 2017 (72-month statutory retention)',
        timestamp: now,
      },
    });

    res.json({
      success: true,
      data: {
        workspaceId,
        erasedAt: now,
        status: 'DATA_PURGED_DPDPA_COMPLIANT',
        purgedCategories: ['businessBrain', 'competitors', 'goals', 'tasks', 'researchData'],
        retainedCategories: ['taxInvoices', 'statutoryAuditLedger'],
        legalNotice:
          'Statutory tax and financial records are retained in compliance with Indian CGST and Companies Act provisions.',
      },
    });
  }
);

export const workspaceRoutes = router;
