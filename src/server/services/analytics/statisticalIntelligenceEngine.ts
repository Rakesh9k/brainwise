/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MetricCalculator } from './metricCalculator';

export type ExperimentEvaluationVerdict =
  | 'POSITIVE_EVIDENCE'
  | 'NEGATIVE_EVIDENCE'
  | 'INCONCLUSIVE'
  | 'INSUFFICIENT_SAMPLE'
  | 'INVALID';

export interface ExperimentCohortInput {
  name: string;
  visitors: number;
  conversions: number;
}

export interface StatisticalTestResult {
  hypothesis: string;
  control: ExperimentCohortInput & { conversionRatePercent: number };
  variant: ExperimentCohortInput & { conversionRatePercent: number };
  absoluteDifference: number;
  relativeDifferencePercent: number;
  confidenceInterval95: [number, number]; // [lower, upper] in percentage points
  zScore: number | null;
  pValue: number | null;
  statisticalPowerPercent: number;
  minimumDetectableEffectRelativePercent: number;
  requiredSampleSizePerVariant: number;
  sampleSizeAdequate: boolean;
  bayesianProbabilityVariantBeatsControl: number;
  verdict: ExperimentEvaluationVerdict;
  assumptions: string[];
  limitations: string[];
}

export class StatisticalIntelligenceEngine {
  /**
   * Cumulative normal standard distribution approximation (Abramowitz & Stegun 7.1.26)
   */
  public static normalCdf(z: number): number {
    if (z < -8.0) return 0.0;
    if (z > 8.0) return 1.0;
    let sum = 0.0;
    let term = z;
    let i = 3;
    while (sum + term !== sum) {
      sum += term;
      term = (term * z * z) / i;
      i += 2;
    }
    return 0.5 + sum * Math.exp((-z * z) / 2) / Math.sqrt(2 * Math.PI);
  }

  /**
   * Calculates required sample size per variant for a given baseline conversion rate and desired MDE
   * Formula: n = 2 * (Z_alpha/2 + Z_beta)^2 * (p * (1 - p)) / (p * MDE)^2
   */
  public calculateRequiredSampleSize(
    baselineRate: number, // e.g. 0.05 for 5%
    mdeRelative: number = 0.2, // e.g. 0.20 for 20% relative lift
    alpha: number = 0.05,
    power: number = 0.8
  ): number {
    if (baselineRate <= 0 || baselineRate >= 1) return 1000;
    // For alpha=0.05, z_alpha = 1.96; for power=0.80, z_beta = 0.8416
    const zAlpha = alpha === 0.01 ? 2.576 : 1.96;
    const zBeta = power === 0.9 ? 1.282 : 0.8416;
    const zSumSquared = Math.pow(zAlpha + zBeta, 2);

    const variance = baselineRate * (1 - baselineRate);
    const effectDelta = baselineRate * mdeRelative;
    const n = (2 * zSumSquared * variance) / Math.pow(effectDelta, 2);

    return Math.ceil(Math.max(30, n));
  }

