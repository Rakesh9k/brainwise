import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateBrainCompleteness,
  calculateGoalProgress,
  calculateTaskCompletionStats,
  estimateMarketSizing,
  deriveExecutionPulseSeries,
  calculateCacChurnSensitivityMatrix,
  filterGlobalSearch,
  getNextJourneyStep,
  buildShellBreadcrumbs,
  filterJournalArticles,
  synthesizePlaybookPrompt,
  compareMarketScenarios,
  findNearestCompetitors,
  filterReviewComplaints,
  formatBrandCssVariables,
  formatBrandJsonTokens,
  selectFocusSprintTasks,
  formatCountdownSeconds,
  computeDashboardMetrics,
  buildDynamicDossier,
  formatDossierFinancialModelCsv,
  buildWeeklyGrowthPlan,
  buildRoadmapPhases,
  buildExecutiveReportNarrative,
  buildAssetSvgMarkup,
  sanitizeAiSvgMarkup,
  buildLocalLogoConcepts,
  buildLocalBrandAssetVariations,
  buildLocalSocialCreative,
  buildCarouselSlideSvgMarkup,
  type JournalArticle,
} from './logic';
import { INITIAL_BRAINWISE_STATE } from '../data/mockData';

test('calculateBrainCompleteness reflects missing vs populated sections', () => {
  const full = calculateBrainCompleteness(INITIAL_BRAINWISE_STATE.brain);
  assert.equal(full.percentage, 100);
  assert.equal(full.missingItems.length, 0);

  const empty = calculateBrainCompleteness({
    ...INITIAL_BRAINWISE_STATE.brain,
    businessName: '',
    products: [],
    personas: [],
    documents: [],
  });
  assert.ok(empty.percentage < 100);
  assert.ok(empty.missingItems.length >= 4);
});

test('calculateTaskCompletionStats calculates completion and remaining time', () => {
  const stats = calculateTaskCompletionStats(INITIAL_BRAINWISE_STATE.tasks);
  assert.equal(stats.total, INITIAL_BRAINWISE_STATE.tasks.length);
  assert.equal(stats.completed + stats.pending + stats.skipped, stats.total);
  assert.ok(stats.completionRate >= 0 && stats.completionRate <= 100);
  assert.ok(stats.remainingMinutes >= 0);
});

test('calculateGoalProgress clamps bounds and assigns accurate status', () => {
  assert.deepEqual(
    calculateGoalProgress({
      id: 'g1',
      category: 'Revenue',
      title: 'MRR',
      targetValue: 10000,
      currentValue: 12000,
      unit: '$',
      deadline: '2026-12-31',
      supportingTaskIds: [],
    }),
    { percentage: 100, status: 'completed' }
  );

  assert.deepEqual(
    calculateGoalProgress({
      id: 'g2',
      category: 'Marketing',
      title: 'Signups',
      targetValue: 100,
      currentValue: 20,
      unit: 'users',
      deadline: '2026-12-31',
      supportingTaskIds: [],
    }),
    { percentage: 20, status: 'needs_attention' }
  );
});

test('estimateMarketSizing returns non-false-precision range bands', () => {
  const result = estimateMarketSizing(14.0, 12, 2);
  assert.ok(result.tamBand.includes('–'));
  assert.ok(result.samBand.includes('–'));
  assert.ok(result.somBand.includes('–'));
});

test('filterGlobalSearch matches across reports, competitors, and tasks', () => {
  const coffeeHits = filterGlobalSearch('roast', INITIAL_BRAINWISE_STATE);
  assert.ok(coffeeHits.length > 0);
  const noHits = filterGlobalSearch('zzzznonexistenttoken999', INITIAL_BRAINWISE_STATE);
  assert.equal(noHits.length, 0);
});

test('getNextJourneyStep returns coherent connected workflow steps', () => {
  assert.equal(getNextJourneyStep('idea-intelligence')?.nextRoute, 'competitive-intelligence');
  assert.equal(getNextJourneyStep('competitive-intelligence')?.nextRoute, 'brand-studio');
  assert.equal(getNextJourneyStep('brand-studio')?.nextRoute, 'growth-director');
});

