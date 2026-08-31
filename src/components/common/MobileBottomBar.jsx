import { Link, useLocation } from 'react-router-dom';
import { Home, Building, Calculator, MessageSquare, Scale } from 'lucide-react';

export default function MobileBottomBar({ 
  lang = 'ar', 
  compareCount = 0, 
  onOpenCompare,
  onOpenContactDrawer
}) {
  const location = useLocation();
  const isAr = lang === 'ar';

  const isActive = (path) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <div className="mobile-floating-bottom-bar">
      <div className="mobile-bar-inner">
        {/* 1. Home */}
        <Link to="/" className={`mob-tab-btn ${isActive('/') ? 'active' : ''}`}>
          <Home size={20} />
          <span>{isAr ? 'الرئيسية' : 'Home'}</span>
        </Link>

        {/* 2. Properties Catalog */}
        <Link to="/properties" className={`mob-tab-btn ${isActive('/properties') ? 'active' : ''}`}>
          <Building size={20} />
          <span>{isAr ? 'العقارات' : 'Properties'}</span>
        </Link>

        {/* 3. Instant Call & WhatsApp Multi-Channel Dial (Center Glow Pill) */}
        <button
          type="button"
          className="mob-tab-btn mob-center-cta"
          onClick={onOpenContactDrawer}
          title={isAr ? 'اتصال وتواصل فوري' : 'Quick Contact'}
        >
          <div className="mob-center-icon-wrap">
            <MessageSquare size={22} />
          </div>
          <span>{isAr ? 'تواصل' : 'Contact'}</span>
        </button>

        {/* 4. Financing Calculator */}
        <Link to="/financing" className={`mob-tab-btn ${isActive('/financing') ? 'active' : ''}`}>
          <Calculator size={20} />
          <span>{isAr ? 'التمويل' : 'Financing'}</span>
        </Link>

        {/* 5. Compare Drawer Trigger */}
        <button
          type="button"
          className={`mob-tab-btn ${compareCount > 0 ? 'has-badge' : ''}`}
          onClick={onOpenCompare}
        >
          <div className="icon-with-badge">
            <Scale size={20} />
            {compareCount > 0 && <span className="mob-compare-count">{compareCount}</span>}
          </div>
          <span>{isAr ? 'مقارنة' : 'Compare'}</span>
        </button>
      </div>
    </div>
  );
}
