/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { workspaceRepository } from '../repositories/workspaceRepository';
import { businessProfileRepository } from '../repositories/businessProfileRepository';
import { productRepository } from '../repositories/productRepository';
import { brandIdentityRepository } from '../repositories/brandIdentityRepository';
import { goalRepository, competitorRepository } from '../repositories/goalRepository';
import { documentRepository } from '../repositories/documentRepository';
import { audienceSegmentRepository } from '../repositories/audienceSegmentRepository';
import { intelligenceScoreRepository } from '../repositories/intelligenceScoreRepository';
import { calculateBusinessIntelligenceScore } from '../../utils/intelligenceScore';
import type {
  BusinessIntelligenceScore,
  IntelligenceScoreHistoryEntry,
  IntelligenceScoreWeights,
} from '../../types/intelligenceScore';

export class BusinessIntelligenceScoreService {
  public async calculateAndSaveScore(
    workspaceId: string,
    options: {
      triggerEvent?: string;
      customWeights?: Partial<IntelligenceScoreWeights>;
      now?: string | Date;
    } = {}
  ): Promise<BusinessIntelligenceScore> {
    const [
      profile,
      workspace,
      products,
      services,
      brand,
      goals,
      competitors,
      documents,
      audienceSegments,
      previousScore,
    ] = await Promise.all([
      businessProfileRepository.getProfile(workspaceId),
      workspaceRepository.findById(workspaceId),
      productRepository.listProducts(workspaceId),
      productRepository.listServices(workspaceId),
      brandIdentityRepository.getLatest(workspaceId),
      goalRepository.listGoals(workspaceId),
      competitorRepository.listByWorkspace(workspaceId),
      documentRepository.listDocuments(workspaceId),
      audienceSegmentRepository.listByWorkspace(workspaceId),
      intelligenceScoreRepository.getLatestScore(workspaceId),
    ]);

    const nextVersion = previousScore ? previousScore.version + 1 : 1;

    const effectiveProfile = {
      ...(profile || {}),
      industry: profile?.industry || workspace?.industry || '',
      businessName: profile?.businessName || workspace?.workspaceName || '',
    };

    const effectiveBrand = brand
      ? {
          ...brand,
          brandVoice: (brand as any).brandVoice || (brand as any).voice || profile?.brandVoice,
          brandTone: (brand as any).brandTone || (brand as any).tone || profile?.brandPersonality,
          uniqueSellingProposition:
            (brand as any).uniqueSellingProposition || profile?.valueProposition,
          restrictedClaims: (brand as any).restrictedClaims || profile?.marketingRestrictions,
          visualGuidelines: (brand as any).visualGuidelines,
          visualDirection: (brand as any).visualDirection,
          colorPalette: (brand as any).colorPalette || (brand as any).palette,
          approvedClaims: (brand as any).approvedClaims,
        }
      : profile?.brandPersonality || profile?.brandVoice
        ? {
            brandVoice: profile?.brandVoice,
            brandTone: profile?.brandPersonality,
            uniqueSellingProposition: profile?.valueProposition,
            restrictedClaims: profile?.marketingRestrictions,
          }
        : undefined;

    const calculated = calculateBusinessIntelligenceScore({
      workspaceId,
      profile: effectiveProfile,
      products,
      services,
      personas: profile?.customerPersonas || [],
      audienceSegments,
      brand: effectiveBrand,
      goals,
      competitors,
      documents,
      provenance: profile?.provenance || {},
      strategicMemory: profile?.strategicMemory,
      resourcesAndConstraints: profile?.resourcesAndConstraints,
      weights: options.customWeights,
      previousScore,
      version: nextVersion,
      triggerEvent: options.triggerEvent || 'MANUAL_RECALCULATION',
      now: options.now,
    });

    await intelligenceScoreRepository.saveScore(calculated);
    return calculated;
  }

  public async getLatestScore(
    workspaceId: string,
    customWeights?: Partial<IntelligenceScoreWeights>
  ): Promise<BusinessIntelligenceScore> {
    const existing = await intelligenceScoreRepository.getLatestScore(workspaceId);
    if (existing && !customWeights) {
      return existing;
    }
    return this.calculateAndSaveScore(workspaceId, {
      triggerEvent: 'INITIAL_AUTOSCORE',
      customWeights,
    });
  }

  public async listScoreHistory(
    workspaceId: string,
    limitCount = 20
  ): Promise<IntelligenceScoreHistoryEntry[]> {
    return intelligenceScoreRepository.listHistory(workspaceId, limitCount);
  }
}

export const businessIntelligenceScoreService = new BusinessIntelligenceScoreService();
