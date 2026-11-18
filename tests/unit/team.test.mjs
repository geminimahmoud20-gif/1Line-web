import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseTeamRequest, checkChange, claimsWithRole, roleOf, toMember, handleTeam } from '../../api/_team-core.js';

test('requests are validated', () => {
  assert.deepEqual(parseTeamRequest({ action: 'add', email: ' Nada@Example.com ', role: 'sales_agent', name: 'ندى' }), { action: 'add', email: 'nada@example.com', role: 'sales_agent', name: 'ندى' });
  assert.equal(parseTeamRequest({ action: 'add', email: 'x', role: 'sales_agent' }), null);
  assert.equal(parseTeamRequest({ action: 'add', email: 'a@b.co', role: 'god' }), null);
  assert.equal(parseTeamRequest({ action: 'role', uid: 'abc', role: 'viewer' }).role, 'viewer');
  assert.equal(parseTeamRequest({ action: 'role', uid: '../x', role: 'viewer' }), null);
  assert.equal(parseTeamRequest({ action: 'delete', uid: 'abc' }), null);
});

test('nobody locks the CRM: no self-changes, the last super admin stays', () => {
  const members = [{ uid: 'boss', role: 'super_admin', disabled: false }, { uid: 'nada', role: 'sales_agent', disabled: false }];
  assert.equal(checkChange({ action: 'role', uid: 'boss', role: 'viewer' }, 'boss', members), 'self');
  assert.equal(checkChange({ action: 'disable', uid: 'nada' }, 'boss', members), null);
  const two = [...members, { uid: 'b2', role: 'super_admin', disabled: false }];
  assert.equal(checkChange({ action: 'remove', uid: 'b2' }, 'boss', two), null);
  assert.equal(checkChange({ action: 'remove', uid: 'boss' }, 'b2', [members[0], { uid: 'b2', role: 'super_admin', disabled: true }]), 'last-admin');
  assert.equal(checkChange({ action: 'role', uid: 'ghost', role: 'viewer' }, 'boss', members), 'not-found');
});

test('claims: other claims kept, admin flag follows the role, legacy admin counts', () => {
  assert.deepEqual(claimsWithRole('{"role":"viewer","clientTier":"vip"}', 'super_admin'), { clientTier: 'vip', role: 'super_admin', admin: true });
  assert.deepEqual(claimsWithRole('{"role":"viewer","admin":false,"x":1}', null), { x: 1 });
  assert.equal(roleOf({ admin: true }), 'super_admin');
  assert.equal(roleOf({ role: 'customer' }), null);
  assert.equal(toMember({ localId: 'u', email: 'a@b.co', customAttributes: '{"role":"finance"}', lastLoginAt: '1700000000000' }).role, 'finance');
  // A login stamp right at creation is not a sign-in: the member is still "not activated"
  assert.equal(toMember({ localId: 'u', createdAt: '1700000000000', lastLoginAt: '1700000000500' }).lastLoginAt, null);
  assert.equal(toMember({ localId: 'u', createdAt: '1700000000000', lastLoginAt: '1700000600000' }).lastLoginAt, new Date(1700000600000).toISOString());
  // Signed up and stayed signed in: the token refresh counts
  assert.equal(toMember({ localId: 'u', createdAt: '1700000000000', lastLoginAt: '1700000000000', lastRefreshAt: '2023-11-20T00:00:00.000Z' }).lastLoginAt, '2023-11-20T00:00:00.000Z');
});

// Full route logic against the Auth emulator (runs when it is up: FIREBASE_AUTH_EMULATOR_HOST)
const HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST;
test('team accounts on the Auth emulator', { skip: !HOST && 'Auth emulator not running' }, async () => {
  const { teamStore } = await import('../../api/_team-core.js');
  const { authCaller } = await import('../../api/team.js');
  const P = 'line-c9601';
  await fetch(`http://${HOST}/emulator/v1/projects/${P}/accounts`, { method: 'DELETE', headers: { Authorization: 'Bearer owner' } });
  const store = teamStore(authCaller({ project_id: P }));
  const bossUid = await store.createUser('boss@team.test', 'المدير');
  await store.updateUser(bossUid, { claims: { role: 'super_admin', admin: true } });
  const call = (method, body) => handleTeam({ method, body, callerUid: bossUid, store });

  let r = await call('POST', { action: 'add', email: 'nada@team.test', role: 'sales_agent', name: 'ندى' });
  assert.equal(r.status, 200);
  assert.equal(r.body.created, true);
  assert.equal(r.body.needsPassword, true);
  const nada = r.body.uid;
  r = await call('GET');
  assert.deepEqual(r.body.members.map((m) => [m.email, m.role]), [['boss@team.test', 'super_admin'], ['nada@team.test', 'sales_agent']]);
  assert.equal(r.body.members[1].name, 'ندى');

  assert.equal((await call('POST', { action: 'role', uid: nada, role: 'sales_manager' })).status, 200);
  // Access-model claims: the role plus its permissions, as firestore.rules reads them
  const claims = JSON.parse((await store.getUser(nada)).customAttributes);
  assert.deepEqual([claims.role, claims.admin, claims.staff], ['sales_manager', false, true]);
  assert.ok(claims.perms.includes('ld.manage'));
  assert.equal((await call('POST', { action: 'disable', uid: nada })).status, 200);
  assert.equal((await store.getUser(nada)).disabled, true);
  assert.equal((await call('POST', { action: 'enable', uid: nada })).status, 200);
  assert.equal((await call('POST', { action: 'role', uid: bossUid, role: 'viewer' })).body.error, 'self');
  assert.equal((await call('POST', { action: 'remove', uid: nada })).status, 200);
  assert.deepEqual((await call('GET')).body.members.map((m) => m.email), ['boss@team.test']);
  // Adding an email that already has an account (e.g. a client account) gives it the role, no new account
  r = await call('POST', { action: 'add', email: 'nada@team.test', role: 'viewer' });
  assert.equal(r.body.created, false);
  assert.equal(r.body.uid, nada);
});

