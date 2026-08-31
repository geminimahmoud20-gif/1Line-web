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
          <button 
            type="button" 
            className="toast-close-btn"
            onClick={() => onDismiss(toast.id)}
            aria-label="Dismiss toast"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
