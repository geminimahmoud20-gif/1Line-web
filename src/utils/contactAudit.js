import { contactUseEvent, shouldLogContact } from './auditEvents.js';
import { logAuditEvent } from '../firebaseLazy';

/** Record that staff tapped «اتصال» / «واتساب» on a client (once a minute per client and channel). Never throws. */
export function auditContactUse(lead, channel) {
  try {
    const event = contactUseEvent(lead, channel);
    if (!event || !shouldLogContact(lead.id, channel)) return;
    logAuditEvent(event).catch(() => {});
  } catch { /* the audit never blocks the tap */ }
}
