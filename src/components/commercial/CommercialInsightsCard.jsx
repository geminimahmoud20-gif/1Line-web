import { Activity, Route, ParkingSquare, TrainFront, Bus, Milestone, Building2, Stethoscope } from 'lucide-react';
import { getCommercialInsights, isCommercialAsset } from '../../utils/propertyInsights';
import RentalYieldCalculator from './RentalYieldCalculator';
import '../../styles/expat-suite.css';

const ACCESS_ICONS = { train_station: TrainFront, microbus_terminal: Bus, highway: Milestone, city_center: Building2 };

/**
 * مؤشرات القرار الاستثماري لعقار تجاري/طبي: الكثافة، سهولة الوصول من المراكز، الركن، وحاسبة العائد.
 * Shows only indicators the team has filled in; the calculator always shows for commercial assets.
 */
export default function CommercialInsightsCard({ property, lang = 'ar', currency = 'EGP' }) {
  if (!isCommercialAsset(property)) return null;
  const isAr = lang === 'ar';
  const L = (ar, en) => (isAr ? ar : en);
  const ins = getCommercialInsights(property);
  const isMedical = /عيادة|طبي|clinic|medical/i.test(`${property.title_ar || ''} ${property.adminType_ar || ''} ${property.title_en || ''}`)
    || ins?.traffic?.some((t) => t.id === 'hospital_zone' || t.id === 'clinic_cluster');

  return (
    <section className="xs-com" aria-labelledby="xs-com-title">
      <header className="xs-fin-head">
        <span className="xs-fin-icon">{isMedical ? <Stethoscope size={20} aria-hidden="true" /> : <Activity size={20} aria-hidden="true" />}</span>
        <div>
          <h3 id="xs-com-title">{isMedical ? L('مؤشرات القرار للعيادة والمركز الطبي', 'Medical practice indicators') : L('مؤشرات القرار الاستثماري التجاري', 'Commercial investment indicators')}</h3>
          <p>{L('اللي بيفرق فعلاً في الصعيد: مين هيعدي، وهييجي منين، وهيركن فين.', 'What matters in Upper Egypt: who passes by, where they come from, where they park.')}</p>
        </div>
      </header>

      {ins && (
        <div className="xs-com-grid">
          {(ins.traffic.length > 0 || ins.trafficNote_ar) && (
            <div className="xs-com-cell">
              <h4><Activity size={15} aria-hidden="true" /> {L('الكثافة والتردد', 'Foot traffic')}</h4>
              <div className="xs-tags">
                {ins.traffic.map((t) => <span key={t.id} className="xs-tag">{isAr ? t.ar : t.en}</span>)}
              </div>
              {ins.trafficNote_ar && <p>{ins.trafficNote_ar}</p>}
            </div>
          )}

          {(ins.access.length > 0 || ins.accessNote_ar) && (
            <div className="xs-com-cell">
              <h4><Route size={15} aria-hidden="true" /> {L('الوصول من المراكز والقرى', 'Access from nearby towns')}</h4>
              <ul className="xs-access">
                {ins.access.map((a) => {
                  const Icon = ACCESS_ICONS[a.id] || Route;
                  return (
                    <li key={a.id}>
                      <Icon size={15} aria-hidden="true" />
                      <span>{isAr ? a.ar : a.en}</span>
                      <b><bdi>{a.minutes}</bdi> {L('د', 'min')}</b>
                    </li>
                  );
                })}
              </ul>
              {ins.accessNote_ar && <p>{ins.accessNote_ar}</p>}
            </div>
          )}

          {ins.parking && (
            <div className="xs-com-cell">
              <h4><ParkingSquare size={15} aria-hidden="true" /> {L('الركن والاصطفاف', 'Parking')}</h4>
              <span className={`xs-parking xs-parking--${ins.parking.tone}`}>{isAr ? ins.parking.ar : ins.parking.en}</span>
              {isMedical && <p>{L('نقطة حاسمة للطبيب والمريض القادم من المراكز.', 'Decisive for doctors and patients driving in from nearby towns.')}</p>}
            </div>
          )}
        </div>
      )}

      <div className="xs-com-calc">
        <h4>{L('حاسبة العائد الإيجاري للمتر التجاري', 'Commercial rent yield calculator')}</h4>
        <RentalYieldCalculator property={property} defaultRentPerSqm={ins?.rentPerSqm || 0} lang={lang} currency={currency} />
      </div>
    </section>
  );
}
