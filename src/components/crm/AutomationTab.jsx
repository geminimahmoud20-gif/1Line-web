import { useEffect, useState } from 'react';
import { loadSettings, saveSettings } from '../../firebaseLazy';
import { listTeamMembers } from '../../firebaseService';
import { sellersOf } from '../../../api/_assign-core.js';
import { routeLeadAutomatically } from '../../utils/leadRoutingEngine';
import { isUnassigned } from '../../utils/crmLeadViews';
import { useConfirm } from '../ui';
import './automation.css';

/**
 * Automation that really runs:
 *  • Staff alerts are sent by the server (api/notify) when a visitor submits a request;
 *    this card only explains where they are configured.
 *  • "Distribute now" assigns the open, unassigned leads with the same routing rules a new
 *    website lead gets (VIP / commercial / area keywords / round-robin) and saves each one.
 */
export default function AutomationTab({ isAr, leads = [], onUpdateLead, triggerToast }) {
  const confirm = useConfirm();
  const [running, setRunning] = useState(false);
  const pending = leads.filter(isUnassigned);

  // «توزيع تلقائي على البياعين» (api/assign.js): on unless settings/automation says autoAssign: false
  const [autoAssign, setAutoAssign] = useState(null); // null: not known yet
  const [sellerCount, setSellerCount] = useState(null);
  useEffect(() => {
    let alive = true;
    loadSettings('automation').then((s) => { if (alive) setAutoAssign(s?.autoAssign !== false); }).catch(() => alive && setAutoAssign(true));
    listTeamMembers().then((r) => { if (alive && r?.ok && Array.isArray(r.members)) setSellerCount(sellersOf(r.members).length); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  const toggleAutoAssign = async () => {
    const next = !autoAssign;
    setAutoAssign(next);
    const saved = await saveSettings('automation', { autoAssign: next });
    if (!saved) {
      setAutoAssign(!next);
      triggerToast(isAr ? 'مقدرناش نحفظ الإعداد' : 'Could not save the setting', 'error');
    }
  };

  const distributeNow = async () => {
    if (!onUpdateLead || pending.length === 0) return;
    const ok = await confirm({ message: isAr
      ? `توزيع ${pending.length} عميل غير مُسند على الفرق حسب قواعد التوزيع؟ كل عميل هيتسجل عليه الفريق وسبب التوزيع.`
      : `Assign ${pending.length} unassigned leads to teams using the routing rules?`, tone: 'danger' });
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
            {isAr ? 'تنبيه واتساب للفريق عند كل طلب جديد' : 'WhatsApp alert on every new request'}
          </h4>
          <p style={{ fontSize: 'var(--crm-text-base)', color: 'var(--crm-muted)', marginBottom: '0' }}>
            {isAr
              ? 'السيرفر بيبعت رسالة لرقم الإدارة أول ما زائر يسجّل طلب: نوع الطلب والمنطقة ورابط الطلب في الـ CRM، من غير رقم العميل. بيشتغل لما يكون FIREBASE_SERVICE_ACCOUNT ومتغيرات WHATSAPP_* متسجلين في Vercel. وجوه الـ CRM فيه صوت وإشعار على الجهاز لكل عميل جديد.'
              : 'The server messages the management number when a visitor submits a request (type, area and a CRM link, never the client phone). Needs FIREBASE_SERVICE_ACCOUNT and WHATSAPP_* in Vercel. The CRM also plays a sound and shows a desktop notification.'}
          </p>
        </div>

        <div className="crm-surface-navy" style={{ background: 'var(--crm-brand-navy)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
          <h4 style={{ marginBottom: '10px', color: 'var(--crm-positive)' }}>
            {isAr ? 'التوزيع التلقائي للعملاء' : 'Automatic lead routing'}
          </h4>
          <p style={{ fontSize: 'var(--crm-text-base)', color: 'var(--crm-muted)', marginBottom: '16px' }}>
            {isAr
              ? 'كل عميل جديد من الموقع بيتوزع لوحده: ميزانية 5 مليون أو أكتر للفريق المخصص للـ VIP، والتجاري لفريقه، وبعدين حسب كلمات المنطقة لكل فريق، والباقي بالدور على الأقل حِملاً. القواعد والفرق بتتظبط من شاشة الصلاحيات.'
              : 'Every new website lead is routed automatically: 5M+ budgets to the VIP team, commercial to its team, then team area keywords, then round-robin. Teams and rules live in the roles screen.'}
          </p>
          <div className="crm-auto-assign">
            <label className="crm-auto-assign__row">
              <input type="checkbox" checked={autoAssign !== false} disabled={autoAssign === null} onChange={toggleAutoAssign} />
              <span>{isAr ? 'وزّع كل عميل جديد من الموقع على بياع بالاسم (الأقل عملاء مفتوحين في فريقه)' : 'Give each new website client to a salesperson by name (fewest open clients on their team)'}</span>
            </label>
            {sellerCount === 0 && (
              <p className="crm-auto-assign__warn" role="alert">
                {isAr ? 'مفيش بياعين بحسابات على فرق (دور يقدر يعدّل العملاء ومش مدير)، فالتوزيع على البياعين مش هيشتغل. ضيف بياعين من الفريق والصلاحيات.' : 'No salespeople with an account on a team, so assigning to a person will not run. Add some in Team & roles.'}
              </p>
            )}
            {sellerCount > 0 && <p className="crm-auto-assign__note">{isAr ? `${sellerCount} بياع في التوزيع. بيتسجّل كل توزيع في سجل المراجعة.` : `${sellerCount} salespeople in rotation. Each assignment is in the audit log.`}</p>}
          </div>
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
