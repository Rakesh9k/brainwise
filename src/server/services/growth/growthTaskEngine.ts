/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  StructuredGrowthTask,
} from './growthTypes';

export interface TaskValidationResult {
  isValid: boolean;
  rejectionReasons: string[];
  remediationSuggestions: string[];
}

export class GrowthTaskEngine {
  /**
   * Enforces strict Anti-Vague validation on any proposed growth task
   */
  public validateTaskQuality(task: Partial<StructuredGrowthTask>): TaskValidationResult {
    const rejectionReasons: string[] = [];
    const remediationSuggestions: string[] = [];

    // 1. Title validation
    if (!task.title || task.title.trim().length < 8) {
      rejectionReasons.push('Task title is too short or missing. Must be descriptive.');
      remediationSuggestions.push('Provide a clear, specific title summarizing the deliverable.');
    }

    // 2. Action verb & execution steps
    if (!task.actionVerb || task.actionVerb.trim().length < 3) {
      rejectionReasons.push('Missing explicit action verb (e.g., "Deploy", "Interview", "Mount", "A/B Test").');
      remediationSuggestions.push('Specify a concrete operational action verb.');
    }

    if (!task.executionSteps || task.executionSteps.length === 0) {
      rejectionReasons.push('Execution steps list is empty. Anti-vague mandate requires step-by-step guidance.');
      remediationSuggestions.push('List at least 2 concrete execution sub-steps.');
    }

    // 3. Vague buzzword detection
    const vaguePhrases = [
      'improve seo',
      'post regularly',
      'increase brand awareness',
      'find more customers',
      'improve conversion',
      'run digital ads',
      'do marketing',
    ];
    const textToCheck = `${task.title || ''} ${task.description || ''}`.toLowerCase();
    for (const vague of vaguePhrases) {
      if (textToCheck.includes(vague)) {
        rejectionReasons.push(`Task contains forbidden vague phrase: "${vague}".`);
        remediationSuggestions.push(
          `Replace "${vague}" with a deterministic action, specific channel, target metric, and sample size.`
        );
      }
    }

    // 4. Measurable success metrics
    if (!task.successMetrics?.metricName || task.successMetrics.targetValue === undefined) {
      rejectionReasons.push('Task lacks a quantitative success metric with baseline and target values.');
      remediationSuggestions.push('Define a metricName, baselineValue, and targetValue.');
    }

    // 5. Unambiguous completion criteria
    if (!task.completionCriteria || task.completionCriteria.trim().length < 15) {
      rejectionReasons.push('Completion criteria is missing or insufficient (minimum 15 characters).');
      remediationSuggestions.push(
        'State unambiguous verification criteria (e.g. "Components render with 0 errors, UTM links verified in analytics").'
      );
    }

    // 6. Estimated duration
    if (!task.estimatedDurationMinutes || task.estimatedDurationMinutes <= 0) {
      rejectionReasons.push('Estimated duration must be a positive number of minutes.');
      remediationSuggestions.push('Provide an estimated execution duration in minutes.');
    }

    // 7. Goal traceability (anti-orphan rule)
    if (!task.relatedGoalIds || task.relatedGoalIds.length === 0) {
      rejectionReasons.push('Orphan task rejected: Every strategic task must link to at least one active business goal.');
      remediationSuggestions.push('Assign the relevant business goal ID to this task.');
    }

    return {
      isValid: rejectionReasons.length === 0,
      rejectionReasons,
      remediationSuggestions,
    };
  }

  /**
   * Resolves task dependencies, marks blocked tasks, and detects circular dependency graphs
   */
  public resolveDependencies(tasks: StructuredGrowthTask[]): {
    resolvedTasks: StructuredGrowthTask[];
    circularDependencyDetected: boolean;
    cyclePath?: string[];
  } {
    const taskMap = new Map<string, StructuredGrowthTask>();
    tasks.forEach((t) => taskMap.set(t.taskId, { ...t }));

    // 1. Detect cycles via DFS
    const visited = new Set<string>();
    const recStack = new Set<string>();
    let cyclePath: string[] | undefined;

    const hasCycle = (taskId: string, path: string[]): boolean => {
      visited.add(taskId);
      recStack.add(taskId);

      const task = taskMap.get(taskId);
      if (task?.dependencies) {
        for (const depId of task.dependencies) {
          if (!visited.has(depId)) {
            if (hasCycle(depId, [...path, depId])) return true;
          } else if (recStack.has(depId)) {
            cyclePath = [...path, depId];
            return true;
          }
        }
      }

      recStack.delete(taskId);
      return false;
    };

    for (const taskId of taskMap.keys()) {
      if (!visited.has(taskId)) {
        if (hasCycle(taskId, [taskId])) {
          return {
            resolvedTasks: tasks,
            circularDependencyDetected: true,
            cyclePath,
          };
        }
      }
    }

    // 2. Compute blocked status based on dependencies
    const resolvedTasks: StructuredGrowthTask[] = [];
    for (const task of taskMap.values()) {
      const blockedBy: string[] = [];
      if (task.dependencies && task.dependencies.length > 0) {
        for (const depId of task.dependencies) {
          const depTask = taskMap.get(depId);
          // If dependency exists and is not COMPLETED, this task is blocked
          if (depTask && depTask.status !== 'COMPLETED') {
            blockedBy.push(depId);
          }
        }
      }

      const updatedTask = { ...task };
      updatedTask.blockedByTaskIds = blockedBy;

      // Update lifecycle status if pending and blocked
      if (blockedBy.length > 0 && (updatedTask.status === 'PROPOSED' || updatedTask.status === 'SCHEDULED' || updatedTask.status === 'IN_PROGRESS')) {
        updatedTask.status = 'BLOCKED';
      } else if (blockedBy.length === 0 && updatedTask.status === 'BLOCKED') {
        updatedTask.status = 'SCHEDULED';
      }

      resolvedTasks.push(updatedTask);
    }

    return {
      resolvedTasks,
      circularDependencyDetected: false,
    };
  }
}

export const growthTaskEngine = new GrowthTaskEngine();
