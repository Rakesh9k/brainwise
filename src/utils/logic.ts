import type {
  AppRoute,
  BrainWiseState,
  BrandAsset,
  BrandConcept,
  BrandIdentityState,
  BreadcrumbSegment,
  BusinessBrainData,
  CarouselSlide,
  CompetitorProfileData,
  GrowthGoal,
  GrowthTask,
  MarketScenarioPreset,
  ResearchReport,
  TruthCheckResult,
} from '../types/brainwise';
import { executeTruthCheck } from './truthCheck';

export interface BrainCompletenessResult {
  percentage: number;
  completedSections: number;
  totalSections: number;
  missingItems: { section: string; prompt: string }[];
}

export function calculateBrainCompleteness(brain: BusinessBrainData): BrainCompletenessResult {
  const checks: { section: string; ok: boolean; prompt: string }[] = [
    {
      section: 'Business Profile',
      ok: Boolean(brain.businessName.trim() && brain.industry.trim() && brain.overviewSummary.trim()),
      prompt: 'Add your business name, industry, and core summary.',
    },
    {
      section: 'Products & Services',
      ok: brain.products.length > 0,
      prompt: 'Define at least one flagship product or service offering.',
    },
    {
      section: 'Target Audience',
      ok: Boolean(brain.targetAudience.trim()),
      prompt: 'Describe your primary customer segment and geography.',
    },
    {
      section: 'Customer Personas',
      ok: brain.personas.length > 0,
      prompt: 'Add at least one customer persona with pain points.',
    },
    {
      section: 'Brand Positioning',
      ok: Boolean(brain.brandPositioning.trim() && brain.valueProposition.trim()),
      prompt: 'Articulate your differentiation and value proposition.',
    },
    {
      section: 'Business & Revenue Model',
      ok: Boolean(brain.businessModel.trim() && brain.revenueModel.trim()),
      prompt: 'Specify how your business creates and captures revenue.',
    },
    {
      section: 'Business Goals',
      ok: brain.primaryGoals.length > 0,
      prompt: 'Set measurable business objectives.',
    },
    {
      section: 'Supporting Documents',
      ok: brain.documents.length > 0,
      prompt: 'Upload pitch decks, briefs, or customer notes for AI context.',
    },
  ];

  const completedSections = checks.filter((c) => c.ok).length;
  const totalSections = checks.length;
  const percentage = Math.round((completedSections / totalSections) * 100);
  const missingItems = checks
    .filter((c) => !c.ok)
    .map((c) => ({ section: c.section, prompt: c.prompt }));

  return {
    percentage,
    completedSections,
    totalSections,
    missingItems,
  };
}

export interface TaskCompletionStats {
  total: number;
  completed: number;
  pending: number;
  skipped: number;
  completionRate: number;
  remainingMinutes: number;
  highPriorityPending: number;
}

export function calculateTaskCompletionStats(tasks: GrowthTask[]): TaskCompletionStats {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === 'completed').length;
  const skipped = tasks.filter((t) => t.status === 'skipped').length;
  const pendingTasks = tasks.filter((t) => t.status === 'pending');
  const pending = pendingTasks.length;
  const activeDenominator = Math.max(1, total - skipped);
  const completionRate = total === 0 ? 0 : Math.min(100, Math.round((completed / activeDenominator) * 100));
  const remainingMinutes = pendingTasks.reduce((sum, t) => sum + t.estimatedMinutes, 0);
  const highPriorityPending = pendingTasks.filter((t) => t.priority === 'high').length;

  return {
    total,
    completed,
    pending,
    skipped,
    completionRate,
    remainingMinutes,
    highPriorityPending,
  };
}

export function calculateGoalProgress(goal: GrowthGoal): {
  percentage: number;
  status: 'completed' | 'on_track' | 'needs_attention';
} {
  if (goal.targetValue <= 0) {
    return { percentage: 0, status: 'needs_attention' };
  }
  const raw = Math.round((goal.currentValue / goal.targetValue) * 100);
  const percentage = Math.max(0, Math.min(100, raw));
  const status =
    percentage >= 100 ? 'completed' : percentage >= 45 ? 'on_track' : 'needs_attention';
  return { percentage, status };
}

export function estimateMarketSizing(
  tamBillion: number,
  samSharePct: number,
  somSharePct: number
): {
  tamBand: string;
  samBand: string;
  somBand: string;
} {
  const safeTam = Math.max(0.1, tamBillion);
  const samBillion = safeTam * (Math.max(1, Math.min(100, samSharePct)) / 100);
  const somMillion = samBillion * 1000 * (Math.max(0.1, Math.min(50, somSharePct)) / 100);

  const formatRange = (val: number, unit: 'B' | 'M') => {
    const low = Math.max(0.1, val * 0.85);
    const high = val * 1.15;
    if (unit === 'B') {
      return `$${low.toFixed(1)}B – $${high.toFixed(1)}B`;
    }
    if (high < 10) {
      return `$${low.toFixed(1)}M – $${high.toFixed(1)}M`;
    }
    return `$${Math.round(low)}M – $${Math.round(high)}M`;
  };

  return {
    tamBand: formatRange(safeTam, 'B'),
    samBand: samBillion >= 1 ? formatRange(samBillion, 'B') : formatRange(samBillion * 1000, 'M'),
    somBand: formatRange(somMillion, 'M'),
  };
}

export interface SearchHit {
  id: string;
  title: string;
  subtitle: string;
  category:
    | 'Business Brain'
    | 'Research Report'
    | 'Competitor'
    | 'Brand Asset'
    | 'Task'
    | 'Experiment'
    | 'Market Alert';
  route: AppRoute;
  itemId?: string;
}

export function filterGlobalSearch(query: string, state: BrainWiseState): SearchHit[] {
  const q = query.trim().toLowerCase();
  const hits: SearchHit[] = [];

  // Business info & products
  if (
    !q ||
    state.brain.businessName.toLowerCase().includes(q) ||
    state.brain.industry.toLowerCase().includes(q) ||
    state.brain.brandPositioning.toLowerCase().includes(q)
  ) {
    hits.push({
      id: 'brain-overview',
      title: state.brain.businessName || 'Business Profile',
      subtitle: `${state.brain.industry} · ${state.brain.stage}`,
      category: 'Business Brain',
      route: 'business-brain',
    });
  }

  for (const prod of state.brain.products) {
    if (!q || prod.name.toLowerCase().includes(q) || prod.description.toLowerCase().includes(q)) {
      hits.push({
        id: `prod-${prod.id}`,
        title: prod.name,
        subtitle: `${prod.category} · ${prod.priceRange}`,
        category: 'Business Brain',
        route: 'business-brain',
      });
    }
  }

  for (const rep of state.reports) {
    if (
      !q ||
      rep.title.toLowerCase().includes(q) ||
      rep.ideaSummary.toLowerCase().includes(q) ||
      rep.industry.toLowerCase().includes(q)
    ) {
      hits.push({
        id: `rep-${rep.id}`,
        title: rep.title,
        subtitle: `${rep.industry} · ${rep.overallConfidence} confidence`,
        category: 'Research Report',
        route: 'idea-intelligence',
        itemId: rep.id,
      });
    }
  }

  for (const comp of state.competitors) {
    if (
      !q ||
      comp.name.toLowerCase().includes(q) ||
      comp.positioning.toLowerCase().includes(q) ||
      comp.category.toLowerCase().includes(q)
    ) {
      hits.push({
        id: `comp-${comp.id}`,
        title: comp.name,
        subtitle: `${comp.category} · ${comp.priceRange}`,
        category: 'Competitor',
        route: 'competitive-intelligence',
        itemId: comp.id,
      });
    }
  }

  for (const asset of state.assets) {
    if (!q || asset.title.toLowerCase().includes(q) || asset.category.toLowerCase().includes(q)) {
      hits.push({
        id: `asset-${asset.id}`,
        title: asset.title,
        subtitle: `${asset.category} · ${asset.format}`,
        category: 'Brand Asset',
        route: 'asset-library',
        itemId: asset.id,
      });
    }
  }

  for (const task of state.tasks) {
    if (!q || task.title.toLowerCase().includes(q) || task.department.toLowerCase().includes(q)) {
      hits.push({
        id: `task-${task.id}`,
        title: task.title,
        subtitle: `${task.department} · ${task.estimatedMinutes}m · ${task.status}`,
        category: 'Task',
        route: 'growth-director',
        itemId: task.id,
      });
    }
  }

  for (const exp of state.experiments) {
    if (!q || exp.title.toLowerCase().includes(q) || exp.hypothesis.toLowerCase().includes(q)) {
      hits.push({
        id: `exp-${exp.id}`,
        title: exp.title,
        subtitle: `${exp.status} · ${exp.successMetric}`,
        category: 'Experiment',
        route: 'tasks-experiments',
        itemId: exp.id,
      });
    }
  }

  for (const ev of state.marketEvents) {
    if (
      !q ||
      ev.competitorOrSource.toLowerCase().includes(q) ||
      ev.detectedChange.toLowerCase().includes(q)
    ) {
      hits.push({
        id: `event-${ev.id}`,
        title: `${ev.competitorOrSource}: ${ev.category}`,
        subtitle: ev.detectedChange,
        category: 'Market Alert',
        route: 'market-watch',
        itemId: ev.id,
      });
    }
  }

  return hits.slice(0, q ? 20 : 10);
}

