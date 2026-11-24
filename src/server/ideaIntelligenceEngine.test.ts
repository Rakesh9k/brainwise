/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { ideaIntelligenceService } from './services/ideaIntelligenceService';
import { creditService } from './services/creditService';
import { creditWalletRepository } from './repositories/creditWalletRepository';
import { researchRepository } from './repositories/researchRepository';
import { executeTruthCheck } from '../utils/truthCheck';
import type { BusinessBrainData } from '../types/brainwise';

describe('IDEA INTELLIGENCE — MASTER COMPREHENSIVE VERIFICATION SUITE', () => {
  const workspaceId = `ws_idea_intel_master_${Date.now()}`;
  const userId = `usr_test_founder_${Date.now()}`;

  before(async () => {
    await creditWalletRepository.initializeWallet(workspaceId, 800);
  });

  // ===========================================================================
  // TEST 1: Simple Business Idea ("I want to start a chocolate business in India.")
  // ===========================================================================
  it('Test 1: Simple Idea Input — Automatically extracts dimensions and produces complete 15-section report', async () => {
    // 1. Idea Understanding Engine
    const understanding = await ideaIntelligenceService.understandIdea('I want to start a chocolate business in India.');
    
    assert.equal(understanding.industry, 'Specialty Food & Confectionery');
    assert.equal(understanding.subIndustry, 'Artisan & Premium Chocolate');
    assert.equal(understanding.geographicContext.isUserSpecified, true);
    assert.ok(understanding.geographicContext.assumedLocation.includes('India'));
    assert.ok(understanding.potentialCustomerGroups.length >= 2);
    assert.ok(understanding.possibleBusinessModels.some((m) => m.includes('D2C')));
    assert.ok(understanding.relevantCompetitors.some((c) => c.includes('Paul And Mike') || c.includes('Amul') || c.includes('Cadbury')));
    assert.ok(understanding.importantResearchQuestions.length >= 2);

    // 2. Full Research Orchestration (8 Logical Capabilities)
    const result = await ideaIntelligenceService.orchestrateResearch({
      workspaceId,
      userId,
      ideaSummary: 'I want to start a chocolate business in India.',
      depth: 'Deep Market Dossier',
    });

    const report = result.report;
    assert.ok(report.id.startsWith('rep_'));
    assert.equal(report.industry, 'Specialty Food & Confectionery');
    assert.ok(report.executiveSummary.includes('chocolate'));
    
    // Verify 15 Core Sections
    assert.ok(report.executiveSummary.length > 50, 'Section 01: Executive Summary');
    assert.ok(report.marketOverview.text.length > 50, 'Section 02: Market Overview');
    assert.ok(report.tamSamSom.tamLabel.length > 0, 'Section 03: TAM / SAM / SOM');
    assert.ok(report.marketDemand.signals.length >= 2, 'Section 04: Market Demand');
    assert.ok(report.customerSegments.length >= 3, 'Section 05: Customer Segments');
    assert.ok(report.customerPainPoints.length >= 2, 'Section 06: Customer Pain Points');
    assert.ok(report.competitorLandscapeSummary.length > 50, 'Section 07: Competitor Landscape');
    assert.ok(report.pricingAnalysis.tiers.length >= 3, 'Section 08: Pricing Analysis');
    assert.ok(report.marketOpportunities.length >= 3, 'Section 09: Market Opportunities');
    assert.ok(report.businessModelOptions.length >= 2, 'Section 10: Business Model Options');
    assert.ok(report.revenuePotential.year1Conservative.length > 0, 'Section 11: Revenue Potential');
    assert.ok(report.startupCostEstimates.length >= 4, 'Section 12: Startup Costs');
    assert.ok(report.risksAndChallenges.length >= 2, 'Section 13: Risks & Challenges');
    assert.ok(report.validationExperiments.length >= 2, 'Section 14: Validation Experiments');
    assert.ok(report.finalRecommendation.verdict.includes('GO'), 'Section 15: Strategic Verdict');

    // Verify Structured Opportunities & Emerging Players
    assert.ok(report.structuredOpportunities && report.structuredOpportunities.length >= 2);
    assert.ok(report.structuredOpportunities[0].scores.compositeAttractiveness >= 75);
    assert.ok(report.emergingPlayers && report.emergingPlayers.length >= 2);
    assert.ok(report.emergingPlayers.some((p) => p.name === 'Paul And Mike' || p.name === 'Manam Chocolate'));
  });

  // ===========================================================================
  // TEST 2: Technology Startup ("I want to build an AI accounting software for small businesses.")
  // ===========================================================================
  it('Test 2: Technology Startup — Identifies software domain, SaaS economics, and competitors', async () => {
    const understanding = await ideaIntelligenceService.understandIdea('I want to build an AI accounting software for small businesses.');
    
    assert.equal(understanding.industry, 'B2B Software & Commercial Technology');
    assert.equal(understanding.productServiceCategory, 'Cloud Application Software');
    assert.ok(understanding.relevantCompetitors.some((c) => c.includes('Zoho') || c.includes('Tally')));
    assert.ok(understanding.possibleBusinessModels.some((m) => m.includes('SaaS Subscription')));
    assert.ok(understanding.potentialCustomerGroups.some((g) => g.includes('MSME Business Owners')));
  });

  // ===========================================================================
  // TEST 3: Local Business ("I want to open a premium salon in Hyderabad.")
  // ===========================================================================
  it('Test 3: Local Business — Accurately sets Hyderabad as geography and assesses salon economics', async () => {
    const understanding = await ideaIntelligenceService.understandIdea('I want to open a premium salon in Hyderabad.');
    
    assert.equal(understanding.industry, 'Personal Care & Wellness Services');
    assert.equal(understanding.geographicContext.isUserSpecified, true);
    assert.ok(understanding.geographicContext.assumedLocation.includes('Hyderabad'));
    assert.ok(understanding.relevantCompetitors.some((c) => c.includes('Bounce') || c.includes('Toni & Guy')));
    assert.ok(understanding.importantResearchQuestions.some((q) => q.includes('rent') || q.includes('ticket size')));
  });

  // ===========================================================================
  // TEST 4: Unclear Idea ("I want to start something in food.")
  // ===========================================================================
  it('Test 4: Unclear / Category Discovery Idea — Begins useful category discovery without blocking user', async () => {
    const understanding = await ideaIntelligenceService.understandIdea('I want to start something in food.');
    
    assert.equal(understanding.industry, 'Food & Beverage Services');
    assert.ok(understanding.possibleBusinessModels.length >= 2);
    assert.ok(understanding.missingInformation.length >= 1);
    assert.ok(understanding.importantResearchQuestions.length >= 1);
  });

  // ===========================================================================
  // TEST 5: Deep Research Follow-up ("Explore the corporate gifting opportunity in more detail")
  // ===========================================================================
  it('Test 5: Conversational Deep Research — Retains report session context and provides targeted deep dive', async () => {
    // Generate initial report
    const { report } = await ideaIntelligenceService.orchestrateResearch({
      workspaceId,
      userId,
      ideaSummary: 'Premium artisan chocolate brand in India',
    });

    // Send conversational follow-up
    const conversation = await ideaIntelligenceService.conductConversationalResearch({
      workspaceId,
      reportId: report.id,
      query: 'Explore corporate gifting in more detail',
    });

    assert.ok(conversation.reply.includes('Corporate') || conversation.reply.includes('gifting'));
    assert.ok(conversation.reply.includes('Average Order Value') || conversation.reply.includes('AOV'));
    assert.ok(conversation.suggestedActions.length >= 2);
    assert.ok(conversation.citedSources.length >= 1);
  });

  // ===========================================================================
  // TEST 6: Financial Feasibility ("Can I start this business with ₹5 lakh?")
  // ===========================================================================
  it('Test 6: Budget Feasibility — Accurately computes ₹5 Lakh lean launch CapEx/OpEx and break-even units', async () => {
    const { report } = await ideaIntelligenceService.orchestrateResearch({
      workspaceId,
      userId,
      ideaSummary: 'Artisan craft chocolate in India',
    });

    const conversation = await ideaIntelligenceService.conductConversationalResearch({
      workspaceId,
      reportId: report.id,
      query: 'Can I start this business with ₹5 lakh?',
    });

    assert.ok(conversation.financialRecalculation !== undefined);
    assert.equal(conversation.financialRecalculation.feasibilityVerdict, 'VIABLE');
    assert.equal(conversation.financialRecalculation.startupBudget, '₹5,00,000');
    assert.ok(conversation.financialRecalculation.breakEvenUnits > 0);
    assert.ok(conversation.reply.includes('FSSAI'));
    assert.ok(conversation.reply.includes('Batch Production Deposit'));
  });

  // ===========================================================================
  // TEST 7: Idea Finalization & Blueprint Approval
  // ===========================================================================
  it('Test 7: Idea Finalization — Produces 90-day roadmap and gates Business Brain graduation with user approval', async () => {
    const { report } = await ideaIntelligenceService.orchestrateResearch({
      workspaceId,
      userId,
      ideaSummary: 'Artisan chocolate business in India',
    });

    const blueprint = await ideaIntelligenceService.finalizeIdea({
      workspaceId,
      reportId: report.id,
      approvedBy: userId,
    });

    assert.ok(blueprint.finalConcept.length > 0);
    assert.ok(blueprint.uniqueValueProposition.length > 0);
    assert.equal(blueprint.approvedBy, userId);
    assert.ok(blueprint.approvedAt !== undefined);
    assert.ok(blueprint.executionRoadmap90Day.day30.length >= 2);
    assert.ok(blueprint.executionRoadmap90Day.day60.length >= 2);
    assert.ok(blueprint.executionRoadmap90Day.day90.length >= 2);

    // Verify report marked as saved to brain in database
    const saved = await researchRepository.findById(workspaceId, report.id);
    assert.equal(saved?.isSavedToBrain, true);
  });

  // ===========================================================================
  // TEST 8: Two-Phase Credit Protocol & Failure Recovery
  // ===========================================================================
  it('Test 8: Financial Integrity — Reserves 8 credits and verifies rollback handling', async () => {
    // 1. Verify credit reservation
    const reservation = await creditService.reserveCredits({
      workspaceId,
      userId,
      featureId: 'FEAT-RES-001',
    });

    assert.equal(reservation.featureId, 'FEAT-RES-001');
    assert.equal(reservation.status, 'HOLD');
    assert.equal(reservation.amount, 8);

    // 2. Rollback / auto-refund simulation
    const refund = await creditService.refundCredits({
      workspaceId,
      reservation,
      reason: 'Simulation Test: Failure Rollback',
    });

    assert.ok(refund.availableBalance > 0);
    assert.equal(typeof refund.availableBalance, 'number');
  });

  // ===========================================================================
  // TEST 9: Evidence Integrity & Truth Engine Enforcement
  // ===========================================================================
  it('Test 9: Evidence Integrity — Truth check blocks prohibited guarantees and enforces factual grounding', () => {
    const mockBrain: BusinessBrainData = {
      businessName: 'Solstice Craft Cacao',
      industry: 'Specialty Confectionery',
      stage: 'Idea Stage',
      location: 'India',
      targetAudience: 'Urban Gifting Clients',
      brandPositioning: 'Pure single origin bean to bar',
      valueProposition: 'Authentic Indian craft chocolate',
      tagline: '',
      overviewSummary: 'Artisan chocolate business in India',
      products: [],
      personas: [],
      activationState: 'DORMANT_SANDBOX',
      history: [],
      lastUpdated: new Date().toISOString(),
      strategicMemory: {
        usedAngles: [],
        fatiguedThemes: [],
        explicitExclusions: ['guaranteed revenue', '100% risk free', 'overnight scale'],
        lastUpdated: new Date().toISOString(),
      },
    };

    // 1. Text with prohibited claims
    const badContent = 'This business offers guaranteed revenue and 100% risk free profits with overnight scale.';
    const truthResult = executeTruthCheck(badContent, mockBrain);

    assert.equal(truthResult.isValid, false);
    assert.ok(truthResult.violations.length >= 1);
    assert.ok(truthResult.truthScore < 100);

    // 2. Grounded honest range content
    const goodContent = 'Specialty chocolate confectionery in Tier 1 Indian metros targeting 68% gross margin through corporate festive gifting.';
    const goodTruth = executeTruthCheck(goodContent, mockBrain);

    assert.equal(goodTruth.isValid, true);
    assert.equal(goodTruth.violations.length, 0);
    assert.equal(goodTruth.truthScore, 100);
  });
});
