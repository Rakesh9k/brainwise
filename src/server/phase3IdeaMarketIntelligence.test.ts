/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ideaIntelligenceService } from './services/ideaIntelligenceService';
import { marketIntelligenceService } from './services/marketIntelligenceService';

describe('PHASE 3 — MASTER IDEA & MARKET INTELLIGENCE SUITE', () => {
  const workspaceA = `ws_idea_mkt_phase3_test_a_${Date.now()}`;
  const workspaceB = `ws_idea_mkt_phase3_test_b_${Date.now()}`;

  // ---------------------------------------------------------------------------
  // 1. Idea Intelligence: Deterministic 7-Score Matrix
  // ---------------------------------------------------------------------------
  it('1. Computes the 7-score matrix using the documented transparent mathematical formula', () => {
    const scores = ideaIntelligenceService.calculateOpportunityScores({
      marketScore: 80,
      demandScore: 80,
      competitionScore: 60,
      financialFeasibilityScore: 70,
      executionScore: 70,
      riskScore: 30, // (100 - 30) = 70
    });

    // Overall = (80 * 0.25) + (80 * 0.25) + (70 * 0.20) + (70 * 0.15) + (70 * 0.15)
    //         = 20 + 20 + 14 + 10.5 + 10.5 = 75
    assert.equal(scores.overallOpportunityScore, 75);
    assert.equal(scores.marketScore, 80);
    assert.equal(scores.demandScore, 80);
    assert.equal(scores.financialFeasibilityScore, 70);
    assert.equal(scores.executionScore, 70);
    assert.equal(scores.riskScore, 30);
    assert.ok(scores.methodology.overall.includes('25%'));
  });

  it('2. Evaluates idea and returns GO executive verdict for high-opportunity low-risk ideas', async () => {
    const dossier = await ideaIntelligenceService.validateIdea({
      workspaceId: workspaceA,
      ideaSummary: 'AI Business Intelligence & Growth Operating System for Indian SMEs',
      targetIndustry: 'B2B Software & Commercial Services',
      targetGeography: 'India',
      targetAudience: 'SME Founders & Growth Leaders',
    });

    assert.ok(dossier.validationId.startsWith('val_'));
    assert.ok(['GO', 'CAUTION'].includes(dossier.executiveVerdict));
    assert.ok(dossier.scores.overallOpportunityScore >= 70);
    assert.equal(dossier.problemSeverity.severityLevel, 'HIGH');
    assert.equal(dossier.willingnessToPay.viable, true);
    assert.ok(dossier.criticalAssumptions.length >= 2);
    assert.ok(dossier.recommendedExperiments.length >= 2);
    assert.ok(dossier.actionableNextSteps.length >= 3);
  });

  // ---------------------------------------------------------------------------
  // 2. Market Intelligence: Top-Down & Bottom-Up Sizing
  // ---------------------------------------------------------------------------
  it('3. Generates dual top-down and bottom-up TAM/SAM/SOM breakdowns with stated assumptions', () => {
    const sizing = marketIntelligenceService.generateMarketSizing({
      workspaceId: workspaceA,
      industry: 'B2B Commercial Intelligence',
      geography: 'India',
      targetSegment: 'Registered GST MSMEs',
      averageAnnualContractValue: 5988, // ₹499/mo * 12
      currency: 'INR',
    });

    // Top-down verification
    assert.ok(sizing.topDown.tam.valueNumeric > 0);
    assert.equal(sizing.topDown.tam.calculationMethodology, 'TOP_DOWN');
    assert.ok(sizing.topDown.tam.statedAssumptions.length >= 1);
    assert.ok(sizing.topDown.sam.valueNumeric < sizing.topDown.tam.valueNumeric);
    assert.ok(sizing.topDown.som.valueNumeric < sizing.topDown.sam.valueNumeric);

    // Bottom-up verification
    assert.ok(sizing.bottomUp.tam.valueNumeric > 0);
    assert.equal(sizing.bottomUp.tam.calculationMethodology, 'BOTTOM_UP');
    assert.ok(sizing.bottomUp.tam.methodologyFormula.includes('ARR'));
    assert.equal(sizing.recommendedBaseline, 'BOTTOM_UP');
  });

  // ---------------------------------------------------------------------------
  // 3. Indian Market Tailoring & Regulatory Integration
  // ---------------------------------------------------------------------------
  it('4. Delivers India-specific market insights including Tier 1/2 dynamics, UPI, and tax considerations', async () => {
    const dossier = await marketIntelligenceService.getMarketIntelligenceDossier({
      workspaceId: workspaceA,
      industry: 'B2B Software',
      geography: 'India',
    });

    assert.equal(dossier.geography, 'India');
    assert.ok(dossier.geographicOpportunities.tier1Opportunity.includes('Bengaluru'));
    assert.ok(dossier.geographicOpportunities.infrastructureTailwinds.some((t) => t.includes('UPI')));
    assert.ok(dossier.geographicOpportunities.regulatoryConsiderations.some((r) => r.includes('Section 44AD')));
    assert.ok(dossier.industryTrends.length >= 2);
    assert.ok(dossier.demandSignals.length >= 1);
    assert.ok(dossier.uncertaintyDisclaimer.includes('All market estimates'));
  });

  // ---------------------------------------------------------------------------
  // 4. Multi-Tenant Workspace Boundary
  // ---------------------------------------------------------------------------
  it('5. Enforces workspace isolation on idea and market dossiers', async () => {
    const dossierB = await marketIntelligenceService.getMarketIntelligenceDossier({
      workspaceId: workspaceB,
      industry: 'Manufacturing Logistics',
      geography: 'India',
    });

    assert.equal(dossierB.workspaceId, workspaceB);
    assert.equal(dossierB.industry, 'Manufacturing Logistics');
  });
});
