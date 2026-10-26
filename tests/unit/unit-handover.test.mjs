import test from 'node:test';
import assert from 'node:assert/strict';
import { FINISHING_LEVELS, finishingIdOf, finishingPatch, finishingGroupOf, handoverPatch, handoverFromSeller } from '../../src/utils/unitHandover.js';

test('picking a level writes the id and both labels the site already reads', () => {
  assert.deepEqual(finishingPatch('core'), { finishing: 'core', finishing_ar: 'على الطوب', finishing_en: 'Core & shell' });
  assert.deepEqual(finishingPatch(''), { finishing: '', finishing_ar: '', finishing_en: '' });
  assert.deepEqual(finishingPatch('nope'), { finishing: '', finishing_ar: '', finishing_en: '' });
});

test('older free-text finishing is read as a level', () => {
  assert.equal(finishingIdOf({ finishing_ar: 'طوب أحمر' }), 'core');
  assert.equal(finishingIdOf({ finishing_ar: 'نصف تشطيب' }), 'semi');
  assert.equal(finishingIdOf({ finishing_ar: 'محارة وحلوق' }), 'semi');
  assert.equal(finishingIdOf({ finishing_ar: 'تشطيب كامل' }), 'full');
  assert.equal(finishingIdOf({ finishing_ar: 'سوبر لوكس' }), 'super_lux');
  assert.equal(finishingIdOf({ finishing_ar: 'ألترا سوبر لوكس' }), 'ultra_lux');
  assert.equal(finishingIdOf({ finishing_ar: 'لوكس' }), 'lux');
  assert.equal(finishingIdOf({ finishing_en: 'Core & Shell' }), 'core');
  assert.equal(finishingIdOf({ finishing_ar: 'حاجة تانية' }), '');
  assert.equal(finishingIdOf({}), '');
  assert.equal(finishingIdOf({ finishing: 'semi', finishing_ar: 'سوبر لوكس' }), 'semi');
});

test('every level label reads back as its own level', () => {
  for (const level of FINISHING_LEVELS) {
    for (const text of [level.ar, level.short_ar]) assert.equal(finishingIdOf({ finishing_ar: text }), level.id, text);
    for (const text of [level.en, level.short_en]) assert.equal(finishingIdOf({ finishing_en: text }), level.id, text);
  }
});

test('filter groups: unfinished vs finished', () => {
  assert.equal(finishingGroupOf({ finishing: 'core' }), 'core');
  assert.equal(finishingGroupOf({ finishing_ar: 'نص تشطيب (محارة وحلوق)' }), 'core');
  assert.equal(finishingGroupOf({ finishing: 'full' }), 'finished');
  assert.equal(finishingGroupOf({ finishing_ar: 'سوبر لوكس' }), 'finished');
  assert.equal(finishingGroupOf({}), '');
});

test('handover: a year only while under construction', () => {
  assert.deepEqual(handoverPatch('ready', 2028), { completionStatus: 'ready', deliveryYear: '' });
  assert.deepEqual(handoverPatch('under_construction', '2028'), { completionStatus: 'under_construction', deliveryYear: 2028 });
  assert.deepEqual(handoverPatch('under_construction', 'x'), { completionStatus: 'under_construction', deliveryYear: '' });
  assert.deepEqual(handoverPatch(''), { completionStatus: '', deliveryYear: '' });
});

test('seller picks carry over to the draft listing', () => {
  assert.equal(handoverFromSeller('semi').finishing_ar, 'نص تشطيب');
  assert.deepEqual(handoverFromSeller('under_construction'), { finishing: '', finishing_ar: '', finishing_en: '', completionStatus: 'under_construction', deliveryYear: '' });
  assert.deepEqual(handoverFromSeller('', 'كلام المالك'), { finishing: '', finishing_ar: 'كلام المالك', finishing_en: '' });
});
