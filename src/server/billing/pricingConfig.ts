/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { CommercialPlanDefinition, CreditPackDefinition, Currency } from './types';

export const COMMERCIAL_PLANS: Record<string, CommercialPlanDefinition> = {
  free: {
    planId: 'free',
    name: 'Free Starter',
    tagline: 'Explore the Business Brain with foundational AI intelligence',
    description: 'Perfect for curious entrepreneurs evaluating BrainWise for a new venture.',
    isPopular: false,
    displayOrder: 1,
    pricing: {
      INR: {
        monthly: 0,
        annualMonthly: 0,
        annualTotal: 0,
        currency: 'INR',
        savingsPct: 0,
      },
      USD: {
        monthly: 0,
        annualMonthly: 0,
        annualTotal: 0,
        currency: 'USD',
        savingsPct: 0,
      },
    },
    limits: {
      workspacesMax: 1,
      teamSeatsMax: 1,
      monthlyCredits: 0, // 150 one-time welcome credits
      competitorsMax: 2,
      brandAssetsMonthlyMax: 10,
      activeAutomationsMax: 0,
      ideaDossiersMonthlyMax: 3,
      integrationsMax: 1,
      scheduledReports: false,
      priorityAiModels: false,
      exportPdfWhiteLabel: false,
    },
    featuresList: [
      '150 one-time welcome credits',
      '1 Business Brain workspace',
      '3 Idea Intelligence dossiers / mo',
      '2 tracked competitors in Market Watch',
      'Foundational SVG brand collateral',
      '1 external integration',
    ],
    departmentAccess: [
      'BUSINESS_BRAIN',
      'IDEA_INTELLIGENCE',
      'COMPETITIVE_INTELLIGENCE',
      'BRAND_STUDIO',
    ],
    isActive: true,
  },

  starter: {
    planId: 'starter',
    name: 'Starter',
    tagline: 'For solo founders and early validation with active market tracking',
    description:
      'Essential business intelligence, competitor alerts, and monthly credit allowance.',
    isPopular: false,
    displayOrder: 2,
    pricing: {
      INR: {
        monthly: 2763,
        annualMonthly: 2210,
        annualTotal: 26520, // 2,210 * 12
        currency: 'INR',
        savingsPct: 20,
      },
      USD: {
        monthly: 35,
        annualMonthly: 28,
        annualTotal: 336,
        currency: 'USD',
        savingsPct: 20,
      },
    },
    limits: {
      workspacesMax: 1,
      teamSeatsMax: 2,
      monthlyCredits: 800,
      competitorsMax: 5,
      brandAssetsMonthlyMax: 50,
      activeAutomationsMax: 2,
      ideaDossiersMonthlyMax: 10,
      integrationsMax: 3,
      scheduledReports: true,
      priorityAiModels: false,
      exportPdfWhiteLabel: false,
    },
    featuresList: [
      '800 credits refreshed monthly',
      '1 Business Brain workspace (up to 2 seats)',
      '10 Idea Intelligence dossiers / mo',
      '5 tracked competitors with daily diff alerts',
      '50 Brand Studio assets & SVG collateral',
      '3 active external platform integrations',
      'Weekly automated executive briefing',
    ],
    departmentAccess: [
      'BUSINESS_BRAIN',
      'IDEA_INTELLIGENCE',
      'COMPETITIVE_INTELLIGENCE',
      'BRAND_STUDIO',
      'GROWTH_DIRECTOR',
      'MARKET_WATCH',
    ],
    isActive: true,
  },

  professional: {
    planId: 'professional',
    name: 'Professional',
    tagline: 'The complete AI business intelligence operating system for scaling brands',
    description:
      'Our most popular hero tier: full intelligence suite, priority models, and multi-workspace support.',
    isPopular: true,
    displayOrder: 3,
    pricing: {
      INR: {
        monthly: 6999,
        annualMonthly: 5599,
        annualTotal: 67188, // 5,599 * 12
        currency: 'INR',
        savingsPct: 20,
      },
      USD: {
        monthly: 89,
        annualMonthly: 71,
        annualTotal: 852,
        currency: 'USD',
        savingsPct: 20,
      },
    },
    limits: {
      workspacesMax: 3,
      teamSeatsMax: 5,
      monthlyCredits: 3000,
      competitorsMax: 20,
      brandAssetsMonthlyMax: 250,
      activeAutomationsMax: 10,
      ideaDossiersMonthlyMax: 'unlimited',
      integrationsMax: 'all',
      scheduledReports: true,
      priorityAiModels: true,
      exportPdfWhiteLabel: true,
    },
    featuresList: [
      '3,000 credits refreshed monthly',
      '3 Business Brain workspaces (5 team seats)',
      'Unlimited Idea & Market Intelligence dossiers',
      '20 tracked competitors with automated teardowns',
      '250 Brand Studio assets & multi-slide carousels',
      'All 9 external integrations & 10 automations',
      'Priority Gemini 2.5 Flash / Pro reasoning',
      'White-label executive PDF exports & daily briefs',
    ],
    departmentAccess: [
      'BUSINESS_BRAIN',
      'IDEA_INTELLIGENCE',
      'COMPETITIVE_INTELLIGENCE',
      'BRAND_STUDIO',
      'GROWTH_DIRECTOR',
      'MARKET_WATCH',
      'EXECUTIVE_MEMO',
      'INTEGRATIONS_HUB',
      'AUTOMATION_STUDIO',
    ],
    isActive: true,
  },

  business: {
    planId: 'business',
    name: 'Business Enterprise',
    tagline: 'High-volume intelligence, unlimited automations & multi-brand portfolio',
    description: 'Designed for agencies, multi-brand holdings, and high-velocity product teams.',
    isPopular: false,
    displayOrder: 4,
    pricing: {
      INR: {
        monthly: 16499,
        annualMonthly: 13199,
        annualTotal: 158388, // 13,199 * 12
        currency: 'INR',
        savingsPct: 20,
      },
      USD: {
        monthly: 209,
        annualMonthly: 167,
        annualTotal: 2004,
        currency: 'USD',
        savingsPct: 20,
      },
    },
    limits: {
      workspacesMax: 10,
      teamSeatsMax: 20,
      monthlyCredits: 10000,
      competitorsMax: 100,
      brandAssetsMonthlyMax: 1000,
      activeAutomationsMax: 50,
      ideaDossiersMonthlyMax: 'unlimited',
      integrationsMax: 'all',
      scheduledReports: true,
      priorityAiModels: true,
      exportPdfWhiteLabel: true,
    },
    featuresList: [
      '10,000 credits refreshed monthly',
      '10 Business Brain workspaces (20 team seats)',
      'Unlimited Idea, Market & Competitor dossiers',
      '100 actively tracked competitors',
      '1,000 Brand Studio assets & marketing collateral',
      'Unlimited automations & custom webhook triggers',
      'Dedicated priority throughput & VIP model allocation',
      'Full white-label branding, custom domains & audit logs',
    ],
    departmentAccess: [
      'BUSINESS_BRAIN',
      'IDEA_INTELLIGENCE',
      'COMPETITIVE_INTELLIGENCE',
      'BRAND_STUDIO',
      'GROWTH_DIRECTOR',
      'MARKET_WATCH',
      'EXECUTIVE_MEMO',
      'INTEGRATIONS_HUB',
      'AUTOMATION_STUDIO',
      'TEAM_GOVERNANCE',
    ],
    isActive: true,
  },
};