// Staff registry in Firestore (runs when both emulators are up)
const FS = process.env.FIRESTORE_EMULATOR_HOST;
test('team list comes from the staff registry, not a scan of every account', { skip: (!HOST || !FS) && 'Auth/Firestore emulators not running' }, async () => {
  const { teamStore, staffRegistry } = await import('../../api/_team-core.js');
  const { authCaller, firestoreCaller } = await import('../../api/team.js');
  const P = 'line-c9601';
  await fetch(`http://${HOST}/emulator/v1/projects/${P}/accounts`, { method: 'DELETE', headers: { Authorization: 'Bearer owner' } });
  await fetch(`http://${FS}/emulator/v1/projects/${P}/databases/(default)/documents`, { method: 'DELETE' });
  const auth = authCaller({ project_id: P });
  const registry = staffRegistry(firestoreCaller({ project_id: P }));
  const plain = teamStore(auth); // no registry: the way accounts changed outside this route look
  const store = teamStore(auth, registry);

  const boss = await plain.createUser('boss@reg.test', 'المدير');
  await plain.updateUser(boss, { claims: { role: 'super_admin', admin: true } });
  await plain.createUser('client1@reg.test', 'عميل'); // client accounts: never listed
  await plain.createUser('client2@reg.test', 'عميل');

  // Empty registry → one full scan fills it
  assert.deepEqual((await store.listMembers()).map((m) => m.email), ['boss@reg.test']);
  assert.deepEqual(await registry.list(), [boss]);

  const call = (method, body) => handleTeam({ method, body, callerUid: boss, store });
  const nada = (await call('POST', { action: 'add', email: 'nada@reg.test', role: 'sales_agent' })).body.uid;
  assert.deepEqual((await registry.list()).sort(), [boss, nada].sort());
  assert.deepEqual((await call('GET')).body.members.map((m) => [m.email, m.role]), [['boss@reg.test', 'super_admin'], ['nada@reg.test', 'sales_agent']]);

  // A role taken away outside the route: dropped from the list and from the registry
  await plain.updateUser(nada, { claims: {} });
  assert.deepEqual((await call('GET')).body.members.map((m) => m.email), ['boss@reg.test']);
  assert.deepEqual(await registry.list(), [boss]);

  // A role given outside the route shows after "resync"
  const sami = await plain.createUser('sami@reg.test', 'سامي');
  await plain.updateUser(sami, { claims: { role: 'finance', admin: false } });
  assert.deepEqual((await call('GET')).body.members.map((m) => m.email), ['boss@reg.test']);
  assert.deepEqual((await call('POST', { action: 'resync' })).body.members.map((m) => m.email), ['boss@reg.test', 'sami@reg.test']);
  assert.deepEqual((await registry.list()).sort(), [boss, sami].sort());
});

test('activated: own password set from the email link, or email verified', () => {
  const base = { localId: 'u', createdAt: '1700000000000' };
  assert.equal(toMember({ ...base, passwordUpdatedAt: 1700000000300 }).activatedAt, null); // the random initial password
  assert.equal(toMember({ ...base, passwordUpdatedAt: 1700086400000 }).activatedAt, new Date(1700086400000).toISOString());
  assert.equal(toMember({ ...base, emailVerified: true }).activatedAt, new Date(1700000000000).toISOString());
  assert.equal(toMember(base).activatedAt, null);
});

test('signout: validated, blocked on yourself, revokes and stamps the marker', async () => {
  assert.deepEqual(parseTeamRequest({ action: 'signout', uid: 'abc123' }), { action: 'signout', uid: 'abc123' });
  assert.equal(parseTeamRequest({ action: 'signout', uid: '../x' }), null);
  const calls = [];
  const fsCalls = [];
  const { teamStore } = await import('../../api/_team-core.js');
  const fakeAuth = async (method, path, body) => {
    calls.push([path, body]);
    const users = { boss: { localId: 'boss', customAttributes: '{"role":"super_admin","admin":true}' }, nada: { localId: 'nada', customAttributes: '{"role":"sales_agent"}' } };
    if (path === 'accounts:lookup') return new Response(JSON.stringify({ users: (body.localId || []).map((id) => users[id]).filter(Boolean) }));
    return new Response('{}');
  };
  const fakeFs = async (method, path, body) => { fsCalls.push([method, path, body]); return new Response('{}'); };
  const registry = { list: async () => ['boss', 'nada'], set: async () => {}, remove: async () => {} };
  const store = teamStore(fakeAuth, registry, null, fakeFs);
  const r = await handleTeam({ method: 'POST', body: { action: 'signout', uid: 'nada' }, callerUid: 'boss', store });
  assert.equal(r.status, 200);
  const update = calls.find(([p]) => p === 'accounts:update');
  assert.equal(update[1].localId, 'nada');
  assert.ok(Number(update[1].validSince) > 0);
  assert.equal(update[1].customAttributes, undefined); // access itself untouched
  assert.equal(fsCalls[0][0], 'PATCH');
  assert.equal(fsCalls[0][1], 'session_revocations/nada');
  assert.ok(fsCalls[0][2].fields.at.timestampValue);
  const self = await handleTeam({ method: 'POST', body: { action: 'signout', uid: 'boss' }, callerUid: 'boss', store });
  assert.equal(self.status, 409);
});
