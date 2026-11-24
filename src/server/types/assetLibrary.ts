/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// =============================================================================
// 1. ASSET SECTION & LIFECYCLE ENUMS
// =============================================================================

export type AssetSection =
  | 'Active'
  | 'Identity'
  | 'Print & Packaging'
  | 'Social Media'
  | 'Campaigns'
  | 'Archived';

export type AssetLifecycleStatus =
  | 'draft'
  | 'active'
  | 'under_review'
  | 'approved'
  | 'superseded'
  | 'archived';

export type AssetApprovalStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'draft'
  | 'Draft'
  | 'Approved'
  | 'Archived';

export type AssetVisibility =
  | 'workspace'
  | 'public'
  | 'private';

export type AssetType =
  | 'svg'
  | 'png'
  | 'jpeg'
  | 'webp'
  | 'pdf'
  | 'json'
  | 'font'
  | 'document';

export type AssetCategory =
  | 'Logo'
  | 'Business Card'
  | 'Letterhead'
  | 'Flyer'
  | 'Brochure'
  | 'Poster'
  | 'Banner'
  | 'Packaging'
  | 'Label'
  | 'Sticker'
  | 'Menu'
  | 'Presentation'
  | 'Instagram Post'
  | 'Carousel'
  | 'Facebook Creative'
  | 'Campaign'
  | 'Brand Book'
  | 'Collateral'
  | 'Mockup'
  | 'Social'
  | 'Photography'
  | 'Illustration'
  | 'Document'
  | 'Logos'
  | 'Colors'
  | 'Typography'
  | 'brand_identity'
  | 'marketing_collateral'
  | 'social_media'
  | 'print_packaging'
  | 'packaging_artwork'
  | 'product_mockup'
  | 'Product Photography'
  | 'Marketing Collateral'
  | 'Brand Identity';

// =============================================================================
// 2. METADATA SUB-SCHEMAS
// =============================================================================

export interface AssetDimensions {
  width: number;
  height: number;
  aspectRatio?: string;
  unit?: 'px' | 'mm' | 'in';
}

export interface AssetResolution {
  dpi?: number;
  colorSpace?: 'RGB' | 'CMYK' | 'Grayscale';
}

export interface AssetAiMetadata {
  aiGenerated: boolean;
  aiPrompt?: string;
  aiModel?: string;
  artDirectionNote?: string;
  generationMetadata?: Record<string, unknown>;
}

export interface AssetVerifiedMetadata {
  truthVerified: boolean;
  verificationTimestamp?: string;
  verifiedBy?: string;
  checksumSha256: string;
  contentHash?: string;
  integrityPassed: boolean;
}

export interface AssetRightsMetadata {
  licenseType: 'proprietary' | 'commercial' | 'cc_by' | 'open_source' | 'custom';
  usageTerms?: string;
  attributionRequired: boolean;
  expirationDate?: string | null;
  allowedChannels?: string[];
}

export interface AssetSlideItem {
  slideNumber: number;
  kicker?: string;
  headline: string;
  body: string;
  layout: 'editorial-grid' | 'split-stat' | 'quote-focus' | 'checklist' | 'product-spotlight';
  statCallout?: string;
  svgMotif?: string;
  artDirectionPrompt?: string;
}

// =============================================================================
// 3. UNIFIED ASSET REGISTRY ENTITY
// =============================================================================

export interface UnifiedBrandAssetEntity {
  /** Immutable primary asset identifier */
  assetId: string;
  /** Primary identifier alias for client backward compatibility */
  id: string;

  /** Multi-tenant workspace identifier */
  workspaceId: string;
  /** Business identifier for business-level isolation */
  businessId: string;

  /** Human-readable asset name */
  name: string;
  /** Title alias for client backward compatibility */
  title: string;
  /** Detailed description or summary of asset */
  description?: string;

  /** Primary file type classification */
  assetType: AssetType;
  /** Alias for client backward compatibility */
  type?: string;
  /** Departmental category classification */
  category: AssetCategory;
  /** Primary section classification */
  section: AssetSection;
  /** Folder alias for client backward compatibility */
  folder: AssetSection;
  /** Secondary sections/references where this asset is indexed */
  secondarySections: AssetSection[];

  /** Standard MIME type string */
  mimeType: string;
  /** Original filename when uploaded or generated */
  originalFileName: string;

  /** Canonical storage path in Google Cloud Storage */
  storagePath: string;
  /** Direct public or signed access URL */
  storageUrl?: string;
  fileUrl?: string;

  /** File size in bytes */
  fileSize: number;
  /** Spatial dimensions where applicable */
  dimensions?: AssetDimensions;
  /** Resolution and color space where applicable */
  resolution?: AssetResolution;
  /** Duration in seconds for audio media where applicable (video strictly excluded) */
  duration?: number | null;

  /** Thumbnail preview reference */
  thumbnailStoragePath?: string;
  thumbnailUrl?: string;

  /** Full-scale preview reference */
  previewStoragePath?: string;
  previewUrl?: string;

  /** Vector SVG markup content if directly embeddable */
  svgContent?: string;
  /** SVG markup alias for client backward compatibility */
  svgMarkup?: string;

  /** User ID who performed upload or triggered generation */
  createdBy: string;
  /** Business or user identity who owns the asset rights */
  ownedBy: string;

  /** Current active version identifier */
  currentVersionId: string;
  /** Current active version sequential number */
  version: number;
  /** Parent asset identifier if cloned or derived */
  parentAssetId?: string | null;

