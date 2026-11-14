import { useEffect, useMemo, useRef, useState } from 'react';
import { Megaphone, Copy, Link2, RefreshCw } from 'lucide-react';
import { campaignReport, campaignTotals, typeSummary, PERIODS } from '../../utils/campaignReport';
import { LOST_REASONS } from '../../utils/crmLeadViews';
import { loadCampaignSpend, saveCampaignSpend, loadCampaignLinks, saveCampaignLinks, pullMetaSpend, subscribeToContactIntents } from '../../firebaseLazy';
import { EmptyState } from '../ui';
import { LANDINGS, PLATFORMS, CAMPAIGN_TYPES, buildUtmLink, slugify, typedCampaignName } from '../../utils/utmLinks';
import { SITE_URL } from '../../config/siteConfig';
import { applyPull } from '../../../api/_meta-spend-core.js';
import AdsPerformance from './AdsPerformance';
import './campaign-report.css';

const SPEND_KEY = 'crm_campaign_spend_v1';
const readSpend = () => { try { return JSON.parse(localStorage.getItem(SPEND_KEY) || '{}') || {}; } catch { return {}; } };
const fmt = (n) => (n ? Number(n).toLocaleString('en-US') : '—');

/** Makes the ad link that the report below reads (the guide used to be a document outside the CRM) */
function LinkBuilder({ L, onCopied, properties = [] }) {
  const [kind, setKind] = useState('buyers'); // one of CAMPAIGN_TYPES, or '' for a free name
  const [path, setPath] = useState(LANDINGS[0].path);
  const [unitId, setUnitId] = useState('');
  const [platform, setPlatform] = useState('facebook');
  const [campaign, setCampaign] = useState('');
  const [content, setContent] = useState('');
  const type = CAMPAIGN_TYPES.find((t) => t.id === kind);
  const isUnit = kind === 'unit';
  // Listings a visitor can open: not hidden, drafts, sold, in the trash or waiting for approval
  const units = useMemo(() => properties.filter((p) => p?.id && !p.isDemo && !p.deleted && !p.isDeleted
    && !['trash', 'hidden', 'draft', 'sold'].includes(p.status) && !['pending', 'rejected'].includes(p.approval)), [properties]);
  const unit = units.find((u) => String(u.id) === unitId);
  const landingPath = isUnit ? (unit ? `/properties/${unit.id}` : '') : path;
  const nameInput = isUnit && !campaign.trim() && unit ? String(unit.code || unit.id) : campaign;
  const finalCampaign = typedCampaignName(kind, nameInput);
  const link = landingPath ? buildUtmLink({ siteUrl: SITE_URL, path: landingPath, platform, campaign: finalCampaign, content }) : '';
  const typedButEmpty = campaign.trim() && !slugify(campaign);
  const landing = LANDINGS.find((l) => l.path === path);
  const pickKind = (id) => {
    setKind(id);
    const t = CAMPAIGN_TYPES.find((x) => x.id === id);
    if (t && t.landing !== 'unit') setPath(t.landing);
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); onCopied(true); } catch { onCopied(false); }
  };
  return (
    <details className="cr-builder">
      <summary><Link2 size={16} aria-hidden="true" /> {L('جهّز لينك إعلان', 'Build an ad link')}</summary>
      <div className="cr-builder__grid">
        <label><span>{L('نوع الإعلان', 'Kind of ad')}</span>
          <select value={kind} onChange={(e) => pickKind(e.target.value)}>
            {CAMPAIGN_TYPES.map((t) => <option key={t.id} value={t.id}>{t.ar}</option>)}
            <option value="">{L('حر (اسم من عندك)', 'Free name')}</option>
          </select>
        </label>
        {isUnit ? (
          <label><span>{L('الوحدة', 'Listing')}</span>
            <select value={unitId} onChange={(e) => setUnitId(e.target.value)}>
              <option value="">{L('اختار وحدة معروضة…', 'Pick a listing…')}</option>
              {units.map((u) => <option key={u.id} value={String(u.id)}>{(u.title_ar || u.title_en || u.code || u.id)}</option>)}
            </select>
          </label>
        ) : (
          <label><span>{L('الإعلان بيودّي لفين؟', 'Where does the ad land?')}</span>
            <select value={path} onChange={(e) => setPath(e.target.value)}>{LANDINGS.map((l) => <option key={l.path} value={l.path}>{l.ar}</option>)}</select>
          </label>
        )}
        <label><span>{L('المنصة', 'Platform')}</span>
          <select value={platform} onChange={(e) => setPlatform(e.target.value)}>{PLATFORMS.map((p) => <option key={p.id} value={p.id}>{p.ar}</option>)}</select>
        </label>
        <label><span>{type ? L(`اسم الحملة (بعد «${type.prefix}-»)`, `Campaign name (after “${type.prefix}-”)`) : L('اسم الحملة (إنجليزي)', 'Campaign name (Latin)')}</span>
          <input value={campaign} onChange={(e) => setCampaign(e.target.value)} placeholder={isUnit ? L('اختياري: كود الوحدة', 'optional') : 'sohag-nov'} dir="ltr" />
        </label>
        <label><span>{L('اسم الإعلان أو الفيديو (اختياري)', 'Ad / video (optional)')}</span>
          <input value={content} onChange={(e) => setContent(e.target.value)} placeholder="video-01" dir="ltr" />
        </label>
      </div>
      {finalCampaign && <p className="cr-builder__hint">{L('اسم الحملة في التقرير:', 'Campaign in the report:')} <bdi dir="ltr">{finalCampaign}</bdi></p>}
      {typedButEmpty && <p className="cr-builder__warn">{L('الاسم لازم فيه حروف إنجليزي أو أرقام (مثلاً sohag-nov)', 'Use Latin letters or digits')}</p>}
      {!isUnit && !landing?.leads && <p className="cr-builder__hint">{L('الصفحة دي بتجيب زوار بس، مش بتسجّل عميل بالرقم. للتسجيل: رشّحلي عقاري أو بيع عقارك أو طلب خاص.', 'This page brings visitors but does not capture a lead.')}</p>}
      {isUnit && <p className="cr-builder__hint">{L('الإعلان بيفتح صفحة الوحدة نفسها: العميل بيتصل أو يبعت واتساب أو يطلب معاينة، وكل ده بيتسجّل باسم الحملة.', 'The ad opens the listing itself; calls, WhatsApp and visit requests are recorded under the campaign.')}</p>}
      <div className="cr-builder__out">
        <input readOnly value={link} dir="ltr" aria-label={L('اللينك', 'Link')} placeholder={isUnit && !unit ? L('اختار الوحدة ويظهر اللينك هنا', 'Pick a listing') : L('اكتب اسم الحملة ويظهر اللينك هنا', 'The link appears here')} />
        <button type="button" className="ui-btn ui-btn--primary ui-btn--sm" disabled={!link} onClick={copy}><Copy size={14} aria-hidden="true" />{L('انسخ', 'Copy')}</button>
      </div>
    </details>
  );
}

