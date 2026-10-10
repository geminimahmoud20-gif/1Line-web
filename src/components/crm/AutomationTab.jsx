import { useState } from 'react';
import { routeLeadAutomatically } from '../../utils/leadRoutingEngine';
import { isUnassigned } from '../../utils/crmLeadViews';

/**
 * Automation that really runs:
 *  • Staff alerts are sent by the server (api/notify) when a visitor submits a request;
 *    this card only explains where they are configured.
 *  • "Distribute now" assigns the open, unassigned leads with the same routing rules a new
 *    website lead gets (VIP / commercial / area keywords / round-robin) and saves each one.
 */
export default function AutomationTab({ isAr, leads = [], onUpdateLead, triggerToast }) {
  const [running, setRunning] = useState(false);
  const pending = leads.filter(isUnassigned);

  const distributeNow = () => {
    if (!onUpdateLead || pending.length === 0) return;
    const ok = window.confirm(isAr
      ? `توزيع ${pending.length} عميل غير مُسند على الفرق حسب قواعد التوزيع؟ كل عميل هيتسجل عليه الفريق وسبب التوزيع.`
      : `Assign ${pending.length} unassigned leads to teams using the routing rules?`);
    if (!ok) return;
    setRunning(true);
    // Each assignment counts toward the next one's round-robin balance
    let working = [...leads];
    const perTeam = {};
    for (const lead of pending) {
      const routed = routeLeadAutomatically({ ...lead, assignedTo: 'Unassigned' }, working);
      if (!routed.assignedTo || routed.assignedTo === 'Unassigned') continue;
      onUpdateLead(lead.id, {
        assignedTo: routed.assignedTo,
        routingReason_ar: routed.routingReason_ar,
        routingReason_en: routed.routingReason_en,
      });
      working = working.map((l) => (l.id === lead.id ? { ...l, assignedTo: routed.assignedTo } : l));
      perTeam[routed.assignedTo] = (perTeam[routed.assignedTo] || 0) + 1;
    }
    setRunning(false);
    const done = Object.values(perTeam).reduce((a, b) => a + b, 0);
    const summary = Object.entries(perTeam).map(([team, n]) => `${team}: ${n}`).join(' • ');
    triggerToast(done
      ? (isAr ? `اتوزع ${done} عميل — ${summary}` : `Assigned ${done} leads — ${summary}`)
      : (isAr ? 'مفيش فريق نشط ينفع يستلم (راجع الفرق في الصلاحيات)' : 'No active team can take them (check teams)'), done ? 'success' : 'info');
  };

  return (
    <div className="crm-table-container">
      <h3>{isAr ? 'الأتمتة والتنبيهات' : 'Automation & alerts'}</h3>
      <p className="section-subtitle" style={{ marginBottom: '24px' }}>
        {isAr ? 'اللي بيشتغل لوحده في المنظومة، ومنين يتظبط.' : 'What runs automatically, and where it is configured.'}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        <div className="crm-surface-navy" style={{ background: 'var(--crm-brand-navy)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
          <h4 style={{ marginBottom: '10px', color: 'var(--crm-gold-on-dark)' }}>
            📱 {isAr ? 'تنبيه واتساب للفريق عند كل طلب جديد' : 'WhatsApp alert on every new request'}
          </h4>
          <p style={{ fontSize: 'var(--crm-text-base)', color: 'var(--crm-muted)', marginBottom: '0' }}>
            {isAr
              ? 'السيرفر بيبعت رسالة لرقم الإدارة أول ما زائر يسجّل طلب: نوع الطلب والمنطقة ورابط الطلب في الـ CRM، من غير رقم العميل. بيشتغل لما يكون FIREBASE_SERVICE_ACCOUNT ومتغيرات WHATSAPP_* متسجلين في Vercel. وجوه الـ CRM فيه صوت وإشعار على الجهاز لكل عميل جديد.'
              : 'The server messages the management number when a visitor submits a request (type, area and a CRM link, never the client phone). Needs FIREBASE_SERVICE_ACCOUNT and WHATSAPP_* in Vercel. The CRM also plays a sound and shows a desktop notification.'}
          </p>
        </div>

        <div className="crm-surface-navy" style={{ background: 'var(--crm-brand-navy)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
          <h4 style={{ marginBottom: '10px', color: 'var(--crm-positive)' }}>
            🎯 {isAr ? 'التوزيع التلقائي للعملاء' : 'Automatic lead routing'}
          </h4>
          <p style={{ fontSize: 'var(--crm-text-base)', color: 'var(--crm-muted)', marginBottom: '16px' }}>
            {isAr
              ? 'كل عميل جديد من الموقع بيتوزع لوحده: ميزانية 5 مليون أو أكتر للفريق المخصص للـ VIP، والتجاري لفريقه، وبعدين حسب كلمات المنطقة لكل فريق، والباقي بالدور على الأقل حِملاً. القواعد والفرق بتتظبط من شاشة الصلاحيات.'
              : 'Every new website lead is routed automatically: 5M+ budgets to the VIP team, commercial to its team, then team area keywords, then round-robin. Teams and rules live in the roles screen.'}
          </p>
          <button className="btn btn-accent" type="button" onClick={distributeNow} disabled={running || !onUpdateLead || pending.length === 0}>
            {pending.length === 0
              ? (isAr ? 'مفيش عملاء غير مُسندين' : 'No unassigned leads')
              : (isAr ? `وزّع ${pending.length} عميل غير مُسند دلوقتي` : `Assign ${pending.length} unassigned leads now`)}
          </button>
        </div>
      </div>
    </div>
  );
}