export interface JourneyStepHint {
  nextRoute: AppRoute;
  label: string;
  description: string;
  cta: string;
}

export function getNextJourneyStep(current: AppRoute): JourneyStepHint | null {
  const map: Partial<Record<AppRoute, JourneyStepHint>> = {
    dashboard: {
      nextRoute: 'idea-intelligence',
      label: 'Next in Founder Journey',
      description: 'Validate a new product line or market expansion concept with structured research.',
      cta: 'Open Idea Intelligence',
    },
    'business-brain': {
      nextRoute: 'idea-intelligence',
      label: 'Connected Workflow',
      description: 'Put your Business Brain context to work in market validation and opportunity sizing.',
      cta: 'Validate an Idea',
    },
    'idea-intelligence': {
      nextRoute: 'competitive-intelligence',
      label: 'Next in Founder Journey',
      description: 'Examine direct rivals, pricing ladders, and white-space positioning gaps.',
      cta: 'Analyse these competitors',
    },
    'competitive-intelligence': {
      nextRoute: 'brand-studio',
      label: 'Next in Founder Journey',
      description: 'Translate your differentiation strategy into visual identity, voice, and collateral.',
      cta: 'Build this positioning into my brand',
    },
    'brand-studio': {
      nextRoute: 'growth-director',
      label: 'Next in Founder Journey',
      description: 'Turn your new brand assets into a 30-day launch plan, daily tasks, and experiments.',
      cta: 'Create a launch campaign',
    },
    'asset-library': {
      nextRoute: 'growth-director',
      label: 'Put Assets Into Market',
      description: 'Schedule your approved creative deliverables inside your 30-day growth roadmap.',
      cta: 'Open Growth Planner',
    },
    'growth-director': {
      nextRoute: 'market-watch',
      label: 'Next in Founder Journey',
      description: 'Keep watch on competitor pricing shifts, launches, and review sentiment while you execute.',
      cta: 'Monitor Market Watch',
    },
    'tasks-experiments': {
      nextRoute: 'business-performance',
      label: 'Measure Execution',
      description: 'Review how completed tasks and active experiments are influencing acquisition and revenue.',
      cta: 'Review performance results',
    },
    'market-watch': {
      nextRoute: 'tasks-experiments',
      label: 'Turn Signal Into Action',
      description: 'Convert competitor movements and emerging trends into structured growth experiments.',
      cta: 'Turn opportunity into experiment',
    },
    'business-performance': {
      nextRoute: 'growth-director',
      label: 'Strategy Review Loop',
      description: 'Adjust your 30/60/90-day growth priorities based on observed conversion and retention trends.',
      cta: 'Update my growth strategy',
    },
    reports: {
      nextRoute: 'growth-director',
      label: 'Act on Insights',
      description: 'Convert report recommendations into concrete weekly actions and tests.',
      cta: 'Open Growth Planner',
    },
  };
  return map[current] ?? null;
}

export interface ShellBreadcrumbItem {
  id: string;
  label: string;
  level: 'root' | 'group' | 'department' | 'sub';
  isCurrent: boolean;
  onClick?: () => void;
}

