import { useEffect, useRef, useState } from 'react';

// ── Keyboard triage for the CRM leads table (audit DEF-22) ──
// J/K move, Enter opens the drawer, W WhatsApp, S focuses the status chip.
// Uses e.code so it works on the Arabic keyboard layout (J types "ت").
// Returns [highlighted row index, setter] (rows also set it on click). `list` is the visible leads.
export default function useLeadKeyboardTriage({ list, onOpen, onWhatsApp }) {
  const [kbdIndex, setKbdIndex] = useState(-1);
  const kbdRef = useRef({ list: [], index: -1, open: null, wa: null });

  // The window listener reads the latest table state through the ref
  useEffect(() => {
    kbdRef.current = { list, index: kbdIndex, open: onOpen, wa: onWhatsApp };
  });

  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (!document.querySelector('.crm-table[data-kbd="leads"]')) return;
      if (document.querySelector('.crm-lead-drawer, .crm-modal-backdrop, .track-modal-backdrop, .crm-command-modal')) return;
      const t = e.target;
      if (t?.closest?.('input, textarea, select, [contenteditable="true"]')) return;
      const { list: rows, index, open, wa } = kbdRef.current;
      if (!rows.length) return;
      const lead = rows[index] || null;
      if (e.code === 'KeyJ') { e.preventDefault(); setKbdIndex((i) => Math.min(rows.length - 1, i + 1)); }
      else if (e.code === 'KeyK') { e.preventDefault(); setKbdIndex((i) => Math.max(0, i - 1)); }
      else if (e.code === 'Enter' && lead && !t?.closest?.('button, a, summary')) { e.preventDefault(); open?.(lead); }
      else if (e.code === 'KeyW' && lead) { e.preventDefault(); wa?.(lead); }
      else if (e.code === 'KeyS' && lead) {
        e.preventDefault();
        document.querySelector(`.crm-table tr[data-lead-id="${CSS.escape(String(lead.id))}"] .crm-status-select`)?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (kbdIndex < 0) return;
    document.querySelectorAll('.crm-table[data-kbd="leads"] tbody tr')[kbdIndex]?.scrollIntoView({ block: 'nearest' });
  }, [kbdIndex]);

  return [kbdIndex, setKbdIndex];
}
