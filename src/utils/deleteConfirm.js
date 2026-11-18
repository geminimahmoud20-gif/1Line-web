// =============================================================
//  The question asked before a client is deleted or hidden: it names the client (or the first few and how many),
//  says what happens and that a delete cannot be taken back. One place, so every screen asks the same way.
//  Pure: tests/unit/delete-confirm.test.mjs
// =============================================================

const SHOWN = 3;

/** «سامي، منى، كريم و٢ تانيين» */
export function namesLine(names = [], isAr = true) {
  const list = names.map((n) => String(n || '').trim() || (isAr ? 'عميل بدون اسم' : 'Unnamed')).filter(Boolean);
  if (list.length <= SHOWN) return list.join(isAr ? '، ' : ', ');
  const rest = list.length - SHOWN;
  return `${list.slice(0, SHOWN).join(isAr ? '، ' : ', ')}${isAr ? ` و${rest} تانيين` : ` and ${rest} more`}`;
}

/** What to ask before deleting these clients for good: { title, message, confirmLabel, tone } */
export function deletePrompt({ names = [], isAr = true } = {}) {
  const n = names.length || 1;
  const who = namesLine(names, isAr);
  return {
    title: isAr ? (n === 1 ? 'تحذف العميل نهائيًا؟' : `تحذف ${n} عميل نهائيًا؟`) : (n === 1 ? 'Delete this client for good?' : `Delete ${n} clients for good?`),
    message: isAr
      ? `${who ? `${who}: ` : ''}بيانات العميل وكل سجله هتتمسح ومش هتقدر ترجّعها. لو عايز تخفيه بس، استخدم الأرشفة.`
      : `${who ? `${who}: ` : ''}the client and the whole history are removed and cannot be restored. To only hide a client, archive instead.`,
    confirmLabel: isAr ? 'احذف نهائيًا' : 'Delete for good',
    tone: 'danger'
  };
}

/** What to ask before hiding a client from the lists (archive: nothing is deleted) */
export function archivePrompt({ name = '', isAr = true } = {}) {
  const who = String(name || '').trim() || (isAr ? 'العميل' : 'this client');
  return {
    title: isAr ? 'تخفي العميل من القوائم؟' : 'Hide this client from the lists?',
    message: isAr
      ? `${who} هيتخفى من الوارد والمسار والعملاء. مفيش حاجة بتتمسح، وتقدر ترجّعه من الأرشيف.`
      : `${who} disappears from the inbox, pipeline and clients. Nothing is deleted; you can bring them back from the archive.`,
    confirmLabel: isAr ? 'اخفيه' : 'Hide'
  };
}
