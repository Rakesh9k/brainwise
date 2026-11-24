/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ExecutionMode = 'PROVIDER_VERIFIED' | 'SIMULATED_SANDBOX';

export type ProviderDeliveryStatus =
  | 'DELIVERED'
  | 'ACCEPTED_BY_PROVIDER'
  | 'QUEUED'
  | 'FAILED'
  | 'REJECTED'
  | 'SIMULATED_SUCCESS'
  | 'CREDENTIALS_MISSING';

export interface VerifiedExecutionReceipt {
  receiptId: string;
  executionMode: ExecutionMode;
  providerName: 'Resend' | 'Meta Graph API' | 'Buffer' | 'BrainWise Dispatch Engine' | 'Mock Sandbox';
  providerTransactionId: string;
  status: ProviderDeliveryStatus;
  dispatchedAt: string;
  responsePayload: Record<string, unknown>;
  isSimulated: boolean;
  simulationNotice?: string;
  externalDeliveryConfirmation?: {
    confirmedAt: string;
    receiptSignature?: string;
    deliveredCount?: number;
    bounceCount?: number;
  };
}

export interface ExecutionDispatchResult {
  success: boolean;
  receipt: VerifiedExecutionReceipt;
  errorMessage?: string;
}
