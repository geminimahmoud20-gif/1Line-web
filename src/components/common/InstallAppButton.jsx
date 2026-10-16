import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, Share, SquarePlus, X } from 'lucide-react';
import { installMode, promptInstall, subscribeInstall } from '../../utils/pwaInstall';
import '../../styles/install-app.css';

/**
 * "ثبّت التطبيق": Android/desktop Chrome get the browser's own install dialog; iPhone Safari gets
 * the two Add-to-Home-Screen steps. Renders nothing once installed or where neither is possible.
 */
export default function InstallAppButton({ lang = 'ar', className = '', onDone }) {
  const isAr = lang === 'ar';
  const [mode, setMode] = useState(installMode);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const closeRef = useRef(null);

  useEffect(() => subscribeInstall(() => setMode(installMode())), []);

  useEffect(() => {
    if (!showIosHelp) return undefined;
    closeRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') setShowIosHelp(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showIosHelp]);

  if (!mode) return null;

  const onClick = async () => {
    if (mode === 'ios') { setShowIosHelp(true); return; }
    await promptInstall();
    onDone?.();
  };

  return (
    <>
      <button type="button" className={`install-app-btn ${className}`} onClick={onClick}>
        <Download size={16} aria-hidden="true" />
        <span>{isAr ? 'ثبّت تطبيق 1Line' : 'Install the 1Line app'}</span>
      </button>

      {/* Portal: the header is its own stacking context, so a sheet opened from the menu sat under the bottom bar */}
      {showIosHelp && createPortal(
        <div className="install-ios-backdrop" onClick={() => setShowIosHelp(false)}>
          <div
            className="install-ios-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="install-ios-title"
            dir={isAr ? 'rtl' : 'ltr'}
            onClick={(e) => e.stopPropagation()}
          >
            <button ref={closeRef} type="button" className="install-ios-close" onClick={() => setShowIosHelp(false)} aria-label={isAr ? 'إغلاق' : 'Close'}>
              <X size={18} aria-hidden="true" />
            </button>
            <img src="/apple-touch-icon.png" alt="" width="56" height="56" className="install-ios-icon" />
            <h2 id="install-ios-title">{isAr ? 'ضيف 1Line على الشاشة الرئيسية' : 'Add 1Line to your Home Screen'}</h2>
            <ol>
              <li>
                <Share size={18} aria-hidden="true" />
                <span>{isAr ? 'اضغط زرار المشاركة تحت في Safari' : 'Tap the Share button in Safari'}</span>
              </li>
              <li>
                <SquarePlus size={18} aria-hidden="true" />
                <span>{isAr ? 'اختار "إضافة إلى الشاشة الرئيسية" ثم "إضافة"' : 'Choose "Add to Home Screen", then "Add"'}</span>
              </li>
            </ol>
            <p>{isAr ? 'هيفتح كتطبيق من غير شريط المتصفح، ويتحدّث لوحده مع الموقع.' : 'It opens like an app, without the browser bar, and updates with the site.'}</p>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
