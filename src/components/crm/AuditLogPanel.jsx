import { useEffect, useMemo, useState } from 'react';
import { ScrollText, Loader2 } from 'lucide-react';
import { loadAuditEvents } from '../../firebaseLazy';
import { auditLabel, describeAudit, AUDIT_LABELS } from '../../utils/auditEvents';
import { EmptyState } from '../ui';
import './audit-log.css';

const fmtTime = (ms, isAr) => (ms ? new Date(ms).toLocaleString(isAr ? 'ar-EG-u-nu-latn' : 'en-GB', { dateStyle: 'short', timeStyle: 'short' }) : '—');

/** «سجل المراجعة»: who did what in the CRM (super admin). Phones are never shown or stored here. */
export default function AuditLogPanel({ lang = 'ar' }) {
  const isAr = lang === 'ar';
  const L = (ar, en) => (isAr ? ar : en);
  const [events, setEvents] = useState(undefined); // undefined: loading, null: couldn't be read
  const [action, setAction] = useState('');
  const [who, setWho] = useState('');

  useEffect(() => {
    let alive = true;
    loadAuditEvents(300).then((e) => { if (alive) setEvents(e); }).catch(() => alive && setEvents(null));
    return () => { alive = false; };
  }, []);

  const actors = useMemo(() => [...new Set((events || []).map((e) => e.actorEmail).filter(Boolean))].sort(), [events]);
  const actions = useMemo(() => [...new Set([...Object.keys(AUDIT_LABELS), ...(events || []).map((e) => e.action)])].filter(Boolean), [events]);
  const shown = (events || []).filter((e) => (!action || e.action === action) && (!who || e.actorEmail === who));

  return (
    <section className="al-panel" aria-labelledby="al-title">
      <header className="al-head">
        <h3 id="al-title"><ScrollText size={20} aria-hidden="true" /> {L('سجل المراجعة', 'Audit log')}</h3>
        <p>{L('آخر ٣٠٠ إجراء: مين استخدم رقم عميل، ومين نقل عميل، ومين صدّر أو حذف. الأرقام نفسها عمرها ما بتتسجّل هنا.', 'The latest 300 actions: who used a client’s phone, reassigned, exported or deleted. Phone numbers are never stored here.')}</p>
      </header>

      <div className="al-filters">
        <label>
          <span>{L('الإجراء', 'Action')}</span>
          <select value={action} onChange={(e) => setAction(e.target.value)}>
            <option value="">{L('الكل', 'All')}</option>
            {actions.map((a) => <option key={a} value={a}>{auditLabel(a, isAr)}</option>)}
          </select>
        </label>
        <label>
          <span>{L('الشخص', 'Person')}</span>
          <select value={who} onChange={(e) => setWho(e.target.value)}>
            <option value="">{L('الكل', 'Everyone')}</option>
            {actors.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </label>
      </div>

      {events === undefined && <p className="al-note"><Loader2 size={14} className="animate-spin" /> {L('جاري التحميل…', 'Loading…')}</p>}
      {events === null && <p className="al-note is-bad">{L('مقدرناش نقرا السجل. اتأكد إنك داخل كمدير عام وجرّب تاني.', 'The log could not be read. Make sure you are signed in as super admin.')}</p>}
      {events && shown.length === 0 && (
        <EmptyState icon={<ScrollText size={22} />} title={L('مفيش إجراءات مسجّلة بالفلاتر دي', 'No actions match')} description={L('أول ما حد يستخدم رقم عميل أو ينقله أو يصدّر، هيظهر هنا.', 'Actions appear here as they happen.')} />
      )}
      {shown.length > 0 && (
        <ul className="al-rows">
          {shown.map((e) => (
            <li key={e.id} className="al-row">
              <div className="al-main">
                <strong>{auditLabel(e.action, isAr)}</strong>
                <span>{describeAudit(e, isAr)}</span>
              </div>
              <div className="al-meta">
                <span>{e.actorEmail || '—'}</span>
                <small>{fmtTime(e.at, isAr)}</small>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
