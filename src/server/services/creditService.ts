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
  'FEAT-BRD-LOGO': { cost: 4, name: 'AI Logo Concepts (3 Variations)' },
  'FEAT-BRD-SOC': { cost: 4, name: 'AI Social Creative & Carousels' },
  'FEAT-BRD-MOCKUP': { cost: 5, name: 'Product Mockup Studio' },
  'FEAT-BRD-PKG': { cost: 6, name: 'Packaging Artwork Dieline' },
  'FEAT-BRD-VISUAL': { cost: 4, name: 'Campaign Visual & Editorial Photography' },
  'FEAT-BRD-POST': { cost: 3, name: 'Single Social Post Creative' },
  'FEAT-BRD-SLIDE-REMIX': { cost: 1, name: 'Single Slide Remix' },
  'FEAT-BRD-CAMPAIGN': { cost: 8, name: 'Coordinated Multi-Channel Campaign' },
  'FEAT-BRD-LAUNCH-KIT': { cost: 15, name: 'Complete Unified Brand Launch Kit' },
  'FEAT-BRD-TRADEMARK': { cost: 2, name: 'Automated Preliminary Trademark Clearance' },
  'FEAT-BRD-STRAT': { cost: 5, name: 'Contrarian Brand Strategy Proposal' },
  'FEAT-BRD-EXP': { cost: 2, name: 'Brand Export Package Bundle' },
  'FEAT-BRD-QLT': { cost: 1, name: 'Brand Quality & Consistency Report' },
  'FEAT-CMP-001': { cost: 3, name: 'Competitor Teardown' },
  'FEAT-RES-001': { cost: 8, name: 'Market Dossier (TAM/SAM/SOM)' },
  'FEAT-STR-001': { cost: 10, name: '90-Day Growth Roadmap' },
  'FEAT-ANL-001': { cost: 2, name: 'Executive Performance Memo' },
  'FEAT-ONB-001': { cost: 0, name: 'Document Ingestion (Onboarding)' },
  'FEAT-CAL-001': { cost: 0, name: 'Task / Calendar CRUD' },
  'FEAT-AI-CHAT': { cost: 2, name: 'Executive AI Strategist Chat' },
  'FEAT-ASSET-AI': { cost: 1, name: 'Unified AI Asset Analysis & Classification' },
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

    // Ensure wallet exists for workspace before holding
    await this.getWallet(workspaceId);

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

  public async commitReservation(
    workspaceId: string,
    reservationId: string,
    featureId = 'ASSET_AI_ANALYSIS'
  ): Promise<void> {
    await creditWalletRepository.commitCredits({
      workspaceId,
      reservationId,
      featureId,
    });
  }

  public async releaseReservation(
    workspaceId: string,
    reservationId: string,
    reason = 'Analysis execution aborted or failed'
  ): Promise<void> {
    await creditWalletRepository.refundCredits({
      workspaceId,
      reservationId,
      reason,
    });
  }
}

export const creditService = new CreditService();
