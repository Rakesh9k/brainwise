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
