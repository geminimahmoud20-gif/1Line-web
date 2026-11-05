import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { MessageSquare, Menu, X, Search, Globe, Share2, Sun, Moon, Volume2, VolumeX, MoreHorizontal, Scale, Building, Sparkles, FileText, ChevronDown, Home, TrendingUp, Award, Layers, Heart, ArrowRight, ArrowLeft, Lock, User, ShieldCheck, Repeat2, Stethoscope, PlusCircle, Landmark, Briefcase, Info, Phone, MessageCircle, ChevronLeft, ChevronRight, Users } from 'lucide-react';
import LogoEmblem from '../LogoEmblem';
import InstallAppButton from './InstallAppButton';
import CurrencySwitcher from './CurrencySwitcher';
import { getWhatsAppUrl, getPhoneCallUrl } from '../../utils/founderCmsData';
import '../../styles/mobile-drawer.css';
import './header-services-menu.css';
import { playNotificationChime } from '../../utils/notificationHub';
import { useClientAuth } from '../../context/ClientAuthContext';
import useBodyScrollLock from '../../hooks/useBodyScrollLock';

export default function Header({ 
  lang = 'ar', 
  setLang, 
  theme = 'light',
  toggleTheme,
  soundEnabled = false,
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
  // The phone menu starts right under the header capsule, wherever that ends on this phone
  const capsuleRef = useRef(null);
  const [menuTop, setMenuTop] = useState(76);
  useBodyScrollLock(mobileMenuOpen);
  const [toolsMenuOpen, setToolsMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const dropdownTimeoutRef = useRef(null);
  const navRef = useRef(null);
  const toolsDropdownRef = useRef(null);
  const location = useLocation();
  const { clientUser, isClientAuthenticated } = useClientAuth();

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

  // Close menus on route change (adjusted during render, not in an effect)
  const [menuPath, setMenuPath] = useState(location.pathname);
  if (menuPath !== location.pathname) {
    setMenuPath(location.pathname);
    setActiveDropdown(null);
    setToolsMenuOpen(false);
    setMobileMenuOpen(false);
  }

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
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, []);

  // While the menu is open the bottom bar and floating buttons step aside (they used to cover its end)
  useEffect(() => {
    if (!mobileMenuOpen) return undefined;
    document.documentElement.classList.add('mobile-menu-open');
    return () => document.documentElement.classList.remove('mobile-menu-open');
  }, [mobileMenuOpen]);

  // Handle browser back button & escape key to close mobile drawer
  useEffect(() => {
    if (!mobileMenuOpen) return;
    window.history.pushState({ mobileDrawerOpen: true }, '');
    const handlePopState = () => setMobileMenuOpen(false);
    const handleKeyDown = (e) => { if (e.key === 'Escape') setMobileMenuOpen(false); };
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('keydown', handleKeyDown);
      if (window.history.state?.mobileDrawerOpen) {
        window.history.back();
      }
    };
  }, [mobileMenuOpen]);

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
      label: isAr ? 'العقارات' : 'Properties',
      title: isAr ? 'العقارات المعتمدة' : 'Verified Properties',
      icon: Building
    },
    {
      id: 'projects',
      type: 'link',
      path: '/projects',
      label: isAr ? 'المشروعات' : 'Projects',
      title: isAr ? 'المشروعات والكمبوندات' : 'Projects & Compounds',
      icon: Layers
    },
    {
      id: 'sell',
      type: 'link',
      path: '/sell',
      label: isAr ? 'اعرض عقارك' : 'List Property',
      title: isAr ? 'اعرض عقارك للبيع أمام نخبة المشترين والمستثمرين' : 'List your property for sale',
      icon: PlusCircle
    },
    {
      id: 'about',
      type: 'link',
      path: '/about',
      label: isAr ? 'عن الشركة' : 'About Us',
      title: isAr ? 'عن 1Line ورؤية الإدارة والمؤسس' : 'About 1Line & Leadership',
      icon: Award
    },
    {
      // Five links stay in the bar; buyer demands and the VIP services share one menu
      id: 'services',
      type: 'dropdown',
      label: isAr ? 'خدمات' : 'Services',
      title: isAr ? 'طلبات المشترين وخدمات واستشارات VIP' : 'Buyer demands, VIP services & advisory',
      icon: Sparkles,
      activePaths: ['/match', '/broker', '/demands', '/special-requests', '/market-intelligence', '/financing', '/investor', '/private-office', '/off-market', '/trade-in', '/commercial-hub'],
      // Three short sections so the menu reads at a glance: buy & sell, prices & finance, premium clients
      groups: [
        {
          id: 'deal',
          title: isAr ? 'بيع وشراء' : 'Buy & sell',
          items: [
            { path: '/match', label: isAr ? 'رشّحلي عقاري' : 'Find my property', desc: isAr ? 'شقة، محل، أرض… ونرشّحلك الأنسب' : 'Any property, the best fits', badge: isAr ? 'جديد' : 'New', icon: Sparkles },
            { path: '/demands', label: isAr ? 'طلبات المشترين' : 'Buyer demands', desc: isAr ? 'مشترين بيدوّروا على عقار زي عقارك' : 'Buyers looking for a property like yours', icon: FileText },
            { path: '/trade-in', label: isAr ? 'بدّل عقارك' : 'Trade in', desc: isAr ? 'بفرق كاش أو رأس برأس' : 'With or without a cash difference', badge: isAr ? 'جديد' : 'New', icon: Repeat2 },
            { path: '/commercial-hub', label: isAr ? 'عيادات ومحلات ومكاتب' : 'Clinics, shops & offices', desc: isAr ? 'الموقع والركن وحاسبة العائد' : 'Location, parking & yield', icon: Stethoscope },
            { path: '/broker', label: isAr ? 'شبكة الوسطاء' : 'Brokers network', desc: isAr ? 'اعرض وحدات عملائك وطلباتهم معانا' : 'List your clients’ units and requests with us', icon: Users }
          ]
        },
        {
          id: 'prices',
          title: isAr ? 'أسعار وتمويل' : 'Prices & finance',
          items: [
            { path: '/market-intelligence', label: isAr ? 'أسعار المتر في سوهاج' : 'Price per m²', desc: isAr ? 'متوسط كل منطقة من العروض الحالية' : 'Each area, from current listings', icon: TrendingUp },
            { path: '/financing', label: isAr ? 'التمويل والتقسيط' : 'Financing', desc: isAr ? 'حاسبة القسط وبرامج التمويل' : 'Instalment calculator & programmes', icon: Landmark }
          ]
        },
        {
          id: 'vip',
          title: isAr ? 'كبار العملاء' : 'Premium clients',
          items: [
            { path: '/private-office', label: isAr ? 'المكتب الخاص' : 'Private office', desc: isAr ? 'صفقات حصرية بسرية تامة' : 'Off-market deals in confidence', badge: isAr ? 'حصري' : 'Exclusive', icon: Lock },
            { path: '/special-requests', label: isAr ? 'اطلب عقار بمواصفاتك' : 'Bespoke request', desc: isAr ? 'نوصلك للعقار اللي في دماغك' : 'We source exactly what you want', badge: 'VIP', icon: Sparkles },
            { path: '/investor', label: isAr ? 'بوابة المستثمرين' : 'Investors', desc: isAr ? 'أراضي ومحافظ استثمارية كبيرة' : 'Large land & portfolios', icon: Briefcase }
          ]
        }
      ]
    }
  ];

  // Phone menu: three short groups, each link with its own icon, badges in Arabic
  const mobileGroups = [
    {
      id: 'browse',
      title: isAr ? 'تصفّح' : 'Browse',
      links: [
        { path: '/', label: isAr ? 'الرئيسية' : 'Home', icon: Home },
        { path: '/properties', label: isAr ? 'العقارات' : 'Properties', icon: Building },
        { path: '/match', label: isAr ? 'رشّحلي عقاري' : 'Find my property', badge: isAr ? 'جديد' : 'New', icon: Sparkles },
        { path: '/projects', label: isAr ? 'المشروعات والكمبوندات' : 'Projects & compounds', icon: Layers },
        { path: '/developers', label: isAr ? 'شركات التطوير' : 'Developers', icon: Building },
        { path: '/demands', label: isAr ? 'طلبات المشترين' : 'Buyer demands', icon: FileText },
        { path: '/commercial-hub', label: isAr ? 'عيادات ومحلات ومكاتب' : 'Clinics, shops & offices', icon: Stethoscope },
        { path: '/market-intelligence', label: isAr ? 'أسعار المتر في سوهاج' : 'Price per m²', icon: TrendingUp }
      ]
    },
    {
      id: 'services',
      title: isAr ? 'خدمات' : 'Services',
      links: [
        { path: '/sell', label: isAr ? 'اعرض عقارك للبيع' : 'Sell your property', icon: PlusCircle },
        { path: '/trade-in', label: isAr ? 'بدّل عقارك' : 'Trade in', badge: isAr ? 'جديد' : 'New', icon: Repeat2 },
        { path: '/financing', label: isAr ? 'التمويل والتقسيط' : 'Financing', icon: Landmark },
        { path: '/broker', label: isAr ? 'شبكة الوسطاء' : 'Brokers network', icon: Users },
        { path: '/special-requests', label: isAr ? 'اطلب عقار بمواصفاتك' : 'Request a property', badge: 'VIP', icon: Sparkles }
      ]
    },
    {
      id: 'about',
      title: isAr ? 'عن 1Line' : 'About 1Line',
      links: [
        { path: '/about', label: isAr ? 'عن الشركة والمؤسس' : 'About & founder', icon: Info },
        { path: '/investor', label: isAr ? 'بوابة المستثمرين' : 'Investors', icon: Briefcase },
        { path: '/private-office', label: isAr ? 'المكتب الخاص لكبار العملاء' : 'Private office', badge: isAr ? 'حصري' : 'Exclusive', icon: Lock }
      ]
    }
  ];
  const Chevron = isAr ? ChevronLeft : ChevronRight;
  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <header className="site-header sticky-header" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="header-container glass-capsule" ref={capsuleRef}>
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
                  title={hub.title || hub.label}
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
                  className={`luxury-nav-pill ${groupActive ? 'active' : ''} ${isOpen ? 'open' : ''} ${hub.id === 'services' ? 'vip-nav-pill' : ''}`}
                  onClick={() => setActiveDropdown(isOpen ? null : hub.id)}
                  title={hub.title || hub.label}
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
                  <div className="luxury-dropdown-menu svc-menu" role="menu">
                    {hub.groups.map((group) => (
                      <section key={group.id} className="svc-col" aria-label={group.title}>
                        <h3 className="svc-col-title">{group.title}</h3>
                        {group.items.map((item) => {
                          const ItemIcon = item.icon;
                          return (
                            <Link
                              key={item.path}
                              to={item.path}
                              role="menuitem"
                              className={`svc-item ${isActive(item.path) ? 'active' : ''}`}
                              onClick={() => setActiveDropdown(null)}
                            >
                              <span className="svc-icon"><ItemIcon size={16} /></span>
                              <span className="svc-text">
                                <span className="svc-title">
                                  {item.label}
                                  {item.badge && <span className="svc-badge">{item.badge}</span>}
                                </span>
                                <span className="svc-desc">{item.desc}</span>
                              </span>
                            </Link>
                          );
                        })}
                      </section>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Streamlined, Clean Action Group */}
        <div className="header-actions">
          {/* 👤 Client Account & Favorites Portal Button */}
          <Link
            to="/my-account"
            className={`header-client-account-btn ${isClientAuthenticated ? 'authenticated' : ''}`}
            title={isAr 
              ? (isClientAuthenticated ? `حساب العميل المعتمد: ${clientUser?.name}` : 'حساب العميل (المفضلة والمقارنة)') 
              : 'Client Account (Favorites & Compare)'}
          >
            <User size={15} className="account-icon" />
            <span className="account-text hide-mobile">
              {isClientAuthenticated ? clientUser?.name?.split(' ')[0] : (isAr ? 'حسابي' : 'Account')}
            </span>
            {isClientAuthenticated && (
              <span className="account-badge-verified">
                <ShieldCheck size={12} />
              </span>
            )}
          </Link>

          {/* Active Comparison Button (Luxury Sleek Badge) */}
          {compareCount > 0 && onOpenCompare && (
            <button
              type="button"
              className="header-compare-pill header-icon-badge-btn"
              onClick={onOpenCompare}
              title={isAr ? `عرض مقارنة العقارات المختارة (${compareCount})` : `View Property Comparison (${compareCount})`}
              aria-label="المقارنة"
            >
              <Scale size={15} />
              <span className="header-badge-count">{compareCount}</span>
            </button>
          )}

          {/* Active Favorites Button (Luxury Sleek Badge) */}
          {favoritesCount > 0 && onOpenFavorites && (
            <button
              type="button"
              className="header-favorites-pill header-icon-badge-btn favorites-badge-btn"
              onClick={onOpenFavorites}
              title={isAr ? `عرض العقارات المحفوظة (${favoritesCount})` : `View Saved Properties (${favoritesCount})`}
              aria-label="المفضلة"
            >
              <Heart size={15} fill="#ef4444" color="#ef4444" />
              <span className="header-badge-count">{favoritesCount}</span>
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
            {/* Display currency for expats (indicative "≈" equivalents; contracts stay in EGP) */}
            <div className="header-currency-wrap hide-mobile-sm">
              <CurrencySwitcher lang={lang} compact />
            </div>

            <div className="utility-divider utility-divider--theme hide-mobile-sm" />

            {/* Theme Toggle (Sun/Moon) with Luxury Rotation Effect */}
            <button
              type="button"
              className="utility-sub-btn theme-toggle-btn theme-toggle-btn--bar hide-mobile-sm"
              onClick={handleThemeToggle}
              title={isAr ? (theme === 'dark' ? 'الوضع الليلي مفعّل — انقر للتبديل للنهاري' : 'الوضع النهاري مفعّل — انقر لتفعيل الوضع الليلي الفاخر') : 'Toggle Luxury Theme'}
              aria-label="تبديل الوضع الليلي"
            >
              {theme === 'dark' ? (
                <Sun size={15} className="text-gold theme-icon-rotate" />
              ) : (
                <Moon size={15} className="theme-icon-rotate" />
              )}
            </button>

            <div className="utility-divider hide-mobile" />

            {/* Language Switcher */}
            <button
              type="button"
              className="utility-sub-btn lang-toggle-btn"
              onClick={() => {
                setLang(lang === 'ar' ? 'en' : 'ar');
                if (soundEnabled) playNotificationChime('click');
              }}
              title={isAr ? "Switch to English" : "التبديل إلى العربية"}
              aria-label={isAr ? "تغيير لغة المنصة إلى الإنجليزية" : "Switch language to Arabic"}
            >
              <Globe size={13} />
              <span>{isAr ? 'EN' : 'عربي'}</span>
            </button>

            <div className="utility-divider hide-mobile" />

            {/* More Tools Dropdown */}
            <div className="tools-dropdown-wrapper hide-mobile" ref={toolsDropdownRef}>
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

                <button
                  type="button"
                  className="tool-dropdown-item"
                  data-theme-toggle
                  onClick={handleThemeToggle}
                >
                  {theme === 'dark' ? <Sun size={16} className="text-gold" /> : <Moon size={16} />}
                  <span>{isAr ? (theme === 'dark' ? 'الوضع النهاري' : 'الوضع الليلي') : (theme === 'dark' ? 'Light mode' : 'Dark mode')}</span>
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
                      window.location.href = '/about';
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
            <span className="cta-btn-text">{isAr ? 'تواصل معنا' : 'Contact Us'}</span>
            <span className="cta-btn-short-text">{isAr ? 'تواصل' : 'Contact'}</span>
          </a>

          {/* Mobile Quick Search Button */}
          {onOpenQuickSearch && (
            <button
              type="button"
              className="mobile-quick-search-btn hide-desktop"
              onClick={() => {
                onOpenQuickSearch();
                if (soundEnabled) playNotificationChime('click');
              }}
              title={isAr ? 'البحث السريع' : 'Quick Search'}
              aria-label="بحث سريع"
            >
              <Search size={18} />
            </button>
          )}

          {/* Mobile Menu Hamburger */}
          <button
            type="button"
            className="mobile-hamburger-btn"
            onClick={() => {
              if (!mobileMenuOpen && capsuleRef.current) setMenuTop(Math.round(capsuleRef.current.getBoundingClientRect().bottom + 6));
              setMobileMenuOpen(!mobileMenuOpen);
              if (soundEnabled) playNotificationChime('click');
            }}
            aria-label="القائمة"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {/* In <body>, not inside the header: a blurred (dark mode) header would otherwise become the
          box the fixed menu is measured against */}
      {mobileMenuOpen && typeof document !== 'undefined' && createPortal(
        <div
          dir={isAr ? 'rtl' : 'ltr'}
          className="mdw"
          style={{ '--mdw-top': `${menuTop}px` }}
          role="dialog"
          aria-modal="true"
          aria-label={isAr ? 'قائمة التنقل الرئيسية للموقع' : 'Main Navigation Menu'}
        >
          <div className="mdw-inner">
            <div className="mdw-top">
              {onOpenQuickSearch && (
                <button type="button" className="mdw-search" onClick={() => { closeMenu(); onOpenQuickSearch(); }}>
                  <Search size={17} aria-hidden="true" />
                  <span>{isAr ? 'ابحث عن عقار، منطقة أو كود' : 'Search a property, area or code'}</span>
                </button>
              )}
              <Link to="/my-account" className={`mdw-account ${isClientAuthenticated ? 'is-in' : ''}`} onClick={closeMenu}>
                <span className="mdw-ico"><User size={17} aria-hidden="true" /></span>
                <span className="mdw-account-text">
                  <strong>
                    {isClientAuthenticated
                      ? (isAr ? `حسابي (${clientUser.name.split(' ')[0]})` : `My account (${clientUser.name.split(' ')[0]})`)
                      : (isAr ? 'حسابك: المفضلة والمقارنة' : 'Your account: favourites & compare')}
                  </strong>
                  {!isClientAuthenticated && <small>{isAr ? 'سجّل برقم موبايلك في ثواني' : 'Sign in with your phone in seconds'}</small>}
                </span>
                <Chevron size={16} className="mdw-chev" aria-hidden="true" />
              </Link>
              {favoritesCount > 0 && onOpenFavorites && (
                <button type="button" className="mdw-fav" onClick={() => { closeMenu(); onOpenFavorites(); }}>
                  <Heart size={16} fill="currentColor" aria-hidden="true" />
                  <span>{isAr ? `المفضلة (${favoritesCount})` : `Saved (${favoritesCount})`}</span>
                </button>
              )}
              <InstallAppButton lang={lang} className="is-block mobile-drawer-install" onDone={closeMenu} />
            </div>

            {mobileGroups.map((g) => (
              <nav key={g.id} className="mdw-group" aria-label={g.title}>
                <h3 className="mdw-group-title">{g.title}</h3>
                {g.links.map((link) => {
                  const LinkIcon = link.icon;
                  const on = link.path === '/' ? location.pathname === '/' : isActive(link.path);
                  return (
                    <Link key={link.path} to={link.path} className={`mdw-link ${on ? 'is-active' : ''}`} aria-current={on ? 'page' : undefined} onClick={closeMenu}>
                      <span className="mdw-ico"><LinkIcon size={17} aria-hidden="true" /></span>
                      <span className="mdw-label">{link.label}</span>
                      {link.badge && <span className="mdw-badge">{link.badge}</span>}
                    </Link>
                  );
                })}
              </nav>
            ))}

            <div className="mdw-contact">
              <a className="mdw-contact-btn is-wa" href={getWhatsAppUrl(isAr ? 'مرحباً 1Line، أريد الاستفسار عن العقارات المتاحة.' : 'Hello 1Line, I would like to ask about available properties.')} target="_blank" rel="noopener noreferrer" onClick={closeMenu}>
                <MessageCircle size={18} aria-hidden="true" /> {isAr ? 'واتساب' : 'WhatsApp'}
              </a>
              <a className="mdw-contact-btn is-call" href={getPhoneCallUrl()} onClick={closeMenu}>
                <Phone size={18} aria-hidden="true" /> {isAr ? 'اتصل بنا' : 'Call us'}
              </a>
            </div>

            <div className="mdw-utils">
              <button type="button" className="mdw-util" onClick={handleThemeToggle}>
                {theme === 'dark' ? <Sun size={17} aria-hidden="true" /> : <Moon size={17} aria-hidden="true" />}
                <span>{isAr ? (theme === 'dark' ? 'الوضع النهاري' : 'الوضع الليلي') : (theme === 'dark' ? 'Light mode' : 'Dark mode')}</span>
              </button>
              <div className="mdw-util mdw-util--currency"><CurrencySwitcher lang={lang} compact={false} /></div>
              <button type="button" className="mdw-util" onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}>
                <Globe size={17} aria-hidden="true" />
                <span>{isAr ? 'English' : 'عربي'}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </header>
  );
}
