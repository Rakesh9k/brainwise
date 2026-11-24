/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

process.env.NODE_ENV = 'test';

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { businessContextEngine } from './services/businessContextEngine';
import { competitorDiscoveryEngine } from './services/competitorDiscoveryEngine';
import { productAndPricingEngine } from './services/productAndPricingEngine';
import { marketingAndVoiceEngine } from './services/marketingAndVoiceEngine';
import { financialAndTrendsEngine } from './services/financialAndTrendsEngine';
import { competitiveStrategyEngine } from './services/competitiveStrategyEngine';
import { competitiveEvidenceService } from './services/competitiveEvidenceService';

describe('COMPETITIVE INTELLIGENCE — UNIT TEST SUITE', () => {
  // ---------------------------------------------------------------------------
  // 1. Business Context Extraction & Dynamic Research Planning
  // ---------------------------------------------------------------------------
  it('1. Extracts 12 context dimensions and dynamic research plan from single sentence', () => {
    const context = businessContextEngine.deterministicContextExtraction(
      'I want to launch a premium craft chocolate brand in India'
    );

    assert.equal(context.industry, 'Food & Beverage');
    assert.equal(context.category, 'Artisan & Premium Chocolate');
    assert.equal(context.targetGeography, 'India');
    assert.ok(context.customerSegments.length >= 3);
    assert.ok(context.intendedBusinessModel.some((m) => m.includes('D2C') || m.includes('Gifting')));
    assert.equal(context.pricePositioning, 'Premium');
    assert.ok(context.distributionModel.length >= 2);
    assert.equal(context.businessStage, 'Concept');
    assert.ok(context.potentialMarketSegments.length >= 3);
    assert.ok(context.relevantAdjacentIndustries.length >= 2);
    assert.ok(context.dynamicResearchPlan.length >= 8);
    assert.ok(context.dynamicResearchPlan.some((t) => t.category === 'benchmarking'));
  });

  // ---------------------------------------------------------------------------
  // 2. Competitor Relevance Scoring & Deduplication
  // ---------------------------------------------------------------------------
  it('2. Computes 6-dimensional relevance score and resolves canonical aliases', () => {
    const context = businessContextEngine.deterministicContextExtraction(
      'I want to launch a premium chocolate brand in India'
    );

    const score = competitorDiscoveryEngine.calculateRelevanceScore({
      context,
      productSimilarity: 95,
      customerOverlap: 90,
      geographicOverlap: 90,
      businessModelSimilarity: 85,
      pricingOverlap: 80,
      competitiveThreat: 90,
      reasoning: 'Direct artisan peer in India',
    });

    assert.ok(score.overallScore >= 85 && score.overallScore <= 100);
    assert.equal(score.productSimilarity, 95);
    assert.equal(score.geographicOverlap, 90);

    // Test alias canonicalization
    const alias1 = competitorDiscoveryEngine.canonicalizeCompanyName('Paul & Mike Farm to Bar Inc.');
    const alias2 = competitorDiscoveryEngine.canonicalizeCompanyName('Paul and Mike');
    assert.equal(alias1, 'paulandmike');
    assert.equal(alias2, 'paulandmike');
    assert.equal(alias1, alias2);

    // Test duplicate resolution
    const duplicates = [
      {
        competitorId: 'comp_1',
        name: 'Paul & Mike',
        canonicalName: 'paulandmike',
        aliases: ['Paul & Mike'],
        website: 'https://paulandmike.co',
        headquarters: 'Kochi',
        geography: 'India',
        businessCategory: 'Confectionery',
        productCategory: 'Craft Chocolate',
        businessModel: 'D2C',
        targetAudience: 'Foodies',
        marketPositioning: 'Farm to bar chocolate',
        classification: 'DIRECT' as const,
        relevanceScore: score,
        reasonForInclusion: 'Peer',
        discoverySource: 'Catalog',
        evidenceIds: [],
        confidence: 0.95,
      },
      {
        competitorId: 'comp_2',
        name: 'Paul And Mike Farm To Bar',
        canonicalName: 'paulandmike',
        aliases: ['Paul And Mike'],
        website: 'https://paulandmike.co',
        headquarters: 'Kochi, Kerala',
        geography: 'India',
        businessCategory: 'Food',
        productCategory: 'Dark Chocolate',
        businessModel: 'D2C',
        targetAudience: 'Gourmet buyers',
        marketPositioning: 'Award-winning chocolate',
        classification: 'DIRECT' as const,
        relevanceScore: score,
        reasonForInclusion: 'Direct rival',
        discoverySource: 'Knowledge Graph',
        evidenceIds: [],
        confidence: 0.98,
      },
    ];

    const resolved = competitorDiscoveryEngine.resolveDuplicateCompetitors(duplicates);
    assert.equal(resolved.length, 1);
    assert.ok(resolved[0].aliases.includes('Paul & Mike'));
    assert.ok(resolved[0].aliases.includes('Paul And Mike Farm To Bar'));
  });

  // ---------------------------------------------------------------------------
  // 3. Product & Pricing Normalization
  // ---------------------------------------------------------------------------
  it('3. Normalizes product catalogs and multi-tier pricing structures', () => {
    const context = businessContextEngine.deterministicContextExtraction(
      'Premium craft chocolate brand in India'
    );
    const competitor = competitorDiscoveryEngine.getDeterministicCompetitors(context)[0];

    const products = productAndPricingEngine.extractAndNormalizeProducts(context, competitor);
    assert.ok(products.length >= 2);
    assert.ok(products[0].normalizedPrice);
    assert.equal(products[0].normalizedPrice?.currency, 'INR');
    assert.ok(products[0].industrySpecificAttributes?.cocoaPercentage);

    const pricingTiers = productAndPricingEngine.extractAndNormalizePricingTiers(context, competitor);
    assert.ok(pricingTiers.length >= 3);
    assert.ok(pricingTiers.some((t) => t.tierName.includes('Impulse') || t.tierName.includes('Bar')));
    assert.ok(pricingTiers.some((t) => t.tierName.includes('Hamper') || t.tierName.includes('Flight')));
    assert.ok(pricingTiers[0].price > 0);
  });

  // ---------------------------------------------------------------------------
  // 4. Sentiment & Review Pain-Point Theme Clustering
  // ---------------------------------------------------------------------------
  it('4. Clusters customer voice reviews and extracts actionable pain points', () => {
    const context = businessContextEngine.deterministicContextExtraction(
      'Premium craft chocolate brand in India'
    );
    const competitors = competitorDiscoveryEngine.getDeterministicCompetitors(context);

    const voice = marketingAndVoiceEngine.extractCustomerVoiceThemes(context, competitors);
    assert.ok(voice.overallSentimentScore >= 50 && voice.overallSentimentScore <= 100);
    assert.ok(voice.painPointThemes.length >= 2);

    const meltingPain = voice.painPointThemes.find((t) => t.title.includes('Melting'));
    assert.ok(meltingPain);
    assert.equal(meltingPain.category, 'Delivery');
    assert.equal(meltingPain.severityLevel, 'HIGH');
    assert.ok(meltingPain.sampleQuotes.length >= 1);
    assert.ok(meltingPain.exploitableOpportunity.length > 0);
  });

  // ---------------------------------------------------------------------------
  // 5. Multi-Axis Benchmarking & 2D Euclidean Distance Math
  // ---------------------------------------------------------------------------
  it('5. Computes explainable multi-axis benchmark scores and 2D Euclidean matrix', () => {
    const context = businessContextEngine.deterministicContextExtraction(
      'Premium craft chocolate brand in India'
    );
    const competitors = competitorDiscoveryEngine.getDeterministicCompetitors(context);

    const benchmarks = competitiveStrategyEngine.benchmarkCompetitors(context, competitors);
    assert.equal(benchmarks.length, competitors.length);

    const bm = benchmarks[0];
    assert.ok(bm.aggregateBenchmarkScore >= 60 && bm.aggregateBenchmarkScore <= 100);
    assert.ok(bm.dimensions.productStrength.score >= 70);
    assert.ok(bm.dimensions.brandPositioning.reasoning.length > 0);

    const matrix = competitiveStrategyEngine.calculatePositioningMatrix(
      { xPrice: 50, yDepthOrDiff: 75, label: 'Founder Business' },
      benchmarks,
      competitors
    );

    assert.ok(matrix.competitors.length >= 1);
    assert.ok(matrix.nearestDistance >= 0);
    assert.ok(matrix.whitespaceOpportunities.length >= 2);
    assert.ok(matrix.quadrantAnalysis.userQuadrant.length > 0);
  });

  // ---------------------------------------------------------------------------
  // 6. 12-Factor Market Opportunity Prioritization
  // ---------------------------------------------------------------------------
  it('6. Detects and ranks evidence-backed market opportunities', () => {
    const context = businessContextEngine.deterministicContextExtraction(
      'Premium craft chocolate brand in India'
    );
    const competitors = competitorDiscoveryEngine.getDeterministicCompetitors(context);
    const benchmarks = competitiveStrategyEngine.benchmarkCompetitors(context, competitors);
    const voice = marketingAndVoiceEngine.extractCustomerVoiceThemes(context, competitors);

    const opps = competitiveStrategyEngine.detectMarketOpportunities(
      context,
      benchmarks,
      voice.painPointThemes
    );

    assert.ok(opps.length >= 2);
    assert.equal(opps[0].priorityRank, 1);
    assert.ok(opps[0].supportingEvidence.length >= 1);
    assert.ok(opps[0].validationMethod.length > 0);
    assert.ok(opps[0].suggestedNextAction.length > 0);
  });

  // ---------------------------------------------------------------------------
  // 7. Evidence Ingestion & Contradiction Detection
  // ---------------------------------------------------------------------------
  it('7. Ingests evidence, evaluates authority, and flags severe pricing contradictions', async () => {
    const ws = `ws_unit_evidence_${Date.now()}`;

    const claim1 = await competitiveEvidenceService.ingestClaim({
      workspaceId: ws,
      competitorId: 'comp_test',
      claim: 'Product X is priced at ₹250 per bar.',
      sourceUrl: 'https://official-brand.com',
      sourceName: 'Official Website',
      sourceCategory: 'OFFICIAL_WEBSITE',
      evidenceExcerpt: 'Single bar price ₹250.',
    });

    const claim2 = await competitiveEvidenceService.ingestClaim({
      workspaceId: ws,
      competitorId: 'comp_test',
      claim: 'Product X is priced at ₹550 per bar in secondary resellers.',
      sourceUrl: 'https://reseller.com',
      sourceName: 'Reseller Portal',
      sourceCategory: 'MARKETPLACE',
      evidenceExcerpt: 'Price listed as ₹550.',
    });

    assert.equal(claim1.sourceAuthority, 95);
    assert.equal(claim2.sourceAuthority, 80);

    const contradictions = competitiveEvidenceService.detectContradictions([claim1, claim2]);
    assert.equal(contradictions.length, 1);
    assert.ok(contradictions[0].reason.includes('pricing discrepancy'));
  });
});
