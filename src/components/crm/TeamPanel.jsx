import { useCallback, useEffect, useState } from 'react';
import { UserPlus, KeyRound, UserX, UserCheck, Trash2, RefreshCw, X, Users, ShieldCheck, Building } from 'lucide-react';
import { auth } from '../../firebase';
import { listTeamMembers, teamAction, requestPasswordReset, logAuditEvent } from '../../firebaseService';
import { DEFAULT_ACCESS } from '../../utils/accessModel';
import { subscribeToAccessConfig, getActiveAccessConfig } from '../../services/accessConfig';
import RolesTab from './RolesTab';
import TeamsTab from './TeamsTab';
import './team-panel.css';

const ERRORS = {
  self: ['مينفعش تغيّر صلاحياتك أو توقف حسابك بنفسك. خلي مدير عام تاني يعملها.', "You can't change your own access."],
  'last-admin': ['ده آخر مدير عام نشط. ضيف مدير عام تاني الأول.', 'This is the last active super admin.'],
  'email-exists': ['الإيميل ده عليه حساب بالفعل.', 'That email already has an account.'],
  'invalid-email': ['الإيميل مش صحيح.', 'Invalid email.'],
  'bad-request': ['البيانات ناقصة أو مش صحيحة.', 'Missing or invalid details.'],
  forbidden: ['الشاشة دي للمدير العام بس.', 'Super admin only.'],
  unauthenticated: ['سجّل دخول تاني.', 'Please sign in again.'],
  'not-found': ['الحساب ده مش موجود.', 'Account not found.'],
  network: ['مفيش اتصال، جرّب تاني.', 'Network error, try again.']
};
const errorText = (code, isAr) => (ERRORS[code] || ['حصل خطأ، جرّب تاني.', 'Something went wrong.'])[isAr ? 0 : 1];

