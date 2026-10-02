// =============================================================
//  Pure helpers behind the CRM leads views (CrmAdminPanel): dashboard counters and the
//  filter for the leads table. Kept free of React so tests/unit/crm-lead-views.test.mjs can
//  run them directly.
// =============================================================

/** Dashboard counters for the given leads */
export function computeCrmAnalytics(leads = []) {
  const todayStr = new Date().toDateString();
  let todayCount = 0;
  let buyersCount = 0;
  let sellersCount = 0;
  let brokersCount = 0;
  let requestsCount = 0;
  let closedCount = 0;

  for (const l of leads) {
    if (l.timestamp && new Date(l.timestamp).toDateString() === todayStr) todayCount++;
    if (l.type === 'buyer') buyersCount++;
    else if (l.type === 'seller') sellersCount++;
    else if (l.type === 'broker') brokersCount++;
    else if (l.type === 'request') requestsCount++;
    if (l.status === 'closed') closedCount++;
  }

  return {
    todayCount,
    buyersCount,
    sellersCount,
    brokersCount,
    requestsCount,
    closedCount,
    conversionSuccess: leads.length > 0 ? Math.round((closedCount / leads.length) * 100) + '%' : '0%'
  };
}

/**
 * Leads table filter.
 * opts: { myDealsOnly, activeRole, agentName, leadFilter, temperatureFilter, areaFilter, searchQuery, today }
 * leadFilter: 'all' | 'archived' | 'new' | 'due' | 'qualified' | a lead type.
 * today (YYYY-MM-DD) defaults to the current date; tests pass it in.
 */
export function filterLeads(leads = [], opts = {}) {
  const {
    myDealsOnly = false, activeRole, agentName, leadFilter = 'all',
    temperatureFilter = 'all', areaFilter = 'all', searchQuery = '',
    today = new Date().toISOString().slice(0, 10)
  } = opts;
  const q = searchQuery.trim().toLowerCase();

  return leads.filter((l) => {
    if (myDealsOnly && activeRole !== 'super_admin') {
      if (l.assignedTo !== agentName && l.assignedTo !== 'Unassigned') return false;
    }

    // Archived leads only show under "archived"; every other filter hides them
    if (leadFilter === 'archived') {
      if (!l.isArchived) return false;
    } else {
      if (l.isArchived) return false;
      if (leadFilter === 'new') {
        if (l.status !== 'new' && l.status) return false;
      } else if (leadFilter === 'due') {
        const hasDue = (l.nextFollowUpAt && l.nextFollowUpAt.slice(0, 10) <= today) || (l.followUp && l.followUp.includes(today));
        if (!hasDue) return false;
      } else if (leadFilter === 'qualified') {
        if ((l.score || 0) < 80) return false;
      } else if (leadFilter !== 'all' && l.type !== leadFilter) {
        return false;
      }
    }

    if (temperatureFilter !== 'all' && (l.temperature || 'hot') !== temperatureFilter) return false;
    if (areaFilter !== 'all' && l.details?.area !== areaFilter) return false;
    if (q) {
      const matchName = (l.name || '').toLowerCase().includes(q);
      const matchPhone = (l.phone || '').includes(q);
      const matchNotes = l.notes && l.notes.toLowerCase().includes(q);
      const matchCity = l.cityOrExpat && l.cityOrExpat.toLowerCase().includes(q);
      const matchTags = l.tags && l.tags.some((t) => t.toLowerCase().includes(q));
      if (!matchName && !matchPhone && !matchNotes && !matchCity && !matchTags) return false;
    }
    return true;
  });
}
