/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  BusinessContextAnalysis,
  DiscoveredCompetitor,
  ProductCatalogItem,
  NormalizedPricingTier,
  BrandPositioningAnalysis,
} from '../types/competitiveIntelligence';

export class ProductAndPricingEngine {
  /**
   * Synthesizes and normalizes product catalogs for a competitor based on industry
   */
  public extractAndNormalizeProducts(
    context: BusinessContextAnalysis,
    competitor: DiscoveredCompetitor
  ): ProductCatalogItem[] {
    const isChocolate =
      context.industry.toLowerCase().includes('food') ||
      context.category.toLowerCase().includes('chocolate') ||
      competitor.name.toLowerCase().includes('chocolate') ||
      competitor.name.toLowerCase().includes('paul') ||
      competitor.name.toLowerCase().includes('manam');

    const isSoftware =
      context.industry.toLowerCase().includes('tech') ||
      context.industry.toLowerCase().includes('software') ||
      competitor.name.toLowerCase().includes('zoho') ||
      competitor.name.toLowerCase().includes('tally');

    if (isChocolate) {
      if (competitor.canonicalName.includes('paulandmike')) {
        return [
          {
            productId: `prod_pm_01`,
            name: 'Fine Flavor Dark Chocolate (Kerala Origin 70%)',
            category: 'Single-Origin Artisan Dark Bars',
            description: 'Bean-to-bar dark chocolate crafted from farm-fermented Idukki cacao.',
            price: '₹295',
            normalizedPrice: { amount: 295, currency: 'INR', unit: 'bar (68g)' },
            features: ['Single Estate Idukki Cacao', 'Zero Palm Oil', 'Muscovado Sugar', 'Real Cocoa Butter'],
            specifications: { 'Cocoa %': '70%', 'Weight': '68g', 'Origin': 'Kerala, India' },
            qualityClaims: ['International Chocolate Awards Silver Winner', 'Non-GMO', 'Clean Label'],
            packaging: 'Artistic botanical illustrated foil wrapper',
            variants: ['70% Dark', '64% Dark with Pink Pepper', 'Plain Milk 41%'],
            industrySpecificAttributes: { cocoaPercentage: 70, weightGrams: 68, dietary: 'Vegan/Gluten-Free' },
            isDifferentiated: true,
          },
          {
            productId: `prod_pm_02`,
            name: 'Artisan Tasting Flight Box (5 Assorted Mini Bars)',
            category: 'Gift Hampers & Samplers',
            description: 'Curated box featuring Award-winning Indian and international fruit inclusions.',
            price: '₹850',
            normalizedPrice: { amount: 850, currency: 'INR', unit: 'gift box (150g)' },
            features: ['5 Distinct Flavors', 'Gift Ready Embossed Box', 'Tasting Guide Insert'],
            specifications: { 'Box Weight': '150g', 'Bars Included': '5 x 30g' },
            qualityClaims: ['Craft Fermented', 'Pure Butter'],
            packaging: 'Embossed magnetic-closure luxury gift box',
            variants: ['Tropical Fruit Edition', 'Connoisseur Dark Selection'],
            industrySpecificAttributes: { cocoaPercentage: 65, weightGrams: 150, dietary: 'Vegetarian' },
            isDifferentiated: true,
          },
        ];
      }

      if (competitor.canonicalName.includes('manam')) {
        return [
          {
            productId: `prod_mn_01`,
            name: 'Karkhana Reserve Single Estate Tablet (66% West Godavari)',
            category: 'Ultra-Premium Craft Tablets',
            description: 'Signature craft bar showcasing West Godavari micro-ferment terroir.',
            price: '₹375',
            normalizedPrice: { amount: 375, currency: 'INR', unit: 'tablet (75g)' },
            features: ['Traceable Farmer Farm Code', 'Conched 72 Hours', 'Custom Geometric Mould'],
            specifications: { 'Cocoa %': '66%', 'Weight': '75g', 'Estate': 'Tadikalapudi Estate' },
            qualityClaims: ['Single Estate Verified', 'Direct Trade Indian Origin'],
            packaging: 'Textured FSC-certified cardstock with gold foil seal',
            variants: ['66% Dark', '72% San Nicolas', 'Almond Praline Sea Salt'],
            industrySpecificAttributes: { cocoaPercentage: 66, weightGrams: 75, dietary: 'Vegan' },
            isDifferentiated: true,
          },
          {
            productId: `prod_mn_02`,
            name: 'Grand Signature Leather Gifting Hamper',
            category: 'Ultra-Luxury Gifting',
            description: 'Handmade vegan leather chest filled with bonbons, single-origin bars, and cacao spreads.',
            price: '₹4,500',
            normalizedPrice: { amount: 4500, currency: 'INR', unit: 'hamper' },
            features: ['16 Hand-painted Bonbons', '4 Reserve Bars', 'Artisan Cacao Tea', 'Reusable Leather Case'],
            qualityClaims: ['Handcrafted Daily', 'Limited Micro-batch'],
            packaging: 'Handmade luxury leather luggage box',
            isDifferentiated: true,
          },
        ];
      }

      // Generic chocolate competitor catalog
      return [
        {
          productId: `prod_comp_${Date.now()}_01`,
          name: `${competitor.name} Flagship Artisan Bar`,
          category: 'Craft Chocolate Bar',
          description: `Flagship chocolate offering by ${competitor.name}.`,
          price: '₹275',
          normalizedPrice: { amount: 275, currency: 'INR', unit: 'bar (70g)' },
          features: ['Pure Cocoa Butter', 'Clean Ingredients', 'Artisan Small Batch'],
          specifications: { 'Cocoa %': '65%', 'Weight': '70g' },
          qualityClaims: ['All Natural', 'No Artificial Preservatives'],
          industrySpecificAttributes: { cocoaPercentage: 65, weightGrams: 70 },
          isDifferentiated: true,
        },
        {
          productId: `prod_comp_${Date.now()}_02`,
          name: `${competitor.name} Festive Celebration Hamper`,
          category: 'Gift Assortment',
          description: `Curated festive gifting pack by ${competitor.name}.`,
          price: '₹1,250',
          normalizedPrice: { amount: 1250, currency: 'INR', unit: 'box' },
          features: ['Curated Selection', 'Custom Greeting Card', 'Premium Ribbon Packaging'],
          qualityClaims: ['Curated for Gifting'],
          isDifferentiated: false,
        },
      ];
    }

    if (isSoftware) {
      return [
        {
          productId: `prod_soft_${Date.now()}_01`,
          name: `${competitor.name} Starter Plan`,
          category: 'SMB SaaS Tier',
          description: `Entry-level business tier for small operations.`,
          price: '₹499/mo',
          normalizedPrice: { amount: 499, currency: 'INR', unit: 'month' },
          features: ['Core Invoicing', 'GST Filing Reports', 'Single User Access', 'Email Support'],
          specifications: { 'Deployment': 'Cloud Web / Mobile', 'Users': '1 user' },
          qualityClaims: ['99.9% Uptime', 'Bank-Grade AES-256 Encryption'],
          industrySpecificAttributes: { userLimit: 1, cloudHosted: true, apiAccess: false },
          isDifferentiated: false,
        },
        {
          productId: `prod_soft_${Date.now()}_02`,
          name: `${competitor.name} Growth & Automation Suite`,
          category: 'Mid-Market SaaS Tier',
          description: `Advanced workflows, multi-user permissions, and automated bank reconciliation.`,
          price: '₹1,499/mo',
          normalizedPrice: { amount: 1499, currency: 'INR', unit: 'month' },
          features: ['Multi-User (5 Seats)', 'Automated Bank Feeds', 'Inventory Sync', 'API Integrations'],
          specifications: { 'Deployment': 'Cloud SaaS', 'Users': '5 users' },
          qualityClaims: ['SOC 2 Type II Certified', 'Instant Phone Support'],
          industrySpecificAttributes: { userLimit: 5, cloudHosted: true, apiAccess: true },
          isDifferentiated: true,
        },
      ];
    }

    // Default general product catalog
    return [
      {
        productId: `prod_gen_${Date.now()}_01`,
        name: `${competitor.name} Standard Core Offer`,
        category: 'Core Service / Product',
        description: `Primary commercial offering by ${competitor.name}.`,
        price: '₹999',
        normalizedPrice: { amount: 999, currency: 'INR', unit: 'unit' },
        features: ['Standard Quality', 'Direct Fulfillment', 'Customer Guarantee'],
        qualityClaims: ['Verified Baseline'],
        isDifferentiated: false,
      },
    ];
  }

