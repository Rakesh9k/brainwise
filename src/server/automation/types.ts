/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AutomationTriggerType = 'time_based' | 'data_based';

export type TimeSchedule = 'daily' | 'weekly' | 'monthly' | 'custom_cron';

export type DataEventType =
  | 'traffic_decrease'
  | 'traffic_increase'
  | 'search_visibility_decline'
  | 'competitor_activity'
  | 'new_research'
  | 'performance_threshold'
  | 'integration_failure';

export type AutomationActionType =
  | 'generate_intelligence_report'
  | 'analyze_performance'
  | 'run_competitor_research'
  | 'discover_industry_trends'
  | 'generate_recommendations'
  | 'send_email'
  | 'create_notification'
  | 'request_approval';

export type AutomationJobStatus =
  | 'pending'
  | 'scheduled'
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'retrying'
  | 'cancelled'
  | 'requires_approval';

export interface AutomationTriggerConfig {
  type: AutomationTriggerType;
  schedule?: TimeSchedule;
  timeOfDay?: string; // e.g. "09:00"
  daysOfWeek?: number[]; // 1 = Monday
  dataEvent?: DataEventType;
  thresholdPct?: number; // e.g. -10 for 10% decline
}

export interface AutomationConditionConfig {
  comparison:
    | 'previous_7_days_vs_preceding_7_days'
    | 'previous_30_days_vs_preceding_30_days'
    | 'threshold_breach'
    | 'always';
  thresholdMetric?: string;
  thresholdOperator?: '<' | '<=' | '>' | '>=';
  thresholdValue?: number;
}

export interface AutomationActionConfig {
  type: AutomationActionType;
  category: 'A_READ_ONLY' | 'B_INTERNAL' | 'C_EXTERNAL_WRITE';
  targetDepartment?: string;
  reportTitle?: string;
  recipientEmail?: string;
  notificationTitle?: string;
  params?: Record<string, unknown>;
}

export interface AutomationCreationParams {
  name: string;
  description: string;
  templateId?: string;
  trigger: AutomationTriggerConfig;
  sourceProviders: string[];
  condition: AutomationConditionConfig;
  action: AutomationActionConfig;
  status: 'active' | 'paused';
  lastExecutedAt?: string;
  nextRunAt?: string;
  [key: string]: unknown;
}

export interface AutomationEntity {
  [key: string]: unknown;
  automationId: string;
  workspaceId: string;
  name: string;
  description: string;
  templateId?: string;
  trigger: AutomationTriggerConfig;
  sourceProviders: string[];
  condition: AutomationConditionConfig;
  action: AutomationActionConfig;
  status: 'active' | 'paused';
  executionCount: number;
  lastExecutedAt?: string;
  nextRunAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AutomationExecutionEntity {
  [key: string]: unknown;
  executionId: string;
  automationId: string;
  workspaceId: string;
  automationName: string;
  status: AutomationJobStatus;
  triggerEvent: string;
  retryCount: number;
  maxRetries: number;
  summary?: string;
  resultPayload?: Record<string, unknown>;
  errorMessage?: string;
  startedAt: string;
  completedAt?: string;
}
