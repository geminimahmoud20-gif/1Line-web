import { useMemo, useState } from 'react';
import { RefreshCw, TrendingUp, AlertTriangle, Lightbulb, CheckCircle2 } from 'lucide-react';
import { pullMetaPerformance } from '../../firebaseLazy';
import { adsTotals, adsFindings, campaignHealth, campaignRates } from '../../utils/adsInsights';
import './ads-performance.css';

// «أداء الإعلانات»: what the Facebook / Instagram campaigns spent and got (spend, reach, clicks, leads, messages),
// straight from Meta (api/ads-spend.js, mode 'performance'), with what to do next. It does not need the CRM's own
// campaign tagging, so it works even before any lead carries a utm_campaign.

const PRESETS = [
  { id: 'last_7d', ar: 'آخر ٧ أيام', en: 'Last 7 days' },
  { id: 'last_30d', ar: 'آخر ٣٠ يوم', en: 'Last 30 days' },
  { id: 'maximum', ar: 'من البداية', en: 'All time' }
];
const SORTS = [
  { id: 'spend', ar: 'الأكثر صرفًا', en: 'Most spend' },
  { id: 'results', ar: 'الأكثر نتائج', en: 'Most results' },
  { id: 'cpr', ar: 'الأرخص نتيجة', en: 'Cheapest result' }
];
const CACHE = 'crm_ads_perf_v1_';
const readCache = (preset) => { try { return JSON.parse(localStorage.getItem(CACHE + preset) || 'null'); } catch { return null; } };
const nf = (n) => Math.round(n).toLocaleString('en-US');
const TONE_ICON = { warn: AlertTriangle, good: CheckCircle2, info: Lightbulb };

