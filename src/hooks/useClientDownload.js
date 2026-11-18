import { useCallback } from 'react';
import { useClientAuth } from '../context/ClientAuthContext';
import { recordClientDownload } from '../firebaseLazy';

const CLIENT_STORAGE_KEY = 'oneline_client_account';

/** The signed-in site client, read fresh (the action may run right after registration) */
const currentClient = () => {
  try { return JSON.parse(localStorage.getItem(CLIENT_STORAGE_KEY) || 'null'); } catch { return null; }
};

/**
 * Every client download goes through here: without a site account the registration opens first
 * (and the download runs once it completes); then the file is produced and the download is
 * recorded for the team (CRM bell: "العميل X حمّل Y").
 *
 * const download = useClientDownload();
 * download({ kind: 'property_brochure', itemId, itemTitle }, () => generatePropertyPdf(property));
 */
// Files being generated right now: a second tap on a slow phone must not start another PDF
const inFlight = new Set();

export default function useClientDownload() {
  const { requireClientAuth } = useClientAuth();
  return useCallback((meta, produce) => {
    const key = `${meta?.kind || 'file'}:${meta?.itemId || ''}`;
    const run = async () => {
      if (inFlight.has(key)) return;
      inFlight.add(key);
      try {
        await produce();
      } finally {
        inFlight.delete(key);
      }
      const client = currentClient();
      if (client) recordClientDownload({ ...meta, client }).catch(() => {});
    };
    return requireClientAuth(() => { run().catch((err) => console.error('Download failed:', err)); }, 'download', meta?.itemTitle || '');
  }, [requireClientAuth]);
}
