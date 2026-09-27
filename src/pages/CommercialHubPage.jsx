import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Stethoscope, Briefcase, Store, LayoutGrid, Activity, ParkingSquare, Route, MessageCircle, Calculator } from 'lucide-react';
import PropertyCard from '../components/properties/PropertyCard';
import RentalYieldCalculator from '../components/commercial/RentalYieldCalculator';
import { getCommercialInsights, isCommercialAsset, computeRentalYield } from '../utils/propertyInsights';
import { getWhatsAppUrl } from '../utils/founderCmsData';
import { updatePageSeo } from '../utils/seoHelper';
import '../styles/expat-suite.css';

const isMedical = (p) => {
  const ins = getCommercialInsights(p);
  return /عيادة|طبي|clinic|medical/i.test(`${p.title_ar || ''} ${p.adminType_ar || ''} ${p.title_en || ''}`)
    || Boolean(ins?.traffic?.some((t) => t.id === 'hospital_zone' || t.id === 'clinic_cluster'));
};

const TABS = [
  { id: 'all', icon: LayoutGrid, ar: 'الكل', en: 'All' },
  { id: 'medical', icon: Stethoscope, ar: 'عيادات ومراكز طبية', en: 'Clinics & medical' },
  { id: 'office', icon: Briefcase, ar: 'مكاتب إدارية', en: 'Offices' },
  { id: 'retail', icon: Store, ar: 'محلات وتجاري', en: 'Retail' }
];

/**
 * مركز الاستثمار الطبي والتجاري بالصعيد — clinics, offices and shops with the indicators
 * that decide a commercial purchase in Upper Egypt, plus a rent yield calculator.
 */
