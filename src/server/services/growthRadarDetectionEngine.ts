/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'node:crypto';
import type {
  BusinessProfileEntity,
  ProductEntity,
  ServiceEntity,
  BusinessGoalEntity,
  CompetitorEntity,
  AudienceSegmentEntity,
  BusinessDocumentEntity,
  CampaignExperimentResultEntity,
  BusinessMetricEventEntity,
  GrowthRadarOpportunity,
  GrowthOpportunityCategory,
  GrowthOpportunityType,
  OpportunityScoreWeights,
  OpportunitySupportingEvidence,
} from '../types/api';
import { GROWTH_RADAR_DISCLAIMER } from '../../types/growthRadar';
import type { EvidenceRecord } from '../types/evidence';

export interface RadarDetectionInput {
  workspaceId: string;
  profile: BusinessProfileEntity;
  products: ProductEntity[];
  services: ServiceEntity[];
  goals: BusinessGoalEntity[];
  competitors: CompetitorEntity[];
  audienceSegments: AudienceSegmentEntity[];
  documents: BusinessDocumentEntity[];
  experiments: CampaignExperimentResultEntity[];
  metrics: BusinessMetricEventEntity[];
  evidenceLakeRecords?: EvidenceRecord[];
  weights?: Partial<OpportunityScoreWeights>;
  now?: Date | string;
}

export class GrowthRadarDetectionEngine {
  /**
   * Scans all business context and produces structured, grounded opportunities and risks
   */
  public detectOpportunities(input: RadarDetectionInput): GrowthRadarOpportunity[] {
    const {
      workspaceId,
      profile,
      products,
      services,
      goals,
      competitors,
      audienceSegments: _audienceSegments,
      documents: _documents,
      experiments,
      metrics: _metrics,
    } = input;

    const now = typeof input.now === 'string' ? new Date(input.now) : input.now || new Date();
    const nowIso = now.toISOString();

    const expirationDate = new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000).toISOString(); // 21 days default

    const allOfferings = [
      ...products.map((p) => ({ ...p, isService: false })),
      ...services.map((s) => ({ ...s, isService: true })),
    ];

    const detected: Array<{
      category: GrowthOpportunityCategory;
      type: GrowthOpportunityType;
      title: string;
      description: string;
      potentialImpact: string;
      rawFactors: {
        businessImpact: number;
        goalAlignment: number;
        evidenceConfidence: number;
        feasibility: number;
        costEfficiency: number;
      };
      supportingEvidence: OpportunitySupportingEvidence[];
      estimatedEffort: 'LOW' | 'MEDIUM' | 'HIGH';
      requiredBudget: {
        amount?: number;
        currency?: string;
        isEstimate: boolean;
        note?: string;
      };
      relevantDepartment: string;
      dependencies: string[];
      recommendedAction: string;
      isBottleneck?: boolean;
      isRisk?: boolean;
    }> = [];

    // -------------------------------------------------------------------------
    // 1. REVENUE OPPORTUNITIES
    // -------------------------------------------------------------------------

