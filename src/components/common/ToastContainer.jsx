import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function ToastContainer({ toasts, onDismiss }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toast-portal-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`custom-toast toast-${toast.type || 'info'}`}>
          <div className="toast-icon-wrap">
            {toast.type === 'success' && <CheckCircle2 size={18} className="text-success" />}
            {toast.type === 'error' && <AlertCircle size={18} className="text-danger" />}
            {(!toast.type || toast.type === 'info') && <Info size={18} className="text-primary" />}
          </div>
          <div className="toast-message-content">
            <p>{toast.message}</p>
          </div>
          {toast.onUndo && (
            <button
              type="button"
              className="toast-undo-btn"
              onClick={() => {
                try {
                  toast.onUndo();
                } catch (err) {
                  console.error('Failed to undo action:', err);
                }
                onDismiss(toast.id);
              }}
              style={{
                background: 'rgba(217, 119, 6, 0.18)',
                border: '1px solid var(--crm-accent, #D97706)',
                color: 'var(--crm-accent-text, #F59E0B)',
                borderRadius: '6px',
                padding: '3px 9px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                marginInlineStart: '8px',
                marginInlineEnd: '4px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'background 0.15s ease',
                whiteSpace: 'nowrap'
              }}
            >
              ↩ {toast.undoLabel || 'تراجع'}
            </button>
          )}
          <button 
            type="button" 
            className="toast-close-btn"
            onClick={() => onDismiss(toast.id)}
            aria-label="إغلاق التنبيه"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
