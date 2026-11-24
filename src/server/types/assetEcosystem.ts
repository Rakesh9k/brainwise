/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { AssetSection, UnifiedBrandAssetEntity } from './assetLibrary';

/**
 * STRICT VIDEO EXCLUSION DIRECTIVE:
 * BrainWise permanently excludes all video generation, video editing, reel generation, or video pipelines.
 */
export const FORBIDDEN_VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
  'video/mpeg',
  'video/ogg',
  'video/3gpp',
];

export const FORBIDDEN_VIDEO_EXTENSIONS = ['.mp4', '.mov', '.webm', '.avi', '.mkv', '.flv', '.wmv'];

// ==========================================
// 1. BUSINESS BRAIN CONTRACTS
// ==========================================

export interface ProductSyncPayload {
  workspaceId: string;
  productId: string;
  productName: string;
  sku?: string;
  category?: string;
  variants?: Array<{
    variantId?: string;
    name: string;
    sku?: string;
    size?: string;
    flavor?: string;
    color?: string;
  }>;
  price?: number;
  currency?: string;
  status?: string;
  updatedAt?: string;
}

export interface BusinessProfileSyncPayload {
  workspaceId: string;
  businessName: string;
  industry?: string;
  tagline?: string;
  primaryBrandColor?: string;
  toneOfVoice?: string;
  approvedClaims?: string[];
  forbiddenClaims?: string[];
}

// ==========================================
// 2. BRANDSTUDIO INGESTION CONTRACTS
// ==========================================

export type BrandStudioIngestAssetType =
  | 'logo'
  | 'color_palette'
  | 'typography'
  | 'brand_guideline'
  | 'stationery'
  | 'social_creative'
  | 'icon_pack'
  | 'packaging_concept';

export interface BrandStudioAssetIngestRequest {
  workspaceId: string;
  userId: string;
  assetName: string;
  description?: string;
  assetType: BrandStudioIngestAssetType;
  section?: AssetSection; // defaults to 'identity'
  svgContent?: string;
  fileUrl?: string;
  mimeType?: string;
  brandIdentityVersion?: string;
  tags?: string[];
  tokens?: Record<string, unknown>;
  usageRules?: {
    doList?: string[];
    dontList?: string[];
    minClearspace?: number;
    recommendedBackgrounds?: string[];
  };
  productIds?: string[];
  campaignIds?: string[];
  approvalStatus?: 'approved' | 'pending' | 'draft';
}

export interface BrandStudioAssetIngestResponse {
  success: boolean;
  asset: UnifiedBrandAssetEntity;
  eventId?: string;
  message: string;
}

// ==========================================
// 3. CAMPAIGN STUDIO BINDING CONTRACTS
// ==========================================

export interface CampaignAssetDiscoveryQuery {
  workspaceId: string;
  campaignId?: string;
  productId?: string;
  section?: AssetSection;
  approvedOnly?: boolean;
  searchQuery?: string;
  tags?: string[];
  limit?: number;
}

export interface CampaignAssetBindingRequest {
  workspaceId: string;
  campaignId: string;
  campaignName: string;
  assetIds: string[];
  createCollection?: boolean;
  collectionName?: string;
  userId?: string;
}

export interface CampaignAssetBindingResponse {
  success: boolean;
  campaignId: string;
  boundAssetCount: number;
  collectionId?: string;
  assets: UnifiedBrandAssetEntity[];
}

export interface CampaignCreativeSaveRequest {
  workspaceId: string;
  userId: string;
  campaignId: string;
  campaignName: string;
  creativeName: string;
  svgContent: string;
  dimensions?: { width: number; height: number };
  productIds?: string[];
  tags?: string[];
  section?: AssetSection; // usually 'social' or 'active'
}

// ==========================================
// 4. CONTENT STUDIO DERIVATIVE CONTRACTS
// ==========================================

export type TargetDerivativeFormat =
  | 'square_post'       // 1080x1080
  | 'story_vertical'    // 1080x1920
  | 'landscape_banner'  // 1200x630
  | 'flyer_print'       // A5 1748x2480 (300 DPI)
  | 'poster_print'      // A3 3508x4960 (300 DPI)
  | 'business_card'     // 1050x600 (3.5x2in @ 300 DPI)
  | 'custom';

export interface ContentDerivativeRequest {
  workspaceId: string;
  userId: string;
  parentAssetId: string;
  targetFormat: TargetDerivativeFormat;
  dimensions: {
    width: number;
    height: number;
    unit: 'px' | 'mm' | 'in';
  };
  modifiedSvgContent?: string;
  nameSuffix?: string;
  tags?: string[];
  notes?: string;
}

export interface ContentDerivativeResponse {
  success: boolean;
  derivativeAsset: UnifiedBrandAssetEntity;
  parentAssetId: string;
  lineage: {
    rootAssetId: string;
    parentAssetId: string;
    derivativeCount: number;
  };
}

// ==========================================
// 5. COMPETITIVE INTELLIGENCE CONTRACTS
// ==========================================

export interface CompetitiveOpportunityQuery {
  workspaceId: string;
  competitorIds?: string[];
  productCategory?: string;
  category?: string;
}

export interface CreativeOpportunityRecommendation {
  opportunityId: string;
  category: string;
  title: string;
  rationale: string;
  competitorGap: string;
  recommendedAngle: string;
  suggestedFormats: TargetDerivativeFormat[];
  suggestedVisualTone: string;
  nonInfringementCertified: true;
  actionableTags: string[];
}

// ==========================================
// 6. ANALYTICS & ATTRIBUTION CONTRACTS
// ==========================================

export interface AssetPerformanceRecord {
  recordId: string;
  workspaceId: string;
  assetId: string;
  campaignId?: string;
  channel?: string;
  impressions: number;
  clicks: number;
  conversions: number;
  spend?: number;
  revenue?: number;
  recordedAt: string;
}

export interface AssetPerformanceSummary {
  assetId: string;
  assetName: string;
  section: AssetSection;
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  ctr: number;             // click-through rate %
  conversionRate: number;  // conv rate %
  usageCount: number;
  activeCampaigns: string[];
  roas?: number;
  lastPerformanceUpdate: string;
}
