import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, ArrowLeft, Sparkles, ShieldCheck, Clock, Percent, MessageSquare } from 'lucide-react';
import MortgageRoiCalculator from '../components/calculators/MortgageRoiCalculator';
import { updatePageSeo } from '../utils/seoHelper';
import { getWhatsAppUrl } from '../utils/founderCmsData';

export default function FinancingPage({ lang = 'ar' }) {
  const isAr = lang === 'ar';
  const navigate = useNavigate();

  useEffect(() => {
    updatePageSeo({
      title: isAr ? 'حاسبة التمويل والتقسيط العقاري وحساب العائد' : 'Mortgage & Installment Calculator',
      description: isAr 
        ? 'احسب قسطك الشهري بدقة، خطط ميزانيتك المالية، وحلل العائد الاستثماري لصفقاتك العقارية في سوهاج مع 1Line.' 
        : 'Calculate your exact monthly payments and analyze real estate ROI in Sohag.',
      url: '/financing',
      type: 'website'
    });
  }, [lang, isAr]);

  return (
    <div className="financing-page-wrapper">
      {/* Deep Navy Luxury Hero Header */}
      <section className="financing-hero-section">
        <div className="financing-hero-container">
          {/* Quick Back Navigation Bar */}
          <div className="page-top-back-bar">
            <button
              type="button"
              className="btn-back-step"
              onClick={() => {
                if (window.history.length > 1) {
                  navigate(-1);
                } else {
                  navigate('/');
                }
              }}
              title={isAr ? 'الرجوع خطوة للخلف' : 'Go back one step'}
            >
              {isAr ? <ArrowRight size={16} /> : <ArrowLeft size={16} />}
              <span>{isAr ? 'رجوع خطوة للخلف' : 'Back'}</span>
            </button>
            <div className="page-breadcrumb-sub">
              <Link to="/">{isAr ? 'الرئيسية' : 'Home'}</Link>
              <span>/</span>
              <span className="crumb-current">{isAr ? 'التمويل والتقسيط' : 'Financing'}</span>
            </div>
          </div>

          <div className="financing-badge-pill">
            <Sparkles size={15} className="text-gold" />
            <span>{isAr ? 'برنامج 1Line Now للتمويل والتقسيط العقاري' : '1Line Now Mortgage & Installment Program'}</span>
          </div>

          <h1>{isAr ? 'امتلك عقارك اليوم بأطول فترة سداد وأقل مقدم في سوهاج' : 'Own Your Property with Long-Term Flexible Financing in Sohag'}</h1>
          <p>
            {isAr 
              ? 'احسب قسطك الشهري بدقة، خطط ميزانيتك المالية، أو حلل العائد الاستثماري لصفقاتك السكنية والتجارية بشفافية تامة.' 
              : 'Calculate your exact monthly payments, budget your finances, and analyze investment ROI with total clarity.'}
          </p>
        </div>
      </section>

      {/* Main Interactive Calculator */}
      <section className="financing-calc-section">
        <div className="financing-container">
          <MortgageRoiCalculator lang={lang} />
        </div>
      </section>

      {/* Program Benefits Strip */}
      <section className="financing-benefits-section">
        <div className="financing-container">
          <div className="section-header-centered">
            <h2>{isAr ? 'لماذا تختار برامج التقسيط والتمويل من 1Line؟' : 'Why Choose 1Line Financing Programs?'}</h2>
            <p>{isAr ? 'حلول مالية صُممت خصيصاً لتناسب التدفقات النقدية للمشترين والمستثمرين في سوهاج' : 'Tailored financing solutions designed for Upper Egypt homebuyers and investors'}</p>
          </div>

          <div className="financing-benefits-grid">
            <div className="fin-benefit-card">
              <div className="fin-benefit-icon"><Clock size={24} className="text-gold" /></div>
              <h3>{isAr ? 'فترات سداد مرنة حتى 7 سنوات' : 'Up to 7 Years Repayment'}</h3>
              <p>{isAr ? 'أطول فترة تقسيط مريحة تناسب تدفقاتك المالية الشهرية أو ربع السنوية بدون أعباء مفاجئة.' : 'Longest flexible tenure matching your cash flow with zero hidden fees.'}</p>
            </div>

            <div className="fin-benefit-card">
              <div className="fin-benefit-icon"><Percent size={24} className="text-gold" /></div>
              <h3>{isAr ? 'مقدمات تبدأ من 10% فقط' : 'Downpayments from 10%'}</h3>
              <p>{isAr ? 'ادفع أقل مقدم ممكن (10% فقط) واستلم وحدتك السكنية أو التجارية فوراً مع خطة دفع واضحة.' : 'Pay minimal upfront capital (from 10%) and receive your property keys immediately.'}</p>
            </div>

            <div className="fin-benefit-card">
              <div className="fin-benefit-icon"><ShieldCheck size={24} className="text-gold" /></div>
              <h3>{isAr ? 'موافقة مبدئية خلال 48 ساعة' : 'Fast 48h Pre-Approval'}</h3>
              <p>{isAr ? 'فحص ائتماني سريع ومباشر بأقل المستندات وبدون تعقيدات أو اشتراطات بنكية مرهقة.' : 'Hassle-free pre-approval with minimal paperwork and direct consultation.'}</p>
            </div>
          </div>
        </div>
      </section>

      {/* 🚀 Luxury Financing Call to Action Banner */}
      <section className="financing-cta-section">
        <div className="financing-container">
          <div className="financing-cta-box">
            <div className="cta-content">
              <span className="cta-badge">
                <Sparkles size={14} className="text-gold" />
                {isAr ? 'فرص جاهزة للتعاقد الفوري' : 'Ready for Immediate Contracting'}
              </span>
              <h2>{isAr ? 'هل أنت مستعد لامتلاك وحدتك بأفضل خطة سداد؟' : 'Ready to Secure Your Property with the Best Payment Plan?'}</h2>
              <p>
                {isAr
                  ? 'استعرض العقارات المتاحة حالياً بأنظمة تقسيط مباشرة حتى 7 سنوات، أو تواصل مباشرة مع مستشار التمويل العقاري المعتمد.'
                  : 'Browse certified properties with flexible installment plans up to 7 years, or talk to our certified financial advisory team.'}
              </p>
            </div>
            <div className="cta-actions">
              <Link to="/properties?financing=true" className="btn btn-primary btn-lg">
                <span>{isAr ? 'تصفح عقارات التقسيط المتاحة' : 'Browse Installment Properties'}</span>
                {isAr ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
              </Link>
              <a
                href={getWhatsAppUrl(isAr ? 'مرحباً 1Line، أرغب في استشارة خاصة ببرامج التمويل والتقسيط العقاري المتاحة في سوهاج.' : 'Hello 1Line, I would like a consultation regarding real estate installment plans.')}
                target="_blank"
                rel="noreferrer"
                className="btn btn-outline-gold btn-lg"
              >
                <MessageSquare size={16} />
                <span>{isAr ? 'استشارة تمويلية عبر واتساب' : 'WhatsApp Financial Advisor'}</span>
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