test('buildShellBreadcrumbs builds root and deep department hierarchy accurately', () => {
  let rootCalls = 0;
  let resetCalls = 0;

  const dashboardTrail = buildShellBreadcrumbs({
    route: 'dashboard',
    group: 'Overview',
    routeTitle: 'Dashboard',
    subTrail: [],
    onNavigateRoot: () => {
      rootCalls += 1;
    },
    onResetDepartment: () => {
      resetCalls += 1;
    },
  });

  assert.equal(dashboardTrail.length, 3);
  assert.equal(dashboardTrail[0].onClick, undefined);
  assert.equal(dashboardTrail[2].isCurrent, true);
  assert.equal(dashboardTrail[2].label, 'Dashboard');

  let listClicks = 0;
  const deepTrail = buildShellBreadcrumbs({
    route: 'idea-intelligence',
    group: 'Intelligence',
    routeTitle: 'Idea Intelligence',
    subTrail: [
      {
        label: 'Research Reports',
        onClick: () => {
          listClicks += 1;
        },
      },
      { label: '  ' },
      {
        label: 'Solstice Cold Brew Expansion',
        onClick: () => {
          throw new Error('Current leaf item must not keep onClick');
        },
      },
    ],
    onNavigateRoot: () => {
      rootCalls += 1;
    },
    onResetDepartment: () => {
      resetCalls += 1;
    },
  });

  assert.equal(deepTrail.length, 5);
  assert.deepEqual(
    deepTrail.map((i) => i.label),
    [
      'BrainWise',
      'Intelligence',
      'Idea Intelligence',
      'Research Reports',
      'Solstice Cold Brew Expansion',
    ]
  );
  assert.equal(deepTrail[2].isCurrent, false);
  deepTrail[2].onClick?.();
  deepTrail[3].onClick?.();
  deepTrail[0].onClick?.();
  assert.equal(resetCalls, 1);
  assert.equal(listClicks, 1);
  assert.equal(rootCalls, 1);
  assert.equal(deepTrail[4].isCurrent, true);
  assert.equal(deepTrail[4].onClick, undefined);
});

test('filterJournalArticles filters by category or returns all', () => {
  const sample: JournalArticle[] = [
    {
      id: 'j1',
      category: 'Market Validation',
      title: 'Sizing Markets with Range Bands',
      excerpt: 'Range bands beat point forecasts.',
      readTime: '4 min read',
      publishedAt: 'Nov 2026',
      takeaways: ['Use sensitivity sliders'],
      defaultPrompt: 'How do I size my coffee subscription?',
    },
    {
      id: 'j2',
      category: 'Positioning',
      title: 'Finding Open White Space',
      excerpt: 'Turn reviews into strategy.',
      readTime: '5 min read',
      publishedAt: 'Nov 2026',
      takeaways: ['Mine 3-star reviews'],
      defaultPrompt: 'How do I differentiate from incumbents?',
    },
  ];

  assert.equal(filterJournalArticles(sample, 'All').length, 2);
  assert.equal(filterJournalArticles(sample, 'Positioning').length, 1);
  assert.equal(filterJournalArticles(sample, 'Positioning')[0].id, 'j2');
});

test('synthesizePlaybookPrompt tailors actionable guidance from user question or default prompt', () => {
  const article: JournalArticle = {
    id: 'j1',
    category: 'Market Validation',
    title: 'Sizing Markets with Range Bands',
    excerpt: 'Range bands beat point forecasts.',
    readTime: '4 min read',
    publishedAt: 'Nov 2026',
    takeaways: ['Use sensitivity sliders'],
    defaultPrompt: 'Specialty tea subscriptions',
  };

  const custom = synthesizePlaybookPrompt(article, 'Boutique cold brew cans');
  assert.ok(custom.includes('Boutique cold brew cans'));
  assert.ok(custom.includes('TAM/SAM/SOM'));

  const fallback = synthesizePlaybookPrompt(article, '   ');
  assert.ok(fallback.includes('Specialty tea subscriptions'));
});

