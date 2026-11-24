/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'node:crypto';
import type { ExecutionDispatchResult, VerifiedExecutionReceipt } from './executionTypes';

export class SocialPublishingAdapter {
  private readonly bufferAccessToken: string | undefined;

  constructor() {
    this.bufferAccessToken = process.env.BUFFER_ACCESS_TOKEN;
  }

  /**
   * Schedules a static carousel, SVG graphic, or text post to social networks
   */
  public async schedulePost(params: {
    workspaceId: string;
    platforms: ('LINKEDIN' | 'META_INSTAGRAM' | 'META_FACEBOOK' | 'TWITTER')[];
    postText: string;
    mediaUrls?: string[];
    scheduledTime?: string;
  }): Promise<ExecutionDispatchResult> {
    const { platforms, postText, mediaUrls = [], scheduledTime } = params;
    const now = new Date().toISOString();
    const receiptId = `rcpt_soc_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

    // 1. LIVE BUFFER EXECUTION (If BUFFER_ACCESS_TOKEN is present)
    if (this.bufferAccessToken) {
      try {
        const res = await fetch('https://api.bufferapp.com/1/updates/create.json', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.bufferAccessToken}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            text: postText,
            now: scheduledTime ? 'false' : 'true',
            scheduled_at: scheduledTime || '',
          }),
        });

        const data = (await res.json()) as any;
        if (!res.ok || !data.success) {
          return {
            success: false,
            errorMessage: data?.message || `Buffer API error status ${res.status}`,
            receipt: {
              receiptId,
              executionMode: 'PROVIDER_VERIFIED',
              providerName: 'Buffer',
              providerTransactionId: data?.id || `failed_${Date.now()}`,
              status: 'FAILED',
              dispatchedAt: now,
              responsePayload: data,
              isSimulated: false,
            },
          };
        }

        return {
          success: true,
          receipt: {
            receiptId,
            executionMode: 'PROVIDER_VERIFIED',
            providerName: 'Buffer',
            providerTransactionId: data.updates?.[0]?.id || `buf_${Date.now()}`,
            status: 'ACCEPTED_BY_PROVIDER',
            dispatchedAt: now,
            responsePayload: data,
            isSimulated: false,
            externalDeliveryConfirmation: {
              confirmedAt: now,
              deliveredCount: platforms.length,
            },
          },
        };
      } catch (err: any) {
        return {
          success: false,
          errorMessage: err.message,
          receipt: {
            receiptId,
            executionMode: 'PROVIDER_VERIFIED',
            providerName: 'Buffer',
            providerTransactionId: `err_${Date.now()}`,
            status: 'FAILED',
            dispatchedAt: now,
            responsePayload: { error: err.message },
            isSimulated: false,
          },
        };
      }
    }

    // 2. SAFE SIMULATED SANDBOX EXECUTION (Strictly labeled)
    const simulatedTxId = `sim_meta_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const receipt: VerifiedExecutionReceipt = {
      receiptId,
      executionMode: 'SIMULATED_SANDBOX',
      providerName: 'Meta Graph API',
      providerTransactionId: simulatedTxId,
      status: 'SIMULATED_SUCCESS',
      dispatchedAt: now,
      responsePayload: {
        sandboxMode: true,
        targetPlatforms: platforms,
        characterCount: postText.length,
        mediaAttachmentCount: mediaUrls.length,
        scheduledFor: scheduledTime || 'Immediate',
      },
      isSimulated: true,
      simulationNotice:
        'NOTICE: No live META_ACCESS_TOKEN or BUFFER_ACCESS_TOKEN detected in server environment. Executed in safe simulation sandbox. No live posts published.',
      externalDeliveryConfirmation: {
        confirmedAt: now,
        receiptSignature: `sig_sandbox_${crypto.randomBytes(6).toString('hex')}`,
        deliveredCount: platforms.length,
      },
    };

    return { success: true, receipt };
  }
}

export const socialPublishingAdapter = new SocialPublishingAdapter();