    // 1.1 Under-promoted Products
    for (const prod of products) {
      if (prod.status === 'active') {
        const prodExperiments = experiments.filter(
          (e) =>
            e.campaignName.toLowerCase().includes(prod.name.toLowerCase()) ||
            e.hypothesis.toLowerCase().includes(prod.name.toLowerCase())
        );
        if (prodExperiments.length === 0) {
          detected.push({
            category: 'REVENUE',
            type: 'UNDER_PROMOTED_PRODUCT',
            title: `Activate Dedicated Campaign for Under-Promoted '${prod.name}'`,
            description: `'${prod.name}' is an active catalogue offering without any dedicated campaign experiments or promotion history.`,
            potentialImpact: `Accelerates customer discovery and unlocks unmonetized catalogue inventory for '${prod.name}'.`,
            rawFactors: {
              businessImpact: prod.price > 100 ? 80 : 65,
              goalAlignment: goals.length > 0 ? 85 : 60,
              evidenceConfidence: prod.source === 'USER_CONFIRMED' ? 95 : 75,
              feasibility: 85,
              costEfficiency: 80,
            },
            supportingEvidence: [
              {
                sourceId: `prod_${prod.productId}`,
                sourceType: 'PRODUCT',
                title: prod.name,
                confidence: prod.price > 0 ? 0.95 : 0.7,
                detail: `Listed at ${prod.currency || 'USD'} ${prod.price || 'N/A'} with 0 active marketing experiments recorded.`,
              },
            ],
            estimatedEffort: 'LOW',
            requiredBudget: {
              amount: 250,
              currency: prod.currency || 'USD',
              isEstimate: true,
              note: 'Starter ad test spend',
            },
            relevantDepartment: 'MARKETING',
            dependencies: [],
            recommendedAction: `Draft a targeted 2-week acquisition campaign in Marketing focused on '${prod.name}'.`,
          });
        }
      }
    }

    // 1.2 Cross-selling Opportunities
    if (products.length >= 2 || (products.length >= 1 && services.length >= 1)) {
      const topOfferings = allOfferings.slice(0, 2);
      detected.push({
        category: 'REVENUE',
        type: 'CROSS_SELLING',
        title: `Package Complementary Bundle: '${topOfferings[0].name}' + '${topOfferings[1].name}'`,
        description: `Cross-selling package combining complementary offerings to increase average order value and customer retention.`,
        potentialImpact: `Expands basket size by introducing buyers of '${topOfferings[0].name}' to complementary '${topOfferings[1].name}'.`,
        rawFactors: {
          businessImpact: 75,
          goalAlignment: 80,
          evidenceConfidence: 90,
          feasibility: 90,
          costEfficiency: 95,
        },
        supportingEvidence: [
          {
            sourceId: `prod_${topOfferings[0].name}`,
            sourceType: 'PRODUCT',
            title: topOfferings[0].name,
            confidence: 0.9,
            detail: `Primary active offering in catalogue.`,
          },
          {
            sourceId: `prod_${topOfferings[1].name}`,
            sourceType: topOfferings[1].isService ? 'SERVICE' : 'PRODUCT',
            title: topOfferings[1].name,
            confidence: 0.9,
            detail: `Complementary offering suited for checkout pairing.`,
          },
        ],
        estimatedEffort: 'LOW',
        requiredBudget: { amount: 0, isEstimate: false, note: 'Zero incremental capital required' },
        relevantDepartment: 'SALES',
        dependencies: [],
        recommendedAction: `Create a bundled checkout offer or post-purchase follow-up sequence.`,
      });
    }

    // 1.3 Upselling Opportunities
    const tieredProducts = products.filter(
      (p) => p.pricingStructure === 'tiered' || (p.variants && p.variants.length > 1)
    );
    if (tieredProducts.length > 0) {
      const p = tieredProducts[0];
      detected.push({
        category: 'REVENUE',
        type: 'UPSELLING',
        title: `Design Premium Tier Upgrade Path for '${p.name}'`,
        description: `'${p.name}' features tiered variants, presenting an upgrade sequence opportunity for existing active customers.`,
        potentialImpact: `Elevates customer lifetime value (LTV) through systematic tiered upgrades.`,
        rawFactors: {
          businessImpact: 78,
          goalAlignment: 82,
          evidenceConfidence: 85,
          feasibility: 85,
          costEfficiency: 90,
        },
        supportingEvidence: [
          {
            sourceId: `prod_${p.productId}`,
            sourceType: 'PRODUCT',
            title: p.name,
            confidence: 0.9,
            detail: `Has ${p.variants?.length || 0} variants configured in product catalogue.`,
          },
        ],
        estimatedEffort: 'MEDIUM',
        requiredBudget: { amount: 0, isEstimate: false, note: 'Internal collateral setup' },
        relevantDepartment: 'SALES',
        dependencies: [],
        recommendedAction: `Deploy in-app or automated email upgrade triggers when customers reach usage milestones.`,
      });
    }

