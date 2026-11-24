/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { unifiedReportService } from './services/unifiedReportService';
import { db } from './db/firestore';

describe('PHASE 9 — MASTER UNIFIED REPORT EXPERIENCE & 7-SECTION DOSSIER SUITE', () => {
  const workspaceA = `ws_report_phase9_test_a_${Date.now()}`;
  const workspaceB = `ws_report_phase9_test_b_${Date.now()}`;

  let createdDossierId = '';

  // ---------------------------------------------------------------------------
  // 1. Unified 7-Section Dossier Generation
  // ---------------------------------------------------------------------------
  it('1. Generates unified 7-section executive dossier connecting all intelligence departments', async () => {
    // Seed competitor into workspace
    await db.collection(`workspaces/${workspaceA}/competitors`).doc('comp_incumbent_01').set({
      id: 'comp_incumbent_01',
      workspaceId: workspaceA,
      companyName: 'HeavyCloud Enterprise',
      positioning: 'High-cost enterprise platform with complex implementation',
      pricingModel: '$12,000 annual upfront',
      createdAt: new Date().toISOString(),
    });

    const dossier = await unifiedReportService.generateUnifiedDossier({
      workspaceId: workspaceA,
      title: 'BrainWise Growth Dossier Q4',
      monthlyPrice: 499,
    });

    assert.ok(dossier.dossierId.startsWith('dos_'));
    createdDossierId = dossier.dossierId;
    assert.equal(dossier.workspaceId, workspaceA);
    assert.ok(dossier.overallScore > 0 && dossier.overallScore <= 100);
    assert.ok(['GO', 'CAUTION', 'NO_GO'].includes(dossier.verdict));

    // Section 1: Executive Summary & Opportunity Scoring (Dept 1)
    assert.ok(dossier.section1_ExecutiveSummary.verdictRationale.length > 20);
    assert.ok(dossier.section1_ExecutiveSummary.scoreMatrix.opportunityScore > 0);
    assert.ok(dossier.section1_ExecutiveSummary.scoreMatrix.marketScore > 0);
    assert.ok(dossier.section1_ExecutiveSummary.keyOpportunities.length > 0);

    // Section 2: Market Dynamics (Dept 2)
    assert.ok(dossier.section2_MarketDynamics.tamInr > dossier.section2_MarketDynamics.samInr);
    assert.ok(dossier.section2_MarketDynamics.samInr > dossier.section2_MarketDynamics.somInr);
    assert.ok(dossier.section2_MarketDynamics.indiaMarketSpecifics.tierBreakdown);
    assert.ok(dossier.section2_MarketDynamics.indiaMarketSpecifics.upiAdoptionTrend);

    // Section 3: Competitive Whitespace (Dept 3)
    assert.ok(dossier.section3_CompetitiveWhitespace.trackedCompetitorCount >= 1);
    assert.ok(dossier.section3_CompetitiveWhitespace.whitespaceOpportunity.length > 15);

    // Section 4: Unit Economics (Dept 4)
    assert.equal(dossier.section4_FinancialFeasibility.monthlyPrice, 499);
    assert.ok(dossier.section4_FinancialFeasibility.ltv > dossier.section4_FinancialFeasibility.cac);
    assert.ok(dossier.section4_FinancialFeasibility.ltvCacRatio > 3.0);
    assert.ok(dossier.section4_FinancialFeasibility.breakEvenCustomers > 0);
    assert.ok(dossier.section4_FinancialFeasibility.sixMonthRunwayRequired > 0);

    // Section 5: Brand Blueprint (Dept 5)
    assert.ok(dossier.section5_BrandBlueprint.usp.length > 10);
    assert.equal(dossier.section5_BrandBlueprint.typographyLadder.ratio, 1.25);
    assert.ok(dossier.section5_BrandBlueprint.colorPalette.primary);

    // Section 6: Growth Roadmap (Dept 6)
    assert.ok(dossier.section6_GrowthRoadmap.immediate7DayTasks.length > 0);
    assert.ok(dossier.section6_GrowthRoadmap.immediate7DayTasks[0]!.iceScore > 0);
    assert.ok(dossier.section6_GrowthRoadmap.immediate7DayTasks[0]!.completionCriteria);

    // Section 7: Continuous Surveillance (Dept 7)
    assert.ok(dossier.section7_BusinessWatch.healthScore >= 20);
    assert.ok(dossier.section7_BusinessWatch.complianceState);
  });

  // ---------------------------------------------------------------------------
  // 2. Calculation Transparency Cards
  // ---------------------------------------------------------------------------
  it('2. Embeds transparent calculation cards with documented mathematical formulas and inputs', async () => {
    const dossier = await unifiedReportService.getDossier(workspaceA, createdDossierId);
    assert.ok(dossier);
    assert.ok(dossier.calculationCards.length >= 3);

    for (const card of dossier.calculationCards) {
      assert.ok(card.metricName.length > 3);
      assert.ok(card.formula.length > 5, 'Formula must be explicitly stated');
      assert.ok(Object.keys(card.inputs).length > 0, 'Inputs must be provided');
      assert.ok(card.result !== undefined);
      assert.ok(card.explanation.length > 10);
    }
  });

  // ---------------------------------------------------------------------------
  // 3. Primary Evidence Citations
  // ---------------------------------------------------------------------------
  it('3. Embeds primary evidence citations with source URLs and statutory verification', async () => {
    const dossier = await unifiedReportService.getDossier(workspaceA, createdDossierId);
    assert.ok(dossier);
    assert.ok(dossier.evidenceCitations.length >= 3);

    for (const cit of dossier.evidenceCitations) {
      assert.ok(cit.citationId.startsWith('cit_'));
      assert.ok(cit.claimText.length > 15);
      assert.ok(cit.sourceType);
      assert.ok(cit.confidence >= 0.9);
      assert.ok(cit.verifiedAt);
    }
  });

  // ---------------------------------------------------------------------------
  // 4. Print-Ready HTML & RFC-Compliant CSV Exports
  // ---------------------------------------------------------------------------
  it('4. Generates high-DPI print-ready HTML and RFC-compliant CSV formatted exports', async () => {
    const dossier = await unifiedReportService.getDossier(workspaceA, createdDossierId);
    assert.ok(dossier);

    // HTML Export
    const html = unifiedReportService.formatHtmlExport(dossier);
    assert.ok(html.includes('<!DOCTYPE html>'));
    assert.ok(html.includes('@page { size: A4;'));
    assert.ok(html.includes('EXECUTIVE VERDICT'));
    assert.ok(html.includes('Market Sizing Dynamics'));
    assert.ok(html.includes('Unit Economics'));

    // CSV Export
    const csv = unifiedReportService.formatCsvExport(dossier);
    assert.ok(csv.startsWith('SECTION,METRIC,VALUE,CALCULATION_OR_SOURCE'));
    assert.ok(csv.includes('OVERVIEW,Verdict'));
    assert.ok(csv.includes('MARKET,TAM (INR)'));
    assert.ok(csv.includes('FINANCE,LTV:CAC Ratio'));
  });

  // ---------------------------------------------------------------------------
  // 5. Strict Video Exclusion Certification
  // ---------------------------------------------------------------------------
  it('5. Certifies Strict Video Exclusion across all 7 dossier sections and collateral blueprints', async () => {
    const dossier = await unifiedReportService.getDossier(workspaceA, createdDossierId);
    assert.ok(dossier);

    const serialized = JSON.stringify(dossier).toLowerCase();
    assert.ok(!serialized.includes('video generation'));
    assert.ok(!serialized.includes('remotion'));
    assert.ok(!serialized.includes('ffmpeg'));
    assert.ok(!serialized.includes('.mp4'));

    for (const format of dossier.section5_BrandBlueprint.collateralFormats) {
      assert.ok(format.toLowerCase().includes('svg') || format.toLowerCase().includes('collateral') || format.toLowerCase().includes('carousel'));
      assert.ok(!format.toLowerCase().includes('video'));
    }
  });

  // ---------------------------------------------------------------------------
  // 6. Multi-Tenant Workspace Boundary Isolation
  // ---------------------------------------------------------------------------
  it('6. Enforces strict multi-tenant boundary isolation on executive dossiers', async () => {
    // Attempting to fetch Workspace A dossier using Workspace B
    const crossAccess = await unifiedReportService.getDossier(workspaceB, createdDossierId);
    assert.equal(crossAccess, null, 'Workspace B must not be able to retrieve Workspace A dossier');
  });
});
