/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { brandAssetRepository } from './repositories/brandAssetRepository';
import { enterpriseArchivalService } from './services/enterpriseArchivalService';
import type { RetentionScheduleType, CloudStorageClass } from './types/enterpriseArchival';

const TEST_WORKSPACE = 'ws_enterprise_archival_test';
const TEST_USER = 'user_legal_compliance_officer';

describe('PHASE 6 — ENTERPRISE ARCHIVAL, RETENTION & COMPLIANCE SYSTEM', () => {
  beforeEach(async () => {
    // Purge test workspace assets
    const active = await brandAssetRepository.listByWorkspace(TEST_WORKSPACE, { limit: 200 });
    for (const a of active) {
      try {
        await brandAssetRepository.deletePermanently(TEST_WORKSPACE, a.assetId);
      } catch {
        // May fail if legal hold is present in test remnant
      }
    }
  });

  // ===========================================================================
  // 1. STATUTORY RETENTION POLICIES & LIFECYCLE SCHEDULES
  // ===========================================================================
  it('1. Statutory Retention Schedules: Seeds and retrieves Indian & global statutory schedules', async () => {
    const policies = await enterpriseArchivalService.getOrSeedDefaultPolicies(TEST_WORKSPACE);
    assert.ok(policies.length >= 5, 'Should seed at least 5 standard retention policies');

    const taxPolicy = policies.find((p) => p.scheduleType === 'TAX_FINANCIAL');
    assert.ok(taxPolicy, 'Should contain TAX_FINANCIAL policy');
    assert.equal(taxPolicy?.retentionPeriodDays, 2555, 'TAX_FINANCIAL must mandate 7 years (2555 days)');
    assert.ok(taxPolicy?.legalBasis.includes('Income Tax Act') || taxPolicy?.legalBasis.includes('Companies Act'));

    const tmPolicy = policies.find((p) => p.scheduleType === 'IP_TRADEMARK');
    assert.ok(tmPolicy, 'Should contain IP_TRADEMARK policy');
    assert.equal(tmPolicy?.retentionPeriodDays, 3650, 'IP_TRADEMARK must mandate 10 years');

    const permPolicy = policies.find((p) => p.scheduleType === 'PERMANENT_HISTORICAL');
    assert.ok(permPolicy, 'Should contain PERMANENT_HISTORICAL policy');
    assert.equal(permPolicy?.retentionPeriodDays, -1, 'PERMANENT_HISTORICAL must be indefinite (-1)');
  });

  it('2. Retention Policy Assignment: Calculates expiration and records chain-of-custody event', async () => {
    const asset = await brandAssetRepository.create({
      workspaceId: TEST_WORKSPACE,
      name: 'Invoice Pack & Statutory Dielline 2026',
      section: 'Archived',
      status: 'archived',
      createdBy: TEST_USER,
    });

    const updated = await enterpriseArchivalService.assignRetentionPolicy(
      TEST_WORKSPACE,
      asset.assetId,
      'TAX_FINANCIAL',
      TEST_USER
    );

    assert.equal(updated.retentionSchedule, 'TAX_FINANCIAL');
    assert.ok(updated.retentionExpiresAt, 'Expiration timestamp must be calculated');

    const expirationDate = new Date(updated.retentionExpiresAt!);
    const expectedYear = new Date().getFullYear() + 7;
    assert.equal(expirationDate.getFullYear(), expectedYear, 'Must expire 7 years from creation');

    // Verify custody audit log
    const custodyTrail = await enterpriseArchivalService.getChainOfCustody(TEST_WORKSPACE, asset.assetId);
    assert.ok(custodyTrail.length >= 1, 'Chain of custody must record policy assignment');
    const assignEvent = custodyTrail.find((e) => e.action === 'RETENTION_POLICY_ASSIGNED');
    assert.ok(assignEvent, 'Audit event must match RETENTION_POLICY_ASSIGNED');
    assert.equal(assignEvent?.actorId, TEST_USER);
  });

  // ===========================================================================
  // 2. LITIGATION & REGULATORY HOLDS (ABSOLUTE DELETION IMMUNITY)
  // ===========================================================================
  it('3. Legal Hold Application: Flags asset and logs custody audit trail', async () => {
    const asset = await brandAssetRepository.create({
      workspaceId: TEST_WORKSPACE,
      name: 'Contested Brand Mark 2026',
      section: 'Identity',
      status: 'approved',
      createdBy: TEST_USER,
    });

    const hold = await enterpriseArchivalService.applyLegalHold(
      TEST_WORKSPACE,
      asset.assetId,
      'TRADEMARK_DISPUTE',
      'Matter #TM-2026-DEL-1049',
      TEST_USER,
      'High Court of Delhi interim injunction pending'
    );

    assert.equal(hold.status, 'ACTIVE');
    assert.equal(hold.reason, 'TRADEMARK_DISPUTE');
    assert.equal(hold.matterReference, 'Matter #TM-2026-DEL-1049');

    // Verify asset metadata updated
    const refreshed = await brandAssetRepository.findById(TEST_WORKSPACE, asset.assetId);
    assert.equal(refreshed?.hasLegalHold, true);
    assert.equal(refreshed?.activeLegalHoldId, hold.holdId);

    // Verify active hold query
    const hasHold = await enterpriseArchivalService.hasActiveLegalHold(TEST_WORKSPACE, asset.assetId);
    assert.equal(hasHold, true);
  });

  it('4. Deletion Immunity: Strictly rejects permanent deletion when legal hold is active', async () => {
    const asset = await brandAssetRepository.create({
      workspaceId: TEST_WORKSPACE,
      name: 'Subpoenaed Financial Records 2026',
      section: 'Archived',
      status: 'archived',
      createdBy: TEST_USER,
    });

    await enterpriseArchivalService.applyLegalHold(
      TEST_WORKSPACE,
      asset.assetId,
      'REGULATORY_INQUIRY',
      'Matter #SEBI-2026-INV-441',
      TEST_USER
    );

    // 1. Direct repository deletePermanently must throw LITIGATION_HOLD_ACTIVE
    await assert.rejects(
      async () => {
        await brandAssetRepository.deletePermanently(TEST_WORKSPACE, asset.assetId);
      },
      (err: Error) => {
        return err.message.includes('LITIGATION_HOLD_ACTIVE');
      },
      'Direct hard delete must be blocked by active legal hold'
    );

    // 2. Purge with certificate must also be blocked
    await assert.rejects(
      async () => {
        await enterpriseArchivalService.purgeExpiredAssetsWithCertificate(
          TEST_WORKSPACE,
          [asset.assetId],
          TEST_USER
        );
      },
      (err: Error) => {
        return err.message.includes('LITIGATION_HOLD_ACTIVE');
      },
      'Certified purge must be blocked by active legal hold'
    );

    // Asset must still exist unharmed
    const intact = await brandAssetRepository.findById(TEST_WORKSPACE, asset.assetId);
    assert.ok(intact, 'Asset must remain intact in repository');
  });

  it('5. Legal Hold Release: Restores standard lifecycle and records audit event', async () => {
    const asset = await brandAssetRepository.create({
      workspaceId: TEST_WORKSPACE,
      name: 'Resolved Dispute Collateral',
      section: 'Archived',
      status: 'archived',
      createdBy: TEST_USER,
    });

    const hold = await enterpriseArchivalService.applyLegalHold(
      TEST_WORKSPACE,
      asset.assetId,
      'PENDING_LITIGATION',
      'Case #COMM-2026-88',
      TEST_USER
    );

    // Release the hold
    const released = await enterpriseArchivalService.releaseLegalHold(
      TEST_WORKSPACE,
      hold.holdId,
      'Case settled out of court with mutual release',
      TEST_USER
    );

    assert.equal(released.status, 'RELEASED');
    assert.equal(released.releasedByUserId, TEST_USER);

    // Asset should no longer have legal hold
    const hasHold = await enterpriseArchivalService.hasActiveLegalHold(TEST_WORKSPACE, asset.assetId);
    assert.equal(hasHold, false);

    const refreshed = await brandAssetRepository.findById(TEST_WORKSPACE, asset.assetId);
    assert.equal(refreshed?.hasLegalHold, false);

    // Verify chain-of-custody event logged
    const custody = await enterpriseArchivalService.getChainOfCustody(TEST_WORKSPACE, asset.assetId);
    const releaseEvent = custody.find((e) => e.action === 'LITIGATION_HOLD_RELEASED');
    assert.ok(releaseEvent, 'Must record LITIGATION_HOLD_RELEASED in chain of custody');
  });

  // ===========================================================================
  // 3. STORAGE CLASS TIERING & COST METRICS
  // ===========================================================================
  it('6. Cold Storage Tiering: Transitions storage class and computes estimated savings', async () => {
    const asset = await brandAssetRepository.create({
      workspaceId: TEST_WORKSPACE,
      name: 'Large Archive Catalog Master',
      section: 'Archived',
      status: 'archived',
      fileSize: 100 * 1024 * 1024, // 100 MB
      createdBy: TEST_USER,
    });

    const tierResult = await enterpriseArchivalService.tierAssetStorageClass(
      TEST_WORKSPACE,
      asset.assetId,
      'COLDLINE',
      TEST_USER
    );

    assert.equal(tierResult.targetStorageClass, 'COLDLINE');
    assert.ok(tierResult.monthlyCostEstimatedCents > 0);

    const refreshed = await brandAssetRepository.findById(TEST_WORKSPACE, asset.assetId);
    assert.equal(refreshed?.storageClass, 'COLDLINE');

    const custody = await enterpriseArchivalService.getChainOfCustody(TEST_WORKSPACE, asset.assetId);
    const tierEvent = custody.find((e) => e.action === 'STORAGE_CLASS_TIERED');
    assert.ok(tierEvent, 'Must record STORAGE_CLASS_TIERED event');
  });

  // ===========================================================================
  // 4. LIFECYCLE EVALUATOR & WORKSPACE RETENTION AUDIT
  // ===========================================================================
  it('7. Retention Evaluator: Accurately evaluates dispositions across diverse asset states', async () => {
    // 1. Asset with active legal hold
    const heldAsset = await brandAssetRepository.create({
      workspaceId: TEST_WORKSPACE,
      name: 'Held Packaging Dieline',
      section: 'Archived',
      status: 'archived',
      createdBy: TEST_USER,
    });
    await enterpriseArchivalService.applyLegalHold(
      TEST_WORKSPACE,
      heldAsset.assetId,
      'TRADEMARK_DISPUTE',
      'Matter #TM-99',
      TEST_USER
    );

    const heldEval = await enterpriseArchivalService.evaluateAssetRetention(TEST_WORKSPACE, heldAsset.assetId);
    assert.equal(heldEval.recommendedAction, 'AWAIT_LEGAL_RELEASE');
    assert.equal(heldEval.eligibleForPurge, false);

    // 2. Permanent Historical asset
    const permAsset = await brandAssetRepository.create({
      workspaceId: TEST_WORKSPACE,
      name: 'Origin Vector Brand Crest',
      section: 'Archived',
      status: 'archived',
      retentionSchedule: 'PERMANENT_HISTORICAL',
      createdBy: TEST_USER,
    });

    const permEval = await enterpriseArchivalService.evaluateAssetRetention(TEST_WORKSPACE, permAsset.assetId);
    assert.equal(permEval.recommendedAction, 'PRESERVE');
    assert.equal(permEval.eligibleForPurge, false);

    // 3. Expired asset eligible for destruction
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 100);
    const expiredAsset = await brandAssetRepository.create({
      workspaceId: TEST_WORKSPACE,
      name: 'Expired 2023 Promo Banner',
      section: 'Archived',
      status: 'archived',
      retentionSchedule: 'GENERAL_MARKETING',
      retentionExpiresAt: pastDate.toISOString(),
      createdBy: TEST_USER,
    });

    const expEval = await enterpriseArchivalService.evaluateAssetRetention(TEST_WORKSPACE, expiredAsset.assetId);
    assert.equal(expEval.recommendedAction, 'ELIGIBLE_FOR_DESTRUCTION');
    assert.equal(expEval.eligibleForPurge, true);

    // 4. Workspace-wide audit roll-up
    const workspaceAudit = await enterpriseArchivalService.evaluateWorkspaceRetention(TEST_WORKSPACE);
    assert.ok(workspaceAudit.totalArchivedAssetsCount >= 3);
    assert.ok(workspaceAudit.activeLegalHoldsCount >= 1);
    assert.ok(workspaceAudit.eligibleForPurgeCount >= 1);
  });

  // ===========================================================================
  // 5. CERTIFIED DISPOSAL & CRYPTOGRAPHIC COMPLIANCE CERTIFICATES
  // ===========================================================================
  it('8. Certified Disposal: Executes permanent purge and generates cryptographically signed certificate', async () => {
    // Create two expired marketing assets without legal holds
    const a1 = await brandAssetRepository.create({
      workspaceId: TEST_WORKSPACE,
      name: 'Obsolete Ad Variant A',
      section: 'Archived',
      status: 'archived',
      retentionSchedule: 'GENERAL_MARKETING',
      createdBy: TEST_USER,
    });

    const a2 = await brandAssetRepository.create({
      workspaceId: TEST_WORKSPACE,
      name: 'Obsolete Ad Variant B',
      section: 'Archived',
      status: 'archived',
      retentionSchedule: 'GENERAL_MARKETING',
      createdBy: TEST_USER,
    });

    // Execute certified disposal
    const cert = await enterpriseArchivalService.purgeExpiredAssetsWithCertificate(
      TEST_WORKSPACE,
      [a1.assetId, a2.assetId],
      TEST_USER,
      'Mandatory Q4 Digital Hygiene Sunset'
    );

    assert.ok(cert.certificateId.startsWith('cert_disp_'));
    assert.equal(cert.purgedAssetCount, 2);
    assert.equal(cert.authorizedByUserId, TEST_USER);
    assert.ok(cert.cryptographicSignatureSha256.length === 64, 'Signature must be valid 64-char hex SHA-256');

    // Verify assets are purged from repository
    const check1 = await brandAssetRepository.findById(TEST_WORKSPACE, a1.assetId);
    const check2 = await brandAssetRepository.findById(TEST_WORKSPACE, a2.assetId);
    assert.equal(check1, null, 'Purged asset A must no longer exist');
    assert.equal(check2, null, 'Purged asset B must no longer exist');

    // Retrieve certificate by ID
    const retrievedCert = await enterpriseArchivalService.getDisposalCertificate(TEST_WORKSPACE, cert.certificateId);
    assert.ok(retrievedCert, 'Disposal certificate must be retrievable');
    assert.equal(retrievedCert?.cryptographicSignatureSha256, cert.cryptographicSignatureSha256);
  });

  // ===========================================================================
  // 6. MULTIPLE CONCURRENT HOLDS & ORDER OF RELEASE
  // ===========================================================================
  it('9. Multiple Concurrent Legal Holds: Releasing one hold maintains active lock until ALL holds are released', async () => {
    const asset = await brandAssetRepository.create({
      workspaceId: TEST_WORKSPACE,
      name: 'Double Subpoenaed Asset',
      section: 'Archived',
      status: 'archived',
      createdBy: TEST_USER,
    });

    // Apply hold 1 (Civil Litigation)
    const hold1 = await enterpriseArchivalService.applyLegalHold(
      TEST_WORKSPACE,
      asset.assetId,
      'PENDING_LITIGATION',
      'Matter #CIV-2026-101',
      TEST_USER
    );

    // Apply hold 2 (Tax Audit)
    const hold2 = await enterpriseArchivalService.applyLegalHold(
      TEST_WORKSPACE,
      asset.assetId,
      'TAX_AUDIT',
      'Matter #IT-AUDIT-2026-99',
      TEST_USER
    );

    const activeHolds = await enterpriseArchivalService.listLegalHolds(TEST_WORKSPACE, asset.assetId, 'ACTIVE');
    assert.equal(activeHolds.length, 2);

    // Release hold 1
    await enterpriseArchivalService.releaseLegalHold(
      TEST_WORKSPACE,
      hold1.holdId,
      'Civil suit settled',
      TEST_USER
    );

    // Asset MUST still be locked because hold 2 is active
    let hasHold = await enterpriseArchivalService.hasActiveLegalHold(TEST_WORKSPACE, asset.assetId);
    assert.equal(hasHold, true, 'Asset must remain locked while second hold is active');

    let refreshed = await brandAssetRepository.findById(TEST_WORKSPACE, asset.assetId);
    assert.equal(refreshed?.hasLegalHold, true);
    assert.equal(refreshed?.activeLegalHoldId, hold2.holdId);

    // Release hold 2
    await enterpriseArchivalService.releaseLegalHold(
      TEST_WORKSPACE,
      hold2.holdId,
      'Tax audit concluded with no findings',
      TEST_USER
    );

    // Now asset should be completely released
    hasHold = await enterpriseArchivalService.hasActiveLegalHold(TEST_WORKSPACE, asset.assetId);
    assert.equal(hasHold, false, 'Asset must be fully released after all holds cleared');

    refreshed = await brandAssetRepository.findById(TEST_WORKSPACE, asset.assetId);
    assert.equal(refreshed?.hasLegalHold, false);
  });

  // ===========================================================================
  // 7. CUSTOM RETENTION POLICY CREATION
  // ===========================================================================
  it('10. Custom Retention Policies: Creates custom enterprise policy with audit verification', async () => {
    const customPolicy = await enterpriseArchivalService.createRetentionPolicy(TEST_WORKSPACE, {
      name: 'FSSAI Food Safety Packaging Compliance',
      scheduleType: 'TAX_FINANCIAL',
      retentionPeriodDays: 1825, // 5 years
      description: 'Preserves nutritional labels and packaging batches per FSSAI regulations',
      legalBasis: 'Food Safety and Standards Act 2006 Sec 23',
      requiresReviewBeforePurge: true,
      autoPurgeAfterRetention: false,
    });

    assert.ok(customPolicy.policyId.startsWith('pol_'));
    assert.equal(customPolicy.retentionPeriodDays, 1825);
    assert.equal(customPolicy.legalBasis, 'Food Safety and Standards Act 2006 Sec 23');

    const fetched = await enterpriseArchivalService.getRetentionPolicy(TEST_WORKSPACE, customPolicy.policyId);
    assert.equal(fetched?.name, 'FSSAI Food Safety Packaging Compliance');
  });

  // ===========================================================================
  // 8. STRICT VIDEO EXCLUSION DIRECTIVE
  // ===========================================================================
  it('11. Absolute Product Boundary: Rejects any video generation or video-related pipeline', () => {
    // Phase 6 focuses strictly on SVG, high-DPI print collateral, packaging dielines, and static media
    assert.ok(
      !('generateVideo' in enterpriseArchivalService),
      'Must strictly exclude all video generation methods'
    );
    assert.ok(
      !('renderReel' in enterpriseArchivalService),
      'Must strictly exclude all reel rendering methods'
    );
  });
});
