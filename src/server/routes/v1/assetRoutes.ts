/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, type Request, type Response } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { requireWorkspaceMember, requireWorkspaceRole } from '../../middleware/workspace';
import { brandAssetRepository } from '../../repositories/brandAssetRepository';
import { brandIdentityRepository } from '../../repositories/brandIdentityRepository';
import { brandStudioRepository } from '../../repositories/brandStudioRepository';
import { brandIntelligenceEngine } from '../../services/brandIntelligenceEngine';
import { logoDesignEngine } from '../../services/logoDesignEngine';
import { brandGuidelinesEngine } from '../../services/brandGuidelinesEngine';
import { creativeAssetsEngine } from '../../services/creativeAssetsEngine';
import { brandLaunchService } from '../../services/brandLaunchService';
import { trademarkClearanceService } from '../../services/trademarkClearanceService';
import { printPrepressEngine, COLOR_PROFILE_TAC_LIMITS } from '../../services/printPrepressEngine';
import { vectorGlyphEngine } from '../../services/vectorGlyphEngine';
import { storageService } from '../../services/storageService';
import { aiOrchestrationService } from '../../services/aiOrchestrationService';
import { brandGuardianService } from '../../services/brandGuardianService';
import { printPackagingService } from '../../services/printPackagingService';
import { unifiedAiAssetIntelligenceService } from '../../services/unifiedAiAssetIntelligenceService';
import { conversationalAssetAssistantService } from '../../services/conversationalAssetAssistantService';
import { assetEcosystemGatewayService } from '../../services/assetEcosystemGatewayService';
import { assetProductionHardeningService } from '../../services/assetProductionHardeningService';
import { assetIntelligenceExtensionsService } from '../../services/assetIntelligenceExtensionsService';
import { socialMediaIntelligenceService } from '../../services/socialMediaIntelligenceService';
import { enterpriseArchivalService } from '../../services/enterpriseArchivalService';
import { brandStudioService } from '../../services/brandStudioService';
import { createTransparentPngBuffer } from '../../services/logoDesignEngine';
import { departmentEventBus } from '../../events/eventBus';
import type { BrandIdentityEntity } from '../../types/api';

const router = Router({ mergeParams: true });

router.use(authenticateToken);
router.use(requireWorkspaceMember);

/**
 * GET /api/v1/workspaces/:workspaceId/assets
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const category = req.query.category as string | undefined;
  const section = req.query.section as string | undefined;
  const folder = req.query.folder as string | undefined;
  const status = req.query.status as string | undefined;
  const collectionId = req.query.collectionId as string | undefined;
  const tags = req.query.tags ? (req.query.tags as string).split(',').map((t) => t.trim()) : undefined;
  const search = req.query.search as string | undefined;
  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  const offset = req.query.offset ? Number(req.query.offset) : undefined;

  const assets = await brandAssetRepository.listByWorkspace(req.workspace!.workspaceId, {
    category,
    section: section || folder,
    folder,
    status,
    collectionId,
    tags,
    search,
    limit,
    offset,
  });
  res.json({
    success: true,
    data: assets,
  });
});

/**
 * POST /api/v1/workspaces/:workspaceId/assets/direct-upload
 * Local dev & fallback direct upload endpoint with HMAC verification
 */
router.post(
  '/direct-upload',
  async (req: Request, res: Response): Promise<void> => {
    const storagePath = req.query.path as string;
    const expires = req.query.expires as string;
    const sig = req.query.sig as string;

    if (!storagePath || !expires || !sig) {
      res.status(400).json({
        success: false,
        error: { code: 'MISSING_PARAMETERS', message: 'path, expires, and sig query parameters are required' },
      });
      return;
    }

    if (new Date(expires) < new Date()) {
      res.status(401).json({
        success: false,
        error: { code: 'URL_EXPIRED', message: 'Upload URL has expired' },
      });
      return;
    }

    // Verify workspace tenancy in path
    if (!storagePath.startsWith(`workspaces/${req.workspace!.workspaceId}/`)) {
      res.status(403).json({
        success: false,
        error: { code: 'CROSS_TENANT_ACCESS_DENIED', message: 'Cannot upload outside workspace tenancy boundary' },
      });
      return;
    }

    const mimeType = req.body?.mimeType || (req.headers['content-type'] as string) || 'application/octet-stream';

    // Verify HMAC signature
    const isValidSig = storageService.verifySignature(`${storagePath}:${mimeType}:${expires}`, sig);
    if (!isValidSig) {
      res.status(403).json({
        success: false,
        error: { code: 'INVALID_SIGNATURE', message: 'HMAC signature verification failed' },
      });
      return;
    }

    let buffer: Buffer;
    if (req.body?.fileBase64) {
      buffer = Buffer.from(req.body.fileBase64, 'base64');
    } else if (typeof req.body === 'string') {
      buffer = Buffer.from(req.body, 'utf8');
    } else if (Buffer.isBuffer(req.body)) {
      buffer = req.body;
    } else if (req.body?.content) {
      buffer = Buffer.from(req.body.content, 'utf8');
    } else {
      buffer = Buffer.from(JSON.stringify(req.body), 'utf8');
    }

    // Magic bytes verification
    const sigCheck = storageService.verifyFileSignature(buffer, mimeType);
    if (!sigCheck.valid) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_FILE_SIGNATURE', message: sigCheck.reason || 'File signature mismatch' },
      });
      return;
    }

    const checksumSha256 = storageService.computeChecksumSha256(buffer);
    await storageService.saveLocalFile(storagePath, buffer);

    res.status(200).json({
      success: true,
      data: {
        storagePath,
        fileSize: buffer.length,
        checksumSha256,
        uploadedAt: new Date().toISOString(),
      },
    });
  }
);

/**
 * GET /api/v1/workspaces/:workspaceId/assets/stream
 * Local dev & fallback stream endpoint with HMAC verification
 */
router.get(
  '/stream',
  async (req: Request, res: Response): Promise<void> => {
    const storagePath = req.query.path as string;
    const expires = req.query.expires as string;
    const sig = req.query.sig as string;

    if (!storagePath || !expires || !sig) {
      res.status(400).json({
        success: false,
        error: { code: 'MISSING_PARAMETERS', message: 'path, expires, and sig query parameters are required' },
      });
      return;
    }

    if (new Date(expires) < new Date()) {
      res.status(401).json({
        success: false,
        error: { code: 'URL_EXPIRED', message: 'Download URL has expired' },
      });
      return;
    }

    // Verify workspace tenancy in path
    if (!storagePath.startsWith(`workspaces/${req.workspace!.workspaceId}/`)) {
      res.status(403).json({
        success: false,
        error: { code: 'CROSS_TENANT_ACCESS_DENIED', message: 'Cannot access outside workspace tenancy boundary' },
      });
      return;
    }

    const isValidSig = storageService.verifySignature(`${storagePath}:read:${expires}`, sig);
    if (!isValidSig) {
      res.status(403).json({
        success: false,
        error: { code: 'INVALID_SIGNATURE', message: 'HMAC signature verification failed' },
      });
      return;
    }

    const buffer = await storageService.readLocalFile(storagePath);
    if (!buffer) {
      res.status(404).json({
        success: false,
        error: { code: 'FILE_NOT_FOUND', message: 'Asset file not found in storage' },
      });
      return;
    }

    let contentType = 'application/octet-stream';
    if (storagePath.endsWith('.svg')) contentType = 'image/svg+xml';
    else if (storagePath.endsWith('.png')) contentType = 'image/png';
    else if (storagePath.endsWith('.pdf')) contentType = 'application/pdf';
    else if (storagePath.endsWith('.json')) contentType = 'application/json';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', buffer.length);
    res.end(buffer);
  }
);

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
    const assetId = req.params.assetId;
    const body = req.body || {};
    const now = new Date().toISOString();

    const asset = await brandAssetRepository.create({
      assetId,
      id: assetId,
      workspaceId: req.workspace!.workspaceId,
      businessId: body.businessId || req.workspace!.workspaceId,
      name: body.name || body.title || 'Uploaded Asset',
      title: body.title || body.name || 'Uploaded Asset',
      description: body.description || '',
      category: body.category || 'Collateral',
      section: body.section || body.folder || 'Active',
      folder: body.folder || body.section || 'Active',
      secondarySections: body.secondarySections || [],
      assetType: body.assetType || 'png',
      storagePath: body.storagePath || `workspaces/${req.workspace!.workspaceId}/brand/${assetId}`,
      storageUrl: body.storageUrl,
      fileSize: Number(body.fileSize) || 1024,
      mimeType: body.mimeType || 'image/png',
      svgContent: body.svgContent || body.svgMarkup,
      svgMarkup: body.svgMarkup || body.svgContent,
      dimensions: body.dimensions,
      resolution: body.resolution,
      duration: body.duration,
      tags: body.tags || [],
      collectionIds: body.collectionIds || [],
      productIds: body.productIds || [],
      campaignIds: body.campaignIds || [],
      format: body.format,
      headlineText: body.headlineText,
      subtext: body.subtext,
      accentHex: body.accentHex,
      darkVariant: body.darkVariant,
      slides: body.slides,
      caption: body.caption,
      hashtags: body.hashtags,
      artDirectionNote: body.artDirectionNote,
      aiMetadata: body.aiMetadata || {
        aiGenerated: Boolean(body.aiGenerated),
        aiPrompt: body.aiPrompt,
        aiModel: body.aiModel,
      },
      verifiedMetadata: body.verifiedMetadata || {
        truthVerified: true,
        checksumSha256: body.checksumSha256 || '',
        integrityPassed: true,
      },
      status: body.status || 'active',
      approvalStatus: body.approvalStatus || 'approved',
      createdBy: req.user!.uid,
      ownedBy: req.workspace!.workspaceId,
      createdAt: now,
      updatedAt: now,
    });

    res.status(201).json({
      success: true,
      data: asset,
    });
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/assets/:assetId/duplicate
 * Duplicates an existing asset
 */
router.post(
  '/:assetId/duplicate',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const cloned = await brandAssetRepository.duplicate(
        req.workspace!.workspaceId,
        req.params.assetId,
        req.user!.uid
      );
      res.status(201).json({
        success: true,
        data: cloned,
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: { code: 'ASSET_DUPLICATE_FAILED', message: err.message },
      });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/assets/bulk-archive
 */
router.post(
  '/bulk-archive',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { assetIds } = req.body;
      if (!Array.isArray(assetIds) || assetIds.length === 0) {
        res.status(400).json({ success: false, error: { code: 'INVALID_ASSET_IDS', message: 'assetIds must be a non-empty array' } });
        return;
      }
      const result = await brandAssetRepository.bulkArchive(req.workspace!.workspaceId, assetIds, req.user!.uid);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'BULK_ARCHIVE_FAILED', message: err.message } });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/assets/bulk-restore
 */
router.post(
  '/bulk-restore',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { assetIds, targetSection } = req.body;
      if (!Array.isArray(assetIds) || assetIds.length === 0) {
        res.status(400).json({ success: false, error: { code: 'INVALID_ASSET_IDS', message: 'assetIds must be a non-empty array' } });
        return;
      }
      const result = await brandAssetRepository.bulkRestore(req.workspace!.workspaceId, assetIds, targetSection || 'Active', req.user!.uid);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'BULK_RESTORE_FAILED', message: err.message } });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/assets/bulk-tag
 */
router.post(
  '/bulk-tag',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { assetIds, tagsToAdd, tagsToRemove } = req.body;
      if (!Array.isArray(assetIds) || assetIds.length === 0) {
        res.status(400).json({ success: false, error: { code: 'INVALID_ASSET_IDS', message: 'assetIds must be a non-empty array' } });
        return;
      }
      const result = await brandAssetRepository.bulkTag(req.workspace!.workspaceId, assetIds, tagsToAdd || [], tagsToRemove || []);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'BULK_TAG_FAILED', message: err.message } });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/assets/bulk-move
 */
router.post(
  '/bulk-move',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { assetIds, targetSection } = req.body;
      if (!Array.isArray(assetIds) || !targetSection) {
        res.status(400).json({ success: false, error: { code: 'INVALID_PARAMETERS', message: 'assetIds array and targetSection are required' } });
        return;
      }
      const result = await brandAssetRepository.bulkMove(req.workspace!.workspaceId, assetIds, targetSection, req.user!.uid);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'BULK_MOVE_FAILED', message: err.message } });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/assets/bulk-delete
 */
router.post(
  '/bulk-delete',
  requireWorkspaceRole(['owner', 'admin']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { assetIds } = req.body;
      if (!Array.isArray(assetIds) || assetIds.length === 0) {
        res.status(400).json({ success: false, error: { code: 'INVALID_ASSET_IDS', message: 'assetIds must be a non-empty array' } });
        return;
      }
      const result = await brandAssetRepository.bulkDeletePermanently(req.workspace!.workspaceId, assetIds);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'BULK_DELETE_FAILED', message: err.message } });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/assets/ai-classify
 * Heuristic/AI classification for upload preview
 */
