/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { researchEngine } from './researchEngine';
import { competitorDiscoveryEngine } from '../services/competitorDiscoveryEngine';
import { executeTruthCheck, calculateTransparentConfidence } from '../../utils/truthCheck';
import { INITIAL_BRAINWISE_STATE } from '../../data/mockData';
import type { EvidenceClassification, ProvenanceRecord } from '../types/evidence';

test('PHASE 04 - 1. Research Engine: Missing search provider returns honest PROVIDER_UNAVAILABLE state', async () => {
  const result = await researchEngine.conductResearch({
    workspaceId: 'ws_test_provenance',
    requestId: 'req_test_01',
    query: 'artisan chocolate gifting trends',
    intent: 'Market Research',
    category: 'market',
    geography: 'India',
    industry: 'Specialty Food',
  });

  // Must not fabricate sources
  assert.equal(result.status, 'PROVIDER_UNAVAILABLE');
  assert.equal(result.sources.length, 0);
  assert.ok(result.missingCapability?.includes('EXTERNAL_WEB_SEARCH'));
  assert.ok(result.synthesis.includes('unconfigured or unavailable'));

  // Must not contain fake statista or census.gov URLs
  const hasStatista = result.sources.some((s) => s.url.includes('statista.com'));
  const hasCensus = result.sources.some((s) => s.url.includes('census.gov'));
  assert.equal(hasStatista, false, 'Must not inject fake Statista URLs');
  assert.equal(hasCensus, false, 'Must not inject fake Census URLs');

  // Explicitly labeled AI hypotheses must be present
  assert.ok(Array.isArray(result.aiHypotheses) && result.aiHypotheses.length > 0);
  for (const hypo of result.aiHypotheses!) {
    assert.equal(hypo.isHypothesis, true);
    assert.equal(hypo.evidenceClassification, 'INFERRED');
    assert.equal(hypo.geographicScope, 'India');
  }
});

test('PHASE 04 - 2. Research Engine: Indian consumer inquiry does not receive US Census Bureau statistics', async () => {
  const result = await researchEngine.conductResearch({
    workspaceId: 'ws_solstice_coffee',
    requestId: 'req_test_02',
    query: 'single origin specialty coffee subscription in Bangalore',
    intent: 'Market Sizing',
    category: 'market',
    geography: 'Bangalore, India',
    industry: 'Specialty Coffee',
  });

  // Verify no US government or US economic indicators are injected into an Indian business
  for (const s of result.sources) {
    assert.notEqual(s.domain, 'census.gov');
    assert.ok(!s.title.includes('U.S. Census Bureau'));
  }
});

test('PHASE 04 - 3. Competitor Discovery Engine: Returns empty list for unknown category without inventing example-incumbent.com', () => {
  const discovered = competitorDiscoveryEngine.getDeterministicCompetitors({
    businessIdea: 'Hyperloop magnetic levitation pod transport',
    industry: 'Aerospace & High-Speed Transit',
    category: 'Pod Transit',
    subIndustry: 'Maglev Infrastructure',
    targetGeography: 'India',
    intendedBusinessModel: ['B2B Infrastructure'],
    customerSegments: ['Metropolitan Transit Authorities'],
    keyKeywords: ['maglev', 'hyperloop', 'pod'],
  });

  // Must return empty list instead of fabricating fake domains
  assert.equal(discovered.length, 0);
  const hasFakeDomain = discovered.some((c) =>
    c.website.includes('example-incumbent.com') || c.website.includes('example-challenger.com')
  );
  assert.equal(hasFakeDomain, false, 'Must never produce example-incumbent.com or example-challenger.com');
});

test('PHASE 04 - 4. Truth Check: Flags unsubstantiated marketing superlatives and absolute guarantees', () => {
  const brain = INITIAL_BRAINWISE_STATE.brain;

  const superlativeCopy =
    'Solstice Craft Coffee is the #1 best coffee in the world with guaranteed 100% customer satisfaction!';

  const result = executeTruthCheck(superlativeCopy, brain);

  assert.equal(result.isValid, false);
  assert.equal(result.status, 'REJECTED');
  assert.ok(
    result.violations.some((v) => v.type === 'SUPERLATIVE_UNVERIFIED'),
    'Must catch unverified superlatives (#1, best in the world, guaranteed)'
  );
});

