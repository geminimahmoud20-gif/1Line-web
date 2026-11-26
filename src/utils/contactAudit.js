import { contactUseEvent, phoneRevealEvent, phoneCopyEvent, shouldLogContact, leadDeletedEvent, roleChangeEvent, roleDeletedEvent, dataExportEvent, backupRestoredEvent, dataImportedEvent } from './auditEvents.js';
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
export const auditBackupRestored = (entity, details) => send(backupRestoredEvent(entity, details));
export const auditDataImported = (entity, details) => send(dataImportedEvent(entity, details));

/** «إظهار» on a masked number / the copy button. Throttled like the call buttons; never throws. */
export function auditPhoneReveal(leadId, surface) {
  try {
    const event = phoneRevealEvent(leadId, surface);
    if (event) logAuditEvent(event).catch(() => {});
  } catch { /* the audit never blocks the tap */ }
}
export function auditPhoneCopy(leadId, surface) {
  try {
    const event = phoneCopyEvent(leadId, surface);
    if (!event || !shouldLogContact(leadId, 'copy')) return;
    logAuditEvent(event).catch(() => {});
  } catch { /* the audit never blocks the tap */ }
}
