import { Chip } from '../ui';
import './property-facets.css';

/**
 * CRM → العقارات: filter the table by property type and by area. One row of type chips and one of
 * area chips (swipe sideways when they overflow), each with its count; "الكل" clears a row.
 */
export default function PropertyFacetFilter({ types, areas, typeFilter, areaFilter, onType, onArea, isAr }) {
  const total = types.reduce((s, t) => s + t.count, 0);
  return (
    <section className="pf-bar" aria-label={isAr ? 'فلترة العقارات' : 'Filter listings'}>
      <div className="pf-row" role="group" aria-label={isAr ? 'نوع العقار' : 'Property type'}>
        <span className="pf-label">{isAr ? 'النوع' : 'Type'}</span>
        <div className="pf-track">
          <Chip pressed={typeFilter === 'all'} count={total} onClick={() => onType('all')}>{isAr ? 'الكل' : 'All'}</Chip>
          {types.map((t) => (
            <Chip key={t.id} pressed={typeFilter === t.id} count={t.count} onClick={() => onType(typeFilter === t.id ? 'all' : t.id)}>{t.label}</Chip>
          ))}
        </div>
      </div>
      <div className="pf-row" role="group" aria-label={isAr ? 'المنطقة' : 'Area'}>
        <span className="pf-label">{isAr ? 'المنطقة' : 'Area'}</span>
        <div className="pf-track">
          <Chip pressed={areaFilter === 'all'} count={total} onClick={() => onArea('all')}>{isAr ? 'كل المناطق' : 'All areas'}</Chip>
          {areas.map((a) => (
            <Chip key={a.id} className={a.warn ? 'pf-chip--warn' : undefined} pressed={areaFilter === a.id} count={a.count} onClick={() => onArea(areaFilter === a.id ? 'all' : a.id)}>{a.label}</Chip>
          ))}
        </div>
      </div>
    </section>
  );
}
