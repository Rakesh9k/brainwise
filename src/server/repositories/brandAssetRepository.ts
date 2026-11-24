/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'node:crypto';
import { db, DbQuery } from '../db/firestore';
import { storageService } from '../services/storageService';
import type {
  UnifiedBrandAssetEntity,
  AssetVersionEntity,
  AssetCollectionEntity,
  AssetSection,
  AssetLifecycleStatus,
  AssetCollectionType,
} from '../types/assetLibrary';
import {
  validateUnifiedAsset,
  isValidStatusTransition,
} from '../types/assetLibrary';

export type {
  UnifiedBrandAssetEntity,
  AssetSection,
  AssetCategory,
  AssetLifecycleStatus,
  AssetCollectionEntity,
} from '../types/assetLibrary';

export class BrandAssetRepository {
  // ===========================================================================
  // 1. ASSET CRUD & REGISTRY
  // ===========================================================================

  /**
   * Normalizes arbitrary section strings into canonical AssetSection enums
   */
  public normalizeSection(input?: string): AssetSection {
    if (!input) return 'Active';
    const s = input.toLowerCase().trim();
    if (s === 'identity') return 'Identity';
    if (s === 'packaging' || s === 'print' || s === 'print & packaging' || s === 'print & packaging' || s === 'print_packaging') return 'Print & Packaging';
    if (s === 'social' || s === 'social media' || s === 'social_media') return 'Social Media';
    if (s === 'archived' || s === 'archive') return 'Archived';
    return 'Active';
  }

