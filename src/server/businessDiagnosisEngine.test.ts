/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { businessDiagnosisEngine } from './services/businessDiagnosisEngine';
import { businessProfileRepository } from './repositories/businessProfileRepository';
import { productRepository } from './repositories/productRepository';
import { brandIdentityRepository } from './repositories/brandIdentityRepository';
import { goalRepository } from './repositories/goalRepository';
import { sharedBusinessContextService } from './services/sharedBusinessContextService';

describe('PHASE 3: COMPREHENSIVE BUSINESS DIAGNOSIS ENGINE SUITE', () => {
  const wsComplete = `ws_diag_complete_${Date.now()}`;
  const wsSparse = `ws_diag_sparse_${Date.now()}`;

  it('1. Evaluates all 10 business health dimensions on a mature, verified business profile', async () => {
    // 1. Provision Complete Workspace Profile
    await businessProfileRepository.saveProfile({
      workspaceId: wsComplete,
      businessName: 'Solstice Craft Coffee Roasters',
      industry: 'Specialty Coffee',
      category: 'Artisan Beverage',
      subIndustry: 'Third-Wave Coffee Roastery',
      location: 'Bangalore, India',
      stage: 'growth',
      version: 1,
      valueProposition: 'Direct-trade estate Arabica roasted fresh and shipped in thermal-sealed valved bags.',
      tagline: 'Farm to Cup Specialty Coffee',
      customerPersonas: [
        {
          name: 'Home Brewer Enthusiast',
          painPoints: ['Supermarket beans are stale and over-roasted', 'Lack of roast date transparency'],
          buyingMotivations: ['Direct origin traceability', 'Peak flavor profile'],
        },
      ],
      resourcesAndConstraints: {
        monthlyMarketingBudget: 12000,
        operatingCapacity: '500 kg per week',
        grossMarginPercent: 72,
      },
      strategicMemory: {
        explicitExclusions: ['Never sell instant coffee', 'Never offer 50% discount clearances'],
        usedAngles: [],
        fatiguedThemes: [],
        lastUpdated: new Date().toISOString(),
      },
      provenance: {
        businessName: { source: 'USER_CONFIRMED', verifiedAt: new Date().toISOString() },
        valueProposition: { source: 'USER_CONFIRMED', verifiedAt: new Date().toISOString() },
        stage: { source: 'USER_CONFIRMED', verifiedAt: new Date().toISOString() },
      },
    } as any);

    // 2. Add verified products
    await productRepository.createProduct({
      workspaceId: wsComplete,
      productId: 'prod_estate_blend',
      name: 'Monsoon Malabar Single Estate Blend (250g)',
      price: 450,
      category: 'Whole Bean Coffee',
      source: 'USER_CONFIRMED',
      inStock: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await productRepository.createProduct({
      workspaceId: wsComplete,
      productId: 'prod_cold_brew_pack',
      name: 'Artisan Cold Brew Starter Kit',
      price: 950,
      category: 'Brewing Equipment',
      source: 'USER_CONFIRMED',
      inStock: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // 3. Add brand guidelines
    await brandIdentityRepository.save({
      workspaceId: wsComplete,
      brandIdentityId: `brand_${wsComplete}`,
      brandName: 'Solstice Coffee Roasters',
      voice: ['Artisanal', 'Knowledgeable', 'Direct'],
      wordsToUse: ['Single-Estate', 'Farm-to-Cup', 'Origin Traceability'],
      wordsToAvoid: ['Instant', 'Commercial Grade', 'Cheap'],
      approvedClaims: ['100% Single-Estate Arabica', 'Direct-Trade Sourced'],
      restrictedClaims: ['100% organic without estate certificate'],
      status: 'approved',
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // 4. Add goals
    await goalRepository.createGoal({
      workspaceId: wsComplete,
      goalId: 'goal_subscriptions',
      title: 'Reach 1,000 monthly active coffee bean subscribers',
      category: 'REVENUE',
      targetValue: 1000,
      currentValue: 350,
      unit: 'subscribers',
      targetDate: '2027-01-01',
      status: 'in_progress',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    sharedBusinessContextService.invalidateCache(wsComplete);

    // Execute Diagnosis
    const diagnosis = await businessDiagnosisEngine.diagnoseBusiness(wsComplete, {
      telemetryMetrics: {
        monthlyVisitors: 4500,
        trackedConversionRate: 3.2,
        churnRateMonthly: 2.8,
        cac: 380,
        ltv: 2400,
      },
    });

    assert.equal(diagnosis.workspaceId, wsComplete);
    assert.equal(diagnosis.businessName, 'Solstice Craft Coffee Roasters');
    assert.ok(diagnosis.overallHealthScore >= 75);
    assert.ok(['GROWTH_SCALING', 'ESTABLISHED'].includes(diagnosis.maturityStage));

    // Verify all 10 dimensions exist
    const dims = Object.keys(diagnosis.dimensions);
    assert.equal(dims.length, 10);
    assert.ok(dims.includes('UNIT_ECONOMICS'));
    assert.ok(dims.includes('MARKET_FIT_POSITIONING'));
    assert.ok(dims.includes('FUNNEL_VELOCITY'));
    assert.ok(dims.includes('RETENTION_CHURN'));
    assert.ok(dims.includes('PRICING_POWER'));
    assert.ok(dims.includes('BRAND_AUTHORITY'));
    assert.ok(dims.includes('CAPITAL_EFFICIENCY'));
    assert.ok(dims.includes('OPERATIONAL_CAPACITY'));
    assert.ok(dims.includes('REGULATORY_COMPLIANCE'));
    assert.ok(dims.includes('GROWTH_LEVERAGE'));

    // Check Unit Economics details
    const unit = diagnosis.dimensions.UNIT_ECONOMICS;
    assert.equal(unit.status, 'EXCELLENT');
    assert.ok(unit.score >= 80);
    assert.equal(unit.keyMetrics.averageUnitPrice, 700);
    assert.equal(unit.keyMetrics.verifiedProductsCount, 2);

    // Check Brand Authority
    const brandDim = diagnosis.dimensions.BRAND_AUTHORITY;
    assert.equal(brandDim.status, 'HEALTHY');
    assert.ok(brandDim.score >= 75);
  });

  it('2. Correctly flags missing data and critical gaps in a sparse / pre-launch business', async () => {
    // Provision Sparse Workspace
    await businessProfileRepository.saveProfile({
      workspaceId: wsSparse,
      businessName: 'Unfunded Idea Stealth',
      industry: 'Software',
      stage: 'Idea Stage',
      version: 1,
      lastUpdated: new Date().toISOString(),
      provenance: {},
    } as any);

    sharedBusinessContextService.invalidateCache(wsSparse);

    const diagnosis = await businessDiagnosisEngine.diagnoseBusiness(wsSparse);

    assert.equal(diagnosis.workspaceId, wsSparse);
    assert.ok(diagnosis.overallHealthScore < 55);
    assert.equal(diagnosis.maturityStage, 'PRE_SEED');

    // Unit Economics must be critical
    const unit = diagnosis.dimensions.UNIT_ECONOMICS;
    assert.equal(unit.status, 'CRITICAL');
    assert.ok(unit.identifiedVulnerabilities.some((v) => v.includes('Unregistered product catalog')));

    // Capital Efficiency must be critical
    const cap = diagnosis.dimensions.CAPITAL_EFFICIENCY;
    assert.equal(cap.status, 'CRITICAL');
    assert.ok(cap.identifiedVulnerabilities.some((v) => v.includes('Undefined marketing budget')));
  });

  it('3. Theory of Constraints: Pinpoints the single Primary Constraint and creates sequenced remediation sprints', async () => {
    const diagnosis = await businessDiagnosisEngine.diagnoseBusiness(wsSparse);

    const primary = diagnosis.primaryConstraint;
    assert.ok(primary.dimension);
    assert.ok(primary.title.includes('The Primary Growth Bottleneck'));
    assert.ok(primary.bindingProblem.length > 10);
    assert.ok(primary.theoryOfConstraintsExplanation.includes('Theory of Constraints'));
    assert.ok(['CRITICAL', 'HIGH'].includes(primary.severity));

    assert.ok(primary.immediateRemediationSprints.length >= 2);
    assert.equal(primary.immediateRemediationSprints[0].sprintNumber, 1);
    assert.equal(primary.immediateRemediationSprints[1].sprintNumber, 2);
    assert.ok(primary.immediateRemediationSprints[0].actionTitle.length > 0);
    assert.ok(primary.immediateRemediationSprints[0].responsibleDepartment.length > 0);
  });

  it('4. Asserts "What NOT to do" directives to protect capital, brand and bandwidth', async () => {
    const diagnosis = await businessDiagnosisEngine.diagnoseBusiness(wsComplete);

    assert.ok(diagnosis.whatNotToDoDirectives.length >= 3);
    const actions = diagnosis.whatNotToDoDirectives.map((d) => d.prohibitedAction);

    // Paid ads protection
    assert.ok(actions.some((a) => a.includes('paid advertising')));
    // Discount protection
    assert.ok(actions.some((a) => a.includes('price discounts')));
    // Video exclusion protection
    assert.ok(actions.some((a) => a.includes('video production')));

    for (const directive of diagnosis.whatNotToDoDirectives) {
      assert.ok(directive.rationale.length > 10);
      assert.ok(directive.consequenceIfIgnored.length > 10);
      assert.ok(['CAPITAL_WASTE', 'BRAND_DILUTION', 'OPERATIONAL_CHAOS', 'LEGAL_EXPOSURE'].includes(directive.riskCategory));
    }
  });

  it('5. Generates grounded SWOT matrix with explicit fact provenance classification', async () => {
    const diagnosis = await businessDiagnosisEngine.diagnoseBusiness(wsComplete);

    const swot = diagnosis.swotMatrix;
    assert.ok(swot.strengths.length > 0);
    assert.ok(swot.opportunities.length > 0);
    assert.ok(swot.threats.length > 0);

    // Strengths must be confirmed facts
    for (const str of swot.strengths) {
      assert.equal(str.classification, 'CONFIRMED_FACT');
      assert.equal(str.confidence, 1.0);
    }

    // Opportunities can be calculations or hypotheses
    for (const opp of swot.opportunities) {
      assert.ok(['CALCULATION', 'AI_HYPOTHESIS'].includes(opp.classification));
    }

    // Threats must be observed evidence
    for (const thr of swot.threats) {
      assert.equal(thr.classification, 'OBSERVED_EVIDENCE');
    }
  });
});
