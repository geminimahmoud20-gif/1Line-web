import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encrypt, decrypt } from '../../scripts/backup-format.mjs';

const pass = 'correct horse battery staple';
const sample = { format: 1, collections: { lead_contacts: [{ id: 'L1', data: { phone: '+201012345678' } }] } };

test('backup files round-trip and never contain the data in readable form', () => {
  const file = encrypt(sample, pass);
  assert.ok(!file.includes(Buffer.from('201012345678')));
  assert.deepEqual(decrypt(file, pass), sample);
  assert.notDeepEqual(encrypt(sample, pass), file, 'fresh salt/iv every time');
});

test('a wrong passphrase or a tampered file is refused', () => {
  const file = encrypt(sample, pass);
  assert.throws(() => decrypt(file, 'another passphrase'), /Wrong passphrase/);
  const tampered = Buffer.from(file);
  tampered[tampered.length - 1] ^= 1;
  assert.throws(() => decrypt(tampered, pass), /Wrong passphrase|damaged/);
  assert.throws(() => decrypt(Buffer.from('not a backup'), pass), /Not a 1Line backup/);
});

test('short or missing passphrases are rejected', () => {
  assert.throws(() => encrypt(sample, 'short'), /BACKUP_PASSPHRASE/);
  assert.throws(() => encrypt(sample, undefined), /BACKUP_PASSPHRASE/);
});