    // 1.4 Pricing Optimization (where verified competitor data exists)
    for (const prod of products) {
      for (const comp of competitors) {
        if (comp.pricingRange && prod.price > 0) {
          // Check if competitor price exceeds our price
          const compPrices = comp.pricingRange.match(/\d+([,.]\d+)?/g);
          if (compPrices && compPrices.length > 0) {
            const compMin = parseFloat(compPrices[0].replace(',', ''));
            if (compMin > prod.price * 1.25) {
              detected.push({
                category: 'REVENUE',
                type: 'PRICING_OPTIMIZATION',
                title: `Evaluate Pricing Headroom for '${prod.name}' against '${comp.name}'`,
                description: `'${comp.name}' charges '${comp.pricingRange}' while '${prod.name}' is priced at ${prod.currency || 'USD'} ${prod.price}. Verified positioning reveals potential pricing headroom.`,
                potentialImpact: `Increases gross margin without sacrificing value proposition if backed by verified quality indicators.`,
                rawFactors: {
                  businessImpact: 88,
                  goalAlignment: 85,
                  evidenceConfidence: 80,
                  feasibility: 75,
                  costEfficiency: 90,
                },
                supportingEvidence: [
                  {
                    sourceId: `comp_${comp.competitorId}`,
                    sourceType: 'COMPETITOR',
                    title: comp.name,
                    confidence: 0.85,
                    detail: `Monitored competitor pricing range: ${comp.pricingRange}.`,
                  },
                  {
                    sourceId: `prod_${prod.productId}`,
                    sourceType: 'PRODUCT',
                    title: prod.name,
                    confidence: 0.95,
                    detail: `Current catalogue price: ${prod.price}.`,
                  },
                ],
                estimatedEffort: 'LOW',
                requiredBudget: { amount: 0, isEstimate: false, note: 'Pricing policy revision' },
                relevantDepartment: 'FINANCE',
                dependencies: [],
                recommendedAction: `Run a disciplined pricing elasticity test with an introductory cohort before modifying public baseline pricing.`,
              });
            }
          }
        }
      }
    }

    // 1.5 New Customer Segments & Market Opportunities
    const unservedPersonas = (profile.customerPersonas || []).filter((persona) => {
      return !allOfferings.some((o) =>
        o.targetCustomer?.toLowerCase().includes(persona.name?.toLowerCase() || '')
      );
    });
    for (const persona of unservedPersonas) {
      detected.push({
        category: 'REVENUE',
        type: 'NEW_CUSTOMER_SEGMENT',
        title: `Develop Targeted Solution for Persona '${persona.name}'`,
        description: `Customer persona '${persona.name}' (${persona.segment || 'Defined Segment'}) has mapped pain points but no dedicated offering in your active catalogue.`,
        potentialImpact: `Captures an unserved buyer segment aligned with your existing domain authority.`,
        rawFactors: {
          businessImpact: 82,
          goalAlignment: 78,
          evidenceConfidence: 75,
          feasibility: 70,
          costEfficiency: 75,
        },
        supportingEvidence: [
          {
            sourceId: `persona_${persona.id || persona.name}`,
            sourceType: 'AUDIENCE',
            title: persona.name,
            confidence: 0.85,
            detail: `Mapped pain points: ${(persona.painPoints || []).join(', ') || 'Documented'}.`,
          },
        ],
        estimatedEffort: 'MEDIUM',
        requiredBudget: {
          amount: 500,
          isEstimate: true,
          note: 'Audience testing and collateral budget',
        },
        relevantDepartment: 'GROWTH_DIRECTOR',
        dependencies: [],
        recommendedAction: `Create a dedicated landing angle or packaging tier tailored to ${persona.name}.`,
      });
    }

