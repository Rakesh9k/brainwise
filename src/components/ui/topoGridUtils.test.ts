import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TOPO_GRID_FADE_MASKS,
  TOPO_GRID_INTENSITY_OPACITY,
  buildTopoGridStyle,
  resolveTopoGridClassName,
  resolveTopoGridToneClass,
} from './topoGridUtils';

test('resolveTopoGridToneClass maps light and dark tones to canonical CSS classes', () => {
  assert.equal(resolveTopoGridToneClass('light'), 'bw-topo-grid');
  assert.equal(resolveTopoGridToneClass('dark'), 'bw-topo-grid-dark');
  assert.equal(resolveTopoGridToneClass(), 'bw-topo-grid');
});

test('resolveTopoGridClassName builds non-interactive persistent overlay classes cleanly', () => {
  const lightDefault = resolveTopoGridClassName({});
  assert.ok(lightDefault.includes('pointer-events-none'));
  assert.ok(lightDefault.includes('select-none'));
  assert.ok(lightDefault.includes('absolute inset-0'));
  assert.ok(lightDefault.includes('bw-topo-grid'));
  assert.ok(lightDefault.includes('rounded-[inherit]'));

  const darkFixed = resolveTopoGridClassName({
    tone: 'dark',
    placement: 'fixed',
    rounded: false,
    className: 'custom-layer',
  });
  assert.ok(darkFixed.includes('fixed inset-0'));
  assert.ok(darkFixed.includes('bw-topo-grid-dark'));
  assert.ok(!darkFixed.includes('rounded-[inherit]'));
  assert.ok(darkFixed.includes('custom-layer'));
});

test('buildTopoGridStyle produces feathered mask, optional density override, and calibrated opacity', () => {
  const edgesDefault = buildTopoGridStyle({
    fade: 'edges',
    density: 'default',
    intensity: 'subtle',
  });
  assert.equal(edgesDefault.opacity, TOPO_GRID_INTENSITY_OPACITY.subtle);
  assert.equal(edgesDefault.backgroundSize, undefined);
  assert.equal(edgesDefault.maskImage, TOPO_GRID_FADE_MASKS.edges);
  assert.equal(edgesDefault.WebkitMaskImage, TOPO_GRID_FADE_MASKS.edges);

  const uniformCompact = buildTopoGridStyle({
    fade: 'none',
    density: 'compact',
    intensity: 'crisp',
  });
  assert.equal(uniformCompact.opacity, 1);
  assert.equal(uniformCompact.backgroundSize, '24px 24px');
  assert.equal(uniformCompact.maskImage, undefined);

  const wideWhisper = buildTopoGridStyle({
    fade: 'top-radial',
    density: 'wide',
    intensity: 'whisper',
    style: { zIndex: 1 },
  });
  assert.equal(wideWhisper.opacity, 0.65);
  assert.equal(wideWhisper.backgroundSize, '40px 40px');
  assert.equal(wideWhisper.maskImage, TOPO_GRID_FADE_MASKS['top-radial']);
  assert.equal(wideWhisper.zIndex, 1);
});
