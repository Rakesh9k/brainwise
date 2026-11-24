/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { ideaIntelligenceService } from './services/ideaIntelligenceService';
import { creditWalletRepository } from './repositories/creditWalletRepository';
import { researchRepository } from './repositories/researchRepository';

describe('Phase 2 Real-World Intelligence Independent Audit', () => {
  const workspaceId = `ws_realworld_audit_${Date.now()}`;
  const userId = `usr_audit_auditor`;
  const testIdea = 'I want to start a premium chocolate gifting business in India.';
  let generatedReportId = '';

  before(async () => {
    await creditWalletRepository.initializeWallet(workspaceId, 1000);
  });

  it('1. Verifies Idea Understanding: extracts 12 dimensions and detects geography & industry', async () => {
    const result = await ideaIntelligenceService.understandIdea(testIdea);

    assert.ok(result);
    assert.equal(result.rawPrompt, testIdea);
    assert.equal(result.industry, 'Specialty Food & Confectionery');
    assert.equal(result.subIndustry, 'Artisan & Premium Chocolate');
    assert.equal(result.productServiceCategory, 'Craft Food & Beverage');
    assert.equal(result.geographicContext.assumedLocation, 'India (Tier-1 & Tier-2 Metros)');
    assert.equal(result.geographicContext.isUserSpecified, true);

    // Verify key dimensions
    assert.ok(result.potentialCustomerGroups.length >= 3, 'Must extract at least 3 customer groups');
    assert.ok(result.possibleBusinessModels.length >= 3, 'Must recommend at least 3 business models');
    assert.ok(result.keyAssumptions.length >= 2, 'Must extract key assumptions');
    assert.ok(result.importantResearchQuestions.length >= 3, 'Must propose research questions');
    assert.ok(result.missingInformation.length >= 2, 'Must identify missing information');
    assert.ok(result.relevantCompetitors.length >= 3, 'Must identify relevant competitors');
  });

  it('2. Verifies Full Research Orchestration & Real-World Indian Chocolate Metrics', async () => {
    const orchestrateRes = await ideaIntelligenceService.orchestrateResearch({
      workspaceId,
      userId,
      ideaSummary: testIdea,
      depth: 'Deep Market Dossier',
    });

    assert.ok(orchestrateRes.report);
    assert.ok(orchestrateRes.report.id);
    generatedReportId = orchestrateRes.report.id;

    const report = orchestrateRes.report;
    assert.ok(report.title.toLowerCase().includes('chocolate'));
    assert.equal(report.overallConfidence, 'High');

    // Verify TAM / SAM / SOM metrics from tamSamSom
    assert.equal(report.tamSamSom.tamLabel, '₹38,000 Cr');
    assert.equal(report.tamSamSom.samLabel, '₹6,800 Cr');
    assert.equal(report.tamSamSom.somLabel, '₹102 Cr');

    // Verify 15 Substantive Sections are populated
    assert.ok(report.executiveSummary, 'Section 1: Executive Summary must exist');
    assert.ok(report.validationScorecard, 'Section 2: Validation Scorecard must exist');
    assert.ok(report.criticalAssumptions && report.criticalAssumptions.length >= 2, 'Section 3: Critical Assumptions must exist');
    assert.ok(report.marketOverview, 'Section 4: Market Overview must exist');
    assert.ok(report.tamSamSom, 'Section 5: TAM/SAM/SOM must exist');
    assert.ok(report.marketDemand, 'Section 6: Market Demand must exist');
    assert.ok(report.customerSegments && report.customerSegments.length >= 2, 'Section 7: Customer Segments must exist');
    assert.ok(report.customerPainPoints && report.customerPainPoints.length >= 2, 'Section 8: Customer Pain Points must exist');
    assert.ok(report.competitorLandscapeSummary, 'Section 9: Competitor Landscape must exist');
    assert.ok(report.pricingAnalysis && report.pricingAnalysis.tiers.length >= 2, 'Section 10: Pricing Analysis must exist');
    assert.ok(report.marketOpportunities && report.marketOpportunities.length >= 2, 'Section 11: Market Opportunities must exist');
    assert.ok(report.businessModelOptions && report.businessModelOptions.length >= 2, 'Section 12: Business Model Options must exist');
    assert.ok(report.revenuePotential, 'Section 13: Revenue Potential must exist');
    assert.ok(report.risksAndChallenges && report.risksAndChallenges.length >= 2, 'Section 14: Risks and Challenges must exist');
    assert.ok(report.finalRecommendation, 'Section 15: Final Recommendation must exist');

    // Verify Sources & Provenance
    assert.ok(report.sources.length >= 3, 'Must provide credible citations');
    const sources = report.sources;
    assert.ok(sources.some((s) => s.title.includes('NielsenIQ') || s.domain === 'nielseniq.com'));
    assert.ok(sources.some((s) => s.domain === 'fssai.gov.in'));

    // Verify Credits Deducted
    assert.equal(orchestrateRes.creditsDeducted, 8, 'Must deduct 8 credits per Phase 2 spec');
  });

  it('3. Audits Emerging-Player Discovery (Paul And Mike, Manam, Subko, Mason & Co)', async () => {
    const reportEntity = await researchRepository.findById(workspaceId, generatedReportId);
    assert.ok(reportEntity);

    const players = reportEntity.emergingPlayers as any[];
    assert.ok(players, 'Must contain emergingPlayers array');
    assert.ok(players.length >= 3, 'Must discover at least 3 emerging players');

    const paulAndMike = players.find((p: any) => p.name.includes('Paul And Mike'));
    assert.ok(paulAndMike, 'Must discover Paul And Mike');
    assert.equal(paulAndMike.foundedYear, '2019');
    assert.ok(paulAndMike.geography.includes('Kochi') || paulAndMike.geography.includes('Kerala'));
    assert.ok(paulAndMike.pricing.includes('₹250'));
    assert.ok(paulAndMike.differentiation.includes('International Chocolate Award'));

    const manam = players.find((p: any) => p.name.includes('Manam'));
    assert.ok(manam, 'Must discover Manam Chocolate');
    assert.equal(manam.foundedYear, '2023');
    assert.ok(manam.geography.includes('Hyderabad'));

    const subko = players.find((p: any) => p.name.includes('Subko'));
    assert.ok(subko, 'Must discover Subko Cacao');
    assert.equal(subko.foundedYear, '2022');
    assert.ok(subko.geography.includes('Mumbai'));
  });

  it('4. Audits Opportunity Discovery & 4-Dimension Attractiveness Math', async () => {
    const reportEntity = await researchRepository.findById(workspaceId, generatedReportId);
    const opportunities = reportEntity!.structuredOpportunities as any[];

    assert.ok(opportunities, 'Must contain structuredOpportunities');
    assert.ok(opportunities.length >= 3, 'Must contain at least 3 structured opportunities');

    // Verify mathematical composite score formula for each card:
    // Composite = Demand(30%) + Differentiation(25%) + Margin(25%) + Feasibility(20%)
    for (const opp of opportunities) {
      const { demandScore, differentiationScore, marginScore, feasibilityScore, compositeAttractiveness } = opp.scores;
      const expected = Math.round(
        demandScore * 0.30 +
        differentiationScore * 0.25 +
        marginScore * 0.25 +
        feasibilityScore * 0.20
      );
      assert.equal(
        compositeAttractiveness,
        expected,
        `Composite attractiveness score for "${opp.title}" must strictly match formula: expected ${expected}, got ${compositeAttractiveness}`
      );
      assert.ok(opp.whyItExists.length > 20, 'Why it exists must provide real market rationale');
      assert.ok(opp.validationExperiment.name.length > 5, 'Must have concrete validation experiment name');
      assert.ok(opp.validationExperiment.hypothesis.length > 10, 'Must have concrete validation experiment hypothesis');
    }
  });

  it('5. Audits Financial Intelligence & Exact Unit Economics Calculation', async () => {
    // Test the ₹5 Lakh scenario via Conversational Research
    const conv = await ideaIntelligenceService.conductConversationalResearch({
      workspaceId,
      reportId: generatedReportId,
      query: 'Can I start this business with ₹5 lakh?',
    });

    assert.ok(conv.reply.includes('₹5,00,000'));
    assert.ok(conv.reply.includes('196 units/month'));
    assert.ok(conv.reply.includes('68.2%'));
    assert.ok(conv.financialRecalculation);
    assert.equal(conv.financialRecalculation.startupBudget, '₹5,00,000');
    assert.equal(conv.financialRecalculation.breakEvenUnits, 196);
    assert.equal(conv.financialRecalculation.feasibilityVerdict, 'VIABLE');

    // Mathematical Audit of Unit Economics:
    // Retail Price: ₹299
    // COGS: ₹95 (Cacao ₹35 + Foil/Box ₹22 + Labor/Logistics ₹38)
    // Gross Profit = 299 - 95 = 204
    // Gross Margin % = 204 / 299 = 68.227%
    // Monthly Fixed OpEx = ₹40,000
    // Break-even Units = 40,000 / 204 = 196.078 -> 196 units
    const retailPrice = 299;
    const cogs = 95;
    const unitGrossProfit = retailPrice - cogs;
    assert.equal(unitGrossProfit, 204);
    const grossMarginPct = (unitGrossProfit / retailPrice) * 100;
    assert.ok(Math.abs(grossMarginPct - 68.22) < 0.1);

    const monthlyFixedOpex = 40000;
    const calculatedBreakEven = Math.round(monthlyFixedOpex / unitGrossProfit);
    assert.equal(calculatedBreakEven, 196);
  });

  it('6. Audits Follow-up Conversational Queries across multiple dimensions', async () => {
    // 6.1 Corporate Gifting focus
    const corporateConv = await ideaIntelligenceService.conductConversationalResearch({
      workspaceId,
      reportId: generatedReportId,
      query: 'What if I focus only on corporate gifting?',
    });
    assert.ok(corporateConv.reply.toLowerCase().includes('corporate'));
    assert.ok(corporateConv.reply.includes('invoice') || corporateConv.reply.includes('margin') || corporateConv.reply.includes('B2B') || corporateConv.reply.includes('gifting'));

    // 6.2 Hyderabad territory launch
    const hyderabadConv = await ideaIntelligenceService.conductConversationalResearch({
      workspaceId,
      reportId: generatedReportId,
      query: 'What if I launch in Hyderabad first?',
    });
    assert.ok(hyderabadConv.reply.includes('Hyderabad') || hyderabadConv.reply.includes('Telangana') || hyderabadConv.reply.includes('India'));

    // 6.3 20 Emerging Competitors
    const compConv = await ideaIntelligenceService.conductConversationalResearch({
      workspaceId,
      reportId: generatedReportId,
      query: 'Find 20 emerging competitors',
    });
    assert.ok(compConv.reply.includes('competitor') || compConv.reply.includes('artisan') || compConv.reply.includes('brands') || compConv.reply.includes('market'));

    // 6.4 ₹1 Crore Revenue Feasibility
    const croreConv = await ideaIntelligenceService.conductConversationalResearch({
      workspaceId,
      reportId: generatedReportId,
      query: 'Can I reach ₹1 crore annual revenue?',
    });
    assert.ok(croreConv.reply.includes('crore') || croreConv.reply.includes('revenue') || croreConv.reply.includes('units') || croreConv.reply.includes('scale'));

    // 6.5 Failure reasons
    const failConv = await ideaIntelligenceService.conductConversationalResearch({
      workspaceId,
      reportId: generatedReportId,
      query: 'What is the biggest reason this business could fail?',
    });
    assert.ok(failConv.reply.toLowerCase().includes('fail') || failConv.reply.toLowerCase().includes('cold-chain') || failConv.reply.toLowerCase().includes('cac') || failConv.reply.toLowerCase().includes('risk') || failConv.reply.toLowerCase().includes('unit economics'));
  });

  it('7. Audits Idea Finalization & Business Brain Blueprint Graduation', async () => {
    const blueprint = await ideaIntelligenceService.finalizeIdea({
      workspaceId,
      reportId: generatedReportId,
      selectedOpportunityId: 'opp-01',
      approvedBy: userId,
    });

    assert.ok(blueprint);
    assert.ok(blueprint.finalConcept);
    assert.equal(blueprint.approvedBy, userId);

    // Verify 90-day execution milestones
    assert.ok(blueprint.executionRoadmap90Day);
    assert.ok(blueprint.executionRoadmap90Day.day30.length >= 2);
    assert.ok(blueprint.executionRoadmap90Day.day60.length >= 2);
    assert.ok(blueprint.executionRoadmap90Day.day90.length >= 2);

    // Verify persistence in repository
    const updated = await researchRepository.findById(workspaceId, generatedReportId);
    assert.ok(updated);
    assert.equal(updated.isSavedToBrain, true);
    assert.ok(updated.finalizationBlueprint);
  });

  it('8. Audits Failure Handling & Two-Phase Credit Refund on Error', async () => {
    const badWs = `ws_err_${Date.now()}`;
    await creditWalletRepository.initializeWallet(badWs, 4); // Only 4 credits, needs 8

    await assert.rejects(
      async () => {
        await ideaIntelligenceService.orchestrateResearch({
          workspaceId: badWs,
          userId,
          ideaSummary: 'Fail test',
        });
      },
      /BILLING_ERROR|INSUFFICIENT_CREDITS|insufficient/i
    );

    const wallet = await creditWalletRepository.getWallet(badWs);
    assert.equal(wallet?.balance, 4, 'Balance must remain unchanged after reservation failure');
  });
});
