import { useState } from 'react';
import { 
  Building, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  Sparkles, 
  MapPin, 
  DollarSign, 
  Maximize2, 
  ShieldCheck, 
  Image as ImageIcon,
  Save,
  Download,
  Upload
} from 'lucide-react';
import { SOHAG_AREAS, PROPERTY_TYPES } from '../../data/propertiesData';
import { exportToCsv } from '../../utils/exportCsv';

export default function PropertyManagerPanel({
  properties = [],
  onAddProperty,
  onUpdateProperty,
  onDeleteProperty,
  lang = 'ar',
  triggerToast
}) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPropertyId, setEditingPropertyId] = useState(null);

  // Form State
  const [form, setForm] = useState({
    title_ar: '',
    title_en: '',
    type: 'apartment',
    areaKey: 'east',
    locationName_ar: '',
    locationName_en: '',
    price: 2500000,
    downPayment: 500000,
    monthlyInstallment: 20000,
    installmentYears: 5,
    size: 150,
    bedrooms: 3,
    bathrooms: 2,
    floor: 3,
    finishing_ar: 'سوبر لوكس',
    finishing_en: 'Super Lux',
    featured: true,
    badge_ar: 'عرض مميز',
    badge_en: 'Featured Deal',
    images: [
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80'
    ],
    description_ar: '',
    description_en: '',
    virtualTour: true,
    legalStatus: {
      ownershipType_ar: 'عقد مسجل شهر عقاري',
      ownershipType_en: 'Registered Title Deed',
      licenseStatus_ar: 'ترخيص بناء رسمي صادر من الحي',
      licenseStatus_en: 'Official Municipal Permit',
      reconciliationStatus_ar: 'نموذج 10 النهائي للتصالح معتمد',
      reconciliationStatus_en: 'Approved Form 10 Reconciliation',
      inspectionReportId: `LAW-SOH-${Date.now().toString().slice(-4)}`,
      verifiedByLawyer: 'الإدارة القانونية لمنصة ون لاين',
      safetyScore: 100
    }
  });

  const isAr = lang === 'ar';

  const handleOpenAdd = () => {
    setEditingPropertyId(null);
    setForm({
      title_ar: '',
      title_en: '',
      type: 'apartment',
      areaKey: 'east',
      locationName_ar: 'شرق سوهاج - شارع الجمهورية الرئيسي',
      locationName_en: 'East Sohag - Main Republic St.',
      price: 2500000,
      downPayment: 500000,
      monthlyInstallment: 20000,
      installmentYears: 5,
      size: 150,
      bedrooms: 3,
      bathrooms: 2,
      floor: 3,
      finishing_ar: 'سوبر لوكس',
      finishing_en: 'Super Lux',
      featured: true,
      badge_ar: 'عرض مميز',
      badge_en: 'Featured Deal',
      images: [
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80'
      ],
      description_ar: 'شقة فاخرة بموقع حيوي متكامل الخدمات وإطلالة ممتازة كاملة المرافق.',
      description_en: 'Luxury unit in a vibrant prime location with complete utilities.',
      virtualTour: true,
      legalStatus: {
        ownershipType_ar: 'عقد مسجل شهر عقاري',
        ownershipType_en: 'Registered Title Deed',
        licenseStatus_ar: 'ترخيص بناء رسمي صادر من الحي',
        licenseStatus_en: 'Official Municipal Permit',
        reconciliationStatus_ar: 'نموذج 10 النهائي للتصالح معتمد',
        reconciliationStatus_en: 'Approved Form 10 Reconciliation',
        inspectionReportId: `LAW-SOH-${Date.now().toString().slice(-4)}`,
        verifiedByLawyer: 'الإدارة القانونية لمنصة ون لاين',
        safetyScore: 100
      }
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (prop) => {
    setEditingPropertyId(prop.id);
    setForm({ ...prop });
    setShowAddModal(true);
  };

  // Multiple File Upload Handler (FileReader)
  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        setForm((prev) => ({
          ...prev,
          images: [uploadEvent.target.result, ...prev.images]
        }));
      };
      reader.readAsDataURL(file);
    });

    triggerToast(isAr ? `تمت إضافة ${files.length} صورة بنجاح` : `${files.length} photos uploaded`, 'success');
  };

  const handleRemoveImage = (indexToRemove) => {
    setForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, idx) => idx !== indexToRemove)
    }));
  };

  const handleExportCsv = () => {
    exportToCsv('OneLine_Properties_Sohag', properties, {
      id: 'كود العقار',
      title_ar: 'اسم العقار',
      type: 'النوع',
      areaKey: 'المنطقة',
      price: 'السعر الإجمالي (ج.م)',
      downPayment: 'المقدم (ج.م)',
      monthlyInstallment: 'القسط الشهري (ج.م)',
      size: 'المساحة (م²)',
      bedrooms: 'غرف النوم',
      bathrooms: 'الحمامات'
    });
    triggerToast(isAr ? 'تم تصدير كشف العقارات إلى Excel بنجاح' : 'Exported to Excel successfully', 'success');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title_ar || !form.price || !form.size) {
      triggerToast(isAr ? 'يرجى ملء الحقول الأساسية' : 'Please fill required fields', 'error');
      return;
    }

    if (editingPropertyId) {
      onUpdateProperty(editingPropertyId, form);
      triggerToast(isAr ? 'تم تحديث بيانات العقار بنجاح!' : 'Property updated successfully!', 'success');
    } else {
      const newProp = {
        id: 'prop-' + Date.now(),
        ...form,
        coordinates: { lat: 26.5500, lng: 31.6900 }
      };
      onAddProperty(newProp);
      triggerToast(isAr ? 'تمت إضافة العقار الجديد بنجاح إلى الموقع والخريطة!' : 'New property added successfully!', 'success');
    }

    setShowAddModal(false);
  };

  return (
    <div className="property-manager-panel">
      {/* Header & Add Button */}
      <div className="panel-top-bar">
        <div>
          <h3>{isAr ? 'إدارة العقارات والوحدات المعروضة (CMS)' : 'Property Catalog Management (CMS)'}</h3>
          <p className="panel-sub">{isAr ? `إجمالي العقارات الحالية: ${properties.length} عقاراً` : `Total Live Properties: ${properties.length}`}</p>
        </div>

        <div className="panel-actions-row">
          <button type="button" className="btn btn-outline" onClick={handleExportCsv}>
            <Download size={16} />
            <span>{isAr ? 'تصدير لـ Excel (CSV)' : 'Export to CSV'}</span>
          </button>

          <button type="button" className="btn btn-primary" onClick={handleOpenAdd}>
            <Plus size={16} />
            <span>{isAr ? 'إضافة عقار جديد للموقع' : 'Add New Property'}</span>
          </button>
        </div>
      </div>

      {/* Properties Table */}
      <div className="admin-table-wrapper">
        <table className="admin-data-table">
          <thead>
            <tr>
              <th>{isAr ? 'العقار' : 'Property'}</th>
              <th>{isAr ? 'النوع والمنطقة' : 'Type & Area'}</th>
              <th>{isAr ? 'السعر والمقدم' : 'Price & Downpayment'}</th>
              <th>{isAr ? 'المساحة والغرف' : 'Specs'}</th>
              <th>{isAr ? 'الموقف القانوني' : 'Legal'}</th>
              <th>{isAr ? 'الإجراءات' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody>
            {properties.map((prop) => (
              <tr key={prop.id}>
                <td>
                  <div className="table-prop-info">
                    <img src={prop.images[0]} alt="" className="table-thumb" />
                    <div>
                      <strong>{isAr ? prop.title_ar : prop.title_en}</strong>
                      <span className="prop-id-tag">{prop.id.toUpperCase()}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <div className="table-cell-multi">
                    <span className="badge-type">{prop.type}</span>
                    <span className="text-muted">{prop.areaKey}</span>
                  </div>
                </td>
                <td>
                  <div className="table-cell-multi">
                    <strong className="text-primary">{prop.price.toLocaleString()} ج.م</strong>
                    <span className="text-muted">مقدم: {prop.downPayment?.toLocaleString()} ج.م</span>
                  </div>
                </td>
                <td>
                  <span>{prop.size} م² • {prop.bedrooms || 0} غرف</span>
                </td>
                <td>
                  <span className="badge-legal-ok">
                    <ShieldCheck size={13} />
                    {isAr ? 'مسجل 100%' : '100% Ok'}
                  </span>
                </td>
                <td>
                  <div className="table-actions-cell">
                    <button
                      type="button"
                      className="icon-action-table-btn btn-edit"
                      onClick={() => handleOpenEdit(prop)}
                      title={isAr ? 'تعديل' : 'Edit'}
                    >
                      <Edit3 size={15} />
                    </button>
                    <button
                      type="button"
                      className="icon-action-table-btn btn-del"
                      onClick={() => {
                        if (window.confirm(isAr ? 'هل أنت متأكد من حذف هذا العقار من المنصة؟' : 'Delete this property?')) {
                          onDeleteProperty(prop.id);
                          triggerToast(isAr ? 'تم حذف العقار بنجاح' : 'Property deleted', 'info');
                        }
                      }}
                      title={isAr ? 'حذف' : 'Delete'}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Modal */}
      {showAddModal && (
        <div className="track-modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="property-form-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-form-header">
              <h3>{editingPropertyId ? (isAr ? 'تعديل بيانات العقار' : 'Edit Property') : (isAr ? 'إضافة عقار جديد للمنصة' : 'Add New Property')}</h3>
              <button type="button" className="drawer-close-btn" onClick={() => setShowAddModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSubmit} className="property-cms-form">
              {/* Photo Upload Section */}
              <div className="cms-image-uploader-box">
                <label className="uploader-title">
                  <ImageIcon size={18} />
                  <span>{isAr ? 'صور العقار (رفع من الموبايل أو الكمبيوتر)' : 'Property Photos (Direct Device Upload)'}</span>
                </label>

                <div className="uploader-dropzone">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    id="property-images-file-input"
                    onChange={handleFileUpload}
                    className="hidden-file-input"
                  />
                  <label htmlFor="property-images-file-input" className="dropzone-label">
                    <Upload size={24} className="text-primary" />
                    <span>{isAr ? 'انقر لاختيار عدة صور من جهازك' : 'Click to select multiple photos'}</span>
                    <small>{isAr ? 'JPG, PNG, WebP حتى 10MB' : 'Supports JPG, PNG, WebP'}</small>
                  </label>
                </div>

                {/* Previews */}
                {form.images.length > 0 && (
                  <div className="uploaded-thumbs-grid">
                    {form.images.map((imgSrc, idx) => (
                      <div key={idx} className="thumb-preview-item">
                        <img src={imgSrc} alt="" />
                        <button
                          type="button"
                          className="btn-del-thumb"
                          onClick={() => handleRemoveImage(idx)}
                          title={isAr ? 'إزالة الصورة' : 'Remove'}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

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
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
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
                    {SOHAG_AREAS.filter(a => a.id !== 'all').map(a => (
                      <option key={a.id} value={a.id}>{isAr ? a.name_ar : a.name_en}</option>
                    ))}
                  </select>
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

                {/* Bedrooms & Bathrooms */}
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
              </div>

              <div className="cms-modal-actions">
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
      )}
    </div>
  );
}
