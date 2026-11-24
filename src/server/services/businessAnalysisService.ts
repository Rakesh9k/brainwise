/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { businessProfileRepository } from '../repositories/businessProfileRepository';
import { productRepository } from '../repositories/productRepository';
import { brandIdentityRepository } from '../repositories/brandIdentityRepository';
import { memoryService } from './memoryService';
import { goalRepository } from '../repositories/goalRepository';
import type {
  BusinessHealthReport,
  BusinessHealthDimension,
  BusinessGap,
  SwotAnalysisReport,
  SwotItem,
  RootCauseInvestigation,
  KnowledgeSourceCitation,
} from '../types/api';

export class BusinessAnalysisService {
  /**
   * Evaluates comprehensive business health across 8 dimensions
   */
  public async assessBusinessHealth(workspaceId: string): Promise<BusinessHealthReport> {
    const profile = await businessProfileRepository.getProfile(workspaceId);
    const products = await productRepository.listProducts(workspaceId);
    const brand = await brandIdentityRepository.getLatest(workspaceId);
    const goals = await goalRepository.listGoals(workspaceId);

    const citations: KnowledgeSourceCitation[] = [];
    if (profile) {
      citations.push({
        sourceId: `src_profile_${workspaceId}`,
        sourceType: 'USER_CONFIRMED_FACT',
        title: `${profile.businessName || 'Business'} Profile`,
        confidence: 1.0,
        verifiedAt: profile.lastUpdated,
      });
    }

    const dimensions: BusinessHealthDimension[] = [];

    // 1. Positioning
    const hasPositioning = Boolean(profile?.valueProposition || profile?.brandPositioning);
    const positioningFindings: string[] = [];
    const missingPos: string[] = [];
    if (profile?.valueProposition) {
      positioningFindings.push(`Value proposition defined: "${profile.valueProposition}"`);
    } else {
      missingPos.push('Value proposition is missing');
    }
    if (profile?.tagline) {
      positioningFindings.push(`Tagline: "${profile.tagline}"`);
    }
    const posScore = hasPositioning ? (profile?.brandPositioning ? 95 : 75) : 25;
    dimensions.push({
      dimension: 'positioning',
      score: posScore,
      status: posScore >= 75 ? 'strong' : posScore >= 50 ? 'moderate' : 'needs_improvement',
      findings: positioningFindings.length
        ? positioningFindings
        : ['Positioning statement is undefined'],
      evidence: citations,
      missingData: missingPos.length ? missingPos : undefined,
    });

    // 2. Product/Service Portfolio
    const prodScore = products.length >= 3 ? 90 : products.length > 0 ? 65 : 20;
    const prodFindings: string[] = [`Catalog contains ${products.length} registered item(s)`];
    const missingProd: string[] = [];
    if (products.length === 0) {
      missingProd.push('No products or services registered in catalog');
    } else {
      const withPrices = products.filter((p) => p.price && p.price > 0);
      prodFindings.push(`${withPrices.length} product(s) have verified pricing`);
      if (withPrices.length < products.length) {
        missingProd.push('Some catalog items are missing verified pricing');
      }
    }
    dimensions.push({
      dimension: 'product_portfolio',
      score: prodScore,
      status: prodScore >= 80 ? 'strong' : prodScore >= 50 ? 'moderate' : 'critical',
      findings: prodFindings,
      evidence: citations,
      missingData: missingProd.length ? missingProd : undefined,
    });

    // 3. Customer Segments
    const personas = profile?.customerPersonas || [];
    const custScore = personas.length >= 2 ? 85 : personas.length === 1 ? 60 : 25;
    const custFindings: string[] = [
      personas.length > 0
        ? `${personas.length} ICP persona(s) identified`
        : 'Customer personas not yet configured',
    ];
    const missingCust: string[] =
      personas.length === 0 ? ['Target customer personas undefined'] : [];
    dimensions.push({
      dimension: 'customer_segments',
      score: custScore,
      status: custScore >= 80 ? 'strong' : custScore >= 50 ? 'moderate' : 'critical',
      findings: custFindings,
      evidence: citations,
      missingData: missingCust.length ? missingCust : undefined,
    });

    // 4. Marketing Maturity
    const hasBrand = Boolean(brand?.voice?.length || brand?.wordsToUse?.length);
    const mktScore = hasBrand ? 80 : 30;
    const mktFindings = hasBrand
      ? [`Brand voice locked with ${brand?.voice?.length || 0} voice descriptors`]
      : ['Brand voice and copy directives unconfigured'];
    const missingMkt = hasBrand ? [] : ['Brand identity and voice guidelines missing'];
    dimensions.push({
      dimension: 'marketing_maturity',
      score: mktScore,
      status: mktScore >= 80 ? 'strong' : 'needs_improvement',
      findings: mktFindings,
      evidence: brand
        ? [
            {
              sourceId: `src_brand_${brand.brandIdentityId}`,
              sourceType: 'USER_CONFIRMED_FACT',
              title: 'Brand Guidelines',
              confidence: 1.0,
            },
          ]
        : [],
      missingData: missingMkt.length ? missingMkt : undefined,
    });

    // 5. Market Presence & Competitor Awareness
    const compScore = profile?.industry ? 70 : 35;
    dimensions.push({
      dimension: 'market_presence',
      score: compScore,
      status: compScore >= 70 ? 'moderate' : 'needs_improvement',
      findings: [
        profile?.industry
          ? `Active in "${profile.industry}"`
          : 'Industry classification unspecified',
        profile?.location ? `Operating from ${profile.location}` : 'Operating location unspecified',
      ],
      evidence: citations,
      missingData: profile?.industry ? undefined : ['Industry and market vertical unspecified'],
    });

    // 6. Growth Readiness
    const activeGoals = goals.filter((g) => g.status !== 'achieved');
    const growthScore = activeGoals.length > 0 ? 80 : 40;
    dimensions.push({
      dimension: 'growth_readiness',
      score: growthScore,
      status: growthScore >= 75 ? 'strong' : 'needs_improvement',
      findings: [
        activeGoals.length > 0
          ? `${activeGoals.length} tracked business goal(s) in flight`
          : 'No formal OKRs or targets currently tracked',
      ],
      evidence: citations,
      missingData:
        activeGoals.length === 0 ? ['Specific measurable business goals missing'] : undefined,
    });

    // 7. Operational Limitations & Boundaries
    const resources = profile?.resourcesAndConstraints;
    const monthlyBudget =
      resources?.monthlyMarketingBudget ??
      (typeof resources?.marketingBudget === 'number'
        ? resources.marketingBudget
        : (resources?.marketingBudget as any)?.monthly);
    const hasBudget = Boolean(monthlyBudget);
    const hasCap = Boolean(resources?.operatingCapacity || (resources as any)?.operationalCapacity);
    const opsScore = hasBudget && hasCap ? 90 : hasBudget || hasCap ? 65 : 30;
    const opsFindings: string[] = [];
    const missingOps: string[] = [];
    if (hasBudget) {
      opsFindings.push(`Monthly marketing budget verified at $${monthlyBudget}`);
    } else {
      missingOps.push('Monthly marketing budget undefined (AI will treat as UNKNOWN)');
    }
    if (hasCap) {
      opsFindings.push(
        `Operating capacity verified: "${resources?.operatingCapacity || (resources as any)?.operationalCapacity}"`
      );
    } else {
      missingOps.push('Operational throughput capacity unstated');
    }
    dimensions.push({
      dimension: 'operational_limitations',
      score: opsScore,
      status: opsScore >= 80 ? 'strong' : opsScore >= 60 ? 'moderate' : 'critical',
      findings: opsFindings.length ? opsFindings : ['Operational limits completely unspecified'],
      evidence: citations,
      missingData: missingOps.length ? missingOps : undefined,
    });

    // 8. Data Completeness
    const provKeys = Object.keys(profile?.provenance || {});
    const confirmedCount = Object.values(profile?.provenance || {}).filter(
      (p) => p.source === 'USER_CONFIRMED'
    ).length;
    const dataScore =
      provKeys.length > 0 ? Math.round((confirmedCount / Math.max(provKeys.length, 1)) * 100) : 40;
    dimensions.push({
      dimension: 'data_completeness',
      score: dataScore,
      status: dataScore >= 80 ? 'strong' : dataScore >= 50 ? 'moderate' : 'needs_improvement',
      findings: [
        `${confirmedCount} user-confirmed fact(s) recorded in Business Brain`,
        `${provKeys.length - confirmedCount} inferred or unverified record(s)`,
      ],
      evidence: citations,
    });

    // Calculate Overall Score
    const overallScore = Math.round(
      dimensions.reduce((acc, d) => acc + d.score, 0) / dimensions.length
    );

    const maturityStage =
      overallScore >= 85
        ? 'established'
        : overallScore >= 70
          ? 'scaling'
          : overallScore >= 45
            ? 'developing'
            : 'nascent';

    // Compile identified gaps
    const identifiedGaps: BusinessGap[] = [];
    for (const d of dimensions) {
      if (d.missingData) {
        for (const m of d.missingData) {
          identifiedGaps.push({
            gapId: `gap_${d.dimension}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            category:
              d.dimension === 'operational_limitations' ? 'operational_constraint' : 'missing_data',
            description: m,
            impactSeverity: d.score < 50 ? 'high' : 'medium',
            recommendedRemediation: `Configure ${d.dimension.replace('_', ' ')} in Business Brain to enable grounded strategic planning.`,
            isAssumption: false,
          });
        }
      }
    }

    const criticalRisks: string[] = [];
    if (!hasBudget) {
      criticalRisks.push('Undefined marketing budget prevents deterministic financial allocation.');
    }
    if (products.length === 0) {
      criticalRisks.push('Missing product catalog inhibits commercial offer generation.');
    }

    return {
      workspaceId,
      overallScore,
      maturityStage,
      dimensions,
      identifiedGaps,
      criticalRisks,
      evaluatedAt: new Date().toISOString(),
    };
  }

  /**
   * Generates evidence-backed SWOT analysis with assumption tagging and contradiction detection
   */
  public async generateSwotAnalysis(workspaceId: string): Promise<SwotAnalysisReport> {
    const profile = await businessProfileRepository.getProfile(workspaceId);
    const products = await productRepository.listProducts(workspaceId);
    const brand = await brandIdentityRepository.getLatest(workspaceId);
    const episodes = await memoryService.listEpisodes(workspaceId);

    const strengths: SwotItem[] = [];
    const weaknesses: SwotItem[] = [];
    const opportunities: SwotItem[] = [];
    const threats: SwotItem[] = [];
    const contradictionsDetected: string[] = [];

    const profileCitation: KnowledgeSourceCitation = {
      sourceId: `src_profile_${workspaceId}`,
      sourceType: 'USER_CONFIRMED_FACT',
      title: `${profile?.businessName || 'Business'} Profile`,
      confidence: 1.0,
      verifiedAt: profile?.lastUpdated,
    };

    // 1. Evaluate Strengths
    if (profile?.valueProposition) {
      strengths.push({
        id: 'str_val_prop',
        category: 'strength',
        statement: 'Clear Value Proposition',
        detail: profile.valueProposition,
        evidence: [profileCitation],
        isAssumption: false,
        confidence: 0.95,
        importance: 'high',
      });
    }

    if (products.length > 0) {
      const verifiedProds = products.filter((p) => p.source === 'USER_CONFIRMED');
      if (verifiedProds.length > 0) {
        strengths.push({
          id: 'str_verified_catalog',
          category: 'strength',
          statement: 'Verified Commercial Catalog',
          detail: `${verifiedProds.length} fully verified products with established pricing models.`,
          evidence: [
            {
              sourceId: `src_prod_${verifiedProds[0].productId}`,
              sourceType: 'USER_CONFIRMED_FACT',
              title: `Product: ${verifiedProds[0].name}`,
              confidence: 1.0,
            },
          ],
          isAssumption: false,
          confidence: 1.0,
          importance: 'high',
        });
      }
    }

    if (brand?.approvedClaims && brand.approvedClaims.length > 0) {
      strengths.push({
        id: 'str_brand_claims',
        category: 'strength',
        statement: 'Substantiated Brand Proof Points',
        detail: `Brand identity backed by claims: ${brand.approvedClaims.join(', ')}`,
        evidence: [
          {
            sourceId: `src_brand_${brand.brandIdentityId}`,
            sourceType: 'USER_CONFIRMED_FACT',
            title: 'Approved Claims',
            confidence: 1.0,
          },
        ],
        isAssumption: false,
        confidence: 0.9,
        importance: 'medium',
      });
    }

    // 2. Evaluate Weaknesses
    const resources = profile?.resourcesAndConstraints;
    const budget =
      resources?.monthlyMarketingBudget ??
      (typeof resources?.marketingBudget === 'number'
        ? resources.marketingBudget
        : (resources?.marketingBudget as any)?.monthly);
    if (!budget) {
      weaknesses.push({
        id: 'weak_unknown_budget',
        category: 'weakness',
        statement: 'Unbudgeted Marketing Allocation',
        detail: 'Absence of monthly marketing budget limit introduces cashflow unpredictability.',
        isAssumption: false,
        confidence: 1.0,
        importance: 'high',
      });
    } else if (budget < 1000) {
      weaknesses.push({
        id: 'weak_constrained_capital',
        category: 'weakness',
        statement: 'Highly Constrained Working Capital',
        detail: `Monthly budget of $${budget} restricts paid acquisition scalability.`,
        evidence: [profileCitation],
        isAssumption: false,
        confidence: 0.95,
        importance: 'medium',
      });
    }

    if (!profile?.customerPersonas || profile.customerPersonas.length === 0) {
      weaknesses.push({
        id: 'weak_no_personas',
        category: 'weakness',
        statement: 'Undefined Buyer Personas',
        detail: 'Marketing campaigns risk broad, unsegmented messaging.',
        isAssumption: true, // Marked explicitly as assumption since they may operate via unwritten intuition
        confidence: 0.7,
        importance: 'high',
      });
    }

    // Check past failure episodes
    const failureEpisodes = episodes.filter((e) =>
      e.learnings.some(
        (l) => l.toLowerCase().includes('fail') || l.toLowerCase().includes('discontinue')
      )
    );
    for (const ep of failureEpisodes) {
      weaknesses.push({
        id: `weak_ep_${ep.episodeId}`,
        category: 'weakness',
        statement: `Historical Vulnerability: ${ep.title}`,
        detail: ep.summary,
        evidence: [
          {
            sourceId: ep.episodeId,
            sourceType: 'EPISODE',
            title: ep.title,
            confidence: 0.9,
          },
        ],
        isAssumption: false,
        confidence: 0.9,
        importance: 'medium',
      });
    }

    // 3. Evaluate Opportunities
    if (
      products.some(
        (p) =>
          p.category?.toLowerCase().includes('commercial') ||
          p.category?.toLowerCase().includes('b2b')
      )
    ) {
      opportunities.push({
        id: 'opp_b2b_wholesale',
        category: 'opportunity',
        statement: 'High-Margin B2B Wholesale Accounts',
        detail: 'Commercial catalog format allows expanding recurring wholesale supply contracts.',
        isAssumption: true,
        confidence: 0.8,
        importance: 'high',
      });
    }

    if (
      profile?.stage === 'Early Traction' ||
      profile?.stage === 'Pre-Launch' ||
      (profile?.stage as any) === 'Growing Business' ||
      (profile?.stage as any) === 'Early-Stage Startup'
    ) {
      opportunities.push({
        id: 'opp_digital_channel_expansion',
        category: 'opportunity',
        statement: 'Direct Digital Acquisition Channel Expansion',
        detail: 'Leverage content and outbound B2B pipelines to capture unserved regional demand.',
        isAssumption: true,
        confidence: 0.75,
        importance: 'medium',
      });
    }

    // 4. Evaluate Threats
    if (brand?.restrictedClaims && brand.restrictedClaims.length > 0) {
      threats.push({
        id: 'threat_compliance_limits',
        category: 'threat',
        statement: 'Regulatory & Claims Compliance Boundaries',
        detail: `Must strictly avoid prohibited claims: ${brand.restrictedClaims.join('; ')}`,
        evidence: [
          {
            sourceId: `src_brand_${brand.brandIdentityId}`,
            sourceType: 'USER_CONFIRMED_FACT',
            title: 'Restricted Claims Guidelines',
            confidence: 1.0,
          },
        ],
        isAssumption: false,
        confidence: 1.0,
        importance: 'high',
      });
    }

    // Contradiction Detection:
    // e.g., If wordsToAvoid contains a word that exists in tagline or product descriptions
    const wordsToAvoid = brand?.wordsToAvoid || [];
    for (const word of wordsToAvoid) {
      const cleanWord = word.trim().toLowerCase();
      if (profile?.tagline?.toLowerCase().includes(cleanWord)) {
        contradictionsDetected.push(
          `Tagline "${profile.tagline}" contains prohibited brand word "${word}".`
        );
      }
      for (const p of products) {
        if (
          p.description?.toLowerCase().includes(cleanWord) ||
          p.name.toLowerCase().includes(cleanWord)
        ) {
          contradictionsDetected.push(
            `Product "${p.name}" description contains prohibited brand word "${word}".`
          );
        }
      }
    }

    return {
      workspaceId,
      strengths,
      weaknesses,
      opportunities,
      threats,
      generatedAt: new Date().toISOString(),
      contradictionsDetected: contradictionsDetected.length ? contradictionsDetected : undefined,
    };
  }

  /**
   * Identifies gaps between stated goals and operational realities
   */
  public async analyzeBusinessGaps(workspaceId: string): Promise<BusinessGap[]> {
    const goals = await goalRepository.listGoals(workspaceId);
    const profile = await businessProfileRepository.getProfile(workspaceId);
    const products = await productRepository.listProducts(workspaceId);
    const resources = profile?.resourcesAndConstraints;
    const budget =
      resources?.monthlyMarketingBudget ??
      (typeof resources?.marketingBudget === 'number'
        ? resources.marketingBudget
        : (resources?.marketingBudget as any)?.monthly);

    const gaps: BusinessGap[] = [];

    for (const goal of goals) {
      const gTitle = goal.title || '';
      // 1. Budget Gap check
      if (
        !budget &&
        (gTitle.toLowerCase().includes('grow') ||
          gTitle.toLowerCase().includes('scale') ||
          gTitle.toLowerCase().includes('acquire'))
      ) {
        gaps.push({
          gapId: `gap_budget_${goal.goalId}`,
          category: 'revenue',
          description: `Goal "${gTitle}" lacks defined marketing capital allocation.`,
          impactSeverity: 'high',
          connectedGoalId: goal.goalId,
          recommendedRemediation:
            'Define explicit monthly marketing budget in Business Brain resources.',
          isAssumption: false,
        });
      }

      // 2. Product Catalog Gap check
      if (gTitle.toLowerCase().includes('sales') && products.length === 0) {
        gaps.push({
          gapId: `gap_prod_${goal.goalId}`,
          category: 'capability',
          description: `Goal "${gTitle}" target requires marketable SKUs, but catalog is currently empty.`,
          impactSeverity: 'critical',
          connectedGoalId: goal.goalId,
          recommendedRemediation:
            'Register verified products with pricing in Products & Services catalogue.',
          isAssumption: false,
        });
      }

      // 3. Operational Throughput Gap
      const capacity = resources?.operatingCapacity || (resources as any)?.operationalCapacity;
      if (!capacity && gTitle.toLowerCase().includes('keg')) {
        gaps.push({
          gapId: `gap_cap_${goal.goalId}`,
          category: 'operational_constraint',
          description: `Goal "${gTitle}" targets high volume but weekly production capacity ceiling is unstated.`,
          impactSeverity: 'medium',
          connectedGoalId: goal.goalId,
          recommendedRemediation:
            'Specify weekly operating capacity limit to prevent over-commitment.',
          isAssumption: true,
        });
      }
    }

    return gaps;
  }

  /**
   * Root-Cause Analysis investigating performance issues rather than defaulting to "more marketing"
   */
  public async investigateRootCause(params: {
    workspaceId: string;
    issueDescription: string;
    observedMetric?: string;
  }): Promise<RootCauseInvestigation> {
    const { workspaceId, issueDescription, observedMetric } = params;
    const profile = await businessProfileRepository.getProfile(workspaceId);
    const episodes = await memoryService.listEpisodes(workspaceId);
    const products = await productRepository.listProducts(workspaceId);

    const hypotheses: RootCauseInvestigation['hypotheses'] = [];

    // Hyp 1: Price / Margin Friction
    const expensiveProducts = products.filter((p) => p.price > 100);
    hypotheses.push({
      cause: 'Pricing or Wholesale Minimum Barrier',
      likelihood: expensiveProducts.length > 0 ? 'probable' : 'possible',
      isCorrelationOnly: false,
      evidenceNotes:
        'Commercial accounts frequently exhibit resistance to unit price or minimum order quantities rather than brand awareness.',
    });

    // Hyp 2: Audience Fit Misalignment
    const hasPersonas = Boolean(profile?.customerPersonas?.length);
    hypotheses.push({
      cause: 'Audience Targeting Misalignment',
      likelihood: hasPersonas ? 'possible' : 'probable',
      isCorrelationOnly: true,
      evidenceNotes: hasPersonas
        ? 'Target personas are defined, but conversion drop-off may stem from channel mismatch rather than creative quality.'
        : 'Lack of verified buyer personas strongly correlates with unqualified lead generation.',
    });

    // Hyp 3: Product Packaging or Delivery Friction (from episodic learnings)
    const packagingEpisode = episodes.find((e) =>
      e.learnings.some(
        (l) => l.toLowerCase().includes('packaging') || l.toLowerCase().includes('return')
      )
    );
    if (packagingEpisode) {
      hypotheses.push({
        cause: 'Packaging or Return Logistics Friction',
        likelihood: 'confirmed',
        isCorrelationOnly: false,
        evidenceNotes: `Historical precedent documented in decision: "${packagingEpisode.title}" (${packagingEpisode.summary}).`,
        evidence: [
          {
            sourceId: packagingEpisode.episodeId,
            sourceType: 'DECISION',
            title: packagingEpisode.title,
            confidence: 0.95,
          },
        ],
      });
    }

    return {
      issueId: `issue_${Date.now()}`,
      symptom: issueDescription,
      hypotheses,
      identifiedRootCause: packagingEpisode
        ? 'Logistical and packaging friction confirmed by historical experiment records.'
        : 'Commercial pricing/minimum order threshold friction requiring B2B value demonstration.',
      recommendedInvestigationSteps: [
        'Survey churned or unresponsive prospects specifically on packaging and pricing thresholds.',
        'Review unit gross margin structure before allocating incremental advertising spend.',
        'A/B test lower minimum commitment tiers instead of broad top-of-funnel ad campaigns.',
      ],
      requiresMoreData: !observedMetric,
    };
  }
}

export const businessAnalysisService = new BusinessAnalysisService();
