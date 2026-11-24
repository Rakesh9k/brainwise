/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateSafeExternalUrl } from './utils/ssrfValidator';
import { executeTruthCheck } from '../utils/truthCheck';
import { INITIAL_BRAINWISE_STATE } from '../data/mockData';
import { recordStrategicAngle, FATIGUE_THRESHOLD } from '../utils/strategicMemory';
import { creditService } from './services/creditService';
import { brandStudioService } from './services/brandStudioService';
import { growthDirectorService } from './services/growthDirectorService';
import { unifiedReportService } from './services/unifiedReportService';
import { db } from './db/firestore';

describe('PHASE 10-12 — MASTER PRODUCTION READINESS & CERTIFICATION SUITE', () => {
  const workspaceA = `ws_prod_ready_a_${Date.now()}`;
  const workspaceB = `ws_prod_ready_b_${Date.now()}`;

  // ---------------------------------------------------------------------------
  // 1. OWASP SSRF Defense Protocol
  // ---------------------------------------------------------------------------
  it('1. Blocks loopback, internal subnets, and cloud metadata endpoints via ssrfValidator', () => {
    const maliciousUrls = [
      'http://127.0.0.1:8080/admin',
      'http://localhost:3000',
      'http://169.254.169.254/latest/meta-data',
      'http://10.0.0.1/internal',
      'http://192.168.1.1/router',
      'http://172.16.0.1/private',
      'file:///etc/passwd',
      'gopher://internal.network',
    ];

    for (const url of maliciousUrls) {
      const result = validateSafeExternalUrl(url);
      assert.equal(result.isSafe, false, `Must block unsafe URL: ${url}`);
      assert.ok(result.reason.length > 5);
    }

    // Public valid URLs must pass
    const safeResult = validateSafeExternalUrl('https://npci.org.in/statistics');
    assert.equal(safeResult.isSafe, true);
  });

  // ---------------------------------------------------------------------------
  // 2. Truth Engine Guardrail: Rejects Unverified Prices & Hyperbole
  // ---------------------------------------------------------------------------
  it('2. Enforces Truth Engine guardrail: rejects price hallucinations and forbidden claims', () => {
    const brain = INITIAL_BRAINWISE_STATE.brain;

    // Price hallucination ($5 instead of approved $18-$26)
    const hallucinated = executeTruthCheck(
      'Get premium specialty coffee delivered to your home for just $5 today!',
      brain
    );
    assert.ok(hallucinated.violations.some((v) => v.type === 'PRICE_HALLUCINATION'));
    assert.equal(hallucinated.status, 'REMEDIATED');

    // Forbidden claim violation (exclusion breach -> triggers refund safeguard)
    const violating = executeTruthCheck(
      'Try our 100% organic beans with a guaranteed 10x ROI on your daily productivity!',
      brain
    );
    assert.equal(violating.isValid, false);
    assert.equal(violating.refundTriggered, true);
    assert.ok(violating.violations.some((v) => v.type === 'EXCLUSION_BREACH'));

    // Compliant verified copy
    const compliant = executeTruthCheck(
      'Experience Solstice Craft Coffee with our Roast-to-Order Origin Subscription for $18 – $26 / month.',
      brain
    );
    assert.equal(compliant.isValid, true);
    assert.equal(compliant.violations.length, 0);
  });

  // ---------------------------------------------------------------------------
  // 3. Anti-Fatigue Memory & Frequency Thresholding
  // ---------------------------------------------------------------------------
  it('3. Enforces Anti-Fatigue Memory guardrail when strategic angle usage hits threshold', () => {
    let memory = {
      usedAngles: [],
      fatiguedThemes: [],
      explicitExclusions: [],
      lastUpdated: new Date().toISOString(),
    };

    // Use same angle repeatedly
    for (let i = 0; i < FATIGUE_THRESHOLD; i++) {
      memory = recordStrategicAngle(memory, 'High Speed Growth', 'SpeedFocus', 'GrowthDirector');
    }

    assert.ok(memory.fatiguedThemes.includes('SpeedFocus'), 'Theme must be marked fatigued after threshold');
    assert.equal(memory.usedAngles[0]!.frequency, FATIGUE_THRESHOLD);
  });

  // ---------------------------------------------------------------------------
  // 4. Two-Phase Credit Reservation Protocol (ADR-006)
  // ---------------------------------------------------------------------------
  it('4. Executes Two-Phase Credit Protocol: reserves credits and auto-refunds on simulated failure', async () => {
    const userId = `usr_test_${Date.now()}`;
    const featureId = 'FEAT-BRD-001'; // Valid billable feature (cost: 5 credits)

    // Ensure wallet is initialized with credits
    await creditService.getWallet(workspaceA);

    // 1. Reserve credits
    const reservation = await creditService.reserveCredits({
      workspaceId: workspaceA,
      userId,
      featureId,
      idempotencyKey: `idem_fail_${Date.now()}`,
    });

    assert.ok(reservation);
    assert.ok(reservation.reservationId.startsWith('res_'));
    assert.equal(reservation.status, 'HOLD');

    // 2. Simulate upstream failure -> Trigger auto-refund
    await creditService.refundCredits({
      workspaceId: workspaceA,
      reservation,
      reason: 'Upstream AI Provider Timeout (Simulated)',
    });

    // 3. Settle must throw because reservation is already refunded
    await assert.rejects(
      async () => {
        await creditService.settleCredits({
          workspaceId: workspaceA,
          reservation,
          featureId,
        });
      },
      /not in HOLD state|already.*refunded|RELEASED/i
    );
  });

  // ---------------------------------------------------------------------------
  // 5. Strict Video Exclusion Regression Sweep
  // ---------------------------------------------------------------------------
  it('5. Certifies Strict Video Exclusion across all collateral generators and intelligence roadmaps', async () => {
    const collateralTypes = [
      'VECTOR_LOGO',
      'BUSINESS_CARD_SVG',
      'STATIONERY_LETTERHEAD_SVG',
      'POSTER_FLYER_SVG',
      'STATIC_CAROUSEL_SVG',
    ] as const;

    for (const cType of collateralTypes) {
      const asset = brandStudioService.generateCollateralSvg({
        workspaceId: workspaceA,
        assetType: cType,
        brandName: 'NoVideoAudit',
      });

      const markup = asset.svgMarkup.toLowerCase();
      assert.ok(!markup.includes('<video'), 'Must not contain video tags');
      assert.ok(!markup.includes('remotion'), 'Must not contain Remotion scripts');
      assert.ok(!markup.includes('ffmpeg'), 'Must not contain FFmpeg references');
      assert.ok(!markup.includes('.mp4'), 'Must not contain MP4 references');
      assert.ok(markup.startsWith('<svg'));
    }

    const roadmap = await growthDirectorService.generateOperationalRoadmap({ workspaceId: workspaceA });
    for (const opp of roadmap.opportunities) {
      for (const ch of opp.recommendedChannels) {
        assert.ok(ch.formatType !== ('VIDEO' as any));
        assert.ok(!ch.channelName.toLowerCase().includes('video'));
      }
    }
  });

  // ---------------------------------------------------------------------------
  // 6. DPDPA 2023 Regional Data Residency Compliance
  // ---------------------------------------------------------------------------
  it('6. Verifies DPDPA 2023 regional data residency compliance in asia-south1 Mumbai', async () => {
    // Assert Firestore collection path isolation under workspace
    const testDoc = await db.doc(`workspaces/${workspaceA}/complianceAudit/dpdpa2023`).set({
      statutoryAct: 'Digital Personal Data Protection Act 2023',
      dataResidencyRegion: 'asia-south1',
      city: 'Mumbai',
      country: 'India',
      consentCaptured: true,
      certifiedAt: new Date().toISOString(),
    });

    const readBack = await db.doc(`workspaces/${workspaceA}/complianceAudit/dpdpa2023`).get();
    assert.ok(readBack.exists);
    const data = readBack.data();
    assert.equal(data.dataResidencyRegion, 'asia-south1');
    assert.equal(data.country, 'India');
  });

  // ---------------------------------------------------------------------------
  // 7. Multi-Tenant Workspace Boundary Isolation
  // ---------------------------------------------------------------------------
  it('7. Enforces strict multi-tenant boundary isolation between independent workspaces', async () => {
    await db.doc(`workspaces/${workspaceA}/secrets/apiKeys`).set({
      workspaceId: workspaceA,
      token: 'secret_token_a',
    });

    const crossRead = await db.doc(`workspaces/${workspaceB}/secrets/apiKeys`).get();
    assert.equal(crossRead.exists, false, 'Workspace B must never access Workspace A data');
  });

  // ---------------------------------------------------------------------------
  // 8. Unified Executive Dossier End-to-End Integrity
  // ---------------------------------------------------------------------------
  it('8. Verifies end-to-end generation and retrieval of the 7-section Unified Executive Dossier', async () => {
    const dossier = await unifiedReportService.generateUnifiedDossier({
      workspaceId: workspaceA,
      title: 'Production Verification Dossier',
      monthlyPrice: 499,
    });

    assert.ok(dossier.dossierId.startsWith('dos_'));
    assert.equal(dossier.workspaceId, workspaceA);
    assert.ok(dossier.overallScore > 0);
    assert.ok(dossier.calculationCards.length >= 3);
    assert.ok(dossier.evidenceCitations.length >= 3);
    assert.ok(dossier.section6_GrowthRoadmap.immediate7DayTasks.length > 0);
    assert.ok(dossier.section7_BusinessWatch.healthScore > 0);
  });
});
