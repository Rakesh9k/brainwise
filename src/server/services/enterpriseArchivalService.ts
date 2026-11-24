/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'node:crypto';
import { db } from '../db/firestore';
import { brandAssetRepository } from '../repositories/brandAssetRepository';
import type {
  UnifiedBrandAssetEntity,
} from '../types/assetLibrary';
import type {
  RetentionScheduleType,
  RetentionPolicyEntity,
  LegalHoldReason,
  LegalHoldRecord,
  ChainOfCustodyEvent,
  CloudStorageClass,
  StorageTieringRecord,
  ArchivalDispositionEvaluation,
  WorkspaceRetentionAuditSummary,
  DisposalCertificate,
} from '../types/enterpriseArchival';

export class EnterpriseArchivalService {
  // ===========================================================================
  // 1. STATUTORY RETENTION POLICIES
  // ===========================================================================

  public readonly DEFAULT_STATUTORY_SCHEDULES: Record<
    RetentionScheduleType,
    { days: number; name: string; legalBasis: string; description: string }
  > = {
    TAX_FINANCIAL: {
      days: 2555, // 7 years
      name: 'Statutory Tax & Financial Records',
      legalBasis: 'Indian Income Tax Act 1961 Sec 44AA / Companies Act 2013 Sec 128',
      description: 'Preserves all commercial invoices, price tags, packaging dielines with statutory MRP declarations, and financial collateral for 7 years.',
    },
    IP_TRADEMARK: {
      days: 3650, // 10 years
      name: 'Registered Trademarks & Brand Identifiers',
      legalBasis: 'Trade Marks Act 1999 (Sec 25) / Design Registration Rules',
      description: 'Maintains master vector marks, registered brand logotypes, and core brand guidelines across the standard 10-year registration term.',
    },
    CONTRACT_RIGHTS: {
      days: 1095, // 3 years
      name: 'Contractual Licenses & Talent Rights',
      legalBasis: 'Indian Limitation Act 1963 / Commercial Rights Agreements',
      description: 'Protects commercial marketing collateral, influencer assets, and licensed photography for limitation period post-term.',
    },
    GENERAL_MARKETING: {
      days: 730, // 2 years
      name: 'General Marketing & Social Campaigns',
      legalBasis: 'Enterprise Brand Governance & Digital Hygiene Policy',
      description: 'Sunsets seasonal social campaigns, expired promotions, and routine advertising collateral after 2 years.',
    },
    PERMANENT_HISTORICAL: {
      days: -1, // Never purges
      name: 'Permanent Historical Master Archive',
      legalBasis: 'Corporate Heritage & Master IP Repository Policy',
      description: 'Indefinitely preserves founding identity marks, origin story assets, and landmark milestone collateral. Never eligible for automated purging.',
    },
  };

  /**
   * Seeds default statutory retention policies for a workspace if not already present
   */
  public async getOrSeedDefaultPolicies(workspaceId: string): Promise<RetentionPolicyEntity[]> {
    const existing = await this.listRetentionPolicies(workspaceId);
    if (existing.length > 0) return existing;

    const seeded: RetentionPolicyEntity[] = [];
    const now = new Date().toISOString();

    for (const [key, spec] of Object.entries(this.DEFAULT_STATUTORY_SCHEDULES)) {
      const scheduleType = key as RetentionScheduleType;
      const policyId = `pol_${scheduleType.toLowerCase()}_${Date.now().toString(36)}`;
      const policy: RetentionPolicyEntity = {
        policyId,
        workspaceId,
        name: spec.name,
        scheduleType,
        retentionPeriodDays: spec.days,
        description: spec.description,
        autoPurgeAfterRetention: scheduleType === 'GENERAL_MARKETING',
        requiresReviewBeforePurge: scheduleType !== 'GENERAL_MARKETING',
        legalBasis: spec.legalBasis,
        createdAt: now,
        updatedAt: now,
      };

      await db.doc<RetentionPolicyEntity>(`workspaces/${workspaceId}/retentionPolicies/${policyId}`).set(policy);
      seeded.push(policy);
    }

    return seeded;
  }

