import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GROWTH_CURVE_MODE_OPTIONS,
  GROWTH_TIME_RANGE_OPTIONS,
  buildBrushSparklinePath,
  buildEditorialTickValues,
  clampBrushRange,
  computeGrowthTrendSummary,
  createAnnotation,
  filterAnnotationsForPoints,
  findAnnotationForPoint,
  findMilestoneForPoint,
  formatGrowthMetricValue,
  formatSignedDeltaPercent,
  indexFromClientX,
  isBrushActive,
  removeAnnotation,
  resolveChartMilestones,
  resolveCurveModeConfig,
  resolveTimeRangePoints,
  slicePointsByBrush,
  upsertAnnotation,
} from './growthTrendUtils';

test('formatGrowthMetricValue formats currency, percent, and signed numbers cleanly', () => {
  assert.equal(formatGrowthMetricValue(1680, '$', ''), '$1,680');
  assert.equal(formatGrowthMetricValue(28, '+', '%'), '+28%');
  assert.equal(formatGrowthMetricValue(-12.5, '$', ''), '-$12.5');
});

test('computeGrowthTrendSummary computes delta, percent change, trend direction, and padded yDomain', () => {
  const summary = computeGrowthTrendSummary([
    { label: 'Jun', value: 740 },
    { label: 'Jul', value: 890 },
    { label: 'Aug', value: 1120 },
    { label: 'Nov', value: 1680 },
  ]);

  assert.equal(summary.count, 4);
  assert.equal(summary.min, 740);
  assert.equal(summary.max, 1680);
  assert.equal(summary.delta, 940);
  assert.equal(summary.deltaPercent, 127);
  assert.equal(summary.trend, 'up');
  assert.ok(summary.yDomain[0] < 740 && summary.yDomain[0] >= 0);
  assert.ok(summary.yDomain[1] > 1680);
});

test('computeGrowthTrendSummary handles empty series and flat values safely', () => {
  const empty = computeGrowthTrendSummary([]);
  assert.equal(empty.count, 0);
  assert.equal(empty.latest, null);
  assert.deepEqual(empty.yDomain, [0, 100]);

  const flat = computeGrowthTrendSummary([
    { label: 'W1', value: 25 },
    { label: 'W2', value: 25 },
  ]);
  assert.equal(flat.trend, 'flat');
  assert.equal(flat.delta, 0);
  assert.ok(flat.yDomain[1] > flat.yDomain[0]);
});

test('buildEditorialTickValues and formatSignedDeltaPercent produce clean minimal outputs', () => {
  assert.deepEqual(buildEditorialTickValues([0, 100]), [0, 50, 100]);
  assert.equal(formatSignedDeltaPercent(18.34), '+18.3%');
  assert.equal(formatSignedDeltaPercent(-4.2), '-4.2%');
  assert.equal(formatSignedDeltaPercent(0), '0%');
  assert.equal(formatSignedDeltaPercent(null), null);
});

test('GROWTH_TIME_RANGE_OPTIONS exposes 7d, 30d, 90d, and YTD in canonical order', () => {
  assert.deepEqual(
    GROWTH_TIME_RANGE_OPTIONS.map((o) => o.id),
    ['7d', '30d', '90d', 'ytd']
  );
  assert.deepEqual(
    GROWTH_TIME_RANGE_OPTIONS.map((o) => o.label),
    ['7d', '30d', '90d', 'YTD']
  );
});

test('resolveTimeRangePoints prefers explicit rangeSeries and deterministically derives fallbacks', () => {
  const custom7d = [
    { label: 'Mon', value: 10 },
    { label: 'Sun', value: 14 },
  ];
  const resolvedExplicit = resolveTimeRangePoints({
    range: '7d',
    points: [{ label: 'Now', value: 100 }],
    rangeSeries: { '7d': custom7d },
  });
  assert.deepEqual(resolvedExplicit, custom7d);

  const fallbackYtd = resolveTimeRangePoints({
    range: 'ytd',
    points: [
      { label: 'W1', value: 50, baseline: 45 },
      { label: 'Now', value: 100, baseline: 90 },
    ],
  });
  assert.equal(fallbackYtd.length, 6);
  assert.equal(fallbackYtd[fallbackYtd.length - 1].value, 100);
  assert.equal(fallbackYtd[fallbackYtd.length - 1].baseline, 90);
});