    // -------------------------------------------------------------------------
    // 2. MARKETING OPPORTUNITIES
    // -------------------------------------------------------------------------

    // 2.1 Underutilized Channels
    const activeChannels = new Set(experiments.map((e) => e.channel.toLowerCase()));
    const keyIndustryChannels = ['email', 'search', 'linkedin', 'meta'];
    for (const ch of keyIndustryChannels) {
      if (!activeChannels.has(ch)) {
        detected.push({
          category: 'MARKETING',
          type: 'UNDERUTILIZED_CHANNEL',
          title: `Expand Acquisition Strategy to ${ch.toUpperCase()} Channel`,
          description: `No active or recent campaigns have been executed on the ${ch.toUpperCase()} channel, leaving customer touchpoints unexploited.`,
          potentialImpact: `Diversifies customer acquisition away from single-channel dependence and lowers blended blended CAC.`,
          rawFactors: {
            businessImpact: 72,
            goalAlignment: 75,
            evidenceConfidence: 70,
            feasibility: 80,
            costEfficiency: 75,
          },
          supportingEvidence: [
            {
              sourceId: `channel_${ch}`,
              sourceType: 'CAMPAIGN',
              title: `${ch.toUpperCase()} Marketing Channel`,
              confidence: 0.8,
              detail: `0 campaign experiments logged in workspace history.`,
            },
          ],
          estimatedEffort: 'MEDIUM',
          requiredBudget: { amount: 300, isEstimate: true, note: 'Pilot ad spend' },
          relevantDepartment: 'MARKETING',
          dependencies: [],
          recommendedAction: `Formulate a channel experiment testing the primary value proposition on ${ch.toUpperCase()}.`,
        });
        break; // Suggest one top underutilized channel per scan
      }
    }

    // 2.2 Competitor Differentiation Opportunities
    for (const comp of competitors) {
      if (comp.weaknesses && comp.weaknesses.length > 0) {
        const topWeakness = comp.weaknesses[0];
        detected.push({
          category: 'MARKETING',
          type: 'COMPETITOR_DIFFERENTIATION',
          title: `Position Against '${comp.name}' Weakness: ${topWeakness}`,
          description: `Competitor intelligence flags '${topWeakness}' as a documented vulnerability for '${comp.name}'.`,
          potentialImpact: `Steals market share and wins comparison searches by directly addressing known competitor flaws.`,
          rawFactors: {
            businessImpact: 80,
            goalAlignment: 82,
            evidenceConfidence: 85,
            feasibility: 85,
            costEfficiency: 88,
          },
          supportingEvidence: [
            {
              sourceId: `comp_${comp.competitorId}`,
              sourceType: 'COMPETITOR',
              title: comp.name,
              confidence: 0.9,
              detail: `Documented competitor weakness: ${topWeakness}.`,
            },
          ],
          estimatedEffort: 'LOW',
          requiredBudget: {
            amount: 150,
            isEstimate: true,
            note: 'Comparison copy & creative assets',
          },
          relevantDepartment: 'MARKETING',
          dependencies: [],
          recommendedAction: `Produce a comparison asset highlighting your superiority in contrast to ${topWeakness}.`,
        });
        break; // Pick top competitor opportunity
      }
    }

    // 2.3 Seasonal Campaigns
    detected.push({
      category: 'MARKETING',
      type: 'SEASONAL_CAMPAIGN',
      title: `Prepare Quarterly Growth Sprint Aligned with Seasonal Demand`,
      description: `Seasonal buying cycles create peak conversion windows for businesses in ${profile.industry || 'your industry'}.`,
      potentialImpact: `Capitalizes on seasonal demand spikes before ad auction prices surge.`,
      rawFactors: {
        businessImpact: 68,
        goalAlignment: 72,
        evidenceConfidence: 75,
        feasibility: 85,
        costEfficiency: 80,
      },
      supportingEvidence: [
        {
          sourceId: `profile_industry`,
          sourceType: 'PROFILE',
          title: profile.industry || 'Industry Context',
          confidence: 0.8,
          detail: `Seasonal purchase behaviors identified for ${profile.industry || 'market segment'}.`,
        },
      ],
      estimatedEffort: 'MEDIUM',
      requiredBudget: { amount: 200, isEstimate: true, note: 'Creative preparation' },
      relevantDepartment: 'MARKETING',
      dependencies: [],
      recommendedAction: `Schedule a 30-day promotional push with dedicated messaging.`,
    });

