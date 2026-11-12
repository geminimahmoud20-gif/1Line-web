import { useMemo, useState } from 'react';
import { Megaphone } from 'lucide-react';
import { campaignReport, campaignTotals, PERIODS } from '../../utils/campaignReport';
import { EmptyState } from '../ui';
import './campaign-report.css';

const SPEND_KEY = 'crm_campaign_spend_v1';
const readSpend = () => { try { return JSON.parse(localStorage.getItem(SPEND_KEY) || '{}') || {}; } catch { return {}; } };
const fmt = (n) => (n ? Number(n).toLocaleString('en-US') : '—');

/** «تقرير الحملات»: what each ad brought, how far those clients got, and what that cost. */
export default function CampaignReportPanel({ leads = [], lang = 'ar' }) {
  const isAr = lang === 'ar';
  const L = (ar, en) => (isAr ? ar : en);
  const [by, setBy] = useState('campaign');
  const [period, setPeriod] = useState('30');
  const [spend, setSpend] = useState(readSpend);

  const rows = useMemo(
    () => campaignReport(leads, { by, days: PERIODS.find((p) => p.id === period)?.days || 0, spend }),
    [leads, by, period, spend]
  );
  const totals = useMemo(() => campaignTotals(rows), [rows]);

  // Kept on this device only (no shared store for it yet), so the note below says so
  const setRowSpend = (key, value) => {
    const n = Math.max(0, Math.round(Number(String(value).replace(/[^\d.]/g, '')) || 0));
    const next = { ...spend, [key]: n };
    if (!n) delete next[key];
    setSpend(next);
    try { localStorage.setItem(SPEND_KEY, JSON.stringify(next)); } catch { /* private mode: this visit only */ }
  };

  return (
    <div className="crm-table-container cr-panel">
      <header className="cr-head">
        <h2><Megaphone size={20} aria-hidden="true" /> {L('تقرير الحملات', 'Campaign report')}</h2>
        <p>{L('كل حملة جابت كام عميل، وكام منهم وصل لمعاينة وإغلاق. اكتب المصروف عشان تشوف تكلفة العميل وتكلفة المعاينة.', 'Leads, visits and closings per campaign, with cost per lead and per visit once you enter the spend.')}</p>
      </header>

      <div className="cr-controls">
        <div className="cr-seg" role="radiogroup" aria-label={L('التجميع', 'Group by')}>
          {[['campaign', L('بالحملة', 'By campaign')], ['ad', L('بالإعلان / الفيديو', 'By ad')]].map(([id, label]) => (
            <button key={id} type="button" role="radio" aria-checked={by === id} className={by === id ? 'is-on' : ''} onClick={() => setBy(id)}>{label}</button>
          ))}
        </div>
        <div className="cr-seg" role="radiogroup" aria-label={L('الفترة', 'Period')}>
          {PERIODS.map((p) => (
            <button key={p.id} type="button" role="radio" aria-checked={period === p.id} className={period === p.id ? 'is-on' : ''} onClick={() => setPeriod(p.id)}>{isAr ? p.ar : p.en}</button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<Megaphone size={22} />}
          title={L('مفيش عملاء من حملات في الفترة دي', 'No campaign leads in this period')}
          description={L('أي عميل يدخل من لينك فيه utm_campaign هيظهر هنا بحملته. استخدم لينكات الحملة اللي في الدليل.', 'Leads that arrive through a link with utm_campaign appear here.')}
        />
      ) : (
        <>
          <div className="cr-totals">
            <div><b>{totals.leads}</b><span>{L('عميل', 'Leads')}</span></div>
            <div><b>{totals.visits}</b><span>{L('وصل لمعاينة', 'Reached a visit')}</span></div>
            <div><b>{totals.closed}</b><span>{L('اتقفل', 'Closed')}</span></div>
            <div><b>{fmt(totals.costPerLead)}</b><span>{L('تكلفة العميل (ج.م)', 'Cost / lead')}</span></div>
            <div><b>{fmt(totals.costPerVisit)}</b><span>{L('تكلفة المعاينة (ج.م)', 'Cost / visit')}</span></div>
          </div>

          <ul className="cr-rows">
            {rows.map((r) => (
              <li key={r.key} className="cr-row">
                <div className="cr-name">
                  <strong>{r.campaign}</strong>
                  {by === 'ad' && <span>{r.ad}</span>}
                  {r.source && <small>{r.source}</small>}
                </div>
                <dl className="cr-nums">
                  <div><dt>{L('عملاء', 'Leads')}</dt><dd>{r.leads}</dd></div>
                  <div><dt>{L('اتكلّم', 'Contacted')}</dt><dd>{r.contacted}</dd></div>
                  <div><dt>{L('معاينة', 'Visits')}</dt><dd>{r.visits}{r.leads ? <small> ({r.visitRate}%)</small> : null}</dd></div>
                  <div><dt>{L('اتقفل', 'Closed')}</dt><dd>{r.closed}</dd></div>
                  <div><dt>{L('ضاع', 'Lost')}</dt><dd>{r.lost}</dd></div>
                </dl>
                <div className="cr-money">
                  <label>
                    <span>{L('المصروف (ج.م)', 'Spend (EGP)')}</span>
                    <input type="text" inputMode="numeric" value={r.spend || ''} placeholder="0" onChange={(e) => setRowSpend(r.key, e.target.value)} />
                  </label>
                  <div><span>{L('تكلفة العميل', 'Cost / lead')}</span><b>{fmt(r.costPerLead)}</b></div>
                  <div><span>{L('تكلفة المعاينة', 'Cost / visit')}</span><b>{fmt(r.costPerVisit)}</b></div>
                </div>
              </li>
            ))}
          </ul>
          <p className="cr-note">{L('المصروف بيتحفظ على الجهاز ده بس. الأرقام من العملاء المسجّلين في الـ CRM، فبتشمل اللي ما وافقوش على أي حاجة وكمان اللي مجاوبوش.', 'Spend is saved on this device only. Counts come from the leads in the CRM.')}</p>
        </>
      )}
    </div>
  );
}
