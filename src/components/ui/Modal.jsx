import { useId } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, m } from 'motion/react';
import { X } from 'lucide-react';
import IconButton from './IconButton';
import { useOverlay } from './useOverlay';
import { dialog, overlay, sheet } from './motionPresets';
import { cx } from './cx';

const isPhone = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches;

// Centered dialog on desktop, bottom sheet on phones. size: sm | md | lg.
// closeLabel is the spoken name of the × button ("إغلاق" in Arabic screens).
export default function Modal({ open, onClose, title, description, footer, size = 'md', closeLabel = 'إغلاق', dismissible = true, children }) {
  const panelRef = useOverlay(open, dismissible ? onClose : undefined);
  const titleId = useId();
  const descId = useId();
  if (typeof document === 'undefined') return null;
  const variants = isPhone() ? sheet : dialog;
  return createPortal(
    <AnimatePresence>
      {open && (
        <m.div
          className="ui-overlay ui-root"
          variants={overlay}
          initial="hidden"
          animate="show"
          exit="exit"
          onMouseDown={(e) => { if (dismissible && e.target === e.currentTarget) onClose?.(); }}
        >
          <m.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descId : undefined}
            tabIndex={-1}
            className={cx('ui-modal', size !== 'md' && `ui-modal--${size}`)}
            variants={variants}
          >
            <div className="ui-modal__head">
              <div className="ui-modal__titles">
                <h2 id={titleId} className="ui-modal__title">{title}</h2>
                {description && <p id={descId} className="ui-modal__desc">{description}</p>}
              </div>
              {dismissible && <IconButton label={closeLabel} icon={<X size={18} />} size="sm" onClick={onClose} />}
            </div>
            {children && <div className="ui-modal__body">{children}</div>}
            {footer && <div className="ui-modal__foot">{footer}</div>}
          </m.div>
        </m.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
