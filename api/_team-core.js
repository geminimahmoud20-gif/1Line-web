// =============================================================
//  CRM team accounts — logic shared by api/team.js and its tests.
//  (Files starting with "_" in api/ are not deployed as their own routes.)
//
//  Roles are Firebase Auth custom claims: { role, admin } in the user's ID token, read by
//  firestore.rules and the CRM. Only a super admin may change them, through this route; the
//  browser can't. Passwords are never handled here: a new member sets their own through the
//  "set your password" email Firebase sends.
// =============================================================

// Keep in step with CRM_STAFF_ROLES in src/services/auth.js, scripts/set-crm-role.mjs and firestore.rules
export const TEAM_ROLES = ['super_admin', 'sales_manager', 'sales_agent', 'agent_east', 'agent_new_sohag', 'property_manager', 'finance', 'viewer'];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UID_RE = /^[A-Za-z0-9_-]{1,128}$/;

export const roleOf = (claims = {}) => {
  if (claims.admin === true || claims.role === 'admin' || claims.role === 'super_admin') return 'super_admin';
  return TEAM_ROLES.includes(claims.role) ? claims.role : null;
};

const parseClaims = (raw) => {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try { return JSON.parse(raw) || {}; } catch { return {}; }
};

/** Validate a POST body. Returns { action, ... } or null. */
export function parseTeamRequest(body) {
  const action = body?.action;
  if (action === 'add') {
    const email = String(body.email || '').trim().toLowerCase();
    const name = String(body.name || '').replace(/\s+/g, ' ').trim().slice(0, 80);
    if (!EMAIL_RE.test(email) || email.length > 120 || !TEAM_ROLES.includes(body.role)) return null;
    return { action, email, role: body.role, name };
  }
  if (['role', 'disable', 'enable', 'remove'].includes(action)) {
    const uid = String(body.uid || '');
    if (!UID_RE.test(uid)) return null;
    if (action === 'role' && !TEAM_ROLES.includes(body.role)) return null;
    return { action, uid, role: body.role };
  }
  return null;
}

/**
 * Last time the member actually used their account: a token refresh, or a sign-in. Auth stamps
 * lastLoginAt at creation too, so for an account made here (no refresh yet) a stamp next to
 * createdAt means "never signed in".
 */
const lastSignIn = (u) => {
  const refresh = u.lastRefreshAt ? Date.parse(u.lastRefreshAt) || 0 : 0;
  const login = Number(u.lastLoginAt || 0);
  const realLogin = login && (refresh || login - Number(u.createdAt || 0) > 5000) ? login : 0;
  return Math.max(refresh, realLogin) || null;
};

/** Shape a raw Identity Toolkit user for the CRM list (only what the screen needs) */
export function toMember(u) {
  const claims = parseClaims(u.customAttributes);
  return {
    uid: u.localId,
    email: u.email || '',
    name: u.displayName || '',
    role: roleOf(claims),
    disabled: Boolean(u.disabled),
    lastLoginAt: lastSignIn(u) ? new Date(lastSignIn(u)).toISOString() : null,
    createdAt: u.createdAt ? new Date(Number(u.createdAt)).toISOString() : null
  };
}

/**
 * Rules that keep the CRM from being locked out:
 *  - nobody changes, disables or removes their own access here
 *  - the last active super admin can't be demoted, disabled or removed
 */
export function checkChange({ action, uid, role }, callerUid, members) {
  if (action === 'add') return null;
  if (uid === callerUid) return 'self';
  const target = members.find((m) => m.uid === uid);
  if (!target) return 'not-found';
  const activeAdmins = members.filter((m) => m.role === 'super_admin' && !m.disabled);
  const losesAdmin = target.role === 'super_admin' && !target.disabled
    && (action === 'disable' || action === 'remove' || (action === 'role' && role !== 'super_admin'));
  if (losesAdmin && activeAdmins.length <= 1) return 'last-admin';
  return null;
}

