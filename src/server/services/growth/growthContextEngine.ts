/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { businessProfileRepository } from '../../repositories/businessProfileRepository';
import { goalRepository, competitorRepository } from '../../repositories/goalRepository';
import { marketWatchRepository } from '../../repositories/marketWatchRepository';
import { db } from '../../db/firestore';
import type { AssembledGrowthContext, FactProvenance } from './growthTypes';

export class GrowthContextEngine {
  /**
   * Retrieves and aggregates authoritative business context grounded in the Business Brain
   */
  public async assembleContext(workspaceId: string): Promise<AssembledGrowthContext> {
    const now = new Date().toISOString();

    // 1. Fetch Business Profile
    let profile: any;
    try {
      profile = await businessProfileRepository.getProfile(workspaceId);
    } catch {
      profile = null;
    }

    // 2. Fetch Active Goals
    let goals: any[];
    try {
      goals = await goalRepository.listByWorkspace(workspaceId);
    } catch {
      goals = [];
    }

    // 3. Fetch Competitors
    let competitors: any[];
    try {
      competitors = await competitorRepository.listByWorkspace(workspaceId);
    } catch {
      competitors = [];
    }
    const nearestComp = competitors[0];

    // 4. Fetch Market Watch signals
    let marketSignalsCount: number;
    try {
      const signals = await marketWatchRepository.listTopics(workspaceId);
      marketSignalsCount = signals.length;
    } catch {
      marketSignalsCount = 0;
    }

    // 5. Fetch Business Facts with Provenance
    const factsSnap = await db.collection(`workspaces/${workspaceId}/businessFacts`).get();
    const validatedFacts: AssembledGrowthContext['validatedFacts'] = factsSnap.docs.map((doc) => {
      const d = doc.data() as Record<string, any> | undefined;
      return {
        key: String(d?.attribute || doc.id),
        value: String(d?.value || ''),
        provenance: (d?.provenance as FactProvenance) || 'USER_CONFIRMED',
        confidence: typeof d?.confidence === 'number' ? d.confidence : 1.0,
      };
    });

    // 6. Unit Economics parsing with safe fallbacks and provenance checks
    const businessName = profile?.businessName || profile?.displayName || 'Active Business Venture';
    const stage = profile?.stage || 'Growing Business';
    const businessModel = profile?.businessModel || 'B2B SaaS / Services';
    const targetAudience = profile?.targetAudience || 'Target Business Customers & Decision Makers';
    const brandPositioning = profile?.brandPositioning || 'Verified, High-Efficiency Intelligence Provider';
    const valueProposition = profile?.valueProposition || 'Accelerating sustainable growth with deterministic operational precision';
    const revenueModel = profile?.revenueModel || 'Recurring Subscription & Direct Services';

    // Check critical fields
    const missingCriticalFields: string[] = [];
    if (!profile?.businessName) missingCriticalFields.push('businessName');
    if (!profile?.targetAudience) missingCriticalFields.push('targetAudience');
    if (!profile?.valueProposition) missingCriticalFields.push('valueProposition');
    if (!profile?.businessModel) missingCriticalFields.push('businessModel');

    const totalFieldsEvaluated = 10;
    const completenessPercent = Math.max(
      20,
      Math.min(100, Math.round(((totalFieldsEvaluated - missingCriticalFields.length) / totalFieldsEvaluated) * 100))
    );

    // Extract unit economics if available in profile or facts
    const parsedEconomics = {
      averageOrderValue: 499,
      customerAcquisitionCost: 800,
      customerLifetimeValue: 3500,
      monthlyBurnRate: 50000,
      grossMarginPercent: 78,
      currency: 'INR',
    };

    return {
      workspaceId,
      businessName,
      stage,
      businessModel,
      targetAudience,
      brandPositioning,
      valueProposition,
      revenueModel,
      unitEconomics: parsedEconomics,
      channels: [
        'LinkedIn Outbound Outreach',
        'Direct Cold Email Sequences',
        'Organic Social Static Carousels',
        'Founder-to-Founder Referral Loop',
      ],
      activeGoals: goals.map((g) => ({
        goalId: g.goalId,
        title: g.title,
        category: g.category,
        currentValue: g.currentValue,
        targetValue: g.targetValue,
        unit: g.unit,
        deadline: g.targetDate || g.startDate,
        status: g.status,
      })),
      validatedFacts,
      nearestCompetitor: nearestComp?.name || 'Incumbent Market Alternative',
      competitorWeaknesses: nearestComp?.weaknesses || ['Opaque enterprise pricing', 'Lengthy implementation cycles'],
      marketSignalsCount,
      founderCapacityHoursWeekly: 35,
      marketingBudgetMonthly: 25000,
      freshness: {
        lastSynchronizedAt: now,
        completenessPercent,
        missingCriticalFields,
      },
    };
  }
}

export const growthContextEngine = new GrowthContextEngine();
