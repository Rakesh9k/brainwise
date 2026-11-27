/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { semanticBusinessMemory } from './services/semanticBusinessMemory';
import { businessProfileRepository } from './repositories/businessProfileRepository';

describe('PHASE 8: SHARED SEMANTIC BUSINESS MEMORY SUITE', () => {
  const wsId = `ws_semantic_mem_${Date.now()}`;

  it('1. Enforces Fact Provenance: blocks AI_INFERRED facts from overriding USER_CONFIRMED ground truth', async () => {
    // 1. Record USER_CONFIRMED Fact
    const confirmedFactRes = await semanticBusinessMemory.recordFact({
      factId: 'fact_price_01',
      workspaceId: wsId,
      category: 'PRODUCT_CATALOG',
      subject: 'Monsoon Malabar Single Estate Blend',
      predicate: 'hasPrice',
      objectValue: 450,
      provenance: 'USER_CONFIRMED',
      confidence: 1.0,
      createdAt: new Date().toISOString(),
      lastVerifiedAt: new Date().toISOString(),
      status: 'ACTIVE',
      departmentOrigin: 'Product',
    });

    assert.equal(confirmedFactRes.hasConflict, false);
    assert.equal(confirmedFactRes.resolution, 'OVERRIDE_APPROVED');

    // 2. Attempt to record conflicting AI_INFERRED fact (scraped or hallucinated ₹300)
    const conflictingAiRes = await semanticBusinessMemory.recordFact({
      factId: 'fact_price_scraped',
      workspaceId: wsId,
      category: 'PRODUCT_CATALOG',
      subject: 'Monsoon Malabar Single Estate Blend',
      predicate: 'hasPrice',
      objectValue: 300,
      provenance: 'AI_INFERRED',
      confidence: 0.75,
      createdAt: new Date().toISOString(),
      lastVerifiedAt: new Date().toISOString(),
      status: 'ACTIVE',
      departmentOrigin: 'MarketWatch',
    });

    assert.equal(conflictingAiRes.hasConflict, true);
    assert.equal(conflictingAiRes.resolution, 'INCOMING_BLOCKED');
    assert.ok(conflictingAiRes.rationale.includes('cannot override USER_CONFIRMED'));

    // 3. Founder explicitly updates price to ₹480 (USER_CONFIRMED)
    const founderUpdateRes = await semanticBusinessMemory.recordFact({
      factId: 'fact_price_updated',
      workspaceId: wsId,
      category: 'PRODUCT_CATALOG',
      subject: 'Monsoon Malabar Single Estate Blend',
      predicate: 'hasPrice',
      objectValue: 480,
      provenance: 'USER_CONFIRMED',
      confidence: 1.0,
      createdAt: new Date().toISOString(),
      lastVerifiedAt: new Date().toISOString(),
      status: 'ACTIVE',
      departmentOrigin: 'Founder',
    });

    assert.equal(founderUpdateRes.hasConflict, true);
    assert.equal(founderUpdateRes.resolution, 'OVERRIDE_APPROVED');
    assert.ok(founderUpdateRes.rationale.includes('updated from "450" to "480"'));
  });

  it('2. Semantic Vector & Hybrid Search returns relevant facts with recency weighting', async () => {
    // Ingest diverse domain facts
    await semanticBusinessMemory.recordFact({
      factId: 'fact_roast_window',
      workspaceId: wsId,
      category: 'BRAND_RULE',
      subject: 'Batch Roasting Window',
      predicate: 'hasDispatchGuarantee',
      objectValue: 'Roasted fresh within 48 hours of dispatch',
      provenance: 'USER_CONFIRMED',
      confidence: 1.0,
      createdAt: new Date().toISOString(),
      lastVerifiedAt: new Date().toISOString(),
      status: 'ACTIVE',
    });

    await semanticBusinessMemory.recordFact({
      factId: 'fact_b2b_portal',
      workspaceId: wsId,
      category: 'STRATEGIC_ANGLE',
      subject: 'Corporate Gifting Procurement',
      predicate: 'hasCapability',
      objectValue: 'Self-serve CSV multi-address upload with automated GST invoices',
      provenance: 'USER_CONFIRMED',
      confidence: 0.95,
      createdAt: new Date().toISOString(),
      lastVerifiedAt: new Date().toISOString(),
      status: 'ACTIVE',
    });

    const searchResults = await semanticBusinessMemory.semanticSearch({
      workspaceId: wsId,
      query: 'What is the roast freshness guarantee for our coffee beans?',
      limit: 3,
    });

    assert.ok(searchResults.length >= 1);
    const topResult = searchResults[0];
    assert.equal(topResult.fact.subject, 'Batch Roasting Window');
    assert.ok(topResult.relevanceScore > 0.3);
    assert.equal(topResult.recencyWeight, 1.0);
  });

  it('3. Stale Data Detection: flags observations exceeding age threshold for re-verification', () => {
    const oldDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(); // 90 days ago

    // Ingest old competitor fact
    (semanticBusinessMemory as any).factStore.get(wsId).push({
      factId: 'fact_old_competitor',
      workspaceId: wsId,
      category: 'COMPETITIVE_INTEL',
      subject: 'Competitor Blue Tokai Standard Bag',
      predicate: 'hasObservedPrice',
      objectValue: 420,
      provenance: 'OBSERVED_EVIDENCE',
      confidence: 0.85,
      createdAt: oldDate,
      lastVerifiedAt: oldDate,
      status: 'ACTIVE',
    });

    const staleFacts = semanticBusinessMemory.detectStaleFacts(wsId, 60);

    assert.ok(staleFacts.length >= 1);
    assert.ok(staleFacts.some((f) => f.factId === 'fact_old_competitor'));
    assert.equal(staleFacts.find((f) => f.factId === 'fact_old_competitor')?.status, 'STALE');
  });

  it('4. Anti-Fatigue Guardrail: tracks angle usage across departments and triggers rotation alert', async () => {
    // Provision workspace profile
    await businessProfileRepository.saveProfile({
      workspaceId: wsId,
      businessName: 'Solstice Craft Coffee Roasters',
      strategicMemory: {
        usedAngles: [],
        fatiguedThemes: [],
        explicitExclusions: [],
        lastUpdated: new Date().toISOString(),
      },
    } as any);

    const theme = 'Single-Estate Origin Traceability';
    const angle = 'Every bean traceable to high-altitude Chikmagalur estates';

    // 1st usage by BrandStudio
    const record1 = await semanticBusinessMemory.recordAngleUsage({
      workspaceId: wsId,
      theme,
      angle,
      department: 'BrandStudio',
    });
    assert.equal(record1.usageCountLast30Days, 1);
    assert.equal(record1.isFatigued, false);

    // 2nd usage by GrowthDirector
    const record2 = await semanticBusinessMemory.recordAngleUsage({
      workspaceId: wsId,
      theme,
      angle,
      department: 'GrowthDirector',
    });
    assert.equal(record2.usageCountLast30Days, 2);
    assert.equal(record2.isFatigued, false);

    // 3rd usage triggers Anti-Fatigue Guardrail
    const record3 = await semanticBusinessMemory.recordAngleUsage({
      workspaceId: wsId,
      theme,
      angle,
      department: 'BrandStudio',
    });
    assert.equal(record3.usageCountLast30Days, 3);
    assert.equal(record3.isFatigued, true);
    assert.ok(record3.alternativeSuggestion!.includes('Rotate to secondary angle'));
  });
});
