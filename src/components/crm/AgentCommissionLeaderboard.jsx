import { useState } from 'react';
import { 
  Trophy, 
  Award, 
  TrendingUp, 
  DollarSign, 
  Users, 
  CheckCircle2, 
  Target, 
  Sparkles, 
  Star,
  Flame,
  ArrowUpRight
} from 'lucide-react';

export default function AgentCommissionLeaderboard({
  leads = [],
  properties = [],
  lang = 'ar',
  triggerToast
}) {
  const isAr = lang === 'ar';
  const [commissionRate, setCommissionRate] = useState(2.0); // 2% default commission
  const [monthlyTarget, setMonthlyTarget] = useState(15000000); // 15 Million EGP target

  // Define Team Agents
  const agentsList = [
    {
      id: 'agent-1',
      name: 'Dr. Mahmoud Elbaz',
      title_ar: 'المدير التنفيذي واستشاري التوثيق',
      title_en: 'Executive Director & Senior Consultant',
      avatar: '👑',
      target: 20000000
    },
    {
      id: 'agent-2',
      name: 'Sales Team A',
      title_ar: 'فريق مبيعات قطاع شرق النيل والكوثر',
      title_en: 'East Sohag & Kawthar Sales Desk',
      avatar: '🏆',
      target: 15000000
    },
    {
      id: 'agent-3',
      name: 'Sales Team B',
      title_ar: 'فريق مبيعات سوهاج الجديدة والمحور المركزي',
      title_en: 'New Sohag & Commercial Hub Desk',
      avatar: '🌟',
      target: 12000000
    }
  ];

  // Calculate dynamic stats for each agent from leads
  const agentStats = agentsList.map((agent) => {
    const assignedLeads = leads.filter(l => l.assignedTo === agent.name);
    const closedLeads = assignedLeads.filter(l => l.status === 'closed');
    const scheduledVisits = assignedLeads.filter(l => l.status === 'site_visit' || l.siteVisit);
    
    // Total closed volume in EGP
    const closedVolume = closedLeads.reduce((acc, curr) => {
      const budget = parseInt(curr.details?.budget) || parseInt(curr.details?.expectedPrice) || 3500000;
      return acc + budget;
    }, 0);

    // Active pipeline volume (Negotiation / Closing)
    const pipelineVolume = assignedLeads.filter(l => l.status === 'negotiating' || l.status === 'closing').reduce((acc, curr) => {
      const budget = parseInt(curr.details?.budget) || parseInt(curr.details?.expectedPrice) || 3000000;
      return acc + budget;
    }, 0);

    const earnedCommission = Math.round(closedVolume * (commissionRate / 100));
    const targetPercent = Math.min(100, Math.round((closedVolume / agent.target) * 100));

    return {
      ...agent,
      totalLeads: assignedLeads.length,
      closedCount: closedLeads.length,
      siteVisitsCount: scheduledVisits.length,
      closedVolume,
      pipelineVolume,
      earnedCommission,
      targetPercent
    };
  }).sort((a, b) => b.closedVolume - a.closedVolume);

  // Total Company Metrics
  const totalCompanyClosedVolume = agentStats.reduce((a, b) => a + b.closedVolume, 0);
  const totalCompanyCommission = agentStats.reduce((a, b) => a + b.earnedCommission, 0);
  const totalSiteVisits = agentStats.reduce((a, b) => a + b.siteVisitsCount, 0);

  return (
    <div className="agent-leaderboard-card">
      {/* Top Banner */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <Trophy size={22} className="text-gold" />
            {isAr ? 'لوحة شرف مستشاري المبيعات وتتبع التارجت والعمولات' : 'Sales Leaderboard & Commission Tracker'}
          </h3>
          <p className="section-subtitle" style={{ margin: '4px 0 0' }}>
            {isAr ? 'مراقبة أداء مستشاري المبيعات، تحقيق المستهدف الشهري، وحساب العمولات التلقائية' : 'Track agent performance, targets and calculated commissions'}
          </p>
        </div>

        {/* Commission Rate Settings Pill */}
        <div style={{
          background: 'rgba(255, 179, 0, 0.08)',
          border: '1px solid var(--accent-gold-light)',
          borderRadius: 'var(--radius-pill)',
          padding: '4px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.8rem'
        }}>
          <span style={{ color: 'var(--accent-gold)', fontWeight: 'bold' }}>
            💼 {isAr ? 'نسبة العمولة المعتمدة:' : 'Commission Rate:'}
          </span>
          <select
            value={commissionRate}
            onChange={(e) => setCommissionRate(parseFloat(e.target.value))}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            <option value="1.0">1.0%</option>
            <option value="1.5">1.5%</option>
            <option value="2.0">2.0% (الافتراضي)</option>
            <option value="2.5">2.5%</option>
            <option value="3.0">3.0%</option>
          </select>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="crm-stats-grid" style={{ marginBottom: '24px' }}>
        <div className="crm-stat-card">
          <div className="crm-stat-icon" style={{ background: 'var(--emerald-bg)', color: 'var(--emerald)' }}>
            <DollarSign size={22} />
          </div>
          <div className="crm-stat-info">
            <span className="crm-stat-num">{(totalCompanyClosedVolume / 1000000).toFixed(1)} M</span>
            <span className="crm-stat-lbl">{isAr ? 'إجمالي المبيعات المغلقة' : 'Total Closed Volume (EGP)'}</span>
          </div>
        </div>

        <div className="crm-stat-card">
          <div className="crm-stat-icon" style={{ background: 'var(--accent-gold-light)', color: 'var(--accent-gold)' }}>
            <Award size={22} />
          </div>
          <div className="crm-stat-info">
            <span className="crm-stat-num">{totalCompanyCommission.toLocaleString()}</span>
            <span className="crm-stat-lbl">{isAr ? 'إجمالي العمولات المستحقة (ج.م)' : 'Total Commissions (EGP)'}</span>
          </div>
        </div>

        <div className="crm-stat-card">
          <div className="crm-stat-icon" style={{ background: 'var(--cyan-bg)', color: 'var(--cyan)' }}>
            <Target size={22} />
          </div>
          <div className="crm-stat-info">
            <span className="crm-stat-num">{totalSiteVisits}</span>
            <span className="crm-stat-lbl">{isAr ? 'معاينات ميدانية منجزة' : 'Site Visits Conducted'}</span>
          </div>
        </div>
      </div>

      {/* Leaderboard Table / Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {agentStats.map((agent, index) => (
          <div
            key={agent.id}
            className="agent-rank-card animate-fadeIn"
            style={{
              background: 'var(--bg-card)',
              border: index === 0 ? '2px solid var(--accent-gold)' : '1px solid var(--border-light)',
              borderRadius: 'var(--radius-md)',
              padding: '20px',
              boxShadow: index === 0 ? '0 0 25px rgba(217, 119, 6, 0.15)' : 'var(--shadow-sm)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '14px' }}>
              {/* Agent Identity & Rank */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: index === 0 ? 'var(--gradient-gold)' : 'var(--secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '22px',
                  boxShadow: 'var(--shadow-sm)',
                  flexShrink: 0
                }}>
                  {agent.avatar}
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>{agent.name}</strong>
                    {index === 0 && (
                      <span className="badge" style={{ background: 'var(--accent-gold-light)', color: 'var(--accent-gold)', fontWeight: 'bold' }}>
                        ⭐ {isAr ? 'متصدر المبيعات (Top Closer)' : 'Top Closer'}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {isAr ? agent.title_ar : agent.title_en}
                  </span>
                </div>
              </div>

              {/* Volume & Commission Badges */}
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ textAlign: isAr ? 'left' : 'right' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>
                    {isAr ? 'المبيعات المنفذة:' : 'Closed Deals:'}
                  </span>
                  <strong style={{ fontSize: '1.1rem', color: 'var(--emerald)' }}>
                    {(agent.closedVolume / 1000000).toFixed(2)} M ج.م
                  </strong>
                </div>

                <div style={{
                  background: 'rgba(255, 179, 0, 0.08)',
                  border: '1px solid var(--accent-gold-light)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '8px 14px',
                  textAlign: isAr ? 'left' : 'right'
                }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--accent-gold)', display: 'block', fontWeight: 'bold' }}>
                    {isAr ? 'العمولة المستحقة (' + commissionRate + '%):' : 'Earned Commission:'}
                  </span>
                  <strong style={{ fontSize: '1.05rem', color: 'var(--accent-gold)' }}>
                    {agent.earnedCommission.toLocaleString()} ج.م
                  </strong>
                </div>
              </div>
            </div>

            {/* Target Progress Bar */}
            <div style={{ marginTop: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '6px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>
                  {isAr ? `المستهدف الشهري: ${(agent.target / 1000000).toFixed(0)} مليون ج.م` : `Monthly Target: ${(agent.target / 1000000)}M`}
                </span>
                <strong style={{ color: agent.targetPercent >= 80 ? 'var(--emerald)' : 'var(--accent-gold)' }}>
                  {agent.targetPercent}% {isAr ? 'مكتمل' : 'Achieved'}
                </strong>
              </div>

              <div style={{
                height: '8px',
                background: 'rgba(255,255,255,0.08)',
                borderRadius: '4px',
                overflow: 'hidden'
              }}>
                <div style={{
                  height: '100%',
                  width: `${agent.targetPercent}%`,
                  background: agent.targetPercent >= 80 ? 'var(--gradient-emerald)' : 'var(--gradient-gold)',
                  borderRadius: '4px',
                  transition: 'width 0.6s ease'
                }} />
              </div>
            </div>

            {/* Micro Stats Strip */}
            <div style={{
              display: 'flex',
              gap: '16px',
              marginTop: '12px',
              paddingTop: '10px',
              borderTop: '1px solid rgba(255,255,255,0.05)',
              fontSize: '0.75rem',
              color: 'var(--text-secondary)'
            }}>
              <span>👥 {isAr ? 'إجمالي العملاء:' : 'Leads:'} <strong>{agent.totalLeads}</strong></span>
              <span>🚗 {isAr ? 'المعاينات المنجزة:' : 'Site Visits:'} <strong>{agent.siteVisitsCount}</strong></span>
              <span>💼 {isAr ? 'صفقات قيد الإغلاق:' : 'In Closing:'} <strong>{(agent.pipelineVolume / 1000000).toFixed(1)} M</strong></span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
