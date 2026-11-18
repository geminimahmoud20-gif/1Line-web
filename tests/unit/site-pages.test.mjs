import test from 'node:test';
import assert from 'node:assert/strict';
import { sitePageLabel } from '../../src/utils/sitePages.js';

test('site paths read as page names', () => {
  assert.equal(sitePageLabel('/'), 'الصفحة الرئيسية');
  assert.equal(sitePageLabel(''), 'الصفحة الرئيسية');
  assert.equal(sitePageLabel('/properties/?type=land'), 'صفحة العقارات');
  assert.equal(sitePageLabel('/properties/abc12'), 'صفحة وحدة');
  assert.equal(sitePageLabel('/new-page'), '/new-page');
});
