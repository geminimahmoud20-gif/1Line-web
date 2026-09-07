import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  MessageSquare, 
  Menu, 
  X, 
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
  Sparkles,
  FileText,
  ChevronDown,
  Home,
  TrendingUp,
  Landmark,
  Award,
  Layers
} from 'lucide-react';
import LogoEmblem from '../LogoEmblem';
import { getWhatsAppUrl } from '../../utils/founderCmsData';
import { playNotificationChime } from '../../utils/notificationHub';

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
  const [activeDropdown, setActiveDropdown] = useState(null);
  const dropdownTimeoutRef = useRef(null);
  const navRef = useRef(null);
  const toolsDropdownRef = useRef(null);
  const location = useLocation();

  const isAr = lang === 'ar';

  const handleThemeToggle = () => {
    if (toggleTheme) toggleTheme();
    if (soundEnabled) playNotificationChime();
  };

  const isActive = (path) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const isGroupActive = (paths = []) => {
    return paths.some(p => isActive(p));
  };

  // Close menus on outside click or route change
  useEffect(() => {
    setActiveDropdown(null);
    setToolsMenuOpen(false);
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (toolsDropdownRef.current && !toolsDropdownRef.current.contains(e.target)) {
        setToolsMenuOpen(false);
      }
      if (navRef.current && !navRef.current.contains(e.target)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleMouseEnter = (id) => {
    if (dropdownTimeoutRef.current) {
      clearTimeout(dropdownTimeoutRef.current);
    }
    setActiveDropdown(id);
  };

  const handleMouseLeave = () => {
    dropdownTimeoutRef.current = setTimeout(() => {
      setActiveDropdown(null);
    }, 220);
  };

  // 🏛️ Smart Categorized Navigation Hubs
  const navHubs = [
    {
      id: 'home',
      type: 'link',
      path: '/',
      label: isAr ? 'الرئيسية' : 'Home',
      icon: Home
    },
    {
      id: 'real-estate',
      type: 'dropdown',
      label: isAr ? 'العقارات والمشروعات' : 'Properties & Projects',
      icon: Building,
      activePaths: ['/properties', '/projects'],
      items: [
        {
          path: '/properties',
          label: isAr ? 'دليل العقارات المعتمدة' : 'Verified Properties',
          desc: isAr ? 'شقق، فلل، محلات ومكاتب فندقية' : 'Verified residential & commercial listings',
          badge: isAr ? 'شامل' : 'All',
          icon: Building
        },
        {
          path: '/projects',
          label: isAr ? 'دليل المشروعات والكمبوندات' : 'Mega Projects & Compounds',
          desc: isAr ? 'سوهاج الجديدة وأرقى المشروعات' : 'New Sohag premier compounds & developments',
          badge: isAr ? 'حصري' : 'Exclusive',
          badgeType: 'gold',
          icon: Layers
        }
      ]
    },
    {
      id: 'finance-intel',
      type: 'dropdown',
      label: isAr ? 'المال والاستثمار' : 'Finance & Intel',
      icon: TrendingUp,
      activePaths: ['/market-intelligence', '/financing', '/investor'],
      items: [
        {
          path: '/market-intelligence',
          label: isAr ? 'مؤشرات أسعار السوق' : 'Market Intelligence',
          desc: isAr ? 'تحليل يومي لسعر المتر والعائد بسوهاج' : 'Real-time sqm price indices & trends',
          badge: isAr ? 'بيانات حية' : 'Live',
          badgeType: 'blue',
          icon: TrendingUp
        },
        {
          path: '/financing',
          label: isAr ? 'حاسبة التمويل والأقساط' : 'Financing & Installments',
          desc: isAr ? 'حساب القسط الشهري حتى 7 سنوات' : 'Mortgage & monthly installment simulator',
          icon: Landmark
        },
        {
          path: '/investor',
          label: isAr ? 'بوابة كبار المستثمرين' : 'Investor Portal',
          desc: isAr ? 'فرص استثمارية كبرى وعوائد إيجارية' : 'High-yield commercial & land portfolios',
          badge: 'ROI',
          badgeType: 'gold',
          icon: Award
        }
      ]
    },
    {
      id: 'vip-services',
      type: 'dropdown',
      label: isAr ? 'الخدمات الخاصة' : 'VIP Services',
      icon: Sparkles,
      badge: 'VIP',
      badgeType: 'gold',
      activePaths: ['/special-requests', '/demands'],
      items: [
        {
          path: '/special-requests',
          label: isAr ? 'الطلبات الخاصة لكبار العملاء' : 'VIP Bespoke Requests',
          desc: isAr ? 'طلب عقار بمواصفات خاصة وسرية تامة' : 'Private bespoke requests for premium clients',
          badge: 'VIP',
          badgeType: 'gold',
          icon: Sparkles
        },
        {
          path: '/demands',
          label: isAr ? 'سوق طلبات المشترين' : 'Buyer Demands Marketplace',
          desc: isAr ? 'طلبات حقيقية ومطابقة فورية للبائعين' : 'Live buyer demands ready for instant matching',
          icon: FileText
        }
      ]
    }
  ];

  // Flat nav list for mobile compatibility
  const flatMobileLinks = [
    { path: '/', label: isAr ? 'الرئيسية' : 'Home', icon: Home },
    { path: '/properties', label: isAr ? 'دليل العقارات المعتمدة' : 'Properties', icon: Building },
    { path: '/projects', label: isAr ? 'المشروعات والكمبوندات' : 'Projects', icon: Layers, badge: 'حصري', badgeType: 'gold' },
    { path: '/special-requests', label: isAr ? 'الطلبات الخاصة' : 'Special Requests', badge: 'VIP', badgeType: 'gold', icon: Sparkles },
    { path: '/demands', label: isAr ? 'طلبات المشترين' : 'Buyer Demands', icon: FileText },
    { path: '/market-intelligence', label: isAr ? 'مؤشرات أسعار السوق' : 'Market Intel', icon: TrendingUp, badge: 'مباشر', badgeType: 'blue' },
    { path: '/financing', label: isAr ? 'التمويل والأقساط' : 'Financing', icon: Landmark },
    { path: '/investor', label: isAr ? 'بوابة المستثمرين' : 'Investors', icon: Award }
  ];

  return (
    <header className="site-header sticky-header">
      <div className="header-container glass-capsule">
        {/* Brand Logo */}
        <Link to="/" className="brand-logo" onClick={() => setMobileMenuOpen(false)}>
          <LogoEmblem size={40} />
          <div className="brand-text">
            <span className="brand-title" dir="ltr">
              <span className="brand-one">1</span>
              <span className="brand-line">LINE</span>
            </span>
            <span className="brand-subtitle">{isAr ? 'للاستشارات و التسويق العقاري' : 'Real Estate Consulting & Marketing'}</span>
          </div>
        </Link>

        {/* 🌟 Smart Floating Desktop Navigation */}
        <nav className="desktop-nav smart-desktop-nav" ref={navRef}>
          {navHubs.map((hub) => {
            if (hub.type === 'link') {
              const HubIcon = hub.icon;
              return (
                <Link
                  key={hub.id}
                  to={hub.path}
                  className={`smart-nav-trigger ${isActive(hub.path) ? 'active' : ''}`}
                >
                  {HubIcon && <HubIcon size={14} className="nav-hub-icon" />}
                  <span>{hub.label}</span>
                </Link>
              );
            }

            const isGroupOn = isGroupActive(hub.activePaths);
            const isOpen = activeDropdown === hub.id;
            const HubIcon = hub.icon;

            return (
              <div 
                key={hub.id} 
                className={`smart-nav-group ${isOpen ? 'open' : ''}`}
                onMouseEnter={() => handleMouseEnter(hub.id)}
                onMouseLeave={handleMouseLeave}
              >
                <button
                  type="button"
                  className={`smart-nav-trigger ${isGroupOn ? 'active' : ''}`}
                  onClick={() => setActiveDropdown(isOpen ? null : hub.id)}
                  aria-expanded={isOpen}
                >
                  {HubIcon && <HubIcon size={14} className="nav-hub-icon" />}
                  <span>{hub.label}</span>
                  {hub.badge && (
                    <span className={`nav-badge nav-badge-${hub.badgeType || 'gold'}`}>
                      {hub.badge}
                    </span>
                  )}
                  <ChevronDown size={13} className={`dropdown-chevron ${isOpen ? 'rotated' : ''}`} />
                </button>

                {/* Glassmorphic Dropdown Card */}
                {isOpen && (
                  <div className="smart-dropdown-glass">
                    <div className="smart-dropdown-list">
                      {hub.items.map((item) => {
                        const ItemIcon = item.icon;
                        const itemActive = isActive(item.path);
                        return (
                          <Link
                            key={item.path}
                            to={item.path}
                            className={`smart-dropdown-item ${itemActive ? 'active-item' : ''}`}
                            onClick={() => setActiveDropdown(null)}
                          >
                            <div className="item-icon-box">
                              {ItemIcon && <ItemIcon size={17} />}
                            </div>
                            <div className="item-content">
                              <div className="item-title-row">
                                <span className="item-title">{item.label}</span>
                                {item.badge && (
                                  <span className={`nav-badge nav-badge-${item.badgeType || 'gold'}`}>
                                    {item.badge}
                                  </span>
                                )}
                              </div>
                              <span className="item-desc">{item.desc}</span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
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
            {/* Theme Toggle (Sun/Moon) with Luxury Rotation Effect */}
            <button
              type="button"
              className="utility-sub-btn theme-toggle-btn"
              onClick={handleThemeToggle}
              title={isAr ? (theme === 'dark' ? 'الوضع الليلي مفعّل — انقر للتبديل للنهاري' : 'الوضع النهاري مفعّل — انقر لتفعيل الوضع الليلي الفاخر') : 'Toggle Luxury Theme'}
              aria-label="Toggle Luxury Theme"
            >
              {theme === 'dark' ? (
                <Sun size={15} className="text-gold theme-icon-rotate" />
              ) : (
                <Moon size={15} className="theme-icon-rotate" />
              )}
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
            {flatMobileLinks.map((link) => {
              const LinkIcon = link.icon;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`mobile-nav-item ${isActive(link.path) ? 'active' : ''} ${link.path === '/special-requests' ? 'mobile-nav-vip' : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {LinkIcon && <LinkIcon size={16} className="text-gold" />}
                    <span>{link.label}</span>
                  </div>
                  {link.badge && (
                    <span className={`nav-badge nav-badge-${link.badgeType || 'gold'}`}>
                      {link.badge}
                    </span>
                  )}
                </Link>
              );
            })}
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

            {/* Mobile Dedicated Luxury Utility Bar */}
            <div className="mobile-drawer-utilities" style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              marginTop: '16px',
              borderTop: '1px solid var(--border-color)',
              background: 'var(--secondary)',
              borderRadius: 'var(--radius-md)'
            }}>
              {/* Theme Toggle Button */}
              <button
                type="button"
                className="mobile-util-btn"
                onClick={handleThemeToggle}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-primary)',
                  fontFamily: 'inherit',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  cursor: 'pointer'
                }}
              >
                {theme === 'dark' ? <Sun size={18} className="text-gold" /> : <Moon size={18} />}
                <span>{isAr ? (theme === 'dark' ? 'الوضع النهاري' : 'الوضع الليلي الفاخر') : (theme === 'dark' ? 'Day Pearl' : 'Midnight Luxury')}</span>
              </button>

              {/* Language Switch */}
              <button
                type="button"
                className="mobile-util-btn"
                onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-primary)',
                  fontFamily: 'inherit',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  cursor: 'pointer'
                }}
              >
                <Globe size={16} />
                <span>{isAr ? 'English' : 'عربي'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
