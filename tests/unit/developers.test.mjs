import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeDevelopers, developerSlug, projectsOf, findDeveloper, developerPath, projectDeveloper } from '../../src/utils/developers.js';
import { projectPriceStats } from '../../src/utils/projectStats.js';

test('developers: only clean fields, a name required, safe links only', () => {
  const [d, ...rest] = normalizeDevelopers([
    { id: 'dev-1', name_ar: ' شركة الأمل ', name_en: 'Al Amal Developments', logo: 'javascript:alert(1)', website: 'https://amal.example', extra: 'x' },
    { id: 'dev-2', name_ar: '' },
    { id: 'dev-1', name_ar: 'مكرر' }
  ]);
  assert.equal(rest.length, 0);
  assert.equal(d.name_ar, 'شركة الأمل');
  assert.equal(d.logo, '');
  assert.equal(d.website, 'https://amal.example');
  assert.equal('extra' in d, false);
  assert.equal(developerSlug(d), 'al-amal-developments');
  assert.equal(developerSlug({ id: 'dev-9', name_en: '' }), 'dev-9');
});

test("a developer's projects: linked ones, and old ones that only carry the name", () => {
  const dev = { id: 'dev-1', name_ar: 'شركة الأمل' };
  const projects = [{ id: 'a', developerId: 'dev-1' }, { id: 'b', developer_ar: 'شركة الأمل' }, { id: 'c', developerId: 'dev-2', developer_ar: 'شركة الأمل' }, { id: 'd', developerId: 'dev-1', isDeleted: true }];
  assert.deepEqual(projectsOf(dev, projects).map((p) => p.id), ['a', 'b']);
});

test('project price per m²: from its listings on sale, else the typed figure', () => {
  const project = { id: 'pj1', avgPricePerMeter: 15000 };
  const props = [
    { id: 1, projectId: 'pj1', price: 2_000_000, size: 100, status: 'published' },
    { id: 2, projectId: 'pj1', price: 2_400_000, size: 120, status: 'published' },
    { id: 3, projectId: 'pj1', price: 9_000_000, size: 100, status: 'hidden' },
    { id: 4, projectId: 'pj2', price: 1_000_000, size: 100, status: 'published' }
  ];
  const s = projectPriceStats(project, props);
  assert.deepEqual([s.avgPricePerMeter, s.source, s.units, s.minPrice, s.maxPrice], [20000, 'units', 2, 2_000_000, 2_400_000]);
  assert.deepEqual([projectPriceStats(project, []).avgPricePerMeter, projectPriceStats(project, []).source], [15000, 'manual']);
  assert.equal(projectPriceStats({ id: 'x' }, []).source, '');
});

test('developers: page links resolve by slug or id, projects find their developer by link or name', () => {
  const devs = [{ id: 'dev-1', name_ar: 'شركة الأمل', name_en: 'Al Amal' }, { id: 'dev-2', name_ar: 'النيل', name_en: '' }];
  assert.equal(developerPath(devs[0]), '/developers/al-amal');
  assert.equal(findDeveloper('al-amal', devs).id, 'dev-1');
  assert.equal(findDeveloper('DEV-2', devs).id, 'dev-2');
  assert.equal(findDeveloper('nope', devs), null);
  assert.equal(projectDeveloper({ developerId: 'dev-2' }, devs).id, 'dev-2');
  assert.equal(projectDeveloper({ developer_ar: 'شركة الأمل' }, devs).id, 'dev-1');
  assert.equal(projectDeveloper({ developer_ar: 'غير معروف' }, devs), null);
});

import { developerNameOf } from '../../src/utils/developers.js';
test('the developer name shows from the project, else from the developer it is linked to', () => {
  const devs = [{ id: 'd1', name_ar: 'شركة الأمل', name_en: 'Amal' }, { id: 'd2', name_ar: 'بدون إنجليزي', name_en: '' }];
  assert.equal(developerNameOf({ developer_ar: 'نسخة', developerId: 'd1' }, devs), 'نسخة');
  assert.equal(developerNameOf({ developerId: 'd1' }, devs), 'شركة الأمل');
  assert.equal(developerNameOf({ developerId: 'd1' }, devs, false), 'Amal');
  assert.equal(developerNameOf({ developerId: 'd2' }, devs, false), 'بدون إنجليزي'); // English falls back to Arabic
  assert.equal(developerNameOf({ developer_ar: '  حر  ' }, [], true), 'حر');
  assert.equal(developerNameOf({}, devs), '');
  assert.equal(developerNameOf({ developerId: 'gone' }, devs), '');
});
