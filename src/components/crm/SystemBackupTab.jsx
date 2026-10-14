import { Download, Database, Upload } from 'lucide-react';

export default function SystemBackupTab({
  handleExportLeadsJson,
  handleImportLeadsJson,
  isAr,
  leads
}) {
  return (
    <div className="crm-dashboard-stack animate-fadeIn">
      <div className="crm-card" style={{ padding: '28px', maxWidth: '860px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', borderBottom: '1px solid var(--crm-line)', paddingBottom: '16px' }}>
          <div style={{
            background: 'var(--crm-accent-soft)',
            color: 'var(--crm-accent-text)',
            padding: '10px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Database size={24} style={{ color: 'var(--crm-accent)' }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ margin: 0, fontSize: 'var(--crm-text-lg)', color: 'var(--crm-ink)', fontWeight: 800 }}>
                {isAr ? 'البيانات والنسخ الاحتياطي وإدارة المنظومة' : 'Database Backups & System Administration'}
              </h3>
              <span className="crm-badge-360">Admin Core</span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: 'var(--crm-text-sm)', color: 'var(--crm-muted)' }}>
              {isAr ? 'خاص بالمدير العام — تصدير واسترجاع نسخ العملاء والبيانات الحساسة بأمان مع التشفير السحابي' : 'Super Admin only — Backup, export and recovery hub with cloud encryption'}
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          {/* Backup Box */}
          <div style={{ background: 'var(--crm-subtle)', border: '1px solid var(--crm-line)', borderRadius: '14px', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h4 style={{ margin: '0 0 10px 0', color: 'var(--crm-accent-text)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--crm-text-base)', fontWeight: 700 }}>
                <Download size={18} />
                <span>{isAr ? 'تنزيل نسخة احتياطية' : 'Download Backup'}</span>
              </h4>
              <p style={{ fontSize: 'var(--crm-text-sm)', color: 'var(--crm-muted)', marginBottom: '20px', lineHeight: '1.6' }}>
                {isAr 
                  ? 'تصدير كامل بيانات العملاء والصفقات والطلبات كملف JSON آمن ومحمي للاحتفاظ به أو استرجاعه لاحقاً.' 
                  : 'Export full database snapshot as a structured JSON file for disaster recovery.'}
              </p>
            </div>
            <button 
              type="button" 
              className="crm-btn-primary-gold" 
              onClick={handleExportLeadsJson}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <Database size={15} />
              <span>{isAr ? `تحميل ملف النسخة الاحتياطية (${leads.length} عميل)` : 'Download JSON Backup'}</span>
            </button>
          </div>

          {/* Restore Box */}
          <div style={{ background: 'var(--crm-danger-soft)', border: '1px solid var(--crm-danger-line)', borderRadius: '14px', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h4 style={{ margin: '0 0 10px 0', color: 'var(--crm-danger)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--crm-text-base)', fontWeight: 700 }}>
                <Upload size={18} />
                <span>{isAr ? 'استعادة قاعدة البيانات' : 'Restore Database'}</span>
              </h4>
              <p style={{ fontSize: 'var(--crm-text-sm)', color: 'var(--crm-muted)', marginBottom: '20px', lineHeight: '1.6' }}>
                {isAr 
                  ? '⚠️ تحذير أمني: استيراد ملف JSON سيقوم بدمج أو تحديث بيانات العملاء الحالية. يُرجى التحقق من الملف قبل رفعه.' 
                  : 'Warning: Importing JSON file will merge or overwrite current customer records.'}
              </p>
            </div>
            <label 
              style={{ 
                width: '100%', 
                padding: '10px 16px', 
                cursor: 'pointer', 
                background: 'var(--crm-card)', 
                color: 'var(--crm-danger)', 
                border: '1px solid var(--crm-danger-line)', 
                borderRadius: '10px',
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '8px',
                fontWeight: 700,
                fontSize: 'var(--crm-text-sm)',
                boxSizing: 'border-box',
                transition: 'all 0.2s ease'
              }}
            >
              <Upload size={15} />
              <span>{isAr ? 'رفع واستعادة ملف JSON' : 'Upload & Restore JSON'}</span>
              <input 
                type="file" 
                accept=".json" 
                onChange={handleImportLeadsJson} 
                style={{ display: 'none' }} 
              />
            </label>
          </div>
        </div>
      </div>
    </div>

  );
}
