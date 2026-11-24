/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type BusinessModelType =
  | 'SAAS'
  | 'ECOMMERCE'
  | 'D2C_FMCG'
  | 'RESTAURANT'
  | 'SALON'
  | 'PROFESSIONAL_SERVICES'
  | 'AGENCY'
  | 'RETAIL'
  | 'STARTUP'
  | 'GENERAL';

export type MetricCategory =
  | 'FINANCIAL'
  | 'GROWTH'
  | 'MARKETING'
  | 'CUSTOMER'
  | 'OPERATIONAL'
  | 'BUSINESS_MODEL_SPECIFIC';

export type MetricUnit =
  | 'CURRENCY'
  | 'PERCENTAGE'
  | 'COUNT'
  | 'RATIO'
  | 'DAYS'
  | 'MONTHS'
  | 'SCORE_100';

export type MetricState =
  | 'VERIFIED'
  | 'PARTIALLY_VERIFIED'
  | 'ESTIMATED'
  | 'MODELED'
  | 'FORECAST'
  | 'INSUFFICIENT_DATA'
  | 'STALE'
  | 'UNAVAILABLE'
  | 'INVALID';

export type MissingDataBehavior =
  | 'PRESERVE_NULL'
  | 'FLAG_INCOMPLETE'
  | 'INTERPOLATE'
  | 'REQUIRE_EXPLICIT_ESTIMATE';

export interface MetricDefinition {
  metricId: string;
  canonicalName: string;
  description: string;
  category: MetricCategory;
  applicableBusinessModels: BusinessModelType[];
  unit: MetricUnit;
  defaultCurrency?: string;
  formula: string;
  numerator?: string;
  denominator?: string;
  aggregationMethodology: 'SUM' | 'AVERAGE' | 'WEIGHTED_AVERAGE' | 'LATEST' | 'MIN' | 'MAX' | 'RATIO';
  timeWindowRequirements: 'REALTIME' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | 'COHORT_LIFETIME';
  sourceRequirements: string[];
  inclusionCriteria: string[];
  exclusionCriteria: string[];
  missingDataBehavior: MissingDataBehavior;
  validationRules: {
    minPossible?: number;
    maxPossible?: number;
    requiresPositiveDenominator?: boolean;
    currencyMandatory?: boolean;
  };
  formulaVersion: string;
  freshnessMaxHours: number;
}

export interface MetricCalculationInputRecord {
  recordId: string;
  source: string;
  timestamp: string;
  amount?: number;
  currency?: string;
  status?: string;
  isRefund?: boolean;
  isTax?: boolean;
  isDuplicate?: boolean;
  isStale?: boolean;
  attributionChannel?: string;
  metadata?: Record<string, unknown>;
}

export interface MetricExclusionRecord {
  recordId: string;
  reason: string;
  source: string;
  timestamp: string;
}

export interface MetricCalculationResult {
  metricId: string;
  canonicalName: string;
  calculatedValue: number | null;
  formattedValue: string;
  unit: MetricUnit;
  currency?: string;
  reportingPeriod: {
    startDate: string;
    endDate: string;
    timeZone: string;
  };
  sourceReferences: string[];
  formulaVersion: string;
  calculationTimestamp: string;
  sourceDataTimestamp: string | null;
  completenessPercentage: number;
  freshnessHours: number | null;
  verificationStatus: MetricState;
  explanation: {
    whatItMeasures: string;
    formula: string;
    numeratorValue?: number | null;
    denominatorValue?: number | null;
    recordsEvaluated: number;
    recordsIncluded: number;
    recordsExcluded: number;
    exclusions: MetricExclusionRecord[];
    assumptionsApplied: string[];
    isActual: boolean;
    knownLimitations: string[];
    lastUpdated: string;
  };
}
