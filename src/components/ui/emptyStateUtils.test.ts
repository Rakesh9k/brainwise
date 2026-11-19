import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EMPTY_STATE_PRESETS,
  resolveEmptyStateOverline,
  resolveEmptyStatePreset,
  resolveEmptyStateSizeClasses,
  resolveEmptyStateSurfaceClasses,
  type EmptyStateIllustrationVariant,
} from './emptyStateUtils';

test('every EmptyStateIllustrationVariant has a canonical preset with overline and TopoGrid settings', () => {
  const variants: EmptyStateIllustrationVariant[] = [
    'actions',
    'sprint',
    'signals',
    'experiments',
    'goals',
    'activity',
    'pulse',
    'general',
  ];

  for (const variant of variants) {
    const preset = resolveEmptyStatePreset(variant);
    assert.ok(preset.defaultOverline.length > 0, `missing overline for ${variant}`);
    assert.ok(preset.ariaLabel.length > 0, `missing ariaLabel for ${variant}`);
    assert.equal(preset.topoFade, 'edges');
  }

  assert.equal(Object.keys(EMPTY_STATE_PRESETS).length, variants.length);
});

test('resolveEmptyStateOverline prefers explicit non-empty overline and falls back cleanly', () => {
  assert.equal(
    resolveEmptyStateOverline('actions', 'Opportunities Caught Up'),
    'Opportunities Caught Up'
  );
  assert.equal(
    resolveEmptyStateOverline('signals', '   '),
    EMPTY_STATE_PRESETS.signals.defaultOverline
  );
  assert.equal(resolveEmptyStateOverline('pulse'), EMPTY_STATE_PRESETS.pulse.defaultOverline);
});

test('resolveEmptyStateSizeClasses scales padding and illustration box monotonically', () => {
  const compact = resolveEmptyStateSizeClasses('compact');
  const standard = resolveEmptyStateSizeClasses('default');
  const spacious = resolveEmptyStateSizeClasses('spacious');

  assert.notEqual(compact.containerPadding, spacious.containerPadding);
  assert.ok(compact.illustrationBox.includes('120px'));
  assert.ok(standard.illustrationBox.includes('144px'));
  assert.ok(spacious.illustrationBox.includes('168px'));
});

test('resolveEmptyStateSurfaceClasses distinguishes light card, light embedded, and dark tones', () => {
  const lightCard = resolveEmptyStateSurfaceClasses('light', 'card');
  const lightEmbedded = resolveEmptyStateSurfaceClasses('light', 'embedded');
  const darkCard = resolveEmptyStateSurfaceClasses('dark', 'card');
  const darkEmbedded = resolveEmptyStateSurfaceClasses('dark', 'embedded');

  assert.ok(lightCard.includes('bg-[#FFFFFF]'));
  assert.ok(lightCard.includes('bw-surface-raised'));
  assert.ok(lightEmbedded.includes('bg-[#FAFAF9]/85'));
  assert.ok(darkCard.includes('bg-[#171717]'));
  assert.ok(darkEmbedded.includes('border-white/[0.08]'));
});
