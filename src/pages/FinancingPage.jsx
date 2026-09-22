import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ArrowRight, 
  ArrowLeft, 
  Landmark, 
  ShieldCheck, 
  Clock, 
  Percent, 
  MessageSquare,
  Sparkles,
  Building
} from 'lucide-react';
import MortgageRoiCalculator from '../components/calculators/MortgageRoiCalculator';
import { updatePageSeo } from '../utils/seoHelper';
import { getWhatsAppUrl } from '../utils/founderCmsData';

export default function FinancingPage({ lang = 'ar' }) {
  const isAr = lang === 'ar';
  const navigate = useNavigate();

  useEffect(() => {
    updatePageSeo({
      title: isAr ? 'حاسبة التمويل والأقساط العقارية والعائد الاستثماري | 1Line' : 'Mortgage & Installment ROI Calculator | 1Line',
      description: isAr 
        ? 'احسب قسطك الشهري بدقة، خطط ميزانيتك المالية، وحلل العائد الاستثماري لصفقاتك العقارية في سوهاج مع 1Line.' 
        : 'Calculate your exact monthly payments and analyze real estate ROI in Sohag.',
      url: '/financing',
      type: 'website'
    });
  }, [lang, isAr]);

  return (
    <div className="financing-page-refined" dir={isAr ? 'rtl' : 'ltr'}>
      {/* 🏛️ Compact Executive Header Bar (No Bulky Banners) */}
      <div className="financing-header-bar">
        <div className="financing-header-inner">
          <div className="financing-breadcrumb-nav">
            <button
              type="button"
              className="btn-back-compact"
              onClick={() => {
                if (window.history.length > 1) {
                  navigate(-1);
                } else {
                  navigate('/');
                }
              }}
              title={isAr ? 'الرجوع خطوة للخلف' : 'Go back'}
            >
              {isAr ? <ArrowRight size={14} /> : <ArrowLeft size={14} />}
              <span>{isAr ? 'رجوع' : 'Back'}</span>
            </button>
            <span className="crumb-sep">/</span>
            <Link to="/">{isAr ? 'الرئيسية' : 'Home'}</Link>
            <span className="crumb-sep">/</span>
            <span className="crumb-active">{isAr ? 'التمويل وحساب العائد' : 'Financing & ROI'}</span>
          </div>

          <div className="financing-title-group">
            <div className="financing-pill-tag">
              <Landmark size={13} className="text-gold" />
              <span>{isAr ? '1Line Capital · حلول التمويل والاستثمار العقاري' : '1Line Capital · Financing & Advisory'}</span>
            </div>
            <h1>{isAr ? 'حاسبة التمويل والأقساط وتحليل العائد' : 'Mortgage & Investment ROI Suite'}</h1>
            <p>
              {isAr 
                ? 'نمذجة مالية شفافة لحساب الأقساط الشهرية حتى 7 سنوات، أو تحليل العائد الإيجاري ونمو رأس المال بدقة.' 
                : 'Transparent financial modeling for monthly installments up to 7 years and real estate capital growth.'}
            </p>
          </div>
        </div>
      </div>

      {/* 🧮 Interactive Calculator Engine (Front and Center) */}
      <div className="financing-main-content">
        <div className="financing-content-container">
          <MortgageRoiCalculator lang={lang} />
        </div>
      </div>

      {/* 💎 Refined Value Ribbon (Integrated Key Pillars) */}
      <section className="financing-ribbon-section">
        <div className="financing-content-container">
          <div className="financing-ribbon-grid">
            <div className="financing-ribbon-pill">
              <Clock size={18} className="text-gold ribbon-icon" />
              <div>
                <strong>{isAr ? 'تقسيط مرن حتى 7 سنوات' : 'Up to 7 Years Repayment'}</strong>
                <span>{isAr ? 'أقساط متوازنة مع تدفقاتك النقدية' : 'Tailored cash-flow schedules'}</span>
              </div>
            </div>

            <div className="financing-ribbon-pill">
              <Percent size={18} className="text-gold ribbon-icon" />
              <div>
                <strong>{isAr ? 'مقدمات تبدأ من 10%' : 'From 10% Downpayment'}</strong>
                <span>{isAr ? 'استلام وحدتك بأقل رأس مال مبدئي' : 'Minimal upfront entry barrier'}</span>
              </div>
            </div>

            <div className="financing-ribbon-pill">
              <ShieldCheck size={18} className="text-gold ribbon-icon" />
              <div>
                <strong>{isAr ? 'موافقة وتوثيق قانوني فوري' : 'Direct Advisory & Fast Vetting'}</strong>
                <span>{isAr ? 'فحص ائتماني مباشر بدون تعقيدات' : 'Streamlined pre-approval process'}</span>
              </div>
            </div>
          </div>

          {/* Streamlined Executive Action Bar */}
          <div className="financing-action-dock">
            <div className="action-dock-info">
              <h3>{isAr ? 'هل تبحث عن وحدات جاهزة للتعاقد الفوري بنظام التقسيط؟' : 'Looking for installment-ready certified properties?'}</h3>
              <p>{isAr ? 'تصفح قائمة الوحدات السكنية والتجارية المفحوصة والمتاحة بخطط سداد معتمدة.' : 'Browse pre-vetted residential and commercial properties with active installment plans.'}</p>
            </div>
            <div className="action-dock-btns">
              <Link to="/properties?financing=true" className="btn btn-primary btn-md">
                <Building size={15} />
                <span>{isAr ? 'استعراض عقارات التقسيط' : 'Browse Properties'}</span>
                {isAr ? <ArrowLeft size={14} /> : <ArrowRight size={14} />}
              </Link>
              <a
                href={getWhatsAppUrl(isAr ? 'مرحباً 1Line، أرغب في استشارة مالية بخصوص خطط التقسيط والتمويل المتاحة في سوهاج.' : 'Hello 1Line, inquiring about installment plans in Sohag.')}
                target="_blank"
                rel="noreferrer"
                className="btn btn-outline-gold btn-md"
              >
                <MessageSquare size={15} />
                <span>{isAr ? 'استشارة مستشار التمويل' : 'Financial Advisor WhatsApp'}</span>
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
