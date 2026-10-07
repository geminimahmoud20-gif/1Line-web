// =============================================================
//  CRM team accounts & dynamic roles/teams — logic shared by api/team.js and tests.
//  (Files starting with "_" in api/ are not deployed as their own routes.)
// =============================================================

import {
  DEFAULT_ACCESS,
  SUPER_ADMIN,
  UNASSIGNED_DESK,
  normalizeAccess,
  claimsForMember,
  permsOfRole,
  cleanRole,
  cleanTeam,
  makeId,
  roleById,
  teamById
} from '../src/utils/accessModel.js';

export { DEFAULT_ACCESS, SUPER_ADMIN, UNASSIGNED_DESK };

// Legacy hardcoded roles kept for backward compatibility
export const TEAM_ROLES = ['super_admin', 'sales_manager', 'sales_agent', 'agent_east', 'agent_new_sohag', 'property_manager', 'finance', 'viewer'];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UID_RE = /^[A-Za-z0-9_-]{1,128}$/;

export const parseClaims = (raw) => {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try { return JSON.parse(raw) || {}; } catch { return {}; }
};

export const roleOf = (claims = {}, config = null) => {
  if (claims.admin === true || claims.role === 'admin' || claims.role === SUPER_ADMIN) return SUPER_ADMIN;
  if (config && config.roles?.some((r) => r.id === claims.role)) return claims.role;
  if (TEAM_ROLES.includes(claims.role)) return claims.role;
  if (claims.staff && typeof claims.role === 'string' && claims.role) return claims.role;
  return null;
};

/** Validate a POST body. Returns { action, ... } or null. */
export function parseTeamRequest(body, config = null) {
  const action = body?.action;
  const validRoles = config ? config.roles.map((r) => r.id) : TEAM_ROLES;

  if (action === 'add') {
    const email = String(body.email || '').trim().toLowerCase();
    const name = String(body.name || '').replace(/\s+/g, ' ').trim().slice(0, 80);
    const role = String(body.role || '');
    const desk = typeof body.desk === 'string' ? body.desk.trim() : undefined;
    if (!EMAIL_RE.test(email) || email.length > 120 || !validRoles.includes(role)) return null;
    return { action, email, role, ...(desk !== undefined ? { desk } : {}), name };
  }

  if (action === 'role') {
    const uid = String(body.uid || '');
    const role = String(body.role || '');
    const desk = typeof body.desk === 'string' ? body.desk.trim() : undefined;
    if (!UID_RE.test(uid) || !validRoles.includes(role)) return null;
    return { action, uid, role, ...(desk !== undefined ? { desk } : {}) };
  }

  if (['disable', 'enable', 'remove'].includes(action)) {
    const uid = String(body.uid || '');
    if (!UID_RE.test(uid)) return null;
    return { action, uid };
  }

  if (action === 'save_role') {
    const role = cleanRole(body.role);
    if (!role) return null;
    return { action, role };
  }

  if (action === 'delete_role') {
    const roleId = String(body.roleId || '').trim();
    const fallbackRoleId = String(body.fallbackRoleId || '').trim();
    if (!roleId || roleId === SUPER_ADMIN || !fallbackRoleId || roleId === fallbackRoleId) return null;
    return { action, roleId, fallbackRoleId };
  }

  if (action === 'save_team') {
    const team = cleanTeam(body.team);
    if (!team) return null;
    return { action, team };
  }

  if (action === 'delete_team') {
    const teamId = String(body.teamId || '').trim();
    const fallbackTeamId = String(body.fallbackTeamId || UNASSIGNED_DESK).trim();
    if (!teamId || teamId === UNASSIGNED_DESK || teamId === fallbackTeamId) return null;
    return { action, teamId, fallbackTeamId };
  }

  return null;
}

const lastSignIn = (u) => {
  const refresh = u.lastRefreshAt ? Date.parse(u.lastRefreshAt) || 0 : 0;
  const login = Number(u.lastLoginAt || 0);
  const realLogin = login && (refresh || login - Number(u.createdAt || 0) > 5000) ? login : 0;
  return Math.max(refresh, realLogin) || null;
};

/** Shape a raw Identity Toolkit user for the CRM list */
export function toMember(u, config = null) {
  const claims = parseClaims(u.customAttributes);
  return {
    uid: u.localId,
    email: u.email || '',
    name: u.displayName || '',
    role: roleOf(claims, config),
    desk: typeof claims.desk === 'string' ? claims.desk : '',
    perms: Array.isArray(claims.perms) ? claims.perms : [],
    disabled: Boolean(u.disabled),
    lastLoginAt: lastSignIn(u) ? new Date(lastSignIn(u)).toISOString() : null,
    createdAt: u.createdAt ? new Date(Number(u.createdAt)).toISOString() : null
  };
}

