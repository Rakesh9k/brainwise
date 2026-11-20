/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { AutomationEntity } from './types';

export interface AutomationTemplateDefinition {
  templateId: string;
  name: string;
  description: string;
  category: 'daily' | 'weekly' | 'monthly' | 'system';
  suggestedTrigger: AutomationEntity['trigger'];
  sourceProviders: string[];
  suggestedCondition: AutomationEntity['condition'];
  suggestedAction: AutomationEntity['action'];
}

export const AUTOMATION_TEMPLATES: AutomationTemplateDefinition[] = [
  {
    templateId: 'tmpl_daily_business_intel',
    name: 'Daily Business Intelligence',
    description:
      'Runs daily at 08:30 AM. Ingests all connected business telemetry, flags significant 24h anomalies, and creates a prioritized founder briefing.',
    category: 'daily',
    suggestedTrigger: {
      type: 'time_based',
      schedule: 'daily',
      timeOfDay: '08:30',
    },
    sourceProviders: ['google-analytics-4', 'google-search-console', 'google-research'],
    suggestedCondition: {
      comparison: 'always',
    },
    suggestedAction: {
      type: 'generate_intelligence_report',
      category: 'B_INTERNAL',
      reportTitle: 'Daily Morning Founder Intelligence Digest',
      targetDepartment: 'business-performance',
    },
  },
  {
    templateId: 'tmpl_weekly_competitor_monitoring',
    name: 'Weekly Competitor Monitoring',
    description:
      'Runs every Monday at 09:00 AM. Scans public competitor digital footprints, verifies pricing tier changes, and compiles a competitive shift memo.',
    category: 'weekly',
    suggestedTrigger: {
      type: 'time_based',
      schedule: 'weekly',
      daysOfWeek: [1], // Monday
      timeOfDay: '09:00',
    },
    sourceProviders: ['google-research'],
    suggestedCondition: {
      comparison: 'always',
    },
    suggestedAction: {
      type: 'run_competitor_research',
      category: 'B_INTERNAL',
      reportTitle: 'Weekly Competitor Moves & Pricing Shift Report',
      targetDepartment: 'competitive-intelligence',
    },
  },
  {
    templateId: 'tmpl_weekly_website_performance',
    name: 'Weekly Website Performance',
    description:
      'Runs every Monday at 09:30 AM. Pulls GA4 traffic, calculates 7-day period-over-period diffs, highlights top landing pages, and drafts conversion recommendations.',
    category: 'weekly',
    suggestedTrigger: {
      type: 'time_based',
      schedule: 'weekly',
      daysOfWeek: [1],
      timeOfDay: '09:30',
    },
    sourceProviders: ['google-analytics-4'],
    suggestedCondition: {
      comparison: 'previous_7_days_vs_preceding_7_days',
    },
    suggestedAction: {
      type: 'analyze_performance',
      category: 'B_INTERNAL',
      reportTitle: 'Weekly GA4 Website Performance Audit',
      targetDepartment: 'business-performance',
    },
  },
  {
    templateId: 'tmpl_weekly_seo_monitoring',
    name: 'Weekly SEO Monitoring',
    description:
      'Runs every Tuesday at 10:00 AM. Ingests Google Search Console queries, uncovers high-impression low-CTR opportunities, and identifies dropping page rankings.',
    category: 'weekly',
    suggestedTrigger: {
      type: 'time_based',
      schedule: 'weekly',
      daysOfWeek: [2], // Tuesday
      timeOfDay: '10:00',
    },
    sourceProviders: ['google-search-console'],
    suggestedCondition: {
      comparison: 'always',
    },
    suggestedAction: {
      type: 'generate_recommendations',
      category: 'B_INTERNAL',
      reportTitle: 'Weekly Organic Search & High-Opportunity Keyword Audit',
      targetDepartment: 'growth-director',
    },
  },
  {
    templateId: 'tmpl_monthly_business_intelligence',
    name: 'Monthly Business Intelligence',
    description:
      'Runs on the 1st of every month. Consolidates multi-channel traffic, revenue observations, competitor benchmarks, and drafts an executive board report.',
    category: 'monthly',
    suggestedTrigger: {
      type: 'time_based',
      schedule: 'monthly',
      timeOfDay: '09:00',
    },
    sourceProviders: [
      'google-analytics-4',
      'google-search-console',
      'google-research',
      'google-business-profile',
    ],
    suggestedCondition: {
      comparison: 'previous_30_days_vs_preceding_30_days',
    },
    suggestedAction: {
      type: 'generate_intelligence_report',
      category: 'B_INTERNAL',
      reportTitle: 'Monthly Comprehensive Executive Strategy Scorecard',
      targetDepartment: 'business-performance',
    },
  },
  {
    templateId: 'tmpl_integration_health_monitoring',
    name: 'Integration Health Monitoring',
    description:
      'Runs every 6 hours. Pings connected providers, checks token expiration windows, attempts automatic refresh, and triggers alerts on connection faults.',
    category: 'system',
    suggestedTrigger: {
      type: 'time_based',
      schedule: 'daily',
      timeOfDay: '00:00',
    },
    sourceProviders: ['google-analytics-4', 'google-search-console', 'google-business-profile'],
    suggestedCondition: {
      comparison: 'always',
    },
    suggestedAction: {
      type: 'create_notification',
      category: 'B_INTERNAL',
      notificationTitle: 'Integration Health & Permission Audit',
      targetDepartment: 'settings',
    },
  },
  {
    templateId: 'tmpl_industry_trend_discovery',
    name: 'Industry Trend Discovery',
    description:
      'Runs bi-weekly. Scans macroeconomic signals, consumer behavior changes, and new regulatory publications to uncover growth opportunities.',
    category: 'weekly',
    suggestedTrigger: {
      type: 'time_based',
      schedule: 'weekly',
      daysOfWeek: [3], // Wednesday
      timeOfDay: '11:00',
    },
    sourceProviders: ['google-research'],
    suggestedCondition: {
      comparison: 'always',
    },
    suggestedAction: {
      type: 'discover_industry_trends',
      category: 'B_INTERNAL',
      reportTitle: 'Industry Benchmark & Emergent Trend Briefing',
      targetDepartment: 'market-watch',
    },
  },
];
