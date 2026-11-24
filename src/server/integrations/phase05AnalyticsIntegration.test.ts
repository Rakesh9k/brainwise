/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { googleAnalytics4Provider } from './providers/googleAnalytics4Provider';
import { metaInstagramProvider } from './providers/metaInstagramProvider';
import { linkedinProvider } from './providers/linkedinProvider';
import { googleSearchConsoleProvider } from './providers/googleSearchConsoleProvider';
import { googleBusinessProfileProvider } from './providers/googleBusinessProfileProvider';
import { youtubeProvider } from './providers/youtubeProvider';
import { googleDriveProvider } from './providers/googleDriveProvider';
import { googleResearchProvider } from './providers/googleResearchProvider';
import { emailProvider } from './providers/emailProvider';

import { dataIngestionService, computeRecordFingerprint } from './dataIngestionService';
import { metricCalculator } from '../services/analytics/metricCalculator';
import { metricRegistry } from '../services/analytics/metricRegistry';
import { unifiedReportService } from '../services/unifiedReportService';
import { db } from '../db/firestore';

test('PHASE 05 — ANALYTICS & EXTERNAL INTEGRATION ENGINE VERIFICATION', async (t) => {
  const testWorkspaceId = `test_ws_p05_${Date.now()}`;

  await t.test('1. All 9 providers return explicit UNCONNECTED state when unauthenticated', async () => {
    const unauthenticatedCreds = { accessToken: '' };

    const ga4Res = await googleAnalytics4Provider.fetchData(unauthenticatedCreds as any, {});
    assert.equal(ga4Res.state, 'UNCONNECTED');
    assert.equal(ga4Res.records.length, 0);

    const metaRes = await metaInstagramProvider.fetchData(unauthenticatedCreds as any, {});
    assert.equal(metaRes.state, 'UNCONNECTED');
    assert.equal(metaRes.records.length, 0);

    const linkedinRes = await linkedinProvider.fetchData(unauthenticatedCreds as any, {});
    assert.equal(linkedinRes.state, 'UNCONNECTED');
    assert.equal(linkedinRes.records.length, 0);

    const gscRes = await googleSearchConsoleProvider.fetchData(unauthenticatedCreds as any, {});
    assert.equal(gscRes.state, 'UNCONNECTED');
    assert.equal(gscRes.records.length, 0);

    const gbpRes = await googleBusinessProfileProvider.fetchData(unauthenticatedCreds as any, {});
    assert.equal(gbpRes.state, 'UNCONNECTED');
    assert.equal(gbpRes.records.length, 0);

    const ytRes = await youtubeProvider.fetchData(unauthenticatedCreds as any, {});
    assert.equal(ytRes.state, 'UNCONNECTED');
    assert.equal(ytRes.records.length, 0);

    const gdriveRes = await googleDriveProvider.fetchData(unauthenticatedCreds as any, {});
    assert.equal(gdriveRes.state, 'UNCONNECTED');
    assert.equal(gdriveRes.records.length, 0);

    const researchRes = await googleResearchProvider.fetchData({ apiKey: '' } as any, {});
    assert.equal(researchRes.state, 'UNCONNECTED');
    assert.equal(researchRes.records.length, 0);

    const emailRes = await emailProvider.fetchData({ apiKey: '' } as any, {});
    assert.equal(emailRes.state, 'UNCONNECTED');
    assert.equal(emailRes.records.length, 0);
  });

  await t.test('2. Providers enforce PERMISSION_REQUIRED on missing scopes or unapproved developer apps', async () => {
    // GA4 with insufficient scopes
    const partialGa4Creds = {
      accessToken: 'test_token',
      scopes: ['https://www.googleapis.com/auth/userinfo.email'],
    };
    const ga4Perm = await googleAnalytics4Provider.fetchData(partialGa4Creds as any, {});
    assert.equal(ga4Perm.state, 'PERMISSION_REQUIRED');
    assert.ok(ga4Perm.stateReason?.includes('Missing required OAuth scopes'));

    // Meta with valid test token but unapproved live app review
    const metaCreds = {
      accessToken: 'valid_user_token',
      scopes: ['instagram_basic', 'instagram_manage_insights', 'pages_read_engagement'],
    };
    const metaPerm = await metaInstagramProvider.fetchData(metaCreds as any, {});
    assert.equal(metaPerm.state, 'PERMISSION_REQUIRED');
    assert.ok(metaPerm.stateReason?.includes('Meta App Review'));

    // Google Business Profile pending organization verification
    const gbpCreds = {
      accessToken: 'valid_gbp_token',
      scopes: ['https://www.googleapis.com/auth/business.manage'],
    };
    const gbpPerm = await googleBusinessProfileProvider.fetchData(gbpCreds as any, {});
    assert.equal(gbpPerm.state, 'PERMISSION_REQUIRED');
    assert.ok(gbpPerm.stateReason?.includes('Organization Verification'));
  });

  await t.test('3. Zero fake telemetry (elimination of P0-02 hardcoded 14250 users & 1.0 confidence)', async () => {
    // When connected without data, providers return INSUFFICIENT_DATA, never fake 14250 users
    const ytConnectedNoData = {
      accessToken: 'mock_token',
      scopes: youtubeProvider.metadata.requiredScopes,
    };
    const ytRes = await youtubeProvider.fetchData(ytConnectedNoData as any, {});
    assert.equal(ytRes.state, 'INSUFFICIENT_DATA');
    assert.equal(ytRes.records.length, 0);

    const gscConnectedNoData = {
      accessToken: 'mock_token',
      scopes: googleSearchConsoleProvider.metadata.requiredScopes,
    };
    const gscRes = await googleSearchConsoleProvider.fetchData(gscConnectedNoData as any, {});
    assert.equal(gscRes.state, 'INSUFFICIENT_DATA');
    assert.equal(gscRes.records.length, 0);
  });

  await t.test('4. Idempotent Data Ingestion with deterministic SHA-256 fingerprinting', async () => {
    const fp1 = computeRecordFingerprint(
      testWorkspaceId,
      'google-analytics-4',
      'traffic',
      '2026-11-20T00:00:00Z',
      'day_20261120',
      { sessions: 120, conversions: 4 }
    );
    const fp2 = computeRecordFingerprint(
      testWorkspaceId,
      'google-analytics-4',
      'traffic',
      '2026-11-20T00:00:00Z',
      'day_20261120',
      { sessions: 120, conversions: 4 }
    );
    assert.equal(fp1, fp2, 'Fingerprints must be identical for identical payload');

    const testPackage = {
      records: [
        {
          recordId: 'temp_1',
          workspaceId: testWorkspaceId,
          integrationId: 'google-analytics-4',
          provider: 'google-analytics-4',
          category: 'traffic',
          retrievedAt: new Date().toISOString(),
          sourceTimestamp: '2026-11-20T00:00:00Z',
          sourceReference: 'day_20261120',
          syncJobId: 'sync_01',
          dataVersion: 1,
          provenance: { sourceType: 'GA4_API', verified: true, confidenceScore: 0.88 },
          metrics: { sessions: 120, conversions: 4 },
        },
      ],
      summary: {},
      hasMore: false,
      state: 'CONNECTED' as const,
    };

    // First ingestion: 1 record ingested, 0 duplicates
    const res1 = await dataIngestionService.ingestRecords(
      testWorkspaceId,
      'google-analytics-4',
      testPackage
    );
    assert.equal(res1.ingestedCount, 1);
    assert.equal(res1.duplicateCount, 0);

    // Second ingestion of identical package: 0 ingested, 1 duplicate detected
    const res2 = await dataIngestionService.ingestRecords(
      testWorkspaceId,
      'google-analytics-4',
      testPackage
    );
    assert.equal(res2.ingestedCount, 0);
    assert.equal(res2.duplicateCount, 1);

    // Verify stored record count in Firestore
    const stored = await dataIngestionService.getWorkspaceRecords(testWorkspaceId);
    assert.equal(stored.length, 1, 'Only one document must exist in Firestore due to deduplication');
  });

  await t.test('5. Metric Calculator returns INSUFFICIENT_DATA and null for unconnected revenue', async () => {
    const period = {
      startDate: new Date(Date.now() - 30 * 86400000).toISOString(),
      endDate: new Date().toISOString(),
    };

    // Calculation with null direct value
    const calculated = metricCalculator.calculateMetric({
      metricId: 'REV_NET',
      directValue: null,
      currency: 'USD',
      reportingPeriod: period,
      assumptions: ['No live payment gateway connected.'],
    });

    assert.equal(calculated.calculatedValue, null);
    assert.equal(calculated.formattedValue, 'N/A');
    assert.equal(calculated.verificationStatus, 'INSUFFICIENT_DATA');
    assert.ok(calculated.explanation.knownLimitations.some((l) => l.includes('Missing essential')));
  });

  await t.test('6. Metric Calculator correctly computes verified revenue from ingested records', async () => {
    const period = {
      startDate: '2026-11-01T00:00:00Z',
      endDate: '2026-11-30T23:59:59Z',
    };

    const calculated = metricCalculator.calculateMetric({
      metricId: 'REV_NET',
      records: [
        {
          recordId: 'tx_1',
          amount: 500,
          currency: 'USD',
          timestamp: '2026-11-15T12:00:00Z',
          source: 'stripe',
        },
        {
          recordId: 'tx_2',
          amount: 250,
          currency: 'USD',
          timestamp: '2026-11-18T12:00:00Z',
          source: 'cashfree',
        },
        {
          recordId: 'tx_3',
          amount: 50,
          currency: 'USD',
          timestamp: '2026-11-19T12:00:00Z',
          source: 'stripe',
          isRefund: true,
        },
      ],
      currency: 'USD',
      reportingPeriod: period,
    });

    assert.equal(calculated.calculatedValue, 700); // 500 + 250 - 50 = 700
    assert.equal(calculated.formattedValue, '$700.00');
    assert.equal(calculated.verificationStatus, 'VERIFIED');
    assert.equal(calculated.explanation.recordsIncluded, 3);
  });

  await t.test('7. Unified Executive Dossier export formats RFC-compliant CSV & print-ready HTML', async () => {
    const mockDossier: any = {
      dossierId: 'dossier_test_01',
      workspaceId: testWorkspaceId,
      title: 'Executive Strategic Dossier',
      businessName: 'Solstice Craft Roasters',
      verdict: 'GO',
      overallScore: 84,
      generatedAt: '2026-11-23T12:00:00Z',
      section1_ExecutiveSummary: {
        verdictRationale: 'High demand in subscription roastery segment with favorable unit margins.',
        keyOpportunities: ['Subscription growth', 'B2B studio outreach'],
        keyBlockers: [],
        criticalAssumptions: ['CAC remains below ₹450'],
        scoreMatrix: {
          opportunityScore: 85,
          marketScore: 82,
          demandScore: 80,
          competitionScore: 78,
          financialFeasibilityScore: 88,
          executionScore: 84,
          riskScore: 20,
        },
      },
      section2_MarketDynamics: {
        tamInr: 12000000000,
        samInr: 1800000000,
        somInr: 27000000,
        calculationMethodology: 'Bottom-up specialty segment model',
        statedAssumptions: ['Tier 1 metropolitan coverage'],
        targetCustomerSegments: ['Specialty Coffee Lovers'],
        indiaMarketSpecifics: {
          tierBreakdown: 'Tier 1 metros represent 72% of specialty demand.',
          upiAdoptionTrend: 'UPI exceeds 84% of consumer payments.',
          msmeTaxNotes: 'Applicable under MSME registration guidelines.',
        },
      },
      section3_CompetitiveWhitespace: {
        trackedCompetitorCount: 4,
        nearestRival: 'Blue Tokai',
        whitespaceOpportunity: 'Hyper-fresh micro-lot subscriptions',
        positioningCoordinates: [{ name: 'Solstice', xPriceValue: 75, yCompleteness: 85 }],
      },
      section4_FinancialFeasibility: {
        monthlyPrice: 699,
        cac: 380,
        ltv: 2800,
        ltvCacRatio: 7.37,
        breakEvenCustomers: 142,
        paybackMonths: 1.8,
        startupCapEx: 250000,
        monthlyOpEx: 85000,
        sixMonthRunwayRequired: 510000,
        strategySimulation: {
          optionA_499: { revenue: 120000, marginPercent: 52 },
          optionB_799: { revenue: 190000, marginPercent: 68 },
          recommendedChoice: 'optionB_799',
        },
      },
      section5_BrandBlueprint: {
        usp: 'Small-batch micro-lots roasted within 48 hours of dispatch.',
        tagline: 'Artisanal coffee brewed to standard.',
        contrarianAngle: 'Reject dark roasts in favor of single-origin clarity.',
        typographyLadder: { ratio: 1.25, headingFont: 'Plus Jakarta Sans', bodyFont: 'Inter', scaleDisplay: '36px', scaleH1: '28px' },
        colorPalette: { primary: '#FF7417', accent: '#C44D00', background: '#FAFAF9' },
        collateralFormats: ['SVG Stationery', 'High-DPI Vector Flyer'],
      },
      section6_GrowthRoadmap: {
        topOpportunities: ['Direct B2B Office Tasting Kits'],
        immediate7DayTasks: [{ title: 'Finalize roast profile spec', specificAction: 'Test cupping', iceScore: 82, completionCriteria: 'Score > 86' }],
        shortTerm30DayTasks: [],
        mediumTerm90DayTasks: [],
      },
      section7_BusinessWatch: {
        healthScore: 92,
        activeAlertsCount: 0,
      },
    };

    const html = unifiedReportService.formatHtmlExport(mockDossier);
    assert.ok(html.includes('Executive Strategic Dossier'));
    assert.ok(html.includes('EXECUTIVE VERDICT: GO'));
    assert.ok(html.includes('SCORE: 84/100'));
    assert.ok(html.includes('Hyper-fresh micro-lot subscriptions'));

    const csv = unifiedReportService.formatCsvExport(mockDossier);
    assert.ok(csv.includes('SECTION,METRIC,VALUE,CALCULATION_OR_SOURCE'));
    assert.ok(csv.includes('OVERVIEW,Verdict,GO,Idea Intelligence Evaluation'));
    assert.ok(csv.includes('FINANCE,LTV:CAC Ratio,7.37x,LTV / CAC'));
  });

  // Cleanup test workspace records
  await dataIngestionService.purgeIntegrationData(testWorkspaceId, 'google-analytics-4');
});
