// =============================================================
//  Who filled in a sell form: the owner of the property or a broker. The form saves it in details.sellerRole
//  (and starts the notes with «وسيط عقاري | » or «المالك | »); older requests only have the notes prefix.
//  Pure: tests/unit/seller-role.test.mjs
// =============================================================

/** 'owner' | 'broker' | null (unknown: an older request, or a form that did not ask) */
export function sellerRoleOf(lead = {}) {
  const r = lead?.details?.sellerRole || lead?.sellerRole;
  if (r === 'owner' || r === 'broker') return r;
  const first = String(lead?.notes || '').split('|')[0].trim();
  if (first === 'وسيط عقاري') return 'broker';
  if (first === 'المالك') return 'owner';
  return null;
}

export const SELLER_ROLE_LABEL = {
  owner: { ar: 'المالك', en: 'Owner' },
  broker: { ar: 'وسيط عقاري', en: 'Broker' }
};
