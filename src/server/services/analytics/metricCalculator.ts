/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { metricRegistry } from './metricRegistry';
import type {
  MetricCalculationInputRecord,
  MetricCalculationResult,
  MetricExclusionRecord,
  MetricState,
} from './metricTypes';

export class MetricCalculator {
  /**
   * Safely formats a numeric value according to its unit and currency
   */
  public static formatValue(value: number | null, unit: string, currency: string = 'USD'): string {
    if (value === null || value === undefined) return 'N/A';
    switch (unit) {
      case 'CURRENCY': {
        const symbol = currency === 'INR' ? '₹' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
        return `${symbol}${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
      case 'PERCENTAGE':
        return `${value.toFixed(1)}%`;
      case 'RATIO':
        return `${value.toFixed(2)}x`;
      case 'DAYS':
        return `${value.toFixed(0)} days`;
      case 'MONTHS':
        return `${value.toFixed(1)} mos`;
      case 'SCORE_100':
        return `${value.toFixed(0)} / 100`;
      case 'COUNT':
      default:
        return value.toLocaleString('en-US');
    }
  }

  /**
   * Decimal-safe rounding to prevent IEEE 754 precision issues
   */
  public static round(val: number, decimals: number = 2): number {
    const factor = Math.pow(10, decimals);
    return Math.round((val + Number.EPSILON) * factor) / factor;
  }

  /**
   * Calculates a ratio safely: if denominator is 0, undefined, or negative when forbidden,
   * returns null rather than NaN or Infinity.
   */
  public static safeRatio(
    numerator: number | null | undefined,
    denominator: number | null | undefined,
    multiplier: number = 1
  ): number | null {
    if (numerator === null || numerator === undefined) return null;
    if (denominator === null || denominator === undefined || denominator === 0) return null;
    return this.round((numerator / denominator) * multiplier, 4);
  }

  /**
   * Calculates a single metric deterministically based on registry definition
   */
  public calculateMetric(params: {
    metricId: string;
    records?: MetricCalculationInputRecord[];
    directNumerator?: number | null;
    directDenominator?: number | null;
    directValue?: number | null;
    currency?: string;
    reportingPeriod: {
      startDate: string;
      endDate: string;
      timeZone?: string;
    };
    sourceDataTimestamp?: string;
    assumptions?: string[];
  }): MetricCalculationResult {
    const {
      metricId,
      records = [],
      directNumerator,
      directDenominator,
      directValue,
      currency = 'USD',
      reportingPeriod,
      sourceDataTimestamp = null,
      assumptions = [],
    } = params;

    const def = metricRegistry.get(metricId);
    if (!def) {
      throw new Error(`METRIC_ERROR: Metric ID ${metricId} not found in registry.`);
    }

    const calcTime = new Date().toISOString();
    const tz = reportingPeriod.timeZone || 'UTC';
    const exclusions: MetricExclusionRecord[] = [];
    const validRecords: MetricCalculationInputRecord[] = [];

    // Filter and audit input records
    for (const rec of records) {
      if (rec.isDuplicate) {
        exclusions.push({
          recordId: rec.recordId,
          reason: 'Duplicate record hash detected in deduplication index',
          source: rec.source,
          timestamp: rec.timestamp,
        });
        continue;
      }
      if (rec.status && ['CANCELLED', 'VOID', 'FAILED'].includes(rec.status.toUpperCase())) {
        exclusions.push({
          recordId: rec.recordId,
          reason: `Record status was ${rec.status}`,
          source: rec.source,
          timestamp: rec.timestamp,
        });
        continue;
      }
      if (rec.timestamp < reportingPeriod.startDate || rec.timestamp > reportingPeriod.endDate) {
        exclusions.push({
          recordId: rec.recordId,
          reason: `Timestamp ${rec.timestamp} outside reporting window [${reportingPeriod.startDate} - ${reportingPeriod.endDate}]`,
          source: rec.source,
          timestamp: rec.timestamp,
        });
        continue;
      }
      validRecords.push(rec);
    }

    let calculatedValue: number | null = null;
    let numVal: number | null = directNumerator ?? null;
    let denVal: number | null = directDenominator ?? null;
    const knownLimitations: string[] = [];

    // Check currency requirement
    if (def.validationRules.currencyMandatory && !currency) {
      knownLimitations.push('Currency is mandatory for this financial metric but was not supplied.');
    }

    // Branch 1: Computed from records
    if (records.length > 0) {
      if (def.aggregationMethodology === 'SUM') {
        let sum = 0;
        for (const r of validRecords) {
          const amt = r.amount ?? 0;
          if (r.isRefund) {
            sum -= amt;
          } else {
            sum += amt;
          }
        }
        calculatedValue = MetricCalculator.round(sum, 2);
      } else if (def.aggregationMethodology === 'AVERAGE') {
        if (validRecords.length > 0) {
          const sum = validRecords.reduce((acc, r) => acc + (r.amount ?? 0), 0);
          calculatedValue = MetricCalculator.round(sum / validRecords.length, 2);
        } else {
          calculatedValue = null;
        }
      } else if (def.aggregationMethodology === 'RATIO') {
        const positiveNumeratorCount = validRecords.filter((r) => (r.amount ?? 0) > 0).length;
        numVal = numVal ?? positiveNumeratorCount;
        denVal = denVal ?? validRecords.length;
        calculatedValue = MetricCalculator.safeRatio(numVal, denVal, def.unit === 'PERCENTAGE' ? 100 : 1);
      }
    } else if (directValue !== undefined && directValue !== null) {
      // Branch 2: Direct value provided
      calculatedValue = MetricCalculator.round(directValue, 4);
    } else if (numVal !== null && denVal !== null) {
      // Branch 3: Direct numerator & denominator provided
      if (denVal === 0 && def.validationRules.requiresPositiveDenominator) {
        knownLimitations.push('Denominator was zero; ratio computation aborted to avoid division by zero.');
        calculatedValue = null;
      } else {
        calculatedValue = MetricCalculator.safeRatio(numVal, denVal, def.unit === 'PERCENTAGE' ? 100 : 1);
      }
    }

    // Determine verification status
    let verificationStatus: MetricState = 'VERIFIED';

    if (calculatedValue === null) {
      verificationStatus = 'INSUFFICIENT_DATA';
      knownLimitations.push('Missing essential numerator, denominator, or record data.');
    } else {
      // Validate boundaries
      if (def.validationRules.minPossible !== undefined && calculatedValue < def.validationRules.minPossible) {
        verificationStatus = 'INVALID';
        knownLimitations.push(`Value ${calculatedValue} violated min boundary ${def.validationRules.minPossible}`);
      }
      if (def.validationRules.maxPossible !== undefined && calculatedValue > def.validationRules.maxPossible) {
        verificationStatus = 'INVALID';
        knownLimitations.push(`Value ${calculatedValue} violated max boundary ${def.validationRules.maxPossible}`);
      }
    }

    // Freshness check
    let freshnessHours: number | null = null;
    if (sourceDataTimestamp) {
      freshnessHours = MetricCalculator.round(
        (new Date(calcTime).getTime() - new Date(sourceDataTimestamp).getTime()) / (1000 * 60 * 60),
        1
      );
      if (freshnessHours > def.freshnessMaxHours && verificationStatus === 'VERIFIED') {
        verificationStatus = 'STALE';
        knownLimitations.push(`Data freshness (${freshnessHours}h) exceeds maximum allowed SLA (${def.freshnessMaxHours}h).`);
      }
    }

    if (assumptions.length > 0 && verificationStatus === 'VERIFIED') {
      verificationStatus = 'ESTIMATED';
    }

    const completenessPercentage =
      records.length > 0
        ? MetricCalculator.round((validRecords.length / records.length) * 100, 1)
        : calculatedValue !== null
          ? 100
          : 0;

    const sourceRefs = Array.from(new Set(records.map((r) => r.source))).filter(Boolean);
    if (sourceRefs.length === 0) {
      sourceRefs.push(...def.sourceRequirements);
    }

    return {
      metricId: def.metricId,
      canonicalName: def.canonicalName,
      calculatedValue,
      formattedValue: MetricCalculator.formatValue(calculatedValue, def.unit, currency),
      unit: def.unit,
      currency: def.unit === 'CURRENCY' ? currency : undefined,
      reportingPeriod: {
        startDate: reportingPeriod.startDate,
        endDate: reportingPeriod.endDate,
        timeZone: tz,
      },
      sourceReferences: sourceRefs,
      formulaVersion: def.formulaVersion,
      calculationTimestamp: calcTime,
      sourceDataTimestamp,
      completenessPercentage,
      freshnessHours,
      verificationStatus,
      explanation: {
        whatItMeasures: def.description,
        formula: def.formula,
        numeratorValue: numVal,
        denominatorValue: denVal,
        recordsEvaluated: records.length,
        recordsIncluded: validRecords.length,
        recordsExcluded: exclusions.length,
        exclusions,
        assumptionsApplied: assumptions,
        isActual: verificationStatus === 'VERIFIED',
        knownLimitations,
        lastUpdated: calcTime,
      },
    };
  }
}

export const metricCalculator = new MetricCalculator();
