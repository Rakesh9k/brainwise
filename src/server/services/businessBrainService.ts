/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { businessProfileRepository } from '../repositories/businessProfileRepository';
import { businessBrainVersionRepository } from '../repositories/businessBrainVersionRepository';
import { userRepository } from '../repositories/userRepository';
import { aiOrchestrationService } from './aiOrchestrationService';
import type { BusinessProfileEntity, FactProvenanceItem } from '../types/api';

export class BusinessBrainService {
  public async getProfile(workspaceId: string): Promise<BusinessProfileEntity> {
    let profile = await businessProfileRepository.getProfile(workspaceId);
    if (!profile) {
      const now = new Date().toISOString();
      profile = await businessProfileRepository.saveProfile({
        workspaceId,
        businessName: 'My Business',
        tagline: '',
        stage: 'Early Traction',
        location: '',
        website: '',
        foundedYear: new Date().getFullYear().toString(),
        overviewSummary: '',
        targetAudience: '',
        brandPositioning: '',
        valueProposition: '',
        businessModel: '',
        revenueModel: '',
        primaryGoals: ['Validate a business idea', 'Build a brand'],
        provenance: {},
        strategicMemory: {
          usedAngles: [],
          fatiguedThemes: [],
          explicitExclusions: [],
          lastUpdated: now,
        },
        approvalStatus: 'DRAFT',
        lastUpdated: now,
        version: 1,
      });
    }
    return profile;
  }

  public async updateProfile(
    workspaceId: string,
    patch: Partial<BusinessProfileEntity>
  ): Promise<BusinessProfileEntity> {
    const current = await this.getProfile(workspaceId);
    const updated: BusinessProfileEntity = {
      ...current,
      ...patch,
      workspaceId,
      lastUpdated: new Date().toISOString(),
    };
    return await businessProfileRepository.saveProfile(updated);
  }

  public async deleteProfile(workspaceId: string): Promise<void> {
    await businessProfileRepository.deleteProfile(workspaceId);
  }

  /**
   * Generates a structured Business Brain from onboarding answers.
   * Enforces Fact Provenance: user inputs = USER_CONFIRMED; AI inferences = AI_INFERRED.
   */
  public async generateFromOnboarding(params: {
    workspaceId: string;
    userId: string;
    onboardingData: Record<string, any>;
  }): Promise<{ profile: BusinessProfileEntity; versionId: string }> {
    const { workspaceId, userId, onboardingData } = params;
    const now = new Date().toISOString();

    const { brain } = await aiOrchestrationService.synthesizeBusinessBrain(onboardingData);

    // Build Provenance Map
    const provenance: Record<string, FactProvenanceItem> = {
      businessName: {
        fieldKey: 'businessName',
        source: 'USER_CONFIRMED',
        confidence: 1.0,
        verifiedAt: now,
        lastConfirmedBy: userId,
        notes: 'Captured directly from onboarding identity stage',
      },
      stage: {
        fieldKey: 'stage',
        source: 'USER_CONFIRMED',
        confidence: 1.0,
        verifiedAt: now,
        lastConfirmedBy: userId,
      },
      location: {
        fieldKey: 'location',
        source: 'USER_CONFIRMED',
        confidence: 1.0,
        verifiedAt: now,
        lastConfirmedBy: userId,
      },
      targetAudience: {
        fieldKey: 'targetAudience',
        source: 'USER_CONFIRMED',
        confidence: 1.0,
        verifiedAt: now,
        lastConfirmedBy: userId,
      },
      brandPositioning: {
        fieldKey: 'brandPositioning',
        source: 'AI_INFERRED',
        confidence: 0.88,
        verifiedAt: now,
        notes: 'Synthesized from strategic priorities and selected differentiators',
      },
      valueProposition: {
        fieldKey: 'valueProposition',
        source: 'AI_INFERRED',
        confidence: 0.85,
        verifiedAt: now,
      },
      businessModel: {
        fieldKey: 'businessModel',
        source: 'AI_INFERRED',
        confidence: 0.82,
        verifiedAt: now,
      },
    };

    const profile: BusinessProfileEntity = {
      workspaceId,
      businessName: brain.businessName,
      tagline: brain.tagline,
      stage: brain.stage,
      location: brain.location,
      website: brain.website,
      foundedYear: brain.foundedYear,
      overviewSummary: brain.overviewSummary,
      targetAudience: brain.targetAudience,
      brandPositioning: brain.brandPositioning,
      valueProposition: brain.valueProposition,
      businessModel: brain.businessModel,
      revenueModel: brain.revenueModel,
      productsAndServices: brain.productsAndServices || [],
      customerPersonas: brain.customerPersonas || [],
      primaryGoals: brain.primaryGoals || [],
      brandPersonality: brain.brandPersonality || [],
      brandVoice: brain.brandVoice || [],
      marketingRestrictions: brain.marketingRestrictions || [],
      provenance,
      strategicMemory: {
        usedAngles: [],
        fatiguedThemes: [],
        explicitExclusions: brain.marketingRestrictions || [],
        lastUpdated: now,
      },
      intelligence: brain.intelligence,
      digitalPresence: {
        website: brain.website,
        socialProfiles: [],
        otherChannels: [],
      },
      approvalStatus: 'DRAFT',
      lastUpdated: now,
      version: 1,
    };

    const saved = await businessProfileRepository.saveProfile(profile);

    // Create Initial Version Snapshot (v1)
    const versionId = `ver_${Date.now()}_v1`;
    await businessBrainVersionRepository.createVersion({
      versionId,
      workspaceId,
      versionNumber: 1,
      profileSnapshot: saved,
      changeSummary: 'Initial AI synthesis from conversational onboarding',
      changedBy: userId,
      createdAt: now,
    });

    await userRepository.setOnboardingStatus(userId, 'BUSINESS_BRAIN_REVIEW');

    return { profile: saved, versionId };
  }

