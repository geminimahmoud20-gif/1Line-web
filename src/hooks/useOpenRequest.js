import { useState } from 'react';

/**
 * Opens a panel's modal when the CRM shell asks for it (top-bar "+ new …", command palette,
 * dashboard shortcuts). `request` is { type, seq } from CrmPage; each seq opens once per mount.
 * Runs during render (React's "adjust state on prop change" pattern), so no effect is needed.
 */
export default function useOpenRequest(request, types, open) {
  const [seen, setSeen] = useState(0);
  if (request && types.includes(request.type) && request.seq !== seen) {
    setSeen(request.seq);
    open(request.type);
  }
}
