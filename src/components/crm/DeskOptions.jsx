import { assignableDesks, getLiveLeadDesks, LEAD_DESKS } from '../../utils/rbacRules';

/**
 * <option>s for an "assigned desk" <select>: only the desks this role may assign to.
 * `current` is always listed so a lead already on another desk still shows its owner.
 */
export default function DeskOptions({ role, desk = null, current, lang = 'ar', includeUnassigned = true }) {
  const isAr = lang === 'ar';
  let desks = assignableDesks(role, desk);
  if (!includeUnassigned) desks = desks.filter((d) => d.value !== 'Unassigned');
  if (current && !desks.some((d) => d.value === current)) {
    const allDesks = getLiveLeadDesks();
    const known = allDesks.find((d) => d.value === current) || LEAD_DESKS.find((d) => d.value === current);
    desks = [known || { value: current, label_ar: current, label_en: current }, ...desks];
  }
  return desks.map((d) => (
    <option key={d.value} value={d.value}>{isAr ? d.label_ar : d.label_en}</option>
  ));
}
