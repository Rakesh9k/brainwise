/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'node:crypto';
import type { ExecutionDispatchResult, VerifiedExecutionReceipt } from './executionTypes';

export class EmailProviderAdapter {
  private readonly apiKey: string | undefined;

  constructor() {
    this.apiKey = process.env.RESEND_API_KEY;
  }

  /**
   * Dispatches an outbound email campaign or sequence
   */
  public async dispatchEmail(params: {
    workspaceId: string;
    to: string | string[];
    from?: string;
    subject: string;
    bodyText: string;
    templateId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<ExecutionDispatchResult> {
    const { to, from = 'noreply@brainwise.pro', subject, bodyText, metadata: _metadata = {} } = params;
    const now = new Date().toISOString();
    const receiptId = `rcpt_email_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

    // 1. LIVE PROVIDER EXECUTION (If RESEND_API_KEY is present)
    if (this.apiKey) {
      try {
        const recipients = Array.isArray(to) ? to : [to];
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from,
            to: recipients,
            subject,
            text: bodyText,
            tags: [{ name: 'workspaceId', value: params.workspaceId }],
          }),
        });

        const data = (await res.json()) as any;

        if (!res.ok) {
          return {
            success: false,
            errorMessage: data?.message || `Resend API failed with status ${res.status}`,
            receipt: {
              receiptId,
              executionMode: 'PROVIDER_VERIFIED',
              providerName: 'Resend',
              providerTransactionId: data?.id || `failed_${Date.now()}`,
              status: 'FAILED',
              dispatchedAt: now,
              responsePayload: data || { error: 'Unknown provider response' },
              isSimulated: false,
            },
          };
        }

        const receipt: VerifiedExecutionReceipt = {
          receiptId,
          executionMode: 'PROVIDER_VERIFIED',
          providerName: 'Resend',
          providerTransactionId: data.id || `res_${Date.now()}`,
          status: 'DELIVERED',
          dispatchedAt: now,
          responsePayload: data,
          isSimulated: false,
          externalDeliveryConfirmation: {
            confirmedAt: now,
            deliveredCount: recipients.length,
            bounceCount: 0,
          },
        };

        return { success: true, receipt };
      } catch (err: any) {
        return {
          success: false,
          errorMessage: err.message,
          receipt: {
            receiptId,
            executionMode: 'PROVIDER_VERIFIED',
            providerName: 'Resend',
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
    const simulatedTxId = `sim_resend_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const receipt: VerifiedExecutionReceipt = {
      receiptId,
      executionMode: 'SIMULATED_SANDBOX',
      providerName: 'Resend',
      providerTransactionId: simulatedTxId,
      status: 'SIMULATED_SUCCESS',
      dispatchedAt: now,
      responsePayload: {
        sandboxMode: true,
        mockProvider: 'Resend Test Sandbox',
        recipientSample: Array.isArray(to) ? to.slice(0, 3) : to,
        messageSubject: subject,
        dispatchedCharacters: bodyText.length,
      },
      isSimulated: true,
      simulationNotice:
        'NOTICE: No live RESEND_API_KEY detected in server environment. Executed in safe simulation sandbox. No external recipients contacted.',
      externalDeliveryConfirmation: {
        confirmedAt: now,
        receiptSignature: `sig_sandbox_${crypto.randomBytes(6).toString('hex')}`,
        deliveredCount: Array.isArray(to) ? to.length : 1,
        bounceCount: 0,
      },
    };

    return { success: true, receipt };
  }
}

export const emailProviderAdapter = new EmailProviderAdapter();
