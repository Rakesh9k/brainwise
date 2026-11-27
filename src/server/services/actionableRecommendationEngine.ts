/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { businessProfileRepository } from '../repositories/businessProfileRepository';
import { productRepository } from '../repositories/productRepository';
import { brandIdentityRepository } from '../repositories/brandIdentityRepository';
import { taskRepository } from '../repositories/taskRepository';
import { businessDiagnosisEngine } from './businessDiagnosisEngine';
import { competitiveStrategyEngine } from './competitiveStrategyEngine';
import { customerIntelligenceEngine } from './customerIntelligenceEngine';
import { departmentEventBus } from '../events/eventBus';
import type { GrowthTaskEntity } from '../types/api';

export type RecommendationPriorityTier = 'P0_CRITICAL' | 'P1_HIGH' | 'P2_MEDIUM' | 'P3_LOW';

export interface PlaybookStep {
  stepNumber: number;
  actionTitle: string;
  department: 'Marketing' | 'Product' | 'Sales' | 'Operations' | 'Finance' | 'Growth';
  estimatedHours: number;
  estimatedBudget: number;
  deliverable: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface ActionableRecommendation {
  recommendationId: string;
  workspaceId: string;
  title: string;
  category: 'CONVERSION' | 'UNIT_ECONOMICS' | 'ACQUISITION' | 'RETENTION' | 'BRAND_POSITIONING';
  priorityTier: RecommendationPriorityTier;
  problemStatement: string;
  solutionOverview: string;
  scoring: {
    reach: number;
    impact: number; // 1 to 10
    confidence: number; // 0.1 to 1.0
    effort: number; // 1 to 10
    riceScore: number;
    iceScore: number;
  };
  playbookSteps: PlaybookStep[];
  expectedImpact: {
    metricName: string;
    targetLiftPercent: number;
    estimatedMonthlyRevenueLift: number;
  };
  requiresHumanApproval: boolean;
  approvalStatus: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'CONVERTED_TO_TASKS';
  approvedBy?: string;
  approvedAt?: string;
  whatNotToDoWarning?: string;
}

export interface ProhibitedActionDirective {
  directiveId: string;
  prohibitedAction: string;
  rationale: string;
  consequenceIfViolated: string;
  riskCategory: 'CAPITAL_WASTE' | 'BRAND_DILUTION' | 'MARGIN_EROSION' | 'OPERATIONAL_CHAOS';
}

export class ActionableRecommendationEngine {
  /**
   * Generates prioritized, sequenced recommendations scored via RICE and ICE
   */
  public async generatePrioritizedRecommendations(
    workspaceId: string
  ): Promise<{
    recommendations: ActionableRecommendation[];
    prohibitedDirectives: ProhibitedActionDirective[];
    primaryFocusRecommendation: ActionableRecommendation;
  }> {
    const profile = await businessProfileRepository.getProfile(workspaceId);
    const diagnosis = await businessDiagnosisEngine.diagnoseBusiness(workspaceId);
    const products = await productRepository.listProducts(workspaceId);

    const businessName = profile?.businessName || 'Business';
    const subIndustry = (profile?.subIndustry || profile?.category || profile?.industry || '').toLowerCase();
    const primaryConstraint = diagnosis.primaryConstraint;
    const now = new Date().toISOString();

    const prices = products.map((p) => p.price).filter((pr): pr is number => typeof pr === 'number' && pr > 0);
    const avgPrice = prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 450;

    const recommendations: ActionableRecommendation[] = [];

    // 1. Primary Constraint Remediation Recommendation (P0_CRITICAL)
    recommendations.push({
      recommendationId: `rec_${workspaceId}_primary_constraint`,
      workspaceId,
      title: `Eliminate Primary Bottleneck: ${primaryConstraint.title}`,
      category: primaryConstraint.dimension === 'FUNNEL_VELOCITY' ? 'CONVERSION' : 'UNIT_ECONOMICS',
      priorityTier: 'P0_CRITICAL',
      problemStatement: primaryConstraint.bindingProblem,
      solutionOverview: primaryConstraint.theoryOfConstraintsExplanation,
      scoring: {
        reach: 4500,
        impact: 9,
        confidence: 0.95,
        effort: 4,
        riceScore: Math.round((4500 * 9 * 0.95) / 4),
        iceScore: Math.round(9 * 0.95 * (11 - 4) * 10),
      },
      playbookSteps: [
        {
          stepNumber: 1,
          actionTitle: 'Roast Date & Freshness Proof Badge on Product Pages',
          department: 'Product',
          estimatedHours: 8,
          estimatedBudget: 0,
          deliverable: 'Visual SVG freshness seal placed above Add to Cart button',
          riskLevel: 'LOW',
        },
        {
          stepNumber: 2,
          actionTitle: 'Deploy 5-Slide Static Carousel Highlighting Direct-Trade Transparency',
          department: 'Marketing',
          estimatedHours: 6,
          estimatedBudget: 2500,
          deliverable: 'BrandStudio high-DPI carousel asset with farm coordinates',
          riskLevel: 'LOW',
        },
        {
          stepNumber: 3,
          actionTitle: '1-Click Checkout Simplification',
          department: 'Product',
          estimatedHours: 12,
          estimatedBudget: 0,
          deliverable: 'Checkout flow reduced from 4 steps to 1 click with Google Pay/UPI',
          riskLevel: 'MEDIUM',
        },
      ],
      expectedImpact: {
        metricName: 'Checkout Conversion Rate',
        targetLiftPercent: 28,
        estimatedMonthlyRevenueLift: avgPrice * 75,
      },
      requiresHumanApproval: true,
      approvalStatus: 'PENDING_APPROVAL',
      whatNotToDoWarning: 'Do NOT run paid advertising campaigns until checkout conversion rate exceeds 2.2%.',
    });

    // 2. Unit Economics / Tasting Flight Upsell (P1_HIGH)
    recommendations.push({
      recommendationId: `rec_${workspaceId}_tasting_flight_upsell`,
      workspaceId,
      title: 'Deploy 3-Roast Discovery Flight Bundle Architecture',
      category: 'UNIT_ECONOMICS',
      priorityTier: 'P1_HIGH',
      problemStatement: `Catalog average unit price is ₹${avgPrice}, creating high CAC payback pressure. Single-bag purchases yield thin net contribution after shipping.`,
      solutionOverview: 'Introduce a 3-Roast Discovery Flight at ₹850 promoted dynamically in the cart drawer to lift Average Order Value by 40%.',
      scoring: {
        reach: 1200,
        impact: 8,
        confidence: 0.90,
        effort: 3,
        riceScore: Math.round((1200 * 8 * 0.90) / 3),
        iceScore: Math.round(8 * 0.90 * (11 - 3) * 10),
      },
      playbookSteps: [
        {
          stepNumber: 1,
          actionTitle: 'Bundle Packaging Specification & Pricing Rule',
          department: 'Operations',
          estimatedHours: 4,
          estimatedBudget: 1500,
          deliverable: '3x100g discovery pouch packaging spec and catalog SKU',
          riskLevel: 'LOW',
        },
        {
          stepNumber: 2,
          actionTitle: 'Configure Cart Drawer Upsell Suggestion',
          department: 'Product',
          estimatedHours: 5,
          estimatedBudget: 0,
          deliverable: '1-click add-to-cart upgrade button in slide-out cart',
          riskLevel: 'LOW',
        },
      ],
      expectedImpact: {
        metricName: 'Average Order Value (AOV)',
        targetLiftPercent: 35,
        estimatedMonthlyRevenueLift: 400 * 120,
      },
      requiresHumanApproval: false,
      approvalStatus: 'PENDING_APPROVAL',
    });

    // 3. Prohibited Action Directives ("What NOT To Do")
    const prohibitedDirectives: ProhibitedActionDirective[] = [
      {
        directiveId: `dir_no_video_${workspaceId}`,
        prohibitedAction: 'Do NOT invest capital, tools, or time in AI video generation, video editing, or animated video reels.',
        rationale: 'BrainWise adheres to strict video exclusion. Video pipelines burn capital with high latency and zero attribution.',
        consequenceIfViolated: 'Immediate capital waste and distraction from proven high-converting static vector collateral.',
        riskCategory: 'CAPITAL_WASTE',
      },
      {
        directiveId: `dir_no_discount_${workspaceId}`,
        prohibitedAction: 'Do NOT execute reactive price slashes or 50% discount clearances to drive short-term volume.',
        rationale: 'Erodes premium brand positioning and irreversibly cuts gross contribution margins.',
        consequenceIfViolated: 'Brand dilution and loss of margin resilience against raw material price inflation.',
        riskCategory: 'MARGIN_EROSION',
      },
      {
        directiveId: `dir_no_premature_ads_${workspaceId}`,
        prohibitedAction: 'Do NOT scale Meta/Google ad spend while conversion rate is below 2.0%.',
        rationale: 'Pouring traffic into a leaky checkout funnel accelerates capital burn without compounding growth.',
        consequenceIfViolated: 'Customer Acquisition Cost (CAC) will spike, causing negative unit economics.',
        riskCategory: 'CAPITAL_WASTE',
      },
    ];

    return {
      recommendations,
      prohibitedDirectives,
      primaryFocusRecommendation: recommendations[0],
    };
  }

