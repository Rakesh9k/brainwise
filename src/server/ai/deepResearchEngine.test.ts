/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { researchEngine } from './researchEngine';
import { toolRegistry } from './toolRegistry';

describe('Deep Research Engine (Incorporating & Improving GPT Researcher)', () => {
  const workspaceId = 'ws_research_test_101';

  it('1. Decomposes inquiries into orthogonal investigative sub-queries', () => {
    // Competitor category query decomposition
    const competitorSubQueries = researchEngine.decomposeQuery(
      'Acme Billing Software',
      'competitor',
      4
    );
    assert.equal(competitorSubQueries.length, 4);
    assert.ok(competitorSubQueries[0].includes('pricing tiers'));
    assert.ok(competitorSubQueries[1].includes('feature matrix'));
    assert.ok(competitorSubQueries[2].includes('complaints'));
    assert.ok(competitorSubQueries[3].includes('positioning'));

    // Pricing category query decomposition
    const pricingSubQueries = researchEngine.decomposeQuery('Cloud Storage SaaS', 'pricing', 3);
    assert.equal(pricingSubQueries.length, 3);
    assert.ok(pricingSubQueries[0].includes('subscription pricing'));
    assert.ok(pricingSubQueries[1].includes('value metric'));
  });

  it('2. Executes RAPID_SCAN deep research with two-tier query execution and 25 credit consumption', async () => {
    const dossier = await researchEngine.conductDeepResearch({
      workspaceId,
      query: 'NextGen CRM for Retail SMBs',
      category: 'market',
      depthTier: 'RAPID_SCAN',
    });

    assert.ok(dossier.dossierId.startsWith('dossier_'));
    assert.equal(dossier.workspaceId, workspaceId);
    assert.equal(dossier.depthTier, 'RAPID_SCAN');
    assert.equal(dossier.subQueriesExecuted.length, 2);
    assert.equal(dossier.creditsConsumed, 25);
    assert.ok(dossier.sources.length > 0);
    assert.ok(dossier.synthesis.includes('Deep multi-vector intelligence dossier'));
  });

  it('3. Executes DEEP_INTELLIGENCE research across 4 orthogonal vectors with 80 credit consumption', async () => {
    const dossier = await researchEngine.conductDeepResearch({
      workspaceId,
      query: 'FinTech Invoicing in India',
      category: 'competitor',
      depthTier: 'DEEP_INTELLIGENCE',
    });

    assert.equal(dossier.depthTier, 'DEEP_INTELLIGENCE');
    assert.equal(dossier.subQueriesExecuted.length, 4);
    assert.equal(dossier.creditsConsumed, 80);
    assert.ok(dossier.sources.length >= 2);

    // Verify deduplication: no duplicate URLs
    const urls = dossier.sources.map((s) => s.url.toLowerCase());
    const uniqueUrls = new Set(urls);
    assert.equal(urls.length, uniqueUrls.size, 'All sources must be strictly deduplicated');
  });

  it('4. Extracts structured key data points with AI_INFERRED provenance and confidence scores', async () => {
    const dossier = await researchEngine.conductDeepResearch({
      workspaceId,
      query: 'B2B Procurement Analytics',
      category: 'pricing',
      depthTier: 'RAPID_SCAN',
    });

    assert.ok(dossier.extractedFacts.length > 0);
    for (const fact of dossier.extractedFacts) {
      assert.ok(fact.fieldKey.startsWith('research.pricing.'));
      assert.ok(fact.metric.length > 0);
      assert.ok(fact.value.length > 0);
      assert.ok(fact.sourceUrl.startsWith('http'));
      assert.equal(fact.provenance, 'AI_INFERRED');
      assert.ok(fact.confidence >= 0.5 && fact.confidence <= 1.0);
    }
  });

  it('5. Detects and flags ungrounded marketing claims or 100% guarantees as unsupported', async () => {
    const dossier = await researchEngine.conductDeepResearch({
      workspaceId,
      query: '100% guarantee zero risk profit boost',
      category: 'market',
      depthTier: 'RAPID_SCAN',
    });

    assert.equal(dossier.unsupportedClaims.length, 1);
    assert.ok(dossier.unsupportedClaims[0].includes('Absolute performance guarantees detected'));
  });

  it('6. Invokes deep_market_research tool seamlessly via ToolRegistry', async () => {
    const deepTool = toolRegistry.get('deep_market_research');
    assert.ok(deepTool, 'deep_market_research tool must be registered in ToolRegistry');
    assert.equal(deepTool.riskCategory, 'LOW');

    const result = (await deepTool.execute(
      {
        query: 'Logistics Warehouse Automation',
        category: 'industry',
        depthTier: 'RAPID_SCAN',
      },
      {
        workspaceId,
        requestId: 'req_tool_test_001',
        userId: 'user_analyst_1',
        riskCategory: 'LOW',
      }
    )) as any;

    assert.ok(result.dossierId);
    assert.equal(result.creditsConsumed, 25);
    assert.ok(result.subQueriesExecuted.length === 2);
    assert.ok(result.extractedFacts.length > 0);
  });
});
