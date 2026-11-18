import { Select } from '../ui';
import './property-facets.css';

/**
 * CRM → العقارات: filter the table by property type and by area. Two compact selects, each option
 * with its count; listings with no (or an unknown) area are flagged "⚠" at the end of the list.
 */
export default function PropertyFacetFilter({ types, areas, total, typeFilter, areaFilter, onType, onArea, isAr }) {
  return (
    <>
      <Select
        hideLabel
        label={isAr ? 'نوع العقار' : 'Property type'}
        className={`pf-select${typeFilter !== 'all' ? ' is-on' : ''}`}
        value={typeFilter}
        onChange={(e) => onType(e.target.value)}
        options={[
          { value: 'all', label: `${isAr ? 'كل الأنواع' : 'All types'} (${total})` },
          ...types.map((t) => ({ value: t.id, label: `${t.label} (${t.count})` }))
        ]}
      />
      <Select
        hideLabel
        label={isAr ? 'المنطقة' : 'Area'}
        className={`pf-select${areaFilter !== 'all' ? ' is-on' : ''}`}
        value={areaFilter}
        onChange={(e) => onArea(e.target.value)}
        options={[
          { value: 'all', label: `${isAr ? 'كل المناطق' : 'All areas'} (${total})` },
          ...areas.map((a) => ({ value: a.id, label: `${a.warn ? '⚠ ' : ''}${a.label} (${a.count})` }))
        ]}
      />
    </>
  );
}
