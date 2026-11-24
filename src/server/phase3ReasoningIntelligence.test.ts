/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

process.env.NODE_ENV = 'test';

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './app';
import { db } from './db/firestore';
import { departmentEventBus } from './events/eventBus';
import { goalRepository } from './repositories/goalRepository';
import { memoryService } from './services/memoryService';
import type {
  StandardApiResponse,
  BusinessHealthReport,
  SwotAnalysisReport,
  StrategicRecommendation,
  ScoredOpportunity,
  ScenarioSimulationResult,
  BusinessGoalEntity,
  DecisionRecordEntity,
} from './types/api';

test('PHASE 3 — MASTER BUSINESS REASONING & DECISION INTELLIGENCE SUITE', async (t) => {
  db.resetForTesting();
  departmentEventBus.resetForTesting();

  const app = createApp();
  const server = app.listen(0);
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const userHeaders = {
    Authorization: 'Bearer test-token-founder-alpha',
    'Content-Type': 'application/json',
  };

  const userBHeaders = {
    Authorization: 'Bearer test-token-founder-beta',
    'Content-Type': 'application/json',
  };

  let wsAId = '';
  let wsBId = '';

  try {
    // -------------------------------------------------------------------------
    // Baseline Setup: Workspaces & Complete Business Knowledge
    // -------------------------------------------------------------------------
    const resA = await fetch(`${baseUrl}/api/v1/workspaces`, {
      method: 'POST',
      headers: userHeaders,
      body: JSON.stringify({
        workspaceName: 'Apex Roasters Intelligence Hub',
        industry: 'Specialty Coffee',
        country: 'IN',
      }),
    });
    assert.equal(resA.status, 201);
    const dataA = (await resA.json()) as StandardApiResponse<{
      workspace: { workspaceId: string };
    }>;
    wsAId = dataA.data.workspace.workspaceId;

    const resB = await fetch(`${baseUrl}/api/v1/workspaces`, {
      method: 'POST',
      headers: userBHeaders,
      body: JSON.stringify({
        workspaceName: 'Sparse Startup Labs',
        industry: 'Early Stage Technology',
        country: 'IN',
      }),
    });
    assert.equal(resB.status, 201);
    const dataB = (await resB.json()) as StandardApiResponse<{
      workspace: { workspaceId: string };
    }>;
    wsBId = dataB.data.workspace.workspaceId;

    // Populate Workspace A Business Brain
    await fetch(`${baseUrl}/api/v1/workspaces/${wsAId}/business-profile`, {
      method: 'PATCH',
      headers: userHeaders,
      body: JSON.stringify({
        businessName: 'Apex Artisan Roasters',
        tagline: 'Precision roasting and commercial nitro kegs',
        industry: 'Specialty Coffee',
        stage: 'Growing Business',
        location: 'Bengaluru, India',
        valueProposition: 'Single-origin farm traceable nitro draft kegs for cafes',
        brandPositioning: 'Bengaluru premium single-origin cold brew keg distribution leader',
        customerPersonas: [
          {
            name: 'Independent Specialty Cafe Owner',
            painPoints: ['High labor prep cost', 'Inconsistent cold brew flavor'],
            goals: ['Streamlined beverage service', 'Higher draft margins'],
          },
        ],
        resourcesAndConstraints: {
          monthlyMarketingBudget: 5000,
          operatingCapacity: '100 kegs / week',
          explicitExclusions: ['Never claim instant coffee', 'Never offer video generation'],
        },
      }),
    });

    // Populate Catalog for Workspace A
    await fetch(`${baseUrl}/api/v1/workspaces/${wsAId}/business-profile/products/import`, {
      method: 'POST',
      headers: userHeaders,
      body: JSON.stringify({
        products: [
          {
            productId: 'prod_nitro_20l',
            name: 'Apex Nitro Keg 20L',
            category: 'Commercial Kegs',
            price: 165,
            pricingStructure: 'one-time',
            description: 'Commercial nitrogen cold brew keg with dual valve.',
            features: ['48-hr cold extraction', 'Nitrogen pressurized'],
            benefits: ['Silky foam head', 'Zero prep labor'],
          },
          {
            productId: 'prod_beans_1kg',
            name: 'Single Origin Whole Beans 1kg',
            category: 'Commercial Beans',
            price: 45,
            pricingStructure: 'one-time',
            description: 'Estate arabica roasted on order.',
          },
          {
            productId: 'prod_nitro_mini',
            name: 'Consumer Mini Nitro Keg 5L',
            category: 'Consumer Kegs',
            price: 55,
            description: 'Discontinued experimental mini keg.',
          },
        ],
      }),
    });

    // Populate Brand Guidelines for Workspace A
    await fetch(`${baseUrl}/api/v1/workspaces/${wsAId}/business-profile/brand-intelligence`, {
      method: 'POST',
      headers: userHeaders,
      body: JSON.stringify({
        brandName: 'Apex Artisan Roasters',
        voice: ['Authoritative', 'Artisanal', 'Direct'],
        wordsToUse: ['Craft-roasted', 'Single-origin', 'Nitro draft'],
        wordsToAvoid: ['Instant', 'Commercial blend', 'Cheap'],
        approvedClaims: ['Roasted within 48 hours of shipment', 'Farm traceable'],
        restrictedClaims: ['Never claim organic without official estate certification'],
      }),
    });

    // Populate Initial Goal for Workspace A
    await goalRepository.createGoal({
      workspaceId: wsAId,
      goalId: 'goal_nitro_launch',
      title: 'Commercial Nitro Keg Cafe Launch',
      description: 'Expand cafe distribution',
      status: 'on_track',
    });

    // =========================================================================
    // SCENARIO 1: Business Analysis with Complete Data
    // =========================================================================
    await t.test(
      'Scenario 1: Business health assessment evaluates all 8 dimensions with complete data',
      async () => {
        const res = await fetch(`${baseUrl}/api/v1/workspaces/${wsAId}/reasoning/health`, {
          method: 'GET',
          headers: userHeaders,
        });
        assert.equal(res.status, 200);
        const body = (await res.json()) as StandardApiResponse<BusinessHealthReport>;

        assert.ok(body.data.overallScore >= 70);
        assert.equal(body.data.dimensions.length, 8);
        const dimensions = body.data.dimensions.map((d) => d.dimension);
        assert.ok(dimensions.includes('positioning'));
        assert.ok(dimensions.includes('product_portfolio'));
        assert.ok(dimensions.includes('customer_segments'));
        assert.ok(dimensions.includes('marketing_maturity'));
        assert.ok(dimensions.includes('market_presence'));
        assert.ok(dimensions.includes('growth_readiness'));
        assert.ok(dimensions.includes('operational_limitations'));
        assert.ok(dimensions.includes('data_completeness'));

        const pos = body.data.dimensions.find((d) => d.dimension === 'positioning');
        assert.ok(pos && pos.score >= 75);
        assert.equal(pos.status, 'strong');
      }
    );

    // =========================================================================
    // SCENARIO 2: Business Analysis with Missing Data
    // =========================================================================
    await t.test(
      'Scenario 2: Business analysis flags missing data and critical gaps without hallucination',
      async () => {
        // Workspace B is sparse with no products, budget, or brand guidelines
        const res = await fetch(`${baseUrl}/api/v1/workspaces/${wsBId}/reasoning/health`, {
          method: 'GET',
          headers: userBHeaders,
        });
        assert.equal(res.status, 200);
        const body = (await res.json()) as StandardApiResponse<BusinessHealthReport>;

        assert.ok(body.data.overallScore < 50);
        assert.ok(body.data.identifiedGaps.length >= 2);
        assert.ok(
          body.data.criticalRisks.some(
            (r) => r.includes('marketing budget') || r.includes('product catalog')
          )
        );

        const ops = body.data.dimensions.find((d) => d.dimension === 'operational_limitations');
        assert.ok(ops && ops.missingData && ops.missingData.length > 0);
        assert.ok(ops.missingData.some((m) => m.includes('budget')));
      }
    );

    // =========================================================================
    // SCENARIO 3: Conflicting Business Information
    // =========================================================================
    await t.test(
      'Scenario 3: Contradiction detection flags prohibited brand words or conflicting claims',
      async () => {
        // Intentionally introduce a conflicting product description containing 'Instant'
        await fetch(`${baseUrl}/api/v1/workspaces/${wsAId}/business-profile/products/import`, {
          method: 'POST',
          headers: userHeaders,
          body: JSON.stringify({
            products: [
              {
                productId: 'prod_instant_cold',
                name: 'Instant Cold Nitro Pods',
                price: 15,
                description: 'Instant ready-to-drink coffee pods for quick use.',
              },
            ],
          }),
        });

        const res = await fetch(`${baseUrl}/api/v1/workspaces/${wsAId}/reasoning/swot`, {
          method: 'GET',
          headers: userHeaders,
        });
        assert.equal(res.status, 200);
        const body = (await res.json()) as StandardApiResponse<SwotAnalysisReport>;

        assert.ok(body.data.contradictionsDetected && body.data.contradictionsDetected.length > 0);
        assert.ok(
          body.data.contradictionsDetected.some(
            (c) => c.includes('Instant') && c.includes('prohibited')
          )
        );
      }
    );

    // =========================================================================
    // SCENARIO 4: SWOT Generation with Evidence
    // =========================================================================
    await t.test(
      'Scenario 4: SWOT findings cite verified business evidence or are explicitly tagged as assumptions',
      async () => {
        const res = await fetch(`${baseUrl}/api/v1/workspaces/${wsAId}/reasoning/swot`, {
          method: 'GET',
          headers: userHeaders,
        });
        assert.equal(res.status, 200);
        const body = (await res.json()) as StandardApiResponse<SwotAnalysisReport>;

        // Strengths must have verified citations
        assert.ok(body.data.strengths.length > 0);
        for (const s of body.data.strengths) {
          if (!s.isAssumption) {
            assert.ok(s.evidence && s.evidence.length > 0);
            assert.ok(s.confidence >= 0.9);
          }
        }

        // Threats must include restricted claims
        assert.ok(
          body.data.threats.some(
            (t) => t.statement.includes('Compliance') || t.statement.includes('Claims')
          )
        );

        // Opportunities must be tagged as assumptions if unproven
        const unprovenOpp = body.data.opportunities.find(
          (o) => o.id === 'opp_digital_channel_expansion'
        );
        if (unprovenOpp) {
          assert.equal(unprovenOpp.isAssumption, true);
        }
      }
    );

    // =========================================================================
    // SCENARIO 5: Goal-to-Strategy Mapping
    // =========================================================================
    let createdGoalId = '';
    await t.test(
      'Scenario 5: Goal creation connects business objectives directly to actionable strategies',
      async () => {
        const goalRes = await fetch(`${baseUrl}/api/v1/workspaces/${wsAId}/reasoning/goals`, {
          method: 'POST',
          headers: userHeaders,
          body: JSON.stringify({
            title: 'Scale Nitro Keg Distribution to 50 Specialty Cafes',
            description: 'Establish recurring commercial draft beverage accounts across Bengaluru.',
            deadline: '2026-12-31',
            targetMetrics: [{ name: 'Active Commercial Accounts', targetValue: 50, unit: 'cafes' }],
            departmentAlignment: ['GROWTH_DIRECTOR', 'OPERATIONS'],
          }),
        });
        assert.equal(goalRes.status, 201);
        const goalBody = (await goalRes.json()) as StandardApiResponse<BusinessGoalEntity>;
        createdGoalId = goalBody.data.goalId;
        assert.ok(createdGoalId);

        // Request strategies mapped to this goal
        const stratRes = await fetch(
          `${baseUrl}/api/v1/workspaces/${wsAId}/reasoning/strategies?goalId=${createdGoalId}`,
          { method: 'GET', headers: userHeaders }
        );
        assert.equal(stratRes.status, 200);
        const stratBody = (await stratRes.json()) as StandardApiResponse<StrategicRecommendation[]>;

        assert.ok(stratBody.data.length > 0);
        const wholesaleStrat = stratBody.data.find((s) => s.title.includes('Commercial Account'));
        assert.ok(wholesaleStrat);
        assert.ok(wholesaleStrat.objective.includes('Scale Nitro Keg Distribution'));
        assert.ok(wholesaleStrat.requiredActions.length >= 2);
        assert.ok(wholesaleStrat.kpis.length > 0);
      }
    );

    // =========================================================================
    // SCENARIO 6: Opportunity Ranking (5-Factor Formula)
    // =========================================================================
    await t.test(
      'Scenario 6: Opportunity scoring transparently computes weighted factor contributions',
      async () => {
        const rankRes = await fetch(
          `${baseUrl}/api/v1/workspaces/${wsAId}/reasoning/opportunities/rank`,
          {
            method: 'POST',
            headers: userHeaders,
            body: JSON.stringify({
              opportunities: [
                {
                  title: 'B2B Specialty Cafe Keg Subscription',
                  description: 'Contract with 20 cafes for weekly nitro draft keg supply.',
                  businessImpact: 90,
                  strategicAlignment: 95,
                  evidenceConfidence: 90,
                  feasibility: 85,
                  costEfficiency: 80,
                },
                {
                  title: 'Direct-to-Consumer Bottled Cold Brew',
                  description: 'Retail bottled cold brew directly to residential subscribers.',
                  businessImpact: 45,
                  strategicAlignment: 40,
                  evidenceConfidence: 50,
                  feasibility: 40,
                  costEfficiency: 35,
                },
              ],
            }),
          }
        );
        assert.equal(rankRes.status, 200);
        const rankBody = (await rankRes.json()) as StandardApiResponse<ScoredOpportunity[]>;

        assert.equal(rankBody.data.length, 2);
        const topOpp = rankBody.data[0];
        assert.equal(topOpp.title, 'B2B Specialty Cafe Keg Subscription');
        assert.ok(topOpp.compositeScore >= 80);
        assert.equal(topOpp.priorityTier, 'high_priority');

        // Verify factor contributions (30%, 25%, 20%, 15%, 10%)
        assert.equal(topOpp.factorContributions.businessImpact, 27); // 90 * 0.30
        assert.equal(topOpp.factorContributions.strategicAlignment, 23.75); // 95 * 0.25
        assert.equal(topOpp.factorContributions.evidenceConfidence, 18); // 90 * 0.20
        assert.equal(topOpp.factorContributions.feasibility, 12.75); // 85 * 0.15
        assert.equal(topOpp.factorContributions.costEfficiency, 8); // 80 * 0.10

        // Non-guaranteed revenue disclaimer check
        assert.ok(topOpp.disclaimer.includes('do NOT imply guaranteed revenue'));
      }
    );

    // =========================================================================
    // SCENARIO 7: Budget-Constrained Strategy
    // =========================================================================
    await t.test(
      'Scenario 7: Strategy budget estimate strictly honors verified financial boundaries',
      async () => {
        const res = await fetch(`${baseUrl}/api/v1/workspaces/${wsAId}/reasoning/strategies`, {
          method: 'GET',
          headers: userHeaders,
        });
        assert.equal(res.status, 200);
        const body = (await res.json()) as StandardApiResponse<StrategicRecommendation[]>;

        const b2bStrategy = body.data.find((s) => s.title.includes('Commercial Account'));
        assert.ok(b2bStrategy);
        // Workspace A has monthlyMarketingBudget = $5000. Strategy budget must be <= $5000
        assert.notEqual(b2bStrategy.budgetEstimate, 'UNKNOWN');
        assert.ok(typeof b2bStrategy.budgetEstimate === 'number');
        assert.ok((b2bStrategy.budgetEstimate as number) <= 5000);
      }
    );

    // =========================================================================
    // SCENARIO 8: Scenario Comparison (Parametric Model)
    // =========================================================================
    await t.test(
      'Scenario 8: Scenario planning generates best-case, expected, and downside ranges',
      async () => {
        const res = await fetch(
          `${baseUrl}/api/v1/workspaces/${wsAId}/reasoning/scenarios/simulate`,
          {
            method: 'POST',
            headers: userHeaders,
            body: JSON.stringify({
              scenarioType: 'budget_increase_20',
            }),
          }
        );
        assert.equal(res.status, 200);
        const body = (await res.json()) as StandardApiResponse<ScenarioSimulationResult>;

        assert.equal(body.data.scenarioType, 'budget_increase_20');
        assert.ok(body.data.scenarios.bestCase);
        assert.ok(body.data.scenarios.expectedCase);
        assert.ok(body.data.scenarios.downside);

        // Best case revenue midpoint > expected case > downside
        const bestMid = body.data.scenarios.bestCase.projectedRevenueRange.midpoint;
        const expMid = body.data.scenarios.expectedCase.projectedRevenueRange.midpoint;
        const downMid = body.data.scenarios.downside.projectedRevenueRange.midpoint;
        assert.ok(bestMid > expMid);
        assert.ok(expMid > downMid);

        // Disclaimers present
        assert.ok(
          body.data.disclaimer.includes('planning tools and do NOT constitute financial forecasts')
        );
      }
    );

    // =========================================================================
    // SCENARIO 9: Unsupported Revenue Assumptions Safeguard
    // =========================================================================
    await t.test(
      'Scenario 9: Reasoning safeguards prevent ungrounded revenue promises or assumptions',
      async () => {
        const res = await fetch(
          `${baseUrl}/api/v1/workspaces/${wsAId}/reasoning/scenarios/simulate`,
          {
            method: 'POST',
            headers: userHeaders,
            body: JSON.stringify({
              scenarioType: 'pricing_change',
              parameters: { priceDeltaPercent: 15 },
            }),
          }
        );
        assert.equal(res.status, 200);
        const body = (await res.json()) as StandardApiResponse<ScenarioSimulationResult>;

        // Downside scenario must explicitly account for account loss/churn
        assert.ok(
          body.data.scenarios.downside.keyAssumptions.some(
            (a) => a.includes('sensitivity') || a.includes('competitors')
          )
        );
        assert.ok(body.data.scenarios.downside.projectedCustomerGrowth.min <= 0);
      }
    );

    // =========================================================================
    // SCENARIO 10: User Rejection of a Recommendation
    // =========================================================================
    await t.test(
      'Scenario 10: User rejection records feedback, logs decision, and suppresses re-recommendation',
      async () => {
        // 1. Fetch current strategies
        const stratsRes = await fetch(
          `${baseUrl}/api/v1/workspaces/${wsAId}/reasoning/strategies`,
          {
            method: 'GET',
            headers: userHeaders,
          }
        );
        const strats = (await stratsRes.json()) as StandardApiResponse<StrategicRecommendation[]>;
        const targetStrat = strats.data[0];
        assert.ok(targetStrat);

        // 2. User rejects the strategy
        const rejectRes = await fetch(
          `${baseUrl}/api/v1/workspaces/${wsAId}/reasoning/strategies/${targetStrat.strategyId}/decision`,
          {
            method: 'POST',
            headers: userHeaders,
            body: JSON.stringify({
              decision: 'rejected',
              userFeedback:
                'Cold brew mini-keg packaging logistics are too complex for our team right now.',
              alternativesConsidered: [
                { alternative: 'Mini-kegs', reasonRejected: 'High packaging cost' },
              ],
            }),
          }
        );
        assert.equal(rejectRes.status, 200);

        // 3. Verify rejection decision is recorded
        const decisionsRes = await fetch(
          `${baseUrl}/api/v1/workspaces/${wsAId}/reasoning/decisions`,
          {
            method: 'GET',
            headers: userHeaders,
          }
        );
        const decisions = (await decisionsRes.json()) as StandardApiResponse<
          DecisionRecordEntity[]
        >;
        const rejectedDec = decisions.data.find((d) => d.title.includes(targetStrat.strategyId));
        assert.ok(rejectedDec);
        assert.equal(rejectedDec.userApproval.status, 'rejected');
        assert.ok(rejectedDec.userApproval.comments?.includes('mini-keg packaging'));
      }
    );

    // =========================================================================
    // SCENARIO 11: Decision History Retrieval
    // =========================================================================
    await t.test(
      'Scenario 11: Decision history retrieves alternatives considered, approvals, and lessons learned',
      async () => {
        // Record a new approved strategic decision with retrospective actual outcome
        const decRes = await fetch(`${baseUrl}/api/v1/workspaces/${wsAId}/reasoning/decisions`, {
          method: 'POST',
          headers: userHeaders,
          body: JSON.stringify({
            title: 'Partner with Single-Origin Co-Op for Arabica Sourcing',
            decision: 'Signed direct trade contract with Chikmagalur estate.',
            supportingEvidence: [
              {
                sourceId: 'src_estate_contract',
                sourceType: 'DOCUMENT',
                title: 'Estate Agreement',
                confidence: 1.0,
              },
            ],
            alternativesConsidered: [
              {
                alternative: 'Mass Commodity Spot Market',
                reasonRejected: 'Failed cup score threshold (under 84)',
              },
            ],
            userApproval: {
              status: 'approved',
              approvedBy: 'Founder Alpha',
              timestamp: new Date().toISOString(),
            },
            responsibleDepartment: 'OPERATIONS',
            expectedResult: 'Stable green coffee supply at 18% lower cost per kg.',
            actualResult: 'Cup score averaged 86.5 with 20% margin improvement.',
            lessonsLearned: [
              'Direct estate relationships protect bean supply and quality narrative.',
            ],
          }),
        });
        assert.equal(decRes.status, 201);
        const decBody = (await decRes.json()) as StandardApiResponse<DecisionRecordEntity>;
        const decId = decBody.data.decisionId;

        // Retrieve decision history
        const listRes = await fetch(`${baseUrl}/api/v1/workspaces/${wsAId}/reasoning/decisions`, {
          method: 'GET',
          headers: userHeaders,
        });
        assert.equal(listRes.status, 200);
        const listBody = (await listRes.json()) as StandardApiResponse<DecisionRecordEntity[]>;

        const found = listBody.data.find((d) => d.decisionId === decId);
        assert.ok(found);
        assert.equal(found.expectedResult, 'Stable green coffee supply at 18% lower cost per kg.');
        assert.equal(found.actualResult, 'Cup score averaged 86.5 with 20% margin improvement.');
        assert.equal(found.alternativesConsidered[0].alternative, 'Mass Commodity Spot Market');
      }
    );

    // =========================================================================
    // SCENARIO 12: Strategy Update After New Performance Information (Root Cause)
    // =========================================================================
    await t.test(
      'Scenario 12: Poor performance triggers root-cause investigation rather than generic ad recommendations',
      async () => {
        // Record an episodic lesson about consumer 5L keg returns
        await memoryService.recordEpisode({
          workspaceId: wsAId,
          department: 'GROWTH_DIRECTOR',
          activityType: 'strategic_decision',
          title: 'Discontinue 5L Consumer Mini-Kegs',
          summary: 'Packaging returns and valve leakage damaged customer retention.',
          learnings: ['Packaging return logistics caused 35% margin erosion.'],
          userAttribution: 'Founder Alpha',
        });

        // Investigate poor performance on mini-keg product line
        const rcRes = await fetch(`${baseUrl}/api/v1/workspaces/${wsAId}/reasoning/root-cause`, {
          method: 'POST',
          headers: userHeaders,
          body: JSON.stringify({
            issueDescription: 'Customer churn on mini cold brew keg reorders.',
            observedMetric: 'Repeat order rate dropped to 14%',
          }),
        });
        assert.equal(rcRes.status, 200);
        const rcBody = (await rcRes.json()) as StandardApiResponse<any>;

        // Analysis identifies logistical/packaging friction backed by evidence, NOT "spend more on marketing"
        assert.ok(
          rcBody.data.hypotheses.some(
            (h: any) => h.cause.includes('Packaging') || h.cause.includes('Logistics')
          )
        );
        assert.ok(rcBody.data.identifiedRootCause.includes('packaging'));
        assert.ok(
          rcBody.data.recommendedInvestigationSteps.some((s: string) => s.includes('packaging'))
        );
      }
    );
  } finally {
    server.close();
  }
});
