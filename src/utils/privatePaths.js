// Pages that show customers' personal data (the CRM, a client's own account). Session recording and
// similar visitor analytics never run there, whatever the visitor accepted on the public site.
const PRIVATE_PREFIXES = ['/crm', '/my-account'];

export const isPrivatePath = (pathname = '') => {
  const p = String(pathname).toLowerCase();
  return PRIVATE_PREFIXES.some((prefix) => p === prefix || p.startsWith(`${prefix}/`) || p.startsWith(`${prefix}?`));
};
