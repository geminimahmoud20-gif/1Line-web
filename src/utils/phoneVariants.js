// Used by the CRM's server search (services/leads.js searchLeads): phones are stored as typed.

/**
 * The ways one phone number tends to be typed. Egyptian mobiles get their local / +20 / 20 / 0020
 * forms; any other country (expats: +966, +971, 00965 …) keeps its own code and gets + / 00 / bare
 * forms, never an Egyptian prefix.
 */
export const phoneVariants = (input) => {
  const raw = String(input || '').trim();
  const digits = raw.replace(/\D/g, '');
  let local = digits;
  if (local.startsWith('0020')) local = `0${local.slice(4)}`;
  else if (local.startsWith('20') && local.length === 12) local = `0${local.slice(2)}`;
  else if (local.length === 10 && local.startsWith('1')) local = `0${local}`;
  const isEgyptian = /^01\d{9}$/.test(local);

  let forms;
  if (isEgyptian) {
    const intl = local.slice(1);
    forms = [raw, digits, local, `+20${intl}`, `20${intl}`, `0020${intl}`];
  } else {
    // International: country code + number, typed with "+", "00" or nothing
    const intl = digits.startsWith('00') ? digits.slice(2) : digits;
    forms = [raw, digits, intl, `+${intl}`, `00${intl}`];
  }
  return [...new Set(forms.filter((v) => v && v.replace(/\D/g, '').length >= 7))].slice(0, 30);
};
