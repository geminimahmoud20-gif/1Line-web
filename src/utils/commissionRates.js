// =============================================================
//  The company's fees, in one place (no imports, so any module can read them):
//  commission 1.5% from the buyer and 2.5% from the seller (owner), plus a legal review fee of
//  500 EGP for every million of the deal value, taken from each side.
// =============================================================
export const BUYER_COMMISSION_PCT = 1.5;
export const SELLER_COMMISSION_PCT = 2.5;
export const LEGAL_FEE_PER_MILLION = 500;

/** Legal review fee on one side of a deal of `value` EGP */
export const legalFee = (value) => Math.round((Math.max(0, Number(value) || 0) / 1_000_000) * LEGAL_FEE_PER_MILLION);