  /** Controlled lifecycle status */
  status: AssetLifecycleStatus;
  lifecycleStatus?: AssetLifecycleStatus;
  derivativeAssetIds?: string[];
  /** Formal review/approval status */
  approvalStatus: AssetApprovalStatus;
  /** Tenancy visibility policy */
  visibility: AssetVisibility;

  /** Classification and search tags */
  tags: string[];
  /** IDs of collections containing this asset */
  collectionIds: string[];
  /** Associated product IDs from Business Brain */
  productIds: string[];
  /** Associated marketing campaign IDs */
  campaignIds: string[];
  /** Brand identity concept associations */
  brandId?: string;
  conceptId?: string;

  /** AI provenance and art direction metadata */
  aiMetadata?: AssetAiMetadata;
  /** Deterministic truth and cryptographic integrity metadata */
  verifiedMetadata?: AssetVerifiedMetadata;
  /** Commercial rights and licensing terms */
  rightsMetadata?: AssetRightsMetadata;

  /** General dynamic metadata (prepress, intelligence, ecosystem, performance) */
  metadata?: Record<string, any>;
  /** Usage count across campaigns and collateral */
  usageCount?: number;

  // Client-specific presentation properties (Design Freeze v1.0 compatibility)
  format?: string;
  headlineText?: string;
  subtext?: string;
  accentHex?: string;
  darkVariant?: boolean;
  slides?: AssetSlideItem[];
  caption?: string;
  hashtags?: string[];
  artDirectionNote?: string;

  /** Enterprise Archival & Statutory Retention (Phase 6) */
  retentionSchedule?: string;
  retentionExpiresAt?: string | null;
  retentionPolicyId?: string;
  hasLegalHold?: boolean;
  activeLegalHoldId?: string;
  legalHoldReason?: string;
  legalHoldReference?: string;
  storageClass?: string;
  storageTieredAt?: string;

  /** ISO 8601 timestamps */
  uploadedAt: string;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// 4. ASSET VERSION CONTROL ENTITY
// =============================================================================

export interface AssetVersionEntity {
  versionId: string;
  assetId: string;
  workspaceId: string;
  versionNumber: number;

  storagePath: string;
  fileSize: number;
  mimeType: string;
  checksumSha256: string;

  svgContent?: string;
  dimensions?: AssetDimensions;

  changeSummary: string;
  changedBy: string;
  previousVersionId?: string | null;
  isCurrent: boolean;

  versionMetadata?: Record<string, unknown>;
  createdAt: string;
}

// =============================================================================
// 5. ASSET COLLECTION ENTITY
// =============================================================================

export type AssetCollectionType =
  | 'user_created'
  | 'ai_generated'
  | 'smart'
  | 'product'
  | 'campaign'
  | 'brand'
  | 'seasonal'
  | 'social_content';

export interface SmartCollectionRules {
  sections?: AssetSection[];
  categories?: AssetCategory[];
  tags?: string[];
  status?: AssetLifecycleStatus[];
  createdAfter?: string;
  hasAiPrompt?: boolean;
}

export interface AssetCollectionEntity {
  collectionId: string;
  workspaceId: string;
  name: string;
  description?: string;
  type: AssetCollectionType;
  collectionType?: AssetCollectionType;
  color?: string;
  icon?: string;

  assetIds: string[];
  smartRules?: SmartCollectionRules;

  isDynamic: boolean;
  isSmart?: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// 6. VALIDATION SCHEMAS & HELPERS
// =============================================================================

export const VALID_ASSET_SECTIONS: AssetSection[] = [
  'Active',
  'Identity',
  'Print & Packaging',
  'Social Media',
  'Campaigns',
  'Archived',
];

export const VALID_LIFECYCLE_STATUSES: AssetLifecycleStatus[] = [
  'draft',
  'active',
  'under_review',
  'approved',
  'superseded',
  'archived',
];

/** Valid state transitions for asset lifecycle management */
export const ALLOWED_STATUS_TRANSITIONS: Record<AssetLifecycleStatus, AssetLifecycleStatus[]> = {
  draft: ['active', 'under_review', 'archived'],
  active: ['under_review', 'approved', 'superseded', 'archived'],
  under_review: ['approved', 'draft', 'active', 'archived'],
  approved: ['superseded', 'archived', 'active'],
  superseded: ['archived', 'active'],
  archived: ['active', 'draft'],
};

export function isValidStatusTransition(
  current: AssetLifecycleStatus,
  target: AssetLifecycleStatus
): boolean {
  if (current === target) return true;
  const allowed = ALLOWED_STATUS_TRANSITIONS[current];
  return Boolean(allowed && allowed.includes(target));
}

export function validateUnifiedAsset(asset: Partial<UnifiedBrandAssetEntity>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!asset.assetId) errors.push('assetId is required and must be immutable');
  if (!asset.workspaceId) errors.push('workspaceId is required');
  if (!asset.name?.trim()) errors.push('name is required');
  if (!asset.assetType) errors.push('assetType is required');
  if (!asset.category) errors.push('category is required');

  if (asset.section && !VALID_ASSET_SECTIONS.includes(asset.section)) {
    errors.push(`Invalid section: ${asset.section}. Allowed: ${VALID_ASSET_SECTIONS.join(', ')}`);
  }

  if (asset.status && !VALID_LIFECYCLE_STATUSES.includes(asset.status)) {
    errors.push(`Invalid status: ${asset.status}. Allowed: ${VALID_LIFECYCLE_STATUSES.join(', ')}`);
  }

  // Strict Video Exclusion
  if (asset.mimeType?.startsWith('video/')) {
    errors.push('STRICT VIDEO EXCLUSION: Video MIME types are permanently forbidden');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