    // -------------------------------------------------------------------------
    // 3. CUSTOMER OPPORTUNITIES
    // -------------------------------------------------------------------------

    // 3.1 Repeat Customer Opportunities
    if (
      products.some(
        (p) =>
          p.category?.toLowerCase().includes('bean') ||
          p.category?.toLowerCase().includes('consumable') ||
          profile.businessModel?.toLowerCase().includes('subscription')
      )
    ) {
      detected.push({
        category: 'CUSTOMER',
        type: 'REPEAT_CUSTOMER_EXPANSION',
        title: `Launch Automated Replenishment / Subscription Cadence`,
        description: `Consumable or recurring offerings benefit from an automated replenishment program to stabilize cash flow.`,
        potentialImpact: `Increases customer retention and predictable monthly recurring revenue (MRR).`,
        rawFactors: {
          businessImpact: 86,
          goalAlignment: 90,
          evidenceConfidence: 90,
          feasibility: 80,
          costEfficiency: 85,
        },
        supportingEvidence: [
          {
            sourceId: `profile_model`,
            sourceType: 'PROFILE',
            title: 'Business Model',
            confidence: 0.9,
            detail: `Catalogue contains repeat consumable or usage-based offerings.`,
          },
        ],
        estimatedEffort: 'MEDIUM',
        requiredBudget: { amount: 0, isEstimate: false, note: 'Subscription configuration' },
        relevantDepartment: 'SALES',
        dependencies: [],
        recommendedAction: `Offer a flexible subscription cadence with a modest loyalty discount.`,
      });
    }

    // 3.2 Customer Objections
    for (const persona of profile.customerPersonas || []) {
      if ((persona as any).objections && (persona as any).objections.length > 0) {
        const obj = (persona as any).objections[0];
        detected.push({
          category: 'CUSTOMER',
          type: 'CUSTOMER_OBJECTION',
          title: `Build Objection Battlecard for: '${obj}'`,
          description: `Customer persona '${persona.name}' records frequent objection: '${obj}'.`,
          potentialImpact: `Shortens sales cycles and improves sales conversion by neutralizing buyer hesitation up front.`,
          rawFactors: {
            businessImpact: 76,
            goalAlignment: 80,
            evidenceConfidence: 90,
            feasibility: 90,
            costEfficiency: 95,
          },
          supportingEvidence: [
            {
              sourceId: `persona_${persona.id || persona.name}`,
              sourceType: 'AUDIENCE',
              title: persona.name,
              confidence: 0.95,
              detail: `Documented objection: '${obj}'.`,
            },
          ],
          estimatedEffort: 'LOW',
          requiredBudget: { amount: 0, isEstimate: false, note: 'Collateral preparation' },
          relevantDepartment: 'SALES',
          dependencies: [],
          recommendedAction: `Create a transparent FAQ section or sales proof point addressing this objection.`,
        });
        break;
      }
    }

    // -------------------------------------------------------------------------
    // 4. OPERATIONAL RISKS & BOTTLENECK DETECTION
    // -------------------------------------------------------------------------

