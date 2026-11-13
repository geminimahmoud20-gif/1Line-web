import { useState, useMemo } from 'react';
import { Sparkles, Send, Car, EyeOff, CheckCircle2 } from 'lucide-react';
import SiteVisitModal from './SiteVisitModal';
import { normalizeAreaKey, getAreas } from '../../utils/areasData';
import { matchBuyersToProperties, formatWhatsAppPhone, generateWhatsAppMessage, MATCH_THRESHOLD } from '../../utils/matchingEngine';
import { formatPhoneNumber } from '../../utils/crmNoteSanitizer';
import { countPhrase } from '../../utils/arabicCount';
import './smart-matching.css';

const DISMISS_KEY = 'crm_match_dismissed';
const IDEAL = 85;
const SENT_MARK = 'إرسال ترشيح مطابق عبر واتساب للعقار [';

const readDismissed = () => { try { return JSON.parse(localStorage.getItem(DISMISS_KEY) || '{}') || {}; } catch { return {}; } };

/** When this buyer was last sent this listing (from the lead's own history, so it holds on every device) */
const sentAt = (lead, propertyId) => {
  const mark = `${SENT_MARK}${propertyId}]`;
  const log = (lead?.activityLogs || []).find((x) => String(x.action || '').includes(mark));
  return log?.timestamp || '';
};

/**
 * «المطابقات الذكية»: one card per buyer with the listings that fit them (utils/matchingEngine, the same
 * rules as the new-listing alerts: active buyers, the kind, area and budget, and their «رشّحلي» answers).
 * A listing already sent shows when; one that isn't for them can be set aside on this device.
 */
