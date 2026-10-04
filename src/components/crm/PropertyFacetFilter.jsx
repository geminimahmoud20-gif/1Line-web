import { Building2, Home, Store, Briefcase, Mountain, MapPin, LayoutGrid, X } from 'lucide-react';
import './property-facets.css';

const TYPE_ICONS = { apartment: Building2, villa: Home, commercial: Store, office: Briefcase, land: Mountain };

/**
 * CRM → العقارات: filter the table by property type and by area. One row of type pills and one of
 * area pills (swipe sideways when they overflow), each with its count; "الكل" clears a row.
 */
export default function PropertyFacetFilter({ types, areas, typeFilter, areaFilter, onType, onArea, isAr }) {
  const total = types.reduce((s, t) => s + t.count, 0);
  const active = typeFilter !== 'all' || areaFilter !== 'all';
  return (
    <section className="pf-bar" aria-label={isAr ? 'فلترة العقارات' : 'Filter listings'}>
      <div className="pf-row" role="group" aria-label={isAr ? 'نوع العقار' : 'Property type'}>
        <span className="pf-label">{isAr ? 'النوع' : 'Type'}</span>
        <div className="pf-track">
          <button type="button" className={`pf-pill ${typeFilter === 'all' ? 'is-on' : ''}`} aria-pressed={typeFilter === 'all'} onClick={() => onType('all')}>
            <LayoutGrid size={14} aria-hidden="true" /> {isAr ? 'الكل' : 'All'} <b>{total}</b>
          </button>
          {types.map((t) => {
            const Icon = TYPE_ICONS[t.id] || Building2;
            const on = typeFilter === t.id;
            return (
              <button key={t.id} type="button" className={`pf-pill ${on ? 'is-on' : ''}`} aria-pressed={on} onClick={() => onType(on ? 'all' : t.id)}>
                <Icon size={14} aria-hidden="true" /> {t.label} <b>{t.count}</b>
              </button>
            );
          })}
        </div>
      </div>

      <div className="pf-row" role="group" aria-label={isAr ? 'المنطقة' : 'Area'}>
        <span className="pf-label">{isAr ? 'المنطقة' : 'Area'}</span>
        <div className="pf-track">
          <button type="button" className={`pf-pill pf-pill--area ${areaFilter === 'all' ? 'is-on' : ''}`} aria-pressed={areaFilter === 'all'} onClick={() => onArea('all')}>
            <MapPin size={14} aria-hidden="true" /> {isAr ? 'كل المناطق' : 'All areas'}
          </button>
          {areas.map((a) => {
            const on = areaFilter === a.id;
            return (
              <button key={a.id} type="button" className={`pf-pill pf-pill--area ${on ? 'is-on' : ''}`} aria-pressed={on} onClick={() => onArea(on ? 'all' : a.id)}>
                {a.label} <b>{a.count}</b>
              </button>
            );
          })}
        </div>
      </div>

      {active && (
        <button type="button" className="pf-clear" onClick={() => { onType('all'); onArea('all'); }}>
          <X size={13} aria-hidden="true" /> {isAr ? 'مسح الفلاتر' : 'Clear filters'}
        </button>
      )}
    </section>
  );
}