    // 4.1 Capacity Constraints
    const res = profile.resourcesAndConstraints;
    const opCapacity = res?.operatingCapacity !== undefined ? String(res.operatingCapacity).toLowerCase() : '';
    if (
      opCapacity &&
      (opCapacity.includes('max') ||
        opCapacity.includes('limit') ||
        opCapacity.includes('capacity'))
    ) {
      detected.push({
        category: 'OPERATIONAL_RISK',
        type: 'CAPACITY_CONSTRAINT',
        title: `Operational Capacity Constraint Detected: ${res?.operatingCapacity}`,
        description: `Stated operating capacity indicates potential bottleneck during high-volume customer acquisition.`,
        potentialImpact: `Prevents service degradation, delayed fulfillments, and negative reviews by planning capacity buffers.`,
        rawFactors: {
          businessImpact: 85,
          goalAlignment: 88,
          evidenceConfidence: 95,
          feasibility: 70,
          costEfficiency: 65,
        },
        supportingEvidence: [
          {
            sourceId: `profile_capacity`,
            sourceType: 'PROFILE',
            title: 'Operating Capacity',
            confidence: 0.95,
            detail: `Recorded capacity limit: ${res?.operatingCapacity}.`,
          },
        ],
        estimatedEffort: 'HIGH',
        requiredBudget: { amount: 0, isEstimate: false, note: 'Process optimization' },
        relevantDepartment: 'OPERATIONS',
        dependencies: [],
        recommendedAction: `Establish workflow automation or overflow vendor partnerships before scaling ad campaigns.`,
        isBottleneck: true,
        isRisk: true,
      });
    }

    // 4.2 Inconsistent Pricing Information
    const freeOrUnpricedProds = products.filter((p) => p.price <= 0 || !p.currency);
    if (freeOrUnpricedProds.length > 0) {
      const p = freeOrUnpricedProds[0];
      detected.push({
        category: 'OPERATIONAL_RISK',
        type: 'INCONSISTENT_PRICING',
        title: `Inconsistent or Missing Pricing for '${p.name}'`,
        description: `'${p.name}' is listed with zero or missing price, preventing automated checkout and financial modeling.`,
        potentialImpact: `Blocks marketing automation and causes customer checkout friction.`,
        rawFactors: {
          businessImpact: 80,
          goalAlignment: 85,
          evidenceConfidence: 95,
          feasibility: 95,
          costEfficiency: 95,
        },
        supportingEvidence: [
          {
            sourceId: `prod_${p.productId}`,
            sourceType: 'PRODUCT',
            title: p.name,
            confidence: 1.0,
            detail: `Recorded price is ${p.price} (currency: ${p.currency || 'MISSING'}).`,
          },
        ],
        estimatedEffort: 'LOW',
        requiredBudget: { amount: 0, isEstimate: false, note: 'Catalogue update' },
        relevantDepartment: 'FINANCE',
        dependencies: [],
        recommendedAction: `Specify authoritative baseline pricing and currency in the Product Catalogue.`,
        isRisk: true,
      });
    }

    // 4.3 Unverified Claims / AI Inferred Facts
    const provenance = profile.provenance || {};
    const unconfirmedFacts = Object.entries(provenance).filter(
      ([_, prov]) => prov.source === 'AI_INFERRED'
    );
    if (unconfirmedFacts.length > 2) {
      detected.push({
        category: 'OPERATIONAL_RISK',
        type: 'UNVERIFIED_CLAIM',
        title: `Unverified AI-Inferred Business Facts (${unconfirmedFacts.length} Pending Confirmation)`,
        description: `Key business facts (e.g., ${unconfirmedFacts
          .slice(0, 2)
          .map(([k]) => k)
          .join(
            ', '
          )}) remain unconfirmed by founder, presenting hallucination risk in autonomous campaigns.`,
        potentialImpact: `Protects brand reputation and prevents Truth Check rejections during live generation.`,
        rawFactors: {
          businessImpact: 85,
          goalAlignment: 90,
          evidenceConfidence: 90,
          feasibility: 95,
          costEfficiency: 95,
        },
        supportingEvidence: unconfirmedFacts.slice(0, 3).map(([key, prov]) => ({
          sourceId: `prov_${key}`,
          sourceType: 'PROFILE',
          title: key,
          confidence: prov.confidence || 0.6,
          detail: `Current source: ${prov.source} (needs founder verification).`,
        })),
        estimatedEffort: 'LOW',
        requiredBudget: { amount: 0, isEstimate: false, note: 'Founder review queue' },
        relevantDepartment: 'STRATEGY',
        dependencies: [],
        recommendedAction: `Review and confirm pending facts in the Business Brain Verification Queue.`,
        isRisk: true,
      });
    }

