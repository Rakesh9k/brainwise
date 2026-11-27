/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { customerIntelligenceEngine } from './services/customerIntelligenceEngine';
import { businessProfileRepository } from './repositories/businessProfileRepository';
import { productRepository } from './repositories/productRepository';
import { brandIdentityRepository } from './repositories/brandIdentityRepository';
import { audienceSegmentRepository } from './repositories/audienceSegmentRepository';
import { businessDiagnosisEngine } from './services/businessDiagnosisEngine';
import { sharedBusinessContextService } from './services/sharedBusinessContextService';
import type { CustomerTransactionRecord } from './services/analytics/customerCohortEngine';

describe('PHASE 4: CUSTOMER INTELLIGENCE SYSTEM SUITE', () => {
  const wsId = `ws_cust_intel_${Date.now()}`;

  it('1. Generates and enriches tailored ICP personas grounded in catalog pricing & context', async () => {
    // 1. Provision Business Profile
    await businessProfileRepository.saveProfile({
      workspaceId: wsId,
      businessName: 'Solstice Craft Coffee Roasters',
      industry: 'Specialty Coffee',
      category: 'Artisan Beverage',
      subIndustry: 'Third-Wave Coffee Roastery',
      location: 'Bangalore, India',
      stage: 'growth',
      version: 1,
      valueProposition: 'Direct-trade estate Arabica roasted fresh and shipped in thermal-sealed valved bags.',
      tagline: 'Farm to Cup Specialty Coffee',
      provenance: {
        businessName: { source: 'USER_CONFIRMED', verifiedAt: new Date().toISOString() },
        valueProposition: { source: 'USER_CONFIRMED', verifiedAt: new Date().toISOString() },
      },
    } as any);

    // 2. Add verified products
    await productRepository.createProduct({
      workspaceId: wsId,
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
      workspaceId: wsId,
      productId: 'prod_pourover_kit',
      name: 'Artisan Pour-Over Starter Bundle',
      price: 1200,
      category: 'Brewing Equipment',
      source: 'USER_CONFIRMED',
      inStock: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // 3. Add brand guidelines
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

    // 4. Generate ICP Personas
    const personas = await customerIntelligenceEngine.generateOrEnrichPersonas(wsId);

    assert.ok(personas.length >= 2, 'Should synthesize at least 2 distinct personas (B2C & B2B)');

    const b2cPersona = personas.find((p) => p.segment === 'B2C')!;
    assert.ok(b2cPersona, 'Should produce a B2C persona');
    assert.equal(b2cPersona.name, 'The Connoisseur Home Brewer');
    assert.ok(b2cPersona.jobsToBeDone.functional.length > 0);
    assert.ok(b2cPersona.jobsToBeDone.emotional.length > 0);
    assert.ok(b2cPersona.corePains.length > 0);
    assert.ok(b2cPersona.buyingTriggers.length > 0);
    assert.equal(b2cPersona.willingnessToPay.tier, 'HIGH');
    assert.ok(b2cPersona.willingnessToPay.rationale.includes('450') || b2cPersona.willingnessToPay.rationale.includes('1200'));

    const b2bPersona = personas.find((p) => p.segment === 'B2B')!;
    assert.ok(b2bPersona, 'Should produce a B2B persona');
    assert.equal(b2bPersona.name, 'The Boutique Cafe Operator');
    assert.equal(b2bPersona.willingnessToPay.tier, 'PREMIUM');

    // Verify persistence in audienceSegmentRepository
    const storedSegments = await audienceSegmentRepository.listByWorkspace(wsId);
    assert.ok(storedSegments.length >= 2, 'Segments must be persisted to AudienceSegmentRepository');

    // Verify persistence in businessProfileRepository
    const updatedProfile = await businessProfileRepository.getProfile(wsId);
    assert.ok(updatedProfile?.customerPersonas && updatedProfile.customerPersonas.length >= 2);
  });

  it('2. Clusters raw customer objections and generates brand-aligned rebuttal playbooks', async () => {
    const rawFeedback = [
      { content: 'Your beans are way more expensive than Starbucks and grocery store coffee.', rating: 2 },
      { content: 'Not sure if the taste difference is actually worth ₹450 a bag.', rating: 3 },
      { content: 'How do I know these beans are genuinely fresh and roasted recently?', rating: 3 },
      { content: 'I have an AeroPress and cannot tell which grind setting to pick on the checkout screen.', rating: 3 },
    ];

    const clusters = await customerIntelligenceEngine.clusterAndSynthesizeObjections(wsId, rawFeedback);

    assert.ok(clusters.length >= 2, 'Should cluster objections into multiple categories');

    const priceCluster = clusters.find((c) => c.objectionType === 'PRICE_TOO_HIGH')!;
    assert.ok(priceCluster, 'Should identify PRICE_TOO_HIGH cluster');
    assert.ok(priceCluster.rawPhrasings.length >= 1);
    assert.ok(priceCluster.rootCause.length > 10);
    assert.ok(priceCluster.handlingStrategy.length > 10);
    assert.ok(priceCluster.suggestedRebuttal.length > 10);
    assert.equal(priceCluster.severity, 'HIGH');

    // Rebuttal should adhere to brand vocabulary (e.g. Single-Estate, artisanal, farm-to-cup)
    assert.ok(
      priceCluster.suggestedRebuttal.toLowerCase().includes('single-estate') ||
        priceCluster.suggestedRebuttal.toLowerCase().includes('fresh') ||
        priceCluster.suggestedRebuttal.toLowerCase().includes('artisanal')
    );

    const trustCluster = clusters.find((c) => c.objectionType === 'LACK_OF_TRUST')!;
    assert.ok(trustCluster, 'Should identify LACK_OF_TRUST cluster');
    assert.ok(trustCluster.preventativeAction.length > 10);
  });

  it('3. Synthesizes event-driven buying triggers linked to non-video campaign formats', async () => {
    const triggers = await customerIntelligenceEngine.synthesizeBuyingTriggers(wsId);

    assert.ok(triggers.length >= 2);
    for (const t of triggers) {
      assert.ok(t.title.length > 0);
      assert.ok(t.description.length > 0);
      assert.ok(t.marketingAngle.length > 0);

      // STRICT VIDEO EXCLUSION CHECK
      const campaignType = t.suggestedCampaignType;
      assert.ok(
        ['STATIC_CAROUSEL', 'PRINT_COLLATERAL', 'OUTREACH_SEQUENCE', 'RETARGETING_COPY'].includes(campaignType),
        `Campaign format ${campaignType} must strictly adhere to static/vector collateral; no video allowed`
      );
      assert.ok(!campaignType.toLowerCase().includes('video'), 'Must never recommend video format');
      assert.ok(!campaignType.toLowerCase().includes('reel'), 'Must never recommend reel format');
    }
  });

  it('4. Predicts customer churn risk with RFM transaction telemetry and friction signals', () => {
    const now = new Date('2026-11-27T12:00:00Z');
    const transactions: CustomerTransactionRecord[] = [
      // Active customer (ordered 5 days ago)
      { customerId: 'cust_active', orderId: 'ord_1', amount: 450, timestamp: '2026-11-22T10:00:00Z' },
      { customerId: 'cust_active', orderId: 'ord_2', amount: 900, timestamp: '2026-10-15T10:00:00Z' },

      // Lapsing customer (ordered 65 days ago)
      { customerId: 'cust_lapsing', orderId: 'ord_3', amount: 450, timestamp: '2026-09-23T10:00:00Z' },
      { customerId: 'cust_lapsing', orderId: 'ord_4', amount: 450, timestamp: '2026-08-20T10:00:00Z' },

      // Critical churned customer (ordered 110 days ago with open complaint)
      { customerId: 'cust_critical', orderId: 'ord_5', amount: 1200, timestamp: '2026-08-09T10:00:00Z' },
      { customerId: 'cust_critical', orderId: 'ord_6', amount: 1200, timestamp: '2026-07-01T10:00:00Z' },
      { customerId: 'cust_critical', orderId: 'ord_7', amount: 1200, timestamp: '2026-06-01T10:00:00Z' },
    ];

    const unresolvedComplaints = [
      {
        customerId: 'cust_critical',
        complaint: 'Received wrong grind size (French Press instead of Espresso) and bag was unsealed.',
        daysOpen: 14,
      },
    ];

    const assessment = customerIntelligenceEngine.predictChurnRisk({
      workspaceId: wsId,
      transactions,
      unresolvedComplaints,
      referenceDate: now.toISOString(),
    });

    assert.equal(assessment.totalCustomersAnalyzed, 3);
    assert.ok(assessment.highRiskCustomerCount >= 1);

    const activeCust = assessment.customerAssessments.find((c) => c.customerId === 'cust_active')!;
    assert.ok(activeCust);
    assert.equal(activeCust.riskTier, 'LOW');
    assert.ok(activeCust.churnRiskScore < 30);

    const lapsingCust = assessment.customerAssessments.find((c) => c.customerId === 'cust_lapsing')!;
    assert.ok(lapsingCust);
    assert.ok(['ELEVATED', 'HIGH'].includes(lapsingCust.riskTier));
    assert.ok(lapsingCust.daysSinceLastOrder > 60);

    const criticalCust = assessment.customerAssessments.find((c) => c.customerId === 'cust_critical')!;
    assert.ok(criticalCust);
    assert.equal(criticalCust.riskTier, 'CRITICAL');
    assert.ok(criticalCust.churnRiskScore >= 75);
    assert.equal(criticalCust.recommendedIntervention.priority, 'P0_IMMEDIATE');
    assert.equal(criticalCust.recommendedIntervention.interventionType, 'CONCIERGE_CHECK_IN');
    assert.ok(criticalCust.recommendedIntervention.actionDescription.includes('Founder'));
  });

  it('5. Synergizes with BusinessDiagnosisEngine: customer intelligence elevates positioning health', async () => {
    // Execute comprehensive diagnosis on the workspace after customer intelligence is populated
    const diagnosis = await businessDiagnosisEngine.diagnoseBusiness(wsId);

    // Check Dimension 2: MARKET_FIT_POSITIONING
    const dim2 = diagnosis.dimensions.MARKET_FIT_POSITIONING;
    assert.ok(dim2.score >= 80, `Expected positioning score >= 80, got ${dim2.score}`);
    assert.equal(dim2.status, 'EXCELLENT');
    assert.ok(
      Number(dim2.keyMetrics.customerPersonasCount) >= 2,
      'Diagnosis must recognize the synthesized ICP personas'
    );
    assert.ok(
      dim2.findings.some((f) => f.statement.includes('ICP persona(s) configured')),
      'Findings must confirm configured ICP personas'
    );
  });
});
