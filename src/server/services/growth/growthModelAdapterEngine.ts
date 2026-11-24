/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { BusinessModelType } from './growthTypes';

export interface BusinessModelPlaybook {
  modelType: BusinessModelType;
  primaryNorthStarMetric: string;
  coreMetrics: Array<{
    name: string;
    description: string;
    targetBenchmark: string;
  }>;
  recommendedAcquisitionChannels: string[];
  prohibitedPractices: string[];
  keyGrowthTactics: string[];
}

export class GrowthModelAdapterEngine {
  private readonly PLAYBOOKS: Record<BusinessModelType, BusinessModelPlaybook> = {
    SAAS: {
      modelType: 'SAAS',
      primaryNorthStarMetric: 'Monthly Recurring Revenue (MRR) & Net Revenue Retention',
      coreMetrics: [
        { name: 'Trial-to-Paid Conversion', description: 'Percentage of free trial or freemium accounts converting to paid tier', targetBenchmark: '3.5% - 6.0%' },
        { name: 'Customer Acquisition Cost (CAC)', description: 'Total sales and marketing cost to acquire one paying customer', targetBenchmark: '< 33% of first-year LTV' },
        { name: 'Gross Monthly Churn', description: 'Percentage of MRR lost each month due to cancellations', targetBenchmark: '< 2.0% monthly' },
        { name: 'Time to Value (TTV)', description: 'Minutes/hours for a new user to achieve their first successful core action', targetBenchmark: '< 15 minutes' },
      ],
      recommendedAcquisitionChannels: [
        'Founder Outbound Contrast Wedge on LinkedIn',
        'Multi-slide educational carousels tearing down industry problems',
        'SEO-driven transparent pricing comparison teardowns',
      ],
      prohibitedPractices: [
        'Booking discovery calls for self-serve pricing tiers under $100/mo',
        'Scaling paid Google/Meta search ads before validating outbound conversion',
      ],
      keyGrowthTactics: [
        'Embed calculation proof badges directly on pricing cards',
        'Two-sided referral loop: Give 50 credits, get 50 credits on first validation',
        'Day-14 automated satisfaction check with one-click feedback',
      ],
    },
    D2C: {
      modelType: 'D2C',
      primaryNorthStarMetric: 'Net Contribution Margin & 60-Day Repeat Purchase Rate',
      coreMetrics: [
        { name: 'Average Order Value (AOV)', description: 'Average rupee spend per completed cart checkout', targetBenchmark: '₹800 - ₹2,500' },
        { name: '60-Day Repeat Purchase Rate', description: 'Percentage of customers ordering again within 60 days', targetBenchmark: '>= 28%' },
        { name: 'Gross Margin After Shipping', description: 'Revenue minus COGS, packaging, and shipping charges', targetBenchmark: '>= 65%' },
        { name: 'Return on Ad Spend (ROAS)', description: 'Tracked ad revenue divided by direct campaign spend', targetBenchmark: '>= 3.2x blended' },
      ],
      recommendedAcquisitionChannels: [
        'Corporate festive gifting hampers & B2B volume outreach',
        'High-DPI static Instagram carousels highlighting ingredient purity',
        'Post-checkout referral discounts and tasting flight introductions',
      ],
      prohibitedPractices: [
        'Video ads with high production costs and zero attribution tracking',
        'Heavy discounting that permanently degrades premium brand perception',
      ],
      keyGrowthTactics: [
        'Offer 3-bar or trio tasting flights to maximize introduction AOV',
        'Pre-order landing page tests for new seasonal flavor releases',
        'Thermal packaging transit guarantees to eliminate summer transit breakage',
      ],
    },
    RESTAURANT_FOOD: {
      modelType: 'RESTAURANT_FOOD',
      primaryNorthStarMetric: 'Weekly Covers / Order Volume & Repeat Dining Frequency',
      coreMetrics: [
        { name: 'Average Order / Ticket Value', description: 'Average bill per table or delivery basket', targetBenchmark: '₹450 - ₹1,200' },
        { name: 'Weekday Seat Utilization', description: 'Lunch and dinner occupancy Tuesday through Thursday', targetBenchmark: '>= 60%' },
        { name: 'Prime Cost (Food + Labor)', description: 'Cost of ingredients plus kitchen staff labor as % of revenue', targetBenchmark: '< 55%' },
        { name: '30-Day Customer Return Rate', description: 'Percentage of diners visiting at least once more in 30 days', targetBenchmark: '>= 35%' },
      ],
      recommendedAcquisitionChannels: [
        'Google Business Profile local map optimization & review acquisition',
        'Targeted corporate lunch catering packages for nearby office hubs',
        'Weekday afternoon tasting specials and loyalty cards',
      ],
      prohibitedPractices: [
        'Spending budget on nationwide brand campaigns with zero local radius targeting',
        'Relying 100% on delivery aggregator platforms with 28% commission cuts',
      ],
      keyGrowthTactics: [
        'Direct WhatsApp ordering link for repeat nearby customers with 10% off',
        'Corporate catering menu distributed to HR heads within 3km radius',
        'Chef special tasting menu nights for slow Tuesdays',
      ],
    },
    SALON_SERVICES: {
      modelType: 'SALON_SERVICES',
      primaryNorthStarMetric: 'Chair / Room Utilization Rate & 6-Week Rebooking Rate',
      coreMetrics: [
        { name: 'Average Ticket Value', description: 'Average spend including add-on treatments and retail products', targetBenchmark: '₹1,500 - ₹4,500' },
        { name: 'Chair Utilization Rate', description: 'Hours booked divided by total available stylist hours', targetBenchmark: '>= 75%' },
        { name: '6-Week Rebooking Rate', description: 'Percentage of clients scheduling next appointment at checkout', targetBenchmark: '>= 55%' },
      ],
      recommendedAcquisitionChannels: [
        'Local Instagram portfolio before/after transformation carousels',
        'Bridal & festive packages pitched to local wedding planners',
        'Client referral program: Refer a friend, both receive 20% off styling',
      ],
      prohibitedPractices: [
        'Discount vouchers on coupon aggregators that attract one-time bargain seekers',
      ],
      keyGrowthTactics: [
        'Instant rebooking incentive at checkout (e.g. complimentary scalp massage on next visit)',
        'Retail product recommendation slip written by stylist after treatment',
      ],
    },
    MARKETPLACE: {
      modelType: 'MARKETPLACE',
      primaryNorthStarMetric: 'Liquidity / Match Rate & Gross Merchandise Value (GMV)',
      coreMetrics: [
        { name: 'Match Rate / Liquidity', description: 'Percentage of listings or buyer inquiries fulfilled successfully', targetBenchmark: '>= 70%' },
        { name: 'Take Rate', description: 'Platform fee percentage captured from each transaction', targetBenchmark: '12% - 20%' },
        { name: 'Buyer / Seller Retention', description: 'Repeat cohort transaction activity at 90 days', targetBenchmark: '>= 40%' },
      ],
      recommendedAcquisitionChannels: [
        'Supply-first acquisition: Direct onboarding of top 50 premier providers',
        'Exclusive launch inventory incentives for initial buyers',
      ],
      prohibitedPractices: [
        'Advertising heavily to buyers before securing liquid, verified supply',
      ],
      keyGrowthTactics: [
        'Subsidize supply onboarding to reach critical liquidity density in 1 metro',
        'Guaranteed fulfillment escrow to eliminate counter-party risk',
      ],
    },
    PROFESSIONAL_SERVICES: {
      modelType: 'PROFESSIONAL_SERVICES',
      primaryNorthStarMetric: 'Qualified Discovery Conversion & Effective Hourly Realization',
      coreMetrics: [
        { name: 'Discovery to Proposal Rate', description: 'Percentage of qualified leads moving to formal project proposal', targetBenchmark: '>= 45%' },
        { name: 'Average Engagement Value', description: 'Total revenue per client project or monthly retainer', targetBenchmark: '₹50,000 - ₹3,00,000' },
        { name: 'Billable Utilization Rate', description: 'Percentage of team hours spent on revenue-generating deliverables', targetBenchmark: '>= 70%' },
      ],
      recommendedAcquisitionChannels: [
        'High-authority teardowns and industry whitepapers on LinkedIn',
        'Speaking on specialized industry panels and guest newsletter columns',
      ],
      prohibitedPractices: [
        'Broad Facebook/Instagram consumer ad campaigns',
      ],
      keyGrowthTactics: [
        'Standardize 3 tiered advisory packages with upfront scope limits',
        'Send quarterly client value review decks to lock annual retainer renewals',
      ],
    },
    ECOMMERCE: {
      modelType: 'ECOMMERCE',
      primaryNorthStarMetric: 'Cart Conversion Rate & Net Customer Contribution',
      coreMetrics: [
        { name: 'Checkout Completion Rate', description: 'Percentage of initiated checkouts completed', targetBenchmark: '>= 60%' },
        { name: 'Blended Ad ROAS', description: 'Gross revenue divided by total paid channel advertising spend', targetBenchmark: '>= 3.5x' },
        { name: 'Return Rate', description: 'Percentage of shipped products returned or refunded', targetBenchmark: '< 8%' },
      ],
      recommendedAcquisitionChannels: [
        'Google Shopping / Performance Max with negative keyword hygiene',
        'Email abandonment automation with instant UPI checkout links',
      ],
      prohibitedPractices: [
        'Generic lifestyle video ads with unmeasurable purchase attribution',
      ],
      keyGrowthTactics: [
        'One-click WhatsApp checkout for mobile shoppers',
        'Bundle suggestions above the free-shipping threshold to lift AOV',
      ],
    },
    MANUFACTURING_B2B: {
      modelType: 'MANUFACTURING_B2B',
      primaryNorthStarMetric: 'Annual Contract Value (ACV) & Factory Floor Utilization',
      coreMetrics: [
        { name: 'Quote-to-Order Conversion', description: 'Percentage of RFQ proposals converting to PO contracts', targetBenchmark: '>= 30%' },
        { name: 'Repeat Order Frequency', description: 'Annual orders per contracted commercial distributor', targetBenchmark: '>= 4 orders/yr' },
      ],
      recommendedAcquisitionChannels: [
        'Direct industrial procurement head outreach',
        'Trade expo presence and ISO/FSSAI compliance certifications',
      ],
      prohibitedPractices: [
        'B2C social media influencer campaigns',
      ],
      keyGrowthTactics: [
        'Free sample batch kits sent to pre-vetted procurement officers',
      ],
    },
    PRE_LAUNCH_STARTUP: {
      modelType: 'PRE_LAUNCH_STARTUP',
      primaryNorthStarMetric: 'Willingness-to-Pay Confirmation & Problem Resonance Rate',
      coreMetrics: [
        { name: 'Problem Resonance Rate', description: 'Percentage of target ICP confirming core problem during discovery calls', targetBenchmark: '>= 60%' },
        { name: 'Pre-Order / LOI Commitments', description: 'Number of signed letters of intent or deposit checkouts', targetBenchmark: '>= 10 accounts' },
      ],
      recommendedAcquisitionChannels: [
        'Direct founder-led 1-on-1 customer discovery interviews',
        'Simple pre-order landing page with transparent pricing tiers',
      ],
      prohibitedPractices: [
        'Spending capital on paid marketing before validating problem-solution fit',
        'Hiring an external marketing agency to "do growth" before founder has closed 5 customers',
      ],
      keyGrowthTactics: [
        'Conduct 20 discovery interviews with target buyers',
        'Deploy 50 personalized cold outreach messages testing problem resonance',
      ],
    },
  };

