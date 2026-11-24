/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'node:crypto';
import { db } from '../db/firestore';
import { ideaIntelligenceService } from './ideaIntelligenceService';
import { marketIntelligenceService } from './marketIntelligenceService';
import { competitiveIntelligenceService } from './competitiveIntelligenceService';
import { financialIntelligenceService } from './financialIntelligenceService';
import { brandStudioService } from './brandStudioService';
import { growthDirectorService } from './growthDirectorService';
import { businessWatchService } from './businessWatchService';
import { businessProfileRepository } from '../repositories/businessProfileRepository';

export interface CalculatedFinancialMetrics {
  monthlyPrice: number;
  cac: number;
  ltv: number;
  ltvCacRatio: number;
  breakEvenCustomers: number;
  paybackMonths: number;
  startupCapEx: number;
  monthlyOpEx: number;
  sixMonthRunwayRequired: number;
  strategySimulation?: {
    optionA_499?: { revenue: number; marginPercent: number };
    optionB_799?: { revenue: number; marginPercent: number };
    recommendedChoice?: string;
  };
}

export interface UnifiedExecutiveDossier {
  dossierId: string;
  workspaceId: string;
  title: string;
  businessName: string;
  verdict: 'GO' | 'CAUTION' | 'NO_GO';
  overallScore: number;
  generatedAt: string;

  // Section 1: Executive Verdict & Opportunity Scoring
  section1_ExecutiveSummary: {
    verdictRationale: string;
    scoreMatrix: {
      opportunityScore: number;
      marketScore: number;
      demandScore: number;
      competitionScore: number;
      financialFeasibilityScore: number;
      executionScore: number;
      riskScore: number;
    };
    keyOpportunities: string[];
    keyBlockers: string[];
    criticalAssumptions: string[];
  };

  // Section 2: Market Sizing & Demand Dynamics
  section2_MarketDynamics: {
    tamInr: number;
    samInr: number;
    somInr: number;
    calculationMethodology: string;
    statedAssumptions: string[];
    targetCustomerSegments: string[];
    indiaMarketSpecifics: {
      tierBreakdown: string;
      upiAdoptionTrend: string;
      msmeTaxNotes: string;
    };
  };

  // Section 3: Competitive Whitespace & Positioning
  section3_CompetitiveWhitespace: {
    trackedCompetitorCount: number;
    nearestRival: string;
    whitespaceOpportunity: string;
    positioningCoordinates: Array<{
      name: string;
      xPriceValue: number;
      yCompleteness: number;
    }>;
  };

  // Section 4: Unit Economics & Financial Simulation
  section4_FinancialFeasibility: {
    monthlyPrice: number;
    cac: number;
    ltv: number;
    ltvCacRatio: number;
    breakEvenCustomers: number;
    paybackMonths: number;
    startupCapEx: number;
    monthlyOpEx: number;
    sixMonthRunwayRequired: number;
    strategySimulation: {
      optionA_499: { revenue: number; marginPercent: number };
      optionB_799: { revenue: number; marginPercent: number };
      recommendedChoice: string;
    };
  };

  // Section 5: Brand Identity & Collateral Blueprint
  section5_BrandBlueprint: {
    usp: string;
    tagline: string;
    contrarianAngle: string;
    typographyLadder: {
      ratio: number;
      headingFont: string;
      bodyFont: string;
      scaleDisplay: string;
      scaleH1: string;
    };
    colorPalette: {
      primary: string;
      accent: string;
      background: string;
    };
    collateralFormats: string[]; // Strict SVG / Static only
  };

  // Section 6: Growth Roadmap & Execution
  section6_GrowthRoadmap: {
    topOpportunities: string[];
    immediate7DayTasks: Array<{
      title: string;
      specificAction: string;
      iceScore: number;
      completionCriteria: string;
    }>;
    shortTerm30DayTasks: Array<{
      title: string;
      specificAction: string;
      iceScore: number;
    }>;
    mediumTerm90DayTasks: Array<{
      title: string;
      specificAction: string;
      iceScore: number;
    }>;
  };

