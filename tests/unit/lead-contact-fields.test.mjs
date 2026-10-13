import test from 'node:test';
import assert from 'node:assert/strict';
import { CONTACT_FIELDS, withoutContactFields } from '../../src/utils/leadContactFields.js';

test('contact fields match the rules list', () => {
  assert.deepEqual(CONTACT_FIELDS, ['phone', 'whatsapp', 'email', 'altPhone']);
});

test('drops phone, whatsapp, email and altPhone from a form copied into details', () => {
  const brokerForm = {
    name: 'وسيط', phone: '+201000000000', whatsapp: '+201000000000', email: 'a@b.c', altPhone: '0100',
    experience: '1_3', areas: ['new_sohag'], categories: ['residential']
  };
  const out = withoutContactFields(brokerForm);
  assert.deepEqual(out, { name: 'وسيط', experience: '1_3', areas: ['new_sohag'], categories: ['residential'] });
  assert.equal(brokerForm.phone, '+201000000000', 'input is not mutated');
});

test('anything that is not a plain object becomes an empty object', () => {
  for (const v of [undefined, null, 'x', 3, ['phone']]) assert.deepEqual(withoutContactFields(v), {});
});
