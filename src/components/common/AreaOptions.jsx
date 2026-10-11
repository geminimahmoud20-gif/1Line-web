import { groupAreas, cityFilterValue, sectorFilterValue } from '../../utils/areasData';

/**
 * The <option>s of an area <select>, grouped city → sector → district (utils/areasData).
 *  - includeAll: first option "كل المناطق" (value 'all')
 *  - wholeGroups: also offer a whole city / a whole sector (search filters, buyer requests);
 *    values city:<city> and sector:<city>|<sector>, resolved by areaIdsForFilter
 *  - exclude: district ids to leave out
 */
export default function AreaOptions({ areas = [], isAr = true, includeAll = false, allLabel, wholeGroups = false, exclude = [] }) {
  const skip = new Set(exclude);
  const pick = (ar, en) => (isAr ? ar : (en || ar));
  const cities = groupAreas(areas.filter((a) => !skip.has(a.id)));
  const name = (a) => pick(a.name_ar || a.label_ar, a.name_en || a.label_en);
  return (
    <>
      {includeAll && <option value="all">{allLabel || (isAr ? 'كل المناطق' : 'All areas')}</option>}
      {cities.map((city) => {
        const named = city.sectors.filter((s) => s.key);
        return [
          wholeGroups && (
            <optgroup key={`c-${city.key}`} label={pick(city.ar, city.en)}>
              <option value={cityFilterValue(city.key)}>{isAr ? `كل ${city.ar}` : `All of ${city.en || city.ar}`}</option>
              {named.map((s) => (
                <option key={s.key} value={sectorFilterValue(city.key, s.key)}>
                  {isAr ? `${s.ar} (كل الأحياء)` : `${s.en || s.ar} (all districts)`}
                </option>
              ))}
            </optgroup>
          ),
          ...city.sectors.map((s) => (
            <optgroup
              key={`s-${city.key}-${s.key}`}
              label={s.key ? `${pick(city.ar, city.en)} · ${pick(s.ar, s.en)}` : (named.length ? `${pick(city.ar, city.en)} · ${isAr ? 'أحياء أخرى' : 'Other districts'}` : pick(city.ar, city.en))}
            >
              {s.areas.map((a) => <option key={a.id} value={a.id}>{name(a)}</option>)}
            </optgroup>
          ))
        ];
      })}
    </>
  );
}
