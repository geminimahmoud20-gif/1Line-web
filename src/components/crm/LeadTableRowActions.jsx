import RowMenu from './RowMenu';
import {
  Eye,
  MessageSquare,
  User,
  Edit3,
  Send,
  Building,
  UserPlus,
  Archive,
  Trash2
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
      <RowMenu
        isAr={isAr}
        label={isAr ? 'إجراءات إضافية' : 'More actions'}
        items={[
          { id: 'profile', icon: <User size={13} />, label: isAr ? 'ملف العميل' : 'Client profile', onSelect: () => onViewingProfileLead?.(lead) },
          canEdit && { id: 'edit', icon: <Edit3 size={13} />, label: isAr ? 'تعديل البيانات' : 'Edit Lead', onSelect: () => onOpenEditLead?.(lead) },
          { id: 'dispatch', icon: <Send size={13} />, label: isAr ? 'إحالة لمسؤول مبيعات' : 'Dispatch', onSelect: () => onDispatchLeadClick?.(lead) },
          onConvertToProperty && canEdit && { id: 'convert', icon: <Building size={13} />, label: isAr ? 'تحويل لعقار معروض' : 'Convert', onSelect: () => onConvertToProperty(lead) },
          canClaimLead?.(lead) && { id: 'claim', icon: <UserPlus size={13} />, label: isAr ? 'استلام العميل' : 'Claim', onSelect: () => handleClaimLead?.(lead.id) },
          canEdit && {
            id: 'archive',
            icon: <Archive size={13} />,
            label: lead.isArchived ? (isAr ? 'استعادة من الأرشيف' : 'Unarchive') : (isAr ? 'أرشفة العميل' : 'Archive'),
            onSelect: () => {
              const prevArchived = !!lead.isArchived;
              const newStatus = !prevArchived;
              if (onUpdateLead) onUpdateLead(lead.id, { isArchived: newStatus, lastActivityAt: new Date().toISOString() }, lead.version);
              triggerToast?.(
                isAr ? (newStatus ? 'تم نقل العميل للأرشيف 📦' : 'تم استعادة العميل من الأرشيف') : (newStatus ? 'Lead archived' : 'Lead restored'),
                'info',
                {
                  onUndo: () => {
                    if (onUpdateLead) onUpdateLead(lead.id, { isArchived: prevArchived, lastActivityAt: new Date().toISOString() });
                  },
                  undoLabel: isAr ? 'تراجع' : 'Undo',
                  duration: 6000
                }
              );
            }
          },
          isSuperAdmin && { id: 'delete', separator: true, danger: true, icon: <Trash2 size={13} />, label: isAr ? 'حذف العميل نهائياً' : 'Delete', onSelect: () => handleDeleteLeadClick?.(lead.id, lead.name) }
        ]}
      />
    </div>
  );
}