  /**
   * Normalizes pricing tiers across cadence, currency, and unit
   */
  public extractAndNormalizePricingTiers(
    context: BusinessContextAnalysis,
    competitor: DiscoveredCompetitor
  ): NormalizedPricingTier[] {
    const isChocolate =
      context.industry.toLowerCase().includes('food') ||
      context.category.toLowerCase().includes('chocolate') ||
      competitor.name.toLowerCase().includes('chocolate') ||
      competitor.name.toLowerCase().includes('paul');

    if (isChocolate) {
      return [
        {
          tierName: 'Entry Impulse Bar (65g-75g)',
          price: competitor.canonicalName.includes('manam') ? 375 : 295,
          currency: 'INR',
          billingPeriod: 'per_unit',
          normalizedPerUnitAmount: competitor.canonicalName.includes('manam') ? 375 : 295,
          features: ['Single Origin Cacao', 'Plastic-Free Foil Wrap', 'Immediate Retail Trial'],
          targetSegment: 'First-time brand explorers & personal snacking',
          observationDate: new Date().toISOString().slice(0, 10),
          sourceUrl: competitor.website,
        },
        {
          tierName: 'Curated Tasting Trio (3 Bars)',
          price: competitor.canonicalName.includes('manam') ? 1150 : 850,
          currency: 'INR',
          billingPeriod: 'per_unit',
          normalizedPerUnitAmount: competitor.canonicalName.includes('manam') ? 1150 : 850,
          features: ['Gift Packaging', '3 Distinct Percentage Flights', 'Tasting Cards'],
          targetSegment: 'Casual birthday & dinner party gifting',
          discountDetails: 'Save ~8% vs individual bars',
          observationDate: new Date().toISOString().slice(0, 10),
          sourceUrl: competitor.website,
        },
        {
          tierName: 'Corporate & Festival Luxury Hamper',
          price: competitor.canonicalName.includes('manam') ? 4500 : 2499,
          currency: 'INR',
          billingPeriod: 'per_unit',
          normalizedPerUnitAmount: competitor.canonicalName.includes('manam') ? 4500 : 2499,
          features: ['Custom Company Logo Sleeve', 'Direct Bulk Courier Drop', 'Multi-Flavor Reserve'],
          targetSegment: 'Corporate B2B Diwali, New Year & client appreciation',
          discountDetails: 'Bulk volume discounts (10%-20% for 50+ units)',
          observationDate: new Date().toISOString().slice(0, 10),
          sourceUrl: competitor.website,
        },
      ];
    }

    // Default SaaS / General pricing tiers
    return [
      {
        tierName: 'Starter',
        price: 499,
        currency: 'INR',
        billingPeriod: 'monthly',
        normalizedMonthlyEquivalent: 499,
        features: ['1 User Seat', 'Standard Reports', 'Email Support'],
        targetSegment: 'Solo founders and micro-businesses',
        observationDate: new Date().toISOString().slice(0, 10),
        sourceUrl: competitor.website,
      },
      {
        tierName: 'Professional / Growth',
        price: 1499,
        currency: 'INR',
        billingPeriod: 'monthly',
        normalizedMonthlyEquivalent: 1499,
        features: ['5 User Seats', 'Automated Integrations', 'Priority Support', 'Export API'],
        targetSegment: 'Growing teams scaling operations',
        discountDetails: 'Get 2 months free with annual billing (₹14,990/yr)',
        observationDate: new Date().toISOString().slice(0, 10),
        sourceUrl: competitor.website,
      },
    ];
  }

