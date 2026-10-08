import { useState } from 'react';
import { ShieldCheck, Plus, Pencil, Trash2, X, Lock, Check } from 'lucide-react';
import { PERMISSIONS, PERM_GROUPS, SUPER_ADMIN, makeId } from '../../utils/accessModel';
import { saveRoleApi, deleteRoleApi } from '../../services/accessConfig';

function RoleModal({ role, isAr, onClose, onSave, busy }) {
  const isEditing = Boolean(role?.id);
  const isLocked = role?.id === SUPER_ADMIN;

  const [form, setForm] = useState(() => ({
    name_ar: role?.name_ar || '',
    name_en: role?.name_en || '',
    icon: role?.icon || '🎯',
    perms: isLocked ? PERMISSIONS.map((p) => p.id) : (role?.perms || ['ld.edit', 'ld.phone'])
  }));

  const togglePerm = (id) => {
    if (isLocked) return;
    setForm((prev) => {
      const set = new Set(prev.perms);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      return { ...prev, perms: Array.from(set) };
    });
  };

  const selectAllInGroup = (groupId) => {
    if (isLocked) return;
    const groupPerms = PERMISSIONS.filter((p) => p.group === groupId).map((p) => p.id);
    setForm((prev) => {
      const set = new Set(prev.perms);
      const allSelected = groupPerms.every((id) => set.has(id));
      if (allSelected) groupPerms.forEach((id) => set.delete(id));
      else groupPerms.forEach((id) => set.add(id));
      return { ...prev, perms: Array.from(set) };
    });
  };

  const submit = (e) => {
    e.preventDefault();
    if (!form.name_ar.trim() || busy) return;
    const id = isEditing ? role.id : makeId(form.name_en || form.name_ar, [], 'role');
    onSave({
      id,
      name_ar: form.name_ar.trim(),
      name_en: form.name_en.trim() || form.name_ar.trim(),
      icon: form.icon.trim() || '👤',
      perms: form.perms
    });
  };

  return (
    <div className="tm-overlay" role="dialog" aria-modal="true" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <form className="tm-modal tm-modal--wide" onSubmit={submit} style={{ maxWidth: 580 }}>
        <div className="tm-modal-head">
          <h3>
            {isEditing
              ? (isAr ? `تعديل دور: ${role.name_ar}` : `Edit role: ${role.name_en}`)
              : (isAr ? 'إنشاء دور وصلاحيات جديدة' : 'Create new role')}
          </h3>
          <button type="button" className="tm-icon-btn" onClick={onClose} disabled={busy} aria-label={isAr ? 'إغلاق' : 'Close'}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr', gap: 10 }}>
          <label className="tm-field">
            <span>{isAr ? 'الأيقونة' : 'Icon'}</span>
            <input
              type="text"
              value={form.icon}
              onChange={(e) => setForm({ ...form, icon: e.target.value })}
              maxLength={4}
              style={{ textAlign: 'center', fontSize: 'var(--crm-text-lg)' }}
            />
          </label>
          <label className="tm-field">
            <span>{isAr ? 'اسم الدور (بالعربي)' : 'Role name (Arabic)'}</span>
            <input
              type="text"
              required
              value={form.name_ar}
              onChange={(e) => setForm({ ...form, name_ar: e.target.value })}
              placeholder={isAr ? 'مثال: مستشار عقارات VIP' : 'e.g. VIP Advisor'}
            />
          </label>
          <label className="tm-field">
            <span>{isAr ? 'الاسم بالإنجليزية' : 'Role name (English)'}</span>
            <input
              type="text"
              dir="ltr"
              value={form.name_en}
              onChange={(e) => setForm({ ...form, name_en: e.target.value })}
              placeholder="e.g. Senior Broker"
            />
          </label>
        </div>

        {isLocked && (
          <p className="tm-note" style={{ background: 'var(--crm-accent-soft)', color: 'var(--crm-accent-text)' }}>
            <Lock size={14} style={{ display: 'inline', verticalAlign: 'middle', marginInlineEnd: 4 }} />
            {isAr
              ? 'دور المدير العام يمتلك كافة صلاحيات المنظومة تلقائياً ولا يمكن تقليص صلاحياته.'
              : 'Super Admin holds full permissions across the system.'}
          </p>
        )}

        <div className="tm-perms-container">
          <label className="tm-field" style={{ marginBottom: 6 }}>
            <span>{isAr ? 'مصفوفة الصلاحيات الممنوحة لهذا الدور:' : 'Permissions matrix:'}</span>
          </label>
          {PERM_GROUPS.map((group) => {
            const groupPerms = PERMISSIONS.filter((p) => p.group === group.id);
            const allSelected = groupPerms.every((p) => form.perms.includes(p.id));
            return (
              <div key={group.id} className="tm-perm-group">
                <div className="tm-perm-group-head">
                  <strong>{isAr ? group.ar : group.en}</strong>
                  {!isLocked && (
                    <button type="button" className="tm-link-btn" onClick={() => selectAllInGroup(group.id)}>
                      {allSelected ? (isAr ? 'إلغاء تحديد الكل' : 'Deselect all') : (isAr ? 'تحديد الكل' : 'Select all')}
                    </button>
                  )}
                </div>
                <div className="tm-perm-items">
                  {groupPerms.map((perm) => {
                    const checked = form.perms.includes(perm.id);
                    return (
                      <label key={perm.id} className={`tm-perm-checkbox ${checked ? 'is-checked' : ''} ${isLocked ? 'is-disabled' : ''}`}>
                        <input
                          type="checkbox"
                          disabled={isLocked}
                          checked={checked}
                          onChange={() => togglePerm(perm.id)}
                        />
                        <span>{isAr ? perm.ar : perm.en}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="tm-modal-actions">
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={busy}>
            {isAr ? 'إلغاء' : 'Cancel'}
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy || !form.name_ar.trim()}>
            <Check size={16} /> {busy ? (isAr ? 'جاري الحفظ…' : 'Saving…') : (isAr ? 'حفظ الدور' : 'Save role')}
          </button>
        </div>
      </form>
    </div>
  );
}

function DeleteRoleModal({ role, otherRoles, isAr, onClose, onConfirm, busy }) {
  const [fallbackId, setFallbackId] = useState(() => otherRoles[0]?.id || '');

  return (
    <div className="tm-overlay" role="dialog" aria-modal="true" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div className="tm-modal" style={{ maxWidth: 440 }}>
        <div className="tm-modal-head">
          <h3 style={{ color: 'var(--crm-danger)' }}>{isAr ? `حذف دور: ${role.name_ar}` : `Delete role: ${role.name_en}`}</h3>
          <button type="button" className="tm-icon-btn" onClick={onClose} disabled={busy}><X size={18} /></button>
        </div>
        <p className="tm-note" style={{ color: 'var(--crm-danger)', background: 'var(--crm-danger-soft)' }}>
          {isAr
            ? 'لا يمكن حذف الدور وتركه فارغاً. اختر دوراً بديلاً ليتم نقل الموظفين المسند إليهم هذا الدور تلقائياً وتحديث صلاحياتهم فوراً:'
            : 'Select a fallback role to reassign existing members on this role:'}
        </p>
        <label className="tm-field">
          <span>{isAr ? 'الدور البديل للموظفين الحاليين' : 'Fallback role'}</span>
          <select value={fallbackId} onChange={(e) => setFallbackId(e.target.value)} disabled={busy}>
            {otherRoles.map((r) => (
              <option key={r.id} value={r.id}>{r.icon} {isAr ? r.name_ar : r.name_en}</option>
            ))}
          </select>
        </label>
        <div className="tm-modal-actions">
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={busy}>{isAr ? 'إلغاء' : 'Cancel'}</button>
          <button
            type="button"
            className="btn btn-primary"
            style={{ background: 'var(--crm-danger)', borderColor: 'var(--crm-danger)' }}
            disabled={busy || !fallbackId}
            onClick={() => onConfirm(role.id, fallbackId)}
          >
            <Trash2 size={16} /> {busy ? (isAr ? 'جاري الحذف…' : 'Deleting…') : (isAr ? 'تأكيد الحذف والنقل' : 'Confirm delete')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RolesTab({ accessConfig, members = [], isAr = true, triggerToast }) {
  const [editingRole, setEditingRole] = useState(null);
  const [deletingRole, setDeletingRole] = useState(null);
  const [busy, setBusy] = useState(false);

  const roles = accessConfig?.roles || [];

  const handleSave = async (role) => {
    setBusy(true);
    const res = await saveRoleApi(role);
    setBusy(false);
    if (res.ok) {
      triggerToast(isAr ? 'تم حفظ الدور وتحديث الصلاحيات بنجاح' : 'Role saved successfully', 'success');
      setEditingRole(null);
    } else {
      triggerToast(isAr ? 'فشل حفظ الدور، تحقق من الصلاحيات' : 'Failed to save role', 'error');
    }
  };

  const handleDelete = async (roleId, fallbackRoleId) => {
    setBusy(true);
    const res = await deleteRoleApi(roleId, fallbackRoleId);
    setBusy(false);
    if (res.ok) {
      triggerToast(isAr ? 'تم حذف الدور ونقل الموظفين للدور البديل' : 'Role deleted successfully', 'success');
      setDeletingRole(null);
    } else {
      triggerToast(isAr ? 'فشل حذف الدور' : 'Failed to delete role', 'error');
    }
  };

  return (
    <div className="tm-roles-wrap">
      <div className="tm-card tm-head" style={{ marginBottom: 12 }}>
        <div>
          <h4 style={{ margin: 0, fontSize: 'var(--crm-text-base)', color: 'var(--crm-ink)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <ShieldCheck size={18} style={{ color: 'var(--crm-accent)' }} />
            {isAr ? 'إدارة الأدوار ومصفوفة الصلاحيات' : 'Roles & Permissions Matrix'}
          </h4>
          <p>{isAr ? 'أنشئ أدواراً مخصصة وحدد بدقة ما يمكن لكل دور الوصول إليه أو تعديله في النظام.' : 'Define custom roles and their granular access permissions.'}</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setEditingRole({})}>
          <Plus size={16} /> {isAr ? 'إضافة دور جديد' : 'New role'}
        </button>
      </div>

      <div className="tm-grid-cards">
        {roles.map((r) => {
          const isLocked = r.id === SUPER_ADMIN;
          const assignedCount = members.filter((m) => m.role === r.id).length;

          return (
            <div key={r.id} className="tm-role-card">
              <div className="tm-role-card-head">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="tm-role-icon">{r.icon || '👤'}</span>
                  <div>
                    <strong style={{ fontSize: 'var(--crm-text-base)', display: 'block' }}>
                      {isAr ? r.name_ar : r.name_en}
                    </strong>
                    <small style={{ color: 'var(--crm-muted)' }}>{r.name_en}</small>
                  </div>
                </div>
                {isLocked ? (
                  <span className="tm-badge tm-badge--gold"><Lock size={12} /> {isAr ? 'أساسي' : 'Locked'}</span>
                ) : (
                  <div className="tm-actions">
                    <button
                      type="button"
                      className="tm-icon-btn"
                      onClick={() => setEditingRole(r)}
                      title={isAr ? 'تعديل الدور' : 'Edit role'}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      className="tm-icon-btn tm-danger"
                      onClick={() => setDeletingRole(r)}
                      title={isAr ? 'حذف الدور' : 'Delete role'}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                )}
              </div>

              <div className="tm-role-meta">
                <span>{isAr ? `الموظفون المسندون:` : 'Assigned members:'} <strong>{assignedCount}</strong></span>
                <span>{isAr ? `الصلاحيات:` : 'Permissions:'} <strong>{isLocked ? (isAr ? 'كل الصلاحيات' : 'Full') : `${r.perms?.length || 0} من ${PERMISSIONS.length}`}</strong></span>
              </div>

              <div className="tm-role-perms-preview">
                {isLocked ? (
                  <span className="tm-perm-tag is-full">{isAr ? '👑 وصول شامل لكافة أقسام المنظومة' : '👑 Full access to all modules'}</span>
                ) : (
                  (r.perms || []).map((pId) => {
                    const p = PERMISSIONS.find((x) => x.id === pId);
                    if (!p) return null;
                    return <span key={pId} className="tm-perm-tag">{isAr ? p.ar : p.en}</span>;
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {editingRole && (
        <RoleModal
          role={editingRole}
          isAr={isAr}
          busy={busy}
          onClose={() => setEditingRole(null)}
          onSave={handleSave}
        />
      )}

      {deletingRole && (
        <DeleteRoleModal
          role={deletingRole}
          otherRoles={roles.filter((x) => x.id !== deletingRole.id)}
          isAr={isAr}
          busy={busy}
          onClose={() => setDeletingRole(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
