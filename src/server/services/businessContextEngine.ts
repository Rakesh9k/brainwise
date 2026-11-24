/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from '@google/genai';
import { serverConfig } from '../config/index';
import type {
  BusinessContextAnalysis,
  DynamicResearchPlanItem,
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

export class BusinessContextEngine {
  /**
   * Analyzes raw business input and extracts 12 core dimensions with dynamic research plan.
   * Operates autonomously from a single sentence.
   */
  public async analyzeBusinessContext(
    prompt: string
  ): Promise<BusinessContextAnalysis> {
    const trimmed = (prompt || '').trim();
    if (!trimmed) {
      throw new Error('Business idea prompt cannot be empty');
    }

    const client = getGeminiClient();
    if (client) {
      try {
        const response = await client.models.generateContent({
          model: serverConfig.geminiModel || 'gemini-2.5-flash',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `You are the Principal Business Architect for BrainWise.
Analyze the following user business idea and extract structured intelligence in JSON:
"${trimmed}"

Return ONLY valid JSON matching this exact structure:
{
  "industry": "Primary industry name",
  "subIndustry": "Specific sub-industry",
  "category": "Product/service category",
  "targetGeography": "Country or metro region mentioned, default to 'India & Global' if unspecified",
  "customerSegments": ["2-4 primary target buyer personas"],
  "intendedBusinessModel": ["1-3 plausible business models e.g. D2C, B2B SaaS, Marketplace, Subscription, Retail"],
  "pricePositioning": "One of: Budget, Mid-Market, Premium, Luxury, Ultra-Premium",
  "distributionModel": ["2-3 distribution channels e.g. E-Commerce, Modern Trade, Direct Sales"],
  "businessStage": "One of: Concept, Pre-Launch, Early Traction, Scaling, Established",
  "potentialMarketSegments": ["3-5 specific segment opportunities"],
  "relevantAdjacentIndustries": ["2-3 adjacent categories"]
}`,
                },
              ],
            },
          ],
        });

        const rawText = response.text || '';
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return this.constructContextFromParsed(trimmed, parsed);
        }
      } catch (err) {
        console.warn(
          'Gemini context extraction failed, falling back to deterministic extraction:',
          err
        );
      }
    }

    // Deterministic extraction fallback for offline / test / fallback operation
    return this.deterministicContextExtraction(trimmed);
  }

  private constructContextFromParsed(
    prompt: string,
    parsed: any
  ): BusinessContextAnalysis {
    const researchPlan = this.generateDynamicResearchPlan(
      parsed.industry || 'General Business',
      parsed.targetGeography || 'Global',
      parsed.intendedBusinessModel || ['Direct-to-Consumer']
    );

    return {
      businessIdea: prompt,
      industry: parsed.industry || 'Consumer Products',
      subIndustry: parsed.subIndustry || 'Specialty Goods',
      category: parsed.category || 'Lifestyle & Retail',
      targetGeography: parsed.targetGeography || 'India & Global',
      customerSegments: Array.isArray(parsed.customerSegments) && parsed.customerSegments.length
        ? parsed.customerSegments
        : ['Urban Consumers', 'Quality-Conscious Buyers'],
      intendedBusinessModel: Array.isArray(parsed.intendedBusinessModel) && parsed.intendedBusinessModel.length
        ? parsed.intendedBusinessModel
        : ['D2C / Direct-to-Consumer', 'Curated Retail'],
      pricePositioning: parsed.pricePositioning || 'Premium',
      distributionModel: Array.isArray(parsed.distributionModel) && parsed.distributionModel.length
        ? parsed.distributionModel
        : ['Direct Online Store', 'Premium Offline Boutiques'],
      businessStage: parsed.businessStage || 'Concept',
      potentialMarketSegments: Array.isArray(parsed.potentialMarketSegments) && parsed.potentialMarketSegments.length
        ? parsed.potentialMarketSegments
        : ['Festive & Corporate Gifting', 'Clean Label Artisanal Offerings'],
      relevantAdjacentIndustries: Array.isArray(parsed.relevantAdjacentIndustries) && parsed.relevantAdjacentIndustries.length
        ? parsed.relevantAdjacentIndustries
        : ['Specialty Coffee & Beverages', 'Gourmet Food Retail'],
      dynamicResearchPlan: researchPlan,
      analyzedAt: new Date().toISOString(),
    };
  }

  /**
   * High-accuracy deterministic extraction across major business models & industries
   */
  public deterministicContextExtraction(prompt: string): BusinessContextAnalysis {
    const lower = prompt.toLowerCase();

    // 1. Detect Geography
    let geo = 'India';
    if (lower.includes('uk') || lower.includes('london') || lower.includes('united kingdom')) {
      geo = 'United Kingdom';
    } else if (lower.includes('us') || lower.includes('usa') || lower.includes('united states') || lower.includes('america')) {
      geo = 'United States';
    } else if (lower.includes('global') || lower.includes('worldwide')) {
      geo = 'Global';
    } else if (lower.includes('bangalore') || lower.includes('bengaluru')) {
      geo = 'Bangalore, India';
    } else if (lower.includes('mumbai')) {
      geo = 'Mumbai, India';
    } else if (lower.includes('delhi')) {
      geo = 'Delhi NCR, India';
    } else if (lower.includes('hyderabad')) {
      geo = 'Hyderabad, India';
    }

    // 2. Detect Industry & Sub-industry
    let industry = 'Consumer Products & Retail';
    let subIndustry = 'Specialty Retail';
    let category = 'Direct-to-Consumer Goods';
    let customerSegments = ['Urban Millennial Consumers', 'Discerning Quality Seekers'];
    let models = ['D2C (Online Store)', 'Specialty Retail'];
    let pricePos: BusinessContextAnalysis['pricePositioning'] = 'Premium';
    let distribution = ['Direct Online Website', 'Boutique Retail / Modern Trade'];
    let potentialSegments = ['Artisanal Single-Origin', 'Gifting & Celebrations', 'Subscription Boxes'];
    let adjacent = ['Specialty Coffee & Tea', 'Gourmet Food & Beverage'];

    if (
      lower.includes('chocolate') ||
      lower.includes('cacao') ||
      lower.includes('confectionery') ||
      lower.includes('candy') ||
      lower.includes('sweet')
    ) {
      industry = 'Food & Beverage';
      subIndustry = 'Chocolate & Confectionery';
      category = 'Artisan & Premium Chocolate';
      customerSegments = [
        'Urban Gourmet Food Explorers',
        'Corporate & Festival Gift Buyers',
        'Health-Conscious Dark Chocolate Eaters',
        'Specialty Treat Connoisseurs',
      ];
      models = ['Direct-to-Consumer (D2C)', 'Corporate Bulk Gifting', 'Specialty Gourmet Retail', 'Subscription Tasting Flights'];
      pricePos = lower.includes('luxury') ? 'Luxury' : 'Premium';
      distribution = ['Temperature-Controlled D2C Logistics', 'Gourmet Supermarkets (Nature\'s Basket, Foodhall)', 'B2B Gifting Direct Invoicing'];
      potentialSegments = [
        'Single-Origin Indian Bean-to-Bar',
        'Diabetic-Friendly / Zero Refined Sugar',
        'Regional Botanical Flavor Pairings (Kerala Vanilla, Gondhoraj Lime)',
        'Custom Curated Corporate Gift Hampers',
      ];
      adjacent = ['Third-Wave Specialty Coffee', 'Organic Fine Foods', 'Luxury Floral & Confectionery Hampers'];
    } else if (
      lower.includes('salon') ||
      lower.includes('spa') ||
      lower.includes('grooming') ||
      lower.includes('beauty') ||
      lower.includes('clinic') ||
      lower.includes('wellness') ||
      lower.includes('hair')
    ) {
      industry = 'Personal Care & Wellness';
      subIndustry = 'Salon, Spa & Aesthetic Services';
      category = 'Boutique Personal Grooming';
      customerSegments = ['Urban Professionals', 'Bridal & Occasion Styling Clients', 'Self-Care Wellness Seekers'];
      models = ['Service Appointment Booking', 'Membership / Subscription Care Passes', 'Retail Product Cross-Selling'];
      pricePos = 'Premium';
      distribution = ['Physical Boutique Salon Location', 'Online Appointment Scheduling App', 'Concierge At-Home Visits'];
      potentialSegments = ['Organic & Clean Toxin-Free Hair Care', 'Express 30-Minute Executive Grooming', 'Curated Bridal Packages'];
      adjacent = ['D2C Botanical Haircare Products', 'Med-Spa Diagnostics'];
    } else if (
      /\bsaas\b/.test(lower) ||
      lower.includes('software') ||
      /\bai\b/.test(lower) ||
      lower.includes('accounting') ||
      /\bb2b\b/.test(lower) ||
      lower.includes('platform') ||
      /\bapp\b/.test(lower)
    ) {
      industry = 'Technology & Software';
      subIndustry = 'Enterprise & Productivity SaaS';
      category = lower.includes('accounting') || lower.includes('finance') ? 'Fintech & Accounting SaaS' : 'AI-Powered Business Software';
      customerSegments = [
        'SMB Founders & Operators',
        'Freelancers & Solo Practitioners',
        'Accounting & Bookkeeping Firms',
        'Finance Operations Teams',
      ];
      models = ['Subscription SaaS (Monthly/Annual Tiers)', 'Usage-Based Consumption', 'Seat-Based Licensing'];
      pricePos = 'Mid-Market';
      distribution = ['Self-Serve Product-Led Growth (PLG)', 'Inbound Organic Search & Content', 'Inside Sales for Mid-Market'];
      potentialSegments = [
        'Automated GST / Tax Reconciliation for Micro-SMEs',
        'Autonomous Invoice Matching with WhatsApp Ingestion',
        'Multi-Currency Compliance for Cross-Border Freelancers',
      ];
      adjacent = ['Banking as a Service (BaaS)', 'Payroll & HRTech', 'ERP & Inventory Management'];
    } else if (
      lower.includes('restaurant') ||
      lower.includes('cloud kitchen') ||
      lower.includes('cafe') ||
      lower.includes('coffee') ||
      lower.includes('bakery') ||
      lower.includes('food')
    ) {
      industry = 'Food & Beverage';
      subIndustry = lower.includes('cloud kitchen') ? 'Cloud Kitchen & Delivery QSR' : 'Dining & Hospitality';
      category = 'Quick Service & Casual Dining';
      customerSegments = ['Neighborhood Residents & Foodies', 'Office Lunch Delivery Crowd', 'Late-Night Digital Orderers'];
      models = ['Delivery-First QSR', 'Dine-In Experience', 'Catering & Pre-Orders'];
      pricePos = lower.includes('premium') ? 'Premium' : 'Mid-Market';
      distribution = ['Food Aggregators (Swiggy, Zomato)', 'Direct WhatsApp / Web Ordering', 'Storefront Takeaway'];
      potentialSegments = ['Healthy Macro-Calibrated Meal Bowls', 'Artisanal Sourdough & Baked Goods', 'Regional Comfort Classics'];
      adjacent = ['Beverage Bars', 'Packaged Condiments & Sauces'];
    }

    const researchPlan = this.generateDynamicResearchPlan(industry, geo, models);

    return {
      businessIdea: prompt,
      industry,
      subIndustry,
      category,
      targetGeography: geo,
      customerSegments,
      intendedBusinessModel: models,
      pricePositioning: pricePos,
      distributionModel: distribution,
      businessStage: 'Concept',
      potentialMarketSegments: potentialSegments,
      relevantAdjacentIndustries: adjacent,
      dynamicResearchPlan: researchPlan,
      analyzedAt: new Date().toISOString(),
    };
  }

  /**
   * Generates a tailored dynamic research plan with execution dependencies
   */
  public generateDynamicResearchPlan(
    industry: string,
    geography: string,
    _businessModels: string[]
  ): DynamicResearchPlanItem[] {
    return [
      {
        taskId: 'task_context_01',
        name: 'Context & Landscape Framing',
        objective: `Determine market scope for ${industry} in ${geography}`,
        category: 'context',
        dependencies: [],
        status: 'PENDING',
        executionModel: 'cheaper_classifier',
      },
      {
        taskId: 'task_disc_02',
        name: 'Competitor Multi-Tier Discovery',
        objective: 'Discover Direct, Indirect, Emerging, and Benchmark competitors',
        category: 'discovery',
        dependencies: ['task_context_01'],
        status: 'PENDING',
        executionModel: 'search_scraper',
      },
      {
        taskId: 'task_prod_03',
        name: 'Product & Catalog Normalization',
        objective: 'Extract offerings, packaging, variants, and feature matrices',
        category: 'product',
        dependencies: ['task_disc_02'],
        status: 'PENDING',
        executionModel: 'advanced_reasoner',
      },
      {
        taskId: 'task_price_04',
        name: 'Pricing Ladder & Unit Normalization',
        objective: 'Normalize pricing tiers, unit economics, and discount patterns',
        category: 'pricing',
        dependencies: ['task_prod_03'],
        status: 'PENDING',
        executionModel: 'advanced_reasoner',
      },
      {
        taskId: 'task_pos_05',
        name: 'Brand Positioning & Channel Intelligence',
        objective: 'Analyze messaging, USPs, tones of voice, and marketing footprints',
        category: 'positioning',
        dependencies: ['task_disc_02'],
        status: 'PENDING',
        executionModel: 'advanced_reasoner',
      },
      {
        taskId: 'task_voice_06',
        name: 'Customer Voice & Sentiment Pain Points',
        objective: 'Cluster public complaints, praises, and switching motivations',
        category: 'voice',
        dependencies: ['task_disc_02'],
        status: 'PENDING',
        executionModel: 'search_scraper',
      },
      {
        taskId: 'task_trends_07',
        name: 'Market Trends & Emerging Disruptors',
        objective: 'Assess velocity of signals and emerging competitive threats',
        category: 'trends',
        dependencies: ['task_disc_02'],
        status: 'PENDING',
        executionModel: 'cheaper_classifier',
      },
      {
        taskId: 'task_bench_08',
        name: 'Multi-Axis Benchmarking & 2D Matrix',
        objective: 'Compute mathematical Euclidean distances and explainable benchmark scores',
        category: 'benchmarking',
        dependencies: ['task_price_04', 'task_pos_05', 'task_voice_06'],
        status: 'PENDING',
        executionModel: 'advanced_reasoner',
      },
      {
        taskId: 'task_strat_09',
        name: 'Market Opportunities & Strategy Synthesis',
        objective: 'Identify whitespace wedges, actionable recommendations, and validation tests',
        category: 'strategy',
        dependencies: ['task_bench_08', 'task_trends_07'],
        status: 'PENDING',
        executionModel: 'advanced_reasoner',
      },
    ];
  }
}

export const businessContextEngine = new BusinessContextEngine();