    // -------------------------------------------------------------------------
    // 4.4 SHARED EVIDENCE LAKE PROACTIVE DISCOVERIES
    // (Cross-capability synthesis: Competitor Tracking, Customer Voice, Market Trends)
    // -------------------------------------------------------------------------
    for (const record of input.evidenceLakeRecords || []) {
      if (
        record.sourceType === 'COMPETITOR_DIFF' &&
        record.extractedMetrics?.changeType === 'PRICE_INCREASE'
      ) {
        detected.push({
          category: 'MARKETING',
          type: 'COMPETITOR_DIFFERENTIATION',
          title: `Conquest Campaign: ${record.title}`,
          description: `${record.rawExcerpt}. Exploit their price hike with a focused comparison campaign highlighting superior value.`,
          potentialImpact: `Captures price-sensitive customers actively evaluating alternatives.`,
          rawFactors: {
            businessImpact: 88,
            goalAlignment: 90,
            evidenceConfidence: 95,
            feasibility: 85,
            costEfficiency: 90,
          },
          supportingEvidence: [
            {
              sourceId: record.evidenceId,
              sourceType: 'COMPETITOR',
              title: record.title,
              confidence: record.confidence,
              detail: record.rawExcerpt,
            },
          ],
          estimatedEffort: 'MEDIUM',
          requiredBudget: { amount: 150, isEstimate: true, note: 'Conquest ad spend' },
          relevantDepartment: 'MARKETING',
          dependencies: [],
          recommendedAction: `Deploy comparison landing page and targeted search ads.`,
        });
      } else if (
        record.capability === 'CUSTOMER_VOICE' &&
        record.extractedMetrics?.topObjection &&
        record.extractedMetrics.topObjection !== 'NONE'
      ) {
        const objectionKey = String(record.extractedMetrics.topObjection);
        const titleMap: Record<string, string> = {
          ONBOARDING_COMPLEXITY:
            'Counter-Position Against Competitor Friction: Frictionless Onboarding',
          PRICE_TOO_HIGH: 'Counter-Position Against Competitor Friction: Transparent Value Pricing',
          POOR_SUPPORT: 'Counter-Position Against Competitor Friction: Guaranteed SLA Support',
          MISSING_INTEGRATIONS:
            'Counter-Position Against Competitor Friction: Ready-Built Integrations',
        };
        const title =
          titleMap[objectionKey] ||
          `Counter-Position Against Competitor Friction: ${objectionKey.replace(/_/g, ' ')}`;

        detected.push({
          category: 'CUSTOMER',
          type: 'CUSTOMER_OBJECTION',
          title,
          description: `${record.rawExcerpt}. Contrast your offering against industry friction in ${objectionKey.replace(/_/g, ' ').toLowerCase()}.`,
          potentialImpact: `Increases sign-up conversion by neutralizing buyer friction up front.`,
          rawFactors: {
            businessImpact: 82,
            goalAlignment: 85,
            evidenceConfidence: 92,
            feasibility: 90,
            costEfficiency: 95,
          },
          supportingEvidence: [
            {
              sourceId: record.evidenceId,
              sourceType: 'AUDIENCE',
              title: record.title,
              confidence: record.confidence,
              detail: record.rawExcerpt,
            },
          ],
          estimatedEffort: 'LOW',
          requiredBudget: { amount: 0, isEstimate: false, note: 'Copywriting revision' },
          relevantDepartment: 'MARKETING',
          dependencies: [],
          recommendedAction: `Update homepage hero copy and sales battlecard for '${objectionKey.replace(/_/g, ' ')}'.`,
        });
      }
    }

