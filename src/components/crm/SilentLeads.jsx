import { useMemo, useState } from 'react';
import { BellOff, ChevronDown, Phone, MessageSquare, CalendarPlus } from 'lucide-react';
import { silentLeads, silenceLabel, silenceBucket } from '../../utils/silentLeads';
import { buildTask, dayKeyFrom } from '../../utils/tasks';
import { STAGE_LABELS } from '../../utils/performanceReport';
import { addTask } from '../../firebaseLazy';

const SHOWN = 8;
const BUCKETS = [
  { id: 'month', ar: 'أكتر من شهر' },
  { id: 'fortnight', ar: 'أسبوعين لشهر' },
  { id: 'week', ar: 'أسبوع لأسبوعين' }
];

/**
 * «عملاء ساكتين»: clients nobody has touched for a week or more and no task covers. Call or WhatsApp from the
 * row, or put a follow-up on today's list, which also takes the client off this one.
 */
export default function SilentLeads({ leads = [], tasks = [], uid = '', me, isAr = true, onCall, onWhatsApp, onOpenLead, triggerToast }) {
  const [open, setOpen] = useState(false);
  const [all, setAll] = useState(false);
  const [busy, setBusy] = useState('');
  const [now] = useState(() => Date.now());
  const rows = useMemo(() => silentLeads(leads, { uid, tasks, now }), [leads, tasks, uid, now]);
  if (!rows.length) return null;
  const shown = all ? rows : rows.slice(0, SHOWN);

  const remind = async (lead) => {
    setBusy(lead.id);
    const payload = buildTask({ title: `متابعة: ${String(lead.name || 'العميل').split(' ').slice(0, 2).join(' ')}`, dueAt: dayKeyFrom(), priority: 'normal', kind: 'call', lead, me });
    const id = payload ? await addTask(payload) : null;
    setBusy('');
    triggerToast?.(id ? (isAr ? 'اتضافت المتابعة لمهام النهارده' : 'Follow-up added to today') : (isAr ? 'المتابعة ماتحفظتش' : 'Not saved'), id ? 'success' : 'error');
  };

  return (
    <section className="tk-silent">
      <button type="button" className="tk-silent__head" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <BellOff size={18} aria-hidden="true" />
        <span className="tk-silent__title">{isAr ? 'عملاء ساكتين' : 'Silent clients'}</span>
        <span className="tk-silent__count">{rows.length}</span>
        <small>{isAr ? `أطولهم ${silenceLabel(rows[0].days)}` : `longest ${silenceLabel(rows[0].days, false)}`}</small>
        <ChevronDown size={16} aria-hidden="true" className="tk-silent__chev" />
      </button>
      {open && (
        <div className="tk-silent__body">
          <p className="tk-note">{isAr ? 'مفيش حد كلّمهم أو حدّث بياناتهم من أسبوع أو أكتر، ومفيش مهمة مفتوحة ليهم.' : 'Nobody has touched these for a week or more, and no task covers them.'}</p>
          {BUCKETS.map((b) => {
            const group = shown.filter((r) => silenceBucket(r.days) === b.id);
            if (!group.length) return null;
            return (
              <div key={b.id} className="tk-silent__group">
                <h4>{b.ar} <span>{group.length}</span></h4>
                <ul className="tk-list">
                  {group.map(({ lead, days }) => {
                    const phone = lead.phone || lead.whatsapp;
                    return (
                      <li key={lead.id} className="tk-row">
                        <div className="tk-row__main">
                          <button type="button" className="tk-body" onClick={() => onOpenLead?.(lead)}>
                            <strong className="tk-title">{lead.name || (isAr ? 'عميل' : 'Client')}</strong>
                            <span className="tk-meta">
                              <span className="tk-pill is-high">{silenceLabel(days, isAr)}</span>
                              {STAGE_LABELS[lead.status] && <span className="tk-pill">{isAr ? STAGE_LABELS[lead.status].ar : STAGE_LABELS[lead.status].en}</span>}
                              {lead.ownerName && uid === '' && <span className="tk-pill is-who">{lead.ownerName}</span>}
                            </span>
                          </button>
                        </div>
                        <div className="tk-quick tk-quick--flat">
                          {phone && (
                            <a className="tk-q tk-q--call" href={`tel:${String(phone).replace(/[^0-9+]/g, '')}`} onClick={() => onCall?.(lead)}><Phone size={16} aria-hidden="true" /> {isAr ? 'اتصل' : 'Call'}</a>
                          )}
                          {phone && <button type="button" className="tk-q tk-q--wa" onClick={() => onWhatsApp?.(lead)}><MessageSquare size={16} aria-hidden="true" /> {isAr ? 'واتساب' : 'WhatsApp'}</button>}
                          <button type="button" className="tk-q" disabled={busy === lead.id} onClick={() => remind(lead)}><CalendarPlus size={16} aria-hidden="true" /> {isAr ? 'ضيف متابعة' : 'Add follow-up'}</button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
          {rows.length > SHOWN && !all && <button type="button" className="tk-link" onClick={() => setAll(true)}>{isAr ? `عرض الكل (${rows.length})` : `Show all (${rows.length})`}</button>}
        </div>
      )}
    </section>
  );
}
