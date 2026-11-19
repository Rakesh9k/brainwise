import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GROWTH_CURVE_MODE_OPTIONS,
  GROWTH_TIME_RANGE_OPTIONS,
  buildEditorialTickValues,
  computeGrowthTrendSummary,
  formatGrowthMetricValue,
  formatSignedDeltaPercent,
  resolveChartMilestones,
  resolveCurveModeConfig,
  resolveTimeRangePoints,
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
