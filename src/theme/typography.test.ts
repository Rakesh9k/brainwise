import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MODULAR_SCALE_BASE_PX,
  MODULAR_SCALE_RATIO,
  ORDERED_TYPOGRAPHY_STEPS,
  TYPE_TOKENS,
  TYPOGRAPHY_STEPS,
  computeModularStep,
  exportTypographyCssVars,
  typeClass,
} from './typography';

test('computeModularStep enforces strict 1.25 modular ratio around 16px base', () => {
  const base = computeModularStep(0);
  assert.equal(base.px, 16);
  assert.equal(base.rem, 1);

  const up1 = computeModularStep(1);
  assert.equal(up1.px, 20);
  assert.equal(up1.rem, 1.25);

  const up2 = computeModularStep(2);
  assert.equal(up2.px, 25);
  assert.equal(up2.rem, 1.5625);

  const down1 = computeModularStep(-1);
  assert.equal(down1.px, 12.8);
  assert.equal(down1.rem, 0.8);

  const down2 = computeModularStep(-2);
  assert.equal(down2.px, 10.24);
  assert.equal(down2.rem, 0.64);
});

test('every adjacent step in ORDERED_TYPOGRAPHY_STEPS has exact 1.25 ratio', () => {
  assert.equal(MODULAR_SCALE_BASE_PX, 16);
  assert.equal(MODULAR_SCALE_RATIO, 1.25);
  assert.equal(ORDERED_TYPOGRAPHY_STEPS.length, 9);

  for (let i = 1; i < ORDERED_TYPOGRAPHY_STEPS.length; i += 1) {
    const prev = ORDERED_TYPOGRAPHY_STEPS[i - 1];
    const next = ORDERED_TYPOGRAPHY_STEPS[i];
    const ratio = next.px / prev.px;
    assert.ok(
      Math.abs(ratio - MODULAR_SCALE_RATIO) < 1e-4,
      `Expected ratio 1.25 between ${prev.key} (${prev.px}px) and ${next.key} (${next.px}px), got ${ratio}`
    );
  }
});

test('all semantic TYPE_TOKENS map cleanly to TYPOGRAPHY_STEPS and typeClass', () => {
  const entries = Object.values(TYPE_TOKENS);
  assert.ok(entries.length >= 12);

  for (const spec of entries) {
    assert.ok(TYPOGRAPHY_STEPS[spec.stepKey], `Invalid stepKey ${spec.stepKey} for ${spec.token}`);
    if (spec.mobileStepKey) {
      assert.ok(
        TYPOGRAPHY_STEPS[spec.mobileStepKey],
        `Invalid mobileStepKey ${spec.mobileStepKey} for ${spec.token}`
      );
      assert.ok(
        TYPOGRAPHY_STEPS[spec.mobileStepKey].px <= TYPOGRAPHY_STEPS[spec.stepKey].px,
        `Mobile step should not exceed desktop step for ${spec.token}`
      );
    }
    assert.equal(typeClass[spec.token], spec.className);
    assert.ok(spec.className.startsWith('bw-type-'));
  }
});

test('exportTypographyCssVars emits all CSS custom properties for the modular scale', () => {
  const css = exportTypographyCssVars();
  assert.ok(css.includes('--bw-type-ratio: 1.25;'));
  assert.ok(css.includes('--bw-text-step-0: 1rem;'));
  assert.ok(css.includes('--bw-text-step-1: 1.25rem;'));
  assert.ok(css.includes('--bw-text-step-4: 2.441406rem;'));
  assert.ok(css.includes('--bw-text-step-6: 3.814697rem;'));
});
