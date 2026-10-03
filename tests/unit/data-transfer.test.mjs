import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDelimited, toTable, detectDelimiter, tableFromJson } from '../../src/utils/transfer/parseTable.js';
import { normKey, parseNumber, parseCount, parseDate, normalizePhone, stripLinks } from '../../src/utils/transfer/normalize.js';
import { autoMapColumns, rowToProperty, fillAreasFromSiblings, propertyToRow, mapPropertyType, mapStatus, IGNORE, PROPERTY_FIELDS } from '../../src/utils/transfer/propertySchema.js';
import { rowToLead, leadToRow, LEAD_FIELDS } from '../../src/utils/transfer/leadSchema.js';
import { rowsToCsv } from '../../src/utils/transfer/exportTable.js';

// Same layout as a Notion inventory export (synthetic values, no real contacts)
const NOTION = '﻿كود الوحده,Assignee,Price ($),Status,الأولوية,"التشطيب ","الجهات المالكة ",الحاله,الحي,الرقم,المساحة (m²),المنطقة,الوحده,تاريخ الإضافه,رقم الدور,طريقه الدفع,عدد الحمامات,عدد الغرف,مهام العرض,"مواصفات ",نوع العقار\r\n'
  + '901,someone,"1,350,000",Active,high priority,كاملة التشطيب,28 (https://app.notion.com/p/28-abc?pvs=21),مازال معروضا,سوهاج الجديده,1001234567,100,كمبوند النخيل,النخيل 3,"June 5, 2024",4,كاش,1,3,تسويق,"شقة 100 م\nواجهة بحرية",سكني شقه\r\n'
  + '902,,"30,000",Offer Market,Low periority,علي الطوب,,غير نشط,سوهاج الشرق,,200,العزبه,محل ايجار ش العزبه,"June 11, 2024",الارضي,كاش,,,,,تجاري محل\r\n'
  + '903,,0,,Medium priority,نصف تشطيب,,تم البيع,,201112223334,150,كمبوند النخيل,النخيل 5,,2,تقسيط,2,3,,,سكني شقه\r\n';

test('CSV: quoted fields with commas, quotes and line breaks; BOM; delimiter detection', () => {
  const rows = parseDelimited('a,b\r\n"x, y","he said ""hi""\nnext"\r\n');
  assert.deepEqual(rows, [['a', 'b'], ['x, y', 'he said "hi"\nnext']]);
  assert.equal(detectDelimiter('a;b;c\n1;2;3'), ';');
  assert.equal(detectDelimiter('a\tb\n1\t2'), '\t');
  const t = toTable(parseDelimited(NOTION));
  assert.equal(t.headers[0], 'كود الوحده');
  assert.equal(t.rows.length, 3);
  assert.equal(t.rows[0][19], 'شقة 100 م\nواجهة بحرية');
});

test('values: Arabic letters, numbers, dates, phones, Notion links', () => {
  assert.equal(normKey('الإضافة  (m²) '), 'الاضافه m²');
  assert.equal(parseNumber('8,900,000'), 8900000);
  assert.equal(parseNumber('1.350.000 ج.م'), 1350000);
  assert.equal(parseNumber('٢٫٥ مليون'), 2500000);
  assert.equal(parseNumber('12.5'), 12.5);
  assert.equal(parseNumber('بدون'), null);
  assert.equal(parseCount('الارضي'), 0);
  assert.equal(parseDate('May 22, 2024'), '2024-05-22');
  assert.equal(parseDate('22/05/2024'), '2024-05-22');
  assert.equal(parseDate('22 مايو 2024'), '2024-05-22');
  assert.equal(parseDate('31/02/2024'), null);
  assert.equal(normalizePhone('1000000003'), '01000000003');
  assert.equal(normalizePhone('201200000004'), '01200000004');
  assert.equal(normalizePhone('+966 50 123 4567'), '+966501234567');
  assert.equal(normalizePhone('123'), '');
  assert.equal(stripLinks('28 (https://app.notion.com/p/28-abc?pvs=21)'), '28');
});

test('columns are matched to fields; internal tracker columns are skipped', () => {
  const t = toTable(parseDelimited(NOTION));
  const m = autoMapColumns(t.headers);
  assert.equal(m['كود الوحده'], 'unitCode');
  assert.equal(m['Price ($)'], 'price');
  assert.equal(m['الحاله'], 'status');
  assert.equal(m['Status'], IGNORE); // the Arabic status column wins, each field used once
  assert.equal(m['الحي'], 'areaKey');
  assert.equal(m['المنطقة'], 'locationDetail');
  assert.equal(m['الوحده'], 'title_ar');
  assert.equal(m['الرقم'], 'ownerPhone');
  for (const internal of ['Assignee', 'الأولوية', 'مهام العرض']) assert.equal(m[internal], IGNORE);
});

