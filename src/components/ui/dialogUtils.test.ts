import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DIALOG_PLACEMENT_CLASSES,
  DIALOG_SIZE_CLASSES,
  buildDialogAriaProps,
  createScrollLockCounter,
  resolveDialogWidthClass,
} from './dialogUtils';

test('resolveDialogWidthClass uses standardized size scale and respects maxWidth override', () => {
  assert.equal(resolveDialogWidthClass('sm'), DIALOG_SIZE_CLASSES.sm);
  assert.equal(resolveDialogWidthClass('lg'), 'max-w-xl');
  assert.equal(resolveDialogWidthClass('md', 'max-w-3xl'), 'max-w-3xl');
  assert.equal(resolveDialogWidthClass('xl', '   '), 'max-w-2xl');
});

test('DIALOG_PLACEMENT_CLASSES provides distinct centered and command-top placements', () => {
  assert.match(DIALOG_PLACEMENT_CLASSES.center, /items-center/);
  assert.match(DIALOG_PLACEMENT_CLASSES.top, /items-start/);
  assert.match(DIALOG_PLACEMENT_CLASSES.top, /pt-\[10vh\]/);
});

test('buildDialogAriaProps links visible title and subtitle IDs or falls back to aria-label', () => {
  const withHeader = buildDialogAriaProps({
    title: 'Set New Business Goal',
    hasSubtitle: true,
    titleId: 'dlg-title',
    descriptionId: 'dlg-desc',
  });
  assert.equal(withHeader.role, 'dialog');
  assert.equal(withHeader['aria-modal'], true);
  assert.equal(withHeader['aria-labelledby'], 'dlg-title');
  assert.equal(withHeader['aria-describedby'], 'dlg-desc');
  assert.equal(withHeader['aria-label'], undefined);

  const hiddenHeader = buildDialogAriaProps({
    title: 'Command Palette',
    hideHeader: true,
    ariaLabel: 'Global workspace command palette',
    titleId: 'dlg-title',
    descriptionId: 'dlg-desc',
  });
  assert.equal(hiddenHeader['aria-labelledby'], undefined);
  assert.equal(hiddenHeader['aria-label'], 'Global workspace command palette');
});

test('createScrollLockCounter handles nested dialogs without premature unlock', () => {
  const counter = createScrollLockCounter();
  assert.equal(counter.acquire(), true);
  assert.equal(counter.count(), 1);
  assert.equal(counter.acquire(), false);
  assert.equal(counter.count(), 2);
  assert.equal(counter.release(), false);
  assert.equal(counter.count(), 1);
  assert.equal(counter.release(), true);
  assert.equal(counter.count(), 0);
  assert.equal(counter.release(), false);
});
