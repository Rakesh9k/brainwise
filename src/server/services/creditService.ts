/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { creditWalletRepository } from '../repositories/creditWalletRepository';
import type {
  CreditReservationEntity,
  CreditTransactionEntity,
  CreditWalletEntity,
} from '../types/api';

export const CREDIT_FEATURE_COSTS: Record<string, { cost: number; name: string }> = {
  'FEAT-CNT-001': { cost: 4, name: 'Social Carousel (5 Slides)' },
  'FEAT-CNT-002': { cost: 1, name: 'Single Slide Remix' },
  'FEAT-BRD-001': { cost: 5, name: 'Brand Collateral (SVG)' },
  'FEAT-CMP-001': { cost: 3, name: 'Competitor Teardown' },
  'FEAT-RES-001': { cost: 8, name: 'Market Dossier (TAM/SAM/SOM)' },
  'FEAT-STR-001': { cost: 10, name: '90-Day Growth Roadmap' },
  'FEAT-ANL-001': { cost: 2, name: 'Executive Performance Memo' },
  'FEAT-ONB-001': { cost: 0, name: 'Document Ingestion (Onboarding)' },
  'FEAT-CAL-001': { cost: 0, name: 'Task / Calendar CRUD' },
  'FEAT-AI-CHAT': { cost: 2, name: 'Executive AI Strategist Chat' },
};

export class CreditService {
  public async getWallet(workspaceId: string): Promise<CreditWalletEntity> {
    let wallet = await creditWalletRepository.getWallet(workspaceId);
    if (!wallet) {
      wallet = await creditWalletRepository.initializeWallet(workspaceId, 800);
    }
    return wallet;
  }

  public async getFeatureCost(featureId: string): Promise<number> {
    return CREDIT_FEATURE_COSTS[featureId]?.cost ?? 0;
  }

  public async reserveCredits(params: {
    workspaceId: string;
    userId: string;
    featureId: string;
    idempotencyKey?: string;
  }): Promise<CreditReservationEntity | null> {
    const { workspaceId, userId, featureId } = params;
    const cost = await this.getFeatureCost(featureId);

    if (cost === 0) {
      return null; // Zero credit charge, no reservation lock needed
    }

    const idempotencyKey =
      params.idempotencyKey || `idem_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    return await creditWalletRepository.holdCredits({
      workspaceId,
      userId,
      featureId,
      amount: cost,
      idempotencyKey,
    });
  }

  public async settleCredits(params: {
    workspaceId: string;
    reservation: CreditReservationEntity | null;
    featureId: string;
    notes?: string;
  }): Promise<{ remainingBalance: number; transaction?: CreditTransactionEntity }> {
    const { workspaceId, reservation, featureId, notes } = params;

    if (!reservation) {
      const wallet = await this.getWallet(workspaceId);
      return { remainingBalance: wallet.balance };
    }

    const result = await creditWalletRepository.commitCredits({
      workspaceId,
      reservationId: reservation.reservationId,
      featureId,
      notes,
    });

    return {
      remainingBalance: result.remainingBalance,
      transaction: result.transaction,
    };
  }

  public async refundCredits(params: {
    workspaceId: string;
    reservation: CreditReservationEntity | null;
    reason: string;
  }): Promise<{ availableBalance: number }> {
    const { workspaceId, reservation, reason } = params;

    if (!reservation) {
      const wallet = await this.getWallet(workspaceId);
      return { availableBalance: wallet.balance - wallet.reserved };
    }

    const result = await creditWalletRepository.refundCredits({
      workspaceId,
      reservationId: reservation.reservationId,
      reason,
    });

    return { availableBalance: result.availableBalance };
  }

  public async listTransactions(workspaceId: string): Promise<CreditTransactionEntity[]> {
    return await creditWalletRepository.listTransactions(workspaceId);
  }
}

export const creditService = new CreditService();
