import { useEffect, useMemo, useState } from 'react';
import { Globe2, Repeat2, MessageCircle, Video, Plane, Footprints, Crown, Sparkles, ArrowLeftRight, Building, Coins, RefreshCw, AlertTriangle, Save } from 'lucide-react';
import { subscribeToIntake, updateIntakeRecord, saveSettings, loadSettings } from '../../firebaseLazy';
import { findTradeMatches, matchInventory, reachBudget, OFFER_TYPES, WANT_TYPES, LEGAL_STATUSES, DIFF_MODES, labelOf } from '../../utils/tradeInEngine';
import { GOVERNORATES } from '../../utils/propertyInsights';
import { getFxState, subscribeFx, initFxRates } from '../../utils/fxRates';
import './crm-intake.css';

const fmt = (n) => Math.round(Number(n) || 0).toLocaleString('en-US');
const waLink = (phone, text) => `https://wa.me/${String(phone || '').replace(/[^\d]/g, '')}?text=${encodeURIComponent(text)}`;
const when = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString('ar-EG-u-nu-latn', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return '—'; }
};

const STATUSES = [
  { id: 'new', ar: 'جديد', tone: 'hot' },
  { id: 'contacted', ar: 'تم التواصل', tone: 'info' },
  { id: 'scheduled', ar: 'تم تحديد موعد', tone: 'gold' },
  { id: 'done', ar: 'تمت', tone: 'good' },
  { id: 'closed', ar: 'مغلق', tone: 'muted' }
];
const TRADE_STATUSES = [
  { id: 'new', ar: 'جديد', tone: 'hot' },
  { id: 'reviewing', ar: 'مراجعة قانونية', tone: 'info' },
  { id: 'matched', ar: 'تمت المطابقة', tone: 'gold' },
  { id: 'negotiating', ar: 'تفاوض', tone: 'gold' },
  { id: 'closed', ar: 'مُغلق', tone: 'good' },
  { id: 'rejected', ar: 'مرفوض', tone: 'muted' }
];
const COVER_ICON = { live_call: Video, street: Footprints, drone: Plane };
const COVER_AR = { live_call: 'فيديو حي', street: 'الشارع والجيران', drone: 'درون' };
const SLOT_AR = { morning: 'صباحاً', afternoon: 'بعد العصر', evening: 'مساءً', weekend: 'الجمعة/السبت' };

/** Live list of an intake collection with a permission/deploy hint. */
function useIntake(collectionName) {
  const [items, setItems] = useState([]);
  const [state, setState] = useState('loading');
  useEffect(() => {
    const unsub = subscribeToIntake(collectionName, (list, meta) => {
      setItems(list || []);
      setState(meta?.error ? meta.error : 'ready');
    });
    return () => { if (typeof unsub === 'function') unsub(); };
  }, [collectionName]);
  return [items, state];
}

function StatusSelect({ list, value, onChange, disabled }) {
  const cur = list.find((s) => s.id === value) || list[0];
  return (
    <select className={`cxi-status cxi-tone-${cur.tone}`} value={cur.id} disabled={disabled} onChange={(e) => onChange(e.target.value)} aria-label="الحالة">
      {list.map((s) => <option key={s.id} value={s.id}>{s.ar}</option>)}
    </select>
  );
}

function PermissionHint({ state }) {
  if (state !== 'permission-denied') return null;
  return (
    <div className="cxi-alert">
      <AlertTriangle size={16} aria-hidden="true" />
      <span>قواعد Firestore الجديدة لم تُنشر بعد أو حسابك بلا صلاحية قراءة. انشر القواعد: <code>firebase deploy --only firestore:rules</code></span>
    </div>
  );
}

