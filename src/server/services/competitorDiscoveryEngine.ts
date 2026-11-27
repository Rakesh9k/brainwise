/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'node:crypto';
import { GoogleGenAI } from '@google/genai';
import { serverConfig } from '../config/index';
import type {
  BusinessContextAnalysis,
  DiscoveredCompetitor,
  CompetitorClassification,
  CompetitorRelevanceScore,
} from '../types/competitiveIntelligence';

function getGeminiClient(): GoogleGenAI | null {
  if (
    process.env.NODE_ENV === 'test' ||
    serverConfig.isTest ||
    !serverConfig.geminiApiKey
  ) {
    return null;
  }
  return new GoogleGenAI({
    apiKey: serverConfig.geminiApiKey,
    httpOptions: {
      timeout: 25000,
      headers: { 'User-Agent': 'brainwise-backend' },
    },
  });
}

function matchesKeywords(text: string, keywords: string[]): boolean {
  if (!text) return false;
  const normalized = text.toLowerCase();
  return keywords.some((kw) => {
    const cleanKw = kw.trim().toLowerCase();
    if (!cleanKw) return false;
    if (cleanKw.includes(' ') || cleanKw.includes('-')) {
      return normalized.includes(cleanKw);
    }
    const regex = new RegExp(`(^|[^a-z0-9])${cleanKw}([^a-z0-9]|$)`, 'i');
    return regex.test(normalized);
  });
}

