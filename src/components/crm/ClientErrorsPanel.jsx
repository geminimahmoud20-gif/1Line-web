import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ShieldAlert, Bug, Trash2 } from 'lucide-react';
import { subscribeToClientErrors, deleteClientErrors } from '../../firebaseLazy';

// CRM → System → Site errors. What visitors' browsers reported (src/utils/errorReporter.js),
// grouped so one broken button seen by 40 visitors is one row with "40×", newest first.

const KIND_LABEL = {
  error: { ar: 'خطأ برمجي', en: 'Script error', Icon: Bug },
  rejection: { ar: 'عملية فشلت', en: 'Failed operation', Icon: AlertTriangle },
  crash: { ar: 'الصفحة وقعت', en: 'Page crash', Icon: AlertTriangle },
  csp: { ar: 'سياسة الأمان', en: 'Security policy', Icon: ShieldAlert }
};

const toMillis = (t) => (t?.toMillis ? t.toMillis() : 0);

export default function ClientErrorsPanel({ lang = 'ar', triggerToast }) {
  const isAr = lang === 'ar';
  const [entries, setEntries] = useState(undefined); // undefined = loading, null = failed
  const [open, setOpen] = useState(null);

  useEffect(() => subscribeToClientErrors(setEntries), []);

  const groups = useMemo(() => {
    const map = new Map();
    for (const e of entries || []) {
      const key = `${e.kind}|${e.message}|${e.source}`;
      const g = map.get(key) || { key, kind: e.kind, message: e.message, source: e.source, ids: [], paths: new Set(), last: 0, sample: e };
      g.ids.push(e.id);
      if (e.path) g.paths.add(e.path);
      if (toMillis(e.createdAt) > g.last) { g.last = toMillis(e.createdAt); g.sample = e; }
      map.set(key, g);
    }
    return [...map.values()].sort((a, b) => b.last - a.last);
  }, [entries]);

  const resolve = async (g) => {
    try {
      await deleteClientErrors(g.ids);
      triggerToast?.(isAr ? 'اتشال من القايمة' : 'Cleared', 'success');
    } catch {
      triggerToast?.(isAr ? 'ماقدرناش نمسحه، جرّب تاني' : 'Could not clear it', 'error');
    }
  };

  const card = { background: 'var(--crm-card)', border: '1px solid var(--crm-line)', borderRadius: '12px', padding: '16px' };

  return (
    <div style={{ display: 'grid', gap: '12px' }}>
      <div style={card}>
        <h3 style={{ margin: 0, color: 'var(--crm-ink)', fontSize: 'var(--crm-text-lg)' }}>
          {isAr ? 'أخطاء الموقع عند الزوار' : 'Errors seen by visitors'}
        </h3>
        <p style={{ margin: '6px 0 0', color: 'var(--crm-muted)', fontSize: 'var(--crm-text-sm)' }}>
          {isAr
            ? 'أي خطأ يحصل في متصفح زائر بيتسجل هنا تلقائيًا (من غير بيانات الفورم). لو نفس الخطأ ظهر كتير أو في صفحة فورم، ابعته للمطوّر. بعد ما يتصلح دوس "اتحل".'
            : 'Errors in visitors\' browsers are recorded here automatically (never form contents). Send recurring ones to the developer, then mark them resolved.'}
        </p>
      </div>

      {entries === undefined && <div style={card}>{isAr ? 'جاري التحميل…' : 'Loading…'}</div>}
      {entries === null && (
        <div style={card}>{isAr ? 'تعذّر تحميل السجل (الصفحة دي للمدير العام بس).' : 'Could not load the log (super admin only).'}</div>
      )}
      {entries && groups.length === 0 && (
        <div style={{ ...card, display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--crm-positive)' }}>
          <CheckCircle2 size={20} /> {isAr ? 'مفيش أخطاء متسجلة. كله تمام.' : 'No errors recorded.'}
        </div>
      )}

      {groups.map((g) => {
        const k = KIND_LABEL[g.kind] || KIND_LABEL.error;
        const expanded = open === g.key;
        return (
          <div key={g.key} style={card}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <k.Icon size={18} style={{ color: g.kind === 'csp' ? 'var(--crm-accent-text)' : 'var(--crm-danger)', flexShrink: 0, marginTop: 2 }} />
              <div style={{ flex: '1 1 260px', minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: 'var(--crm-ink)', overflowWrap: 'anywhere' }} dir="ltr">{g.message}</div>
                <div style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-muted)', marginTop: 4 }}>
                  {isAr ? k.ar : k.en} · {g.ids.length}× · {isAr ? 'آخر مرة' : 'last'} {g.last ? new Date(g.last).toLocaleString(isAr ? 'ar-EG' : 'en-GB') : '—'}
                  {' · '}<span dir="ltr">{[...g.paths].slice(0, 4).join('  ')}</span>
                </div>
              </div>
              <button type="button" className="btn btn-outline" onClick={() => setOpen(expanded ? null : g.key)}>
                {expanded ? (isAr ? 'إخفاء' : 'Hide') : (isAr ? 'التفاصيل' : 'Details')}
              </button>
              <button type="button" className="btn btn-outline" onClick={() => resolve(g)}>
                <Trash2 size={14} /> {isAr ? 'اتحل' : 'Resolved'}
              </button>
            </div>
            {expanded && (
              <pre dir="ltr" style={{ marginTop: 12, padding: 12, background: 'var(--crm-subtle)', borderRadius: 8, fontSize: 'var(--crm-text-xs)', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', maxHeight: 280, overflow: 'auto' }}>
                {[
                  g.source && `${g.source}:${g.sample.line}:${g.sample.col}`,
                  `release ${g.sample.release || '—'}`,
                  g.sample.ua,
                  '',
                  g.sample.stack
                ].filter((x) => x !== undefined && x !== false).join('\n')}
              </pre>
            )}
          </div>
        );
      })}
    </div>
  );
}
