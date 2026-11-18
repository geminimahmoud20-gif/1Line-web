import { useEffect, useMemo, useState } from 'react';
import { listTeamMembers } from '../services/team';
import { knownOwners } from '../utils/inboxView';
import { personName } from '../utils/assignees';

// One request per CRM session: every assign list on the page shares it
let cache = null;
let pending = null;
const load = () => {
  if (cache) return Promise.resolve(cache);
  if (!pending) {
    pending = listTeamMembers()
      .then((res) => {
        cache = res?.ok && Array.isArray(res.members)
          ? res.members.filter((m) => !m.disabled).map((m) => ({ uid: m.uid, name: personName(m), desk: m.desk || '', role: m.role || '' }))
          : [];
        return cache;
      })
      .catch(() => { cache = []; return cache; })
      .finally(() => { pending = null; });
  }
  return pending;
};

/**
 * The people a lead can be handed to: the team's accounts (only a super admin can list them),
 * else the people who already hold leads, so a manager still sees the names in use.
 */
export default function useTeamMembers(leads = []) {
  const [team, setTeam] = useState(cache);
  useEffect(() => {
    let live = true;
    load().then((list) => { if (live) setTeam(list); });
    return () => { live = false; };
  }, []);
  return useMemo(() => (team && team.length ? team : knownOwners(leads)), [team, leads]);
}
