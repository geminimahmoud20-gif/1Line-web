// =============================================================
//  «اطلب مراجعة»: after a deal closes, one tap sends the client the company's Google review link on WhatsApp.
//  Real reviews from real buyers are what lifts a new business on Google, and the team asked for them by hand
//  (or forgot). The link is set once in CRM → إعدادات الموقع (siteSettings.reviews.googleUrl).
//  Pure: tests/unit/review-request.test.mjs
// =============================================================

/** A closed deal that can be asked for a review: a link is set and there is a number to send it to */
export const canRequestReview = (lead, googleUrl, hasPhone = true) => Boolean(googleUrl) && Boolean(hasPhone) && lead?.status === 'closed';

/** When the team already asked this client (ISO), or '' */
export const reviewRequestedAt = (lead) => (typeof lead?.reviewRequestedAt === 'string' ? lead.reviewRequestedAt : '');

const firstName = (name) => String(name || '').trim().split(/\s+/)[0] || '';

/** The WhatsApp message: warm, short, one link, no pressure and no promise of anything in return */
export function reviewRequestMessage(lead, googleUrl) {
  const name = firstName(lead?.name);
  return [
    `أهلاً ${name ? `${name} ` : ''}🌿`,
    'مبروك على الصفقة، وشكراً إنك اخترت 1Line.',
    'لو تجربتك معانا عجبتك، يسعدنا رأيك في دقيقة على جوجل. كلامك بيفرق معانا ومع اللي بيدوّر على عقار زيك:',
    googleUrl
  ].join('\n');
}
