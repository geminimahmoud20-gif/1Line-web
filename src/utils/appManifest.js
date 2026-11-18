// Two installable apps on one site: the public site (/manifest.json) and the CRM
// (/crm.webmanifest, id "/crm", opens straight on /crm). The <link rel="manifest"> follows the
// page, so "Install" from the CRM installs "1Line CRM" and from anywhere else the site.

const SITE = '/manifest.json';
const CRM = '/crm.webmanifest';

export const isCrmPath = (path) => /^\/crm(\/|$|\?)/.test(path);

export function setManifestFor(path) {
  if (typeof document === 'undefined') return;
  const link = document.querySelector('link[rel="manifest"]');
  const want = isCrmPath(path) ? CRM : SITE;
  if (link && link.getAttribute('href') !== want) link.setAttribute('href', want);
}
