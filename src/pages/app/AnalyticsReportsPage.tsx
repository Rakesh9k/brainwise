import React, { useEffect, useRef, useState } from 'react';
import { BarChart3, Download, FileBarChart2, Info } from 'lucide-react';
import { useBrainWise, useWorkspaceBreadcrumbs } from '../../context/BrainWiseContext';
import {
  buildExecutiveReportNarrative,
  calculateBrainCompleteness,
  calculateGoalProgress,
  calculateTaskCompletionStats,
  computeDashboardMetrics,
} from '../../utils/logic';
import type { UIViewState } from '../../types/brainwise';
import {
  Button,
  ChartContainer,
  EmptyState,
  ErrorState,
  FilterBar,
  FluidProgress,
  FluidTransition,
  GrowthTrendChart,
  IntelligenceOrb,
  IntelligenceSurface,
  LiquidSkeletonReveal,
  MetricCard,
  PageHeader,
  SectionHeader,
  StatusBadge,
  Tabs,
  type GrowthTrendSeriesMap,
} from '../../components/ui/DesignSystem';
import { AnalyticsSkeleton } from '../../components/ui/LiquidSkeletons';
import { BusinessBrainContextBanner, JourneyNextStep } from '../../components/ui/DepartmentCards';
import { typeClass } from '../../theme/typography';

const MONTHLY_DEMO_SERIES = [
  { month: 'Jun', revenue: 420, leads: 48 },
  { month: 'Jul', revenue: 680, leads: 76 },
  { month: 'Aug', revenue: 910, leads: 104 },
  { month: 'Sep', revenue: 1180, leads: 138 },
  { month: 'Oct', revenue: 1420, leads: 172 },
  { month: 'Nov', revenue: 1680, leads: 214 },
];

const ANALYTICS_MRR_SERIES: GrowthTrendSeriesMap = {
  '7d': [
    { label: 'Mon', value: 1540, baseline: 1490, detail: '28 weekly trial leads' },
    { label: 'Tue', value: 1565, baseline: 1510, detail: '34 weekly trial leads', milestone: 'Ship Hook' },
    { label: 'Wed', value: 1590, baseline: 1530, detail: '39 weekly trial leads' },
    { label: 'Thu', value: 1615, baseline: 1550, detail: '44 weekly trial leads' },
    { label: 'Fri', value: 1648, baseline: 1570, detail: '51 weekly trial leads', milestone: 'Press Drop', milestoneTone: 'accent' },
    { label: 'Sun', value: 1680, baseline: 1595, detail: '58 weekly trial leads' },
  ],
  '30d': [
    { label: 'W1', value: 1420, baseline: 1380, detail: '172 qualified leads' },
    { label: 'W2', value: 1485, baseline: 1435, detail: '184 qualified leads', milestone: 'Checkout Test' },
    { label: 'W3', value: 1550, baseline: 1490, detail: '196 qualified leads' },
    { label: 'W4', value: 1618, baseline: 1545, detail: '205 qualified leads', milestone: 'Tasting Kits', milestoneTone: 'accent' },
    { label: 'Now', value: 1680, baseline: 1600, detail: '214 qualified leads' },
  ],
  '90d': [
    { label: 'Sep 1', value: 1060, baseline: 1020, detail: '124 qualified leads' },
    { label: 'Sep 15', value: 1180, baseline: 1130, detail: '138 qualified leads', milestone: 'Flight Launch' },
    { label: 'Oct 1', value: 1310, baseline: 1240, detail: '154 qualified leads' },
    { label: 'Oct 15', value: 1420, baseline: 1350, detail: '172 qualified leads' },
    { label: 'Nov 1', value: 1560, baseline: 1475, detail: '193 qualified leads', milestone: 'Free Ship', milestoneTone: 'accent' },
    { label: 'Now', value: 1680, baseline: 1600, detail: '214 qualified leads' },
  ],
  ytd: MONTHLY_DEMO_SERIES.map((pt, idx) => ({
    label: pt.month,
    value: pt.revenue,
    baseline: 400 + idx * 235,
    detail: `${pt.leads} qualified leads`,
    ...(pt.month === 'Jul'
      ? { milestone: 'Sub Launch' }
      : pt.month === 'Oct'
      ? { milestone: 'B2B Studios', milestoneTone: 'accent' as const }
      : {}),
  })),
};

