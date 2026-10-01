import { Plus, Edit3, Save, X } from 'lucide-react';

export default function AreaFormModal({
  formData,
  handleSubmitForm,
  isAr,
  isSaving,
  modalMode,
  setFormData,
  setModalMode
}) {
  return (
    <div className="crm-modal-backdrop" onClick={() => !isSaving && setModalMode(null)}>
      <div className="crm-modal-card" role="dialog" aria-modal="true" aria-labelledby="area-modal-title" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ 
              background: 'linear-gradient(135deg, rgba(217, 119, 6, 0.2), rgba(180, 83, 9, 0.4))', 
              padding: '8px', 
              borderRadius: '10px', 
              color: 'var(--crm-gold-on-dark)' 
            }}>
              {modalMode === 'add' ? <Plus size={20} /> : <Edit3 size={20} />}
            </div>
            <div>
              <h3 id="area-modal-title" style={{ margin: 0, fontSize: 'var(--crm-text-lg)', color: 'var(--crm-on-dark)' }}>
                {modalMode === 'add' ? (isAr ? 'إضافة حي أو منطقة جديدة' : 'Add New District') : (isAr ? 'تعديل بيانات المنطقة' : 'Edit District')}
              </h3>
              <small style={{ color: 'var(--crm-faint)' }}>
                {isAr ? 'تحديث ونشر فوري على كافة فلاتر ومعالجات الموقع' : 'Instant live update across platform'}
              </small>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setModalMode(null)}
            aria-label={isAr ? 'إغلاق' : 'Close'}
            style={{ background: 'transparent', border: 'none', color: 'var(--crm-faint)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmitForm}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div className="form-group-item">
              <label style={{ display: 'block', fontSize: 'var(--crm-text-sm)', color: 'var(--crm-on-dark-muted)', marginBottom: '6px' }}>
                {isAr ? 'اسم الحي / المنطقة (عربي) *' : 'District Name (Arabic) *'}
              </label>
              <input
                type="text"
                required
                placeholder="مثال: طهطا أو حي السلام"
                value={formData.name_ar}
                onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                style={{
                  width: '100%',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  color: 'var(--crm-on-dark)',
                  fontSize: 'var(--crm-text-base)'
                }}
              />
            </div>

            <div className="form-group-item">
              <label style={{ display: 'block', fontSize: 'var(--crm-text-sm)', color: 'var(--crm-on-dark-muted)', marginBottom: '6px' }}>
                {isAr ? 'الاسم بالإنجليزية' : 'District Name (English)'}
              </label>
              <input
                type="text"
                placeholder="e.g. Tahta or Al Salam"
                dir="ltr"
                value={formData.name_en}
                onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                style={{
                  width: '100%',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  color: 'var(--crm-on-dark)',
                  fontSize: 'var(--crm-text-base)'
                }}
              />
            </div>
          </div>

          {/* Detailed Label for Dropdowns */}
          <div className="form-group-item" style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: 'var(--crm-text-sm)', color: 'var(--crm-on-dark-muted)', marginBottom: '6px' }}>
              {isAr ? 'التسمية التوضيحية في القوائم المنسدلة والمعالم (عربي)' : 'Dropdown Label & Landmarks'}
            </label>
            <input
              type="text"
              placeholder="مثال: طهطا (شارع المحطة ووسط المدينة والتجاري)"
              value={formData.label_ar}
              onChange={(e) => setFormData({ ...formData, label_ar: e.target.value })}
              style={{
                width: '100%',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                padding: '10px 12px',
                borderRadius: '8px',
                color: 'var(--crm-on-dark)',
                fontSize: 'var(--crm-text-base)'
              }}
            />
          </div>

          {/* Coordinates: Lat & Lng */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div className="form-group-item">
              <label style={{ display: 'block', fontSize: 'var(--crm-text-sm)', color: 'var(--crm-on-dark-muted)', marginBottom: '6px' }}>
                {isAr ? 'خط العرض' : 'Latitude'}
              </label>
              <input
                type="number"
                step="0.0001"
                value={formData.lat}
                onChange={(e) => setFormData({ ...formData, lat: e.target.value })}
                style={{
                  width: '100%',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  color: 'var(--crm-on-dark)',
                  fontSize: 'var(--crm-text-base)'
                }}
              />
            </div>

            <div className="form-group-item">
              <label style={{ display: 'block', fontSize: 'var(--crm-text-sm)', color: 'var(--crm-on-dark-muted)', marginBottom: '6px' }}>
                {isAr ? 'خط الطول' : 'Longitude'}
              </label>
              <input
                type="number"
                step="0.0001"
                value={formData.lng}
                onChange={(e) => setFormData({ ...formData, lng: e.target.value })}
                style={{
                  width: '100%',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  color: 'var(--crm-on-dark)',
                  fontSize: 'var(--crm-text-base)'
                }}
              />
            </div>
          </div>

          {/* Market Benchmark: Avg Price Per Meter & Growth Rate */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div className="form-group-item">
              <label style={{ display: 'block', fontSize: 'var(--crm-text-sm)', color: 'var(--crm-on-dark-muted)', marginBottom: '6px' }}>
                {isAr ? 'متوسط سعر المتر (ج.م/م²) *' : 'Avg Price/m² (EGP) *'}
              </label>
              <input
                type="number"
                min="1000"
                step="500"
                placeholder="15000"
                value={formData.avgPricePerMeter}
                onChange={(e) => setFormData({ ...formData, avgPricePerMeter: e.target.value })}
                style={{
                  width: '100%',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(217, 119, 6, 0.4)',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  color: 'var(--crm-gold-on-dark)',
                  fontWeight: 'bold',
                  fontSize: 'var(--crm-text-base)'
                }}
              />
              <small style={{ color: 'var(--crm-faint)', fontSize: 'var(--crm-text-xs)', display: 'block', marginTop: '4px' }}>
                {isAr ? 'يحدد معيار عدالة الأسعار التلقائي للحي' : 'Sets valuation benchmark for district'}
              </small>
            </div>

            <div className="form-group-item">
              <label style={{ display: 'block', fontSize: 'var(--crm-text-sm)', color: 'var(--crm-on-dark-muted)', marginBottom: '6px' }}>
                {isAr ? 'مؤشر النمو التراكمي للأسعار (%)' : 'Capital Growth Rate (%)'}
              </label>
              <input
                type="number"
                min="0"
                max="500"
                placeholder="75"
                value={formData.annualGrowthRate}
                onChange={(e) => setFormData({ ...formData, annualGrowthRate: e.target.value })}
                style={{
                  width: '100%',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  color: 'var(--crm-positive)',
                  fontWeight: 'bold',
                  fontSize: 'var(--crm-text-base)'
                }}
              />
              <small style={{ color: 'var(--crm-faint)', fontSize: 'var(--crm-text-xs)', display: 'block', marginTop: '4px' }}>
                {isAr ? 'النسبة المعروضة على الرسم البياني' : 'Displayed in historical growth chart'}
              </small>
            </div>
          </div>

          {/* Description */}
          <div className="form-group-item" style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: 'var(--crm-text-sm)', color: 'var(--crm-on-dark-muted)', marginBottom: '6px' }}>
              {isAr ? 'نبذة مختصرة عن الحي / المنطقة' : 'Short Description'}
            </label>
            <textarea
              rows="2"
              placeholder="وصف مختصر لمزايا الحي أو النشاط التجاري والسكن به..."
              value={formData.description_ar}
              onChange={(e) => setFormData({ ...formData, description_ar: e.target.value })}
              style={{
                width: '100%',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                padding: '10px 12px',
                borderRadius: '8px',
                color: 'var(--crm-on-dark)',
                fontSize: 'var(--crm-text-base)',
                resize: 'none'
              }}
            />
          </div>

          {/* Modal Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setModalMode(null)}
              disabled={isSaving}
              style={{ padding: '10px 18px', color: 'var(--crm-on-dark-muted)' }}
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSaving}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'linear-gradient(135deg, var(--crm-warn-solid), var(--crm-warn-solid))',
                padding: '10px 22px',
                borderRadius: '10px',
                fontWeight: 'bold',
                color: 'var(--crm-on-dark)'
              }}
            >
              <Save size={16} />
              <span>{isSaving ? (isAr ? 'جاري النشر السحابي...' : 'Saving...') : (isAr ? 'حفظ ونشر الحي فوراً' : 'Save & Publish')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>

  );
}
