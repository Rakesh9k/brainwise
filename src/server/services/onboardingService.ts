/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { onboardingRepository } from '../repositories/onboardingRepository';
import { userRepository } from '../repositories/userRepository';
import { workspaceService } from './authService';
import type { OnboardingSessionEntity, OnboardingStatus } from '../types/api';

export class OnboardingService {
  /**
   * Retrieves active onboarding session or creates a new one.
   */
  public async getOrCreateSession(userId: string): Promise<OnboardingSessionEntity> {
    let session = await onboardingRepository.findByUserId(userId);
    if (!session) {
      const sessionId = `onb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = new Date().toISOString();
      session = await onboardingRepository.saveSession({
        sessionId,
        userId,
        currentStage: 1,
        currentStep: 1,
        status: 'IN_PROGRESS',
        data: {},
        startedAt: now,
        updatedAt: now,
      });
      await userRepository.setOnboardingStatus(userId, 'IN_PROGRESS');
    }
    return session;
  }

  /**
   * Auto-saves an answer step idempotently.
   */
  public async saveAnswer(
    userId: string,
    params: {
      stage: 1 | 2 | 3;
      step: number;
      answer: Partial<OnboardingSessionEntity['data']>;
      status?: OnboardingStatus;
    }
  ): Promise<OnboardingSessionEntity> {
    const session = await this.getOrCreateSession(userId);

    const mergedData = {
      ...session.data,
      ...params.answer,
      adaptiveResponses: {
        ...(session.data.adaptiveResponses || {}),
        ...(params.answer.adaptiveResponses || {}),
      },
    };

    const newStatus: OnboardingStatus =
      params.status ||
      (params.stage === 3 && params.step >= 4 ? 'BUSINESS_DETAILS_CAPTURED' : 'IN_PROGRESS');

    const updated = await onboardingRepository.saveSession({
      ...session,
      currentStage: params.stage,
      currentStep: params.step,
      status: newStatus,
      data: mergedData,
      updatedAt: new Date().toISOString(),
    });

    await userRepository.setOnboardingStatus(userId, newStatus);
    return updated;
  }

  /**
   * Ensures an active workspace is provisioned from the captured onboarding data.
   */
  public async ensureWorkspaceFromOnboarding(
    userId: string
  ): Promise<{ workspaceId: string; isNew: boolean }> {
    const user = await userRepository.findById(userId);
    const session = await this.getOrCreateSession(userId);

    if (user?.activeWorkspaceId) {
      return { workspaceId: user.activeWorkspaceId, isNew: false };
    }

    const businessName = session.data.businessName?.trim() || 'New Venture Workspace';
    const industry = session.data.businessType || 'General Business';
    const country = session.data.country || 'IN';

    const { workspace } = await workspaceService.createWorkspace({
      ownerUserId: userId,
      workspaceName: businessName,
      industry,
      country,
    });

    // Link workspace to session
    await onboardingRepository.saveSession({
      ...session,
      workspaceId: workspace.workspaceId,
    });

    return { workspaceId: workspace.workspaceId, isNew: true };
  }

  /**
   * Automatically extracts and infers structured business profile fields from a website URL.
   * Enables frictionless, zero-typing onboarding.
   */
  public async extractBusinessFromUrl(url: string): Promise<{
    businessName: string;
    businessType: string;
    targetAudienceType: string;
    customerPainPoints: string[];
    offeringsSummary: string;
    differentiators: string[];
    businessStage: string;
    pricingModel: string;
    city: string;
    country: string;
    primaryPriorities: string[];
    extractedFrom: string;
  }> {
    const rawUrl = url.trim();
    let normalized = rawUrl;
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
      normalized = `https://${normalized}`;
    }

    let domain: string;
    try {
      const parsed = new URL(normalized);
      domain = parsed.hostname.replace(/^www\./, '');
    } catch {
      domain = normalized.replace(/[^a-zA-Z0-9.-]/g, '');
    }

    // Default heuristic name derived from domain
    const cleanDomainBase = domain.split('.')[0] || 'Venture';
    const capitalizedName = cleanDomainBase
      .split(/[-_]/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');

    const extractedData = {
      businessName: capitalizedName,
      businessType: 'Technology startup',
      targetAudienceType: 'Modern businesses, professionals, and forward-thinking consumers seeking quality solutions.',
      customerPainPoints: [
        'Time-consuming manual workflows and inefficient tools',
        'High agency fees with inconsistent strategic clarity',
        'Fragmented data across disconnected platforms',
      ],
      offeringsSummary: `${capitalizedName} delivers purpose-built, high-reliability products designed to streamline operations and deliver consistent quality.`,
      differentiators: ['Uncompromising Quality', 'Technical Innovation'],
      businessStage: 'Early Traction',
      pricingModel: 'Value-Based Pricing',
      city: 'Global',
      country: 'IN',
      primaryPriorities: ['Finding more customers', 'Building my brand'],
      extractedFrom: normalized,
    };

    // Categorization heuristic based on domain keywords
    const lower = domain.toLowerCase();
    if (lower.includes('coffee') || lower.includes('roast') || lower.includes('tea') || lower.includes('food') || lower.includes('wear') || lower.includes('apparel') || lower.includes('craft')) {
      extractedData.businessType = 'Consumer brand';
      extractedData.targetAudienceType = 'Quality-conscious lifestyle consumers, specialty enthusiasts, and direct-to-consumer buyers.';
      extractedData.customerPainPoints = [
        'Inconsistent product quality from mass commercial brands',
        'Lack of transparent, ethical ingredient sourcing',
        'Impersonal customer experience and generic packaging',
      ];
      extractedData.offeringsSummary = `${capitalizedName} crafts premium, ethically sourced specialty goods with meticulous small-batch quality and transparent origin.`;
      extractedData.differentiators = ['Uncompromising Quality', 'Superior Customer Experience'];
      extractedData.pricingModel = 'Premium D2C Pricing';
    } else if (lower.includes('clinic') || lower.includes('health') || lower.includes('fit') || lower.includes('gym') || lower.includes('studio') || lower.includes('cafe')) {
      extractedData.businessType = 'Local business';
      extractedData.targetAudienceType = 'Neighborhood residents, local wellness seekers, and community members.';
      extractedData.customerPainPoints = [
        'Overcrowded mass facilities with impersonal instruction',
        'Rigid scheduling and inflexible booking terms',
        'Lack of tailored personal attention',
      ];
      extractedData.offeringsSummary = `A welcoming boutique destination providing personalized services, community atmosphere, and expert hands-on attention.`;
      extractedData.differentiators = ['Local Expertise & Trust', 'Superior Customer Experience'];
    } else if (lower.includes('agency') || lower.includes('consult') || lower.includes('media') || lower.includes('design') || lower.includes('creative')) {
      extractedData.businessType = 'Agency or consulting';
      extractedData.targetAudienceType = 'Growth-stage founders, marketing leaders, and ambitious brand operators.';
      extractedData.customerPainPoints = [
        'Junior agency account managers with slow response times',
        'High monthly retainers with unmeasurable business impact',
        'Cookie-cutter templates lacking strategic rigor',
      ];
      extractedData.offeringsSummary = `Strategic consulting and creative execution dedicated to driving measurable commercial growth and distinctive positioning.`;
      extractedData.differentiators = ['Specialized Bespoke Services', 'Speed & Convenience'];
    } else if (lower.includes('shop') || lower.includes('store') || lower.includes('cart') || lower.includes('market')) {
      extractedData.businessType = 'E-commerce business';
      extractedData.targetAudienceType = 'Online shoppers looking for curated collections and fast home delivery.';
      extractedData.customerPainPoints = [
        'Hidden shipping fees and slow order fulfillment',
        'Difficult return processes and opaque sizing',
      ];
      extractedData.differentiators = ['Speed & Convenience', 'Unique Proprietary Offerings'];
    }

    // Attempt Gemini synthesis if modelRouter is available
    try {
      const { modelRouter } = await import('../ai/modelRouter');
      const prompt = `Analyze this business website domain: "${normalized}".
Infer a realistic, high-quality strategic business profile. Return ONLY valid JSON matching this schema:
{
  "businessName": "concise brand name",
  "businessType": "Consumer brand" | "Service business" | "Technology startup" | "E-commerce business" | "Local business" | "Agency or consulting" | "Something else",
  "targetAudienceType": "1 sentence defining primary target buyers",
  "customerPainPoints": ["specific pain point 1", "specific pain point 2", "specific pain point 3"],
  "offeringsSummary": "2-3 sentences summarizing primary offerings, products, or services",
  "differentiators": ["differentiator 1", "differentiator 2"],
  "businessStage": "Early Traction",
  "pricingModel": "Value-Based Pricing"
}`;

      const routing = modelRouter.routeModel('SIMPLE');
      const provider = modelRouter.getProvider();
      const aiRes = await provider.generate({
        model: routing.preferredModel,
        prompt,
        systemInstruction: 'You are an expert business intelligence and market research analyst. Output strict JSON only.',
      });

      if (aiRes.text) {
        const jsonMatch = aiRes.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.businessName) extractedData.businessName = parsed.businessName;
          if (parsed.businessType) extractedData.businessType = parsed.businessType;
          if (parsed.targetAudienceType) extractedData.targetAudienceType = parsed.targetAudienceType;
          if (Array.isArray(parsed.customerPainPoints) && parsed.customerPainPoints.length > 0) {
            extractedData.customerPainPoints = parsed.customerPainPoints;
          }
          if (parsed.offeringsSummary) extractedData.offeringsSummary = parsed.offeringsSummary;
          if (Array.isArray(parsed.differentiators) && parsed.differentiators.length > 0) {
            extractedData.differentiators = parsed.differentiators;
          }
          if (parsed.pricingModel) extractedData.pricingModel = parsed.pricingModel;
        }
      }
    } catch {
      // Retain heuristic extraction on timeout or offline mode
    }

    return extractedData;
  }

  /**
   * Marks onboarding completed.
   */
  public async completeSession(userId: string): Promise<OnboardingSessionEntity> {
    const session = await this.getOrCreateSession(userId);
    const updated = await onboardingRepository.saveSession({
      ...session,
      status: 'COMPLETED',
      completedAt: new Date().toISOString(),
    });
    await userRepository.setOnboardingStatus(userId, 'COMPLETED');
    return updated;
  }
}

export const onboardingService = new OnboardingService();
