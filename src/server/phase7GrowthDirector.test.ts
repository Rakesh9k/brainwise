/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { growthDirectorService } from './services/growthDirectorService';
import { taskRepository } from './repositories/taskRepository';
import { db } from './db/firestore';

describe('PHASE 7 — MASTER GROWTH DIRECTOR & EXECUTION MANAGEMENT SUITE', () => {
  const workspaceA = `ws_growth_phase7_test_a_${Date.now()}`;
  const workspaceB = `ws_growth_phase7_test_b_${Date.now()}`;

  // ---------------------------------------------------------------------------
  // 1. Deterministic ICE Scoring Formula
  // ---------------------------------------------------------------------------
  it('1. Computes deterministic ICE scores with 1-10 clamping and composite multiplication', () => {
    const score1 = growthDirectorService.calculateIceScore(8, 9, 8);
    assert.equal(score1.impact, 8);
    assert.equal(score1.confidence, 9);
    assert.equal(score1.ease, 8);
    assert.equal(score1.compositeScore, 8 * 9 * 8); // 576

    // Out-of-bounds clamping
    const scoreClamped = growthDirectorService.calculateIceScore(15, -2, 7.4);
    assert.equal(scoreClamped.impact, 10);
    assert.equal(scoreClamped.confidence, 1);
    assert.equal(scoreClamped.ease, 7);
    assert.equal(scoreClamped.compositeScore, 70);
  });

  // ---------------------------------------------------------------------------
  // 2. Multi-Horizon Roadmap & Anti-Vague Task Generation
  // ---------------------------------------------------------------------------
  it('2. Generates multi-horizon operational roadmap enforcing the Anti-Vague task mandate', async () => {
    const roadmap = await growthDirectorService.generateOperationalRoadmap({
      workspaceId: workspaceA,
    });

    assert.ok(roadmap.roadmapId.startsWith('rdm_'));
    assert.equal(roadmap.workspaceId, workspaceA);
    assert.ok(roadmap.opportunities.length >= 2);
    assert.ok(roadmap.tasks.length >= 4);

    // Verify horizon counts
    assert.ok(roadmap.horizonCounts.immediate7Days >= 1);
    assert.ok(roadmap.horizonCounts.shortTerm30Days >= 1);
    assert.ok(roadmap.horizonCounts.mediumTerm90Days >= 1);

    // Verify Anti-Vague requirements on every generated task
    for (const task of roadmap.tasks) {
      assert.ok(task.title.length > 5, 'Title must not be empty');
      assert.ok(task.specificAction.length > 25, 'Specific action must be detailed and non-vague');
      assert.ok(task.expectedOutcome.length > 15, 'Expected outcome must be concrete');
      assert.ok(task.estimatedEffortHours > 0, 'Estimated effort hours must be positive');
      assert.ok(task.dependencies.length > 0, 'Must specify dependencies');
      assert.ok(task.suggestedTools.length > 0, 'Must recommend specific tools');
      assert.ok(task.completionCriteria.length > 20, 'Completion criteria must be unambiguous');
      assert.ok(task.iceScore.compositeScore > 0, 'Must have valid ICE score');
      assert.ok(task.successMetrics.metricName, 'Must have a named success metric');
      assert.ok(typeof task.successMetrics.baselineValue === 'number');
      assert.ok(typeof task.successMetrics.targetValue === 'number');
      assert.ok(task.successMetrics.unit, 'Must have metric unit');
    }
  });

  // ---------------------------------------------------------------------------
  // 3. Dual-Persistence & UI Compatibility
  // ---------------------------------------------------------------------------
  it('3. Dual-persists tasks into growthTasks and standard taskRepository for UI compatibility', async () => {
    const standardTasks = await taskRepository.listByWorkspace(workspaceA);
    assert.ok(standardTasks.length >= 4, 'Standard task repository must contain dual-persisted tasks');

    const firstTask = standardTasks[0]!;
    assert.equal(firstTask.workspaceId, workspaceA);
    assert.ok(firstTask.title);
    assert.ok(firstTask.description);
    assert.ok(firstTask.estimatedMinutes > 0);
  });

  // ---------------------------------------------------------------------------
  // 4. Closed-Loop Learning: Validated Hypothesis Outcome
  // ---------------------------------------------------------------------------
  it('4. Closed-loop learning: records validated outcome, reinforces strategy, and stores Business Brain fact', async () => {
    const tasks = await growthDirectorService.getGrowthTasks(workspaceA, {
      timeHorizon: 'IMMEDIATE_7_DAYS',
    });
    assert.ok(tasks.length > 0);
    const targetTask = tasks[0]!;

    const result = await growthDirectorService.recordTaskOutcome({
      taskId: targetTask.taskId,
      workspaceId: workspaceA,
      status: 'COMPLETED',
      outcomeMet: true,
      actualMetrics: { 'Checkout Conversion Rate': 4.8 },
      notes: 'Mounted evidence badges on pricing cards. Step-2 conversion increased from 3.2% to 4.8%.',
    });

    assert.equal(result.task.status, 'COMPLETED');
    assert.equal(result.task.outcomeMet, true);
    assert.equal(result.task.actualMetrics?.['Checkout Conversion Rate'], 4.8);
    assert.equal(result.learningConsequence.actionTaken, 'STRATEGY_REINFORCED');
    assert.equal(result.learningConsequence.memoryPersisted, true);

    // Verify fact was stored in Firestore Business Brain
    const factSnap = await db
      .collection(`workspaces/${workspaceA}/businessFacts`)
      .where('provenance', '==', 'USER_CONFIRMED')
      .get();
    assert.ok(factSnap.docs.length > 0, 'Business fact must be persisted from validated outcome');
    const factData = factSnap.docs[0]!.data();
    assert.ok(factData.value.includes('4.8'));
  });

  // ---------------------------------------------------------------------------
  // 5. Closed-Loop Learning: Underperformed Outcome & Strategy Refinement
  // ---------------------------------------------------------------------------
  it('5. Closed-loop learning: records underperformed outcome, registers anti-fatigue avoidance', async () => {
    const tasks = await growthDirectorService.getGrowthTasks(workspaceA, {
      timeHorizon: 'SHORT_TERM_30_DAYS',
    });
    assert.ok(tasks.length > 0);
    const targetTask = tasks[0]!;

    const result = await growthDirectorService.recordTaskOutcome({
      taskId: targetTask.taskId,
      workspaceId: workspaceA,
      status: 'ABANDONED',
      outcomeMet: false,
      actualMetrics: { 'Organic Referral Visits': 60 },
      notes: 'Organic reach on carousel stalled; need paid amplification or influencer co-marketing.',
    });

    assert.equal(result.task.status, 'ABANDONED');
    assert.equal(result.task.outcomeMet, false);
    assert.equal(
      result.learningConsequence.actionTaken,
      'STRATEGY_REFINED_DUE_TO_UNDERPERFORMANCE'
    );
    assert.ok(result.learningConsequence.channelAdjustment.includes('underperforming'));
  });

  // ---------------------------------------------------------------------------
  // 6. Strict Video Exclusion Certification
  // ---------------------------------------------------------------------------
  it('6. Certifies Strict Video Exclusion across all growth opportunities and recommended channels', async () => {
    const roadmap = await growthDirectorService.generateOperationalRoadmap({
      workspaceId: workspaceA,
    });

    for (const opp of roadmap.opportunities) {
      for (const channel of opp.recommendedChannels) {
        assert.ok(
          channel.formatType === 'SVG_COLLATERAL' ||
          channel.formatType === 'OUTREACH_COPY' ||
          channel.formatType === 'CONTENT_PACK',
          'Format type must be strictly non-video'
        );
        assert.ok(!channel.channelName.toLowerCase().includes('video'));
        assert.ok(!channel.channelName.toLowerCase().includes('tiktok'));
        assert.ok(!channel.channelName.toLowerCase().includes('reel'));
      }
    }
  });

  // ---------------------------------------------------------------------------
  // 7. Multi-Tenant Workspace Boundary Isolation
  // ---------------------------------------------------------------------------
  it('7. Enforces strict multi-tenant isolation between workspace roadmaps and tasks', async () => {
    await growthDirectorService.generateOperationalRoadmap({ workspaceId: workspaceB });

    const tasksA = await growthDirectorService.getGrowthTasks(workspaceA);
    const tasksB = await growthDirectorService.getGrowthTasks(workspaceB);

    assert.ok(tasksA.length > 0);
    assert.ok(tasksB.length > 0);

    for (const tA of tasksA) {
      assert.equal(tA.workspaceId, workspaceA);
    }
    for (const tB of tasksB) {
      assert.equal(tB.workspaceId, workspaceB);
    }

    // Attempting to record outcome on workspace A task using workspace B must fail
    await assert.rejects(
      async () => {
        await growthDirectorService.recordTaskOutcome({
          taskId: tasksA[0]!.taskId,
          workspaceId: workspaceB, // Cross-tenant tampering attempt
          status: 'COMPLETED',
          outcomeMet: true,
          notes: 'Malicious update attempt',
        });
      },
      /not found/i
    );
  });
});
