// The error text and stack trace on the crash screen are for the team: the CRM and local development. On the
// public site a visitor (and a search engine rendering the page: Search Console listed the stack-trace lines as
// «404 pages») sees only the calm message; the crash is still reported to client_errors.
// Pure: tests/unit/error-details.test.mjs
export const showsTechnicalDetails = (pathname = '', isDev = false) => Boolean(isDev) || /^\/crm(\/|$)/.test(String(pathname || ''));
