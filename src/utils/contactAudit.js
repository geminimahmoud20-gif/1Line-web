import { contactUseEvent, shouldLogContact, leadDeletedEvent, roleChangeEvent, roleDeletedEvent, dataExportEvent } from './auditEvents.js';
import { logAuditEvent } from '../firebaseLazy';
import { markCallStarted } from './pendingCall.js';

/** Record that staff tapped «اتصال» / «واتساب» on a client (once a minute per client and channel). Never throws. */
export function auditContactUse(lead, channel) {
  // Every call button passes here: remember the call so «ردّ ولا ما ردّش؟» is asked when the person is back
  if (channel === 'call') markCallStarted(lead);
  try {
    const event = contactUseEvent(lead, channel);
    if (!event || !shouldLogContact(lead.id, channel)) return;
    logAuditEvent(event).catch(() => {});
  } catch { /* the audit never blocks the tap */ }
}

const send = (event) => { try { if (event) logAuditEvent(event).catch(() => {}); } catch { /* the audit never blocks the action */ } };

export const auditLeadDeleted = (leadId) => send(leadDeletedEvent(leadId));
export const auditRoleSaved = (before, after) => send(roleChangeEvent(before, after));
export const auditRoleDeleted = (roleId, fallbackRoleId) => send(roleDeletedEvent(roleId, fallbackRoleId));
export const auditDataExport = (scope, format, count) => send(dataExportEvent(scope, format, count));
