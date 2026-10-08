import { Plus, Sparkles, Image as ImageIcon, Save, Upload, Star, MapPin, Loader2 } from 'lucide-react';
import { PROPERTY_TYPES } from '../../data/propertiesData';
import { toDayInput, addDays } from '../../utils/featuredSlots';
import PropertyExtrasEditor from './PropertyExtrasEditor';

export default function PropertyFormModal({
  areas,
  badgePresets,
  editingPropertyId,
  form,
  handleAddCustomAmenity,
  handleDragLeave,
  handleDragOver,
  handleDrop,
  handleFileUpload,
  handleRemoveCustomAmenity,
  handleRemoveImage,
  handleSetPrimaryImage,
  handleSubmit,
  handleUpdateCustomAmenity,
  isAr,
  isDraggingOver,
  isUploadingImages,
  setForm,
  setShowAddModal,
  setShowMapPicker,
  uploadProgressText
}) {
  return (
    <div className="track-modal-backdrop" onClick={() => setShowAddModal(false)}>
      <div className="property-form-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '780px' }}>
        <div className="modal-form-header">
          <h3>{editingPropertyId ? (isAr ? 'تعديل بيانات العقار ومستوى العرض' : 'Edit Property & Display Settings') : (isAr ? 'إضافة عقار جديد للمنصة' : 'Add New Property')}</h3>
          <button type="button" className="drawer-close-btn" onClick={() => setShowAddModal(false)}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="property-cms-form">
          {/* Photo Upload Section */}
          <div className="cms-image-uploader-box">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label className="uploader-title" style={{ margin: 0 }}>
                <ImageIcon size={18} />
                <span>{isAr ? 'صور العقار (رفع من الموبايل أو الكمبيوتر)' : 'Property Photos (Direct Device Upload)'}</span>
              </label>
              <span style={{ fontSize: 'var(--crm-text-sm)', color: 'var(--crm-muted)' }}>
                {form.images.length} {isAr ? 'صور مرفوعة' : 'photos'}
              </span>
            </div>

            <div 
              className={`uploader-dropzone ${isDraggingOver ? 'dropzone-active' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              style={{
                border: isDraggingOver ? '2px dashed var(--crm-accent)' : '2px dashed var(--border-light)',
                background: isDraggingOver ? 'rgba(217, 119, 6, 0.08)' : 'var(--bg-slate)',
                transition: 'all 0.2s ease'
              }}
            >
              <input
                type="file"
                multiple
                accept="image/*"
                id="property-images-file-input"
                onChange={handleFileUpload}
                className="hidden-file-input"
                disabled={isUploadingImages}
              />
              <label htmlFor="property-images-file-input" className="dropzone-label" style={{ cursor: isUploadingImages ? 'wait' : 'pointer' }}>
                {isUploadingImages ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '12px 0' }}>
                    <Loader2 size={30} className="spin-animation" style={{ color: 'var(--crm-accent-text)' }} />
                    <span style={{ fontWeight: 'bold', color: 'var(--crm-accent-text)' }}>{uploadProgressText}</span>
                  </div>
                ) : (
                  <>
                    <Upload size={26} className="text-primary" />
                    <span>{isAr ? 'اسحب الصور وأفلتها هنا، أو انقر للاختيار' : 'Drag & drop photos here, or click to browse'}</span>
                    <small>{isAr ? 'ضغط تلقائي فائق السرعة • JPG, PNG, WebP حتى 15MB' : 'Instant smart compression • JPG, PNG, WebP up to 15MB'}</small>
                  </>
                )}
              </label>
            </div>

            {/* Previews & Primary Cover Manager */}
            {form.images.length > 0 && (
              <div className="uploaded-thumbs-grid" style={{ marginTop: '14px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px' }}>
                {form.images.map((imgSrc, idx) => (
                  <div 
                    key={idx} 
                    className="thumb-preview-item"
                    style={{
                      position: 'relative',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      border: idx === 0 ? '2px solid var(--crm-accent)' : '1px solid var(--border-light)',
                      boxShadow: idx === 0 ? '0 0 10px rgba(217, 119, 6, 0.3)' : 'none',
                      background: 'var(--crm-card)'
                    }}
                  >
                    <img 
                      src={imgSrc} 
                      alt={`Unit Photo ${idx + 1}`} 
                      style={{ width: '100%', height: '90px', objectFit: 'cover', display: 'block' }}
                    />

                    {/* Primary Badge or Make Primary Button */}
                    {idx === 0 ? (
                      <span style={{
                        position: 'absolute',
                        bottom: '4px',
                        right: '4px',
                        left: '4px',
                        background: 'rgba(15, 23, 42, 0.85)',
                        color: 'var(--crm-gold-on-dark)',
                        fontSize: 'var(--crm-text-xs)',
                        fontWeight: 'bold',
                        padding: '2px 4px',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px'
                      }}>
                        <Star size={11} fill="currentColor" />
                        {isAr ? 'الغلاف الرئيسي' : 'Cover Photo'}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSetPrimaryImage(idx)}
                        style={{
                          position: 'absolute',
                          bottom: '4px',
                          right: '4px',
                          left: '4px',
                          background: 'rgba(0, 0, 0, 0.7)',
                          color: 'var(--crm-on-dark)',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: 'var(--crm-text-xs)',
                          padding: '2px 4px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                          transition: 'background 0.2s'
                        }}
                        title={isAr ? 'تعيين هذه الصورة كغلاف رئيسي للعقار' : 'Set as primary cover'}
                      >
                        <Star size={10} />
                        {isAr ? 'اجعلها غلاف' : 'Make Cover'}
                      </button>
                    )}

                    {/* Delete Button */}
                    <button
                      type="button"
                      className="btn-del-thumb"
                      onClick={() => handleRemoveImage(idx)}
                      title={isAr ? 'إزالة الصورة' : 'Remove'}
                      style={{
                        position: 'absolute',
                        top: '4px',
                        left: '4px',
                        background: 'rgba(239, 68, 68, 0.9)',
                        color: 'var(--crm-on-dark)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '22px',
                        height: '22px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        fontSize: 'var(--crm-text-xs)'
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 🎛️ Display Status, Featured & Priority Controls */}
          <div style={{ 
            background: 'rgba(255, 179, 0, 0.05)', 
            border: '1px solid var(--crm-accent)', 
            borderRadius: 'var(--radius-md)', 
            padding: '16px', 
            marginBottom: '20px' 
          }}>
            <h4 style={{ fontSize: 'var(--crm-text-base)', marginBottom: '12px', color: 'var(--crm-accent-text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={16} />
              {isAr ? 'إعدادات العرض والأولوية والتسويق' : 'Display Priority & Marketing Settings'}
            </h4>

            <div className="cms-form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              {/* Status Dropdown */}
              <div className="form-group-item">
                <label>{isAr ? 'حالة النشر والعرض *' : 'Publishing Status *'}</label>
                <select
                  value={form.status || 'published'}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  style={{ fontWeight: 'bold' }}
                >
                  <option value="published">🟢 {isAr ? 'منشور ونشط على الموقع' : 'Published Live'}</option>
                  <option value="hidden">⚪ {isAr ? 'مخفي مؤقتاً (مسودة)' : 'Hidden / Draft'}</option>
                  <option value="under_negotiation">🟡 {isAr ? 'تحت التفاوض / حجز مبدئي' : 'Under Negotiation'}</option>
                  <option value="sold">🔴 {isAr ? 'تم البيع بنجاح' : 'Sold'}</option>
                </select>
              </div>

              {/* Badge Preset Dropdown */}
              <div className="form-group-item">
                <label>{isAr ? 'شارة الترويج' : 'Marketing Badge'}</label>
                <select
                  value={form.badge_ar || ''}
                  onChange={(e) => {
                    const preset = badgePresets.find(p => p.ar === e.target.value);
                    setForm({
                      ...form,
                      badge_ar: e.target.value,
                      badge_en: preset ? preset.en : e.target.value
                    });
                  }}
                >
                  <option value="">{isAr ? 'بدون شارة' : 'No Badge'}</option>
                  {badgePresets.map((b, i) => (
                    <option key={i} value={b.ar}>{isAr ? b.ar : b.en}</option>
                  ))}
                </select>
              </div>

              {/* Featured Toggle */}
              <div className="form-group-item" style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '22px' }}>
                <input
                  type="checkbox"
                  id="featured-checkbox"
                  checked={form.featured || false}
                  onChange={(e) => setForm({
                    ...form,
                    featured: e.target.checked,
                    // default period when switching on: today → +30 days
                    featuredFrom: e.target.checked ? (form.featuredFrom || toDayInput(Date.now())) : form.featuredFrom,
                    featuredUntil: e.target.checked && !form.featuredFrom ? addDays(29) : form.featuredUntil
                  })}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="featured-checkbox" style={{ cursor: 'pointer', margin: 0, fontWeight: 'bold' }}>
                  ⭐ {isAr ? 'تمييز في الصفحة الرئيسية' : 'Featured on Homepage'}
                </label>
              </div>
              {form.featured && (
                <>
                  <div className="form-group-item">
                    <label htmlFor="featured-from">{isAr ? 'التمييز من يوم' : 'Featured from'}</label>
                    <input id="featured-from" type="date" value={form.featuredFrom || ''} onChange={(e) => setForm({ ...form, featuredFrom: e.target.value })} />
                  </div>
                  <div className="form-group-item">
                    <label htmlFor="featured-until">{isAr ? 'حتى يوم (فارغ = بدون نهاية)' : 'Until (empty = open-ended)'}</label>
                    <input id="featured-until" type="date" value={form.featuredUntil || ''} min={form.featuredFrom || undefined} onChange={(e) => setForm({ ...form, featuredUntil: e.target.value || null })} />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Standard Form Grid */}
          <div className="cms-form-grid">
            {/* Arabic Title */}
            <div className="form-group-item">
              <label>{isAr ? 'عنوان العقار (عربي) *' : 'Title (Arabic) *'}</label>
              <input
                type="text"
                placeholder="مثال: شقة فاخرة للبيع بشرق سوهاج"
                value={form.title_ar}
                onChange={(e) => setForm({ ...form, title_ar: e.target.value })}
                required
              />
            </div>

            {/* English Title */}
            <div className="form-group-item">
              <label>{isAr ? 'عنوان العقار (إنجليزي)' : 'Title (English)'}</label>
              <input
                type="text"
                placeholder="e.g. Luxury Apartment for Sale in East Sohag"
                value={form.title_en}
                onChange={(e) => setForm({ ...form, title_en: e.target.value })}
              />
            </div>

            {/* Property Type */}
            <div className="form-group-item">
              <label>{isAr ? 'نوع العقار' : 'Property Type'}</label>
              <select
                value={form.type}
                onChange={(e) => {
                  const newType = e.target.value;
                  const isCommOrLand = newType === 'commercial' || newType === 'land' || newType === 'office';
                  setForm({
                    ...form,
                    type: newType,
                    category: newType === 'commercial' ? 'commercial' : newType === 'office' ? 'administrative' : newType === 'land' ? 'land' : newType === 'building' ? 'building' : 'residential',
                    bedrooms: isCommOrLand ? 0 : (form.bedrooms || 3),
                    bathrooms: newType === 'land' ? 0 : form.bathrooms,
                    floor: newType === 'land' ? 0 : form.floor
                  });
                }}
              >
                {PROPERTY_TYPES.filter(t => t.id !== 'all').map(t => (
                  <option key={t.id} value={t.id}>{isAr ? t.name_ar : t.name_en}</option>
                ))}
              </select>
            </div>

            {/* Area Location */}
            <div className="form-group-item">
              <label>{isAr ? 'المنطقة في سوهاج' : 'Area'}</label>
              <select
                value={form.areaKey}
                onChange={(e) => setForm({ ...form, areaKey: e.target.value })}
              >
                {areas.filter(a => a.id !== 'all').map(a => (
                  <option key={a.id} value={a.id}>{isAr ? (a.name_ar || a.label_ar) : (a.name_en || a.label_en)}</option>
                ))}
              </select>
            </div>

            {/* Exact Location Name & Map Pin Trigger */}
            <div className="form-group-item">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label style={{ margin: 0 }}>{isAr ? 'الموقع التفصيلي / الشارع' : 'Street Location'}</label>
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  onClick={() => setShowMapPicker(true)}
                  style={{ padding: '2px 8px', fontSize: 'var(--crm-text-xs)', color: 'var(--crm-accent-text)', borderColor: 'var(--crm-accent)' }}
                >
                  📍 {isAr ? 'تحديد دقيق على الخريطة' : 'Pin on Map'}
                </button>
              </div>
              <input
                type="text"
                value={form.locationName_ar}
                onChange={(e) => setForm({ ...form, locationName_ar: e.target.value })}
                placeholder="مثال: شارع الجمهورية - أمام الجامعة"
              />
              {form.coordinates?.lat && (
                <span style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-positive)', display: 'block', marginTop: '3px' }}>
                  ✓ {isAr ? `إحداثيات GPS المحددة: ${form.coordinates.lat}, ${form.coordinates.lng}` : `GPS: ${form.coordinates.lat}, ${form.coordinates.lng}`}
                </span>
              )}
            </div>

            {/* Price */}
            <div className="form-group-item">
              <label>{isAr ? 'السعر الإجمالي (ج.م) *' : 'Total Price (EGP) *'}</label>
              <input
                type="number"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: parseInt(e.target.value) || 0 })}
                required
              />
            </div>

            {/* Down Payment */}
            <div className="form-group-item">
              <label>{isAr ? 'المقدم المطلوب (ج.م)' : 'Downpayment (EGP)'}</label>
              <input
                type="number"
                value={form.downPayment}
                onChange={(e) => setForm({ ...form, downPayment: parseInt(e.target.value) || 0 })}
              />
            </div>

            {/* Monthly Installment */}
            <div className="form-group-item">
              <label>{isAr ? 'القسط الشهري (ج.م)' : 'Monthly Installment (EGP)'}</label>
              <input
                type="number"
                value={form.monthlyInstallment}
                onChange={(e) => setForm({ ...form, monthlyInstallment: parseInt(e.target.value) || 0 })}
              />
            </div>

            {/* Area Size */}
            <div className="form-group-item">
              <label>{isAr ? 'المساحة بالمتر المربع (م²) *' : 'Size (Sqm) *'}</label>
              <input
                type="number"
                value={form.size}
                onChange={(e) => setForm({ ...form, size: parseInt(e.target.value) || 0 })}
                required
              />
            </div>

            {/* Differentiated Specs based on Property Type */}
            {form.type === 'commercial' ? (
              <>
                <div className="form-group-item">
                  <label>{isAr ? 'عرض الواجهة التجارية' : 'Commercial Frontage'}</label>
                  <input
                    type="text"
                    placeholder={isAr ? 'مثال: 8م واجهة مباشرة على الشارع' : 'e.g. 8m direct frontage'}
                    value={form.frontage || ''}
                    onChange={(e) => setForm({ ...form, frontage: e.target.value, bedrooms: 0 })}
                  />
                </div>
                <div className="form-group-item">
                  <label>{isAr ? 'طبيعة النشاط والترخيص' : 'Commercial Activity'}</label>
                  <input
                    type="text"
                    placeholder={isAr ? 'محل تجاري واجهة مباشرة - ترخيص تجاري' : 'Prime Retail Frontage'}
                    value={form.commercialType_ar || ''}
                    onChange={(e) => setForm({ ...form, commercialType_ar: e.target.value, bedrooms: 0 })}
                  />
                </div>
                <div className="form-group-item">
                  <label>{isAr ? 'رقم الدور' : 'Floor'}</label>
                  <input
                    type="number"
                    value={form.floor}
                    onChange={(e) => setForm({ ...form, floor: parseInt(e.target.value) || 0, bedrooms: 0 })}
                  />
                </div>
                <div style={{
                  gridColumn: '1 / -1',
                  padding: '8px 12px',
                  background: 'rgba(217, 119, 6, 0.08)',
                  borderRadius: '8px',
                  border: '1px solid rgba(217, 119, 6, 0.22)',
                  fontSize: 'var(--crm-text-sm)',
                  color: 'var(--crm-accent-text)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span>🏬 {isAr ? 'وحدة تجارية: مساحة نشاط مفتوحة (تم إيقاف عدد غرف النوم تلقائياً = 0).' : 'Commercial Unit: Open retail space (Bedrooms locked to 0).'}</span>
                </div>
              </>
            ) : form.type === 'land' ? (
              <>
                <div className="form-group-item">
                  <label>{isAr ? 'واجهة الأرض وعرض الشارع' : 'Frontage & Street Width'}</label>
                  <input
                    type="text"
                    placeholder={isAr ? 'مثال: واجهة 20م على شارع رئيسي' : 'e.g. 20m frontage'}
                    value={form.frontage || ''}
                    onChange={(e) => setForm({ ...form, frontage: e.target.value, bedrooms: 0, bathrooms: 0, floor: 0 })}
                  />
                </div>
                <div className="form-group-item">
                  <label>{isAr ? 'ترخيص وتصنيف الأرض' : 'Land Classification'}</label>
                  <input
                    type="text"
                    placeholder={isAr ? 'أرض مباني سكنية / تجارية مرخصة' : 'Licensed land plot'}
                    value={form.landType_ar || ''}
                    onChange={(e) => setForm({ ...form, landType_ar: e.target.value, bedrooms: 0, bathrooms: 0, floor: 0 })}
                  />
                </div>
                <div style={{
                  gridColumn: '1 / -1',
                  padding: '8px 12px',
                  background: 'rgba(56, 189, 248, 0.08)',
                  borderRadius: '8px',
                  border: '1px solid rgba(56, 189, 248, 0.22)',
                  fontSize: 'var(--crm-text-sm)',
                  color: 'var(--crm-info)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span>📐 {isAr ? 'أرض فضاء: بدون غرف أو حمامات أو طوابق (تم الضبط تلقائياً إلى 0).' : 'Vacant Land: No bedrooms, bathrooms or floors (Locked to 0).'}</span>
                </div>
              </>
            ) : form.type === 'office' ? (
              <>
                <div className="form-group-item">
                  <label>{isAr ? 'عدد التقسيمات / المكاتب' : 'Office Rooms / Divisions'}</label>
                  <input
                    type="number"
                    value={form.divisionCount ?? 2}
                    onChange={(e) => setForm({ ...form, divisionCount: parseInt(e.target.value) || 0, bedrooms: 0 })}
                  />
                </div>
                <div className="form-group-item">
                  <label>{isAr ? 'عدد دورات المياه' : 'Restrooms'}</label>
                  <input
                    type="number"
                    value={form.bathrooms}
                    onChange={(e) => setForm({ ...form, bathrooms: parseInt(e.target.value) || 0, bedrooms: 0 })}
                  />
                </div>
                <div className="form-group-item">
                  <label>{isAr ? 'رقم الدور' : 'Floor'}</label>
                  <input
                    type="number"
                    value={form.floor}
                    onChange={(e) => setForm({ ...form, floor: parseInt(e.target.value) || 0, bedrooms: 0 })}
                  />
                </div>
                <div style={{
                  gridColumn: '1 / -1',
                  padding: '8px 12px',
                  background: 'rgba(16, 185, 129, 0.08)',
                  borderRadius: '8px',
                  border: '1px solid rgba(16, 185, 129, 0.22)',
                  fontSize: 'var(--crm-text-sm)',
                  color: 'var(--crm-positive)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span>💼 {isAr ? 'مقر إداري / عيادة: تقسيمات مكاتب مرخصة (غرف النوم السكنية = 0).' : 'Office / Clinic: Administrative partitions (Residential bedrooms = 0).'}</span>
                </div>
              </>
            ) : form.type === 'building' ? (
              <>
                <div className="form-group-item">
                  <label>{isAr ? 'عدد الأدوار الإجمالي' : 'Total Floors'}</label>
                  <input
                    type="number"
                    value={form.totalFloors || 0}
                    onChange={(e) => setForm({ ...form, totalFloors: parseInt(e.target.value) || 0, floor: 0 })}
                  />
                </div>
                <div className="form-group-item">
                  <label>{isAr ? 'عدد الشقق السكنية' : 'Residential Apartments'}</label>
                  <input
                    type="number"
                    value={form.residentialUnitsCount || 0}
                    onChange={(e) => setForm({ ...form, residentialUnitsCount: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="form-group-item">
                  <label>{isAr ? 'عدد المحلات التجارية' : 'Commercial Shops'}</label>
                  <input
                    type="number"
                    value={form.commercialUnitsCount || 0}
                    onChange={(e) => setForm({ ...form, commercialUnitsCount: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="form-group-item">
                  <label>{isAr ? 'واجهة العقار (متر)' : 'Frontage (Meters)'}</label>
                  <input
                    type="text"
                    placeholder={isAr ? 'مثال: واجهة 12م بحرية' : 'e.g. 12m North-facing'}
                    value={form.frontage || ''}
                    onChange={(e) => setForm({ ...form, frontage: e.target.value })}
                  />
                </div>
                <div style={{
                  gridColumn: '1 / -1',
                  padding: '8px 12px',
                  background: 'rgba(11, 78, 162, 0.08)',
                  borderRadius: '8px',
                  border: '1px solid rgba(11, 78, 162, 0.22)',
                  fontSize: 'var(--crm-text-sm)',
                  color: 'var(--crm-info)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span>🏢 {isAr ? 'عقار كامل (سكني + تجاري): لن يتم حساب متوسط سعر المتر السكني البسيط تلقائياً لتجنب تشويه التقييم، وسيتم عرض تفصيل الوحدات للعملاء.' : 'Full Building (Mixed-Use): Flat price/sqm calculation is disabled to protect fair valuation.'}</span>
                </div>
              </>
            ) : (
              <>
                <div className="form-group-item">
                  <label>{isAr ? 'عدد غرف النوم' : 'Bedrooms'}</label>
                  <input
                    type="number"
                    value={form.bedrooms}
                    onChange={(e) => setForm({ ...form, bedrooms: parseInt(e.target.value) || 0 })}
                  />
                </div>

                <div className="form-group-item">
                  <label>{isAr ? 'عدد الحمامات' : 'Bathrooms'}</label>
                  <input
                    type="number"
                    value={form.bathrooms}
                    onChange={(e) => setForm({ ...form, bathrooms: parseInt(e.target.value) || 0 })}
                  />
                </div>

                <div className="form-group-item">
                  <label>{isAr ? 'رقم الدور' : 'Floor'}</label>
                  <input
                    type="number"
                    value={form.floor}
                    onChange={(e) => setForm({ ...form, floor: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </>
            )}
          </div>

          {/* Transparent costs, family hub tag and commercial/medical indicators (all optional) */}
          <PropertyExtrasEditor form={form} setForm={setForm} isAr={isAr} />

          {/* 🎯 Custom District Benchmark & Nearby Landmarks Control */}
          <div style={{
            background: 'rgba(2, 132, 199, 0.05)',
            border: '1px solid rgba(2, 132, 199, 0.25)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            marginTop: '16px',
            marginBottom: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4 style={{ fontSize: 'var(--crm-text-base)', color: 'var(--crm-info)', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                <MapPin size={16} />
                {isAr ? 'المعالم والخدمات الحيوية وسعر المتر المقارن (ذكاء السوق)' : 'Market Intelligence & Custom Amenities'}
              </h4>
              <button
                type="button"
                onClick={handleAddCustomAmenity}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: 'rgba(56, 189, 248, 0.15)',
                  color: 'var(--crm-info)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: 'var(--crm-text-xs)',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                <Plus size={14} />
                <span>{isAr ? 'إضافة مَعلَم قريب خاص' : 'Add Landmark'}</span>
              </button>
            </div>

            {/* Custom Benchmark Price Override */}
            <div className="form-group-item" style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: 'var(--crm-text-sm)', color: 'var(--crm-muted)' }}>
                {isAr ? 'تخصيص متوسط سعر المتر المقارن لهذا العقار (ج.م/م² - اختياري)' : 'Custom Benchmark Price/m² (Optional Override)'}
              </label>
              <input
                type="number"
                min="1000"
                step="500"
                placeholder={isAr ? 'اتركه فارغاً لاستخدام متوسط الحي التلقائي' : 'Leave blank to use district auto benchmark'}
                value={form.customBenchmarkPrice || ''}
                onChange={(e) => setForm({ ...form, customBenchmarkPrice: e.target.value ? parseInt(e.target.value) : '' })}
                style={{
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  color: 'var(--crm-on-dark)',
                  fontSize: 'var(--crm-text-base)'
                }}
              />
            </div>

            {/* Custom Amenities List */}
            {form.nearbyAmenities && form.nearbyAmenities.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {form.nearbyAmenities.map((am, idx) => (
                  <div key={idx} style={{
                    display: 'grid',
                    gridTemplateColumns: '1.2fr 1fr 1fr auto',
                    gap: '8px',
                    alignItems: 'center',
                    background: 'rgba(0, 0, 0, 0.3)',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.08)'
                  }}>
                    <input
                      type="text"
                      placeholder={isAr ? 'اسم المعلم (مثال: مدرسة اللغات)' : 'Landmark name'}
                      value={am.name_ar || ''}
                      onChange={(e) => handleUpdateCustomAmenity(idx, 'name_ar', e.target.value)}
                      style={{ background: 'transparent', border: '1px solid rgba(255, 255, 255, 0.15)', padding: '6px', borderRadius: '6px', color: 'var(--crm-on-dark)', fontSize: 'var(--crm-text-sm)' }}
                    />
                    <select
                      value={am.category || 'education'}
                      onChange={(e) => handleUpdateCustomAmenity(idx, 'category', e.target.value)}
                      style={{ background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255, 255, 255, 0.15)', padding: '6px', borderRadius: '6px', color: 'var(--crm-on-dark)', fontSize: 'var(--crm-text-sm)' }}
                    >
                      <option value="education">{isAr ? 'تعليم' : 'Education'}</option>
                      <option value="health">{isAr ? 'صحة' : 'Health'}</option>
                      <option value="shopping">{isAr ? 'تسوق' : 'Shopping'}</option>
                      <option value="transport">{isAr ? 'مواصلات' : 'Transit'}</option>
                      <option value="lifestyle">{isAr ? 'ترفيه' : 'Leisure'}</option>
                    </select>
                    <input
                      type="text"
                      placeholder={isAr ? 'المسافة (مثال: 300 متر)' : 'Distance (e.g. 300m)'}
                      value={am.distance || ''}
                      onChange={(e) => handleUpdateCustomAmenity(idx, 'distance', e.target.value)}
                      style={{ background: 'transparent', border: '1px solid rgba(255, 255, 255, 0.15)', padding: '6px', borderRadius: '6px', color: 'var(--crm-on-dark)', fontSize: 'var(--crm-text-sm)' }}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveCustomAmenity(idx)}
                      style={{ background: 'rgba(239, 68, 68, 0.2)', border: 'none', color: 'var(--crm-danger)', padding: '6px 8px', borderRadius: '6px', cursor: 'pointer' }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: 'var(--crm-text-xs)', color: 'var(--crm-faint)' }}>
                {isAr ? 'يتم حالياً عرض المعالم الحيوية الافتراضية للحي تلقائياً. يمكنك إضافة معالم مخصصة للعقار بالنقر على الزر أعلاه.' : 'Default district amenities are automatically displayed. Click above to add custom landmarks.'}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="form-group-item" style={{ marginTop: '12px' }}>
            <label>{isAr ? 'وصف العقار والمميزات' : 'Description'}</label>
            <textarea
              rows="3"
              value={form.description_ar}
              onChange={(e) => setForm({ ...form, description_ar: e.target.value })}
              className="form-input"
              style={{ width: '100%', resize: 'vertical' }}
              placeholder="اكتب وصفاً مفصلاً عن العقار والتشطيب والمرافق..."
            />
          </div>

          <div className="cms-modal-actions" style={{ marginTop: '20px' }}>
            <button type="button" className="btn btn-outline" onClick={() => setShowAddModal(false)}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button type="submit" className="btn btn-primary">
              <Save size={16} />
              <span>{editingPropertyId ? (isAr ? 'حفظ التعديلات' : 'Save Changes') : (isAr ? 'نشر العقار فوراً' : 'Publish Property')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>

  );
}