test('rows become clean properties; owner phones stay off the listing', () => {
  const t = toTable(parseDelimited(NOTION));
  const m = autoMapColumns(t.headers);
  const now = new Date('2026-10-03T00:00:00Z');
  const results = t.rows.map((r) => rowToProperty(Object.fromEntries(t.headers.map((h, i) => [m[h], r[i]]).filter(([k]) => k !== IGNORE)), { now }));
  fillAreasFromSiblings(results);
  const [a, b, c] = results;
  assert.equal(a.property.type, 'apartment');
  assert.equal(a.property.price, 1350000);
  assert.equal(a.property.areaKey, 'new_sohag');
  assert.equal(a.property.title_ar, 'شقة النخيل 3'); // short unit name gets its type in front
  assert.equal(a.property.finishing_ar, 'تشطيب كامل');
  assert.equal(a.property.bedrooms, 3);
  assert.equal(a.property.createdAt.slice(0, 10), '2024-06-05');
  assert.equal(a.property.status, 'hidden'); // review mode by default
  assert.deepEqual(a.owner, { name: '', phone: '01001234567' }); // "28" is a Notion ID, not a name
  for (const leak of ['ownerPhone', 'ownerName', 'phone']) assert.ok(!(leak in a.property));
  assert.ok(!JSON.stringify(a.property).includes('01001234567'));
  assert.equal(b.property.type, 'commercial');
  assert.equal(b.property.purpose, 'rent');
  assert.equal(b.property.floor, 0);
  assert.equal(b.property.bedrooms, 0);
  assert.equal(c.property.status, 'sold');
  assert.equal(c.property.areaKey, 'new_sohag'); // same compound as row 1
  assert.ok(c.warnings.includes('بدون سعر'));
  assert.equal(c.owner.phone, '01112223334');
  // The file's own status when asked
  const fileMode = rowToProperty({ title_ar: 'شقة', status: 'مازال معروضا', price: '1', size: '1' }, { statusMode: 'file' });
  assert.equal(fileMode.property.status, 'published');
});

test('type and status words from other systems', () => {
  assert.equal(mapPropertyType('سكني ارض'), 'land');
  assert.equal(mapPropertyType('ارض زراعي'), 'land');
  assert.equal(mapPropertyType('سكني منزل'), 'villa');
  assert.equal(mapPropertyType('طبي'), 'office');
  assert.equal(mapPropertyType('تجاري مول'), 'commercial');
  assert.equal(mapPropertyType('Duplex'), 'apartment');
  assert.equal(mapStatus('غير نشط'), 'hidden');
  assert.equal(mapStatus('قيد المراجعه'), 'hidden');
  assert.equal(mapStatus('تم البيع'), 'sold');
  assert.equal(mapStatus('Active'), 'published');
});

test('an exported file imports back with every column matched', () => {
  const exported = [propertyToRow({ id: 'p1', unitCode: 'A-1', title_ar: 'شقة', type: 'villa', price: 2500000, size: 150, status: 'sold', areaKey: 'east' })];
  const headers = Object.keys(exported[0]);
  const m = autoMapColumns(headers);
  const exportedFields = PROPERTY_FIELDS.filter((f) => !f.private).map((f) => f.key);
  assert.deepEqual(headers.map((h) => m[h]), exportedFields);
  const back = rowToProperty(Object.fromEntries(headers.map((h) => [m[h], exported[0][h]])));
  assert.equal(back.property.type, 'villa');
  assert.equal(back.property.price, 2500000);
  assert.equal(back.property.status, 'sold');
  assert.equal(back.property.areaKey, 'east');

  const leadRow = leadToRow({ name: 'أحمد', phone: '01001234567', type: 'investor', status: 'site_visit', budget: 3000000 });
  const lm = autoMapColumns(Object.keys(leadRow), LEAD_FIELDS, { exclude: [] });
  assert.deepEqual(Object.keys(leadRow).map((h) => lm[h]), LEAD_FIELDS.map((f) => f.key));
  const lead = rowToLead(Object.fromEntries(Object.keys(leadRow).map((h) => [lm[h], leadRow[h]]))).lead;
  assert.equal(lead.type, 'investor');
  assert.equal(lead.status, 'site_visit');
  assert.equal(lead.budget, 3000000);
});

test('clients: phone required, Egyptian numbers normalised', () => {
  assert.equal(rowToLead({ name: 'بدون رقم' }).skip, 'بدون رقم هاتف أو بريد');
  const { lead } = rowToLead({ name: 'منى', phone: '١٠٠١٢٣٤٥٦٧', type: 'مالك', status: 'متابعة' });
  assert.equal(lead.phone, '01001234567');
  assert.equal(lead.type, 'seller');
  assert.equal(lead.status, 'contacted');
});

test('JSON backups and CSV export', () => {
  const t = tableFromJson(JSON.stringify({ platform: '1Line', properties: [{ id: 'a', title_ar: 'x' }, { id: 'b', price: 5 }] }));
  assert.deepEqual(t.headers, ['id', 'title_ar', 'price']);
  assert.equal(t.objects.length, 2);
  const csv = rowsToCsv([{ 'الاسم': '=HYPERLINK("x")', 'السعر': 5 }]);
  assert.ok(csv.startsWith('﻿"الاسم","السعر"'));
  assert.ok(csv.includes(`"'=HYPERLINK(""x"")"`)); // formulas stay text
});

