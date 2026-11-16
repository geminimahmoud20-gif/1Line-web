// Completion of the sell form, shown as the green ring. The form has 4 steps and each is worth a quarter;
// a step is complete when its required answers are in (specs and photos count once the guest has moved past them).
import { toLatinDigits } from './latinDigits.js';
const digits = (v) => toLatinDigits(String(v ?? '')).replace(/\D/g, '');

export const SELL_STEP_COUNT = 4;

/**
 * @param a      the answers so far
 * @param step   the step the guest is on (0-3)
 * @param reached the furthest step the guest has been to (so going back does not undo a finished step)
 */
export function sellProgress(a = {}, step = 0, reached = step) {
  const far = Math.max(step, reached);
  const first = {
    role: a.sellerRole === 'owner' || a.sellerRole === 'broker',
    type: Boolean(a.propertyType),
    area: Boolean(a.area),
    size: parseInt(digits(a.size), 10) >= 20,
    address: String(a.address || '').trim().length >= 3
  };
  const last = {
    name: String(a.name || '').trim().length >= 2,
    phone: digits(a.phone).length >= 8
  };
  const share = (o) => Object.values(o).filter(Boolean).length / Object.keys(o).length;
  const hasPhotos = Object.keys(a.photoSlots || {}).length > 0;
  const fracs = [
    share(first),
    far > 1 ? 1 : 0,
    far > 2 || hasPhotos ? 1 : 0,
    share(last)
  ];
  const done = fracs.filter((f) => f === 1).length;
  const percent = Math.round((fracs.reduce((s, f) => s + f, 0) / SELL_STEP_COUNT) * 100);

  let next;
  if (step === 0) next = Object.keys(first).find((k) => !first[k]) || 'continue';
  else if (step === 1) next = 'specs';
  else if (step === 2) next = hasPhotos ? 'continue' : 'photos';
  else next = Object.keys(last).find((k) => !last[k]) || 'send';
  return { done, total: SELL_STEP_COUNT, percent, next };
}