/* ───────────────────────── FX rates (super admin) ───────────────────────── */
function FxRatesEditor({ canEdit, triggerToast }) {
  const [fx, setFx] = useState(getFxState);
  const [mode, setMode] = useState('auto');
  const [usdEgp, setUsdEgp] = useState('');
  const [kwdEgp, setKwdEgp] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const stop = initFxRates();
    const unsub = subscribeFx(setFx);
    loadSettings('fx_rates').then((d) => {
      if (!d) return;
      setMode(d.mode === 'manual' ? 'manual' : 'auto');
      if (d.usdEgp) setUsdEgp(d.usdEgp);
      if (d.kwdEgp) setKwdEgp(d.kwdEgp);
    }).catch(() => {});
    return () => { unsub(); stop(); };
  }, []);

  const liveUsd = fx.perUsd?.EGP;
  const save = async () => {
    if (mode === 'manual' && !(Number(usdEgp) > 0)) { triggerToast?.('اكتب سعر الدولار بالجنيه', 'error'); return; }
    setSaving(true);
    const ok = await saveSettings('fx_rates', { mode, usdEgp: Number(usdEgp) || 0, kwdEgp: Number(kwdEgp) || 0 });
    setSaving(false);
    triggerToast?.(ok ? 'تم حفظ إعداد أسعار الصرف' : 'تعذر الحفظ — تأكد من صلاحية المدير', ok ? 'success' : 'error');
  };

  return (
    <div className="cxi-card cxi-fx">
      <div className="cxi-card-head">
        <Coins size={18} aria-hidden="true" />
        <h3>أسعار الصرف لمحوّل العملات</h3>
        <span className="cxi-pill">{fx.source === 'manual' ? 'يدوي' : fx.ready ? 'تلقائي يومي' : 'غير متاح'}</span>
      </div>
      <p className="cxi-muted">
        الأسعار تظهر للزائر بعلامة ≈ فقط والتعاقد بالجنيه. الريال السعودي والدرهم والريال القطري مربوطة بالدولار رسمياً، فيكفي سعر الدولار{' '}
        {liveUsd ? <>— السعر الحالي: <b dir="ltr">1 USD = {Math.round(liveUsd * 100) / 100} EGP</b></> : null}
      </p>
      <div className="cxi-fx-row">
        <div className="cxi-seg" role="radiogroup" aria-label="مصدر السعر">
          <button type="button" className={mode === 'auto' ? 'is-on' : ''} onClick={() => setMode('auto')} disabled={!canEdit}><RefreshCw size={13} /> تلقائي (open.er-api.com)</button>
          <button type="button" className={mode === 'manual' ? 'is-on' : ''} onClick={() => setMode('manual')} disabled={!canEdit}>يدوي</button>
        </div>
        {mode === 'manual' && (
          <>
            <label className="cxi-field"><span>1 دولار = ؟ جنيه</span><input type="number" step="0.01" min="0" value={usdEgp} onChange={(e) => setUsdEgp(e.target.value)} disabled={!canEdit} /></label>
            <label className="cxi-field"><span>1 دينار كويتي = ؟ جنيه (اختياري)</span><input type="number" step="0.01" min="0" value={kwdEgp} onChange={(e) => setKwdEgp(e.target.value)} disabled={!canEdit} /></label>
          </>
        )}
        {canEdit && <button type="button" className="cxi-btn" onClick={save} disabled={saving}><Save size={14} /> {saving ? 'جارٍ الحفظ…' : 'حفظ'}</button>}
      </div>
    </div>
  );
}

