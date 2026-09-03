import { useState, useEffect } from 'react';
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
  Upload,
  Eye,
  EyeOff,
  RotateCcw,
  Star,
  Tag,
  Database,
  Archive,
  AlertTriangle,
  FileSpreadsheet,
  MessageSquare
} from 'lucide-react';
import { PROPERTY_TYPES } from '../../data/propertiesData';
import { getAreas } from '../../utils/areasData';
import { exportToCsv } from '../../utils/exportCsv';
import InteractiveMapPickerModal from './InteractiveMapPickerModal';
import WhatsAppMatchNotifierModal from './WhatsAppMatchNotifierModal';
import { findMatchingClientsForProperty } from '../../utils/matchingEngine';
import { compressImageFile } from '../../utils/imageCompressor';

// Accurate GPS Coordinates map for Sohag Districts
const SOHAG_AREA_COORDINATES = {
  east: { lat: 26.5569, lng: 31.7001 },
  new_sohag: { lat: 26.4715, lng: 31.6620 },
  west: { lat: 26.5500, lng: 31.6850 },
  kawthar: { lat: 26.5920, lng: 31.7850 },
  center: { lat: 26.5620, lng: 31.6910 },
  akhmeem: { lat: 26.5650, lng: 31.7450 }
};

export default function PropertyManagerPanel({
  properties = [],
  leads = [],
  demands = [],
  onAddProperty,
  onUpdateProperty,
  onDeleteProperty,
  lang = 'ar',
  triggerToast,
  externalNewPropertyData = null,
  onClearExternalData = () => {}
}) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPropertyId, setEditingPropertyId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'published' | 'hidden' | 'under_negotiation' | 'sold' | 'trash'
  const [searchQuery, setSearchQuery] = useState('');
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [notifierProperty, setNotifierProperty] = useState(null);
  const [notifierEventType, setNotifierEventType] = useState('new_unit');
  const [areas, setAreas] = useState(() => getAreas());

  useEffect(() => {
    const handleUpdate = () => setAreas(getAreas());
    window.addEventListener('oneline_areas_updated', handleUpdate);
    return () => window.removeEventListener('oneline_areas_updated', handleUpdate);
  }, []);

  const isAr = lang === 'ar';

  const defaultFormState = {
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
    status: 'published', // 'published' | 'hidden' | 'under_negotiation' | 'sold'
    featured: true,
    priorityRank: 90,
    badge_ar: 'عرض مميز',
    badge_en: 'Featured Deal',
    images: [
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80'
    ],
    description_ar: 'شقة فاخرة بموقع حيوي متكامل الخدمات وإطلالة ممتازة كاملة المرافق.',
    description_en: 'Luxury unit in a vibrant prime location with complete utilities.',
    virtualTour: true,
    isDeleted: false,
    legalStatus: {
      ownershipType_ar: 'عقد مسجل شهر عقاري',
      ownershipType_en: 'Registered Title Deed',
      licenseStatus_ar: 'ترخيص بناء رسمي صادر من الحي',
      licenseStatus_en: 'Official Municipal Permit',
      reconciliationStatus_ar: 'نموذج 10 النهائي للتصالح معتمد',
      reconciliationStatus_en: 'Approved Form 10 Reconciliation',
      inspectionReportId: `LAW-SOH-${Date.now().toString().slice(-4)}`,
      verifiedByLawyer: 'الإدارة القانونية لمنصة 1Line',
      safetyScore: 100
    }
  };

  const [form, setForm] = useState(defaultFormState);

  // Handle external conversion request (from CRM Leads to Property)
  useEffect(() => {
    if (externalNewPropertyData) {
      setEditingPropertyId(null);
      setForm({
        ...defaultFormState,
        ...externalNewPropertyData
      });
      setShowAddModal(true);
      onClearExternalData();
    }
  }, [externalNewPropertyData]);

  const handleOpenAdd = () => {
    setEditingPropertyId(null);
    setForm(defaultFormState);
    setShowAddModal(true);
  };

  const handleOpenEdit = (prop) => {
    setEditingPropertyId(prop.id);
    setForm({
      ...defaultFormState,
      ...prop,
      status: prop.status || (prop.isArchived ? 'hidden' : 'published')
    });
    setShowAddModal(true);
  };

  // Quick Toggle Visibility (Active / Hidden)
  const handleToggleVisibility = (prop) => {
    const currentStatus = prop.status || 'published';
    const newStatus = currentStatus === 'published' ? 'hidden' : 'published';
    onUpdateProperty(prop.id, { status: newStatus });
    triggerToast(
      newStatus === 'published' 
        ? (isAr ? 'تم تفعيل وإظهار العقار على الموقع للزوار' : 'Property is now Published live')
        : (isAr ? 'تم إخفاء العقار مؤقتاً من الموقع' : 'Property is now Hidden from website'),
      'info'
    );
  };

  // Quick Status Change from Table Row
  const handleStatusChange = (propId, newStatus) => {
    onUpdateProperty(propId, { status: newStatus });
    const targetProp = properties.find(p => p.id === propId);
    if (newStatus === 'sold' && targetProp) {
      setNotifierProperty(targetProp);
      setNotifierEventType('sold_unit');
    }
    triggerToast(isAr ? `تم تحديث حالة العقار بنجاح` : `Property status updated`, 'success');
  };

  // Soft Delete (Move to Trash)
  const handleSoftDelete = (propId) => {
    if (window.confirm(isAr ? 'نقل هذا العقار إلى سلة المهملات؟ (يمكنك استرجاعه لاحقاً)' : 'Move to Trash? (Can be restored)')) {
      onUpdateProperty(propId, { isDeleted: true, status: 'trash' });
      triggerToast(isAr ? 'تم نقل العقار إلى سلة المهملات' : 'Property moved to Trash', 'info');
    }
  };

  // Restore from Trash
  const handleRestore = (propId) => {
    onUpdateProperty(propId, { isDeleted: false, status: 'published' });
    triggerToast(isAr ? 'تم استرجاع العقار وإعادة نشره بنجاح!' : 'Property restored and published!', 'success');
  };

  // Permanent Hard Delete
  const handlePermanentDelete = (propId) => {
    if (window.confirm(isAr ? 'تحذير: هل أنت متأكد من الحذف النهائي؟ لن يمكن استرجاع العقار أبداً.' : 'Warning: Delete permanently? Cannot be undone.')) {
      onDeleteProperty(propId);
      triggerToast(isAr ? 'تم الحذف النهائي للعقار' : 'Property permanently deleted', 'info');
    }
  };

  // Multiple File Upload Handler (FileReader) with size validation
  const MAX_FILE_SIZE_MB = 10;
  const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    // 🛡️ Filter out files exceeding size limit
    const validFiles = [];
    const oversizedFiles = [];

    files.forEach((file) => {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        oversizedFiles.push(file.name);
      } else {
        validFiles.push(file);
      }
    });

    if (oversizedFiles.length > 0) {
      triggerToast(
        isAr 
          ? `تم رفض ${oversizedFiles.length} صورة لتجاوز الحد الأقصى (${MAX_FILE_SIZE_MB}MB): ${oversizedFiles.join(', ')}`
          : `${oversizedFiles.length} file(s) rejected (exceeds ${MAX_FILE_SIZE_MB}MB limit): ${oversizedFiles.join(', ')}`,
        'error'
      );
    }

    if (validFiles.length === 0) return;

    // ⚡ Automatic Canvas Compression (Downscales to max 1400px and 80% quality)
    Promise.all(
      validFiles.map(file => compressImageFile(file, { maxWidth: 1400, quality: 0.82 }))
    ).then((compressedResults) => {
      const newImages = compressedResults.map(res => res.dataUrl);
      setForm((prev) => ({
        ...prev,
        images: [...newImages, ...prev.images]
      }));

      const avgRatio = compressedResults[0]?.compressionRatio || '85%';
      triggerToast(
        isAr 
          ? `تم ضغط وحفظ ${validFiles.length} صورة بنجاح بجودة معمارية فائقة (توفير ${avgRatio} من المساحة) ⚡` 
          : `${validFiles.length} images compressed & saved successfully (${avgRatio} saved)!`, 
        'success'
      );
    }).catch((err) => {
      console.error('Image compression error:', err);
      // Fallback to FileReader if canvas compression has an unexpected issue
      validFiles.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (uploadEvent) => {
          setForm((prev) => ({
            ...prev,
            images: [uploadEvent.target.result, ...prev.images]
          }));
        };
        reader.readAsDataURL(file);
      });
      triggerToast(isAr ? `تمت إضافة الصور بنجاح` : `Photos added`, 'success');
    });
  };

  const handleRemoveImage = (indexToRemove) => {
    setForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, idx) => idx !== indexToRemove)
    }));
  };

  // Export to CSV
  const handleExportCsv = () => {
    const exportData = properties.map(p => ({
      ...p,
      statusLabel: p.status === 'hidden' ? 'مخفي' : p.status === 'under_negotiation' ? 'تحت التفاوض' : p.status === 'sold' ? 'تم البيع' : 'منشور'
    }));

    exportToCsv('OneLine_Properties_Sohag', exportData, {
      id: 'كود العقار',
      title_ar: 'اسم العقار',
      type: 'النوع',
      areaKey: 'المنطقة',
      price: 'السعر الإجمالي (ج.م)',
      downPayment: 'المقدم (ج.م)',
      monthlyInstallment: 'القسط الشهري (ج.م)',
      size: 'المساحة (م²)',
      statusLabel: 'حالة العرض',
      featured: 'مميز'
    });
    triggerToast(isAr ? 'تم تصدير كشف العقارات إلى Excel بنجاح' : 'Exported to Excel successfully', 'success');
  };

  // Full Database JSON Backup Export
  const handleExportJsonBackup = () => {
    const backupData = {
      platform: '1Line Real Estate',
      timestamp: new Date().toISOString(),
      propertiesCount: properties.length,
      properties: properties
    };
    const jsonStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `OneLine_Properties_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    triggerToast(isAr ? 'تم تنزيل ملف النسخة الاحتياطية الكاملة (JSON) بنجاح!' : 'Full backup downloaded successfully!', 'success');
  };

  // Full Database JSON Restore
  const handleImportJsonBackup = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        const importedProperties = parsed.properties || parsed;
        if (Array.isArray(importedProperties) && importedProperties.length > 0) {
          if (window.confirm(isAr ? `هل تريد استيراد ${importedProperties.length} عقاراً من ملف النسخة الاحتياطية؟` : `Import ${importedProperties.length} properties?`)) {
            localStorage.setItem('oneline_properties', JSON.stringify(importedProperties));
            window.location.reload();
          }
        } else {
          throw new Error('Invalid structure');
        }
      } catch (err) {
        console.error(err);
        triggerToast(isAr ? 'ملف النسخة الاحتياطية غير صالح!' : 'Invalid backup file format', 'error');
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title_ar || !form.price || !form.size) {
      triggerToast(isAr ? 'يرجى ملء الحقول الأساسية (العنوان، السعر، المساحة)' : 'Please fill required fields (title, price, size)', 'error');
      return;
    }

    // 🛡️ Validate no negative or zero values for critical numeric fields
    if (form.price <= 0) {
      triggerToast(isAr ? 'السعر يجب أن يكون أكبر من صفر' : 'Price must be greater than zero', 'error');
      return;
    }
    if (form.size <= 0) {
      triggerToast(isAr ? 'المساحة يجب أن تكون أكبر من صفر' : 'Size must be greater than zero', 'error');
      return;
    }
    if (form.downPayment < 0 || form.monthlyInstallment < 0) {
      triggerToast(isAr ? 'قيم المقدم والأقساط لا يمكن أن تكون سالبة' : 'Payment values cannot be negative', 'error');
      return;
    }

    // 🗺️ Assign Real GPS Coordinates matching the selected Sohag district
    const baseCoords = SOHAG_AREA_COORDINATES[form.areaKey] || { lat: 26.5569, lng: 31.7001 };
    // Slight random offset (approx 100-300m) to prevent multiple units in the same district from stacking directly on top of each other
    const randomOffset = (Math.random() - 0.5) * 0.005;
    const finalCoords = (form.coordinates?.lat && form.coordinates.lat !== 26.5500) ? form.coordinates : {
      lat: Number((baseCoords.lat + randomOffset).toFixed(6)),
      lng: Number((baseCoords.lng + randomOffset).toFixed(6))
    };

    if (editingPropertyId) {
      onUpdateProperty(editingPropertyId, { ...form, coordinates: finalCoords });
      triggerToast(isAr ? 'تم تحديث بيانات العقار وموقعه على الخريطة بنجاح!' : 'Property updated successfully!', 'success');
    } else {
      const newProp = {
        id: 'prop-' + Date.now(),
        ...form,
        coordinates: finalCoords
      };
      onAddProperty(newProp);
      triggerToast(isAr ? 'تمت إضافة العقار وتثبيت موقعه الفعلي على الخريطة بنجاح!' : 'New property added successfully!', 'success');

      // 🎯 Auto-check matching clients in database
      const matched = findMatchingClientsForProperty(newProp, leads, demands);
      if (matched.length > 0) {
        setNotifierProperty(newProp);
        setNotifierEventType('new_unit');
      }
    }

    setShowAddModal(false);
  };

  // Filtered Properties for Display
  const filteredProperties = properties.filter((prop) => {
    // 1. Trash vs Active
    const isTrash = prop.isDeleted || prop.status === 'trash';
    if (statusFilter === 'trash') {
      return isTrash;
    }
    if (isTrash) return false;

    // 2. Status Filters
    const propStatus = prop.status || (prop.isArchived ? 'hidden' : 'published');
    if (statusFilter === 'published' && propStatus !== 'published') return false;
    if (statusFilter === 'hidden' && propStatus !== 'hidden') return false;
    if (statusFilter === 'under_negotiation' && propStatus !== 'under_negotiation') return false;
    if (statusFilter === 'sold' && propStatus !== 'sold') return false;

    // 3. Search Query
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchTitle = (prop.title_ar || '').toLowerCase().includes(q) || (prop.title_en || '').toLowerCase().includes(q);
      const matchId = (prop.id || '').toLowerCase().includes(q);
      const matchArea = (prop.areaKey || '').toLowerCase().includes(q);
      if (!matchTitle && !matchId && !matchArea) return false;
    }

    return true;
  });

  const activeCount = properties.filter(p => !p.isDeleted && (p.status === 'published' || !p.status)).length;
  const hiddenCount = properties.filter(p => !p.isDeleted && p.status === 'hidden').length;
  const negotiationCount = properties.filter(p => !p.isDeleted && p.status === 'under_negotiation').length;
  const soldCount = properties.filter(p => !p.isDeleted && p.status === 'sold').length;
  const trashCount = properties.filter(p => p.isDeleted || p.status === 'trash').length;

  const badgePresets = [
    { ar: 'عرض مميز', en: 'Featured Deal' },
    { ar: 'حصري لـ 1Line', en: 'Exclusive Deal' },
    { ar: 'لقطة الأسبوع', en: 'Deal of the Week' },
    { ar: 'خصم الكاش الفوري', en: 'Instant Cash Discount' },
    { ar: 'تم تخفيض السعر', en: 'Price Reduced' },
    { ar: 'استثمار بعائد مرتفع', en: 'High ROI Investment' },
    { ar: 'مرخص 100% شهر عقاري', en: '100% Legally Verified' },
    { ar: 'متاح للتمويل العقاري', en: 'Mortgage Eligible' }
  ];

  return (
    <div className="property-manager-panel">
      {/* Header & Main Actions */}
      <div className="panel-top-bar">
        <div>
          <h3>{isAr ? 'إدارة العقارات والوحدات المعروضة (CMS)' : 'Property Catalog Management (CMS)'}</h3>
          <p className="panel-sub">
            {isAr 
              ? `إجمالي المعروض النشط: ${activeCount} عقاراً • المخفي: ${hiddenCount} • تحت التفاوض: ${negotiationCount}` 
              : `Live: ${activeCount} • Hidden: ${hiddenCount} • Negotiation: ${negotiationCount}`}
          </p>
        </div>

        <div className="panel-actions-row">
          {/* JSON Backup Button */}
          <button 
            type="button" 
            className="btn btn-outline" 
            onClick={handleExportJsonBackup}
            title={isAr ? 'تحميل نسخة احتياطية كاملة JSON' : 'Download JSON Backup'}
          >
            <Database size={15} />
            <span>{isAr ? 'نسخ احتياطي' : 'Backup JSON'}</span>
          </button>

          {/* Hidden File Input for Restore */}
          <label className="btn btn-outline" style={{ cursor: 'pointer', margin: 0 }}>
            <Upload size={15} />
            <span>{isAr ? 'استعادة' : 'Restore'}</span>
            <input 
              type="file" 
              accept=".json" 
              onChange={handleImportJsonBackup} 
              style={{ display: 'none' }} 
            />
          </label>

          {/* Export CSV */}
          <button type="button" className="btn btn-outline" onClick={handleExportCsv}>
            <FileSpreadsheet size={15} />
            <span>{isAr ? 'تصدير Excel' : 'Export CSV'}</span>
          </button>

          {/* Add New Property */}
          <button type="button" className="btn btn-primary" onClick={handleOpenAdd}>
            <Plus size={16} />
            <span>{isAr ? 'إضافة عقار جديد للموقع' : 'Add New Property'}</span>
          </button>
        </div>
      </div>

      {/* Status Filter Tabs & Search Bar */}
      <div className="crm-table-header" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div className="table-filters">
          <button 
            className={`table-filter-btn ${statusFilter === 'all' ? 'active' : ''}`} 
            onClick={() => setStatusFilter('all')}
          >
            {isAr ? 'الكل' : 'All'} ({properties.length - trashCount})
          </button>
          <button 
            className={`table-filter-btn ${statusFilter === 'published' ? 'active' : ''}`} 
            onClick={() => setStatusFilter('published')}
            style={{ color: statusFilter === 'published' ? 'var(--emerald)' : undefined }}
          >
            <Eye size={13} style={{ marginInlineEnd: '4px' }} />
            {isAr ? 'النشطة والمعروضة' : 'Published Live'} ({activeCount})
          </button>
          <button 
            className={`table-filter-btn ${statusFilter === 'hidden' ? 'active' : ''}`} 
            onClick={() => setStatusFilter('hidden')}
          >
            <EyeOff size={13} style={{ marginInlineEnd: '4px' }} />
            {isAr ? 'المخفية مؤقتاً' : 'Hidden'} ({hiddenCount})
          </button>
          <button 
            className={`table-filter-btn ${statusFilter === 'under_negotiation' ? 'active' : ''}`} 
            onClick={() => setStatusFilter('under_negotiation')}
          >
            <Archive size={13} style={{ marginInlineEnd: '4px' }} />
            {isAr ? 'تحت التفاوض' : 'Negotiation'} ({negotiationCount})
          </button>
          <button 
            className={`table-filter-btn ${statusFilter === 'sold' ? 'active' : ''}`} 
            onClick={() => setStatusFilter('sold')}
          >
            {isAr ? 'تم البيع' : 'Sold'} ({soldCount})
          </button>
          <button 
            className={`table-filter-btn ${statusFilter === 'trash' ? 'active' : ''}`} 
            onClick={() => setStatusFilter('trash')}
            style={{ color: statusFilter === 'trash' ? 'var(--rose)' : undefined }}
          >
            <Trash2 size={13} style={{ marginInlineEnd: '4px' }} />
            {isAr ? 'سلة المهملات' : 'Trash'} ({trashCount})
          </button>
        </div>

        <div>
          <input 
            type="text" 
            placeholder={isAr ? 'بحث بالاسم، الكود، أو المنطقة...' : 'Search title, code, area...'} 
            className="form-input" 
            style={{ padding: '6px 14px', fontSize: '0.85rem', width: '220px', borderRadius: 'var(--radius-pill)' }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
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
              <th>{isAr ? 'حالة العرض' : 'Display Status'}</th>
              <th>{isAr ? 'التميز' : 'Featured'}</th>
              <th>{isAr ? 'الإجراءات' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody>
            {filteredProperties.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                  <Building size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
                  <p>{isAr ? 'لا توجد عقارات مطابقة للفلتر المحدد' : 'No properties found in this tab'}</p>
                </td>
              </tr>
            ) : (
              filteredProperties.map((prop) => {
                const propStatus = prop.status || (prop.isArchived ? 'hidden' : 'published');
                const isTrash = prop.isDeleted || prop.status === 'trash';

                return (
                  <tr key={prop.id} style={{ opacity: isTrash ? 0.6 : 1 }}>
                    <td>
                      <div className="table-prop-info">
                        <img src={prop.images?.[0] || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80'} alt="" className="table-thumb" />
                        <div>
                          <strong>{isAr ? prop.title_ar : prop.title_en}</strong>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '2px' }}>
                            <span className="prop-id-tag">{prop.id.toUpperCase()}</span>
                            {prop.badge_ar && (
                              <span style={{ fontSize: '0.65rem', background: 'var(--accent-gold-light)', color: 'var(--accent-gold)', padding: '1px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                                {isAr ? prop.badge_ar : prop.badge_en}
                              </span>
                            )}
                          </div>
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
                        <strong className="text-primary">{prop.price?.toLocaleString()} ج.م</strong>
                        <span className="text-muted">مقدم: {prop.downPayment?.toLocaleString()} ج.م</span>
                      </div>
                    </td>

                    <td>
                      <span>{prop.size} م² • {prop.bedrooms || 0} غرف</span>
                    </td>

                    {/* Quick Status Selector */}
                    <td>
                      {!isTrash ? (
                        <select
                          value={propStatus}
                          onChange={(e) => handleStatusChange(prop.id, e.target.value)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: 'var(--radius-pill)',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            border: '1px solid var(--border-light)',
                            background: 
                              propStatus === 'published' ? 'var(--emerald-bg)' :
                              propStatus === 'hidden' ? 'var(--secondary)' :
                              propStatus === 'under_negotiation' ? 'var(--amber-bg)' : 'rgba(239, 68, 68, 0.1)',
                            color:
                              propStatus === 'published' ? 'var(--emerald)' :
                              propStatus === 'hidden' ? 'var(--text-secondary)' :
                              propStatus === 'under_negotiation' ? 'var(--amber)' : 'var(--rose)'
                          }}
                        >
                          <option value="published">🟢 {isAr ? 'منشور نشط' : 'Published'}</option>
                          <option value="hidden">⚪ {isAr ? 'مخفي مؤقتاً' : 'Hidden'}</option>
                          <option value="under_negotiation">🟡 {isAr ? 'تحت التفاوض' : 'Negotiating'}</option>
                          <option value="sold">🔴 {isAr ? 'تم البيع' : 'Sold'}</option>
                        </select>
                      ) : (
                        <span className="badge" style={{ background: 'var(--rose-bg)', color: 'var(--rose)' }}>
                          {isAr ? 'في المهملات' : 'In Trash'}
                        </span>
                      )}
                    </td>

                    {/* Featured Star Toggle */}
                    <td>
                      <button
                        type="button"
                        onClick={() => {
                          onUpdateProperty(prop.id, { featured: !prop.featured });
                          triggerToast(prop.featured ? (isAr ? 'تم إلغاء التمييز' : 'Unfeatured') : (isAr ? 'تم تمييز العقار في الصدارة!' : 'Featured in Top!'), 'success');
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: prop.featured ? '#f59e0b' : 'var(--text-muted)'
                        }}
                        title={prop.featured ? (isAr ? 'عقار مميز' : 'Featured') : (isAr ? 'عادي' : 'Standard')}
                      >
                        <Star size={18} fill={prop.featured ? '#f59e0b' : 'none'} />
                      </button>
                    </td>

                    {/* Actions */}
                    <td>
                      <div className="table-actions-cell">
                        {!isTrash ? (
                          <>
                            {/* Fast Eye Toggle */}
                            <button
                              type="button"
                              className="icon-action-table-btn"
                              onClick={() => handleToggleVisibility(prop)}
                              title={propStatus === 'published' ? (isAr ? 'إخفاء العقار' : 'Hide') : (isAr ? 'إظهار العقار' : 'Publish')}
                              style={{ color: propStatus === 'published' ? 'var(--emerald)' : 'var(--text-muted)' }}
                            >
                              {propStatus === 'published' ? <Eye size={16} /> : <EyeOff size={16} />}
                            </button>

                            {/* WhatsApp Retargeting / Match Broadcast Button */}
                            <button
                              type="button"
                              className="btn btn-sm"
                              onClick={() => {
                                setNotifierProperty(prop);
                                setNotifierEventType(propStatus === 'sold' ? 'sold_unit' : 'new_unit');
                              }}
                              style={{
                                background: 'rgba(16, 185, 129, 0.12)',
                                border: '1px solid rgba(16, 185, 129, 0.35)',
                                color: '#10b981',
                                padding: '4px 8px',
                                borderRadius: '8px',
                                fontSize: '0.72rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                cursor: 'pointer'
                              }}
                              title={isAr ? 'إرسال إشعارات واتساب للعملاء المهتمين بهذه الوحدة' : 'Notify Matched Leads via WhatsApp'}
                            >
                              <MessageSquare size={13} />
                              <span>{isAr ? 'إشعار واتساب' : 'Notify'}</span>
                            </button>

                            {/* Edit */}
                            <button
                              type="button"
                              className="icon-action-table-btn btn-edit"
                              onClick={() => handleOpenEdit(prop)}
                              title={isAr ? 'تعديل التفاصيل' : 'Edit'}
                            >
                              <Edit3 size={15} />
                            </button>

                            {/* Soft Delete */}
                            <button
                              type="button"
                              className="icon-action-table-btn btn-del"
                              onClick={() => handleSoftDelete(prop.id)}
                              title={isAr ? 'نقل للمهملات' : 'Trash'}
                            >
                              <Trash2 size={15} />
                            </button>
                          </>
                        ) : (
                          <>
                            {/* Restore */}
                            <button
                              type="button"
                              className="icon-action-table-btn"
                              onClick={() => handleRestore(prop.id)}
                              title={isAr ? 'استرجاع ونشر العقار' : 'Restore'}
                              style={{ color: 'var(--emerald)' }}
                            >
                              <RotateCcw size={15} />
                            </button>

                            {/* Permanent Delete */}
                            <button
                              type="button"
                              className="icon-action-table-btn btn-del"
                              onClick={() => handlePermanentDelete(prop.id)}
                              title={isAr ? 'حذف نهائي للأبد' : 'Delete Permanently'}
                            >
                              <Trash2 size={15} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Modal */}
      {showAddModal && (
        <div className="track-modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="property-form-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '780px' }}>
            <div className="modal-form-header">
              <h3>{editingPropertyId ? (isAr ? 'تعديل بيانات العقار ومستوى العرض' : 'Edit Property & Display Settings') : (isAr ? 'إضافة عقار جديد للمنصة' : 'Add New Property')}</h3>
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
                    <small>{isAr ? 'JPG, PNG, WebP حتى 10MB لكل صورة' : 'Supports JPG, PNG, WebP up to 10MB'}</small>
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

              {/* 🎛️ Display Status, Featured & Priority Controls */}
              <div style={{ 
                background: 'rgba(255, 179, 0, 0.05)', 
                border: '1px solid var(--accent-gold-light)', 
                borderRadius: 'var(--radius-md)', 
                padding: '16px', 
                marginBottom: '20px' 
              }}>
                <h4 style={{ fontSize: '0.9rem', marginBottom: '12px', color: 'var(--accent-gold)', display: 'flex', alignItems: 'center', gap: '6px' }}>
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
                    <label>{isAr ? 'شارة الترويج (Badge)' : 'Marketing Badge'}</label>
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
                      onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <label htmlFor="featured-checkbox" style={{ cursor: 'pointer', margin: 0, fontWeight: 'bold' }}>
                      ⭐ {isAr ? 'تمييز في صدارة الموقع (Featured)' : 'Featured on Homepage'}
                    </label>
                  </div>
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
                      style={{ padding: '2px 8px', fontSize: '0.7rem', color: 'var(--accent-gold)', borderColor: 'var(--accent-gold-light)' }}
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
                    <span style={{ fontSize: '0.7rem', color: 'var(--emerald)', display: 'block', marginTop: '3px' }}>
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

                {/* Floor */}
                <div className="form-group-item">
                  <label>{isAr ? 'رقم الدور' : 'Floor'}</label>
                  <input
                    type="number"
                    value={form.floor}
                    onChange={(e) => setForm({ ...form, floor: parseInt(e.target.value) || 0 })}
                  />
                </div>
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
      )}

      {/* 📍 Interactive GIS Rooftop Map Picker Modal */}
      {showMapPicker && (
        <InteractiveMapPickerModal
          isOpen={showMapPicker}
          onClose={() => setShowMapPicker(false)}
          initialCoordinates={form.coordinates || SOHAG_AREA_COORDINATES[form.areaKey]}
          onConfirmCoordinates={(coords) => setForm(prev => ({ ...prev, coordinates: coords }))}
          lang={lang}
          triggerToast={triggerToast}
        />
      )}

      {/* 💬 Smart WhatsApp Retargeting & Matched Leads Modal */}
      {notifierProperty && (
        <WhatsAppMatchNotifierModal
          isOpen={Boolean(notifierProperty)}
          onClose={() => setNotifierProperty(null)}
          property={notifierProperty}
          allProperties={properties}
          leads={leads}
          demands={demands}
          defaultEventType={notifierEventType}
          lang={lang}
          triggerToast={triggerToast}
        />
      )}
    </div>
  );
}