  /**
   * Normalizes an asset object to guarantee two-way compatibility between
   * backend BrandAssetEntity and frontend React 19 BrandAsset
   */
  private normalizeAsset(raw: any): UnifiedBrandAssetEntity {
    const assetId = raw.assetId || raw.id || `asset_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const name = raw.name || raw.title || 'Untitled Asset';
    const section: AssetSection = this.normalizeSection(raw.section || raw.folder);
    const folder = section;
    const category = raw.category || 'Collateral';
    const assetType = raw.assetType || raw.type || 'svg';
    const mimeType = raw.mimeType || (assetType === 'svg' ? 'image/svg+xml' : 'image/png');
    const svgContent = raw.svgContent || raw.svgMarkup;
    const version = Number(raw.version) || 1;
    const currentVersionId = raw.currentVersionId || `v_${version}`;
    const now = new Date().toISOString();
    const createdAt = raw.createdAt || now;
    const updatedAt = raw.updatedAt || now;

    // Harmonize status between 'active'/'archived' and full lifecycle enum
    const rawStatus = String(raw.status || raw.approvalStatus || raw.lifecycleStatus || '').toLowerCase().trim();
    let status: AssetLifecycleStatus = 'active';
    if (rawStatus === 'archived' || section === 'Archived') {
      status = 'archived';
    } else if (rawStatus === 'approved') {
      status = 'approved';
    } else if (rawStatus === 'draft') {
      status = 'draft';
    } else if (rawStatus === 'under_review') {
      status = 'under_review';
    } else if (rawStatus === 'superseded') {
      status = 'superseded';
    }

    return {
      assetId,
      id: assetId,
      workspaceId: raw.workspaceId,
      businessId: raw.businessId || raw.workspaceId,
      name,
      title: name,
      description: raw.description || '',
      assetType,
      type: assetType,
      category,
      section,
      folder,
      secondarySections: Array.isArray(raw.secondarySections) ? raw.secondarySections : [],
      mimeType,
      originalFileName: raw.originalFileName || raw.fileName || `${name}.${assetType}`,
      storagePath: raw.storagePath || `workspaces/${raw.workspaceId}/brand/${assetId}`,
      storageUrl: raw.storageUrl,
      fileSize: Number(raw.fileSize) || (svgContent ? Buffer.byteLength(svgContent, 'utf8') : 1024),
      dimensions: raw.dimensions,
      resolution: raw.resolution,
      duration: raw.duration ?? null,
      thumbnailStoragePath: raw.thumbnailStoragePath,
      thumbnailUrl: raw.thumbnailUrl,
      previewStoragePath: raw.previewStoragePath,
      previewUrl: raw.previewUrl,
      svgContent,
      svgMarkup: svgContent,
      createdBy: raw.createdBy || 'system',
      ownedBy: raw.ownedBy || raw.businessId || raw.workspaceId,
      currentVersionId,
      version,
      parentAssetId: raw.parentAssetId || null,
      derivativeAssetIds: Array.isArray(raw.derivativeAssetIds) ? raw.derivativeAssetIds : [],
      status,
      lifecycleStatus: (status === 'archived' || raw.status === 'archived' || section === 'Archived' || String(raw.lifecycleStatus).toLowerCase() === 'archived')
        ? 'Archived'
        : (String(raw.lifecycleStatus).toLowerCase() === 'active' || status === 'active' ? 'Active' : (raw.lifecycleStatus || (status === 'draft' ? 'Draft' : 'Active'))),
      approvalStatus: raw.approvalStatus || (status === 'approved' ? 'approved' : 'pending'),
      visibility: raw.visibility || 'workspace',
      tags: Array.isArray(raw.tags) ? raw.tags : [],
      collectionIds: Array.isArray(raw.collectionIds) ? raw.collectionIds : [],
      productIds: Array.isArray(raw.productIds) ? raw.productIds : [],
      campaignIds: Array.isArray(raw.campaignIds) ? raw.campaignIds : [],
      brandId: raw.brandId,
      conceptId: raw.conceptId,
      aiMetadata: raw.aiMetadata || {
        aiGenerated: Boolean(raw.aiGenerated),
        aiPrompt: raw.aiPrompt,
        aiModel: raw.aiModel,
        artDirectionNote: raw.artDirectionNote,
        generationMetadata: raw.generationMetadata,
      },
      verifiedMetadata: raw.verifiedMetadata || {
        truthVerified: Boolean(raw.truthVerified ?? true),
        checksumSha256: raw.checksumSha256 || (svgContent ? storageService.computeChecksumSha256(svgContent) : ''),
        integrityPassed: true,
      },
      rightsMetadata: raw.rightsMetadata || {
        licenseType: 'proprietary',
        attributionRequired: false,
      },
      format: raw.format || `${category} · ${assetType.toUpperCase()}`,
      headlineText: raw.headlineText || name,
      subtext: raw.subtext || raw.description || '',
      accentHex: raw.accentHex || '#FF7417',
      darkVariant: Boolean(raw.darkVariant),
      slides: raw.slides,
      caption: raw.caption,
      hashtags: raw.hashtags,
      artDirectionNote: raw.artDirectionNote,
      metadata: raw.metadata || {},
      usageCount: typeof raw.usageCount === 'number' ? raw.usageCount : 0,
      retentionSchedule: raw.retentionSchedule,
      retentionExpiresAt: raw.retentionExpiresAt,
      retentionPolicyId: raw.retentionPolicyId,
      hasLegalHold: Boolean(raw.hasLegalHold),
      activeLegalHoldId: raw.activeLegalHoldId,
      legalHoldReason: raw.legalHoldReason,
      legalHoldReference: raw.legalHoldReference,
      storageClass: raw.storageClass,
      storageTieredAt: raw.storageTieredAt,
      uploadedAt: raw.uploadedAt || createdAt,
      createdAt,
      updatedAt,
    };
  }

  public async create(asset: Partial<UnifiedBrandAssetEntity>): Promise<UnifiedBrandAssetEntity> {
    const normalized = this.normalizeAsset(asset);
    const validation = validateUnifiedAsset(normalized);
    if (!validation.valid) {
      throw new Error(`ASSET_VALIDATION_FAILED: ${validation.errors.join(', ')}`);
    }

    // Persist asset root document
    await db
      .doc<UnifiedBrandAssetEntity>(`workspaces/${normalized.workspaceId}/brandAssets/${normalized.assetId}`)
      .set(normalized);

    // Automatically create immutable Version 1 in subcollection
    const version1: AssetVersionEntity = {
      versionId: normalized.currentVersionId,
      assetId: normalized.assetId,
      workspaceId: normalized.workspaceId,
      versionNumber: 1,
      storagePath: normalized.storagePath,
      fileSize: normalized.fileSize,
      mimeType: normalized.mimeType,
      checksumSha256: normalized.verifiedMetadata?.checksumSha256 || '',
      svgContent: normalized.svgContent,
      dimensions: normalized.dimensions,
      changeSummary: 'Initial creation / upload',
      changedBy: normalized.createdBy,
      previousVersionId: null,
      isCurrent: true,
      createdAt: normalized.createdAt,
    };

    await db
      .doc<AssetVersionEntity>(
        `workspaces/${normalized.workspaceId}/brandAssets/${normalized.assetId}/versions/${version1.versionId}`
      )
      .set(version1);

    return normalized;
  }

  public async findById(workspaceId: string, assetId: string): Promise<UnifiedBrandAssetEntity | null> {
    const snap = await db
      .doc<UnifiedBrandAssetEntity>(`workspaces/${workspaceId}/brandAssets/${assetId}`)
      .get();
    if (!snap.exists || !snap.data()) return null;
    return this.normalizeAsset(snap.data());
  }

  public async getById(workspaceId: string, assetId: string): Promise<UnifiedBrandAssetEntity | null> {
    return this.findById(workspaceId, assetId);
  }

  public async listByWorkspace(
    workspaceId: string,
    filter?: {
      section?: AssetSection | string;
      folder?: string;
      category?: string;
      status?: string;
      collectionId?: string;
      tags?: string[];
      search?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<UnifiedBrandAssetEntity[]> {
    const query: DbQuery<UnifiedBrandAssetEntity> = db.collection<UnifiedBrandAssetEntity>(
      `workspaces/${workspaceId}/brandAssets`
    );

    const snap = await query.orderBy('createdAt', 'desc').get();
    let docs = snap.docs.map((d) => d.data()).filter((d): d is UnifiedBrandAssetEntity => Boolean(d));

    // Normalize all docs for consistent evaluation
    docs = docs.map((d) => this.normalizeAsset(d));

    // Filter by Section / Folder (with multi-section reference support)
    const rawTargetSection = filter?.section || filter?.folder;
    if (rawTargetSection) {
      const targetLower = String(rawTargetSection).toLowerCase().trim();
      const targetCanonical = this.normalizeSection(targetLower);
      if (targetLower === 'archived') {
        docs = docs.filter((d) => d.status === 'archived' || d.section === 'Archived');
      } else if (targetLower === 'all' || targetLower === 'active') {
        docs = docs.filter((d) => d.status !== 'archived');
      } else {
        // Matches primary section OR secondary multi-section references
        docs = docs.filter((d) => {
          if (d.status === 'archived') return false;
          return (
            d.section === targetCanonical ||
            d.folder === targetCanonical ||
            d.section.toLowerCase() === targetLower ||
            (d.secondarySections && d.secondarySections.includes(targetCanonical))
          );
        });
      }
    } else if (filter?.status) {
      docs = docs.filter((d) => d.status.toLowerCase() === filter.status!.toLowerCase());
    } else {
      // Default: exclude archived assets unless explicitly asked
      docs = docs.filter((d) => d.status !== 'archived');
    }

    // Filter by Category
    if (filter?.category) {
      docs = docs.filter((d) => d.category.toLowerCase() === filter.category!.toLowerCase());
    }

    // Filter by Collection
    if (filter?.collectionId) {
      docs = docs.filter((d) => d.collectionIds && d.collectionIds.includes(filter.collectionId!));
    }

    // Filter by Tags
    if (filter?.tags && filter.tags.length > 0) {
      docs = docs.filter((d) => filter.tags!.every((t) => d.tags.includes(t)));
    }

    // Filter by Search Query
    if (filter?.search) {
      const q = filter.search.toLowerCase().trim();
      docs = docs.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.title.toLowerCase().includes(q) ||
          d.category.toLowerCase().includes(q) ||
          (d.headlineText && d.headlineText.toLowerCase().includes(q)) ||
          (d.description && d.description.toLowerCase().includes(q)) ||
          (d.aiMetadata?.aiPrompt && d.aiMetadata.aiPrompt.toLowerCase().includes(q)) ||
          d.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    if (filter?.limit) {
      const offset = filter.offset || 0;
      docs = docs.slice(offset, offset + filter.limit);
    }

    return docs;
  }

  public async update(
    workspaceId: string,
    assetId: string,
    patch: Partial<UnifiedBrandAssetEntity>,
    userId?: string
  ): Promise<UnifiedBrandAssetEntity> {
    const existing = await this.findById(workspaceId, assetId);
    if (!existing) {
      throw new Error(`Brand asset '${assetId}' not found in workspace '${workspaceId}'`);
    }

    // Enforce controlled status transitions
    if (patch.status && patch.status !== existing.status) {
      if (!isValidStatusTransition(existing.status, patch.status as AssetLifecycleStatus)) {
        throw new Error(
          `INVALID_STATUS_TRANSITION: Cannot transition asset from '${existing.status}' to '${patch.status}'`
        );
      }
    }

    const now = new Date().toISOString();
    const cleanPatch = Object.fromEntries(Object.entries(patch).filter(([_, v]) => v !== undefined));
    const patchMeta = (cleanPatch.metadata && typeof cleanPatch.metadata === 'object') ? cleanPatch.metadata : {};
    const updatedRaw: any = {
      ...existing,
      ...cleanPatch,
      metadata: { ...(existing.metadata || {}), ...patchMeta, ...(userId ? { lastModifiedBy: userId } : {}) },
      updatedAt: now,
    };

    // Keep name/title and section/folder aliases in sync
    if (patch.name) updatedRaw.title = patch.name;
    if (patch.title) updatedRaw.name = patch.title;
    if (patch.section) updatedRaw.folder = patch.section;
    if (patch.folder) updatedRaw.section = patch.folder;
    if (patch.svgContent) updatedRaw.svgMarkup = patch.svgContent;
    if (patch.svgMarkup) updatedRaw.svgContent = patch.svgMarkup;

    const normalized = this.normalizeAsset(updatedRaw);

    await db
      .doc<UnifiedBrandAssetEntity>(`workspaces/${workspaceId}/brandAssets/${assetId}`)
      .update(normalized);

    return normalized;
  }

  /**
   * Controlled transition to Archived section
   */
  public async archive(workspaceId: string, assetId: string, userId = 'system'): Promise<UnifiedBrandAssetEntity> {
    return this.update(
      workspaceId,
      assetId,
      {
        status: 'archived',
        lifecycleStatus: 'archived',
        section: 'Archived',
        folder: 'Archived',
      },
      userId
    );
  }

  /**
   * Alias for soft delete / archiving for backward compatibility
   */
  public async delete(workspaceId: string, assetId: string): Promise<void> {
    await this.archive(workspaceId, assetId);
  }

  /**
   * Controlled restoration from Archived section back to Active
   */
  public async restore(
    workspaceId: string,
    assetId: string,
    targetSection: AssetSection = 'Active',
    userId = 'system'
  ): Promise<UnifiedBrandAssetEntity> {
    return this.update(
      workspaceId,
      assetId,
      {
        status: 'active',
        lifecycleStatus: 'active',
        section: targetSection,
        folder: targetSection,
      },
      userId
    );
  }

  public async updateLifecycleStatus(
    workspaceId: string,
    assetId: string,
    status: AssetLifecycleStatus | 'draft' | 'under_review' | 'approved' | 'rejected' | 'archived' | 'superseded',
    userId = 'system'
  ): Promise<UnifiedBrandAssetEntity> {
    return this.update(
      workspaceId,
      assetId,
      {
        status: status === 'approved' ? 'active' : (status as any),
        approvalStatus: status as any,
      },
      userId
    );
  }

  public async moveToArchive(
    workspaceId: string,
    assetId: string,
    userId = 'system'
  ): Promise<UnifiedBrandAssetEntity> {
    return this.archive(workspaceId, assetId, userId);
  }

  public async restoreFromArchive(
    workspaceId: string,
    assetId: string,
    userId = 'system',
    targetSection: AssetSection = 'Active'
  ): Promise<UnifiedBrandAssetEntity> {
    return this.restore(workspaceId, assetId, targetSection, userId);
  }

  public async getVersionHistory(
    workspaceId: string,
    assetId: string
  ): Promise<AssetVersionEntity[]> {
    return this.listVersions(workspaceId, assetId);
  }

  public async batchCreate(
    workspaceId: string,
    assets: Array<Partial<UnifiedBrandAssetEntity>>
  ): Promise<UnifiedBrandAssetEntity[]> {
    const results: UnifiedBrandAssetEntity[] = [];
    for (const a of assets) {
      const created = await this.create({
        ...a,
        workspaceId,
        businessId: a.businessId || workspaceId,
      });
      results.push(created);
    }
    return results;
  }

  /**
   * Permanent hard delete with version cleanup
   */
  public async deletePermanently(workspaceId: string, assetId: string): Promise<void> {
    const asset = await this.findById(workspaceId, assetId);
    if (!asset) return;

    // 0. Verify litigation hold immunity: cannot delete asset under active legal hold
    if (asset.hasLegalHold) {
      throw new Error(
        `LITIGATION_HOLD_ACTIVE: Asset ${assetId} is subject to an active legal or regulatory hold and cannot be deleted.`
      );
    }
    const holdsSnap = await db
      .collection(`workspaces/${workspaceId}/legalHolds`)
      .where('assetId', '==', assetId)
      .where('status', '==', 'ACTIVE')
      .get();
    if (holdsSnap.docs.length > 0) {
      throw new Error(
        `LITIGATION_HOLD_ACTIVE: Asset ${assetId} has ${holdsSnap.docs.length} active legal hold(s) and cannot be deleted.`
      );
    }

    // 1. Delete all versions in subcollection
    const versions = await this.listVersions(workspaceId, assetId);
    for (const v of versions) {
      await db
        .doc(`workspaces/${workspaceId}/brandAssets/${assetId}/versions/${v.versionId}`)
        .delete();
    }

    // 2. Delete root asset doc
    await db.doc(`workspaces/${workspaceId}/brandAssets/${assetId}`).delete();

    // 3. Delete local fallback storage file if exists
    try {
      await storageService.deleteLocalFile(asset.storagePath);
    } catch {
      // Ignore storage cleanup failures
    }
  }

  // ===========================================================================
  // 2. ASSET VERSION CONTROL
  // ===========================================================================

  public async createVersion(
    workspaceId: string,
    assetId: string,
    versionData: {
      changeSummary: string;
      changedBy: string;
      storagePath?: string;
      fileSize?: number;
      mimeType?: string;
      checksumSha256?: string;
      svgContent?: string;
      dimensions?: UnifiedBrandAssetEntity['dimensions'];
      versionMetadata?: Record<string, unknown>;
    }
  ): Promise<AssetVersionEntity> {
    const asset = await this.findById(workspaceId, assetId);
    if (!asset) throw new Error(`Asset '${assetId}' not found`);

    const newVersionNumber = asset.version + 1;
    const newVersionId = `v_${newVersionNumber}_${Date.now()}`;
    const now = new Date().toISOString();

    // Mark previous current version as isCurrent: false
    if (asset.currentVersionId) {
      try {
        await db
          .doc(
            `workspaces/${workspaceId}/brandAssets/${assetId}/versions/${asset.currentVersionId}`
          )
          .update({ isCurrent: false });
      } catch {
        // Continue if previous version document wasn't found
      }
    }

    const versionDoc: AssetVersionEntity = {
      versionId: newVersionId,
      assetId,
      workspaceId,
      versionNumber: newVersionNumber,
      storagePath: versionData.storagePath || asset.storagePath,
      fileSize: versionData.fileSize || asset.fileSize,
      mimeType: versionData.mimeType || asset.mimeType,
      checksumSha256: versionData.checksumSha256 || asset.verifiedMetadata?.checksumSha256 || '',
      svgContent: versionData.svgContent || asset.svgContent,
      dimensions: versionData.dimensions || asset.dimensions,
      changeSummary: versionData.changeSummary,
      changedBy: versionData.changedBy,
      previousVersionId: asset.currentVersionId || null,
      isCurrent: true,
      versionMetadata: versionData.versionMetadata,
      createdAt: now,
    };

    // Save new version
    await db
      .doc<AssetVersionEntity>(
        `workspaces/${workspaceId}/brandAssets/${assetId}/versions/${newVersionId}`
      )
      .set(versionDoc);

    // Update asset root pointer
    await this.update(
      workspaceId,
      assetId,
      {
        version: newVersionNumber,
        currentVersionId: newVersionId,
        storagePath: versionDoc.storagePath,
        fileSize: versionDoc.fileSize,
        svgContent: versionDoc.svgContent,
        svgMarkup: versionDoc.svgContent,
        dimensions: versionDoc.dimensions,
      },
      versionData.changedBy
    );

    return versionDoc;
  }

  public async listVersions(workspaceId: string, assetId: string): Promise<AssetVersionEntity[]> {
    const snap = await db
      .collection<AssetVersionEntity>(`workspaces/${workspaceId}/brandAssets/${assetId}/versions`)
      .orderBy('versionNumber', 'desc')
      .get();
    return snap.docs.map((d) => d.data()).filter((d): d is AssetVersionEntity => Boolean(d));
  }

  public async getVersion(
    workspaceId: string,
    assetId: string,
    versionId: string
  ): Promise<AssetVersionEntity | null> {
    const snap = await db
      .doc<AssetVersionEntity>(
        `workspaces/${workspaceId}/brandAssets/${assetId}/versions/${versionId}`
      )
      .get();
    return snap.exists && snap.data() ? snap.data()! : null;
  }

  /**
   * Compares two versions to produce an audit diff
   */
  public compareVersions(
    vA: AssetVersionEntity,
    vB: AssetVersionEntity
  ): {
    versionDifference: number;
    fileSizeDeltaBytes: number;
    identicalChecksum: boolean;
    dimensionsChanged: boolean;
    svgContentChanged: boolean;
  } {
    return {
      versionDifference: Math.abs(vA.versionNumber - vB.versionNumber),
      fileSizeDeltaBytes: vB.fileSize - vA.fileSize,
      identicalChecksum: vA.checksumSha256 === vB.checksumSha256,
      dimensionsChanged:
        vA.dimensions?.width !== vB.dimensions?.width ||
        vA.dimensions?.height !== vB.dimensions?.height,
      svgContentChanged: vA.svgContent !== vB.svgContent,
    };
  }

  /**
   * Restores an earlier version by generating a new version with the historical content
   */
  public async restoreVersion(
    workspaceId: string,
    assetId: string,
    targetVersionId: string,
    restoredBy = 'system'
  ): Promise<AssetVersionEntity> {
    const target = await this.getVersion(workspaceId, assetId, targetVersionId);
    if (!target) {
      throw new Error(`Target version '${targetVersionId}' not found for asset '${assetId}'`);
    }

    return this.createVersion(workspaceId, assetId, {
      changeSummary: `Restored to historical state of version ${target.versionNumber}`,
      changedBy: restoredBy,
      storagePath: target.storagePath,
      fileSize: target.fileSize,
      mimeType: target.mimeType,
      checksumSha256: target.checksumSha256,
      svgContent: target.svgContent,
      dimensions: target.dimensions,
    });
  }

  // ===========================================================================
  // 3. COLLECTIONS & RELATIONSHIPS
  // ===========================================================================

  public async createCollection(
    arg1: string | Partial<AssetCollectionEntity>,
    arg2?: Partial<AssetCollectionEntity>
  ): Promise<AssetCollectionEntity> {
    const collection = typeof arg1 === 'string' ? { ...(arg2 || {}), workspaceId: arg1 } : arg1;
    const uniqueSuffix = crypto.randomBytes(3).toString('hex');
    const collectionId = collection.collectionId || `col_${Date.now()}_${uniqueSuffix}`;
    const now = new Date().toISOString();

    const entity: AssetCollectionEntity = {
      collectionId,
      workspaceId: collection.workspaceId!,
      name: collection.name || 'Untitled Collection',
      description: collection.description || '',
      type: collection.type || 'user_created',
      color: collection.color || '#FF7417',
      icon: collection.icon || 'Folder',
      assetIds: Array.isArray(collection.assetIds) ? collection.assetIds : [],
      smartRules: collection.smartRules,
      isDynamic: Boolean(collection.isDynamic || collection.type === 'smart'),
      createdBy: collection.createdBy || 'system',
      createdAt: now,
      updatedAt: now,
    };

    await db
      .doc<AssetCollectionEntity>(`workspaces/${entity.workspaceId}/assetCollections/${collectionId}`)
      .set(entity);

    return entity;
  }

  public async getCollection(
    workspaceId: string,
    collectionId: string
  ): Promise<AssetCollectionEntity | null> {
    const snap = await db
      .doc<AssetCollectionEntity>(`workspaces/${workspaceId}/assetCollections/${collectionId}`)
      .get();
    return snap.exists && snap.data() ? snap.data()! : null;
  }

  public async listCollections(
    workspaceId: string,
    type?: AssetCollectionType
  ): Promise<AssetCollectionEntity[]> {
    let query: DbQuery<AssetCollectionEntity> = db.collection<AssetCollectionEntity>(`workspaces/${workspaceId}/assetCollections`);
    if (type) {
      query = query.where('type', '==', type);
    }
    const snap = await query.orderBy('createdAt', 'desc').get();
    return snap.docs.map((d) => d.data()).filter((d): d is AssetCollectionEntity => Boolean(d));
  }

  public async updateCollection(
    workspaceId: string,
    collectionId: string,
    patch: Partial<AssetCollectionEntity>
  ): Promise<AssetCollectionEntity> {
    const existing = await this.getCollection(workspaceId, collectionId);
    if (!existing) throw new Error(`Collection '${collectionId}' not found`);

    const updated = {
      ...existing,
      ...patch,
      updatedAt: new Date().toISOString(),
    };

    await db
      .doc<AssetCollectionEntity>(`workspaces/${workspaceId}/assetCollections/${collectionId}`)
      .set(updated);

    return updated;
  }

  public async deleteCollection(workspaceId: string, collectionId: string): Promise<void> {
    const col = await this.getCollection(workspaceId, collectionId);
    if (!col) return;

    // Remove collection ID reference from member assets
    for (const assetId of col.assetIds) {
      const asset = await this.findById(workspaceId, assetId);
      if (asset && asset.collectionIds.includes(collectionId)) {
        await this.update(workspaceId, assetId, {
          collectionIds: asset.collectionIds.filter((c) => c !== collectionId),
        });
      }
    }

    await db.doc(`workspaces/${workspaceId}/assetCollections/${collectionId}`).delete();
  }

  public async addAssetToCollection(
    workspaceId: string,
    assetId: string,
    collectionId: string
  ): Promise<void> {
    const asset = await this.findById(workspaceId, assetId);
    const collection = await this.getCollection(workspaceId, collectionId);
    if (!asset) throw new Error(`Asset '${assetId}' not found`);
    if (!collection) throw new Error(`Collection '${collectionId}' not found`);

    if (!asset.collectionIds.includes(collectionId)) {
      await this.update(workspaceId, assetId, {
        collectionIds: [...asset.collectionIds, collectionId],
      });
    }

    if (!collection.assetIds.includes(assetId)) {
      await this.updateCollection(workspaceId, collectionId, {
        assetIds: [...collection.assetIds, assetId],
      });
    }
  }

  public async removeAssetFromCollection(
    workspaceId: string,
    assetId: string,
    collectionId: string
  ): Promise<void> {
    const asset = await this.findById(workspaceId, assetId);
    const collection = await this.getCollection(workspaceId, collectionId);

    if (asset && asset.collectionIds.includes(collectionId)) {
      await this.update(workspaceId, assetId, {
        collectionIds: asset.collectionIds.filter((c) => c !== collectionId),
      });
    }

    if (collection && collection.assetIds.includes(assetId)) {
      await this.updateCollection(workspaceId, collectionId, {
        assetIds: collection.assetIds.filter((id) => id !== assetId),
      });
    }
  }

  /**
   * Duplicates an existing asset, creating an independent clone linked via parentAssetId
   */
  public async duplicate(
    workspaceId: string,
    assetId: string,
    userId = 'system'
  ): Promise<UnifiedBrandAssetEntity> {
    const source = await this.findById(workspaceId, assetId);
    if (!source) {
      throw new Error(`Source asset '${assetId}' not found for duplication`);
    }

    const uniqueSuffix = crypto.randomBytes(3).toString('hex');
    const newAssetId = `ast_${Date.now()}_${uniqueSuffix}`;
    const cloneName = `${source.name} (Copy)`;

    const cloned: Partial<UnifiedBrandAssetEntity> = {
      ...source,
      assetId: newAssetId,
      id: newAssetId,
      name: cloneName,
      title: cloneName,
      headlineText: source.headlineText ? `${source.headlineText} (Copy)` : cloneName,
      parentAssetId: source.assetId,
      version: 1,
      currentVersionId: `v_1`,
      status: 'active',
      approvalStatus: 'approved',
      createdBy: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return this.create(cloned);
  }

  /**
   * Bulk archive multiple assets in a single batch
   */
  public async bulkArchive(
    workspaceId: string,
    assetIds: string[],
    userId = 'system'
  ): Promise<{ archivedCount: number; assetIds: string[] }> {
    let count = 0;
    const archivedIds: string[] = [];

    for (const id of assetIds) {
      try {
        await this.archive(workspaceId, id, userId);
        count++;
        archivedIds.push(id);
      } catch {
        // Continue with remaining assets
      }
    }

    return { archivedCount: count, assetIds: archivedIds };
  }

  /**
   * Bulk restore multiple assets back to active status
   */
  public async bulkRestore(
    workspaceId: string,
    assetIds: string[],
    targetSection: AssetSection = 'Active',
    userId = 'system'
  ): Promise<{ restoredCount: number; assetIds: string[] }> {
    let count = 0;
    const restoredIds: string[] = [];

    for (const id of assetIds) {
      try {
        await this.restore(workspaceId, id, targetSection, userId);
        count++;
        restoredIds.push(id);
      } catch {
        // Continue with remaining assets
      }
    }

    return { restoredCount: count, assetIds: restoredIds };
  }

  /**
   * Bulk tag modification across multiple assets
   */
  public async bulkTag(
    workspaceId: string,
    assetIds: string[],
    tagsToAdd: string[] = [],
    tagsToRemove: string[] = []
  ): Promise<{ updatedCount: number }> {
    let count = 0;

    for (const id of assetIds) {
      const asset = await this.findById(workspaceId, id);
      if (!asset) continue;

      let nextTags = [...asset.tags];
      for (const t of tagsToAdd) {
        if (!nextTags.includes(t)) nextTags.push(t);
      }
      if (tagsToRemove.length > 0) {
        nextTags = nextTags.filter((t) => !tagsToRemove.includes(t));
      }

      await this.update(workspaceId, id, { tags: nextTags });
      count++;
    }

    return { updatedCount: count };
  }

  /**
   * Bulk move assets to another primary section
   */
  public async bulkMove(
    workspaceId: string,
    assetIds: string[],
    targetSection: AssetSection,
    userId = 'system'
  ): Promise<{ movedCount: number }> {
    let count = 0;

    for (const id of assetIds) {
      try {
        await this.update(
          workspaceId,
          id,
          {
            section: targetSection,
            folder: targetSection,
          },
          userId
        );
        count++;
      } catch {
        // Continue with remaining
      }
    }

    return { movedCount: count };
  }

  /**
   * Bulk permanent deletion of multiple assets
   */
  public async bulkDeletePermanently(
    workspaceId: string,
    assetIds: string[]
  ): Promise<{ deletedCount: number }> {
    let count = 0;

    for (const id of assetIds) {
      try {
        await this.deletePermanently(workspaceId, id);
        count++;
      } catch {
        // Continue with remaining
      }
    }

    return { deletedCount: count };
  }

  /**
   * Intelligent heuristic classification for uploaded assets
   */
  public classifyAssetHeuristic(
    fileName: string,
    mimeType: string,
    _content?: string
  ): {
    category: import('../types/assetLibrary').AssetCategory;
    section: AssetSection;
    tags: string[];
    confidence: number;
  } {
    const fn = fileName.toLowerCase();
    const mime = mimeType.toLowerCase();

    // 1. Logo & Identity detection
    if (fn.includes('logo') || fn.includes('wordmark') || fn.includes('emblem') || fn.includes('favicon') || fn.includes('lockup') || fn.includes('brandmark')) {
      return {
        category: 'Logo',
        section: 'Identity',
        tags: ['identity', 'logo', 'vector-brand'],
        confidence: 0.95,
      };
    }

    // 2. Packaging & Dielines
    if (fn.includes('pouch') || fn.includes('pack') || fn.includes('label') || fn.includes('dieline') || fn.includes('carton') || fn.includes('sleeve')) {
      return {
        category: 'Packaging',
        section: 'Print & Packaging',
        tags: ['print', 'packaging', 'dieline', 'production-ready'],
        confidence: 0.92,
      };
    }

    // 3. Stationery / Print
    if (fn.includes('card') || fn.includes('visiting') || fn.includes('business_card')) {
      return {
        category: 'Business Card',
        section: 'Identity',
        tags: ['print', 'stationery', 'visiting-card'],
        confidence: 0.9,
      };
    }
    if (fn.includes('letterhead') || fn.includes('stationery') || fn.includes('envelope')) {
      return {
        category: 'Letterhead',
        section: 'Identity',
        tags: ['print', 'stationery', 'corporate-identity'],
        confidence: 0.9,
      };
    }
    if (fn.includes('flyer') || fn.includes('brochure') || fn.includes('poster') || fn.includes('leaflet')) {
      return {
        category: fn.includes('brochure') ? 'Brochure' : fn.includes('poster') ? 'Poster' : 'Flyer',
        section: 'Print & Packaging',
        tags: ['print', 'marketing-collateral'],
        confidence: 0.88,
      };
    }

    // 4. Social Media Creatives
    if (fn.includes('carousel') || fn.includes('slide') || fn.includes('story') || fn.includes('reel') || fn.includes('instagram') || fn.includes('linkedin') || fn.includes('facebook')) {
      return {
        category: fn.includes('carousel') ? 'Carousel' : 'Instagram Post',
        section: 'Social Media',
        tags: ['social', 'marketing-creative', 'campaign'],
        confidence: 0.9,
      };
    }

    // 5. Documents
    if (mime === 'application/pdf' || mime.includes('word') || mime.includes('document') || mime.includes('presentation')) {
      return {
        category: 'Document',
        section: 'Active',
        tags: ['document', 'brief', 'specification'],
        confidence: 0.85,
      };
    }

    // 6. Product Photography
    if (mime.startsWith('image/') && (fn.includes('photo') || fn.includes('shot') || fn.includes('product') || fn.includes('flatlay') || fn.includes('hero'))) {
      return {
        category: 'Photography',
        section: 'Active',
        tags: ['photography', 'product-image', 'visual-asset'],
        confidence: 0.85,
      };
    }

    // Default fallback
    return {
      category: 'Collateral',
      section: 'Active',
      tags: ['asset', 'brand-resource'],
      confidence: 0.6,
    };
  }

  // ===========================================================================
  // 4. DATA INTEGRITY & DEDUPLICATION
  // ===========================================================================

  public async checkDuplicateChecksum(
    workspaceId: string,
    checksumSha256: string
  ): Promise<UnifiedBrandAssetEntity | null> {
    const snap = await db
      .collection<UnifiedBrandAssetEntity>(`workspaces/${workspaceId}/brandAssets`)
      .where('verifiedMetadata.checksumSha256', '==', checksumSha256)
      .limit(1)
      .get();

    if (snap.docs.length > 0 && snap.docs[0].data()) {
      return this.normalizeAsset(snap.docs[0].data());
    }
    return null;
  }

  public async reconcileStorage(
    workspaceId: string
  ): Promise<{ totalAssets: number; verifiedChecksums: number; missingFiles: string[] }> {
    const assets = await this.listByWorkspace(workspaceId);
    let verified = 0;
    const missing: string[] = [];

    for (const asset of assets) {
      if (asset.svgContent) {
        verified++;
        continue;
      }
      const local = await storageService.readLocalFile(asset.storagePath);
      if (local) {
        verified++;
      } else {
        missing.push(asset.assetId);
      }
    }

    return {
      totalAssets: assets.length,
      verifiedChecksums: verified,
      missingFiles: missing,
    };
  }
}

export const brandAssetRepository = new BrandAssetRepository();
