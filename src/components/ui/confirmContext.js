import { createContext, useContext } from 'react';

export const ConfirmContext = createContext(null);

// const confirm = useConfirm();
// if (await confirm({ title, message, confirmLabel, tone: 'danger' })) { ... }
// Falls back to the browser dialog when no ConfirmProvider is mounted.
export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  return ctx || ((opts) => Promise.resolve(window.confirm(opts?.message || opts?.title || '')));
}
