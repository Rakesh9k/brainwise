/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// =============================================================================
// 1. PACKAGING & COLLATERAL CLASSIFICATIONS
// =============================================================================

export type PackagingType =
  | 'Box'
  | 'Carton'
  | 'Bottle'
  | 'Jar'
  | 'Pouch'
  | 'Wrapper'
  | 'Label'
  | 'Sticker'
  | 'Sachet'
  | 'Container'
  | 'Secondary Packaging'
  | 'Tertiary Packaging'
  | 'Dieline'
  | 'Packaging Mockup'
  | 'Print-Ready Artwork';

export type PrintCollateralType =
  | 'Business Card'
  | 'Letterhead'
  | 'Envelope'
  | 'Brochure'
  | 'Flyer'
  | 'Poster'
  | 'Catalogue'
  | 'Menu'
  | 'Price List'
  | 'Certificate'
  | 'Banner'
  | 'Marketing Stationery';

export type ProductionWorkflowStatus =
  | 'Draft'
  | 'Review'
  | 'Approved'
  | 'Print Ready'
  | 'Sent to Vendor'
  | 'In Production'
  | 'Completed'
  | 'Archived';

// =============================================================================
// 2. PRODUCT ASSOCIATIONS (BUSINESS BRAIN GROUNDED)
// =============================================================================

export interface PackagingProductAssociation {
  productId: string;
  productName: string;
  sku?: string;
  category: string;
  variant?: string;
  size?: string;
  weight?: string;
  flavor?: string;
  productLine?: string;
  brandName: string;
  packagingType: PackagingType;
  packagingVersion: number;
}

// =============================================================================
// 3. PRINT PRODUCTION METADATA
// =============================================================================

export interface DielineGeometrySpec {
  hasCutLine: boolean;
  hasCreaseLine: boolean;
  hasBleedLine: boolean;
  cutLineStrokeHex: string; // Typically #FF0000 (Magenta or Red spot)
  creaseLineStrokeHex: string; // Typically #00FF00 (Green dashed)
  bleedLineStrokeHex: string; // Typically #0000FF or #FF00FF
  dielineSvg?: string;
}

export interface PrinterSpecifications {
  vendorName?: string;
  vendorContact?: string;
  pressType?: 'Offset' | 'Flexographic' | 'Digital' | 'Gravure';
  substrate?: string; // e.g. 350 GSM Cyber XLC, BOPP Poly, Kraft Paper
  finish?: string; // e.g. Soft-Touch Matte Lam, Spot UV 3D, Gold Hot Foil, Embossing
  specialInks?: string[]; // e.g. ['Pantone 802 C (Neon Green)', 'Pantone 871 C (Gold)']
  productionNotes?: string;
  targetCompletionDate?: string;
}

export interface PrintProductionMetadata {
  widthMm: number;
  heightMm: number;
  depthMm?: number;
  measurementUnit: 'mm' | 'in' | 'pt';
  bleedMm: number;
  safeMarginMm: number;
  resolutionDpi: number; // 300 DPI minimum for professional offset
  colorSpace: 'CMYK' | 'RGB' | 'Spot/Pantone';
  colorProfile: 'FOGRA39' | 'GRACoL2006' | 'SWOP' | 'ISO Coated v2' | 'Generic CMYK';
  embeddedFonts: string[];
  fileFormat: 'PDF/X-1a' | 'PDF/X-4' | 'SVG' | 'TIFF' | 'AI' | 'EPS';
  dieline: DielineGeometrySpec;
  printer: PrinterSpecifications;
  workflowStatus: ProductionWorkflowStatus;
  workflowAuditLog: Array<{
    status: ProductionWorkflowStatus;
    updatedAt: string;
    updatedBy: string;
    notes?: string;
  }>;
}

export type PrintPackagingMetadata = PrintProductionMetadata;

// =============================================================================
// 4. PRINT READINESS ENGINE REPORT
// =============================================================================

export interface PrintReadinessCheckItem {
  checkId: string;
  name: string;
  passed: boolean;
  score: number; // 0-100
  severity: 'critical' | 'warning' | 'info';
  evidence: string;
  suggestedCorrection: string;
}

export interface PrintReadinessReport {
  reportId: string;
  assetId: string;
  workspaceId: string;
  evaluatedAt: string;
  isPrintReady: boolean;
  overallScore: number; // 0-100
  checks: PrintReadinessCheckItem[];
  totalAreaCoveragePct: number; // e.g. 280% (safe if <= 300%)
  disclaimer: string;
}

// =============================================================================
// 5. PACKAGING OCR & CONTENT INTELLIGENCE
// =============================================================================

export interface PackagingExtractedContent {
  productName?: string;
  ingredients?: string[];
  netQuantity?: string;
  manufacturingInfo?: string;
  batchInfo?: string;
  mrp?: number;
  barcodeText?: string;
  expiryInfo?: string;
  nutritionalInfo?: Record<string, string>;
  regulatoryDeclarations?: string[];
}

export interface PackagingDiscrepancyItem {
  field: string;
  detectedOnPackaging: any;
  verifiedInBusinessBrain: any;
  severity: 'critical' | 'warning';
  description: string;
  suggestedAction: string;
}

export interface PackagingContentIntelligenceReport {
  reportId: string;
  assetId: string;
  workspaceId: string;
  extractedContent: PackagingExtractedContent;
  businessBrainComparison: {
    productMatched: boolean;
    matchedProductId?: string;
    matchedProductName?: string;
    discrepancies: PackagingDiscrepancyItem[];
    missingMandatoryDeclarations: string[];
    missingDeclarations: string[];
    isCompliant: boolean;
  };
  humanComplianceStatus: 'pending' | 'human_reviewed' | 'waived' | 'rejected';
  humanReviewNotes?: string;
  disclaimer: string;
}

// =============================================================================
// 6. PACKAGING VERSION INTELLIGENCE & PRODUCT CHANGE DRIFT
// =============================================================================

export interface PackagingVersionDiff {
  fromVersion: number;
  toVersion: number;
  priceChanges?: { oldPrice: number; newPrice: number };
  weightChanges?: { oldWeight: string; newWeight: string };
  ingredientChanges?: { added: string[]; removed: string[] };
  designChanges?: string[];
  regulatoryChanges?: string[];
}

export interface PackagingAssetEntity {
  assetId: string;
  workspaceId: string;
  name: string;
  category: PackagingType | PrintCollateralType;
  packagingType: PackagingType;
  section: 'Print & Packaging';
  svgMarkup?: string;
  storagePath?: string;
  productAssociation: PackagingProductAssociation;
  productionMetadata: PrintProductionMetadata;
  readinessReport?: PrintReadinessReport;
  contentIntelligenceReport?: PackagingContentIntelligenceReport;
  version: number;
  createdAt: string;
  updatedAt: string;
}
