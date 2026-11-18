// «Open this client»: a notification that lives outside the clients screen (a team mention) asks for a client's
// drawer. The screen may not be mounted yet, so the request waits here until it is, and an event covers the case
// where it already is (CrmAdminPanel listens for 'oneline_open_lead').
let pending = '';

export function requestOpenLead(leadId) {
  if (!leadId) return;
  pending = String(leadId);
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('oneline_open_lead', { detail: { leadId: pending } }));
}

/** The waiting client out of `leads`, once; null when none is waiting or the list does not hold it yet (it stays waiting) */
export function takePendingLead(leads = []) {
  if (!pending) return null;
  const found = leads.find((l) => l.id === pending);
  if (found) pending = '';
  return found || null;
}
