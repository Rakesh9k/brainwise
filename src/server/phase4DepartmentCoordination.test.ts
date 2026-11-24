/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

process.env.NODE_ENV = 'test';

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './app';
import { db } from './db/firestore';
import { departmentEventBus } from './events/eventBus';
import { businessProfileRepository } from './repositories/businessProfileRepository';
import { brandIdentityRepository } from './repositories/brandIdentityRepository';
import { productRepository } from './repositories/productRepository';
import { competitorRepository } from './repositories/goalRepository';
import { departmentTaskRepository } from './repositories/departmentTaskRepository';
import { departmentCoordinationService } from './services/departmentCoordinationService';
import { sharedBusinessContextService } from './services/sharedBusinessContextService';
import { departmentPermissionService } from './services/departmentPermissionService';
import { businessBrainService } from './services/businessBrainService';
import { documentExtractionService } from './services/documentExtractionService';
import { extractionJobRepository } from './repositories/extractionJobRepository';
import type { DepartmentContextResponse, StandardDepartmentTaskEntity } from './types/api';

test('PHASE 4 — MASTER SHARED DEPARTMENT INTELLIGENCE & COORDINATION SUITE', async (t) => {
  db.resetForTesting();
  departmentEventBus.resetForTesting();
  departmentCoordinationService.initEventSubscriptions();

  const app = createApp();
  const server = app.listen(0);
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const userHeaders = {
    Authorization: 'Bearer test-token-founder-alpha',
    'Content-Type': 'application/json',
  };

  const userBHeaders = {
    Authorization: 'Bearer test-token-founder-beta',
    'Content-Type': 'application/json',
  };

  let wsAId = '';
  let wsBId = '';

  try {
    // -------------------------------------------------------------------------
    // Setup: Initialize Two Workspaces (A and B for isolation checks)
    // -------------------------------------------------------------------------
    const resA = await fetch(`${baseUrl}/api/v1/workspaces`, {
      method: 'POST',
      headers: userHeaders,
      body: JSON.stringify({
        workspaceName: 'Apex Roasters Global',
        industry: 'Specialty Coffee',
        country: 'IN',
      }),
    });
    assert.strictEqual(resA.status, 201);
    const dataA = (await resA.json()) as any;
    wsAId = dataA.data.workspace.workspaceId;

    const resB = await fetch(`${baseUrl}/api/v1/workspaces`, {
      method: 'POST',
      headers: userBHeaders,
      body: JSON.stringify({
        workspaceName: 'Rival Coffee Labs',
        industry: 'Beverages',
        country: 'IN',
      }),
    });
    assert.strictEqual(resB.status, 201);
    const dataB = (await resB.json()) as any;
    wsBId = dataB.data.workspace.workspaceId;

    // Seed Workspace A Ground Truth Profile
    await businessProfileRepository.saveProfile({
      workspaceId: wsAId,
      version: 1,
      businessName: 'Apex Roasters Global',
      stage: 'Growing Business',
      industry: 'Specialty Coffee',
      tagline: 'Artisanal micro-roasted beans direct from estates',
      overviewSummary:
        'Direct-trade specialty coffee roaster serving cafes and subscribers nationwide.',
      valueProposition:
        'Estate-traceable, farm-gate price transparency with 48-hour roasting dispatch.',
      brandPositioning:
        'Premium artisanal single-origin coffee with ethical direct-trade credentials',
      customerPersonas: [
        {
          id: 'cp_1',
          name: 'Urban Coffee Connoisseur',
          segment: 'B2C',
          ageOrFirmographics: 'Ages 25-45, urban professionals',
          painPoints: ['Stale supermarket beans', 'Lack of origin transparency'],
          buyingTriggers: ['Fresh roast date', 'Complex tasting notes'],
          willingnessToPay: 'High',
          objections: ['High initial equipment cost'],
        } as any,
      ],
      resourcesAndConstraints: {
        marketingBudget: { monthly: 3500 },
        operatingCapacity: '2500 kg per month',
        explicitExclusions: ['No cash refunds after 14 days', 'No phone support on Sundays'],
      } as any,
      strategicMemory: {
        usedAngles: [],
        fatiguedThemes: [],
        explicitExclusions: [
          'No discounting below cost',
          'No sponsored gambling or crypto partnerships',
        ],
        lastUpdated: new Date().toISOString(),
      },
      provenance: {},
      lastUpdated: new Date().toISOString(),
    } as any);

    // Seed Brand Identity (with STRICT VIDEO EXCLUSION)
    await brandIdentityRepository.save({
      brandIdentityId: `brand_${wsAId}`,
      workspaceId: wsAId,
      version: 1,
      brandName: 'Apex Roasters',
      voice: ['Bold', 'Authentic', 'Artisanal'],
      wordsToUse: ['Micro-lot', 'Farm-gate', 'Single-origin', 'Direct-trade'],
      wordsToAvoid: ['Cheap', 'Commercial blend', 'Instant', 'Discount'],
      approvedClaims: ['100% Single-Origin Arabica', 'Directly sourced from estate partners'],
      restrictedClaims: ['100% Organic certified (pending USDA audit)'],
      visualStyle: {
        primaryColor: '#78350F',
        secondaryColor: '#D97706',
        typography: { fontFamily: 'Cinzel' },
      } as any,
      status: 'APPROVED',
      updatedAt: new Date().toISOString(),
    } as any);

    // Seed Verified Products
    await productRepository.createProduct({
      productId: 'prod_estate_blend',
      workspaceId: wsAId,
      name: 'Monsoon Malabar Estate Roast',
      category: 'Whole Bean',
      price: 24,
      currency: 'USD',
      description: 'Hand-picked low acidity micro-lot roasted to medium profile.',
      features: ['Estate harvested', '48-hr roast window', 'Whole bean nitrogen flush'],
      benefits: ['Gentle on stomach', 'Rich crema'],
      unitCost: 11,
      marginPercent: 54,
    } as any);

    // Seed Competitor Research
    await competitorRepository.create({
      competitorId: 'comp_blue_tokai',
      workspaceId: wsAId,
      name: 'Blue Tokai Coffee',
      website: 'https://bluetokaicoffee.com',
      strengths: ['Extensive cafe network', 'Brand awareness'],
      weaknesses: ['Higher delivery times for Tier 2 cities'],
      pricingTiers: ['$22 - $28 per 250g'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as any);

    // =========================================================================
    // Scenario 1: Research Finding Used in Marketing Strategy
    // =========================================================================
    await t.test('Scenario 1: Research finding informs Marketing strategy context', async () => {
      const res = await fetch(
        `${baseUrl}/api/v1/workspaces/${wsAId}/departments/MARKETING/context`,
        {
          headers: userHeaders,
        }
      );
      assert.strictEqual(res.status, 200);
      const body = (await res.json()) as { success: boolean; data: DepartmentContextResponse };

      assert.strictEqual(body.success, true);
      assert.strictEqual(body.data.department, 'MARKETING');
      // Verifies citations include both profile and verified competitor research
      const hasResearchCitation = body.data.supportingEvidence.some((c) =>
        c.title.includes('Competitor')
      );
      assert.strictEqual(hasResearchCitation, true);
      assert.strictEqual(body.data.departmentSlice?.monthlyBudget, 3500);
    });

    // =========================================================================
    // Scenario 2: Marketing Campaign Using Approved Brand Rules
    // =========================================================================
    await t.test(
      'Scenario 2: Marketing campaign enforces approved brand rules & forbidden terms',
      async () => {
        const res = await fetch(
          `${baseUrl}/api/v1/workspaces/${wsAId}/departments/MARKETING/context`,
          {
            headers: userHeaders,
          }
        );
        const body = (await res.json()) as { success: boolean; data: DepartmentContextResponse };

        const directives = body.data.brandDirectives;
        assert.ok(directives.voice.includes('Bold'));
        assert.ok(directives.wordsToAvoid.includes('Cheap'));
        assert.ok(directives.wordsToAvoid.includes('Discount'));
        assert.ok(directives.approvedClaims.includes('100% Single-Origin Arabica'));
        assert.ok(directives.restrictedClaims.some((c) => c.includes('pending USDA audit')));
      }
    );

    // =========================================================================
    // Scenario 3: Creative Generation Using Verified Product Information & SVG Only
    // =========================================================================
    await t.test(
      'Scenario 3: Creative generation is grounded in product data and enforces SVG-ONLY (No Video)',
      async () => {
        const res = await fetch(
          `${baseUrl}/api/v1/workspaces/${wsAId}/departments/CREATIVE/context`,
          {
            headers: userHeaders,
          }
        );
        const body = (await res.json()) as { success: boolean; data: DepartmentContextResponse };

        assert.strictEqual(body.data.department, 'CREATIVE');
        assert.strictEqual(body.data.brandDirectives.visualStyle?.svgOnly, true);
        assert.strictEqual(body.data.departmentSlice?.svgCollateralOnly, true);
        assert.strictEqual(body.data.departmentSlice?.videoGenerationExcluded, true);

        // Verify verified product info is present
        const product = body.data.relevantProducts.find((p) => p.id === 'prod_estate_blend');
        assert.ok(product);
        assert.strictEqual(product?.name, 'Monsoon Malabar Estate Roast');
        assert.strictEqual(product?.price, 24);

        // Verify constraint against video generation
        assert.ok(
          body.data.applicableConstraints.some((c) =>
            c.toLowerCase().includes('zero video generation')
          )
        );
      }
    );

    // =========================================================================
    // Scenario 4: Sales Insights Updating Customer Objections
    // =========================================================================
    await t.test(
      'Scenario 4: Sales insights update customer objections in Business Brain',
      async () => {
        // 1. Emit sales objection event
        await departmentEventBus.emit({
          workspaceId: wsAId,
          userId: 'sales_rep_1',
          eventType: 'SALES_OBJECTION_RECORDED',
          resourceId: 'persona_0',
          metadata: {
            objection: 'Subscription commitment length is too rigid',
            personaIndex: 0,
          },
        });

        // 2. Fetch fresh SALES context
        const res = await fetch(
          `${baseUrl}/api/v1/workspaces/${wsAId}/departments/SALES/context?bypassCache=true`,
          { headers: userHeaders }
        );
        const body = (await res.json()) as { success: boolean; data: DepartmentContextResponse };

        // 3. Verify objection catalog contains the new insight
        const objections = (body.data.departmentSlice?.objectionsCatalog as string[]) || [];
        assert.ok(objections.includes('Subscription commitment length is too rigid'));
      }
    );

    // =========================================================================
    // Scenario 5: Analytics Results Informing Business Strategy
    // =========================================================================
    await t.test(
      'Scenario 5: Analytics results dispatch coordination event to Strategy',
      async () => {
        const res = await departmentCoordinationService.dispatchCoordinationEvent({
          workspaceId: wsAId,
          sourceDepartment: 'ANALYTICS',
          targetDepartment: 'STRATEGY',
          eventType: 'CAMPAIGN_CONVERSION_ANOMALY',
          payload: {
            metric: 'CAC',
            observedChange: '+28%',
            recommendedAction: 'Pivot ad angle away from fatigued theme',
          },
        });

        assert.strictEqual(res.dispatched, true);
        assert.ok(res.event);
        assert.strictEqual(res.event?.eventType, 'DEPARTMENT_COORDINATION_EVENT');
        assert.strictEqual(res.event?.metadata?.sourceDepartment, 'ANALYTICS');
        assert.strictEqual(res.event?.metadata?.targetDepartment, 'STRATEGY');

        // Test cycle prevention: chain exceeding 3 hops is blocked
        const cycleTest = await departmentCoordinationService.dispatchCoordinationEvent({
          workspaceId: wsAId,
          sourceDepartment: 'STRATEGY',
          targetDepartment: 'MARKETING',
          eventType: 'TEST_CYCLE',
          payload: {},
          hopCount: 3,
          visitedDepartments: ['ANALYTICS', 'STRATEGY', 'GROWTH', 'MARKETING'],
        });
        assert.strictEqual(cycleTest.dispatched, false);
        assert.ok(cycleTest.reason?.includes('CYCLE_PREVENTION_BLOCKED'));
      }
    );

    // =========================================================================
    // Scenario 6: Financial Limits Affecting Campaign Recommendations
    // =========================================================================
    await t.test(
      'Scenario 6: Financial limits and budget ceilings constrain recommendations',
      async () => {
        const res = await fetch(
          `${baseUrl}/api/v1/workspaces/${wsAId}/departments/FINANCE/context`,
          {
            headers: userHeaders,
          }
        );
        const body = (await res.json()) as { success: boolean; data: DepartmentContextResponse };

        assert.strictEqual(body.data.department, 'FINANCE');
        assert.strictEqual(body.data.departmentSlice?.verifiedBudget, 3500);
        assert.strictEqual(body.data.departmentSlice?.financialAccessGranted, true);

        // Verify constraints array has budget ceiling
        assert.ok(
          body.data.applicableConstraints.some((c) => c.includes('Marketing Budget: $3500 / month'))
        );
      }
    );

    // =========================================================================
    // Scenario 7: Customer Policies Informing Customer Success
    // =========================================================================
    await t.test(
      'Scenario 7: Business operating policies ground Customer Success department',
      async () => {
        const res = await fetch(
          `${baseUrl}/api/v1/workspaces/${wsAId}/departments/CUSTOMER_SUCCESS/context`,
          { headers: userHeaders }
        );
        const body = (await res.json()) as { success: boolean; data: DepartmentContextResponse };

        assert.strictEqual(body.data.department, 'CUSTOMER_SUCCESS');
        const policies = (body.data.departmentSlice?.operatingPolicies as string[]) || [];
        assert.ok(policies.includes('No cash refunds after 14 days'));
        assert.ok(policies.includes('No phone support on Sundays'));
      }
    );

    // =========================================================================
    // Scenario 8: Business Profile Change Reflected Across Departments
    // =========================================================================
    await t.test(
      'Scenario 8: Profile change invalidates cache and reflects immediately across departments',
      async () => {
        // 1. Initial cached request
        await fetch(`${baseUrl}/api/v1/workspaces/${wsAId}/departments/MARKETING/context`, {
          headers: userHeaders,
        });

        // 2. Update profile name & positioning
        const existingProfile = await businessProfileRepository.getProfile(wsAId);
        await businessProfileRepository.saveProfile({
          ...existingProfile!,
          businessName: 'Apex Roasters Premier Reserve',
          brandPositioning: 'Ultra-exclusive estate single-origin coffee reserve',
        });

        // 3. Emit event (invalidating cache)
        await departmentEventBus.emit({
          workspaceId: wsAId,
          userId: 'admin',
          eventType: 'BUSINESS_PROFILE_UPDATED',
          resourceId: 'rootDoc',
        });

        // 4. Subsequent fetch without bypassCache reflects new name immediately
        const res = await fetch(
          `${baseUrl}/api/v1/workspaces/${wsAId}/departments/MARKETING/context`,
          {
            headers: userHeaders,
          }
        );
        const body = (await res.json()) as { success: boolean; data: DepartmentContextResponse };

        assert.strictEqual(body.data.businessIdentity.name, 'Apex Roasters Premier Reserve');
        assert.strictEqual(
          body.data.businessIdentity.positioning,
          'Ultra-exclusive estate single-origin coffee reserve'
        );
      }
    );

    // =========================================================================
    // Scenario 9: Rejected Recommendations Not Silently Executed
    // =========================================================================
    await t.test(
      'Scenario 9: Rejected tasks transition to CANCELLED and refuse silent execution',
      async () => {
        // 1. Submit task requiring approval
        const createRes = await fetch(
          `${baseUrl}/api/v1/workspaces/${wsAId}/departments/MARKETING/tasks`,
          {
            method: 'POST',
            headers: userHeaders,
            body: JSON.stringify({
              objective: 'Launch unbudgeted influencer campaign',
              requestedAction: 'DISPATCH_INFLUENCER_BRIEF',
              approvalRequirements: { required: true },
            }),
          }
        );
        assert.strictEqual(createRes.status, 201);
        const createBody = (await createRes.json()) as {
          success: boolean;
          data: StandardDepartmentTaskEntity;
        };
        assert.strictEqual(createBody.data.status, 'WAITING_APPROVAL');

        // 2. Reject task
        const rejectRes = await fetch(
          `${baseUrl}/api/v1/workspaces/${wsAId}/departments/MARKETING/tasks/${createBody.data.taskId}/reject`,
          {
            method: 'POST',
            headers: userHeaders,
            body: JSON.stringify({
              reason: 'Exceeds monthly marketing budget ceiling of $3,500',
            }),
          }
        );
        assert.strictEqual(rejectRes.status, 200);
        const rejectBody = (await rejectRes.json()) as {
          success: boolean;
          data: StandardDepartmentTaskEntity;
        };
        assert.strictEqual(rejectBody.data.status, 'CANCELLED');
        assert.strictEqual(rejectBody.data.approvalRequirements.rejected, true);

        // 3. Verify executor rejects execution
        await assert.rejects(
          async () => {
            await departmentCoordinationService.processTaskWithRetry(
              wsAId,
              createBody.data.taskId,
              async () => ({ executed: true })
            );
          },
          {
            message: /CANNOT_PROCESS: Task '.*' was rejected and cancelled/,
          }
        );
      }
    );

    // =========================================================================
    // Scenario 10: Unauthorized Department Data Access Blocked
    // =========================================================================
    await t.test(
      'Scenario 10: Role permissions and tenant isolation block unauthorized access',
      async () => {
        // A: Viewer cannot execute consequential tasks
        assert.strictEqual(
          departmentPermissionService.canExecuteTask('viewer', 'MARKETING', false),
          false
        );

        // B: Viewer cannot approve tasks
        assert.strictEqual(departmentPermissionService.canApprove('viewer'), false);

        // C: Non-finance role (member) accessing margins has unitCost and margin redacted
        const memberContext = await sharedBusinessContextService.getDepartmentContext({
          workspaceId: wsAId,
          department: 'MARKETING',
          userRole: 'member',
          bypassCache: true,
        });
        assert.ok(memberContext.dataRedactions.includes('product_margins'));
        assert.strictEqual(memberContext.relevantProducts[0].marginPercent, 'UNKNOWN');
        assert.strictEqual(memberContext.relevantProducts[0].unitCost, 'UNKNOWN');

        // D: Cross-tenant access blocked
        assert.throws(
          () => {
            departmentPermissionService.assertTenantAccess(wsBId, wsAId);
          },
          {
            message: /TENANT_ISOLATION_VIOLATION/,
          }
        );
      }
    );

    // =========================================================================
    // Scenario 11: Department Failure and Retry
    // =========================================================================
    await t.test(
      'Scenario 11: Department task failure triggers exponential backoff retry and succeeds',
      async () => {
        // 1. Submit regular task
        const { task } = await departmentCoordinationService.submitTask({
          workspaceId: wsAId,
          department: 'GROWTH_PLANNER',
          objective: 'Sync regional distributor inventory',
          requestedAction: 'SYNC_INVENTORY',
          inputContext: { region: 'South' },
          userRole: 'owner',
        });

        let attempts = 0;
        // 2. Process with failing executor for first 2 attempts, then succeed
        const completedTask = await departmentCoordinationService.processTaskWithRetry(
          wsAId,
          task.taskId,
          async () => {
            attempts++;
            if (attempts < 3) {
              throw new Error(`Transient network timeout on attempt ${attempts}`);
            }
            return { inventorySynced: true, count: 48 };
          }
        );

        assert.strictEqual(completedTask.status, 'COMPLETED');
        assert.strictEqual(completedTask.retryCount, 2);
        assert.strictEqual((completedTask.result as any)?.inventorySynced, true);
        assert.ok(completedTask.auditHistory.some((a) => a.action === 'TASK_RETRY_SCHEDULED'));
      }
    );

    // =========================================================================
    // Scenario 12: Duplicate Task Prevention
    // =========================================================================
    await t.test(
      'Scenario 12: Duplicate task submission is detected and prevented via idempotency',
      async () => {
        const idempotencyKey = 'idem_q4_sprint_launch_unique';

        // First submission
        const res1 = await departmentCoordinationService.submitTask({
          workspaceId: wsAId,
          department: 'MARKETING',
          objective: 'Produce Q4 Holiday Coffee Gift Box Flyer',
          requestedAction: 'GENERATE_SVG_COLLATERAL',
          inputContext: { campaign: 'holiday_gift_box_2026' },
          idempotencyKey,
          userRole: 'owner',
        });
        assert.strictEqual(res1.isDuplicate, false);

        // Second submission with identical key
        const res2 = await departmentCoordinationService.submitTask({
          workspaceId: wsAId,
          department: 'MARKETING',
          objective: 'Produce Q4 Holiday Coffee Gift Box Flyer',
          requestedAction: 'GENERATE_SVG_COLLATERAL',
          inputContext: { campaign: 'holiday_gift_box_2026' },
          idempotencyKey,
          userRole: 'owner',
        });
        assert.strictEqual(res2.isDuplicate, true);
        assert.strictEqual(res2.task.taskId, res1.task.taskId);

        // Verify only 1 task was stored
        const allTasks = await departmentTaskRepository.listByWorkspace(wsAId);
        const matchingTasks = allTasks.filter((t) => t.idempotencyKey === idempotencyKey);
        assert.strictEqual(matchingTasks.length, 1);
      }
    );

    // =========================================================================
    // Scenario 13: Cross-Department Cascade Alerts on Business Brain Mutations
    // =========================================================================
    await t.test(
      'Scenario 13: Core Business Brain mutations trigger cross-department cascade alerts on active drafts',
      async () => {
        // 1. Submit active draft tasks in Copywriting and Advertising
        const copyTask = await departmentCoordinationService.submitTask({
          workspaceId: wsAId,
          department: 'COPYWRITING',
          objective: 'Draft Social Ad Copy for Q4 Campaign',
          requestedAction: 'GENERATE_AD_COPY',
          inputContext: { targetPlatform: 'Instagram' },
          userRole: 'owner',
        });

        const adTask = await departmentCoordinationService.submitTask({
          workspaceId: wsAId,
          department: 'ADVERTISING',
          objective: 'Generate SVG Poster with pricing banner',
          requestedAction: 'GENERATE_SVG_BANNER',
          inputContext: { dimensions: '1080x1080' },
          userRole: 'owner',
        });

        assert.strictEqual(copyTask.task.regroundingRequired, undefined);
        assert.strictEqual(adTask.task.regroundingRequired, undefined);

        // 2. Founder modifies brand positioning and value proposition in Business Brain
        await businessBrainService.updateProfile(
          wsAId,
          {
            brandPositioning: 'Next-Gen Ultra-Premium Organic Single-Origin Espresso',
            valueProposition: 'Direct farm-to-cup craft coffee with 48h roast delivery',
          },
          'test_founder_user'
        );

        // 3. Verify that active drafts were flagged as "Requires Re-grounding"
        const regroundingTasks = await departmentCoordinationService.getRegroundingAlerts(wsAId);
        assert.ok(regroundingTasks.length >= 2);
        const flaggedCopy = regroundingTasks.find((t) => t.taskId === copyTask.task.taskId);
        assert.ok(flaggedCopy);
        assert.strictEqual(flaggedCopy?.regroundingRequired, true);
        assert.ok(flaggedCopy?.regroundingReason?.includes('brandPositioning'));
        assert.ok(flaggedCopy?.auditHistory?.some((a) => a.action === 'CASCADE_REGROUNDING_ALERT'));

        // 4. Acknowledge / Re-ground the task
        const resolvedTask = await departmentCoordinationService.acknowledgeOrRegroundTask({
          workspaceId: wsAId,
          taskId: copyTask.task.taskId,
          actorId: 'test_founder_user',
        });
        assert.strictEqual(resolvedTask.regroundingRequired, false);
        assert.ok(resolvedTask.regroundedAt);
        assert.ok(resolvedTask.auditHistory.some((a) => a.action === 'REGROUNDING_RESOLVED'));
      }
    );

    // =========================================================================
    // Scenario 14: Multi-Doc Discrepancy Matrix Resolution
    // =========================================================================
    await t.test(
      'Scenario 14: Multi-Doc Discrepancy Matrix aggregates conflicts and resolves with founder primacy',
      async () => {
        const now = new Date().toISOString();

        // 1. Ingest conflicting verification items from two distinct documents
        await extractionJobRepository.createVerificationItems(wsAId, [
          {
            itemId: `vitem_pitch_price_${Date.now()}`,
            workspaceId: wsAId,
            domain: 'products',
            fieldKey: 'product:Solstice Special Roast',
            proposedValue: '$22 / month',
            currentValue: '$26 / month',
            confidence: 0.94,
            sourceDocument: 'Pitch_Deck_v2_2026.pdf',
            status: 'pending',
            createdAt: now,
          },
          {
            itemId: `vitem_catalog_price_${Date.now()}`,
            workspaceId: wsAId,
            domain: 'products',
            fieldKey: 'product:Solstice Special Roast',
            proposedValue: '$29 / month',
            currentValue: '$26 / month',
            confidence: 0.81,
            sourceDocument: 'Legacy_Catalog_2024.pdf',
            status: 'pending',
            createdAt: now,
          },
        ]);

        // 2. Fetch Multi-Doc Discrepancy Matrix
        const matrix = await documentExtractionService.getMultiDocDiscrepancyMatrix(wsAId);
        assert.ok(matrix.totalDiscrepancies > 0);

        const pricingDiscrepancy = matrix.items.find(
          (i) => i.fieldKey === 'product:Solstice Special Roast'
        );
        assert.ok(pricingDiscrepancy);
        assert.strictEqual(pricingDiscrepancy?.severity, 'CRITICAL');
        assert.strictEqual(pricingDiscrepancy?.sources.length, 2);
        assert.strictEqual(pricingDiscrepancy?.recommendedSource, 'Pitch_Deck_v2_2026.pdf');
        assert.strictEqual(pricingDiscrepancy?.recommendedValue, '$22 / month');

        // 3. Resolve discrepancy by accepting Pitch Deck
        const resolved = await documentExtractionService.resolveDiscrepancy({
          workspaceId: wsAId,
          discrepancyId: pricingDiscrepancy!.discrepancyId,
          resolutionType: 'ACCEPT_SOURCE',
          selectedSource: 'Pitch_Deck_v2_2026.pdf',
          userId: 'test_founder_user',
        });

        assert.strictEqual(resolved.status, 'RESOLVED_ACCEPTED_DOC');
        assert.strictEqual(resolved.resolvedValue, '$22 / month');

        // 4. Verify Business Brain updated with USER_CONFIRMED provenance
        const updatedProfile = await businessProfileRepository.getProfile(wsAId);
        const provItem = updatedProfile?.provenance['product:Solstice Special Roast'];
        assert.ok(provItem);
        assert.strictEqual(provItem?.source, 'USER_CONFIRMED');
        assert.strictEqual(provItem?.confidence, 1.0);
      }
    );
  } finally {
    server.close();
  }
});