router.post(
  '/ai-classify',
  requireWorkspaceRole(['owner', 'admin', 'member', 'viewer']),
  async (req: Request, res: Response): Promise<void> => {
    const { fileName, mimeType, content } = req.body;
    if (!fileName || !mimeType) {
      res.status(400).json({ success: false, error: { code: 'MISSING_PARAMETERS', message: 'fileName and mimeType are required' } });
      return;
    }
    const classification = brandAssetRepository.classifyAssetHeuristic(fileName, mimeType, content);
    res.json({ success: true, data: classification });
  }
);

/**
 * PATCH /api/v1/workspaces/:workspaceId/assets/:assetId
 * Updates asset metadata, renaming, tags, or section assignment
 */
router.patch(
  '/:assetId',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const updated = await brandAssetRepository.update(
        req.workspace!.workspaceId,
        req.params.assetId,
        req.body,
        req.user!.uid
      );
      res.json({
        success: true,
        data: updated,
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: { code: 'ASSET_UPDATE_FAILED', message: err.message },
      });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/assets/:assetId/archive
 * Controlled movement to Archived section
 */
router.post(
  '/:assetId/archive',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const archived = await brandAssetRepository.archive(
        req.workspace!.workspaceId,
        req.params.assetId,
        req.user!.uid
      );
      res.json({
        success: true,
        data: archived,
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: { code: 'ASSET_ARCHIVE_FAILED', message: err.message },
      });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/assets/:assetId/restore
 * Controlled restoration to Active or target section
 */
router.post(
  '/:assetId/restore',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const targetSection = req.body?.section || 'Active';
      const restored = await brandAssetRepository.restore(
        req.workspace!.workspaceId,
        req.params.assetId,
        targetSection,
        req.user!.uid
      );
      res.json({
        success: true,
        data: restored,
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: { code: 'ASSET_RESTORE_FAILED', message: err.message },
      });
    }
  }
);

/**
 * DELETE /api/v1/workspaces/:workspaceId/assets/:assetId/permanent
 * Permanent hard deletion of asset and historical versions
 */
router.delete(
  '/:assetId/permanent',
  requireWorkspaceRole(['owner', 'admin']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      await brandAssetRepository.deletePermanently(
        req.workspace!.workspaceId,
        req.params.assetId
      );
      res.json({
        success: true,
        data: { deletedPermanently: true, assetId: req.params.assetId },
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: { code: 'ASSET_PERMANENT_DELETE_FAILED', message: err.message },
      });
    }
  }
);

/**
 * GET /api/v1/workspaces/:workspaceId/assets/:assetId/versions
 * Lists all historical versions of an asset
 */
router.get(
  '/:assetId/versions',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const versions = await brandAssetRepository.listVersions(
        req.workspace!.workspaceId,
        req.params.assetId
      );
      res.json({
        success: true,
        data: versions,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'VERSIONS_LIST_FAILED', message: err.message },
      });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/assets/:assetId/versions
 * Creates a new version for an asset
 */
router.post(
  '/:assetId/versions',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { changeSummary, storagePath, fileSize, mimeType, checksumSha256, svgContent, dimensions } = req.body;
      const version = await brandAssetRepository.createVersion(
        req.workspace!.workspaceId,
        req.params.assetId,
        {
          changeSummary: changeSummary || 'Manual version update',
          changedBy: req.user!.uid,
          storagePath,
          fileSize,
          mimeType,
          checksumSha256,
          svgContent,
          dimensions,
        }
      );
      res.status(201).json({
        success: true,
        data: version,
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: { code: 'VERSION_CREATE_FAILED', message: err.message },
      });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/assets/:assetId/versions/:versionId/restore
 * Restores an asset to a historical version state
 */
router.post(
  '/:assetId/versions/:versionId/restore',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const restored = await brandAssetRepository.restoreVersion(
        req.workspace!.workspaceId,
        req.params.assetId,
        req.params.versionId,
        req.user!.uid
      );
      res.json({
        success: true,
        data: restored,
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: { code: 'VERSION_RESTORE_FAILED', message: err.message },
      });
    }
  }
);

/**
 * GET /api/v1/workspaces/:workspaceId/assets/collections
 * Lists asset collections in the workspace
 */
router.get(
  '/collections',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const type = req.query.type as any;
      const collections = await brandAssetRepository.listCollections(
        req.workspace!.workspaceId,
        type
      );
      res.json({
        success: true,
        data: collections,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'COLLECTIONS_LIST_FAILED', message: err.message },
      });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/assets/collections
 * Creates a new user or smart collection
 */
router.post(
  '/collections',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const collection = await brandAssetRepository.createCollection({
        ...req.body,
        workspaceId: req.workspace!.workspaceId,
        createdBy: req.user!.uid,
      });
      res.status(201).json({
        success: true,
        data: collection,
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: { code: 'COLLECTION_CREATE_FAILED', message: err.message },
      });
    }
  }
);

/**
 * GET /api/v1/workspaces/:workspaceId/assets/collections/:collectionId
 */
router.get(
  '/collections/:collectionId',
  async (req: Request, res: Response): Promise<void> => {
    const col = await brandAssetRepository.getCollection(
      req.workspace!.workspaceId,
      req.params.collectionId
    );
    if (!col) {
      res.status(404).json({
        success: false,
        error: { code: 'COLLECTION_NOT_FOUND', message: 'Collection not found' },
      });
      return;
    }
    res.json({ success: true, data: col });
  }
);

/**
 * PATCH /api/v1/workspaces/:workspaceId/assets/collections/:collectionId
 */
router.patch(
  '/collections/:collectionId',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const updated = await brandAssetRepository.updateCollection(
        req.workspace!.workspaceId,
        req.params.collectionId,
        req.body
      );
      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: { code: 'COLLECTION_UPDATE_FAILED', message: err.message },
      });
    }
  }
);

/**
 * DELETE /api/v1/workspaces/:workspaceId/assets/collections/:collectionId
 */
router.delete(
  '/collections/:collectionId',
  requireWorkspaceRole(['owner', 'admin']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      await brandAssetRepository.deleteCollection(
        req.workspace!.workspaceId,
        req.params.collectionId
      );
      res.json({ success: true, data: { deleted: true } });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: { code: 'COLLECTION_DELETE_FAILED', message: err.message },
      });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/assets/collections/:collectionId/assets
 * Adds an asset to a collection
 */
router.post(
  '/collections/:collectionId/assets',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { assetId } = req.body;
      if (!assetId) {
        res.status(400).json({ success: false, error: { code: 'MISSING_ASSET_ID', message: 'assetId is required' } });
        return;
      }
      await brandAssetRepository.addAssetToCollection(
        req.workspace!.workspaceId,
        assetId,
        req.params.collectionId
      );
      res.json({ success: true, data: { added: true, assetId, collectionId: req.params.collectionId } });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: { code: 'COLLECTION_ADD_ASSET_FAILED', message: err.message },
      });
    }
  }
);

/**
 * DELETE /api/v1/workspaces/:workspaceId/assets/collections/:collectionId/assets/:assetId
 * Removes an asset from a collection
 */
router.delete(
  '/collections/:collectionId/assets/:assetId',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      await brandAssetRepository.removeAssetFromCollection(
        req.workspace!.workspaceId,
        req.params.assetId,
        req.params.collectionId
      );
      res.json({ success: true, data: { removed: true, assetId: req.params.assetId, collectionId: req.params.collectionId } });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: { code: 'COLLECTION_REMOVE_ASSET_FAILED', message: err.message },
      });
    }
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
 * GET /api/v1/workspaces/:workspaceId/assets/brand-identity/authoritative
 * Returns authoritative brand identity with 10 logo variants, design tokens, and guidelines
 */
