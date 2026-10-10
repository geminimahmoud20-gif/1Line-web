import { useEffect, useMemo, useState } from 'react';
import { loadVisitorJourney } from '../../../firebaseLazy';
import { getAreas } from '../../../utils/areasData';
import { PROPERTY_TYPES } from '../../../data/propertiesData';
import { visitorInterests, formatSeconds, bandLabel, sourceLabel } from '../../../utils/analyticsSummary';
import { LevelBadge } from './AnalyticsBits';
import { card } from './analyticsStyles';

const toMs = (v) => (typeof v?.toMillis === 'function' ? v.toMillis() : Number(v) || 0);
const egp = (v) => (Number(v) ? `${Number(v).toLocaleString('en-US')} ج.م` : '');

/**
 * What one client did on the site before and after their request: interest summary plus a
 * timeline, from the analytics profile linked to the lead (only exists with analytics consent).
 */
export default function VisitorJourney({ visitorId, properties = [], isAr = true }) {
  const [state, setState] = useState({ loading: true, profile: null, batches: [], error: null });

  useEffect(() => {
    let cancelled = false;
    loadVisitorJourney(visitorId).then((res) => {
      if (!cancelled) setState({ loading: false, profile: res.data.profile, batches: res.data.batches, error: res.ok ? null : res.reason });
    });
    return () => { cancelled = true; };
  }, [visitorId]);

  const names = useMemo(() => {
    const areas = getAreas();
    const byId = new Map(properties.map((p) => [String(p.id), p]));
    return {
      area: (id) => { const a = areas.find((x) => x.id === id); return a ? (isAr ? a.name_ar : a.name_en || a.name_ar) : id; },
      type: (id) => { const t = PROPERTY_TYPES.find((x) => x.id === id); return t ? (isAr ? t.name_ar : t.name_en) : id; },
      prop: (id) => { const p = byId.get(String(id)); return (p && (isAr ? p.title_ar || p.title_en : p.title_en || p.title_ar)) || (isAr ? `وحدة ${id}` : `Listing ${id}`); },
    };
  }, [properties, isAr]);

  if (state.loading) return <p style={{ color: 'var(--crm-muted)', fontSize: 'var(--crm-text-sm)' }}>{isAr ? 'جاري تحميل نشاط العميل…' : 'Loading activity…'}</p>;
  if (state.error === 'denied') return <p style={{ color: 'var(--crm-muted)', fontSize: 'var(--crm-text-sm)' }}>{isAr ? 'نشاط التصفح متاح للمدير العام ومديري المبيعات.' : 'Browsing activity is visible to admins and sales managers.'}</p>;
  if (!state.profile) return <p style={{ color: 'var(--crm-muted)', fontSize: 'var(--crm-text-sm)' }}>{isAr ? 'مفيش نشاط متسجل للعميل ده لسه.' : 'No activity recorded yet.'}</p>;

  const it = visitorInterests(state.profile);
  const describe = (e) => {
    switch (e.t) {
      case 'session_start': return isAr ? `بدأ زيارة${e.returning ? ' (راجع تاني)' : ''}` : `Started a visit${e.returning ? ' (returning)' : ''}`;
      case 'page_view': return isAr ? `فتح صفحة ${e.path || ''}` : `Opened ${e.path || ''}`;
      case 'property_view': return isAr ? `فتح ${names.prop(e.propertyId)} ${egp(e.price)}` : `Opened ${names.prop(e.propertyId)}`;
      case 'property_engaged': return isAr ? `قرأ ${names.prop(e.propertyId)} لمدة ${formatSeconds(e.seconds, isAr)} ونزل ${e.scroll || 0}% من الصفحة` : `Read ${names.prop(e.propertyId)} for ${formatSeconds(e.seconds, isAr)} (${e.scroll || 0}% scrolled)`;
      case 'gallery_open': return isAr ? `فتح صور ${names.prop(e.propertyId)}` : `Opened photos of ${names.prop(e.propertyId)}`;
      case 'virtual_tour': return isAr ? `دخل الجولة الافتراضية ${names.prop(e.propertyId)}` : `Virtual tour of ${names.prop(e.propertyId)}`;
      case 'search': return isAr
        ? `بحث: ${[e.type && e.type !== 'all' ? names.type(e.type) : '', e.area && e.area !== 'all' ? names.area(e.area) : '', e.maxPrice ? `لحد ${egp(e.maxPrice)}` : '', e.query ? `«${e.query}»` : ''].filter(Boolean).join(' • ') || 'كل العقارات'}`
        : `Searched: ${[e.type, e.area, e.maxPrice, e.query].filter(Boolean).join(' • ')}`;
      case 'calculator_used': return isAr ? `جرّب الحاسبة: سعر ${egp(e.price)} • مقدم ${e.downPct ?? '—'}% • ${e.years ?? '—'} سنة` : `Calculator: ${e.price} • ${e.downPct}% down • ${e.years}y`;
      case 'compare_added': return isAr ? `ضاف ${names.prop(e.propertyId)} للمقارنة` : `Compared ${names.prop(e.propertyId)}`;
      case 'favorite_added': return isAr ? `حفظ ${names.prop(e.propertyId)} في المفضلة` : `Saved ${names.prop(e.propertyId)}`;
      case 'share': return isAr ? 'شارك عقارات مع حد' : 'Shared listings';
      case 'brochure_request': return isAr ? 'طلب بروشور' : 'Asked for a brochure';
      case 'form_start': return isAr ? 'بدأ يملأ نموذج طلب' : 'Started a request form';
      case 'contact_click': return isAr ? `تواصل ${e.channel === 'phone' ? 'بالتليفون' : 'واتساب'}${e.propertyId ? ` بخصوص ${names.prop(e.propertyId)}` : ''}` : `Contacted via ${e.channel}`;
      case 'reservation_requested': return isAr ? `طلب حجز ${names.prop(e.propertyId)}` : `Requested a reservation`;
      case 'lead_submitted': return isAr ? 'سجّل طلب على الموقع' : 'Submitted a request';
      default: return null;
    }
  };
  const timeline = state.batches
    .flatMap((b) => (b.events || []).map((e) => ({ ...e, ms: toMs(e.at) || toMs(b.at) })))
    .filter((e) => e.t !== 'stage' && e.t !== 'page_view')
    .sort((a, b) => b.ms - a.ms)
    .slice(0, 80);

  const chip = (text) => (
    <span key={text} style={{ padding: '3px 10px', borderRadius: '999px', background: 'var(--crm-subtle)', fontSize: 'var(--crm-text-xs)', color: 'var(--crm-ink)', fontWeight: 600 }}>{text}</span>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <LevelBadge level={it.level} score={it.intent} isAr={isAr} />
          <span style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-muted)' }}>
            {isAr
              ? `${it.sessions} زيارة • قراءة ${formatSeconds(it.engagedSeconds, isAr)} • ${it.contacts} تواصل • أول مصدر: ${sourceLabel(state.profile.lastSource, isAr)}`
              : `${it.sessions} visits • read ${formatSeconds(it.engagedSeconds, isAr)} • ${it.contacts} contacts • source ${sourceLabel(state.profile.lastSource, isAr)}`}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {it.types.map(([id]) => chip(names.type(id)))}
          {it.areas.map(([id]) => chip(names.area(id)))}
          {it.bands.map(([id]) => chip(bandLabel(id, isAr)))}
        </div>
        {it.lastCalc && (
          <div style={{ fontSize: 'var(--crm-text-sm)', color: 'var(--crm-body)' }}>
            {isAr
              ? `🧮 آخر حساب تمويل: سعر ${egp(it.lastCalc.price)} • مقدم ${it.lastCalc.downPct ?? '—'}% • ${it.lastCalc.years ?? '—'} سنة`
              : `Last calculation: ${it.lastCalc.price} • ${it.lastCalc.downPct}% down • ${it.lastCalc.years}y`}
          </div>
        )}
        {it.topProps.length > 0 && (
          <div style={{ fontSize: 'var(--crm-text-sm)', color: 'var(--crm-body)' }}>
            <strong>{isAr ? 'الوحدات اللي شدّته:' : 'Listings that held attention:'}</strong>
            <ul style={{ margin: '4px 0 0', paddingInlineStart: '18px' }}>
              {it.topProps.map((p) => (
                <li key={p.id}>
                  {names.prop(p.id)} — {isAr ? `${p.views} مشاهدة` : `${p.views} views`}{p.seconds ? ` • ${formatSeconds(p.seconds, isAr)}` : ''}
                  {p.favorite ? (isAr ? ' • في المفضلة' : ' • saved') : ''}{p.compared ? (isAr ? ' • قارنها' : ' • compared') : ''}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {timeline.map((e, i) => {
          const text = describe(e);
          if (!text) return null;
          return (
            <div key={`${e.ms}-${i}`} style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--crm-line)', fontSize: 'var(--crm-text-sm)' }}>
              <span style={{ color: 'var(--crm-ink)' }}>{text}</span>
              <span style={{ color: 'var(--crm-faint)', whiteSpace: 'nowrap', fontSize: 'var(--crm-text-xs)' }}>
                {e.ms ? new Date(e.ms).toLocaleString(isAr ? 'ar-EG-u-nu-latn' : 'en-US', { dateStyle: 'short', timeStyle: 'short' }) : ''}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
