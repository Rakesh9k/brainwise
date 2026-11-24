/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  AssembledGrowthContext,
  GrowthBottleneckDiagnosis,
} from './growthTypes';

export class GrowthDiagnosisEngine {
  /**
   * Diagnoses growth constraints deterministically from real business context, goals, and metrics
   */
  public diagnoseBottlenecks(
    context: AssembledGrowthContext,
    metrics?: {
      monthlyVisitors?: number;
      signupsOrLeads?: number;
      payingCustomers?: number;
      trackedConversionRate?: number;
      retentionRate90Day?: number;
      currentCac?: number;
      currentLtv?: number;
    }
  ): GrowthBottleneckDiagnosis[] {
    const diagnoses: GrowthBottleneckDiagnosis[] = [];
    const timestamp = Date.now();

    const { stage, unitEconomics, activeGoals, nearestCompetitor } = context;

    // -------------------------------------------------------------------------
    // Rule 1: Idea / Pre-Launch Stage Bottleneck (Demand Validation & Awareness)
    // -------------------------------------------------------------------------
    if (stage === 'Idea Stage' || stage === 'Pre-Launch') {
      const revenueGoals = activeGoals.filter((g) => g.category.toLowerCase().includes('revenue'));
      diagnoses.push({
        diagnosisId: `diag_${timestamp}_1`,
        dimension: 'AWARENESS',
        problem: `Unvalidated customer demand and zero initial distribution for ${context.businessName}.`,
        supportingEvidence: [
          `Business is classified at '${stage}'.`,
          `No recorded customer conversions or paying user base in Business Brain.`,
          `Initial distribution channels have not yet achieved measured reply or acquisition rates.`,
        ],
        affectedGoalIds: revenueGoals.map((g) => g.goalId),
        likelyCauses: [
          'Pre-launch proposition has not been tested with direct outbound ICP outreach.',
          'Value proposition lacks transparent, mathematically proven pricing wedge vs incumbents.',
        ],
        alternativeExplanations: [
          'Target audience definition might be too broad to achieve immediate outbound response.',
        ],
        severity: 'CRITICAL',
        confidence: 0.95,
        businessImpact:
          'High risk of building features without validated willingness-to-pay from target buyers.',
        classification: 'CONFIRMED_BOTTLENECK',
        recommendedInvestigation:
          'Conduct 20 direct founder interviews and 50 targeted outbound messages to validate willingness to pay before committing budget.',
        recommendedCorrectiveAction:
          'Deploy an immediate 7-day outbound validation sprint focused on problem-solution resonance.',
      });
    }

    // -------------------------------------------------------------------------
    // Rule 2: Conversion Bottleneck (ONLY when conversion data is genuinely tracked)
    // -------------------------------------------------------------------------
    if (metrics?.trackedConversionRate !== undefined && metrics?.monthlyVisitors !== undefined) {
      if (metrics.monthlyVisitors > 500 && metrics.trackedConversionRate < 2.0) {
        diagnoses.push({
          diagnosisId: `diag_${timestamp}_2`,
          dimension: 'CONVERSION',
          problem: `Landing page conversion rate (${metrics.trackedConversionRate}%) is underperforming baseline benchmark (2.5% - 4.0%).`,
          supportingEvidence: [
            `Tracked ${metrics.monthlyVisitors} monthly visitors with only ${metrics.signupsOrLeads || 0} conversions.`,
            `Observed conversion rate: ${metrics.trackedConversionRate}%.`,
          ],
          affectedGoalIds: activeGoals.map((g) => g.goalId),
          likelyCauses: [
            'Checkout and landing page lack transparent proof badges and evidence verification.',
            'Audience traffic quality from current acquisition channels is unaligned with high-intent buyers.',
          ],
          alternativeExplanations: [
            'Pricing tier card structure creates cognitive friction or unaddressed objections.',
          ],
          severity: 'HIGH',
          confidence: 0.88,
          businessImpact:
            'Leads to inflated effective customer acquisition costs and wasted top-of-funnel traffic.',
          classification: 'CONFIRMED_BOTTLENECK',
          recommendedInvestigation:
            'Inspect user session drop-offs at the pricing tier decision point and survey bounce reasons.',
          recommendedCorrectiveAction:
            'Deploy Evidence Badges and side-by-side pricing calculation comparisons on checkout pages.',
        });
      }
    } else if (stage === 'Early Traction' || stage === 'Growing Business') {
      // Data unavailable for conversion: Must report INSUFFICIENT_EVIDENCE
      diagnoses.push({
        diagnosisId: `diag_${timestamp}_conv_insufficient`,
        dimension: 'CONVERSION',
        problem: 'Conversion efficiency cannot be verified due to lack of instrumented funnel analytics.',
        supportingEvidence: [
          'No direct funnel tracking or checkout telemetry connected to Business Brain.',
        ],
        affectedGoalIds: activeGoals.map((g) => g.goalId),
        likelyCauses: ['Funnel analytics instrumentation has not been deployed.'],
        alternativeExplanations: ['Traffic may be occurring across unmonitored external channels.'],
        severity: 'MEDIUM',
        confidence: 0.4,
        businessImpact:
          'Prevents reliable diagnosis of conversion friction vs top-of-funnel awareness deficits.',
        classification: 'INSUFFICIENT_EVIDENCE',
        recommendedInvestigation:
          'Instrument step-by-step funnel telemetry across landing page and checkout actions.',
        recommendedCorrectiveAction:
          'Deploy basic conversion instrumentation before increasing external marketing spend.',
      });
    }

    // -------------------------------------------------------------------------
    // Rule 3: Unit Economics & CAC vs LTV Ratio
    // -------------------------------------------------------------------------
    const estimatedCac = metrics?.currentCac || unitEconomics.customerAcquisitionCost;
    const estimatedLtv = metrics?.currentLtv || unitEconomics.customerLifetimeValue;
    const ltvCacRatio = estimatedLtv / Math.max(1, estimatedCac);

    if (ltvCacRatio < 3.0 && estimatedCac > 0) {
      diagnoses.push({
        diagnosisId: `diag_${timestamp}_3`,
        dimension: 'CAC',
        problem: `LTV to CAC ratio (${ltvCacRatio.toFixed(2)}x) is below the sustainable threshold of 3.0x.`,
        supportingEvidence: [
          `Estimated Customer Lifetime Value: ${unitEconomics.currency} ${estimatedLtv}.`,
          `Estimated Customer Acquisition Cost: ${unitEconomics.currency} ${estimatedCac}.`,
          `Ratio is ${(ltvCacRatio).toFixed(2)}x (Target: >= 3.0x).`,
        ],
        affectedGoalIds: activeGoals.filter((g) => g.category.toLowerCase().includes('cac') || g.category.toLowerCase().includes('revenue')).map((g) => g.goalId),
        likelyCauses: [
          'Heavy reliance on unoptimized or competitive paid channels.',
          'Absence of organic referral loops or founder advocacy velocity.',
        ],
        alternativeExplanations: [
          'Early customer cohort sample size is too small to establish steady-state LTV.',
        ],
        severity: 'HIGH',
        confidence: 0.82,
        businessImpact:
          'Erodes gross margin and limits capital efficiency during business scaling.',
        classification: 'PROBABLE_BOTTLENECK',
        recommendedInvestigation:
          'Audit channel-by-channel blended CAC and calculate 60-day payback period.',
        recommendedCorrectiveAction:
          `Target ${nearestCompetitor} whitespace via organic static carousels and two-sided referral incentives.`,
      });
    }

    // -------------------------------------------------------------------------
    // Rule 4: Operational Capacity Constraint
    // -------------------------------------------------------------------------
    if (context.founderCapacityHoursWeekly < 20) {
      diagnoses.push({
        diagnosisId: `diag_${timestamp}_4`,
        dimension: 'OPERATIONAL_CAPACITY',
        problem: `Founder execution capacity is constrained to ${context.founderCapacityHoursWeekly} hours/week.`,
        supportingEvidence: [
          `Self-reported weekly founder capacity is ${context.founderCapacityHoursWeekly} hours.`,
          `Pending strategic tasks require focused execution bandwidth.`,
        ],
        affectedGoalIds: activeGoals.map((g) => g.goalId),
        likelyCauses: [
          'Founder split across multiple operational, product, and client support commitments.',
        ],
        alternativeExplanations: [
          'Current task backlog contains low-leverage activities that could be automated or postponed.',
        ],
        severity: 'MEDIUM',
        confidence: 0.9,
        businessImpact:
          'Execution delays across 30-day and 90-day operational roadmaps.',
        classification: 'CONFIRMED_BOTTLENECK',
        recommendedInvestigation:
          'Conduct a task audit to identify low-leverage repetitive activities for postponement.',
        recommendedCorrectiveAction:
          'Enforce strict Focus Sprint limit (max 3 high-impact tasks/day) and reject non-core collateral.',
      });
    }

    // Ensure at least one diagnosis is always generated
    if (diagnoses.length === 0) {
      diagnoses.push({
        diagnosisId: `diag_${timestamp}_default`,
        dimension: 'AWARENESS',
        problem: `Market whitespace exploration required to expand qualified inbound pipeline.`,
        supportingEvidence: [
          `Active operations across ${context.businessName}.`,
          `Growth targets require systematic multi-channel expansion.`,
        ],
        affectedGoalIds: activeGoals.map((g) => g.goalId),
        likelyCauses: ['Inbound pipeline requires diversification across verified outbound channels.'],
        alternativeExplanations: ['Seasonal industry fluctuations.'],
        severity: 'LOW',
        confidence: 0.7,
        businessImpact: 'Steady growth but potential vulnerability to single-channel saturation.',
        classification: 'POTENTIAL_BOTTLENECK',
        recommendedInvestigation: 'Monitor competitor positioning changes in Competitive Radar.',
        recommendedCorrectiveAction: 'Test structured experiments across 2 distinct acquisition channels.',
      });
    }

    return diagnoses;
  }
}

export const growthDiagnosisEngine = new GrowthDiagnosisEngine();
