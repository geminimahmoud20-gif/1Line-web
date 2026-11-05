import { useMemo } from 'react';
import { Building, FileText, ExternalLink } from 'lucide-react';
import { Badge, EmptyState } from '../../ui';
import { getAreas } from '../../../utils/areasData';
import { areaPathName } from '../../../utils/areaLookup';
import { brokerUnits, brokerDemands, unitStage, demandStage, demandsForUnit, unitsForDemand } from '../../../utils/brokerFile';
import './broker-file.css';

const money = (v) => (Number(v) > 0 ? `${Number(v).toLocaleString('en-US')} ج.م` : '');
const tone = (score) => (score >= 80 ? 'is-high' : score >= 60 ? 'is-mid' : 'is-low');

/**
 * «ملف الوسيط» in the lead drawer: the units this client brought, each with its stage and the open
 * buyer requests it fits (with a match %), and the requests they brought, each with the listed
 * units that fit it. Arabic only, like the rest of the drawer's working copy.
 */
export default function BrokerFile({ lead, properties = [], demands = [] }) {
  const areas = useMemo(() => getAreas(), []);
  const units = useMemo(() => brokerUnits(lead, properties), [lead, properties]);
  const own = useMemo(() => brokerDemands(lead, demands), [lead, demands]);
  const area = (id) => areaPathName(id, areas, true);

  if (!units.length && !own.length) {
    return (
      <EmptyState
        icon={<Building size={22} />}
        title="لسه مفيش وحدات ولا طلبات مربوطة بالعميل ده"
        description="لما تسجّل وحدة وتختار إن صاحبها هو العميل ده، أو يتسجّل طلب برقمه، هيظهروا هنا مع نسبة المطابقة."
      />
    );
  }

  return (
    <div className="crm-ld__stack bf">
      <section className="crm-ld__block" aria-labelledby="bf-units">
        <h3 id="bf-units" className="crm-ld__h"><Building size={16} aria-hidden="true" /> وحداته ({units.length})</h3>
        {units.length === 0 ? <p className="crm-ld__hint">مفيش وحدات مسجّلة باسمه.</p> : (
          <ul className="bf-list">
            {units.map((u) => {
              const st = unitStage(u);
              const fits = demandsForUnit(u, demands, areas);
              return (
                <li key={u.id} className="bf-item">
                  <div className="bf-head">
                    <a href={`/properties/${u.id}`} target="_blank" rel="noreferrer" className="bf-title">
                      {u.unitCode ? `${u.unitCode} · ` : ''}{u.title_ar || 'وحدة'} <ExternalLink size={13} aria-hidden="true" />
                    </a>
                    <Badge tone={st.tone} dot>{st.ar}</Badge>
                  </div>
                  <p className="bf-meta">{[area(u.areaKey), Number(u.size) ? `${u.size} م²` : '', money(u.price)].filter(Boolean).join(' · ')}</p>
                  {fits.length ? (
                    <ul className="bf-fits" aria-label="طلبات مناسبة">
                      {fits.map(({ demand, score, misses }) => (
                        <li key={demand.id}>
                          <span className={`bf-score ${tone(score)}`}>{score}%</span>
                          <span className="bf-fit-text">
                            <b>{demand.clientName ? `طلب ${demand.clientName}` : 'طلب مشتري'}</b>
                            {' '}{[area(demand.area), money(demand.budget) && `ميزانية ${money(demand.budget)}`].filter(Boolean).join(' · ')}
                            {misses.length > 0 && <small>{misses.join('، ')}</small>}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="bf-none">مفيش طلب مشتري مناسب للوحدة دي دلوقتي.</p>}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="crm-ld__block" aria-labelledby="bf-demands">
        <h3 id="bf-demands" className="crm-ld__h"><FileText size={16} aria-hidden="true" /> طلباته ({own.length})</h3>
        {own.length === 0 ? <p className="crm-ld__hint">مفيش طلبات شراء مسجّلة برقمه.</p> : (
          <ul className="bf-list">
            {own.map((d) => {
              const st = demandStage(d);
              const fits = unitsForDemand(d, properties, areas);
              return (
                <li key={d.id} className="bf-item">
                  <div className="bf-head">
                    <span className="bf-title">{d.text_ar || 'طلب شراء'}</span>
                    <Badge tone={st.tone} dot>{st.ar}</Badge>
                  </div>
                  <p className="bf-meta">{[area(d.area), money(d.budget) && `ميزانية ${money(d.budget)}`].filter(Boolean).join(' · ')}</p>
                  {fits.length ? (
                    <ul className="bf-fits" aria-label="وحدات مطابقة">
                      {fits.map(({ unit, score, misses }) => (
                        <li key={unit.id}>
                          <span className={`bf-score ${tone(score)}`}>{score}%</span>
                          <span className="bf-fit-text">
                            <a href={`/properties/${unit.id}`} target="_blank" rel="noreferrer"><b>{unit.unitCode ? `${unit.unitCode} · ` : ''}{unit.title_ar || 'وحدة'}</b></a>
                            {' '}{[area(unit.areaKey), money(unit.price)].filter(Boolean).join(' · ')}
                            {misses.length > 0 && <small>{misses.join('، ')}</small>}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="bf-none">مفيش وحدة معروضة مطابقة للطلب ده دلوقتي.</p>}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
