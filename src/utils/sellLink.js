// =============================================================
//  «سجّل وحدتك» link: /sell?type=apartment&area=new_sohag&ref=ahmed
//  Staff send it to an owner on WhatsApp; the owner opens the seller form with the kind and area
//  already chosen, and the request reaches the CRM marked as coming from the shared link (and
//  who sent it). Pure functions (tests/unit/sell-link.test.mjs).
// =============================================================

const SAFE_ID = /^[a-z0-9_-]{1,40}$/i;
const SAFE_REF = /^[\p{L}\p{N}._-]{1,30}$/u;

/** The link path with whatever was chosen (empty values are left out) */
export function sellLinkPath({ type = '', area = '', ref = '' } = {}) {
  const q = new URLSearchParams();
  if (SAFE_ID.test(type)) q.set('type', type);
  if (SAFE_ID.test(area)) q.set('area', area);
  const r = refFrom(ref);
  if (r) q.set('ref', r);
  const s = q.toString();
  return s ? `/sell?${s}` : '/sell';
}

/** A short, readable name for who sent the link: the part of an email before @, or a name */
export function refFrom(value) {
  const v = String(value || '').trim().split('@')[0].replace(/\s+/g, '_').slice(0, 30);
  return SAFE_REF.test(v) ? v : '';
}

/**
 * What a shared link asks the form to start with. Only known types and areas are taken, so a
 * hand-edited link can't put junk in the form. `areaIds`: the live area ids (plus Cairo ones).
 */
export function readSellLink(search, { typeIds = [], areaIds = [] } = {}) {
  const q = new URLSearchParams(String(search || ''));
  const type = q.get('type') || '';
  const area = q.get('area') || '';
  return {
    propertyType: typeIds.includes(type) ? type : '',
    area: areaIds.includes(area) ? area : '',
    sharedBy: refFrom(q.get('ref'))
  };
}

/** The WhatsApp message staff send with the link */
export const sellLinkMessage = (url) => `أهلاً بحضرتك\nده رابط تسجيل بيانات الوحدة عند 1Line. اكتب المواصفات والسعر وارفع الصور، وهنتواصل معاك بعد ما نراجعها:\n${url}`;