test('compareMarketScenarios computes range bands, upside ratio, and break-even delta', () => {
  const comparison = compareMarketScenarios(
    {
      id: 'conservative',
      name: 'Conservative Metro Pilot',
      tamBillion: 2.6,
      samSharePct: 10,
      somSharePct: 0.6,
      breakEvenMonths: 7,
      targetArpuUsd: 18,
    },
    {
      id: 'regional',
      name: 'Regional Expansion',
      tamBillion: 4.2,
      samSharePct: 14,
      somSharePct: 1.2,
      breakEvenMonths: 11,
      targetArpuUsd: 22,
    }
  );
  assert.ok(comparison.scenarioA.somBand.includes('–'));
  assert.ok(comparison.scenarioB.somMidpointMillion > comparison.scenarioA.somMidpointMillion);
  assert.equal(comparison.breakEvenDeltaMonths, 4);
  assert.ok(comparison.somUpsideRatio > 1);
});

test('findNearestCompetitors sorts competitors by Euclidean distance from own position', () => {
  const result = findNearestCompetitors(58, 80, INITIAL_BRAINWISE_STATE.competitors);
  assert.equal(result.ownQuadrant, 'Premium Craft & Digital');
  assert.equal(result.nearest.length, INITIAL_BRAINWISE_STATE.competitors.length);
  assert.ok(result.nearest[0].distance <= result.nearest[1].distance);
  assert.equal(result.whiteSpaceClearance, result.nearest[0].distance);
});

test('filterReviewComplaints groups competitor complaints by topic cleanly', () => {
  const all = filterReviewComplaints(INITIAL_BRAINWISE_STATE.competitors, 'All');
  assert.ok(all.length >= 4);
  const freshness = filterReviewComplaints(INITIAL_BRAINWISE_STATE.competitors, 'Freshness');
  assert.ok(freshness.length >= 1);
  assert.ok(freshness.every((r) => r.topic === 'Freshness'));
});

test('formatBrandCssVariables and formatBrandJsonTokens produce valid copyable token payloads', () => {
  const css = formatBrandCssVariables(INITIAL_BRAINWISE_STATE.brand);
  assert.ok(css.includes(':root {'));
  assert.ok(css.includes('--brand-accent:'));
  assert.ok(css.includes('--font-heading:'));

  const jsonStr = formatBrandJsonTokens(INITIAL_BRAINWISE_STATE.brand);
  const parsed = JSON.parse(jsonStr) as { brandName: string; colors: { accent: string } };
  assert.equal(parsed.brandName, 'Solstice Craft Coffee');
  assert.ok(parsed.colors.accent.startsWith('#'));
});

test('selectFocusSprintTasks picks top unchecked priority tasks and formatCountdownSeconds pads mm:ss', () => {
  const sprint = selectFocusSprintTasks(INITIAL_BRAINWISE_STATE.tasks, 3);
  assert.equal(sprint.length, 3);
  assert.ok(sprint.every((t) => t.status === 'pending'));
  assert.equal(formatCountdownSeconds(1500), '25:00');
  assert.equal(formatCountdownSeconds(65), '01:05');
});

test('computeDashboardMetrics distinguishes populated vs fresh empty workspace', () => {
  const populated = computeDashboardMetrics(INITIAL_BRAINWISE_STATE);
  assert.equal(populated.isFreshWorkspace, false);
  assert.equal(populated.trajectoryLabel, 'Healthy Trajectory');
  assert.equal(populated.marketPositionLabel, 'Differentiated');

  const emptyState = {
    ...INITIAL_BRAINWISE_STATE,
    reports: [],
    competitors: [],
    goals: [],
    tasks: [],
  };
  const fresh = computeDashboardMetrics(emptyState);
  assert.equal(fresh.isFreshWorkspace, true);
  assert.equal(fresh.trajectoryLabel, 'Setup in Progress');
  assert.equal(fresh.marketPositionLabel, 'Unmapped');
});

test('buildDynamicDossier parameterizes report by idea, industry, and geography without coffee fallback', () => {
  const rep = buildDynamicDossier({
    ideaSummary: 'Boutique Pilates Studio in Austin',
    industry: 'Consumer Health & Fitness',
    targetMarket: 'Remote workers aged 25-42',
    geography: 'Austin, Texas',
    depth: 'Standard Validation',
    brain: INITIAL_BRAINWISE_STATE.brain,
  });
  assert.ok(rep.title.includes('Boutique Pilates Studio'));
  assert.equal(rep.industry, 'Consumer Health & Fitness');
  assert.ok(rep.executiveSummary.includes('Austin, Texas'));
  assert.ok(!rep.executiveSummary.toLowerCase().includes('chikmagalur'));
});

