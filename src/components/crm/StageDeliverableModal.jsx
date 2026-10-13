// src/components/crm/StageDeliverableModal.jsx
// Modal displayed when an agent attempts a stage transition without the mandatory deliverable.
import { AlertCircle, ArrowLeft, CheckCircle2, ShieldAlert, Sparkles, X } from 'lucide-react';

export default function StageDeliverableModal({
  isOpen,
  onClose,
  blockerInfo,
  lead,
  onOpenDeliverableAction
}) {
  if (!isOpen || !blockerInfo) return null;

  const isHighValue = blockerInfo.deliverableKey === 'founder_high_value_approval';

  return (
    <div className="crm-modal-overlay" style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '16px'
    }}>
      <div className="crm-modal-card" style={{
        backgroundColor: 'var(--crm-card, #1e293b)',
        color: 'var(--crm-ink, #f8fafc)',
        borderRadius: '16px',
        border: '1px solid var(--crm-border, #334155)',
        width: '100%',
        maxWidth: '520px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--crm-border, #334155)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: isHighValue ? 'rgba(239, 68, 68, 0.1)' : 'rgba(234, 179, 8, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {isHighValue ? (
              <ShieldAlert className="w-6 h-6 text-red-500" style={{ color: '#ef4444' }} />
            ) : (
              <AlertCircle className="w-6 h-6 text-amber-500" style={{ color: '#eab308' }} />
            )}
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>
                {isHighValue ? 'اعتماد المؤسس إلزامي (صفقة كبرى)' : 'المخرج الإلزامي للمرحلة مطلوب'}
              </h3>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--crm-muted, #94a3b8)' }}>
                قواعد تشغيل 1Line OS — لا انتقال بدون مخرج موثّق
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--crm-muted, #94a3b8)',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px' }}>
          <div style={{
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            borderRadius: '12px',
            padding: '16px',
            border: '1px solid var(--crm-border, #334155)',
            marginBottom: '20px'
          }}>
            <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', color: 'var(--crm-warn, #f59e0b)' }}>
              ⚠️ سبب إيقاف الانتقال:
            </div>
            <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.6 }}>
              {blockerInfo.missingDeliverable}
            </p>
          </div>

          <div style={{ fontSize: '13px', color: 'var(--crm-muted, #94a3b8)', lineHeight: 1.5 }}>
            💡 <strong>تعليمات الدليل الرسمي:</strong> لضمان عدم ضياع الصفقات بين التأهيل والمعاينة، يفرض النظام استيفاء متطلبات كل مرحلة بدقة لإنشاء مهمة التسليم الآلية للقسم التالي.
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--crm-border, #334155)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
          backgroundColor: 'rgba(15, 23, 42, 0.4)'
        }}>
          <button
            type="button"
            onClick={onClose}
            className="crm-btn crm-btn-ghost"
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              border: '1px solid var(--crm-border, #334155)',
              background: 'transparent',
              color: 'var(--crm-ink, #f8fafc)',
              cursor: 'pointer'
            }}
          >
            إلغاء الأمر
          </button>
          {onOpenDeliverableAction && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenDeliverableAction(lead, blockerInfo.deliverableKey);
              }}
              className="crm-btn crm-btn-primary"
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                background: isHighValue ? '#ef4444' : 'var(--crm-accent, #2563eb)',
                color: '#fff',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>استكمال المخرج الآن</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