export function buildShellBreadcrumbs(params: {
  route: AppRoute;
  group: string;
  routeTitle: string;
  subTrail: BreadcrumbSegment[];
  onNavigateRoot?: () => void;
  onResetDepartment?: () => void;
}): ShellBreadcrumbItem[] {
  const cleanSub = params.subTrail.filter((seg) => seg.label.trim().length > 0);
  const hasSubTrail = cleanSub.length > 0;

  const items: ShellBreadcrumbItem[] = [
    {
      id: 'root',
      label: 'BrainWise',
      level: 'root',
      isCurrent: false,
      onClick: params.route === 'dashboard' && !hasSubTrail ? undefined : params.onNavigateRoot,
    },
    {
      id: 'group',
      label: params.group,
      level: 'group',
      isCurrent: false,
    },
    {
      id: 'department',
      label: params.routeTitle,
      level: 'department',
      isCurrent: !hasSubTrail,
      onClick: hasSubTrail ? params.onResetDepartment : undefined,
    },
  ];

  cleanSub.forEach((seg, index) => {
    const isLast = index === cleanSub.length - 1;
    items.push({
      id: `sub-${index}-${seg.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      label: seg.label.trim(),
      level: 'sub',
      isCurrent: isLast,
      onClick: isLast ? undefined : seg.onClick,
    });
  });

  return items;
}

export interface JournalArticle {
  id: string;
  category: 'Market Validation' | 'Positioning' | 'Brand Systems' | 'Growth Execution';
  title: string;
  excerpt: string;
  readTime: string;
  publishedAt: string;
  image?: string;
  takeaways: string[];
  defaultPrompt: string;
}

export function filterJournalArticles(
  articles: JournalArticle[],
  category: string
): JournalArticle[] {
  if (!category || category === 'All') {
    return articles;
  }
  return articles.filter((article) => article.category === category);
}

export function synthesizePlaybookPrompt(
  article: JournalArticle,
  question: string
): string {
  const clean = question.trim();
  const focus = clean.length > 0 ? clean : article.defaultPrompt;
  switch (article.category) {
    case 'Market Validation':
      return `Validation Lens for "${focus}": Anchor assumptions with conservative TAM/SAM/SOM range bands, interview 15+ active buyers on recent switching triggers, and test willingness-to-pay with a low-capex discovery offer before locking fixed overhead.`;
    case 'Positioning':
      return `Differentiation Angle for "${focus}": Map the 3 highest-frequency 3-star complaints across top incumbents, claim a single defensible wedge (such as batch roast-date transparency), and translate that contrast directly into your hero headline.`;
    case 'Brand Systems':
      return `Identity Direction for "${focus}": Pair high-contrast typographic hierarchy with restrained 60-30-10 surface tokens so packaging, landing pages, and social carousels reinforce one recognizable visual signature.`;
    case 'Growth Execution':
      return `30-Day Execution Cadence for "${focus}": Break the objective into 3 weekly hypotheses, assign 25–45 minute daily founder tasks with explicit success thresholds, and inspect competitor responses weekly inside Market Watch.`;
  }
}

export interface ScenarioComparisonResult {
  scenarioA: MarketScenarioPreset & { tamBand: string; samBand: string; somBand: string; somMidpointMillion: number };
  scenarioB: MarketScenarioPreset & { tamBand: string; samBand: string; somBand: string; somMidpointMillion: number };
  breakEvenDeltaMonths: number;
  somUpsideRatio: number;
}

export function compareMarketScenarios(
  a: MarketScenarioPreset,
  b: MarketScenarioPreset
): ScenarioComparisonResult {
  const bandsA = estimateMarketSizing(a.tamBillion, a.samSharePct, a.somSharePct);
  const bandsB = estimateMarketSizing(b.tamBillion, b.samSharePct, b.somSharePct);
  const somMidA = Number(
    (
      Math.max(0.1, a.tamBillion) *
      (Math.max(1, Math.min(100, a.samSharePct)) / 100) *
      1000 *
      (Math.max(0.1, Math.min(50, a.somSharePct)) / 100)
    ).toFixed(2)
  );
  const somMidB = Number(
    (
      Math.max(0.1, b.tamBillion) *
      (Math.max(1, Math.min(100, b.samSharePct)) / 100) *
      1000 *
      (Math.max(0.1, Math.min(50, b.somSharePct)) / 100)
    ).toFixed(2)
  );

  return {
    scenarioA: { ...a, ...bandsA, somMidpointMillion: somMidA },
    scenarioB: { ...b, ...bandsB, somMidpointMillion: somMidB },
    breakEvenDeltaMonths: b.breakEvenMonths - a.breakEvenMonths,
    somUpsideRatio: somMidA > 0 ? Number((somMidB / somMidA).toFixed(2)) : 1,
  };
}

export interface CompetitorProximityItem {
  competitor: CompetitorProfileData;
  distance: number;
  quadrantLabel: string;
}

export function findNearestCompetitors(
  ownX: number,
  ownY: number,
  competitors: CompetitorProfileData[]
): {
  nearest: CompetitorProximityItem[];
  ownQuadrant: string;
  whiteSpaceClearance: number;
} {
  const safeX = Math.max(4, Math.min(96, ownX));
  const safeY = Math.max(4, Math.min(96, ownY));

  const getQuadrant = (x: number, y: number) => {
    if (x >= 50 && y >= 50) return 'Premium Craft & Digital';
    if (x < 50 && y >= 50) return 'Accessible Digital Specialist';
    if (x >= 50 && y < 50) return 'Premium Traditional / Heritage';
    return 'Mass Market Hospitality';
  };

  const nearest = competitors
    .map((competitor) => {
      const dx = safeX - competitor.xValueScore;
      const dy = safeY - competitor.yDiffScore;
      const distance = Math.round(Math.hypot(dx, dy) * 10) / 10;
      return {
        competitor,
        distance,
        quadrantLabel: getQuadrant(competitor.xValueScore, competitor.yDiffScore),
      };
    })
    .sort((a, b) => a.distance - b.distance);

  const whiteSpaceClearance = nearest.length > 0 ? nearest[0].distance : 100;

  return {
    nearest,
    ownQuadrant: getQuadrant(safeX, safeY),
    whiteSpaceClearance,
  };
}

export type ComplaintClusterTopic = 'All' | 'Freshness' | 'Pricing' | 'Onboarding' | 'Delivery';

export interface ReviewComplaintRow {
  competitorId: string;
  competitorName: string;
  complaint: string;
  topic: Exclude<ComplaintClusterTopic, 'All'>;
  averageRating: string;
}

export function classifyComplaintTopic(text: string): Exclude<ComplaintClusterTopic, 'All'> {
  const lower = text.toLowerCase();
  if (lower.includes('roast') || lower.includes('stale') || lower.includes('fresh') || lower.includes('variety') || lower.includes('extraction')) {
    return 'Freshness';
  }
  if (lower.includes('price') || lower.includes('cost') || lower.includes('subscription') || lower.includes('renewal')) {
    return 'Pricing';
  }
  if (lower.includes('ship') || lower.includes('deliver') || lower.includes('wait') || lower.includes('stockout')) {
    return 'Delivery';
  }
  return 'Onboarding';
}

export function filterReviewComplaints(
  competitors: CompetitorProfileData[],
  topic: ComplaintClusterTopic
): ReviewComplaintRow[] {
  const rows: ReviewComplaintRow[] = [];
  for (const comp of competitors) {
    for (const complaint of comp.customerReviews.complaints) {
      const classified = classifyComplaintTopic(complaint);
      if (topic === 'All' || classified === topic) {
        rows.push({
          competitorId: comp.id,
          competitorName: comp.name,
          complaint,
          topic: classified,
          averageRating: comp.customerReviews.averageRating,
        });
      }
    }
  }
  return rows;
}

export function formatBrandCssVariables(brand: BrandIdentityState): string {
  const activeConcept =
    brand.concepts.find((c) => c.id === brand.selectedConceptId) ?? brand.concepts[0];
  const paletteVars = brand.palette
    .map((p) => {
      const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      return `  --brand-${slug}: ${p.hex};`;
    })
    .join('\n');

  return `:root {\n  --brand-primary: ${activeConcept?.primaryColor ?? '#242424'};\n  --brand-accent: ${activeConcept?.accentColor ?? '#EE7542'};\n  --brand-surface: ${activeConcept?.surfaceColor ?? '#FFFFFF'};\n${paletteVars}\n  --font-heading: "${activeConcept?.headingFont ?? 'Manrope'}", sans-serif;\n  --font-body: "${activeConcept?.bodyFont ?? 'Plus Jakarta Sans'}", sans-serif;\n}`;
}

export function formatBrandJsonTokens(brand: BrandIdentityState): string {
  const activeConcept =
    brand.concepts.find((c) => c.id === brand.selectedConceptId) ?? brand.concepts[0];
  return JSON.stringify(
    {
      brandName: brand.brandName,
      tagline: brand.tagline,
      concept: activeConcept?.name ?? 'Default',
      colors: {
        primary: activeConcept?.primaryColor ?? '#242424',
        secondary: activeConcept?.secondaryColor ?? '#F8F8F6',
        accent: activeConcept?.accentColor ?? '#EE7542',
        surface: activeConcept?.surfaceColor ?? '#FFFFFF',
        palette: brand.palette.map((p) => ({ name: p.name, hex: p.hex, role: p.role })),
      },
      typography: brand.typography,
    },
    null,
    2
  );
}

export function selectFocusSprintTasks(tasks: GrowthTask[], limit = 3): GrowthTask[] {
  const priorityWeight: Record<GrowthTask['priority'], number> = {
    high: 0,
    medium: 1,
    low: 2,
  };
  return tasks
    .filter((t) => t.status === 'pending')
    .sort((a, b) => {
      const todayDiff = Number(Boolean(b.isTodayPriority)) - Number(Boolean(a.isTodayPriority));
      if (todayDiff !== 0) return todayDiff;
      return priorityWeight[a.priority] - priorityWeight[b.priority];
    })
    .slice(0, Math.max(1, limit));
}

export function formatCountdownSeconds(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export interface DashboardComputedMetrics {
  isFreshWorkspace: boolean;
  trajectoryLabel: string;
  trajectoryTone: 'success' | 'warning' | 'accent' | 'neutral';
  marketPositionLabel: string;
  marketPositionDetail: string;
  goalsAvgPercentage: number;
  activeExperimentsCount: number;
  pendingRecommendationsCount: number;
  unreadHighImpactCount: number;
  activeAssetsCount: number;
}

export function computeDashboardMetrics(state: BrainWiseState): DashboardComputedMetrics {
  const brainComp = calculateBrainCompleteness(state.brain);
  const taskStats = calculateTaskCompletionStats(state.tasks);
  const goalsAvgPercentage =
    state.goals.length === 0
      ? 0
      : Math.round(
          state.goals.reduce((sum, g) => sum + calculateGoalProgress(g).percentage, 0) /
            state.goals.length
        );
  const activeExperimentsCount = state.experiments.filter((e) => e.status === 'Active').length;
  const pendingRecommendationsCount = state.recommendations.filter(
    (r) => r.status === 'pending'
  ).length;
  const archivedSet = new Set(state.archivedEventIds ?? []);
  const unreadHighImpactCount = state.marketEvents.filter(
    (e) => !archivedSet.has(e.id) && !e.isRead && e.importance === 'high'
  ).length;
  const activeAssetsCount = state.assets.filter((a) => a.status !== 'Archived').length;

  const isFreshWorkspace =
    state.reports.length === 0 &&
    state.competitors.length === 0 &&
    state.goals.length === 0 &&
    state.tasks.length === 0;

  let trajectoryLabel = 'Needs Baseline';
  let trajectoryTone: DashboardComputedMetrics['trajectoryTone'] = 'neutral';
  if (isFreshWorkspace) {
    trajectoryLabel = 'Setup in Progress';
    trajectoryTone = 'accent';
  } else if (brainComp.percentage >= 75 && (goalsAvgPercentage >= 40 || taskStats.completionRate >= 30)) {
    trajectoryLabel = 'Healthy Trajectory';
    trajectoryTone = 'success';
  } else if (brainComp.percentage >= 40 || state.tasks.length > 0) {
    trajectoryLabel = 'Building Momentum';
    trajectoryTone = 'accent';
  } else {
    trajectoryLabel = 'Needs Attention';
    trajectoryTone = 'warning';
  }

  let marketPositionLabel = 'Unmapped';
  let marketPositionDetail = 'Add 2+ competitors to map white space';
  if (state.competitors.length > 0) {
    const pos = state.ownPositionScore ?? { x: 58, y: 80 };
    const prox = findNearestCompetitors(pos.x, pos.y, state.competitors);
    marketPositionLabel = prox.whiteSpaceClearance >= 14 ? 'Differentiated' : 'Crowded Zone';
    marketPositionDetail = `${prox.ownQuadrant} · ${prox.whiteSpaceClearance.toFixed(0)}pt clearance`;
  }

  return {
    isFreshWorkspace,
    trajectoryLabel,
    trajectoryTone,
    marketPositionLabel,
    marketPositionDetail,
    goalsAvgPercentage,
    activeExperimentsCount,
    pendingRecommendationsCount,
    unreadHighImpactCount,
    activeAssetsCount,
  };
}

export function buildDynamicDossier(params: {
  ideaSummary: string;
  industry: string;
  targetMarket: string;
  geography: string;
  depth: ResearchReport['depth'];
  brain: BusinessBrainData;
}): ResearchReport {
  const cleanIdea = params.ideaSummary.trim() || `${params.brain.businessName} New Initiative`;
  const cleanIndustry = params.industry.trim() || params.brain.industry || 'Modern Consumer & B2B';
  const cleanMarket =
    params.targetMarket.trim() || params.brain.targetAudience || 'Early-adopter urban buyers';
  const cleanGeo = params.geography.trim() || params.brain.location || 'Target Regional Markets';
  const tamBillion = params.depth === 'Deep Market Dossier' ? 6.4 : params.depth === 'Standard Validation' ? 4.2 : 2.8;
  const samSharePct = 14;
  const somSharePct = 1.2;
  const sizing = estimateMarketSizing(tamBillion, samSharePct, somSharePct);
  const titleText =
    cleanIdea.length > 72 ? `${cleanIdea.slice(0, 69).trim()}…` : cleanIdea;

  const report: ResearchReport = {
    id: `rep-${Date.now()}`,
    title: titleText,
    ideaSummary: cleanIdea,
    industry: cleanIndustry,
    targetMarket: cleanMarket,
    geography: cleanGeo,
    depth: params.depth,
    createdAt: new Date().toISOString().slice(0, 10),
    overallConfidence: params.depth === 'Deep Market Dossier' ? 'High' : 'Moderate',
    viabilitySignal: 'Promising with Niche Focus',
    savedToBrain: false,
    executiveSummary: `Structured ${params.depth.toLowerCase()} evaluating "${cleanIdea}" inside ${cleanIndustry} across ${cleanGeo}. Primary leverage rests on serving ${cleanMarket} with clearer pricing transparency and faster onboarding than legacy incumbents.`,
    marketOverview: {
      text: `${cleanIndustry} buyers in ${cleanGeo} increasingly favor transparent pricing, specialized experiences, and low-friction trial offers over generic legacy bundles.`,
      factType: 'estimate',
      sources: [
        `${cleanIndustry} Category Demand Benchmark (Modelled)`,
        `Business Brain Context (${params.brain.businessName})`,
      ],
    },
    tamSamSom: {
      tamLabel: sizing.tamBand,
      tamBasis: `Broad ${cleanIndustry} expenditure across ${cleanGeo} (editable baseline).`,
      samLabel: sizing.samBand,
      samBasis: `${samSharePct}% addressable digital & urban segment matching ${cleanMarket}.`,
      somLabel: sizing.somBand,
      somBasis: `${somSharePct}% realistic 24-month capture inside priority launch neighborhoods/accounts.`,
      assumptions: [
        { id: 'tam', label: 'Category Annual Spend ($B)', value: tamBillion, unit: '$B', min: 0.5, max: 30, step: 0.5 },
        { id: 'sam', label: 'Serviceable Target Share (%)', value: samSharePct, unit: '%', min: 2, max: 40, step: 1 },
        { id: 'som', label: '24-Month Target Capture (%)', value: somSharePct, unit: '%', min: 0.2, max: 10, step: 0.2 },
      ],
    },
    marketDemand: {
      summary: `Strong willingness to test specialized offers among ${cleanMarket} when initial commitment friction stays low.`,
      signals: [
        { label: `Search & discovery demand in ${cleanGeo}`, trend: '+22% YoY modelled growth', factType: 'estimate' },
        { label: 'Incumbent switching trigger (onboarding/transparency)', trend: 'High urgency wedge', factType: 'estimate' },
      ],
    },
    customerSegments: [
      {
        name: `Primary Segment: ${cleanMarket.slice(0, 48)}`,
        share: '55% initial focus',
        need: `Clear, outcome-oriented solution for ${cleanIdea.slice(0, 64)}`,
        urgency: 'High',
      },
      {
        name: 'Team / Group Buyers',
        share: '30% expansion',
        need: 'Predictable monthly billing and concierge onboarding',
        urgency: 'Medium-High',
      },
      {
        name: 'Occasional / Trial Evaluators',
        share: '15% top-of-funnel',
        need: 'Low-commitment starter offer before recurring plan',
        urgency: 'Medium',
      },
    ],
    customerPainPoints: [
      {
        title: 'High upfront commitment or opaque incumbent pricing',
        severity: 'high',
        evidence: 'Common switching barrier across category reviews.',
      },
      {
        title: 'Generic one-size-fits-all onboarding experience',
        severity: 'medium',
        evidence: 'Creates an immediate positioning opening for personalized workflows.',
      },
    ],
    competitorLandscapeSummary: `Incumbents in ${cleanIndustry} skew toward broad awareness messaging while leaving a clear gap in high-clarity starter experiences and fast feedback loops.`,
    pricingAnalysis: {
      tiers: [
        { tier: 'Starter / Trial Offer', range: '$19 – $39', positioning: 'Zero-friction first conversion hook' },
        { tier: 'Core Recurring Plan', range: '$49 – $129 / mo', positioning: 'Predictable retention anchor' },
        { tier: 'Team / Studio Tier', range: '$240 – $480 / mo', positioning: 'High-LTV group expansion' },
      ],
      recommendation: 'Lead with a low-risk starter package that credits toward the Core Recurring Plan within 14 days.',
    },
    marketOpportunities: [
      `Claim an unmistakable positioning wedge tailored specifically to ${cleanMarket} in ${cleanGeo}.`,
      'Pair transparent deliverables with a 14-day proof-of-value guarantee.',
      'Convert early trial buyers into referral advocates with structured check-ins.',
    ],
    businessModelOptions: [
      {
        model: 'Trial-to-Subscription Hybrid',
        pros: 'Low CAC barrier with predictable recurring LTV',
        cons: 'Requires disciplined Day-7 to Day-14 conversion follow-up',
        fit: 'Primary Recommendation',
      },
      {
        model: 'Direct B2B / Group Packages',
        pros: 'Larger average contract value and lower churn',
        cons: 'Longer sales cycle in Month 1',
        fit: 'Month 2 Expansion',
      },
    ],
    revenuePotential: {
      year1Conservative: '$48,000 – $76,000 ARR (modelled)',
      year1Target: '$110,000 – $165,000 ARR (modelled)',
      unitEconomicsNote: `Modelled payback within 2–3 billing cycles for ${cleanIndustry} starter-to-core funnel.`,
      factType: 'estimate',
    },
    startupCostEstimates: [
      { category: 'Initial Offer & Fulfillment Pilot', range: '$1,500 – $3,500', note: 'MVP inventory / delivery setup' },
      { category: 'Brand Identity & Landing Page', range: '$600 – $1,400', note: 'Built inside BrainWise Brand Studio' },
      { category: '30-Day Acquisition Test Budget', range: '$500 – $1,200', note: 'Measured across 2–3 channel experiments' },
    ],
    risksAndChallenges: [
      {
        risk: 'Early CAC exceeds unit margin before referral loop kicks in',
        severity: 'high',
        mitigation: 'Cap initial paid spend and validate organic/partner channels in Weeks 1–2.',
      },
      {
        risk: 'Broad messaging dilutes differentiation against larger incumbents',
        severity: 'medium',
        mitigation: `Anchor copy exclusively around ${cleanMarket} outcomes.`,
      },
    ],
    validationExperiments: [
      {
        title: `20-Buyer Discovery Landing Test (${cleanGeo})`,
        metric: '>= 12% qualified waitlist or trial conversion',
        timeframe: '14 days',
      },
      {
        title: 'Starter-to-Recurring Credit Follow-Up Test',
        metric: '>= 35% upgrade within 21 days',
        timeframe: '21 days',
      },
    ],
    finalRecommendation: {
      verdict: `Viable opportunity with disciplined niche focus: launch "${titleText}" using a low-friction starter offer for ${cleanMarket} before scaling fixed overhead.`,
      nextSteps: [
        'Benchmark 2–3 direct peers in Competitive Intelligence',
        'Lock core tagline & starter offer messaging in Brand Studio',
        'Run the 14-day Discovery Landing Test inside Growth Planner',
      ],
    },
    sources: [
      {
        title: `${cleanIndustry} Market Sizing Sensitivity Model`,
        publisher: 'BrainWise Parametric Model (Prototype)',
        date: new Date().toISOString().slice(0, 7),
        reliability: 'Market Estimate',
      },
      {
        title: `${params.brain.businessName} Business Brain Context`,
        publisher: 'Workspace Internal Knowledge Base',
        date: new Date().toISOString().slice(0, 10),
        reliability: 'Primary',
      },
    ],
  };

  // Deterministic Truth Check verification pass
  const contentToVerify = `${report.title} ${report.executiveSummary} ${report.marketOverview.text} ${report.pricingAnalysis.recommendation}`;
  report.truthCheck = executeTruthCheck(contentToVerify, params.brain);

  return report;
}

export interface DynamicWeeklyPlan {
  week: string;
  objective: string;
  tasksCount: number;
  experiments: string[];
  outcome: string;
}

export function buildWeeklyGrowthPlan(state: BrainWiseState): DynamicWeeklyPlan[] {
  const pendingTasks = state.tasks.filter((t) => t.status === 'pending');
  const week1Tasks = pendingTasks.filter((t) => t.priority === 'high' || t.isTodayPriority);
  const week2Tasks = pendingTasks.filter((t) => t.priority !== 'high' && !t.isTodayPriority);
  const activeExps = state.experiments.filter((e) => e.status === 'Active');
  const plannedExps = state.experiments.filter((e) => e.status === 'Planned');
  const primaryGoal = state.goals[0];

  return [
    {
      week: 'Week 1 · High-Leverage Execution',
      objective:
        week1Tasks[0]?.title ??
        `Ship core acquisition & positioning priorities for ${state.brain.businessName}`,
      tasksCount: week1Tasks.length,
      experiments:
        activeExps.length > 0
          ? activeExps.map((e) => e.title)
          : ['No active experiments yet — promote a planned test'],
      outcome: primaryGoal
        ? `Advance "${primaryGoal.title}" (${primaryGoal.currentValue}/${primaryGoal.targetValue} ${primaryGoal.unit})`
        : 'Establish baseline conversion metrics from Week 1 priorities',
    },
    {
      week: 'Week 2 · Iteration & Follow-Through',
      objective:
        week2Tasks[0]?.title ??
        `Convert Week 1 trials & launch queued ${state.brain.businessName} experiments`,
      tasksCount: week2Tasks.length,
      experiments:
        plannedExps.length > 0
          ? plannedExps.map((e) => e.title)
          : activeExps.length > 0
          ? [`Evaluate Week 1 results on ${activeExps[0].title}`]
          : ['Queue next validation experiment from Market Watch'],
      outcome: state.goals[1]
        ? `Progress "${state.goals[1].title}" toward ${state.goals[1].targetValue} ${state.goals[1].unit}`
        : 'Close feedback loop across Brand Studio & Analytics',
    },
  ];
}

export interface RoadmapPhaseColumn {
  phase: string;
  title: string;
  items: string[];
  highlighted: boolean;
}

export function buildRoadmapPhases(state: BrainWiseState): RoadmapPhaseColumn[] {
  const highTasks = state.tasks.filter((t) => t.priority === 'high' && t.status === 'pending');
  const activeExps = state.experiments.filter((e) => e.status === 'Active');
  const acceptedRecs = state.recommendations.filter((r) => r.status === 'accepted');
  const goals = state.goals;

  return [
    {
      phase: 'Immediate (Days 1–7)',
      title: 'Today & Sprint Priorities',
      highlighted: false,
      items:
        highTasks.length > 0
          ? highTasks.slice(0, 3).map((t) => t.title)
          : ['Add or promote high-priority tasks in Today & Tasks'],
    },
    {
      phase: '30-Day Objectives',
      title: 'Active Validation & Growth',
      highlighted: true,
      items: [
        ...(activeExps.length > 0
          ? activeExps.slice(0, 2).map((e) => `${e.title} (${e.successMetric})`)
          : ['Launch at least 1 active growth experiment']),
        ...(goals[0]
          ? [`${goals[0].title}: ${goals[0].currentValue}/${goals[0].targetValue} ${goals[0].unit}`]
          : ['Set your primary 30-day revenue or customer goal']),
      ],
    },
    {
      phase: '60-Day Objectives',
      title: 'Compounding Retention & Strategy',
      highlighted: false,
      items: [
        ...(acceptedRecs.length > 0
          ? acceptedRecs.slice(0, 2).map((r) => r.whatToDo)
          : ['Review AI Recommendations to lock next leverage moves']),
        ...(goals[1]
          ? [`${goals[1].title} (Target: ${goals[1].targetValue} ${goals[1].unit})`]
          : ['Turn verified Market Watch signals into structured tests']),
      ],
    },
    {
      phase: '90-Day Horizon',
      title: 'Scale Proven Channels',
      highlighted: false,
      items: [
        ...(goals.slice(2, 4).map((g) => `${g.title} by ${g.deadline}`)),
        `Keep Business Brain (${calculateBrainCompleteness(state.brain).percentage}% complete) synced across all ${state.assets.filter((a) => a.status !== 'Archived').length} active brand assets`,
      ],
    },
  ];
}

export function buildExecutiveReportNarrative(
  reportTitle: string,
  state: BrainWiseState
): { takeaway: string; priorityAdjustment: string; metricsLine: string } {
  const brainComp = calculateBrainCompleteness(state.brain);
  const taskStats = calculateTaskCompletionStats(state.tasks);
  const topGoal = state.goals[0];
  const topComp = state.competitors[0];
  const topEvent = state.marketEvents[0];
  const activeExps = state.experiments.filter((e) => e.status === 'Active');

  switch (reportTitle) {
    case 'Competitive Intelligence Report':
      return {
        takeaway: topComp
          ? `${state.brain.businessName} is actively tracking ${state.competitors.length} competitors led by ${topComp.name} (${topComp.priceRange}), maintaining differentiated positioning in ${state.brand.visualDirection.replace(/\.+$/, '')}.`
          : `${state.brain.businessName} has not yet added competitor profiles; map 2+ peers in Competitive Intelligence to anchor differentiation.`,
        priorityAdjustment: topEvent
          ? `Latest Market Watch alert (${topEvent.competitorOrSource}): ${topEvent.detectedChange} — Recommended response: ${topEvent.suggestedAction}`
          : 'Enable monitoring categories in Competitive Intelligence & Market Watch to receive real-time differentiation prompts.',
        metricsLine: `${state.competitors.length} rivals profiled · ${state.gapAnalysis.length} identified gaps · ${state.marketEvents.length} recorded market events`,
      };
    case 'Marketing Performance Report':
      return {
        takeaway: `${state.brand.brandName} operates under the "${state.brand.status}" brand system with ${state.assets.filter((a) => a.status !== 'Archived').length} active assets and ${activeExps.length} live growth experiments.`,
        priorityAdjustment: activeExps[0]
          ? `Primary active test "${activeExps[0].title}" reports: ${activeExps[0].results}`
          : 'Create and launch a messaging or channel experiment from Brand Studio collateral to track conversion lift.',
        metricsLine: `${activeExps.length} active experiments · ${state.assets.length} total brand assets · Tone: ${state.aiTonePreference}`,
      };
    case 'Monthly Growth Report':
      return {
        takeaway: topGoal
          ? `Primary target "${topGoal.title}" stands at ${topGoal.currentValue}/${topGoal.targetValue} ${topGoal.unit} (${calculateGoalProgress(topGoal).percentage}% complete), backed by ${taskStats.completed} completed tasks across ${state.goals.length} goals.`
          : `${state.brain.businessName} has ${taskStats.completed} completed execution tasks (${taskStats.completionRate}% sprint completion rate).`,
        priorityAdjustment: `Business Brain knowledge completeness is ${brainComp.percentage}%. Focus next month on closing remaining high-leverage tasks (${taskStats.highPriorityPending} high-priority pending).`,
        metricsLine: `${state.goals.length} tracked goals · ${taskStats.completionRate}% task rate · ${state.reports.length} research dossiers`,
      };
    default:
      return {
        takeaway: `During this weekly cycle for ${state.brain.businessName} (${state.brain.stage}), the team completed ${taskStats.completed} of ${taskStats.total} execution tasks (${taskStats.completionRate}%) while running ${activeExps.length} active growth experiments.`,
        priorityAdjustment:
          state.recommendations.find((r) => r.status === 'pending')?.whatToDo ??
          'Continue executing Today’s Priorities inside Growth Planner and syncing new insights to Business Brain.',
        metricsLine: `Brain ${brainComp.percentage}% synced · ${taskStats.pending} tasks queued · ${state.competitors.filter((c) => c.monitoringEnabled).length} monitored rivals`,
      };
  }
}

export function buildAssetSvgMarkup(
  asset: BrandAsset,
  brandName: string,
  markStyle: 'geometric' | 'monogram' | 'emblem' = 'geometric'
): string {
  const bg = asset.darkVariant ? '#252525' : '#F8F8F6';
  const fg = asset.darkVariant ? '#FFFFFF' : '#242424';
  const sub = asset.darkVariant ? '#CCCCCC' : '#747474';
  const escapeXml = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const markPath =
    markStyle === 'emblem'
      ? `<circle cx="72" cy="72" r="22" stroke="${fg}" stroke-width="2.5" fill="none"/><circle cx="72" cy="72" r="7" fill="${asset.accentHex}"/>`
      : markStyle === 'monogram'
      ? `<rect x="52" y="52" width="40" height="40" rx="10" stroke="${fg}" stroke-width="2.5" fill="none"/><path d="M64 80 L72 64 L80 80" stroke="${asset.accentHex}" stroke-width="3" fill="none" stroke-linecap="round"/>`
      : `<path d="M52 84 H92" stroke="${fg}" stroke-width="2.5" stroke-linecap="round"/><path d="M58 84 C58 70 64 62 72 62 C80 62 86 70 86 84" stroke="${asset.accentHex}" stroke-width="3" fill="none" stroke-linecap="round"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
  <rect width="800" height="500" rx="24" fill="${bg}"/>
  ${markPath}
  <text x="112" y="79" font-family="Manrope, sans-serif" font-size="22" font-weight="700" fill="${fg}">${escapeXml(brandName)}</text>
  <text x="52" y="155" font-family="JetBrains Mono, monospace" font-size="14" fill="${asset.accentHex}">${escapeXml(asset.category.toUpperCase())} · ${escapeXml(asset.format)}</text>
  <rect x="52" y="185" width="56" height="4" rx="2" fill="${asset.accentHex}"/>
  <text x="52" y="245" font-family="Manrope, sans-serif" font-size="34" font-weight="700" fill="${fg}">${escapeXml(asset.headlineText.slice(0, 44))}</text>
  <text x="52" y="295" font-family="Plus Jakarta Sans, sans-serif" font-size="18" fill="${sub}">${escapeXml(asset.subtext.slice(0, 76))}</text>
  <text x="52" y="448" font-family="JetBrains Mono, monospace" font-size="13" fill="${sub}">Generated by BrainWise Brand Studio · ${escapeXml(asset.createdAt)}</text>
</svg>`;
}

/**
 * Sanitizes AI-generated inline SVG strings before rendering in the DOM.
 * Strips scripts, foreignObject, external hrefs, inline event handlers, and javascript: URIs.
 */
export function sanitizeAiSvgMarkup(rawSvg: string | undefined, fallbackViewBox = '0 0 64 64'): string {
  if (!rawSvg || typeof rawSvg !== 'string') return '';
  const match = rawSvg.match(/<svg[\s\S]*?<\/svg>/i);
  if (!match) return '';

  let cleaned = match[0]
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<image[\s\S]*?\/?>/gi, '')
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s(xlink:)?href\s*=\s*("[^"]*"|'[^']*')/gi, '')
    .replace(/javascript:/gi, '')
    .trim();

  if (!/viewBox=/i.test(cleaned)) {
    cleaned = cleaned.replace(/<svg/i, `<svg viewBox="${fallbackViewBox}"`);
  }
  return cleaned;
}

export interface GeneratedCollateralVariation {
  id: string;
  title: string;
  layoutLabel: string;
  headlineText: string;
  subtext: string;
  footerNote: string;
  artDirectionNote: string;
  darkVariant: boolean;
  svgMotif: string;
}

export interface GeneratedSocialPackage {
  title: string;
  caption: string;
  hashtags: string[];
  postingRationale: string;
  slides: CarouselSlide[];
  truthCheck?: TruthCheckResult;
}

export function buildLocalLogoConcepts(params: {
  brandName: string;
  prompt: string;
  styleArchetype: string;
  accentHex: string;
}): BrandConcept[] {
  const accent = params.accentHex || '#FF7417';
  const focus = params.prompt.trim() || `${params.brandName} architectural identity`;
  const ts = Date.now();

  return [
    {
      id: `ai-logo-${ts}-1`,
      name: `${params.styleArchetype} Horizon`,
      rationale: `Distills "${focus.slice(0, 56)}" into an architectural horizon grid with restrained ${accent} focal geometry.`,
      primaryColor: '#171717',
      secondaryColor: '#5C5C58',
      accentColor: accent,
      surfaceColor: '#FFFFFF',
      headingFont: 'Geist',
      bodyFont: 'Geist',
      personality: ['Architectural', 'Minimal'],
      markStyle: 'geometric',
      styleTag: params.styleArchetype,
      aiPrompt: focus,
      customSvg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="8" width="48" height="48" rx="12" stroke="currentColor" stroke-width="2.5"/><path d="M16 40H48" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><path d="M22 40C22 29 26.5 23 32 23C37.5 23 42 29 42 40" stroke="${accent}" stroke-width="3" stroke-linecap="round"/><circle cx="32" cy="17" r="2.5" fill="${accent}"/></svg>`,
    },
    {
      id: `ai-logo-${ts}-2`,
      name: 'Precision Monogram Frame',
      rationale: `High-contrast Swiss monogram built for small-scale packaging stamps, social avatars, and dark headers.`,
      primaryColor: '#171717',
      secondaryColor: '#5C5C58',
      accentColor: accent,
      surfaceColor: '#FAFAF9',
      headingFont: 'Geist',
      bodyFont: 'Geist',
      personality: ['Editorial', 'Distinctive'],
      markStyle: 'monogram',
      styleTag: 'Swiss Monogram',
      aiPrompt: focus,
      customSvg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14 14H50V50H14V14Z" stroke="currentColor" stroke-width="2.5"/><path d="M22 44V20L32 33L42 20V44" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/><rect x="44" y="14" width="6" height="6" fill="${accent}"/></svg>`,
    },
    {
      id: `ai-logo-${ts}-3`,
      name: 'Orbital Seal Emblem',
      rationale: `Concentric geometric seal anchoring provenance, craft discipline, and modern digital recognition.`,
      primaryColor: '#171717',
      secondaryColor: '#5C5C58',
      accentColor: accent,
      surfaceColor: '#FFFFFF',
      headingFont: 'Geist',
      bodyFont: 'Geist',
      personality: ['Craft', 'Timeless'],
      markStyle: 'emblem',
      styleTag: 'Modern Emblem',
      aiPrompt: focus,
      customSvg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="32" cy="32" r="22" stroke="currentColor" stroke-width="2.4"/><circle cx="32" cy="32" r="14" stroke="currentColor" stroke-width="1.6" stroke-dasharray="4 4"/><circle cx="32" cy="32" r="5.5" fill="${accent}"/><path d="M32 10V16M32 48V54M10 32H16M48 32H54" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
    },
  ];
}

export function buildLocalBrandAssetVariations(params: {
  category: BrandAsset['category'];
  prompt: string;
  brandName: string;
  tagline: string;
  positioning: string;
  accentHex: string;
  surfaceMode: 'light' | 'dark' | 'mixed';
}): GeneratedCollateralVariation[] {
  const focus = params.prompt.trim() || params.tagline;
  const accent = params.accentHex || '#FF7417';
  const ts = Date.now();
  const dark1 = params.surfaceMode === 'dark' || params.surfaceMode === 'mixed';
  const dark2 = params.surfaceMode === 'dark';

  return [
    {
      id: `var-${ts}-1`,
      title: `${params.brandName} ${params.category} — Editorial Statement`,
      layoutLabel: 'Swiss Asymmetric Split',
      headlineText: focus.length > 58 ? `${focus.slice(0, 55)}…` : focus,
      subtext: params.positioning.slice(0, 140),
      footerNote: `${params.brandName} · Batch Verified · ${params.category}`,
      artDirectionNote: `Matte ${dark1 ? 'charcoal #171717' : 'alabaster #FFFFFF'} stock with blind-debossed grid lines and ${accent} foil accent.`,
      darkVariant: dark1,
      svgMotif: `<svg viewBox="0 0 120 48" fill="none" xmlns="http://www.w3.org/2000/svg"><line x1="4" y1="24" x2="116" y2="24" stroke="currentColor" stroke-opacity="0.25" stroke-width="1.5"/><circle cx="28" cy="24" r="10" stroke="currentColor" stroke-width="2"/><circle cx="60" cy="24" r="6" fill="${accent}"/><rect x="86" y="14" width="20" height="20" rx="4" stroke="currentColor" stroke-width="2"/></svg>`,
    },
    {
      id: `var-${ts}-2`,
      title: `${params.brandName} ${params.category} — Architectural Spec`,
      layoutLabel: 'Minimalist Grid Ledger',
      headlineText: params.tagline,
      subtext: `${focus}. Engineered directly from Business Brain brand guidelines.`,
      footerNote: `Direct-to-Customer · ${params.brandName}`,
      artDirectionNote: `Crisp ${dark2 ? 'deep charcoal' : 'uncoated white'} substrate, hairline rules, tabular specification block.`,
      darkVariant: dark2,
      svgMotif: `<svg viewBox="0 0 120 48" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="8" width="108" height="32" rx="6" stroke="currentColor" stroke-opacity="0.3" stroke-width="1.5"/><line x1="42" y1="8" x2="42" y2="40" stroke="currentColor" stroke-opacity="0.25" stroke-width="1.5"/><line x1="78" y1="8" x2="78" y2="40" stroke="currentColor" stroke-opacity="0.25" stroke-width="1.5"/><circle cx="24" cy="24" r="4" fill="${accent}"/><circle cx="60" cy="24" r="4" fill="currentColor"/><circle cx="96" cy="24" r="4" fill="currentColor" fill-opacity="0.45"/></svg>`,
    },
    {
      id: `var-${ts}-3`,
      title: `${params.brandName} ${params.category} — Contrast Spotlight`,
      layoutLabel: 'High-Contrast Focus',
      headlineText: `Why ${params.brandName.split(' ')[0]} sets the new standard`,
      subtext: `${focus} — backed by transparent sourcing and consistent visual craft.`,
      footerNote: `Approved Brand System · ${params.category}`,
      artDirectionNote: 'Oversized display heading balanced with generous negative space and one focused geometric brand cue.',
      darkVariant: !dark2,
      svgMotif: `<svg viewBox="0 0 120 48" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 36L40 12L68 36L96 12" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="96" cy="12" r="5" fill="${accent}"/></svg>`,
    },
  ];
}

export function buildLocalSocialCreative(params: {
  platform: 'Instagram Post' | 'Carousel' | 'Facebook Creative' | 'Campaign';
  angle: string;
  prompt: string;
  slideCount: number;
  brandName: string;
  tagline: string;
  positioning: string;
  accentHex: string;
  brain?: BusinessBrainData;
}): GeneratedSocialPackage {
  const focus = params.prompt.trim() || params.tagline;
  const accent = params.accentHex || '#FF7417';
  const count = params.platform === 'Carousel' ? Math.max(3, Math.min(7, params.slideCount)) : 1;

  const baseSlides: CarouselSlide[] = [
    {
      slideNumber: 1,
      role: 'Hook',
      kicker: `${params.angle.toUpperCase()} · 01`,
      headline: focus.length > 56 ? `${focus.slice(0, 53)}…` : focus,
      body: `Swipe to see how ${params.brandName} turns everyday friction into a decisive customer advantage.`,
      layout: 'editorial-grid',
      svgMotif: `<svg viewBox="0 0 120 48" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="24" cy="24" r="12" stroke="currentColor" stroke-width="2"/><circle cx="24" cy="24" r="4.5" fill="${accent}"/><line x1="42" y1="24" x2="112" y2="24" stroke="currentColor" stroke-width="1.8" stroke-dasharray="4 4"/></svg>`,
      artDirectionPrompt: `Minimalist architectural studio composition for ${params.brandName}, crisp directional light, muted neutral backdrop with subtle ${accent} highlight.`,
    },
    {
      slideNumber: 2,
      role: 'Problem',
      kicker: 'THE HIDDEN FRICTION · 02',
      headline: 'Why legacy category options fall short',
      body: 'Most buyers settle for opaque quality, slow delivery cadences, or rigid plans that ignore real weekly habits.',
      layout: 'split-stat',
      statCallout: '48h vs 4+ wks',
      svgMotif: `<svg viewBox="0 0 120 48" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="28" width="22" height="12" rx="3" fill="currentColor" fill-opacity="0.25"/><rect x="44" y="18" width="22" height="22" rx="3" fill="currentColor" fill-opacity="0.45"/><rect x="78" y="8" width="22" height="32" rx="3" fill="${accent}"/></svg>`,
      artDirectionPrompt: 'Clean editorial side-by-side comparison visual with subtle hairline grid and warm shadow depth.',
    },
    {
      slideNumber: 3,
      role: 'Insight',
      kicker: 'OUR DIFFERENTIATION · 03',
      headline: params.tagline,
      body: params.positioning.slice(0, 150),
      layout: 'quote-focus',
      svgMotif: `<svg viewBox="0 0 120 48" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 34C28 34 32 14 54 14C76 14 82 34 108 18" stroke="${accent}" stroke-width="2.5" stroke-linecap="round"/><circle cx="108" cy="18" r="4" fill="currentColor"/></svg>`,
      artDirectionPrompt: `Close-up tactile craft detail representing ${params.brandName} quality promise, ultra-clean Swiss typography overlay.`,
    },
    {
      slideNumber: 4,
      role: 'Proof',
      kicker: 'WHAT CHANGES IMMEDIATELY · 04',
      headline: 'Built around transparent standards',
      body: 'Every release follows verified quality benchmarks, predictable dispatch windows, and zero-friction control.',
      layout: 'checklist',
      statCallout: '100% Traceable',
      svgMotif: `<svg viewBox="0 0 120 48" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="12" y="10" width="96" height="28" rx="8" stroke="currentColor" stroke-width="1.8"/><path d="M48 24L56 31L74 17" stroke="${accent}" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
      artDirectionPrompt: 'Architectural checklist layout over soft alabaster or matte obsidian surface with crisp spacing.',
    },
    {
      slideNumber: 5,
      role: 'CTA',
      kicker: 'START THIS WEEK · 05',
      headline: `Experience ${params.brandName} directly`,
      body: 'Tap the link in bio to claim our flagship starter experience and taste the difference on your next delivery.',
      layout: 'product-spotlight',
      statCallout: 'Link in Bio →',
      svgMotif: `<svg viewBox="0 0 120 48" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="60" cy="24" r="16" stroke="${accent}" stroke-width="2.4"/><path d="M54 24H67M62 19L67 24L62 29" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
      artDirectionPrompt: `Hero packaging / flagship offer spotlight for ${params.brandName} framed in high-contrast studio lighting.`,
    },
    {
      slideNumber: 6,
      role: 'Framework',
      kicker: 'HOW IT WORKS · 06',
      headline: 'Three deliberate steps from order to ritual',
      body: 'Pick your profile, receive fresh-batch dispatch notifications, and pause or swap anytime in one tap.',
      layout: 'checklist',
      svgMotif: `<svg viewBox="0 0 120 48" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="24" cy="24" r="7" stroke="currentColor" stroke-width="2"/><circle cx="60" cy="24" r="7" fill="${accent}"/><circle cx="96" cy="24" r="7" stroke="currentColor" stroke-width="2"/><line x1="31" y1="24" x2="53" y2="24" stroke="currentColor" stroke-width="1.6"/><line x1="67" y1="24" x2="89" y2="24" stroke="currentColor" stroke-width="1.6"/></svg>`,
      artDirectionPrompt: '3-step linear minimal iconography with subtle Swiss dividers.',
    },
    {
      slideNumber: 7,
      role: 'CTA',
      kicker: 'JOIN THE DROP · 07',
      headline: `Save this guide & try ${params.brandName}`,
      body: 'Comment "GUIDE" or tap the bio link to reserve your spot in this week’s fresh release.',
      layout: 'product-spotlight',
      statCallout: 'Save + Share',
      svgMotif: `<svg viewBox="0 0 120 48" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="38" y="8" width="44" height="32" rx="8" stroke="${accent}" stroke-width="2.4"/><circle cx="60" cy="24" r="5" fill="currentColor"/></svg>`,
      artDirectionPrompt: 'High-contrast closing CTA slide with brand lockup and clear directional cue.',
    },
  ];

  const slides =
    count === 1
      ? [
          {
            ...baseSlides[0],
            role: 'Spotlight' as const,
            kicker: params.angle.toUpperCase(),
            body: `${params.positioning.slice(0, 130)}`,
          },
        ]
      : baseSlides.slice(0, count - 1).concat({
          ...baseSlides[count >= 7 ? 6 : 4],
          slideNumber: count,
          kicker: `NEXT STEP · 0${count}`,
        });

  const slug = params.brandName.replace(/[^a-zA-Z0-9]/g, '');

  const pkg: GeneratedSocialPackage = {
    title: `${params.platform}: ${focus.slice(0, 38)}`,
    caption: `${focus}\n\n${params.positioning}\n\nSave this ${params.platform === 'Carousel' ? 'carousel' : 'post'} and tap the link in bio to explore ${params.brandName}.`,
    hashtags: [
      `#${slug || 'BrandLaunch'}`,
      '#ModernCraft',
      '#FounderBuilt',
      '#DesignLedBrand',
      '#DirectToCustomer',
      '#GrowthStrategy',
    ],
    postingRationale: `Structured for ${params.platform} save-rate and swipe completion, inheriting ${params.brandName}'s locked palette and Business Brain positioning.`,
    slides,
  };

  if (params.brain) {
    pkg.truthCheck = executeTruthCheck(`${pkg.title} ${pkg.caption}`, params.brain);
  }

  return pkg;
}

export function buildCarouselSlideSvgMarkup(
  slide: CarouselSlide,
  brandName: string,
  accentHex: string,
  darkVariant: boolean,
  aspectRatio: '4:5' | '1:1' | '9:16' | '1.91:1' = '4:5'
): string {
  const dims =
    aspectRatio === '1:1'
      ? { w: 1080, h: 1080 }
      : aspectRatio === '9:16'
      ? { w: 1080, h: 1920 }
      : aspectRatio === '1.91:1'
      ? { w: 1200, h: 628 }
      : { w: 1080, h: 1350 };
  const bg = darkVariant ? '#171717' : '#FFFFFF';
  const fg = darkVariant ? '#FFFFFF' : '#171717';
  const sub = darkVariant ? '#CCCCCC' : '#5C5C58';
  const border = darkVariant ? '#2E2E2E' : '#E6E6E2';
  const escapeXml = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${dims.w}" height="${dims.h}" viewBox="0 0 ${dims.w} ${dims.h}">
  <rect width="${dims.w}" height="${dims.h}" fill="${bg}"/>
  <rect x="48" y="48" width="${dims.w - 96}" height="${dims.h - 96}" rx="28" fill="none" stroke="${border}" stroke-width="2"/>
  <text x="96" y="132" font-family="JetBrains Mono, monospace" font-size="24" font-weight="600" fill="${accentHex}">${escapeXml(slide.kicker)}</text>
  <rect x="96" y="180" width="96" height="6" rx="3" fill="${accentHex}"/>
  <text x="96" y="290" font-family="Geist, Inter, sans-serif" font-size="56" font-weight="800" fill="${fg}">${escapeXml(slide.headline.slice(0, 34))}</text>
  <text x="96" y="360" font-family="Geist, Inter, sans-serif" font-size="30" fill="${sub}">${escapeXml(slide.body.slice(0, 68))}</text>
  ${slide.statCallout ? `<text x="96" y="${dims.h - 240}" font-family="JetBrains Mono, monospace" font-size="44" font-weight="700" fill="${accentHex}">${escapeXml(slide.statCallout)}</text>` : ''}
  <line x1="96" y1="${dims.h - 160}" x2="${dims.w - 96}" y2="${dims.h - 160}" stroke="${border}" stroke-width="2"/>
  <text x="96" y="${dims.h - 104}" font-family="Geist, Inter, sans-serif" font-size="26" font-weight="700" fill="${fg}">${escapeXml(brandName)}</text>
  <text x="${dims.w - 96}" y="${dims.h - 104}" text-anchor="end" font-family="JetBrains Mono, monospace" font-size="22" fill="${sub}">SLIDE 0${slide.slideNumber}</text>
</svg>`;
}


