/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { aiJobRepository } from '../repositories/aiJobRepository';
import { aiOrchestrationService } from './aiOrchestrationService';
import type { AiJobEntity } from '../types/api';

export class BackgroundJobService {
  public async createJob(params: {
    workspaceId: string;
    userId: string;
    jobType: AiJobEntity['jobType'];
    inputPayload: Record<string, unknown>;
  }): Promise<AiJobEntity> {
    const { workspaceId, userId, jobType, inputPayload } = params;
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const now = new Date().toISOString();

    const job: AiJobEntity = {
      jobId,
      workspaceId,
      userId,
      jobType,
      status: 'queued',
      creditsConsumed: 0,
      inputPayload,
      createdAt: now,
    };

    await aiJobRepository.create(job);

    // Asynchronously kick off processing in background without blocking the HTTP request
    queueMicrotask(() => {
      this.processJob(job).catch((err) => {
        console.error(`[BACKGROUND_JOB_ERROR] Job ${job.jobId} failed:`, err);
      });
    });

    return job;
  }

  public async getJob(workspaceId: string, jobId: string): Promise<AiJobEntity | null> {
    return await aiJobRepository.findById(workspaceId, jobId);
  }

  public async listJobs(workspaceId: string): Promise<AiJobEntity[]> {
    return await aiJobRepository.listByWorkspace(workspaceId);
  }

  public async cancelJob(workspaceId: string, jobId: string): Promise<AiJobEntity> {
    const job = await this.getJob(workspaceId, jobId);
    if (!job) throw new Error(`Job '${jobId}' not found in workspace '${workspaceId}'`);

    if (job.status === 'completed') {
      throw new Error(`Cannot cancel job '${jobId}' because it has already completed.`);
    }

    const updated = await aiJobRepository.updateStatus(workspaceId, jobId, {
      status: 'cancelled',
      completedAt: new Date().toISOString(),
    });

    return updated;
  }

  private async processJob(job: AiJobEntity): Promise<void> {
    const { workspaceId, jobId, jobType, inputPayload, userId } = job;

    await aiJobRepository.updateStatus(workspaceId, jobId, {
      status: 'processing',
    });

    try {
      if (jobType === 'dossier') {
        const result = await aiOrchestrationService.generateDossier({
          workspaceId,
          userId,
          ideaSummary: String(inputPayload.ideaSummary || 'Market Research'),
          industry: String(inputPayload.industry || 'Technology'),
          targetMarket: String(inputPayload.targetMarket || 'Consumer'),
          geography: String(inputPayload.geography || 'Global'),
          depth: inputPayload.depth as any,
        });

        await aiJobRepository.updateStatus(workspaceId, jobId, {
          status: 'completed',
          resultPayload: { reportId: result.report.reportId, title: result.report.title },
          creditsConsumed: result.creditsDeducted,
          modelUsed: result.modelUsed,
          completedAt: new Date().toISOString(),
        });
      } else if (jobType === 'brand-asset') {
        const result = await aiOrchestrationService.generateBrandAssetSvg({
          workspaceId,
          userId,
          name: String(inputPayload.name || 'Brand Identity'),
          category: (inputPayload.category as any) || 'Logos',
          conceptPrompt: String(inputPayload.conceptPrompt || 'Modern premium logo'),
        });

        await aiJobRepository.updateStatus(workspaceId, jobId, {
          status: 'completed',
          resultPayload: { assetId: result.asset.assetId, name: result.asset.name },
          creditsConsumed: result.creditsDeducted,
          modelUsed: result.modelUsed,
          completedAt: new Date().toISOString(),
        });
      } else {
        await aiJobRepository.updateStatus(workspaceId, jobId, {
          status: 'completed',
          resultPayload: { message: `Completed processing for ${jobType}` },
          completedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      await aiJobRepository.updateStatus(workspaceId, jobId, {
        status: 'failed',
        errorMessage: err instanceof Error ? err.message : 'Unknown background processing error',
        completedAt: new Date().toISOString(),
      });
    }
  }
}

export const backgroundJobService = new BackgroundJobService();