/** Lockout prevention rules */
export function checkChange({ action, uid, role }, callerUid, members) {
  if (['add', 'save_role', 'delete_role', 'save_team', 'delete_team'].includes(action)) return null;
  if (uid === callerUid) return 'self';
  const target = members.find((m) => m.uid === uid);
  if (!target) return 'not-found';
  const activeAdmins = members.filter((m) => m.role === SUPER_ADMIN && !m.disabled);
  const losesAdmin = target.role === SUPER_ADMIN && !target.disabled
    && (action === 'disable' || action === 'remove' || (action === 'role' && role !== SUPER_ADMIN));
  if (losesAdmin && activeAdmins.length <= 1) return 'last-admin';
  return null;
}

/** Claims after setting a role: backward-compatible wrapper around claimsForMember */
export function claimsWithRole(existingRaw, role, desk = '', config = null) {
  const existing = parseClaims(existingRaw);
  if (!config) {
    const { role: _r, admin: _a, staff: _s, perms: _p, desk: _d, ...rest } = existing;
    if (!role) return rest;
    return { ...rest, role, admin: role === SUPER_ADMIN };
  }
  return claimsForMember(existing, role, desk, config);
}

/**
 * Access storage for Firestore settings/access
 */
export function accessStore(fs) {
  const check = async (res, what, allow404 = false) => {
    if (res.ok || (allow404 && res.status === 404)) return res.status === 204 || res.status === 404 ? null : res.json();
    throw new Error(`accessStore ${what} ${res.status}`);
  };
  return {
    async get() {
      if (!fs) return DEFAULT_ACCESS;
      try {
        const doc = await check(await fs('GET', 'settings/access'), 'get', true);
        const rawJson = doc?.fields?.json?.stringValue;
        return normalizeAccess(rawJson);
      } catch (err) {
        console.warn('accessStore get error, using defaults:', err?.message);
        return DEFAULT_ACCESS;
      }
    },
    async save(config) {
      if (!fs) return config;
      const clean = normalizeAccess(config);
      await check(await fs('PATCH', 'settings/access', {
        fields: {
          json: { stringValue: JSON.stringify(clean) },
          updatedAt: { timestampValue: new Date().toISOString() }
        }
      }), 'save');
      return clean;
    }
  };
}

/** Reassigns leads and lead_contacts from oldTeamId to targetTeamId */
async function reassignTeamLeads(fs, oldTeamId, targetTeamId) {
  if (!fs || !oldTeamId) return 0;
  const target = targetTeamId || UNASSIGNED_DESK;
  try {
    const qBody = {
      structuredQuery: {
        from: [{ collectionId: 'leads' }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'assignedTo' },
            op: 'EQUAL',
            value: { stringValue: oldTeamId }
          }
        },
        limit: 500
      }
    };
    const res = await fs('POST', ':runQuery', qBody);
    if (!res.ok) return 0;
    const items = await res.json();
    let count = 0;
    for (const item of items) {
      const doc = item?.document;
      if (!doc?.name) continue;
      const leadId = doc.name.split('/').pop();
      await fs('PATCH', `leads/${encodeURIComponent(leadId)}?updateMask.fieldPaths=assignedTo`, {
        fields: { assignedTo: { stringValue: target } }
      }).catch(() => {});
      await fs('PATCH', `lead_contacts/${encodeURIComponent(leadId)}?updateMask.fieldPaths=assignedTo`, {
        fields: { assignedTo: { stringValue: target } }
      }).catch(() => {});
      count++;
    }
    return count;
  } catch (err) {
    console.warn('reassignTeamLeads warning:', err);
    return 0;
  }
}

/**
 * Identity Toolkit (Firebase Auth admin REST).
 */
