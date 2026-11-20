import test from 'node:test';
import assert from 'node:assert/strict';
import { tableRows, row, collectReport } from '../../src/utils/reportExport.js';

test('a table becomes one row per line with labelled details', () => {
  const rows = tableRows('الفريق', ['البياع', 'عملاء', 'في الميعاد', ''], [['أحمد', '24', '32%', ''], []]);
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0], { القسم: 'الفريق', البند: 'أحمد', القيمة: '24', تفاصيل: 'عملاء: 24 | في الميعاد: 32%' });
});

test('rows trim and collapse spaces; nothing to read gives nothing', () => {
  assert.deepEqual(row('  أ ', 'ب\n  ج', 5), { القسم: 'أ', البند: 'ب ج', القيمة: '5', تفاصيل: '' });
  assert.deepEqual(collectReport(null), []);
});
