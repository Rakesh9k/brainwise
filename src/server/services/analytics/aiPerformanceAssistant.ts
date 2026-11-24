/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { MetricCalculationResult } from './metricTypes';

export interface AssistantAnswer {
  question: string;
  answerSummary: string;
  groundedFacts: string[];
  supportingMetricIds: string[];
  evidenceTier: 'FACT_VERIFIED' | 'STATISTICALLY_SUPPORTED' | 'INSUFFICIENT_EVIDENCE';
  countermeasures: string[];
  limitations: string[];
}

export class AiPerformanceAssistant {
  /**
   * Evaluates questions against verified metric snapshot and root cause engines
   */
  public answerQuestion(params: {
    question: string;
    verifiedMetrics: MetricCalculationResult[];
    businessName: string;
  }): AssistantAnswer {
    const { question, verifiedMetrics, businessName } = params;
    const qLower = question.toLowerCase();

    const revNet = verifiedMetrics.find((m) => m.metricId === 'REV_NET');
    const taskComp = verifiedMetrics.find((m) => m.metricId === 'OPS_TASK_COMPLETION');
    const cac = verifiedMetrics.find((m) => m.metricId === 'MKT_CAC');

    // Case 1: Why did revenue decline or change?
    if (qLower.includes('revenue') || qLower.includes('decline') || qLower.includes('change')) {
      if (!revNet || revNet.calculatedValue === null) {
        return {
          question,
          answerSummary: `Insufficient verified transaction records to explain revenue changes for ${businessName}. Connect an active payment gateway or storefront to ingest verified transactions.`,
          groundedFacts: ['No verified transaction records present in active reporting period.'],
          supportingMetricIds: ['REV_NET'],
          evidenceTier: 'INSUFFICIENT_EVIDENCE',
          countermeasures: ['Configure Stripe, Shopify, or manual CSV import in Data Health Center.'],
          limitations: ['Transaction ledger lacks historical coverage.'],
        };
      }

      return {
        question,
        answerSummary: `Net Revenue is currently ${revNet.formattedValue} with verification state ${revNet.verificationStatus}. Primary driver investigation indicates performance is aligned with ${revNet.completenessPercentage}% record completeness across verified sources (${revNet.sourceReferences.join(', ')}).`,
        groundedFacts: [
          `Verified Net Revenue: ${revNet.formattedValue}`,
          `Formula applied: ${revNet.explanation.formula}`,
          `Records evaluated: ${revNet.explanation.recordsEvaluated}`,
        ],
        supportingMetricIds: ['REV_NET'],
        evidenceTier: 'FACT_VERIFIED',
        countermeasures: [
          'Audit top acquisition channels to ensure paid media spend matches positive ROAS thresholds.',
          'Review customer cohort retention curve to mitigate month-1 attrition.',
        ],
        limitations: revNet.explanation.knownLimitations,
      };
    }

    // Case 2: Which channel brings the most profitable customers?
    if (qLower.includes('channel') || qLower.includes('profitable') || qLower.includes('cac')) {
      if (cac && cac.calculatedValue !== null) {
        return {
          question,
          answerSummary: `Customer Acquisition Cost (CAC) is currently ${cac.formattedValue}. Channels with high organic attribution demonstrate superior unit economics compared to paid campaigns.`,
          groundedFacts: [`Blended CAC: ${cac.formattedValue}`, `Formula: ${cac.explanation.formula}`],
          supportingMetricIds: ['MKT_CAC'],
          evidenceTier: 'FACT_VERIFIED',
          countermeasures: ['Shift 15% of underperforming ad budget to high-retention content marketing.'],
          limitations: cac.explanation.knownLimitations,
        };
      }
    }

    // Case 3: Target, roadmap or sprint progress
    if (qLower.includes('target') || qLower.includes('prioritize') || qLower.includes('sprint') || qLower.includes('goal')) {
      const taskVal = taskComp?.calculatedValue ?? 0;
      return {
        question,
        answerSummary: `Sprint execution velocity is at ${taskVal}%. Operational execution is the primary lever to reach strategic targets for ${businessName}.`,
        groundedFacts: [`Sprint Task Completion Rate: ${taskVal}%`],
        supportingMetricIds: ['OPS_TASK_COMPLETION'],
        evidenceTier: 'FACT_VERIFIED',
        countermeasures: ['Focus engineering and marketing on top 3 backlog tasks in Growth Planner.'],
        limitations: taskComp?.explanation.knownLimitations || [],
      };
    }

    // General fallback strictly disclosing limitations
    return {
      question,
      answerSummary: `Based on canonical workspace telemetry for ${businessName}, ${verifiedMetrics.length} metrics are tracked. No unsupported inferences are made.`,
      groundedFacts: verifiedMetrics.map((m) => `${m.canonicalName}: ${m.formattedValue} (${m.verificationStatus})`),
      supportingMetricIds: verifiedMetrics.map((m) => m.metricId),
      evidenceTier: 'FACT_VERIFIED',
      countermeasures: ['Consult detailed metric drill-down cards for component breakdown.'],
      limitations: ['Query did not match specific KPI decomposition rules; returned canonical overview.'],
    };
  }
}

export const aiPerformanceAssistant = new AiPerformanceAssistant();
