/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { competitiveStrategyEngine } from './services/competitiveStrategyEngine';
import { businessProfileRepository } from './repositories/businessProfileRepository';
import { productRepository } from './repositories/productRepository';
import { brandIdentityRepository } from './repositories/brandIdentityRepository';
import { competitorRepository } from './repositories/competitorRepository';
import { sharedBusinessContextService } from './services/sharedBusinessContextService';

describe('PHASE 5: COMPETITIVE STRATEGY ENGINE SUITE', () => {
  const wsCoffee = `ws_comp_strat_coffee_${Date.now()}`;
  const wsSaas = `ws_comp_strat_saas_${Date.now()}`;

  it('1. Generates 5-category Feature Parity Matrix with quantified advantage classifications', async () => {
    // 1. Setup Coffee Roastery Workspace
    await businessProfileRepository.saveProfile({
      workspaceId: wsCoffee,
      businessName: 'Solstice Craft Coffee Roasters',
      industry: 'Specialty Beverage',
      category: 'Artisan Coffee',
      subIndustry: 'Third-Wave Coffee Roastery',
      location: 'Bangalore, India',
      stage: 'growth',
      version: 1,
      valueProposition: 'Direct-trade estate Arabica roasted fresh within 48 hours of dispatch.',
      provenance: {
        businessName: { source: 'USER_CONFIRMED', verifiedAt: new Date().toISOString() },
        valueProposition: { source: 'USER_CONFIRMED', verifiedAt: new Date().toISOString() },
      },
    } as any);

    await productRepository.createProduct({
      workspaceId: wsCoffee,
      productId: 'prod_estate_blend',
      name: 'Monsoon Malabar Single Estate (250g)',
      price: 450,
      category: 'Whole Bean Coffee',
      source: 'USER_CONFIRMED',
      inStock: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await productRepository.createProduct({
      workspaceId: wsCoffee,
      productId: 'prod_tasting_flight',
      name: '3-Estate Discovery Flight (3x100g)',
      price: 850,
      category: 'Tasting Flight',
      source: 'USER_CONFIRMED',
      inStock: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await competitorRepository.create({
      workspaceId: wsCoffee,
      competitorId: 'comp_blue_tokai',
      name: 'Blue Tokai Coffee Roasters',
      website: 'https://bluetokaicoffee.com',
      tier: 'DIRECT',
      strengths: ['Massive cafe retail footprint', 'Fast delivery via dark stores'],
      weaknesses: ['Mass batch roasting loses micro-lot freshness transparency'],
      pricingTier: 'PREMIUM',
      priceLevel: 450,
      status: 'active',
      isMonitored: true,
      monitoringFrequency: 'Weekly',
      lastCrawled: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    sharedBusinessContextService.invalidateCache(wsCoffee);

    const parityMatrix = await competitiveStrategyEngine.generateFeatureParityMatrix(
      wsCoffee,
      'comp_blue_tokai'
    );

    assert.equal(parityMatrix.workspaceId, wsCoffee);
    assert.equal(parityMatrix.competitorName, 'Blue Tokai Coffee Roasters');
    assert.ok(parityMatrix.features.length >= 4);

    // Verify feature classifications
    const classifications = parityMatrix.features.map((f) => f.classification);
    assert.ok(classifications.includes('USER_ADVANTAGE'));
    assert.ok(classifications.includes('COMPETITOR_ADVANTAGE'));
    assert.ok(classifications.includes('TABLE_STAKES_PARITY'));
    assert.ok(classifications.includes('WHITESPACE_GAP'));

    // Check specific user advantage
    const freshnessAdv = parityMatrix.features.find((f) => f.capabilityName.includes('Roast Date'))!;
    assert.ok(freshnessAdv);
    assert.equal(freshnessAdv.classification, 'USER_ADVANTAGE');
    assert.equal(freshnessAdv.userStatus, 'SUPPORTED');
    assert.ok(freshnessAdv.strategicSignificance.length > 10);

    // Check competitor advantage
    const deliveryAdv = parityMatrix.features.find((f) => f.capabilityName.includes('Delivery Speed'))!;
    assert.ok(deliveryAdv);
    assert.equal(deliveryAdv.classification, 'COMPETITOR_ADVANTAGE');
    assert.equal(deliveryAdv.competitorStatus, 'SUPPORTED');

    // Check whitespace gap (B2B corporate gifting)
    const b2bGap = parityMatrix.features.find((f) => f.capabilityName.includes('Corporate Gifting'))!;
    assert.ok(b2bGap);
    assert.equal(b2bGap.classification, 'WHITESPACE_GAP');

    assert.ok(parityMatrix.overallAdvantageRatio.userAdvantages >= 1);
    assert.ok(parityMatrix.overallAdvantageRatio.competitorAdvantages >= 1);
    assert.ok(parityMatrix.strategicTakeaway.includes('Blue Tokai Coffee Roasters'));
  });

  it('2. Computes mathematical pricing gaps, identifies anomalies and recommends corrective actions', async () => {
    const customTiers = [
      { competitorName: 'Blue Tokai', tierName: 'Standard 250g', price: 470 },
      { competitorName: 'Subko Specialty', tierName: 'Estate Lot', price: 650 },
      { competitorName: 'Commercial Brand', tierName: 'Supermarket Roast', price: 280 },
    ];

    const pricingGap = await competitiveStrategyEngine.analyzePricingGaps(wsCoffee, customTiers);

    assert.equal(pricingGap.workspaceId, wsCoffee);
    assert.ok(pricingGap.userAveragePrice === 650); // (450 + 850) / 2 = 650
    assert.equal(pricingGap.userPriceRange.min, 450);
    assert.equal(pricingGap.userPriceRange.max, 850);
    assert.ok(pricingGap.competitorAveragePrice > 0);
    assert.ok(typeof pricingGap.gapPercentage === 'number');
    assert.ok(['PARITY_TIER', 'PREMIUM_TIER', 'VALUE_DISRUPTOR'].includes(pricingGap.pricingPosition));
    assert.ok(pricingGap.identifiedAnomalies.length > 0);
    assert.ok(pricingGap.recommendedPricingAction.length > 15);
  });

  it('3. Detects competitor vulnerabilities and formulates customer acquisition playbooks', async () => {
    const vulnerableSegments = await competitiveStrategyEngine.detectVulnerableSegments(wsCoffee);

    assert.ok(vulnerableSegments.length >= 2);
    for (const seg of vulnerableSegments) {
      assert.ok(seg.segmentId.length > 0);
      assert.ok(seg.competitorName.length > 0);
      assert.ok(seg.evidenceProof.length >= 1);
      assert.ok(seg.affectedAudience.length > 0);

      const pb = seg.acquisitionPlaybook;
      assert.ok(pb.playbookTitle.length > 0);
      assert.ok(pb.hookMessage.length > 0);
      assert.ok(pb.recommendedChannel.length > 0);

      // STRICT VIDEO EXCLUSION
      assert.ok(
        ['STATIC_CAROUSEL', 'PRINT_COLLATERAL', 'OUTREACH_SEQUENCE', 'RETARGETING_COPY'].includes(
          pb.suggestedAssetFormat
        ),
        'Must strictly adhere to non-video formats'
      );
      assert.ok(!pb.suggestedAssetFormat.toLowerCase().includes('video'));
    }
  });

  it('4. Synthesizes contrastive counter-positioning angles with grounded proof points', async () => {
    // Add brand identity to verify claim adherence
    await brandIdentityRepository.save({
      workspaceId: wsCoffee,
      brandIdentityId: `brand_${wsCoffee}`,
      brandName: 'Solstice Coffee',
      voice: ['Artisanal', 'Direct'],
      wordsToUse: ['Single-Estate', 'Farm-to-Cup'],
      wordsToAvoid: ['Instant', 'Commercial Grade'],
      approvedClaims: ['100% Single-Estate Arabica', 'Direct-Trade Sourced'],
      restrictedClaims: ['Certified organic without estate documentation'],
      status: 'approved',
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const angles = await competitiveStrategyEngine.synthesizeCounterPositioningAngles(wsCoffee);

    assert.ok(angles.length >= 3);
    for (const a of angles) {
      assert.ok(a.angleId.length > 0);
      assert.ok(a.angleName.length > 0);
      assert.ok(a.incumbentVulnerability.length > 0);
      assert.ok(a.contrastStatement.length > 0);
      assert.ok(a.targetAudience.length > 0);
      assert.ok(a.groundedProofPoint.length > 0);

      // Verify non-video format
      assert.ok(['STATIC_CAROUSEL', 'PRINT_COLLATERAL', 'RETARGETING_COPY', 'OUTREACH_SEQUENCE'].includes(a.suggestedCampaignFormat));
      assert.ok(!a.suggestedCampaignFormat.toLowerCase().includes('video'));
    }

    const freshnessAngle = angles.find((a) => a.angleName.includes('Roast Date'))!;
    assert.ok(freshnessAngle);
    assert.ok(freshnessAngle.contrastStatement.includes('Blue Tokai') || freshnessAngle.contrastStatement.includes('Commercial'));
  });

  it('5. Operates dynamically across diverse industries (SaaS without hardcoded chocolate assumptions)', async () => {
    // Provision B2B SaaS Workspace
    await businessProfileRepository.saveProfile({
      workspaceId: wsSaas,
      businessName: 'MetricsPulse Cloud',
      industry: 'Enterprise Software',
      category: 'B2B SaaS',
      subIndustry: 'Cloud Observability & Cost Analytics',
      location: 'San Francisco, CA',
      stage: 'growth',
      version: 1,
      valueProposition: 'Deterministic cloud cost observability without per-host agent tax or annual lock-in.',
      strategicMemory: {
        explicitExclusions: ['Never sign multi-year lock-in contracts'],
        usedAngles: [],
        fatiguedThemes: [],
        lastUpdated: new Date().toISOString(),
      },
      provenance: {
        businessName: { source: 'USER_CONFIRMED', verifiedAt: new Date().toISOString() },
        valueProposition: { source: 'USER_CONFIRMED', verifiedAt: new Date().toISOString() },
      },
    } as any);

    await competitorRepository.create({
      workspaceId: wsSaas,
      competitorId: 'comp_datadog',
      name: 'Datadog Inc',
      website: 'https://datadoghq.com',
      tier: 'DIRECT',
      strengths: ['Extensive enterprise integration ecosystem'],
      weaknesses: ['Punitive per-host pricing, unexpected invoice spikes'],
      pricingTier: 'ENTERPRISE',
      priceLevel: 15000,
      status: 'active',
      isMonitored: true,
      monitoringFrequency: 'Weekly',
      lastCrawled: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    sharedBusinessContextService.invalidateCache(wsSaas);

    const comprehensive = await competitiveStrategyEngine.getComprehensiveCompetitiveStrategy(wsSaas);

    assert.equal(comprehensive.workspaceId, wsSaas);
    assert.ok(comprehensive.parityMatrix.features.length >= 3);
    assert.ok(comprehensive.parityMatrix.features.some((f) => f.capabilityName.includes('Deterministic') || f.capabilityName.includes('Self-Serve')));
    assert.ok(comprehensive.vulnerableSegments.some((s) => s.vulnerabilityType === 'PRICE_HIKES' || s.evidenceProof.some((e) => e.includes('annual'))));
    assert.ok(comprehensive.counterPositioningAngles.some((a) => a.contrastStatement.includes('Datadog') || a.contrastStatement.includes('contract')));

    // Ensure zero references to chocolate or candy
    const jsonStr = JSON.stringify(comprehensive).toLowerCase();
    assert.ok(!jsonStr.includes('cacao'), 'SaaS strategy must not contain chocolate references');
    assert.ok(!jsonStr.includes('chocolate'), 'SaaS strategy must not contain chocolate references');
  });
});