const fmtDate = (iso, isAr) => (iso ? new Date(iso).toLocaleDateString(isAr ? 'ar-EG-u-nu-latn' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

function NotConfigured({ isAr, noApi }) {
  return (
    <div className="tm-card tm-setup">
      <h3>{isAr ? 'الشاشة محتاجة خطوة تفعيل مرة واحدة' : 'One-time setup needed'}</h3>
      {noApi ? (
        <p>{isAr ? 'الشاشة دي بتشتغل على الموقع المنشور على Vercel بس (مش النسخة المحلية).' : 'This screen works on the deployed Vercel site only.'}</p>
      ) : (
        <ol>
          <li>{isAr ? 'من Firebase Console ← Project settings ← Service accounts ← Generate new private key.' : 'Firebase Console → Project settings → Service accounts → Generate new private key.'}</li>
          <li>{isAr ? 'في Vercel ← Settings ← Environment Variables ضيف متغير اسمه FIREBASE_SERVICE_ACCOUNT وقيمته محتوى ملف الـ JSON كله.' : 'Vercel → Settings → Environment Variables: add FIREBASE_SERVICE_ACCOUNT with the whole JSON file as its value.'}</li>
          <li>{isAr ? 'Save وبعدها Redeploy.' : 'Save, then Redeploy.'}</li>
        </ol>
      )}
      <p className="tm-warn">{isAr ? 'المفتاح ده سرّي: متبعتهوش في شات أو إيميل لأي حد، حطه في Vercel بس.' : 'This key is secret: only paste it into Vercel, never into chat or email.'}</p>
    </div>
  );
}

function AddMemberModal({ isAr, roles = [], teams = [], busy, onClose, onSubmit }) {
  const [form, setForm] = useState({ email: '', name: '', role: roles[0]?.id || 'sales_agent', desk: teams[0]?.id || '' });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());

  return (
    <div className="tm-overlay" role="dialog" aria-modal="true" aria-labelledby="tm-add-title" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <form className="tm-modal" onSubmit={(e) => { e.preventDefault(); if (valid && !busy) onSubmit(form); }}>
        <div className="tm-modal-head">
          <h3 id="tm-add-title">{isAr ? 'إضافة عضو للفريق' : 'Add a team member'}</h3>
          <button type="button" className="tm-icon-btn" onClick={onClose} aria-label={isAr ? 'إغلاق' : 'Close'} disabled={busy}><X size={18} /></button>
        </div>
        <label className="tm-field">
          <span>{isAr ? 'الإيميل' : 'Email'}</span>
          <input type="email" dir="ltr" required autoFocus value={form.email} onChange={set('email')} placeholder="name@example.com" />
        </label>
        <label className="tm-field">
          <span>{isAr ? 'الاسم' : 'Name'}</span>
          <input type="text" value={form.name} onChange={set('name')} maxLength={80} />
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <label className="tm-field">
            <span>{isAr ? 'الدور والصلاحيات' : 'Role'}</span>
            <select value={form.role} onChange={set('role')}>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.icon} {isAr ? r.name_ar : r.name_en}</option>)}
            </select>
          </label>
          <label className="tm-field">
            <span>{isAr ? 'فريق المبيعات (النطاق)' : 'Sales Team / Desk'}</span>
            <select value={form.desk} onChange={set('desk')}>
              <option value="">{isAr ? 'بدون فريق (عام)' : 'General / No desk'}</option>
              {teams.filter((t) => t.active).map((t) => (
                <option key={t.id} value={t.id}>{isAr ? t.name_ar : t.name_en}</option>
              ))}
            </select>
          </label>
        </div>
        <p className="tm-note">
          {isAr
            ? 'هيوصله إيميل فيه لينك يختار منه الباسورد بتاعه، وبعدها يدخل لوحة التحكم بالإيميل والباسورد ده.'
            : 'They get an email to set their password, then sign in with it.'}
        </p>
        <div className="tm-modal-actions">
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={busy}>{isAr ? 'إلغاء' : 'Cancel'}</button>
          <button type="submit" className="btn btn-primary" disabled={!valid || busy}>
            <UserPlus size={16} /> {busy ? (isAr ? 'جاري الإضافة…' : 'Adding…') : (isAr ? 'إضافة وإرسال الإيميل' : 'Add & send email')}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function TeamPanel({ lang = 'ar', leads = [], triggerToast }) {
  const isAr = lang === 'ar';
  const [subTab, setSubTab] = useState('members'); // 'members' | 'roles' | 'teams'
  const [members, setMembers] = useState(undefined); // undefined = loading
  const [loadError, setLoadError] = useState(null);
  const [busyUid, setBusyUid] = useState(null);
  const [adding, setAdding] = useState(false);
  const [addBusy, setAddBusy] = useState(false);
  const me = auth?.currentUser?.uid;

  const [accessConfig, setAccessConfig] = useState(() => getActiveAccessConfig() || DEFAULT_ACCESS);
  useEffect(() => subscribeToAccessConfig(setAccessConfig), []);

  const [reloadKey, setReloadKey] = useState(0);
  const load = useCallback(() => setReloadKey((k) => k + 1), []);
  const [syncing, setSyncing] = useState(false);

  const resync = async () => {
    setSyncing(true);
    const res = await teamAction({ action: 'resync' });
    setSyncing(false);
    if (res.ok) {
      setMembers(res.members);
      if (res.access) setAccessConfig(res.access);
      setLoadError(null);
    } else {
      triggerToast?.(errorText(res.error, isAr), 'error');
    }
  };

  useEffect(() => {
    let alive = true;
    listTeamMembers().then((res) => {
      if (!alive) return;
      setMembers(res.ok ? res.members : null);
      if (res.ok && res.access) setAccessConfig(res.access);
      setLoadError(res.ok ? null : res.error);
    });
    return () => { alive = false; };
  }, [reloadKey]);

  const toast = (msg, type = 'success') => triggerToast?.(msg, type);
  const audit = (actionType, targetId, details) => logAuditEvent({ actionType, targetCollection: 'team', targetId, details }).catch(() => {});

  const sendPasswordLink = async (m) => {
    try {
      await requestPasswordReset(m.email, lang);
      toast(isAr ? `اتبعت لينك الباسورد على ${m.email}` : `Password link sent to ${m.email}`);
      audit('TEAM_PASSWORD_LINK_SENT', m.uid, { email: m.email });
    } catch {
      toast(isAr ? 'ماقدرناش نبعت الإيميل، جرّب تاني' : 'Could not send the email', 'error');
    }
  };

  const act = async (m, action, extra = {}) => {
    if (action === 'remove' && !window.confirm(isAr ? `شيل ${m.name || m.email} من الفريق؟ مش هيقدر يدخل لوحة التحكم تاني.` : `Remove ${m.email} from the team?`)) return;
    if (action === 'disable' && !window.confirm(isAr ? `إيقاف حساب ${m.name || m.email}؟ هيخرج من لوحة التحكم فورًا.` : `Disable ${m.email}?`)) return;
    setBusyUid(m.uid);
    const res = await teamAction({ action, uid: m.uid, ...extra });
    setBusyUid(null);
    if (!res.ok) { toast(errorText(res.error, isAr), 'error'); return; }
    const done = {
      role: isAr ? 'تم تحديث الدور وفريق العمل' : 'Role and desk updated',
      disable: isAr ? 'الحساب اتوقف' : 'Account disabled',
      enable: isAr ? 'الحساب اتفعّل' : 'Account enabled',
      remove: isAr ? 'اتشال من الفريق' : 'Removed from the team'
    }[action];
    toast(done);
    audit(`TEAM_${action.toUpperCase()}`, m.uid, { email: m.email, from: m.role, ...extra });
    load();
  };

  const add = async (form) => {
    setAddBusy(true);
    const res = await teamAction({
      action: 'add',
      email: form.email.trim(),
      name: form.name.trim(),
      role: form.role,
      desk: form.desk || ''
    });
    if (!res.ok) { setAddBusy(false); toast(errorText(res.error, isAr), 'error'); return; }
    audit('TEAM_ADD', res.uid, { email: form.email.trim().toLowerCase(), role: form.role, desk: form.desk, created: res.created });
    if (res.needsPassword) {
      try { await requestPasswordReset(form.email.trim(), lang); } catch { /* ignore */ }
    }
    setAddBusy(false);
    setAdding(false);
    toast(res.needsPassword
      ? (isAr ? `اتضاف، واتبعتله إيميل يختار منه الباسورد على ${form.email.trim()}` : 'Added; a set-password email was sent')
      : (isAr ? 'اتضاف للفريق بالدور ده' : 'Added to the team'));
    load();
  };

  if (loadError === 'not-configured' || loadError === 'no-api') return <NotConfigured isAr={isAr} noApi={loadError === 'no-api'} />;

  const roles = accessConfig?.roles || [];
  const teams = accessConfig?.teams || [];

  return (
    <div className="tm-wrap">
      {/* 3 Sub-tabs navigation */}
      <nav className="tm-subnav" aria-label={isAr ? 'أقسام إدارة الفريق' : 'Team management tabs'}>
        <button
          type="button"
          className={`tm-subtab ${subTab === 'members' ? 'is-active' : ''}`}
          onClick={() => setSubTab('members')}
        >
          <Users size={16} />
          <span>{isAr ? 'الأعضاء والموظفون' : 'Members'}</span>
          {members && <span style={{ opacity: 0.7, fontSize: 11 }}>({members.length})</span>}
        </button>
        <button
          type="button"
          className={`tm-subtab ${subTab === 'roles' ? 'is-active' : ''}`}
          onClick={() => setSubTab('roles')}
        >
          <ShieldCheck size={16} />
          <span>{isAr ? 'الأدوار والصلاحيات' : 'Roles & Permissions'}</span>
          <span style={{ opacity: 0.7, fontSize: 11 }}>({roles.length})</span>
        </button>
        <button
          type="button"
          className={`tm-subtab ${subTab === 'teams' ? 'is-active' : ''}`}
          onClick={() => setSubTab('teams')}
        >
          <Building size={16} />
          <span>{isAr ? 'فرق المبيعات والتوزيع' : 'Sales Desks'}</span>
          <span style={{ opacity: 0.7, fontSize: 11 }}>({teams.length})</span>
        </button>
      </nav>

      {/* Tab 1: Members */}
      {subTab === 'members' && (
        <>
          <div className="tm-card tm-head">
            <div>
              <h3>{isAr ? 'فريق العمل والموظفون' : 'Staff Members'}</h3>
              <p>{isAr ? 'أضف الموظفين، حدد دور كل موظف وفريقه المسؤول عنه، أو أوقف الحسابات.' : 'Manage staff accounts, assign roles and teams.'}</p>
            </div>
            <div className="tm-head-actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={resync}
                disabled={syncing}
                aria-label={isAr ? 'تحديث ومزامنة الفريق' : 'Refresh & resync team'}
                title={isAr ? 'مزامنة وتحديث فوري للحسابات' : 'Resync accounts'}
              >
                <RefreshCw size={16} style={{ opacity: syncing ? 0.4 : 1 }} />
              </button>
              <button type="button" className="btn btn-primary" onClick={() => setAdding(true)} disabled={members === undefined || members === null}>
                <UserPlus size={16} /> {isAr ? 'إضافة موظف' : 'Add member'}
              </button>
            </div>
          </div>

          <div className="tm-card">
            {members === undefined && <p className="tm-muted">{isAr ? 'جاري التحميل…' : 'Loading…'}</p>}
            {members === null && (
              <p className="tm-error">{errorText(loadError, isAr)} <button type="button" className="btn btn-outline" onClick={load}>{isAr ? 'جرّب تاني' : 'Retry'}</button></p>
            )}
            {members && (
              <div className="tm-table-wrap">
                <table className="tm-table">
                  <thead>
                    <tr>
                      <th>{isAr ? 'العضو' : 'Member'}</th>
                      <th>{isAr ? 'الدور' : 'Role'}</th>
                      <th>{isAr ? 'فريق المبيعات' : 'Desk / Team'}</th>
                      <th>{isAr ? 'الحالة' : 'Status'}</th>
                      <th>{isAr ? 'آخر نشاط' : 'Last active'}</th>
                      <th>{isAr ? 'إجراءات' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((m) => {
                      const self = m.uid === me;
                      const busy = busyUid === m.uid;
                      const status = m.disabled ? 'off' : m.lastLoginAt ? 'on' : 'pending';

                      return (
                        <tr key={m.uid} className={m.disabled ? 'is-off' : ''}>
                          <td data-label={isAr ? 'العضو' : 'Member'}>
                            <div className="tm-name">{m.name || '—'} {self && <span className="tm-you">{isAr ? '(أنت)' : '(you)'}</span>}</div>
                            <div className="tm-email" dir="ltr">{m.email}</div>
                          </td>
                          <td data-label={isAr ? 'الدور' : 'Role'}>
                            <select
                              value={m.role || ''}
                              disabled={self || busy}
                              title={self ? (isAr ? 'مينفعش تغيّر دورك بنفسك' : "You can't change your own role") : undefined}
                              onChange={(e) => act(m, 'role', { role: e.target.value, desk: m.desk })}
                              aria-label={isAr ? `دور ${m.email}` : `Role of ${m.email}`}
                            >
                              {roles.map((r) => (
                                <option key={r.id} value={r.id}>{r.icon} {isAr ? r.name_ar : r.name_en}</option>
                              ))}
                            </select>
                          </td>
                          <td data-label={isAr ? 'فريق المبيعات' : 'Desk / Team'}>
                            <select
                              value={m.desk || ''}
                              disabled={self || busy}
                              onChange={(e) => act(m, 'role', { role: m.role, desk: e.target.value })}
                              aria-label={isAr ? `فريق ${m.email}` : `Team of ${m.email}`}
                            >
                              <option value="">{isAr ? 'بدون فريق (عام)' : 'General / None'}</option>
                              {teams.map((t) => (
                                <option key={t.id} value={t.id}>{isAr ? t.name_ar : t.name_en}</option>
                              ))}
                            </select>
                          </td>
                          <td data-label={isAr ? 'الحالة' : 'Status'}>
                            <span className={`tm-status tm-status-${status}`}>
                              {{ on: isAr ? 'نشط' : 'Active', off: isAr ? 'موقوف' : 'Disabled', pending: isAr ? 'لم يفعّل بعد' : 'Not activated' }[status]}
                            </span>
                          </td>
                          <td data-label={isAr ? 'آخر نشاط' : 'Last active'}>{fmtDate(m.lastLoginAt, isAr)}</td>
                          <td data-label={isAr ? 'إجراءات' : 'Actions'}>
                            <div className="tm-actions">
                              <button type="button" className="tm-icon-btn" onClick={() => sendPasswordLink(m)} disabled={busy || m.disabled} title={isAr ? 'إرسال لينك تعيين الباسورد' : 'Send password link'}>
                                <KeyRound size={16} />
                              </button>
                              {!self && (m.disabled ? (
                                <button type="button" className="tm-icon-btn" onClick={() => act(m, 'enable')} disabled={busy} title={isAr ? 'تفعيل' : 'Enable'}><UserCheck size={16} /></button>
                              ) : (
                                <button type="button" className="tm-icon-btn" onClick={() => act(m, 'disable')} disabled={busy} title={isAr ? 'إيقاف' : 'Disable'}><UserX size={16} /></button>
                              ))}
                              {!self && (
                                <button type="button" className="tm-icon-btn tm-danger" onClick={() => act(m, 'remove')} disabled={busy} title={isAr ? 'شيل من الفريق' : 'Remove from team'}><Trash2 size={16} /></button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {members.length === 0 && (
                      <tr><td colSpan={6} className="tm-muted">{isAr ? 'مفيش أعضاء لسه.' : 'No members yet.'}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Tab 2: Roles */}
      {subTab === 'roles' && (
        <RolesTab
          accessConfig={accessConfig}
          members={members || []}
          isAr={isAr}
          triggerToast={toast}
        />
      )}

      {/* Tab 3: Teams */}
      {subTab === 'teams' && (
        <TeamsTab
          accessConfig={accessConfig}
          members={members || []}
          leads={leads}
          isAr={isAr}
          triggerToast={toast}
        />
      )}

      {adding && (
        <AddMemberModal
          isAr={isAr}
          roles={roles}
          teams={teams}
          busy={addBusy}
          onClose={() => setAdding(false)}
          onSubmit={add}
        />
      )}
    </div>
  );
}
