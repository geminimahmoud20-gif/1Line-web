import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSiteSettings, safeHttpsUrl, DEFAULT_SITE_SETTINGS } from '../../src/utils/siteSettings.js';

test('no document → today\'s contact details, nothing else shown', () => {
  const s = normalizeSiteSettings(null);
  assert.deepEqual(s.contact, { ...DEFAULT_SITE_SETTINGS.contact });
  assert.deepEqual(s.social, {});
  assert.deepEqual(s.faq, []);
  assert.deepEqual(s.testimonials, []);
  assert.deepEqual(s.seo, {});
});

test('links must be https and, for a network, on that network', () => {
  assert.equal(safeHttpsUrl('javascript:alert(1)'), '');
  assert.equal(safeHttpsUrl('http://facebook.com/1line'), '');
  assert.equal(safeHttpsUrl('https://facebook.com/1line', ['facebook.com']), 'https://facebook.com/1line');
  assert.equal(safeHttpsUrl('https://www.facebook.com/1line', ['facebook.com']), 'https://www.facebook.com/1line');
  assert.equal(safeHttpsUrl('https://evil.com/facebook.com', ['facebook.com']), '');
  assert.equal(safeHttpsUrl('https://facebook.com.evil.com/x', ['facebook.com']), '');
  const s = normalizeSiteSettings({ social: { facebook: 'https://facebook.com/1line', instagram: 'javascript:x', unknown: 'https://a.com' } });
  assert.deepEqual(s.social, { facebook: 'https://facebook.com/1line' });
});

test('bad contact values fall back to the defaults', () => {
  const s = normalizeSiteSettings({ contact: { email: 'not-an-email', mapsUrl: 'javascript:x', hours_ar: '   ' } });
  assert.deepEqual(s.contact, { ...DEFAULT_SITE_SETTINGS.contact });
  const ok = normalizeSiteSettings({ contact: { email: 'info@1line.eg', hours_ar: 'يومياً 9–9' } });
  assert.equal(ok.contact.email, 'info@1line.eg');
  assert.equal(ok.contact.hours_ar, 'يومياً 9–9');
});

test('FAQ keeps answered questions only, with a known category', () => {
  const s = normalizeSiteSettings({ faq: [
    { q_ar: 'سؤال', a_ar: 'إجابة', category: 'legal' },
    { q_ar: 'من غير إجابة' },
    { q_en: 'Q', a_en: 'A', category: 'hack' },
    'junk'
  ] });
  assert.equal(s.faq.length, 2);
  assert.equal(s.faq[0].category, 'legal');
  assert.equal(s.faq[1].category, 'services');
});

test('testimonials need a name and a text; lists and texts are capped', () => {
  const s = normalizeSiteSettings({ testimonials: [{ name: 'أحمد', text_ar: 'ممتاز' }, { name: '', text_ar: 'x' }, { name: 'Ali' }] });
  assert.equal(s.testimonials.length, 1);
  const many = normalizeSiteSettings({ faq: Array.from({ length: 50 }, () => ({ q_ar: 'س', a_ar: 'ج'.repeat(5000) })) });
  assert.equal(many.faq.length, 30);
  assert.ok(many.faq[0].a_ar.length <= 1500);
});

test('SEO overrides only for known pages, trimmed to Google lengths', () => {
  const s = normalizeSiteSettings({ seo: {
    '/': { title_ar: 'ع'.repeat(200), description_ar: 'وصف' },
    '/admin': { title_ar: 'x' },
    '/projects': { title_ar: '' }
  } });
  assert.deepEqual(Object.keys(s.seo), ['/']);
  assert.equal(s.seo['/'].title_ar.length, 70);
});