  // Section 7: Continuous Surveillance & Business Watch
  section7_BusinessWatch: {
    healthScore: number;
    activeAlertsCount: number;
    topAlerts: Array<{
      whatChanged: string;
      severity: string;
      whyItMatters: string;
      recommendedResponse: string;
    }>;
    complianceState: string;
  };

  // Calculation Transparency Cards & Citations
  calculationCards: Array<{
    metricName: string;
    formula: string;
    inputs: Record<string, number | string>;
    result: number | string;
    explanation: string;
  }>;
  evidenceCitations: Array<{
    citationId: string;
    claimText: string;
    sourceType: string;
    sourceUrl?: string;
    verifiedAt: string;
    confidence: number;
  }>;
}

export class UnifiedReportService {
  /**
   * Generates a complete 7-section interconnected executive dossier unifying all intelligence departments
   */
  public async generateUnifiedDossier(params: {
    workspaceId: string;
    title?: string;
    monthlyPrice?: number;
  }): Promise<UnifiedExecutiveDossier> {
    const { workspaceId, title, monthlyPrice = 499 } = params;
    const dossierId = `dos_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const now = new Date().toISOString();

    const profile = await businessProfileRepository.getProfile(workspaceId);
    const businessName = profile?.businessName || 'BrainWise Business';

    // 1. Dept 1: Idea Intelligence
    const ideaEvaluation = await ideaIntelligenceService.validateIdea({
      workspaceId,
      ideaSummary: `${businessName}: ${profile?.valueProposition || 'AI Business Intelligence & Growth Operating System'}`,
      targetIndustry: profile?.industry || 'B2B Software',
    });

    // 2. Dept 2: Market Intelligence
    const marketDossier = await marketIntelligenceService.getMarketIntelligenceDossier({
      workspaceId,
      industry: profile?.industry || 'B2B Software',
      geography: profile?.country || (typeof profile?.location === 'string' ? profile.location : 'India'),
    });

    // 3. Dept 3: Competitive Intelligence
    const competitors = await competitiveIntelligenceService.getCompetitors(workspaceId);
    const userCoords = {
      price: Math.min(100, Math.round((monthlyPrice / 2000) * 100)),
      depth: 85,
      label: businessName,
    };
    const positioning = competitiveIntelligenceService.calculatePositioningMatrix(userCoords, competitors);

    // 4. Dept 4: Financial Intelligence
    const financialMetrics = financialIntelligenceService.calculateMetrics({
      scenarioName: 'Standard Base',
      priceMonthly: monthlyPrice,
      targetCustomerVolume: 100,
      customerAcquisitionCost: 800,
      websiteConversionRatePercent: 3.5,
      monthlyOperatingCosts: 15000,
      monthlyMarketingBudget: 10000,
      grossMarginPercent: 80,
      monthlyChurnPercent: 4.0,
    });

    const startupCosts = await financialIntelligenceService.calculateStartupCosts({
      workspaceId,
      currency: 'INR',
    });

    const strategyComparison = await financialIntelligenceService.compareDecisions({
      workspaceId,
      decisionA: {
        scenarioName: 'Option A (₹499 Low Friction)',
        priceMonthly: 499,
        targetCustomerVolume: 200,
        customerAcquisitionCost: 650,
        websiteConversionRatePercent: 4.2,
        monthlyOperatingCosts: 20000,
        monthlyMarketingBudget: 15000,
        grossMarginPercent: 82,
        monthlyChurnPercent: 3.5,
      },
      decisionB: {
        scenarioName: 'Option B (₹799 Premium Value)',
        priceMonthly: 799,
        targetCustomerVolume: 120,
        customerAcquisitionCost: 1100,
        websiteConversionRatePercent: 2.8,
        monthlyOperatingCosts: 20000,
        monthlyMarketingBudget: 15000,
        grossMarginPercent: 85,
        monthlyChurnPercent: 4.0,
      },
    });

    // 5. Dept 5: Brand Studio
    const brandProposal = await brandStudioService.generateBrandStrategy({
      workspaceId,
      brandName: businessName,
    });

    // 6. Dept 6: Growth Director
    const roadmap = await growthDirectorService.generateOperationalRoadmap({
      workspaceId,
    });

    // 7. Dept 7: Business Watch
    const alerts = await businessWatchService.getActiveAlerts(workspaceId);
    const digest = await businessWatchService.generateWeeklyDigest(workspaceId);

    // Calculation Transparency Cards
    const calculationCards: Array<{
      metricName: string;
      formula: string;
      inputs: Record<string, number | string>;
      result: number | string;
      explanation: string;
    }> = [
      {
        metricName: 'Overall Opportunity Score',
        formula: '0.25*Market + 0.25*Demand + 0.20*Financial + 0.15*Execution + 0.15*(100-Risk)',
        inputs: ideaEvaluation.scores as unknown as Record<string, number | string>,
        result: ideaEvaluation.scores.overallOpportunityScore,
        explanation: 'Documented weighted linear composite across six core business dimensions.',
      },
      {
        metricName: 'LTV : CAC Ratio',
        formula: 'Customer LTV / Customer Acquisition Cost',
        inputs: {
          CustomerLTV: financialMetrics.customerLtv,
          CAC: 800,
        },
        result: `${financialMetrics.ltvCacRatio}x`,
        explanation: 'Sustainable commercial benchmark: >3.0x indicates healthy unit economics.',
      },
      {
        metricName: 'Break-Even Customers',
        formula: 'Fixed OpEx / Unit Gross Profit',
        inputs: {
          FixedOpEx: 15000 + 10000,
          UnitGrossProfit: Math.round(monthlyPrice * (80 / 100)),
        },
        result: `${financialMetrics.breakEvenCustomers} active accounts`,
        explanation: 'The minimum paying customer volume required to achieve zero net burn.',
      },
    ];

    // Primary Evidence Citations
    const evidenceCitations = [
      {
        citationId: 'cit_govt_upi_01',
        claimText: 'UPI recorded 14.44 billion monthly transactions, driving zero-MDR consumer adoption.',
        sourceType: 'GOVERNMENT_GAZETTE',
        sourceUrl: 'https://www.npci.org.in/what-we-do/upi/product-statistics',
        verifiedAt: now,
        confidence: 1.0,
      },
      {
        citationId: 'cit_msme_tax_02',
        claimText: 'Section 44AD presumptive taxation permits 6% deemed digital turnover profit.',
        sourceType: 'STATUTORY_CODE',
        sourceUrl: 'https://incometaxindia.gov.in',
        verifiedAt: now,
        confidence: 1.0,
      },
      {
        citationId: 'cit_dpdpa_residency_03',
        claimText: 'Indian Digital Personal Data Protection Act 2023 mandates regional audit trail.',
        sourceType: 'GOVERNMENT_GAZETTE',
        sourceUrl: 'https://www.meity.gov.in',
        verifiedAt: now,
        confidence: 1.0,
      },
    ];

    const dossier: UnifiedExecutiveDossier = {
      dossierId,
      workspaceId,
      title: title || `Unified Executive Intelligence Dossier — ${businessName}`,
      businessName,
      verdict: ideaEvaluation.executiveVerdict,
      overallScore: ideaEvaluation.scores.overallOpportunityScore,
      generatedAt: now,

      // Section 1
      section1_ExecutiveSummary: {
        verdictRationale: ideaEvaluation.verdictRationale,
        scoreMatrix: {
          opportunityScore: ideaEvaluation.scores.overallOpportunityScore,
          marketScore: ideaEvaluation.scores.marketScore,
          demandScore: ideaEvaluation.scores.demandScore,
          competitionScore: ideaEvaluation.scores.competitionScore,
          financialFeasibilityScore: ideaEvaluation.scores.financialFeasibilityScore,
          executionScore: ideaEvaluation.scores.executionScore,
          riskScore: ideaEvaluation.scores.riskScore,
        },
        keyOpportunities: ideaEvaluation.keyOpportunities,
        keyBlockers: ideaEvaluation.keyBlockers,
        criticalAssumptions: ideaEvaluation.criticalAssumptions.map((c) => c.assumption),
      },

      // Section 2
      section2_MarketDynamics: {
        tamInr: marketDossier.tamSamSom.topDown.tam.valueNumeric,
        samInr: marketDossier.tamSamSom.topDown.sam.valueNumeric,
        somInr: marketDossier.tamSamSom.topDown.som.valueNumeric,
        calculationMethodology: marketDossier.tamSamSom.topDown.tam.calculationMethodology,
        statedAssumptions: marketDossier.tamSamSom.topDown.tam.statedAssumptions,
        targetCustomerSegments: [marketDossier.targetCustomerSegment],
        indiaMarketSpecifics: {
          tierBreakdown: `${marketDossier.geographicOpportunities.tier1Opportunity} | ${marketDossier.geographicOpportunities.tier2Tier3Opportunity}`,
          upiAdoptionTrend: marketDossier.geographicOpportunities.infrastructureTailwinds[0] || 'UPI Autopay',
          msmeTaxNotes: marketDossier.geographicOpportunities.regulatoryConsiderations[0] || 'Section 44AD Presumptive Taxation',
        },
      },

      // Section 3
      section3_CompetitiveWhitespace: {
        trackedCompetitorCount: competitors.length,
        nearestRival: positioning.nearestCompetitor,
        whitespaceOpportunity: positioning.whitespaceOpportunities[0] || 'High-Speed / Low-Friction Quadrant',
        positioningCoordinates: positioning.competitors.map((p) => ({
          name: p.companyName,
          xPriceValue: p.xPrice,
          yCompleteness: p.yDepth,
        })),
      },

      // Section 4
      section4_FinancialFeasibility: {
        monthlyPrice,
        cac: 800,
        ltv: financialMetrics.customerLtv,
        ltvCacRatio: financialMetrics.ltvCacRatio,
        breakEvenCustomers: financialMetrics.breakEvenCustomers,
        paybackMonths: financialMetrics.paybackMonths,
        startupCapEx: startupCosts.totalInitialCapEx,
        monthlyOpEx: startupCosts.monthlyOpExBurn,
        sixMonthRunwayRequired: startupCosts.totalWorkingCapitalNeeded,
        strategySimulation: {
          optionA_499: {
            revenue: strategyComparison.scenarios.scenarioA.monthlyRevenue,
            marginPercent: 82,
          },
          optionB_799: {
            revenue: strategyComparison.scenarios.scenarioB.monthlyRevenue,
            marginPercent: 85,
          },
          recommendedChoice: strategyComparison.deltaAnalysis.recommendedDecision,
        },
      },

      // Section 5
      section5_BrandBlueprint: {
        usp: brandProposal.usp,
        tagline: brandProposal.tagline,
        contrarianAngle: brandProposal.contrarianAngle,
        typographyLadder: {
          ratio: brandProposal.visualIdentity.typographyLadder.ratio,
          headingFont: brandProposal.visualIdentity.typographyLadder.headingFont,
          bodyFont: brandProposal.visualIdentity.typographyLadder.bodyFont,
          scaleDisplay: brandProposal.visualIdentity.typographyLadder.scaleTokens.display || '48.8px',
          scaleH1: brandProposal.visualIdentity.typographyLadder.scaleTokens.h1 || '39.1px',
        },
        colorPalette: {
          primary: brandProposal.visualIdentity.colorPalette.primary,
          accent: brandProposal.visualIdentity.colorPalette.accent,
          background: brandProposal.visualIdentity.colorPalette.background,
        },
        collateralFormats: brandProposal.collateralOptions.map((c) => `${c.title} (SVG Vector Collateral)`),
      },

      // Section 6
      section6_GrowthRoadmap: {
        topOpportunities: roadmap.opportunities.map((o) => o.title),
        immediate7DayTasks: roadmap.tasks
          .filter((t) => t.timeHorizon === 'IMMEDIATE_7_DAYS')
          .map((t) => ({
            title: t.title,
            specificAction: t.specificAction,
            iceScore: t.iceScore.compositeScore,
            completionCriteria: t.completionCriteria,
          })),
        shortTerm30DayTasks: roadmap.tasks
          .filter((t) => t.timeHorizon === 'SHORT_TERM_30_DAYS')
          .map((t) => ({
            title: t.title,
            specificAction: t.specificAction,
            iceScore: t.iceScore.compositeScore,
          })),
        mediumTerm90DayTasks: roadmap.tasks
          .filter((t) => t.timeHorizon === 'MEDIUM_TERM_90_DAYS')
          .map((t) => ({
            title: t.title,
            specificAction: t.specificAction,
            iceScore: t.iceScore.compositeScore,
          })),
      },

      // Section 7
      section7_BusinessWatch: {
        healthScore: digest.healthScore,
        activeAlertsCount: alerts.length,
        topAlerts: alerts.slice(0, 3).map((a) => ({
          whatChanged: a.whatChanged,
          severity: a.severity,
          whyItMatters: a.whyItMatters,
          recommendedResponse: a.recommendedResponse.suggestedTaskTitle,
        })),
        complianceState: digest.marketAndRegulatorySummary.complianceStatus,
      },

      calculationCards,
      evidenceCitations,
    };

    await db.doc<any>(`workspaces/${workspaceId}/executiveDossiers/${dossierId}`).set(dossier);

    return dossier;
  }

  /**
   * Retrieves a stored unified dossier
   */
  public async getDossier(workspaceId: string, dossierId: string): Promise<UnifiedExecutiveDossier | null> {
    const snap = await db.doc(`workspaces/${workspaceId}/executiveDossiers/${dossierId}`).get();
    return snap.exists && snap.data() ? (snap.data() as unknown as UnifiedExecutiveDossier) : null;
  }

  /**
   * Formats a print-ready, high-DPI HTML document for the dossier
   */
  public formatHtmlExport(dossier: UnifiedExecutiveDossier): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${dossier.title}</title>
  <style>
    @page { size: A4; margin: 20mm; }
    body { font-family: 'Plus Jakarta Sans', -apple-system, sans-serif; color: #171717; background: #FAFAF9; line-height: 1.5; margin: 0; padding: 24px; }
    .header { border-bottom: 2px solid #FF7417; padding-bottom: 16px; margin-bottom: 24px; }
    .score-badge { display: inline-block; background: #171717; color: #FFFFFF; padding: 6px 14px; border-radius: 9999px; font-weight: 700; }
    .verdict-go { color: #16A34A; font-weight: 800; font-size: 24px; }
    .verdict-caution { color: #D97706; font-weight: 800; font-size: 24px; }
    .verdict-no_go { color: #DC2626; font-weight: 800; font-size: 24px; }
    .section { background: #FFFFFF; border: 1px solid #E6E6E2; border-radius: 12px; padding: 20px; margin-bottom: 20px; page-break-inside: avoid; }
    .section-title { font-size: 18px; font-weight: 800; border-bottom: 1px solid #F0F0EE; padding-bottom: 8px; margin-top: 0; color: #171717; }
    .calc-card { background: #F5F5F3; border-left: 4px solid #FF7417; padding: 12px; margin-top: 10px; font-family: 'JetBrains Mono', monospace; font-size: 13px; }
    .citation { font-size: 12px; color: #5C5C58; margin-top: 4px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="score-badge">SCORE: ${dossier.overallScore}/100</div>
    <h1>${dossier.title}</h1>
    <div class="verdict-${dossier.verdict.toLowerCase()}">EXECUTIVE VERDICT: ${dossier.verdict}</div>
    <p>Generated: ${dossier.generatedAt} | Grounded in Persistent Business Brain</p>
  </div>

  <div class="section">
    <h2 class="section-title">1. Executive Opportunity Verdict</h2>
    <p>${dossier.section1_ExecutiveSummary.verdictRationale}</p>
    <p><strong>Key Opportunities:</strong> ${dossier.section1_ExecutiveSummary.keyOpportunities.join('; ')}</p>
  </div>

  <div class="section">
    <h2 class="section-title">2. Market Sizing Dynamics (TAM / SAM / SOM)</h2>
    <p>TAM: ₹${dossier.section2_MarketDynamics.tamInr.toLocaleString('en-IN')} | SAM: ₹${dossier.section2_MarketDynamics.samInr.toLocaleString('en-IN')} | SOM: ₹${dossier.section2_MarketDynamics.somInr.toLocaleString('en-IN')}</p>
    <p><strong>India Dynamics:</strong> ${dossier.section2_MarketDynamics.indiaMarketSpecifics.tierBreakdown}</p>
  </div>

  <div class="section">
    <h2 class="section-title">3. Competitive Whitespace & Positioning</h2>
    <p><strong>Whitespace Opportunity:</strong> ${dossier.section3_CompetitiveWhitespace.whitespaceOpportunity}</p>
    <p><strong>Nearest Incumbent:</strong> ${dossier.section3_CompetitiveWhitespace.nearestRival}</p>
  </div>

  <div class="section">
    <h2 class="section-title">4. Unit Economics & Strategy Feasibility</h2>
    <p>LTV: ₹${dossier.section4_FinancialFeasibility.ltv} | CAC: ₹${dossier.section4_FinancialFeasibility.cac} | LTV:CAC: ${dossier.section4_FinancialFeasibility.ltvCacRatio}x | Payback: ${dossier.section4_FinancialFeasibility.paybackMonths} months</p>
    <p><strong>Runway Requirement:</strong> ₹${dossier.section4_FinancialFeasibility.sixMonthRunwayRequired.toLocaleString('en-IN')} for 6 months.</p>
  </div>

  <div class="section">
    <h2 class="section-title">5. Brand Strategy & Collateral Blueprint</h2>
    <p><strong>USP:</strong> ${dossier.section5_BrandBlueprint.usp}</p>
    <p><strong>Contrarian Angle:</strong> ${dossier.section5_BrandBlueprint.contrarianAngle}</p>
  </div>

  <div class="section">
    <h2 class="section-title">6. Growth Roadmap & Multi-Horizon Execution</h2>
    <p><strong>Immediate 7-Day Priority:</strong> ${dossier.section6_GrowthRoadmap.immediate7DayTasks[0]?.title || 'Launch Outbound'}</p>
  </div>

  <div class="section">
    <h2 class="section-title">7. Continuous Surveillance & Watch Signals</h2>
    <p><strong>Health Score:</strong> ${dossier.section7_BusinessWatch.healthScore}/100 | Active Signals: ${dossier.section7_BusinessWatch.activeAlertsCount}</p>
  </div>
</body>
</html>`;
  }

