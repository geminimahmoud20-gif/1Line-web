// =============================================================
//  1LINE ENTERPRISE CRM - INTELLIGENT LEAD ROUTING ENGINE
//  Auto-Routing: Geographical, Value Tier (VIP), and Round-Robin
// =============================================================

export const SALES_AGENTS_POOL = [
  { id: 'agent_east', name: 'Sales Team A', role: 'فريق شرق والكوثر' },
  { id: 'agent_new_sohag', name: 'Sales Team B', role: 'فريق سوهاج الجديدة' },
  { id: 'sales_agent', name: 'Sales Advisor Team', role: 'مستشار المبيعات العام' }
];

/**
 * Automatically assigns an incoming lead to the best sales desk based on:
 * 1. High Net Worth / VIP Tier (Budget >= 5M or Investor Portal)
 * 2. Geo-Specialization (New Sohag vs East/Kawthar)
 * 3. Commercial / Mega Project Focus
 * 4. Workload Balanced Round-Robin
 */
export function routeLeadAutomatically(leadData, existingLeads = []) {
  if (!leadData) return leadData;

  // If already manually assigned to a specific person other than Unassigned, keep it
  if (leadData.assignedTo && leadData.assignedTo !== 'Unassigned' && leadData.assignedTo !== 'غير محدد') {
    return leadData;
  }

  const budget = parseInt(leadData.budget || leadData.details?.budget || leadData.details?.expectedPrice || 0, 10);
  const area = String(leadData.area || leadData.details?.area || leadData.areaKey || '').toLowerCase();
  const propertyType = String(leadData.propertyType || leadData.details?.propertyType || '').toLowerCase();
  const leadType = String(leadData.type || leadData.leadType || '').toLowerCase();
  const notes = String(leadData.notes || leadData.message || leadData.details?.notes || '').toLowerCase();

  let assignedTo = 'Sales Advisor Team';
  let routingReason_ar = 'توزيع ذكي لمستشار مبيعات معتمد';
  let routingReason_en = 'Auto-assigned to Certified Sales Advisor';

  // 1. VIP / Private Office / High Budget Tier
  if (budget >= 5000000 || leadType === 'investor' || leadType === 'vip' || notes.includes('مكتب خاص') || notes.includes('vip')) {
    assignedTo = 'Dr. Mahmoud Elbaz';
    routingReason_ar = 'عميل استثماري VIP (ميزانية تفوق 5 ملايين ج.م أو محفظة خاصة)';
    routingReason_en = 'VIP Investor / Private Office Portfolio Desk';
  }
  // 2. Commercial / Administrative / Mega Projects
  else if (propertyType === 'commercial' || propertyType === 'admin' || propertyType === 'medical' || leadType === 'project' || notes.includes('تجاري') || notes.includes('محل') || notes.includes('عيادة')) {
    assignedTo = 'Sales Management';
    routingReason_ar = 'توزيع نوعي: قطاع تجاري وإداري / مشروعات كبرى';
    routingReason_en = 'Specialized Commercial & Development Desk';
  }
  // 3. Geo: New Sohag Focus
  else if (area === 'new_sohag' || area === 'new-sohag' || area.includes('جديدة') || notes.includes('سوهاج الجديدة')) {
    assignedTo = 'Sales Team B';
    routingReason_ar = 'توزيع جغرافي متخصص: نطاق سوهاج الجديدة والكمبوندات';
    routingReason_en = 'Geographic Match: New Sohag Desk';
  }
  // 4. Geo: East Sohag & El Kawthar Focus
  else if (area === 'east' || area === 'kawthar' || notes.includes('شرق') || notes.includes('الكوثر') || notes.includes('الجمهورية') || notes.includes('الثقافة')) {
    assignedTo = 'Sales Team A';
    routingReason_ar = 'توزيع جغرافي متخصص: نطاق حي شرق وسوهاج القديمة والكوثر';
    routingReason_en = 'Geographic Match: East Sohag & Kawthar Desk';
  }
  // 5. Fair Round-Robin Balance based on existing lead count
  else {
    const counts = {
      'Sales Team A': 0,
      'Sales Team B': 0,
      'Sales Advisor Team': 0
    };

    existingLeads.forEach(item => {
      const agent = item.assignedTo;
      if (counts[agent] !== undefined && item.status !== 'closed' && item.status !== 'cancelled') {
        counts[agent]++;
      }
    });

    // Pick agent with lowest active leads
    const sortedAgents = Object.keys(counts).sort((a, b) => counts[a] - counts[b]);
    assignedTo = sortedAgents[0] || 'Sales Advisor Team';
    routingReason_ar = `توزيع دوري ذكي (Round-Robin) لموازنة أعباء الفريق (الرصيد النشط: ${counts[assignedTo] || 0})`;
    routingReason_en = `Smart Round-Robin load balance (Active leads: ${counts[assignedTo] || 0})`;
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
  leads.forEach(lead => {
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
