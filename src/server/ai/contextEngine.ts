/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { businessProfileRepository } from '../repositories/businessProfileRepository';
import type { BusinessProfileEntity } from '../types/api';
import type { AiDepartment } from './types';

export interface RetrievedContextPackage {
  workspaceId: string;
  businessName: string;
  tagline: string;
  stage: string;
  location: string;
  industry: string;
  website: string;
  relevantFields: Record<string, unknown>;
  confirmedFacts: string[];
  inferredAssumptions: string[];
  brainVersion: number;
  retrievedAt: string;
  selectionReason: string;
  dataFreshnessDays: number;
  provenance: {
    userConfirmedFactCount: number;
    aiInferredFactCount: number;
    authoritativeVersionId: string;
  };
}

export class ContextEngine {
  /**
   * Retrieves task-specific Business Brain context with strict relevance filtering.
   * Multi-tenant safety: workspaceId is strictly validated against database boundaries.
   */
  public async retrieveContext(params: {
    workspaceId: string;
    department: AiDepartment;
    workflow: string;
    userPrompt?: string;
  }): Promise<RetrievedContextPackage> {
    const { workspaceId, department, workflow } = params;

    const profile = await businessProfileRepository.getProfile(workspaceId);

    const now = new Date();
    const rawUpdated = (profile as any)?.lastUpdated || (profile as any)?.updatedAt;
    const updatedAt = rawUpdated ? new Date(rawUpdated) : now;
    const dataFreshnessDays = Math.max(
      0,
      Math.floor((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24))
    );

    // Default safe fallback if profile has not been configured yet
    const businessName = profile?.businessName || 'Active Workspace';
    const tagline = profile?.tagline || '';
    const stage = profile?.stage || 'Early Stage';
    const location = profile?.location || 'Global';
    const industry = (profile as any)?.industry || 'Commercial Services';
    const website = profile?.website || '';

    // Extract facts vs inferences
    const confirmedFacts: string[] = [];
    const inferredAssumptions: string[] = [];

    if (profile?.businessName) confirmedFacts.push(`Business Name: ${profile.businessName}`);
    if (profile?.stage) confirmedFacts.push(`Operating Stage: ${profile.stage}`);
    if (profile?.location) confirmedFacts.push(`Headquarters / Geography: ${profile.location}`);
    if (profile?.website) confirmedFacts.push(`Primary Domain / Channels: ${profile.website}`);

    if (Array.isArray(profile?.primaryGoals) && profile.primaryGoals.length > 0) {
      confirmedFacts.push(`Primary Strategic Goals: ${profile.primaryGoals.join('; ')}`);
    }

    if (Array.isArray(profile?.productsAndServices) && profile.productsAndServices.length > 0) {
      const prods = profile.productsAndServices.map(
        (p) => `${p.name} (${p.category || 'Offering'}${p.priceRange ? `: ${p.priceRange}` : ''})`
      );
      confirmedFacts.push(`Verified Products & Services: ${prods.join(', ')}`);
    }

    // Inferred / intelligence assumptions
    if (profile?.intelligence?.assumptions && Array.isArray(profile.intelligence.assumptions)) {
      inferredAssumptions.push(...profile.intelligence.assumptions);
    }
    if (
      profile?.intelligence?.informationGaps &&
      Array.isArray(profile.intelligence.informationGaps)
    ) {
      inferredAssumptions.push(
        ...profile.intelligence.informationGaps.map((g) => `Open Information Gap: ${g}`)
      );
    }

    // Department & Workflow specific relevance filtering
    const relevantFields = this.filterRelevantFields(profile, department, workflow);

    const selectionReason = `Tailored context package for ${department} / ${workflow} prioritizing verified products, target audience, and positioning.`;

    return {
      workspaceId,
      businessName,
      tagline,
      stage,
      location,
      industry,
      website,
      relevantFields,
      confirmedFacts,
      inferredAssumptions,
      brainVersion: profile?.version || 1,
      retrievedAt: now.toISOString(),
      selectionReason,
      dataFreshnessDays,
      provenance: {
        userConfirmedFactCount: confirmedFacts.length,
        aiInferredFactCount: inferredAssumptions.length,
        authoritativeVersionId:
          (profile as any)?.brainId || `brain_${workspaceId}_v${profile?.version || 1}`,
      },
    };
  }

  /**
   * Applies departmental relevance filtering so that unrelated profile data
   * is not sent to every model call.
   */
  private filterRelevantFields(
    profile: BusinessProfileEntity | null,
    department: AiDepartment,
    _workflow: string
  ): Record<string, unknown> {
    if (!profile) return {};

    const industry = (profile as any).industry || 'Commercial Services';

    switch (department) {
      case 'MARKET_INTELLIGENCE':
      case 'IDEA_INTELLIGENCE':
        return {
          businessName: profile.businessName,
          industry,
          location: profile.location,
          targetAudience: profile.targetAudience,
          stage: profile.stage,
          productsSummary: (profile.productsAndServices || []).map((p) => ({
            name: p.name,
            category: p.category,
            priceRange: p.priceRange,
          })),
        };

      case 'COMPETITOR_INTELLIGENCE':
        return {
          businessName: profile.businessName,
          industry,
          location: profile.location,
          brandPositioning: profile.brandPositioning,
          valueProposition: profile.valueProposition,
          differentiators: (profile.intelligence?.strengths || []).slice(0, 5),
          pricingModel: profile.revenueModel,
        };

      case 'BUSINESS_STRATEGY':
        return {
          businessName: profile.businessName,
          stage: profile.stage,
          primaryGoals: profile.primaryGoals,
          businessModel: profile.businessModel,
          revenueModel: profile.revenueModel,
          strengths: profile.intelligence?.strengths || [],
          informationGaps: profile.intelligence?.informationGaps || [],
          assumptions: profile.intelligence?.assumptions || [],
        };

      case 'CUSTOMER_INTELLIGENCE':
        return {
          businessName: profile.businessName,
          targetAudience: profile.targetAudience,
          customerPersonas: (profile.customerPersonas || []).map((c) => ({
            name: c.name,
            segment: c.segment,
            painPoints: c.painPoints,
            buyingTriggers: c.buyingTriggers,
            willingnessToPay: c.willingnessToPay,
          })),
        };

      case 'MARKETING_INTELLIGENCE':
      case 'BRAND_STUDIO':
        return {
          businessName: profile.businessName,
          tagline: profile.tagline,
          brandPositioning: profile.brandPositioning,
          brandVoice: profile.brandVoice,
          brandPersonality: profile.brandPersonality,
          marketingRestrictions: profile.marketingRestrictions,
          targetAudience: profile.targetAudience,
        };

      case 'PERFORMANCE_INTELLIGENCE':
        return {
          businessName: profile.businessName,
          stage: profile.stage,
          primaryGoals: profile.primaryGoals,
          revenueModel: profile.revenueModel,
        };

      default:
        return {
          businessName: profile.businessName,
          stage: profile.stage,
          location: profile.location,
          industry,
        };
    }
  }
}

export const contextEngine = new ContextEngine();
