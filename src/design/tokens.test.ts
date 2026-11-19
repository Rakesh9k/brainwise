import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BW_COLORS,
  BW_ELEVATION,
  BW_FOCUS_RING,
  BW_FROSTED_GLASS,
  BW_LAYOUT,
  BW_RADII,
  BW_SPACING,
  exportFrozenTokensCss,
} from './tokens';

test('BW_SPACING covers the complete 4px baseline scale up to 80px', () => {
  const expectedValues = [4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80];
  assert.deepEqual(Array.from(BW_SPACING.values), expectedValues);
  assert.equal(BW_SPACING.scale.length, 11);
  for (const item of BW_SPACING.scale) {
    assert.equal(item.value % 4, 0);
    assert.equal(item.px, `${item.value}px`);
  }
});

test('BW_RADII defines canonical monotonic border radius tokens', () => {
  assert.equal(BW_RADII.xs, '4px');
  assert.equal(BW_RADII.sm, '8px');
  assert.equal(BW_RADII.md, '12px');
  assert.equal(BW_RADII.lg, '16px');
  assert.equal(BW_RADII.xl, '20px');
  assert.equal(BW_RADII.xxl, '24px');
  assert.equal(BW_RADII.full, '9999px');
});

test('BW_LAYOUT defines shell dimensions, container limits, and z-index hierarchy', () => {
  assert.equal(BW_LAYOUT.sidebarWidthExpanded, '256px');
  assert.equal(BW_LAYOUT.sidebarWidthCollapsed, '72px');
  assert.equal(BW_LAYOUT.headerHeight, '64px');
  assert.equal(BW_LAYOUT.containerMaxWidth, '1440px');
  assert.ok(BW_LAYOUT.zIndex.modal > BW_LAYOUT.zIndex.drawer);
  assert.ok(BW_LAYOUT.zIndex.toast > BW_LAYOUT.zIndex.modal);
});

test('BW_FOCUS_RING references --bw-orange and exposes editorial utility classes', () => {
  assert.equal(BW_FOCUS_RING.color, 'var(--bw-orange)');
  assert.equal(BW_FOCUS_RING.utilityClasses.default, 'focus-ring');
  assert.equal(BW_FOCUS_RING.utilityClasses.dark, 'focus-ring focus-ring-dark');
  assert.equal(BW_FOCUS_RING.utilityClasses.inset, 'focus-ring-inset');
});

test('BW_FROSTED_GLASS defines semi-transparent white layer and subtle backdrop blur tokens', () => {
  assert.equal(BW_FROSTED_GLASS.background, 'rgba(255, 255, 255, 0.76)');
  assert.equal(BW_FROSTED_GLASS.blur, '14px');
  assert.equal(BW_FROSTED_GLASS.utilityClasses.nav, 'bw-frosted-nav');
  assert.equal(BW_FROSTED_GLASS.utilityClasses.elevated, 'bw-frosted-nav-elevated');
});

test('exportFrozenTokensCss emits --bw-orange, --bw-surface-elevated, --bw-glass-*, and --bw-focus-ring variables', () => {
  const css = exportFrozenTokensCss();
  assert.match(css, new RegExp(`--bw-orange:\\s*${BW_COLORS.accent.orange};`));
  assert.match(css, /--bw-surface-elevated:/);
  assert.match(css, /--bw-glass-bg:\s*rgba\(255, 255, 255, 0\.76\);/);
  assert.match(css, /--bw-glass-blur:\s*14px;/);
  assert.match(css, /--bw-focus-ring-offset:\s*var\(--bw-bg-primary\);/);
  assert.match(css, /--bw-focus-ring:.*var\(--bw-orange\)/);
  assert.equal(BW_ELEVATION.surfaceElevated, 'var(--bw-surface-elevated)');
});