  /**
   * Resolves business model from industry or string description
   */
  public resolveModelType(industryOrDesc: string): BusinessModelType {
    const text = (industryOrDesc || '').toLowerCase();
    if (text.includes('saas') || text.includes('software') || text.includes('tech platform')) {
      return 'SAAS';
    }
    if (text.includes('chocolate') || text.includes('d2c') || text.includes('snack') || text.includes('beverage') || text.includes('apparel')) {
      return 'D2C';
    }
    if (text.includes('restaurant') || text.includes('cafe') || text.includes('food') || text.includes('bakery') || text.includes('cloud kitchen')) {
      return 'RESTAURANT_FOOD';
    }
    if (text.includes('salon') || text.includes('spa') || text.includes('clinic') || text.includes('beauty') || text.includes('hair') || text.includes('styling') || text.includes('wellness')) {
      return 'SALON_SERVICES';
    }
    if (text.includes('marketplace') || text.includes('aggregator')) {
      return 'MARKETPLACE';
    }
    if (text.includes('consulting') || text.includes('agency') || text.includes('accounting') || text.includes('legal')) {
      return 'PROFESSIONAL_SERVICES';
    }
    if (text.includes('manufacturing') || text.includes('factory') || text.includes('industrial') || text.includes('wholesale')) {
      return 'MANUFACTURING_B2B';
    }
    return 'PRE_LAUNCH_STARTUP';
  }

  /**
   * Returns tailored playbook
   */
  public getPlaybook(modelType: BusinessModelType): BusinessModelPlaybook {
    return this.PLAYBOOKS[modelType] || this.PLAYBOOKS.PRE_LAUNCH_STARTUP;
  }
}

export const growthModelAdapterEngine = new GrowthModelAdapterEngine();
