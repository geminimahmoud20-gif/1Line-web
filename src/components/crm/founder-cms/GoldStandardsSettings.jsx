import { Award } from 'lucide-react';
import { DEFAULT_FOUNDER_CMS } from '../../../utils/founderCmsData';

export default function GoldStandardsSettings({
  formData,
  handleGoldStandardChange,
  isAr,
  setFormData
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{
        background: 'rgba(217, 119, 6, 0.08)',
        border: '1px solid rgba(217, 119, 6, 0.25)',
        padding: '16px',
        borderRadius: 'var(--radius-md)'
      }}>
        <h4 style={{ margin: '0 0 8px 0', color: 'var(--crm-accent-text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Award size={18} />
          <span>{isAr ? 'معايير الأمان الأربعة المعتمدة في 1Line (الصفحة الرئيسية)' : 'The 4 1Line Golden Standards (Homepage)'}</span>
        </h4>
        <p style={{ margin: 0, fontSize: 'var(--crm-text-base)', color: 'var(--crm-muted)' }}>
          {isAr
            ? 'هذا القسم يظهر في الصفحة الرئيسية لبناء أعلى درجات الموثوقية والمصداقية مع المستثمرين والمشترين ومغتربي الخليج. يمكنك تعديل العناوين، الشروحات، والأرقام لكل معيار وسيتم التحديث فوراً في الموقع.'
            : 'This section appears on the homepage to instill institutional trust with buyers and Gulf expats. Modify titles, descriptions, and badges directly.'}
        </p>
      </div>

      {/* Section Main Titles */}
      <div className="form-grid-2">
        <div className="form-group-item">
          <label htmlFor="fcms-field-27">{isAr ? 'عنوان القسم الرئيسي (بالعربي):' : 'Section Main Title (AR):'}</label>
          <input id="fcms-field-27"
            type="text"
            value={formData.goldStandardsTitle_ar || ''}
            onChange={(e) => setFormData({ ...formData, goldStandardsTitle_ar: e.target.value })}
            placeholder="معايير الأمان الأربعة المعتمدة في 1Line"
          />
        </div>

        <div className="form-group-item">
          <label htmlFor="fcms-field-28">{isAr ? 'عنوان القسم (بالإنجليزي):' : 'Section Main Title (EN):'}</label>
          <input id="fcms-field-28"
            type="text"
            value={formData.goldStandardsTitle_en || ''}
            onChange={(e) => setFormData({ ...formData, goldStandardsTitle_en: e.target.value })}
            placeholder="The 4 1Line Golden Standards"
          />
        </div>
      </div>

      <div className="form-grid-2">
        <div className="form-group-item">
          <label htmlFor="fcms-field-29">{isAr ? 'الوصف التعريفي للقسم (بالعربي):' : 'Section Subtitle / Description (AR):'}</label>
          <input id="fcms-field-29"
            type="text"
            value={formData.goldStandardsDesc_ar || ''}
            onChange={(e) => setFormData({ ...formData, goldStandardsDesc_ar: e.target.value })}
            placeholder="لماذا يأتمننا مئات المستثمرين والأسر بسوهاج ومغتربي الخليج..."
          />
        </div>

        <div className="form-group-item">
          <label htmlFor="fcms-field-30">{isAr ? 'الوصف التعريفي للقسم (بالإنجليزي):' : 'Section Subtitle / Description (EN):'}</label>
          <input id="fcms-field-30"
            type="text"
            value={formData.goldStandardsDesc_en || ''}
            onChange={(e) => setFormData({ ...formData, goldStandardsDesc_en: e.target.value })}
            placeholder="Why leading investors, families, and Gulf expats trust 1Line..."
          />
        </div>
      </div>

      {/* The 4 Individual Standard Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '10px' }}>
        {(formData.goldStandards || DEFAULT_FOUNDER_CMS.goldStandards).map((std, idx) => (
          <div key={idx} style={{
            background: 'var(--crm-subtle)',
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-md)',
            padding: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px', flexWrap: 'wrap', gap: '10px' }}>
              <h4 style={{ margin: 0, color: 'var(--crm-accent-text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ 
                  background: 'rgba(217, 119, 6, 0.15)', 
                  color: 'var(--crm-accent-text)', 
                  padding: '2px 8px', 
                  borderRadius: '4px',
                  fontSize: 'var(--crm-text-base)',
                  fontWeight: 'bold'
                }}>
                  #{std.number || `0${idx + 1}`}
                </span>
                <span>{isAr ? `المعيار ${idx + 1}:` : `Standard ${idx + 1}:`} {std.title_ar}</span>
              </h4>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <label htmlFor="fcms-field-31" style={{ fontSize: 'var(--crm-text-sm)', color: 'var(--crm-muted)' }}>
                  {isAr ? 'الأيقونة:' : 'Icon:'}
                </label>
                <select id="fcms-field-31"
                  value={std.icon || 'ShieldCheck'}
                  onChange={(e) => handleGoldStandardChange(idx, 'icon', e.target.value)}
                  style={{ padding: '6px 10px', fontSize: 'var(--crm-text-sm)', borderRadius: '4px', background: 'var(--crm-subtle)', color: 'var(--crm-on-dark)', border: '1px solid var(--border-light)' }}
                >
                  <option value="ShieldCheck">🛡️ ShieldCheck (درع الأمان)</option>
                  <option value="Scale">⚖️ Scale (ميزان العدالة والتقييم)</option>
                  <option value="Award">🏆 Award (جائزة واعتماد)</option>
                  <option value="Video">📹 Video (معاينة فيديو)</option>
                  <option value="FileCheck">📑 FileCheck (فحص مستندات)</option>
                  <option value="Lock">🔒 Lock (أمان وحماية)</option>
                </select>
              </div>
            </div>

            <div className="form-grid-3" style={{ marginBottom: '12px' }}>
              <div className="form-group-item">
                <label htmlFor="fcms-field-32">{isAr ? 'رقم المعيار:' : 'Number badge:'}</label>
                <input id="fcms-field-32"
                  type="text"
                  value={std.number || ''}
                  onChange={(e) => handleGoldStandardChange(idx, 'number', e.target.value)}
                  placeholder="01"
                />
              </div>

              <div className="form-group-item">
                <label htmlFor="fcms-field-33">{isAr ? 'شارة الاعتماد (بالعربي):' : 'Badge (AR):'}</label>
                <input id="fcms-field-33"
                  type="text"
                  value={std.badge_ar || ''}
                  onChange={(e) => handleGoldStandardChange(idx, 'badge_ar', e.target.value)}
                  placeholder="ضمان مؤسسي معتمد"
                />
              </div>

              <div className="form-group-item">
                <label htmlFor="fcms-field-34">{isAr ? 'شارة الاعتماد (بالإنجليزي):' : 'Badge (EN):'}</label>
                <input id="fcms-field-34"
                  type="text"
                  value={std.badge_en || ''}
                  onChange={(e) => handleGoldStandardChange(idx, 'badge_en', e.target.value)}
                  placeholder="Guaranteed Standard"
                />
              </div>
            </div>

            <div className="form-grid-2" style={{ marginBottom: '12px' }}>
              <div className="form-group-item">
                <label htmlFor="fcms-field-35">{isAr ? 'عنوان المعيار (بالعربي):' : 'Title (Arabic):'}</label>
                <input id="fcms-field-35"
                  type="text"
                  value={std.title_ar || ''}
                  onChange={(e) => handleGoldStandardChange(idx, 'title_ar', e.target.value)}
                  placeholder="التدقيق القانوني الصارم 100%"
                />
              </div>

              <div className="form-group-item">
                <label htmlFor="fcms-field-36">{isAr ? 'عنوان المعيار (بالإنجليزي):' : 'Title (English):'}</label>
                <input id="fcms-field-36"
                  type="text"
                  value={std.title_en || ''}
                  onChange={(e) => handleGoldStandardChange(idx, 'title_en', e.target.value)}
                  placeholder="Documents reviewed before listing"
                />
              </div>
            </div>

            <div className="form-grid-2">
              <div className="form-group-item">
                <label htmlFor="fcms-field-37">{isAr ? 'نص الشرح والضمان (بالعربي):' : 'Description (Arabic):'}</label>
                <textarea id="fcms-field-37"
                  rows={3}
                  style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', background: 'rgba(0,0,0,0.25)', color: 'var(--crm-on-dark)', border: '1px solid var(--border-light)', fontSize: 'var(--crm-text-base)' }}
                  value={std.desc_ar || ''}
                  onChange={(e) => handleGoldStandardChange(idx, 'desc_ar', e.target.value)}
                />
              </div>

              <div className="form-group-item">
                <label htmlFor="fcms-field-38">{isAr ? 'نص الشرح والضمان (بالإنجليزي):' : 'Description (English):'}</label>
                <textarea id="fcms-field-38"
                  rows={3}
                  style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', background: 'rgba(0,0,0,0.25)', color: 'var(--crm-on-dark)', border: '1px solid var(--border-light)', fontSize: 'var(--crm-text-base)' }}
                  value={std.desc_en || ''}
                  onChange={(e) => handleGoldStandardChange(idx, 'desc_en', e.target.value)}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>

  );
}