router.get('/brand-identity/authoritative', async (req: Request, res: Response): Promise<void> => {
  try {
    const identity = await brandGuardianService.getAuthoritativeIdentity(req.workspace!.workspaceId);
    res.json({ success: true, data: identity });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/workspaces/:workspaceId/assets/brand-identity/authoritative
 * Creates/locks a new authoritative brand identity version
 */
router.post(
  '/brand-identity/authoritative',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const saved = await brandGuardianService.saveAuthoritativeIdentity(
        req.workspace!.workspaceId,
        req.body,
        (req as any).user?.userId || 'system'
      );
      res.status(201).json({ success: true, data: saved });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

/**
 * GET /api/v1/workspaces/:workspaceId/assets/brand-identity/versions
 * Lists all historical brand identity versions
 */
router.get('/brand-identity/versions', async (req: Request, res: Response): Promise<void> => {
  try {
    const versions = await brandGuardianService.listIdentityVersions(req.workspace!.workspaceId);
    res.json({ success: true, data: versions });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/v1/workspaces/:workspaceId/assets/brand-identity/tokens.json
 * Downloads machine-readable design tokens
 */
router.get('/brand-identity/tokens.json', async (req: Request, res: Response): Promise<void> => {
  try {
    const tokensJson = await brandGuardianService.exportDesignTokensJson(req.workspace!.workspaceId);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="brand-tokens.json"');
    res.send(tokensJson);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/workspaces/:workspaceId/assets/brand-identity/sync-brain
 * Synchronizes verified facts from Business Brain into Authoritative Brand Identity
 */
router.post(
  '/brand-identity/sync-brain',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const synced = await brandGuardianService.syncWithBusinessBrain(req.workspace!.workspaceId);
      res.json({ success: true, data: synced });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/assets/brand-identity/impact-analysis
 * Analyzes which assets are affected by proposed guideline/identity modifications
 */
router.post('/brand-identity/impact-analysis', async (req: Request, res: Response): Promise<void> => {
  try {
    const impact = await brandGuardianService.analyzeIdentityImpact(req.workspace!.workspaceId, req.body);
    res.json({ success: true, data: impact });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/workspaces/:workspaceId/assets/brand-guardian/evaluate
 * Evaluates an asset for brand compliance (colors, typography, logo proportions, claims)
 */
router.post('/brand-guardian/evaluate', async (req: Request, res: Response): Promise<void> => {
  try {
    const report = await brandGuardianService.evaluateAssetCompliance({
      workspaceId: req.workspace!.workspaceId,
      ...req.body,
    });
    res.json({ success: true, data: report });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/v1/workspaces/:workspaceId/assets/brand-guardian/drift-report
 * Scans all workspace assets for brand drift across social, packaging, collateral
 */
router.get('/brand-guardian/drift-report', async (req: Request, res: Response): Promise<void> => {
  try {
    const driftReport = await brandGuardianService.detectBrandDrift(req.workspace!.workspaceId);
    res.json({ success: true, data: driftReport });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ==========================================================================
 * PRINT & PACKAGING INTELLIGENCE ROUTES
 * ========================================================================== */

/**
 * POST /api/v1/workspaces/:workspaceId/assets/packaging
 * Creates a new packaging asset with verified product association & dieline
 */
router.post(
  '/packaging',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const asset = await printPackagingService.createPackagingAsset({
        workspaceId: req.workspace!.workspaceId,
        createdBy: (req as any).user?.userId || 'system',
        ...req.body,
      });
      res.status(201).json({ success: true, data: asset });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

/**
 * GET /api/v1/workspaces/:workspaceId/assets/packaging
 * Lists packaging assets with optional packagingType, productId, workflowStatus filters
 */
router.get('/packaging', async (req: Request, res: Response): Promise<void> => {
  try {
    const assets = await printPackagingService.listPackagingAssets(req.workspace!.workspaceId, req.query as any);
    res.json({ success: true, data: assets });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/v1/workspaces/:workspaceId/assets/packaging/:assetId
 * Retrieves single packaging asset with full metadata
 */
router.get('/packaging/:assetId', async (req: Request, res: Response): Promise<void> => {
  try {
    const asset = await printPackagingService.getPackagingAsset(req.workspace!.workspaceId, req.params.assetId);
    if (!asset) {
      res.status(404).json({ success: false, error: 'Packaging asset not found' });
      return;
    }
    res.json({ success: true, data: asset });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/workspaces/:workspaceId/assets/packaging/:assetId/readiness
 * Evaluates deterministic print readiness (bleed, resolution, safe margin, CMYK, TAC)
 */
router.post('/packaging/:assetId/readiness', async (req: Request, res: Response): Promise<void> => {
  try {
    const report = await printPackagingService.evaluatePrintReadiness(req.workspace!.workspaceId, req.params.assetId);
    res.json({ success: true, data: report });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/workspaces/:workspaceId/assets/packaging/:assetId/content-intelligence
 * Extracts packaging content via OCR/NLP & cross-checks with Business Brain
 */
router.post('/packaging/:assetId/content-intelligence', async (req: Request, res: Response): Promise<void> => {
  try {
    const report = await printPackagingService.extractPackagingContentIntelligence(
      req.workspace!.workspaceId,
      req.params.assetId,
      req.body?.rawText
    );
    res.json({ success: true, data: report });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/workspaces/:workspaceId/assets/packaging/:assetId/workflow
 * Advances packaging asset through production workflow states
 */
router.post(
  '/packaging/:assetId/workflow',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const updated = await printPackagingService.advanceProductionWorkflow({
        workspaceId: req.workspace!.workspaceId,
        assetId: req.params.assetId,
        targetStatus: req.body.targetStatus,
        updatedBy: (req as any).user?.userId || 'system',
        notes: req.body.notes,
        vendorName: req.body.vendorName,
      });
      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

/**
 * GET /api/v1/workspaces/:workspaceId/assets/packaging/dieline/:type
 * Generates vector dieline template SVG
 */
router.get('/packaging/dieline/:type', (req: Request, res: Response): void => {
  try {
    const { type } = req.params;
    const widthMm = Number(req.query.widthMm) || 80;
    const heightMm = Number(req.query.heightMm) || 160;
    const depthMm = Number(req.query.depthMm) || 40;
    const bleedMm = Number(req.query.bleedMm) || 3.0;

    const svg = printPackagingService.generateDielineSvg(type as any, widthMm, heightMm, depthMm, bleedMm);
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(svg);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/workspaces/:workspaceId/assets/packaging/product-sync-check
 * Detects packaging version drift when product information changes
 */
router.post('/packaging/product-sync-check', async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId, updatedProductData } = req.body;
    const result = await printPackagingService.checkProductUpdatePackagingDrift(
      req.workspace!.workspaceId,
      productId,
      updatedProductData || {}
    );
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
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

/**
 * GET /api/v1/workspaces/:workspaceId/assets/brand-intelligence
 * Retrieves complete unified Brand Intelligence context (profile, research, competitor visuals, tokens)
 */
router.get(
  '/brand-intelligence',
  requireWorkspaceRole(['owner', 'admin', 'member', 'viewer']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const context = await brandIntelligenceEngine.getBrandIntelligenceContext(
        req.workspace!.workspaceId,
        req.user?.uid || 'anonymous'
      );
      res.json({ success: true, data: context });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'BRAND_INTELLIGENCE_FAILED', message: err.message },
      });
    }
  }
);

/* ==========================================================================
 * AI ASSETS & SOCIAL STUDIO ROUTES
 * ========================================================================== */

/**
 * POST /api/v1/workspaces/:workspaceId/assets/creative-studio/recommendations
 */
router.post(
  '/creative-studio/recommendations',
  requireWorkspaceRole(['owner', 'admin', 'member', 'viewer']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const recommendations = await creativeAssetsEngine.recommendAssetsForIndustry({
        workspaceId: req.workspace!.workspaceId,
        industryOverride: req.body?.industryOverride,
        businessModel: req.body?.businessModel,
        productCategory: req.body?.productCategory,
      });
      res.json({ success: true, data: recommendations });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'RECOMMENDATIONS_FAILED', message: err.message },
      });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/assets/creative-studio/mockups/generate
 */
router.post(
  '/creative-studio/mockups/generate',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const mockup = await creativeAssetsEngine.generateProductMockup({
        workspaceId: req.workspace!.workspaceId,
        userId: req.user!.uid,
        productCategory: req.body?.productCategory || req.body?.category || 'general',
        mockupType: req.body?.mockupType || 'box',
        materialAppearance: req.body?.materialAppearance || req.body?.material,
        finish: req.body?.finish,
        lighting: req.body?.lighting || req.body?.lightingPreset,
        cameraAngle: req.body?.cameraAngle,
        environment: req.body?.environment,
        presentationStyle: req.body?.presentationStyle || req.body?.customHeadline,
        customPrompt: req.body?.customPrompt || req.body?.promptModifier,
        brandOverrides: req.body?.brandOverrides || req.body?.tokenOverrides,
      });
      res.json({ success: true, data: mockup });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'MOCKUP_GENERATION_FAILED', message: err.message },
      });
    }
  }
);

/**
 * GET /api/v1/workspaces/:workspaceId/assets/creative-studio/mockups
 */
router.get(
  '/creative-studio/mockups',
  requireWorkspaceRole(['owner', 'admin', 'member', 'viewer']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const mockups = await brandStudioRepository.listMockups(
        req.workspace!.workspaceId,
        req.query.category as any
      );
      res.json({ success: true, data: mockups });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'LIST_MOCKUPS_FAILED', message: err.message },
      });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/assets/creative-studio/packaging/generate
 */
router.post(
  '/creative-studio/packaging/generate',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const packaging = await creativeAssetsEngine.generatePackagingArtwork({
        workspaceId: req.workspace!.workspaceId,
        userId: req.user!.uid,
        productCategory: req.body?.productCategory || req.body?.category || 'general',
        packagingType: req.body?.packagingType || 'box',
        dimensionsMm: req.body?.dimensionsMm,
        productionReadiness: req.body?.productionReadiness || req.body?.tier || 'CONCEPT_PREVIEW',
        regulatoryFlags: req.body?.regulatoryFlags || req.body?.regulatoryRequirements,
        dielineType: req.body?.dielineType || req.body?.dielineSpec,
      });
      res.json({ success: true, data: packaging });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'PACKAGING_GENERATION_FAILED', message: err.message },
      });
    }
  }
);

/**
 * GET /api/v1/workspaces/:workspaceId/assets/creative-studio/packaging
 */
router.get(
  '/creative-studio/packaging',
  requireWorkspaceRole(['owner', 'admin', 'member', 'viewer']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const artworks = await brandStudioRepository.listPackagingArtworks(
        req.workspace!.workspaceId,
        req.query.tier as any
      );
      res.json({ success: true, data: artworks });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'LIST_PACKAGING_FAILED', message: err.message },
      });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/assets/creative-studio/campaign-visual/generate
 */
router.post(
  '/creative-studio/campaign-visual/generate',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const visual = await creativeAssetsEngine.generateCampaignVisual({
        workspaceId: req.workspace!.workspaceId,
        userId: req.user!.uid,
        visualStyle: req.body?.visualStyle || req.body?.style || 'editorial',
        headline: req.body?.headline || 'Campaign Headline',
        subtext: req.body?.subtext || req.body?.subheadline,
        mood: req.body?.mood,
        lighting: req.body?.lighting,
        cameraPerspective: req.body?.cameraPerspective,
        composition: req.body?.composition,
      });
      res.json({ success: true, data: visual });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'CAMPAIGN_VISUAL_FAILED', message: err.message },
      });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/assets/creative-studio/social-post/generate
 */
router.post(
  '/creative-studio/social-post/generate',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const post = await creativeAssetsEngine.generateSocialPostCreative({
        workspaceId: req.workspace!.workspaceId,
        userId: req.user!.uid,
        platform: req.body?.platform || 'INSTAGRAM',
        format: req.body?.format || 'POST_SQUARE',
        angle: req.body?.angle || req.body?.postType || 'PRODUCT_SHOWCASE',
        prompt: req.body?.prompt || req.body?.headline || 'Social creative',
        mood: req.body?.mood,
      });
      res.json({ success: true, data: post });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'SOCIAL_POST_FAILED', message: err.message },
      });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/assets/creative-studio/carousels/generate
 */
router.post(
  '/creative-studio/carousels/generate',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const carousel = await creativeAssetsEngine.generateMultiSlideCarousel({
        workspaceId: req.workspace!.workspaceId,
        userId: req.user!.uid,
        topicPrompt: req.body?.topicPrompt || 'Carousel Topic',
        storyStructure: req.body?.storyStructure || req.body?.storytellingStructure,
        slideCount: req.body?.slideCount,
        platform: req.body?.platform || req.body?.targetPlatform,
      });
      res.json({ success: true, data: carousel });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'CAROUSEL_GENERATION_FAILED', message: err.message },
      });
    }
  }
);

/**
 * GET /api/v1/workspaces/:workspaceId/assets/creative-studio/social-projects
 */
router.get(
  '/creative-studio/social-projects',
  requireWorkspaceRole(['owner', 'admin', 'member', 'viewer']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const projects = await brandStudioRepository.listSocialProjects(req.workspace!.workspaceId);
      res.json({ success: true, data: projects });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'LIST_SOCIAL_PROJECTS_FAILED', message: err.message },
      });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/assets/creative-studio/carousels/:projectId/edit-slide
 */
router.post(
  '/creative-studio/carousels/:projectId/edit-slide',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const updated = await creativeAssetsEngine.editSlideText({
        workspaceId: req.workspace!.workspaceId,
        projectId: req.params.projectId,
        slideIndex: req.body?.slideIndex,
        newHeadline: req.body?.newHeadline,
        newBody: req.body?.newBody,
        newCtaText: req.body?.newCtaText,
      });
      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'EDIT_SLIDE_FAILED', message: err.message },
      });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/assets/creative-studio/carousels/:projectId/reorder
 */
router.post(
  '/creative-studio/carousels/:projectId/reorder',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const updated = await creativeAssetsEngine.reorderSlides({
        workspaceId: req.workspace!.workspaceId,
        projectId: req.params.projectId,
        newOrder: req.body?.newOrder,
      });
      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'REORDER_SLIDES_FAILED', message: err.message },
      });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/assets/creative-studio/carousels/:projectId/duplicate
 */
router.post(
  '/creative-studio/carousels/:projectId/duplicate',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const updated = await creativeAssetsEngine.duplicateSlide({
        workspaceId: req.workspace!.workspaceId,
        projectId: req.params.projectId,
        slideIndex: req.body?.slideIndex,
      });
      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'DUPLICATE_SLIDE_FAILED', message: err.message },
      });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/assets/creative-studio/carousels/:projectId/delete
 */
router.post(
  '/creative-studio/carousels/:projectId/delete',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const updated = await creativeAssetsEngine.deleteSlide({
        workspaceId: req.workspace!.workspaceId,
        projectId: req.params.projectId,
        slideIndex: req.body?.slideIndex,
      });
      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'DELETE_SLIDE_FAILED', message: err.message },
      });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/assets/creative-studio/carousels/:projectId/remix-slide
 */
router.post(
  '/creative-studio/carousels/:projectId/remix-slide',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const updated = await creativeAssetsEngine.regenerateSingleSlide({
        workspaceId: req.workspace!.workspaceId,
        userId: req.user!.uid,
        projectId: req.params.projectId,
        slideIndex: req.body?.slideIndex,
        promptModifier: req.body?.promptModifier,
      });
      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'REMIX_SLIDE_FAILED', message: err.message },
      });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/assets/creative-studio/editable-document/create
 */
router.post(
  '/creative-studio/editable-document/create',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const doc = await creativeAssetsEngine.createEditableDocument({
        workspaceId: req.workspace!.workspaceId,
        userId: req.user!.uid,
        name: req.body?.name || 'Untitled Design Document',
        canvasWidth: req.body?.canvasWidth || 1080,
        canvasHeight: req.body?.canvasHeight || 1080,
        format: req.body?.format || 'POST_SQUARE',
        initialLayers: req.body?.initialLayers,
      });
      res.json({ success: true, data: doc });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'CREATE_DOCUMENT_FAILED', message: err.message },
      });
    }
  }
);

/**
 * GET /api/v1/workspaces/:workspaceId/assets/creative-studio/editable-documents
 */
router.get(
  '/creative-studio/editable-documents',
  requireWorkspaceRole(['owner', 'admin', 'member', 'viewer']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const docs = await brandStudioRepository.listEditableDocuments(req.workspace!.workspaceId);
      res.json({ success: true, data: docs });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'LIST_DOCUMENTS_FAILED', message: err.message },
      });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/assets/creative-studio/editable-document/:docId/update-layer
 */
router.post(
  '/creative-studio/editable-document/:docId/update-layer',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const doc = await creativeAssetsEngine.updateDocumentLayer({
        workspaceId: req.workspace!.workspaceId,
        docId: req.params.docId,
        layerId: req.body?.layerId,
        updates: req.body?.updates || {},
      });
      res.json({ success: true, data: doc });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'UPDATE_LAYER_FAILED', message: err.message },
      });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/assets/creative-studio/campaigns/generate
 */
router.post(
  '/creative-studio/campaigns/generate',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const campaign = await creativeAssetsEngine.generateCoordinatedCampaign({
        workspaceId: req.workspace!.workspaceId,
        userId: req.user!.uid,
        campaignName: req.body?.campaignName,
        productFocus: req.body?.productFocus,
        targetAudience: req.body?.targetAudience,
        objective: req.body?.objective,
      });
      res.json({ success: true, data: campaign });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'CAMPAIGN_GENERATION_FAILED', message: err.message },
      });
    }
  }
);

/**
 * GET /api/v1/workspaces/:workspaceId/assets/creative-studio/campaigns
 */
router.get(
  '/creative-studio/campaigns',
  requireWorkspaceRole(['owner', 'admin', 'member', 'viewer']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const campaigns = await brandStudioRepository.listCampaignPackages(req.workspace!.workspaceId);
      res.json({ success: true, data: campaigns });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'LIST_CAMPAIGNS_FAILED', message: err.message },
      });
    }
  }
);

/**
 * GET /api/v1/workspaces/:workspaceId/assets/creative-studio/opportunities
 */