  /**
   * Approves the Business Brain, transitioning status to APPROVED.
   */
  public async approveProfile(
    workspaceId: string,
    userId: string
  ): Promise<{ profile: BusinessProfileEntity; versionId: string }> {
    const current = await this.getProfile(workspaceId);
    const now = new Date().toISOString();

    const updated: BusinessProfileEntity = {
      ...current,
      approvalStatus: 'APPROVED',
      approvedAt: now,
      lastUpdated: now,
      version: current.version + 1,
    };

    const saved = await businessProfileRepository.saveProfile(updated);

    const versionId = `ver_${Date.now()}_v${saved.version}`;
    await businessBrainVersionRepository.createVersion({
      versionId,
      workspaceId,
      versionNumber: saved.version,
      profileSnapshot: saved,
      changeSummary: 'Founder approval and lock-in of Business Brain',
      changedBy: userId,
      createdAt: now,
    });

    await userRepository.setOnboardingStatus(userId, 'APPROVED');

    return { profile: saved, versionId };
  }

  /**
   * Regenerates AI insights while preserving all USER_CONFIRMED facts.
   */
  public async regenerateProfile(params: {
    workspaceId: string;
    userId: string;
    instructions?: string;
  }): Promise<{ profile: BusinessProfileEntity; versionId: string }> {
    const { workspaceId, userId, instructions } = params;
    const current = await this.getProfile(workspaceId);
    const now = new Date().toISOString();

    const synthInput = {
      businessName: current.businessName,
      businessType: current.productsAndServices?.[0]?.category || 'General Business',
      businessStage: current.stage,
      city: current.location.split(',')[0]?.trim(),
      country: current.location.split(',')[1]?.trim() || current.location,
      primaryPriorities: current.primaryGoals,
      objectiveDetails: instructions || current.overviewSummary,
      targetAudienceType: current.targetAudience,
      offeringsSummary: current.overviewSummary,
      pricingModel: current.revenueModel,
      website: current.website,
    };

    const { brain } = await aiOrchestrationService.synthesizeBusinessBrain(synthInput);

    // Merge: Preserve all user confirmed fields!
    const mergedProvenance = { ...current.provenance };
    const updated: BusinessProfileEntity = {
      ...current,
      tagline:
        current.provenance.tagline?.source === 'USER_CONFIRMED' ? current.tagline : brain.tagline,
      brandPositioning:
        current.provenance.brandPositioning?.source === 'USER_CONFIRMED'
          ? current.brandPositioning
          : brain.brandPositioning,
      valueProposition:
        current.provenance.valueProposition?.source === 'USER_CONFIRMED'
          ? current.valueProposition
          : brain.valueProposition,
      brandPersonality: current.brandPersonality?.length
        ? current.brandPersonality
        : brain.brandPersonality,
      brandVoice: current.brandVoice?.length ? current.brandVoice : brain.brandVoice,
      customerPersonas: brain.customerPersonas || current.customerPersonas,
      intelligence: brain.intelligence || current.intelligence,
      provenance: mergedProvenance,
      lastUpdated: now,
      version: current.version + 1,
    };

    const saved = await businessProfileRepository.saveProfile(updated);

    const versionId = `ver_${Date.now()}_v${saved.version}`;
    await businessBrainVersionRepository.createVersion({
      versionId,
      workspaceId,
      versionNumber: saved.version,
      profileSnapshot: saved,
      changeSummary: instructions || 'AI Strategic Intelligence Refresh',
      changedBy: userId,
      createdAt: now,
    });

    return { profile: saved, versionId };
  }

