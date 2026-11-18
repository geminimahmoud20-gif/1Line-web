import test from 'node:test';
import assert from 'node:assert/strict';
import { slugify, buildUtmLink, LANDINGS, PLATFORMS } from '../../src/utils/utmLinks.js';

const SITE = 'https://www.1lineestate.com';

test('a campaign name becomes a plain slug the visitor analytics keep', () => {
  assert.equal(slugify('Sohag Buyers 2026'), 'sohag-buyers-2026');
  assert.equal(slugify('  Video_01  / A+B '), 'video-01-ab');
  assert.equal(slugify('حملة سوهاج'), '');
  assert.equal(slugify('x'.repeat(100)).length, 64);
  assert.match(slugify('Sohag Buyers'), /^[A-Za-z0-9_-]{1,64}$/);
});

test('the link carries source, medium, campaign and the ad when there is one', () => {
  assert.equal(
    buildUtmLink({ siteUrl: SITE, path: '/match', platform: 'facebook', campaign: 'Sohag Buyers', content: 'Video 01' }),
    `${SITE}/match?utm_source=facebook&utm_medium=paid_social&utm_campaign=sohag-buyers&utm_content=video-01`
  );
  assert.equal(buildUtmLink({ siteUrl: `${SITE}/`, path: '/', platform: 'tiktok', campaign: 'c1' }), `${SITE}/?utm_source=tiktok&utm_medium=paid_social&utm_campaign=c1`);
  assert.match(buildUtmLink({ siteUrl: SITE, path: '/sell', platform: 'google', campaign: 'owners' }), /utm_medium=cpc/);
});

test('nothing is built while a campaign, a known platform or a known page is missing', () => {
  assert.equal(buildUtmLink({ siteUrl: SITE, path: '/match', platform: 'facebook', campaign: 'حملة' }), '');
  assert.equal(buildUtmLink({ siteUrl: SITE, path: '/match', platform: 'myspace', campaign: 'c' }), '');
  assert.equal(buildUtmLink({ siteUrl: SITE, path: '/crm', platform: 'facebook', campaign: 'c' }), '');
  assert.equal(buildUtmLink({ path: '/match', platform: 'facebook', campaign: 'c' }), '');
  assert.ok(LANDINGS.length >= 5 && PLATFORMS.length === 4);
});

import { CAMPAIGN_TYPES, campaignTypeOf, typedCampaignName, isUnitPath } from '../../src/utils/utmLinks.js';

test('the four kinds of ad: names get a prefix, and a campaign is read back to its kind', () => {
  assert.deepEqual(CAMPAIGN_TYPES.map((t) => t.id), ['buyers', 'owners', 'ai', 'unit']);
  assert.equal(typedCampaignName('owners', 'Nov 2026'), 'owners-nov-2026');
  assert.equal(typedCampaignName('unit', 'Villa 127'), 'unit-villa-127');
  assert.equal(typedCampaignName('ai', ''), 'ai');
  assert.equal(typedCampaignName('', 'free name'), 'free-name');
  assert.equal(campaignTypeOf('buyers-sohag'), 'buyers');
  assert.equal(campaignTypeOf('unit_villa'), 'unit');
  assert.equal(campaignTypeOf('ai'), 'ai');
  assert.equal(campaignTypeOf('aimee-promo'), 'other'); // «ai» only as a whole prefix
  assert.equal(campaignTypeOf(''), 'other');
});

test('an ad for one listing lands on that listing, and only a listing path is accepted', () => {
  assert.ok(isUnitPath('/properties/prop-1792517248233'));
  assert.ok(!isUnitPath('/properties/'));
  assert.ok(!isUnitPath('/properties/a/b'));
  assert.equal(
    buildUtmLink({ siteUrl: SITE, path: '/properties/prop-1', platform: 'facebook', campaign: 'unit-villa-127' }),
    `${SITE}/properties/prop-1?utm_source=facebook&utm_medium=paid_social&utm_campaign=unit-villa-127`
  );
  assert.equal(buildUtmLink({ siteUrl: SITE, path: '/crm/x', platform: 'facebook', campaign: 'c' }), '');
});
