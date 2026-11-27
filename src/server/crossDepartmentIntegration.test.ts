/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { departmentCoordinationService } from './services/departmentCoordinationService';
import { departmentPermissionService } from './services/departmentPermissionService';
import { sharedBusinessContextService } from './services/sharedBusinessContextService';
import { businessProfileRepository } from './repositories/businessProfileRepository';
import { departmentTaskRepository } from './repositories/departmentTaskRepository';
import { taskRepository } from './repositories/taskRepository';
import { actionableRecommendationEngine } from './services/actionableRecommendationEngine';
import { departmentEventBus } from './events/eventBus';

describe('PHASE 10: CROSS-DEPARTMENT INTEGRATION & PERMISSION BOUNDARIES SUITE', () => {
  const wsId = `ws_cross_dept_${Date.now()}`;

  before(() => {
    departmentCoordinationService.initEventSubscriptions();
  });

  it('1. Business Brain updates automatically trigger cross-department cascade re-grounding alerts', async () => {
    // 1. Setup workspace profile
    await businessProfileRepository.saveProfile({
      workspaceId: wsId,
      businessName: 'Solstice Craft Coffee Roasters',
      industry: 'Specialty Beverage',
      category: 'Artisan Coffee',
      stage: 'growth',
      version: 1,
      valueProposition: 'Direct-trade estate Arabica roasted fresh within 48 hours of dispatch.',
      customerPersonas: [
        {
          name: 'Home Brewer Enthusiast',
          painPoints: ['Supermarket beans are stale'],
          buyingMotivations: ['Peak freshness'],
        },
      ],
      resourcesAndConstraints: {
        grossMarginPercent: 72,
      },
      provenance: {
        businessName: { source: 'USER_CONFIRMED', verifiedAt: new Date().toISOString() },
      },
    } as any);

    // 2. Create active draft tasks in Marketing and Copywriting
    const task1 = await departmentTaskRepository.create({
      taskId: `task_copy_${Date.now()}`,
      workspaceId: wsId,
      department: 'COPYWRITING',
      title: 'Draft Q4 Artisan Roast Brochure Copy',
      description: 'Highlight single-origin harvest dates',
      status: 'PENDING',
      requestedAction: 'GENERATE_COPY',
      inputContext: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const task2 = await departmentTaskRepository.create({
      taskId: `task_mktg_${Date.now()}`,
      workspaceId: wsId,
      department: 'MARKETING',
      title: 'Pricing Card Static Carousel',
      description: 'Display standard 250g bean prices',
      status: 'QUEUED',
      requestedAction: 'GENERATE_CAROUSEL',
      inputContext: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // 3. Emit BUSINESS_PROFILE_UPDATED with modified price & value prop
    await departmentEventBus.emit({
      workspaceId: wsId,
      userId: 'founder@solsticecoffee.com',
      eventType: 'BUSINESS_PROFILE_UPDATED',
      resourceId: `profile_${wsId}`,
      metadata: { changedFields: ['valueProposition', 'unitEconomics'] },
    });

    // Verify task 1 received regrounding alert
    const updatedTask1 = await departmentTaskRepository.findById(wsId, task1.taskId);
    assert.ok(updatedTask1);
    assert.equal(updatedTask1.regroundingRequired, true);
    assert.ok(updatedTask1.regroundingReason?.includes('valueProposition'));
    assert.ok(updatedTask1.auditHistory?.some((h) => h.action === 'CASCADE_REGROUNDING_ALERT'));

    // Verify task 2 received regrounding alert
    const updatedTask2 = await departmentTaskRepository.findById(wsId, task2.taskId);
    assert.ok(updatedTask2);
    assert.equal(updatedTask2.regroundingRequired, true);
  });

  it('2. Sales objections recorded automatically propagate to customer personas in Business Brain', async () => {
    // Emit SALES_OBJECTION_RECORDED
    const objectionText = 'Subscription shipping to Tier-2 cities takes more than 5 days.';

    await departmentEventBus.emit({
      workspaceId: wsId,
      userId: 'support_agent_01',
      eventType: 'SALES_OBJECTION_RECORDED',
      resourceId: `obj_${Date.now()}`,
      metadata: {
        objection: objectionText,
        personaIndex: 0,
      },
    });

    const updatedProfile = await businessProfileRepository.getProfile(wsId);
    assert.ok(updatedProfile?.customerPersonas && updatedProfile.customerPersonas.length > 0);

    const persona = updatedProfile.customerPersonas[0];
    const objections = (persona as any).objections || [];
    assert.ok(
      objections.includes(objectionText),
      'Objection must automatically sync to persona in Business Brain'
    );
  });

  it('3. Competitor and audience changes trigger cascade cache invalidation and re-grounding', async () => {
    let capturedAlert: any = null;
    const unsub = departmentEventBus.subscribe('DEPARTMENT_REGROUNDING_ALERT', (evt) => {
      capturedAlert = evt;
    });

    // Emit COMPETITOR_CHANGED
    await departmentEventBus.emit({
      workspaceId: wsId,
      userId: 'market_watch_agent',
      eventType: 'COMPETITOR_CHANGED',
      resourceId: 'comp_blue_tokai',
    });

    unsub();

    assert.ok(capturedAlert);
    assert.equal(capturedAlert.workspaceId, wsId);
    assert.ok(capturedAlert.metadata.affectedTaskIds.length >= 1);
  });

  it('4. Recommendation approval automatically spawns tasks across assigned departments', async () => {
    const report = await actionableRecommendationEngine.generatePrioritizedRecommendations(wsId);
    const primaryRec = report.primaryFocusRecommendation;

    const conversion = await actionableRecommendationEngine.approveAndConvertToTasks({
      workspaceId: wsId,
      recommendationId: primaryRec.recommendationId,
      approvedBy: 'founder@solsticecoffee.com',
    });

    assert.equal(conversion.recommendation.approvalStatus, 'CONVERTED_TO_TASKS');
    assert.ok(conversion.createdTasks.length >= 2);

    // Verify departments: at least Product and Marketing
    const depts = conversion.createdTasks.map((t) => t.department);
    assert.ok(depts.includes('Product'));
    assert.ok(depts.includes('Marketing'));

    // Check TaskRepository
    for (const t of conversion.createdTasks) {
      const stored = await taskRepository.findById(wsId, t.taskId);
      assert.ok(stored);
      assert.equal(stored.workspaceId, wsId);
      assert.equal(stored.status, 'todo');
    }
  });

  it('5. Enforces department-level RBAC and sensitive financial isolation', () => {
    // 1. Finance Department Sensitivity
    assert.equal(departmentPermissionService.canAccessFinancialMargins('owner', 'FINANCE'), true);
    assert.equal(departmentPermissionService.canAccessFinancialMargins('admin', 'FINANCE'), true);
    assert.equal(departmentPermissionService.canAccessFinancialMargins('member', 'FINANCE'), false);
    assert.equal(departmentPermissionService.canAccessFinancialMargins('viewer', 'FINANCE'), false);

    // 2. Marketing / Creative Sensitivity (financial margins masked for marketing roles)
    assert.equal(departmentPermissionService.canAccessFinancialMargins('member', 'MARKETING'), false);
    assert.equal(departmentPermissionService.canAccessFinancialMargins('viewer', 'MARKETING'), false);

    // 3. Consequential Execution Permissions
    assert.equal(departmentPermissionService.canExecuteTask('owner', 'STRATEGY', true), true);
    assert.equal(departmentPermissionService.canExecuteTask('member', 'MARKETING', true), false);
    assert.equal(departmentPermissionService.canExecuteTask('viewer', 'MARKETING', false), false);

    // 4. General Department Access
    assert.equal(departmentPermissionService.canAccessDepartment('member', 'CREATIVE'), true);
    assert.equal(departmentPermissionService.canAccessDepartment('viewer', 'ANALYTICS'), true);

    // 5. Tenant Access Isolation
    assert.doesNotThrow(() => departmentPermissionService.assertTenantAccess('tenant_a', 'tenant_a'));
    assert.throws(() => departmentPermissionService.assertTenantAccess('tenant_a', 'tenant_b'));
  });
});
