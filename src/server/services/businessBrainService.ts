/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { businessProfileRepository } from '../repositories/businessProfileRepository';
import { businessBrainVersionRepository } from '../repositories/businessBrainVersionRepository';
import { userRepository } from '../repositories/userRepository';
import { extractionJobRepository } from '../repositories/extractionJobRepository';
import { productRepository } from '../repositories/productRepository';
import { brandIdentityRepository } from '../repositories/brandIdentityRepository';
import { aiOrchestrationService } from './aiOrchestrationService';
import { departmentEventBus } from '../events/eventBus';
import { departmentCoordinationService } from './departmentCoordinationService';
import { documentExtractionService } from './documentExtractionService';
import type {
  BusinessProfileEntity,
  FactProvenanceItem,
  VerificationItemEntity,
  BusinessResourcesAndConstraints,
  BrandIdentityEntity,
  ProductEntity,
  ServiceEntity,
  StandardDepartmentTaskEntity,
  MultiDocDiscrepancyMatrix,
  MultiDocDiscrepancyItem,
} from '../types/api';

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
    patch: Partial<BusinessProfileEntity>,
    userId?: string
  ): Promise<BusinessProfileEntity> {
    const current = await this.getProfile(workspaceId);
    const newVersion = (current.version || 1) + 1;
    const now = new Date().toISOString();
    const updated: BusinessProfileEntity = {
      ...current,
      ...patch,
      workspaceId,
      version: newVersion,
      lastUpdated: now,
    };
    const saved = await businessProfileRepository.saveProfile(updated);

    await businessBrainVersionRepository.createVersion({
      versionId: `ver_${Date.now()}_v${newVersion}`,
      workspaceId,
      versionNumber: newVersion,
      profileSnapshot: saved,
      changeSummary: 'Business profile updated with new knowledge attributes',
      changedBy: userId || 'founder',
      createdAt: now,
    });

    // Detect if core grounding attributes changed (e.g. pricing, products, positioning, personas, exclusions)
    const groundingFields = [
      'products',
      'brandPositioning',
      'valueProposition',
      'targetAudience',
      'businessModel',
      'revenueModel',
      'tagline',
      'stage',
      'strategicMemory',
    ];
    const changedFields: string[] = [];
    for (const key of groundingFields) {
      if ((patch as any)[key] !== undefined) {
        const oldVal = JSON.stringify((current as any)[key]);
        const newVal = JSON.stringify((patch as any)[key]);
        if (oldVal !== newVal) {
          changedFields.push(key);
        }
      }
    }

    if (changedFields.length > 0) {
      await departmentEventBus.emit({
        workspaceId,
        userId: userId || 'founder',
        eventType: 'BUSINESS_PROFILE_UPDATED',
        resourceId: workspaceId,
        resourceVersion: newVersion,
        metadata: {
          changedFields,
          patchKeys: Object.keys(patch),
        },
      });

      await departmentCoordinationService.triggerCrossDepartmentCascadeAlerts({
        workspaceId,
        changedFields,
        actorId: userId || 'founder',
      });
    }

    return saved;
  }

  public async getRegroundingAlerts(workspaceId: string): Promise<StandardDepartmentTaskEntity[]> {
    return await departmentCoordinationService.getRegroundingAlerts(workspaceId);
  }

  public async acknowledgeRegrounding(
    workspaceId: string,
    taskId: string,
    userId?: string
  ): Promise<StandardDepartmentTaskEntity> {
    return await departmentCoordinationService.acknowledgeOrRegroundTask({
      workspaceId,
      taskId,
      actorId: userId || 'founder',
    });
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

  // ===========================================================================
  // PHASE 1: VERIFICATION QUEUE & FACT APPROVAL WORKFLOW
  // ===========================================================================

  public async getVerificationQueue(
    workspaceId: string,
    status: VerificationItemEntity['status'] = 'pending'
  ): Promise<VerificationItemEntity[]> {
    return await extractionJobRepository.listVerificationItems(workspaceId, status);
  }

  public async verifyQueueItem(params: {
    workspaceId: string;
    itemId: string;
    action: 'approve' | 'reject' | 'edit';
    editedValue?: unknown;
    confirmedBy: string;
  }): Promise<{ item: VerificationItemEntity; profile: BusinessProfileEntity }> {
    const { workspaceId, itemId, action, editedValue, confirmedBy } = params;
    const now = new Date().toISOString();

    const items = await extractionJobRepository.listVerificationItems(workspaceId, 'pending');
    const targetItem = items.find((i) => i.itemId === itemId);
    if (!targetItem) {
      throw new Error(
        `VERIFICATION_ITEM_NOT_FOUND: Item '${itemId}' not found in verification queue.`
      );
    }

    const finalStatus =
      action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'edited';
    const finalValue = action === 'edit' ? editedValue : targetItem.proposedValue;

    const updatedItem = await extractionJobRepository.updateVerificationItem(workspaceId, itemId, {
      status: finalStatus,
      userEditedValue: action === 'edit' ? editedValue : undefined,
      verifiedBy: confirmedBy,
      verifiedAt: now,
    });

    let currentProfile = await this.getProfile(workspaceId);

    // If approved or edited, merge into Business Brain as USER_CONFIRMED ground truth!
    if (action === 'approve' || action === 'edit') {
      if (targetItem.domain === 'identity') {
        const fieldKey = targetItem.fieldKey || targetItem.fieldName || 'overviewSummary';
        currentProfile = await this.updateProfile(workspaceId, {
          [fieldKey]: finalValue,
        });
        await this.confirmFact(workspaceId, fieldKey, confirmedBy);
      } else if (targetItem.domain === 'products' && typeof finalValue === 'object') {
        const prod = finalValue as Partial<ProductEntity>;
        const existing = await productRepository.findByNameOrSku(workspaceId, prod.name || '');
        if (existing) {
          await productRepository.updateProduct(workspaceId, existing.productId, {
            ...prod,
            source: 'USER_CONFIRMED',
          });
        } else {
          await productRepository.createProduct({
            productId: `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            workspaceId,
            name: prod.name || 'Verified Product',
            category: prod.category || 'General',
            description: prod.description || '',
            price: Number(prod.price) || 0,
            currency: prod.currency || 'USD',
            pricingStructure: prod.pricingStructure || 'one-time',
            features: prod.features || [],
            benefits: prod.benefits || [],
            targetCustomer: prod.targetCustomer || '',
            differentiation: prod.differentiation || '',
            status: 'active',
            source: 'USER_CONFIRMED',
            createdAt: now,
            updatedAt: now,
          });
        }
      } else if (targetItem.domain === 'services' && typeof finalValue === 'object') {
        const srv = finalValue as Partial<ServiceEntity>;
        await productRepository.createService({
          serviceId: `srv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          workspaceId,
          name: srv.name || 'Verified Service',
          category: srv.category || 'General Services',
          description: srv.description || '',
          price: Number(srv.price) || 0,
          pricingModel: srv.pricingModel || 'Fixed',
          targetCustomer: srv.targetCustomer || '',
          benefits: srv.benefits || [],
          status: 'active',
          source: 'USER_CONFIRMED',
          createdAt: now,
          updatedAt: now,
        });
      } else if (targetItem.domain === 'brand' && targetItem.fieldKey === 'brandVoice') {
        const voiceArr = Array.isArray(finalValue) ? finalValue : [String(finalValue)];
        currentProfile = await this.updateProfile(workspaceId, { brandVoice: voiceArr });
        await this.confirmFact(workspaceId, 'brandVoice', confirmedBy);
      }
    }

    return { item: updatedItem, profile: currentProfile };
  }

  // ===========================================================================
  // PHASE 1: RESOURCES & CONSTRAINTS
  // ===========================================================================

  public async updateResourcesAndConstraints(
    workspaceId: string,
    resourcesAndConstraints: BusinessResourcesAndConstraints,
    confirmedBy?: string
  ): Promise<BusinessProfileEntity> {
    const current = await this.getProfile(workspaceId);
    const updated = await this.updateProfile(workspaceId, {
      resourcesAndConstraints: {
        ...(current.resourcesAndConstraints || {}),
        ...resourcesAndConstraints,
      },
    });

    if (confirmedBy) {
      await this.confirmFact(workspaceId, 'resourcesAndConstraints', confirmedBy);
    }

    return updated;
  }

  // ===========================================================================
  // PHASE 1: BRAND INTELLIGENCE
  // ===========================================================================

  public async updateBrandIntelligence(
    workspaceId: string,
    brandData: Partial<BrandIdentityEntity>,
    confirmedBy?: string
  ): Promise<BrandIdentityEntity> {
    const now = new Date().toISOString();
    const existing = await brandIdentityRepository.getLatest(workspaceId);
    const newVersion = (existing?.version || 0) + 1;

    const entity: BrandIdentityEntity = {
      brandIdentityId: existing?.brandIdentityId || `brand_${Date.now()}`,
      workspaceId,
      version: newVersion,
      brandName: brandData.brandName || existing?.brandName || 'My Brand',
      tagline: brandData.tagline || existing?.tagline || '',
      mission: brandData.mission || existing?.mission || '',
      vision: brandData.vision || existing?.vision || '',
      personality: brandData.personality || existing?.personality || [],
      voice: brandData.voice || existing?.voice || [],
      tone: brandData.tone || existing?.tone || 'Professional & Approachable',
      palette: brandData.palette ||
        existing?.palette || {
          primary: '#171717',
          secondary: '#C44D00',
          accent: '#FF7417',
          neutral: '#70706B',
          background: '#FAFAF9',
        },
      typography: brandData.typography ||
        existing?.typography || {
          heading: 'Plus Jakarta Sans',
          body: 'Inter',
          scale: '1.25',
        },
      logoUrls: brandData.logoUrls || existing?.logoUrls,
      visualDirection:
        brandData.visualDirection || existing?.visualDirection || 'Modern, clean, editorial',
      logoDirection:
        brandData.logoDirection || existing?.logoDirection || 'Geometric monogram mark',
      preferredLanguage: brandData.preferredLanguage || existing?.preferredLanguage || 'English',
      wordsToUse: brandData.wordsToUse || existing?.wordsToUse || [],
      wordsToAvoid: brandData.wordsToAvoid || existing?.wordsToAvoid || [],
      approvedClaims: brandData.approvedClaims || existing?.approvedClaims || [],
      restrictedClaims: brandData.restrictedClaims || existing?.restrictedClaims || [],
      uniqueSellingProposition:
        brandData.uniqueSellingProposition || existing?.uniqueSellingProposition || '',
      guidelinesText: brandData.guidelinesText || existing?.guidelinesText,
      approvalStatus: 'APPROVED',
      approvedAt: now,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    const saved = await brandIdentityRepository.save(entity);

    // Also sync brand voice and positioning back to BusinessProfile
    await this.updateProfile(workspaceId, {
      tagline: entity.tagline,
      brandPositioning: entity.uniqueSellingProposition || entity.mission,
      brandVoice: entity.voice,
      brandPersonality: entity.personality,
      marketingRestrictions: entity.restrictedClaims,
    });

    if (confirmedBy) {
      await this.confirmFact(workspaceId, 'brandIdentity', confirmedBy);
    }

    return saved;
  }

  // ===========================================================================
  // PHASE 1: MISSING INFORMATION & GAP ANALYSIS
  // ===========================================================================

  public async getMissingInformation(workspaceId: string): Promise<{
    completenessPercentage: number;
    completedDomains: string[];
    missingItems: Array<{
      domain: string;
      prompt: string;
      field: string;
      severity: 'critical' | 'high' | 'recommended';
    }>;
    followUpQuestions: Array<{ id: string; domain: string; question: string; options?: string[] }>;
  }> {
    const profile = await this.getProfile(workspaceId);
    const products = await productRepository.listProducts(workspaceId);
    const services = await productRepository.listServices(workspaceId);
    const brand = await brandIdentityRepository.getLatest(workspaceId);

    const completedDomains: string[] = [];
    const missingItems: Array<{
      domain: string;
      prompt: string;
      field: string;
      severity: 'critical' | 'high' | 'recommended';
    }> = [];
    const followUpQuestions: Array<{
      id: string;
      domain: string;
      question: string;
      options?: string[];
    }> = [];

    // Domain 1: Identity
    if (profile.businessName && profile.industry && profile.location) {
      completedDomains.push('Business Identity');
    } else {
      if (!profile.businessName)
        missingItems.push({
          domain: 'Business Identity',
          field: 'businessName',
          prompt: 'Business display or legal name is missing',
          severity: 'critical',
        });
      if (!profile.location)
        missingItems.push({
          domain: 'Business Identity',
          field: 'location',
          prompt: 'Operational location / headquarters is missing',
          severity: 'high',
        });
    }

    // Domain 2: Products & Services
    if (products.length > 0 || services.length > 0) {
      completedDomains.push('Products & Services');
    } else {
      missingItems.push({
        domain: 'Products & Services',
        field: 'products',
        prompt: 'No products or service tiers defined',
        severity: 'critical',
      });
      followUpQuestions.push({
        id: 'q_offerings',
        domain: 'Products & Services',
        question: 'What is your primary offering and how is it priced?',
        options: [
          'Monthly Subscription',
          'Fixed Project Fee',
          'E-commerce Catalogue',
          'Custom Service Quote',
        ],
      });
    }

    // Domain 3: Customer Intelligence
    if (profile.targetAudience && (profile.customerPersonas?.length || 0) > 0) {
      completedDomains.push('Customer Intelligence');
    } else {
      missingItems.push({
        domain: 'Customer Intelligence',
        field: 'targetAudience',
        prompt: 'Detailed target customer segments or buyer personas not mapped',
        severity: 'high',
      });
    }

    // Domain 4: Brand Intelligence
    if (brand?.voice?.length && brand?.uniqueSellingProposition) {
      completedDomains.push('Brand Intelligence');
    } else {
      missingItems.push({
        domain: 'Brand Intelligence',
        field: 'brandVoice',
        prompt: 'Brand voice, tone, and USP not established',
        severity: 'recommended',
      });
    }

    // Domain 5: Business Goals
    if (profile.primaryGoals && profile.primaryGoals.length > 0) {
      completedDomains.push('Business Goals');
    } else {
      missingItems.push({
        domain: 'Business Goals',
        field: 'primaryGoals',
        prompt: 'Primary revenue or acquisition objectives not set',
        severity: 'high',
      });
    }

    // Domain 6: Resources & Constraints
    const mBudget = profile.resourcesAndConstraints?.marketingBudget;
    const hasBudget = typeof mBudget === 'number' ? mBudget > 0 : Boolean(mBudget?.monthly);
    if (
      hasBudget ||
      profile.resourcesAndConstraints?.operatingCapacity
    ) {
      completedDomains.push('Resources & Constraints');
    } else {
      missingItems.push({
        domain: 'Resources & Constraints',
        field: 'resourcesAndConstraints',
        prompt: 'Marketing budget or operating capacity limits unrecorded',
        severity: 'recommended',
      });
    }

    const completenessPercentage = Math.round((completedDomains.length / 6) * 100);

    return {
      completenessPercentage,
      completedDomains,
      missingItems,
      followUpQuestions,
    };
  }

  // ===========================================================================
  // MULTI-DOC DISCREPANCY MATRIX
  // ===========================================================================

  public async getMultiDocDiscrepancyMatrix(
    workspaceId: string
  ): Promise<MultiDocDiscrepancyMatrix> {
    return await documentExtractionService.getMultiDocDiscrepancyMatrix(workspaceId);
  }

  public async resolveDiscrepancy(params: {
    workspaceId: string;
    discrepancyId: string;
    resolutionType: 'ACCEPT_SOURCE' | 'KEEP_BRAIN' | 'CUSTOM';
    selectedSource?: string;
    customValue?: unknown;
    userId?: string;
  }): Promise<MultiDocDiscrepancyItem> {
    return await documentExtractionService.resolveDiscrepancy(params);
  }

  // ===========================================================================
  // MASTER MEMORY UPDATE SYSTEM (Phase 2 Master Architecture)
  // ===========================================================================

  /**
   * Evaluates new business information according to the 7 Master Directives:
   * 1. Novelty check
   * 2. Discrepancy & conflict detection against ground truth
   * 3. Source & provenance attribution
   * 4. Context mutation with version tracking
   * 5. Decision & assumption history preservation
   * 6. Audit timestamps
   * 7. Cross-department cache invalidation
   */
  public async processMemoryUpdate(params: {
    workspaceId: string;
    fieldOrCategory: string;
    key: string;
    newValue: any;
    sourceTitle: string;
    sourceUrl?: string;
    sourceType?: string;
    provenance: 'USER_CONFIRMED' | 'AI_INFERRED' | 'DERIVED_FROM_DOC';
    rationale?: string;
    confidence?: number;
    userId?: string;
  }): Promise<{
    action: 'CREATED_NEW' | 'UPDATED_EXISTING' | 'FLAGGED_CONFLICT' | 'IGNORED_DUPLICATE';
    fieldOrCategory: string;
    previousValue?: any;
    currentValue: any;
    version: number;
    conflictDetected: boolean;
    conflictDetails?: string;
    timestamp: string;
  }> {
    const {
      workspaceId,
      fieldOrCategory,
      key,
      newValue,
      sourceTitle,
      sourceUrl: _sourceUrl,
      sourceType = 'MANUAL_ENTRY',
      provenance,
      rationale,
      confidence = 1.0,
      userId = 'system',
    } = params;

    const profile = await this.getProfile(workspaceId);
    const now = new Date().toISOString();
    const currentVersion = profile.version || 1;

    // Check existing value and provenance
    const existingVal = (profile as any)[key];
    const existingProv: FactProvenanceItem | undefined = profile.provenance?.[key];

    // 1. Novelty & Duplicate Check
    if (existingVal !== undefined && JSON.stringify(existingVal) === JSON.stringify(newValue)) {
      return {
        action: 'IGNORED_DUPLICATE',
        fieldOrCategory,
        previousValue: existingVal,
        currentValue: existingVal,
        version: currentVersion,
        conflictDetected: false,
        timestamp: now,
      };
    }

    // 2. Conflict Check: USER_CONFIRMED facts CANNOT be overwritten by AI_INFERRED proposals
    if (existingProv?.source === 'USER_CONFIRMED' && provenance === 'AI_INFERRED' && existingVal !== undefined) {
      const conflictDetails = `Conflict detected: New AI-inferred proposal for "${key}" cannot silently override the user-confirmed fact ("${String(existingVal)}"). Proposed: "${String(newValue)}".`;
      
      // Record verification item for founder approval rather than silent overwrite
      await extractionJobRepository.createVerificationItems(workspaceId, [
        {
          itemId: `veri_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          workspaceId,
          fieldName: key,
          fieldCategory: fieldOrCategory,
          currentValue: existingVal,
          suggestedValue: newValue,
          source: sourceType,
          confidence: confidence ?? 0.7,
          status: 'pending',
          suggestedAt: now,
        },
      ]);

      return {
        action: 'FLAGGED_CONFLICT',
        fieldOrCategory,
        previousValue: existingVal,
        currentValue: existingVal, // Preserved
        version: currentVersion,
        conflictDetected: true,
        conflictDetails,
        timestamp: now,
      };
    }

    // 3. Apply Update with Version Increment & Provenance
    const newVersion = currentVersion + 1;
    const nextProvenance: Record<string, FactProvenanceItem> = {
      ...(profile.provenance || {}),
      [key]: {
        source: provenance,
        verifiedAt: now,
        verifiedBy: userId,
        confidence,
        documentId: sourceTitle,
      },
    };

    const updatedProfile: BusinessProfileEntity = {
      ...profile,
      [key]: newValue,
      provenance: nextProvenance,
      version: newVersion,
      lastUpdated: now,
    };

    const saved = await businessProfileRepository.saveProfile(updatedProfile);

    // 4. Archive Historical Version Snapshot (Never silently overwrite)
    await businessBrainVersionRepository.createVersion({
      versionId: `ver_${Date.now()}_v${newVersion}`,
      workspaceId,
      versionNumber: newVersion,
      profileSnapshot: saved,
      changeSummary: `Memory update on ${fieldOrCategory}.${key}: ${rationale || 'Ground truth updated'}`,
      changedBy: userId,
      createdAt: now,
    });

    // 5. Invalidate Cached Contexts & Notify Event Bus
    departmentEventBus.emit({
      workspaceId,
      userId,
      eventType: 'BUSINESS_PROFILE_UPDATED',
      resourceId: key,
      metadata: {
        entityType: 'BUSINESS_BRAIN',
        field: key,
        previousValue: existingVal,
        newValue,
      },
    });

    return {
      action: existingVal !== undefined ? 'UPDATED_EXISTING' : 'CREATED_NEW',
      fieldOrCategory,
      previousValue: existingVal,
      currentValue: newValue,
      version: newVersion,
      conflictDetected: false,
      timestamp: now,
    };
  }
}

export const businessBrainService = new BusinessBrainService();
