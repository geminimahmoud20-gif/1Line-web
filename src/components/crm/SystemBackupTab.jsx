import { Download, Database, Upload } from 'lucide-react';

export default function SystemBackupTab({
  handleExportLeadsJson,
  handleImportLeadsJson,
  isAr,
  leads
}) {
  return (
    <div className="crm-dashboard-stack">
      <div className="crm-table-container" style={{ padding: '28px', maxWidth: '820px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', borderBottom: '1px solid var(--border-light)', paddingBottom: '16px' }}>
          <Database size={26} className="text-gold" />
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--crm-ink)' }}>
              {isAr ? 'البيانات والنسخ الاحتياطي وإدارة المنظومة' : 'Database Backups & System Administration'}
            </h3>
            <p style={{ margin: 0, fontSize: 'var(--crm-text-base)', color: 'var(--text-secondary)' }}>
              {isAr ? 'خاص بالمدير العام — تصدير واسترجاع نسخ العملاء والبيانات الحساسة بأمان' : 'Super Admin only — Backup, export and recovery hub'}
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginTop: '16px' }}>
          {/* Backup Box */}
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-light)', borderRadius: '10px', padding: '20px' }}>
            <h4 style={{ margin: '0 0 10px 0', color: 'var(--accent-gold)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Download size={18} />
              <span>{isAr ? 'تنزيل نسخة احتياطية' : 'Download Backup'}</span>
            </h4>
            <p style={{ fontSize: 'var(--crm-text-sm)', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: '1.5' }}>
              {isAr 
                ? 'تصدير كامل بيانات العملاء والصفقات والطلبات كملف JSON آمن ومحمي للاحتفاظ به أو استرجاعه لاحقاً.' 
                : 'Export full database snapshot as a structured JSON file.'}
            </p>
            <button 
              type="button" 
              className="btn btn-sm btn-accent" 
              onClick={handleExportLeadsJson}
              style={{ width: '100%', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 'bold' }}
            >
              <Database size={15} />
              <span>{isAr ? `تحميل ملف النسخة الاحتياطية (${leads.length} عميل)` : 'Download JSON Backup'}</span>
            </button>
          </div>

          {/* Restore Box */}
          <div style={{ background: 'rgba(239, 68, 68, 0.03)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '10px', padding: '20px' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Upload size={18} />
              <span>{isAr ? 'استعادة قاعدة البيانات' : 'Restore Database'}</span>
            </h4>
            <p style={{ fontSize: 'var(--crm-text-sm)', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: '1.5' }}>
              {isAr 
                ? '⚠️ تحذير أمني: استيراد ملف JSON سيقوم بدمج أو تحديث بيانات العملاء الحالية. يُرجى التحقق من الملف قبل رفعه.' 
                : 'Warning: Importing JSON file will merge or overwrite current customer records.'}
            </p>
            <label 
              className="btn btn-sm" 
              style={{ 
                width: '100%', 
                padding: '10px', 
                cursor: 'pointer', 
                background: 'rgba(239, 68, 68, 0.15)', 
                color: '#ef4444', 
                border: '1px solid rgba(239, 68, 68, 0.4)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '8px',
                fontWeight: 'bold'
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
