import { AREA_OPTIONS, PROP_TYPE_OPTIONS } from '../DemandsManagerPanelData';
import { X, Edit3, Sparkles } from 'lucide-react';

export default function DemandFormModal({
  editingDemand,
  formData,
  handleSaveForm,
  isAr,
  setFormData,
  setShowAddModal
}) {
  return (
    <div className="track-modal-backdrop" onClick={() => setShowAddModal(false)} style={{ zIndex: 1200 }}>
      <div 
        className="track-modal-card" 
        onClick={(e) => e.stopPropagation()} 
        style={{ 
          maxWidth: '650px', 
          width: '95%', 
          maxHeight: '90vh', 
          overflowY: 'auto',
          borderRadius: '20px',
          border: '1px solid var(--crm-accent)'
        }}
      >
        <button type="button" className="modal-close-btn" onClick={() => setShowAddModal(false)}>
          <X size={20} />
        </button>

        <div className="track-modal-header" style={{ marginBottom: '18px' }}>
          <div className="track-icon-wrap" style={{ background: 'linear-gradient(135deg, var(--crm-warn-solid), var(--crm-warn-solid))' }}>
            <Edit3 size={20} style={{ color: 'var(--crm-on-dark)' }} />
          </div>
          <h3>
            {editingDemand 
              ? (isAr ? 'تعديل وتدقيق طلب المشتري' : 'Edit & Refine Buyer Demand')
              : (isAr ? 'إضافة طلب شراء عقاري جديد (من الإدارة)' : 'Add Direct Buyer Demand')}
          </h3>
          <p>
            {isAr 
              ? 'قم بضبط النص والميزانية والمنطقة بدقة قبل النشر العام في الموقع.' 
              : 'Refine demand details before publishing to public portal.'}
          </p>
        </div>

        <form onSubmit={handleSaveForm} className="booking-form-wrap" style={{ gap: '14px' }}>
          {/* Arabic Description */}
          <div className="form-group-item">
            <label>{isAr ? 'نص الطلب باللغة العربية (الظاهر للجمهور) *' : 'Arabic Demand Text (Public) *'}</label>
            <textarea
              rows={3}
              required
              placeholder={isAr ? 'مثال: مطلوب شقة سكنية 160 متر في منطقة شرق سوهاج بميزانية 3.2 مليون كاش - استلام فوري.' : 'e.g. Wanted: 160 sqm apartment...'}
              value={formData.text_ar}
              onChange={(e) => setFormData({ ...formData, text_ar: e.target.value })}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: 'var(--crm-ink)',
                fontSize: 'var(--crm-text-base)'
              }}
            />
          </div>

          {/* English Description */}
          <div className="form-group-item">
            <label>{isAr ? 'نص الطلب باللغة الإنجليزية (اختياري)' : 'English Demand Text (Optional)'}</label>
            <textarea
              rows={2}
              placeholder="e.g. Wanted: 160 sqm residential apartment in East Sohag, budget 3.2M EGP Cash..."
              value={formData.text_en}
              onChange={(e) => setFormData({ ...formData, text_en: e.target.value })}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: 'var(--crm-ink)',
                fontSize: 'var(--crm-text-base)',
                direction: 'ltr',
                textAlign: 'left'
              }}
            />
          </div>

          {/* Type & Area */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group-item">
              <label>{isAr ? 'نوع العقار' : 'Property Type'}</label>
              <select
                value={formData.type}
                aria-label={isAr ? 'نوع العقار' : 'Property type'}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              >
                {PROP_TYPE_OPTIONS.map(t => (
                  <option key={t.value} value={t.value}>{isAr ? t.label_ar : t.label_en}</option>
                ))}
              </select>
            </div>

            <div className="form-group-item">
              <label>{isAr ? 'المنطقة' : 'District'}</label>
              <select
                value={formData.area}
                aria-label={isAr ? 'المنطقة' : 'Area'}
                onChange={(e) => setFormData({ ...formData, area: e.target.value })}
              >
                {AREA_OPTIONS.map(a => (
                  <option key={a.value} value={a.value}>{isAr ? a.label_ar : a.label_en}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Budget & Urgency */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group-item">
              <label>{isAr ? 'الميزانية (جنيه مصري)' : 'Budget (EGP)'} *</label>
              <input
                type="number"
                required
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                step="50000"
              />
            </div>

            <div className="form-group-item">
              <label>{isAr ? 'درجة الجدية / الاستعجال' : 'Urgency'}</label>
              <select
                value={formData.urgency}
                aria-label={isAr ? 'درجة الاستعجال' : 'Urgency'}
                onChange={(e) => setFormData({ ...formData, urgency: e.target.value })}
              >
                <option value="high">{isAr ? 'مستعجل كاش (عالي الأولوية)' : 'Urgent Cash'}</option>
                <option value="medium">{isAr ? 'طلب جاد (عادي)' : 'Serious Buyer'}</option>
                <option value="low">{isAr ? 'شراء مستقبلي / فرصة' : 'Low / Opportunity'}</option>
              </select>
            </div>
          </div>

          {/* Publishing Status */}
          <div className="form-group-item">
            <label>{isAr ? 'حالة النشر والظهور على الموقع' : 'Listing Status'}</label>
            <select
              value={formData.status}
              aria-label={isAr ? 'حالة الطلب' : 'Status'}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              style={{ fontWeight: 'bold' }}
            >
              <option value="published">{isAr ? '✅ معتمد ومنشور مباشرة على الموقع' : 'Published / Live'}</option>
              <option value="pending">{isAr ? '⏳ قيد المراجعة (غير ظاهر للجمهور)' : 'Pending Review'}</option>
              <option value="archived">{isAr ? '📁 مؤرشف / تم إغلاق الصفقة' : 'Archived / Closed'}</option>
            </select>
          </div>

          {/* Optional Client Details */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '10px', marginTop: '4px' }}>
            <small style={{ color: 'var(--crm-accent-text)', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>
              {isAr ? 'بيانات المشتري (خاصة للإدارة فقط)' : 'Confidential Buyer Contact Info (Admin Only)'}
            </small>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group-item">
                <label>{isAr ? 'اسم العميل' : 'Client Name'}</label>
                <input
                  type="text"
                  placeholder={isAr ? 'اسم العميل' : 'Name'}
                  value={formData.clientName || ''}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                />
              </div>
              <div className="form-group-item">
                <label>{isAr ? 'رقم الهاتف' : 'Phone'}</label>
                <input
                  type="text"
                  placeholder="010XXXXXXXX"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '12px', fontWeight: 'bold' }}>
              <Sparkles size={16} />
              <span>{editingDemand ? (isAr ? 'حفظ التعديلات' : 'Save Changes') : (isAr ? 'نشر الطلب الآن' : 'Publish Demand')}</span>
            </button>
            <button type="button" className="btn btn-outline" onClick={() => setShowAddModal(false)}>
              <span>{isAr ? 'إلغاء' : 'Cancel'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>

  );
}