export default function CommercialHubPage({ lang = 'ar', currency = 'EGP', properties = [], favorites = [], onToggleFavorite, compareList = [], onToggleCompare, onQuickView }) {
  const isAr = lang === 'ar';
  const L = (ar, en) => (isAr ? ar : en);
  const [tab, setTab] = useState('all');

  useEffect(() => {
    updatePageSeo({
      title: L('عيادات ومكاتب ومحلات للبيع في سوهاج — مركز الاستثمار التجاري', 'Clinics, offices & shops for sale in Sohag — Commercial hub'),
      description: L(
        'عقارات تجارية وطبية في سوهاج مع مؤشرات القرار: كثافة الشارع، الوصول من المراكز، الركن، وحاسبة العائد الإيجاري وفترة استرداد رأس المال.',
        'Commercial and medical property in Sohag with decision indicators: foot traffic, access from nearby towns, parking, and a rent yield calculator.'
      ),
      url: '/commercial-hub',
      type: 'website'
    });
  }, [lang]); // eslint-disable-line react-hooks/exhaustive-deps

  const pool = useMemo(
    () => properties.filter((p) => !p.isDeleted && !['trash', 'hidden', 'draft'].includes(p.status) && isCommercialAsset(p)),
    [properties]
  );

  const list = useMemo(() => pool.filter((p) => {
    if (tab === 'medical') return isMedical(p);
    if (tab === 'office') return p.type === 'office' || p.category === 'administrative';
    if (tab === 'retail') return p.type === 'commercial' || p.category === 'commercial';
    return true;
  }), [pool, tab]);

  const counts = useMemo(() => ({
    all: pool.length,
    medical: pool.filter(isMedical).length,
    office: pool.filter((p) => p.type === 'office' || p.category === 'administrative').length,
    retail: pool.filter((p) => p.type === 'commercial' || p.category === 'commercial').length
  }), [pool]);

  return (
    <div className="xs-hub" dir={isAr ? 'rtl' : 'ltr'}>
      <header className="xs-hub-hero">
        <p className="xs-kicker">{L('مركز الاستثمار الطبي والتجاري بالصعيد', 'Upper Egypt medical & commercial hub')}</p>
        <h1>{L(<>مكانك الصح <em>بيجيب الزبون</em> قبل ما تفتح</>, <>The right spot <em>brings the customers</em> before you open</>)}</h1>
        <p>{L('عيادات ومكاتب ومحلات بمؤشرات حقيقية: مين بيعدي في الشارع، المرضى والزبائن جايين منين، والركن سهل ولا صعب — وحاسبة تقولك امتى هترجّع فلوسك.', 'Clinics, offices and shops with real indicators: who walks by, where customers come from, how easy parking is — and when you get your money back.')}</p>
        <div className="xs-hub-pills">
          <span><Activity size={14} aria-hidden="true" /> {L('مؤشر الكثافة', 'Foot traffic')}</span>
          <span><Route size={14} aria-hidden="true" /> {L('الوصول من المراكز', 'Regional access')}</span>
          <span><ParkingSquare size={14} aria-hidden="true" /> {L('الركن', 'Parking')}</span>
          <span><Calculator size={14} aria-hidden="true" /> {L('العائد والاسترداد', 'Yield & payback')}</span>
        </div>
      </header>

      <div className="xs-hub-body">
        <div className="xs-tabs" role="tablist" aria-label={L('نوع العقار', 'Asset type')}>
          {TABS.map(({ id, icon: Icon, ar, en }) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'is-on' : ''} onClick={() => setTab(id)}>
              <Icon size={15} aria-hidden="true" />
              <span>{isAr ? ar : en}</span>
              <b>{counts[id]}</b>
            </button>
          ))}
        </div>

        {list.length > 0 ? (
          <div className="xs-hub-grid">
            {list.map((p) => {
              const ins = getCommercialInsights(p);
              const y = ins?.rentPerSqm ? computeRentalYield({ price: p.price, size: p.size, rentPerSqm: ins.rentPerSqm }) : null;
              const nearest = ins?.access?.slice().sort((a, b) => a.minutes - b.minutes)[0];
              return (
                <div key={p.id} className="xs-hub-item">
                  <PropertyCard
                    property={p}
                    lang={lang}
                    currency={currency}
                    isFavorite={favorites.includes(p.id)}
                    onToggleFavorite={onToggleFavorite}
                    isCompared={compareList.some((c) => c.id === p.id)}
                    onToggleCompare={onToggleCompare}
                    onQuickView={onQuickView}
                  />
                  {ins && (
                    <ul className="xs-hub-strip" aria-label={L('مؤشرات مختصرة', 'Key indicators')}>
                      {ins.traffic[0] && <li><Activity size={13} aria-hidden="true" />{isAr ? ins.traffic[0].ar : ins.traffic[0].en}</li>}
                      {nearest && <li><Route size={13} aria-hidden="true" />{isAr ? `${nearest.ar} ${nearest.minutes} د` : `${nearest.en} ${nearest.minutes} min`}</li>}
                      {ins.parking && <li className={`is-${ins.parking.tone}`}><ParkingSquare size={13} aria-hidden="true" />{isAr ? ins.parking.ar : ins.parking.en}</li>}
                      {y && <li className="is-good"><Calculator size={13} aria-hidden="true" />{isAr ? `استرداد ≈ ${Math.round(y.paybackYears * 10) / 10} سنة` : `Payback ≈ ${Math.round(y.paybackYears * 10) / 10} yrs`}</li>}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="xs-empty">
            <Stethoscope size={30} aria-hidden="true" />
            <h3>{L('مفيش وحدات معروضة في التصنيف ده دلوقتي', 'Nothing listed in this category right now')}</h3>
            <p>{L('قولنا انت محتاج إيه — مساحة العيادة، الدور، الشارع — ونجيبلك المتاح قبل ما يتعرض.', 'Tell us what you need — size, floor, street — and we will find it before it is listed.')}</p>
            <a className="xs-btn xs-btn--royal" href={getWhatsAppUrl(L('مرحباً 1Line، أبحث عن مقر تجاري/عيادة في سوهاج بالمواصفات التالية: ', 'Hello 1Line, I am looking for a commercial unit/clinic in Sohag: '))} target="_blank" rel="noopener noreferrer">
              <MessageCircle size={17} aria-hidden="true" /> {L('اطلب مقرك على واتساب', 'Request on WhatsApp')}
            </a>
          </div>
        )}

        <section className="xs-hub-calc" aria-labelledby="xs-hub-calc-title">
          <h2 id="xs-hub-calc-title"><Calculator size={20} aria-hidden="true" /> {L('احسب عائد أي محل أو عيادة', 'Work out the yield of any shop or clinic')}</h2>
          <p>{L('حط سعر الشراء والمساحة والإيجار المتوقع للمتر، وشوف معدل الرسملة وفترة الاسترداد فوراً.', 'Enter the price, area and expected rent per m² to see cap rate and payback instantly.')}</p>
          <RentalYieldCalculator lang={lang} currency={currency} />
          <p className="xs-hub-more">
            <Link to="/properties?type=commercial">{L('كل المحلات التجارية ←', 'All retail units →')}</Link>
            <Link to="/properties?type=office">{L('كل المكاتب والعيادات ←', 'All offices & clinics →')}</Link>
          </p>
        </section>
      </div>
    </div>
  );
}