test('buildWeeklyGrowthPlan, buildRoadmapPhases, buildExecutiveReportNarrative, and buildAssetSvgMarkup derive from state', () => {
  const weeks = buildWeeklyGrowthPlan(INITIAL_BRAINWISE_STATE);
  assert.equal(weeks.length, 2);
  assert.ok(weeks[0].experiments.length >= 1);

  const phases = buildRoadmapPhases(INITIAL_BRAINWISE_STATE);
  assert.equal(phases.length, 4);
  assert.ok(phases.some((p) => p.highlighted));

  const narrative = buildExecutiveReportNarrative(
    'Competitive Intelligence Report',
    INITIAL_BRAINWISE_STATE
  );
  assert.ok(narrative.takeaway.includes(INITIAL_BRAINWISE_STATE.competitors[0].name));

  const svg = buildAssetSvgMarkup(
    INITIAL_BRAINWISE_STATE.assets[0],
    'Solstice Craft Coffee',
    'geometric'
  );
  assert.ok(svg.startsWith('<svg '));
  assert.ok(svg.includes('Solstice Craft Coffee'));
});

test('sanitizeAiSvgMarkup strips scripts, event handlers, and foreignObject while preserving valid SVG', () => {
  const dirty = `<svg viewBox="0 0 64 64" onclick="alert(1)"><script>alert('xss')</script><foreignObject><div>bad</div></foreignObject><circle cx="32" cy="32" r="20" stroke="#FF7417"/></svg>`;
  const clean = sanitizeAiSvgMarkup(dirty);
  assert.ok(clean.startsWith('<svg'));
  assert.ok(!clean.includes('<script'));
  assert.ok(!clean.includes('onclick'));
  assert.ok(!clean.includes('foreignObject'));
  assert.ok(clean.includes('<circle'));
  assert.equal(sanitizeAiSvgMarkup('not an svg'), '');
});

test('buildLocalLogoConcepts, buildLocalBrandAssetVariations, buildLocalSocialCreative, and slide SVG export work deterministically', () => {
  const logos = buildLocalLogoConcepts({
    brandName: 'Solstice Craft Coffee',
    prompt: 'Architectural roast mark',
    styleArchetype: 'Minimal Geometric',
    accentHex: '#FF7417',
  });
  assert.equal(logos.length, 3);
  assert.ok(logos.every((l) => Boolean(l.customSvg?.includes('<svg'))));

  const variations = buildLocalBrandAssetVariations({
    category: 'Packaging',
    prompt: '48h fresh roast box sleeve',
    brandName: 'Solstice Craft Coffee',
    tagline: 'Roasted Tuesday. Brewed Fresh.',
    positioning: 'Transparent single-estate roastery',
    accentHex: '#FF7417',
    surfaceMode: 'mixed',
  });
  assert.equal(variations.length, 3);

  const carousel = buildLocalSocialCreative({
    platform: 'Carousel',
    angle: 'Educational Carousel',
    prompt: 'Why 48-hour roast freshness beats supermarket bags',
    slideCount: 5,
    brandName: 'Solstice Craft Coffee',
    tagline: 'Roasted Tuesday. Brewed Fresh.',
    positioning: 'Transparent single-estate roastery',
    accentHex: '#FF7417',
  });
  assert.equal(carousel.slides.length, 5);
  assert.ok(carousel.hashtags.length >= 4);

  const slideSvg = buildCarouselSlideSvgMarkup(
    carousel.slides[0],
    'Solstice Craft Coffee',
    '#FF7417',
    true,
    '4:5'
  );
  assert.ok(slideSvg.includes('width="1080" height="1350"'));
  assert.ok(slideSvg.includes('SLIDE 01'));
});

