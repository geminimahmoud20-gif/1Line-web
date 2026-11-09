// =============================================================
//  «المستشار المسؤول» everywhere a lead is assigned: a team (desk) or a person on the team.
//  A person is stored the way the inbox already stores a claim (utils/inboxView reassignUpdates):
//  ownerName / ownerUid, with the lead on that person's desk so their queue sees it. A select's
//  value is the desk id, or `user:<uid>` (`user:name:<name>` for an owner without an account id).
// =============================================================
import { reassignUpdates } from './inboxView.js';

const PERSON = 'user:';

/** The select value for a lead's current owner */
export function assigneeValue(lead = {}) {
  if (lead.ownerUid) return `${PERSON}${lead.ownerUid}`;
  const name = lead.ownerName || lead.claimedBy;
  if (name) return `${PERSON}name:${name}`;
  return lead.assignedTo || 'Unassigned';
}

/** The select value for one person */
export const personValue = (m = {}) => (m.uid ? `${PERSON}${m.uid}` : `${PERSON}name:${m.name}`);

export const isPersonValue = (value) => typeof value === 'string' && value.startsWith(PERSON);

/** The person a select value names, from the team list */
export function personFor(value, people = []) {
  if (!isPersonValue(value)) return null;
  const key = value.slice(PERSON.length);
  if (key.startsWith('name:')) {
    const name = key.slice(5);
    return people.find((p) => p.name === name) || { uid: '', name, desk: '' };
  }
  return people.find((p) => p.uid === key) || null;
}

/**
 * The lead fields for a choice in the select: a person takes the lead (and their desk); a team
 * puts it on that desk with nobody named, so the team's queue picks it up.
 */
export function assignmentUpdates(lead, value, people = [], nowIso = new Date().toISOString()) {
  if (isPersonValue(value)) {
    const person = personFor(value, people);
    if (person) return reassignUpdates(lead, person, nowIso);
  }
  return { ...reassignUpdates(lead, null, nowIso), assignedTo: value || 'Unassigned' };
}

/** A display name for a team member */
export const personName = (m = {}) => m.name || (m.email ? m.email.split('@')[0] : '') || m.uid || '';
