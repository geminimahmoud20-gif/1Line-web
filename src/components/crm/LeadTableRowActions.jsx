import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Eye,
  MessageSquare,
  User,
  Edit3,
  Send,
  Building,
  UserPlus,
  Archive,
  Trash2,
  MoreHorizontal
} from 'lucide-react';

export default function LeadTableRowActions({
  lead,
  isAr = true,
  canEdit = true,
  isSuperAdmin = false,
  onQuickDrawer,
  onWhatsAppClick,
  onViewingProfileLead,
  onOpenEditLead,
  onDispatchLeadClick,
  onConvertToProperty,
  canClaimLead,
  handleClaimLead,
  onUpdateLead,
  triggerToast,
  handleDeleteLeadClick
}) {
  // The menu is drawn on <body>: inside the table the rows below and the scroll area painted over it
  const [menuPos, setMenuPos] = useState(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const open = Boolean(menuPos);
  const closeDetails = () => setMenuPos(null);

  const toggleMenu = () => {
    if (open) return setMenuPos(null);
    const r = triggerRef.current.getBoundingClientRect();
    setMenuPos({ top: r.bottom + 4, bottom: r.top - 4, left: r.left, right: r.right });
  };

  // Flip above the button when there is no room below; keep it inside the window sideways
  useLayoutEffect(() => {
    const el = menuRef.current;
    if (!el || !menuPos) return;
    const { offsetWidth: w, offsetHeight: h } = el;
    const rtl = getComputedStyle(triggerRef.current).direction === 'rtl';
    const top = menuPos.top + h > window.innerHeight - 8 ? Math.max(8, menuPos.bottom - h) : menuPos.top;
    const left = Math.min(Math.max(8, rtl ? menuPos.left : menuPos.right - w), window.innerWidth - w - 8);
    el.style.top = `${top}px`;
    el.style.left = `${left}px`;
    el.style.visibility = 'visible';
    el.querySelector('button')?.focus();
  }, [menuPos]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!menuRef.current?.contains(e.target) && !triggerRef.current?.contains(e.target)) setMenuPos(null);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') { setMenuPos(null); triggerRef.current?.focus(); }
    };
    const onMove = () => setMenuPos(null);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onMove, true);
    window.addEventListener('resize', onMove);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onMove, true);
      window.removeEventListener('resize', onMove);
    };
  }, [open]);

  return (
    <div className="crm-action-group" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      {/* Primary 1: Quick Drawer Fast Triage */}
      <button
        type="button"
        className="crm-btn-quick"
        onClick={() => onQuickDrawer?.(lead)}
        title={isAr ? 'افتح درج العميل وسجّل مكالمة' : 'Open the client drawer'}
      >
        <Eye size={16} aria-hidden="true" />
        <span>{isAr ? 'افتح' : 'Open'}</span>
      </button>

      {/* Primary 2: WhatsApp Direct Contact */}
      <button
        type="button"
        className="crm-icon-btn is-whatsapp"
        onClick={() => onWhatsAppClick?.(lead)}
        title={isAr ? 'محادثة العميل مباشرة عبر واتساب' : 'WhatsApp'}
        aria-label={isAr ? `واتساب ${lead.name || 'العميل'}` : `WhatsApp ${lead.name || 'client'}`}
      >
        <MessageSquare size={16} />
      </button>

      {/* Secondary Actions: Clean Context Menu */}
      <button
        ref={triggerRef}
        type="button"
        className="crm-icon-btn"
        onClick={toggleMenu}
        aria-haspopup="menu"
        aria-expanded={open}
        title={isAr ? 'المزيد من الإجراءات' : 'More actions'}
        aria-label={isAr ? 'إجراءات إضافية' : 'More actions'}
      >
        <MoreHorizontal size={14} />
      </button>
      {open && createPortal(
        <div ref={menuRef} className="kb-menu crm-row-menu" role="menu" dir={isAr ? 'rtl' : 'ltr'}>
          {/* 360 Comprehensive Profile */}
          <button
            type="button"
            onClick={() => {
              closeDetails();
              onViewingProfileLead?.(lead);
            }}
          >
            <User size={13} /> <span>{isAr ? 'ملف العميل' : 'Client profile'}</span>
          </button>

          {/* Edit Lead Modal */}
          {canEdit && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                closeDetails();
                onOpenEditLead?.(lead);
              }}
            >
              <Edit3 size={13} /> <span>{isAr ? 'تعديل البيانات' : 'Edit Lead'}</span>
            </button>
          )}

          {/* Dispatch Lead via WhatsApp */}
          <button
            type="button"
            onClick={() => {
              closeDetails();
              onDispatchLeadClick?.(lead);
            }}
          >
            <Send size={13} /> <span>{isAr ? 'إحالة لمسؤول مبيعات' : 'Dispatch'}</span>
          </button>

          {/* Convert to Property */}
          {onConvertToProperty && canEdit && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                closeDetails();
                onConvertToProperty(lead);
              }}
            >
              <Building size={13} /> <span>{isAr ? 'تحويل لعقار معروض' : 'Convert'}</span>
            </button>
          )}

          {/* Claim Lead */}
          {canClaimLead?.(lead) && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                closeDetails();
                handleClaimLead?.(lead.id);
              }}
            >
              <UserPlus size={13} /> <span>{isAr ? 'استلام العميل' : 'Claim'}</span>
            </button>
          )}

          {/* Archive / Unarchive */}
          {canEdit && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                closeDetails();
                const prevArchived = !!lead.isArchived;
                const newStatus = !prevArchived;
                if (onUpdateLead) onUpdateLead(lead.id, { isArchived: newStatus, lastActivityAt: new Date().toISOString() }, lead.version);
                triggerToast?.(
                  isAr
                    ? newStatus
                      ? 'تم نقل العميل للأرشيف 📦'
                      : 'تم استعادة العميل من الأرشيف'
                    : newStatus
                    ? 'Lead archived'
                    : 'Lead restored',
                  'info',
                  {
                    onUndo: () => {
                      if (onUpdateLead) onUpdateLead(lead.id, { isArchived: prevArchived, lastActivityAt: new Date().toISOString() });
                    },
                    undoLabel: isAr ? 'تراجع' : 'Undo',
                    duration: 6000
                  }
                );
              }}
            >
              <Archive size={13} />{' '}
              <span>{lead.isArchived ? (isAr ? 'استعادة من الأرشيف' : 'Unarchive') : (isAr ? 'أرشفة العميل' : 'Archive')}</span>
            </button>
          )}

          {/* Delete Lead (Super Admin Only) */}
          {isSuperAdmin && (
            <>
              <div className="crm-row-menu__sep" role="separator" />
              <button
                type="button"
                role="menuitem"
                className="is-danger"
                onClick={() => {
                  closeDetails();
                  handleDeleteLeadClick?.(lead.id, lead.name);
                }}
              >
                <Trash2 size={13} /> <span>{isAr ? 'حذف العميل نهائياً' : 'Delete'}</span>
              </button>
            </>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