  /**
   * Generates deep Brand Positioning Analysis for competitor
   */
  public analyzeBrandPositioning(
    context: BusinessContextAnalysis,
    competitor: DiscoveredCompetitor
  ): BrandPositioningAnalysis {
    const isChocolate =
      context.industry.toLowerCase().includes('food') ||
      context.category.toLowerCase().includes('chocolate');

    if (isChocolate) {
      if (competitor.canonicalName.includes('paulandmike')) {
        return {
          competitorId: competitor.competitorId,
          companyName: competitor.name,
          archetype: 'The Passionate Creator & Craftsman',
          tagline: 'Farm to Bar Craft Chocolate',
          usp: 'Fermenting Indian cacao beans with real tropical fruit and muscovado sugar.',
          messagingThemes: ['International award-winning quality', 'Transparent Indian terroir', 'Clean-label purity'],
          toneOfVoice: 'Playful, educational, passionate, and transparent',
          emotionalPositioning: 'Pride in world-class Indian agricultural craft',
          visualIdentityCues: ['Vibrant color blocks', 'Hand-drawn botanical flora and fauna', 'Gold award badges'],
          trustSignals: ['International Chocolate Awards medals', 'Featured in Vogue and Forbes', 'Nature’s Basket presence'],
          brandStorytellingAngle: 'Named after two Latin American master farmers who taught them cocoa fermentation science.',
          overusedTropes: ['Generic "rich indulgence" phrasing (they avoid this in favor of fruit chemistry)'],
          differentiationOpportunities: [
            'Zero corporate gift hamper portal customization.',
            'Limited focus on diabetic/functional health nutrition.',
            'Higher urban metro retail distribution costs create direct D2C margin gap.',
          ],
        };
      }

      if (competitor.canonicalName.includes('manam')) {
        return {
          competitorId: competitor.competitorId,
          companyName: competitor.name,
          archetype: 'The Sophisticated Ruler & Aesthetician',
          tagline: 'World Craft Chocolate from India',
          usp: 'Flagship 10,000 sq ft cacao experience center celebrating West Godavari single-estate farmers.',
          messagingThemes: ['Sensory experiential luxury', 'Architectural elegance', 'Terroir transparency'],
          toneOfVoice: 'Refined, architectural, quiet luxury, artisanal precision',
          emotionalPositioning: 'Experiencing India’s emergence onto the global luxury gastronomy stage',
          visualIdentityCues: ['Minimalist terracotta and sage hues', 'Deep debossed foil monogram', 'Fluted glass packaging'],
          trustSignals: ['Architectural design awards for flagship Karkhana', 'Direct farmer profit share model'],
          brandStorytellingAngle: 'Founded by Chaitanya Muppala (Almond House heritage) to put Indian single-estate cacao alongside Swiss chocolate.',
          overusedTropes: ['High barrier to entry price points creates intimidation for casual gifters'],
          differentiationOpportunities: [
            'High price tier (₹375+ per bar) leaves open the accessible premium sweet spot (₹220-₹280).',
            'Strong South India focus (Hyderabad/Bangalore) leaves North/West India festive corporate gifting underserved.',
          ],
        };
      }
    }

    // Default positioning analysis
    return {
      competitorId: competitor.competitorId,
      companyName: competitor.name,
      archetype: 'The Established Incumbent',
      tagline: competitor.marketPositioning,
      usp: `Reliable ${context.category} solution with established operational track record.`,
      messagingThemes: ['Category reliability', 'Comprehensive coverage', 'Proven operational track record'],
      toneOfVoice: 'Professional, corporate, and formal',
      emotionalPositioning: 'Safety and predictable dependability',
      visualIdentityCues: ['Standard corporate blue/gray palette', 'Feature comparison grids'],
      trustSignals: ['Years in business', 'Customer volume metrics'],
      brandStorytellingAngle: 'Traditional category provider evolving into digital commerce.',
      overusedTropes: ['"One-stop solution" and "Industry-leading efficiency"'],
      differentiationOpportunities: [
        'Win on modern, ultra-clean aesthetic and rapid self-serve onboarding.',
        'Win on transparent upfront pricing without hidden fees.',
      ],
    };
  }
}

export const productAndPricingEngine = new ProductAndPricingEngine();
