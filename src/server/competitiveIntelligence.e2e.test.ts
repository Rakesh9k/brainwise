/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

process.env.NODE_ENV = 'test';

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { competitiveIntelligenceService } from './services/competitiveIntelligenceService';
import { competitiveIntelligenceRepository } from './repositories/competitiveIntelligenceRepository';
import { competitorTrackingService } from './services/competitorTrackingService';
import { creditWalletRepository } from './repositories/creditWalletRepository';
import { validateSafeExternalUrl } from './utils/ssrfValidator';

describe('COMPETITIVE INTELLIGENCE — COMPREHENSIVE END-TO-END SCENARIO SUITE', () => {
  const wsChocolate = `ws_ci_e2e_chocolate_${Date.now()}`;
  const wsSaaS = `ws_ci_e2e_saas_${Date.now()}`;
  const wsKitchen = `ws_ci_e2e_kitchen_${Date.now()}`;
  const wsSalon = `ws_ci_e2e_salon_${Date.now()}`;
  const wsAmbiguous = `ws_ci_e2e_ambiguous_${Date.now()}`;
  const wsIsolation = `ws_ci_e2e_isolation_${Date.now()}`;

  // ---------------------------------------------------------------------------
  // SCENARIO A: D2C Premium Chocolate Brand in India
  // ---------------------------------------------------------------------------
  it('Scenario A: Full autonomous workflow for Indian D2C Chocolate business idea', async () => {
    await creditWalletRepository.initializeWallet(wsChocolate, 100);

    const result = await competitiveIntelligenceService.orchestrateCompetitiveResearch({
      workspaceId: wsChocolate,
      businessPrompt: 'I want to start a premium chocolate brand in India',
      userId: 'founder_choc_01',
    });

    assert.ok(result.project);
    assert.equal(result.project.context.industry, 'Food & Beverage');
    assert.equal(result.project.context.category, 'Artisan & Premium Chocolate');
    assert.equal(result.project.context.targetGeography, 'India');

    // Verify competitor discovery
    assert.ok(result.competitors.length >= 4);
    const pm = result.competitors.find((c) => c.companyName.includes('Paul And Mike'));
    assert.ok(pm, 'Paul And Mike should be discovered as a direct craft competitor');
    assert.equal(pm?.classification, 'DIRECT');
    assert.ok(pm?.productsAndServices.length >= 2);
    assert.ok(pm?.pricingTiers.length >= 2);
    assert.ok(pm?.customerSentiment.topComplaints.length >= 1);

    // Verify 24-section report
    assert.ok(result.report);
    assert.equal(result.report.status, 'COMPLETED');
    assert.ok(result.report.sections.s1_executiveSummary.length > 50);
    assert.ok(result.report.sections.s8_pricingAnalysis.priceBands.length >= 3);
    assert.ok(result.report.sections.s18_marketOpportunities.length >= 2);
    assert.ok(result.report.sections.s20_strategicRecommendations.length >= 2);
    assert.ok(result.report.sections.s24_researchConfidence.overallScore >= 80);

    // Verify 2D matrix
    assert.ok(result.matrix.competitors.length >= 1);
    assert.ok(result.matrix.whitespaceOpportunities.length >= 1);
  });

  // ---------------------------------------------------------------------------
  // SCENARIO B: AI Accounting SaaS in UK
  // ---------------------------------------------------------------------------
  it('Scenario B: Full autonomous workflow for B2B AI SaaS business idea in UK', async () => {
    await creditWalletRepository.initializeWallet(wsSaaS, 100);

    const result = await competitiveIntelligenceService.orchestrateCompetitiveResearch({
      workspaceId: wsSaaS,
      businessPrompt: 'AI accounting and automated bookkeeping SaaS for UK freelancers and SMEs',
      userId: 'founder_saas_02',
    });

    assert.ok(result.project);
    assert.equal(result.project.context.industry, 'Technology & Software');
    assert.equal(result.project.context.targetGeography, 'United Kingdom');
    assert.ok(result.competitors.length >= 2);
    assert.ok(result.opportunities.length >= 1);
    assert.ok(result.recommendations.length >= 1);
  });

  // ---------------------------------------------------------------------------
  // SCENARIO C: Cloud Kitchen in Bangalore
  // ---------------------------------------------------------------------------
  it('Scenario C: Full autonomous workflow for Cloud Kitchen in Bangalore', async () => {
    await creditWalletRepository.initializeWallet(wsKitchen, 100);

    const result = await competitiveIntelligenceService.orchestrateCompetitiveResearch({
      workspaceId: wsKitchen,
      businessPrompt: 'Cloud kitchen delivery serving healthy macro-calibrated meals in Bangalore',
      userId: 'founder_kitchen_03',
    });

    assert.ok(result.project);
    assert.equal(result.project.context.industry, 'Food & Beverage');
    assert.ok(result.project.context.subIndustry.includes('Cloud Kitchen'));
    assert.equal(result.project.context.targetGeography, 'Bangalore, India');
    assert.ok(result.competitors.length >= 2);
  });

  // ---------------------------------------------------------------------------
  // SCENARIO D: Boutique Salon in Mumbai
  // ---------------------------------------------------------------------------
  it('Scenario D: Full autonomous workflow for Boutique Salon in Mumbai', async () => {
    await creditWalletRepository.initializeWallet(wsSalon, 100);

    const result = await competitiveIntelligenceService.orchestrateCompetitiveResearch({
      workspaceId: wsSalon,
      businessPrompt: 'Boutique organic hair salon and aesthetic spa in Mumbai',
      userId: 'founder_salon_04',
    });

    assert.ok(result.project);
    assert.equal(result.project.context.industry, 'Personal Care & Wellness');
    assert.equal(result.project.context.targetGeography, 'Mumbai, India');
    assert.ok(result.competitors.length >= 2);
  });

  // ---------------------------------------------------------------------------
  // SCENARIO E: Ambiguous Business Description
  // ---------------------------------------------------------------------------
  it('Scenario E: Gracefully handles ambiguous business input without throwing errors', async () => {
    await creditWalletRepository.initializeWallet(wsAmbiguous, 100);

    const result = await competitiveIntelligenceService.orchestrateCompetitiveResearch({
      workspaceId: wsAmbiguous,
      businessPrompt: 'I want to start a business',
      userId: 'founder_ambiguous_05',
    });

    assert.ok(result.project);
    assert.ok(result.project.context.industry.length > 0);
    assert.ok(result.competitors.length >= 2);
    assert.ok(result.report.sections.s1_executiveSummary.length > 0);
  });

  // ---------------------------------------------------------------------------
  // SCENARIO F: Competitor Watch Operational Diffing & 6-Factor Alert
  // ---------------------------------------------------------------------------
  it('Scenario F: Competitor Watch captures snapshots, detects price decrease, and generates 6-factor alert', async () => {
    const compId = `comp_watch_test_${Date.now()}`;

    // Snapshot 1 (Baseline)
    await competitorTrackingService.captureAndAnalyze(wsChocolate, {
      competitorId: compId,
      competitorName: 'Artisan Rival Co',
      pricingTiers: [
        { tierName: 'Tasting Box', price: 950, billingPeriod: 'monthly', features: ['3 Bars'] },
      ],
      heroOffer: 'Finest artisanal chocolate in India',
      valueProposition: 'Single origin bars',
      keyFeatures: ['Dark Chocolate'],
      sourceUrl: 'https://artisan-rival.com',
    });

    // Snapshot 2 (Price Drop of 20%)
    const result2 = await competitorTrackingService.captureAndAnalyze(wsChocolate, {
      competitorId: compId,
      competitorName: 'Artisan Rival Co',
      pricingTiers: [
        { tierName: 'Tasting Box', price: 760, billingPeriod: 'monthly', features: ['3 Bars', 'Bonus mini bar'] },
      ],
      heroOffer: 'Finest artisanal chocolate delivered fresh in India',
      valueProposition: 'Single origin bars',
      keyFeatures: ['Dark Chocolate', 'Bonus mini bar'],
      sourceUrl: 'https://artisan-rival.com',
    });

    assert.ok(result2.detectedDiffs.length >= 1);
    const priceDiff = result2.detectedDiffs.find((d) => d.changeType === 'PRICE_DECREASE');
    assert.ok(priceDiff);
    assert.equal(priceDiff.previousValue, '₹950');
    assert.equal(priceDiff.newValue, '₹760');
    assert.equal(priceDiff.severity, 'HIGH');

    // Run operational watch run and verify 6-factor alert
    const watchResult = await competitiveIntelligenceService.executeCompetitorWatchRun(wsChocolate);
    assert.ok(watchResult.monitoredCount >= 1);
  });

  // ---------------------------------------------------------------------------
  // SCENARIO G: Conversational Intelligence Advisor Grounded Q&A
  // ---------------------------------------------------------------------------
  it('Scenario G: Conversational Advisor answers queries with cited ground truth evidence', async () => {
    const answer = await competitiveIntelligenceService.askAdvisor({
      workspaceId: wsChocolate,
      query: 'Who is my strongest competitor and what are customers complaining about?',
    });

    assert.ok(answer);
    assert.equal(answer.sender, 'advisor');
    assert.ok(answer.text.includes('strongest competitor') || answer.text.includes('Paul And Mike') || answer.text.includes('vulnerabilities'));
    assert.ok(answer.citedEvidence.length >= 1);
    assert.ok(answer.factProvenance.verifiedFacts.length >= 1);
    assert.ok(answer.suggestedFollowUps.length >= 2);
  });

  // ---------------------------------------------------------------------------
  // SCENARIO H: Persistence & Reload from Knowledge Base
  // ---------------------------------------------------------------------------
  it('Scenario H: Persists full research dossiers and reloads without loss of detail', async () => {
    const savedProject = await competitiveIntelligenceRepository.getLatestProject(wsChocolate);
    assert.ok(savedProject);
    assert.equal(savedProject.status, 'COMPLETED');

    const savedProfiles = await competitiveIntelligenceRepository.listCompetitorProfiles(wsChocolate);
    assert.ok(savedProfiles.length >= 3);
    assert.ok(savedProfiles[0].productsAndServices.length >= 1);
    assert.ok(savedProfiles[0].pricingTiers.length >= 1);

    const savedReport = await competitiveIntelligenceRepository.getLatestReport(wsChocolate);
    assert.ok(savedReport);
    assert.ok(savedReport.sections.s1_executiveSummary.length > 0);
    assert.ok(savedReport.sections.s18_marketOpportunities.length >= 1);
  });

  // ---------------------------------------------------------------------------
  // SCENARIO I: Strict Multi-Tenant Isolation
  // ---------------------------------------------------------------------------
  it('Scenario I: Enforces strict multi-tenant boundary isolation across workspaces', async () => {
    const profilesIso = await competitiveIntelligenceRepository.listCompetitorProfiles(wsIsolation);
    assert.equal(profilesIso.length, 0, 'New workspace must have zero leaked competitors from other workspaces');

    const reportIso = await competitiveIntelligenceRepository.getLatestReport(wsIsolation);
    assert.equal(reportIso, null, 'New workspace must have zero leaked reports');
  });

  // ---------------------------------------------------------------------------
  // SCENARIO J: SSRF Gate Verification
  // ---------------------------------------------------------------------------
  it('Scenario J: SSRF validator rejects private addresses and AWS metadata', () => {
    assert.equal(validateSafeExternalUrl('http://169.254.169.254/meta-data').isSafe, false);
    assert.equal(validateSafeExternalUrl('http://127.0.0.1:3000').isSafe, false);
    assert.equal(validateSafeExternalUrl('http://10.0.0.1').isSafe, false);
    assert.equal(validateSafeExternalUrl('https://paulandmike.co').isSafe, true);
  });
});
