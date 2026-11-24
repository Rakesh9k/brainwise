/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ContradictionReport, EvidenceFinding } from '../types/evidence';

export class ContradictionDetectionEngine {
  /**
   * Authority weight hierarchy for source types
   * Higher number = higher credibility weighting
   */
  private static readonly SOURCE_CREDIBILITY_SCORES: Record<string, number> = {
    GOVERNMENT_PUBLICATION: 0.95,
    REGULATORY_SOURCE: 0.95,
    OFFICIAL_WEBSITE: 0.9,
    INDUSTRY_REPORT: 0.85,
    PUBLIC_MARKET_DATA: 0.8,
    PRODUCT_DOCUMENTATION: 0.8,
    NEWS_PUBLICATION: 0.7,
    PUBLIC_DIRECTORY: 0.6,
    CUSTOMER_REVIEWS: 0.55,
    COMMUNITY_DISCUSSION: 0.5,
    SEARCH_RESULTS: 0.5,
  };

  /**
   * Reconciles multiple findings for a specific topic or metric,
   * detecting disagreements in values, dates, geographic scopes, or methodology.
   */
  public analyzeDiscrepancies(params: {
    topic: string;
    metricOrClaim: string;
    findings: EvidenceFinding[];
  }): ContradictionReport {
    const { topic, metricOrClaim, findings } = params;

    if (!findings || findings.length <= 1) {
      return {
        topic,
        metricOrClaim,
        hasContradiction: false,
        conflictingFindings: findings || [],
        dateComparison: {},
        credibilityComparison: {
          explanation: findings.length === 1 ? 'Single source provided; corroboration recommended.' : 'No sources provided.',
        },
        reconciliationVerdict: findings.length === 1 ? 'Accepted on single-source basis.' : 'Insufficient data.',
        recommendedPresentation: 'PRESENT_RANGE',
      };
    }

    // 1. Extract numeric values if present in claims/metrics
    const extractedValues = findings.map((f) => ({
      finding: f,
      numericValue: this.parseNumericMetric(f.extractedEvidence) ?? this.parseNumericMetric(f.quoteOrSummary),
      credibility: ContradictionDetectionEngine.SOURCE_CREDIBILITY_SCORES[f.sourceType] ?? 0.5,
    }));

    // Check for numeric divergence (e.g., >25% delta between values)
    const validNumeric = extractedValues.filter((v) => v.numericValue !== null) as Array<{
      finding: EvidenceFinding;
      numericValue: number;
      credibility: number;
    }>;

    let hasNumericConflict = false;
    if (validNumeric.length >= 2) {
      const minVal = Math.min(...validNumeric.map((v) => v.numericValue));
      const maxVal = Math.max(...validNumeric.map((v) => v.numericValue));
      if (minVal > 0 && (maxVal - minVal) / minVal > 0.25) {
        hasNumericConflict = true;
      }
    }

    // 2. Geographic variation check
    const geos = Array.from(new Set(findings.map((f) => f.geographicRelevance.toUpperCase())));
    let geographicDifference: ContradictionReport['geographicDifference'] = undefined;
    if (geos.length > 1) {
      const findingA = findings[0];
      const findingB = findings.find((f) => f.geographicRelevance.toUpperCase() !== findingA.geographicRelevance.toUpperCase())!;
      geographicDifference = {
        findingIdA: findingA.findingId,
        geoA: findingA.geographicRelevance,
        findingIdB: findingB.findingId,
        geoB: findingB.geographicRelevance,
        explanation: `Findings measure different geographic boundaries (${findingA.geographicRelevance} vs. ${findingB.geographicRelevance}). Numerical differences likely reflect market territory rather than measurement error.`,
      };
    }

    // 3. Publication Date Comparison
    const sortedByDate = [...findings]
      .filter((f) => Boolean(f.publicationDate))
      .sort((a, b) => new Date(b.publicationDate!).getTime() - new Date(a.publicationDate!).getTime());

    const dateComparison: ContradictionReport['dateComparison'] = {};
    if (sortedByDate.length > 0) {
      dateComparison.newestDate = sortedByDate[0].publicationDate;
      dateComparison.oldestDate = sortedByDate[sortedByDate.length - 1].publicationDate;
      dateComparison.recencyAdvantageFindingId = sortedByDate[0].findingId;
    }

    // 4. Credibility Comparison
    const sortedByCredibility = [...extractedValues].sort((a, b) => b.credibility - a.credibility);
    const highestCred = sortedByCredibility[0];
    const credibilityExplanation = `Highest authority source is "${highestCred.finding.sourceTitle}" (${highestCred.finding.sourceType}) with credibility score ${(highestCred.credibility * 100).toFixed(0)}%.`;

    // 5. Contradiction Detection Evaluation
    const hasContradiction = hasNumericConflict || Boolean(geographicDifference && hasNumericConflict);

    let reconciliationVerdict: string;
    let recommendedPresentation: ContradictionReport['recommendedPresentation'];

    if (!hasContradiction) {
      reconciliationVerdict = 'Sources corroborate closely within expected variance.';
      recommendedPresentation = 'PREFER_AUTHORITATIVE';
    } else if (geographicDifference) {
      reconciliationVerdict = `Apparent discrepancy is explained by geographic scope divergence: ${geographicDifference.geoA} vs ${geographicDifference.geoB}.`;
      recommendedPresentation = 'FLAG_DISAGREEMENT';
    } else if (
      dateComparison.newestDate &&
      dateComparison.oldestDate &&
      new Date(dateComparison.newestDate).getFullYear() > new Date(dateComparison.oldestDate).getFullYear()
    ) {
      reconciliationVerdict = `Temporal variance detected. Newer report (${dateComparison.newestDate}) reflects updated market conditions over earlier report (${dateComparison.oldestDate}).`;
      recommendedPresentation = 'PREFER_NEWER';
    } else {
      reconciliationVerdict = `Conflicting claims detected between sources. Highest authority source is preferred, but uncertainty must be explicitly communicated.`;
      recommendedPresentation = 'FLAG_DISAGREEMENT';
    }

    return {
      topic,
      metricOrClaim,
      hasContradiction,
      conflictingFindings: hasContradiction ? findings : [],
      dateComparison,
      credibilityComparison: {
        highestCredibilityFindingId: highestCred.finding.findingId,
        explanation: credibilityExplanation,
      },
      geographicDifference,
      reconciliationVerdict,
      recommendedPresentation,
    };
  }

  /**
   * Helper to parse monetary amounts or numbers from text
   */
  private parseNumericMetric(text?: string): number | null {
    if (!text) return null;
    // Matches patterns like $10.5B, ₹12,000 Cr, 45%, 150000
    const clean = text.replace(/,/g, '');
    const croreMatch = clean.match(/₹?\s*([0-9.]+)\s*(?:cr|crore)/i);
    if (croreMatch) return parseFloat(croreMatch[1]) * 10000000;

    const billionMatch = clean.match(/\$?\s*([0-9.]+)\s*(?:b|billion)/i);
    if (billionMatch) return parseFloat(billionMatch[1]) * 1000000000;

    const millionMatch = clean.match(/\$?\s*([0-9.]+)\s*(?:m|million)/i);
    if (millionMatch) return parseFloat(millionMatch[1]) * 1000000;

    const numMatch = clean.match(/([0-9.]+)/);
    return numMatch ? parseFloat(numMatch[1]) : null;
  }
}

export const contradictionDetectionEngine = new ContradictionDetectionEngine();
