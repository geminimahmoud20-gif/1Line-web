import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { deletePrompt, archivePrompt, namesLine } from '../../src/utils/deleteConfirm.js';

test('the delete question names the client, says it is final, and offers archive instead', () => {
  const one = deletePrompt({ names: ['منى سعيد'] });
  assert.match(one.title, /نهائيًا/);
  assert.match(one.message, /منى سعيد/);
  assert.match(one.message, /الأرشفة/);
  assert.equal(one.tone, 'danger');
  const many = deletePrompt({ names: ['أ', 'ب', 'ج', 'د', 'هـ'] });
  assert.match(many.title, /5 عميل/);
  assert.match(many.message, /و2 تانيين/);
  assert.equal(namesLine([''], true), 'عميل بدون اسم');
});

test('the archive question says nothing is deleted', () => {
  const p = archivePrompt({ name: 'كريم' });
  assert.match(p.message, /كريم/);
  assert.match(p.message, /مفيش حاجة بتتمسح/);
});

// Every place that can delete a client must ask first: a screen that calls onDeleteLead / handleDeleteLead has to
// contain a confirm() call or its own delete-confirmation modal. A new delete button cannot skip the question.
const walk = (dir) => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? walk(p) : (/\.(jsx|js)$/.test(f) ? [p] : []);
});
test('every screen that deletes a client asks for confirmation first', () => {
  const offenders = [];
  for (const file of walk('src')) {
    const src = readFileSync(file, 'utf8');
    if (!/\b(onDeleteLead|handleDeleteLead)\(/.test(src)) continue;
    if (/context\/PropertiesContext/.test(file)) continue; // defines it
    if (!/\bconfirm\(|leadToDelete/.test(src)) offenders.push(file);
  }
  assert.deepEqual(offenders, [], `delete without a confirmation: ${offenders.join(', ')}`);
});
