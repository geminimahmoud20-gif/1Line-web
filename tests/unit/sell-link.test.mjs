import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sellLinkPath, readSellLink, refFrom, sellLinkMessage } from '../../src/utils/sellLink.js';

test('the shared link carries only what was chosen', () => {
  assert.equal(sellLinkPath(), '/sell');
  assert.equal(sellLinkPath({ type: 'apartment', area: 'new_sohag', ref: 'ahmed.ali@1line.com' }), '/sell?type=apartment&area=new_sohag&ref=ahmed.ali');
  assert.equal(sellLinkPath({ type: '<script>', area: 'a b' }), '/sell');
  assert.equal(refFrom('محمد علي'), 'محمد_علي');
  assert.equal(refFrom('<x>'), '');
});

test('opening the link starts the form with known values only', () => {
  const opts = { typeIds: ['apartment', 'retail'], areaIds: ['new_sohag', 'area_mvmt8dcv'] };
  assert.deepEqual(readSellLink('?type=retail&area=area_mvmt8dcv&ref=ahmed', opts), { propertyType: 'retail', area: 'area_mvmt8dcv', sharedBy: 'ahmed' });
  assert.deepEqual(readSellLink('?type=castle&area=mars&ref=%3Cb%3E', opts), { propertyType: '', area: '', sharedBy: '' });
  assert.deepEqual(readSellLink('', opts), { propertyType: '', area: '', sharedBy: '' });
  assert.ok(sellLinkMessage('https://x/sell').endsWith('https://x/sell'));
});
