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
  Loader2,
  Film,
  Sliders
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

  // Helper for updating the 4 Gold Standards
  const handleGoldStandardChange = (idx, field, value) => {
    const updated = [...(formData.goldStandards || DEFAULT_FOUNDER_CMS.goldStandards)];
    if (!updated[idx]) updated[idx] = {};
    updated[idx][field] = value;
    setFormData({ ...formData, goldStandards: updated });
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
          className={`btn btn-sm ${activeSubTab === 'hero_video' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveSubTab('hero_video')}
        >
          <Film size={14} />
          <span>{isAr ? '🎬 الفيديو والهيرو السينمائي (The Agency)' : 'Hero Video & Media'}</span>
        </button>

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

        <button
          type="button"
          className={`btn btn-sm ${activeSubTab === 'gold_standards' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveSubTab('gold_standards')}
        >
          <Award size={14} />
          <span>{isAr ? '🛡️ معايير الأمان الأربعة (الرئيسية)' : '4 Golden Standards'}</span>
        </button>
      </div>

      {/* Form Content */}
      <form onSubmit={handleSave}>
        {/* SUBTAB 0: CINEMATIC HERO VIDEO & VISUALS (THE AGENCY RE) */}
        {activeSubTab === 'hero_video' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{
              background: 'rgba(13, 72, 161, 0.05)',
              border: '1px solid rgba(13, 72, 161, 0.15)',
              borderRadius: '14px',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div>
                <strong style={{ display: 'block', fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
                  {isAr ? 'تفعيل خلفية الفيديو السينمائي في الواجهة الرئيسية' : 'Enable Cinematic Background Video'}
                </strong>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  {isAr 
                    ? 'عند تفعيله، سيتم تشغيل لقطات فيديو معمارية راقية بالخلفية مستوحاة من The Agency RE.' 
                    : 'Display full luxury video loop behind the hero section.'}
                </span>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 800 }}>
                <input
                  type="checkbox"
                  checked={formData.heroVideoEnabled !== false}
                  onChange={(e) => setFormData({ ...formData, heroVideoEnabled: e.target.checked })}
                  style={{ width: '20px', height: '20px', accentColor: '#0d48a1' }}
                />
                <span>{formData.heroVideoEnabled !== false ? (isAr ? 'مفعّل 🟢' : 'Enabled') : (isAr ? 'معطّل ⚪' : 'Disabled')}</span>
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
              <div className="form-group-item" style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{isAr ? 'رابط ملف الفيديو (MP4 / WebM Direct URL):' : 'Hero Video URL:'}</span>
                  <small style={{ color: 'var(--accent-gold)' }}>{isAr ? 'فيديو مباشر عالي الوضوح' : 'HD direct stream'}</small>
                </label>
                <input
                  type="url"
                  value={formData.heroVideoUrl || ''}
                  onChange={(e) => setFormData({ ...formData, heroVideoUrl: e.target.value })}
                  placeholder="https://assets.mixkit.co/videos/preview/..."
                  required
                />
                {/* Presets */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{isAr ? 'مقترحات جاهزة:' : 'Presets:'}</span>
                  <button
                    type="button"
                    className="btn btn-xs btn-ghost"
                    onClick={() => setFormData({
                      ...formData,
                      heroVideoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-modern-architecture-buildings-and-skyscrapers-41551-large.mp4'
                    })}
                  >
                    🏢 {isAr ? 'أبراج معمارية حديثة' : 'Modern Architecture'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-xs btn-ghost"
                    onClick={() => setFormData({
                      ...formData,
                      heroVideoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-aerial-view-of-a-luxury-pool-resort-41553-large.mp4'
                    })}
                  >
                    🏡 {isAr ? 'منتجع وقصور فاخرة' : 'Luxury Resort'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-xs btn-ghost"
                    onClick={() => setFormData({
                      ...formData,
                      heroVideoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-drone-view-of-a-modern-residential-neighborhood-41555-large.mp4'
                    })}
                  >
                    🏘️ {isAr ? 'حي سكني راقٍ دروني' : 'Drone Neighborhood'}
                  </button>
                </div>
              </div>

              <div className="form-group-item" style={{ gridColumn: '1 / -1' }}>
                <label>{isAr ? 'رابط صورة البوستر البديلة (Fallback Poster Image):' : 'Fallback Poster Image URL:'}</label>
                <input
                  type="url"
                  value={formData.heroPosterUrl || ''}
                  onChange={(e) => setFormData({ ...formData, heroPosterUrl: e.target.value })}
                  placeholder="https://images.unsplash.com/photo-..."
                />
                <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                  {isAr ? 'تظهر في أول أجزاء من الثانية لضمان سرعة التحميل أو على الأجهزة التي تعطل تشغيل الفيديو التلقائي.' : 'Shown before video loads or on power-save devices.'}
                </small>
              </div>

              {/* Overlay Opacity Slider */}
              <div className="form-group-item" style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{isAr ? 'نسبة تعتيم التظليل الملكي (Dark Vignette Opacity):' : 'Dark Overlay Opacity:'}</span>
                  <strong style={{ color: 'var(--accent-gold)' }}>
                    {Math.round((Number(formData.heroOverlayOpacity ?? 0.65)) * 100)}%
                  </strong>
                </label>
                <input
                  type="range"
                  min="0.20"
                  max="0.85"
                  step="0.05"
                  value={formData.heroOverlayOpacity ?? 0.65}
                  onChange={(e) => setFormData({ ...formData, heroOverlayOpacity: parseFloat(e.target.value) })}
                  style={{ width: '100%', cursor: 'pointer', accentColor: '#0d48a1' }}
                />
                <small style={{ color: 'var(--text-muted)' }}>
                  {isAr ? 'زيادة النسبة تزيد من سواد وظلمة الفيديو لجعل النصوص البيضاء مقروءة وواضحة جداً.' : 'Higher opacity guarantees crisp text readability over bright footage.'}
                </small>
              </div>

              {/* Slogan and Highlight Titles */}
              <div className="form-group-item">
                <label>{isAr ? 'شارة الهيرو العليا (بالعربية):' : 'Hero Badge (Arabic):'}</label>
                <input
                  type="text"
                  value={formData.heroBadge_ar || ''}
                  onChange={(e) => setFormData({ ...formData, heroBadge_ar: e.target.value })}
                />
              </div>

              <div className="form-group-item">
                <label>{isAr ? 'شارة الهيرو العليا (بالإنجليزية):' : 'Hero Badge (English):'}</label>
                <input
                  type="text"
                  value={formData.heroBadge_en || ''}
                  onChange={(e) => setFormData({ ...formData, heroBadge_en: e.target.value })}
                />
              </div>

              <div className="form-group-item">
                <label>{isAr ? 'العنوان الرئيسي السطر الأول (بالعربية):' : 'Main Title Line 1 (Arabic):'}</label>
                <input
                  type="text"
                  value={formData.heroTitle_ar || ''}
                  onChange={(e) => setFormData({ ...formData, heroTitle_ar: e.target.value })}
                />
              </div>

              <div className="form-group-item">
                <label>{isAr ? 'العبارة الذهبية المميزة (بالعربية):' : 'Golden Highlight (Arabic):'}</label>
                <input
                  type="text"
                  value={formData.heroHighlight_ar || ''}
                  onChange={(e) => setFormData({ ...formData, heroHighlight_ar: e.target.value })}
                />
              </div>

              <div className="form-group-item" style={{ gridColumn: '1 / -1' }}>
                <label>{isAr ? 'النص الوصفي للهيرو (بالعربية):' : 'Hero Subtitle (Arabic):'}</label>
                <textarea
                  rows={2}
                  value={formData.heroSubtitle_ar || ''}
                  onChange={(e) => setFormData({ ...formData, heroSubtitle_ar: e.target.value })}
                />
              </div>
            </div>
          </div>
        )}

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

        {/* SUBTAB 5: 4 GOLDEN STANDARDS */}
        {activeSubTab === 'gold_standards' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{
              background: 'rgba(217, 119, 6, 0.08)',
              border: '1px solid rgba(217, 119, 6, 0.25)',
              padding: '16px',
              borderRadius: 'var(--radius-md)'
            }}>
              <h4 style={{ margin: '0 0 8px 0', color: 'var(--accent-gold)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Award size={18} />
                <span>{isAr ? 'معايير الأمان الأربعة المعتمدة في 1Line (الصفحة الرئيسية)' : 'The 4 1Line Golden Standards (Homepage)'}</span>
              </h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {isAr
                  ? 'هذا القسم يظهر في الصفحة الرئيسية لبناء أعلى درجات الموثوقية والمصداقية مع المستثمرين والمشترين ومغتربي الخليج. يمكنك تعديل العناوين، الشروحات، والأرقام لكل معيار وسيتم التحديث فوراً في الموقع.'
                  : 'This section appears on the homepage to instill institutional trust with buyers and Gulf expats. Modify titles, descriptions, and badges directly.'}
              </p>
            </div>

            {/* Section Main Titles */}
            <div className="form-grid-2">
              <div className="form-group-item">
                <label>{isAr ? 'عنوان القسم الرئيسي (بالعربي):' : 'Section Main Title (AR):'}</label>
                <input
                  type="text"
                  value={formData.goldStandardsTitle_ar || ''}
                  onChange={(e) => setFormData({ ...formData, goldStandardsTitle_ar: e.target.value })}
                  placeholder="معايير الأمان الأربعة المعتمدة في 1Line"
                />
              </div>

              <div className="form-group-item">
                <label>{isAr ? 'عنوان القسم (بالإنجليزي):' : 'Section Main Title (EN):'}</label>
                <input
                  type="text"
                  value={formData.goldStandardsTitle_en || ''}
                  onChange={(e) => setFormData({ ...formData, goldStandardsTitle_en: e.target.value })}
                  placeholder="The 4 1Line Golden Standards"
                />
              </div>
            </div>

            <div className="form-grid-2">
              <div className="form-group-item">
                <label>{isAr ? 'الوصف التعريفي للقسم (بالعربي):' : 'Section Subtitle / Description (AR):'}</label>
                <input
                  type="text"
                  value={formData.goldStandardsDesc_ar || ''}
                  onChange={(e) => setFormData({ ...formData, goldStandardsDesc_ar: e.target.value })}
                  placeholder="لماذا يأتمننا مئات المستثمرين والأسر بسوهاج ومغتربي الخليج..."
                />
              </div>

              <div className="form-group-item">
                <label>{isAr ? 'الوصف التعريفي للقسم (بالإنجليزي):' : 'Section Subtitle / Description (EN):'}</label>
                <input
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
                  background: 'var(--bg-card, rgba(255,255,255,0.03))',
                  border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px', flexWrap: 'wrap', gap: '10px' }}>
                    <h4 style={{ margin: 0, color: 'var(--accent-gold)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ 
                        background: 'rgba(217, 119, 6, 0.15)', 
                        color: 'var(--accent-gold)', 
                        padding: '2px 8px', 
                        borderRadius: '4px',
                        fontSize: '0.85rem',
                        fontWeight: 'bold'
                      }}>
                        #{std.number || `0${idx + 1}`}
                      </span>
                      <span>{isAr ? `المعيار ${idx + 1}:` : `Standard ${idx + 1}:`} {std.title_ar}</span>
                    </h4>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {isAr ? 'الأيقونة:' : 'Icon:'}
                      </label>
                      <select
                        value={std.icon || 'ShieldCheck'}
                        onChange={(e) => handleGoldStandardChange(idx, 'icon', e.target.value)}
                        style={{ padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', background: 'var(--bg-input, #1e293b)', color: '#fff', border: '1px solid var(--border-light)' }}
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
                      <label>{isAr ? 'رقم المعيار:' : 'Number badge:'}</label>
                      <input
                        type="text"
                        value={std.number || ''}
                        onChange={(e) => handleGoldStandardChange(idx, 'number', e.target.value)}
                        placeholder="01"
                      />
                    </div>

                    <div className="form-group-item">
                      <label>{isAr ? 'شارة الاعتماد (بالعربي):' : 'Badge (AR):'}</label>
                      <input
                        type="text"
                        value={std.badge_ar || ''}
                        onChange={(e) => handleGoldStandardChange(idx, 'badge_ar', e.target.value)}
                        placeholder="ضمان مؤسسي معتمد"
                      />
                    </div>

                    <div className="form-group-item">
                      <label>{isAr ? 'شارة الاعتماد (بالإنجليزي):' : 'Badge (EN):'}</label>
                      <input
                        type="text"
                        value={std.badge_en || ''}
                        onChange={(e) => handleGoldStandardChange(idx, 'badge_en', e.target.value)}
                        placeholder="Guaranteed Standard"
                      />
                    </div>
                  </div>

                  <div className="form-grid-2" style={{ marginBottom: '12px' }}>
                    <div className="form-group-item">
                      <label>{isAr ? 'عنوان المعيار (بالعربي):' : 'Title (Arabic):'}</label>
                      <input
                        type="text"
                        value={std.title_ar || ''}
                        onChange={(e) => handleGoldStandardChange(idx, 'title_ar', e.target.value)}
                        placeholder="التدقيق القانوني الصارم 100%"
                      />
                    </div>

                    <div className="form-group-item">
                      <label>{isAr ? 'عنوان المعيار (بالإنجليزي):' : 'Title (English):'}</label>
                      <input
                        type="text"
                        value={std.title_en || ''}
                        onChange={(e) => handleGoldStandardChange(idx, 'title_en', e.target.value)}
                        placeholder="100% Verified Legal Audit"
                      />
                    </div>
                  </div>

                  <div className="form-grid-2">
                    <div className="form-group-item">
                      <label>{isAr ? 'نص الشرح والضمان (بالعربي):' : 'Description (Arabic):'}</label>
                      <textarea
                        rows={3}
                        style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', background: 'rgba(0,0,0,0.25)', color: '#fff', border: '1px solid var(--border-light)', fontSize: '0.85rem' }}
                        value={std.desc_ar || ''}
                        onChange={(e) => handleGoldStandardChange(idx, 'desc_ar', e.target.value)}
                      />
                    </div>

                    <div className="form-group-item">
                      <label>{isAr ? 'نص الشرح والضمان (بالإنجليزي):' : 'Description (English):'}</label>
                      <textarea
                        rows={3}
                        style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', background: 'rgba(0,0,0,0.25)', color: '#fff', border: '1px solid var(--border-light)', fontSize: '0.85rem' }}
                        value={std.desc_en || ''}
                        onChange={(e) => handleGoldStandardChange(idx, 'desc_en', e.target.value)}
                      />
                    </div>
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
