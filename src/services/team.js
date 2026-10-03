import { auth } from '../firebase.js';

// CRM team accounts through /api/team (the server checks the caller is a super admin).
// Returns the route's JSON, or { ok: false, error } — 'not-configured' when the Vercel key is
// missing, 'no-api' when the site runs without its server functions (local dev).
const callTeam = async (method, body) => {
  const user = auth?.currentUser;
  if (!user) return { ok: false, error: 'unauthenticated' };
  let res;
  try {
    const token = await user.getIdToken();
    res = await fetch('/api/team', {
      method,
      headers: { authorization: `Bearer ${token}`, ...(body ? { 'content-type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined
    });
  } catch {
    return { ok: false, error: 'network' };
  }
  let data = null;
  try { data = await res.json(); } catch { /* not JSON: the site's HTML, so no server functions here */ }
  if (!data) return { ok: false, status: res.status, error: 'no-api' };
  if (!res.ok) return { ok: false, status: res.status, error: data.error || 'error' };
  return data;
};

export const listTeamMembers = () => callTeam('GET');
export const teamAction = (body) => callTeam('POST', body);
