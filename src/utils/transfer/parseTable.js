// =============================================================
//  Reading a spreadsheet the staff picked: CSV / TSV / TXT (any of , ; tab |), Excel (.xlsx),
//  or JSON (an array of rows, or a 1Line backup { properties: [...] } / { leads: [...] }).
//  Everything comes back in one shape: { headers: string[], rows: string[][] }.
// =============================================================

const BOM = /^\uFEFF/;

/** RFC 4180 CSV: quoted fields may contain the delimiter, quotes ("") and line breaks */
export function parseDelimited(text, delimiter) {
  const src = String(text || '').replace(BOM, '');
  const delim = delimiter || detectDelimiter(src);
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += ch;
      continue;
    }
    if (ch === '"' && field === '') inQuotes = true;
    else if (ch === delim) { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(field); field = '';
      rows.push(row); row = [];
    } else field += ch;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => String(c).trim() !== ''));
}

/** The separator used in the header line: the most frequent of , ; tab | outside quotes */
export function detectDelimiter(text) {
  const firstLine = [];
  let inQuotes = false;
  for (const ch of String(text || '')) {
    if (ch === '"') inQuotes = !inQuotes;
    if (!inQuotes && (ch === '\n' || ch === '\r')) break;
    if (!inQuotes) firstLine.push(ch);
  }
  const counts = { ',': 0, ';': 0, '\t': 0, '|': 0 };
  for (const ch of firstLine) if (ch in counts) counts[ch]++;
  const [best, n] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return n > 0 ? best : ',';
}

const cellText = (v) => {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? '' : v.toISOString().slice(0, 10);
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
};

/** First non-empty row is the header; every row padded to the header width */
export function toTable(matrix) {
  const rows = (matrix || []).map((r) => (Array.isArray(r) ? r.map(cellText) : []));
  const headerIndex = rows.findIndex((r) => r.some((c) => c.trim() !== ''));
  if (headerIndex === -1) return { headers: [], rows: [] };
  const headers = rows[headerIndex].map((h, i) => h.replace(BOM, '').trim() || `عمود ${i + 1}`);
  const body = rows.slice(headerIndex + 1)
    .filter((r) => r.some((c) => c.trim() !== ''))
    .map((r) => headers.map((_, i) => r[i] ?? ''));
  return { headers, rows: body };
}

/** JSON: array of objects, or a backup wrapper with the array under a known key */
export function tableFromJson(text, preferredKeys = ['properties', 'leads', 'items', 'data', 'rows']) {
  const parsed = JSON.parse(String(text || '').replace(BOM, ''));
  let list = Array.isArray(parsed) ? parsed : null;
  if (!list && parsed && typeof parsed === 'object') {
    const key = preferredKeys.find((k) => Array.isArray(parsed[k]));
    list = key ? parsed[key] : null;
  }
  if (!list) throw new Error('json-shape');
  const objects = list.filter((x) => x && typeof x === 'object' && !Array.isArray(x));
  const headers = [];
  for (const o of objects) for (const k of Object.keys(o)) if (!headers.includes(k)) headers.push(k);
  return {
    headers,
    rows: objects.map((o) => headers.map((h) => cellText(o[h]))),
    // Original objects: a 1Line backup carries fields (images, coordinates…) that a table can't
    objects
  };
}

export const FILE_KINDS = {
  csv: ['csv', 'tsv', 'txt'],
  excel: ['xlsx'],
  json: ['json']
};
export const ACCEPT_ATTR = '.csv,.tsv,.txt,.xlsx,.json,text/csv,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const extOf = (name = '') => (String(name).toLowerCase().match(/\.([a-z0-9]+)$/) || [])[1] || '';

/**
 * Read a File into { headers, rows, kind, objects? }.
 * Throws Error('unsupported') for old .xls / other formats, Error('empty') for no rows.
 */
export async function readTableFile(file) {
  const ext = extOf(file?.name);
  let table;
  if (FILE_KINDS.excel.includes(ext)) {
    const { readSheet } = await import('read-excel-file/universal');
    table = { ...toTable(await readSheet(file)), kind: 'excel' };
  } else if (FILE_KINDS.json.includes(ext)) {
    table = { ...tableFromJson(await file.text()), kind: 'json' };
  } else if (FILE_KINDS.csv.includes(ext)) {
    table = { ...toTable(parseDelimited(await file.text(), ext === 'tsv' ? '\t' : undefined)), kind: 'csv' };
  } else if (ext === 'xls') {
    throw new Error('xls');
  } else {
    throw new Error('unsupported');
  }
  if (!table.headers.length || !table.rows.length) throw new Error('empty');
  return table;
}