export function teamStore(call, registry = null, accessStorage = null, fs = null) {
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

  const scanAll = async (config) => {
    const members = [];
    let token = '';
    do {
      const r = await ok(await call('GET', `accounts:batchGet?maxResults=1000${token ? `&nextPageToken=${encodeURIComponent(token)}` : ''}`), 'list');
      for (const u of r.users || []) {
        const m = toMember(u, config);
        if (m.role) members.push(m);
      }
      token = r.nextPageToken || '';
    } while (token);
    return members;
  };

  const lookupMany = async (uids) => {
    const users = [];
    for (let i = 0; i < uids.length; i += 100) {
      const r = await ok(await call('POST', 'accounts:lookup', { localId: uids.slice(i, i + 100) }), 'lookup');
      users.push(...(r.users || []));
    }
    return users;
  };

  const byEmail = (a, b) => a.email.localeCompare(b.email);

  return {
    async getAccess() {
      return accessStorage ? await accessStorage.get() : DEFAULT_ACCESS;
    },
    async saveAccess(config) {
      return accessStorage ? await accessStorage.save(config) : config;
    },
    async listMembers({ rebuild = false } = {}) {
      const config = await this.getAccess();
      if (!registry) return (await scanAll(config)).sort(byEmail);
      const uids = rebuild ? [] : await registry.list();
      if (uids.length === 0) {
        const members = await scanAll(config);
        await registry.replace(members.map((m) => [m.uid, m.role, m.desk]));
        return members.sort(byEmail);
      }
      const users = await lookupMany(uids);
      const members = users.map((u) => toMember(u, config)).filter((m) => m.role);
      const stale = uids.filter((uid) => !members.some((m) => m.uid === uid));
      for (const uid of stale) await registry.remove(uid);
      return members.sort(byEmail);
    },
    async findByEmail(email) {
      const r = await ok(await call('POST', 'accounts:lookup', { email: [email] }), 'lookup');
      return r.users?.[0] || null;
    },
    async getUser(uid) {
      const r = await ok(await call('POST', 'accounts:lookup', { localId: [uid] }), 'lookup');
      return r.users?.[0] || null;
    },
    async createUser(email, name) {
      const password = Array.from(crypto.getRandomValues(new Uint8Array(24)), (b) => b.toString(16).padStart(2, '0')).join('');
      const r = await ok(await call('POST', 'accounts', { email, password, displayName: name || undefined, emailVerified: false }), 'create');
      return r.localId;
    },
    async updateUser(uid, { claims, disabled, name, desk }) {
      const body = { localId: uid, validSince: String(Math.floor(Date.now() / 1000)) };
      if (claims !== undefined) body.customAttributes = JSON.stringify(claims);
      if (disabled !== undefined) body.disableUser = disabled;
      if (name) body.displayName = name;
      await ok(await call('POST', 'accounts:update', body), 'update');
      if (registry && claims !== undefined) {
        const role = roleOf(claims);
        const resolvedDesk = desk !== undefined ? desk : (claims?.desk || '');
        if (role) await registry.set(uid, role, resolvedDesk);
        else await registry.remove(uid);
      }
    },
    async reassignLeads(oldTeamId, targetTeamId) {
      return reassignTeamLeads(fs, oldTeamId, targetTeamId);
    }
  };
}

/**
 * Staff registry in Firestore
 */
export function staffRegistry(fs) {
  const check = async (res, what, allow404 = false) => {
    if (res.ok || (allow404 && res.status === 404)) return res.status === 204 || res.status === 404 ? {} : res.json();
    throw new Error(`registry ${what} ${res.status}`);
  };
  const reg = {
    async list() {
      const uids = [];
      let token = '';
      do {
        const r = await check(await fs('GET', `staff_registry?pageSize=300&mask.fieldPaths=role${token ? `&pageToken=${encodeURIComponent(token)}` : ''}`), 'list', true);
        for (const d of r.documents || []) uids.push(d.name.split('/').pop());
        token = r.nextPageToken || '';
      } while (token);
      return uids;
    },
    async set(uid, role, desk = '') {
      await check(await fs('PATCH', `staff_registry/${encodeURIComponent(uid)}`, {
        fields: {
          role: { stringValue: role },
          desk: { stringValue: desk || '' },
          updatedAt: { timestampValue: new Date().toISOString() }
        }
      }), 'set');
    },
    async remove(uid) {
      await check(await fs('DELETE', `staff_registry/${encodeURIComponent(uid)}`), 'remove', true);
    },
    async replace(entries) {
      const keep = new Set(entries.map(([uid]) => uid));
      for (const uid of await reg.list()) if (!keep.has(uid)) await reg.remove(uid);
      for (const [uid, role, desk] of entries) await reg.set(uid, role, desk || '');
    }
  };
  return reg;
}

/**
 * Super Admin operations handler
 */
