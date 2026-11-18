// Buyer demands kept in this browser for the public demands board. Contact details never go to
// localStorage (they live in request_contacts on the server), so they are stripped first.

export const DEMANDS_STORAGE_KEY = 'oneline_demands';
export const DEMAND_CONTACT_FIELDS = ['phone', 'whatsapp', 'email', 'clientName', 'name'];

export const stripDemandContacts = (list = []) => list.map((d) => {
  const copy = { ...d };
  DEMAND_CONTACT_FIELDS.forEach((k) => delete copy[k]);
  return copy;
});

/** Returns true when written; storage full / blocked is not an error for the caller */
export function persistDemands(list, storage = globalThis.localStorage) {
  try {
    storage.setItem(DEMANDS_STORAGE_KEY, JSON.stringify(stripDemandContacts(list)));
    return true;
  } catch {
    return false;
  }
}
