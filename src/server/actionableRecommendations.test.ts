/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { actionableRecommendationEngine } from './services/actionableRecommendationEngine';
import { businessProfileRepository } from './repositories/businessProfileRepository';
import { productRepository } from './repositories/productRepository';
import { brandIdentityRepository } from './repositories/brandIdentityRepository';
import { taskRepository } from './repositories/taskRepository';
import { departmentEventBus } from './events/eventBus';
import { sharedBusinessContextService } from './services/sharedBusinessContextService';

describe('PHASE 9: ACTIONABLE RECOMMENDATION ENGINE SUITE', () => {
  const wsId = `ws_rec_${Date.now()}`;

  it('1. Generates RICE and ICE scored recommendations with sequenced tactical playbooks', async () => {
    // 1. Setup workspace profile
    await businessProfileRepository.saveProfile({
      workspaceId: wsId,
      businessName: 'Solstice Craft Coffee Roasters',
      industry: 'Specialty Beverage',
      category: 'Artisan Coffee',
      subIndustry: 'Third-Wave Coffee Roastery',
      location: 'Bangalore, India',
      stage: 'growth',
      version: 1,
      valueProposition: 'Direct-trade estate Arabica roasted fresh within 48 hours of dispatch.',
      customerPersonas: [
        {
          name: 'Home Brewer Enthusiast',
          painPoints: ['Supermarket beans are stale with no roast date transparency'],
          buyingMotivations: ['Peak flavor extraction and freshness guarantee'],
        },
      ],
      resourcesAndConstraints: {
        monthlyMarketingBudget: 15000,
        grossMarginPercent: 72,
      },
      provenance: {
        businessName: { source: 'USER_CONFIRMED', verifiedAt: new Date().toISOString() },
        valueProposition: { source: 'USER_CONFIRMED', verifiedAt: new Date().toISOString() },
      },
    } as any);

    await productRepository.createProduct({
      workspaceId: wsId,
      productId: 'prod_estate_blend',
      name: 'Monsoon Malabar Single Estate (250g)',
      price: 450,
      category: 'Whole Bean Coffee',
      source: 'USER_CONFIRMED',
      inStock: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    sharedBusinessContextService.invalidateCache(wsId);

    const report = await actionableRecommendationEngine.generatePrioritizedRecommendations(wsId);

    assert.ok(report.recommendations.length >= 2);
    assert.ok(report.primaryFocusRecommendation);
    assert.equal(report.primaryFocusRecommendation.priorityTier, 'P0_CRITICAL');

    // Verify RICE & ICE scoring on primary recommendation
    const rec1 = report.primaryFocusRecommendation;
    assert.ok(rec1.scoring.riceScore > 0);
    assert.ok(rec1.scoring.iceScore > 0);
    assert.equal(rec1.scoring.impact, 9);
    assert.equal(rec1.scoring.confidence, 0.95);

    // Verify Sequenced Playbook Steps
    assert.ok(rec1.playbookSteps.length >= 2);
    for (const step of rec1.playbookSteps) {
      assert.ok(step.stepNumber >= 1);
      assert.ok(step.actionTitle.length > 0);
      assert.ok(['Marketing', 'Product', 'Sales', 'Operations', 'Finance', 'Growth'].includes(step.department));
      assert.ok(step.estimatedHours > 0);
      assert.ok(step.deliverable.length > 0);
      assert.ok(['LOW', 'MEDIUM', 'HIGH'].includes(step.riskLevel));

      // Strict video exclusion in deliverables
      assert.ok(!step.deliverable.toLowerCase().includes('video'));
      assert.ok(!step.deliverable.toLowerCase().includes('reel'));
    }
  });

  it('2. Enforces high-conviction "What NOT To Do" negative recommendations', async () => {
    const report = await actionableRecommendationEngine.generatePrioritizedRecommendations(wsId);

    assert.ok(report.prohibitedDirectives.length >= 3);

    const videoDirective = report.prohibitedDirectives.find((d) => d.directiveId.includes('no_video'))!;
    assert.ok(videoDirective);
    assert.ok(videoDirective.prohibitedAction.includes('NOT'));
    assert.ok(videoDirective.prohibitedAction.toLowerCase().includes('video'));
    assert.equal(videoDirective.riskCategory, 'CAPITAL_WASTE');

    const discountDirective = report.prohibitedDirectives.find((d) => d.directiveId.includes('no_discount'))!;
    assert.ok(discountDirective);
    assert.equal(discountDirective.riskCategory, 'MARGIN_EROSION');

    const prematureAdDirective = report.prohibitedDirectives.find((d) => d.directiveId.includes('no_premature_ads'))!;
    assert.ok(prematureAdDirective);
  });

  it('3. Human Approval Workflow: converts approved recommendation into active growth tasks', async () => {
    const report = await actionableRecommendationEngine.generatePrioritizedRecommendations(wsId);
    const targetRec = report.primaryFocusRecommendation;

    const capturedTaskEvents: any[] = [];
    const unsub = departmentEventBus.subscribe('TASK_CREATED', (evt) => {
      capturedTaskEvents.push(evt);
    });

    const conversionResult = await actionableRecommendationEngine.approveAndConvertToTasks({
      workspaceId: wsId,
      recommendationId: targetRec.recommendationId,
      approvedBy: 'founder@solsticecoffee.com',
    });

    unsub();

    assert.equal(conversionResult.recommendation.approvalStatus, 'CONVERTED_TO_TASKS');
    assert.equal(conversionResult.recommendation.approvedBy, 'founder@solsticecoffee.com');
    assert.ok(conversionResult.createdTasks.length >= 2);
    assert.equal(capturedTaskEvents.length, conversionResult.createdTasks.length);

    // Verify tasks in taskRepository
    const storedTasks = await taskRepository.listByWorkspace(wsId);
    assert.ok(storedTasks.length >= conversionResult.createdTasks.length);

    for (const t of conversionResult.createdTasks) {
      assert.ok(t.title.includes('Step'));
      assert.equal(t.status, 'todo');
      assert.ok(['urgent', 'high'].includes(t.priority));
    }
  });
});
