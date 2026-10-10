import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeBatch, buildWrites, priceBand, cairoParts, isBot, intentOf } from '../../api/_track-core.js';

const NOW = Date.UTC(2026, 9, 10, 12, 0, 0);
const ROOT = 'projects/p/databases/(default)/documents';
const consented = (events, extra = {}) => ({
  consent: true, vid: 'v_abcdefgh1234', sid: 's_abcdefgh1234', ctx: { device: 'mobile', source: 'facebook', campaign: 'oct_launch' }, events, ...extra
});
const docOf = (writes, suffix) => writes.find((w) => w.update.name.endsWith(suffix));
const incOf = (write, path) => {
  const t = write.updateTransforms.find((x) => x.fieldPath === path);
  return t ? Number(t.increment.integerValue) : 0;
};

test('drops unknown events and every field outside the schema (no free text / PII)', () => {
  const b = sanitizeBatch(consented([
    { t: 'lead_identified', m: { name: 'Ahmed', phone: '01000000000' } },
    { t: 'property_view', ts: NOW, m: { propertyId: 'prop-1', area: 'east', type: 'apartment', price: 2500000, phone: '010', title: 'x' } },
  ]), NOW);
  assert.equal(b.events.length, 1);
  assert.deepEqual(b.events[0].m, { propertyId: 'prop-1', area: 'east', type: 'apartment', price: 2500000 });
});

test('without consent there is no visitor or session id', () => {
  const b = sanitizeBatch({ consent: false, vid: 'v_abcdefgh1234', sid: 's_abcdefgh1234', events: [{ t: 'page_view', m: { path: '/properties' } }] }, NOW);
  assert.equal(b.consent, false);
  assert.equal(b.vid, null);
  const writes = buildWrites(b, { docRoot: ROOT, now: NOW });
  assert.equal(writes.length, 1, 'only the anonymous daily counter');
  assert.match(writes[0].update.name, /analytics_daily\/2026-10-10_0$/);
  assert.equal(incOf(writes[0], 'pageViews'), 1);
  assert.equal(incOf(writes[0], 'anonymousBatches'), 1);
});

test('rejects malformed ids, bad paths and oversized values', () => {
  const b = sanitizeBatch(consented([
    { t: 'page_view', m: { path: 'https://evil.example/x' } },
    { t: 'property_engaged', m: { propertyId: '../../x', seconds: 99999, scroll: 250 } },
  ], { vid: 'v_<script>' }), NOW);
  assert.equal(b.consent, false);
  assert.deepEqual(b.events[0].m, {});
  assert.deepEqual(b.events[1].m, { seconds: 3600, scroll: 100 });
});

test('a consented batch builds daily, property, visitor, session and raw-batch writes', () => {
  const b = sanitizeBatch(consented([
    { t: 'session_start', m: { returning: true } },
    { t: 'property_view', m: { propertyId: 'prop-1', area: 'tahta', type: 'villa', price: 4200000 } },
    { t: 'property_engaged', m: { propertyId: 'prop-1', area: 'tahta', type: 'villa', price: 4200000, seconds: 95, scroll: 80 } },
    { t: 'calculator_used', m: { price: 4200000, downPct: 20, years: 5 } },
    { t: 'contact_click', m: { channel: 'whatsapp', propertyId: 'prop-1' } },
    { t: 'lead_submitted', m: { form: 'property', leadId: 'lead-17' } },
  ], { dayFirst: true, newVisitor: true }), NOW);
  const writes = buildWrites(b, { docRoot: ROOT, now: NOW, shard: 3, batchId: 'b1' });
  const daily = docOf(writes, 'analytics_daily/2026-10-10_3');
  assert.equal(incOf(daily, 'sessions'), 1);
  assert.equal(incOf(daily, 'visitors'), 1);
  assert.equal(incOf(daily, 'viewAreas.tahta'), 1);
  assert.equal(incOf(daily, 'viewBands.m3_5'), 1);
  assert.equal(incOf(daily, 'contacts.whatsapp'), 1);
  assert.equal(incOf(daily, 'leads'), 1);
  assert.equal(incOf(daily, 'sources.facebook'), 1);
  assert.equal(incOf(daily, 'campaigns.oct_launch'), 1);
  assert.equal(incOf(daily, 'engagedSeconds'), 95);

  const prop = docOf(writes, 'analytics_properties/prop-1');
  assert.equal(incOf(prop, 'views'), 1);
  assert.equal(incOf(prop, 'contacts'), 1);
  assert.equal(incOf(prop, 'days.`2026-10-10`'), 1);

  const visitor = docOf(writes, 'analytics_visitors/v_abcdefgh1234');
  // returning 2 + view 1 + engaged 1+3 + calculator 4 + contact 8 + lead 15
  assert.equal(incOf(visitor, 'intent'), 34);
  assert.equal(incOf(visitor, 'areas.tahta'), 3);
  assert.equal(incOf(visitor, 'propSecs.`prop-1`'), 95);
  assert.equal(visitor.update.fields.leadId.stringValue, 'lead-17');

  assert.ok(docOf(writes, 'analytics_sessions/s_abcdefgh1234').update.fields.expireAt.timestampValue);
  const raw = docOf(writes, 'analytics_visitors/v_abcdefgh1234/batches/b1');
  assert.equal(raw.update.fields.events.arrayValue.values.length, 6);
});

test('helpers', () => {
  assert.equal(priceBand(950000), 'lt1m');
  assert.equal(priceBand(3500000), 'm3_5');
  assert.equal(priceBand(0), undefined);
  // 23:30 UTC on 9 Oct is 02:30 on 10 Oct in Cairo (UTC+3 in summer time)
  assert.deepEqual(cairoParts(Date.UTC(2026, 9, 9, 23, 30)), { day: '2026-10-10', hour: '02' });
  assert.ok(isBot('Mozilla/5.0 (compatible; Googlebot/2.1)'));
  assert.ok(!isBot('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'));
  assert.equal(intentOf({ t: 'property_engaged', m: { seconds: 200 } }), 5);
});

test('search text never keeps phone numbers or e-mails', () => {
  const b = sanitizeBatch(consented([{ t: 'search', m: { query: 'شقة 3 غرف 01012345678 a@b.com ٠١٠١٢٣٤٥٦٧٨', area: 'east' } }]), NOW);
  assert.equal(b.events[0].m.query, 'شقة 3 غرف');
});
