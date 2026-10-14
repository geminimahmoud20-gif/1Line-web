import {
  Zap,
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
  const closeDetails = (e) => {
    e.currentTarget.closest('details')?.removeAttribute('open');
  };

  return (
    <div className="crm-action-group" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      {/* Primary 1: Quick Drawer Fast Triage */}
      <button
        type="button"
        className="crm-btn-quick"
        onClick={() => onQuickDrawer?.(lead)}
        title={isAr ? 'معاينة سريعة وتسجيل مكالمة' : 'Quick Drawer'}
      >
        <Zap size={13} />
        <span>{isAr ? 'سريع' : 'Quick'}</span>
      </button>

      {/* Primary 2: WhatsApp Direct Contact */}
      <button
        type="button"
        className="crm-icon-btn is-whatsapp"
        onClick={() => onWhatsAppClick?.(lead)}
        title={isAr ? 'محادثة العميل مباشرة عبر واتساب' : 'WhatsApp'}
      >
        <MessageSquare size={13} />
      </button>

      {/* Secondary Actions: Clean Context Menu */}
      <details className="kb-more" style={{ position: 'relative' }}>
        <summary
          className="crm-icon-btn"
          style={{
            listStyle: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title={isAr ? 'المزيد من الإجراءات' : 'More actions'}
          aria-label={isAr ? 'إجراءات إضافية' : 'More actions'}
        >
          <MoreHorizontal size={14} />
        </summary>
        <div
          className="kb-menu"
          style={{
            position: 'absolute',
            top: '100%',
            insetInlineStart: 'auto',
            insetInlineEnd: 0,
            zIndex: 50,
            minWidth: '180px',
            background: 'var(--crm-card)',
            border: '1px solid var(--crm-line-strong)',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.25)',
            borderRadius: '8px',
            padding: '4px'
          }}
        >
          {/* 360 Comprehensive Profile */}
          <button
            type="button"
            onClick={(e) => {
              closeDetails(e);
              onViewingProfileLead?.(lead);
            }}
          >
            <User size={13} /> <span>{isAr ? 'الملف الشامل 360°' : 'Profile 360°'}</span>
          </button>

          {/* Edit Lead Modal */}
          {canEdit && (
            <button
              type="button"
              onClick={(e) => {
                closeDetails(e);
                onOpenEditLead?.(lead);
              }}
            >
              <Edit3 size={13} /> <span>{isAr ? 'تعديل البيانات' : 'Edit Lead'}</span>
            </button>
          )}

          {/* Dispatch Lead via WhatsApp */}
          <button
            type="button"
            onClick={(e) => {
              closeDetails(e);
              onDispatchLeadClick?.(lead);
            }}
          >
            <Send size={13} /> <span>{isAr ? 'إحالة لمسؤول مبيعات' : 'Dispatch'}</span>
          </button>

          {/* Convert to Property */}
          {onConvertToProperty && canEdit && (
            <button
              type="button"
              onClick={(e) => {
                closeDetails(e);
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
              onClick={(e) => {
                closeDetails(e);
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
              onClick={(e) => {
                closeDetails(e);
                const newStatus = !lead.isArchived;
                if (onUpdateLead) onUpdateLead(lead.id, { isArchived: newStatus });
                triggerToast?.(
                  isAr
                    ? newStatus
                      ? 'تم نقل العميل للأرشيف 📦'
                      : 'تم استعادة العميل من الأرشيف'
                    : newStatus
                    ? 'Lead archived'
                    : 'Lead restored',
                  'info'
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
              <div style={{ height: '1px', background: 'var(--crm-line)', margin: '4px 0' }} />
              <button
                type="button"
                className="is-danger"
                onClick={(e) => {
                  closeDetails(e);
                  handleDeleteLeadClick?.(lead.id, lead.name);
                }}
              >
                <Trash2 size={13} /> <span>{isAr ? 'حذف العميل نهائياً' : 'Delete'}</span>
              </button>
            </>
          )}
        </div>
      </details>
    </div>
  );
}
