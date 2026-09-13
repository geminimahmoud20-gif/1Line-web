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
  Layers,
  Heart,
  ArrowRight,
  ArrowLeft,
  Lock
} from 'lucide-react';
import LogoEmblem from '../LogoEmblem';
import { getWhatsAppUrl } from '../../utils/founderCmsData';
import { playNotificationChime } from '../../utils/notificationHub';
import { CURRENCY_RATES } from '../../utils/currencyAndBenchmark';

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
  onOpenAboutFounder,
  onOpenQuickSearch,
  favoritesCount = 0,
  onOpenFavorites
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toolsMenuOpen, setToolsMenuOpen] = useState(false);
  const [currencyMenuOpen, setCurrencyMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const dropdownTimeoutRef = useRef(null);
  const navRef = useRef(null);
  const toolsDropdownRef = useRef(null);
  const currencyDropdownRef = useRef(null);
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
    setCurrencyMenuOpen(false);
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (toolsDropdownRef.current && !toolsDropdownRef.current.contains(e.target)) {
        setToolsMenuOpen(false);
      }
      if (currencyDropdownRef.current && !currencyDropdownRef.current.contains(e.target)) {
        setCurrencyMenuOpen(false);
      }
      if (navRef.current && !navRef.current.contains(e.target)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
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

  // 🏛️ Smart, Direct & Intuitive Navigation Hubs
  const navHubs = [
    {
      id: 'home',
      type: 'link',
      path: '/',
      label: isAr ? 'الرئيسية' : 'Home',
      icon: Home
    },
    {
      id: 'properties',
      type: 'link',
      path: '/properties',
      label: isAr ? 'العقارات المعتمدة' : 'Properties',
      icon: Building
    },
    {
      id: 'projects',
      type: 'link',
      path: '/projects',
      label: isAr ? 'المشروعات والكمبوندات' : 'Projects',
      icon: Layers
    },
    {
      id: 'demands',
      type: 'link',
      path: '/demands',
      label: isAr ? 'طلبات المشترين' : 'Buyer Demands',
      icon: FileText
    },
    {
      id: 'vip-services',
      type: 'dropdown',
      label: isAr ? 'خدمات واستشارات VIP' : 'VIP & Advisory',
      icon: Sparkles,
      badge: 'VIP',
      badgeType: 'gold',
      activePaths: ['/special-requests', '/market-intelligence', '/financing', '/investor'],
      items: [
        {
          path: '/#private-office',
          label: isAr ? 'المكتب الخاص: صفقات سرية (Off-Market)' : '1Line Private Office (Off-Market)',
          desc: isAr ? 'عقارات وقصور مليونية حصرية بكتمان وسرية تامة' : 'Confidential multi-million acquisitions & estates',
          badge: 'Private',
          badgeType: 'gold',
          icon: Lock
        },
        {
          path: '/special-requests',
          label: isAr ? 'طلب عقار خاص VIP' : 'VIP Bespoke Requests',
          desc: isAr ? 'طلب بمواصفات خاصة وسرية تامة' : 'Private bespoke sourcing for premium clients',
          badge: 'VIP',
          badgeType: 'gold',
          icon: Sparkles
        },
        {
          path: '/market-intelligence',
          label: isAr ? 'مؤشرات أسعار السوق' : 'Market Intelligence',
          desc: isAr ? 'تحليل يومي لسعر المتر بسوهاج' : 'Real-time sqm price indices & trends',
          icon: TrendingUp
        },
        {
          path: '/financing',
          label: isAr ? 'حاسبة التمويل والأقساط' : 'Financing & Installments',
          desc: isAr ? 'محاكاة القسط حتى 7 سنوات' : 'Mortgage & installment calculator',
          icon: Landmark
        },
        {
          path: '/investor',
          label: isAr ? 'بوابة كبار المستثمرين' : 'Investor Portal',
          desc: isAr ? 'محافظ عقارية وأراضي كبرى' : 'High-yield portfolios & lands',
          badge: 'ROI',
          badgeType: 'gold',
          icon: Award
        }
      ]
    }
  ];

  // Flat nav list for mobile drawer
  const flatMobileLinks = [
    { path: '/', label: isAr ? 'الرئيسية' : 'Home', icon: Home },
    { path: '/properties', label: isAr ? 'العقارات المعتمدة' : 'Properties', icon: Building },
    { path: '/projects', label: isAr ? 'المشروعات والكمبوندات' : 'Projects', icon: Layers },
    { path: '/demands', label: isAr ? 'طلبات المشترين' : 'Buyer Demands', icon: FileText },
    { path: '/special-requests', label: isAr ? 'طلب عقار خاص VIP' : 'Special Requests', badge: 'VIP', badgeType: 'gold', icon: Sparkles },
    { path: '/market-intelligence', label: isAr ? 'مؤشرات أسعار السوق' : 'Market Intel', icon: TrendingUp },
    { path: '/financing', label: isAr ? 'حاسبة التمويل والأقساط' : 'Financing', icon: Landmark },
    { path: '/investor', label: isAr ? 'بوابة المستثمرين' : 'Investors', icon: Award }
  ];

  return (
    <header className="site-header sticky-header">
      <div className="header-container glass-capsule">
        {/* Mobile One-Step Back Navigation Button */}
        {location.pathname !== '/' && (
          <button
            type="button"
            className="mobile-header-back-btn hide-desktop"
            onClick={() => {
              if (window.history.length > 1) {
                window.history.back();
              } else {
                window.location.href = '/';
              }
            }}
            title={isAr ? 'الرجوع خطوة للخلف' : 'Go back one step'}
            aria-label={isAr ? 'الرجوع خطوة للخلف' : 'Go back one step'}
          >
            {isAr ? <ArrowRight size={20} /> : <ArrowLeft size={20} />}
          </button>
        )}

        {/* Brand Logo */}
        <Link to="/" className="brand-logo" onClick={() => setMobileMenuOpen(false)}>
          <LogoEmblem size={40} />
          <div className="brand-text">
            <span className="brand-title header-brand-title" dir="ltr">
              <span className="brand-one header-brand-one">1</span>
              <span className="brand-line">LINE</span>
            </span>
            <span className="brand-subtitle">{isAr ? 'للاستشارات و التسويق العقاري' : 'Real Estate Consulting & Marketing'}</span>
          </div>
        </Link>

        {/* 🌟 Ultra-Luxury Harmonious Desktop Navigation (Consolidated Hubs) */}
        <nav className="desktop-nav luxury-desktop-nav" ref={navRef}>
          {navHubs.map((hub) => {
            if (hub.type === 'link') {
              const active = isActive(hub.path);
              const HubIcon = hub.icon;
              return (
                <Link
                  key={hub.id}
                  to={hub.path}
                  className={`luxury-nav-pill ${active ? 'active' : ''}`}
                >
                  <HubIcon size={14} className="nav-pill-icon" />
                  <span className="nav-pill-label">{hub.label}</span>
                </Link>
              );
            }

            const groupActive = isGroupActive(hub.activePaths);
            const isOpen = activeDropdown === hub.id;
            const HubIcon = hub.icon;

            return (
              <div
                key={hub.id}
                className="luxury-nav-dropdown-wrapper"
                onMouseEnter={() => handleMouseEnter(hub.id)}
                onMouseLeave={handleMouseLeave}
              >
                <button
                  type="button"
                  className={`luxury-nav-pill ${groupActive ? 'active' : ''} ${isOpen ? 'open' : ''} ${hub.id === 'vip-services' ? 'vip-nav-pill' : ''}`}
                  onClick={() => setActiveDropdown(isOpen ? null : hub.id)}
                  aria-expanded={isOpen}
                >
                  <HubIcon size={14} className="nav-pill-icon" />
                  <span className="nav-pill-label">{hub.label}</span>
                  {hub.badge && (
                    <span className={`luxury-badge luxury-badge-${hub.badgeType || 'gold'}`}>
                      {hub.badge}
                    </span>
                  )}
                  <ChevronDown size={12} className={`nav-chevron ${isOpen ? 'rotate' : ''}`} />
                </button>

                {isOpen && (
                  <div className="luxury-dropdown-menu">
                    {hub.items.map((item) => {
                      const ItemIcon = item.icon;
                      const itemActive = isActive(item.path);
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          className={`luxury-dropdown-item ${itemActive ? 'active' : ''}`}
                          onClick={() => setActiveDropdown(null)}
                        >
                          <div className="dropdown-item-icon-box">
                            <ItemIcon size={15} />
                          </div>
                          <div className="dropdown-item-text">
                            <div className="dropdown-item-title-row">
                              <span className="dropdown-item-title">{item.label}</span>
                              {item.badge && (
                                <span className={`luxury-badge luxury-badge-${item.badgeType || 'gold'}`}>
                                  {item.badge}
                                </span>
                              )}
                            </div>
                            <span className="dropdown-item-desc">{item.desc}</span>
                          </div>
                        </Link>
                      );
                    })}
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

          {/* Active Favorites Pill */}
          {favoritesCount > 0 && onOpenFavorites && (
            <button
              type="button"
              className="header-favorites-pill"
              onClick={onOpenFavorites}
              title={isAr ? 'عرض العقارات المحفوظة' : 'View Saved Properties'}
            >
              <Heart size={14} fill="#ef4444" color="#ef4444" />
              <span>{isAr ? `المفضلة (${favoritesCount})` : `Saved (${favoritesCount})`}</span>
            </button>
          )}

          {/* 🔍 Global Quick Search (Ctrl + K) Button */}
          {onOpenQuickSearch && (
            <button
              type="button"
              className="header-omnisearch-btn hide-mobile"
              onClick={onOpenQuickSearch}
              title={isAr ? 'البحث السريع في عقارات ومناطق سوهاج (Ctrl + K)' : 'Quick Search (Ctrl + K)'}
              aria-label={isAr ? 'البحث السريع' : 'Quick Search'}
            >
              <Search size={14} className="search-btn-icon" />
              <span className="search-btn-label">{isAr ? 'بحث سريع...' : 'Quick Search...'}</span>
              <kbd className="search-kbd-shortcut">Ctrl K</kbd>
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

            {/* Currency Selector Dropdown (EGP, SAR, AED, USD, KWD) */}
            <div className="currency-dropdown-wrapper" ref={currencyDropdownRef}>
              <button
                type="button"
                className={`utility-sub-btn currency-trigger-btn ${currencyMenuOpen ? 'active' : ''}`}
                onClick={() => setCurrencyMenuOpen(!currencyMenuOpen)}
                title={isAr ? `العملة الحالية: ${currency} — انقر لتغيير العملة` : `Currency: ${currency} — Click to switch`}
                aria-label="Currency Switcher"
              >
                <span className="currency-flag-badge">{CURRENCY_RATES[currency]?.flag || '🇪🇬'}</span>
                <span className="currency-code-text">{currency}</span>
                <ChevronDown size={11} style={{ opacity: 0.75, transform: currencyMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </button>

              {currencyMenuOpen && (
                <div className="currency-dropdown-menu">
                  <div className="currency-dropdown-header">
                    {isAr ? '💱 اختر عملة العرض' : '💱 Select Display Currency'}
                  </div>
                  {Object.entries(CURRENCY_RATES).map(([currKey, data]) => (
                    <button
                      key={currKey}
                      type="button"
                      className={`currency-dropdown-item ${currency === currKey ? 'active' : ''}`}
                      onClick={() => {
                        if (setCurrency) setCurrency(currKey);
                        setCurrencyMenuOpen(false);
                      }}
                    >
                      <span className="currency-item-flag">{data.flag}</span>
                      <span className="currency-item-title">
                        <strong>{currKey}</strong>
                        <span className="currency-item-sub">({isAr ? data.symbol_ar : data.symbol_en})</span>
                      </span>
                      {currency === currKey && <span className="currency-active-check">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

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

        {/* 💬 Royal Blue & Gold WhatsApp CTA Button with Live Advisor Pulse */}
        <a
          href={getWhatsAppUrl(isAr ? 'مرحباً 1Line، أريد الاستفسار عن العقارات والفرص المتاحة بسوهاج.' : 'Hello 1Line, inquiring about available properties in Sohag.')}
          target="_blank"
          rel="noopener noreferrer"
          className="cta-royal-btn hide-tablet"
          title={isAr ? 'تواصل مباشر مع مستشار 1Line عبر واتساب' : 'Direct WhatsApp with 1Line Advisor'}
        >
          <span className="advisor-live-dot" title="مستشار متاح الآن"></span>
          <MessageSquare size={15} />
          <span>{isAr ? 'تواصل معنا' : 'Contact Us'}</span>
        </a>

          {/* Mobile Quick Search Button */}
          {onOpenQuickSearch && (
            <button
              type="button"
              className="mobile-quick-search-btn hide-desktop"
              onClick={onOpenQuickSearch}
              title={isAr ? 'البحث السريع' : 'Quick Search'}
              aria-label="Quick Search"
            >
              <Search size={20} />
            </button>
          )}

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
            {onOpenQuickSearch && (
              <button
                type="button"
                className="mobile-drawer-search-pill"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenQuickSearch();
                }}
              >
                <Search size={16} />
                <span>{isAr ? 'البحث السريع (Ctrl + K)' : 'Quick Search (Ctrl + K)'}</span>
              </button>
            )}

            {favoritesCount > 0 && onOpenFavorites && (
              <button
                type="button"
                className="mobile-drawer-fav-pill"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenFavorites();
                }}
              >
                <Heart size={16} fill="#ef4444" color="#ef4444" />
                <span>{isAr ? `العقارات المحفوظة بالمفضلة (${favoritesCount})` : `Saved Properties (${favoritesCount})`}</span>
              </button>
            )}
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

            {/* Mobile Currency Selection Strip for Gulf & Expat Investors */}
            <div className="mobile-drawer-currency" style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              padding: '12px 16px',
              marginTop: '16px',
              borderTop: '1px solid var(--border-color)',
              background: 'var(--secondary)',
              borderRadius: 'var(--radius-md)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                <span>{isAr ? '💱 عملة العرض (للمغتربين والمستثمرين):' : '💱 Display Currency:'}</span>
                <span style={{ color: 'var(--accent-gold)' }}>{currency} ({CURRENCY_RATES[currency]?.flag})</span>
              </div>
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
                {Object.entries(CURRENCY_RATES).map(([currKey, data]) => (
                  <button
                    key={currKey}
                    type="button"
                    onClick={() => setCurrency && setCurrency(currKey)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '6px 12px',
                      borderRadius: 'var(--radius-pill)',
                      border: currency === currKey ? '1.5px solid var(--accent-gold)' : '1px solid var(--border-color)',
                      background: currency === currKey ? 'rgba(217, 119, 6, 0.15)' : 'var(--card-bg, #ffffff)',
                      color: currency === currKey ? 'var(--accent-gold)' : 'var(--text-primary)',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      flexShrink: 0
                    }}
                  >
                    <span>{data.flag}</span>
                    <span>{currKey}</span>
                  </button>
                ))}
              </div>
            </div>

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
