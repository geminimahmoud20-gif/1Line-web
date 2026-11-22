import { useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { marketingMonthly } from '../../utils/marketingMonthly';
import { loadMonthlySpend, saveMonthlySpend, pullMetaMonthly } from '../../firebaseLazy';
import { Button } from '../ui';
import './performance-report.css';

const num = (n) => Number(n || 0).toLocaleString('en-US');
const money = (n) => (n ? num(n) : '—');
const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const monthName = (key, isAr) => {
  const [y, m] = key.split('-').map(Number);
  return isAr ? `${MONTHS_AR[m - 1]} ${y}` : key;
};

/**
 * «التسويق بالشهر»: per month, what marketing cost (Facebook pulled from the ad account + every other channel typed
 * in) against the clients who arrived that month and how far they got. Managers pull and edit the spend.
 */
export default function MarketingMonthlyPanel({ leads = [], lang = 'ar', canManage = false, triggerToast }) {
  const isAr = lang !== 'en';
  const L = (ar, en) => (isAr ? ar : en);
  const [spend, setSpend] = useState(null); // null: not read (yet, or not allowed)
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [drafts, setDrafts] = useState({});

  useEffect(() => {
    let alive = true;
    loadMonthlySpend().then((m) => { if (alive) setSpend(m); }).catch(() => {}).finally(() => { if (alive) setLoaded(true); });
    return () => { alive = false; };
  }, []);

  const r = useMemo(() => marketingMonthly(leads, spend || {}), [leads, spend]);

  const save = async (next) => {
    setSpend(next);
    const ok = await saveMonthlySpend(next);
    if (!ok) triggerToast?.(L('ما اتحفظش، جرّب تاني', 'Not saved'), 'error');
    return ok;
  };

  const pull = async () => {
    setBusy(true);
    const res = await pullMetaMonthly(12);
    setBusy(false);
    if (!res?.ok) {
      const why = {
        'not-configured': L('السحب من فيسبوك مش متفعّل: محتاج META_ADS_TOKEN و META_AD_ACCOUNT_ID في Vercel.', 'Not set up in Vercel.'),
        'bad-token': L('توكن ميتا مرفوض أو منتهي.', 'Meta rejected the token.'),
        forbidden: L('السحب للمديرين بس.', 'Managers only.'),
        'no-api': L('السحب شغال على الموقع الحقيقي بس.', 'Live site only.'),
      }[res?.error] || L('ميتا ما ردّتش، جرّب تاني.', 'Meta did not answer.');
      triggerToast?.(why, 'error');
      return;
    }
    if (res.currency && res.currency !== 'EGP') triggerToast?.(L(`عملة الحساب الإعلاني ${res.currency} مش جنيه: الأرقام هتتحفظ زي ما هي.`, `Account currency is ${res.currency}.`), 'info');
    const next = { ...(spend || {}) };
    for (const [m, v] of Object.entries(res.months || {})) next[m] = { ...(next[m] || {}), meta: v };
    if (await save(next)) triggerToast?.(L('اتسحب صرف فيسبوك بالشهر', 'Monthly Facebook spend pulled'), 'success');
  };

  const commitOther = async (month) => {
    const raw = drafts[month];
    if (raw === undefined) return;
    const value = Math.max(0, Math.round(Number(String(raw).replace(/[^\d.]/g, '')) || 0));
    setDrafts((d) => { const { [month]: _drop, ...rest } = d; return rest; });
    if (value === (spend?.[month]?.other || 0)) return;
    await save({ ...(spend || {}), [month]: { ...(spend?.[month] || {}), other: value } });
  };

  const t = r.totals;
  return (
    <section className="pr-panel">
      <div className="pr-cards">
        <div className="pr-card"><span className="pr-card__label">{L('الصرف (آخر 6 شهور)', 'Spend (6 months)')}</span><strong className="pr-card__value">{money(t.spend)} {t.spend ? L('ج', 'EGP') : ''}</strong><span className="pr-card__delta">{L(`فيسبوك ${num(t.meta)} · غيره ${num(t.other)}`, `Meta ${num(t.meta)} · other ${num(t.other)}`)}</span></div>
        <div className="pr-card"><span className="pr-card__label">{L('عملاء من الإعلانات', 'Clients from ads')}</span><strong className="pr-card__value">{num(t.ads)}</strong><span className="pr-card__delta">{L(`ملاك ${num(t.adOwners)} · مشترين ${num(t.adBuyers)}`, `owners ${t.adOwners} · buyers ${t.adBuyers}`)}</span></div>
        <div className="pr-card"><span className="pr-card__label">{L('تكلفة العميل المؤهل', 'Cost per qualified')}</span><strong className="pr-card__value">{money(t.costPerQualified)} {t.costPerQualified ? L('ج', 'EGP') : ''}</strong><span className="pr-card__delta">{L(`العميل ${money(t.costPerLead)} · المعاينة ${money(t.costPerVisit)}`, `lead ${money(t.costPerLead)} · viewing ${money(t.costPerVisit)}`)}</span></div>
        <div className="pr-card"><span className="pr-card__label">{L('تكلفة الصفقة', 'Cost per deal')}</span><strong className="pr-card__value">{money(t.costPerDeal)} {t.costPerDeal ? L('ج', 'EGP') : ''}</strong><span className="pr-card__delta">{L(`${num(t.adDeals)} صفقة من الإعلانات`, `${t.adDeals} deals from ads`)}</span></div>
      </div>

      <div className="pr-block">
        <h3>{L('كل شهر: صرفنا كام، وجه كام، ووصلوا لحد فين', 'Each month: spend, clients, how far they got')}</h3>
        {canManage && (
          <div className="pr-actions">
            <Button variant="secondary" size="sm" icon={<RefreshCw size={14} aria-hidden="true" />} onClick={pull} disabled={busy}>{busy ? L('بيسحب…', 'Pulling…') : L('اسحب صرف فيسبوك بالشهر', 'Pull monthly Facebook spend')}</Button>
          </div>
        )}
        <div className="pr-table-wrap">
          <table className="pr-table">
            <thead><tr>
              <th>{L('الشهر', 'Month')}</th><th>{L('فيسبوك', 'Facebook')}</th><th>{L('قنوات تانية', 'Other channels')}</th>
              <th>{L('عملاء جداد', 'New clients')}</th><th>{L('منهم إعلانات', 'From ads')}</th><th>{L('مؤهلين', 'Qualified')}</th><th>{L('معاينات', 'Viewings')}</th><th>{L('صفقات', 'Deals')}</th>
              <th>{L('تكلفة العميل', 'Per client')}</th><th>{L('تكلفة المؤهل', 'Per qualified')}</th><th>{L('تكلفة المعاينة', 'Per viewing')}</th><th>{L('تكلفة الصفقة', 'Per deal')}</th>
            </tr></thead>
            <tbody>
              {r.rows.map((m) => (
                <tr key={m.month}>
                  <th scope="row">{monthName(m.month, isAr)}</th>
                  <td>{money(m.meta)}</td>
                  <td>
                    {canManage && spend !== null ? (
                      <input className="ui-input pr-input" inputMode="numeric" aria-label={L(`صرف القنوات التانية ${monthName(m.month, true)}`, `Other spend ${m.month}`)}
                        value={drafts[m.month] ?? (m.other || '')} placeholder="0"
                        onChange={(e) => setDrafts((d) => ({ ...d, [m.month]: e.target.value }))}
                        onBlur={() => commitOther(m.month)} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }} />
                    ) : money(m.other)}
                  </td>
                  <td>{num(m.leads)} <small>{L(`(ملاك ${m.owners} · مشترين ${m.buyers}${m.accounts ? ` · حسابات ${m.accounts}` : ''})`, `(${m.owners}/${m.buyers})`)}</small></td>
                  <td>{num(m.ads)}</td>
                  <td>{num(m.qualified)} <small>({m.qualifiedPct}%)</small></td>
                  <td>{num(m.visits)} <small>({m.visitPct}%)</small></td>
                  <td>{num(m.deals)}</td>
                  <td>{money(m.costPerLead)}</td><td>{money(m.costPerQualified)}</td><td>{money(m.costPerVisit)}</td><td>{money(m.costPerDeal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="pr-note">
          {L('العملاء محسوبين بشهر وصولهم، ومتابَعين لحد النهارده (عميل وصل في أكتوبر واتقفل في نوفمبر بيتحسب صفقة لأكتوبر). التكلفة = الصرف ÷ عملاء الإعلانات بس، لأن العملاء اللي جم من غير إعلان ما كلّفوش.', 'Clients count in the month they arrived, followed to today. Costs are spend ÷ clients from ads.')}
          {loaded && spend === null && ` ${L('الصرف بيظهر ويتعدّل للمديرين بس.', 'Spend is visible to managers only.')}`}
        </p>
      </div>
    </section>
  );
}
