import React, { useState, useEffect } from 'react';
import { 
  Building, 
  User, 
  Quote, 
  TrendingUp, 
  ShieldCheck, 
  Save, 
  RotateCcw, 
  CheckCircle2, 
  Phone, 
  MessageSquare, 
  Image, 
  MapPin, 
  Sparkles,
  Award,
  Eye,
  Loader2
} from 'lucide-react';
import { 
  getFounderSettings, 
  saveFounderSettings, 
  resetFounderSettings, 
  DEFAULT_FOUNDER_CMS 
} from '../../utils/founderCmsData';

export default function FounderCmsPanel({ lang = 'ar', triggerToast }) {
  const isAr = lang === 'ar';
  const [formData, setFormData] = useState(() => getFounderSettings());
  const [isSaving, setIsSaving] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('founder'); // 'founder' | 'quote' | 'stats' | 'pillars'

  // Sync state if remote cloud update arrives
  useEffect(() => {
    const handleUpdate = () => {
      setFormData(getFounderSettings());
    };
    window.addEventListener('oneline_founder_cms_updated', handleUpdate);
    return () => window.removeEventListener('oneline_founder_cms_updated', handleUpdate);
  }, []);

  const handleSave = async (e) => {
    e?.preventDefault();
    setIsSaving(true);
    try {
      const success = await saveFounderSettings(formData);
      if (success) {
        triggerToast(
          isAr 
            ? 'تم حفظ وتحديث بيانات المؤسس والشركة ونشرها سحابياً على كامل الموقع فوراً! 🚀' 
            : 'Corporate & Founder profile updated and published live to cloud!', 
          'success'
        );
      } else {
        triggerToast(isAr ? 'حدث خطأ أثناء الحفظ' : 'Failed to save changes', 'error');
      }
    } catch (err) {
      console.error('Founder CMS save error:', err);
      triggerToast(isAr ? 'تعذر حفظ البيانات' : 'Save failed', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (window.confirm(isAr ? 'هل أنت متأكد من استعادة النصوص والإعدادات الافتراضية؟' : 'Reset all corporate text to defaults?')) {
      await resetFounderSettings();
      setFormData(DEFAULT_FOUNDER_CMS);
      triggerToast(isAr ? 'تمت استعادة الإعدادات الافتراضية بنجاح' : 'Reset to default settings', 'info');
    }
  };

  // Helper for updating nested stats
  const handleStatChange = (idx, field, value) => {
    const updatedStats = [...(formData.stats || [])];
    if (!updatedStats[idx]) updatedStats[idx] = {};
    updatedStats[idx][field] = value;
    setFormData({ ...formData, stats: updatedStats });
  };

  // Helper for updating Hero stats (top of homepage)
  const handleHeroStatChange = (idx, field, value) => {
    const updatedHeroStats = [...(formData.heroStats || DEFAULT_FOUNDER_CMS.heroStats)];
    if (!updatedHeroStats[idx]) updatedHeroStats[idx] = {};
    updatedHeroStats[idx][field] = value;
    setFormData({ ...formData, heroStats: updatedHeroStats });
  };

  // Helper for updating nested pillars
  const handlePillarChange = (idx, field, value) => {
    const updatedPillars = [...(formData.pillars || [])];
    if (!updatedPillars[idx]) updatedPillars[idx] = {};
    updatedPillars[idx][field] = value;
    setFormData({ ...formData, pillars: updatedPillars });
  };

  return (
    <div className="crm-table-container animate-fadeIn">
      {/* Top Header & Save Actions */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        borderBottom: '1px solid var(--border-light)',
        paddingBottom: '16px',
        marginBottom: '20px'
      }}>
        <div>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-gold)' }}>
            <Building size={20} />
            <span>{isAr ? 'إدارة قسم الشركة وملف المؤسس (د. محمود الباز)' : 'Corporate & Founder CMS'}</span>
          </h3>
          <p className="section-subtitle" style={{ margin: '4px 0 0 0' }}>
            {isAr 
              ? 'تعديل سيرة المؤسس، كلمته الرسمية، أرقام وإحصائيات المنصة، وركائز الأمان القانوني لحظياً على الموقع.' 
              : 'Manage founder bio, quote, live stats, and corporate trust pillars.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-sm btn-outline"
            onClick={handleReset}
            title={isAr ? 'استعادة النصوص الأصلية' : 'Reset defaults'}
          >
            <RotateCcw size={14} />
            <span>{isAr ? 'استعادة الافتراضي' : 'Reset'}</span>
          </button>

          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={handleSave}
            disabled={isSaving}
            style={{ background: 'var(--gradient-gold)', fontWeight: 'bold' }}
          >
            {isSaving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            <span>{isSaving ? (isAr ? 'جاري الحفظ سحابياً...' : 'Saving...') : (isAr ? 'حفظ ونشر التعديلات فوراً' : 'Save & Publish Live')}</span>
          </button>
        </div>
      </div>

      {/* Sub Navigation Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '24px',
        borderBottom: '1px solid var(--border-light)',
        paddingBottom: '12px',
        overflowX: 'auto'
      }}>
        <button
          type="button"
          className={`btn btn-sm ${activeSubTab === 'founder' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveSubTab('founder')}
        >
          <User size={14} />
          <span>{isAr ? 'هوية وبيانات المؤسس' : 'Founder Info'}</span>
        </button>

        <button
          type="button"
          className={`btn btn-sm ${activeSubTab === 'quote' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveSubTab('quote')}
        >
          <Quote size={14} />
          <span>{isAr ? 'كلمة ورسالة المؤسس' : 'Founder Quote'}</span>
        </button>

        <button
          type="button"
          className={`btn btn-sm ${activeSubTab === 'stats' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveSubTab('stats')}
        >
          <TrendingUp size={14} />
          <span>{isAr ? 'أرقام وإحصائيات المنصة (4 مؤشرات)' : 'Platform Stats'}</span>
        </button>

        <button
          type="button"
          className={`btn btn-sm ${activeSubTab === 'pillars' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveSubTab('pillars')}
        >
          <ShieldCheck size={14} />
          <span>{isAr ? 'ركائز وقيم الشركة' : 'Company Pillars'}</span>
        </button>
      </div>

      {/* Form Content */}
      <form onSubmit={handleSave}>
        {/* SUBTAB 1: FOUNDER INFO */}
        {activeSubTab === 'founder' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            <div className="form-group-item">
              <label>{isAr ? 'اسم المؤسس (بالعربية):' : 'Founder Name (Arabic):'}</label>
              <input
                type="text"
                value={formData.founderName_ar || ''}
                onChange={(e) => setFormData({ ...formData, founderName_ar: e.target.value })}
                required
              />
            </div>

            <div className="form-group-item">
              <label>{isAr ? 'اسم المؤسس (بالإنجليزية):' : 'Founder Name (English):'}</label>
              <input
                type="text"
                value={formData.founderName_en || ''}
                onChange={(e) => setFormData({ ...formData, founderName_en: e.target.value })}
              />
            </div>

            <div className="form-group-item">
              <label>{isAr ? 'المنصب والصفة (بالعربية):' : 'Founder Role (Arabic):'}</label>
              <input
                type="text"
                value={formData.founderRole_ar || ''}
                onChange={(e) => setFormData({ ...formData, founderRole_ar: e.target.value })}
              />
            </div>

            <div className="form-group-item">
              <label>{isAr ? 'اللقب المهني الإضافي (بالعربية):' : 'Professional Title (Arabic):'}</label>
              <input
                type="text"
                value={formData.founderSub_ar || ''}
                onChange={(e) => setFormData({ ...formData, founderSub_ar: e.target.value })}
              />
            </div>

            <div className="form-group-item">
              <label>{isAr ? 'رابط الصورة الشخصية للمؤسس (اختياري):' : 'Founder Photo URL (Optional):'}</label>
              <input
                type="text"
                placeholder="https://... (اتركه فارغاً لاستخدام الشعار الذهبي الفاخر)"
                value={formData.founderPhoto || ''}
                onChange={(e) => setFormData({ ...formData, founderPhoto: e.target.value })}
              />
            </div>

            <div className="form-group-item">
              <label>{isAr ? 'رقم واتساب استشارات المؤسس:' : 'Founder WhatsApp Number:'}</label>
              <input
                type="text"
                placeholder="مثال: 01223222956"
                value={formData.whatsappNumber || ''}
                onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
              />
            </div>

            <div className="form-group-item">
              <label>{isAr ? 'رقم هاتف مكتب الإدارة:' : 'Office Phone Number:'}</label>
              <input
                type="text"
                placeholder="+201223222956 أو 01223222956"
                value={formData.phoneNumber || ''}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              />
            </div>

            <div className="form-group-item">
              <label>{isAr ? 'عنوان المقر الرئيسي والسجل التجاري:' : 'HQ & Commercial Reg Title:'}</label>
              <input
                type="text"
                value={formData.headquarters_ar || ''}
                onChange={(e) => setFormData({ ...formData, headquarters_ar: e.target.value })}
              />
            </div>
          </div>
        )}

        {/* SUBTAB 2: FOUNDER QUOTE & VISION */}
        {activeSubTab === 'quote' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="form-group-item">
              <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{isAr ? 'نص كلمة ورسالة المؤسس (بالعربية):' : 'Founder Statement / Quote (Arabic):'}</span>
                <small style={{ color: 'var(--text-secondary)' }}>{(formData.founderQuote_ar || '').length} حرف</small>
              </label>
              <textarea
                rows={5}
                style={{ width: '100%', padding: '14px', borderRadius: 'var(--radius-sm)', background: 'rgba(0,0,0,0.25)', color: '#fff', border: '1px solid var(--border-light)', lineHeight: 1.8, fontSize: '0.95rem' }}
                value={formData.founderQuote_ar || ''}
                onChange={(e) => setFormData({ ...formData, founderQuote_ar: e.target.value })}
              />
            </div>

            <div className="form-group-item">
              <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{isAr ? 'نص كلمة المؤسس (بالإنجليزية):' : 'Founder Statement / Quote (English):'}</span>
              </label>
              <textarea
                rows={4}
                style={{ width: '100%', padding: '14px', borderRadius: 'var(--radius-sm)', background: 'rgba(0,0,0,0.25)', color: '#fff', border: '1px solid var(--border-light)', lineHeight: 1.8, fontSize: '0.95rem' }}
                value={formData.founderQuote_en || ''}
                onChange={(e) => setFormData({ ...formData, founderQuote_en: e.target.value })}
              />
            </div>
          </div>
        )}

        {/* SUBTAB 3: 4 TOP STATS & HERO STATS */}
        {activeSubTab === 'stats' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            {/* 1. HERO STATS CARDS (TOP OF HOMEPAGE) */}
            <div style={{ background: 'rgba(217, 119, 6, 0.05)', border: '1px solid rgba(217, 119, 6, 0.25)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Sparkles size={18} style={{ color: 'var(--accent-gold)' }} />
                <h4 style={{ margin: 0, color: '#ffffff', fontSize: '1rem' }}>
                  {isAr ? 'أرقام شريط الواجهة الرئيسية (Hero Stats Strip - أعلى الموقع)' : 'Hero Stats Strip (Top of Homepage)'}
                </h4>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '0 0 16px 0' }}>
                {isAr 
                  ? 'هذه هي الأرقام الأربعة الظاهرة مباشرة أسفل شريط البحث الرئيسي في صدر الصفحة الرئيسية (قابلة للتعديل بالكامل):' 
                  : 'These are the 4 cards displayed directly below the main search bar on the homepage:'}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                {(formData.heroStats || DEFAULT_FOUNDER_CMS.heroStats).map((hs, idx) => (
                  <div key={idx} style={{ background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 'var(--radius-md)', padding: '14px' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--accent-gold)', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>
                      البطاقة #{idx + 1}
                    </span>

                    <div className="form-group-item" style={{ marginBottom: '8px' }}>
                      <label style={{ fontSize: '0.75rem' }}>{isAr ? 'الرقم / النسبة الظاهرة:' : 'Value:'}</label>
                      <input
                        type="text"
                        value={hs.num_ar || ''}
                        onChange={(e) => handleHeroStatChange(idx, 'num_ar', e.target.value)}
                        placeholder="مثال: +150"
                      />
                    </div>

                    <div className="form-group-item">
                      <label style={{ fontSize: '0.75rem' }}>{isAr ? 'التسمية والوصف:' : 'Label:'}</label>
                      <input
                        type="text"
                        value={hs.label_ar || ''}
                        onChange={(e) => handleHeroStatChange(idx, 'label_ar', e.target.value)}
                        placeholder="مثال: عقار مفحوص ومعتمد"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. FOUNDER STATS */}
            <div>
              <h4 style={{ margin: '0 0 6px 0', color: '#ffffff', fontSize: '0.95rem' }}>
                {isAr ? 'المؤشرات الرقمية لقسم المؤسس د. محمود الباز' : 'Founder Section Stats'}
              </h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '16px' }}>
                {isAr ? 'تعديل المؤشرات الرقمية الأربعة التي تظهر في أسفل قسم المؤسس لتعزيز ثقة المستثمرين:' : 'Edit the 4 key statistical achievement metrics:'}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                {(formData.stats || []).map((st, idx) => (
                  <div key={idx} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', color: 'var(--accent-gold)', fontWeight: 'bold' }}>
                      <span>المؤشر #{idx + 1}</span>
                    </div>

                    <div className="form-group-item" style={{ marginBottom: '8px' }}>
                      <label style={{ fontSize: '0.75rem' }}>{isAr ? 'الرقم / النسبة:' : 'Number / Metric:'}</label>
                      <input
                        type="text"
                        value={st.num_ar || ''}
                        onChange={(e) => handleStatChange(idx, 'num_ar', e.target.value)}
                      />
                    </div>

                    <div className="form-group-item" style={{ marginBottom: '8px' }}>
                      <label style={{ fontSize: '0.75rem' }}>{isAr ? 'العنوان الرئيسي:' : 'Label (Arabic):'}</label>
                      <input
                        type="text"
                        value={st.label_ar || ''}
                        onChange={(e) => handleStatChange(idx, 'label_ar', e.target.value)}
                      />
                    </div>

                    <div className="form-group-item">
                      <label style={{ fontSize: '0.75rem' }}>{isAr ? 'النص التوضيحي:' : 'Subtitle (Arabic):'}</label>
                      <input
                        type="text"
                        value={st.sub_ar || ''}
                        onChange={(e) => handleStatChange(idx, 'sub_ar', e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB 4: 3 CORPORATE PILLARS */}
        {activeSubTab === 'pillars' && (
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {(formData.pillars || []).map((pl, idx) => (
                <div key={idx} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                  <h4 style={{ margin: '0 0 12px 0', color: 'var(--accent-gold)' }}>
                    {isAr ? `الركيزة #${idx + 1}:` : `Pillar #${idx + 1}:`} {pl.title_ar}
                  </h4>

                  <div className="form-group-item" style={{ marginBottom: '12px' }}>
                    <label>{isAr ? 'عنوان الركيزة:' : 'Title:'}</label>
                    <input
                      type="text"
                      value={pl.title_ar || ''}
                      onChange={(e) => handlePillarChange(idx, 'title_ar', e.target.value)}
                    />
                  </div>

                  <div className="form-group-item">
                    <label>{isAr ? 'الوصف والتفاصيل:' : 'Description:'}</label>
                    <textarea
                      rows={3}
                      style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', background: 'rgba(0,0,0,0.25)', color: '#fff', border: '1px solid var(--border-light)' }}
                      value={pl.desc_ar || ''}
                      onChange={(e) => handlePillarChange(idx, 'desc_ar', e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom Save Action Bar */}
        <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-light)', paddingTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSaving}
            style={{ background: 'var(--gradient-gold)', padding: '10px 24px', fontSize: '0.95rem', fontWeight: 'bold' }}
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            <span>{isSaving ? (isAr ? 'جاري الحفظ سحابياً...' : 'Saving to Cloud...') : (isAr ? 'حفظ ونشر التعديلات فوراً على الموقع' : 'Save & Publish Live')}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
