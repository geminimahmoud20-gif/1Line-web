import test from 'node:test';
import assert from 'node:assert/strict';
import { foldAr, placeAreas, findArea, isKnownArea, areaNameOf, formArea, areaWords, areaFromText, recordInArea } from '../../src/utils/areaLookup.js';

// The live list as saved in settings/areas_cms (Oct 2026), typo included
const AREAS = [
  { id: 'all', name_ar: 'كل المناطق' },
  { id: 'new_sohag', name_ar: 'سوهاج الجديدة', name_en: 'New Sohag' },
  { id: 'area_gomhoreya', name_ar: 'سوهاج (ش الجمهورية)' },
  { id: 'area_bahr', name_ar: 'سوهاح (ش البحر)' },
  { id: 'area_shoban', name_ar: 'سوهاج (الشبان / الهلال)' },
  { id: 'area_corniche', name_ar: 'سوهاج شرق (الكورنيش / ش العشرين)' }
];

test('an id no longer in the list is unknown, never replaced by another area', () => {
  assert.equal(findArea('east', AREAS), null);
  assert.equal(areaNameOf('east', AREAS), '');
  assert.equal(areaNameOf('', AREAS), '');
  assert.equal(areaNameOf('new_sohag', AREAS), 'سوهاج الجديدة');
  assert.equal(areaNameOf('new_sohag', AREAS, false), 'New Sohag');
});

test('"كل المناطق" is a choice, not a place', () => {
  assert.deepEqual(placeAreas(AREAS).map((a) => a.id).includes('all'), false);
  assert.equal(isKnownArea('all', AREAS), false);
  assert.equal(formArea('all', AREAS), '');
  assert.equal(formArea('all', AREAS, { allowAll: true }), 'all');
});

test('a form never starts on an area nobody picked', () => {
  assert.equal(formArea('east', AREAS), '');
  assert.equal(formArea(undefined, AREAS), '');
  assert.equal(formArea('area_bahr', AREAS), 'area_bahr');
});

test('spelling variants fold together', () => {
  assert.equal(foldAr('الجديدة'), foldAr('الجديده'));
  assert.equal(foldAr('أخميم'), foldAr('اخميم'));
});

test('area words: the full name and each bracketed part, never the bare city', () => {
  const w = areaWords(AREAS[4]);
  assert.ok(w.includes('الشبان'));
  assert.ok(w.includes('الهلال'));
  assert.ok(!w.includes('سوهاج'));
  assert.ok(areaWords(AREAS[2]).includes('الجمهوريه'));
});

test('free text → the live area it names, or nothing', () => {
  assert.equal(areaFromText('مطلوب محل في شارع الجمهورية', AREAS), 'area_gomhoreya');
  assert.equal(areaFromText('شقة بسوهاج الجديده الحي الأول', AREAS), 'new_sohag');
  assert.equal(areaFromText('قريب من الكورنيش', AREAS), 'area_corniche');
  assert.equal(areaFromText('سوهاج', AREAS), '');
  assert.equal(areaFromText('حي الكوثر', AREAS), '');
});

test('a record belongs to an area by id or by its area text', () => {
  assert.equal(recordInArea({ area: 'area_shoban' }, 'area_shoban', AREAS), true);
  assert.equal(recordInArea({ area: 'east', area_ar: 'سوهاج (الشبان / الهلال)' }, 'area_shoban', AREAS), true);
  assert.equal(recordInArea({ area: 'east', area_ar: 'شرق سوهاج' }, 'area_shoban', AREAS), false);
  assert.equal(recordInArea({ area: 'east' }, 'all', AREAS), true);
  assert.equal(recordInArea({ area: 'east' }, 'gone', AREAS), false);
});
