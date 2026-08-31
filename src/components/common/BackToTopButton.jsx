import { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

export default function BackToTopButton({ lang = 'ar' }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 450) {
        setVisible(true);
      } else {
        setVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  if (!visible) return null;

  return (
    <button
      type="button"
      className="floating-back-to-top-btn"
      onClick={scrollToTop}
      title={lang === 'ar' ? 'الرجوع لأعلى الصفحة' : 'Scroll to top'}
      aria-label="Back to Top"
    >
      <ArrowUp size={18} />
    </button>
  );
}
