import test from 'node:test';
import assert from 'node:assert/strict';
import { MODULAR_SCALE_RATIO } from '../../theme/typography';
import {
  OPTICAL_BAR_HEIGHT_RATIO,
  buildStaggeredModularWidths,
  computeModularSpacingPx,
  resolveModularLineMetrics,
  resolvePremiumWaveClass,
} from './premiumSkeletonUtils';

test('resolveModularLineMetrics preserves exact 1.25 ratio across adjacent modular scale tokens', () => {
  const ladder = ['overline', 'bodySm', 'body', 'h4', 'h3', 'h2', 'h1'] as const;
  const metrics = ladder.map((token) => resolveModularLineMetrics(token));

  for (let i = 1; i < metrics.length; i += 1) {
    const prev = metrics[i - 1];
    const curr = metrics[i];
    const fontRatio = curr.fontSizePx / prev.fontSizePx;
    const barRatio = curr.barHeightPx / prev.barHeightPx;

    assert.ok(
      Math.abs(fontRatio - MODULAR_SCALE_RATIO) < 0.002,
      `Expected 1.25 font ratio between ${prev.token} and ${curr.token}, got ${fontRatio}`
    );
    assert.ok(
      Math.abs(barRatio - MODULAR_SCALE_RATIO) < 0.015,
      `Expected ~1.25 optical bar ratio between ${prev.token} and ${curr.token}, got ${barRatio}`
    );
    assert.ok(
      curr.lineBoxHeightPx >= curr.barHeightPx,
      `lineBoxHeightPx must contain barHeightPx for ${curr.token}`
    );
  }

  const body = resolveModularLineMetrics('body');
  assert.equal(body.fontSizePx, 16);
  assert.equal(body.barHeightPx, Number((16 * OPTICAL_BAR_HEIGHT_RATIO).toFixed(2)));
});

test('computeModularSpacingPx follows 16 * 1.25^step progression', () => {
  assert.equal(computeModularSpacingPx(0), 16);
  assert.equal(computeModularSpacingPx(1), 20);
  assert.equal(computeModularSpacingPx(2), 25);
  assert.equal(computeModularSpacingPx(-1), 12.8);
  assert.equal(computeModularSpacingPx(-2), 10.24);
});

test('resolvePremiumWaveClass maps light, accent, and dark tones to canonical CSS wave classes', () => {
  assert.equal(resolvePremiumWaveClass('light'), 'bw-skeleton-wave');
  assert.equal(resolvePremiumWaveClass('accent'), 'bw-skeleton-wave-accent');
  assert.equal(resolvePremiumWaveClass('dark'), 'bw-skeleton-wave-dark');
  assert.equal(resolvePremiumWaveClass(), 'bw-skeleton-wave');
});

test('buildStaggeredModularWidths produces balanced editorial widths with shorter terminal line', () => {
  assert.deepEqual(buildStaggeredModularWidths(1), ['100%']);
  assert.deepEqual(buildStaggeredModularWidths(3), ['100%', '92%', '66%']);
});
