// Export whatever report is on screen: its numbers, findings, bars and tables become rows
// { القسم, البند, القيمة, تفاصيل } for Excel / CSV. Reading the rendered report keeps every tab exportable
// without a separate export per report. tests/unit/report-export.test.mjs (the pure part)

const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
export const row = (section, item, value = '', details = '') => ({ القسم: clean(section), البند: clean(item), القيمة: clean(value), تفاصيل: clean(details) });

/** A table as rows: the first cell names the row, the rest go as «column: value» pairs */
export function tableRows(section, headers = [], body = []) {
  return body.filter((cells) => cells.length).map((cells) => {
    const [first, ...rest] = cells;
    const pairs = rest.map((v, i) => `${clean(headers[i + 1] || '')}: ${clean(v)}`).filter((p) => !/:\s*$/.test(p));
    return row(section, first, clean(rest[0] ?? ''), pairs.join(' | '));
  });
}

const text = (el, sel) => clean(sel ? el.querySelector(sel)?.textContent : el.textContent);
const headingOf = (el, fallback) => {
  const box = el.closest('section, .pr-block, .xs-card, figure');
  const h = box?.querySelector('h2, h3');
  return h ? clean(h.textContent) : fallback;
};

/** Every number, finding, bar and table inside `root` (the report area), in reading order */
export function collectReport(root, title = 'التقرير') {
  if (!root) return [];
  const out = [];
  root.querySelectorAll('.ui-kpi').forEach((k) => out.push(row('الأرقام', text(k, '.ui-kpi__label'), text(k, '.ui-kpi__value'), text(k, '.ui-kpi__foot'))));
  root.querySelectorAll('.pr-card').forEach((k) => out.push(row(headingOf(k, 'الأرقام'), text(k, '.pr-card__label'), text(k, '.pr-card__value'), text(k, '.pr-card__delta'))));
  root.querySelectorAll('.xs-findings li, .pr-findings li').forEach((li) => out.push(row('ملاحظات', text(li))));
  root.querySelectorAll('.xs-funnel li').forEach((li) => out.push(row(headingOf(li, 'القمع'), text(li, '.xs-funnel__label'), text(li, '.xs-funnel__num'))));
  root.querySelectorAll('.ui-bars__row').forEach((b) => out.push(row(headingOf(b, title), text(b, '.ui-bars__label'), text(b, '.ui-bars__value'), text(b, '.ui-bars__note'))));
  root.querySelectorAll('table').forEach((t) => {
    const headers = [...t.querySelectorAll('thead th')].map((th) => th.textContent);
    const body = [...t.querySelectorAll('tbody tr')].map((tr) => [...tr.querySelectorAll('th, td')].map((c) => c.textContent));
    out.push(...tableRows(headingOf(t, title), headers, body));
  });
  return out;
}
