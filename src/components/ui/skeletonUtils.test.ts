import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getStaggeredLineWidths,
  normalizeSkeletonDimension,
  resolveSkeletonRadiusClass,
  resolveSkeletonWaveClass,
} from './skeletonUtils';

test('resolveSkeletonWaveClass maps variants to exact BrainWise CSS shimmer classes', () => {
  assert.equal(resolveSkeletonWaveClass('default'), 'bw-skeleton-wave');
  assert.equal(resolveSkeletonWaveClass('accent'), 'bw-skeleton-wave-accent');
  assert.equal(resolveSkeletonWaveClass('dark'), 'bw-skeleton-wave-dark');
});

test('resolveSkeletonRadiusClass resolves shape defaults and explicit radius overrides', () => {
  assert.equal(resolveSkeletonRadiusClass('text'), 'rounded-full');
  assert.equal(resolveSkeletonRadiusClass('circle'), 'rounded-full');
  assert.equal(resolveSkeletonRadiusClass('card'), 'rounded-[20px]');
  assert.equal(resolveSkeletonRadiusClass('rect'), 'rounded-[12px]');
  assert.equal(resolveSkeletonRadiusClass('rect', 'xl'), 'rounded-[22px]');
  assert.equal(resolveSkeletonRadiusClass('card', 'sm'), 'rounded-[8px]');
});

test('normalizeSkeletonDimension converts numbers to px strings and preserves CSS units', () => {
  assert.equal(normalizeSkeletonDimension(48), '48px');
  assert.equal(normalizeSkeletonDimension('75%'), '75%');
  assert.equal(normalizeSkeletonDimension(undefined), undefined);
});

test('getStaggeredLineWidths returns natural editorial proportions with shorter final line', () => {
  assert.deepEqual(getStaggeredLineWidths(1), ['100%']);
  const three = getStaggeredLineWidths(3);
  assert.equal(three.length, 3);
  assert.equal(three[0], '100%');
  assert.equal(three[2], '68%');
  assert.equal(getStaggeredLineWidths(0).length, 1);
  assert.equal(getStaggeredLineWidths(20).length, 12);
});