  /**
   * Approves a recommendation and converts its playbook steps into active tasks
   */
  public async approveAndConvertToTasks(params: {
    workspaceId: string;
    recommendationId: string;
    approvedBy: string;
  }): Promise<{
    recommendation: ActionableRecommendation;
    createdTasks: GrowthTaskEntity[];
  }> {
    const { workspaceId, recommendationId, approvedBy } = params;
    const { recommendations } = await this.generatePrioritizedRecommendations(workspaceId);

    const rec = recommendations.find((r) => r.recommendationId === recommendationId);
    if (!rec) {
      throw new Error(`Recommendation '${recommendationId}' not found in workspace '${workspaceId}'.`);
    }

    rec.approvalStatus = 'CONVERTED_TO_TASKS';
    rec.approvedBy = approvedBy;
    rec.approvedAt = new Date().toISOString();

    const createdTasks: GrowthTaskEntity[] = [];

    for (const step of rec.playbookSteps) {
      const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const task: GrowthTaskEntity = {
        taskId,
        workspaceId,
        title: `[${step.department}] Step ${step.stepNumber}: ${step.actionTitle}`,
        description: `Deliverable: ${step.deliverable}. Estimated Hours: ${step.estimatedHours}. Budget: ₹${step.estimatedBudget}. Risk: ${step.riskLevel}.`,
        department: step.department as any,
        status: 'todo',
        priority: rec.priorityTier === 'P0_CRITICAL' ? 'urgent' : 'high',
        assignedTo: step.department,
        dueDate: new Date(Date.now() + step.stepNumber * 7 * 86400000).toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await taskRepository.create(task);
      createdTasks.push(task);

      // Emit event on DepartmentEventBus
      await departmentEventBus.emit({
        businessId: workspaceId,
        workspaceId,
        userId: approvedBy,
        eventType: 'TASK_CREATED',
        resourceId: taskId,
        metadata: { recommendationId, stepNumber: step.stepNumber },
      });
    }

    return {
      recommendation: rec,
      createdTasks,
    };
  }
}

export const actionableRecommendationEngine = new ActionableRecommendationEngine();
