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

// ---- Main areas and sub-areas ----
import { mainAreas, childrenOf, mainAreaOf, areaFamily, inArea, shortAreaName, areaPathName, groupedAreas, suggestedArrangement } from '../../src/utils/areaLookup.js';

// The live list (Oct 2026) as saved in settings/areas_cms
const LIVE = [
  { id: 'all', name_ar: 'كل المناطق' },
  { id: 'new_sohag', name_ar: 'سوهاج الجديدة' },
  { id: 'a1', name_ar: 'سوهاج (ش الجمهورية)' },
  { id: 'a2', name_ar: 'سوهاح (ش البحر)' },
  { id: 'a3', name_ar: 'سوهاج (الزهراء)' },
  { id: 'a4', name_ar: 'سوهاج (اسيوط/ سوهاج)' },
  { id: 'a5', name_ar: 'سوهاج شرق (الكورنيش / ش العشرين)' },
  { id: 'a6', name_ar: 'سوهاج شرق ( ش اخميم سوهاج )' }
];

test('nothing arranged yet: every area is a main area, filters behave as before', () => {
  assert.equal(mainAreas(LIVE).length, 7);
  assert.deepEqual(areaFamily('a1', LIVE), ['a1']);
  assert.equal(inArea('a1', 'a1', LIVE), true);
  assert.equal(inArea('a2', 'a1', LIVE), false);
});

test('the suggested arrangement: missing main areas added, West and East filled, typo fixed', () => {
  const { list, added, placed } = suggestedArrangement(LIVE);
  assert.deepEqual(added, ['سوهاج غرب', 'سوهاج شرق', 'أخميم', 'طهطا', 'جرجا', 'المنشاة']);
  assert.equal(placed.length, 6);
  assert.deepEqual(childrenOf('sohag_west', list).map((a) => a.id), ['a1', 'a2', 'a3', 'a4']);
  assert.deepEqual(childrenOf('sohag_east', list).map((a) => a.id), ['a5', 'a6']);
  assert.equal(list.find((a) => a.id === 'a2').name_ar, 'سوهاج (ش البحر)');
  assert.deepEqual(mainAreas(list).map((a) => a.id), ['new_sohag', 'sohag_west', 'sohag_east', 'center_akhmeem', 'center_tahta', 'center_girga', 'center_menshaa']);
  // Running it again changes nothing
  const again = suggestedArrangement(list);
  assert.deepEqual(again.added, []);
  assert.deepEqual(again.placed, []);
});

test('an existing main area keeps its own id; areas placed by hand stay where they are', () => {
  const own = [...LIVE, { id: 'my_east', name_ar: 'سوهاج شرق' }, { id: 'a7', name_ar: 'سوهاج (سيتي)', parentId: 'my_east' }];
  const { list, added } = suggestedArrangement(own);
  assert.ok(!added.includes('سوهاج شرق'));
  assert.deepEqual(childrenOf('my_east', list).map((a) => a.id), ['a5', 'a6', 'a7']);
});

test('a main area covers its sub-areas; a sub-area only itself', () => {
  const { list } = suggestedArrangement(LIVE);
  assert.deepEqual(areaFamily('sohag_east', list), ['sohag_east', 'a5', 'a6']);
  assert.equal(inArea('a5', 'sohag_east', list), true);
  assert.equal(inArea('a5', 'sohag_west', list), false);
  assert.equal(inArea('sohag_east', 'a5', list), false);
  assert.equal(inArea('anything', 'all', list), true);
  assert.equal(mainAreaOf('a5', list).id, 'sohag_east');
  assert.equal(mainAreaOf('new_sohag', list).id, 'new_sohag');
});

test('names: the sub-area without its main area repeated, and the full path', () => {
  const { list } = suggestedArrangement(LIVE);
  assert.equal(shortAreaName(list.find((a) => a.id === 'a1'), list), 'ش الجمهورية');
  assert.equal(shortAreaName(list.find((a) => a.id === 'a6'), list), 'ش اخميم سوهاج');
  assert.equal(areaPathName('a5', list), 'سوهاج شرق · الكورنيش / ش العشرين');
  assert.equal(areaPathName('new_sohag', list), 'سوهاج الجديدة');
  assert.equal(areaPathName('gone', list), '');
  assert.deepEqual(groupedAreas(list).map((g) => [g.main.id, g.children.length]).slice(0, 3), [['new_sohag', 0], ['sohag_west', 4], ['sohag_east', 2]]);
});

test('one level only: a parent that has its own parent is ignored', () => {
  const list = [{ id: 'm', name_ar: 'م' }, { id: 's', name_ar: 'س', parentId: 'm' }, { id: 'x', name_ar: 'ص', parentId: 's' }];
  assert.deepEqual(mainAreas(list).map((a) => a.id), ['m', 'x']);
});

test('a request text inside a main area matches through its sub-areas', () => {
  const { list } = suggestedArrangement(LIVE);
  assert.equal(recordInArea({ area_ar: 'محل على الكورنيش' }, 'sohag_east', list), true);
  assert.equal(recordInArea({ area: 'a1' }, 'sohag_west', list), true);
});
