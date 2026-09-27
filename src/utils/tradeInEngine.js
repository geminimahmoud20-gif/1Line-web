// =============================================================
//  1LINE — Real estate trade-in (بدل) options and matching engine
//  Used by the public wizard (instant inventory preview) and the CRM tab (client ↔ client swaps).
// =============================================================

export const OFFER_TYPES = [
  { id: 'apartment', ar: 'شقة', en: 'Apartment' },
  { id: 'villa', ar: 'فيلا / بيت مستقل', en: 'Villa / house' },
  { id: 'building', ar: 'عمارة', en: 'Building' },
  { id: 'land', ar: 'أرض مباني', en: 'Building land' },
  { id: 'agri_land', ar: 'أرض زراعية', en: 'Farmland' },
  { id: 'shop', ar: 'محل / تجاري', en: 'Shop / commercial' }
];

export const LEGAL_STATUSES = [
  { id: 'registered', ar: 'مسجل شهر عقاري', en: 'Registered title' },
  { id: 'court_validated', ar: 'صحة ونفاذ', en: 'Court-validated contract' },
  { id: 'preliminary', ar: 'عقد ابتدائي', en: 'Preliminary contract' },
  { id: 'poa', ar: 'توكيل', en: 'Power of attorney' },
  { id: 'inheritance', ar: 'ميراث (لم يُقسَّم بعد)', en: 'Undivided inheritance' },
  { id: 'unsure', ar: 'مش متأكد — محتاج مراجعة', en: 'Not sure — needs review' }
];

export const WANT_TYPES = [
  { id: 'villa', ar: 'فيلا في سوهاج الجديدة', en: 'Villa in New Sohag', matchOffer: ['villa'], matchProperty: (p) => p.type === 'villa' },
  { id: 'land', ar: 'أرض متميزة', en: 'Prime land', matchOffer: ['land'], matchProperty: (p) => p.type === 'land' },
  { id: 'bigger_apartment', ar: 'شقة أكبر', en: 'A bigger apartment', matchOffer: ['apartment'], matchProperty: (p) => p.type === 'apartment' || p.type === 'duplex' || p.type === 'penthouse' },
  { id: 'building', ar: 'عمارة / بيت عيلة', en: 'Building / family house', matchOffer: ['building'], matchProperty: (p) => p?.family?.kind === 'full_building' },
  { id: 'commercial', ar: 'تجاري / عيادة', en: 'Commercial / clinic', matchOffer: ['shop'], matchProperty: (p) => p.type === 'commercial' || p.type === 'office' }
];

export const DIFF_MODES = [
  { id: 'pay', ar: 'أدفع فرق كاش', en: 'I pay the difference' },
  { id: 'receive', ar: 'أستلم فرق كاش', en: 'I receive the difference' },
  { id: 'even', ar: 'بدل رأس برأس', en: 'Even swap' }
];

export const labelOf = (list, id, isAr = true) => {
  const o = list.find((x) => x.id === id);
  return o ? (isAr ? o.ar : o.en) : id || '—';
};

/** Budget the requester can reach: their property's value adjusted by the cash difference. */
export const reachBudget = (t) => {
  const v = Number(t.offerValue) || 0;
  const d = Number(t.diffAmount) || 0;
  if (t.diffMode === 'pay') return v + d;
  if (t.diffMode === 'receive') return Math.max(0, v - d);
  return v;
};

const wantMatchesOffer = (want, other) => {
  const w = WANT_TYPES.find((x) => x.id === want.wantType);
  if (!w || !w.matchOffer.includes(other.offerType)) return false;
  // "Bigger apartment" must be bigger than the apartment being traded in (a villa owner
  // asking for an apartment is not comparing against the villa's size)
  if (want.wantType === 'bigger_apartment' && want.offerType === 'apartment' && Number(want.offerSize) && Number(other.offerSize)) {
    return Number(other.offerSize) > Number(want.offerSize);
  }
  if (Number(want.wantSize) && Number(other.offerSize) && Number(other.offerSize) < Number(want.wantSize) * 0.85) return false;
  return true;
};

const priceFit = (budget, value) => {
  if (!budget || !value) return 0.5; // unknown values: neutral
  const gap = Math.abs(budget - value) / Math.max(budget, value);
  return Math.max(0, 1 - gap * 2); // 0% gap → 1, 50% gap → 0
};

/**
 * Client ↔ client swap candidates, strongest first.
 * mutual: both sides want what the other offers. oneWay: only A wants B's property.
 */
export function findTradeMatches(requests) {
  const open = requests.filter((r) => !['closed', 'rejected'].includes(r.status));
  const out = [];
  for (let i = 0; i < open.length; i++) {
    for (let j = 0; j < open.length; j++) {
      if (i === j) continue;
      const a = open[i];
      const b = open[j];
      if (!wantMatchesOffer(a, b)) continue;
      const mutual = wantMatchesOffer(b, a);
      if (mutual && j < i) continue; // list each mutual pair once
      const fitA = priceFit(reachBudget(a), Number(b.offerValue));
      const fitB = mutual ? priceFit(reachBudget(b), Number(a.offerValue)) : 0;
      const sameGov = a.offerGovernorate && a.offerGovernorate === b.offerGovernorate ? 0.1 : 0;
      const score = Math.round(Math.min(1, (mutual ? 0.55 : 0.3) + (mutual ? (fitA + fitB) / 2 : fitA) * 0.35 + sameGov) * 100);
      const cashGap = (Number(a.offerValue) || 0) - (Number(b.offerValue) || 0);
      out.push({ id: `${a.id}__${b.id}`, a, b, mutual, score, cashGap });
    }
  }
  return out.sort((x, y) => y.score - x.score);
}

/** Published inventory that fits what the requester wants and can afford (±15%). */
export function matchInventory(request, properties = [], limit = 6) {
  const w = WANT_TYPES.find((x) => x.id === request.wantType);
  if (!w) return [];
  const budget = reachBudget(request);
  return properties
    .filter((p) => !p.isDeleted && !['trash', 'hidden', 'draft', 'sold'].includes(p.status))
    .filter((p) => w.matchProperty(p))
    .filter((p) => !(request.wantType === 'bigger_apartment' && request.offerType === 'apartment' && Number(request.offerSize) && Number(p.size) <= Number(request.offerSize)))
    .filter((p) => !budget || Number(p.price) <= budget * 1.15)
    .map((p) => ({ property: p, fit: priceFit(budget, Number(p.price)) }))
    .sort((a, b) => b.fit - a.fit)
    .slice(0, limit);
}
