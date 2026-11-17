import { useState } from 'react';
import { X } from 'lucide-react';
import { leadCreatedMs } from '../../utils/crmLeadViews';

/**
 * «دمج كل المكرر»: a preview of every client who filled in more than one form. Per client: the file that stays and
 * how many earlier requests move into its history. The others are archived, never deleted.
 */
export default function MergeAllModal({ plans = [], isAr, onCancel, onConfirm }) {
  const [busy, setBusy] = useState(false);
  const total = plans.reduce((n, p) => n + p.others.length, 0);
  const date = (l) => { const t = leadCreatedMs(l); return t ? new Date(t).toLocaleDateString(isAr ? 'ar-EG-u-nu-latn' : 'en-GB') : '—'; };
  const run = async () => {
    if (busy || !plans.length) return;
    setBusy(true);
    try { await onConfirm(); } finally { setBusy(false); }
  };
  return (
    <div className="track-modal-backdrop" onClick={onCancel}>
      <div className="property-form-modal-card" role="dialog" aria-modal="true" aria-labelledby="mergeall-title" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
        <div className="modal-form-header">
          <h3 id="mergeall-title">{isAr ? `دمج ${plans.length} عميل مكرر` : `Merge ${plans.length} duplicate clients`}</h3>
          <button type="button" className="drawer-close-btn" onClick={onCancel} aria-label={isAr ? 'إغلاق' : 'Close'}><X size={18} /></button>
        </div>
        {plans.length === 0 ? (
          <p style={{ margin: '0 0 12px' }}>{isAr ? 'مفيش مكرر مفتوح دلوقتي.' : 'No open duplicates right now.'}</p>
        ) : (
          <>
            <p style={{ margin: '0 0 12px', fontSize: 'var(--crm-text-sm)', color: 'var(--crm-muted)' }}>
              {isAr
                ? `هيفضل ملف واحد لكل عميل (اللي ليه مسؤول، وبعده الأبعد مرحلة، وبعده الأقدم). ${total} طلب هيتسجلوا في سجل أحداثه ويتأرشفوا، ومفيش حاجة بتتمسح. الصفقات المقفولة والخسرانة مش داخلة.`
                : `One file stays per client (the owned one, then the furthest stage, then the oldest). ${total} requests move into its history and are archived; nothing is deleted. Closed and lost deals are left out.`}
            </p>
            <div className="crm-merge-list" style={{ maxHeight: '45vh', overflowY: 'auto' }}>
              {plans.map((p) => (
                <div key={p.keep.id} className="crm-merge-item">
                  <span className="crm-merge-main">
                    <strong>{p.keep.name || (isAr ? 'بدون اسم' : 'Unnamed')}</strong>
                    <span><bdi dir="ltr">{p.keep.phone || p.keep.whatsapp || '—'}</bdi></span>
                    <span>
                      {isAr ? `هيفضل: ملف ${date(p.keep)}` : `Keeps: file from ${date(p.keep)}`}
                      {' · '}{p.keep.ownerName || p.keep.claimedBy || (isAr ? 'بدون مسؤول' : 'no owner')}
                      {' · '}{isAr ? `+${p.others.length} طلب` : `+${p.others.length} request(s)`}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '14px', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-outline btn-sm" onClick={onCancel}>{isAr ? 'إلغاء' : 'Cancel'}</button>
          <button type="button" className="btn btn-primary btn-sm" onClick={run} disabled={busy || plans.length === 0}>
            {busy ? (isAr ? 'جاري الدمج…' : 'Merging…') : (isAr ? `ادمج ${plans.length} عميل` : `Merge ${plans.length}`)}
          </button>
        </div>
      </div>
    </div>
  );
}
