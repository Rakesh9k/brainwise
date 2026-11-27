/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { businessWatchService } from './services/businessWatchService';
import { goalRepository } from './repositories/goalRepository';
import { db } from './db/firestore';

describe('PHASE 8 — MASTER BUSINESS WATCH & CONTINUOUS MONITORING SUITE', () => {
  const workspaceA = `ws_watch_phase8_test_a_${Date.now()}`;
  const workspaceB = `ws_watch_phase8_test_b_${Date.now()}`;

  // ---------------------------------------------------------------------------
  // 1. Operational Surveillance Cycle Execution
  // ---------------------------------------------------------------------------
  it('1. Executes operational surveillance monitoring cycle across competitors, regulations, and goals', async () => {
    // Seed lagging goal to trigger execution velocity evaluator
    await goalRepository.createGoal({
      workspaceId: workspaceA,
      goalId: `goal_lag_${Date.now()}`,
      title: 'Q4 Paid Subscriber Acquisition',
      targetValue: 500,
      currentValue: 120, // 24% - below 35% trigger
      status: 'needs_attention',
    });

    const result = await businessWatchService.executeMonitoringCycle({
      workspaceId: workspaceA,
    });

    assert.ok(result.cycleId.startsWith('cyc_'));
    assert.equal(result.workspaceId, workspaceA);
    assert.ok(result.alertsGenerated.length >= 2, 'Must generate at least regulatory and goal lag alerts');
    assert.ok(result.surveillanceMetrics.goalsAudited >= 1);
    assert.ok(result.surveillanceMetrics.anomaliesDetected >= 2);
  });

  // ---------------------------------------------------------------------------
  // 2. Strict 6-Factor Actionable Alert Mandate
  // ---------------------------------------------------------------------------
  it('2. Enforces strict 6-factor actionable alert structure across all generated surveillance alerts', async () => {
    const alerts = await businessWatchService.getActiveAlerts(workspaceA);
    assert.ok(alerts.length >= 2);

    for (const alert of alerts) {
      assert.ok(alert.alertId.startsWith('bwa_'));
      assert.equal(alert.workspaceId, workspaceA);
      assert.ok(alert.status === 'ACTIVE' || alert.status === 'ACKNOWLEDGED');

      // 1. What Changed
      assert.ok(alert.whatChanged.length > 10, 'Factor 1: whatChanged must be descriptive');
      // 2. When Changed
      assert.ok(!isNaN(Date.parse(alert.whenChanged)), 'Factor 2: whenChanged must be valid ISO date');
      // 3. Evidence
      assert.ok(alert.evidence.sourceType, 'Factor 3: evidence sourceType required');
      assert.ok(alert.evidence.confidence >= 0.0 && alert.evidence.confidence <= 1.0);
      assert.ok(alert.evidence.verifiedAt, 'Factor 3: evidence verifiedAt required');
      // 4. Why It Matters
      assert.ok(alert.whyItMatters.length > 15, 'Factor 4: whyItMatters must explain significance');
      // 5. Potential Impact
      assert.ok(alert.potentialImpact.financialOrOperationalRisk.length > 10, 'Factor 5: impact required');
      // 6. Recommended Response
      assert.ok(alert.recommendedResponse.actionTitle.length > 5, 'Factor 6: actionTitle required');
      assert.ok(alert.recommendedResponse.suggestedTaskTitle.length > 15, 'Factor 6: suggested task required');
      assert.ok(alert.recommendedResponse.urgencyDays > 0, 'Factor 6: urgencyDays required');
    }
  });

  // ---------------------------------------------------------------------------
  // 3. Weekly Business Digest Synthesis & Health Scoring
  // ---------------------------------------------------------------------------
  it('3. Synthesizes executive Weekly Business Digest with dynamic health scoring and action items', async () => {
    const digest = await businessWatchService.generateWeeklyDigest(workspaceA);

    assert.ok(digest.digestId.startsWith('wbd_'));
    assert.equal(digest.workspaceId, workspaceA);
    assert.ok(digest.healthScore >= 20 && digest.healthScore <= 100);
    assert.ok(digest.summary.includes('Weekly Intelligence Brief'));
    assert.ok(digest.competitorSurveillanceSummary.competitorsMonitoredCount >= 0);
    assert.ok(digest.marketAndRegulatorySummary.newTrendsIdentified.length > 0);
    assert.equal(digest.marketAndRegulatorySummary.complianceStatus, 'COMPLIANT');
    assert.ok(digest.topActionItems.length > 0);
  });

  // ---------------------------------------------------------------------------
  // 4. Alert Acknowledgment & Resolution Lifecycle
  // ---------------------------------------------------------------------------
  it('4. Acknowledges and resolves active alerts with resolution notes', async () => {
    const alerts = await businessWatchService.getActiveAlerts(workspaceA);
    const targetAlert = alerts[0]!;

    const acknowledged = await businessWatchService.acknowledgeAlert({
      workspaceId: workspaceA,
      alertId: targetAlert.alertId,
      status: 'RESOLVED',
      resolutionNotes: 'Audited asia-south1 Mumbai region and verified DPDPA consent ledger active.',
    });

    assert.equal(acknowledged.status, 'RESOLVED');
    assert.equal(acknowledged.resolutionNotes, 'Audited asia-south1 Mumbai region and verified DPDPA consent ledger active.');
    assert.ok(acknowledged.acknowledgedAt);

    // Verify resolved alert no longer appears in default active list
    const remainingActive = await businessWatchService.getActiveAlerts(workspaceA);
    assert.ok(!remainingActive.some((a) => a.alertId === targetAlert.alertId));
  });

  // ---------------------------------------------------------------------------
  // 5. Strict Video Exclusion Certification
  // ---------------------------------------------------------------------------
  it('5. Certifies Strict Video Exclusion across all surveillance alerts and recommended actions', async () => {
    const alerts = await businessWatchService.getActiveAlerts(workspaceA);
    for (const alert of alerts) {
      const fullText = JSON.stringify(alert).toLowerCase();
      assert.ok(!fullText.includes('remotion'));
      assert.ok(!fullText.includes('ffmpeg'));
      assert.ok(!fullText.includes('video generation'));
      assert.ok(!fullText.includes('reel'));
    }

    const digest = await businessWatchService.generateWeeklyDigest(workspaceA);
    const digestText = JSON.stringify(digest).toLowerCase();
    assert.ok(!digestText.includes('video generation'));
    assert.ok(!digestText.includes('remotion'));
  });

  // ---------------------------------------------------------------------------
  // 6. Multi-Tenant Workspace Boundary Isolation
  // ---------------------------------------------------------------------------
  it('6. Enforces strict multi-tenant boundary isolation on surveillance alerts and digests', async () => {
    await businessWatchService.executeMonitoringCycle({ workspaceId: workspaceB });

    const alertsA = await businessWatchService.getActiveAlerts(workspaceA);
    const alertsB = await businessWatchService.getActiveAlerts(workspaceB);

    assert.ok(alertsA.length >= 1);
    assert.ok(alertsB.length >= 1);

    for (const aA of alertsA) {
      assert.equal(aA.workspaceId, workspaceA);
    }
    for (const aB of alertsB) {
      assert.equal(aB.workspaceId, workspaceB);
    }

    // Cross-tenant acknowledgment attempt must fail
    await assert.rejects(
      async () => {
        await businessWatchService.acknowledgeAlert({
          workspaceId: workspaceB,
          alertId: alertsA[0]!.alertId, // Malicious cross-tenant attempt
          status: 'RESOLVED',
        });
      },
      /not found/i
    );
  });
});
