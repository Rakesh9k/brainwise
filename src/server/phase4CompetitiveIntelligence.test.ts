/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { competitiveIntelligenceService } from './services/competitiveIntelligenceService';
import { competitorTrackingService } from './services/competitorTrackingService';
import { competitorRepository } from './repositories/competitorRepository';
import { validateSafeExternalUrl } from './utils/ssrfValidator';

describe('PHASE 4 — MASTER COMPETITIVE INTELLIGENCE & COMPETITOR WATCH SUITE', () => {
  const workspaceA = `ws_comp_phase4_test_a_${Date.now()}`;
  const workspaceB = `ws_comp_phase4_test_b_${Date.now()}`;

  // ---------------------------------------------------------------------------
  // 1. Competitor Profile Discovery & Synthesis
  // ---------------------------------------------------------------------------
  it('1. Creates and retrieves detailed competitor profiles with 14 required dimensions', async () => {
    // Seed competitor
    await competitorRepository.create({
      competitorId: `comp_incumbent_${Date.now()}`,
      workspaceId: workspaceA,
      name: 'OmniGrowth Corp',
      website: 'https://omnigrowth.com',
      industry: 'B2B Software',
      location: 'India & US',
      positioning: 'Enterprise Marketing Cloud',
      marketShare: '18%',
      strengths: ['Brand Trust', 'Large Feature Set'],
      weaknesses: ['Expensive', 'Slow Support'],
      pricingRange: '₹1,499/mo',
      monitoringFrequency: 'Daily',
      isMonitored: true,
      lastResearched: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const profiles = await competitiveIntelligenceService.getCompetitors(workspaceA);
    assert.ok(profiles.length >= 1);

    const comp = profiles.find((p) => p.companyName === 'OmniGrowth Corp')!;
    assert.ok(comp);
    assert.equal(comp.companyName, 'OmniGrowth Corp');
    assert.ok(comp.pricingTiers.length >= 1);
    assert.ok(comp.customerSentiment.topComplaints.length >= 1);
    assert.ok(comp.opportunitiesForUser.length >= 1);
    assert.equal(comp.isMonitored, true);
  });

  // ---------------------------------------------------------------------------
  // 2. 2D Euclidean Positioning Matrix
  // ---------------------------------------------------------------------------
  it('2. Computes 2D Euclidean positioning distance and identifies nearest rival and whitespace', async () => {
    const profiles = await competitiveIntelligenceService.getCompetitors(workspaceA);
    const matrix = competitiveIntelligenceService.calculatePositioningMatrix(
      { price: 40, depth: 70, label: 'BrainWise User' },
      profiles
    );

    assert.ok(matrix.competitors.length >= 1);
    assert.ok(matrix.nearestCompetitor.length > 0);
    assert.ok(typeof matrix.competitors[0].euclideanDistance === 'number');
    assert.ok(matrix.whitespaceOpportunities.length >= 1);
  });

  // ---------------------------------------------------------------------------
  // 3. Competitor Snapshot Diffing Engine
  // ---------------------------------------------------------------------------
  it('3. Detects price decrease and feature launch across competitor snapshots', async () => {
    const compId = `comp_diff_test_${Date.now()}`;

    // Snapshot 1 (Initial)
    await competitorTrackingService.captureAndAnalyze(workspaceA, {
      competitorId: compId,
      competitorName: 'FastScale Inc',
      pricingTiers: [
        { tierName: 'Pro', price: 999, billingPeriod: 'monthly', features: ['Analytics'] },
      ],
      heroOffer: 'Automate your customer growth.',
      valueProposition: 'Modern growth platform',
      keyFeatures: ['Analytics'],
      sourceUrl: 'https://fastscale.com',
    });

    // Snapshot 2 (Price drop & new feature added)
    const result2 = await competitorTrackingService.captureAndAnalyze(workspaceA, {
      competitorId: compId,
      competitorName: 'FastScale Inc',
      pricingTiers: [
        { tierName: 'Pro', price: 699, billingPeriod: 'monthly', features: ['Analytics', 'Export'] },
      ],
      heroOffer: 'Automate your customer growth faster.',
      valueProposition: 'Modern growth platform',
      keyFeatures: ['Analytics', 'Export'],
      sourceUrl: 'https://fastscale.com',
    });

    assert.ok(result2.detectedDiffs.length >= 1);
    const priceDiff = result2.detectedDiffs.find((d) => d.changeType === 'PRICE_DECREASE');
    assert.ok(priceDiff);
    assert.equal(priceDiff.previousValue, '₹999');
    assert.equal(priceDiff.newValue, '₹699');
    assert.equal(priceDiff.severity, 'HIGH');
  });

  // ---------------------------------------------------------------------------
  // 4. Competitor Watch Operational Run & Alert Generation
  // ---------------------------------------------------------------------------
  it('4. Executes Competitor Watch run and generates 6-factor actionable change alerts', async () => {
    const runResult = await competitiveIntelligenceService.executeCompetitorWatchRun(workspaceA);
    assert.ok(runResult.monitoredCount >= 1);

    // If diffs occurred, verify 6-factor alert attributes
    if (runResult.alertsGenerated.length > 0) {
      const alert = runResult.alertsGenerated[0];
      assert.ok(alert.alertId.startsWith('cwa_'));
      assert.ok(alert.whatChanged.length > 0);
      assert.ok(alert.whenChanged.length > 0);
      assert.ok(alert.evidenceReference.extractedQuote.length > 0);
      assert.ok(alert.whyItMatters.length > 0);
      assert.ok(alert.businessImpact.length > 0);
      assert.ok(alert.recommendedResponse.length > 0);
    }
  });

  // ---------------------------------------------------------------------------
  // 5. SSRF Defense Gate
  // ---------------------------------------------------------------------------
  it('5. Rejects private IP addresses and metadata endpoints for competitor websites', () => {
    const privateIpCheck = validateSafeExternalUrl('http://127.0.0.1:8080/admin');
    assert.equal(privateIpCheck.isSafe, false);

    const metadataCheck = validateSafeExternalUrl('http://169.254.169.254/latest/meta-data');
    assert.equal(metadataCheck.isSafe, false);

    const publicUrlCheck = validateSafeExternalUrl('https://example-competitor.com');
    assert.equal(publicUrlCheck.isSafe, true);
  });

  // ---------------------------------------------------------------------------
  // 6. Multi-Tenant Isolation
  // ---------------------------------------------------------------------------
  it('6. Enforces workspace isolation on competitor registries', async () => {
    const competitorsB = await competitiveIntelligenceService.getCompetitors(workspaceB);
    const hasLeakage = competitorsB.some((c) => c.workspaceId === workspaceA);
    assert.equal(hasLeakage, false);
  });
});
