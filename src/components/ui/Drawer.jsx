import { useId } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, m } from 'motion/react';
import { X } from 'lucide-react';
import IconButton from './IconButton';
import { useOverlay } from './useOverlay';
import { drawerFrom, overlay } from './motionPresets';
import { cx } from './cx';

// Side panel for record details. side: end (default, the reading-end edge) | start.
export default function Drawer({ open, onClose, title, description, footer, side = 'end', closeLabel = 'إغلاق', headerActions = null, children }) {
  const panelRef = useOverlay(open, onClose);
  const titleId = useId();
  if (typeof document === 'undefined') return null;
  const rtl = document.documentElement.dir !== 'ltr';
  return createPortal(
    <AnimatePresence>
      {open && (
        <m.div
          className="ui-overlay ui-overlay--drawer ui-root"
          variants={overlay}
          initial="hidden"
          animate="show"
          exit="exit"
          onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
        >
          <m.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className={cx('ui-drawer', side === 'start' && 'ui-drawer--start')}
            variants={drawerFrom(rtl, side)}
          >
            <div className="ui-modal__head">
              <div className="ui-modal__titles">
                <h2 id={titleId} className="ui-modal__title">{title}</h2>
                {description && <p className="ui-modal__desc">{description}</p>}
              </div>
              {headerActions}
              <IconButton label={closeLabel} icon={<X size={18} />} size="sm" onClick={onClose} />
            </div>
            <div className="ui-modal__body">{children}</div>
            {footer && <div className="ui-modal__foot">{footer}</div>}
          </m.div>
        </m.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