    // -------------------------------------------------------------------------
    // 5. SCORE CALCULATION & OPPORTUNITY STRUCTURING
    // -------------------------------------------------------------------------
    const impactWeight = input.weights?.businessImpact ?? 0.3;
    const goalWeight = input.weights?.goalAlignment ?? input.weights?.strategicAlignment ?? 0.25;
    const evidenceWeight = input.weights?.evidenceConfidence ?? 0.2;
    const feasibilityWeight = input.weights?.feasibility ?? 0.15;
    const costWeight = input.weights?.costEfficiency ?? 0.1;

    const weightSum = impactWeight + goalWeight + evidenceWeight + feasibilityWeight + costWeight;

    const norm = {
      impact: impactWeight / weightSum,
      alignment: goalWeight / weightSum,
      evidence: evidenceWeight / weightSum,
      feasibility: feasibilityWeight / weightSum,
      cost: costWeight / weightSum,
    };

    return detected.map((raw, idx) => {
      const rf = raw.rawFactors;

      const factorContributions = {
        businessImpact: Number((rf.businessImpact * norm.impact).toFixed(2)),
        goalAlignment: Number((rf.goalAlignment * norm.alignment).toFixed(2)),
        evidenceConfidence: Number((rf.evidenceConfidence * norm.evidence).toFixed(2)),
        feasibility: Number((rf.feasibility * norm.feasibility).toFixed(2)),
        costEfficiency: Number((rf.costEfficiency * norm.cost).toFixed(2)),
      };

      const opportunityScore = Math.max(
        0,
        Math.min(
          100,
          Math.round(
            factorContributions.businessImpact +
              factorContributions.goalAlignment +
              factorContributions.evidenceConfidence +
              factorContributions.feasibility +
              factorContributions.costEfficiency
          )
        )
      );

      const confidence = Math.round(rf.evidenceConfidence);
      const confidenceBand: 'HIGH' | 'MEDIUM' | 'LOW' =
        confidence >= 80 ? 'HIGH' : confidence >= 60 ? 'MEDIUM' : 'LOW';

      // Generate deterministic evidence fingerprint for deduplication
      const fingerprintRaw = `${raw.type}:${raw.title}:${JSON.stringify(
        raw.supportingEvidence.map((e) => e.sourceId)
      )}`;
      const evidenceFingerprint = crypto
        .createHash('sha256')
        .update(fingerprintRaw)
        .digest('hex')
        .substring(0, 24);

      const opportunityId = `opp_${raw.type.toLowerCase()}_${Date.now()}_${idx}_${crypto
        .randomBytes(3)
        .toString('hex')}`;

      return {
        opportunityId,
        workspaceId,
        category: raw.category,
        type: raw.type,
        title: raw.title,
        description: raw.description,
        potentialImpact: raw.potentialImpact,
        opportunityScore,
        rawFactors: rf,
        factorContributions,
        confidence,
        confidenceBand,
        supportingEvidence: raw.supportingEvidence,
        estimatedEffort: raw.estimatedEffort,
        requiredBudget: raw.requiredBudget,
        relevantDepartment: raw.relevantDepartment,
        dependencies: raw.dependencies,
        recommendedAction: raw.recommendedAction,
        lifecycleState: 'READY',
        lifecycleHistory: [
          {
            state: 'READY',
            timestamp: nowIso,
            note: 'Detected by Growth Radar proactive analysis engine.',
          },
        ],
        expirationDate,
        rediscoveredCount: 0,
        evidenceFingerprint,
        isBottleneck: raw.isBottleneck || false,
        isRisk: raw.isRisk || false,
        disclaimer: GROWTH_RADAR_DISCLAIMER,
        createdAt: nowIso,
        updatedAt: nowIso,
        version: 1,
      };
    });
  }
}

export const growthRadarDetectionEngine = new GrowthRadarDetectionEngine();
