import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  MapPin, 
  Phone, 
  Mail, 
  MessageSquare, 
  ShieldCheck, 
  ArrowUp,
  Clock
} from 'lucide-react';
import { BRAND, CONTACT, LEGAL_IDS } from '../../config/siteConfig';
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
                  {isAr ? 'للاستشارات والتسويق العقاري' : 'Real Estate Advisory & Brokerage'}
                </span>
              </div>
            </div>

            <p className="footer-desc">
              {isAr 
                ? 'وساطة واستشارات للأصول العقارية عالية القيمة في سوهاج والقاهرة الكبرى: بيع، شراء، تقييم، ومراجعة قانونية للمستندات قبل التعاقد.' 
                : 'Brokerage and advisory for high-value real estate in Sohag and Greater Cairo: selling, buying, valuation and legal document review before contract.'}
            </p>

            <div className="footer-trust-badge">
              <ShieldCheck size={15} className="trust-shield-icon" />
              <span>{isAr ? 'مراجعة المستندات قبل العرض • سرية تامة' : 'Documents reviewed before listing • Full confidentiality'}</span>
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
              <li><Link to="/about">{isAr ? 'عن الشركة' : 'About us'}</Link></li>
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
              <a href={`mailto:${CONTACT.email}`} className="contact-link">{CONTACT.email}</a>
            </div>
            <div className="footer-contact-item">
              <Clock size={15} className="contact-icon" />
              <span>{isAr ? CONTACT.hours_ar : CONTACT.hours_en}</span>
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
            <span>© {new Date().getFullYear()} {BRAND.legalName}. {isAr ? 'جميع الحقوق محفوظة' : 'All rights reserved.'}</span>
            {LEGAL_IDS.commercialRegistry && (
              <span>{isAr ? 'سجل تجاري' : 'CR'} <bdi>{LEGAL_IDS.commercialRegistry}</bdi></span>
            )}
            {LEGAL_IDS.taxCard && (
              <span>{isAr ? 'بطاقة ضريبية' : 'Tax ID'} <bdi>{LEGAL_IDS.taxCard}</bdi></span>
            )}
            <Link to="/privacy" className="footer-legal-link">{isAr ? 'سياسة الخصوصية' : 'Privacy policy'}</Link>
            <Link 
              to="/crm" 
              className="footer-crm-lock"
              tabIndex="-1"
              title=""
              rel="nofollow"
              aria-label={isAr ? 'دخول الإدارة' : 'Admin sign-in'}
            >
              🔒
            </Link>
          </div>

          <div className="footer-bottom-meta">
            <span className="footer-slogan">
              {isAr ? 'سوهاج • القاهرة الكبرى' : 'Sohag • Greater Cairo'}
            </span>
            <button 
              type="button" 
              className="footer-scroll-top-btn"
              onClick={scrollToTop}
              title={isAr ? 'العودة للأعلى' : 'Top'}
              aria-label="العودة لأعلى الصفحة"
            >
              <ArrowUp size={15} />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}


