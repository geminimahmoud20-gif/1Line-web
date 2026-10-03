// =============================================================
//  Download rows as Excel (.xlsx), CSV (Excel-friendly UTF-8) or JSON.
//  rows: array of { [columnLabel]: value } with the same keys in the same order.
// =============================================================

// File names stay Latin (callers pass e.g. 1Line_Properties): some browsers drop a download
// name that has Arabic letters
const stamp = () => new Date().toISOString().slice(0, 10);

const download = (blob, fileName) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoking right away can cancel the download in Safari/Firefox
  setTimeout(() => URL.revokeObjectURL(url), 1500);
};

/** Text that Excel would run as a formula (=, +, -, @) is kept as text */
const safeCell = (v) => (typeof v === 'string' && /^[=+\-@\t\r]/.test(v) ? `'${v}` : v);

export function rowsToCsv(rows) {
  if (!rows.length) return '﻿';
  const headers = Object.keys(rows[0]);
  const q = (v) => `"${String(safeCell(v ?? '')).replace(/"/g, '""')}"`;
  return '﻿' + [headers.map(q).join(','), ...rows.map((r) => headers.map((h) => q(r[h])).join(','))].join('\r\n');
}

export async function exportRows(rows, { format, baseName, sheetName = 'Sheet1', jsonPayload }) {
  if (format === 'json') {
    download(new Blob([JSON.stringify(jsonPayload ?? rows, null, 2)], { type: 'application/json' }), `${baseName}_${stamp()}.json`);
    return;
  }
  if (format === 'csv') {
    download(new Blob([rowsToCsv(rows)], { type: 'text/csv;charset=utf-8' }), `${baseName}_${stamp()}.csv`);
    return;
  }
  // Excel: header row bold, right-to-left sheet, frozen header, columns sized to their content
  const { default: writeExcelFile } = await import('write-excel-file/universal');
  const headers = rows.length ? Object.keys(rows[0]) : [];
  const data = [
    headers.map((h) => ({ value: h, fontWeight: 'bold', backgroundColor: '#F1E9DA' })),
    ...rows.map((r) => headers.map((h) => {
      const v = r[h];
      if (typeof v === 'number') return { value: v, type: Number, format: Number.isInteger(v) && Math.abs(v) >= 1000 ? '#,##0' : undefined };
      return { value: v === null || v === undefined ? '' : String(safeCell(v)), type: String };
    }))
  ];
  const columns = headers.map((h) => ({
    width: Math.min(60, Math.max(10, h.length + 2, ...rows.slice(0, 200).map((r) => String(r[h] ?? '').split('\n')[0].length + 2)))
  }));
  const blob = await writeExcelFile(data, { columns, sheet: sheetName.slice(0, 31), rightToLeft: true, stickyRowsCount: 1 }).toBlob();
  download(blob, `${baseName}_${stamp()}.xlsx`);
}
