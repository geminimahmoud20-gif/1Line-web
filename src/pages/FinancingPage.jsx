import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, ArrowLeft, Landmark, ShieldCheck, Clock, Percent, MessageSquare, Building } from 'lucide-react';
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
                ? 'حاسبة استرشادية لتقدير القسط الشهري أو العائد الإيجاري. الأرقام تقديرية وليست عرض تمويل أو التزاماً من 1Line؛ شروط السداد يحددها البائع أو جهة التمويل.' 
                : 'An indicative calculator for monthly payments or rental yield. Figures are estimates, not a financing offer or a commitment by 1Line; payment terms are set by the seller or lender.'}
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
                <strong>{isAr ? 'جرّب مدداً مختلفة' : 'Try different terms'}</strong>
                <span>{isAr ? 'قارن القسط حسب المدة والمقدم' : 'Compare by term and down payment'}</span>
              </div>
            </div>

            <div className="financing-ribbon-pill">
              <Percent size={18} className="text-gold ribbon-icon" />
              <div>
                <strong>{isAr ? 'احسب المقدم المناسب لك' : 'Plan your down payment'}</strong>
                <span>{isAr ? 'الأرقام للاسترشاد فقط' : 'Figures are for guidance only'}</span>
              </div>
            </div>

            <div className="financing-ribbon-pill">
              <ShieldCheck size={18} className="text-gold ribbon-icon" />
              <div>
                <strong>{isAr ? 'مراجعة المستندات قبل التعاقد' : 'Document review before signing'}</strong>
                <span>{isAr ? 'نراجع معك الأوراق قبل أي دفع' : 'We review the papers with you first'}</span>
              </div>
            </div>
          </div>

          {/* Streamlined Executive Action Bar */}
          <div className="financing-action-dock">
            <div className="action-dock-info">
              <h3>{isAr ? 'هل تبحث عن وحدة بنظام سداد مرن؟' : 'Looking for a property with flexible payment?'}</h3>
              <p>{isAr ? 'تصفح الوحدات التي يقبل أصحابها التفاوض على السداد؛ الشروط النهائية يتفق عليها الطرفان كتابياً.' : 'Browse units whose owners are open to payment terms; final terms are agreed in writing between the parties.'}</p>
            </div>
            <div className="action-dock-btns">
              <Link to="/properties?financing=true" className="btn btn-primary btn-md">
                <Building size={15} />
                <span>{isAr ? 'استعراض العقارات' : 'Browse Properties'}</span>
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
