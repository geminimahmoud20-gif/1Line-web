import { useCallback, useMemo, useRef, useState } from 'react';
import Modal from './Modal';
import Button from './Button';
import { ConfirmContext } from './confirmContext';

// Replaces window.confirm with a dialog that matches the CRM, names the action on its button,
// and puts focus on "cancel" for destructive actions so Enter does not delete by accident.
export default function ConfirmProvider({ children, cancelLabel = 'إلغاء' }) {
  const [req, setReq] = useState(null);
  const resolver = useRef(null);

  const confirm = useCallback((opts) => new Promise((resolve) => {
    resolver.current = resolve;
    setReq({ tone: 'danger', confirmLabel: 'تأكيد', ...opts });
  }), []);

  const settle = (value) => {
    resolver.current?.(value);
    resolver.current = null;
    setReq(null);
  };

  const value = useMemo(() => confirm, [confirm]);
  const danger = req?.tone === 'danger';
  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <Modal
        open={Boolean(req)}
        onClose={() => settle(false)}
        title={req?.title || ''}
        description={req?.message}
        size="sm"
        footer={(
          <>
            <Button variant="secondary" onClick={() => settle(false)} data-autofocus={danger || undefined}>
              {req?.cancelLabel || cancelLabel}
            </Button>
            <Button variant={danger ? 'danger' : 'primary'} onClick={() => settle(true)} data-autofocus={!danger || undefined}>
              {req?.confirmLabel}
            </Button>
          </>
        )}
      >
        {req?.body || null}
      </Modal>
    </ConfirmContext.Provider>
  );
}
