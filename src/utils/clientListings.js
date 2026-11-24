// =============================================================
//  «وحداتي» in the client account (/my-account): the units an owner or broker has listed, and who
//  showed interest in each — pure functions behind AccountListingsTab.
// =============================================================

/** The properties this client (owner or broker) has listed, from their own leads' details.listingIds,
 *  or a property whose sourceLeadId points back to one of their leads. */
export function clientOwnedListings(properties = [], clientLeads = []) {
  const listingIds = new Set();
  clientLeads.forEach((l) => {
    (l?.details?.listingIds || []).forEach((id) => listingIds.add(String(id)));
  });
  const leadIds = new Set(clientLeads.map((l) => String(l?.id)));
  return (properties || []).filter((p) => p?.id && (listingIds.has(String(p.id)) || (p.sourceLeadId && leadIds.has(String(p.sourceLeadId)))));
}

/** Buyers who asked about this exact unit (a viewing request or inquiry carrying its propertyId) —
 *  the only signal a listing owner needs: someone wants their unit, not the buyer's own contact details. */
export function interestedBuyersFor(propertyId, leads = []) {
  if (!propertyId) return [];
  return (leads || []).filter((l) => String(l?.propertyId) === String(propertyId));
}
