/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { AssetSection, AssetLifecycleStatus } from './assetLibrary';

// =============================================================================
// 1. RETENTION POLICY CATEGORIES & RULES
// =============================================================================

export type RetentionScheduleType =
  | 'TAX_FINANCIAL' // 7-year statutory retention (Income Tax Sec 44AA / Companies Act)
  | 'IP_TRADEMARK' // 10-year term for trademarks and registered packaging dielines
  | 'CONTRACT_RIGHTS' // License term + 3 years limitation
  | 'GENERAL_MARKETING' // 2-year sunsetting policy
  | 'PERMANENT_HISTORICAL'; // Permanent preservation, never auto-purged

export interface RetentionPolicyEntity {
  policyId: string;
  workspaceId: string;
  name: string;
  scheduleType: RetentionScheduleType;
  retentionPeriodDays: number;
  description: string;
  autoPurgeAfterRetention: boolean;
  requiresReviewBeforePurge: boolean;
  legalBasis: string;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// 2. LITIGATION & REGULATORY LEGAL HOLDS
// =============================================================================

export type LegalHoldReason =
  | 'PENDING_LITIGATION'
  | 'TRADEMARK_DISPUTE'
  | 'REGULATORY_INQUIRY'
  | 'TAX_AUDIT'
  | 'INTERNAL_INVESTIGATION';

export interface LegalHoldRecord {
  holdId: string;
  workspaceId: string;
  assetId: string;
  reason: LegalHoldReason;
  matterReference: string; // e.g. "Case #TM-2026-DEL-892"
  placedByUserId: string;
  placedAt: string;
  status: 'ACTIVE' | 'RELEASED';
  releasedByUserId?: string;
  releasedAt?: string;
  releaseReason?: string;
  notes?: string;
}

// =============================================================================
// 3. CHAIN OF CUSTODY AUDIT TRAIL
// =============================================================================

export type ChainOfCustodyAction =
  | 'ARCHIVED'
  | 'RESTORED'
  | 'RETENTION_POLICY_ASSIGNED'
  | 'LITIGATION_HOLD_APPLIED'
  | 'LITIGATION_HOLD_RELEASED'
  | 'STORAGE_CLASS_TIERED'
  | 'DISPOSAL_SCHEDULED'
  | 'PERMANENTLY_PURGED';

export interface ChainOfCustodyEvent {
  eventId: string;
  workspaceId: string;
  assetId: string;
  assetName: string;
  action: ChainOfCustodyAction;
  actorId: string;
  actorRole: string;
  timestamp: string;
  reason: string;
  assetChecksumSha256: string;
  metadataSnapshot?: Record<string, unknown>;
}

// =============================================================================
// 4. COLD STORAGE TIERING
// =============================================================================

export type CloudStorageClass = 'STANDARD' | 'NEARLINE' | 'COLDLINE' | 'ARCHIVE';

export interface StorageTieringRecord {
  assetId: string;
  storagePath: string;
  fileSizeBytes: number;
  currentStorageClass: CloudStorageClass;
  targetStorageClass: CloudStorageClass;
  monthlyCostEstimatedCents: number;
  lastTieredAt: string;
}

// =============================================================================
// 5. ARCHIVAL REQUESTS & RESPONSES
// =============================================================================

export interface ArchivalDispositionEvaluation {
  assetId: string;
  assetName: string;
  section: AssetSection;
  status: AssetLifecycleStatus;
  retentionSchedule: RetentionScheduleType;
  retentionExpiresAt: string;
  daysRemaining: number;
  hasActiveLegalHold: boolean;
  eligibleForPurge: boolean;
  recommendedAction: 'PRESERVE' | 'TIER_TO_COLDLINE' | 'AWAIT_LEGAL_RELEASE' | 'ELIGIBLE_FOR_DESTRUCTION';
}

export interface WorkspaceRetentionAuditSummary {
  workspaceId: string;
  totalArchivedAssetsCount: number;
  activeLegalHoldsCount: number;
  totalArchivedStorageBytes: number;
  storageByClass: Record<CloudStorageClass, number>;
  eligibleForPurgeCount: number;
  evaluations: ArchivalDispositionEvaluation[];
  generatedAt: string;
}

export interface DisposalCertificate {
  certificateId: string;
  workspaceId: string;
  purgedAssetCount: number;
  purgedAssets: Array<{
    assetId: string;
    assetName: string;
    checksumSha256: string;
    retentionSchedule: RetentionScheduleType;
  }>;
  authorizedByUserId: string;
  certifiedDisposalTimestamp: string;
  cryptographicSignatureSha256: string;
}
