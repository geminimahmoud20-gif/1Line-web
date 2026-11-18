// =============================================================
//  Shared by scripts/backup-firestore.mjs and scripts/restore-firestore.mjs.
//
//  A backup file is: "1LBK1" | salt(16) | iv(12) | auth tag(16) | AES-256-GCM(gzip(JSON)).
//  The key comes from the passphrase with scrypt, so the file is useless without it — this repo is
//  public and anyone signed in to GitHub can download its Actions artifacts.
//
//  Firestore values that JSON can't hold keep their type through a tag:
//    Timestamp → {"$ts": "<ISO>"}   GeoPoint → {"$geo": [lat, lng]}
//    DocumentReference → {"$ref": "<path>"}   Bytes → {"$bytes": "<base64>"}
// =============================================================

import crypto from 'node:crypto';
import zlib from 'node:zlib';

const MAGIC = Buffer.from('1LBK1');
const SCRYPT = { N: 1 << 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

const deriveKey = (passphrase, salt) => crypto.scryptSync(passphrase, salt, 32, SCRYPT);

export function checkPassphrase(passphrase) {
  if (typeof passphrase !== 'string' || passphrase.length < 12) {
    throw new Error('BACKUP_PASSPHRASE is missing or shorter than 12 characters.');
  }
}

export function encrypt(obj, passphrase) {
  checkPassphrase(passphrase);
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', deriveKey(passphrase, salt), iv);
  const body = Buffer.concat([cipher.update(zlib.gzipSync(JSON.stringify(obj))), cipher.final()]);
  return Buffer.concat([MAGIC, salt, iv, cipher.getAuthTag(), body]);
}

export function decrypt(buf, passphrase) {
  checkPassphrase(passphrase);
  if (!buf.subarray(0, MAGIC.length).equals(MAGIC)) throw new Error('Not a 1Line backup file.');
  let o = MAGIC.length;
  const salt = buf.subarray(o, (o += 16));
  const iv = buf.subarray(o, (o += 12));
  const tag = buf.subarray(o, (o += 16));
  const decipher = crypto.createDecipheriv('aes-256-gcm', deriveKey(passphrase, salt), iv);
  decipher.setAuthTag(tag);
  let plain;
  try {
    plain = Buffer.concat([decipher.update(buf.subarray(o)), decipher.final()]);
  } catch {
    throw new Error('Wrong passphrase, or the file is damaged.');
  }
  return JSON.parse(zlib.gunzipSync(plain).toString('utf8'));
}

/** Firestore value → JSON-safe value. `admin` is the firebase-admin namespace. */
export function encodeValue(v, admin) {
  const { Timestamp, GeoPoint, DocumentReference } = admin.firestore;
  if (v === null || typeof v !== 'object') return v;
  if (v instanceof Timestamp) return { $ts: v.toDate().toISOString() };
  if (v instanceof GeoPoint) return { $geo: [v.latitude, v.longitude] };
  if (v instanceof DocumentReference) return { $ref: v.path };
  if (Buffer.isBuffer(v) || v instanceof Uint8Array) return { $bytes: Buffer.from(v).toString('base64') };
  if (Array.isArray(v)) return v.map((x) => encodeValue(x, admin));
  return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, encodeValue(x, admin)]));
}

/** JSON-safe value → Firestore value (inverse of encodeValue). */
export function decodeValue(v, admin, db) {
  const { Timestamp, GeoPoint } = admin.firestore;
  if (v === null || typeof v !== 'object') return v;
  if (Array.isArray(v)) return v.map((x) => decodeValue(x, admin, db));
  const keys = Object.keys(v);
  if (keys.length === 1) {
    if (keys[0] === '$ts') return Timestamp.fromDate(new Date(v.$ts));
    if (keys[0] === '$geo') return new GeoPoint(v.$geo[0], v.$geo[1]);
    if (keys[0] === '$ref') return db.doc(v.$ref);
    if (keys[0] === '$bytes') return Buffer.from(v.$bytes, 'base64');
  }
  return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, decodeValue(x, admin, db)]));
}

/** firebase-admin from GOOGLE_APPLICATION_CREDENTIALS, or the emulator when FIRESTORE_EMULATOR_HOST is set */
export async function initAdmin() {
  const fs = await import('node:fs');
  let admin;
  try {
    admin = (await import('firebase-admin')).default;
  } catch {
    throw new Error('firebase-admin is not installed. Run: npm install --no-save firebase-admin');
  }
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    admin.initializeApp({ projectId: process.env.FIREBASE_PROJECT || 'line-c9601' });
  } else {
    const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (!keyPath || !fs.existsSync(keyPath)) throw new Error('Set GOOGLE_APPLICATION_CREDENTIALS to the service account key file.');
    admin.initializeApp({ credential: admin.credential.cert(JSON.parse(fs.readFileSync(keyPath, 'utf8'))) });
  }
  return admin;
}