/** Claims after setting a role: other claims kept, role + admin flag replaced */
export function claimsWithRole(existingRaw, role) {
  const { role: _r, admin: _a, ...rest } = parseClaims(existingRaw);
  return role ? { ...rest, role, admin: role === 'super_admin' } : rest;
}

/**
 * Identity Toolkit (Firebase Auth admin REST). `call(method, path, body)` does the HTTP with the
 * project's service-account token (or the emulator), path relative to /v1/projects/{project}/.
 */
export function teamStore(call) {
  const ok = async (res, what) => {
    if (!res.ok) {
      let detail = '';
      try { detail = (await res.json())?.error?.message || ''; } catch { /* no body */ }
      const err = new Error(`${what} ${res.status} ${detail}`.trim());
      err.code = detail;
      throw err;
    }
    return res.json();
  };
  return {
    /** Every account that has a CRM role */
    async listMembers() {
      const members = [];
      let token = '';
      do {
        const r = await ok(await call('GET', `accounts:batchGet?maxResults=1000${token ? `&nextPageToken=${encodeURIComponent(token)}` : ''}`), 'list');
        for (const u of r.users || []) {
          const m = toMember(u);
          if (m.role) members.push(m);
        }
        token = r.nextPageToken || '';
      } while (token);
      return members.sort((a, b) => a.email.localeCompare(b.email));
    },
    async findByEmail(email) {
      const r = await ok(await call('POST', 'accounts:lookup', { email: [email] }), 'lookup');
      return r.users?.[0] || null;
    },
    async getUser(uid) {
      const r = await ok(await call('POST', 'accounts:lookup', { localId: [uid] }), 'lookup');
      return r.users?.[0] || null;
    },
    /** New account with a random password nobody knows; the member sets theirs by email */
    async createUser(email, name) {
      const password = Array.from(crypto.getRandomValues(new Uint8Array(24)), (b) => b.toString(16).padStart(2, '0')).join('');
      const r = await ok(await call('POST', 'accounts', { email, password, displayName: name || undefined, emailVerified: false }), 'create');
      return r.localId;
    },
    /** Update claims / disabled / name; validSince ends the member's current sessions so the change applies now */
    async updateUser(uid, { claims, disabled, name }) {
      const body = { localId: uid, validSince: String(Math.floor(Date.now() / 1000)) };
      if (claims !== undefined) body.customAttributes = JSON.stringify(claims);
      if (disabled !== undefined) body.disableUser = disabled;
      if (name) body.displayName = name;
      await ok(await call('POST', 'accounts:update', body), 'update');
    }
  };
}

/**
 * The route's work once the caller is verified as a super admin.
 * Returns { status, body }.
 */
export async function handleTeam({ method, body, callerUid, store }) {
  if (method === 'GET') return { status: 200, body: { ok: true, members: await store.listMembers() } };
  const req = parseTeamRequest(body);
  if (!req) return { status: 400, body: { error: 'bad-request' } };

  const members = await store.listMembers();
  const blocked = checkChange(req, callerUid, members);
  if (blocked) return { status: 409, body: { error: blocked } };

  if (req.action === 'add') {
    const existing = await store.findByEmail(req.email);
    const uid = existing ? existing.localId : await store.createUser(req.email, req.name);
    await store.updateUser(uid, { claims: claimsWithRole(existing?.customAttributes, req.role), name: existing?.displayName ? undefined : req.name, disabled: false });
    // A new account (never signed in) needs the "set your password" email; the browser sends it
    return { status: 200, body: { ok: true, uid, created: !existing, needsPassword: !existing || !lastSignIn(existing) } };
  }

  const user = await store.getUser(req.uid);
  if (!user) return { status: 404, body: { error: 'not-found' } };
  if (req.action === 'role') await store.updateUser(req.uid, { claims: claimsWithRole(user.customAttributes, req.role) });
  else if (req.action === 'disable') await store.updateUser(req.uid, { disabled: true });
  else if (req.action === 'enable') await store.updateUser(req.uid, { disabled: false });
  else if (req.action === 'remove') await store.updateUser(req.uid, { claims: claimsWithRole(user.customAttributes, null) });
  return { status: 200, body: { ok: true } };
}
