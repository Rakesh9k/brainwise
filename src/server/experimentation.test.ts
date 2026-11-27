/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { experimentationPlatform } from './services/growth/experimentationPlatform';
import { businessProfileRepository } from './repositories/businessProfileRepository';
import { productRepository } from './repositories/productRepository';
import { brandIdentityRepository } from './repositories/brandIdentityRepository';
import { departmentEventBus } from './events/eventBus';
import { sharedBusinessContextService } from './services/sharedBusinessContextService';
import type { AttributionTouchpoint } from './services/growth/experimentationPlatform';

describe('PHASE 6: GROWTH EXPERIMENTATION & ATTRIBUTION SUITE', () => {
  const wsId = `ws_exp_${Date.now()}`;

  it('1. Synthesizes grounded hypotheses directly from business diagnosis and primary constraints', async () => {
    // 1. Setup workspace profile
    await businessProfileRepository.saveProfile({
      workspaceId: wsId,
      businessName: 'Solstice Craft Coffee Roasters',
      industry: 'Specialty Beverage',
      category: 'Artisan Coffee',
      subIndustry: 'Third-Wave Coffee Roastery',
      location: 'Bangalore, India',
      stage: 'growth',
      version: 1,
      valueProposition: 'Direct-trade estate Arabica roasted fresh within 48 hours of dispatch.',
      customerPersonas: [
        {
          name: 'Home Brewer Enthusiast',
          painPoints: ['Supermarket beans are stale with no roast date transparency'],
          buyingMotivations: ['Peak flavor extraction and freshness guarantee'],
        },
      ],
      resourcesAndConstraints: {
        monthlyMarketingBudget: 15000,
        grossMarginPercent: 72,
      },
      provenance: {
        businessName: { source: 'USER_CONFIRMED', verifiedAt: new Date().toISOString() },
        valueProposition: { source: 'USER_CONFIRMED', verifiedAt: new Date().toISOString() },
      },
    } as any);

    await productRepository.createProduct({
      workspaceId: wsId,
      productId: 'prod_estate_blend',
      name: 'Monsoon Malabar Single Estate (250g)',
      price: 450,
      category: 'Whole Bean Coffee',
      source: 'USER_CONFIRMED',
      inStock: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await brandIdentityRepository.save({
      workspaceId: wsId,
      brandIdentityId: `brand_${wsId}`,
      brandName: 'Solstice Coffee Roasters',
      voice: ['Artisanal', 'Knowledgeable', 'Direct'],
      wordsToUse: ['Single-Estate', 'Farm-to-Cup', 'Roast-to-Order'],
      wordsToAvoid: ['Instant', 'Commercial Grade', 'Cheap'],
      approvedClaims: ['100% Single-Estate Arabica', 'Roasted within 48 hours of shipping'],
      restrictedClaims: ['Certified organic without estate documentation'],
      status: 'approved',
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    sharedBusinessContextService.invalidateCache(wsId);

    const hypotheses = await experimentationPlatform.synthesizeHypotheses(wsId);

    assert.ok(hypotheses.length >= 2, 'Should synthesize at least 2 grounded growth hypotheses');

    const roastDateHyp = hypotheses.find((h) => h.hypothesisId.includes('roast_date'))!;
    assert.ok(roastDateHyp, 'Should generate roast date guarantee hypothesis');
    assert.ok(roastDateHyp.statement.includes('If we'));
    assert.ok(roastDateHyp.statement.includes('then'));
    assert.ok(roastDateHyp.statement.includes('because'));
    assert.ok(roastDateHyp.rationale.length > 15);
    assert.ok(roastDateHyp.primaryMetric.expectedLiftPercent > 0);

    // Verify structured variants
    const { control, challenger } = roastDateHyp.variants;
    assert.ok(control.headline.length > 0);
    assert.ok(control.callToAction.length > 0);
    assert.ok(challenger.headline.length > 0);
    assert.ok(challenger.callToAction.length > 0);
    assert.ok(challenger.creativeAssetBrief.length > 10);

    // STRICT VIDEO EXCLUSION CHECK
    for (const h of hypotheses) {
      assert.ok(
        ['STATIC_CAROUSEL', 'PRINT_COLLATERAL', 'OUTREACH_SEQUENCE', 'LANDING_PAGE_HERO'].includes(
          h.campaignFormat
        ),
        'Must strictly adhere to non-video formats'
      );
      assert.ok(!h.campaignFormat.toLowerCase().includes('video'));
      assert.ok(!h.variants.challenger.creativeAssetBrief.toLowerCase().includes('video'));
    }
  });

  it('2. Computes sample size and statistical power based on MDE and traffic velocity', () => {
    // 2.5% baseline conversion rate, testing for a 20% relative lift (to 3.0%)
    const calc = experimentationPlatform.calculateSampleSize({
      baselineConversionRate: 0.025,
      minimumDetectableEffectPercent: 20,
      dailyTrafficRate: 350,
      significanceLevel: 0.05,
      statisticalPower: 0.80,
    });

    assert.equal(calc.baselineConversionRate, 0.025);
    assert.equal(calc.minimumDetectableEffectPercent, 20);
    assert.ok(calc.requiredSampleSizePerVariant > 1000);
    assert.equal(calc.totalRequiredSampleSize, calc.requiredSampleSizePerVariant * 2);
    assert.ok(calc.estimatedDaysToSignificance > 0);
    assert.ok(['HIGH_VELOCITY', 'ACHIEVABLE', 'LOW_TRAFFIC_WARNING'].includes(calc.feasibility));
    assert.ok(calc.guidanceNotes.length > 15);
  });

  it('3. Computes two-sample z-score, p-value, and confidence intervals to detect winners', () => {
    // Scenario A: Statistically significant winner
    // Control: 2,000 visitors, 50 conversions (2.5%)
    // Challenger: 2,000 visitors, 85 conversions (4.25%)
    const winResult = experimentationPlatform.evaluateSignificance({
      control: { visitors: 2000, conversions: 50, revenue: 22500 },
      challenger: { visitors: 2000, conversions: 85, revenue: 38250 },
      minRequiredSample: 200,
    });

    assert.equal(winResult.isStatisticallySignificant, true);
    assert.equal(winResult.decision, 'STATISTICALLY_SIGNIFICANT_WINNER');
    assert.ok(winResult.pValue < 0.05, `Expected p < 0.05, got ${winResult.pValue}`);
    assert.ok(winResult.relativeLiftPercent > 60);
    assert.ok(winResult.confidencePercentage >= 95);
    assert.ok(winResult.confidenceInterval95.lower > 0);
    assert.ok(winResult.recommendation.includes('graduate Variant B'));

    // Scenario B: Underpowered sample
    const underpowered = experimentationPlatform.evaluateSignificance({
      control: { visitors: 30, conversions: 1 },
      challenger: { visitors: 30, conversions: 3 },
      minRequiredSample: 100,
    });
    assert.equal(underpowered.decision, 'UNDERPOWERED_SAMPLE');
    assert.equal(underpowered.isStatisticallySignificant, false);

    // Scenario C: Inconclusive neutral outcome
    // Control: 1,500 visitors, 40 conversions (2.67%)
    // Challenger: 1,500 visitors, 42 conversions (2.80%)
    const neutral = experimentationPlatform.evaluateSignificance({
      control: { visitors: 1500, conversions: 40 },
      challenger: { visitors: 1500, conversions: 42 },
      minRequiredSample: 100,
    });
    assert.equal(neutral.decision, 'INCONCLUSIVE_NEUTRAL');
    assert.ok(neutral.pValue >= 0.05);
    assert.equal(neutral.isStatisticallySignificant, false);
  });

  it('4. Aggregates multi-touch conversion attribution back to active experiment variants', () => {
    const experimentId = 'exp_roast_date_001';
    const touchpoints: AttributionTouchpoint[] = [
      // Control variant orders
      {
        touchpointId: 'tp_1',
        experimentId,
        variantId: 'control_a',
        customerId: 'cust_1',
        orderId: 'ord_1',
        revenue: 450,
        timestamp: new Date().toISOString(),
        model: 'LAST_TOUCH',
      },
      {
        touchpointId: 'tp_2',
        experimentId,
        variantId: 'control_a',
        customerId: 'cust_2',
        orderId: 'ord_2',
        revenue: 450,
        timestamp: new Date().toISOString(),
        model: 'LAST_TOUCH',
      },

      // Challenger variant orders (higher volume + tasting flight upsells)
      {
        touchpointId: 'tp_3',
        experimentId,
        variantId: 'challenger_b',
        customerId: 'cust_3',
        orderId: 'ord_3',
        revenue: 850,
        timestamp: new Date().toISOString(),
        model: 'LAST_TOUCH',
      },
      {
        touchpointId: 'tp_4',
        experimentId,
        variantId: 'challenger_b',
        customerId: 'cust_4',
        orderId: 'ord_4',
        revenue: 850,
        timestamp: new Date().toISOString(),
        model: 'LAST_TOUCH',
      },
      {
        touchpointId: 'tp_5',
        experimentId,
        variantId: 'challenger_b',
        customerId: 'cust_5',
        orderId: 'ord_5',
        revenue: 1200,
        timestamp: new Date().toISOString(),
        model: 'LAST_TOUCH',
      },
    ];

    const summary = experimentationPlatform.aggregateAttribution(experimentId, touchpoints);

    assert.equal(summary.experimentId, experimentId);
    assert.equal(summary.totalAttributedOrders, 5);
    assert.equal(summary.totalAttributedRevenue, 3800);
    assert.equal(summary.winningVariantId, 'challenger_b');

    const vA = summary.variantAttributions['control_a'];
    assert.equal(vA.orderCount, 2);
    assert.equal(vA.revenue, 900);
    assert.equal(vA.aov, 450);

    const vB = summary.variantAttributions['challenger_b'];
    assert.equal(vB.orderCount, 3);
    assert.equal(vB.revenue, 2900);
    assert.equal(vB.aov, 967);
  });

  it('5. Publishes experiment lifecycle events on the department event bus', async () => {
    let capturedEvent: any = null;
    const unsub = departmentEventBus.subscribe('EXPERIMENT_ANALYSIS_COMPLETED', (evt) => {
      capturedEvent = evt;
    });

    await experimentationPlatform.publishExperimentEvent({
      workspaceId: wsId,
      experimentId: 'exp_lifecycle_test',
      eventType: 'EXPERIMENT_ANALYSIS_COMPLETED',
      metadata: { winningVariant: 'challenger_b', lift: 28.5 },
    });

    unsub();

    assert.ok(capturedEvent);
    assert.equal(capturedEvent.businessId, wsId);
    assert.equal(capturedEvent.resourceId, 'exp_lifecycle_test');
    assert.equal(capturedEvent.metadata.winningVariant, 'challenger_b');
  });
});