  /**
   * Lists version history of the Business Brain.
   */
  public async getVersions(workspaceId: string) {
    return await businessBrainVersionRepository.listVersions(workspaceId);
  }

  /**
   * Restores a previous snapshot version.
   */
  public async restoreVersion(params: {
    workspaceId: string;
    versionId: string;
    userId: string;
  }): Promise<BusinessProfileEntity> {
    const { workspaceId, versionId, userId } = params;
    const versionRecord = await businessBrainVersionRepository.findById(workspaceId, versionId);
    if (!versionRecord) {
      throw new Error(`VERSION_NOT_FOUND: Version snapshot '${versionId}' not found.`);
    }

    const now = new Date().toISOString();
    const current = await this.getProfile(workspaceId);

    const restored: BusinessProfileEntity = {
      ...versionRecord.profileSnapshot,
      workspaceId,
      lastUpdated: now,
      version: current.version + 1,
    };

    const saved = await businessProfileRepository.saveProfile(restored);

    await businessBrainVersionRepository.createVersion({
      versionId: `ver_${Date.now()}_restore`,
      workspaceId,
      versionNumber: saved.version,
      profileSnapshot: saved,
      changeSummary: `Restored from version ${versionRecord.versionNumber} (${versionId})`,
      changedBy: userId,
      createdAt: now,
    });

    return saved;
  }

  public async confirmFact(
    workspaceId: string,
    fieldKey: string,
    confirmedBy: string
  ): Promise<BusinessProfileEntity> {
    return await businessProfileRepository.updateFactProvenance(workspaceId, fieldKey, {
      fieldKey,
      source: 'USER_CONFIRMED',
      confidence: 1.0,
      verifiedAt: new Date().toISOString(),
      lastConfirmedBy: confirmedBy,
    });
  }

  public async addExclusionRule(workspaceId: string, rule: string): Promise<BusinessProfileEntity> {
    const current = await this.getProfile(workspaceId);
    const cleanRule = rule.trim();
    if (!cleanRule || current.strategicMemory.explicitExclusions.includes(cleanRule)) {
      return current;
    }
    current.strategicMemory.explicitExclusions.push(cleanRule);
    current.strategicMemory.lastUpdated = new Date().toISOString();
    return await businessProfileRepository.saveProfile(current);
  }

  public async removeExclusionRule(
    workspaceId: string,
    rule: string
  ): Promise<BusinessProfileEntity> {
    const current = await this.getProfile(workspaceId);
    current.strategicMemory.explicitExclusions = current.strategicMemory.explicitExclusions.filter(
      (r) => r.toLowerCase() !== rule.toLowerCase().trim()
    );
    current.strategicMemory.lastUpdated = new Date().toISOString();
    return await businessProfileRepository.saveProfile(current);
  }

  public async recordStrategicAngle(
    workspaceId: string,
    angle: string,
    theme: string,
    usedIn: 'BrandStudio' | 'IdeaIntelligence' | 'GrowthDirector' | 'Campaign'
  ): Promise<BusinessProfileEntity> {
    return await businessProfileRepository.recordStrategicAngle(workspaceId, angle, theme, usedIn);
  }

  public async getHistory(workspaceId: string): Promise<BusinessProfileEntity[]> {
    return await businessProfileRepository.listHistory(workspaceId);
  }
}

export const businessBrainService = new BusinessBrainService();
