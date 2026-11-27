/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { businessProfileRepository } from '../../repositories/businessProfileRepository';
import { brandIdentityRepository } from '../../repositories/brandIdentityRepository';
import { businessDiagnosisEngine } from '../businessDiagnosisEngine';
import { departmentEventBus } from '../../events/eventBus';

export interface GroundedHypothesis {
  hypothesisId: string;
  title: string;
  statement: string; // "If we [action], then [metric] will increase by [lift], because [evidence]."
  rationale: string;
  sourceBottleneck: string;
  primaryMetric: {
    name: string;
    targetValue: number;
    unit: string;
    baselineValue: number;
    expectedLiftPercent: number;
  };
  variants: {
    control: {
      name: string;
      description: string;
      headline: string;
      callToAction: string;
      bodyCopy: string;
    };
    challenger: {
      name: string;
      description: string;
      headline: string;
      callToAction: string;
      bodyCopy: string;
      creativeAssetBrief: string;
    };
  };
  campaignFormat: 'STATIC_CAROUSEL' | 'PRINT_COLLATERAL' | 'OUTREACH_SEQUENCE' | 'LANDING_PAGE_HERO';
  department: 'Marketing' | 'Product' | 'Sales' | 'Growth';
  estimatedCost: number;
  runtimeDays: number;
}

export interface SampleSizeCalculation {
  baselineConversionRate: number; // e.g. 0.025 (2.5%)
  minimumDetectableEffectPercent: number; // e.g. 20 (20% relative lift -> 3.0%)
  significanceLevel: number; // 0.05 (95% confidence)
  statisticalPower: number; // 0.80 (80% power)
  requiredSampleSizePerVariant: number;
  totalRequiredSampleSize: number;
  dailyTrafficRate: number;
  estimatedDaysToSignificance: number;
  feasibility: 'HIGH_VELOCITY' | 'ACHIEVABLE' | 'LOW_TRAFFIC_WARNING';
  guidanceNotes: string;
}

export interface ExperimentVariantMetrics {
  variantId: string;
  name: string;
  visitors: number;
  conversions: number;
  conversionRate: number;
  revenue: number;
  aov: number;
}

export interface StatisticalSignificanceResult {
  control: ExperimentVariantMetrics;
  challenger: ExperimentVariantMetrics;
  absoluteDifference: number;
  relativeLiftPercent: number;
  standardError: number;
  zScore: number;
  pValue: number;
  confidenceInterval95: {
    lower: number;
    upper: number;
  };
  isStatisticallySignificant: boolean;
  decision:
    | 'STATISTICALLY_SIGNIFICANT_WINNER'
    | 'STATISTICALLY_SIGNIFICANT_LOSER'
    | 'INCONCLUSIVE_NEUTRAL'
    | 'UNDERPOWERED_SAMPLE';
  confidencePercentage: number;
  recommendation: string;
}

export interface AttributionTouchpoint {
  touchpointId: string;
  experimentId: string;
  variantId: string;
  customerId: string;
  orderId: string;
  revenue: number;
  timestamp: string;
  model: 'FIRST_TOUCH' | 'LAST_TOUCH' | 'LINEAR';
}

export interface ExperimentAttributionSummary {
  experimentId: string;
  totalAttributedRevenue: number;
  totalAttributedOrders: number;
  variantAttributions: Record<
    string,
    {
      orderCount: number;
      revenue: number;
      aov: number;
      roas: number;
    }
  >;
  winningVariantId: string | null;
  confidence: number;
}

/**
 * Standard Normal Error Function (Abramowitz and Stegun 7.1.26 approximation)
 */
function erf(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);
  const t = 1.0 / (1.0 + p * absX);
  const y = 1.0 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t) * Math.exp(-absX * absX);
  return sign * y;
}

/**
 * Cumulative Distribution Function for standard normal distribution N(0,1)
 */