test('resolveChartMilestones resolves explicit + inline milestones, filters invalid labels, and sets edge alignment', () => {
  const points = [
    { label: 'Jun', value: 420, milestone: 'Seed Launch' },
    { label: 'Jul', value: 680 },
    { label: 'Oct', value: 1420, milestone: 'Inline Ignored' },
    { label: 'Nov', value: 1680, milestone: 'Target Hit', milestoneTone: 'accent' as const },
  ];

  const resolved = resolveChartMilestones({
    points,
    range: 'ytd',
    rangeMilestones: {
      ytd: [
        { xLabel: 'Oct', label: 'B2B Studios', tone: 'accent' },
        { xLabel: 'MissingMonth', label: 'Should Filter' },
      ],
    },
  });

  assert.equal(resolved.length, 3);
  assert.deepEqual(
    resolved.map((m) => ({
      xLabel: m.xLabel,
      label: m.label,
      alignment: m.alignment,
      tone: m.tone,
    })),
    [
      { xLabel: 'Jun', label: 'Seed Launch', alignment: 'start', tone: 'neutral' },
      { xLabel: 'Oct', label: 'B2B Studios', alignment: 'middle', tone: 'accent' },
      { xLabel: 'Nov', label: 'Target Hit', alignment: 'end', tone: 'accent' },
    ]
  );
});

test('GROWTH_CURVE_MODE_OPTIONS and resolveCurveModeConfig distinguish smooth spline vs raw data points', () => {
  assert.deepEqual(
    GROWTH_CURVE_MODE_OPTIONS.map((o) => o.id),
    ['smooth', 'raw']
  );

  const smooth = resolveCurveModeConfig('smooth');
  assert.equal(smooth.areaType, 'monotone');
  assert.equal(smooth.showAllPointDots, false);
  assert.equal(smooth.strokeWidth, 2.25);

  const raw = resolveCurveModeConfig('raw');
  assert.equal(raw.areaType, 'linear');
  assert.equal(raw.showAllPointDots, true);
  assert.equal(raw.strokeWidth, 1.85);
});

test('resolveChartMilestones and findMilestoneForPoint correctly extract annotation detail and impact', () => {
  const points = [
    {
      label: 'Mon',
      value: 120,
      milestone: 'Beta Launch',
      milestoneDetail: 'First 500 early access founders onboarded',
      milestoneImpact: '+42% signups',
      milestoneTone: 'accent' as const,
    },
    { label: 'Tue', value: 145 },
    {
      label: 'Wed',
      value: 190,
      detail: 'Referral loop ignited',
    },
  ];

  const resolved = resolveChartMilestones({
    points,
    range: '7d',
    milestones: [
      {
        xLabel: 'Wed',
        label: 'Viral Loop',
        impact: 'K-factor 1.4',
      },
    ],
  });

  assert.equal(resolved.length, 2);

  const beta = findMilestoneForPoint(resolved, 'Mon');
  assert.ok(beta);
  assert.equal(beta.label, 'Beta Launch');
  assert.equal(beta.detail, 'First 500 early access founders onboarded');
  assert.equal(beta.impact, '+42% signups');
  assert.equal(beta.tone, 'accent');

  const viral = findMilestoneForPoint(resolved, 'Wed');
  assert.ok(viral);
  assert.equal(viral.label, 'Viral Loop');
  // Inherits point.detail when milestone.detail is omitted
  assert.equal(viral.detail, 'Referral loop ignited');
  assert.equal(viral.impact, 'K-factor 1.4');

  const missing = findMilestoneForPoint(resolved, 'Tue');
  assert.equal(missing, undefined);
});

test('clampBrushRange handles out-of-bounds, inverted ranges, and preserves minPoints', () => {
  assert.deepEqual(clampBrushRange(0, 5, 6, 2), [0, 5]);
  assert.deepEqual(clampBrushRange(-2, 10, 6, 2), [0, 5]);
  assert.deepEqual(clampBrushRange(4, 2, 6, 2), [2, 4]); // inverted
  assert.deepEqual(clampBrushRange(3, 3, 6, 2), [3, 4]); // expanded for minPoints=2
  assert.deepEqual(clampBrushRange(5, 5, 6, 2), [4, 5]); // adjusted start at boundary
  assert.deepEqual(clampBrushRange(0, 0, 1, 2), [0, 0]); // totalPoints < minPoints
  assert.deepEqual(clampBrushRange(0, 0, 0, 2), [0, 0]); // empty
});

test('slicePointsByBrush returns sliced subset or full series when range is omitted', () => {
  const points = [
    { label: 'Jan', value: 10 },
    { label: 'Feb', value: 20 },
    { label: 'Mar', value: 30 },
    { label: 'Apr', value: 40 },
    { label: 'May', value: 50 },
  ];

  assert.deepEqual(slicePointsByBrush(points, null), points);
  assert.deepEqual(slicePointsByBrush(points, undefined), points);

  const zoomed = slicePointsByBrush(points, [1, 3]);
  assert.equal(zoomed.length, 3);
  assert.equal(zoomed[0].label, 'Feb');
  assert.equal(zoomed[2].label, 'Apr');

  // Single point dataset
  assert.deepEqual(slicePointsByBrush([{ label: 'Only', value: 1 }], [0, 0]), [
    { label: 'Only', value: 1 },
  ]);
  assert.deepEqual(slicePointsByBrush([], [0, 0]), []);
});