  /**
   * Evaluates A/B or Multivariate experiment with rigorous statistical hypothesis testing
   */
  public evaluateExperiment(params: {
    hypothesis: string;
    control: ExperimentCohortInput;
    variant: ExperimentCohortInput;
    mdeRelative?: number;
    alpha?: number;
    power?: number;
  }): StatisticalTestResult {
    const {
      hypothesis,
      control,
      variant,
      mdeRelative = 0.2,
      alpha = 0.05,
      power = 0.8,
    } = params;

    const assumptions = [
      'Independent identically distributed Bernoulli conversion trials',
      'No cross-device user contamination between control and variant buckets',
      'Fixed sample horizon without opportunistic sequential peeking',
    ];
    const limitations: string[] = [];

    // Validation checks
    if (
      control.visitors <= 0 ||
      variant.visitors <= 0 ||
      control.conversions < 0 ||
      variant.conversions < 0 ||
      control.conversions > control.visitors ||
      variant.conversions > variant.visitors
    ) {
      return {
        hypothesis,
        control: { ...control, conversionRatePercent: 0 },
        variant: { ...variant, conversionRatePercent: 0 },
        absoluteDifference: 0,
        relativeDifferencePercent: 0,
        confidenceInterval95: [0, 0],
        zScore: null,
        pValue: null,
        statisticalPowerPercent: 0,
        minimumDetectableEffectRelativePercent: mdeRelative * 100,
        requiredSampleSizePerVariant: 0,
        sampleSizeAdequate: false,
        bayesianProbabilityVariantBeatsControl: 0.5,
        verdict: 'INVALID',
        assumptions,
        limitations: ['Invalid cohort counts: conversions cannot exceed visitors or be negative.'],
      };
    }

    const pControl = control.conversions / control.visitors;
    const pVariant = variant.conversions / variant.visitors;
    const absDiff = pVariant - pControl;
    const relDiff = pControl > 0 ? (absDiff / pControl) * 100 : 0;

    const requiredN = this.calculateRequiredSampleSize(Math.max(0.01, pControl), mdeRelative, alpha, power);
    const minSample = Math.min(control.visitors, variant.visitors);
    const sampleSizeAdequate = minSample >= requiredN;

    if (!sampleSizeAdequate) {
      limitations.push(
        `Current sample size (${minSample}) is below required sample threshold (${requiredN}) to reliably detect a ${Math.round(mdeRelative * 100)}% relative lift at ${Math.round(power * 100)}% power.`
      );
    }

    // Pooled proportion for two-proportion z-test
    const pooledP = (control.conversions + variant.conversions) / (control.visitors + variant.visitors);
    const sePooled = Math.sqrt(pooledP * (1 - pooledP) * (1 / control.visitors + 1 / variant.visitors));

    // Standard error for confidence interval (unpooled)
    const seUnpooled = Math.sqrt(
      (pControl * (1 - pControl)) / control.visitors + (pVariant * (1 - pVariant)) / variant.visitors
    );

    let zScore: number | null = null;
    let pValue: number | null = null;

    if (sePooled > 0) {
      zScore = absDiff / sePooled;
      const oneTail = 1 - StatisticalIntelligenceEngine.normalCdf(Math.abs(zScore));
      pValue = Math.min(1.0, 2 * oneTail);
    }

    // 95% Confidence interval for difference (percentage points)
    const zCrit = 1.96;
    const ciLower = MetricCalculator.round((absDiff - zCrit * seUnpooled) * 100, 2);
    const ciUpper = MetricCalculator.round((absDiff + zCrit * seUnpooled) * 100, 2);

    // Bayesian Beta-Binomial probability: variant > control
    // Using normal approximation of the difference of posterior beta distributions
    // Prior: Beta(1, 1) flat
    const alphaC = 1 + control.conversions;
    const betaC = 1 + control.visitors - control.conversions;
    const alphaV = 1 + variant.conversions;
    const betaV = 1 + variant.visitors - variant.conversions;

    const meanC = alphaC / (alphaC + betaC);
    const varC = (alphaC * betaC) / (Math.pow(alphaC + betaC, 2) * (alphaC + betaC + 1));
    const meanV = alphaV / (alphaV + betaV);
    const varV = (alphaV * betaV) / (Math.pow(alphaV + betaV, 2) * (alphaV + betaV + 1));

    const diffMean = meanV - meanC;
    const diffSe = Math.sqrt(varC + varV);
    const bayesianZ = diffSe > 0 ? diffMean / diffSe : 0;
    const bayesianProb = MetricCalculator.round(StatisticalIntelligenceEngine.normalCdf(bayesianZ) * 100, 1);

    // Verdict determination
    let verdict: ExperimentEvaluationVerdict = 'INCONCLUSIVE';

    if (!sampleSizeAdequate) {
      verdict = 'INSUFFICIENT_SAMPLE';
    } else if (pValue !== null && pValue < alpha) {
      if (absDiff > 0 && ciLower > 0) {
        verdict = 'POSITIVE_EVIDENCE';
      } else if (absDiff < 0 && ciUpper < 0) {
        verdict = 'NEGATIVE_EVIDENCE';
      }
    }

    return {
      hypothesis,
      control: {
        ...control,
        conversionRatePercent: MetricCalculator.round(pControl * 100, 2),
      },
      variant: {
        ...variant,
        conversionRatePercent: MetricCalculator.round(pVariant * 100, 2),
      },
      absoluteDifference: MetricCalculator.round(absDiff * 100, 2),
      relativeDifferencePercent: MetricCalculator.round(relDiff, 1),
      confidenceInterval95: [ciLower, ciUpper],
      zScore: zScore !== null ? MetricCalculator.round(zScore, 3) : null,
      pValue: pValue !== null ? MetricCalculator.round(pValue, 4) : null,
      statisticalPowerPercent: Math.round(power * 100),
      minimumDetectableEffectRelativePercent: MetricCalculator.round(mdeRelative * 100, 1),
      requiredSampleSizePerVariant: requiredN,
      sampleSizeAdequate,
      bayesianProbabilityVariantBeatsControl: bayesianProb,
      verdict,
      assumptions,
      limitations,
    };
  }

  /**
   * Outlier detection using Interquartile Range (IQR) fence rule
   */
  public detectOutliers(values: number[]): {
    cleanValues: number[];
    outliers: number[];
    q1: number;
    q3: number;
    iqr: number;
  } {
    if (values.length < 4) {
      return { cleanValues: values, outliers: [], q1: 0, q3: 0, iqr: 0 };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const lowerHalf = sorted.slice(0, mid);
    const upperHalf = sorted.length % 2 === 0 ? sorted.slice(mid) : sorted.slice(mid + 1);

    const q1 = lowerHalf[Math.floor(lowerHalf.length / 2)];
    const q3 = upperHalf[Math.floor(upperHalf.length / 2)];
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    const cleanValues: number[] = [];
    const outliers: number[] = [];

    for (const v of values) {
      if (v < lowerBound || v > upperBound) {
        outliers.push(v);
      } else {
        cleanValues.push(v);
      }
    }

    return { cleanValues, outliers, q1, q3, iqr };
  }
}

export const statisticalIntelligenceEngine = new StatisticalIntelligenceEngine();
