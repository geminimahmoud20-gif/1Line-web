// =============================================================
//  Who is this client? One answer shown on the client file: owner selling, broker offering a unit, buyer,
//  investor or just a site account. And what is still missing in the file for that kind of client.
//  Pure: tests/unit/client-role.test.mjs
// =============================================================
import { isSellerLead, isAccountLead, sellerMissing, leadBudget, SELLER_DETAIL_LABELS } from './crmLeadViews.js';
import { sellerRoleOf } from './sellerRole.js';
import { askingPriceOf } from './leadPipeline.js';

/**
 * { id, ar, en, tone, hint? }. tone: a Badge tone.
 * 'owner' | 'owner_valuation' | 'seller_unknown' | 'broker_seller' | 'broker' | 'investor' | 'account' | 'buyer'
 */
export function clientRoleOf(lead = {}) {
  const type = String(lead.type || '').toLowerCase();
  if (isSellerLead(lead)) {
    const role = sellerRoleOf(lead);
    if (role === 'broker') return { id: 'broker_seller', ar: 'وسيط · بيعرض عقار', en: 'Broker offering a unit', tone: 'warning' };
    if (type === 'valuation') return { id: 'owner_valuation', ar: 'مالك · طلب تقييم', en: 'Owner · valuation', tone: 'accent' };
    if (role === 'owner') return { id: 'owner', ar: 'مالك · بيبيع عقار', en: 'Owner selling', tone: 'accent' };
    return { id: 'seller_unknown', ar: 'بائع · مالك ولا وسيط؟', en: 'Seller · owner or broker?', tone: 'accent', hint: 'اسأله: هو صاحب العقار ولا وسيط؟' };
  }
  if (isAccountLead(lead)) return { id: 'account', ar: 'حساب بالموقع · لم يحدد', en: 'Site account · undecided', tone: 'neutral', hint: 'سجّل حساب بس: لسه ما قالش بيشتري ولا بيبيع' };
  if (type === 'broker') return { id: 'broker', ar: 'وسيط · شريك', en: 'Partner broker', tone: 'warning' };
  if (type === 'investor') return { id: 'investor', ar: 'مستثمر', en: 'Investor', tone: 'success' };
  return { id: 'buyer', ar: 'مشتري · بيدوّر على عقار', en: 'Buyer', tone: 'info' };
}

/** What the file still lacks for this kind of client: [{ id, ar }] */
export function missingFor(lead = {}) {
  const role = clientRoleOf(lead).id;
  const d = lead.details || {};
  const out = [];
  if (role === 'owner' || role === 'owner_valuation' || role === 'seller_unknown' || role === 'broker_seller') {
    if (role === 'seller_unknown') out.push({ id: 'sellerRole', ar: 'مالك ولا وسيط' });
    if (!(askingPriceOf(lead) > 0)) out.push({ id: 'askingPrice', ar: 'السعر المطلوب' });
    for (const k of sellerMissing(lead)) out.push({ id: k, ar: SELLER_DETAIL_LABELS[k] });
    if (!String(d.propertyType || lead.propertyType || '').trim()) out.push({ id: 'propertyType', ar: 'نوع العقار' });
  } else if (role === 'buyer') {
    if (!(leadBudget(lead) > 0)) out.push({ id: 'budget', ar: 'الميزانية' });
    if (!String(d.area || lead.area || '').trim()) out.push({ id: 'area', ar: 'المنطقة' });
    if (!String(d.propertyType || lead.propertyType || '').trim()) out.push({ id: 'propertyType', ar: 'نوع العقار' });
  }
  return out;
}