/* ───────────────────────── Remote inspections ───────────────────────── */
export function RemoteInspectionsPanel({ properties = [], canEdit = false, isSuperAdmin = false, triggerToast }) {
  const [items, state] = useIntake('remote_inspections');
  const [filter, setFilter] = useState('open');

  const shown = useMemo(() => items.filter((r) => (filter === 'open' ? !['done', 'closed'].includes(r.status) : filter === 'all' ? true : r.status === filter)), [items, filter]);
  const counts = useMemo(() => ({ new: items.filter((r) => (r.status || 'new') === 'new').length, total: items.length }), [items]);

  const setStatus = async (r, status) => {
    const ok = await updateIntakeRecord('remote_inspections', r.id, { status });
    if (!ok) triggerToast?.('تعذر تحديث الحالة', 'error');
  };

  return (
    <div className="cxi">
      <header className="cxi-head">
        <div>
          <h2><Globe2 size={22} aria-hidden="true" /> خدمات المغتربين — معاينة الغربة</h2>
          <p className="cxi-muted">كل طلب هنا عميل VIP مقيم بالخارج. الطلب يظهر كمان في صندوق العملاء بمصدر «معاينة الغربة».</p>
        </div>
        <div className="cxi-kpis">
          <span><b>{counts.new}</b> جديد</span>
          <span><b>{counts.total}</b> إجمالي</span>
        </div>
      </header>

      <FxRatesEditor canEdit={isSuperAdmin} triggerToast={triggerToast} />
      <PermissionHint state={state} />

      <div className="cxi-filters">
        {[['open', 'المفتوحة'], ['new', 'جديد'], ['scheduled', 'بموعد'], ['done', 'تمت'], ['all', 'الكل']].map(([id, label]) => (
          <button key={id} type="button" className={filter === id ? 'is-on' : ''} onClick={() => setFilter(id)}>{label}</button>
        ))}
      </div>

      {state === 'loading' ? <p className="cxi-muted">جارٍ التحميل…</p> : shown.length === 0 ? (
        <div className="cxi-empty">لا توجد طلبات في هذا التصنيف.</div>
      ) : (
        <div className="cxi-list">
          {shown.map((r) => {
            const prop = properties.find((p) => p.id === r.propertyId);
            const msg = `مرحباً ${r.name} 👋 معك فريق معاينات 1Line بخصوص طلب «معاينة الغربة»${r.propertyId ? ` للعقار #${String(r.propertyId).toUpperCase()}` : ''}. نأكد معاك الموعد المناسب؟`;
            return (
              <article key={r.id} className={`cxi-row ${(r.status || 'new') === 'new' ? 'is-new' : ''}`}>
                <div className="cxi-row-main">
                  <div className="cxi-row-title">
                    <Crown size={14} className="cxi-vip" aria-label="VIP" />
                    <strong>{r.name}</strong>
                    <span className="cxi-chip">{r.country}</span>
                    <span className="cxi-time">{when(r.createdAtIso || r.submittedAt)}</span>
                  </div>
                  <div className="cxi-row-meta">
                    {(r.coverage || []).map((c) => {
                      const Icon = COVER_ICON[c] || Video;
                      return <span key={c} className="cxi-chip cxi-chip--gold"><Icon size={12} /> {COVER_AR[c] || c}</span>;
                    })}
                    {(r.preferredDate || r.preferredSlot) && <span className="cxi-chip">{r.preferredDate || ''} {SLOT_AR[r.preferredSlot] || ''}</span>}
                    {r.propertyId && (
                      <a className="cxi-chip cxi-chip--link" href={`/properties/${r.propertyId}`} target="_blank" rel="noreferrer">
                        <Building size={12} /> {prop ? (prop.title_ar || r.propertyTitle) : r.propertyTitle || r.propertyId}
                      </a>
                    )}
                  </div>
                  {r.notes && <p className="cxi-notes">{r.notes}</p>}
                </div>
                <div className="cxi-row-actions">
                  <a className="cxi-btn cxi-btn--wa" href={waLink(r.phone, msg)} target="_blank" rel="noopener noreferrer"><MessageCircle size={14} /> <span dir="ltr">{r.phone}</span></a>
                  <StatusSelect list={STATUSES} value={r.status || 'new'} disabled={!canEdit} onChange={(s) => setStatus(r, s)} />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── Trade-ins + matching engine ───────────────────────── */
export function TradeInsPanel({ properties = [], canEdit = false, triggerToast }) {
  const [items, state] = useIntake('trade_ins');
  const [view, setView] = useState('matches');
  const [openId, setOpenId] = useState(null);

  const matches = useMemo(() => findTradeMatches(items), [items]);
  const mutualCount = matches.filter((m) => m.mutual).length;

  const setStatus = async (r, status) => {
    const ok = await updateIntakeRecord('trade_ins', r.id, { status });
    if (!ok) triggerToast?.('تعذر تحديث الحالة', 'error');
  };

  const describeOffer = (r) => `${labelOf(OFFER_TYPES, r.offerType)} ${r.offerSize ? `${fmt(r.offerSize)}م` : ''} — ${labelOf(GOVERNORATES, r.offerGovernorate)}${r.offerLocation ? ` (${r.offerLocation})` : ''}`;

  return (
    <div className="cxi">
      <header className="cxi-head">
        <div>
          <h2><Repeat2 size={22} aria-hidden="true" /> صفقات التبادل العقاري</h2>
          <p className="cxi-muted">محرك المطابقة يقارن ما يعرضه كل عميل بما يطلبه الآخرون، ويقترح عقارات من المخزون تناسب ميزانية البدل.</p>
        </div>
        <div className="cxi-kpis">
          <span><b>{items.length}</b> طلب</span>
          <span><b>{mutualCount}</b> بدل متبادل</span>
          <span><b>{matches.length}</b> مطابقة</span>
        </div>
      </header>

      <PermissionHint state={state} />

      <div className="cxi-filters">
        <button type="button" className={view === 'matches' ? 'is-on' : ''} onClick={() => setView('matches')}><Sparkles size={13} /> المطابقات الذكية</button>
        <button type="button" className={view === 'requests' ? 'is-on' : ''} onClick={() => setView('requests')}>كل الطلبات</button>
      </div>

      {state === 'loading' ? <p className="cxi-muted">جارٍ التحميل…</p> : view === 'matches' ? (
        matches.length === 0 ? (
          <div className="cxi-empty">لا توجد مطابقات بين العملاء بعد. راجع «كل الطلبات» لاقتراحات من المخزون.</div>
        ) : (
          <div className="cxi-list">
            {matches.slice(0, 40).map((m) => (
              <article key={m.id} className={`cxi-match ${m.mutual ? 'is-mutual' : ''}`}>
                <div className="cxi-score" style={{ '--s': `${m.score}%` }}><b>{m.score}</b><small>%</small></div>
                <div className="cxi-match-sides">
                  <div>
                    <strong>{m.a.name}</strong>
                    <small>يعرض: {describeOffer(m.a)}</small>
                    <small>يطلب: {labelOf(WANT_TYPES, m.a.wantType)}</small>
                  </div>
                  <ArrowLeftRight size={18} className="cxi-swap" aria-hidden="true" />
                  <div>
                    <strong>{m.b.name}</strong>
                    <small>يعرض: {describeOffer(m.b)}</small>
                    <small>يطلب: {labelOf(WANT_TYPES, m.b.wantType)}</small>
                  </div>
                </div>
                <div className="cxi-match-foot">
                  <span className={`cxi-chip ${m.mutual ? 'cxi-chip--gold' : ''}`}>{m.mutual ? 'بدل متبادل' : 'اتجاه واحد'}</span>
                  {m.a.offerValue && m.b.offerValue ? (
                    <span className="cxi-chip">فرق القيمة التقريبي: {fmt(Math.abs(m.cashGap))} ج.م {m.cashGap > 0 ? `لصالح ${m.a.name}` : m.cashGap < 0 ? `لصالح ${m.b.name}` : ''}</span>
                  ) : null}
                  <a className="cxi-btn cxi-btn--wa" href={waLink(m.a.phone, `مرحباً ${m.a.name}، معك 1Line بخصوص طلب البدل. عندنا عرض ممكن يناسبك: ${describeOffer(m.b)}. نرتب معاينة؟`)} target="_blank" rel="noopener noreferrer"><MessageCircle size={13} /> {m.a.name}</a>
                  <a className="cxi-btn cxi-btn--wa" href={waLink(m.b.phone, `مرحباً ${m.b.name}، معك 1Line بخصوص طلب البدل. عندنا عرض ممكن يناسبك: ${describeOffer(m.a)}. نرتب معاينة؟`)} target="_blank" rel="noopener noreferrer"><MessageCircle size={13} /> {m.b.name}</a>
                </div>
              </article>
            ))}
          </div>
        )
      ) : items.length === 0 ? (
        <div className="cxi-empty">لا توجد طلبات بدل بعد.</div>
      ) : (
        <div className="cxi-list">
          {items.map((r) => {
            const inv = openId === r.id ? matchInventory(r, properties, 6) : null;
            return (
              <article key={r.id} className={`cxi-row ${(r.status || 'new') === 'new' ? 'is-new' : ''}`}>
                <div className="cxi-row-main">
                  <div className="cxi-row-title">
                    <strong>{r.name}</strong>
                    {r.country && <span className="cxi-chip">{r.country}</span>}
                    <span className="cxi-time">{when(r.createdAtIso || r.submittedAt)}</span>
                  </div>
                  <div className="cxi-trade-line">
                    <span><b>يعرض:</b> {describeOffer(r)} — {fmt(r.offerValue)} ج.م — {labelOf(LEGAL_STATUSES, r.offerLegal)}</span>
                    <span><b>يطلب:</b> {labelOf(WANT_TYPES, r.wantType)}{r.wantArea ? ` في ${r.wantArea}` : ''}{r.wantSize ? ` (≥ ${fmt(r.wantSize)}م)` : ''}</span>
                    <span><b>الفرق:</b> {labelOf(DIFF_MODES, r.diffMode)}{r.diffAmount ? ` ${fmt(r.diffAmount)} ج.م` : ''} — ميزانية البديل ≈ {fmt(reachBudget(r))} ج.م</span>
                  </div>
                  {(r.wantNotes || r.notes) && <p className="cxi-notes">{[r.wantNotes, r.notes].filter(Boolean).join(' — ')}</p>}
                  <button type="button" className="cxi-link" onClick={() => setOpenId(openId === r.id ? null : r.id)}>
                    {openId === r.id ? 'إخفاء اقتراحات المخزون' : 'اقتراحات من المخزون'}
                  </button>
                  {inv && (
                    inv.length === 0 ? <p className="cxi-muted">لا يوجد عقار معروض مطابق حالياً.</p> : (
                      <ul className="cxi-inv">
                        {inv.map(({ property: p, fit }) => (
                          <li key={p.id}>
                            <a href={`/properties/${p.id}`} target="_blank" rel="noreferrer">{p.title_ar}</a>
                            <span>{fmt(p.price)} ج.م</span>
                            <span className="cxi-chip">توافق السعر {Math.round(fit * 100)}%</span>
                          </li>
                        ))}
                      </ul>
                    )
                  )}
                </div>
                <div className="cxi-row-actions">
                  <a className="cxi-btn cxi-btn--wa" href={waLink(r.phone, `مرحباً ${r.name} 👋 معك 1Line بخصوص طلب البدل العقاري.`)} target="_blank" rel="noopener noreferrer"><MessageCircle size={14} /> <span dir="ltr">{r.phone}</span></a>
                  <StatusSelect list={TRADE_STATUSES} value={r.status || 'new'} disabled={!canEdit} onChange={(s) => setStatus(r, s)} />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