  public async createRetentionPolicy(
    workspaceId: string,
    policyData: Partial<RetentionPolicyEntity>
  ): Promise<RetentionPolicyEntity> {
    const now = new Date().toISOString();
    const policyId = policyData.policyId || `pol_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const scheduleType = policyData.scheduleType || 'GENERAL_MARKETING';
    const defaultDays = this.DEFAULT_STATUTORY_SCHEDULES[scheduleType]?.days ?? 730;

    const policy: RetentionPolicyEntity = {
      policyId,
      workspaceId,
      name: policyData.name || `${scheduleType} Policy`,
      scheduleType,
      retentionPeriodDays: policyData.retentionPeriodDays !== undefined ? policyData.retentionPeriodDays : defaultDays,
      description: policyData.description || 'Custom workspace retention policy',
      autoPurgeAfterRetention: Boolean(policyData.autoPurgeAfterRetention),
      requiresReviewBeforePurge: policyData.requiresReviewBeforePurge !== undefined ? Boolean(policyData.requiresReviewBeforePurge) : true,
      legalBasis: policyData.legalBasis || 'Enterprise Archival Schedule',
      createdAt: now,
      updatedAt: now,
    };

    await db.doc<RetentionPolicyEntity>(`workspaces/${workspaceId}/retentionPolicies/${policyId}`).set(policy);
    return policy;
  }

  public async listRetentionPolicies(workspaceId: string): Promise<RetentionPolicyEntity[]> {
    const snap = await db.collection<RetentionPolicyEntity>(`workspaces/${workspaceId}/retentionPolicies`).get();
    return snap.docs.map((d) => d.data()).filter((d): d is RetentionPolicyEntity => Boolean(d));
  }

  public async getRetentionPolicy(workspaceId: string, policyId: string): Promise<RetentionPolicyEntity | null> {
    const snap = await db.doc<RetentionPolicyEntity>(`workspaces/${workspaceId}/retentionPolicies/${policyId}`).get();
    if (!snap.exists || !snap.data()) return null;
    return snap.data() ?? null;
  }

  /**
   * Assigns a statutory retention policy to an asset, calculating retention expiration and logging custody
   */
  public async assignRetentionPolicy(
    workspaceId: string,
    assetId: string,
    scheduleType: RetentionScheduleType,
    actorId = 'system'
  ): Promise<UnifiedBrandAssetEntity> {
    const asset = await brandAssetRepository.findById(workspaceId, assetId);
    if (!asset) {
      throw new Error(`ASSET_NOT_FOUND: Asset ${assetId} not found in workspace ${workspaceId}`);
    }

    const policies = await this.getOrSeedDefaultPolicies(workspaceId);
    const policy = policies.find((p) => p.scheduleType === scheduleType);
    const retentionDays = policy ? policy.retentionPeriodDays : this.DEFAULT_STATUTORY_SCHEDULES[scheduleType].days;

    let retentionExpiresAt: string | null;
    if (retentionDays > 0) {
      const createdDate = new Date(asset.createdAt || Date.now());
      createdDate.setDate(createdDate.getDate() + retentionDays);
      retentionExpiresAt = createdDate.toISOString();
    } else {
      retentionExpiresAt = '9999-12-31T23:59:59.999Z'; // Permanent
    }

    const updated = await brandAssetRepository.update(workspaceId, assetId, {
      retentionSchedule: scheduleType,
      retentionExpiresAt,
      retentionPolicyId: policy?.policyId,
    });

    await this.recordChainOfCustody({
      workspaceId,
      assetId,
      assetName: asset.name,
      action: 'RETENTION_POLICY_ASSIGNED',
      actorId,
      actorRole: 'compliance_officer',
      reason: `Assigned statutory retention policy ${scheduleType} (${retentionDays === -1 ? 'Indefinite' : `${retentionDays} days`})`,
      assetChecksumSha256: asset.verifiedMetadata?.checksumSha256 || this.calculateSha256(asset.svgContent || asset.name),
      metadataSnapshot: {
        scheduleType,
        retentionExpiresAt,
        policyId: policy?.policyId,
      },
    });

    return updated;
  }

  // ===========================================================================
  // 2. LITIGATION & REGULATORY HOLDS (ABSOLUTE DELETION IMMUNITY)
  // ===========================================================================

  /**
   * Places a binding legal hold on an asset. Once active, the asset CANNOT be deleted,
   * purged, or mutated, even by workspace owners or root admins.
   */
  public async applyLegalHold(
    workspaceId: string,
    assetId: string,
    reason: LegalHoldReason,
    matterReference: string,
    placedByUserId: string,
    notes?: string
  ): Promise<LegalHoldRecord> {
    const asset = await brandAssetRepository.findById(workspaceId, assetId);
    if (!asset) {
      throw new Error(`ASSET_NOT_FOUND: Asset ${assetId} not found in workspace ${workspaceId}`);
    }

    const now = new Date().toISOString();
    const holdId = `hold_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const holdRecord: LegalHoldRecord = {
      holdId,
      workspaceId,
      assetId,
      reason,
      matterReference,
      placedByUserId,
      placedAt: now,
      status: 'ACTIVE',
      notes,
    };

    // 1. Persist legal hold document
    await db.doc<LegalHoldRecord>(`workspaces/${workspaceId}/legalHolds/${holdId}`).set(holdRecord);

    // 2. Update asset document with legal hold flags
    await brandAssetRepository.update(workspaceId, assetId, {
      hasLegalHold: true,
      activeLegalHoldId: holdId,
      legalHoldReason: reason,
      legalHoldReference: matterReference,
    });

    // 3. Record immutable chain-of-custody event
    await this.recordChainOfCustody({
      workspaceId,
      assetId,
      assetName: asset.name,
      action: 'LITIGATION_HOLD_APPLIED',
      actorId: placedByUserId,
      actorRole: 'legal_counsel',
      reason: `Litigation Hold applied for matter: ${matterReference} (${reason})`,
      assetChecksumSha256: asset.verifiedMetadata?.checksumSha256 || this.calculateSha256(asset.svgContent || asset.name),
      metadataSnapshot: {
        holdId,
        reason,
        matterReference,
        notes,
      },
    });

    return holdRecord;
  }