const ANALYTICS_TAB_LABELS: Record<'overview' | 'marketing' | 'growth' | 'reports', string> = {
  overview: 'Overview',
  marketing: 'Marketing Funnel',
  growth: 'Growth & Retention',
  reports: 'Executive Reports',
};

export const AnalyticsReportsPage: React.FC<{ initialTab?: 'overview' | 'reports' }> = ({
  initialTab = 'overview',
}) => {
  const { state, navigate, showToast, departmentResetNonce } = useBrainWise();
  const [tab, setTab] = useState<'overview' | 'marketing' | 'growth' | 'reports'>(initialTab);
  const [viewState, setViewState] = useState<UIViewState>('default');
  const [selectedReport, setSelectedReport] = useState('Weekly Business Report');

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  const resetRef = useRef(departmentResetNonce);
  useEffect(() => {
    if (resetRef.current !== departmentResetNonce) {
      resetRef.current = departmentResetNonce;
      setViewState('default');
      setTab(initialTab);
    }
  }, [departmentResetNonce, initialTab]);

  useWorkspaceBreadcrumbs(
    initialTab === 'reports'
      ? tab === 'reports'
        ? [{ label: selectedReport }]
        : [{ label: ANALYTICS_TAB_LABELS[tab] }]
      : tab === 'reports'
      ? [
          { label: 'Executive Reports', onClick: () => setTab('overview') },
          { label: selectedReport },
        ]
      : tab !== 'overview'
      ? [{ label: ANALYTICS_TAB_LABELS[tab] }]
      : [],
    [initialTab, tab, selectedReport]
  );

  const taskStats = calculateTaskCompletionStats(state.tasks);
  const brainComp = calculateBrainCompleteness(state.brain);
  const dashboardMetrics = computeDashboardMetrics(state);
  const narrative = buildExecutiveReportNarrative(selectedReport, state);

  return (
    <div className="space-y-6">
      <BusinessBrainContextBanner departmentLabel="Business Analytics & Reports" />

      <PageHeader
        mutedPrefix={initialTab === 'reports' ? 'Executive' : 'Analytics &'}
        title="Reports"
        subtitle="Combine live workspace execution metrics with simulated storefront attribution and board-ready executive reports."
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setTab('reports');
            }}
          >
            <FileBarChart2 className="w-4 h-4" />
            Open Executive Reports
          </Button>
        }
      />

      {/* Secondary Telemetry Notice & Preview State Utility Bar */}
      <div className="rounded-[10px] border border-[#F3D8B8] bg-[#FDF4EA] px-4 py-2.5 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs text-[#686864]">
        <div className="flex items-center gap-2.5">
          <Info className="w-4 h-4 text-[#A85E16] shrink-0" />
          <span>
            <strong className="text-[#242424]">Live Workspace + Simulated Storefront Telemetry:</strong>{' '}
            Execution rates, goal progress, and experiment counts are live; external revenue/funnel charts are simulated preview feeds.
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-medium text-[#686864]">Feed Preview:</span>
          <FilterBar
            activeId={viewState}
            onChange={(id) => setViewState(id as UIViewState)}
            options={[
              { id: 'default', label: 'Demo Feed' },
              { id: 'empty', label: 'Empty' },
              { id: 'loading', label: 'Loading' },
              { id: 'error', label: 'Error' },
            ]}
          />
        </div>
      </div>

      {viewState === 'error' && (
        <ErrorState
          title="Unable to sync external analytics connector"
          description="Simulated connector timeout state. Restore demonstration data or configure integrations in Settings."
          onRetry={() => setViewState('default')}
        />
      )}

      {viewState === 'empty' && (
        <EmptyState
          illustration="pulse"
          size="spacious"
          overline="Connector Telemetry · Disconnected"
          mutedPrefix="No live storefront"
          title="connectors enabled yet"
          description="Connect Shopify, Stripe, or Google Analytics in Settings—or restore the prototype feed to evaluate charts and executive reports."
          meta="0 external connectors synced · Local workspace telemetry ready"
          actionLabel="Restore Demo Feed"
          actionVariant="primary"
          onAction={() => setViewState('default')}
          secondaryActionLabel="Open Integrations"
          onSecondaryAction={() => navigate('settings', { settingsTab: 'integrations' })}
        />
      )}

      {(viewState === 'loading' || viewState === 'default') && (
        <LiquidSkeletonReveal
          loading={viewState === 'loading'}
          contentKey={`analytics-${tab}`}
          statusLabel="Compiling performance telemetry & attribution"
          skeleton={<AnalyticsSkeleton label="Compiling performance telemetry & attribution…" />}
          className="space-y-6"
        >
          <Tabs
            activeTab={tab}
            onChange={(id) => setTab(id as typeof tab)}
            tabs={[
              { id: 'overview', label: 'Performance Overview' },
              { id: 'marketing', label: 'Marketing Attribution' },
              { id: 'growth', label: 'Execution & Experiments' },
              { id: 'reports', label: 'Executive Reports', count: 4 },
            ]}
          />

          {tab === 'overview' && (
            <FluidTransition key="overview" direction="fade" className="space-y-6">
              {/* Live Workspace Operational Metrics */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                  label="Sprint Completion (Live)"
                  value={`${taskStats.completionRate}%`}
                  detail={`${taskStats.completed} of ${taskStats.total} tasks completed`}
                  accent
                />
                <MetricCard
                  label="Goal Alignment (Live)"
                  value={`${dashboardMetrics.goalsAvgPercentage}%`}
                  detail={`${state.goals.length} tracked goal(s)`}
                />
                <MetricCard
                  label="Monthly Revenue (Simulated)"
                  value="$1,680"
                  delta="+18.3% MoM"
                  deltaTone="positive"
                />
                <MetricCard
                  label="Trial → Sub Rate (Simulated)"
                  value="36.0%"
                  detail="Target: 40% benchmark"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7">
                  <ChartContainer
                    title="Monthly Recurring Revenue Trajectory (Simulated Feed)"
                    subtitle="Interactive storefront revenue progression across 7d, 30d, 90d, and YTD"
                  >
                    <GrowthTrendChart
                      unitPrefix="$"
                      height={216}
                      showYAxis
                      defaultRange="ytd"
                      rangeLabel="Horizon"
                      rangeSeries={ANALYTICS_MRR_SERIES}
                      metricLabel="Simulated MRR"
                      baselineLabel="Target Pace"
                      ariaLabel="Monthly recurring revenue trajectory chart"
                    />
                  </ChartContainer>
                </div>

                <div className="lg:col-span-5">
                  <ChartContainer
                    title="Growth Against Targets (Live)"
                    subtitle="Direct progress synced from Growth Planner"
                  >
                    {state.goals.length === 0 ? (
                      <div className="py-6 space-y-3 text-xs text-[#686864]">
                        <p>No business goals configured yet for {state.brain.businessName}.</p>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => navigate('growth-director')}
                        >
                          Set Goals in Growth Planner
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {state.goals.map((g) => {
                          const { percentage } = calculateGoalProgress(g);
                          return (
                            <div key={g.id} className="space-y-1">
                              <div className="flex items-center justify-between text-xs gap-2">
                                <span className="font-medium text-[#252525] truncate">
                                  {g.title}
                                </span>
                                <span className="font-mono-num text-[#C44D00] font-semibold shrink-0 tabular-nums">
                                  {percentage}%
                                </span>
                              </div>
                              <FluidProgress value={percentage} showPercent={false} size="sm" />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </ChartContainer>
                </div>
              </div>
            </FluidTransition>
          )}

          {tab === 'marketing' && (
            <FluidTransition key="marketing" direction="fade" className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  channel: 'Social & Organic Reels',
                  reach: '12,500',
                  leads: '92 starter inquiries',
                  cac: '$6.40 est.',
                },
                {
                  channel: 'Direct B2B / Group Outreach',
                  reach: '18 accounts',
                  leads: '4 pilot agreements',
                  cac: '$14.00 est.',
                },
                {
                  channel: 'Search & Referral Links',
                  reach: '3,100',
                  leads: '48 site signups',
                  cac: '$8.20 est.',
                },
              ].map((m) => (
                <div
                  key={m.channel}
                  className="rounded-[12px] border border-[#E6E6E2] bg-[#FFFFFF] p-5 space-y-3 bw-surface-raised"
                >
                  <div className="text-xs font-semibold text-[#C44D00]">
                    Simulated Channel Attribution
                  </div>
                  <h3 className="font-heading text-base font-bold text-[#242424]">{m.channel}</h3>
                  <div className="text-xs text-[#686864] space-y-1">
                    <div>
                      Reach: <strong className="font-mono-num text-[#242424]">{m.reach}</strong>
                    </div>
                    <div>
                      Conversions: <strong className="text-[#242424]">{m.leads}</strong>
                    </div>
                    <div>
                      Est. CAC: <strong className="font-mono-num text-[#242424]">{m.cac}</strong>
                    </div>
                  </div>
                </div>
              ))}
            </FluidTransition>
          )}

          {tab === 'growth' && (
            <FluidTransition key="growth" direction="fade" className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MetricCard
                label="Task Completion Rate (Live)"
                value={`${taskStats.completionRate}%`}
                detail={`${taskStats.completed} of ${taskStats.total} executed`}
              />
              <MetricCard
                label="Experiments Running (Live)"
                value={dashboardMetrics.activeExperimentsCount}
                detail={`${state.experiments.length} total tracked tests`}
                accent
              />
              <MetricCard
                label="Business Brain Sync (Live)"
                value={`${brainComp.percentage}%`}
                detail={`${state.recommendations.filter((r) => r.status === 'accepted').length} accepted recommendations`}
              />
            </FluidTransition>
          )}

          {tab === 'reports' && (
            <FluidTransition key="reports" direction="fade" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-4 space-y-2.5">
                <SectionHeader title="Available Reports" />
                {[
                  'Weekly Business Report',
                  'Monthly Growth Report',
                  'Marketing Performance Report',
                  'Competitive Intelligence Report',
                ].map((rep) => (
                  <button
                    key={rep}
                    type="button"
                    onClick={() => setSelectedReport(rep)}
                    className={`w-full text-left p-4 rounded-[12px] border transition-colors cursor-pointer ${
                      selectedReport === rep
                        ? 'border-[#FF7417] bg-[#FFF0E5]/55'
                        : 'border-[#E6E6E2] bg-[#FFFFFF] hover:bg-[#F5F5F4]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-[#242424]">{rep}</span>
                      <FileBarChart2 className="w-4 h-4 text-[#FF7417]" />
                    </div>
                    <div className="text-xs text-[#686864] mt-1">
                      Synthesized from live {state.brain.businessName} workspace
                    </div>
                  </button>
                ))}
              </div>

              <IntelligenceSurface
                variant="light"
                className="lg:col-span-8 p-6 space-y-5 bw-surface-raised"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[#E6E6E2]">
                  <div>
                    <div className="inline-flex items-center gap-2">
                      <IntelligenceOrb size="xs" state="active" />
                      <StatusBadge status="Live Workspace Report" tone="accent" />
                    </div>
                    <h2 className={`${typeClass.h4} font-bold text-[#171717] mt-2`}>
                      {selectedReport}
                    </h2>
                    <div className={`${typeClass.monoMeta} text-[#686864]`}>
                      {state.brain.businessName} · Updated {state.brain.lastUpdated}
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      window.print();
                      showToast(`Exported ${selectedReport}.`);
                    }}
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export PDF
                  </Button>
                </div>

                <div className="p-3.5 rounded-[10px] bg-[#FAFAF9] border border-[#E6E6E2] text-xs font-mono-num text-[#252525]">
                  {narrative.metricsLine}
                </div>

                <div className="space-y-4 text-sm text-[#252525] leading-relaxed">
                  <p>
                    <strong>Executive Takeaways:</strong> {narrative.takeaway}
                  </p>
                  <p>
                    <strong>Strategic Priority Adjustment:</strong> {narrative.priorityAdjustment}
                  </p>
                </div>
              </IntelligenceSurface>
            </FluidTransition>
          )}
        </LiquidSkeletonReveal>
      )}

      <JourneyNextStep currentRoute={initialTab === 'reports' ? 'reports' : 'business-performance'} />
    </div>
  );
};
