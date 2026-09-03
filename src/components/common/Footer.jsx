import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  MapPin, 
  Phone, 
  Mail, 
  MessageSquare, 
  ShieldCheck, 
  ArrowUp
} from 'lucide-react';
import LogoEmblem from '../LogoEmblem';
import { 
  getFounderSettings, 
  getWhatsAppUrl, 
  getPhoneCallUrl, 
  cleanPhoneNumber 
} from '../../utils/founderCmsData';

export default function Footer({ lang = 'ar' }) {
  const isAr = lang === 'ar';
  const [cms, setCms] = useState(() => getFounderSettings());

  useEffect(() => {
    const handleUpdate = () => setCms(getFounderSettings());
    window.addEventListener('oneline_founder_cms_updated', handleUpdate);
    return () => window.removeEventListener('oneline_founder_cms_updated', handleUpdate);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const currentPhone = cleanPhoneNumber(cms.phoneNumber || '+201223222956');
  const hqText = isAr 
    ? (cms.headquarters_ar || 'سوهاج - شارع الجمهورية / سوهاج الجديدة')
    : (cms.headquarters_en || 'Sohag - Republic St. / New Sohag');

  return (
    <footer className="site-footer">
      {/* Top Quick Consultation CTA Banner */}
      <div className="footer-top-cta">
        <div className="footer-cta-container">
          <div className="footer-cta-text">
            <h3>{isAr ? 'استشارة عقارية مجانية ومعتمدة' : 'Free Certified Consultation'}</h3>
            <p>{isAr ? 'مستشارونا متاحون لمساعدتك في اختيار العقار الأنسب في سوهاج' : 'Our experts help you find the best property in Sohag'}</p>
          </div>
          <div className="footer-cta-actions">
            <a 
              href={getWhatsAppUrl(isAr ? 'مرحباً 1Line، أريد استشارة عقارية مجانية بخصوص المشروعات المتاحة.' : 'Hello 1Line, I would like a certified consultation.')} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="btn btn-whatsapp"
            >
              <MessageSquare size={16} />
              <span>{isAr ? 'واتساب مبيعات' : 'WhatsApp'}</span>
            </a>
            <a 
              href={getPhoneCallUrl()} 
              className="btn btn-call"
            >
              <Phone size={16} />
              <span>{isAr ? 'اتصال مباشر' : 'Direct Call'}</span>
            </a>
          </div>
        </div>
      </div>

      {/* Main Clean Grid */}
      <div className="footer-main-container">
        <div className="footer-grid">
          {/* Brand Column */}
          <div className="footer-col brand-col">
            <div className="footer-logo">
              <LogoEmblem size={32} />
              <span className="footer-brand-name">1Line</span>
            </div>
            <p className="footer-desc">
              {isAr 
                ? 'المنصة العقارية الأولى المعتمدة في سوهاج وسوهاج الجديدة.' 
                : 'The premier certified real estate platform in Sohag.'}
            </p>
            <div className="trust-badge-pill">
              <ShieldCheck size={14} className="text-gold" />
              <span>{isAr ? 'عقارات مفحوصة ومسجلة 100%' : '100% Verified'}</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="footer-col">
            <h4>{isAr ? 'العقارات والمشروعات' : 'Properties & Projects'}</h4>
            <ul className="footer-links">
              <li><Link to="/properties">{isAr ? 'استكشاف العقارات' : 'Explore All'}</Link></li>
              <li><Link to="/projects">{isAr ? 'دليل المشروعات والكمبوندات' : 'Mega Projects Hub'}</Link></li>
              <li><Link to="/market-intelligence">{isAr ? 'مركز مؤشرات أسعار السوق' : 'Market Intelligence'}</Link></li>
              <li><Link to="/financing">{isAr ? 'حاسبة التمويل والأقساط' : 'Financing'}</Link></li>
            </ul>
          </div>

          {/* Portals */}
          <div className="footer-col">
            <h4>{isAr ? 'الخدمات والمؤسسة' : 'Services & Company'}</h4>
            <ul className="footer-links">
              <li><a href="/#about-us">{isAr ? 'عن 1Line ورؤية المؤسس' : 'About & Founder'}</a></li>
              <li><Link to="/investor">{isAr ? 'مركز المستثمرين (VIP)' : 'Investors Desk'}</Link></li>
              <li><Link to="/broker">{isAr ? 'شبكة الوسطاء والشركاء' : 'Brokers'}</Link></li>
              <li><Link to="/financing">{isAr ? 'حاسبة التمويل والأقساط' : 'Mortgage & Financing'}</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div className="footer-col contact-col">
            <h4>{isAr ? 'التواصل' : 'Contact'}</h4>
            <div className="contact-item">
              <MapPin size={15} />
              <span>{hqText}</span>
            </div>
            <div className="contact-item">
              <Phone size={15} />
              <span dir="ltr">{currentPhone}</span>
            </div>
            <div className="contact-item">
              <Mail size={15} />
              <span>contact@oneline-sohag.com</span>
            </div>
          </div>
        </div>

        {/* Footer Bottom Bar */}
        <div className="footer-bottom">
          <p>
            © {new Date().getFullYear()} 1Line Real Estate. {isAr ? 'جميع الحقوق محفوظة' : 'All rights reserved.'}
            <Link 
              to="/crm" 
              style={{ 
                opacity: 0.08, 
                color: 'inherit', 
                textDecoration: 'none', 
                marginInlineStart: '8px', 
                fontSize: '0.65rem',
                cursor: 'default' 
              }} 
              tabIndex="-1"
              title=""
            >
              🔒
            </Link>
          </p>
          <button 
            type="button" 
            className="scroll-top-btn"
            onClick={scrollToTop}
            title={isAr ? 'للأعلى' : 'Top'}
          >
            <ArrowUp size={16} />
          </button>
        </div>
      </div>
    </footer>
  );
}

