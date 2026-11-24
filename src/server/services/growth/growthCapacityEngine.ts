/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  ResourceCapacityProfile,
  StructuredGrowthTask,
} from './growthTypes';

export interface FocusSprintSelectionParams {
  tasks: StructuredGrowthTask[];
  limit?: number;
  availableMinutes?: number;
  targetGoalId?: string;
}

export class GrowthCapacityEngine {
  /**
   * Calculates realistic resource capacity, utilization, and overload detection
   */
  public evaluateCapacity(params: {
    founderDailyHours: number;
    availableDaysPerWeek?: number;
    teamSize?: number;
    monthlyBudget?: number;
    plannedTasks: StructuredGrowthTask[];
  }): ResourceCapacityProfile {
    const dailyHours = Math.max(1, Math.min(16, params.founderDailyHours));
    const daysPerWeek = params.availableDaysPerWeek || 5;
    const weeklyTotalHours = dailyHours * daysPerWeek;
    const teamSize = params.teamSize || 1;
    const monthlyMarketingBudget = params.monthlyBudget || 25000;

    // Sum estimated hours across pending/scheduled tasks for the next 7 days
    const immediateTasks = params.plannedTasks.filter(
      (t) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED' && t.status !== 'ARCHIVED' && t.timeHorizon === 'IMMEDIATE_7_DAYS'
    );
    const totalMinutes = immediateTasks.reduce((acc, t) => acc + (t.estimatedDurationMinutes || 30), 0);
    const committedHoursWeekly = Math.round((totalMinutes / 60) * 10) / 10;

    const availableHoursWeekly = Math.max(0, weeklyTotalHours * teamSize - committedHoursWeekly);
    const utilizationPercent = Math.round((committedHoursWeekly / (weeklyTotalHours * teamSize)) * 100);
    const isOverloaded = utilizationPercent > 100;

    let overloadWarning: string | undefined;
    if (isOverloaded) {
      overloadWarning = `Planned immediate tasks require ${committedHoursWeekly}h, exceeding available capacity of ${weeklyTotalHours * teamSize}h/week (${utilizationPercent}% utilization). Prioritize top 3 tasks and postpone secondary items.`;
    }

    return {
      founderWorkingHoursPerDay: dailyHours,
      availableDaysPerWeek: daysPerWeek,
      weeklyTotalHours,
      teamSize,
      monthlyMarketingBudget,
      committedHoursWeekly,
      availableHoursWeekly,
      utilizationPercent,
      isOverloaded,
      overloadWarning,
    };
  }

  /**
   * Upgraded selectFocusSprintTasks(): Intelligently selects top coherent, unblocked tasks for focus execution
   */
  public selectFocusSprintTasks(params: FocusSprintSelectionParams): StructuredGrowthTask[] {
    const { tasks, limit = 3, availableMinutes = 45, targetGoalId } = params;

    // 1. Filter out completed, cancelled, or BLOCKED tasks (never schedule blocked tasks!)
    const eligibleTasks = tasks.filter((t) => {
      if (t.status === 'COMPLETED' || t.status === 'CANCELLED' || t.status === 'ARCHIVED') return false;
      if (t.status === 'BLOCKED' || (t.blockedByTaskIds && t.blockedByTaskIds.length > 0)) return false;
      return true;
    });

    if (eligibleTasks.length === 0) return [];

    // 2. Score tasks based on:
    // - Goal alignment (boost if matches targetGoalId)
    // - ICE weighted score
    // - Duration fit for available sprint session
    // - Priority & Deadlines
    const scored = eligibleTasks.map((task) => {
      let score = task.iceScore?.finalWeightedScore || 100;

      // Boost for goal alignment
      if (targetGoalId && task.relatedGoalIds?.includes(targetGoalId)) {
        score += 200;
      }

      // Priority boost
      if (task.priority === 'HIGH') score += 150;
      else if (task.priority === 'MEDIUM') score += 50;

      // Duration fit check: penalize if task duration exceeds available sprint minutes
      if (task.estimatedDurationMinutes > availableMinutes * 2) {
        score -= 100; // Too long for a single focus sprint session
      }

      return { task, score };
    });

    // 3. Sort descending by score
    scored.sort((a, b) => b.score - a.score);

    // 4. Return top coherent subset within limit
    return scored.slice(0, Math.max(1, limit)).map((s) => s.task);
  }
}

export const growthCapacityEngine = new GrowthCapacityEngine();
