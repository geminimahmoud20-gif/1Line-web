// =============================================================
//  1LINE ENTERPRISE CRM - INTELLIGENT LEAD ROUTING ENGINE
//  Auto-Routing: Geographical, Value Tier (VIP), and Round-Robin
//  Dynamically backed by settings/access teams and keywords.
// =============================================================

import { DEFAULT_ACCESS } from './accessModel.js';
import { parseMoney } from './crmLeadViews.js';

export const SALES_AGENTS_POOL = [
  { id: 'agent_east', name: 'Sales Team A', role: 'فريق شرق والكوثر' },
  { id: 'agent_new_sohag', name: 'Sales Team B', role: 'فريق سوهاج الجديدة' },
  { id: 'sales_agent', name: 'Sales Advisor Team', role: 'مستشار المبيعات العام' }
];

/**
 * Automatically assigns an incoming lead to the best sales desk based on:
 * 1. High Net Worth / VIP Tier (Budget >= 5M or Investor Portal)
 * 2. Geo-Specialization via configured active team keywords
 * 3. Commercial / Mega Project Focus
 * 4. Workload Balanced Round-Robin across active teams
 */
export function routeLeadAutomatically(leadData, existingLeads = [], customConfig = null) {
  if (!leadData) return leadData;

  // If already manually assigned to a specific person other than Unassigned, keep it
  if (leadData.assignedTo && leadData.assignedTo !== 'Unassigned' && leadData.assignedTo !== 'غير محدد') {
    return leadData;
  }

  const config = customConfig || (typeof window !== 'undefined' && window.__ACTIVE_ACCESS_CONFIG__) || DEFAULT_ACCESS;
  const activeTeams = (config?.teams || DEFAULT_ACCESS.teams).filter((t) => t.active !== false);

  // parseMoney reads '3.5 مليون' / '٣٥٠٠٠٠٠' (parseInt read the first as 3)
  const budget = parseMoney(leadData.budget) || parseMoney(leadData.details?.budget) || parseMoney(leadData.details?.expectedPrice);
  const area = String(leadData.area || leadData.details?.area || leadData.areaKey || '').toLowerCase();
  const propertyType = String(leadData.propertyType || leadData.details?.propertyType || '').toLowerCase();
  const leadType = String(leadData.type || leadData.leadType || '').toLowerCase();
  const notes = String(leadData.notes || leadData.message || leadData.details?.notes || '').toLowerCase();

  let assignedTo;
  let routingReason_ar;
  let routingReason_en;

  const vipTeam = activeTeams.find((t) => t.routeVip) || activeTeams.find((t) => t.id === 'Dr. Mahmoud Elbaz');
  const commTeam = activeTeams.find((t) => t.routeCommercial) || activeTeams.find((t) => t.id === 'Sales Management');

  // 1. VIP / Private Office / High Budget Tier
  if (vipTeam && (budget >= 5000000 || leadType === 'investor' || leadType === 'vip' || notes.includes('مكتب خاص') || notes.includes('vip'))) {
    assignedTo = vipTeam.id;
    routingReason_ar = `عميل استثماري VIP (ميزانية تفوق 5 ملايين ج.م أو محفظة خاصة) — [${vipTeam.name_ar}]`;
    routingReason_en = `VIP Investor / Private Office Portfolio Desk — [${vipTeam.name_en}]`;
  }
  // 2. Commercial / Administrative / Mega Projects
  else if (commTeam && (propertyType === 'commercial' || propertyType === 'admin' || propertyType === 'medical' || leadType === 'project' || notes.includes('تجاري') || notes.includes('محل') || notes.includes('عيادة'))) {
    assignedTo = commTeam.id;
    routingReason_ar = `توزيع نوعي: قطاع تجاري وإداري / مشروعات كبرى — [${commTeam.name_ar}]`;
    routingReason_en = `Specialized Commercial & Development Desk — [${commTeam.name_en}]`;
  }
  // 3. Dynamic Geo-specialization matching configured team keywords
  else {
    const geoMatch = activeTeams.find((t) => {
      if (!Array.isArray(t.keywords) || t.keywords.length === 0) return false;
      return t.keywords.some((kw) => area.includes(kw) || notes.includes(kw));
    });

    if (geoMatch) {
      assignedTo = geoMatch.id;
      routingReason_ar = `توزيع جغرافي ذكي: نطاق [${geoMatch.name_ar}]`;
      routingReason_en = `Geographic Match: [${geoMatch.name_en}]`;
    } else {
      // 4. Fair Round-Robin Balance based on existing active lead count across active teams
      const roundRobinTeams = activeTeams.filter((t) => t.roundRobin !== false && !t.routeVip && !t.routeCommercial);
      const candidates = roundRobinTeams.length > 0 ? roundRobinTeams : activeTeams;

      const counts = {};
      candidates.forEach((t) => { counts[t.id] = 0; });

      existingLeads.forEach((item) => {
        const agent = item.assignedTo;
        if (counts[agent] !== undefined && item.status !== 'closed' && item.status !== 'cancelled') {
          counts[agent]++;
        }
      });

      const sorted = candidates.sort((a, b) => (counts[a.id] || 0) - (counts[b.id] || 0));
      const chosen = sorted[0];
      assignedTo = chosen ? chosen.id : 'Unassigned';
      routingReason_ar = chosen
        ? `توزيع دوري ذكي (Round-Robin) لموازنة أعباء الفريق [${chosen.name_ar}] (الرصيد النشط: ${counts[chosen.id] || 0})`
        : 'تم الإسناد إلى القائمة العامة (غير مسند)';
      routingReason_en = chosen
        ? `Smart Round-Robin load balance [${chosen.name_en}] (Active leads: ${counts[chosen.id] || 0})`
        : 'Assigned to unassigned pool';
    }
  }

  // Create audit activity record for transparency
  const routingActivity = {
    id: 'act_route_' + Math.random().toString(36).substring(2, 9),
    action: 'AUTO_ROUTED',
    text_ar: `🤖 تم إسناد العميل آلياً إلى [${assignedTo}] — ${routingReason_ar}`,
    text_en: `🤖 Auto-assigned to [${assignedTo}] — ${routingReason_en}`,
    assignedTo,
    timestamp: new Date().toISOString()
  };

  const updatedActivities = Array.isArray(leadData.activities) 
    ? [routingActivity, ...leadData.activities] 
    : [routingActivity];

  return {
    ...leadData,
    assignedTo,
    routingReason_ar,
    routingReason_en,
    activities: updatedActivities
  };
}

/**
 * Returns a summary of workload per sales agent
 */
export function getAgentWorkloadStats(leads = []) {
  const stats = {};
  leads.forEach((lead) => {
    const agent = lead.assignedTo || 'Unassigned';
    if (!stats[agent]) {
      stats[agent] = { total: 0, new: 0, in_progress: 0, closed: 0 };
    }
    stats[agent].total++;
    if (lead.status === 'new') stats[agent].new++;
    if (lead.status === 'contacted' || lead.status === 'meeting' || lead.status === 'negotiation') {
      stats[agent].in_progress++;
    }
    if (lead.status === 'closed') stats[agent].closed++;
  });
  return stats;
}
