import { Lock } from 'lucide-react';
import AreaManagerPanel from './AreaManagerPanel';
import FounderCmsPanel from './FounderCmsPanel';
import ClientErrorsPanel from './ClientErrorsPanel';
import TeamPanel from './TeamPanel';

// CRM → System administration (super admin only): sub-navigation + the module for each sub-tab.
// Backups and automations live in CrmAdminPanel, which the page renders through renderAdminPanel.

const SUB_TABS = [
  { id: 'team', ar: 'الفريق والصلاحيات', en: 'Team & roles' },
  { id: 'areas', ar: 'إدارة المناطق والأحياء', en: 'Districts CMS' },
  { id: 'corporate', ar: 'هوية الشركة والمؤسس (CMS)', en: 'Founder & Corporate CMS' },
  { id: 'backup', ar: 'النسخ الاحتياطي والبيانات', en: 'Backups & Restore' },
  { id: 'automation', ar: 'الأتمتة والتنبيهات', en: 'Automations' },
  { id: 'errors', ar: 'أخطاء الموقع', en: 'Site errors' }
];

export function RestrictedSection({ isAr, onBack }) {
  return (
    <div style={{
      background: 'var(--crm-surface-light, var(--crm-card))',
      border: '1px solid var(--crm-danger-line)',
      borderRadius: '12px',
      padding: '40px 24px',
      textAlign: 'center',
      maxWidth: '600px',
      margin: '40px auto'
    }}>
      <Lock size={48} style={{ color: 'var(--crm-danger)', margin: '0 auto 16px' }} />
      <h3 style={{ color: 'var(--crm-ink)', marginBottom: '8px' }}>
        {isAr ? 'منطقة صلاحيات مقيدة' : 'Restricted Access'}
      </h3>
      <p style={{ color: 'var(--crm-muted)', fontSize: 'var(--crm-text-base)' }}>
        {isAr
          ? 'هذا القسم (إدارة النظام والأحياء وهوية المؤسس) متاح حصرياً للمدير العام.'
          : 'This section is strictly restricted to Super Admin.'}
      </p>
      <button type="button" className="btn btn-primary" onClick={onBack} style={{ marginTop: '16px' }}>
        {isAr ? 'العودة للوحة الرئيسية' : 'Return to Dashboard'}
      </button>
    </div>
  );
}

export default function SystemSection({ lang, triggerToast, properties, leads, subTab, setSubTab, renderAdminPanel }) {
  const isAr = lang === 'ar';
  return (
    <div className="crm-system-subcontainer">
      {/* Clean System Administration Sub-Navigation */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '16px',
        background: 'var(--crm-card)',
        border: '1px solid var(--crm-line)',
        padding: '8px 14px',
        borderRadius: '10px',
        flexWrap: 'wrap'
      }}>
        <span style={{ fontSize: 'var(--crm-text-sm)', fontWeight: 'bold', color: 'var(--crm-ink)', marginInlineEnd: '8px' }}>
          {isAr ? 'أقسام إدارة المنظومة:' : 'System Modules:'}
        </span>
        {SUB_TABS.map((t) => {
          const on = subTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id)}
              style={{
                padding: '6px 14px',
                borderRadius: '7px',
                fontSize: 'var(--crm-text-sm)',
                fontWeight: on ? 'bold' : '600',
                background: on ? 'var(--crm-brand-navy)' : 'var(--crm-subtle)',
                color: on ? 'var(--crm-on-dark)' : 'var(--crm-muted)',
                border: on ? '1px solid var(--crm-brand-navy)' : '1px solid var(--crm-line)',
                cursor: 'pointer'
              }}
            >
              {isAr ? t.ar : t.en}
            </button>
          );
        })}
      </div>

      {subTab === 'team' && <TeamPanel lang={lang} triggerToast={triggerToast} />}
      {subTab === 'areas' && <AreaManagerPanel lang={lang} triggerToast={triggerToast} properties={properties} leads={leads} />}
      {subTab === 'corporate' && <FounderCmsPanel lang={lang} triggerToast={triggerToast} />}
      {subTab === 'errors' && <ClientErrorsPanel lang={lang} triggerToast={triggerToast} />}
      {(subTab === 'backup' || subTab === 'automation') && renderAdminPanel(subTab === 'backup' ? 'system_backup' : 'automation')}
    </div>
  );
}
