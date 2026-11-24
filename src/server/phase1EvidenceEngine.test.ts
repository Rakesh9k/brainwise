/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { evidenceEngineService } from './services/evidenceEngineService';
import { contradictionDetectionEngine } from './services/contradictionService';
import { evidenceLakeRepository } from './repositories/evidenceLakeRepository';
import type { EvidenceFinding } from './types/evidence';

describe('PHASE 1 — MASTER CENTRAL EVIDENCE ENGINE SUITE', () => {
  const workspaceA = `ws_ev_phase1_test_a_${Date.now()}`;
  const workspaceB = `ws_ev_phase1_test_b_${Date.now()}`;

  // ---------------------------------------------------------------------------
  // 1. Evidence Extraction & 4-Tier Classification
  // ---------------------------------------------------------------------------
  it('1. Correctly classifies primary official government source as VERIFIED', async () => {
    const finding = await evidenceEngineService.ingestFinding({
      workspaceId: workspaceA,
      topic: 'MSME Tax Exemption Limits 2026',
      sourceTitle: 'Ministry of Finance Official Gazette Notification',
      sourceUrl: 'https://incometaxindia.gov.in/notifications/2026/msme-limits',
      sourceType: 'GOVERNMENT_PUBLICATION',
      publicationDate: '2026-02-15T00:00:00Z',
      extractedEvidence: 'Threshold for MSME presumptive taxation raised to ₹3 Crore.',
      quoteOrSummary: 'Under section 44AD, turnover threshold stands enhanced to ₹30,000,000.',
      geographicRelevance: 'IN',
      evidenceConfidence: 0.96,
      relatedDepartment: 'FINANCIAL',
      extractedMetrics: { threshold: '₹3 Cr', section: '44AD' },
    });

    assert.equal(finding.classification, 'VERIFIED');
    assert.equal(finding.workspaceId, workspaceA);
    assert.equal(finding.relatedDepartment, 'FINANCIAL');
  });

  it('2. Correctly classifies findings confirmed by multiple independent sources as CORROBORATED', async () => {
    const finding = await evidenceEngineService.ingestFinding({
      workspaceId: workspaceA,
      topic: 'Indian D2C Logistics Costs',
      sourceTitle: 'Logistics Industry Benchmarks Consolidated',
      sourceUrl: 'https://industryreport.com/logistics-benchmarks',
      sourceType: 'INDUSTRY_REPORT',
      extractedEvidence: 'Average forward shipping cost is ₹65 per 500g package across tier 1-2 cities.',
      quoteOrSummary: 'Consensus from 3 carrier networks indicates median delivery cost of ₹65.',
      geographicRelevance: 'IN',
      evidenceConfidence: 0.78,
      relatedDepartment: 'MARKET',
      corroboratingSourcesCount: 3,
    });

    assert.equal(finding.classification, 'CORROBORATED');
  });

  it('3. Correctly classifies modeled market projections and sizing as ESTIMATED', async () => {
    const finding = await evidenceEngineService.ingestFinding({
      workspaceId: workspaceA,
      topic: 'SaaS Sizing Projections 2027',
      sourceTitle: 'Bottom-up Addressable Market Model',
      sourceUrl: 'https://internal.brainwise.app/models/tam',
      sourceType: 'PUBLIC_MARKET_DATA',
      extractedEvidence: 'Calculated SOM estimated at ₹45 Cr assuming 2.5% market capture of target salons.',
      quoteOrSummary: 'Estimated revenue model based on 15,000 target establishments paying ₹30,000 ARR.',
      geographicRelevance: 'IN',
      evidenceConfidence: 0.65,
      relatedDepartment: 'IDEA',
    });

    assert.equal(finding.classification, 'ESTIMATED');
  });

  it('4. Classifies uncorroborated single search snippets or forum reviews as UNVERIFIED', async () => {
    const finding = await evidenceEngineService.ingestFinding({
      workspaceId: workspaceA,
      topic: 'Rumored Competitor Expansion',
      sourceTitle: 'Reddit r/startups Discussion Thread',
      sourceUrl: 'https://reddit.com/r/startups/comments/rumor-competitor',
      sourceType: 'COMMUNITY_DISCUSSION',
      extractedEvidence: 'User claims competitor XYZ is shutting down their enterprise tier next month.',
      quoteOrSummary: 'I heard from a friend working there that enterprise is being axed.',
      geographicRelevance: 'GLOBAL',
      evidenceConfidence: 0.45,
      relatedDepartment: 'COMPETITIVE',
    });

    assert.equal(finding.classification, 'UNVERIFIED');
  });

  // ---------------------------------------------------------------------------
  // 2. Contradiction Detection Engine Tests
  // ---------------------------------------------------------------------------
  it('5. Detects numerical divergence (>25%) and flags contradiction with explanation', () => {
    const finding1: EvidenceFinding = {
      findingId: 'f1',
      workspaceId: workspaceA,
      topic: 'Coffee Market Size',
      sourceTitle: 'Statista Market Forecast',
      sourceUrl: 'https://statista.com/coffee-market',
      sourceType: 'INDUSTRY_REPORT',
      retrievalDate: '2026-01-01T00:00:00Z',
      publicationDate: '2025-06-01T00:00:00Z',
      extractedEvidence: 'Market is projected at ₹12,000 Cr by 2028.',
      quoteOrSummary: 'Estimated market size of ₹12,000 Cr.',
      geographicRelevance: 'IN',
      evidenceConfidence: 0.85,
      classification: 'CORROBORATED',
      relatedDepartment: 'MARKET',
    };

    const finding2: EvidenceFinding = {
      findingId: 'f2',
      workspaceId: workspaceA,
      topic: 'Coffee Market Size',
      sourceTitle: 'Local Commerce Association Audit',
      sourceUrl: 'https://commerce.local/coffee',
      sourceType: 'PUBLIC_MARKET_DATA',
      retrievalDate: '2026-01-01T00:00:00Z',
      publicationDate: '2025-08-01T00:00:00Z',
      extractedEvidence: 'Market estimated at only ₹5,000 Cr annually.',
      quoteOrSummary: 'Verified regional retail volume totals ₹5,000 Cr.',
      geographicRelevance: 'IN',
      evidenceConfidence: 0.75,
      classification: 'ESTIMATED',
      relatedDepartment: 'MARKET',
    };

    const report = contradictionDetectionEngine.analyzeDiscrepancies({
      topic: 'Coffee Market Size',
      metricOrClaim: 'Total Market Revenue',
      findings: [finding1, finding2],
    });

    assert.equal(report.hasContradiction, true);
    assert.equal(report.recommendedPresentation, 'FLAG_DISAGREEMENT');
    assert.match(report.credibilityComparison.explanation, /Highest authority source/);
  });

  it('6. Reconciles geographic territory discrepancies cleanly', () => {
    const globalFinding: EvidenceFinding = {
      findingId: 'f_global',
      workspaceId: workspaceA,
      topic: 'CRM Market TAM',
      sourceTitle: 'Gartner Global CRM Outlook',
      sourceUrl: 'https://gartner.com/crm-global',
      sourceType: 'INDUSTRY_REPORT',
      retrievalDate: '2026-01-01T00:00:00Z',
      extractedEvidence: 'Worldwide CRM revenue stands at $65 Billion.',
      quoteOrSummary: 'Global enterprise spending reaches $65B.',
      geographicRelevance: 'GLOBAL',
      evidenceConfidence: 0.9,
      classification: 'CORROBORATED',
      relatedDepartment: 'MARKET',
    };

    const indiaFinding: EvidenceFinding = {
      findingId: 'f_in',
      workspaceId: workspaceA,
      topic: 'CRM Market TAM',
      sourceTitle: 'NASSCOM India SaaS Dossier',
      sourceUrl: 'https://nasscom.in/saas-dossier',
      sourceType: 'INDUSTRY_REPORT',
      retrievalDate: '2026-01-01T00:00:00Z',
      extractedEvidence: 'India domestic CRM market reaches ₹2,800 Cr.',
      quoteOrSummary: 'Domestic Indian business adoption totals ₹2,800 Cr.',
      geographicRelevance: 'IN',
      evidenceConfidence: 0.88,
      classification: 'CORROBORATED',
      relatedDepartment: 'MARKET',
    };

    const report = contradictionDetectionEngine.analyzeDiscrepancies({
      topic: 'CRM Market TAM',
      metricOrClaim: 'Addressable Market Size',
      findings: [globalFinding, indiaFinding],
    });

    assert.ok(report.geographicDifference);
    assert.equal(report.geographicDifference?.geoA, 'GLOBAL');
    assert.equal(report.geographicDifference?.geoB, 'IN');
    assert.match(report.reconciliationVerdict, /geographic scope/i);
  });

  // ---------------------------------------------------------------------------
  // 3. Evidence Graph Edge Linking
  // ---------------------------------------------------------------------------
  it('7. Links and retrieves semantic edges in the Evidence Knowledge Graph', async () => {
    const edge = await evidenceEngineService.linkEvidenceGraphEdge({
      workspaceId: workspaceA,
      sourceNodeId: 'ev_find_competitor_price_drop',
      sourceNodeType: 'FINDING',
      targetNodeId: 'product_core_subscription',
      targetNodeType: 'PRICING',
      relationshipType: 'IMPACTS',
      confidence: 0.92,
      description: 'Competitor dropped price to ₹499/mo, triggering pricing sensitivity evaluation in Strategy Simulator.',
    });

    assert.ok(edge.edgeId.startsWith('edge_'));
    assert.equal(edge.relationshipType, 'IMPACTS');

    const edges = await evidenceEngineService.getEvidenceGraphEdges(workspaceA, 'product_core_subscription');
    assert.ok(edges.length >= 1);
    assert.equal(edges[0].sourceNodeId, 'ev_find_competitor_price_drop');
  });

  // ---------------------------------------------------------------------------
  // 4. Multi-Tenant Isolation
  // ---------------------------------------------------------------------------
  it('8. Enforces strict multi-tenant isolation across workspaces in Evidence Lake', async () => {
    // Ingest finding in Workspace B
    await evidenceEngineService.ingestFinding({
      workspaceId: workspaceB,
      topic: 'Secret Competitive Strategy B',
      sourceTitle: 'Confidential Internal Review',
      sourceUrl: 'https://private.workspace-b.com/review',
      sourceType: 'OFFICIAL_WEBSITE',
      extractedEvidence: 'Proprietary patent pending formula.',
      quoteOrSummary: 'Classified internal formula.',
      geographicRelevance: 'IN',
      evidenceConfidence: 0.95,
      relatedDepartment: 'COMPETITIVE',
    });

    // Query findings for Workspace A
    const findingsA = await evidenceEngineService.getFindings(workspaceA, { department: 'COMPETITIVE' });
    const hasLeakage = findingsA.some((f) => f.workspaceId === workspaceB || f.topic.includes('Secret Competitive Strategy B'));
    assert.equal(hasLeakage, false, 'Workspace A must never access Workspace B evidence records.');
  });
});
