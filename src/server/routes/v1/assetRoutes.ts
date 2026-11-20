/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, type Request, type Response } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { requireWorkspaceMember, requireWorkspaceRole } from '../../middleware/workspace';
import { brandAssetRepository } from '../../repositories/brandAssetRepository';
import { brandIdentityRepository } from '../../repositories/brandIdentityRepository';
import { storageService } from '../../services/storageService';
import { aiOrchestrationService } from '../../services/aiOrchestrationService';
import { departmentEventBus } from '../../events/eventBus';
import type { BrandAssetEntity, BrandIdentityEntity } from '../../types/api';

const router = Router({ mergeParams: true });

router.use(authenticateToken);
router.use(requireWorkspaceMember);

/**
 * GET /api/v1/workspaces/:workspaceId/assets
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const category = req.query.category as string | undefined;
  const assets = await brandAssetRepository.listByWorkspace(req.workspace!.workspaceId, {
    category,
    status: 'active',
  });
  res.json({
    success: true,
    data: assets,
  });
});

/**
 * POST /api/v1/workspaces/:workspaceId/assets/upload-url
 * Generates an authenticated, signed upload URL with MIME and size constraints
 */
router.post(
  '/upload-url',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    const { fileName, mimeType, fileSizeBytes, folder } = req.body;

    if (!fileName || !mimeType) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_FILE_METADATA',
          message: 'fileName and mimeType are required.',
          category: 'VALIDATION_ERROR',
          retryable: false,
        },
      });
      return;
    }

    try {
      const signed = await storageService.generateSignedUploadUrl({
        workspaceId: req.workspace!.workspaceId,
        folder: folder || 'brand',
        fileName,
        mimeType,
        fileSizeBytes,
      });

      res.json({
        success: true,
        data: signed,
      });
    } catch (err) {
      res.status(400).json({
        success: false,
        error: {
          code: 'STORAGE_AUTHORIZATION_FAILED',
          message: err instanceof Error ? err.message : 'Failed to authorize storage upload',
          category: 'VALIDATION_ERROR',
          retryable: false,
        },
      });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/assets/:assetId/complete-upload
 * Records asset metadata in database after file upload completes
 */
router.post(
  '/:assetId/complete-upload',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    const { name, category, assetType, storagePath, fileSize, mimeType, svgContent } = req.body;
    const assetId = req.params.assetId;
    const now = new Date().toISOString();

    const asset: BrandAssetEntity = {
      assetId,
      workspaceId: req.workspace!.workspaceId,
      name: name || 'Uploaded Asset',
      category: category || 'Collateral',
      assetType: assetType || 'png',
      storagePath: storagePath || `workspaces/${req.workspace!.workspaceId}/brand/${assetId}`,
      fileSize: Number(fileSize) || 1024,
      mimeType: mimeType || 'image/png',
      svgContent,
      version: 1,
      status: 'active',
      createdBy: req.user!.uid,
      createdAt: now,
      updatedAt: now,
    };

    await brandAssetRepository.create(asset);

    res.status(201).json({
      success: true,
      data: asset,
    });
  }
);

/**
 * GET /api/v1/workspaces/:workspaceId/assets/:assetId/download-url
 * Generates an authenticated signed download URL with 15-minute expiration
 */
router.get('/:assetId/download-url', async (req: Request, res: Response): Promise<void> => {
  const asset = await brandAssetRepository.findById(req.workspace!.workspaceId, req.params.assetId);
  if (!asset) {
    res.status(404).json({
      success: false,
      error: {
        code: 'ASSET_NOT_FOUND',
        message: `Asset '${req.params.assetId}' not found.`,
        category: 'NOT_FOUND',
        retryable: false,
      },
    });
    return;
  }

  try {
    const signed = await storageService.generateSignedDownloadUrl({
      workspaceId: req.workspace!.workspaceId,
      storagePath: asset.storagePath,
    });

    res.json({
      success: true,
      data: signed,
    });
  } catch (err) {
    res.status(403).json({
      success: false,
      error: {
        code: 'CROSS_TENANT_ACCESS_DENIED',
        message: err instanceof Error ? err.message : 'Access denied to storage asset',
        category: 'AUTHORIZATION_ERROR',
        retryable: false,
      },
    });
  }
});