import { planPropertyImport, planLeadImport, planNativeLeads } from '../../src/utils/transfer/importPlan.js';

test('import plan: new vs update by unit code, only provided fields overwrite, owners grouped', () => {
  const t = toTable(parseDelimited(NOTION));
  const mapping = autoMapColumns(t.headers);
  const existing = [{ id: 'prop-7', unitCode: '902', title_ar: 'قديم', images: ['x.jpg'], featured: true, status: 'published', price: 1, description_ar: 'وصف محفوظ' }];
  const plan = planPropertyImport({ ...t, mapping, existing, existingLeads: [{ phone: '01112223334' }], now: new Date('2026-10-03T00:00:00Z') });
  assert.deepEqual(plan.counts, { new: 2, update: 1, skip: 0, warnings: 1, owners: 1 });
  const upd = plan.items[1];
  assert.equal(upd.action, 'update');
  assert.equal(upd.property.id, 'prop-7');
  assert.equal(upd.property.price, 30000);
  assert.ok(!('images' in upd.property) && !('featured' in upd.property) && !('description_ar' in upd.property));
  assert.ok(!('status' in upd.property)); // review mode never unpublishes an existing listing
  assert.equal(plan.owners[0].phone, '01001234567'); // 01112223334 is already a client
  assert.equal(plan.owners[0].type, 'seller');
  assert.ok(plan.owners[0].notes.includes('كود 901'));
  assert.equal(planPropertyImport({ ...t, mapping, existing, duplicates: 'skip' }).counts.skip, 1);
});

test('import plan: clients skip missing / known / repeated phones', () => {
  const headers = ['الاسم', 'الموبايل', 'ملاحظات'];
  const rows = [['أحمد', '01001234567', 'شقة'], ['بدون', '', ''], ['أحمد 2', '1001234567', ''], ['منى', '01111111111', '']];
  const mapping = autoMapColumns(headers, LEAD_FIELDS, { exclude: [] });
  const plan = planLeadImport({ headers, rows, mapping, existingLeads: [{ phone: '01111111111' }] });
  assert.deepEqual(plan.items.map((x) => x.action), ['new', 'skip', 'skip', 'skip']);
  assert.match(plan.items[2].reason, /مكرر/);
  assert.match(plan.items[3].reason, /مسجل/);
  const native = planNativeLeads([{ id: 'x', _cloud: true, name: 'سارة', phone: '01222222222' }]);
  assert.ok(!('id' in native.items[0].lead) && !('_cloud' in native.items[0].lead));
});

test('import plan: a code used twice pairs row by row; a listing without a code is found by id', () => {
  const headers = ['كود الوحده', 'السعر', 'الوحده'];
  const rows = [['664', '100000', 'أ'], ['664', '200000', 'ب'], ['prop-x', '300000', 'ج']];
  const existing = [{ id: 'a1', unitCode: '664', title_ar: 'أ' }, { id: 'a2', unitCode: '664', title_ar: 'ب' }, { id: 'prop-x', title_ar: 'ج' }];
  const plan = planPropertyImport({ headers, rows, mapping: autoMapColumns(headers), existing });
  assert.deepEqual(plan.items.map((x) => [x.action, x.property.id, x.property.price]), [['update', 'a1', 100000], ['update', 'a2', 200000], ['update', 'prop-x', 300000]]);
  assert.ok(!('unitCode' in plan.items[2].property));
});

test('areas from the CRM list (id + Arabic name) are recognised', async () => {
  const { mapAreaKey } = await import('../../src/utils/transfer/propertySchema.js');
  const areas = [{ id: 'all', name_ar: 'كل المناطق' }, { id: 'saqulta', name_ar: 'ساقلتة', name_en: 'Saqulta' }];
  assert.equal(mapAreaKey('ساقلته', areas), 'saqulta');
  assert.equal(mapAreaKey('كل المناطق', areas), null);
  assert.equal(mapAreaKey('سوهاج الغرب', areas), 'west');
});

test('a plain "النوع" column is the client type', () => {
  const m = autoMapColumns(['الاسم', 'الموبايل', 'النوع'], LEAD_FIELDS, { exclude: [] });
  assert.equal(m['النوع'], 'type');
  assert.equal(rowToLead({ name: 'س', phone: '01000000002', type: 'مستثمر' }).lead.type, 'investor');
});

test('export writes the area by name and it imports back to the same area', async () => {
  const { mapAreaKey } = await import('../../src/utils/transfer/propertySchema.js');
  const areas = [{ id: 'west', name_ar: 'غرب سوهاج' }];
  const row = propertyToRow({ id: 'p', title_ar: 'شقة', areaKey: 'west', price: 1 }, areas);
  assert.equal(row['المنطقة (الحي)'], 'غرب سوهاج');
  assert.equal(mapAreaKey(row['المنطقة (الحي)'], areas), 'west');
});