function normalCdf(z: number): number {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

export class ExperimentationPlatform {
  /**
   * Synthesizes grounded growth hypotheses directly linked to business diagnosis & primary constraints
   */
  public async synthesizeHypotheses(
    workspaceId: string
  ): Promise<GroundedHypothesis[]> {
    const profile = await businessProfileRepository.getProfile(workspaceId);
    const diagnosis = await businessDiagnosisEngine.diagnoseBusiness(workspaceId);
    const brand = await brandIdentityRepository.getLatest(workspaceId);

    const primaryConstraint = diagnosis.primaryConstraint;
    const subIndustry = (profile?.subIndustry || profile?.category || profile?.industry || '').toLowerCase();
    const approvedWord = brand?.wordsToUse?.[0] || 'Artisanal';
    const approvedClaim = brand?.approvedClaims?.[0] || 'Guaranteed Quality';

    const hypotheses: GroundedHypothesis[] = [];

    if (subIndustry.includes('coffee') || subIndustry.includes('beverage')) {
      // 1. Freshness Guarantee Hypothesis (targeting conversion friction)
      hypotheses.push({
        hypothesisId: `hyp_${workspaceId}_roast_date`,
        title: 'Roast Date Stamp & Peak Extraction Guarantee',
        statement: `If we display a real-time "Roasted to Order within 48 Hours" badge above the add-to-cart button, then landing page conversion rate will increase by +25%, because customer research indicates 74% of craft coffee buyers hesitate when roast dates are unconfirmed.`,
        rationale: `Directly addresses diagnosed bottleneck (${primaryConstraint.dimension}: ${primaryConstraint.title}) and customer freshness objections.`,
        sourceBottleneck: `${primaryConstraint.dimension} - ${primaryConstraint.title}`,
        primaryMetric: {
          name: 'Visitor-to-Cart Conversion Rate',
          baselineValue: 2.2,
          targetValue: 2.75,
          unit: '%',
          expectedLiftPercent: 25,
        },
        variants: {
          control: {
            name: 'Variant A (Control Baseline)',
            description: 'Standard product page displaying price, weight, and general flavor notes.',
            headline: 'Single-Estate Arabica Coffee',
            callToAction: 'Add to Cart',
            bodyCopy: 'Freshly roasted craft coffee from premium Indian estates.',
          },
          challenger: {
            name: 'Variant B (Roast Date Guarantee)',
            description: 'Hero section with prominent Roast Date stamp and 48-hour dispatch assurance.',
            headline: `Roasted to Order Within 48 Hours: ${approvedClaim}`,
            callToAction: 'Order Fresh Roasted Batch',
            bodyCopy: `Every pouch of our ${approvedWord} coffee is stamped with its exact roast date and estate elevation. Peak flavor extracted in every brew.`,
            creativeAssetBrief: 'High-contrast static card featuring embossed date stamp graphic and thermal valved packaging badge.',
          },
        },
        campaignFormat: 'STATIC_CAROUSEL',
        department: 'Marketing',
        estimatedCost: 3500,
        runtimeDays: 14,
      });

      // 2. Multi-Pack Tasting Flight Hypothesis (targeting AOV & Unit Economics)
      hypotheses.push({
        hypothesisId: `hyp_${workspaceId}_tasting_flight`,
        title: '3-Roast Discovery Flight Bundle Architecture',
        statement: 'If we prompt buyers with a 3-Roast Discovery Flight (3x100g) at ₹799 on first add-to-cart, then Average Order Value (AOV) will increase by +35%, because introductory buyers prefer multi-flavor exploration over single 250g bag commitment.',
        rationale: 'Elevates contribution margin and unit economics without increasing top-of-funnel customer acquisition costs.',
        sourceBottleneck: 'UNIT_ECONOMICS - Contribution Margin Optimization',
        primaryMetric: {
          name: 'Average Order Value (AOV)',
          baselineValue: 450,
          targetValue: 607,
          unit: 'INR',
          expectedLiftPercent: 35,
        },
        variants: {
          control: {
            name: 'Control (Single Bag Checkout)',
            description: 'Direct add-to-cart drawer offering single 250g bag at standard pricing.',
            headline: 'Your Cart',
            callToAction: 'Proceed to Checkout',
            bodyCopy: 'Single 250g bag selected.',
          },
          challenger: {
            name: 'Challenger (Tasting Flight Upsell)',
            description: 'Cart drawer dynamically recommending 3-Roast Discovery Flight for only ₹349 more.',
            headline: 'Explore the Roastery Flight',
            callToAction: 'Upgrade to Discovery Flight (Save ₹150)',
            bodyCopy: 'Taste our 3 award-winning single estate roasts side-by-side in 100g discovery pouches.',
            creativeAssetBrief: 'Multi-frame SVG carousel showing 3 side-by-side estate pouches with flavor profile dials.',
          },
        },
        campaignFormat: 'LANDING_PAGE_HERO',
        department: 'Product',
        estimatedCost: 2000,
        runtimeDays: 21,
      });
    } else {
      // General B2B / SaaS / Commerce Hypothesis
      hypotheses.push({
        hypothesisId: `hyp_${workspaceId}_pricing_transparency`,
        title: 'Deterministic Flat-Rate Pricing vs Opaque Custom Demos',
        statement: 'If we replace the "Book a Demo" gating form with a transparent interactive pricing calculator and instant signup CTA, then demo-to-trial conversion will increase by +30%, because operators heavily favor self-serve autonomy.',
        rationale: `Removes top-of-funnel conversion friction aligned with primary constraint (${primaryConstraint.title}).`,
        sourceBottleneck: primaryConstraint.title,
        primaryMetric: {
          name: 'Visitor-to-Signup Conversion Rate',
          baselineValue: 1.8,
          targetValue: 2.34,
          unit: '%',
          expectedLiftPercent: 30,
        },
        variants: {
          control: {
            name: 'Control (Gated Demo)',
            description: 'Mandatory form requesting company size, phone number, and discovery call booking.',
            headline: 'Schedule an Enterprise Growth Demo',
            callToAction: 'Request Demo Call',
            bodyCopy: 'Our sales engineers will contact you within 2 business days.',
          },
          challenger: {
            name: 'Challenger (Self-Serve Transparency)',
            description: 'Transparent interactive slider showing exact monthly pricing with instant 3-minute onboarding.',
            headline: 'Transparent Value. Live in 3 Minutes.',
            callToAction: 'Start Free Guided Trial',
            bodyCopy: 'No credit card required. Zero sales calls. Mathematical accuracy guaranteed.',
            creativeAssetBrief: 'Clean interactive SVG pricing card with instant toggle switches.',
          },
        },
        campaignFormat: 'LANDING_PAGE_HERO',
        department: 'Growth',
        estimatedCost: 5000,
        runtimeDays: 14,
      });

      // 2. Fast-Track Time-to-Value Activation Hypothesis
      hypotheses.push({
        hypothesisId: `hyp_${workspaceId}_activation_streamline`,
        title: 'Zero-Friction Fast-Track Product Activation',
        statement: 'If we pre-populate onboarding with industry-specific templates and single-click imports, then day-7 active retention will increase by +22%, because customers experience core product value within the first session.',
        rationale: 'Reduces time-to-first-value and reinforces product stickiness without increasing acquisition expenditure.',
        sourceBottleneck: 'RETENTION_CHURN - Time to First Value Optimization',
        primaryMetric: {
          name: 'Day-7 Activation Retention Rate',
          baselineValue: 24,
          targetValue: 29.28,
          unit: '%',
          expectedLiftPercent: 22,
        },
        variants: {
          control: {
            name: 'Control (Standard Blank Slate)',
            description: 'Standard multi-step onboarding starting with blank configuration.',
            headline: 'Configure Your New Workspace',
            callToAction: 'Complete Manual Setup',
            bodyCopy: 'Step through all 5 configuration sections to activate your account.',
          },
          challenger: {
            name: 'Challenger (Pre-Populated 1-Click Launch)',
            description: '1-click starter template customized for the user business category.',
            headline: 'Launch in 60 Seconds with Pre-Configured Templates',
            callToAction: 'Activate Instant Setup',
            bodyCopy: 'Your catalog, brand rules, and initial strategy have been drafted for instant review.',
            creativeAssetBrief: 'Multi-slide static walkthrough showcasing immediate dashboard insights.',
          },
        },
        campaignFormat: 'OUTREACH_SEQUENCE',
        department: 'Product',
        estimatedCost: 3000,
        runtimeDays: 21,
      });
    }

    return hypotheses;
  }

  /**
   * Calculates Minimum Detectable Effect (MDE), statistical power, and required sample size
   */
  public calculateSampleSize(params: {
    baselineConversionRate: number; // e.g. 0.025 (2.5%)
    minimumDetectableEffectPercent: number; // e.g. 20 (20% relative lift -> 3.0%)
    dailyTrafficRate?: number; // daily visitors/trials
    significanceLevel?: number; // default 0.05 (95% confidence)
    statisticalPower?: number; // default 0.80 (80% power)
  }): SampleSizeCalculation {
    const {
      baselineConversionRate: p1,
      minimumDetectableEffectPercent: mdePct,
      dailyTrafficRate = 250,
      significanceLevel = 0.05,
      statisticalPower = 0.80,
    } = params;

    // Relative lift to absolute target
    const p2 = p1 * (1 + mdePct / 100);
    const delta = Math.abs(p2 - p1);

    // Two-tailed Z for alpha = 0.05 is 1.96; Z for power = 0.80 is 0.8416
    const zAlpha = significanceLevel === 0.01 ? 2.576 : significanceLevel === 0.10 ? 1.645 : 1.96;
    const zBeta = statisticalPower === 0.90 ? 1.282 : statisticalPower === 0.85 ? 1.036 : 0.8416;

    const pooledP = (p1 + p2) / 2;
    const variance = 2 * pooledP * (1 - pooledP);

    // Standard two-sample proportion sample size formula per variant:
    // n = ((zAlpha + zBeta)^2 * variance) / delta^2
    const numerator = Math.pow(zAlpha + zBeta, 2) * variance;
    const denominator = Math.pow(delta, 2);
    const requiredPerVariant = Math.ceil(numerator / denominator);
    const totalRequired = requiredPerVariant * 2;

    const estimatedDays = Math.ceil(totalRequired / Math.max(1, dailyTrafficRate));

    let feasibility: SampleSizeCalculation['feasibility'] = 'ACHIEVABLE';
    let guidanceNotes = `Test requires ${totalRequired.toLocaleString()} total visitors (${requiredPerVariant.toLocaleString()} per variant) over approx ${estimatedDays} days.`;

    if (estimatedDays > 45) {
      feasibility = 'LOW_TRAFFIC_WARNING';
      guidanceNotes = `Warning: At ${dailyTrafficRate} visitors/day, reaching statistical significance will take ~${estimatedDays} days. Consider testing larger macro changes (higher MDE) or focusing on higher-traffic pages.`;
    } else if (estimatedDays <= 14) {
      feasibility = 'HIGH_VELOCITY';
      guidanceNotes = `High-velocity test: Traffic permits achieving 95% statistical significance within ${estimatedDays} days. Proceed with deployment.`;
    }

    return {
      baselineConversionRate: p1,
      minimumDetectableEffectPercent: mdePct,
      significanceLevel,
      statisticalPower,
      requiredSampleSizePerVariant: requiredPerVariant,
      totalRequiredSampleSize: totalRequired,
      dailyTrafficRate,
      estimatedDaysToSignificance: estimatedDays,
      feasibility,
      guidanceNotes,
    };
  }

  /**
   * Computes rigorous frequentist statistical significance between Control (A) and Challenger (B)
   */
  public evaluateSignificance(params: {
    control: { visitors: number; conversions: number; revenue?: number };
    challenger: { visitors: number; conversions: number; revenue?: number };
    minRequiredSample?: number;
  }): StatisticalSignificanceResult {
    const { control: c, challenger: ch, minRequiredSample = 100 } = params;

    const nA = Math.max(1, c.visitors);
    const nB = Math.max(1, ch.visitors);
    const convA = c.conversions;
    const convB = ch.conversions;

    const rateA = convA / nA;
    const rateB = convB / nB;

    const revA = c.revenue || 0;
    const revB = ch.revenue || 0;
    const aovA = convA > 0 ? Math.round(revA / convA) : 0;
    const aovB = convB > 0 ? Math.round(revB / convB) : 0;

    const absoluteDiff = rateB - rateA;
    const relativeLift = rateA > 0 ? (absoluteDiff / rateA) * 100 : 0;

    // Pooled proportion for null hypothesis
    const pooledP = (convA + convB) / (nA + nB);
    const standardError = Math.sqrt(pooledP * (1 - pooledP) * (1 / nA + 1 / nB));

    let zScore = 0;
    let pValue = 1.0;

    if (standardError > 0) {
      zScore = absoluteDiff / standardError;
      // Two-tailed p-value
      pValue = 2 * (1 - normalCdf(Math.abs(zScore)));
    }

    // 95% Confidence Interval of difference
    const seDiff = Math.sqrt((rateA * (1 - rateA)) / nA + (rateB * (1 - rateB)) / nB);
    const ciMargin = 1.96 * seDiff;
    const ciLower = absoluteDiff - ciMargin;
    const ciUpper = absoluteDiff + ciMargin;

    const isStatisticallySignificant = pValue < 0.05 && (nA >= minRequiredSample && nB >= minRequiredSample);
    const confidencePercentage = Math.round((1 - Math.min(1, pValue)) * 1000) / 10;

    let decision: StatisticalSignificanceResult['decision'];
    let recommendation: string;

    if (nA < minRequiredSample || nB < minRequiredSample) {
      decision = 'UNDERPOWERED_SAMPLE';
      recommendation = `Sample size too small (${nA + nB} total visitors vs required ${minRequiredSample * 2}). Keep experiment running to avoid false conclusions.`;
    } else if (isStatisticallySignificant) {
      if (relativeLift > 0) {
        decision = 'STATISTICALLY_SIGNIFICANT_WINNER';
        recommendation = `Challenger Variant achieved a statistically significant +${relativeLift.toFixed(1)}% lift (p = ${pValue.toFixed(4)}, ${confidencePercentage}% confidence). Permanently graduate Variant B to 100% production traffic.`;
      } else {
        decision = 'STATISTICALLY_SIGNIFICANT_LOSER';
        recommendation = `Challenger Variant caused a statistically significant ${relativeLift.toFixed(1)}% decline (p = ${pValue.toFixed(4)}). Halt experiment and retain Control A.`;
      }
    } else {
      decision = 'INCONCLUSIVE_NEUTRAL';
      recommendation = `No statistically significant difference observed (p = ${pValue.toFixed(4)} >= 0.05). Lift of ${relativeLift.toFixed(1)}% could be random noise. Continue observation or pivot to higher-contrast hypothesis.`;
    }

    return {
      control: {
        variantId: 'control_a',
        name: 'Control (Variant A)',
        visitors: nA,
        conversions: convA,
        conversionRate: Math.round(rateA * 1000) / 10,
        revenue: revA,
        aov: aovA,
      },
      challenger: {
        variantId: 'challenger_b',
        name: 'Challenger (Variant B)',
        visitors: nB,
        conversions: convB,
        conversionRate: Math.round(rateB * 1000) / 10,
        revenue: revB,
        aov: aovB,
      },
      absoluteDifference: Math.round(absoluteDiff * 1000) / 10,
      relativeLiftPercent: Math.round(relativeLift * 10) / 10,
      standardError: Math.round(standardError * 10000) / 10000,
      zScore: Math.round(zScore * 100) / 100,
      pValue: Math.round(pValue * 10000) / 10000,
      confidenceInterval95: {
        lower: Math.round(ciLower * 1000) / 10,
        upper: Math.round(ciUpper * 1000) / 10,
      },
      isStatisticallySignificant,
      decision,
      confidencePercentage,
      recommendation,
    };
  }

  /**
   * Tracks and aggregates multi-touch customer order attribution to active experiment variants
   */
  public aggregateAttribution(
    experimentId: string,
    touchpoints: AttributionTouchpoint[]
  ): ExperimentAttributionSummary {
    const expTouchpoints = touchpoints.filter((t) => t.experimentId === experimentId);

    const variantAttributions: ExperimentAttributionSummary['variantAttributions'] = {};
    let totalRevenue = 0;
    let totalOrders = 0;

    for (const t of expTouchpoints) {
      const v = variantAttributions[t.variantId] || { orderCount: 0, revenue: 0, aov: 0, roas: 0 };
      v.orderCount += 1;
      v.revenue += t.revenue;
      v.aov = v.orderCount > 0 ? Math.round(v.revenue / v.orderCount) : 0;
      variantAttributions[t.variantId] = v;

      totalRevenue += t.revenue;
      totalOrders += 1;
    }

    // Determine leading revenue variant
    let winningVariantId: string | null = null;
    let maxRev = -1;
    for (const [vId, v] of Object.entries(variantAttributions)) {
      if (v.revenue > maxRev) {
        maxRev = v.revenue;
        winningVariantId = vId;
      }
    }

    return {
      experimentId,
      totalAttributedRevenue: totalRevenue,
      totalAttributedOrders: totalOrders,
      variantAttributions,
      winningVariantId,
      confidence: totalOrders >= 30 ? 0.95 : totalOrders >= 10 ? 0.80 : 0.60,
    };
  }

  /**
   * Publishes lifecycle events on the department event bus
   */
  public async publishExperimentEvent(params: {
    workspaceId: string;
    experimentId: string;
    eventType: 'EXPERIMENT_STARTED' | 'EXPERIMENT_COMPLETED' | 'EXPERIMENT_ANALYSIS_COMPLETED';
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    const { workspaceId, experimentId, eventType, metadata } = params;
    await departmentEventBus.emit({
      businessId: workspaceId,
      workspaceId,
      userId: 'system_experimentation_engine',
      eventType,
      resourceId: experimentId,
      metadata,
    });
  }
}

export const experimentationPlatform = new ExperimentationPlatform();
