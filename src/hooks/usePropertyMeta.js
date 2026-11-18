import { useCallback, useEffect, useState } from 'react';
import { loadPropertyMeta } from '../firebaseLazy';

/**
 * Who added each listing and why one was sent back (property_meta, staff-only), for the rows on screen only:
 * the ids shown are looked up in batches, once each. `patch(id, data)` updates a row after a save.
 */
export default function usePropertyMeta(ids = []) {
  const [meta, setMeta] = useState({});
  const key = ids.join('|');
  useEffect(() => {
    let live = true;
    const list = key ? key.split('|') : [];
    if (!list.length) return undefined;
    loadPropertyMeta(list).then((found) => { if (live && found) setMeta((m) => ({ ...m, ...found })); }).catch(() => {});
    return () => { live = false; };
  }, [key]);
  const patch = useCallback((id, data) => setMeta((m) => ({ ...m, [String(id)]: { ...(m[String(id)] || {}), ...data } })), []);
  return { meta, patch };
}
