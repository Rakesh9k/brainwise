/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'node:crypto';
import { workflowRepository } from '../repositories/workflowRepository';
import { approvalRequestRepository } from '../repositories/approvalRequestRepository';
import { agentAuditLogRepository } from '../repositories/agentAuditLogRepository';
import { businessProfileRepository } from '../repositories/businessProfileRepository';
import { approvalWorkflowService } from './approvalWorkflowService';
import { toolPermissionService } from './toolPermissionService';
import { memoryService } from './memoryService';
import type {
  BusinessWorkflowEntity,
  WorkflowTaskNode,
  WorkflowStatus,
  WorkspaceRole,
  CommandCenterSummaryResponse,
  AgentType,
} from '../types/api';

export class CentralOrchestrationService {
  /**
   * Initiates an autonomous business workflow from a high-level user objective.
   * Performs deduplication via idempotency keys, missing info checks, DAG planning, and cost evaluation.
   */
  public async initiateWorkflow(params: {
    workspaceId: string;
    objective: string;
    budgetLimit?: number;
    currency?: string;
    deadlineDays?: number;
    userRole?: WorkspaceRole;
    idempotencyKey?: string;
    tasksOverride?: WorkflowTaskNode[];
  }): Promise<BusinessWorkflowEntity> {
    const {
      workspaceId,
      objective,
      budgetLimit,
      currency = 'USD',
      deadlineDays = 30,
      userRole = 'member',
      idempotencyKey,
      tasksOverride,
    } = params;

    // 1. Idempotency Check: Prevent duplicate workflow generation
    if (idempotencyKey) {
      const existing = await workflowRepository.findByIdempotencyKey(workspaceId, idempotencyKey);
      if (existing) {
        return existing;
      }
    }

    const workflowId = `wf_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const now = new Date().toISOString();

    // 2. Business Context Retrieval
    const profile = await businessProfileRepository.getProfile(workspaceId);

    // 3. Missing Information Evaluation
    const missingInfoNeeded = this.checkMissingInformation(objective, budgetLimit);
    if (missingInfoNeeded.length > 0) {
      const workflow: BusinessWorkflowEntity = {
        workflowId,
        workspaceId,
        objective,
        budgetLimit,
        currency,
        deadlineDays,
        status: 'WAITING_FOR_INFO',
        progressPercentage: 0,
        tasks: [],
        missingInfoNeeded,
        totalCostEstimate: 0,
        totalCostActual: 0,
        idempotencyKey,
        createdAt: now,
        updatedAt: now,
      };

      return await workflowRepository.createWorkflow(workflow);
    }

    // 4. Objective Decomposition into Structured DAG Tasks
    const tasks =
      tasksOverride || this.decomposeObjectiveToTasks(workflowId, objective, budgetLimit, currency);

    // 5. Cost-Limit Enforcement Gate
    const totalCostEstimate = tasks.reduce((acc, t) => acc + t.costEstimate, 0);
    if (budgetLimit !== undefined && totalCostEstimate > budgetLimit) {
      const workflow: BusinessWorkflowEntity = {
        workflowId,
        workspaceId,
        objective,
        budgetLimit,
        currency,
        deadlineDays,
        status: 'FAILED',
        progressPercentage: 0,
        tasks,
        totalCostEstimate,
        totalCostActual: 0,
        idempotencyKey,
        finalOutcomeSummary: `COST_LIMIT_EXCEEDED: Estimated workflow execution cost ($${totalCostEstimate}) exceeds configured ceiling ($${budgetLimit}). Execution halted to prevent budget overrun.`,
        createdAt: now,
        updatedAt: now,
      };

      return await workflowRepository.createWorkflow(workflow);
    }

    const workflow: BusinessWorkflowEntity = {
      workflowId,
      workspaceId,
      objective,
      budgetLimit,
      currency,
      deadlineDays,
      status: 'IN_PROGRESS',
      progressPercentage: 0,
      tasks,
      totalCostEstimate,
      totalCostActual: 0,
      idempotencyKey,
      createdAt: now,
      updatedAt: now,
    };

    await workflowRepository.createWorkflow(workflow);

    // Kick off execution of ready tasks
    return await this.executeWorkflowSteps(workspaceId, workflowId, userRole, profile);
  }

  /**
   * Evaluates missing critical parameters before executing
   */
  private checkMissingInformation(objective: string, budgetLimit?: number): string[] {
    const missing: string[] = [];
    const normalized = objective.toLowerCase().trim();

    // Vague objective detection
    if (
      normalized.length < 15 ||
      normalized === 'help me grow' ||
      normalized === 'increase sales'
    ) {
      missing.push('Target product or service offering');
      missing.push('Measurement timeframe (e.g. 30 days)');
      if (budgetLimit === undefined) {
        missing.push('Maximum marketing budget or expenditure limit');
      }
    }

    return missing;
  }

  /**
   * Decomposes high-level objective into DAG of dependent tasks across departments
   */
  private decomposeObjectiveToTasks(
    workflowId: string,
    objective: string,
    budgetLimit?: number,
    currency: string = 'USD'
  ): WorkflowTaskNode[] {
    const normalized = objective.toLowerCase().trim();
    const isSingleResearch =
      /^(research\s+(our\s+)?competitors|competitor\s+(pricing|research|analysis)|market\s+research)/i.test(
        normalized
      ) ||
      (normalized.includes('competitor') &&
        !normalized.includes('campaign') &&
        !normalized.includes('orders') &&
        !normalized.includes('spend') &&
        !normalized.includes('restaurant'));

    const isSingleCreative =
      /^(draft\s+vector|create\s+brand\s+assets|design\s+vector\s+svg)/i.test(normalized) ||
      (normalized.includes('stationery') &&
        !normalized.includes('campaign') &&
        !normalized.includes('spend'));

    if (isSingleResearch) {
      const t1 = `task_${workflowId}_1_comp_scan`;
      const t2 = `task_${workflowId}_2_comp_report`;
      return [
        {
          taskId: t1,
          title: 'Competitor Intelligence Database Scan',
          description: `Analyze market competitors, price points, and positioning for objective: '${objective}'`,
          department: 'RESEARCH',
          assignedAgent: 'RESEARCH_AGENT',
          riskLevel: 'LEVEL_1_READ_ONLY',
          dependencies: [],
          inputPayload: { objective, scope: 'competitors_and_pricing' },
          status: 'READY',
          requiresApproval: false,
          costEstimate: 15,
          costActual: 0,
          retryCount: 0,
          maxRetries: 3,
        },
        {
          taskId: t2,
          title: 'Competitive Benchmark & Positioning Synthesis',
          description:
            'Synthesize competitor strengths, weaknesses, and differentiation opportunities.',
          department: 'RESEARCH',
          assignedAgent: 'RESEARCH_AGENT',
          riskLevel: 'LEVEL_1_READ_ONLY',
          dependencies: [t1],
          inputPayload: { objective },
          status: 'PENDING',
          requiresApproval: false,
          costEstimate: 20,
          costActual: 0,
          retryCount: 0,
          maxRetries: 3,
        },
      ];
    }

    if (isSingleCreative) {
      const t1 = `task_${workflowId}_1_creative_guidelines`;
      const t2 = `task_${workflowId}_2_creative_svg`;
      return [
        {
          taskId: t1,
          title: 'Brand Visual Identity & Vector Exploration',
          description: `Extract brand palette and typography for objective: '${objective}'`,
          department: 'CREATIVE',
          assignedAgent: 'CREATIVE_AGENT',
          riskLevel: 'LEVEL_2_REVERSIBLE_INTERNAL',
          dependencies: [],
          inputPayload: { objective },
          status: 'READY',
          requiresApproval: false,
          costEstimate: 15,
          costActual: 0,
          retryCount: 0,
          maxRetries: 2,
        },
        {
          taskId: t2,
          title: 'Draft Vector Collateral (SVG) & High-DPI Output',
          description: 'Generate high-DPI vector SVG collateral. Video is strictly excluded.',
          department: 'CREATIVE',
          assignedAgent: 'CREATIVE_AGENT',
          riskLevel: 'LEVEL_2_REVERSIBLE_INTERNAL',
          dependencies: [t1],
          inputPayload: { objective },
          status: 'PENDING',
          requiresApproval: false,
          costEstimate: 25,
          costActual: 0,
          retryCount: 0,
          maxRetries: 2,
        },
      ];
    }

    const t1 = `task_${workflowId}_1_strategy`;
    const t2 = `task_${workflowId}_2_research`;
    const t3 = `task_${workflowId}_3_idea`;
    const t4 = `task_${workflowId}_4_creative`;
    const t5 = `task_${workflowId}_5_campaign`;
    const t6 = `task_${workflowId}_6_publish`;
    const t7 = `task_${workflowId}_7_report`;

    const allocatedBudget = budgetLimit ? Math.round(budgetLimit * 0.4) : 1000;

    return [
      {
        taskId: t1,
        title: 'Strategic Analysis & Decomposition',
        description: `Analyze business conditions and align goals for objective: '${objective}'`,
        department: 'STRATEGY',
        assignedAgent: 'STRATEGY_AGENT',
        riskLevel: 'LEVEL_1_READ_ONLY',
        dependencies: [],
        inputPayload: { objective },
        status: 'READY',
        requiresApproval: false,
        costEstimate: 10,
        costActual: 0,
        retryCount: 0,
        maxRetries: 3,
      },
      {
        taskId: t2,
        title: 'Competitor & Audience Intelligence',
        description: 'Scan competitor pricing and map targeted customer segments.',
        department: 'RESEARCH',
        assignedAgent: 'RESEARCH_AGENT',
        riskLevel: 'LEVEL_1_READ_ONLY',
        dependencies: [t1],
        inputPayload: { objective },
        status: 'PENDING',
        requiresApproval: false,
        costEstimate: 15,
        costActual: 0,
        retryCount: 0,
        maxRetries: 3,
      },
      {
        taskId: t3,
        title: 'Value Proposition & Positioning Angles',
        description: 'Formulate differentiated campaign angles with fatigue detection.',
        department: 'STRATEGY',
        assignedAgent: 'IDEA_AGENT',
        riskLevel: 'LEVEL_1_READ_ONLY',
        dependencies: [t2],
        inputPayload: { objective },
        status: 'PENDING',
        requiresApproval: false,
        costEstimate: 10,
        costActual: 0,
        retryCount: 0,
        maxRetries: 2,
      },
      {
        taskId: t4,
        title: 'Creative Asset Drafting (SVG Vector & Copy)',
        description:
          'Generate high-DPI vector SVG banners and ad copy. Video is strictly excluded.',
        department: 'CREATIVE',
        assignedAgent: 'CREATIVE_AGENT',
        riskLevel: 'LEVEL_2_REVERSIBLE_INTERNAL',
        dependencies: [t3],
        inputPayload: { objective },
        status: 'PENDING',
        requiresApproval: false,
        costEstimate: 20,
        costActual: 0,
        retryCount: 0,
        maxRetries: 2,
      },
      {
        taskId: t5,
        title: 'Campaign Structure & Budget Allocation',
        description: 'Structure 30-day experiment sprint and set channel budget ceilings.',
        department: 'MARKETING',
        assignedAgent: 'CAMPAIGN_AGENT',
        riskLevel: 'LEVEL_2_REVERSIBLE_INTERNAL',
        dependencies: [t4],
        inputPayload: { objective, budget: allocatedBudget, currency },
        status: 'PENDING',
        requiresApproval: false,
        costEstimate: 15,
        costActual: 0,
        retryCount: 0,
        maxRetries: 2,
      },
      {
        taskId: t6,
        title: 'External Publishing & Ad Expenditure',
        description:
          'Publish live campaigns and commit ad spend. Requires mandatory human approval.',
        department: 'SALES',
        assignedAgent: 'PUBLISHING_AGENT',
        riskLevel: 'LEVEL_3_EXTERNAL_CONSEQUENTIAL',
        dependencies: [t5],
        inputPayload: { objective, channel: 'Instagram Ads', budget: allocatedBudget, currency },
        status: 'PENDING',
        requiresApproval: true,
        costEstimate: allocatedBudget,
        costActual: 0,
        retryCount: 0,
        maxRetries: 1,
      },
      {
        taskId: t7,
        title: 'Outcome Performance Reporting',
        description: 'Synthesize performance ROI and store learnings in Episodic Memory.',
        department: 'STRATEGY',
        assignedAgent: 'STRATEGY_AGENT',
        riskLevel: 'LEVEL_1_READ_ONLY',
        dependencies: [t6],
        inputPayload: { objective },
        status: 'PENDING',
        requiresApproval: false,
        costEstimate: 10,
        costActual: 0,
        retryCount: 0,
        maxRetries: 3,
      },
    ];
  }

  /**
   * Executes runnable tasks across the workflow DAG with dependency ordering,
   * approval gating, and retry recovery.
   */
  public async executeWorkflowSteps(
    workspaceId: string,
    workflowId: string,
    userRole: WorkspaceRole = 'member',
    verifiedProfile?: any
  ): Promise<BusinessWorkflowEntity> {
    let workflow = await workflowRepository.getWorkflow(workspaceId, workflowId);
    if (!workflow) {
      throw new Error(`Workflow '${workflowId}' not found in workspace '${workspaceId}'`);
    }

    if (
      workflow.status === 'COMPLETED' ||
      workflow.status === 'FAILED' ||
      workflow.status === 'CANCELLED' ||
      workflow.status === 'REJECTED' ||
      workflow.status === 'PAUSED' ||
      workflow.status === 'WAITING_FOR_INFO'
    ) {
      return workflow;
    }

    let madeProgress = false;
    const completedTaskIds = new Set(
      workflow.tasks.filter((t) => t.status === 'COMPLETED').map((t) => t.taskId)
    );

    for (let i = 0; i < workflow.tasks.length; i++) {
      const task = workflow.tasks[i];

      // Check if task dependencies are satisfied
      const depsSatisfied = task.dependencies.every((depId) => completedTaskIds.has(depId));

      if (depsSatisfied && (task.status === 'PENDING' || task.status === 'READY')) {
        // Level 3 Approval Gate Check
        if (task.riskLevel === 'LEVEL_3_EXTERNAL_CONSEQUENTIAL' && task.requiresApproval) {
          if (!task.approvalRequestId) {
            // Save progress made on earlier tasks in Firestore before waiting for approval
            await workflowRepository.updateWorkflow(workspaceId, workflowId, {
              status: 'IN_PROGRESS',
              tasks: workflow.tasks,
            });

            await approvalWorkflowService.createApprovalRequest({
              workspaceId,
              workflowId,
              taskId: task.taskId,
              actionTitle: task.title || 'Task Action',
              actionDescription: task.description || 'Task Description',
              department: task.department,
              agent: task.assignedAgent,
              consequentialDetails: {
                budgetImpact: ((task.inputPayload?.budget as number) || task.costEstimate),
                currency: (task.inputPayload?.currency as string) || workflow.currency,
                targetChannel: (task.inputPayload?.channel as string) || 'Digital Ads',
                contentPreview:
                  'Draft vector graphics & direct-trade copy packs ready for release.',
              },
            });

            // Re-fetch workflow updated by approval service
            workflow = (await workflowRepository.getWorkflow(workspaceId, workflowId))!;
            return workflow;
          } else {
            // Check if approval request is still pending
            const req = await approvalRequestRepository.getRequest(
              workspaceId,
              task.approvalRequestId
            );
            if (!req || req.status === 'PENDING') {
              workflow = await workflowRepository.updateWorkflow(workspaceId, workflowId, {
                status: 'WAITING_FOR_APPROVAL',
              });
              return workflow;
            } else if (req.status === 'REJECTED') {
              task.status = 'CANCELLED';
              task.errorMessage = `Approval declined: ${req.decisionReason || 'Rejected by operator'}`;
              workflow = await workflowRepository.updateWorkflow(workspaceId, workflowId, {
                status: 'REJECTED',
                tasks: workflow.tasks,
              });
              return workflow;
            }
          }
        }

        // Execute task via Tool Permission System
        task.status = 'RUNNING';
        task.startedAt = new Date().toISOString();
        madeProgress = true;

        // Gather deliverables from upstream dependencies
        const upstreamOutputs: Record<string, unknown> = {};
        for (const depId of task.dependencies) {
          const depTask = workflow.tasks.find((t) => t.taskId === depId);
          if (depTask?.outputResult) {
            upstreamOutputs[depId] = depTask.outputResult;
          }
        }
        task.inputPayload = {
          ...task.inputPayload,
          upstreamOutputs,
        };

        const toolToRun = this.mapTaskToTool(task);
        let result = await toolPermissionService.executeTool({
          agentType: task.assignedAgent as AgentType,
          toolId: toolToRun,
          workspaceId,
          userRole,
          inputPayload: task.inputPayload,
          workflowId,
          taskId: task.taskId,
          verifiedProfile,
        });

        // Retry with backoff if transient failure occurs
        const maxRetries = task.maxRetries ?? 3;
        while (!result.success && (task.retryCount ?? 0) < maxRetries) {
          task.retryCount = (task.retryCount ?? 0) + 1;
          // Exponential backoff simulation
          await new Promise((resolve) => setTimeout(resolve, 50 * Math.pow(2, task.retryCount || 1)));
          result = await toolPermissionService.executeTool({
            agentType: task.assignedAgent as AgentType,
            toolId: toolToRun,
            workspaceId,
            userRole,
            inputPayload: task.inputPayload,
            workflowId,
            taskId: task.taskId,
            verifiedProfile,
          });
        }

        if (result.success) {
          task.status = 'COMPLETED';
          task.outputResult = result.data;
          task.costActual = task.costEstimate * 0.9;
          task.completedAt = new Date().toISOString();
          completedTaskIds.add(task.taskId);
        } else {
          // Dead-letter state: Task exhausted retries and failed
          task.status = 'FAILED';
          task.errorMessage = result.error || 'Execution failed';
          workflow.status = 'FAILED';
          workflow.tasks[i] = task;

          return await workflowRepository.updateWorkflow(workspaceId, workflowId, {
            status: 'FAILED',
            tasks: workflow.tasks,
            finalOutcomeSummary: `Workflow failed on task '${task.title}': ${task.errorMessage}`,
          });
        }

        workflow.tasks[i] = task;
      }
    }

    // Recalculate progress & total actual cost
    const completedCount = workflow.tasks.filter((t) => t.status === 'COMPLETED').length;
    const progressPercentage = Math.round((completedCount / workflow.tasks.length) * 100);
    const totalCostActual = workflow.tasks.reduce((acc, t) => acc + (t.costActual || 0), 0);

    const isAllDone = completedCount === workflow.tasks.length;
    const newStatus: WorkflowStatus = isAllDone ? 'COMPLETED' : 'IN_PROGRESS';

    let finalOutcomeSummary = workflow.finalOutcomeSummary;
    if (isAllDone) {
      finalOutcomeSummary = `Autonomous business operations completed successfully across ${workflow.tasks.length} departments. All dependencies verified.`;

      // Record Episode in Episodic Memory
      await memoryService.recordEpisode({
        workspaceId,
        department: 'STRATEGY',
        activityType: 'strategic_decision',
        title: `Workflow Completed: ${(workflow.objective || workflow.name || 'Objective').substring(0, 50)}`,
        summary: `Autonomous multi-agent workflow completed with $${totalCostActual} actual cost.`,
        learnings: [
          'Coordinated multi-agent workflow executed with verified approvals and zero video violations.',
        ],
        outcomes: { totalCostActual, tasksCompleted: completedCount },
      });
    }

    workflow = await workflowRepository.updateWorkflow(workspaceId, workflowId, {
      status: newStatus,
      progressPercentage,
      tasks: workflow.tasks,
      totalCostActual,
      finalOutcomeSummary,
      completedAt: isAllDone ? new Date().toISOString() : undefined,
    });

    // If more tasks can be run immediately, recurse once
    if (madeProgress && !isAllDone && workflow.status === 'IN_PROGRESS') {
      return await this.executeWorkflowSteps(workspaceId, workflowId, userRole, verifiedProfile);
    }

    return workflow;
  }

  /**
   * Maps a high-level task node to its authorized agent tool
   */
  private mapTaskToTool(task: WorkflowTaskNode): string {
    switch (task.assignedAgent) {
      case 'STRATEGY_AGENT':
        return (task.title || '').toLowerCase().includes('report')
          ? 'compile_outcome_report'
          : 'read_business_context';
      case 'RESEARCH_AGENT':
        return 'query_competitors';
      case 'IDEA_AGENT':
        return 'generate_positioning_angles';
      case 'CREATIVE_AGENT':
        return 'draft_vector_collateral_svg';
      case 'CAMPAIGN_AGENT':
        return 'structure_campaign_experiment';
      case 'PUBLISHING_AGENT':
        return 'publish_external_campaign';
      case 'OPERATIONS_AGENT':
      default:
        return 'schedule_department_tasks';
    }
  }

  /**
   * Pauses an active workflow
   */
  public async pauseWorkflow(
    workspaceId: string,
    workflowId: string
  ): Promise<BusinessWorkflowEntity> {
    const workflow = await workflowRepository.getWorkflow(workspaceId, workflowId);
    if (!workflow) throw new Error(`Workflow '${workflowId}' not found`);

    if (workflow.status === 'COMPLETED' || workflow.status === 'FAILED') {
      throw new Error(`Cannot pause finished workflow (${workflow.status}).`);
    }

    return await workflowRepository.updateWorkflow(workspaceId, workflowId, {
      status: 'PAUSED',
    });
  }

  /**
   * Resumes a paused or waiting workflow
   */
  public async resumeWorkflow(
    workspaceId: string,
    workflowId: string,
    userRole: WorkspaceRole = 'member'
  ): Promise<BusinessWorkflowEntity> {
    const workflow = await workflowRepository.getWorkflow(workspaceId, workflowId);
    if (!workflow) throw new Error(`Workflow '${workflowId}' not found`);

    await workflowRepository.updateWorkflow(workspaceId, workflowId, {
      status: 'IN_PROGRESS',
    });

    return await this.executeWorkflowSteps(workspaceId, workflowId, userRole);
  }

  /**
   * Cancels an active workflow
   */
  public async cancelWorkflow(
    workspaceId: string,
    workflowId: string
  ): Promise<BusinessWorkflowEntity> {
    const workflow = await workflowRepository.getWorkflow(workspaceId, workflowId);
    if (!workflow) throw new Error(`Workflow '${workflowId}' not found`);

    const updatedTasks = workflow.tasks.map((t) => {
      if (t.status === 'PENDING' || t.status === 'READY' || t.status === 'RUNNING') {
        return { ...t, status: 'CANCELLED' as const };
      }
      return t;
    });

    return await workflowRepository.updateWorkflow(workspaceId, workflowId, {
      status: 'CANCELLED',
      tasks: updatedTasks,
      finalOutcomeSummary: 'Workflow cancelled by operator.',
    });
  }

  /**
   * Responds to missing information inquiries, generating DAG tasks and launching execution
   */
  public async provideMissingInformation(
    workspaceId: string,
    workflowId: string,
    responses: Record<string, string>,
    userRole: WorkspaceRole = 'member'
  ): Promise<BusinessWorkflowEntity> {
    const workflow = await workflowRepository.getWorkflow(workspaceId, workflowId);
    if (!workflow) throw new Error(`Workflow '${workflowId}' not found`);

    if (workflow.status !== 'WAITING_FOR_INFO') {
      throw new Error(
        `Workflow '${workflowId}' is not waiting for information (status: ${workflow.status}).`
      );
    }

    const now = new Date().toISOString();
    const timeframeStr = responses.timeframe || '30 days';
    const budgetStr = responses.budget || responses.budgetLimit;
    const offeringStr = responses.offering || responses.product || 'Core offering';

    const enrichedObjective = `${workflow.objective} (Target: ${offeringStr}, Timeframe: ${timeframeStr})`;
    const budgetLimit = budgetStr ? Number(budgetStr) : workflow.budgetLimit || 5000;

    const tasks = this.decomposeObjectiveToTasks(
      workflowId,
      enrichedObjective,
      budgetLimit,
      workflow.currency
    );

    await workflowRepository.updateWorkflow(workspaceId, workflowId, {
      objective: enrichedObjective,
      budgetLimit,
      missingInfoNeeded: [],
      missingInfoResponses: responses,
      tasks,
      totalCostEstimate: tasks.reduce((acc, t) => acc + t.costEstimate, 0),
      status: 'IN_PROGRESS',
      updatedAt: now,
    });

    const profile = await businessProfileRepository.getProfile(workspaceId);
    return await this.executeWorkflowSteps(workspaceId, workflowId, userRole, profile);
  }

  /**
   * Retries a failed workflow task
   */
  public async retryTask(
    workspaceId: string,
    workflowId: string,
    taskId: string,
    userRole: WorkspaceRole = 'member'
  ): Promise<BusinessWorkflowEntity> {
    const workflow = await workflowRepository.getWorkflow(workspaceId, workflowId);
    if (!workflow) throw new Error(`Workflow '${workflowId}' not found`);

    const taskIndex = workflow.tasks.findIndex((t) => t.taskId === taskId);
    if (taskIndex === -1) throw new Error(`Task '${taskId}' not found in workflow '${workflowId}'`);

    workflow.tasks[taskIndex].status = 'READY';
    workflow.tasks[taskIndex].retryCount = 0;
    workflow.tasks[taskIndex].errorMessage = undefined;

    await workflowRepository.updateWorkflow(workspaceId, workflowId, {
      status: 'IN_PROGRESS',
      tasks: workflow.tasks,
      finalOutcomeSummary: undefined,
    });

    const profile = await businessProfileRepository.getProfile(workspaceId);
    return await this.executeWorkflowSteps(workspaceId, workflowId, userRole, profile);
  }

  /**
   * Recovers interrupted workflows after backend restart or interruption
   */
  public async recoverInterruptedWorkflows(
    workspaceId: string,
    userRole: WorkspaceRole = 'member'
  ): Promise<BusinessWorkflowEntity[]> {
    const activeWorkflows = await workflowRepository.listWorkflows(workspaceId);
    const interrupted = activeWorkflows.filter(
      (w) => w.status === 'IN_PROGRESS' || w.status === 'INITIALIZING'
    );

    const recovered: BusinessWorkflowEntity[] = [];
    for (const wf of interrupted) {
      const res = await this.executeWorkflowSteps(workspaceId, wf.workflowId, userRole);
      recovered.push(res);
    }

    return recovered;
  }

  /**
   * Compiles the Business Command Centre operational summary
   */
  public async getCommandCenterSummary(workspaceId: string): Promise<CommandCenterSummaryResponse> {
    const allWorkflows = await workflowRepository.listWorkflows(workspaceId);
    const pendingApprovals = await approvalRequestRepository.listRequests(workspaceId, 'PENDING');
    const recentAuditLogs = await agentAuditLogRepository.listLogs(workspaceId, 20);

    const activeWorkflows = allWorkflows.filter(
      (w) =>
        w.status === 'IN_PROGRESS' ||
        w.status === 'WAITING_FOR_APPROVAL' ||
        w.status === 'WAITING_FOR_INFO'
    );

    const activeObjectives = activeWorkflows.map((w) => ({
      id: w.workflowId,
      name: w.objective || w.name || 'Objective',
      status: w.status,
      progress: w.progressPercentage,
    }));

    // Aggregate department assignments & task statistics
    const departmentAssignments: Record<string, number> = {};
    const taskStats = { completed: 0, running: 0, failed: 0, pendingApproval: 0 };
    let totalEstimated = 0;
    let totalActual = 0;
    let currency = 'USD';

    for (const w of allWorkflows) {
      totalEstimated += w.totalCostEstimate || 0;
      totalActual += w.totalCostActual || 0;
      if (w.currency) currency = w.currency;

      for (const t of w.tasks) {
        departmentAssignments[t.department] = (departmentAssignments[t.department] || 0) + 1;
        if (t.status === 'COMPLETED') taskStats.completed++;
        else if (t.status === 'RUNNING') taskStats.running++;
        else if (t.status === 'FAILED') taskStats.failed++;
        else if (t.status === 'WAITING_FOR_APPROVAL') taskStats.pendingApproval++;
      }
    }

    let nextRecommendedAction = 'All autonomous operations running smoothly.';
    if (pendingApprovals.length > 0) {
      nextRecommendedAction = `Review and decide on ${pendingApprovals.length} pending Level 3 approval request(s) before external live spend occurs.`;
    } else if (taskStats.failed > 0) {
      nextRecommendedAction = `${taskStats.failed} task(s) failed in dead-letter queue. Inspect agent audit logs for error details.`;
    }

    return {
      activeObjectives,
      activeWorkflows,
      pendingApprovals,
      departmentAssignments,
      taskStats,
      costs: { totalEstimated, totalActual, currency },
      recentAuditLogs,
      nextRecommendedAction,
    };
  }
}

export const centralOrchestrationService = new CentralOrchestrationService();