router.get(
  '/creative-studio/opportunities',
  requireWorkspaceRole(['owner', 'admin', 'member', 'viewer']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const opportunities = await creativeAssetsEngine.detectCreativeOpportunities({
        workspaceId: req.workspace!.workspaceId,
      });
      res.json({ success: true, data: opportunities });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'OPPORTUNITIES_DETECTION_FAILED', message: err.message },
      });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/assets/creative-studio/export
 */
router.post(
  '/creative-studio/export',
  requireWorkspaceRole(['owner', 'admin', 'member', 'viewer']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const pkg = await creativeAssetsEngine.exportCreativePackage({
        workspaceId: req.workspace!.workspaceId,
        assetType: req.body?.assetType || 'campaign',
        assetId: req.body?.assetId || (req.body?.assetIds?.[0] ?? ''),
        format: req.body?.format || req.body?.formats?.[0] || 'svg',
        resolutionTier: req.body?.resolutionTier || (req.body?.targetDpi === 300 ? 'PRINT_300DPI' : '2x'),
      });
      res.json({ success: true, data: pkg });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'EXPORT_PACKAGE_FAILED', message: err.message },
      });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/assets/brand-intelligence/research
 */
router.post(
  '/brand-intelligence/research',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { industry } = req.body;
      const research = await brandIntelligenceEngine.analyzeMarketIntelligence({
        workspaceId: req.workspace!.workspaceId,
        industry: industry || 'Technology & Business Intelligence',
      });
      res.json({ success: true, data: research });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'MARKET_INTELLIGENCE_FAILED', message: err.message },
      });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/assets/brand-intelligence/creative-direction
 */
router.post(
  '/brand-intelligence/creative-direction',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { brandName, styleArchetype } = req.body;
      const direction = await brandIntelligenceEngine.formulateCreativeDirection({
        workspaceId: req.workspace!.workspaceId,
        userId: req.user!.uid,
        brandName: brandName || req.workspace!.workspaceName,
        styleArchetype,
      });
      res.json({ success: true, data: direction });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'CREATIVE_DIRECTION_FAILED', message: err.message },
      });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/assets/brand-intelligence/persist-snapshot
 */
router.post(
  '/brand-intelligence/persist-snapshot',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { brandName, tagline, direction, userAnglePreference } = req.body;
      const snapshot = await brandIntelligenceEngine.persistBrandSnapshot({
        workspaceId: req.workspace!.workspaceId,
        userId: req.user!.uid,
        brandName: brandName || req.workspace!.workspaceName || 'BrainWise',
        tagline: tagline || 'AI Business Intelligence & Growth Operating System',
        direction: direction || {
          colorRecommendations: {
            primary: '#171717',
            secondary: '#252525',
            accent: '#FF7417',
            neutral: '#5C5C58',
            background: '#FAFAF9',
            reasoning: 'High contrast editorial typography',
          },
          typographyRecommendations: {
            headingFont: 'Plus Jakarta Sans',
            bodyFont: 'Inter',
            monoFont: 'JetBrains Mono',
            ratio: 1.25,
            reasoning: 'Strict 1.25 modular ratio',
          },
          logoDirection: { prompt: 'Monogram mark', archetype: 'Geometric', reasoning: 'Scalable' },
          packagingDirection: { prompt: 'Matte sleeve', finish: 'Matte', reasoning: 'Tactile' },
          photographyDirection: { tone: 'Authentic', lighting: 'Natural', reasoning: 'Direct' },
          socialContentDirection: { gridStyle: 'Editorial', themes: ['ROI'], reasoning: 'Reference' },
        },
        userAnglePreference,
      });
      res.json({ success: true, data: snapshot });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'BRAND_SNAPSHOT_PERSIST_FAILED', message: err.message },
      });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/assets/export-package
 */
router.post(
  '/export-package',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { format } = req.body;
      const result = await brandStudioService.createExportPackage({
        workspaceId: req.workspace!.workspaceId,
        userId: req.user!.uid,
        format,
        idempotencyKey: req.headers['x-idempotency-key'] as string,
      });
      res.status(201).json({
        success: true,
        data: result.exportRecord,
        meta: {
          creditsDeducted: result.creditsDeducted,
          creditBalanceRemaining: result.creditBalanceRemaining,
        },
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'EXPORT_PACKAGE_FAILED', message: err.message },
      });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/assets/quality-report
 */
router.post(
  '/quality-report',
  requireWorkspaceRole(['owner', 'admin', 'member', 'viewer']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { resourceType = 'BRAND_IDENTITY', resourceId = 'root' } = req.body;
      const report = await brandStudioService.evaluateBrandQuality({
        workspaceId: req.workspace!.workspaceId,
        resourceType,
        resourceId,
      });
      res.json({ success: true, data: report });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'QUALITY_REPORT_FAILED', message: err.message },
      });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/assets/approve
 */
router.post(
  '/approve',
  requireWorkspaceRole(['owner', 'admin']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { resourceType, resourceId, resourceVersion, notes } = req.body;
      const approval = await brandStudioService.approveBrandResource({
        workspaceId: req.workspace!.workspaceId,
        userId: req.user!.uid,
        resourceType: resourceType || 'BRAND_IDENTITY',
        resourceId: resourceId || req.workspace!.workspaceId,
        resourceVersion: Number(resourceVersion) || 1,
        notes,
      });
      res.status(201).json({ success: true, data: approval });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'APPROVAL_FAILED', message: err.message },
      });
    }
  }
);

// =============================================================================
// BRAND IDENTITY STUDIO ENHANCED ENDPOINTS
// =============================================================================

/**
 * POST /api/v1/workspaces/:workspaceId/assets/brand-identity/discover
 */
router.post(
  '/brand-identity/discover',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { rawIdea, existingBrandAssets, targetCategory } = req.body;
      const discovery = await brandIntelligenceEngine.discoverBusinessBrandProfile({
        workspaceId: req.workspace!.workspaceId,
        userId: req.user!.uid,
        rawIdea,
        existingBrandAssets,
        targetCategory,
      });
      res.json({ success: true, data: discovery });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'BRAND_DISCOVERY_FAILED', message: err.message },
      });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/assets/brand-identity/strategy
 */
router.post(
  '/brand-identity/strategy',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { targetAudience, categoryOverride } = req.body;
      const strategy = await brandIntelligenceEngine.generateComprehensiveBrandStrategy({
        workspaceId: req.workspace!.workspaceId,
        userId: req.user!.uid,
        targetAudience,
        categoryOverride,
      });
      res.json({ success: true, data: strategy });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'BRAND_STRATEGY_FAILED', message: err.message },
      });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/assets/brand-identity/competitors/visual-teardown
 */
router.post(
  '/brand-identity/competitors/visual-teardown',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { competitorsOverride } = req.body;
      const teardowns = await brandIntelligenceEngine.analyzeCompetitorVisualTeardowns({
        workspaceId: req.workspace!.workspaceId,
        competitorsOverride,
      });
      res.json({ success: true, data: teardowns });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'COMPETITOR_VISUAL_TEARDOWN_FAILED', message: err.message },
      });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/assets/brand-identity/whitespace
 */
router.post(
  '/brand-identity/whitespace',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { category } = req.body;
      const whitespace = await brandIntelligenceEngine.identifyVisualWhitespace({
        workspaceId: req.workspace!.workspaceId,
        category,
      });
      res.json({ success: true, data: whitespace });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'VISUAL_WHITESPACE_FAILED', message: err.message },
      });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/assets/brand-identity/creative-directions
 */
router.post(
  '/brand-identity/creative-directions',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { category } = req.body;
      const directions = await brandIntelligenceEngine.generateThreeCreativeDirections({
        workspaceId: req.workspace!.workspaceId,
        userId: req.user!.uid,
        category,
      });
      res.json({ success: true, data: directions });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'CREATIVE_DIRECTIONS_FAILED', message: err.message },
      });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/assets/brand-identity/moodboards
 */
router.post(
  '/brand-identity/moodboards',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { direction, directionId } = req.body;
      let targetDirection = direction;
      if (!targetDirection && directionId) {
        targetDirection = await brandStudioRepository.getCreativeDirection(
          req.workspace!.workspaceId,
          directionId
        );
      }
      if (!targetDirection) {
        targetDirection = await brandStudioRepository.getLatestCreativeDirection(
          req.workspace!.workspaceId
        );
      }
      if (!targetDirection) {
        const dirs = await brandIntelligenceEngine.generateThreeCreativeDirections({
          workspaceId: req.workspace!.workspaceId,
          userId: req.user!.uid,
        });
        targetDirection = dirs[0];
      }

      const moodboard = await brandIntelligenceEngine.generateVisualMoodboard({
        workspaceId: req.workspace!.workspaceId,
        direction: targetDirection,
      });
      res.json({ success: true, data: moodboard });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'MOODBOARD_GENERATION_FAILED', message: err.message },
      });
    }
  }
);

/**
 * GET /api/v1/workspaces/:workspaceId/assets/brand-identity/moodboards
 */
router.get(
  '/brand-identity/moodboards',
  requireWorkspaceRole(['owner', 'admin', 'member', 'viewer']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const directionId = req.query.directionId as string | undefined;
      const moodboards = await brandStudioRepository.listMoodboards(
        req.workspace!.workspaceId,
        directionId
      );
      res.json({ success: true, data: moodboards });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'MOODBOARD_FETCH_FAILED', message: err.message },
      });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/assets/brand-identity/positioning-map
 */
router.post(
  '/brand-identity/positioning-map',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { category } = req.body;
      const map = await brandIntelligenceEngine.generatePositioningMap({
        workspaceId: req.workspace!.workspaceId,
        category,
      });
      res.json({ success: true, data: map });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'POSITIONING_MAP_FAILED', message: err.message },
      });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/assets/brand-identity/validate
 */
router.post(
  '/brand-identity/validate',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { strategy, direction } = req.body;
      const validation = await brandIntelligenceEngine.validateBrandStrategy({
        workspaceId: req.workspace!.workspaceId,
        strategy,
        direction,
      });
      res.json({ success: true, data: validation });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'VALIDATION_FAILED', message: err.message },
      });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/assets/brand-identity/refine-direction
 */
router.post(
  '/brand-identity/refine-direction',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { directive, customPrompt, targetDirectionId } = req.body;
      const refinement = await brandIntelligenceEngine.refineCreativeDirection({
        workspaceId: req.workspace!.workspaceId,
        userId: req.user!.uid,
        directive,
        customPrompt,
        targetDirectionId,
      });
      res.json({ success: true, data: refinement });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'DIRECTION_REFINEMENT_FAILED', message: err.message },
      });
    }
  }
);

// =============================================================================
// AI LOGO STUDIO ENHANCED ENDPOINTS
// =============================================================================

/**
 * POST /api/v1/workspaces/:workspaceId/assets/brand-logo/brief
 */
router.post(
  '/brand-logo/brief',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { userNotes, logoArchetype, logoMood } = req.body;
      const brief = await logoDesignEngine.assembleLogoBrief({
        workspaceId: req.workspace!.workspaceId,
        userNotes,
        logoArchetype,
        logoMood,
      });
      res.json({ success: true, data: brief });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'LOGO_BRIEF_FAILED', message: err.message },
      });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/assets/brand-logo/concepts
 */
router.post(
  '/brand-logo/concepts',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { userPrompt, styleArchetype, mood, lockBrandColors, brief } = req.body;
      const result = await logoDesignEngine.generateThreeDistinctConcepts({
        workspaceId: req.workspace!.workspaceId,
        userId: req.user!.uid,
        brief,
        userPrompt,
        styleArchetype,
        mood,
        lockBrandColors,
        idempotencyKey: req.headers['x-idempotency-key'] as string,
      });
      res.status(201).json({
        success: true,
        data: result.concepts,
        brief: result.brief,
        meta: {
          model: result.model,
          creditsDeducted: result.creditsDeducted,
          creditBalanceRemaining: result.creditBalanceRemaining,
        },
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'LOGO_CONCEPT_GENERATION_FAILED', message: err.message },
      });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/assets/brand-logo/refine
 */
router.post(
  '/brand-logo/refine',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { conceptId, directive, customInstruction, branchAsNew } = req.body;
      const refinement = await logoDesignEngine.refineLogoConcept({
        workspaceId: req.workspace!.workspaceId,
        userId: req.user!.uid,
        conceptId,
        directive,
        customInstruction,
        branchAsNew,
      });
      res.json({ success: true, data: refinement });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'LOGO_REFINEMENT_FAILED', message: err.message },
      });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/assets/brand-logo/variants
 */
router.post(
  '/brand-logo/variants',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { conceptId } = req.body;
      const variants = await logoDesignEngine.generateLogoFamilyVariants({
        workspaceId: req.workspace!.workspaceId,
        conceptId,
      });
      res.json({ success: true, data: variants });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'LOGO_VARIANTS_FAILED', message: err.message },
      });
    }
  }
);