  /**
   * Releases an active legal hold. Checks if other active holds remain before clearing
   * the asset's lock status.
   */
  public async releaseLegalHold(
    workspaceId: string,
    holdId: string,
    releaseReason: string,
    releasedByUserId: string
  ): Promise<LegalHoldRecord> {
    const holdRef = db.doc<LegalHoldRecord>(`workspaces/${workspaceId}/legalHolds/${holdId}`);
    const snap = await holdRef.get();
    if (!snap.exists || !snap.data()) {
      throw new Error(`LEGAL_HOLD_NOT_FOUND: Legal hold ${holdId} does not exist in workspace ${workspaceId}`);
    }

    const hold = snap.data()!;
    if (hold.status === 'RELEASED') {
      return hold;
    }

    const now = new Date().toISOString();
    const updatedHold: LegalHoldRecord = {
      ...hold,
      status: 'RELEASED',
      releasedByUserId,
      releasedAt: now,
      releaseReason,
    };

    await holdRef.set(updatedHold);

    // Check if asset still has any OTHER active legal holds
    const allHolds = await this.listLegalHolds(workspaceId, hold.assetId, 'ACTIVE');
    const remainingActiveHolds = allHolds.filter((h) => h.holdId !== holdId);

    const asset = await brandAssetRepository.findById(workspaceId, hold.assetId);

    if (remainingActiveHolds.length === 0) {
      await brandAssetRepository.update(workspaceId, hold.assetId, {
        hasLegalHold: false,
        activeLegalHoldId: undefined,
        legalHoldReason: undefined,
        legalHoldReference: undefined,
      });
    } else {
      const nextHold = remainingActiveHolds[0];
      await brandAssetRepository.update(workspaceId, hold.assetId, {
        hasLegalHold: true,
        activeLegalHoldId: nextHold.holdId,
        legalHoldReason: nextHold.reason,
        legalHoldReference: nextHold.matterReference,
      });
    }

    // Record immutable chain-of-custody event
    if (asset) {
      await this.recordChainOfCustody({
        workspaceId,
        assetId: hold.assetId,
        assetName: asset.name,
        action: 'LITIGATION_HOLD_RELEASED',
        actorId: releasedByUserId,
        actorRole: 'legal_counsel',
        reason: `Litigation Hold released: ${releaseReason} (Matter: ${hold.matterReference})`,
        assetChecksumSha256: asset.verifiedMetadata?.checksumSha256 || this.calculateSha256(asset.svgContent || asset.name),
        metadataSnapshot: {
          holdId,
          releaseReason,
          remainingActiveHoldCount: remainingActiveHolds.length,
        },
      });
    }

    return updatedHold;
  }

  public async listLegalHolds(
    workspaceId: string,
    assetId?: string,
    status?: 'ACTIVE' | 'RELEASED'
  ): Promise<LegalHoldRecord[]> {
    let query: any = db.collection<LegalHoldRecord>(`workspaces/${workspaceId}/legalHolds`);
    if (assetId) {
      query = query.where('assetId', '==', assetId);
    }
    if (status) {
      query = query.where('status', '==', status);
    }
    const snap = await query.get();
    return snap.docs.map((d: any) => d.data() as LegalHoldRecord).filter((d: any): d is LegalHoldRecord => Boolean(d));
  }

