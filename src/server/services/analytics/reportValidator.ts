/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { MetricCalculationResult } from './metricTypes';

export interface ReportValidationResult {
  isValid: boolean;
  claimsAuditedCount: number;
  unsupportedClaims: Array<{
    claimText: string;
    assertedNumber: number;
    reason: string;
  }>;
  groundedMetricsCount: number;
  validationTimestamp: string;
}

export class ReportValidator {
  /**
   * Scans narrative text for numerical statements and validates them against the canonical metric snapshot.
   * Rejects narratives containing fabricated or unsupported numerical assertions.
   */
  public validateReportNarrative(params: {
    narrativeText: string;
    verifiedMetrics: MetricCalculationResult[];
    toleranceMarginPercent?: number; // allow small rounding differences (e.g. 1%)
  }): ReportValidationResult {
    const { narrativeText, verifiedMetrics, toleranceMarginPercent = 1.0 } = params;
    const now = new Date().toISOString();

    // Extract verified numbers from canonical metric snapshot
    const knownValues: Array<{ metricId: string; value: number }> = [];
    for (const m of verifiedMetrics) {
      if (m.calculatedValue !== null) {
        knownValues.push({ metricId: m.metricId, value: m.calculatedValue });
      }
    }

    // Regex to extract numbers with optional currency symbols, commas, or percent signs
    // e.g. "$1,680", "18.3%", "4,200", "36.0%"
    const numberRegex = /(?:[$₹€£])?(\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)\s*(%|x|k|m)?/gi;
    const matches = Array.from(narrativeText.matchAll(numberRegex));

    const unsupportedClaims: Array<{
      claimText: string;
      assertedNumber: number;
      reason: string;
    }> = [];
    let groundedCount = 0;
    let claimsAuditedCount = 0;

    for (const match of matches) {
      const fullText = match[0].trim();
      const rawNumStr = match[1].replace(/,/g, '');
      let parsedNum = parseFloat(rawNumStr);
      const suffix = match[2]?.toLowerCase();

      if (isNaN(parsedNum)) continue;

      if (suffix === 'k') parsedNum *= 1000;
      if (suffix === 'm') parsedNum *= 1000000;

      // Ignore trivial small integers like (1, 2, 3, 7, 30) commonly used for days or list counts
      if (parsedNum <= 31 && !fullText.includes('%') && !fullText.includes('$') && !fullText.includes('₹')) {
        continue;
      }

      claimsAuditedCount++;

      // Check against known metric values
      const matchFound = knownValues.some((k) => {
        const diff = Math.abs(k.value - parsedNum);
        const maxDiff = Math.max(0.1, (k.value * toleranceMarginPercent) / 100);
        return diff <= maxDiff;
      });

      if (matchFound) {
        groundedCount++;
      } else {
        unsupportedClaims.push({
          claimText: fullText,
          assertedNumber: parsedNum,
          reason: `Numerical assertion '${fullText}' (${parsedNum}) does not match any verified metric in the canonical snapshot.`,
        });
      }
    }

    return {
      isValid: unsupportedClaims.length === 0,
      claimsAuditedCount,
      unsupportedClaims,
      groundedMetricsCount: groundedCount,
      validationTimestamp: now,
    };
  }
}

export const reportValidator = new ReportValidator();