/**
 * GET /api/v1/workspaces/:workspaceId/assets/brand-logo/variants/:conceptId
 */
router.get(
  '/brand-logo/variants/:conceptId',
  requireWorkspaceRole(['owner', 'admin', 'member', 'viewer']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const conceptId = req.params.conceptId as string;
      const variants = await brandStudioRepository.getLogoVariants(
        req.workspace!.workspaceId,
        conceptId
      );
      if (!variants) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Logo variants not found.' },
        });
        return;
      }
      res.json({ success: true, data: variants });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'GET_LOGO_VARIANTS_FAILED', message: err.message },
      });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/assets/brand-logo/validate
 */
router.post(
  '/brand-logo/validate',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { conceptId } = req.body;
      const report = await logoDesignEngine.validateLogoQuality({
        workspaceId: req.workspace!.workspaceId,
        conceptId,
      });
      res.json({ success: true, data: report });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'LOGO_VALIDATION_FAILED', message: err.message },
      });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/assets/brand-logo/presentation
 */
router.post(
  '/brand-logo/presentation',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { conceptId } = req.body;
      const deck = await logoDesignEngine.generatePresentationDeck({
        workspaceId: req.workspace!.workspaceId,
        conceptId,
      });
      res.json({ success: true, data: deck });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'LOGO_PRESENTATION_FAILED', message: err.message },
      });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/assets/brand-logo/export-raster
 */
