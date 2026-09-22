import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  Lock, 
  EyeOff, 
  Award, 
  MessageSquare, 
  PhoneCall, 
  Sparkles, 
  ArrowRight, 
  ArrowLeft,
  Building,
  CheckCircle2,
  FileCheck,
  KeyRound,
  Compass
} from 'lucide-react';
import { getWhatsAppUrl, getFounderSettings } from '../utils/founderCmsData';
import PrivateOfficeSection from '../components/home/PrivateOfficeSection';

export default function PrivateOfficePage({ lang = 'ar', triggerToast }) {
  const isAr = lang === 'ar';
  const navigate = useNavigate();
  const cms = getFounderSettings();

  const handleConfidentialInquiry = () => {
    const text = isAr
      ? 'مرحباً، أرغب في التواصل مع المكتب الخاص 1Line Private Office بخصوص صفقات كبار العملاء الخاصة والحصرية (Off-Market).'
      : 'Hello 1Line Private Office, I would like to inquire about exclusive off-market luxury acquisitions.';
    window.open(getWhatsAppUrl(text), '_blank');
  };

  const handleListOffMarket = () => {
    const text = isAr
      ? 'مرحباً، أمتلك عقاراً فاخراً / أرضاً استراتيجية بسوهاج وأرغب في عرضها للبيع عبر المكتب الخاص (Off-Market) بأعلى درجات الخصوصية والأمان دون نشر صور للعامة.'
      : 'Hello, I own a prime property in Sohag and wish to discuss a discreet private off-market sale with your Private Office.';
    window.open(getWhatsAppUrl(text), '_blank');
  };

  return (
    <div className="private-office-page-wrapper" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Top Header / Back Navigation */}
      <div className="page-top-back-bar" style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 20px 0' }}>
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
          <span className="crumb-current">{isAr ? 'المكتب الخاص (Off-Market)' : 'Private Office'}</span>
        </div>
      </div>

      {/* Main Dedicated Private Office Showcase */}
      <PrivateOfficeSection lang={lang} />

      {/* Deep-Dive Off-Market Categories & Protocols */}
      <div className="private-office-details-container" style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 20px 80px' }}>
        {/* Categories Grid */}
        <div className="offmarket-categories-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '24px',
          marginBottom: '40px'
        }}>
          {/* Card 1: Palaces & Mansions */}
          <div className="private-pillar-card">
            <div className="pillar-icon-box">
              <Building size={22} className="text-gold" />
            </div>
            <h4>{isAr ? 'قصور وفيلات الكورنيش النيلي' : 'Nile Waterfront Palaces & Estates'}</h4>
            <p>
              {isAr 
                ? 'فيلات وقصور استثنائية بمواقع نادرة على نيل سوهاج، يتم تداولها حصرياً بين النخبة دون تصوير علني وبموجب تكليف وساطة خاص.'
                : 'Rare premier estates along the Nile Corniche, traded exclusively among ultra-high-net-worth investors under strict private mandate.'}
            </p>
          </div>

          {/* Card 2: Strategic Land Plots */}
          <div className="private-pillar-card">
            <div className="pillar-icon-box">
              <KeyRound size={22} className="text-gold" />
            </div>
            <h4>{isAr ? 'أراضٍ استراتيجية وتجارية غير معلنة' : 'Confidential Strategic Land Plots'}</h4>
            <p>
              {isAr
                ? 'مساحات كبرى على محاور رئيسية بمدينة سوهاج وسوهاج الجديدة، مهيأة لمشروعات تجارية وأبراج سكنية بملايين الجنيهات.'
                : 'Prime multi-acre commercial and mixed-use land parcels in central hubs, vetted for immediate sovereign development.'}
            </p>
          </div>

          {/* Card 3: Investment Buildings */}
          <div className="private-pillar-card">
            <div className="pillar-icon-box">
              <Compass size={22} className="text-gold" />
            </div>
            <h4>{isAr ? 'أبراج ومبانٍ استثمارية ذات عائد فوري' : 'High-Yield Commercial Towers'}</h4>
            <p>
              {isAr
                ? 'مبانٍ إدارية ومجمعات طبية مؤجرة لكبرى الشركات والبنوك، تحقق عوائد دولارية ومحلية مستقرة بعقود إيجار طويلة الأجل.'
                : 'Fully leased commercial headquarters and medical towers delivering turnkey cash-flow with institutional tenants.'}
            </p>
          </div>
        </div>

        {/* Confidential Acquisition Protocol Steps */}
        <div className="private-protocol-card" style={{
          background: 'linear-gradient(145deg, rgba(7, 23, 47, 0.95) 0%, rgba(11, 36, 71, 0.9) 100%)',
          border: '1.5px solid rgba(236, 200, 117, 0.35)',
          borderRadius: '24px',
          padding: '40px 32px',
          color: '#ffffff',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
          marginBottom: '40px'
        }}>
          <div style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto 36px' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 16px',
              borderRadius: '999px',
              background: 'rgba(236, 200, 117, 0.15)',
              border: '1px solid rgba(236, 200, 117, 0.3)',
              color: '#ECC875',
              fontSize: '0.82rem',
              fontWeight: 800,
              marginBottom: '12px'
            }}>
              <ShieldCheck size={14} />
              <span>{isAr ? 'بروتوكول المعاملات السرية' : 'Confidential Acquisition Protocol'}</span>
            </span>
            <h3 style={{ fontSize: '1.75rem', fontWeight: 900, margin: '0 0 10px', color: '#ffffff' }}>
              {isAr ? 'كيف تعمل صفقات المكتب الخاص (Off-Market)؟' : 'How 1Line Private Office Operates'}
            </h3>
            <p style={{ color: '#cbd5e1', fontSize: '0.92rem', margin: 0, lineHeight: 1.6 }}>
              {isAr 
                ? 'نظام تعاقدي محكم يحمي سرية المشتري والبائع على حد سواء لضمان خصوصية الصفقات الاستثمارية الكبرى.'
                : 'A rigorous institutional process preserving total privacy for both ultra-high-net-worth buyers and sellers.'}
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '20px'
          }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.05)', borderRadius: '16px', padding: '20px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <span style={{ fontSize: '1.8rem', fontWeight: 900, color: '#ECC875', display: 'block', marginBottom: '8px' }}>01</span>
              <strong style={{ fontSize: '1rem', display: 'block', marginBottom: '6px' }}>{isAr ? 'اتفاقية عدم الإفصاح (NDA)' : 'Private NDA Signing'}</strong>
              <span style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.5, display: 'block' }}>
                {isAr ? 'توقيع اتفاقية سرية رسمية ملزمة قبل مشاركة أي ملف تفصيلي أو عنوان جغرافي للعقار.' : 'Formal non-disclosure execution prior to releasing asset dossiers or location coordinates.'}
              </span>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.05)', borderRadius: '16px', padding: '20px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <span style={{ fontSize: '1.8rem', fontWeight: 900, color: '#ECC875', display: 'block', marginBottom: '8px' }}>02</span>
              <strong style={{ fontSize: '1rem', display: 'block', marginBottom: '6px' }}>{isAr ? 'التحقق من الملاءة المالية' : 'Proof of Capability'}</strong>
              <span style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.5, display: 'block' }}>
                {isAr ? 'التأكد من الجدية والملاءة النقدية للمشتري لتجنيب الملاك الزيارات غير المجدية.' : 'Verification of client acquisition capacity to prevent speculative inquiries.'}
              </span>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.05)', borderRadius: '16px', padding: '20px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <span style={{ fontSize: '1.8rem', fontWeight: 900, color: '#ECC875', display: 'block', marginBottom: '8px' }}>03</span>
              <strong style={{ fontSize: '1rem', display: 'block', marginBottom: '6px' }}>{isAr ? 'معاينة VIP سرية وخاصة' : 'Discreet Private Tour'}</strong>
              <span style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.5, display: 'block' }}>
                {isAr ? 'معاينات منفردة بسيارات خاصة برفقة مستشار الثروات العقارية دون أي لفت للانتباه.' : 'Individual private chauffeured tours conducted quietly with senior wealth advisors.'}
              </span>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.05)', borderRadius: '16px', padding: '20px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <span style={{ fontSize: '1.8rem', fontWeight: 900, color: '#ECC875', display: 'block', marginBottom: '8px' }}>04</span>
              <strong style={{ fontSize: '1rem', display: 'block', marginBottom: '6px' }}>{isAr ? 'إتمام التعاقد القانوني' : 'Legal Closing'}</strong>
              <span style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.5, display: 'block' }}>
                {isAr ? 'صياغة العقود وتوثيق الشهر العقاري بإشراف مباشر من الفريق القانوني لشركة 1Line.' : 'Full title transfer, escrow support, and deed execution under dedicated legal counsel.'}
              </span>
            </div>
          </div>
        </div>

        {/* Direct Action Callout */}
        <div style={{
          textAlign: 'center',
          background: 'linear-gradient(135deg, rgba(236, 200, 117, 0.12) 0%, rgba(16, 185, 129, 0.08) 100%)',
          border: '1px solid rgba(236, 200, 117, 0.3)',
          borderRadius: '20px',
          padding: '36px 24px'
        }}>
          <h3 style={{ fontSize: '1.35rem', fontWeight: 900, marginBottom: '8px' }}>
            {isAr ? 'تواصل مباشرة مع إدارة المكتب الخاص 1Line' : 'Contact 1Line Private Office Directly'}
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', maxWidth: '600px', margin: '0 auto 20px' }}>
            {isAr 
              ? 'مستشارك العقاري الخاص جاهز للإجابة على استفساراتك وترتيب المعاينات الخاصة في أي وقت.'
              : 'Our Private Office executives are available for confidential consultations at your convenience.'}
          </p>
          <div style={{ display: 'inline-flex', gap: '14px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={handleConfidentialInquiry}
              className="btn btn-primary"
              style={{ padding: '12px 28px', fontSize: '0.92rem' }}
            >
              <MessageSquare size={17} />
              <span>{isAr ? 'محادثة مشفرة عبر واتساب' : 'Encrypted WhatsApp Desk'}</span>
            </button>
            <a
              href="tel:+201012345678"
              className="btn btn-secondary"
              style={{ padding: '12px 28px', fontSize: '0.92rem' }}
            >
              <PhoneCall size={17} />
              <span>{isAr ? 'مكالمة هاتفية مباشرة' : 'Direct VIP Call'}</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
