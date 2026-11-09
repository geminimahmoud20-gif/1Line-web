import { assignableDesks, getLiveLeadDesks, LEAD_DESKS } from '../../utils/rbacRules';
import { personValue, isPersonValue, personFor } from '../../utils/assignees';

/**
 * <option>s for an "assigned to" <select>: the people on the team by name (`people`, from
 * hooks/useTeamMembers), then the desks this role may assign to.
 * `current` is always listed so a lead already with someone else still shows its owner.
 */
export default function DeskOptions({ role, desk = null, current, lang = 'ar', includeUnassigned = true, people = [] }) {
  const isAr = lang === 'ar';
  let desks = assignableDesks(role, desk);
  if (!includeUnassigned) desks = desks.filter((d) => d.value !== 'Unassigned');
  if (current && !isPersonValue(current) && !desks.some((d) => d.value === current)) {
    const allDesks = getLiveLeadDesks();
    const known = allDesks.find((d) => d.value === current) || LEAD_DESKS.find((d) => d.value === current);
    desks = [known || { value: current, label_ar: current, label_en: current }, ...desks];
  }
  // A manager assigns to anyone; an agent only sees desks they may use, and people on them
  const deskIds = new Set(desks.map((d) => d.value));
  const fullList = desks.length > 2;
  let list = people.filter((p) => p.name && (fullList || !p.desk || deskIds.has(p.desk)));
  if (isPersonValue(current) && !list.some((p) => personValue(p) === current)) {
    const owner = personFor(current, people) || personFor(current);
    if (owner) list = [owner, ...list];
  }
  const deskOptions = desks.map((d) => (
    <option key={d.value} value={d.value}>{isAr ? d.label_ar : d.label_en}</option>
  ));
  if (!list.length) return deskOptions;
  return [
    <optgroup key="people" label={isAr ? 'البياعين' : 'People'}>
      {list.map((p) => <option key={personValue(p)} value={personValue(p)}>{p.name}</option>)}
    </optgroup>,
    <optgroup key="desks" label={isAr ? 'الفرق' : 'Teams'}>{deskOptions}</optgroup>
  ];
}
