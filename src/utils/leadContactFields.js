// Contact fields never stored on a lead document: they live in lead_contacts/{leadId}.
// services/leads.js uses this list; keep it in sync with contactFields() in firestore.rules.
// Pure (no Firebase import) so the public site can use it without loading the SDK.
export const CONTACT_FIELDS = ['phone', 'whatsapp', 'email', 'altPhone'];

/** A copy of a lead's details object without contact fields (forms sometimes copy their whole state in). */
export function withoutContactFields(details) {
  if (!details || typeof details !== 'object' || Array.isArray(details)) return {};
  const out = {};
  for (const [key, value] of Object.entries(details)) {
    if (!CONTACT_FIELDS.includes(key)) out[key] = value;
  }
  return out;
}