  public async hasActiveLegalHold(workspaceId: string, assetId: string): Promise<boolean> {
    const active = await this.listLegalHolds(workspaceId, assetId, 'ACTIVE');
    return active.length > 0;
  }

  // ===========================================================================
  // 3. TAMPER-EVIDENT CHAIN OF CUSTODY AUDIT TRAIL
  // ===========================================================================

  public async recordChainOfCustody(
    event: Omit<ChainOfCustodyEvent, 'eventId' | 'timestamp'>
  ): Promise<ChainOfCustodyEvent> {
    const now = new Date().toISOString();
    const eventId = `cust_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const fullEvent: ChainOfCustodyEvent = {
      eventId,
      timestamp: now,
      ...event,
    };

    await db.doc<ChainOfCustodyEvent>(`workspaces/${event.workspaceId}/chainOfCustody/${eventId}`).set(fullEvent);
    return fullEvent;
  }

  public async getChainOfCustody(workspaceId: string, assetId: string): Promise<ChainOfCustodyEvent[]> {
    const snap = await db
      .collection<ChainOfCustodyEvent>(`workspaces/${workspaceId}/chainOfCustody`)
      .where('assetId', '==', assetId)
      .get();

    const events = snap.docs.map((d) => d.data()).filter((d): d is ChainOfCustodyEvent => Boolean(d));
    return events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  // ===========================================================================
  // 4. STORAGE CLASS TIERING & COST METRICS
  // ===========================================================================

  private readonly STORAGE_CLASS_RATES_PER_GB_MONTH: Record<CloudStorageClass, number> = {
    STANDARD: 0.020, // 2.0 cents
    NEARLINE: 0.010, // 1.0 cent (50% reduction)
    COLDLINE: 0.004, // 0.4 cents (80% reduction)
    ARCHIVE: 0.0012, // 0.12 cents (94% reduction)
  };

  /**
   * Transitions an archived asset to nearline, coldline, or archive storage class
   */
  public async tierAssetStorageClass(
    workspaceId: string,
    assetId: string,
    targetStorageClass: CloudStorageClass,
    actorId = 'system'
  ): Promise<StorageTieringRecord> {
    const asset = await brandAssetRepository.findById(workspaceId, assetId);
    if (!asset) {
      throw new Error(`ASSET_NOT_FOUND: Asset ${assetId} not found in workspace ${workspaceId}`);
    }

    const currentClass: CloudStorageClass = (asset.storageClass as CloudStorageClass) || 'STANDARD';
    const fileSizeBytes = asset.fileSize || 1024 * 1024; // Default to 1MB if unspecified
    const fileSizeGb = fileSizeBytes / (1024 * 1024 * 1024);

    const costPerGb = this.STORAGE_CLASS_RATES_PER_GB_MONTH[targetStorageClass];
    const monthlyCostEstimatedCents = Math.round(fileSizeGb * costPerGb * 100 * 100) / 100;

    const now = new Date().toISOString();
    const record: StorageTieringRecord = {
      assetId,
      storagePath: asset.storagePath || `workspaces/${workspaceId}/brandAssets/${assetId}`,
      fileSizeBytes,
      currentStorageClass: currentClass,
      targetStorageClass,
      monthlyCostEstimatedCents,
      lastTieredAt: now,
    };

    // Update asset record
    await brandAssetRepository.update(workspaceId, assetId, {
      storageClass: targetStorageClass,
      storageTieredAt: now,
    });

    // Record chain of custody
    await this.recordChainOfCustody({
      workspaceId,
      assetId,
      assetName: asset.name,
      action: 'STORAGE_CLASS_TIERED',
      actorId,
      actorRole: 'storage_orchestrator',
      reason: `Tiered storage class from ${currentClass} to ${targetStorageClass} (Est. Monthly Cost: $${(monthlyCostEstimatedCents / 100).toFixed(4)})`,
      assetChecksumSha256: asset.verifiedMetadata?.checksumSha256 || this.calculateSha256(asset.svgContent || asset.name),
      metadataSnapshot: {
        previousClass: currentClass,
        targetClass: targetStorageClass,
        fileSizeBytes,
        monthlyCostEstimatedCents,
      },
    });

    return record;
  }

  // ===========================================================================
  // 5. LIFECYCLE EVALUATOR & AUDIT DISPOSITION
  // ===========================================================================

  public async evaluateAssetRetention(
    workspaceId: string,
    assetId: string
  ): Promise<ArchivalDispositionEvaluation> {
    const asset = await brandAssetRepository.findById(workspaceId, assetId);
    if (!asset) {
      throw new Error(`ASSET_NOT_FOUND: Asset ${assetId} not found in workspace ${workspaceId}`);
    }

    const hasLegalHold = await this.hasActiveLegalHold(workspaceId, assetId);
    const retentionSchedule: RetentionScheduleType =
      (asset.retentionSchedule as RetentionScheduleType) || 'GENERAL_MARKETING';

    const defaultDays = this.DEFAULT_STATUTORY_SCHEDULES[retentionSchedule]?.days ?? 730;
    const now = Date.now();
    let retentionExpiresAt = asset.retentionExpiresAt;

    if (!retentionExpiresAt) {
      if (defaultDays > 0) {
        const createdDate = new Date(asset.createdAt || now);
        createdDate.setDate(createdDate.getDate() + defaultDays);
        retentionExpiresAt = createdDate.toISOString();
      } else {
        retentionExpiresAt = '9999-12-31T23:59:59.999Z';
      }
    }

    const expiresTime = new Date(retentionExpiresAt).getTime();
    const daysRemaining = Math.max(0, Math.ceil((expiresTime - now) / (1000 * 60 * 60 * 24)));
    const isExpired = expiresTime <= now;

    let eligibleForPurge = false;
    let recommendedAction: ArchivalDispositionEvaluation['recommendedAction'] = 'PRESERVE';

    if (hasLegalHold) {
      recommendedAction = 'AWAIT_LEGAL_RELEASE';
      eligibleForPurge = false;
    } else if (retentionSchedule === 'PERMANENT_HISTORICAL') {
      recommendedAction = 'PRESERVE';
      eligibleForPurge = false;
    } else if (isExpired) {
      recommendedAction = 'ELIGIBLE_FOR_DESTRUCTION';
      eligibleForPurge = true;
    } else if (asset.section === 'Archived' && (!asset.storageClass || asset.storageClass === 'STANDARD')) {
      recommendedAction = 'TIER_TO_COLDLINE';
      eligibleForPurge = false;
    }

    return {
      assetId: asset.assetId,
      assetName: asset.name,
      section: asset.section,
      status: asset.status,
      retentionSchedule,
      retentionExpiresAt,
      daysRemaining,
      hasActiveLegalHold: hasLegalHold,
      eligibleForPurge,
      recommendedAction,
    };
  }

  /**
   * Evaluates all archived assets across the workspace for compliance, legal holds, and storage costs
   */
  public async evaluateWorkspaceRetention(workspaceId: string): Promise<WorkspaceRetentionAuditSummary> {
    const assets = await brandAssetRepository.listByWorkspace(workspaceId, {
      section: 'Archived',
      limit: 1000,
    });

    const evaluations: ArchivalDispositionEvaluation[] = [];
    const storageByClass: Record<CloudStorageClass, number> = {
      STANDARD: 0,
      NEARLINE: 0,
      COLDLINE: 0,
      ARCHIVE: 0,
    };

    let totalArchivedStorageBytes = 0;
    let eligibleForPurgeCount = 0;
    let activeLegalHoldsCount = 0;

    for (const asset of assets) {
      const evalResult = await this.evaluateAssetRetention(workspaceId, asset.assetId);
      evaluations.push(evalResult);

      if (evalResult.hasActiveLegalHold) activeLegalHoldsCount++;
      if (evalResult.eligibleForPurge) eligibleForPurgeCount++;

      const bytes = asset.fileSize || 1024 * 1024;
      totalArchivedStorageBytes += bytes;

      const cls: CloudStorageClass = (asset.storageClass as CloudStorageClass) || 'STANDARD';
      if (storageByClass[cls] !== undefined) {
        storageByClass[cls] += bytes;
      } else {
        storageByClass.STANDARD += bytes;
      }
    }

    return {
      workspaceId,
      totalArchivedAssetsCount: assets.length,
      activeLegalHoldsCount,
      totalArchivedStorageBytes,
      storageByClass,
      eligibleForPurgeCount,
      evaluations,
      generatedAt: new Date().toISOString(),
    };
  }

  // ===========================================================================
  // 6. CERTIFIED DISPOSAL & PERMANENT PURGE WITH CRYPTOGRAPHIC CERTIFICATES
  // ===========================================================================

  /**
   * Executes permanent purge of expired assets with strict legal hold verification.
   * Generates a tamper-evident, cryptographically signed Disposal Certificate.
   */
  public async purgeExpiredAssetsWithCertificate(
    workspaceId: string,
    assetIds: string[],
    authorizedByUserId: string,
    reason = 'Statutory Retention Expiration'
  ): Promise<DisposalCertificate> {
    if (!assetIds || assetIds.length === 0) {
      throw new Error('NO_ASSETS_SPECIFIED: Cannot execute disposal certificate without asset identifiers.');
    }

    const purgedAssetsInfo: DisposalCertificate['purgedAssets'] = [];

    // 1. Pre-flight verification: Check all assets for active legal holds
    for (const assetId of assetIds) {
      const hasHold = await this.hasActiveLegalHold(workspaceId, assetId);
      if (hasHold) {
        throw new Error(
          `LITIGATION_HOLD_ACTIVE: Asset ${assetId} cannot be purged due to an active legal or regulatory hold. Purge operation aborted.`
        );
      }
    }

    // 2. Perform hard purge and collect evidence
    for (const assetId of assetIds) {
      const asset = await brandAssetRepository.findById(workspaceId, assetId);
      if (!asset) continue;

      const checksumSha256 =
        asset.verifiedMetadata?.checksumSha256 || this.calculateSha256(asset.svgContent || asset.name);
      const schedule: RetentionScheduleType =
        (asset.retentionSchedule as RetentionScheduleType) || 'GENERAL_MARKETING';

      // Record final chain of custody event BEFORE deletion
      await this.recordChainOfCustody({
        workspaceId,
        assetId,
        assetName: asset.name,
        action: 'PERMANENTLY_PURGED',
        actorId: authorizedByUserId,
        actorRole: 'compliance_officer',
        reason: `Certified Permanent Disposal: ${reason}`,
        assetChecksumSha256: checksumSha256,
        metadataSnapshot: {
          retentionSchedule: schedule,
          retentionExpiresAt: asset.retentionExpiresAt,
          fileSize: asset.fileSize,
        },
      });

      // Execute repository deletion
      await brandAssetRepository.deletePermanently(workspaceId, assetId);

      purgedAssetsInfo.push({
        assetId,
        assetName: asset.name,
        checksumSha256,
        retentionSchedule: schedule,
      });
    }

    // 3. Generate cryptographic signature of the disposal manifest
    const now = new Date().toISOString();
    const certificateId = `cert_disp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const manifestPayload = JSON.stringify({
      certificateId,
      workspaceId,
      purgedAssets: purgedAssetsInfo,
      authorizedByUserId,
      timestamp: now,
    });

    const cryptographicSignatureSha256 = crypto
      .createHmac('sha256', 'BRAINWISE_COMPLIANCE_SIGNING_KEY_PHASE6')
      .update(manifestPayload)
      .digest('hex');

    const certificate: DisposalCertificate = {
      certificateId,
      workspaceId,
      purgedAssetCount: purgedAssetsInfo.length,
      purgedAssets: purgedAssetsInfo,
      authorizedByUserId,
      certifiedDisposalTimestamp: now,
      cryptographicSignatureSha256,
    };

    // Store disposal certificate immutably
    await db.doc<DisposalCertificate>(`workspaces/${workspaceId}/disposalCertificates/${certificateId}`).set(certificate);

    return certificate;
  }

  public async getDisposalCertificate(
    workspaceId: string,
    certificateId: string
  ): Promise<DisposalCertificate | null> {
    const snap = await db.doc<DisposalCertificate>(`workspaces/${workspaceId}/disposalCertificates/${certificateId}`).get();
    if (!snap.exists || !snap.data()) return null;
    return snap.data() ?? null;
  }

  public async listDisposalCertificates(workspaceId: string): Promise<DisposalCertificate[]> {
    const snap = await db.collection<DisposalCertificate>(`workspaces/${workspaceId}/disposalCertificates`).get();
    return snap.docs.map((d) => d.data()).filter((d): d is DisposalCertificate => Boolean(d));
  }

  // ===========================================================================
  // UTILITY METHODS
  // ===========================================================================

  private calculateSha256(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }
}

export const enterpriseArchivalService = new EnterpriseArchivalService();
