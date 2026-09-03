import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  MessageSquare, 
  Menu, 
  X, 
  Lock, 
  Search, 
  Globe, 
  Share2, 
  Sun, 
  Moon, 
  Volume2, 
  VolumeX, 
  MoreHorizontal, 
  Scale, 
  Building,
  Sparkles 
} from 'lucide-react';
import LogoEmblem from '../LogoEmblem';
import { getWhatsAppUrl } from '../../utils/founderCmsData';

export default function Header({ 
  lang = 'ar', 
  setLang, 
  currency = 'EGP', 
  setCurrency, 
  theme = 'light',
  toggleTheme,
  soundEnabled = true,
  toggleSound,
  onOpenShare, 
  onOpenTrackLead,
  compareCount = 0,
  onOpenCompare,
  onOpenAboutFounder
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toolsMenuOpen, setToolsMenuOpen] = useState(false);
  const toolsDropdownRef = useRef(null);
  const location = useLocation();

  const isAr = lang === 'ar';

  const isActive = (path) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  // Close tools menu on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (toolsDropdownRef.current && !toolsDropdownRef.current.contains(e.target)) {
        setToolsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const navLinks = [
    { path: '/', label: isAr ? 'الرئيسية' : 'Home' },
    { path: '/properties', label: isAr ? 'العقارات' : 'Properties', badge: isAr ? 'جديد' : 'New', badgeType: 'gold' },
    { path: '/projects', label: isAr ? 'المشروعات' : 'Projects', badge: isAr ? 'حصري' : 'Exclusive', badgeType: 'emerald' },
    { path: '/market-intelligence', label: isAr ? 'مؤشرات السوق' : 'Market Intel' },
    { path: '/financing', label: isAr ? 'التمويل والأقساط' : 'Financing' },
    { path: '/investor', label: isAr ? 'المستثمرين' : 'Investors' }
  ];

  return (
    <header className="site-header sticky-header">
      <div className="header-container">
        {/* Brand Logo */}
        <Link to="/" className="brand-logo" onClick={() => setMobileMenuOpen(false)}>
          <LogoEmblem size={36} />
          <div className="brand-text">
            <span className="brand-title">1Line</span>
            <span className="brand-subtitle">{isAr ? 'للتطوير والاستثمار العقاري' : 'Real Estate Development'}</span>
          </div>
        </Link>

        {/* Clean Desktop Navigation */}
        <nav className="desktop-nav">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`nav-item ${isActive(link.path) ? 'active' : ''}`}
            >
              {link.label}
              {link.badge && (
                <span className={`nav-badge nav-badge-${link.badgeType || 'gold'}`}>
                  {link.badge}
                </span>
              )}
            </Link>
          ))}
        </nav>

        {/* Streamlined, Clean Action Group */}
        <div className="header-actions">
          {/* Active Comparison Pill */}
          {compareCount > 0 && onOpenCompare && (
            <button
              type="button"
              className="header-compare-pill"
              onClick={onOpenCompare}
              title={isAr ? 'عرض مقارنة العقارات المختارة' : 'View Property Comparison'}
            >
              <Scale size={14} />
              <span>{isAr ? `مقارنة (${compareCount})` : `Compare (${compareCount})`}</span>
            </button>
          )}

          {/* Unified Glassmorphic Utility Control Group */}
          <div className="header-utility-pill-group">
            {/* Theme Toggle (Sun/Moon) */}
            <button
              type="button"
              className="utility-sub-btn theme-toggle-btn"
              onClick={toggleTheme}
              title={isAr ? (theme === 'dark' ? 'تفعيل الوضع النهاري' : 'تفعيل الوضع الليلي الفاخر') : 'Toggle Theme'}
            >
              {theme === 'dark' ? <Sun size={15} className="text-gold" /> : <Moon size={15} />}
            </button>

            <div className="utility-divider" />

            {/* Language Switcher */}
            <button
              type="button"
              className="utility-sub-btn lang-toggle-btn"
              onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
              title="Switch Language"
            >
              <Globe size={13} />
              <span>{isAr ? 'EN' : 'عربي'}</span>
            </button>

            <div className="utility-divider" />

            {/* More Tools Dropdown */}
            <div className="tools-dropdown-wrapper" ref={toolsDropdownRef}>
              <button
                type="button"
                className={`utility-sub-btn tools-trigger-btn ${toolsMenuOpen ? 'active' : ''}`}
                onClick={() => setToolsMenuOpen(!toolsMenuOpen)}
                title={isAr ? 'المزيد من الأدوات' : 'More Utilities'}
              >
                <MoreHorizontal size={15} />
              </button>

            {toolsMenuOpen && (
              <div className="tools-dropdown-menu">
                {/* Track Lead Search */}
                <button
                  type="button"
                  className="tool-dropdown-item"
                  onClick={() => {
                    setToolsMenuOpen(false);
                    onOpenTrackLead();
                  }}
                >
                  <Search size={16} />
                  <span>{isAr ? 'تتبع حالة طلبك' : 'Track Your Request'}</span>
                </button>

                {/* Share Platform */}
                <button
                  type="button"
                  className="tool-dropdown-item"
                  onClick={() => {
                    setToolsMenuOpen(false);
                    onOpenShare();
                  }}
                >
                  <Share2 size={16} />
                  <span>{isAr ? 'مشاركة المنصة' : 'Share Platform'}</span>
                </button>

                {/* Sound Chime Toggle */}
                {toggleSound && (
                  <button
                    type="button"
                    className="tool-dropdown-item"
                    onClick={() => {
                      toggleSound();
                    }}
                  >
                    {soundEnabled ? <Volume2 size={16} className="text-gold" /> : <VolumeX size={16} />}
                    <span>{isAr ? (soundEnabled ? 'كتم التنبيهات الصوتية' : 'تفعيل التنبيهات الصوتية') : 'Toggle Audio'}</span>
                  </button>
                )}

                {/* Special / Bespoke Requests */}
                <Link
                  to="/special-requests"
                  className="tool-dropdown-item"
                  onClick={() => setToolsMenuOpen(false)}
                >
                  <Sparkles size={16} className="text-gold" />
                  <span>{isAr ? 'طلب عقار بمواصفات خاصة' : 'Bespoke Requests'}</span>
                </Link>

                <div className="tool-dropdown-divider" />

                {/* About One Line & Founder */}
                <button
                  type="button"
                  className="tool-dropdown-item"
                  onClick={() => {
                    setToolsMenuOpen(false);
                    if (onOpenAboutFounder) {
                      onOpenAboutFounder();
                    } else {
                      window.location.href = '/#about-us';
                    }
                  }}
                >
                  <Building size={16} />
                  <span>{isAr ? 'عن 1Line والمؤسس' : 'About & Founder'}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* WhatsApp Direct CTA Button */}
        <a
          href={getWhatsAppUrl(isAr ? 'مرحباً 1Line، أريد الاستفسار عن العقارات والفرص المتاحة بسوهاج.' : 'Hello 1Line, inquiring about available properties in Sohag.')}
          target="_blank"
          rel="noopener noreferrer"
          className="cta-primary-btn hide-tablet"
        >
          <MessageSquare size={16} />
          <span>{isAr ? 'تواصل معنا' : 'Contact Us'}</span>
        </a>

          {/* Mobile Menu Hamburger */}
          <button
            type="button"
            className="mobile-hamburger-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="mobile-drawer open">
          <div className="mobile-drawer-links">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`mobile-nav-item ${isActive(link.path) ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <span>{link.label}</span>
                {link.badge && <span className="nav-badge">{link.badge}</span>}
              </Link>
            ))}
            <Link
              to="/special-requests"
              className="mobile-nav-item"
              onClick={() => setMobileMenuOpen(false)}
            >
              <span>{isAr ? 'الطلبات والمواصفات الخاصة' : 'Bespoke Requests'}</span>
            </Link>
            <button
              type="button"
              className="mobile-nav-item"
              style={{ background: 'none', border: 'none', width: '100%', textAlign: isAr ? 'right' : 'left', cursor: 'pointer', fontFamily: 'inherit' }}
              onClick={() => {
                setMobileMenuOpen(false);
                if (onOpenAboutFounder) {
                  onOpenAboutFounder();
                } else {
                  window.location.href = '/#about-us';
                }
              }}
            >
              <span>{isAr ? 'عن 1Line والمؤسس' : 'About & Founder'}</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