/**
 * POST /api/v1/workspaces/:workspaceId/assets/generate
 * Generates a brand vector SVG asset
 * Credits: 5 credits
 * STRICT VIDEO EXCLUSION: SVG ONLY
 */
router.post(
  '/generate',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    const { name, category, conceptPrompt } = req.body;

    const result = await aiOrchestrationService.generateBrandAssetSvg({
      workspaceId: req.workspace!.workspaceId,
      userId: req.user!.uid,
      name: name || 'Brand Vector Concept',
      category: category || 'Logos',
      conceptPrompt: conceptPrompt || 'Clean luxury vector mark',
      idempotencyKey: req.headers['x-idempotency-key'] as string,
    });

    res.status(201).json({
      success: true,
      data: result.asset,
      meta: {
        creditsDeducted: result.creditsDeducted,
        creditBalanceRemaining: result.creditBalanceRemaining,
        modelUsed: result.modelUsed,
      },
    });
  }
);

/**
 * GET /api/v1/workspaces/:workspaceId/assets/brand-identity
 */
router.get('/brand-identity', async (req: Request, res: Response): Promise<void> => {
  const latest = await brandIdentityRepository.getLatest(req.workspace!.workspaceId);
  res.json({ success: true, data: latest });
});

/**
 * POST /api/v1/workspaces/:workspaceId/assets/brand-identity
 * Saves & locks an approved Brand Identity version
 */
router.post(
  '/brand-identity',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    const {
      brandName,
      tagline,
      mission,
      vision,
      personality,
      voice,
      tone,
      palette,
      typography,
      visualDirection,
      logoDirection,
      approvalStatus,
    } = req.body;
    const now = new Date().toISOString();
    const latest = await brandIdentityRepository.getLatest(req.workspace!.workspaceId);
    const nextVersion = (latest?.version || 0) + 1;
    const brandIdentityId = `bid_${Date.now()}_v${nextVersion}`;

    const identity: BrandIdentityEntity = {
      brandIdentityId,
      workspaceId: req.workspace!.workspaceId,
      version: nextVersion,
      brandName: brandName || 'Brand',
      tagline: tagline || '',
      mission: mission || '',
      vision: vision || '',
      personality: Array.isArray(personality) ? personality : ['Refined', 'Innovative'],
      voice: Array.isArray(voice) ? voice : ['Authoritative', 'Direct'],
      tone: tone || 'Confident, understated elegance',
      palette: palette || {
        primary: '#FF7417',
        secondary: '#1C1917',
        accent: '#D97706',
        neutral: '#78716C',
        background: '#FAF9F6',
      },
      typography: typography || {
        heading: 'Plus Jakarta Sans',
        body: 'Inter',
      },
      visualDirection:
        visualDirection || 'Minimalist architectural vectors and disciplined whitespace',
      logoDirection: logoDirection || 'Geometric monogram',
      approvalStatus: approvalStatus || 'APPROVED',
      approvedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    const saved = await brandIdentityRepository.save(identity);

    await departmentEventBus.emit({
      workspaceId: req.workspace!.workspaceId,
      userId: req.user!.uid,
      eventType: 'BRAND_IDENTITY_APPROVED',
      resourceId: brandIdentityId,
      resourceVersion: nextVersion,
      metadata: { brandName: saved.brandName, version: nextVersion },
    });

    res.status(201).json({ success: true, data: saved });
  }
);

/**
 * DELETE /api/v1/workspaces/:workspaceId/assets/:assetId
 */
router.delete(
  '/:assetId',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    await brandAssetRepository.delete(req.workspace!.workspaceId, req.params.assetId);
    res.json({
      success: true,
      data: { archived: true, assetId: req.params.assetId },
    });
  }
);

export const assetRoutes = router;