test('calculateCacChurnSensitivityMatrix generates 2D matrix with sound unit economics and health zones', () => {
  const matrix = calculateCacChurnSensitivityMatrix(5.2, 22, 75, 3.0);
  assert.equal(matrix.cacTiers.length, 5);
  assert.equal(matrix.churnTiers.length, 5);
  assert.equal(matrix.grid.length, 5);
  assert.equal(matrix.grid[0].length, 5);

  // Check base cell
  assert.equal(matrix.baseCell.cac, 75);
  assert.equal(matrix.baseCell.churnPct, 3.0);
  assert.ok(matrix.baseCell.breakEvenMonths > 0);
  assert.ok(matrix.baseCell.ltvCacRatio > 0);

  // Check low CAC + low churn produces healthy payback and high LTV/CAC
  const healthyCell = matrix.grid[0][0]; // 1.5% churn, lowest CAC
  assert.equal(healthyCell.health, 'healthy');
  assert.ok(healthyCell.breakEvenMonths <= 12);
  assert.ok(healthyCell.ltvCacRatio >= 3.0);

  // Check high CAC + high churn produces high_risk
  const riskyCell = matrix.grid[4][4]; // 7.5% churn, highest CAC
  assert.equal(riskyCell.health, 'high_risk');

  // Verify institutional takeaway mentions ARPU and break-even
  assert.ok(matrix.insight.includes('$22/mo ARPU'));
  assert.ok(matrix.insight.includes('customer acquisition cost'));
});

test('buildDynamicDossier includes rich live search grounding metadata and persistent scenarios', () => {
  const dossier = buildDynamicDossier({
    ideaSummary: 'AI-guided legal document review for SMBs',
    industry: 'LegalTech & B2B SaaS',
    targetMarket: 'Mid-sized law firms and corporate legal counsels',
    geography: 'United States & Tier-1 Metro Metros',
    depth: 'Deep Market Dossier',
    brain: INITIAL_BRAINWISE_STATE.brain,
  });

  // Verify scenarios
  assert.ok(dossier.scenarios && dossier.scenarios.length >= 2);
  assert.ok(
    dossier.scenarios[0].name.includes('Rollout') || dossier.scenarios[0].name.includes('Regional')
  );
  assert.ok(dossier.scenarios[0].tamBillion > 0);
  assert.ok(dossier.scenarios[0].samSharePct > 0);
  assert.ok(dossier.scenarios[0].somSharePct > 0);

  // Verify Live Search Grounding Deck & Direct Web Search Source Badges
  assert.ok(dossier.sources.length >= 3);
  assert.ok(dossier.sources.every((s) => Boolean(s.url && s.domain && s.domainReputation)));
  assert.ok(dossier.sources.some((s) => s.verificationStatus === 'verified_live'));
  assert.ok(dossier.sources.some((s) => (s.authorityScore ?? 0) >= 90));
  assert.ok(
    dossier.sources.every((s) => Boolean(s.metricCited && s.metricValue && s.statisticContext))
  );
});

test('formatDossierFinancialModelCsv generates RFC-compliant CSV with sizing, sensitivity, and scenario tables', () => {
  const dossier = buildDynamicDossier({
    ideaSummary: 'Artisanal nitro cold brew subscription',
    industry: 'Specialty Food & Beverage',
    targetMarket: 'Remote tech workers in Austin',
    geography: 'Austin, Texas',
    depth: 'Deep Market Dossier',
    brain: INITIAL_BRAINWISE_STATE.brain,
  });

  const sizing = estimateMarketSizing(6.4, 14, 1.2);
  const sensitivity = calculateCacChurnSensitivityMatrix(sizing.somMidpointMillion, 24, 65, 3.5);

  const csv = formatDossierFinancialModelCsv({
    report: dossier,
    dynamicBands: sizing,
    sensitivity,
    scenarios: dossier.scenarios,
  });

  assert.ok(csv.includes('BrainWise Idea Intelligence Financial Model Export'));
  assert.ok(csv.includes('Dossier Title,"Artisanal nitro cold brew subscription"'));
  assert.ok(csv.includes('MARKET SIZING (TAM / SAM / SOM RANGE BANDS)'));
  assert.ok(csv.includes('Total Addressable Market (TAM)'));
  assert.ok(csv.includes('UNIT ECONOMICS SENSITIVITY MATRIX (CAC vs. MONTHLY CHURN)'));
  assert.ok(csv.includes('Break-Even Payback Period (Months) Grid'));
  assert.ok(csv.includes('LTV to CAC Multiplier Grid'));
  assert.ok(csv.includes('PERSISTENT PITCH SCENARIOS & BENCHMARKS'));
  assert.ok(csv.includes('Regional Expansion (4-City Rollout)'));
});

