// src/components/crm/ConcurrencyConflictModal.jsx
// 1Line OS Concurrency Conflict Resolution Modal
import { RefreshCw, X, ShieldAlert } from 'lucide-react';

export default function ConcurrencyConflictModal({
  isOpen,
  conflictData,
  onReload,
  onOverwrite,
  onClose,
  isAr = true
}) {
  if (!isOpen || !conflictData) return null;

  const editorName = conflictData.currentEntity?.lastEditedBy || conflictData.heldBy || (isAr ? 'زميل آخر' : 'another colleague');
  const updatedAt = conflictData.currentEntity?.updatedAt
    ? new Date(conflictData.currentEntity.updatedAt).toLocaleTimeString(isAr ? 'ar-EG-u-nu-latn' : 'en-US', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
    >
      <div
        style={{
          background: 'var(--crm-card)',
          border: '1.5px solid var(--crm-danger)',
          borderRadius: '16px',
          maxWidth: '480px',
          width: '100%',
          padding: '24px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
          animation: 'scaleUp 0.15s ease'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'var(--crm-danger-soft)',
              color: 'var(--crm-danger)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <ShieldAlert size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 'var(--crm-text-md)', fontWeight: 800, color: 'var(--crm-ink)' }}>
                {isAr ? '⚠️ تضارب تعديل متزامن (Collision)' : '⚠️ Concurrent Edit Collision'}
              </h3>
              <span style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-muted)' }}>
                {isAr ? 'حماية بيانات 1Line OS من المسح غير المقصود' : '1Line OS Data Overwrite Protection'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={isAr ? 'إغلاق' : 'Close'}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--crm-muted)',
              padding: '4px'
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{
          background: 'var(--crm-bg)',
          borderRadius: '10px',
          padding: '14px',
          fontSize: 'var(--crm-text-sm)',
          color: 'var(--crm-body)',
          lineHeight: 1.6,
          marginBottom: '20px',
          border: '1px solid var(--crm-line)'
        }}>
          <p style={{ margin: 0 }}>
            {isAr ? (
              <>
                قام <strong>{editorName}</strong> بتحديث هذه البيانات في <strong>{updatedAt || 'قبل لحظات'}</strong> (النسخة #{conflictData.currentVersion || 'الجديدة'}).
                <br />
                حفظ تعديلاتك الآن سيتسبب في <strong>فقدان التحديثات</strong> التي قام بها زميلك.
              </>
            ) : (
              <>
                <strong>{editorName}</strong> updated this record at <strong>{updatedAt || 'moments ago'}</strong> (Version #{conflictData.currentVersion || 'new'}).
                <br />
                Saving your changes now would overwrite their latest work.
              </>
            )}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            type="button"
            onClick={onReload}
            style={{
              width: '100%',
              padding: '10px 16px',
              borderRadius: '8px',
              border: 'none',
              background: 'var(--crm-accent)',
              color: 'var(--crm-on-dark)',
              fontSize: 'var(--crm-text-sm)',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <RefreshCw size={14} />
            <span>{isAr ? 'تحديث السجل وجلب أحدث نسخة (مستحسن)' : 'Reload Latest Version (Recommended)'}</span>
          </button>

          {onOverwrite && (
            <button
              type="button"
              onClick={onOverwrite}
              style={{
                width: '100%',
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid var(--crm-line)',
                background: 'transparent',
                color: 'var(--crm-danger)',
                fontSize: 'var(--crm-text-xs)',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {isAr ? 'تجاوز وحفظ نسختي كأحدث إصدار (قسري)' : 'Force Overwrite with My Changes'}
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            style={{
              width: '100%',
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              background: 'transparent',
              color: 'var(--crm-muted)',
              fontSize: 'var(--crm-text-xs)',
              cursor: 'pointer'
            }}
          >
            {isAr ? 'إلغاء' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
}
