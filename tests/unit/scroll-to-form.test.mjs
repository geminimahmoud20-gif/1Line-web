import test from 'node:test';
import assert from 'node:assert/strict';
import { scrollToForm, FORM_SCROLL_OFFSET } from '../../src/utils/scrollToForm.js';

const withDom = (top, scrollY, run) => {
  const calls = [];
  const prev = { window: globalThis.window, document: globalThis.document };
  globalThis.window = { scrollY, scrollTo: (o) => calls.push(o), requestAnimationFrame: (fn) => fn() };
  globalThis.document = { querySelector: (s) => (s === '.sw' ? { getBoundingClientRect: () => ({ top }) } : null) };
  try { run(); } finally { globalThis.window = prev.window; globalThis.document = prev.document; }
  return calls;
};

test('after a step the form top lands just under the header, not at the top of the page', () => {
  // the form starts 500px below the viewport top and the page is scrolled 100px
  const calls = withDom(500, 100, () => scrollToForm('.sw'));
  assert.equal(calls.length, 1);
  assert.equal(calls[0].top, 500 + 100 - FORM_SCROLL_OFFSET);
  assert.equal(calls[0].behavior, 'smooth');
});

test('never scrolls above the page, and does nothing when the form is not on the page', () => {
  assert.equal(withDom(10, 0, () => scrollToForm('.sw'))[0].top, 0);
  assert.equal(withDom(500, 100, () => scrollToForm('.missing')).length, 0);
});
