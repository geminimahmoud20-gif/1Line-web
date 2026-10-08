import { useState } from 'react';
import { Users, Plus, Pencil, Trash2, X, Check, MapPin, Sparkles, Building, RefreshCw, AlertTriangle } from 'lucide-react';
import { UNASSIGNED_DESK, makeId } from '../../utils/accessModel';
import { saveTeamApi, deleteTeamApi } from '../../services/accessConfig';

function TeamModal({ team, isAr, onClose, onSave, busy }) {
  const isEditing = Boolean(team?.id);

  const [form, setForm] = useState(() => ({
    name_ar: team?.name_ar || '',
    name_en: team?.name_en || '',
    keywordsText: (team?.keywords || []).join(', '),
    routeVip: team?.routeVip === true,
    routeCommercial: team?.routeCommercial === true,
    roundRobin: team?.roundRobin !== false,
    active: team?.active !== false
  }));

  const submit = (e) => {
    e.preventDefault();
    if (!form.name_ar.trim() || busy) return;
    const id = isEditing ? team.id : makeId(form.name_en || form.name_ar, [], 'team');
    const keywords = form.keywordsText
      .split(/[,،]+/)
      .map((k) => k.trim())
      .filter(Boolean);

    onSave({
      id,
      name_ar: form.name_ar.trim(),
      name_en: form.name_en.trim() || form.name_ar.trim(),
      keywords,
      routeVip: form.routeVip,
      routeCommercial: form.routeCommercial,
      roundRobin: form.roundRobin,
      active: form.active
    });
  };

  return (
    <div className="tm-overlay" role="dialog" aria-modal="true" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <form className="tm-modal tm-modal--wide" onSubmit={submit} style={{ maxWidth: 540 }}>
        <div className="tm-modal-head">
          <h3>
            {isEditing
              ? (isAr ? `تعديل فريق: ${team.name_ar}` : `Edit team: ${team.name_en}`)
              : (isAr ? 'إضافة فريق مبيعات جديد' : 'New Sales Team')}
          </h3>
          <button type="button" className="tm-icon-btn" onClick={onClose} disabled={busy} aria-label={isAr ? 'إغلاق' : 'Close'}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <label className="tm-field">
            <span>{isAr ? 'اسم الفريق (بالعربي)' : 'Team name (Arabic)'}</span>
            <input
              type="text"
              required
              value={form.name_ar}
              onChange={(e) => setForm({ ...form, name_ar: e.target.value })}
              placeholder={isAr ? 'مثال: فريق شمال سوهاج' : 'e.g. North Team'}
            />
          </label>
          <label className="tm-field">
            <span>{isAr ? 'الاسم بالإنجليزية' : 'Team name (English)'}</span>
            <input
              type="text"
              dir="ltr"
              value={form.name_en}
              onChange={(e) => setForm({ ...form, name_en: e.target.value })}
              placeholder="e.g. North Sales Team"
            />
          </label>
        </div>

        <label className="tm-field">
          <span>{isAr ? 'الكلمات المفتاحية للتوزيع الجغرافي التلقائي (مفصولة بفاصلة)' : 'Geographic routing keywords (comma-separated)'}</span>
          <input
            type="text"
            value={form.keywordsText}
            onChange={(e) => setForm({ ...form, keywordsText: e.target.value })}
            placeholder={isAr ? 'مثال: شمال, طهطا, المراغة, الكوم' : 'e.g. north, tahta, maragha'}
          />
          <small>{isAr ? 'العميل الذي يطلب عقاراً يحتوي أحد هذه الكلمات يسند تلقائياً لهذا الفريق.' : 'Leads matching these terms auto-route to this team.'}</small>
        </label>

        <div className="tm-team-options">
          <label className="tm-perm-checkbox">
            <input
              type="checkbox"
              checked={form.roundRobin}
              onChange={(e) => setForm({ ...form, roundRobin: e.target.checked })}
            />
            <div>
              <strong>{isAr ? 'مشاركة في التوزيع الدوري الذكي (Round-Robin)' : 'Include in Round-Robin'}</strong>
              <small style={{ display: 'block', color: 'var(--crm-muted)' }}>{isAr ? 'يستلم حصة من العملاء العامين لموازنة أعباء العمل' : 'Receives unassigned general leads evenly'}</small>
            </div>
          </label>

          <label className="tm-perm-checkbox">
            <input
              type="checkbox"
              checked={form.routeVip}
              onChange={(e) => setForm({ ...form, routeVip: e.target.checked })}
            />
            <div>
              <strong>{isAr ? 'مكتب استثماري VIP (الميزانيات الكبرى +5M)' : 'VIP Investor Desk'}</strong>
              <small style={{ display: 'block', color: 'var(--crm-muted)' }}>{isAr ? 'توجيه طلبات كبار المستثمرين والمحافظ لهذا الفريق' : 'Routes high-budget investors to this desk'}</small>
            </div>
          </label>

          <label className="tm-perm-checkbox">
            <input
              type="checkbox"
              checked={form.routeCommercial}
              onChange={(e) => setForm({ ...form, routeCommercial: e.target.checked })}
            />
            <div>
              <strong>{isAr ? 'قطاع تجاري وإداري / مشروعات كبرى' : 'Commercial & Development Desk'}</strong>
              <small style={{ display: 'block', color: 'var(--crm-muted)' }}>{isAr ? 'توجيه المحلات والمكاتب والعيادات والمشروعات' : 'Routes commercial/mega-project leads here'}</small>
            </div>
          </label>

          <label className="tm-perm-checkbox">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />
            <div>
              <strong>{isAr ? 'الفريق نشط حالياً' : 'Team is active'}</strong>
              <small style={{ display: 'block', color: 'var(--crm-muted)' }}>{isAr ? 'عند التعطيل يتوقف استلام أي عملاء جدد تلقائياً' : 'When disabled, stops receiving leads'}</small>
            </div>
          </label>
        </div>

        <div className="tm-modal-actions">
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={busy}>{isAr ? 'إلغاء' : 'Cancel'}</button>
          <button type="submit" className="btn btn-primary" disabled={busy || !form.name_ar.trim()}>
            <Check size={16} /> {busy ? (isAr ? 'جاري الحفظ…' : 'Saving…') : (isAr ? 'حفظ الفريق' : 'Save team')}
          </button>
        </div>
      </form>
    </div>
  );
}

