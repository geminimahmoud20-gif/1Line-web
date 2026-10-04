// Used by the CRM's server search (services/leads.js searchLeads): phones are stored as typed.

/** The ways one Egyptian mobile number tends to be typed */
export const phoneVariants = (input) => {
  const raw = String(input || '').trim();
  const digits = raw.replace(/\D/g, '');
  let local = digits;
  if (local.startsWith('0020')) local = `0${local.slice(4)}`;
  else if (local.startsWith('20') && local.length === 12) local = `0${local.slice(2)}`;
  else if (local.length === 10 && local.startsWith('1')) local = `0${local}`;
  const intl = local.startsWith('0') ? local.slice(1) : local;
  return [...new Set([raw, digits, local, `+20${intl}`, `20${intl}`, `0020${intl}`].filter((v) => v && v.length >= 7))].slice(0, 30);
};