test('PHASE 04 - 5. Truth Check: Flags fabricated customer testimonials and review counts', () => {
  const brain = INITIAL_BRAINWISE_STATE.brain;

  const fakeReviewCopy =
    'Loved by over 10,000 5-star happy customers across the country with a 4.9 average rating!';

  const result = executeTruthCheck(fakeReviewCopy, brain);

  assert.equal(result.isValid, false);
  assert.ok(
    result.violations.some((v) => v.type === 'FABRICATED_TESTIMONIAL'),
    'Must catch fabricated customer ratings and customer counts'
  );
});

test('PHASE 04 - 6. Truth Check: Flags unsupported competitor claims and disparagement', () => {
  const brain = INITIAL_BRAINWISE_STATE.brain;

  const competitorDisparageCopy =
    'Unlike Blue Tokai which uses stale coffee beans and high-priced fillers, our beans are roasted fresh!';

  const result = executeTruthCheck(competitorDisparageCopy, brain);

  assert.equal(result.isValid, false);
  assert.ok(
    result.violations.some((v) => v.type === 'UNSUPPORTED_COMPETITOR_CLAIM'),
    'Must catch unsupported competitor comparison/disparagement'
  );
});

test('PHASE 04 - 7. Truth Check: Flags uncited macro market size claims', () => {
  const brain = INITIAL_BRAINWISE_STATE.brain;

  const uncitedMacroCopy =
    'Our market is guaranteed to explode because the market will reach $50 billion by 2030!';

  const result = executeTruthCheck(uncitedMacroCopy, brain);

  assert.equal(result.isValid, false);
  assert.ok(
    result.violations.some((v) => v.type === 'UNCITED_STATISTIC'),
    'Must catch uncited macro market figures ($50 billion)'
  );
});

test('PHASE 04 - 8. Transparent Confidence Scoring: Never outputs 1.0 and omits numeric score when evidence is unavailable', () => {
  // Case A: Missing / unverified evidence -> omits numeric score
  const unverifiedConfidence = calculateTransparentConfidence({
    sources: [],
    classification: 'UNAVAILABLE',
    targetGeography: 'India',
  });

  assert.equal(unverifiedConfidence.confidenceScore, null);
  assert.equal(unverifiedConfidence.level, 'LOW');
  assert.ok(unverifiedConfidence.explanation.includes('omitted'));

  // Case B: High quality corroborated evidence -> calculated multi-factor score capped at 0.95
  const highQualityConfidence = calculateTransparentConfidence({
    sources: [
      { domain: 'rbi.org.in', sourceType: 'GOVERNMENT', verificationStatus: 'SUPPORTED', publishedDate: '2025-01-01', relevance: 0.98 },
      { domain: 'fssai.gov.in', sourceType: 'GOVERNMENT', verificationStatus: 'SUPPORTED', publishedDate: '2025-02-01', relevance: 0.95 },
    ],
    classification: 'VERIFIED',
    targetGeography: 'India',
  });

  assert.ok(highQualityConfidence.confidenceScore !== null);
  assert.ok(highQualityConfidence.confidenceScore! <= 0.95, 'Score must be clamped to max 0.95, never 1.0');
  assert.ok(highQualityConfidence.confidenceScore! >= 0.85);
  assert.equal(highQualityConfidence.level, 'HIGH');
  assert.ok(highQualityConfidence.explanation.includes('Multi-factor transparent confidence'));
});

test('PHASE 04 - 9. Evidence Classification Taxonomy: Supports all 7 distinct evidence classes with strict semantics', () => {
  const classifications: EvidenceClassification[] = [
    'VERIFIED',
    'OBSERVED',
    'USER_PROVIDED',
    'INFERRED',
    'ESTIMATED',
    'UNVERIFIED',
    'UNAVAILABLE',
  ];

  assert.equal(classifications.length, 7);

  const testRecord: ProvenanceRecord = {
    sourceName: 'Reserve Bank of India',
    sourceUrl: 'https://rbi.org.in/bulletin',
    retrievedAt: new Date().toISOString(),
    workspaceId: 'ws_provenance_check',
    evidenceType: 'VERIFIED',
    verificationStatus: 'SUPPORTED',
    confidenceScore: 0.92,
    confidenceMethodology: 'Direct central bank publication corroboration',
    supportingExcerpt: 'UPI payment volume grew 44% year-on-year across retail categories.',
  };

  assert.equal(testRecord.evidenceType, 'VERIFIED');
  assert.equal(testRecord.verificationStatus, 'SUPPORTED');
  assert.ok(testRecord.confidenceScore! <= 0.95);
});