export class CompetitorDiscoveryEngine {
  /**
   * Normalizes company name into canonical format for alias resolution & deduplication
   */
  public canonicalizeCompanyName(name: string): string {
    return name
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/\b(farm to bar|farm-to-bar|craft chocolate)\b/gi, '')
      .replace(/\b(inc|corp|corporation|ltd|pvt|private|llc|co|company|brand|technologies|gmbh)\b/gi, '')
      .replace(/[^a-z0-9]/g, '')
      .trim();
  }

  /**
   * Computes a 6-dimensional explainable relevance score (0 - 100)
   */
  public calculateRelevanceScore(params: {
    context: BusinessContextAnalysis;
    productSimilarity: number;
    customerOverlap: number;
    geographicOverlap: number;
    businessModelSimilarity: number;
    pricingOverlap: number;
    competitiveThreat: number;
    reasoning: string;
  }): CompetitorRelevanceScore {
    // Weighted formula:
    // Product: 25%, Customer: 20%, Geo: 20%, Model: 15%, Pricing: 10%, Threat: 10%
    const overallScore = Math.round(
      params.productSimilarity * 0.25 +
      params.customerOverlap * 0.20 +
      params.geographicOverlap * 0.20 +
      params.businessModelSimilarity * 0.15 +
      params.pricingOverlap * 0.10 +
      params.competitiveThreat * 0.10
    );

    return {
      overallScore: Math.min(100, Math.max(0, overallScore)),
      productSimilarity: params.productSimilarity,
      customerOverlap: params.customerOverlap,
      geographicOverlap: params.geographicOverlap,
      businessModelSimilarity: params.businessModelSimilarity,
      pricingOverlap: params.pricingOverlap,
      competitiveThreat: params.competitiveThreat,
      reasoning: params.reasoning,
    };
  }

  /**
   * Discovers competitors across 10 tiers grounded in real business context
   */
  public async discoverCompetitors(
    _workspaceId: string,
    context: BusinessContextAnalysis
  ): Promise<DiscoveredCompetitor[]> {
    const discoveredList: DiscoveredCompetitor[] = [];

    // 1. Try Gemini AI Discovery if available
    const client = getGeminiClient();
    if (client) {
      try {
        const prompt = `You are the Principal Competitive Intelligence Research Architect for BrainWise.
Analyze the following business and identify REAL, EXISTING competitors across tiers:
Business Idea: "${context.businessIdea}"
Industry: "${context.industry}"
Category: "${context.category}"
Target Geography: "${context.targetGeography}"
Customer Segments: ${context.customerSegments.join(', ')}

Return ONLY valid JSON array with 6 to 10 competitors across classifications:
- DIRECT (Direct product/service peers)
- INDIRECT (Alternative solution providers)
- SUBSTITUTE (Different category fulfilling the same underlying need)
- EMERGING (Fast-growing newer brands or startups)
- ASPIRATIONAL_BENCHMARK (Global leaders setting the gold standard)

Schema for each competitor object:
{
  "name": "Exact Brand Name",
  "aliases": ["Alternative spelling or subsidiary names"],
  "website": "https://official-domain.com",
  "headquarters": "City, Country",
  "geography": "Market coverage",
  "businessCategory": "Category name",
  "productCategory": "Product focus",
  "businessModel": "e.g. D2C, B2B SaaS, Retail",
  "targetAudience": "ICP summary",
  "marketPositioning": "1-sentence positioning",
  "classification": "DIRECT | INDIRECT | SUBSTITUTE | EMERGING | ASPIRATIONAL_BENCHMARK",
  "productSimilarity": 0-100,
  "customerOverlap": 0-100,
  "geographicOverlap": 0-100,
  "businessModelSimilarity": 0-100,
  "pricingOverlap": 0-100,
  "competitiveThreat": 0-100,
  "reasonForInclusion": "Why this competitor matters to the founder",
  "discoverySource": "Domain Knowledge & Market Graph"
}`;

        const resp = await client.models.generateContent({
          model: serverConfig.geminiModel || 'gemini-2.5-flash',
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
        });

        const raw = resp.text || '';
        const jsonMatch = raw.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed) && parsed.length > 0) {
            for (const item of parsed) {
              const canonical = this.canonicalizeCompanyName(item.name);
              const relevance = this.calculateRelevanceScore({
                context,
                productSimilarity: Number(item.productSimilarity) || 75,
                customerOverlap: Number(item.customerOverlap) || 70,
                geographicOverlap: Number(item.geographicOverlap) || 80,
                businessModelSimilarity: Number(item.businessModelSimilarity) || 70,
                pricingOverlap: Number(item.pricingOverlap) || 65,
                competitiveThreat: Number(item.competitiveThreat) || 75,
                reasoning: item.reasonForInclusion || 'Identified as a direct or indirect competitor in category.',
              });

              discoveredList.push({
                competitorId: `comp_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
                name: item.name,
                canonicalName: canonical,
                aliases: Array.isArray(item.aliases) ? item.aliases : [],
                website: item.website || `https://${canonical}.com`,
                headquarters: item.headquarters || context.targetGeography,
                geography: item.geography || context.targetGeography,
                businessCategory: item.businessCategory || context.category,
                productCategory: item.productCategory || context.subIndustry,
                businessModel: item.businessModel || 'Direct Commercial',
                targetAudience: item.targetAudience || 'Target category buyers',
                marketPositioning: item.marketPositioning || `${item.name} operates in ${context.category}.`,
                classification: (item.classification as CompetitorClassification) || 'DIRECT',
                relevanceScore: relevance,
                reasonForInclusion: item.reasonForInclusion || 'Established player in target geography',
                discoverySource: item.discoverySource || 'AI Market Intelligence',
                evidenceIds: [],
                confidence: item.confidence ? Math.min(Number(item.confidence) || 0.85, 0.95) : 0.85,
              });
            }
          }
        }
      } catch (err) {
        console.warn('Gemini competitor discovery failed, falling back to deterministic discovery:', err);
      }
    }

    // 2. Deterministic Grounded Fallback if AI yielded nothing or running offline/test
    if (discoveredList.length === 0) {
      discoveredList.push(...this.getDeterministicCompetitors(context));
    }

    // 3. Deduplicate by canonical name
    return this.resolveDuplicateCompetitors(discoveredList);
  }

  /**
   * Resolves duplicate competitors and aliases
   */
  public resolveDuplicateCompetitors(competitors: DiscoveredCompetitor[]): DiscoveredCompetitor[] {
    const canonicalMap = new Map<string, DiscoveredCompetitor>();

    for (const comp of competitors) {
      const canonicalKey = comp.canonicalName;
      const existing = canonicalMap.get(canonicalKey);

      if (!existing) {
        canonicalMap.set(canonicalKey, comp);
      } else {
        // Merge aliases and take higher relevance/confidence
        existing.aliases = Array.from(new Set([...existing.aliases, comp.name, ...comp.aliases]));
        if (comp.relevanceScore.overallScore > existing.relevanceScore.overallScore) {
          existing.relevanceScore = comp.relevanceScore;
          existing.marketPositioning = comp.marketPositioning;
          existing.website = comp.website.startsWith('http') ? comp.website : existing.website;
        }
      }
    }

    return Array.from(canonicalMap.values()).sort(
      (a, b) => b.relevanceScore.overallScore - a.relevanceScore.overallScore
    );
  }

  /**
   * High-accuracy industry-calibrated real competitors across various sectors
   */
  public getDeterministicCompetitors(context: BusinessContextAnalysis): DiscoveredCompetitor[] {
    const ideaLower = context.businessIdea.toLowerCase();
    const indLower = context.industry.toLowerCase();

    // CHOCOLATE & CONFECTIONERY IN INDIA
    if (
      matchesKeywords(ideaLower, ['chocolate', 'chocolates', 'cacao', 'confectionery', 'praline', 'truffle', 'bonbon', 'mithai']) ||
      matchesKeywords(indLower, ['chocolate', 'confectionery', 'cacao', 'sweet'])
    ) {
      return [
        {
          competitorId: 'comp_paul_and_mike',
          name: 'Paul And Mike',
          canonicalName: 'paulandmike',
          aliases: ['Paul & Mike', 'Paul & Mike Farm to Bar'],
          website: 'https://paulandmike.co',
          headquarters: 'Kochi, Kerala, India',
          geography: 'India National & Select Export',
          businessCategory: 'Artisanal Food & Confectionery',
          productCategory: 'Farm-to-Bar Craft Chocolate',
          businessModel: 'D2C + Gourmet Retail + Luxury Gifting',
          targetAudience: 'Discerning foodies, dark chocolate enthusiasts, and premium gifters',
          marketPositioning: 'India’s premier farm-to-bar chocolate maker winning International Chocolate Awards.',
          classification: 'DIRECT',
          relevanceScore: this.calculateRelevanceScore({
            context,
            productSimilarity: 95,
            customerOverlap: 92,
            geographicOverlap: 90,
            businessModelSimilarity: 88,
            pricingOverlap: 85,
            competitiveThreat: 92,
            reasoning: 'Direct peer in premium Indian bean-to-bar chocolate with strong brand equity.',
          }),
          reasonForInclusion: 'Direct benchmark and primary conversion competitor in artisan craft chocolate.',
          discoverySource: 'BrainWise Industry Knowledge Graph',
          evidenceIds: ['ev_pm_01', 'ev_pm_02'],
          confidence: 0.98,
        },
        {
          competitorId: 'comp_manam_chocolate',
          name: 'Manam Chocolate',
          canonicalName: 'manamchocolate',
          aliases: ['Manam Craft Chocolate', 'Manam Hyderabad'],
          website: 'https://manamchocolate.com',
          headquarters: 'Hyderabad, Telangana, India',
          geography: 'India Metros & Online D2C',
          businessCategory: 'Luxury Confectionery & Experiential Retail',
          productCategory: 'Single-Estate West Godavari Cacao',
          businessModel: 'Experiential Flagship Karkhana + D2C Luxury Gifting',
          targetAudience: 'Affluent urban professionals, culinary tourists, and luxury wedding planners',
          marketPositioning: 'World-class experiential Indian craft chocolate showcasing West Godavari terroir.',
          classification: 'EMERGING',
          relevanceScore: this.calculateRelevanceScore({
            context,
            productSimilarity: 90,
            customerOverlap: 85,
            geographicOverlap: 88,
            businessModelSimilarity: 80,
            pricingOverlap: 90,
            competitiveThreat: 88,
            reasoning: 'Rapidly emerging luxury benchmark setting new aesthetic standards in Indian chocolate.',
          }),
          reasonForInclusion: 'High-growth emerging brand commanding premium pricing and luxury gifting volume.',
          discoverySource: 'BrainWise Industry Knowledge Graph',
          evidenceIds: ['ev_mn_01'],
          confidence: 0.96,
        },
        {
          competitorId: 'comp_subko_cacao',
          name: 'Subko Cacao',
          canonicalName: 'subkocacao',
          aliases: ['Subko Coffee & Cacao', 'Subko Mumbai'],
          website: 'https://subko.coffee',
          headquarters: 'Mumbai, Maharashtra, India',
          geography: 'Mumbai, Bangalore & National E-Commerce',
          businessCategory: 'Specialty Coffee & Cacao House',
          productCategory: 'Micro-Batch Bean-to-Bar Bars & Cacao Pod Pastries',
          businessModel: 'Third-Wave Roastery/Bakery + High-End D2C',
          targetAudience: 'Third-wave coffee connoisseurs, creative designers, and cultural tastemakers',
          marketPositioning: 'Design-led Subcontinent craft showcase pairing single-origin coffee and regional cacao.',
          classification: 'DIRECT',
          relevanceScore: this.calculateRelevanceScore({
            context,
            productSimilarity: 86,
            customerOverlap: 90,
            geographicOverlap: 85,
            businessModelSimilarity: 78,
            pricingOverlap: 88,
            competitiveThreat: 82,
            reasoning: 'Commands exceptional brand loyalty among affluent urban youth.',
          }),
          reasonForInclusion: 'Cultural and lifestyle benchmark in experiential retail.',
          discoverySource: 'BrainWise Industry Knowledge Graph',
          evidenceIds: ['ev_sb_01'],
          confidence: 0.95,
        },
        {
          competitorId: 'comp_mason_and_co',
          name: 'Mason & Co',
          canonicalName: 'masonandco',
          aliases: ['Mason and Co', 'Mason Organic Chocolate'],
          website: 'https://masonchocolate.com',
          headquarters: 'Auroville, Tamil Nadu, India',
          geography: 'India National Organic Stores & D2C',
          businessCategory: 'Organic Health Food & Chocolate',
          productCategory: 'Vegan Organic Single-Origin Dark Chocolate',
          businessModel: 'Organic Retail Distribution + D2C',
          targetAudience: 'Vegan, clean-label, and organic lifestyle consumers',
          marketPositioning: 'The original pioneer of bean-to-bar organic vegan dark chocolate in India.',
          classification: 'DIRECT',
          relevanceScore: this.calculateRelevanceScore({
            context,
            productSimilarity: 88,
            customerOverlap: 80,
            geographicOverlap: 85,
            businessModelSimilarity: 82,
            pricingOverlap: 82,
            competitiveThreat: 75,
            reasoning: 'Long-standing presence with loyal clean-label and vegan customer base.',
          }),
          reasonForInclusion: 'Pioneer brand capturing health-conscious dark chocolate segment.',
          discoverySource: 'BrainWise Industry Knowledge Graph',
          evidenceIds: ['ev_mc_01'],
          confidence: 0.94,
        },
        {
          competitorId: 'comp_cadbury_silk_bournville',
          name: 'Cadbury Bournville / Silk (Mondelez)',
          canonicalName: 'cadburybournville',
          aliases: ['Mondelez India', 'Cadbury Silk', 'Cadbury Bournville'],
          website: 'https://mondelezinternational.com',
          headquarters: 'Mumbai, India (Mondelez India Foods)',
          geography: 'Mass National Distribution (Pan-India)',
          businessCategory: 'Mass FMCG Confectionery',
          productCategory: 'Premium-Tier Commercial Chocolate Bars',
          businessModel: 'Mass Modern Trade, Kirana Distribution, Festival Gifting Packs',
          targetAudience: 'Mainstream Indian households, celebratory gifters, mass consumers',
          marketPositioning: 'Dominant market incumbent with ubiquitous distribution and massive ad budgets.',
          classification: 'INDIRECT',
          relevanceScore: this.calculateRelevanceScore({
            context,
            productSimilarity: 65,
            customerOverlap: 75,
            geographicOverlap: 98,
            businessModelSimilarity: 50,
            pricingOverlap: 60,
            competitiveThreat: 85,
            reasoning: 'Huge distribution moat and festive gift pack dominance (Celebrations).',
          }),
          reasonForInclusion: 'Incumbent commercial giant defining consumer price ceilings and retail shelf space.',
          discoverySource: 'BrainWise Industry Knowledge Graph',
          evidenceIds: ['ev_cb_01'],
          confidence: 0.99,
        },
        {
          competitorId: 'comp_fabelle_itc',
          name: 'Fabelle Exquisite Chocolates (ITC)',
          canonicalName: 'fabelleitc',
          aliases: ['Fabelle Chocolates', 'ITC Fabelle'],
          website: 'https://fabelle.in',
          headquarters: 'Kolkata / Bangalore, India',
          geography: 'Luxury Hotels & Metro Modern Trade',
          businessCategory: 'Luxury Corporate & Hotel Confectionery',
          productCategory: 'Handcrafted Pralines, Gianduja & Luxury Boxed Hampers',
          businessModel: 'Luxury Hotel Boutiques + Corporate B2B Gifting + Online D2C',
          targetAudience: 'Corporate executives, luxury hotel guests, high-ticket wedding hosts',
          marketPositioning: 'ITC’s ultra-luxury chocolate brand competing with European imported chocolatiers.',
          classification: 'ASPIRATIONAL_BENCHMARK',
          relevanceScore: this.calculateRelevanceScore({
            context,
            productSimilarity: 82,
            customerOverlap: 78,
            geographicOverlap: 85,
            businessModelSimilarity: 72,
            pricingOverlap: 75,
            competitiveThreat: 80,
            reasoning: 'Dominates corporate festive luxury gifting and institutional B2B procurement.',
          }),
          reasonForInclusion: 'Benchmark for high-ticket corporate gifting and institutional packaging.',
          discoverySource: 'BrainWise Industry Knowledge Graph',
          evidenceIds: ['ev_fb_01'],
          confidence: 0.95,
        },
        {
          competitorId: 'comp_traditional_mithai',
          name: 'Premium Artisanal Mithai (Anand / Khoya / Bombay Sweet Shop)',
          canonicalName: 'bombaysweetshop',
          aliases: ['Bombay Sweet Shop', 'Khoya Mithai', 'Anand Sweets Royal'],
          website: 'https://bombaysweetshop.com',
          headquarters: 'Mumbai / Bangalore, India',
          geography: 'Metros & Domestic Gifting Delivery',
          businessCategory: 'Artisanal Indian Sweets & Gifting',
          productCategory: 'Contemporary Indian Mithai & Fusion Confectionery',
          businessModel: 'Festive Gifting + Boutique Storefronts + D2C',
          targetAudience: 'Traditional families celebrating Diwali/weddings with modern aesthetic sensibilities',
          marketPositioning: 'Reimagining classic Indian sweets with contemporary storytelling and luxury gifting.',
          classification: 'SUBSTITUTE',
          relevanceScore: this.calculateRelevanceScore({
            context,
            productSimilarity: 55,
            customerOverlap: 88,
            geographicOverlap: 92,
            businessModelSimilarity: 82,
            pricingOverlap: 85,
            competitiveThreat: 88,
            reasoning: 'Primary cultural substitute for festive gifting budgets during Diwali, Rakhi, and weddings.',
          }),
          reasonForInclusion: 'Key substitute competitor directly competing for seasonal festival gifting wallets.',
          discoverySource: 'BrainWise Industry Knowledge Graph',
          evidenceIds: ['ev_bss_01'],
          confidence: 0.93,
        },
        {
          competitorId: 'comp_manam_chocolate',
          name: 'Manam Chocolate',
          canonicalName: 'manamchocolate',
          aliases: ['Manam Craft Chocolate', 'Manam Hyderabad'],
          website: 'https://manamchocolate.com',
          headquarters: 'Hyderabad, Telangana, India',
          geography: 'India Metros & Online D2C',
          businessCategory: 'Luxury Confectionery & Experiential Retail',
          productCategory: 'Single-Estate West Godavari Cacao',
          businessModel: 'Experiential Flagship Karkhana + D2C Luxury Gifting',
          targetAudience: 'Affluent urban professionals, culinary tourists, and luxury wedding planners',
          marketPositioning: 'World-class experiential Indian craft chocolate showcasing West Godavari terroir.',
          classification: 'EMERGING',
          relevanceScore: this.calculateRelevanceScore({
            context,
            productSimilarity: 90,
            customerOverlap: 85,
            geographicOverlap: 88,
            businessModelSimilarity: 80,
            pricingOverlap: 90,
            competitiveThreat: 88,
            reasoning: 'Rapidly emerging luxury benchmark setting new aesthetic standards in Indian chocolate.',
          }),
          reasonForInclusion: 'High-growth emerging brand commanding premium pricing and luxury gifting volume.',
          discoverySource: 'BrainWise Industry Knowledge Graph',
          evidenceIds: ['ev_mn_01'],
          confidence: 0.96,
        },
        {
          competitorId: 'comp_smoor_chocolates',
          name: 'Smoor Chocolates',
          canonicalName: 'smoorchocolates',
          aliases: ['Smoor', 'Smoor Lounge'],
          website: 'https://smoor.in',
          headquarters: 'Bengaluru, Karnataka, India',
          geography: 'Bengaluru, Mumbai, Delhi & Pan-India Quick Commerce',
          businessCategory: 'Couverture Confectionery & Cafe Lounges',
          productCategory: 'Couverture Chocolate Bars, Truffles & Pastries',
          businessModel: 'Urban Lounges + Quick Commerce + Festive Corporate Gifting',
          targetAudience: 'Urban gift shoppers, cafe visitors, festival shoppers',
          marketPositioning: 'Accessible luxury couverture chocolate and bakery lounge chain.',
          classification: 'INDIRECT',
          relevanceScore: this.calculateRelevanceScore({
            context,
            productSimilarity: 78,
            customerOverlap: 82,
            geographicOverlap: 85,
            businessModelSimilarity: 75,
            pricingOverlap: 80,
            competitiveThreat: 78,
            reasoning: 'Widespread quick-commerce presence capturing impulse and gifting buyers.',
          }),
          reasonForInclusion: 'Major retail rival in Tier-1 cities with fast delivery availability.',
          discoverySource: 'BrainWise Industry Knowledge Graph',
          evidenceIds: ['ev_sm_01'],
          confidence: 0.92,
        },
      ];
    }

    // SPECIALTY COFFEE & BEVERAGE
    if (
      matchesKeywords(ideaLower, ['coffee', 'roastery', 'roaster', 'espresso', 'cold brew', 'cafe', 'barista', 'arabica', 'specialty coffee']) ||
      matchesKeywords(indLower, ['coffee', 'cafe', 'roastery']) ||
      (matchesKeywords(indLower, ['beverage', 'food & beverage']) && matchesKeywords(ideaLower, ['coffee', 'brew', 'espresso']))
    ) {
      return [
        {
          competitorId: 'comp_blue_tokai',
          name: 'Blue Tokai Coffee Roasters',
          canonicalName: 'bluetokaicoffee',
          aliases: ['Blue Tokai', 'Blue Tokai Roasters'],
          website: 'https://bluetokaicoffee.com',
          headquarters: 'Gurugram / New Delhi, India',
          geography: 'Pan-India 100+ Cafes & D2C',
          businessCategory: 'Specialty Coffee Roastery & Cafes',
          productCategory: 'Single-Estate Arabica Whole Bean & Grounds',
          businessModel: 'Company-Owned Cafes + D2C Subscriptions + B2B Office Roasts',
          targetAudience: 'Specialty coffee enthusiasts, home brewers, urban remote workers',
          marketPositioning: 'India’s largest specialty coffee roaster sourcing direct from single estates.',
          classification: 'DIRECT',
          relevanceScore: this.calculateRelevanceScore({
            context,
            productSimilarity: 92,
            customerOverlap: 90,
            geographicOverlap: 92,
            businessModelSimilarity: 88,
            pricingOverlap: 85,
            competitiveThreat: 90,
            reasoning: 'Primary market leader in Indian third-wave specialty coffee.',
          }),
          reasonForInclusion: 'Dominant benchmark defining farm-to-cup traceability and cafe experience.',
          discoverySource: 'BrainWise Industry Knowledge Graph',
          evidenceIds: ['ev_bt_01'],
          confidence: 0.98,
        },
        {
          competitorId: 'comp_third_wave',
          name: 'Third Wave Coffee',
          canonicalName: 'thirdwavecoffee',
          aliases: ['Third Wave', 'Third Wave Roasters'],
          website: 'https://thirdwavecoffeeroasters.com',
          headquarters: 'Bengaluru, Karnataka, India',
          geography: 'Major Metros Across India',
          businessCategory: 'Specialty Cafe Chain',
          productCategory: 'Cafe Beverages, Specialty Beans, Quick Bites',
          businessModel: 'VC-backed High-Street Cafe Footprint + Mobile Order App',
          targetAudience: 'Urban youth, remote workers, casual specialty coffee drinkers',
          marketPositioning: 'High-energy contemporary cafe spaces paired with specialty roast quality.',
          classification: 'DIRECT',
          relevanceScore: this.calculateRelevanceScore({
            context,
            productSimilarity: 85,
            customerOverlap: 88,
            geographicOverlap: 85,
            businessModelSimilarity: 80,
            pricingOverlap: 82,
            competitiveThreat: 85,
            reasoning: 'Fastest-growing cafe chain competing for daily coffee consumer spend.',
          }),
          reasonForInclusion: 'High-density physical competitor with strong youth brand recall.',
          discoverySource: 'BrainWise Industry Knowledge Graph',
          evidenceIds: ['ev_tw_01'],
          confidence: 0.95,
        },
        {
          competitorId: 'comp_sleepy_owl',
          name: 'Sleepy Owl Coffee',
          canonicalName: 'sleepyowl',
          aliases: ['Sleepy Owl', 'Sleepy Owl Cold Brew'],
          website: 'https://sleepyowl.co',
          headquarters: 'New Delhi, India',
          geography: 'Pan-India Quick Commerce & Modern Retail',
          businessCategory: 'Convenience Gourmet Coffee',
          productCategory: 'Cold Brew Brew-Packs, Hot Brew Dip Bags, RTD Cans',
          businessModel: 'FMCG Modern Trade + Quick Commerce D2C',
          targetAudience: 'Young working professionals seeking hassle-free real coffee',
          marketPositioning: 'Gourmet real coffee made effortless without brewing machines.',
          classification: 'INDIRECT',
          relevanceScore: this.calculateRelevanceScore({
            context,
            productSimilarity: 72,
            customerOverlap: 80,
            geographicOverlap: 90,
            businessModelSimilarity: 70,
            pricingOverlap: 78,
            competitiveThreat: 75,
            reasoning: 'Dominates convenient at-home coffee without requiring espresso equipment.',
          }),
          reasonForInclusion: 'Leading packaged coffee rival capturing everyday convenient home consumption.',
          discoverySource: 'BrainWise Industry Knowledge Graph',
          evidenceIds: ['ev_so_01'],
          confidence: 0.93,
        },
      ];
    }

    // SME ACCOUNTING, BILLING, TAX & FINTECH SOFTWARE
    const isAccountingOrFintech =
      matchesKeywords(ideaLower, ['accounting', 'billing', 'invoicing', 'bookkeeping', 'tax', 'gst', 'cleartax', 'tally', 'zoho books']) ||
      matchesKeywords(indLower, ['accounting', 'fintech', 'taxation', 'billing']) ||
      ((matchesKeywords(ideaLower, ['saas', 'software', 'erp', 'crm']) || matchesKeywords(indLower, ['software', 'saas', 'information technology'])) &&
        matchesKeywords(ideaLower, ['finance', 'financial', 'account', 'invoice', 'ledger', 'tax', 'bookkeeping', 'billing', 'gst']));

    if (isAccountingOrFintech) {
      return [
        {
          competitorId: 'comp_zoho_books',
          name: 'Zoho Books',
          canonicalName: 'zohobooks',
          aliases: ['Zoho Finance', 'Zoho Corporation'],
          website: 'https://zoho.com/books',
          headquarters: 'Chennai, Tamil Nadu, India',
          geography: 'Global & Strong India Domestic SME',
          businessCategory: 'Cloud Financial Accounting & GST Compliance',
          productCategory: 'Multi-Tier Cloud Accounting Platform',
          businessModel: 'Freemium + Tiered Monthly/Annual SaaS',
          targetAudience: 'Small and medium business owners, finance teams, and chartered accountants',
          marketPositioning: 'Comprehensive, affordable, GST-compliant cloud accounting operating system for SMEs.',
          classification: 'DIRECT',
          relevanceScore: this.calculateRelevanceScore({
            context,
            productSimilarity: 92,
            customerOverlap: 90,
            geographicOverlap: 95,
            businessModelSimilarity: 94,
            pricingOverlap: 85,
            competitiveThreat: 94,
            reasoning: 'The undisputed cloud accounting leader for modern Indian SMEs with integrated ecosystem.',
          }),
          reasonForInclusion: 'Primary market incumbent with high brand trust and deep feature breadth.',
          discoverySource: 'BrainWise Industry Knowledge Graph',
          evidenceIds: ['ev_zh_01'],
          confidence: 0.98,
        },
        {
          competitorId: 'comp_tally_prime',
          name: 'TallyPrime (Tally Solutions)',
          canonicalName: 'tallyprime',
          aliases: ['Tally Solutions', 'Tally.ERP 9'],
          website: 'https://tallysolutions.com',
          headquarters: 'Bangalore, Karnataka, India',
          geography: 'Pan-India & Middle East',
          businessCategory: 'Desktop Enterprise ERP & Accounting',
          productCategory: 'Desktop Accounting Software with Connected Cloud Services',
          businessModel: 'Perpetual License + Annual TSS Renewal Subscription',
          targetAudience: 'Traditional trading enterprises, distributors, manufacturers, and legacy CAs',
          marketPositioning: 'The gold-standard accounting software deeply ingrained in Indian business commerce.',
          classification: 'INDIRECT',
          relevanceScore: this.calculateRelevanceScore({
            context,
            productSimilarity: 80,
            customerOverlap: 88,
            geographicOverlap: 98,
            businessModelSimilarity: 60,
            pricingOverlap: 70,
            competitiveThreat: 90,
            reasoning: 'Unrivaled CA accountant network and keyboard-driven data entry habits.',
          }),
          reasonForInclusion: 'Incumbent giant holding 70%+ of Indian business accounting records.',
          discoverySource: 'BrainWise Industry Knowledge Graph',
          evidenceIds: ['ev_tl_01'],
          confidence: 0.99,
        },
        {
          competitorId: 'comp_vyapar_app',
          name: 'Vyapar',
          canonicalName: 'vyapar',
          aliases: ['Vyapar App', 'Simply Vyapar Apps'],
          website: 'https://vyaparapp.in',
          headquarters: 'Bangalore, Karnataka, India',
          geography: 'India Tier-1, Tier-2, Tier-3 SMEs',
          businessCategory: 'Mobile-First Billing & Inventory App',
          productCategory: 'Simplified Invoice & Stock Management for Micro-Enterprises',
          businessModel: 'Subscription SaaS (Desktop & Android Bundles)',
          targetAudience: 'Small retailers, traders, wholesalers, and micro-business proprietors',
          marketPositioning: 'Simple, fast, no-accounting-knowledge-required billing software for Indian retailers.',
          classification: 'DIRECT',
          relevanceScore: this.calculateRelevanceScore({
            context,
            productSimilarity: 85,
            customerOverlap: 82,
            geographicOverlap: 95,
            businessModelSimilarity: 90,
            pricingOverlap: 88,
            competitiveThreat: 84,
            reasoning: 'Fast onboarding and zero-training simplicity for shopkeepers and small traders.',
          }),
          reasonForInclusion: 'Key challenger winning on radical ease-of-use for non-accountants.',
          discoverySource: 'BrainWise Industry Knowledge Graph',
          evidenceIds: ['ev_vy_01'],
          confidence: 0.95,
        },
        {
          competitorId: 'comp_cleartax_india',
          name: 'ClearTax (Clear)',
          canonicalName: 'cleartax',
          aliases: ['Clear', 'ClearTax GST'],
          website: 'https://clear.in',
          headquarters: 'Bangalore, Karnataka, India',
          geography: 'India National Enterprise & SME',
          businessCategory: 'Tax Compliance & E-Invoicing Cloud',
          productCategory: 'Automated GST Filing, E-Way Bill & Vendor Reconciliation',
          businessModel: 'B2B Cloud SaaS + Consumption Credits',
          targetAudience: 'CFOs, tax managers, mid-to-large enterprises, and tax practitioners',
          marketPositioning: 'India’s largest automated tax compliance and e-invoicing infrastructure platform.',
          classification: 'INDIRECT',
          relevanceScore: this.calculateRelevanceScore({
            context,
            productSimilarity: 72,
            customerOverlap: 80,
            geographicOverlap: 92,
            businessModelSimilarity: 85,
            pricingOverlap: 75,
            competitiveThreat: 78,
            reasoning: 'Strong brand authority in GST reconciliation and e-invoicing pipelines.',
          }),
          reasonForInclusion: 'Specialized regulatory and compliance technology benchmark.',
          discoverySource: 'BrainWise Industry Knowledge Graph',
          evidenceIds: ['ev_ct_01'],
          confidence: 0.94,
        },
      ];
    }

    // RESTAURANT / CLOUD KITCHEN / FOOD DELIVERY
    if (
      matchesKeywords(ideaLower, ['cloud kitchen', 'restaurant', 'virtual kitchen', 'ghost kitchen', 'qsr', 'eatery', 'bistro', 'food delivery']) ||
      matchesKeywords(indLower, ['restaurant', 'food service', 'cloud kitchen', 'qsr'])
    ) {
      return [
        {
          competitorId: 'comp_rebel_foods',
          name: 'Rebel Foods (Faasos, Behrouz Biryani)',
          canonicalName: 'rebelfoods',
          aliases: ['Faasos', 'Behrouz Biryani', 'Ovenstory Pizza', 'Rebel Cloud Kitchens'],
          website: 'https://rebelfoods.com',
          headquarters: 'Mumbai / Pune, Maharashtra, India',
          geography: 'Pan-India & International Expansion',
          businessCategory: 'Internet Restaurant & Cloud Kitchen Conglomerate',
          productCategory: 'Multi-Brand Delivery-Only Virtual Kitchens',
          businessModel: 'Cloud Kitchen Operations + Aggregator Marketplace Distribution',
          targetAudience: 'Digital-first urban meal orderers, young professionals, late-night diners',
          marketPositioning: 'The world’s largest internet restaurant company operating dozens of virtual brands.',
          classification: 'DIRECT',
          relevanceScore: this.calculateRelevanceScore({
            context,
            productSimilarity: 90,
            customerOverlap: 92,
            geographicOverlap: 95,
            businessModelSimilarity: 94,
            pricingOverlap: 88,
            competitiveThreat: 92,
            reasoning: 'Unrivaled kitchen footprint, commissary supply chain, and aggregator rank dominance.',
          }),
          reasonForInclusion: 'Category creator and operational benchmark for multi-brand cloud kitchens.',
          discoverySource: 'BrainWise Industry Knowledge Graph',
          evidenceIds: ['ev_rf_01'],
          confidence: 0.98,
        },
        {
          competitorId: 'comp_box8_eatclub',
          name: 'Box8 / EatClub',
          canonicalName: 'eatclub',
          aliases: ['EatClub Brands', 'Box8 Desi Meals', 'Mojo Pizza'],
          website: 'https://eatclub.com',
          headquarters: 'Mumbai, Maharashtra, India',
          geography: 'Major Indian Metros (Mumbai, Bangalore, Pune, NCR)',
          businessCategory: 'Direct-Delivery Internet Food Network',
          productCategory: 'Meal Boxes, Desi Bowls, Curated Virtual Brands',
          businessModel: 'Direct App Delivery (EatClub Membership) + Swiggy/Zomato',
          targetAudience: 'Value-conscious daily lunch and dinner orderers wanting zero delivery fee memberships',
          marketPositioning: 'Affordable, reliable daily meal delivery powered by EatClub membership savings.',
          classification: 'DIRECT',
          relevanceScore: this.calculateRelevanceScore({
            context,
            productSimilarity: 88,
            customerOverlap: 88,
            geographicOverlap: 90,
            businessModelSimilarity: 90,
            pricingOverlap: 92,
            competitiveThreat: 85,
            reasoning: 'Successfully drives direct app ordering through EatClub loyalty memberships.',
          }),
          reasonForInclusion: 'Pioneer in bypassing aggregator commissions via direct membership.',
          discoverySource: 'BrainWise Industry Knowledge Graph',
          evidenceIds: ['ev_ec_01'],
          confidence: 0.95,
        },
      ];
    }

    // 6. GENERAL COMMERCE & FOUNDATIONAL BUSINESS BENCHMARKS
    // Only applied when inquiry explicitly pertains to general retail, e-commerce, or shop operations.
    // Deep tech, transit, unlisted or exploratory concepts return an empty array to prevent generic hallucination.
    if (
      matchesKeywords(ideaLower, ['ecommerce', 'e-commerce', 'commerce', 'retail store', 'online shop', 'pos system', 'point of sale']) ||
      matchesKeywords(indLower, ['ecommerce', 'e-commerce', 'retail', 'commerce'])
    ) {
      return [
        {
          competitorId: 'comp_shopify',
          name: 'Shopify',
        canonicalName: 'shopify',
        aliases: ['Shopify Inc', 'Shopify Commerce'],
        website: 'https://shopify.com',
        headquarters: 'Ottawa, Ontario, Canada (Global Operations)',
        geography: 'Global / Multi-market',
        businessCategory: 'Commerce & Retail Enablement Platform',
        productCategory: 'Online Storefronts, Point of Sale, Checkout Automation',
        businessModel: 'Subscription SaaS + Payment Processing Take-Rate',
        targetAudience: 'Entrepreneurs, independent founders, and expanding direct-to-consumer brands',
        marketPositioning: 'Leading turnkey infrastructure for starting and scaling independent commercial enterprises.',
        classification: 'INDIRECT',
        relevanceScore: this.calculateRelevanceScore({
          context,
          productSimilarity: 70,
          customerOverlap: 75,
          geographicOverlap: 80,
          businessModelSimilarity: 75,
          pricingOverlap: 70,
          competitiveThreat: 65,
          reasoning: 'Primary digital infrastructure alternative for early-stage business ventures.',
        }),
        reasonForInclusion: 'Global benchmark platform enabling independent commercial ventures to sell directly.',
        discoverySource: 'BrainWise Industry Knowledge Graph',
        evidenceIds: ['ev_benchmark_01'],
        confidence: 0.92,
      },
      {
        competitorId: 'comp_square',
        name: 'Square (Block)',
        canonicalName: 'square',
        aliases: ['Block Inc', 'Square POS'],
        website: 'https://squareup.com',
        headquarters: 'San Francisco, California, USA (Global Operations)',
        geography: 'Global / Multi-market',
        businessCategory: 'Omnichannel Point-of-Sale & Business Management Platform',
        productCategory: 'Hardware POS, Invoicing, Inventory Tracking, Payments',
        businessModel: 'Transaction Processing Fees + Software Subscriptions',
        targetAudience: 'Local service providers, physical merchants, and hybrid retail businesses',
        marketPositioning: 'Unified commerce and financial tools built for local and emerging businesses.',
        classification: 'INDIRECT',
        relevanceScore: this.calculateRelevanceScore({
          context,
          productSimilarity: 68,
          customerOverlap: 72,
          geographicOverlap: 78,
          businessModelSimilarity: 72,
          pricingOverlap: 68,
          competitiveThreat: 62,
          reasoning: 'Standard operational POS and merchant software for new retail and service businesses.',
        }),
        reasonForInclusion: 'Pervasive operational benchmark for small business commerce and transaction processing.',
        discoverySource: 'BrainWise Industry Knowledge Graph',
        evidenceIds: ['ev_benchmark_02'],
        confidence: 0.9,
      },
    ];
  }

    // PERSONAL CARE, SALON, SPA & WELLNESS
    if (
      matchesKeywords(ideaLower, ['salon', 'spa', 'hair', 'aesthetic', 'beauty', 'skincare', 'wellness']) ||
      matchesKeywords(indLower, ['personal care', 'wellness', 'beauty', 'salon'])
    ) {
      return [
        {
          competitorId: 'comp_bblunt_salon',
          name: 'BBLUNT Salon',
          canonicalName: 'bblunt',
          aliases: ['BBLUNT', 'BBLUNT India'],
          website: 'https://bblunt.com',
          headquarters: 'Mumbai, Maharashtra, India',
          geography: 'Mumbai & Pan-India Metros',
          businessCategory: 'Premium Hair Care & Aesthetic Salon Chain',
          productCategory: 'Hair Styling, Treatments, Spa & Professional Products',
          businessModel: 'Salon Services + Retail D2C Hair Products',
          targetAudience: 'Urban professionals and style-conscious individuals seeking premium salon services',
          marketPositioning: 'Bollywood-heritage premier hair and beauty destination known for trendsetting cuts and organic treatments.',
          classification: 'DIRECT',
          relevanceScore: this.calculateRelevanceScore({
            context,
            productSimilarity: 92,
            customerOverlap: 90,
            geographicOverlap: 95,
            businessModelSimilarity: 88,
            pricingOverlap: 85,
            competitiveThreat: 90,
            reasoning: 'Direct benchmark in premium urban salon and aesthetic hair care in Mumbai.',
          }),
          reasonForInclusion: 'Direct competitor in premium salon services with strong brand awareness.',
          discoverySource: 'BrainWise Industry Knowledge Graph',
          evidenceIds: ['ev_salon_01'],
          confidence: 0.94,
        },
        {
          competitorId: 'comp_enrich_salons',
          name: 'Enrich Salons',
          canonicalName: 'enrichsalons',
          aliases: ['Enrich', 'Enrich Beauty & Wellness'],
          website: 'https://enrichbeauty.com',
          headquarters: 'Mumbai, Maharashtra, India',
          geography: 'Mumbai & West India',
          businessCategory: 'Full-Service Beauty & Wellness Chain',
          productCategory: 'Hair, Skin, Spa, Nail & Grooming Services',
          businessModel: 'Service Appointments + Membership Loyalty Program',
          targetAudience: 'Middle to upper-middle class salongoers seeking consistent, hygienic aesthetic care',
          marketPositioning: 'Extensive full-service beauty salon chain with standardized service protocols and loyalty rewards.',
          classification: 'DIRECT',
          relevanceScore: this.calculateRelevanceScore({
            context,
            productSimilarity: 88,
            customerOverlap: 92,
            geographicOverlap: 95,
            businessModelSimilarity: 86,
            pricingOverlap: 88,
            competitiveThreat: 88,
            reasoning: 'Large-scale incumbent chain in Mumbai with established footprint.',
          }),
          reasonForInclusion: 'Major category peer in metropolitan personal care and aesthetic services.',
          discoverySource: 'BrainWise Industry Knowledge Graph',
          evidenceIds: ['ev_salon_02'],
          confidence: 0.92,
        },
      ];
    }

    // Unlisted, deep-tech or unique sectors return an empty list without inventing fake incumbents
    return [];
  }
}

export const competitorDiscoveryEngine = new CompetitorDiscoveryEngine();