test('buildDynamicDossier generates deep authentic domain research for premium chocolate', () => {
  const dossier = buildDynamicDossier({
    ideaSummary: 'premium chocolate',
    industry: 'Specialty Confectionery',
    targetMarket: 'Gourmet buyers and corporate gifting',
    geography: 'United States',
    depth: 'Deep Market Dossier',
    brain: INITIAL_BRAINWISE_STATE.brain,
  });

  assert.equal(dossier.title, 'premium chocolate');
  assert.ok(dossier.validationScorecard?.verdictLabel.includes('Artisanal Gifting'));
  assert.ok(dossier.validationScorecard?.willingnessToPay.estimatedPriceRange.includes('$9.50 – $14.00'));
  assert.ok(dossier.executiveSummary.includes('bean-to-bar'));
  assert.ok(dossier.customerPainPoints.some((p) => p.title.includes('bloomed') || p.title.includes('melting')));
  assert.ok(dossier.pricingAnalysis.tiers[0].tier.includes('Single-Origin'));
  assert.ok(dossier.competitorLandscapeSummary.includes('Tony\'s Chocolonely') || dossier.competitorLandscapeSummary.includes('Valrhona'));
  assert.ok(dossier.validationExperiments.some((e) => e.title.includes('Corporate Gifting') || e.title.includes('Thermal')));
  assert.ok(dossier.criticalAssumptions?.some((a) => a.assumption.includes('Thermal barrier') || a.assumption.includes('craft bar')));
});

test('deriveExecutionPulseSeries derives authentic historical telemetry without static offsets', () => {
  // Test 1: Empty tasks workspace
  const emptyState = {
    ...INITIAL_BRAINWISE_STATE,
    tasks: [],
    goals: [],
  };
  const emptySeries = deriveExecutionPulseSeries(emptyState);
  assert.equal(emptySeries['30d']?.[0].value, 0);
  assert.equal(emptySeries['30d']?.[0].detail, 'Baseline sprint velocity: 0%');
  assert.equal(emptySeries['30d']?.[4].value, 0);
  assert.equal(emptySeries['7d']?.[5].value, 0);

  // Test 2: Single task completed today (the exact user scenario)
  const singleTaskState = {
    ...INITIAL_BRAINWISE_STATE,
    tasks: [
      {
        id: 't-now',
        title: 'Launch MVP Landing Page',
        description: 'Publish hero test',
        whyItMatters: 'Validate demand',
        expectedOutcome: '10 signups',
        priority: 'high' as const,
        estimatedMinutes: 30,
        dueDate: new Date().toISOString().slice(0, 10),
        completedAt: new Date().toISOString(),
        department: 'Brand Studio' as const,
        status: 'completed' as const,
      },
    ],
    goals: [],
  };
  const singleSeries = deriveExecutionPulseSeries(singleTaskState);
  // Earlier intervals should be 0%, NOT fake 65%
  assert.equal(singleSeries['30d']?.[0].value, 0);
  assert.equal(singleSeries['30d']?.[1].value, 0);
  assert.equal(singleSeries['30d']?.[2].value, 0);
  assert.equal(singleSeries['30d']?.[3].value, 0);
  // Current point is 100%
  assert.equal(singleSeries['30d']?.[4].value, 100);
  assert.ok(singleSeries['30d']?.[4].detail?.includes('1/1'));

  // Test 3: Populated initial state
  const populatedSeries = deriveExecutionPulseSeries(INITIAL_BRAINWISE_STATE);
  assert.ok(populatedSeries['7d']!.length > 0);
  assert.ok(populatedSeries['30d']!.length > 0);
  assert.ok(populatedSeries['90d']!.length > 0);
  assert.ok(populatedSeries.ytd!.length > 0);
});


