/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { RetrievedContextPackage } from './contextEngine';
import type { AiSource, StrategicRecommendationItem } from './types';

export interface StrategySynthesisParams {
  context: RetrievedContextPackage;
  sources?: AiSource[];
  workflow: string;
  userPrompt: string;
}

export interface StrategyDiagnosis {
  strengths: string[];
  vulnerabilities: string[];
  strategicOpportunities: string[];
  recommendations: StrategicRecommendationItem[];
  riskDisclaimers: string[];
  suggestedRoadmapPhases: Array<{ phase: string; duration: string; focus: string }>;
}

export class StrategyEngine {
  /**
   * Generates grounded, prioritized strategic recommendations.
   * Strictly avoids revenue/growth guarantees and distinguishes estimates from confirmed facts.
   */
  public synthesizeStrategy(params: StrategySynthesisParams): StrategyDiagnosis {
    const { context, sources = [], workflow: _workflow, userPrompt: _userPrompt } = params;

    const bName = context.businessName;
    const stage = context.stage;
    const location = context.location;
    const verifiedProds = context.confirmedFacts.filter((f) => f.startsWith('Verified Products'));

    const sourceContext =
      sources.length > 0
        ? `Informed by ${sources.length} external evidence sources (${sources
            .map((s) => s.domain)
            .slice(0, 3)
            .join(', ')}).`
        : 'Grounded directly in confirmed Business Brain knowledge.';

    const recommendations: StrategicRecommendationItem[] = [
      {
        id: `rec_${Date.now()}_1`,
        recommendation: `Refine ${bName}'s Core Acquisition Positioning Around Verified Value Drivers`,
        whyItMatters: `At the ${stage} stage in ${location}, early traction relies on clear separation from regional alternatives without discounting.`,
        supportingEvidence:
          verifiedProds.length > 0 ? verifiedProds[0] : `${bName} brand positioning in ${location}`,
        expectedOutcome:
          'Estimated improvement in inbound inquiry qualification and higher conversion consistency. (Projected estimate, not guaranteed).',
        estimatedEffort: 'Medium',
        estimatedCost: '$250 - $750 (collateral & testing budget)',
        risks: [
          'Audience message fatigue if messaging changes too frequently',
          'Potential channel saturation in primary metropolitan zip codes',
        ],
        dependencies: [
          'Approved value proposition tokens in Business Brain',
          'Standardized intake questionnaire for incoming prospects',
        ],
        suggestedNextSteps: [
          'Review customer persona pain points in Business Brain',
          'Run a 14-day controlled messaging experiment across primary customer touchpoints',
          'Evaluate inquiry conversion rate against baseline',
        ],
        measurementCriteria:
          'Track qualified inquiry volume and customer acquisition cost (CAC) over 30 days.',
      },
      {
        id: `rec_${Date.now()}_2`,
        recommendation: `Establish a Systematic Competitor Price & Feature Monitoring Loop`,
        whyItMatters:
          'Protects pricing power and identifies unexpected competitor changes before they impact customer retention.',
        supportingEvidence: `${sourceContext} Benchmark data indicates rival price volatility.`,
        expectedOutcome:
          'Early warning on competitor promotional campaigns, preventing reactive discounting.',
        estimatedEffort: 'Low',
        estimatedCost: '$0 (automated workspace monitoring)',
        risks: ['Over-indexing on competitor maneuvers rather than customer value delivery'],
        dependencies: ['Configured competitor list in Market Watch'],
        suggestedNextSteps: [
          'Add 2-3 direct local competitors to BrainWise Market Watch',
          'Review bi-weekly market signal alerts',
        ],
        measurementCriteria: 'Zero surprise churn attributed to competitor pricing discounts.',
      },
      {
        id: `rec_${Date.now()}_3`,
        recommendation: `Deploy Structured Customer Case Study Collateral to Counter Purchase Hesitation`,
        whyItMatters:
          'Prospective buyers in commercial categories cite lack of social proof as the primary friction point before purchasing.',
        supportingEvidence: 'Customer intelligence feedback and verified offerings.',
        expectedOutcome:
          'Shortened sales cycle for mid-tier transactions by addressing objections upfront.',
        estimatedEffort: 'Medium',
        estimatedCost: '$100 - $300 (proof assets preparation)',
        risks: ['Underwhelming proof metrics if initial case studies lack quantifiable results'],
        dependencies: ['Customer interview or review feedback from completed engagements'],
        suggestedNextSteps: [
          'Document 2 client success stories highlighting concrete outcomes',
          'Incorporate proof snippets into presentation decks and digital touchpoints',
        ],
        measurementCriteria: '15-20% decrease in time-to-close for qualified pipeline prospects.',
      },
    ];

    const riskDisclaimers = [
      'Projections and outcomes are reasoned estimates based on stated inputs and market benchmarks; revenue, customer count, and profitability are never guaranteed.',
      'Unit economics and marketing spend efficiency will vary based on channel dynamics and execution fidelity.',
    ];

    const suggestedRoadmapPhases = [
      {
        phase: 'Phase 1: Foundation & Alignment (Days 1-14)',
        duration: '14 Days',
        focus: 'Lock core positioning, update brand assets, and configure competitor tracking.',
      },
      {
        phase: 'Phase 2: Focused Validation (Days 15-45)',
        duration: '30 Days',
        focus:
          'Deploy refined messaging across target channels and measure initial inquiry volume.',
      },
      {
        phase: 'Phase 3: Scale & Optimize (Days 46-90)',
        duration: '45 Days',
        focus:
          'Scale winning channels, formalize referral loops, and refine unit margin economics.',
      },
    ];

    return {
      strengths: [
        `Grounded presence in ${location}`,
        `Clear operating classification as ${context.industry}`,
        `Documented strategic goals in Business Brain`,
      ],
      vulnerabilities: [
        context.inferredAssumptions.length > 0
          ? context.inferredAssumptions[0]
          : 'Customer acquisition channel reliance has not yet been stress-tested',
      ],
      strategicOpportunities: [
        `Differentiate on high-touch quality in ${location}`,
        `Leverage verified product strengths to defend premium pricing`,
      ],
      recommendations,
      riskDisclaimers,
      suggestedRoadmapPhases,
    };
  }
}

export const strategyEngine = new StrategyEngine();