export async function handleTeam({ method, body, callerUid, store }) {
  const config = await store.getAccess();

  if (method === 'GET') {
    return {
      status: 200,
      body: {
        ok: true,
        members: await store.listMembers(),
        access: config
      }
    };
  }

  if (body?.action === 'get_access') {
    return { status: 200, body: { ok: true, access: config } };
  }

  if (body?.action === 'resync') {
    return {
      status: 200,
      body: {
        ok: true,
        members: await store.listMembers({ rebuild: true }),
        access: config
      }
    };
  }

  const req = parseTeamRequest(body, config);
  if (!req) return { status: 400, body: { error: 'bad-request' } };

  // Role / Team mutations
  if (req.action === 'save_role') {
    const roles = [...config.roles];
    const idx = roles.findIndex((r) => r.id === req.role.id);
    if (idx >= 0) roles[idx] = req.role;
    else roles.push(req.role);
    const updatedConfig = await store.saveAccess({ ...config, roles });

    // Refresh claims for members on this role so permissions apply immediately
    const members = await store.listMembers();
    for (const m of members) {
      if (m.role === req.role.id) {
        const u = await store.getUser(m.uid);
        if (u) {
          const claims = claimsForMember(parseClaims(u.customAttributes), m.role, m.desk, updatedConfig);
          await store.updateUser(m.uid, { claims, desk: m.desk });
        }
      }
    }
    return { status: 200, body: { ok: true, access: updatedConfig, members: await store.listMembers() } };
  }

  if (req.action === 'delete_role') {
    if (!roleById(config, req.fallbackRoleId)) return { status: 400, body: { error: 'invalid-fallback-role' } };
    const roles = config.roles.filter((r) => r.id !== req.roleId);
    const updatedConfig = await store.saveAccess({ ...config, roles });

    // Migrate members on deleted role to fallbackRoleId
    const members = await store.listMembers();
    for (const m of members) {
      if (m.role === req.roleId) {
        const u = await store.getUser(m.uid);
        if (u) {
          const claims = claimsForMember(parseClaims(u.customAttributes), req.fallbackRoleId, m.desk, updatedConfig);
          await store.updateUser(m.uid, { claims, desk: m.desk });
        }
      }
    }
    return { status: 200, body: { ok: true, access: updatedConfig, members: await store.listMembers() } };
  }

  if (req.action === 'save_team') {
    const teams = [...config.teams];
    const idx = teams.findIndex((t) => t.id === req.team.id);
    if (idx >= 0) teams[idx] = req.team;
    else teams.push(req.team);
    const updatedConfig = await store.saveAccess({ ...config, teams });
    return { status: 200, body: { ok: true, access: updatedConfig } };
  }

  if (req.action === 'delete_team') {
    const teams = config.teams.filter((t) => t.id !== req.teamId);
    const updatedConfig = await store.saveAccess({ ...config, teams });

    // 1. Reassign members whose desk was req.teamId
    const fallbackDesk = req.fallbackTeamId === UNASSIGNED_DESK ? '' : req.fallbackTeamId;
    const members = await store.listMembers();
    for (const m of members) {
      if (m.desk === req.teamId) {
        const u = await store.getUser(m.uid);
        if (u) {
          const claims = claimsForMember(parseClaims(u.customAttributes), m.role, fallbackDesk, updatedConfig);
          await store.updateUser(m.uid, { claims, desk: fallbackDesk });
        }
      }
    }

    // 2. Reassign leads in Firestore
    const migratedLeads = await store.reassignLeads(req.teamId, req.fallbackTeamId);

    return {
      status: 200,
      body: {
        ok: true,
        access: updatedConfig,
        migratedLeads,
        members: await store.listMembers()
      }
    };
  }

  // Member mutations
  const members = await store.listMembers();
  const blocked = checkChange(req, callerUid, members);
  if (blocked) return { status: 409, body: { error: blocked } };

  if (req.action === 'add') {
    const existing = await store.findByEmail(req.email);
    const uid = existing ? existing.localId : await store.createUser(req.email, req.name);
    const claims = claimsForMember(parseClaims(existing?.customAttributes), req.role, req.desk || '', config);
    await store.updateUser(uid, {
      claims,
      name: existing?.displayName ? undefined : req.name,
      disabled: false,
      desk: req.desk || ''
    });
    return {
      status: 200,
      body: {
        ok: true,
        uid,
        created: !existing,
        needsPassword: !existing || !lastSignIn(existing)
      }
    };
  }

  const user = await store.getUser(req.uid);
  if (!user) return { status: 404, body: { error: 'not-found' } };

  if (req.action === 'role') {
    const targetDesk = req.desk !== undefined ? req.desk : (parseClaims(user.customAttributes).desk || '');
    const claims = claimsForMember(parseClaims(user.customAttributes), req.role, targetDesk, config);
    await store.updateUser(req.uid, { claims, desk: targetDesk });
  } else if (req.action === 'disable') {
    await store.updateUser(req.uid, { disabled: true });
  } else if (req.action === 'enable') {
    await store.updateUser(req.uid, { disabled: false });
  } else if (req.action === 'remove') {
    await store.updateUser(req.uid, { claims: claimsForMember(parseClaims(user.customAttributes), null, '', config) });
  }

  return { status: 200, body: { ok: true } };
}