/** «تقرير الحملات»: what each ad brought, how far those clients got, and what that cost. */
export default function CampaignReportPanel({ leads = [], properties = [], lang = 'ar', triggerToast }) {
  const isAr = lang === 'ar';
  const L = (ar, en) => (isAr ? ar : en);
  const [by, setBy] = useState('campaign');
  const [period, setPeriod] = useState('30');
  const [spend, setSpend] = useState(readSpend);

  // Taps on WhatsApp / phone numbers that came from an ad: people who went to a chat or a call without a form
  const [intents, setIntents] = useState([]);
  useEffect(() => subscribeToContactIntents((list) => setIntents(Array.isArray(list) ? list : [])), []);
  const taps = useMemo(() => intents.filter((i) => i.campaign).map((i) => ({
    campaign: i.campaign, content: i.content || '', source: i.source || '',
    at: i.createdAt?.toMillis ? i.createdAt.toMillis() : (Date.parse(i.createdAt || '') || 0)
  })), [intents]);
  const rows = useMemo(
    () => campaignReport(leads, { by, days: PERIODS.find((p) => p.id === period)?.days || 0, spend, taps }),
    [leads, by, period, spend, taps]
  );
  const totals = useMemo(() => campaignTotals(rows), [rows]);
  const kinds = useMemo(() => typeSummary(rows), [rows]);

  // Shared with the other managers (campaign_spend/all); this device keeps a copy in case the
  // shared one can't be reached, and the note below says which one is in use
  const [shared, setShared] = useState(null); // null: not known yet
  const saveTimer = useRef(0);
  useEffect(() => {
    let alive = true;
    loadCampaignSpend().then((remote) => {
      if (!alive) return;
      if (remote) { setSpend((local) => ({ ...local, ...remote })); setShared(true); } else setShared(false);
    }).catch(() => alive && setShared(false));
    return () => { alive = false; clearTimeout(saveTimer.current); };
  }, []);

  // Meta campaigns paired by hand with a report campaign: { metaCampaignId: campaignKey }
  const [links, setLinks] = useState({});
  useEffect(() => {
    let alive = true;
    loadCampaignLinks().then((remote) => { if (alive && remote) setLinks(remote); }).catch(() => { /* none yet */ });
    return () => { alive = false; };
  }, []);
  const [lastPull, setLastPull] = useState(null); // the raw answer of the last pull, so a pairing re-applies without asking Meta again
  const reportKeys = useMemo(() => campaignReport(leads, { by: 'campaign' }).map((x) => x.key), [leads]);

  const setRowSpend = (key, value) => {
    const n = Math.max(0, Math.round(Number(String(value).replace(/[^\d.]/g, '')) || 0));
    const next = { ...spend, [key]: n };
    if (!n) delete next[key];
    setSpend(next);
    try { localStorage.setItem(SPEND_KEY, JSON.stringify(next)); } catch { /* private mode: this visit only */ }
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { saveCampaignSpend(next).then((ok) => setShared(ok)).catch(() => setShared(false)); }, 800);
  };

  // Facebook / Instagram spend straight from the ad account (api/ads-spend.js), matched to the report's own
  // campaigns and ads; what matches nothing is listed so the link names can be fixed
  const [pulling, setPulling] = useState(false);
  const [pull, setPull] = useState(null); // { ok, text, unmatched, skipped }
  const pullSpend = async () => {
    setPulling(true);
    setPull(null);
    const r = await pullMetaSpend();
    setPulling(false);
    if (!r.ok) {
      const text = {
        'not-configured': L(`السحب التلقائي مش متفعّل لسه: ضيف في Vercel المتغيّرين META_ADS_TOKEN (توكن فيه صلاحية ads_read) و META_AD_ACCOUNT_ID (رقم الحساب الإعلاني)${r.token === false ? ' — التوكن ناقص' : ''}${r.account === false ? ' — رقم الحساب ناقص' : ''}.`, 'Not set up: add META_ADS_TOKEN and META_AD_ACCOUNT_ID in Vercel.'),
        'bad-token': L('توكن ميتا مرفوض أو منتهي. اعمل توكن جديد (يفضّل System User) وحدّثه في Vercel.', 'Meta rejected the token.'),
        forbidden: L('السحب لمديري المبيعات والمدير العام بس.', 'Managers only.'),
        'no-api': L('السحب شغال على الموقع الحقيقي بس.', 'Works on the live site only.'),
        network: L('مفيش نت. جرّب تاني.', 'Offline.')
      }[r.error] || L(`ميتا ردّت بخطأ${r.detail ? `: ${r.detail}` : ''}. جرّب بعد شوية.`, 'Meta returned an error.');
      setPull({ ok: false, text });
      return;
    }
    if (r.currency && r.currency !== 'EGP') {
      setPull({ ok: false, text: L(`عملة الحساب الإعلاني ${r.currency === 'MIXED' ? 'مختلطة' : r.currency}، والتقرير بالجنيه. ما سحبناش حاجة عشان الأرقام ما تتلخبطش.`, 'The ad account is not in EGP; nothing was imported.') });
      return;
    }
    setLastPull(r);
    finishPull(r, links);
  };

  // Matches a pull to the report (by name, then by the manual pairings), saves the amounts and says what's left over
  const finishPull = (r, linksNow, quiet = false, drop = []) => {
    const known = (by2) => campaignReport(leads, { by: by2 }).map((x) => x.key);
    const out = applyPull(r, { campaignKeys: known('campaign'), adKeys: known('ad'), links: linksNow });
    if (Object.keys(out.amounts).length || drop.length) {
      const next = { ...spend };
      for (const k of drop) delete next[k]; // a campaign that lost its pairing: its old total no longer applies
      Object.assign(next, out.amounts);
      setSpend(next);
      try { localStorage.setItem(SPEND_KEY, JSON.stringify(next)); } catch { /* this visit only */ }
      clearTimeout(saveTimer.current);
      saveCampaignSpend(next).then((ok) => setShared(ok)).catch(() => setShared(false));
    }
    setPull({
      ok: true,
      text: out.matched ? L(`اتسحب الصرف لـ ${out.matched} حملة وحُدّث في التقرير.`, `Spend imported for ${out.matched} campaigns.`) : (quiet ? '' : L('ما لقيناش حملة في ميتا اسمها زي حملاتك في التقرير. اربط حملات ميتا بحملاتك من القايمة تحت.', 'No Meta campaign matches the report. Pair them below.')),
      unmatched: out.unmatched,
      linked: out.linked,
      skipped: Array.isArray(r.metaCampaigns) ? [] : (r.skipped || [])
    });
  };

  // Pair a Meta campaign with one of the report's campaigns ('' unpairs it) and apply it right away
  const pairCampaign = (metaId, key) => {
    const next = { ...links };
    const before = next[metaId];
    if (key) next[metaId] = key; else delete next[metaId];
    setLinks(next);
    saveCampaignLinks(next).catch(() => { /* kept for this visit */ });
    if (lastPull) finishPull(lastPull, next, true, before && before !== key ? [before] : []);
  };

  return (
    <div className="crm-table-container cr-panel">
      <header className="cr-head">
        <h2><Megaphone size={20} aria-hidden="true" /> {L('تقرير الحملات', 'Campaign report')}</h2>
        <p>{L('كل حملة جابت كام عميل، وكام منهم وصل لمعاينة وإغلاق. اكتب المصروف عشان تشوف تكلفة العميل وتكلفة المعاينة.', 'Leads, visits and closings per campaign, with cost per lead and per visit once you enter the spend.')}</p>
      </header>

      <AdsPerformance lang={lang} />

      <LinkBuilder L={L} properties={properties} onCopied={(ok) => triggerToast?.(ok ? L('اللينك اتنسخ', 'Link copied') : L('معرفناش ننسخ، انسخه من الخانة', 'Could not copy, select it from the box'), ok ? 'success' : 'error')} />

      <div className="cr-pull">
        <button type="button" className="ui-btn ui-btn--secondary ui-btn--sm" onClick={pullSpend} disabled={pulling}>
          <RefreshCw size={14} aria-hidden="true" className={pulling ? 'animate-spin' : ''} /> {pulling ? L('بيسحب…', 'Pulling…') : L('اسحب الصرف من فيسبوك', 'Pull spend from Facebook')}
        </button>
        {pull && <p role="status" className={`cr-pull__msg ${pull.ok ? 'is-ok' : 'is-bad'}`}>{pull.text}</p>}
        {pull?.unmatched?.length > 0 && (
          <details className="cr-pull__more">
            <summary>{L(`${pull.unmatched.length} حملة في ميتا مش مربوطة بحملة في التقرير`, 'Unmatched Meta campaigns')}</summary>
            {pull.unmatched[0]?.id && reportKeys.length === 0
              ? <p>{L('لسه مفيش عملاء في الـCRM داخلين بحملة (utm_campaign)، فمفيش حملة تتربط بيها. اعمل لينك الإعلان من «جهّز لينك إعلان» عشان العملاء الجداد يتسجلوا بحملتهم. وأداء الحملات الكامل ظاهر فوق في «أداء الإعلانات».', 'No CRM lead carries a campaign yet, so there is nothing to pair with.')}</p>
              : pull.unmatched[0]?.id
              ? <p>{L('اختار لكل حملة من ميتا الحملة اللي بتجيب عملاءها في الـCRM، والصرف هيتحسب عليها. اللي مالهاش عملاء مسجلين هنا سيبها.', 'Pick the CRM campaign each Meta campaign belongs to.')}</p>
              : <p>{L('عشان تتطابق، اسم الحملة في ميتا (بعد ما يتحوّل لحروف إنجليزي صغيرة وشرطات) لازم يساوي utm_campaign في لينك الإعلان. الحملات دي:', 'A match needs the campaign name to equal the utm_campaign.')}</p>}
            <ul className="cr-pair">{pull.unmatched.map((u) => (
              <li key={u.id || u.slug}>
                <span><bdi>{u.name}</bdi> <small>{fmt(u.spend)} {L('ج.م', 'EGP')}</small></span>
                {u.id && reportKeys.length > 0 && (
                  <select aria-label={L(`اربط ${u.name} بحملة`, `Pair ${u.name}`)} value="" onChange={(e) => pairCampaign(u.id, e.target.value)} disabled={reportKeys.length === 0}>
                    <option value="">{L('اربطها بحملة…', 'Pair with…')}</option>
                    {reportKeys.map((k) => <option key={k} value={k}>{k}</option>)}
                  </select>
                )}
              </li>
            ))}</ul>
          </details>
        )}
        {pull?.linked?.length > 0 && (
          <details className="cr-pull__more">
            <summary>{L(`${pull.linked.length} حملة مربوطة بإيدك`, 'Campaigns paired by hand')}</summary>
            <ul className="cr-pair">{pull.linked.map((u) => (
              <li key={u.id}>
                <span><bdi>{u.name}</bdi> <small>{fmt(u.spend)} {L('ج.م', 'EGP')}</small></span>
                <select aria-label={L(`غيّر ربط ${u.name}`, `Change pairing of ${u.name}`)} value={u.target} onChange={(e) => pairCampaign(u.id, e.target.value)}>
                  {reportKeys.map((k) => <option key={k} value={k}>{k}</option>)}
                  <option value="">{L('فك الربط', 'Unpair')}</option>
                </select>
              </li>
            ))}</ul>
          </details>
        )}
        {pull?.skipped?.length > 0 && <p className="cr-note">{L('حملات أسماؤها عربي بس مبتتطابقش مع اللينك (اللينك بحروف إنجليزي):', 'Names with no Latin letters cannot match:')} <bdi>{pull.skipped.join('، ')}</bdi></p>}
      </div>

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
          description={L('أي عميل يدخل من لينك فيه utm_campaign هيظهر هنا بحملته. اعمل لينك الإعلان من «جهّز لينك إعلان» فوق.', 'Leads that arrive through a link with utm_campaign appear here. Build the ad link above.')}
        />
      ) : (
        <>
          <div className="cr-totals">
            <div><b>{totals.contacts}</b><span>{L('ضغطة تواصل', 'Contact taps')}</span></div>
            <div><b>{totals.leads}</b><span>{L('عميل', 'Leads')}</span></div>
            <div><b>{totals.visits}</b><span>{L('وصل لمعاينة', 'Reached a visit')}</span></div>
            <div><b>{totals.closed}</b><span>{L('اتقفل', 'Closed')}</span></div>
            <div><b>{fmt(totals.costPerLead)}</b><span>{L('تكلفة العميل (ج.م)', 'Cost / lead')}</span></div>
            <div><b>{fmt(totals.costPerVisit)}</b><span>{L('تكلفة المعاينة (ج.م)', 'Cost / visit')}</span></div>
          </div>

          {kinds.length > 0 && (
            <section className="cr-kinds" aria-label={L('الأداء حسب نوع الإعلان', 'By kind of ad')}>
              <h3>{L('حسب نوع الإعلان', 'By kind of ad')}</h3>
              <div className="cr-kinds__grid">
                {kinds.map((k) => (
                  <div key={k.type} className="cr-kind">
                    <strong>{k.label}</strong>
                    <dl>
                      <div><dt>{L('تواصل', 'Taps')}</dt><dd>{k.contacts || 0}</dd></div>
                      <div><dt>{L('عملاء', 'Leads')}</dt><dd>{k.leads}</dd></div>
                      <div><dt>{L('معاينة', 'Visits')}</dt><dd>{k.visits}</dd></div>
                      <div><dt>{L('اتقفل', 'Closed')}</dt><dd>{k.closed}</dd></div>
                      <div><dt>{L('تكلفة العميل', 'Cost / lead')}</dt><dd>{fmt(k.costPerLead)}</dd></div>
                    </dl>
                  </div>
                ))}
              </div>
            </section>
          )}

          <ul className="cr-rows">
            {rows.map((r) => (
              <li key={r.key} className="cr-row">
                <div className="cr-name">
                  <strong>{r.campaign}</strong>
                  {by === 'ad' && <span>{r.ad}</span>}
                  {r.source && <small>{r.source}</small>}
                  {r.topLostReason && (() => {
                    const reason = LOST_REASONS.find((x) => x.id === r.topLostReason.id);
                    return <small className="cr-lost">{L(`أكتر سبب ضياع: ${reason?.ar || 'سبب آخر'} (${r.topLostReason.count})`, `Top loss reason: ${reason?.en || 'Other'} (${r.topLostReason.count})`)}</small>;
                  })()}
                  {r.avgDaysToVisit > 0 && <small>{L(`متوسط ${r.avgDaysToVisit} يوم لحد المعاينة`, `Avg ${r.avgDaysToVisit} days to a visit`)}</small>}
                </div>
                <dl className="cr-nums">
                  <div><dt>{L('تواصل', 'Taps')}</dt><dd>{r.contacts || 0}</dd></div>
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
          <p className="cr-note">{L('«تواصل» = كام زائر جه من الإعلان وداس واتساب أو رقم تليفون. «عملاء» = اللي سجّلوا بياناتهم (فورم أو حساب) أو اتربطوا من صندوق الوارد.', '“Taps” = visitors from the ad who tapped WhatsApp or a phone number; “Leads” = people whose details were recorded.')}</p>
          <p className="cr-note">{shared === false
            ? L('المصروف متحفظ على الجهاز ده بس دلوقتي (مقدرناش نوصل للمخزن المشترك). الأرقام من العملاء المسجّلين في الـ CRM.', 'Spend is saved on this device only right now. Counts come from the leads in the CRM.')
            : L('المصروف بيتحفظ ويظهر لكل المديرين. الأرقام من العملاء المسجّلين في الـ CRM.', 'Spend is shared with the other managers. Counts come from the leads in the CRM.')}</p>
        </>
      )}
    </div>
  );
}
