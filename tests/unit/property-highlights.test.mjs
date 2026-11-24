import test from 'node:test';
import assert from 'node:assert/strict';
import { getQuickHighlights, PRESET_HIGHLIGHTS } from '../../src/utils/propertyHighlights.js';

test('getQuickHighlights: returns manual CRM quickHighlights if provided', () => {
  const property = {
    id: 'prop-1',
    quickHighlights: ['استلام فوري', 'نصف تشطيب', 'دور أرضي بحديقة']
  };
  const highlights = getQuickHighlights(property, true);
  assert.equal(highlights.length, 3);
  assert.equal(highlights[0].label, 'استلام فوري');
  assert.equal(highlights[0].tone, 'delivery');
  assert.equal(highlights[1].label, 'نصف تشطيب');
  assert.equal(highlights[1].tone, 'finishing');
  assert.equal(highlights[2].label, 'دور أرضي بحديقة');
  assert.equal(highlights[2].tone, 'feature');
});

test('getQuickHighlights: handles comma-separated string from CRM', () => {
  const property = {
    id: 'prop-2',
    quickHighlights: 'استلام 2026، سوبر لوكس، واجهة بحرية'
  };
  const highlights = getQuickHighlights(property, true);
  assert.equal(highlights.length, 3);
  assert.equal(highlights[0].label, 'استلام 2026');
  assert.equal(highlights[1].label, 'سوبر لوكس');
  assert.equal(highlights[2].label, 'واجهة بحرية');
});

test('getQuickHighlights: smart automatic fallback for listing with finishing and garden', () => {
  const property = {
    id: 'prop-3',
    title_ar: 'شقة مباشر علي المحور الرئيسي بسوهاج الجديدة (156م + 50 م حديقة)',
    finishing_ar: 'نصف تشطيب / محارة وأرضيات خرسانية',
    delivery_ar: 'استلام فوري',
    floor: 0,
    status: 'published'
  };
  const highlights = getQuickHighlights(property, true);
  assert.ok(highlights.length >= 2);
  assert.equal(highlights[0].label, 'استلام فوري');
  assert.equal(highlights[0].tone, 'delivery');
  assert.equal(highlights[1].label, 'نصف تشطيب');
  assert.equal(highlights[1].tone, 'finishing');
  assert.equal(highlights[2].label, 'دور أرضي بحديقة');
  assert.equal(highlights[2].tone, 'feature');
});

test('getQuickHighlights: caps highlights at 3 to prevent card layout breakage', () => {
  const property = {
    id: 'prop-4',
    quickHighlights: ['1', '2', '3', '4', '5']
  };
  const highlights = getQuickHighlights(property, true);
  assert.equal(highlights.length, 3);
});
