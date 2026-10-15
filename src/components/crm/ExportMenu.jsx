import { useEffect, useRef, useState } from 'react';
import { Download, ChevronDown, FileSpreadsheet, FileText, FileJson } from 'lucide-react';
import { exportRows } from '../../utils/transfer/exportTable';
import './data-transfer.css';
import { Button } from '../ui';

/**
 * "تصدير ▾" — Excel / CSV / JSON. getRows() returns the table rows (labelled columns);
 * getJson() the full records for a JSON backup that imports back as-is. Or onExport(format)
 * when the caller builds the file itself (e.g. to log the export).
 */
export default function ExportMenu({ getRows, getJson, baseName, sheetName, label = 'تصدير', disabled = false, onDone, onExport }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);

  const run = async (format) => {
    setOpen(false);
    setBusy(true);
    try {
      if (onExport) await onExport(format);
      else await exportRows(format === 'json' ? [] : getRows(), { format, baseName, sheetName, jsonPayload: format === 'json' ? getJson() : undefined });
      onDone?.(format, true);
    } catch (e) {
      console.error('Export failed', e);
      onDone?.(format, false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="dx-menu" ref={ref}>
      <Button
        variant="secondary"
        icon={<Download size={16} aria-hidden="true" />}
        iconEnd={<ChevronDown size={16} aria-hidden="true" />}
        loading={busy}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {busy ? 'جاري التجهيز…' : label}
      </Button>
      {open && (
        <div className="dx-menu-list" role="menu">
          <button type="button" role="menuitem" onClick={() => run('excel')}><FileSpreadsheet size={16} aria-hidden="true" /><span><b>Excel</b><small>.xlsx — للفتح والتعديل في Excel أو Google Sheets</small></span></button>
          <button type="button" role="menuitem" onClick={() => run('csv')}><FileText size={16} aria-hidden="true" /><span><b>CSV</b><small>.csv — يفتح في أي برنامج جداول أو نظام تاني</small></span></button>
          {(getJson || onExport) && <button type="button" role="menuitem" onClick={() => run('json')}><FileJson size={16} aria-hidden="true" /><span><b>نسخة كاملة JSON</b><small>.json — بكل التفاصيل والصور، ترجع بالاستيراد زي ما هي</small></span></button>}
        </div>
      )}
    </div>
  );
}
