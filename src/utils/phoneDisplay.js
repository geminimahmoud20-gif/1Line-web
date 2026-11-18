// How a phone number is shown on the site (links keep the plain digits)

/** +201223222956 → +20 122 322 2956; anything else is returned as given */
export const readablePhone = (num) => {
  const d = String(num || '').replace(/\D/g, '');
  return d.startsWith('20') && d.length === 12 ? `+20 ${d.slice(2, 5)} ${d.slice(5, 8)} ${d.slice(8)}` : num;
};
