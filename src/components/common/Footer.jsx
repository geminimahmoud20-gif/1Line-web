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

export default function Footer({ lang = 'ar', onOpenAboutFounder }) {
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
    ? (cms.headquarters_ar || 'محافظة سوهاج - شارع الجمهورية / برج أحمد حلمي الشريف')
    : (cms.headquarters_en || 'Sohag - El Gomhoria St. / Ahmed Helmy El Sherif Tower');

  return (
    <footer className="site-footer">
      <div className="footer-container">
        {/* Main 4-Column Balanced Grid */}
        <div className="footer-grid">
          {/* Col 1: Brand & Sovereign Trust */}
          <div className="footer-col footer-col-brand">
            <div className="footer-brand-header">
              <LogoEmblem size={34} />
              <div className="footer-brand-text">
                <span className="footer-brand-name" dir="ltr">
                  <span className="brand-one">1</span>
                  <span className="brand-line-footer">LINE</span>
                </span>
                <span className="footer-brand-sub">
                  {isAr ? 'للاستشارات والتسويق العقاري المعتمد' : 'Certified Real Estate Advisory'}
                </span>
              </div>
            </div>

            <p className="footer-desc">
              {isAr 
                ? 'المنصة العقارية المؤسسية المعتمدة في سوهاج وسوهاج الجديدة. بيع وشراء وتثمين رسمي معتمد بأعلى معايير الأمان القانوني 100%.' 
                : 'The premier institutional real estate advisory and marketplace in Sohag & New Sohag.'}
            </p>

            <div className="footer-trust-badge">
              <ShieldCheck size={15} className="trust-shield-icon" />
              <span>{isAr ? 'عقارات مفحوصة ومسجلة 100% • ترخيص قانوني' : '100% Verified Legal Titles'}</span>
            </div>
          </div>

          {/* Col 2: Properties & Portals */}
          <div className="footer-col">
            <h4 className="footer-col-title">{isAr ? 'العقارات والمشروعات' : 'Properties & Portals'}</h4>
            <ul className="footer-links">
              <li><Link to="/properties">{isAr ? 'استكشاف كافة العقارات' : 'Explore Properties'}</Link></li>
              <li><Link to="/projects">{isAr ? 'المشروعات والكمبوندات' : 'Mega Projects Hub'}</Link></li>
              <li><Link to="/market-intelligence">{isAr ? 'مؤشرات أسعار السوق' : 'Market Intelligence'}</Link></li>
              <li><Link to="/financing">{isAr ? 'حاسبة التمويل والأقساط' : 'Financing & Mortgage'}</Link></li>
            </ul>
          </div>

          {/* Col 3: Advisory & Services */}
          <div className="footer-col">
            <h4 className="footer-col-title">{isAr ? 'الخدمات والمؤسسة' : 'Advisory & Services'}</h4>
            <ul className="footer-links">
              <li>
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenAboutFounder) {
                      onOpenAboutFounder();
                    } else {
                      window.location.href = '/#about-us';
                    }
                  }}
                  className="footer-btn-link"
                >
                  {isAr ? 'عن 1Line ورؤية المؤسس' : 'About & Founder'}
                </button>
              </li>
              <li><Link to="/private-office">{isAr ? 'المكتب الخاص VIP' : 'Private Office VIP'}</Link></li>
              <li><Link to="/investor">{isAr ? 'مركز المستثمرين' : 'Investor Desk'}</Link></li>
              <li><Link to="/special-requests">{isAr ? 'الطلبات العقارية الخاصة' : 'Bespoke Requests'}</Link></li>
              <li><Link to="/broker">{isAr ? 'شبكة الوسطاء والشركاء' : 'Brokers Network'}</Link></li>
            </ul>
          </div>

          {/* Col 4: Official Contact & Immediate Advisory */}
          <div className="footer-col footer-col-contact">
            <h4 className="footer-col-title">{isAr ? 'التواصل المباشر والمقر' : 'Official Contact & HQ'}</h4>
            <div className="footer-contact-item">
              <MapPin size={15} className="contact-icon" />
              <span>{hqText}</span>
            </div>
            <div className="footer-contact-item">
              <Phone size={15} className="contact-icon" />
              <a href={getPhoneCallUrl(currentPhone)} dir="ltr" className="contact-link">{currentPhone}</a>
            </div>
            <div className="footer-contact-item">
              <Mail size={15} className="contact-icon" />
              <a href="mailto:contact@oneline-sohag.com" className="contact-link">contact@oneline-sohag.com</a>
            </div>

            <a
              href={getWhatsAppUrl(isAr ? 'مرحباً 1Line، أود الحصول على استشارة عقارية سريعة.' : 'Hello 1Line, quick inquiry about your real estate services.')}
              target="_blank"
              rel="noopener noreferrer"
              className="footer-wa-pill"
            >
              <MessageSquare size={14} />
              <span>{isAr ? 'استشارة فورية عبر واتساب' : 'Direct WhatsApp Advisory'}</span>
            </a>
          </div>
        </div>

        {/* Footer Bottom Bar */}
        <div className="footer-bottom-bar">
          <div className="footer-copyright">
            <span>© {new Date().getFullYear()} 1Line Real Estate. {isAr ? 'جميع الحقوق محفوظة' : 'All rights reserved.'}</span>
            <Link 
              to="/crm" 
              className="footer-crm-lock"
              tabIndex="-1"
              title=""
            >
              🔒
            </Link>
          </div>

          <div className="footer-bottom-meta">
            <span className="footer-slogan">
              {isAr ? 'الريادة والنزاهة في سوق عقارات سوهاج' : 'Integrity & Excellence in Sohag Real Estate'}
            </span>
            <button 
              type="button" 
              className="footer-scroll-top-btn"
              onClick={scrollToTop}
              title={isAr ? 'العودة للأعلى' : 'Top'}
              aria-label="Scroll to top"
            >
              <ArrowUp size={15} />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}


