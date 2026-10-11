import { Plus, Edit3, Save, X } from 'lucide-react';

export default function AreaFormModal({
  formData,
  handleSubmitForm,
  isAr,
  isSaving,
  modalMode,
  setFormData,
  setModalMode,
  groups = []
}) {
  const inputStyle = {
    width: '100%',
    background: 'rgba(0, 0, 0, 0.4)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    padding: '10px 12px',
    borderRadius: '8px',
    color: 'var(--crm-on-dark)',
    fontSize: 'var(--crm-text-base)'
  };
  const labelStyle = { display: 'block', fontSize: 'var(--crm-text-sm)', color: 'var(--crm-on-dark-muted)', marginBottom: '6px' };
  const cityGroup = groups.find((c) => c.key === String(formData.city_ar || '').trim());
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
          {/* Where the district sits: city → sector (optional) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '6px' }}>
            <div className="form-group-item">
              <label htmlFor="area-city" style={labelStyle}>{isAr ? 'المدينة *' : 'City *'}</label>
              <input
                id="area-city"
                type="text"
                required
                list="area-city-options"
                placeholder={isAr ? 'سوهاج، 6 أكتوبر، الشيخ زايد…' : 'Sohag, 6th of October…'}
                value={formData.city_ar}
                onChange={(e) => setFormData({ ...formData, city_ar: e.target.value })}
                style={inputStyle}
              />
              <datalist id="area-city-options">
                {groups.map((c) => <option key={c.key} value={c.ar} />)}
              </datalist>
            </div>
            <div className="form-group-item">
              <label htmlFor="area-sector" style={labelStyle}>{isAr ? 'القطاع (اختياري)' : 'Sector (optional)'}</label>
              <input
                id="area-sector"
                type="text"
                list="area-sector-options"
                placeholder={isAr ? 'غرب النيل، شرق النيل…' : 'West Nile, East Nile…'}
                value={formData.sector_ar}
                onChange={(e) => setFormData({ ...formData, sector_ar: e.target.value })}
                style={inputStyle}
              />
              <datalist id="area-sector-options">
                {(cityGroup?.sectors || []).filter((x) => x.key).map((x) => <option key={x.key} value={x.ar} />)}
              </datalist>
            </div>
          </div>
          <small style={{ color: 'var(--crm-faint)', fontSize: 'var(--crm-text-xs)', display: 'block', marginBottom: '14px' }}>
            {isAr
              ? 'الحي هو المكان اللي العميل بيدوّر بيه وليه سعر مختلف. الشارع مش حي: لو العقار على شارع رئيسي اكتبها في مميزات العقار.'
              : 'A district is a place buyers search by, with its own prices. A street is not a district.'}
          </small>

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

          {/* Fallback price per m²: listings in the district take over once there are enough */}
          <div className="form-group-item" style={{ marginBottom: '14px' }}>
            <label htmlFor="area-price" style={labelStyle}>
              {isAr ? 'سعر المتر المرجعي (ج.م/م²) *' : 'Reference price/m² (EGP) *'}
            </label>
            <input
              id="area-price"
              type="number"
              min="1000"
              step="500"
              placeholder="15000"
              value={formData.avgPricePerMeter}
              onChange={(e) => setFormData({ ...formData, avgPricePerMeter: e.target.value })}
              style={{ ...inputStyle, border: '1px solid rgba(217, 119, 6, 0.4)', color: 'var(--crm-gold-on-dark)', fontWeight: 'bold' }}
            />
            <small style={{ color: 'var(--crm-faint)', fontSize: 'var(--crm-text-xs)', display: 'block', marginTop: '4px' }}>
              {isAr
                ? 'رقم احتياطي: صفحة أسعار المتر والتقييم بيحسبوا من العروض المنشورة في الحي لما يبقى فيه 3 عروض أو أكتر.'
                : 'Fallback only: market figures use the district’s own listings once there are 3 or more.'}
            </small>
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
