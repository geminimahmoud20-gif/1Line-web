// src/components/crm/StageDeliverableModal.jsx
// Modal displayed when an agent attempts a stage transition without the mandatory deliverable.
import { AlertCircle, ArrowLeft, ShieldAlert, X } from 'lucide-react';

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
        backgroundColor: 'var(--crm-card)',
        color: 'var(--crm-ink)',
        borderRadius: '16px',
        border: '1px solid var(--crm-line)',
        width: '100%',
        maxWidth: '520px',
        boxShadow: 'var(--crm-shadow, 0 25px 50px -12px rgba(0, 0, 0, 0.5))',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--crm-line)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: isHighValue ? 'var(--crm-danger-soft, rgba(239, 68, 68, 0.1))' : 'var(--crm-warn-soft, rgba(234, 179, 8, 0.1))'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {isHighValue ? (
              <ShieldAlert size={24} style={{ color: 'var(--crm-danger)' }} />
            ) : (
              <AlertCircle size={24} style={{ color: 'var(--crm-warn)' }} />
            )}
            <div>
              <h3 style={{ margin: 0, fontSize: 'var(--crm-text-lg)', fontWeight: 'bold' }}>
                {isHighValue ? 'اعتماد المؤسس إلزامي (صفقة كبرى)' : 'المخرج الإلزامي للمرحلة مطلوب'}
              </h3>
              <p style={{ margin: 0, fontSize: 'var(--crm-text-xs)', color: 'var(--crm-muted)' }}>
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
              color: 'var(--crm-muted)',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px' }}>
          <div style={{
            backgroundColor: 'var(--crm-subtle)',
            borderRadius: '12px',
            padding: '16px',
            border: '1px solid var(--crm-line)',
            marginBottom: '20px'
          }}>
            <div style={{ fontSize: 'var(--crm-text-sm)', fontWeight: 'bold', marginBottom: '8px', color: 'var(--crm-warn)' }}>
              ⚠️ سبب إيقاف الانتقال:
            </div>
            <p style={{ margin: 0, fontSize: 'var(--crm-text-sm)', lineHeight: 1.6 }}>
              {blockerInfo.missingDeliverable}
            </p>
          </div>

          <div style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-muted)', lineHeight: 1.5 }}>
            💡 <strong>تعليمات الدليل الرسمي:</strong> لضمان عدم ضياع الصفقات بين التأهيل والمعاينة، يفرض النظام استيفاء متطلبات كل مرحلة بدقة لإنشاء مهمة التسليم الآلية للقسم التالي.
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--crm-line)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
          backgroundColor: 'var(--crm-subtle)'
        }}>
          <button
            type="button"
            onClick={onClose}
            className="crm-btn crm-btn-ghost"
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              border: '1px solid var(--crm-line)',
              background: 'transparent',
              color: 'var(--crm-ink)',
              fontSize: 'var(--crm-text-sm)',
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
                background: isHighValue ? 'var(--crm-danger)' : 'var(--crm-accent)',
                color: 'var(--crm-on-dark)',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: 'var(--crm-text-sm)'
              }}
            >
              <span>استكمال المخرج الآن</span>
              <ArrowLeft size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