export default function AdsPerformance({ lang = 'ar' }) {
  const isAr = lang === 'ar';
  const L = (ar, en) => (isAr ? ar : en);
  const [preset, setPreset] = useState('last_30d');
  const [sort, setSort] = useState('spend');
  const [store, setStore] = useState(() => Object.fromEntries(PRESETS.map((p) => [p.id, readCache(p.id)]))); // { preset: { at, campaigns } }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showAll, setShowAll] = useState(false);
  const data = store[preset] || null;
  const pickPreset = (id) => { setPreset(id); setError(''); setShowAll(false); };

  const refresh = async () => {
    setBusy(true);
    setError('');
    const r = await pullMetaPerformance(preset);
    setBusy(false);
    if (!r.ok) {
      setError({
        'not-configured': L('الربط مع ميتا مش متفعّل لسه (META_ADS_TOKEN و META_AD_ACCOUNT_ID في Vercel).', 'Meta is not connected yet.'),
        'bad-token': L('توكن ميتا مرفوض أو منتهي. ولّد توكن جديد وحدّثه في Vercel.', 'Meta rejected the token.'),
        forbidden: L('الشاشة دي لمديري المبيعات والمدير العام.', 'Managers only.'),
        'no-api': L('بتشتغل على الموقع الحقيقي بس.', 'Works on the live site only.'),
        network: L('مفيش نت. جرّب تاني.', 'Offline.')
      }[r.error] || L(`ميتا ردّت بخطأ${r.detail ? `: ${r.detail}` : ''}.`, 'Meta returned an error.'));
      return;
    }
    if (r.currency && r.currency !== 'EGP') {
      setError(L(`عملة الحساب الإعلاني ${r.currency === 'MIXED' ? 'مختلطة' : r.currency}، والأرقام هنا بالجنيه. ما اتعرضش حاجة.`, 'The ad account is not in EGP.'));
      return;
    }
    const next = { at: Date.now(), campaigns: r.campaigns || [] };
    setStore((st) => ({ ...st, [preset]: next }));
    try { localStorage.setItem(CACHE + preset, JSON.stringify(next)); } catch { /* this visit only */ }
  };

  const campaigns = useMemo(() => data?.campaigns || [], [data]);
  const totals = useMemo(() => adsTotals(campaigns), [campaigns]);
  const findings = useMemo(() => adsFindings(campaigns), [campaigns]);
  const rows = useMemo(() => {
    const list = campaigns.map((c) => ({ ...c, ...campaignRates(c), health: campaignHealth(c, totals) }));
    const by = {
      spend: (a, b) => b.spend - a.spend,
      results: (a, b) => b.results - a.results || b.spend - a.spend,
      cpr: (a, b) => (a.results ? 0 : 1) - (b.results ? 0 : 1) || a.cpr - b.cpr || b.spend - a.spend
    }[sort];
    return list.sort(by);
  }, [campaigns, totals, sort]);
  const shown = showAll ? rows : rows.slice(0, 12);
  const maxSpend = rows.reduce((m, r) => Math.max(m, r.spend), 0) || 1;
  const when = data?.at ? new Intl.DateTimeFormat('ar-EG-u-nu-latn', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true }).format(new Date(data.at)) : '';

  return (
    <section className="ap" aria-label={L('أداء الإعلانات من ميتا', 'Ad performance from Meta')}>
      <header className="ap__head">
        <h3><TrendingUp size={16} aria-hidden="true" /> {L('أداء الإعلانات (من ميتا)', 'Ad performance (from Meta)')}</h3>
        <div className="ap__tools">
          <div className="cr-seg" role="radiogroup" aria-label={L('الفترة', 'Period')}>
            {PRESETS.map((p) => (
              <button key={p.id} type="button" role="radio" aria-checked={preset === p.id} className={preset === p.id ? 'is-on' : ''} onClick={() => pickPreset(p.id)}>{isAr ? p.ar : p.en}</button>
            ))}
          </div>
          <button type="button" className="ui-btn ui-btn--primary ui-btn--sm" onClick={refresh} disabled={busy}>
            <RefreshCw size={14} aria-hidden="true" className={busy ? 'animate-spin' : ''} /> {busy ? L('بيحدّث…', 'Updating…') : L('حدّث من ميتا', 'Update from Meta')}
          </button>
        </div>
      </header>
      {error && <p role="alert" className="ap__error">{error}</p>}

      {!campaigns.length ? (
        <p className="ap__empty">{data ? L('ميتا ما رجّعتش حملات صرفت في الفترة دي.', 'No campaigns with spend in this period.') : L('دوس «حدّث من ميتا» عشان تشوف الصرف والنتائج وتوصيات التحسين.', 'Press “Update from Meta” to see spend, results and recommendations.')}</p>
      ) : (
        <>
          <dl className="ap__kpis">
            <div><dt>{L('الصرف', 'Spend')}</dt><dd>{nf(totals.spend)} <small>{L('ج.م', 'EGP')}</small></dd></div>
            <div><dt>{L('النتائج', 'Results')}</dt><dd>{nf(totals.results)} <small>{totals.messages ? L(`${nf(totals.leads)} عميل + ${nf(totals.messages)} محادثة`, '') : ''}</small></dd></div>
            <div><dt>{L('تكلفة النتيجة', 'Cost / result')}</dt><dd>{totals.results ? nf(totals.cpr) : '—'} <small>{totals.results ? L('ج.م', 'EGP') : ''}</small></dd></div>
            <div><dt>{L('ظهور', 'Impressions')}</dt><dd>{nf(totals.impressions)}</dd></div>
            <div><dt>{L('نسبة النقر', 'CTR')}</dt><dd>{totals.ctr.toFixed(2)}<small>%</small></dd></div>
            <div><dt>{L('تكلفة النقرة', 'CPC')}</dt><dd>{totals.linkClicks ? totals.cpc.toFixed(1) : '—'}</dd></div>
          </dl>

          {findings.length > 0 && (
            <div className="ap__findings">
              <h4>{L('توصيات من الأرقام', 'What the numbers suggest')}</h4>
              <ul>
                {findings.map((f, i) => {
                  const Icon = TONE_ICON[f.tone] || Lightbulb;
                  return <li key={i} className={`is-${f.tone}`}><Icon size={15} aria-hidden="true" /><span>{f.text}</span></li>;
                })}
              </ul>
            </div>
          )}

          <div className="ap__tablehead">
            <h4>{L(`الحملات (${rows.length})`, `Campaigns (${rows.length})`)}</h4>
            <label className="ap__sort"><span>{L('رتّب', 'Sort')}</span>
              <select value={sort} onChange={(e) => setSort(e.target.value)}>{SORTS.map((s) => <option key={s.id} value={s.id}>{isAr ? s.ar : s.en}</option>)}</select>
            </label>
          </div>
          <div className="ap__scroll">
            <table className="ap__table">
              <thead>
                <tr>
                  <th>{L('الحملة', 'Campaign')}</th>
                  <th>{L('الصرف', 'Spend')}</th>
                  <th>{L('النتائج', 'Results')}</th>
                  <th>{L('تكلفة النتيجة', 'Cost/result')}</th>
                  <th>{L('نسبة النقر', 'CTR')}</th>
                  <th>{L('تكرار', 'Freq.')}</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.id} className={`is-${r.health}`}>
                    <td data-label={L('الحملة', 'Campaign')}><bdi className="ap__name">{r.name}</bdi><span className="ap__bar" aria-hidden="true"><i style={{ width: `${Math.max(3, (r.spend / maxSpend) * 100)}%` }} /></span></td>
                    <td data-label={L('الصرف', 'Spend')}>{nf(r.spend)}</td>
                    <td data-label={L('النتائج', 'Results')}>{r.results ? nf(r.results) : <span className="ap__zero">0</span>}</td>
                    <td data-label={L('تكلفة النتيجة', 'Cost/result')}>{r.results ? nf(r.cpr) : '—'}</td>
                    <td data-label={L('نسبة النقر', 'CTR')}>{r.impressions ? `${r.ctr.toFixed(2)}%` : '—'}</td>
                    <td data-label={L('تكرار', 'Freq.')}>{r.frequency ? r.frequency : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > 12 && (
            <button type="button" className="ui-btn ui-btn--secondary ui-btn--sm ap__more" onClick={() => setShowAll((v) => !v)}>{showAll ? L('اعرض أقل', 'Show less') : L(`اعرض كل الحملات (${rows.length})`, `Show all (${rows.length})`)}</button>
          )}
          <p className="ap__foot">{L('الأرقام من ميتا مباشرة', 'Numbers straight from Meta')}{when ? ` · ${L('آخر تحديث', 'updated')} ${when}` : ''}. {L('«النتائج» = عملاء محتملين + محادثات رسائل، حسب هدف كل حملة.', '“Results” = leads + message conversations, by each campaign’s goal.')}</p>
        </>
      )}
    </section>
  );
}