function DeleteTeamModal({ team, otherTeams, isAr, onClose, onConfirm, busy }) {
  const [fallbackId, setFallbackId] = useState(UNASSIGNED_DESK);

  return (
    <div className="tm-overlay" role="dialog" aria-modal="true" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div className="tm-modal" style={{ maxWidth: 460 }}>
        <div className="tm-modal-head">
          <h3 style={{ color: 'var(--crm-danger)' }}>{isAr ? `حذف فريق: ${team.name_ar}` : `Delete team: ${team.name_en}`}</h3>
          <button type="button" className="tm-icon-btn" onClick={onClose} disabled={busy}><X size={18} /></button>
        </div>
        <div style={{ background: 'var(--crm-danger-soft)', border: '1px solid var(--crm-danger-line)', borderRadius: 10, padding: 12 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', color: 'var(--crm-danger)' }}>
            <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: 'var(--crm-text-xs)', lineHeight: 1.6 }}>
              <strong>{isAr ? 'نقل العملاء والموظفين تلقائياً:' : 'Auto transfer leads & staff:'}</strong>
              <p style={{ margin: '4px 0 0' }}>
                {isAr
                  ? 'سيتم حذف الفريق ونقل كافة العملاء المسندين إليه في قاعدة البيانات، وكذلك أعضاء الفريق، إلى الوجهة البديلة التي تختارها أدناه.'
                  : 'Leads and staff currently belonging to this team will be transferred to the chosen destination.'}
              </p>
            </div>
          </div>
        </div>

        <label className="tm-field">
          <span>{isAr ? 'الوجهة البديلة للعملاء والموظفين:' : 'Transfer leads & staff to:'}</span>
          <select value={fallbackId} onChange={(e) => setFallbackId(e.target.value)} disabled={busy}>
            <option value={UNASSIGNED_DESK}>{isAr ? '⚪ غير مسند (القائمة العامة)' : '⚪ Unassigned Pool'}</option>
            {otherTeams.map((t) => (
              <option key={t.id} value={t.id}>👥 {isAr ? t.name_ar : t.name_en}</option>
            ))}
          </select>
        </label>

        <div className="tm-modal-actions">
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={busy}>{isAr ? 'إلغاء' : 'Cancel'}</button>
          <button
            type="button"
            className="btn btn-primary"
            style={{ background: 'var(--crm-danger)', borderColor: 'var(--crm-danger)' }}
            disabled={busy}
            onClick={() => onConfirm(team.id, fallbackId)}
          >
            <Trash2 size={16} /> {busy ? (isAr ? 'جاري النقل والحذف…' : 'Transferring…') : (isAr ? 'تأكيد الحذف والنقل' : 'Confirm delete')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TeamsTab({ accessConfig, members = [], leads = [], isAr = true, triggerToast }) {
  const [editingTeam, setEditingTeam] = useState(null);
  const [deletingTeam, setDeletingTeam] = useState(null);
  const [busy, setBusy] = useState(false);

  const teams = accessConfig?.teams || [];

  const handleSave = async (team) => {
    setBusy(true);
    const res = await saveTeamApi(team);
    setBusy(false);
    if (res.ok) {
      triggerToast(isAr ? 'تم حفظ بيانات الفريق وإعدادات التوزيع بنجاح' : 'Team saved successfully', 'success');
      setEditingTeam(null);
    } else {
      triggerToast(isAr ? 'فشل حفظ الفريق' : 'Failed to save team', 'error');
    }
  };

  const handleDelete = async (teamId, fallbackTeamId) => {
    setBusy(true);
    const res = await deleteTeamApi(teamId, fallbackTeamId);
    setBusy(false);
    if (res.ok) {
      triggerToast(isAr ? `تم حذف الفريق ونقل ${res.migratedLeads || 0} عميل بنجاح` : 'Team deleted and leads transferred', 'success');
      setDeletingTeam(null);
    } else {
      triggerToast(isAr ? 'فشل حذف الفريق' : 'Failed to delete team', 'error');
    }
  };

  return (
    <div className="tm-teams-wrap">
      <div className="tm-card tm-head" style={{ marginBottom: 12 }}>
        <div>
          <h4 style={{ margin: 0, fontSize: 'var(--crm-text-base)', color: 'var(--crm-ink)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Users size={18} style={{ color: 'var(--crm-accent)' }} />
            {isAr ? 'فرق المبيعات والتوزيع الجغرافي الذكي' : 'Sales Desks & Smart Lead Routing'}
          </h4>
          <p>{isAr ? 'أضف أو احذف فرق العمل وحدد الكلمات الجغرافية لتوزيع العملاء آلياً على الفريق المختص.' : 'Manage sales teams and geographic keywords for automated lead distribution.'}</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setEditingTeam({})}>
          <Plus size={16} /> {isAr ? 'إضافة فريق جديد' : 'New team'}
        </button>
      </div>

      <div className="tm-grid-cards">
        {teams.map((t) => {
          const assignedMembers = members.filter((m) => m.desk === t.id).length;
          const assignedLeads = leads.filter((l) => l.assignedTo === t.id && l.status !== 'closed' && l.status !== 'cancelled').length;

          return (
            <div key={t.id} className={`tm-team-card ${!t.active ? 'is-inactive' : ''}`}>
              <div className="tm-team-card-head">
                <div>
                  <strong style={{ fontSize: 'var(--crm-text-base)', display: 'block' }}>
                    {isAr ? t.name_ar : t.name_en}
                  </strong>
                  <small style={{ color: 'var(--crm-muted)' }}>ID: {t.id}</small>
                </div>
                <div className="tm-actions">
                  <button
                    type="button"
                    className="tm-icon-btn"
                    onClick={() => setEditingTeam(t)}
                    title={isAr ? 'تعديل الفريق' : 'Edit team'}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    type="button"
                    className="tm-icon-btn tm-danger"
                    onClick={() => setDeletingTeam(t)}
                    title={isAr ? 'حذف الفريق' : 'Delete team'}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              <div className="tm-team-badges">
                <span className={`tm-badge ${t.active ? 'tm-badge--green' : 'tm-badge--muted'}`}>
                  {t.active ? (isAr ? '🟢 نشط' : 'Active') : (isAr ? '⚪ معطل' : 'Disabled')}
                </span>
                {t.roundRobin && (
                  <span className="tm-badge tm-badge--blue" title={isAr ? 'يشارك في التوزيع الدوري' : 'Round-Robin'}>
                    <RefreshCw size={11} /> {isAr ? 'دوري' : 'Round-Robin'}
                  </span>
                )}
                {t.routeVip && (
                  <span className="tm-badge tm-badge--gold">
                    <Sparkles size={11} /> VIP
                  </span>
                )}
                {t.routeCommercial && (
                  <span className="tm-badge tm-badge--purple">
                    <Building size={11} /> {isAr ? 'تجاري' : 'Commercial'}
                  </span>
                )}
              </div>

              <div className="tm-team-stats">
                <div>
                  <span>{isAr ? 'الموظفون:' : 'Members:'}</span>
                  <strong>{assignedMembers}</strong>
                </div>
                <div>
                  <span>{isAr ? 'العملاء النشطون:' : 'Active leads:'}</span>
                  <strong>{assignedLeads}</strong>
                </div>
              </div>

              <div className="tm-team-keywords">
                <span style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <MapPin size={12} /> {isAr ? 'نطاق التوزيع:' : 'Keywords:'}
                </span>
                <div className="tm-keyword-tags">
                  {t.keywords && t.keywords.length > 0 ? (
                    t.keywords.map((kw, i) => <span key={i} className="tm-keyword-tag">{kw}</span>)
                  ) : (
                    <span style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-faint)' }}>{isAr ? 'بدون كلمات مخصصة' : 'None'}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {editingTeam && (
        <TeamModal
          team={editingTeam}
          isAr={isAr}
          busy={busy}
          onClose={() => setEditingTeam(null)}
          onSave={handleSave}
        />
      )}

      {deletingTeam && (
        <DeleteTeamModal
          team={deletingTeam}
          otherTeams={teams.filter((x) => x.id !== deletingTeam.id)}
          isAr={isAr}
          busy={busy}
          onClose={() => setDeletingTeam(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