export default function SmartMatchingHub({ leads = [], properties = [], onUpdateLead, onOpenLead, lang = 'ar', triggerToast }) {
  const isAr = lang === 'ar';
  const [minScore, setMinScore] = useState(MATCH_THRESHOLD);
  const [visitFor, setVisitFor] = useState(null);
  const [dismissed, setDismissed] = useState(readDismissed);

  const areaName = useMemo(() => {
    const areas = getAreas();
    return (key) => {
      const a = areas.find((x) => x.id === normalizeAreaKey(key));
      return a ? (isAr ? a.name_ar : (a.name_en || a.name_ar)) : (isAr ? 'سوهاج' : 'Sohag');
    };
  }, [isAr]);

  const rows = useMemo(() => matchBuyersToProperties(leads, properties, { minScore, perBuyer: 6 })
    .map((r) => ({ ...r, items: r.items.filter((i) => !dismissed[`${r.key}|${i.property.id}`]).slice(0, 3) }))
    .filter((r) => r.items.length > 0), [leads, properties, minScore, dismissed]);

  const dismiss = (row, property) => {
    const next = { ...dismissed, [`${row.key}|${property.id}`]: true };
    setDismissed(next);
    try { localStorage.setItem(DISMISS_KEY, JSON.stringify(next)); } catch { /* private mode: this visit only */ }
  };

  const send = (row, item) => {
    const lead = row.lead;
    const { property } = item;
    const digits = String(row.phone || '').replace(/[^0-9*]/g, '');
    if (!digits || digits.includes('*') || digits.length < 8) {
      triggerToast?.(isAr ? 'رقم العميل غير متوفر أو محجوب لصلاحيات حسابك' : 'The phone is unavailable or masked for your role', 'error');
      return;
    }
    // The client's message carries the listing and its own plan, never our internal match score
    const text = generateWhatsAppMessage('new_unit', { name: row.name }, property);
    window.open(`https://wa.me/${formatWhatsAppPhone(digits)}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
    if (lead && onUpdateLead) {
      const nowIso = new Date().toISOString();
      const title = isAr ? property.title_ar : property.title_en;
      onUpdateLead(lead.id, {
        lastContactedAt: nowIso,
        activityLogs: [{ timestamp: nowIso, action: `${SENT_MARK}${property.id}] — ${title} (${item.score}% توافق)` }, ...(lead.activityLogs || [])]
      });
    }
    triggerToast?.(isAr ? 'اتفتح واتساب واتسجّل الإرسال في سجل العميل' : 'WhatsApp opened and logged in the client history', 'success');
  };

  const when = (iso) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(isAr ? 'ar-EG-u-nu-latn' : 'en-GB', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="smh">
      <header className="smh__head">
        <div>
          <h2 className="smh__title"><Sparkles size={20} aria-hidden="true" />{isAr ? 'المطابقات الذكية' : 'Smart matches'}</h2>
          <p className="smh__sub">{isAr ? `${countPhrase('buyer', rows.length, true)} عنده ترشيحات مناسبة من العروض المتاحة` : `${rows.length} buyers with matching listings`}</p>
        </div>
        <div className="smh__tabs" role="group" aria-label={isAr ? 'قوة المطابقة' : 'Match strength'}>
          <button type="button" className={minScore === IDEAL ? 'is-on' : ''} aria-pressed={minScore === IDEAL} onClick={() => setMinScore(IDEAL)}>{isAr ? 'مثالية +85' : 'Best 85+'}</button>
          <button type="button" className={minScore === MATCH_THRESHOLD ? 'is-on' : ''} aria-pressed={minScore === MATCH_THRESHOLD} onClick={() => setMinScore(MATCH_THRESHOLD)}>{isAr ? 'كل الفرص +70' : 'All 70+'}</button>
        </div>
      </header>

      {rows.length === 0 ? (
        <div className="smh__empty">
          <Sparkles size={32} aria-hidden="true" />
          <h3>{isAr ? 'مفيش ترشيحات بالنسبة دي دلوقتي' : 'No matches at this strength'}</h3>
          <p>{isAr ? 'العقار المباع أو المخفي أو من غير سعر مش بيتعرض، ولا العميل اللي قفل أو خسر. أضف عقارات أو نزّل النسبة.' : 'Add listings or lower the strength.'}</p>
        </div>
      ) : (
        <ul className="smh__list">
          {rows.map((row) => (
            <li key={row.key} className="smh__buyer">
              <div className="smh__buyer-head">
                <div className="smh__who">
                  <button type="button" className="smh__name" onClick={() => row.lead && onOpenLead?.(row.lead)} disabled={!row.lead}>{row.name}</button>
                  <bdi dir="ltr" className="smh__phone">{formatPhoneNumber(row.phone) || '—'}</bdi>
                </div>
                <span className="smh__budget">
                  {row.budget ? `${isAr ? 'ميزانية' : 'Budget'} ${row.budget.toLocaleString('en-US')} ${isAr ? 'ج.م' : 'EGP'}` : (isAr ? 'من غير ميزانية' : 'No budget')}
                </span>
              </div>

              <ul className="smh__units">
                {row.items.map((item) => {
                  const { property } = item;
                  const sent = row.lead ? sentAt(row.lead, property.id) : '';
                  return (
                    <li key={property.id} className="smh__unit">
                      <div className="smh__unit-top">
                        <strong className="smh__unit-title">{isAr ? property.title_ar : property.title_en}</strong>
                        <span className={`smh__score ${item.score >= IDEAL ? 'is-ideal' : ''}`}>{item.score}%</span>
                      </div>
                      <p className="smh__unit-meta">
                        {[property.size ? `${property.size} م²` : '', areaName(property.areaKey), property.price ? `${Number(property.price).toLocaleString('en-US')} ج.م` : ''].filter(Boolean).join(' • ')}
                      </p>
                      {item.reasons?.length > 0 && <p className="smh__reasons">{item.reasons.slice(0, 3).join(' · ')}</p>}
                      <div className="smh__actions">
                        <button type="button" className="ui-btn ui-btn--primary ui-btn--sm" onClick={() => send(row, item)}>
                          <Send size={14} aria-hidden="true" />{sent ? (isAr ? 'ابعت تاني' : 'Send again') : (isAr ? 'ابعت واتساب' : 'Send')}
                        </button>
                        {row.lead && (
                          <button type="button" className="ui-btn ui-btn--secondary ui-btn--sm" onClick={() => setVisitFor({ ...row.lead, details: { ...row.lead.details, targetPropertyId: property.id } })}>
                            <Car size={14} aria-hidden="true" />{isAr ? 'احجز معاينة' : 'Book a viewing'}
                          </button>
                        )}
                        <button type="button" className="ui-btn ui-btn--ghost ui-btn--sm" onClick={() => dismiss(row, property)} title={isAr ? 'مش مناسب للعميل ده (على الجهاز ده)' : 'Not for this buyer (this device)'}>
                          <EyeOff size={14} aria-hidden="true" />{isAr ? 'مش مناسب' : 'Skip'}
                        </button>
                        {sent && <span className="smh__sent"><CheckCircle2 size={13} aria-hidden="true" />{isAr ? `اتبعت ${when(sent)}` : `Sent ${when(sent)}`}</span>}
                      </div>
                    </li>
                  );
                })}
              </ul>
              {row.total > row.items.length && <p className="smh__more">{isAr ? `و${row.total - row.items.length} عرض تاني مناسب` : `+${row.total - row.items.length} more`}</p>}
            </li>
          ))}
        </ul>
      )}

      {visitFor && (
        <SiteVisitModal
          isOpen={Boolean(visitFor)}
          onClose={() => setVisitFor(null)}
          lead={visitFor}
          properties={properties}
          onScheduleVisit={(leadId, visitDetails) => {
            onUpdateLead?.(leadId, { status: 'site_visit', siteVisit: visitDetails, followUp: `معاينة مجدولة يوم ${visitDetails.visitDate}` });
          }}
          lang={lang}
          triggerToast={triggerToast}
        />
      )}
    </div>
  );
}
