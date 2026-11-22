import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Wallet, Users, Target, Handshake, Megaphone } from 'lucide-react';
import { marketingMonthly } from '../../utils/marketingMonthly';
import { loadMonthlySpend, saveMonthlySpend, pullMetaMonthly } from '../../firebaseLazy';
import { Button, KpiRow, KpiTile, ColumnChart, AreaChart, BarList, Donut, Badge } from '../ui';
import './report-dash.css';

const num = (n) => Number(n || 0).toLocaleString('en-US');
const money = (n) => (n ? num(n) : '—');
const short = (n) => (n >= 1000 ? `${Math.round(n / 100) / 10}K` : num(n));
const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const monthName = (key, isAr, withYear = true) => {
  const [y, m] = key.split('-').map(Number);
  return isAr ? `${MONTHS_AR[m - 1]}${withYear ? ` ${y}` : ''}` : key;
};

/**
 * «التسويق بالشهر»: per month, what marketing cost (Facebook pulled from the ad account + every other channel typed
 * in) against the clients who arrived that month and how far they got. Managers pull and edit the spend.
 */
export default function MarketingMonthlyPanel({ leads = [], lang = 'ar', canManage = false, triggerToast, initialSpend = null }) {
  const isAr = lang !== 'en';
  const L = (ar, en) => (isAr ? ar : en);
  const [spend, setSpend] = useState(initialSpend); // null: not read (yet, or not allowed)
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
  const oldestFirst = [...r.rows].reverse();
  const labels = oldestFirst.map((m) => monthName(m.month, isAr, false));
  const trend = (k) => oldestFirst.map((m) => m[k]);
  const thisMonth = r.rows[0];

  return (
    <div className="rd">
      <KpiRow label={L('أرقام التسويق', 'Marketing figures')}>
        <KpiTile label={L('الصرف (آخر 6 شهور)', 'Spend (6 months)')} value={t.spend || null} unit={L('ج', 'EGP')} icon={<Wallet size={18} />} tone="accent" trend={trend('spend')} hint={L(`الشهر ده ${money(thisMonth.spend)}`, `this month ${money(thisMonth.spend)}`)} emptyText={L('مش متسجّل', 'not entered')} />
        <KpiTile label={L('عملاء من الإعلانات', 'Clients from ads')} value={t.ads} icon={<Users size={18} />} tone="info" trend={trend('ads')} hint={L(`ملاك ${num(t.adOwners)} · مشترين ${num(t.adBuyers)}`, `owners ${t.adOwners} · buyers ${t.adBuyers}`)} />
        <KpiTile label={L('تكلفة العميل المؤهل', 'Cost per qualified')} value={t.costPerQualified || null} unit={L('ج', 'EGP')} icon={<Target size={18} />} tone="success" trend={trend('costPerQualified')} hint={L(`العميل ${money(t.costPerLead)} · المعاينة ${money(t.costPerVisit)}`, `lead ${money(t.costPerLead)}`)} emptyText="—" />
        <KpiTile label={L('تكلفة الصفقة', 'Cost per deal')} value={t.costPerDeal || null} unit={L('ج', 'EGP')} icon={<Handshake size={18} />} tone="warning" hint={L(`${num(t.adDeals)} صفقة من الإعلانات`, `${t.adDeals} deals from ads`)} emptyText="—" />
      </KpiRow>

      <div className="rd-grid">
        <section className="rd-card" aria-labelledby="mk-spend">
          <div className="rd-card__head">
            <div>
              <h3 id="mk-spend" className="rd-card__title">{L('الصرف بالشهر', 'Spend by month')}</h3>
              <p className="rd-card__sub">{L('فيسبوك (من الحساب الإعلاني) والقنوات التانية', 'Facebook and other channels')}</p>
            </div>
            {canManage && (
              <Button variant="secondary" size="sm" icon={<RefreshCw size={14} aria-hidden="true" />} onClick={pull} disabled={busy}>{busy ? L('بيسحب…', 'Pulling…') : L('اسحب صرف فيسبوك', 'Pull Facebook spend')}</Button>
            )}
          </div>
          <ColumnChart labels={labels} valueText={short} ariaLabel={L('الصرف بالشهر', 'Spend by month')} series={[
            { id: 'meta', label: L('فيسبوك', 'Facebook'), values: trend('meta'), tone: 'info' },
            { id: 'other', label: L('قنوات تانية', 'Other'), values: trend('other'), tone: 'accent' },
          ]} />
        </section>

        <section className="rd-card" aria-labelledby="mk-funnel">
          <div>
            <h3 id="mk-funnel" className="rd-card__title">{L('عملاء الإعلانات وصلوا لحد فين', 'How far ad clients got')}</h3>
            <p className="rd-card__sub">{L('آخر 6 شهور، وكل خطوة بتكلفتها', 'Last 6 months, with the cost of each step')}</p>
          </div>
          <BarList ariaLabel={L('قمع عملاء الإعلانات', 'Ad clients funnel')} items={[
            { id: 'ads', label: L('عملاء من الإعلانات', 'From ads'), value: t.ads, note: t.costPerLead ? `${num(t.costPerLead)} ج` : '', tone: 'info' },
            { id: 'q', label: L('مؤهلين', 'Qualified'), value: t.adQualified, note: t.costPerQualified ? `${num(t.costPerQualified)} ج` : '', tone: 'accent' },
            { id: 'v', label: L('معاينات', 'Viewings'), value: t.adVisits, note: t.costPerVisit ? `${num(t.costPerVisit)} ج` : '', tone: 'success' },
            { id: 'd', label: L('صفقات', 'Deals'), value: t.adDeals, note: t.costPerDeal ? `${num(t.costPerDeal)} ج` : '', tone: 'warning' },
          ]} />
          {t.adOwners + t.adBuyers > 0 && (
            <Donut size={112} centerLabel={L('من الإعلانات', 'from ads')} ariaLabel={L('ملاك ومشترين من الإعلانات', 'Owners and buyers from ads')}
              items={[{ id: 'b', label: L('مشترين', 'Buyers'), value: t.adBuyers }, { id: 'o', label: L('ملاك', 'Owners'), value: t.adOwners }]} />
          )}
        </section>
      </div>

      <section className="rd-card" aria-labelledby="mk-clients">
        <div>
          <h3 id="mk-clients" className="rd-card__title"><Megaphone size={18} aria-hidden="true" /> {L('العملاء الجداد بالشهر وجودتهم', 'New clients by month')}</h3>
          <p className="rd-card__sub">{L('كل العملاء (إعلانات وغيرها)، متابَعين لحد النهارده', 'All clients, followed to today')}</p>
        </div>
        <AreaChart smooth labels={labels} ariaLabel={L('العملاء الجداد والمؤهلين والمعاينات بالشهر', 'New, qualified and viewings by month')} series={[
          { id: 'leads', label: L('عملاء جداد', 'New clients'), values: trend('leads'), tone: 'info' },
          { id: 'q', label: L('مؤهلين', 'Qualified'), values: trend('qualified'), tone: 'accent' },
          { id: 'v', label: L('معاينات', 'Viewings'), values: trend('visits'), tone: 'success' },
        ]} />
      </section>

      <section className="rd-card" aria-labelledby="mk-table">
        <div>
          <h3 id="mk-table" className="rd-card__title">{L('التفاصيل شهر بشهر', 'Month by month')}</h3>
          <p className="rd-card__sub">{canManage && spend !== null ? L('اكتب صرف القنوات التانية (جوجل، بوابات، مطبوعات) في خانة الشهر', 'Type other channels’ spend per month') : L('التكلفة = الصرف ÷ عملاء الإعلانات', 'Cost = spend ÷ clients from ads')}</p>
        </div>
        <div className="rd-table-wrap">
          <table className="rd-table">
            <thead><tr>
              <th>{L('الشهر', 'Month')}</th><th>{L('فيسبوك', 'Facebook')}</th><th>{L('قنوات تانية', 'Other')}</th><th>{L('عملاء جداد', 'New')}</th><th>{L('إعلانات', 'Ads')}</th>
              <th>{L('مؤهلين', 'Qualified')}</th><th>{L('معاينات', 'Viewings')}</th><th>{L('صفقات', 'Deals')}</th><th>{L('تكلفة المؤهل', 'Per qualified')}</th><th>{L('تكلفة الصفقة', 'Per deal')}</th>
            </tr></thead>
            <tbody>
              {r.rows.map((m) => (
                <tr key={m.month}>
                  <th scope="row">{monthName(m.month, isAr)}</th>
                  <td>{money(m.meta)}</td>
                  <td>
                    {canManage && spend !== null ? (
                      <input className="ui-input rd-input" inputMode="numeric" aria-label={L(`صرف القنوات التانية ${monthName(m.month, true)}`, `Other spend ${m.month}`)}
                        value={drafts[m.month] ?? (m.other || '')} placeholder="0"
                        onChange={(e) => setDrafts((d) => ({ ...d, [m.month]: e.target.value }))}
                        onBlur={() => commitOther(m.month)} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }} />
                    ) : money(m.other)}
                  </td>
                  <td>{num(m.leads)} <small>({L('ملاك', 'o')} {m.owners} · {L('مشترين', 'b')} {m.buyers})</small></td>
                  <td>{num(m.ads)}</td>
                  <td>{num(m.qualified)} <Badge tone={m.qualifiedPct >= 40 ? 'success' : m.qualifiedPct >= 25 ? 'warning' : 'neutral'}>{m.qualifiedPct}%</Badge></td>
                  <td>{num(m.visits)} <small>({m.visitPct}%)</small></td>
                  <td>{num(m.deals)}</td>
                  <td>{money(m.costPerQualified)}</td>
                  <td>{money(m.costPerDeal)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr>
              <th scope="row">{L('الإجمالي', 'Total')}</th><td>{money(t.meta)}</td><td>{money(t.other)}</td><td>{num(t.leads)}</td><td>{num(t.ads)}</td>
              <td>{num(t.qualified)} <small>({t.qualifiedPct}%)</small></td><td>{num(t.visits)}</td><td>{num(t.deals)}</td><td>{money(t.costPerQualified)}</td><td>{money(t.costPerDeal)}</td>
            </tr></tfoot>
          </table>
        </div>
        <p className="rd-note">
          {L('العملاء محسوبين بشهر وصولهم ومتابَعين لحد النهارده (عميل وصل في أكتوبر واتقفل في نوفمبر بيتحسب صفقة لأكتوبر). التكلفة على عملاء الإعلانات بس، لأن اللي جم من غير إعلان ما كلّفوش.', 'Clients count in the month they arrived. Costs are over clients from ads.')}
          {loaded && spend === null && ` ${L('الصرف بيظهر ويتعدّل للمديرين بس.', 'Spend is visible to managers only.')}`}
        </p>
      </section>
    </div>
  );
}
