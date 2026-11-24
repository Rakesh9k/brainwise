/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { evidenceLakeRepository } from './repositories/evidenceLakeRepository';
import { competitorTrackingService } from './services/competitorTrackingService';
import { customerVoiceService } from './services/customerVoiceService';
import { researchEngine } from './ai/researchEngine';
import { growthRadarDetectionEngine } from './services/growthRadarDetectionEngine';
import type { EvidenceRecord } from './types/evidence';
import type { BusinessProfileEntity, ProductEntity } from './types/api';

describe('Shared Evidence Lake & 10 Research Capabilities Master Suite', () => {
  const workspaceId = `ws_ev_lake_test_${Date.now()}`;

  // ---------------------------------------------------------------------------
  // 1. Evidence Lake Storage, Deduplication & Expiration
  // ---------------------------------------------------------------------------
  it('1. Saves and deduplicates evidence records in the central Evidence Lake', async () => {
    const fingerprint = evidenceLakeRepository.generateFingerprint(
      workspaceId,
      'MARKET_DISCOVERY',
      'https://statista.com/market-sizing'
    );

    const record: EvidenceRecord = {
      evidenceId: `ev_test_${Date.now()}_1`,
      workspaceId,
      capability: 'MARKET_DISCOVERY',
      sourceType: 'EXTERNAL_WEB',
      title: 'Commercial Market Sizing Report',
      domainOrPlatform: 'statista.com',
      sourceUrl: 'https://statista.com/market-sizing',
      rawExcerpt: 'Indian SMB ERP market expands at 14.5% CAGR through 2029.',
      extractedMetrics: { cagr: '14.5%', tam: '₹12,000 Cr' },
      provenance: 'AI_INFERRED',
      confidence: 0.92,
      detectedAt: new Date().toISOString(),
      fingerprint,
      tags: ['market_sizing', 'cagr'],
    };

    const firstSave = await evidenceLakeRepository.saveEvidence(record);
    assert.equal(firstSave.isDuplicate, false);

    // Duplicate attempt with same fingerprint
    const secondSave = await evidenceLakeRepository.saveEvidence({
      ...record,
      evidenceId: `ev_test_${Date.now()}_duplicate`,
    });
    assert.equal(secondSave.isDuplicate, true);
  });

  it('2. Queries records by capability and automatically prunes expired evidence', async () => {
    const expiredRecord: EvidenceRecord = {
      evidenceId: `ev_expired_${Date.now()}`,
      workspaceId,
      capability: 'RISK_INTELLIGENCE',
      sourceType: 'REGULATORY_ALERT',
      title: 'Temporary Tax Exemption Window',
      domainOrPlatform: 'incometaxindia.gov.in',
      rawExcerpt: 'Temporary rebate valid until yesterday.',
      provenance: 'AI_INFERRED',
      confidence: 0.95,
      detectedAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
      expiresAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(), // Expired
      fingerprint: evidenceLakeRepository.generateFingerprint(
        workspaceId,
        'RISK_INTELLIGENCE',
        'temp_tax_window'
      ),
      tags: ['tax', 'rebate'],
    };

    await evidenceLakeRepository.saveEvidence(expiredRecord);

    // Filter activeOnly should exclude expired record
    const activeRiskRecords = await evidenceLakeRepository.findByCapability(
      workspaceId,
      'RISK_INTELLIGENCE',
      { activeOnly: true }
    );
    assert.equal(activeRiskRecords.length, 0);

    // Prune expired
    const deletedCount = await evidenceLakeRepository.pruneExpired(workspaceId);
    assert.ok(deletedCount >= 1);
  });

  // ---------------------------------------------------------------------------
  // 2. Competitor Tracking & Diff Detection (Capabilities #2 & #3)
  // ---------------------------------------------------------------------------
  it('3. Captures competitor snapshots and detects price increase and offer diffs', async () => {
    const competitorId = 'comp_invox_pro';
    const competitorName = 'Invox Software';

    // Baseline snapshot: ₹1,499 starter
    await competitorTrackingService.captureAndAnalyze(workspaceId, {
      competitorId,
      competitorName,
      pricingTiers: [
        {
          tierName: 'Starter',
          price: 1499,
          billingPeriod: 'monthly',
          features: ['Invoicing', 'GST'],
        },
        {
          tierName: 'Pro',
          price: 3999,
          billingPeriod: 'monthly',
          features: ['Invoicing', 'GST', 'E-Way'],
        },
      ],
      heroOffer: 'Start your 14-day free trial today',
      valueProposition: 'Fastest GST invoicing for Indian SMBs',
      keyFeatures: ['Invoicing', 'GST Filing', 'E-Way Bills'],
    });

    // Second snapshot: Starter increased to ₹1,999 (+33%) and offer changed
    const analysis = await competitorTrackingService.captureAndAnalyze(workspaceId, {
      competitorId,
      competitorName,
      pricingTiers: [
        {
          tierName: 'Starter',
          price: 1999,
          billingPeriod: 'monthly',
          features: ['Invoicing', 'GST'],
        },
        {
          tierName: 'Pro',
          price: 3999,
          billingPeriod: 'monthly',
          features: ['Invoicing', 'GST', 'E-Way'],
        },
      ],
      heroOffer: 'Book a personalized live demo',
      valueProposition: 'Enterprise GST invoicing for Indian SMBs',
      keyFeatures: ['Invoicing', 'GST Filing', 'E-Way Bills', 'Multi-GSTIN'],
    });

    assert.equal(analysis.detectedDiffs.length, 3);

    const priceIncrease = analysis.detectedDiffs.find((d) => d.changeType === 'PRICE_INCREASE');
    assert.ok(priceIncrease);
    assert.equal(priceIncrease?.severity, 'HIGH');
    assert.ok(priceIncrease?.summary.includes('increased Starter price by 33%'));

    const offerChange = analysis.detectedDiffs.find((d) => d.changeType === 'OFFER_CHANGED');
    assert.ok(offerChange);
    assert.equal(offerChange?.newValue, 'Book a personalized live demo');

    const newFeature = analysis.detectedDiffs.find((d) => d.changeType === 'FEATURE_ADDED');
    assert.ok(newFeature);
    assert.ok(newFeature?.newValue.includes('Multi-GSTIN'));

    // Verify Evidence Lake contains COMPETITOR_TRACKING records
    const trackingRecords = await evidenceLakeRepository.findByCapability(
      workspaceId,
      'COMPETITOR_TRACKING'
    );
    assert.ok(trackingRecords.length >= 2);
  });

  // ---------------------------------------------------------------------------
  // 3. Customer Voice & Objection Mining (Capability #4)
  // ---------------------------------------------------------------------------
  it('4. Mines customer reviews to identify buying objections and unmet needs', async () => {
    const rawReviews = [
      {
        platform: 'g2' as const,
        authorOrHandle: 'Founder Rajesh',
        content:
          'The software has a steep learning curve and confusing onboarding. Took weeks to implement.',
        rating: 2,
        competitorMentioned: 'comp_invox_pro',
      },
      {
        platform: 'reddit' as const,
        authorOrHandle: 'u/delhi_ca',
        content:
          'Terrible customer support. Ignored my ticket for 4 days during month-end GST filing. Wish they had automated reconciliations.',
        rating: 1,
        competitorMentioned: 'comp_invox_pro',
      },
      {
        platform: 'google_reviews' as const,
        content:
          'Too expensive after recent price hike. Not worth the money for a small business. Would love WhatsApp invoices.',
        rating: 2,
      },
      {
        platform: 'trustpilot' as const,
        content: 'Excellent tool, saves hours every week. Amazing experience.',
        rating: 5,
      },
    ];

    const voiceAnalysis = await customerVoiceService.analyzeAndIngest(workspaceId, rawReviews);

    assert.equal(voiceAnalysis.totalReviewsAnalyzed, 4);
    assert.ok(
      voiceAnalysis.averageSentimentScore < 0,
      'Average sentiment should skew negative given 3/4 negative reviews'
    );

    // Verify detected top objections
    const objections = voiceAnalysis.topObjections.map((o) => o.objection);
    assert.ok(objections.includes('ONBOARDING_COMPLEXITY'));
    assert.ok(objections.includes('POOR_SUPPORT'));
    assert.ok(objections.includes('PRICE_TOO_HIGH'));

    // Verify unmet needs extraction
    assert.ok(
      voiceAnalysis.topUnmetNeeds.some(
        (n) => n.need.includes('automated reconciliations') || n.need.includes('whatsapp invoices')
      )
    );

    // Verify suggestions
    assert.ok(voiceAnalysis.suggestedProductResponses.length >= 2);

    // Verify records saved in Evidence Lake
    const voiceRecords = await evidenceLakeRepository.findByCapability(
      workspaceId,
      'CUSTOMER_VOICE'
    );
    assert.ok(voiceRecords.length >= 2);
  });

  // ---------------------------------------------------------------------------
  // 4. Autonomous Deep Research Direct Ingestion into Evidence Lake
  // ---------------------------------------------------------------------------
  it('5. Ingests deep research findings directly into Evidence Lake', async () => {
    const dossier = await researchEngine.conductDeepResearch({
      workspaceId,
      query: 'B2B Inventory Optimization SaaS',
      category: 'market',
      depthTier: 'RAPID_SCAN',
    });

    assert.ok(dossier.dossierId);

    // Check evidence lake for automatically ingested MARKET_DISCOVERY evidence
    const marketRecords = await evidenceLakeRepository.findByCapability(
      workspaceId,
      'MARKET_DISCOVERY'
    );
    assert.ok(marketRecords.length >= 1);
    assert.equal(marketRecords[0].provenance, 'AI_INFERRED');
    assert.ok(marketRecords[0].tags.includes('deep_research'));
  });

  // ---------------------------------------------------------------------------
  // 5. Cross-Capability Synthesis via Growth Radar (Capabilities #6, #8, #10)
  // ---------------------------------------------------------------------------
  it('6. Feeds Evidence Lake records into Growth Radar to trigger proactive conquest opportunities', async () => {
    // Fetch all records accumulated in Evidence Lake
    const allEvidence = await evidenceLakeRepository.listAll(workspaceId);
    assert.ok(allEvidence.length >= 4);

    const mockProfile: BusinessProfileEntity = {
      workspaceId,
      businessName: 'Apex GST Cloud',
      tagline: 'Instant GST Invoicing',
      industry: 'Software',
      businessModel: 'B2B SaaS',
      stage: 'Early Traction',
      location: 'Bangalore, India',
      website: 'https://apexgst.example.com',
      foundedYear: '2025',
      overviewSummary: 'Instant GST Invoicing for SMBs',
      targetAudience: 'Indian SMBs and Accountants',
      brandPositioning: 'Fastest automated GST portal',
      valueProposition: 'Save 10 hours a month on tax filings',
      revenueModel: 'Subscription',
      primaryGoals: ['Expand user base'],
      provenance: {},
      strategicMemory: {
        usedAngles: [],
        fatiguedThemes: [],
        explicitExclusions: [],
        lastUpdated: new Date().toISOString(),
      },
      lastUpdated: new Date().toISOString(),
      version: 1,
    };

    const mockProducts: ProductEntity[] = [
      {
        productId: 'prod_apex_core',
        workspaceId,
        name: 'Apex Invoicing Core',
        category: 'Software',
        description: 'Core billing and GST generation module',
        price: 999,
        currency: 'INR',
        pricingStructure: 'recurring',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const opportunities = growthRadarDetectionEngine.detectOpportunities({
      workspaceId,
      profile: mockProfile,
      products: mockProducts,
      services: [],
      goals: [],
      competitors: [],
      audienceSegments: [],
      documents: [],
      experiments: [],
      metrics: [],
      evidenceLakeRecords: allEvidence,
    });

    // Verify that the competitor price hike triggered a conquest campaign opportunity
    const conquestOpp = opportunities.find(
      (o) => o.title.includes('Conquest Campaign') && o.type === 'COMPETITOR_DIFFERENTIATION'
    );
    assert.ok(
      conquestOpp,
      'Competitor price increase must trigger an automatic Conquest Campaign opportunity'
    );
    assert.equal(conquestOpp?.relevantDepartment, 'MARKETING');
    assert.ok(conquestOpp?.opportunityScore >= 75);

    // Verify customer voice friction triggered an objection counter-positioning opportunity
    const objectionOpp = opportunities.find(
      (o) => o.title.includes('Counter-Position') && o.type === 'CUSTOMER_OBJECTION'
    );
    assert.ok(
      objectionOpp,
      'Customer onboarding friction must trigger counter-positioning opportunity'
    );
  });
});