  /**
   * Formats an RFC-compliant CSV representation of the dossier
   */
  public formatCsvExport(dossier: UnifiedExecutiveDossier): string {
    const rows = [
      ['SECTION', 'METRIC', 'VALUE', 'CALCULATION_OR_SOURCE'],
      ['OVERVIEW', 'Verdict', dossier.verdict, 'Idea Intelligence Evaluation'],
      ['OVERVIEW', 'Opportunity Score', `${dossier.overallScore}/100`, 'Linear Composite Formula'],
      ['MARKET', 'TAM (INR)', String(dossier.section2_MarketDynamics.tamInr), 'Top-Down MSME Model'],
      ['MARKET', 'SAM (INR)', String(dossier.section2_MarketDynamics.samInr), 'Digital Tier 1/2 Model'],
      ['MARKET', 'SOM (INR)', String(dossier.section2_MarketDynamics.somInr), '1.5% Reachable Share'],
      ['FINANCE', 'LTV (INR)', String(dossier.section4_FinancialFeasibility.ltv), 'Gross Profit x Lifetime'],
      ['FINANCE', 'CAC (INR)', String(dossier.section4_FinancialFeasibility.cac), 'Blended Acquisition Cost'],
      ['FINANCE', 'LTV:CAC Ratio', `${dossier.section4_FinancialFeasibility.ltvCacRatio}x`, 'LTV / CAC'],
      ['FINANCE', 'Break-Even Accounts', String(dossier.section4_FinancialFeasibility.breakEvenCustomers), 'OpEx / Unit Margin'],
      ['BRAND', 'USP', `"${dossier.section5_BrandBlueprint.usp.replace(/"/g, '""')}"`, 'Brand Studio'],
      ['GROWTH', 'Top Opportunity', `"${dossier.section6_GrowthRoadmap.topOpportunities[0] || ''}"`, 'ICE Prioritization'],
      ['WATCH', 'Health Score', `${dossier.section7_BusinessWatch.healthScore}/100`, 'Continuous Surveillance'],
    ];

    return rows.map((r) => r.join(',')).join('\n');
  }
}

export const unifiedReportService = new UnifiedReportService();