export const CREDIT_PACKS: Record<string, CreditPackDefinition> = {
  pack_quick_500: {
    packId: 'pack_quick_500',
    name: 'Quick Boost',
    tagline: 'Top up credits for immediate validation sprints',
    creditQuantity: 500,
    price: 1499,
    currency: 'INR',
    isPopular: false,
    displayOrder: 1,
    isActive: true,
  },
  pack_growth_1500: {
    packId: 'pack_growth_1500',
    name: 'Growth Pack',
    tagline: 'Our most popular top-up for active campaign creation',
    creditQuantity: 1500,
    price: 3999,
    currency: 'INR',
    isPopular: true,
    displayOrder: 2,
    isActive: true,
  },
  pack_scale_5000: {
    packId: 'pack_scale_5000',
    name: 'Scale Pack',
    tagline: 'Deep competitor research and extensive brand collateral',
    creditQuantity: 5000,
    price: 10999,
    currency: 'INR',
    isPopular: false,
    displayOrder: 3,
    isActive: true,
  },
  pack_enterprise_15000: {
    packId: 'pack_enterprise_15000',
    name: 'Enterprise Pack',
    tagline: 'High-volume credits for multi-brand agencies and studios',
    creditQuantity: 15000,
    price: 27999,
    currency: 'INR',
    isPopular: false,
    displayOrder: 4,
    isActive: true,
  },
};

export function getPlan(planId: string): CommercialPlanDefinition {
  const plan = COMMERCIAL_PLANS[planId.toLowerCase()];
  if (!plan) {
    throw new Error(`Plan not found: ${planId}`);
  }
  return plan;
}

export function getAllPlans(): CommercialPlanDefinition[] {
  return Object.values(COMMERCIAL_PLANS)
    .filter((p) => p.isActive)
    .sort((a, b) => a.displayOrder - b.displayOrder);
}

export function getCreditPack(packId: string): CreditPackDefinition {
  const pack = CREDIT_PACKS[packId];
  if (!pack) {
    throw new Error(`Credit pack not found: ${packId}`);
  }
  return pack;
}

export function getAllCreditPacks(): CreditPackDefinition[] {
  return Object.values(CREDIT_PACKS)
    .filter((p) => p.isActive)
    .sort((a, b) => a.displayOrder - b.displayOrder);
}

export function calculatePlanAmount(
  planId: string,
  billingCycle: 'monthly' | 'annual',
  currency: Currency = 'INR'
): { unitAmount: number; totalAmount: number; currency: Currency } {
  const plan = getPlan(planId);
  const pricing = plan.pricing[currency];
  if (!pricing) {
    throw new Error(`Pricing not available for currency: ${currency}`);
  }

  if (billingCycle === 'annual') {
    return {
      unitAmount: pricing.annualMonthly,
      totalAmount: pricing.annualTotal,
      currency,
    };
  }

  return {
    unitAmount: pricing.monthly,
    totalAmount: pricing.monthly,
    currency,
  };
}

export const GST_RATE = 0.18; // 18% GST for India
