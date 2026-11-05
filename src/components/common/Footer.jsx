import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { readablePhone } from '../../utils/phoneDisplay';
import { MapPin, Phone, MessageSquare, ArrowUp } from 'lucide-react';
import '../../styles/footer-simple.css';
import { BRAND, LEGAL_IDS } from '../../config/siteConfig';
import { useSiteSettings } from '../../utils/siteSettings';
import SocialLinks from './SocialIcons';
import LogoEmblem from '../LogoEmblem';
import { 
  getFounderSettings, 
  getWhatsAppUrl, 
  getPhoneCallUrl, 
  cleanPhoneNumber 
} from '../../utils/founderCmsData';

export default function Footer({ lang = 'ar' }) {
  const isAr = lang === 'ar';
  const { social } = useSiteSettings();
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

  // One short list of the pages people look for most (the full site map lives in the header menus)
  const links = [
    ['/properties', 'العقارات', 'Properties'],
    ['/match', 'رشّحلي وحدتي', 'Find my home'],
    ['/projects', 'المشروعات', 'Projects'],
    ['/developers', 'شركات التطوير', 'Developers'],
    ['/market-intelligence', 'أسعار المتر', 'Prices per m²'],
    ['/sell', 'اعرض عقارك', 'Sell'],
    ['/broker', 'شبكة الوسطاء', 'Brokers'],
    ['/about', 'عن الشركة', 'About'],
    ['/about#faq', 'الأسئلة الشائعة', 'FAQ']
  ];

  return (
    <footer className="site-footer ft">
      <div className="ft-wrap">
        <div className="ft-top">
          <div className="ft-brand">
            <LogoEmblem size={34} />
            <div>
              <span className="ft-name" dir="ltr"><span className="brand-one">1</span>LINE</span>
              <span className="ft-sub">{isAr ? 'وساطة واستشارات عقارية في سوهاج والقاهرة الكبرى' : 'Real estate brokerage & advisory in Sohag and Greater Cairo'}</span>
            </div>
          </div>
          <div className="ft-contact">
            <a href={getPhoneCallUrl(currentPhone)} dir="ltr" className="ft-phone"><Phone size={15} aria-hidden="true" />{readablePhone(currentPhone)}</a>
            <a
              href={getWhatsAppUrl(isAr ? 'مرحباً 1Line، أود الحصول على استشارة عقارية سريعة.' : 'Hello 1Line, quick inquiry about your real estate services.')}
              target="_blank"
              rel="noopener noreferrer"
              className="ft-wa"
            >
              <MessageSquare size={15} aria-hidden="true" />
              <span>{isAr ? 'كلمنا واتساب' : 'WhatsApp us'}</span>
            </a>
          </div>
        </div>

        <nav className="ft-links" aria-label={isAr ? 'روابط الموقع' : 'Site links'}>
          {links.map(([to, ar, en]) => <Link key={to} to={to}>{isAr ? ar : en}</Link>)}
        </nav>

        <div className="ft-bottom">
          <span className="ft-copy">
            <bdi dir="ltr">© {new Date().getFullYear()} {BRAND.legalName}</bdi>
            {LEGAL_IDS.commercialRegistry && <> · {isAr ? 'سجل تجاري' : 'CR'} <bdi>{LEGAL_IDS.commercialRegistry}</bdi></>}
            {' · '}<Link to="/privacy">{isAr ? 'سياسة الخصوصية' : 'Privacy'}</Link>
          </span>
          <span className="ft-hq"><MapPin size={13} aria-hidden="true" />{hqText}</span>
          <SocialLinks social={social} isAr={isAr} variant="footer" />
          <button type="button" className="footer-scroll-top-btn" onClick={scrollToTop} aria-label={isAr ? 'العودة لأعلى الصفحة' : 'Back to top'}>
            <ArrowUp size={15} />
          </button>
        </div>
      </div>
    </footer>
  );
}