test('isBrushActive detects whether the range is zoomed in or full view', () => {
  assert.equal(isBrushActive([0, 4], 5), false);
  assert.equal(isBrushActive([1, 4], 5), true);
  assert.equal(isBrushActive([0, 3], 5), true);
  assert.equal(isBrushActive([1, 3], 5), true);
  assert.equal(isBrushActive(null, 5), false);
  assert.equal(isBrushActive([0, 0], 0), false);
});

test('indexFromClientX maps coordinate fractions to nearest point indices with clamping', () => {
  // 5 points -> indices 0, 1, 2, 3, 4
  const rectLeft = 100;
  const rectWidth = 200;
  const total = 5;

  assert.equal(indexFromClientX(100, rectLeft, rectWidth, total), 0);
  assert.equal(indexFromClientX(50, rectLeft, rectWidth, total), 0); // clamp left
  assert.equal(indexFromClientX(300, rectLeft, rectWidth, total), 4);
  assert.equal(indexFromClientX(350, rectLeft, rectWidth, total), 4); // clamp right
  assert.equal(indexFromClientX(200, rectLeft, rectWidth, total), 2); // exactly middle (50% = index 2)
  assert.equal(indexFromClientX(150, rectLeft, rectWidth, total), 1); // 25% = index 1
});

test('buildBrushSparklinePath generates valid SVG path commands for overview sparkline', () => {
  const points = [
    { label: 'W1', value: 100 },
    { label: 'W2', value: 250 },
    { label: 'W3', value: 180 },
    { label: 'W4', value: 300 },
  ];

  const { areaPath, linePath } = buildBrushSparklinePath(points, 100, 32);
  assert.ok(linePath.startsWith('M 0'));
  assert.ok(linePath.includes('L 100'));
  assert.ok(areaPath.includes('L 100 32 L 0 32 Z'));

  // Degenerate inputs
  const empty = buildBrushSparklinePath([], 100, 32);
  assert.equal(empty.linePath, '');
  assert.equal(empty.areaPath, '');

  const single = buildBrushSparklinePath([{ label: 'W1', value: 100 }], 100, 32);
  assert.ok(single.linePath.includes('M 0'));
  assert.ok(single.areaPath.includes('Z'));
});

test('createAnnotation creates formatted trend annotation with generated id and timestamps', () => {
  const annot = createAnnotation('Oct 15', 'Traffic spike after podcast launch', {
    color: 'accent',
    author: 'Growth Lead',
  });

  assert.ok(annot.id.startsWith('annot-Oct 15-'));
  assert.equal(annot.xLabel, 'Oct 15');
  assert.equal(annot.text, 'Traffic spike after podcast launch');
  assert.equal(annot.color, 'accent');
  assert.equal(annot.author, 'Growth Lead');
  assert.ok(annot.createdAt);
  assert.ok(annot.updatedAt);
});

test('upsertAnnotation inserts new annotations and updates existing by xLabel or id', () => {
  const a1 = createAnnotation('Mon', 'First note');
  const list1 = upsertAnnotation([], a1);
  assert.equal(list1.length, 1);
  assert.equal(list1[0].text, 'First note');

  // Insert second point note
  const a2 = createAnnotation('Wed', 'Midweek surge');
  const list2 = upsertAnnotation(list1, a2);
  assert.equal(list2.length, 2);

  // Update existing note on 'Mon'
  const updatedMon = { ...a1, text: 'Revised note on Monday dip' };
  const list3 = upsertAnnotation(list2, updatedMon);
  assert.equal(list3.length, 2);
  assert.equal(list3[0].text, 'Revised note on Monday dip');
  assert.equal(list3[1].text, 'Midweek surge');
});

test('removeAnnotation removes annotation by id or xLabel cleanly', () => {
  const a1 = createAnnotation('W1', 'Note 1');
  const a2 = createAnnotation('W2', 'Note 2');
  const list = [a1, a2];

  const removedById = removeAnnotation(list, a1.id);
  assert.equal(removedById.length, 1);
  assert.equal(removedById[0].xLabel, 'W2');

  const removedByXLabel = removeAnnotation(list, 'W2');
  assert.equal(removedByXLabel.length, 1);
  assert.equal(removedByXLabel[0].xLabel, 'W1');

  assert.deepEqual(removeAnnotation([], 'W1'), []);
  assert.deepEqual(removeAnnotation(undefined, 'W1'), []);
});

test('findAnnotationForPoint and filterAnnotationsForPoints match annotations accurately', () => {
  const a1 = createAnnotation('W1', 'Alpha test');
  const a2 = createAnnotation('W3', 'Gamma test');
  const list = [a1, a2];

  assert.equal(findAnnotationForPoint(list, 'W1')?.text, 'Alpha test');
  assert.equal(findAnnotationForPoint(list, 'W2'), undefined);
  assert.equal(findAnnotationForPoint([], 'W1'), undefined);

  const points = [
    { label: 'W1', value: 10 },
    { label: 'W2', value: 20 },
  ];
  const filtered = filterAnnotationsForPoints(list, points);
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].xLabel, 'W1');
});

