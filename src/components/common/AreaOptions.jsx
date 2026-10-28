import { groupedAreas, shortAreaName } from '../../utils/areaLookup';

/**
 * The <option>s of every area menu: each main area with its sub-areas grouped under it.
 * A main area that has sub-areas gets its own «كل …» option inside its group (a filter on it
 * covers the sub-areas; a listing or request can sit on the main area when no sub-area fits).
 * Main areas without sub-areas are plain options, so a list nobody arranged looks as before.
 * "كل المناطق" is the caller's choice: pass includeAll to show it first.
 */
export default function AreaOptions({ areas = [], isAr = true, includeAll = false, allLabel }) {
  const all = includeAll ? areas.find((a) => a?.id === 'all') : null;
  return (
    <>
      {includeAll && (
        <option value="all">{allLabel || (isAr ? (all?.name_ar || 'كل المناطق') : (all?.name_en || 'All areas'))}</option>
      )}
      {groupedAreas(areas).map(({ main, children }) => {
        const mainName = shortAreaName(main, areas, isAr);
        if (children.length === 0) return <option key={main.id} value={main.id}>{mainName}</option>;
        return (
          <optgroup key={main.id} label={mainName}>
            <option value={main.id}>{isAr ? `كل ${mainName}` : `All of ${mainName}`}</option>
            {children.map((c) => (
              <option key={c.id} value={c.id}>{shortAreaName(c, areas, isAr)}</option>
            ))}
          </optgroup>
        );
      })}
    </>
  );
}