router.post(
  '/brand-logo/export-raster',
  requireWorkspaceRole(['owner', 'admin', 'member', 'viewer']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { width = 512, height = 512, transparent = true } = req.body;
      const buf = createTransparentPngBuffer(Number(width), Number(height), (x: number, y: number) => {
        if (!transparent) {
          return [250, 250, 249, 255]; // Off-white canvas
        }
        const cx = width / 2;
        const cy = height / 2;
        const radius = Math.min(width, height) * 0.25;
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy < radius * radius) {
          return [23, 23, 23, 255]; // Charcoal mark
        }
        return [0, 0, 0, 0]; // Genuine alpha
      });

      res.setHeader('Content-Type', 'image/png');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="brand-logo-${width}x${height}-${transparent ? 'transparent' : 'canvas'}.png"`
      );
      res.send(buf);
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'RASTER_EXPORT_FAILED', message: err.message },
      });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/assets/brand-guidelines/generate-book
 */
router.post(
  '/brand-guidelines/generate-book',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const book = await brandGuidelinesEngine.generateCompleteBrandBook({
        workspaceId: req.workspace!.workspaceId,
        createdBy: req.user!.uid,
        overrides: req.body?.overrides,
      });
      res.json({ success: true, data: book });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'BRAND_BOOK_GENERATION_FAILED', message: err.message },
      });
    }
  }
);

/**
 * GET /api/v1/workspaces/:workspaceId/assets/brand-guidelines/latest-book
 */
router.get(
  '/brand-guidelines/latest-book',
  requireWorkspaceRole(['owner', 'admin', 'member', 'viewer']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const book = await brandStudioRepository.getLatestBrandBook(req.workspace!.workspaceId);
      res.json({ success: true, data: book });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'BRAND_BOOK_FETCH_FAILED', message: err.message },
      });
    }
  }
);

/**
 * GET /api/v1/workspaces/:workspaceId/assets/brand-guidelines/tokens
 */
router.get(
  '/brand-guidelines/tokens',
  requireWorkspaceRole(['owner', 'admin', 'member', 'viewer']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const tokens = await brandStudioRepository.listLivingTokens(req.workspace!.workspaceId);
      res.json({ success: true, data: tokens });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'TOKENS_FETCH_FAILED', message: err.message },
      });
    }
  }
);

/**
 * GET /api/v1/workspaces/:workspaceId/assets/brand-guidelines/rules
 */
router.get(
  '/brand-guidelines/rules',
  requireWorkspaceRole(['owner', 'admin', 'member', 'viewer']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const rules = await brandStudioRepository.listDesignRules(req.workspace!.workspaceId);
      res.json({ success: true, data: rules });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'RULES_FETCH_FAILED', message: err.message },
      });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/assets/brand-guidelines/evaluate-consistency
 */
router.post(
  '/brand-guidelines/evaluate-consistency',
  requireWorkspaceRole(['owner', 'admin', 'member', 'viewer']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { assetType, assetContent, context, autoRemediate } = req.body;
      const report = await brandGuidelinesEngine.evaluateBrandConsistency({
        workspaceId: req.workspace!.workspaceId,
        assetType: assetType || 'unknown',
        assetContent: assetContent || '',
        context,
        autoRemediate,
      });
      res.json({ success: true, data: report });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'CONSISTENCY_EVALUATION_FAILED', message: err.message },
      });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/assets/brand-guidelines/impact-analysis
 */
router.post(
  '/brand-guidelines/impact-analysis',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const analysis = await brandGuidelinesEngine.analyzeGuidelineImpact({
        workspaceId: req.workspace!.workspaceId,
        proposedChanges: req.body?.proposedChanges || {},
      });
      res.json({ success: true, data: analysis });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'IMPACT_ANALYSIS_FAILED', message: err.message },
      });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/assets/brand-guidelines/update
 */
router.post(
  '/brand-guidelines/update',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const updated = await brandGuidelinesEngine.updateBrandBookParameters({
        workspaceId: req.workspace!.workspaceId,
        updatedBy: req.user!.uid,
        updates: req.body?.updates || {},
      });
      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'BRAND_BOOK_UPDATE_FAILED', message: err.message },
      });
    }
  }
);

/**
 * GET /api/v1/workspaces/:workspaceId/assets/brand-guidelines/export-tokens-json
 */
router.get(
  '/brand-guidelines/export-tokens-json',
  requireWorkspaceRole(['owner', 'admin', 'member', 'viewer']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const tokensJson = await brandGuidelinesEngine.exportDesignTokensJson({
        workspaceId: req.workspace!.workspaceId,
      });
      if (req.query.download === 'true') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename="tokens.json"');
        res.send(JSON.stringify(tokensJson, null, 2));
      } else {
        res.json({ success: true, data: tokensJson });
      }
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'TOKENS_EXPORT_FAILED', message: err.message },
      });
    }
  }
);

/**
 * GET /api/v1/workspaces/:workspaceId/assets/brand-guidelines/export-pdf-markup
 */
router.get(
  '/brand-guidelines/export-pdf-markup',
  requireWorkspaceRole(['owner', 'admin', 'member', 'viewer']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const markup = await brandGuidelinesEngine.exportBrandBookPdfMarkup({
        workspaceId: req.workspace!.workspaceId,
      });
      res.json({ success: true, data: markup });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'PDF_MARKUP_EXPORT_FAILED', message: err.message },
      });
    }
  }
);

/* ==========================================================================
 * BRAND LAUNCH COMMAND ROUTES (CAPSTONE UNIFICATION)
 * ========================================================================== */

/**
 * POST /api/v1/workspaces/:workspaceId/assets/brand-launch/prepare
 * Unifies all 4 studios into a cohesive, production-grade Brand Launch Kit
 */
router.post(
  '/brand-launch/prepare',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await brandLaunchService.prepareBrandLaunch({
        workspaceId: req.workspace!.workspaceId,
        userId: req.user!.uid,
        launchName: req.body?.launchName || req.body?.companyName,
        campaignTheme: req.body?.campaignTheme || req.body?.industry,
        targetAudience: req.body?.targetAudience,
        productFocus: req.body?.productFocus || req.body?.productName,
        idempotencyKey: req.body?.idempotencyKey || (req.headers['x-idempotency-key'] as string),
      });
      res.status(201).json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'BRAND_LAUNCH_PREPARATION_FAILED', message: err.message },
      });
    }
  }
);

/**
 * GET /api/v1/workspaces/:workspaceId/assets/brand-launch/latest
 * Retrieves the latest prepared Brand Launch Kit
 */
router.get(
  '/brand-launch/latest',
  requireWorkspaceRole(['owner', 'admin', 'member', 'viewer']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const kit = await brandLaunchService.getLatestLaunchKit(req.workspace!.workspaceId);
      res.json({ success: true, data: kit });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'BRAND_LAUNCH_FETCH_FAILED', message: err.message },
      });
    }
  }
);

/**
 * GET /api/v1/workspaces/:workspaceId/assets/brand-launch/:launchId
 * Retrieves a specific Brand Launch Kit by ID
 */
router.get(
  '/brand-launch/:launchId',
  requireWorkspaceRole(['owner', 'admin', 'member', 'viewer']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const kit = await brandStudioRepository.getLaunchKit(
        req.workspace!.workspaceId,
        req.params.launchId
      );
      if (!kit) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Brand Launch Kit not found.' },
        });
        return;
      }
      res.json({ success: true, data: kit });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'BRAND_LAUNCH_FETCH_FAILED', message: err.message },
      });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/assets/brand-launch/:launchId/export
 * Exports signed download bundle with verified manifest
 */
router.post(
  '/brand-launch/:launchId/export',
  requireWorkspaceRole(['owner', 'admin', 'member', 'viewer']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const bundle = await brandLaunchService.exportLaunchKitBundle({
        workspaceId: req.workspace!.workspaceId,
        launchId: req.params.launchId,
        requestedFormats: req.body?.requestedFormats,
      });
      res.json({ success: true, data: bundle });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'BRAND_LAUNCH_EXPORT_FAILED', message: err.message },
      });
    }
  }
);

/* ==========================================================================
 * PREPRESS, PRINT BLEED, COLOR PROFILES & FONT OUTLINING ROUTES
 * ========================================================================== */

/**
 * POST /api/v1/workspaces/:workspaceId/assets/creative-studio/prepress/wrap-marks
 * Wraps SVG vector artwork with trim crop marks, bleed guides, and CMYK color bars
 */
router.post(
  '/creative-studio/prepress/wrap-marks',
  requireWorkspaceRole(['owner', 'admin', 'member', 'viewer']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { svgContent, colorProfile, bleedSpec, brandName, jobTitle } = req.body;
      if (!svgContent) {
        res.status(400).json({ success: false, error: { message: 'svgContent is required.' } });
        return;
      }
      const wrappedSvg = printPrepressEngine.wrapSvgWithPrepressMarks(
        svgContent,
        { colorProfile, bleedSpec },
        { brandName, jobTitle }
      );
      res.json({ success: true, data: { wrappedSvg } });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'PREPRESS_WRAP_FAILED', message: err.message } });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/assets/creative-studio/prepress/outline-fonts
 * Converts all <text> nodes to pure vector <path> curves for commercial print shops
 */
router.post(
  '/creative-studio/prepress/outline-fonts',
  requireWorkspaceRole(['owner', 'admin', 'member', 'viewer']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { svgContent, fontMode = 'OUTLINED_PATHS' } = req.body;
      if (!svgContent) {
        res.status(400).json({ success: false, error: { message: 'svgContent is required.' } });
        return;
      }
      const result = vectorGlyphEngine.convertTextToOutlinesSvg(svgContent, fontMode);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'FONT_OUTLINING_FAILED', message: err.message } });
    }
  }
);

/**
 * GET /api/v1/workspaces/:workspaceId/assets/creative-studio/prepress/cmyk-profiles
 * Returns standard CMYK ICC profiles and TAC limits
 */
router.get(
  '/creative-studio/prepress/cmyk-profiles',
  requireWorkspaceRole(['owner', 'admin', 'member', 'viewer']),
  async (_req: Request, res: Response): Promise<void> => {
    res.json({ success: true, data: COLOR_PROFILE_TAC_LIMITS });
  }
);

/* ==========================================================================
 * TRADEMARK CLEARANCE ENGINE ROUTES
 * ========================================================================== */

/**
 * POST /api/v1/workspaces/:workspaceId/assets/brand-trademark/clearance
 * Performs automated preliminary trademark collision screening across India IP India and USPTO
 */
router.post(
  '/brand-trademark/clearance',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await trademarkClearanceService.performPreliminaryClearance({
        workspaceId: req.workspace!.workspaceId,
        userId: req.user!.uid,
        wordmark: req.body?.wordmark,
        industryCategory: req.body?.industryCategory,
        targetJurisdiction: req.body?.targetJurisdiction,
        idempotencyKey: req.body?.idempotencyKey || (req.headers['x-idempotency-key'] as string),
      });
      res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'TRADEMARK_CLEARANCE_FAILED', message: err.message } });
    }
  }
);

/* ==========================================================================
 * UNIFIED AI ASSET INTELLIGENCE ENGINE ROUTES (PHASE 7)
 * ========================================================================== */

/**
 * POST /api/v1/workspaces/:workspaceId/assets/ai/analyze
 * Comprehensive multimodal asset analysis, metadata extraction, quality check, and fingerprinting
 */
router.post(
  '/ai/analyze',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const assetId = req.body?.assetId;
      if (!assetId) {
        res.status(400).json({ success: false, error: { code: 'INVALID_ARGUMENT', message: 'assetId is required.' } });
        return;
      }
      const result = await unifiedAiAssetIntelligenceService.analyzeAsset({
        workspaceId: req.workspace!.workspaceId,
        assetId,
        userId: req.user!.uid,
        bypassCredits: req.body?.bypassCredits,
      });
      res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'AI_ANALYSIS_FAILED', message: err.message } });
    }
  }
);

/**
 * GET /api/v1/workspaces/:workspaceId/assets/ai/intelligence/:assetId
 * Retrieves cached AI analysis result for an asset
 */
router.get(
  '/ai/intelligence/:assetId',
  requireWorkspaceRole(['owner', 'admin', 'member', 'viewer']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await unifiedAiAssetIntelligenceService.getAssetIntelligence(
        req.workspace!.workspaceId,
        req.params.assetId
      );
      if (!result) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Intelligence record not found.' } });
        return;
      }
      res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'FETCH_INTELLIGENCE_FAILED', message: err.message } });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/assets/ai/override
 * Human classification override with provenance protection
 */
router.post(
  '/ai/override',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { assetId, category, section, productId, tags } = req.body || {};
      if (!assetId) {
        res.status(400).json({ success: false, error: { code: 'INVALID_ARGUMENT', message: 'assetId is required.' } });
        return;
      }
      const result = await unifiedAiAssetIntelligenceService.applyHumanClassificationOverride({
        workspaceId: req.workspace!.workspaceId,
        assetId,
        userId: req.user!.uid,
        category,
        section,
        productId,
        tags,
      });
      res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'OVERRIDE_FAILED', message: err.message } });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/assets/ai/search
 * Natural language semantic search with hybrid retrieval
 */
router.post(
  '/ai/search',
  requireWorkspaceRole(['owner', 'admin', 'member', 'viewer']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const results = await unifiedAiAssetIntelligenceService.semanticSearch({
        workspaceId: req.workspace!.workspaceId,
        query: req.body?.query || '',
        section: req.body?.section,
        category: req.body?.category,
        productId: req.body?.productId,
        campaignId: req.body?.campaignId,
        tags: req.body?.tags,
        platform: req.body?.platform,
        limit: req.body?.limit ? Number(req.body.limit) : 20,
      });
      res.status(200).json({ success: true, data: results });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'SEMANTIC_SEARCH_FAILED', message: err.message } });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/assets/ai/similarity
 * Perceptual hash and visual similarity matching
 */
router.post(
  '/ai/similarity',
  requireWorkspaceRole(['owner', 'admin', 'member', 'viewer']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { assetId, maxDistance, limit } = req.body || {};
      if (!assetId) {
        res.status(400).json({ success: false, error: { code: 'INVALID_ARGUMENT', message: 'assetId is required.' } });
        return;
      }
      const matches = await unifiedAiAssetIntelligenceService.findVisuallySimilarAssets(
        req.workspace!.workspaceId,
        assetId,
        { maxDistance, limit }
      );
      res.status(200).json({ success: true, data: matches });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'SIMILARITY_CHECK_FAILED', message: err.message } });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/assets/ai/check-duplicate
 * Duplicate detection guardrail before upload or merge
 */
router.post(
  '/ai/check-duplicate',
  requireWorkspaceRole(['owner', 'admin', 'member', 'viewer']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { checksumSha256, svgMarkup, originalFileName, excludeAssetId } = req.body || {};
      const result = await unifiedAiAssetIntelligenceService.checkDuplicates({
        workspaceId: req.workspace!.workspaceId,
        checksumSha256,
        svgMarkup,
        originalFileName,
        excludeAssetId,
      });
      res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'DUPLICATE_CHECK_FAILED', message: err.message } });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/assets/ai/recommend
 * Contextual asset recommendation engine for campaign briefs and channels
 */
router.post(
  '/ai/recommend',
  requireWorkspaceRole(['owner', 'admin', 'member', 'viewer']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const recommendations = await unifiedAiAssetIntelligenceService.recommendAssets({
        workspaceId: req.workspace!.workspaceId,
        campaignBrief: req.body?.campaignBrief,
        productId: req.body?.productId,
        targetChannel: req.body?.targetChannel,
        businessObjective: req.body?.businessObjective,
        limit: req.body?.limit ? Number(req.body.limit) : 5,
      });
      res.status(200).json({ success: true, data: recommendations });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'RECOMMENDATION_FAILED', message: err.message } });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/assets/ai/jobs
 * Background job queue for async asset intelligence
 */
router.post(
  '/ai/jobs',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { assetId, jobType, idempotencyKey } = req.body || {};
      if (!assetId || !jobType) {
        res.status(400).json({ success: false, error: { code: 'INVALID_ARGUMENT', message: 'assetId and jobType are required.' } });
        return;
      }
      const job = await unifiedAiAssetIntelligenceService.createJob({
        workspaceId: req.workspace!.workspaceId,
        userId: req.user!.uid,
        assetId,
        jobType,
        idempotencyKey,
      });
      res.status(202).json({ success: true, data: job });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'JOB_CREATION_FAILED', message: err.message } });
    }
  }
);

/**
 * GET /api/v1/workspaces/:workspaceId/assets/ai/jobs/:jobId
 * Background job status inspection
 */
router.get(
  '/ai/jobs/:jobId',
  requireWorkspaceRole(['owner', 'admin', 'member', 'viewer']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const job = await unifiedAiAssetIntelligenceService.getJob(
        req.workspace!.workspaceId,
        req.params.jobId
      );
      if (!job) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Job not found.' } });
        return;
      }
      res.status(200).json({ success: true, data: job });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'FETCH_JOB_FAILED', message: err.message } });
    }
  }
);

/* ==========================================================================
 * CONVERSATIONAL ASSET INTELLIGENCE ASSISTANT ROUTES (PHASE 8)
 * ========================================================================== */

/**
 * POST /api/v1/workspaces/:workspaceId/assets/assistant/chat
 * Multi-turn natural language conversation and action orchestration
 */
router.post(
  '/assistant/chat',
  requireWorkspaceRole(['owner', 'admin', 'member', 'viewer']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { query, conversationId, confirmationToken, context } = req.body || {};
      if (!query && !confirmationToken) {
        res.status(400).json({ success: false, error: { code: 'INVALID_ARGUMENT', message: 'Query or confirmationToken is required.' } });
        return;
      }
      const result = await conversationalAssetAssistantService.processQuery({
        workspaceId: req.workspace!.workspaceId,
        userId: req.user!.uid,
        userRole: req.workspaceMember?.role || 'member',
        conversationId,
        query: query || '',
        confirmationToken,
        context,
      });
      res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      const isPermission = err.message?.startsWith('PERMISSION_DENIED');
      const isExpired = err.message?.startsWith('CONFIRMATION_EXPIRED');
      res.status(isPermission ? 403 : isExpired ? 400 : 500).json({
        success: false,
        error: { code: isPermission ? 'PERMISSION_DENIED' : isExpired ? 'CONFIRMATION_EXPIRED' : 'ASSISTANT_QUERY_FAILED', message: err.message },
      });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/assets/assistant/confirm
 * Explicit confirmation token execution for sensitive actions
 */
router.post(
  '/assistant/confirm',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { confirmationToken, conversationId } = req.body || {};
      if (!confirmationToken) {
        res.status(400).json({ success: false, error: { code: 'INVALID_ARGUMENT', message: 'confirmationToken is required.' } });
        return;
      }
      const result = await conversationalAssetAssistantService.executeConfirmedAction(
        req.workspace!.workspaceId,
        req.user!.uid,
        req.workspaceMember?.role || 'member',
        conversationId || `conv_confirm_${Date.now()}`,
        confirmationToken
      );
      res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      const isPermission = err.message?.startsWith('PERMISSION_DENIED');
      res.status(isPermission ? 403 : 500).json({
        success: false,
        error: { code: isPermission ? 'PERMISSION_DENIED' : 'CONFIRMATION_EXECUTION_FAILED', message: err.message },
      });
    }
  }
);

/**
 * GET /api/v1/workspaces/:workspaceId/assets/assistant/conversations
 * List conversation threads
 */
router.get(
  '/assistant/conversations',
  requireWorkspaceRole(['owner', 'admin', 'member', 'viewer']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const convs = await conversationalAssetAssistantService.listConversations(req.workspace!.workspaceId);
      res.status(200).json({ success: true, data: convs });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'FETCH_CONVERSATIONS_FAILED', message: err.message } });
    }
  }
);

/**
 * GET /api/v1/workspaces/:workspaceId/assets/assistant/conversations/:conversationId
 * Retrieve a specific conversation thread
 */
router.get(
  '/assistant/conversations/:conversationId',
  requireWorkspaceRole(['owner', 'admin', 'member', 'viewer']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const conv = await conversationalAssetAssistantService.getConversation(
        req.workspace!.workspaceId,
        req.params.conversationId
      );
      if (!conv) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Conversation not found.' } });
        return;
      }
      res.status(200).json({ success: true, data: conv });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'FETCH_CONVERSATION_FAILED', message: err.message } });
    }
  }
);

// ==========================================
// PHASE 9 — ECOSYSTEM INTEGRATION ROUTES
// ==========================================

/**
 * POST /api/v1/workspaces/:workspaceId/assets/ecosystem/sync-product
 * Synchronize Business Brain product updates to linked assets
 */
router.post(
  '/ecosystem/sync-product',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { productId, productName, sku, category, variants } = req.body || {};
      if (!productId) {
        res.status(400).json({ success: false, error: { code: 'INVALID_ARGUMENT', message: 'productId is required.' } });
        return;
      }
      const result = await assetEcosystemGatewayService.syncProductMetadata({
        workspaceId: req.workspace!.workspaceId,
        productId,
        productName: productName || 'Updated Product',
        sku,
        category,
        variants,
      });
      res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'PRODUCT_SYNC_FAILED', message: err.message } });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/assets/ecosystem/brand-studio/ingest
 * Ingest generated logo or collateral from BrandStudio
 */
router.post(
  '/ecosystem/brand-studio/ingest',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        assetName,
        description,
        assetType,
        section,
        svgContent,
        fileUrl,
        brandIdentityVersion,
        tags,
        tokens,
        usageRules,
        productIds,
        campaignIds,
      } = req.body || {};

      if (!assetName || !assetType) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_ARGUMENT', message: 'assetName and assetType are required.' },
        });
        return;
      }

      const result = await assetEcosystemGatewayService.ingestBrandStudioCreative({
        workspaceId: req.workspace!.workspaceId,
        userId: req.user!.uid,
        assetName,
        description,
        assetType,
        section,
        svgContent,
        fileUrl,
        brandIdentityVersion,
        tags,
        tokens,
        usageRules,
        productIds,
        campaignIds,
      });

      res.status(201).json({ success: true, data: result });
    } catch (err: any) {
      const isVideoForbidden = err.message?.includes('STRICT_VIDEO_EXCLUSION');
      res.status(isVideoForbidden ? 400 : 500).json({
        success: false,
        error: { code: isVideoForbidden ? 'STRICT_VIDEO_EXCLUSION' : 'INGEST_FAILED', message: err.message },
      });
    }
  }
);

/**
 * GET /api/v1/workspaces/:workspaceId/assets/ecosystem/campaign/discover
 * Discover approved assets for Campaign Studio
 */
router.get(
  '/ecosystem/campaign/discover',
  requireWorkspaceRole(['owner', 'admin', 'member', 'viewer']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { campaignId, productId, section, approvedOnly, searchQuery, tags, limit } = req.query;
      const parsedTags = tags ? (tags as string).split(',').map((t) => t.trim()) : undefined;

      const assets = await assetEcosystemGatewayService.discoverCampaignAssets({
        workspaceId: req.workspace!.workspaceId,
        campaignId: campaignId as string | undefined,
        productId: productId as string | undefined,
        section: section as any,
        approvedOnly: approvedOnly !== 'false',
        searchQuery: searchQuery as string | undefined,
        tags: parsedTags,
        limit: limit ? Number(limit) : undefined,
      });

      res.status(200).json({ success: true, data: assets });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'DISCOVERY_FAILED', message: err.message } });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/assets/ecosystem/campaign/bind
 * Bind assets to campaign and create collection
 */
router.post(
  '/ecosystem/campaign/bind',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { campaignId, campaignName, assetIds, createCollection, collectionName } = req.body || {};
      if (!campaignId || !assetIds || !Array.isArray(assetIds)) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_ARGUMENT', message: 'campaignId and assetIds array are required.' },
        });
        return;
      }

      const result = await assetEcosystemGatewayService.bindAssetsToCampaign({
        workspaceId: req.workspace!.workspaceId,
        campaignId,
        campaignName: campaignName || campaignId,
        assetIds,
        createCollection: createCollection !== false,
        collectionName,
        userId: req.user!.uid,
      });

      res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'BIND_FAILED', message: err.message } });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/assets/ecosystem/campaign/save-creative
 * Save approved creative generated in Campaign Studio
 */
router.post(
  '/ecosystem/campaign/save-creative',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { campaignId, campaignName, creativeName, svgContent, dimensions, productIds, tags, section } = req.body || {};
      if (!campaignId || !creativeName || !svgContent) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_ARGUMENT', message: 'campaignId, creativeName, and svgContent are required.' },
        });
        return;
      }

      const asset = await assetEcosystemGatewayService.saveCampaignCreative({
        workspaceId: req.workspace!.workspaceId,
        userId: req.user!.uid,
        campaignId,
        campaignName: campaignName || campaignId,
        creativeName,
        svgContent,
        dimensions,
        productIds,
        tags,
        section,
      });

      res.status(201).json({ success: true, data: asset });
    } catch (err: any) {
      const isVideoForbidden = err.message?.includes('STRICT_VIDEO_EXCLUSION');
      res.status(isVideoForbidden ? 400 : 500).json({
        success: false,
        error: { code: isVideoForbidden ? 'STRICT_VIDEO_EXCLUSION' : 'SAVE_CREATIVE_FAILED', message: err.message },
      });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/assets/ecosystem/content-studio/derivative
 * Create multi-format derivative maintaining parent-child lineage
 */
router.post(
  '/ecosystem/content-studio/derivative',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { parentAssetId, targetFormat, dimensions, modifiedSvgContent, nameSuffix, tags, notes } = req.body || {};
      if (!parentAssetId || !targetFormat) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_ARGUMENT', message: 'parentAssetId and targetFormat are required.' },
        });
        return;
      }

      const result = await assetEcosystemGatewayService.createAssetDerivative({
        workspaceId: req.workspace!.workspaceId,
        userId: req.user!.uid,
        parentAssetId,
        targetFormat,
        dimensions: dimensions || { width: 1080, height: 1080, unit: 'px' },
        modifiedSvgContent,
        nameSuffix,
        tags,
        notes,
      });

      res.status(201).json({ success: true, data: result });
    } catch (err: any) {
      const isVideoForbidden = err.message?.includes('STRICT_VIDEO_EXCLUSION');
      res.status(isVideoForbidden ? 400 : 500).json({
        success: false,
        error: { code: isVideoForbidden ? 'STRICT_VIDEO_EXCLUSION' : 'DERIVATIVE_FAILED', message: err.message },
      });
    }
  }
);

/**
 * GET /api/v1/workspaces/:workspaceId/assets/ecosystem/competitive/opportunities
 * Retrieve certified non-infringing creative opportunities from competitive gap analysis
 */
router.get(
  '/ecosystem/competitive/opportunities',
  requireWorkspaceRole(['owner', 'admin', 'member', 'viewer']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { category, competitorIds } = req.query;
      const parsedCompetitors = competitorIds ? (competitorIds as string).split(',').map((c) => c.trim()) : undefined;

      const recommendations = await assetEcosystemGatewayService.getCreativeOpportunities({
        workspaceId: req.workspace!.workspaceId,
        productCategory: category as string | undefined,
        competitorIds: parsedCompetitors,
      });

      res.status(200).json({ success: true, data: recommendations });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'OPPORTUNITIES_FAILED', message: err.message } });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/assets/ecosystem/analytics/performance
 * Record impressions, clicks, conversions for an asset
 */
router.post(
  '/ecosystem/analytics/performance',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { assetId, campaignId, channel, impressions, clicks, conversions, spend, revenue } = req.body || {};
      if (!assetId || impressions === undefined || clicks === undefined) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_ARGUMENT', message: 'assetId, impressions, and clicks are required.' },
        });
        return;
      }

      const summary = await assetEcosystemGatewayService.recordAssetPerformance({
        workspaceId: req.workspace!.workspaceId,
        assetId,
        campaignId,
        channel,
        impressions: Number(impressions),
        clicks: Number(clicks),
        conversions: Number(conversions || 0),
        spend: spend ? Number(spend) : undefined,
        revenue: revenue ? Number(revenue) : undefined,
      });

      res.status(200).json({ success: true, data: summary });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'PERFORMANCE_RECORD_FAILED', message: err.message } });
    }
  }
);

/**
 * GET /api/v1/workspaces/:workspaceId/assets/ecosystem/analytics/:assetId/performance
 * Get performance summary for an asset
 */
router.get(
  '/ecosystem/analytics/:assetId/performance',
  requireWorkspaceRole(['owner', 'admin', 'member', 'viewer']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const summary = await assetEcosystemGatewayService.getAssetPerformanceSummary(
        req.workspace!.workspaceId,
        req.params.assetId
      );
      res.status(200).json({ success: true, data: summary });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'FETCH_PERFORMANCE_FAILED', message: err.message } });
    }
  }
);

/**
 * GET /api/v1/workspaces/:workspaceId/assets/ecosystem/analytics/top-performing
 * List top-performing assets by chosen metric
 */
router.get(
  '/ecosystem/analytics/top-performing',
  requireWorkspaceRole(['owner', 'admin', 'member', 'viewer']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const metric = (req.query.metric as 'ctr' | 'conversions' | 'impressions') || 'ctr';
      const limit = req.query.limit ? Number(req.query.limit) : 10;
      const top = await assetEcosystemGatewayService.listTopPerformingAssets(
        req.workspace!.workspaceId,
        metric,
        limit
      );
      res.status(200).json({ success: true, data: top });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'FETCH_TOP_PERFORMING_FAILED', message: err.message } });
    }
  }
);

// ==========================================
// PHASE 11 — PRODUCTION HARDENING & SECURITY ROUTES
// ==========================================

/**
 * GET /api/v1/workspaces/:workspaceId/assets/hardening/audit-integrity
 * Run complete data integrity, broken storage, and duplicate audit
 */
router.get(
  '/hardening/audit-integrity',
  requireWorkspaceRole(['owner', 'admin']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const report = await assetProductionHardeningService.auditWorkspaceIntegrity(
        req.workspace!.workspaceId
      );
      res.status(200).json({ success: true, data: report });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'AUDIT_FAILED', message: err.message } });
    }
  }
);

/**
 * GET /api/v1/workspaces/:workspaceId/assets/hardening/cost-summary
 * Get AI cost control, caching statistics, and token savings
 */
router.get(
  '/hardening/cost-summary',
  requireWorkspaceRole(['owner', 'admin', 'member', 'viewer']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const summary = assetProductionHardeningService.getAiCostSummary(req.workspace!.workspaceId);
      res.status(200).json({ success: true, data: summary });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'COST_SUMMARY_FAILED', message: err.message } });
    }
  }
);

/**
 * GET /api/v1/workspaces/:workspaceId/assets/hardening/queue-health
 * Check reliability background queue and dead-letter count
 */
router.get(
  '/hardening/queue-health',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const health = await assetProductionHardeningService.getQueueHealth(req.workspace!.workspaceId);
      res.status(200).json({ success: true, data: health });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'QUEUE_HEALTH_FAILED', message: err.message } });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/assets/hardening/benchmark
 * Execute load benchmark on asset ingestion and retrieval
 */
router.post(
  '/hardening/benchmark',
  requireWorkspaceRole(['owner', 'admin']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const count = Number(req.body?.count) || 100;
      const metrics = await assetProductionHardeningService.runLoadBenchmark(
        req.workspace!.workspaceId,
        count
      );
      res.status(200).json({
        success: true,
        data: {
          metrics,
          honestyStatement: assetProductionHardeningService.getHonestyStatement(),
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'BENCHMARK_FAILED', message: err.message } });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/assets/hardening/snapshot
 * Create disaster recovery snapshot
 */
router.post(
  '/hardening/snapshot',
  requireWorkspaceRole(['owner', 'admin']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const snapshot = await assetProductionHardeningService.createDisasterRecoverySnapshot(
        req.workspace!.workspaceId
      );
      res.status(201).json({ success: true, data: snapshot });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'SNAPSHOT_FAILED', message: err.message } });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/assets/hardening/restore
 * Restore workspace assets and collections from backup snapshot
 */
router.post(
  '/hardening/restore',
  requireWorkspaceRole(['owner', 'admin']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const snapshot = req.body?.snapshot;
      if (!snapshot) {
        res.status(400).json({ success: false, error: { code: 'INVALID_ARGUMENT', message: 'snapshot is required.' } });
        return;
      }
      const result = await assetProductionHardeningService.restoreFromSnapshot(
        req.workspace!.workspaceId,
        snapshot
      );
      res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'RESTORE_FAILED', message: err.message } });
    }
  }
);

// =============================================================================
// ADVANCED ASSET INTELLIGENCE EXTENSIONS ROUTES
// =============================================================================

/**
 * POST /api/v1/workspaces/:workspaceId/assets/extensions/autopilot
 */
router.post(
  '/extensions/autopilot',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const assetId = req.body?.assetId;
      if (!assetId) {
        res.status(400).json({ success: false, error: { code: 'INVALID_ARGUMENT', message: 'assetId is required.' } });
        return;
      }
      const result = await assetIntelligenceExtensionsService.runAssetAutopilot(
        req.workspace!.workspaceId,
        assetId,
        req.user?.userId
      );
      res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'AUTOPILOT_FAILED', message: err.message } });
    }
  }
);

/**
 * GET /api/v1/workspaces/:workspaceId/assets/extensions/brand-drift
 */
router.get(
  '/extensions/brand-drift',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await assetIntelligenceExtensionsService.scanBrandDrift(req.workspace!.workspaceId);
      res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'BRAND_DRIFT_SCAN_FAILED', message: err.message } });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/assets/extensions/product-impact
 */
router.post(
  '/extensions/product-impact',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { productId, updatedData } = req.body || {};
      if (!productId || !updatedData) {
        res.status(400).json({ success: false, error: { code: 'INVALID_ARGUMENT', message: 'productId and updatedData are required.' } });
        return;
      }
      const result = await assetIntelligenceExtensionsService.evaluateProductChangeImpact({
        workspaceId: req.workspace!.workspaceId,
        productId,
        updatedData,
      });
      res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'IMPACT_EVALUATION_FAILED', message: err.message } });
    }
  }
);

/**
 * GET /api/v1/workspaces/:workspaceId/assets/extensions/creative-dna
 */
router.get(
  '/extensions/creative-dna',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await assetIntelligenceExtensionsService.extractCreativeDna(req.workspace!.workspaceId);
      res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'CREATIVE_DNA_FAILED', message: err.message } });
    }
  }
);

/**
 * GET /api/v1/workspaces/:workspaceId/assets/extensions/opportunity-finder
 */
router.get(
  '/extensions/opportunity-finder',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await assetIntelligenceExtensionsService.findAssetOpportunities(req.workspace!.workspaceId);
      res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'OPPORTUNITY_FINDER_FAILED', message: err.message } });
    }
  }
);

/**
 * GET /api/v1/workspaces/:workspaceId/assets/extensions/seasonal-calendar
 */
router.get(
  '/extensions/seasonal-calendar',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const month = req.query.month ? Number(req.query.month) : undefined;
      const result = assetIntelligenceExtensionsService.generateSeasonalCalendar(req.workspace!.workspaceId, month);
      res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'SEASONAL_CALENDAR_FAILED', message: err.message } });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/assets/extensions/brief-generator
 */
router.post(
  '/extensions/brief-generator',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { objective, productId, targetChannel } = req.body || {};
      if (!objective) {
        res.status(400).json({ success: false, error: { code: 'INVALID_ARGUMENT', message: 'objective is required.' } });
        return;
      }
      const result = await assetIntelligenceExtensionsService.generateCreativeBrief({
        workspaceId: req.workspace!.workspaceId,
        objective,
        productId,
        targetChannel,
      });
      res.status(201).json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'BRIEF_GENERATION_FAILED', message: err.message } });
    }
  }
);

/**
 * GET /api/v1/workspaces/:workspaceId/assets/extensions/rights-monitor
 */
router.get(
  '/extensions/rights-monitor',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await assetIntelligenceExtensionsService.auditRightsLicenses(req.workspace!.workspaceId);
      res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'RIGHTS_MONITOR_FAILED', message: err.message } });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/assets/extensions/localize
 * Priority Indic Localization (Hindi, Telugu, Tamil, etc.)
 */
router.post(
  '/extensions/localize',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { parentAssetId, targetLanguage, translatedHeadline, translatedBody } = req.body || {};
      if (!parentAssetId || !targetLanguage) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_ARGUMENT', message: 'parentAssetId and targetLanguage are required.' },
        });
        return;
      }
      const result = await assetIntelligenceExtensionsService.localizeCreativeAsset({
        workspaceId: req.workspace!.workspaceId,
        parentAssetId,
        targetLanguage,
        translatedHeadline,
        translatedBody,
        userId: req.user?.userId,
      });
      res.status(201).json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'LOCALIZATION_FAILED', message: err.message } });
    }
  }
);

/**
 * GET /api/v1/workspaces/:workspaceId/assets/extensions/asset-waste
 */
router.get(
  '/extensions/asset-waste',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await assetIntelligenceExtensionsService.auditAssetWaste(req.workspace!.workspaceId);
      res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'WASTE_AUDIT_FAILED', message: err.message } });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/assets/extensions/experiment-track
 */
router.post(
  '/extensions/experiment-track',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { experimentName, hypothesis, variantAId, variantBId, variantACtr, variantBCtr } = req.body || {};
      if (!experimentName || !variantAId || !variantBId) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_ARGUMENT', message: 'experimentName, variantAId, and variantBId are required.' },
        });
        return;
      }
      const result = await assetIntelligenceExtensionsService.trackCreativeExperiment(req.workspace!.workspaceId, {
        experimentName,
        hypothesis: hypothesis || '',
        variantAId,
        variantBId,
        variantACtr: Number(variantACtr || 0),
        variantBCtr: Number(variantBCtr || 0),
      });
      res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'EXPERIMENT_TRACK_FAILED', message: err.message } });
    }
  }
);

/**
 * GET /api/v1/workspaces/:workspaceId/assets/extensions/cross-brand-audit
 */
router.get(
  '/extensions/cross-brand-audit',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await assetIntelligenceExtensionsService.auditMultiBrandIsolation(req.workspace!.workspaceId);
      res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'MULTI_BRAND_AUDIT_FAILED', message: err.message } });
    }
  }
);

// =============================================================================
// SOCIAL MEDIA ASSET INTELLIGENCE ROUTES (PHASE 5)
// =============================================================================

/**
 * GET /api/v1/workspaces/:workspaceId/assets/social/platforms
 * Get configurable platform format specifications
 */
router.get(
  '/social/platforms',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const platform = req.query.platform as any;
      const contentType = req.query.contentType as any;
      const specs = socialMediaIntelligenceService.getPlatformSpecifications({ platform, contentType });
      res.status(200).json({ success: true, data: specs });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'PLATFORM_SPECS_FAILED', message: err.message } });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/assets/social/adapt
 * Adapt one source asset to multiple platform-specific formats with safe zones
 */
router.post(
  '/social/adapt',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { sourceAssetId, targetFormats, headlineOverride, ctaOverride } = req.body || {};
      if (!sourceAssetId || !Array.isArray(targetFormats) || targetFormats.length === 0) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_ARGUMENT', message: 'sourceAssetId and targetFormats array are required.' },
        });
        return;
      }
      const result = await socialMediaIntelligenceService.adaptAssetToPlatforms({
        workspaceId: req.workspace!.workspaceId,
        sourceAssetId,
        targetFormats,
        headlineOverride,
        ctaOverride,
        userId: req.user?.userId,
      });
      res.status(201).json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'PLATFORM_ADAPTATION_FAILED', message: err.message } });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/assets/social/generate
 * AI creative generation for posts, carousels, Reel covers, and thumbnails
 */
router.post(
  '/social/generate',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        platform,
        contentType,
        promptHeadline,
        subheadline,
        callToAction,
        productId,
        campaignId,
        creativeConcept,
        targetAudience,
        carouselSlides,
        customDimensions,
      } = req.body || {};

      if (!platform || !contentType || !promptHeadline) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_ARGUMENT', message: 'platform, contentType, and promptHeadline are required.' },
        });
        return;
      }

      const result = await socialMediaIntelligenceService.generateSocialCreative({
        workspaceId: req.workspace!.workspaceId,
        userId: req.user?.userId || 'system',
        platform,
        contentType,
        promptHeadline,
        subheadline,
        callToAction,
        productId,
        campaignId,
        creativeConcept,
        targetAudience,
        carouselSlides,
        customDimensions,
      });

      res.status(201).json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'SOCIAL_GENERATION_FAILED', message: err.message } });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/assets/social/campaign-bind
 * Connect creatives to Campaign Studio collection
 */
router.post(
  '/social/campaign-bind',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { campaignId, campaignName, assetIds } = req.body || {};
      if (!campaignId || !campaignName || !Array.isArray(assetIds) || assetIds.length === 0) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_ARGUMENT', message: 'campaignId, campaignName, and assetIds are required.' },
        });
        return;
      }

      const result = await socialMediaIntelligenceService.bindCreativesToCampaign({
        workspaceId: req.workspace!.workspaceId,
        campaignId,
        campaignName,
        assetIds,
        userId: req.user?.userId,
      });

      res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'CAMPAIGN_BIND_FAILED', message: err.message } });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/assets/social/performance
 * Ingest social performance metrics with provenance
 */
router.post(
  '/social/performance',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const record = req.body;
      if (!record?.assetId || !record?.platform || record?.impressions === undefined) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_ARGUMENT', message: 'assetId, platform, and impressions are required.' },
        });
        return;
      }

      const result = await socialMediaIntelligenceService.ingestPerformanceMetrics({
        ...record,
        workspaceId: req.workspace!.workspaceId,
      });

      res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'PERFORMANCE_INGESTION_FAILED', message: err.message } });
    }
  }
);

/**
 * GET /api/v1/workspaces/:workspaceId/assets/social/performance-memory
 * Extract visual patterns and evidence-based recommendations
 */
router.get(
  '/social/performance-memory',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await socialMediaIntelligenceService.extractCreativePerformanceMemory(
        req.workspace!.workspaceId
      );
      res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'PERFORMANCE_MEMORY_FAILED', message: err.message } });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/assets/social/repurpose
 * Repurpose existing collateral into target social format
 */
router.post(
  '/social/repurpose',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { sourceAssetId, targetPlatform, targetContentType } = req.body || {};
      if (!sourceAssetId || !targetPlatform || !targetContentType) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_ARGUMENT', message: 'sourceAssetId, targetPlatform, and targetContentType are required.' },
        });
        return;
      }

      const result = await socialMediaIntelligenceService.repurposeAsset({
        workspaceId: req.workspace!.workspaceId,
        sourceAssetId,
        targetPlatform,
        targetContentType,
        userId: req.user?.userId,
      });

      res.status(201).json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'REPURPOSE_FAILED', message: err.message } });
    }
  }
);

// =============================================================================
// PHASE 6: ENTERPRISE ARCHIVAL, RETENTION & COMPLIANCE ROUTES
// =============================================================================

/**
 * GET /api/v1/workspaces/:workspaceId/assets/archive/policies
 * Lists or seeds statutory retention policies
 */
router.get(
  '/archive/policies',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const policies = await enterpriseArchivalService.getOrSeedDefaultPolicies(req.workspace!.workspaceId);
      res.json({ success: true, data: policies });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'LIST_POLICIES_FAILED', message: err.message } });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/assets/archive/policies
 * Creates a custom retention policy
 */
router.post(
  '/archive/policies',
  requireWorkspaceRole(['owner', 'admin']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const policy = await enterpriseArchivalService.createRetentionPolicy(req.workspace!.workspaceId, req.body);
      res.status(201).json({ success: true, data: policy });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'CREATE_POLICY_FAILED', message: err.message } });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/assets/archive/assign-policy
 * Assigns a retention policy to an asset
 */
router.post(
  '/archive/assign-policy',
  requireWorkspaceRole(['owner', 'admin']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { assetId, scheduleType } = req.body;
      if (!assetId || !scheduleType) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_ARGUMENT', message: 'assetId and scheduleType are required.' },
        });
        return;
      }
      const updated = await enterpriseArchivalService.assignRetentionPolicy(
        req.workspace!.workspaceId,
        assetId,
        scheduleType,
        req.user?.uid || req.user?.userId || 'system'
      );
      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'ASSIGN_POLICY_FAILED', message: err.message } });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/assets/archive/legal-hold
 * Places a binding litigation or regulatory hold on an asset
 */
router.post(
  '/archive/legal-hold',
  requireWorkspaceRole(['owner', 'admin']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { assetId, reason, matterReference, notes } = req.body;
      if (!assetId || !reason || !matterReference) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_ARGUMENT', message: 'assetId, reason, and matterReference are required.' },
        });
        return;
      }
      const hold = await enterpriseArchivalService.applyLegalHold(
        req.workspace!.workspaceId,
        assetId,
        reason,
        matterReference,
        req.user?.uid || req.user?.userId || 'legal_officer',
        notes
      );
      res.status(201).json({ success: true, data: hold });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'APPLY_LEGAL_HOLD_FAILED', message: err.message } });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/assets/archive/legal-hold/release
 * Releases an active legal hold
 */
router.post(
  '/archive/legal-hold/release',
  requireWorkspaceRole(['owner', 'admin']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { holdId, releaseReason } = req.body;
      if (!holdId || !releaseReason) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_ARGUMENT', message: 'holdId and releaseReason are required.' },
        });
        return;
      }
      const released = await enterpriseArchivalService.releaseLegalHold(
        req.workspace!.workspaceId,
        holdId,
        releaseReason,
        req.user?.uid || req.user?.userId || 'legal_officer'
      );
      res.json({ success: true, data: released });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'RELEASE_LEGAL_HOLD_FAILED', message: err.message } });
    }
  }
);

/**
 * GET /api/v1/workspaces/:workspaceId/assets/archive/legal-holds
 * Lists active or released legal holds
 */
router.get(
  '/archive/legal-holds',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const assetId = req.query.assetId as string | undefined;
      const status = req.query.status as 'ACTIVE' | 'RELEASED' | undefined;
      const holds = await enterpriseArchivalService.listLegalHolds(req.workspace!.workspaceId, assetId, status);
      res.json({ success: true, data: holds });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'LIST_LEGAL_HOLDS_FAILED', message: err.message } });
    }
  }
);

/**
 * GET /api/v1/workspaces/:workspaceId/assets/archive/custody/:assetId
 * Retrieves tamper-evident chain-of-custody audit trail
 */
router.get(
  '/archive/custody/:assetId',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const chain = await enterpriseArchivalService.getChainOfCustody(
        req.workspace!.workspaceId,
        req.params.assetId
      );
      res.json({ success: true, data: chain });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'GET_CUSTODY_FAILED', message: err.message } });
    }
  }
);

/**
 * GET /api/v1/workspaces/:workspaceId/assets/archive/audit-retention
 * Audits workspace retention dispositions and cold storage tiering
 */
router.get(
  '/archive/audit-retention',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const summary = await enterpriseArchivalService.evaluateWorkspaceRetention(req.workspace!.workspaceId);
      res.json({ success: true, data: summary });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'AUDIT_RETENTION_FAILED', message: err.message } });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/assets/archive/tier-storage
 * Transitions asset storage class to Nearline, Coldline, or Archive
 */
router.post(
  '/archive/tier-storage',
  requireWorkspaceRole(['owner', 'admin']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { assetId, targetStorageClass } = req.body;
      if (!assetId || !targetStorageClass) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_ARGUMENT', message: 'assetId and targetStorageClass are required.' },
        });
        return;
      }
      const record = await enterpriseArchivalService.tierAssetStorageClass(
        req.workspace!.workspaceId,
        assetId,
        targetStorageClass,
        req.user?.uid || req.user?.userId || 'system'
      );
      res.json({ success: true, data: record });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'TIER_STORAGE_FAILED', message: err.message } });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/assets/archive/purge-certified
 * Purges expired assets with cryptographic Disposal Certificate (checks legal holds)
 */
router.post(
  '/archive/purge-certified',
  requireWorkspaceRole(['owner', 'admin']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { assetIds, reason } = req.body;
      if (!Array.isArray(assetIds) || assetIds.length === 0) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_ARGUMENT', message: 'assetIds must be a non-empty array.' },
        });
        return;
      }
      const cert = await enterpriseArchivalService.purgeExpiredAssetsWithCertificate(
        req.workspace!.workspaceId,
        assetIds,
        req.user?.uid || req.user?.userId || 'compliance_officer',
        reason
      );
      res.json({ success: true, data: cert });
    } catch (err: any) {
      const statusCode = err.message.includes('LITIGATION_HOLD_ACTIVE') ? 403 : 500;
      res.status(statusCode).json({
        success: false,
        error: {
          code: err.message.includes('LITIGATION_HOLD_ACTIVE') ? 'LITIGATION_HOLD_ACTIVE' : 'PURGE_FAILED',
          message: err.message,
        },
      });
    }
  }
);

/**
 * GET /api/v1/workspaces/:workspaceId/assets/archive/certificates
 * Lists generated disposal certificates
 */
router.get(
  '/archive/certificates',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const certs = await enterpriseArchivalService.listDisposalCertificates(req.workspace!.workspaceId);
      res.json({ success: true, data: certs });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'LIST_CERTIFICATES_FAILED', message: err.message } });
    }
  }
);

/**
 * GET /api/v1/workspaces/:workspaceId/assets/archive/certificates/:certificateId
 * Retrieves a disposal certificate by ID
 */
router.get(
  '/archive/certificates/:certificateId',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const cert = await enterpriseArchivalService.getDisposalCertificate(
        req.workspace!.workspaceId,
        req.params.certificateId
      );
      if (!cert) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Disposal certificate not found.' } });
        return;
      }
      res.json({ success: true, data: cert });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'GET_CERTIFICATE_FAILED', message: err.message } });
    }
  }
);

export const assetRoutes = router;
