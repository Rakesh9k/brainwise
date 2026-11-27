/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { unifiedAiOrchestrator } from './unifiedOrchestrator';
import { creditService } from '../services/creditService';
import { businessProfileRepository } from '../repositories/businessProfileRepository';
import { sharedBusinessContextService } from '../services/sharedBusinessContextService';
import { departmentEventBus } from '../events/eventBus';
import type { AssembledGrowthContext } from '../services/growth/growthTypes';

describe('PHASE 2: UNIFIED AI ORCHESTRATOR SUITE', () => {
  const workspaceId = `ws_unified_${Date.now()}`;
  const userId = `usr_founder_${Date.now()}`;

  const mockGrowthContext: AssembledGrowthContext = {
    workspaceId,
    businessName: 'Solstice Artisan Chocolatier',
    industry: 'Specialty Food & Confectionery',
    stage: 'Early Traction',
    businessModel: 'D2C + Gourmet Retail',
    location: 'Bangalore, India',
    targetAudience: 'Affluent urban gift shoppers and dark chocolate connoisseurs',
    nearestCompetitor: 'Paul And Mike',
    confirmedFacts: ['Single-origin West Godavari cacao', 'Clean-label organic certified'],
    unitEconomics: {
      averageOrderValue: 850,
      grossMarginPercent: 68,
      currency: 'INR',
    },
    marketingBudgetMonthly: 15000,
    activeGoals: ['Achieve 500 monthly recurring gift subscribers'],
  };

  it('1. Initializes workspace profile and credit wallet for orchestrator operations', async () => {
    // 1. Save profile
    await businessProfileRepository.saveProfile({
      workspaceId,
      businessName: 'Solstice Artisan Chocolatier',
      industry: 'Specialty Food & Confectionery',
      category: 'Gourmet Chocolate',
      subIndustry: 'Bean-to-Bar Craft Confectionery',
      location: 'Bangalore, India',
      stage: 'early',
      version: 1,
      lastUpdated: new Date().toISOString(),
      products: [
        {
          id: 'prod_dark_bar',
          name: '70% Dark Single-Origin Bar',
          priceRange: '₹350',
          normalizedPrices: [350],
        },
        {
          id: 'prod_luxury_box',
          name: 'Artisan Festive Gifting Box',
          priceRange: '₹1,250',
          normalizedPrices: [1250],
        },
      ],
      strategicMemory: {
        explicitExclusions: ['Never offer cheap discounts or clearance sales'],
        usedAngles: [],
        fatiguedThemes: [],
        lastUpdated: new Date().toISOString(),
      },
      provenance: {},
    } as any);

    sharedBusinessContextService.invalidateCache(workspaceId);

    // 2. Fund credit wallet via getWallet (initializes with 800 credits)
    const wallet = await creditService.getWallet(workspaceId);
    assert.ok(wallet.balance >= 800);
  });

  it('2. Executes 15-step orchestrator lifecycle with Two-Phase Credit Reservation Hold & Settlement', async () => {
    const walletBefore = await creditService.getWallet(workspaceId);

    const output = await unifiedAiOrchestrator.executeWorkflow({
      workspaceId,
      userId,
      department: 'MARKET_INTELLIGENCE',
      workflow: 'market_overview',
      userPrompt: 'Analyze specialty chocolate addressable market in Bangalore',
      idempotencyKey: `orch_test_${Date.now()}`,
    });

    assert.equal(output.status, 'COMPLETED');
    assert.equal(output.department, 'MARKET_INTELLIGENCE');
    assert.equal(output.workflow, 'market_overview');
    assert.ok(output.summary.length > 10);
    assert.ok(output.findings.length > 0);
    assert.ok(output.recommendations.length > 0);
    assert.ok(output.metadata.creditsDeducted > 0);

    const walletAfter = await creditService.getWallet(workspaceId);
    assert.equal(walletAfter.balance, walletBefore.balance - output.metadata.creditsDeducted);
  });

  it('3. Enforces Strict Video Exclusion Rule: Rejects video prompts and blocks video pipelines', async () => {
    await assert.rejects(
      async () => {
        await unifiedAiOrchestrator.executeWorkflow({
          workspaceId,
          userId,
          department: 'MARKETING_INTELLIGENCE',
          workflow: 'channel_strategy',
          userPrompt: 'Please generate video reel using ffmpeg for our Instagram campaign',
        });
      },
      (err: Error) => {
        return (
          err.message.includes('STRICT_VIDEO_EXCLUSION') &&
          err.message.includes('BrainWise explicitly excludes video generation')
        );
      }
    );
  });

  it('4. Engages Human Approval Gate for consequential high-risk tools (task_creator)', async () => {
    const pendingOutput = await unifiedAiOrchestrator.executeWorkflow({
      workspaceId,
      userId,
      department: 'BUSINESS_STRATEGY',
      workflow: 'create_sprint_task',
      userPrompt: 'Launch 14-day holiday tasting sample sprint',
      idempotencyKey: `gate_test_${Date.now()}`,
    });

    assert.equal(pendingOutput.status, 'PENDING_APPROVAL');
    assert.ok(pendingOutput.summary.includes('Requires explicit human confirmation'));
    assert.equal(pendingOutput.metadata.creditsDeducted, 0);

    // Human approves the held action
    const approvalRes = await unifiedAiOrchestrator.approveRequest({
      workspaceId,
      userId,
      requestId: pendingOutput.requestId,
    });

    assert.equal(approvalRes.status, 'COMPLETED');
    assert.ok(approvalRes.result);
  });

  it('5. Generates genuine context-grounded Marketing Campaign Plan without video bloat', async () => {
    const campaign = await unifiedAiOrchestrator.generateMarketingCampaign({
      workspaceId,
      userId,
      context: mockGrowthContext,
    });

    assert.ok(campaign.campaignId.startsWith('cmp_'));
    assert.ok(campaign.name.includes('Solstice'));
    assert.ok(campaign.objective.length > 10);
    assert.ok(['SVG_COLLATERAL', 'STATIC_CAROUSEL', 'OUTREACH_COPY', 'CONTENT_PACK'].includes(campaign.format));
    assert.notEqual(campaign.format, 'VIDEO_REEL' as any);
    assert.ok(campaign.creativeAssetBrief.headline.length > 0);
    assert.ok(campaign.creativeAssetBrief.keyPoints.length >= 2);
    assert.ok(campaign.budget <= 15000);
  });

  it('6. Generates consultative 3-step Outreach Sequence grounded in verified pricing', async () => {
    const sequence = await unifiedAiOrchestrator.generateOutreachSequence({
      workspaceId,
      context: mockGrowthContext,
      targetRole: 'Corporate Gifting Director',
    });

    assert.ok(sequence.sequenceId.startsWith('seq_'));
    assert.equal(sequence.targetRole, 'Corporate Gifting Director');
    assert.equal(sequence.steps.length, 3);
    assert.equal(sequence.steps[0].stepNumber, 1);
    assert.equal(sequence.steps[1].stepNumber, 2);
    assert.equal(sequence.steps[2].stepNumber, 3);
    assert.ok(sequence.steps[0].subject.length > 0);
    assert.ok(sequence.steps[0].bodyText.includes('Solstice Artisan Chocolatier'));
  });

  it('7. Synthesizes prioritized Growth Opportunities based on bottleneck diagnoses', async () => {
    const diagnoses = [
      {
        diagnosisId: 'diag_1',
        dimension: 'CONVERSION' as const,
        classification: 'CONFIRMED_BOTTLENECK' as const,
        problem: 'Checkout drop-off at pricing step due to unclear delivery timelines',
        primarySymptom: 'Low visitor-to-paid checkout conversion',
        quantifiedImpact: 'Estimated 22% conversion leakage',
        confidenceScore: 0.88,
        evidencePoints: ['Checkout funnel analytics step 2'],
        suggestedFocus: 'Evidence-backed transparent checkout assurances',
      },
    ];

    const opportunities = await unifiedAiOrchestrator.synthesizeOpportunities({
      workspaceId,
      context: mockGrowthContext,
      diagnoses,
    });

    assert.ok(opportunities.length >= 2);
    assert.ok(opportunities[0].opportunityId.startsWith('opp_'));
    assert.ok(opportunities[0].estimatedRevenueImpactMonthly > 0);
    assert.ok(opportunities[0].expectedCacReductionPercent > 0);
    assert.ok(opportunities[0].riskAssessment.level);
    assert.equal(opportunities[0].evidenceQuality, 'INDEPENDENTLY_VERIFIED');
  });

  it('8. Audits Conversion Funnel friction and produces actionable before/after copy', async () => {
    const findings = await unifiedAiOrchestrator.auditConversionFunnel({
      context: mockGrowthContext,
    });

    assert.ok(findings.length >= 2);
    assert.ok(findings[0].findingId.startsWith('cro_'));
    assert.ok(findings[0].beforeCopy.length > 0);
    assert.ok(findings[0].recommendedAfterCopy.length > 0);
    assert.ok(findings[0].projectedConversionUpliftPercent > 0);
    assert.ok(findings[0].implementationEffortHours > 0);
  });

  it('9. Emits cross-department coordination events on workflow completion', async () => {
    let capturedEvent: any = null;
    const unsub = departmentEventBus.subscribe('DEPARTMENT_COORDINATION_EVENT', (evt) => {
      if (evt.workspaceId === workspaceId) {
        capturedEvent = evt;
      }
    });

    try {
      await unifiedAiOrchestrator.executeWorkflow({
        workspaceId,
        userId,
        department: 'PERFORMANCE_INTELLIGENCE',
        workflow: 'kpi_analysis',
        userPrompt: 'Evaluate current sales velocity milestones',
        idempotencyKey: `coord_evt_${Date.now()}`,
      });

      assert.ok(capturedEvent);
      assert.equal(capturedEvent.workspaceId, workspaceId);
      assert.equal(capturedEvent.metadata?.department, 'PERFORMANCE_INTELLIGENCE');
    } finally {
      unsub();
    }
  });
});
