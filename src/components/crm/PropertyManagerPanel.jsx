import { useState, useEffect, useMemo } from 'react';
import { Building, Plus, Trash2, Upload, Eye, EyeOff, Database, Archive, FileSpreadsheet } from 'lucide-react';
import { getAreas } from '../../utils/areasData';
import HomepageSlotsBoard, { FeaturedSlotModal } from './HomepageSlotsBoard';

import { exportToCsv } from '../../utils/exportCsv';
import InteractiveMapPickerModal from './InteractiveMapPickerModal';
import WhatsAppMatchNotifierModal from './WhatsAppMatchNotifierModal';
import { findMatchingClientsForProperty } from '../../utils/matchingEngine';

import { uploadMultipleImages } from '../../utils/imageUploadService';

// Accurate GPS Coordinates map for Sohag Districts
import PropertyFormModal from './PropertyFormModal';
import PropertyTableRow from './PropertyTableRow';
import OfferModal from './OfferModal';
const SOHAG_AREA_COORDINATES = {
  east: { lat: 26.5569, lng: 31.7001 },
  new_sohag: { lat: 26.4715, lng: 31.6620 },
  west: { lat: 26.5600, lng: 31.6850 },
  markaz: { lat: 26.5700, lng: 31.6700 },
  akhmeem: { lat: 26.5630, lng: 31.7450 }
};

const DEFAULT_FORM_STATE = {
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
  // No legal record until the team actually reviews the documents (CRM → الموقف القانوني)
  legalStatus: null,
  customBenchmarkPrice: '',
  nearbyAmenities: []
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
  const [slotEditing, setSlotEditing] = useState(null); // property being scheduled for the homepage
  const [offerEditing, setOfferEditing] = useState(null); // property whose limited-time offer is being edited

  useEffect(() => {
    const handleUpdate = () => setAreas(getAreas());
    window.addEventListener('oneline_areas_updated', handleUpdate);
    return () => window.removeEventListener('oneline_areas_updated', handleUpdate);
  }, []);

  const isAr = lang === 'ar';

  const [form, setForm] = useState(DEFAULT_FORM_STATE);

  // Handle external conversion request (from CRM Leads to Property)
  const [prevExternalData, setPrevExternalData] = useState(null);
  if (externalNewPropertyData && externalNewPropertyData !== prevExternalData) {
    setPrevExternalData(externalNewPropertyData);
    setEditingPropertyId(null);
    setForm({
      ...DEFAULT_FORM_STATE,
      ...externalNewPropertyData
    });
    setShowAddModal(true);
  }

  useEffect(() => {
    if (externalNewPropertyData) {
      onClearExternalData?.();
    }
  }, [externalNewPropertyData, onClearExternalData]);

  const handleOpenAdd = () => {
    setEditingPropertyId(null);
    setForm(DEFAULT_FORM_STATE);
    setShowAddModal(true);
  };

  const handleOpenEdit = (prop) => {
    setEditingPropertyId(prop.id);
    const isCommercialOrLand = prop.type === 'commercial' || prop.type === 'land' || prop.type === 'office';
    setForm({
      ...DEFAULT_FORM_STATE,
      ...prop,
      bedrooms: isCommercialOrLand ? 0 : (prop.bedrooms || 0),
      bathrooms: prop.type === 'land' ? 0 : (prop.bathrooms || 0),
      status: prop.status || (prop.isArchived ? 'hidden' : 'published')
    });
    setShowAddModal(true);
  };

  // Quick Toggle Visibility (Active / Hidden)
  const handleToggleVisibility = (prop) => {
    const currentStatus = prop.status || 'published';
    const newStatus = currentStatus === 'published' ? 'hidden' : 'published';
    const res = onUpdateProperty(prop.id, { status: newStatus });
    if (res === false) return;
    triggerToast(
      newStatus === 'published' 
        ? (isAr ? 'تم تفعيل وإظهار العقار على الموقع للزوار' : 'Property is now Published live')
        : (isAr ? 'تم إخفاء العقار مؤقتاً من الموقع' : 'Property is now Hidden from website'),
      'info'
    );
  };

  // Quick Status Change from Table Row
  const handleStatusChange = (propId, newStatus) => {
    const res = onUpdateProperty(propId, { status: newStatus });
    if (res === false) return;
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
      const res = onUpdateProperty(propId, { isDeleted: true, status: 'trash' });
      if (res !== false) {
        triggerToast(isAr ? 'تم نقل العقار إلى سلة المهملات' : 'Property moved to Trash', 'info');
      }
    }
  };

  // Restore from Trash
  const handleRestore = (propId) => {
    const res = onUpdateProperty(propId, { isDeleted: false, status: 'published' });
    if (res !== false) {
      triggerToast(isAr ? 'تم استرجاع العقار وإعادة نشره بنجاح!' : 'Property restored and published!', 'success');
    }
  };

  // Permanent Hard Delete
  const handlePermanentDelete = (propId) => {
    if (window.confirm(isAr ? 'تحذير: هل أنت متأكد من الحذف النهائي؟ لن يمكن استرجاع العقار أبداً.' : 'Warning: Delete permanently? Cannot be undone.')) {
      const res = onDeleteProperty(propId);
      if (res !== false) {
        triggerToast(isAr ? 'تم الحذف النهائي للعقار' : 'Property permanently deleted', 'info');
      }
    }
  };

  // Advanced Cloud Upload & Multi-Image Canvas Compressor
  const MAX_FILE_SIZE_MB = 15;
  const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const processSelectedFiles = async (filesList) => {
    const files = Array.from(filesList);
    if (!files.length) return;

    // Filter out non-images or oversized files
    const validFiles = [];
    const oversizedFiles = [];

    files.forEach((file) => {
      if (!file.type.startsWith('image/')) return;
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
          : `${oversizedFiles.length} file(s) rejected (exceeds ${MAX_FILE_SIZE_MB}MB limit)`,
        'error'
      );
    }

    if (validFiles.length === 0) return;

    setIsUploadingImages(true);
    setUploadProgressText(isAr ? `جاري ضغط ومعالجة ${validFiles.length} صورة...` : `Compressing ${validFiles.length} photos...`);

    try {
      const propId = editingPropertyId || `prop_${Date.now()}`;
      const uploadedUrls = await uploadMultipleImages(
        validFiles, 
        propId, 
        (done, total) => {
          setUploadProgressText(
            isAr 
              ? `تم رفع ومعالجة ${done} من ${total} صورة...` 
              : `Processed ${done}/${total} photos...`
          );
        }
      );

      if (uploadedUrls.length > 0) {
        setForm((prev) => ({
          ...prev,
          images: [...uploadedUrls, ...prev.images]
        }));
        triggerToast(
          isAr 
            ? `تم ضغط ورفع ${uploadedUrls.length} صورة بنجاح بجودة معمارية فائقة ⚡` 
            : `${uploadedUrls.length} photos compressed & saved successfully!`, 
          'success'
        );
      }
    } catch (err) {
      console.error('Image upload failed:', err);
      triggerToast(isAr ? 'حدث خطأ أثناء معالجة الصور' : 'Failed to process images', 'error');
    } finally {
      setIsUploadingImages(false);
      setUploadProgressText('');
    }
  };

  const handleFileUpload = (e) => {
    processSelectedFiles(e.target.files);
    e.target.value = '';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    if (e.dataTransfer && e.dataTransfer.files) {
      processSelectedFiles(e.dataTransfer.files);
    }
  };

  const handleSetPrimaryImage = (indexToPrimary) => {
    setForm((prev) => {
      const selected = prev.images[indexToPrimary];
      const rest = prev.images.filter((_, idx) => idx !== indexToPrimary);
      return {
        ...prev,
        images: [selected, ...rest]
      };
    });
    triggerToast(isAr ? 'تم تعيين الصورة كغلاف رئيسي للعقار 🌟' : 'Set as primary cover photo', 'success');
  };

  const handleRemoveImage = (indexToRemove) => {
    setForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, idx) => idx !== indexToRemove)
    }));
  };

  // Handlers for Custom Amenities per Property
  const handleAddCustomAmenity = () => {
    const newItem = {
      id: Date.now(),
      name_ar: '',
      name_en: '',
      category: 'education',
      distance: '500 متر',
      timeWalk: '6 دقائق',
      timeDrive: '2 دقيقة'
    };
    setForm(prev => ({
      ...prev,
      nearbyAmenities: [...(prev.nearbyAmenities || []), newItem]
    }));
  };

  const handleUpdateCustomAmenity = (index, field, value) => {
    setForm(prev => {
      const list = [...(prev.nearbyAmenities || [])];
      list[index] = { ...list[index], [field]: value };
      return { ...prev, nearbyAmenities: list };
    });
  };

  const handleRemoveCustomAmenity = (index) => {
    setForm(prev => ({
      ...prev,
      nearbyAmenities: (prev.nearbyAmenities || []).filter((_, i) => i !== index)
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
    triggerToast(isAr ? 'تم تنزيل ملف النسخة الاحتياطية الكاملة بنجاح!' : 'Full backup downloaded successfully!', 'success');
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

    // Cleanse sector-specific attributes (commercial & land have 0 bedrooms)
    const isCommercial = form.type === 'commercial';
    const isLand = form.type === 'land';
    const isOffice = form.type === 'office';
    const category = isCommercial ? 'commercial' : isOffice ? 'administrative' : isLand ? 'land' : 'residential';
    const cleanForm = {
      ...form,
      category,
      bedrooms: (isCommercial || isLand || isOffice) ? 0 : (parseInt(form.bedrooms) || 0),
      bathrooms: isLand ? 0 : (parseInt(form.bathrooms) || 0),
      floor: isLand ? 0 : (parseInt(form.floor) || 0)
    };

    if (editingPropertyId) {
      onUpdateProperty(editingPropertyId, { ...cleanForm, coordinates: finalCoords });
      triggerToast(isAr ? 'تم تحديث بيانات العقار وموقعه على الخريطة بنجاح!' : 'Property updated successfully!', 'success');
    } else {
      const newProp = {
        id: 'prop-' + Date.now(),
        ...cleanForm,
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

  // Memoized status counts in a single pass $O(N)$
  const { activeCount, hiddenCount, negotiationCount, soldCount, trashCount } = useMemo(() => {
    let active = 0;
    let hidden = 0;
    let negotiation = 0;
    let sold = 0;
    let trash = 0;

    for (let i = 0; i < properties.length; i++) {
      const p = properties[i];
      if (p.isDeleted || p.status === 'trash') {
        trash++;
      } else {
        const st = p.status || (p.isArchived ? 'hidden' : 'published');
        if (st === 'published') active++;
        else if (st === 'hidden') hidden++;
        else if (st === 'under_negotiation') negotiation++;
        else if (st === 'sold') sold++;
      }
    }

    return {
      activeCount: active,
      hiddenCount: hidden,
      negotiationCount: negotiation,
      soldCount: sold,
      trashCount: trash
    };
  }, [properties]);

  // Filtered Properties for Display (Memoized)
  const filteredProperties = useMemo(() => {
    return properties.filter((prop) => {
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
  }, [properties, statusFilter, searchQuery]);

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
          <h3>{isAr ? 'إدارة العقارات والوحدات المعروضة' : 'Property Catalog Management'}</h3>
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

      {/* What visitors see on the homepage right now: featured slots, periods, order */}
      <HomepageSlotsBoard properties={properties} onUpdateProperty={onUpdateProperty} isAr={isAr} />
      {slotEditing && (
        <FeaturedSlotModal
          property={slotEditing}
          isAr={isAr}
          nextOrder={properties.filter((p) => p.featured).length + 1}
          onClose={() => setSlotEditing(null)}
          onSave={(patch) => {
            if (onUpdateProperty(slotEditing.id, patch) !== false) {
              triggerToast(isAr ? 'تم جدولة التمييز في الصفحة الرئيسية' : 'Homepage feature scheduled', 'success');
            }
            setSlotEditing(null);
          }}
        />
      )}

      {offerEditing && (
        <OfferModal
          property={offerEditing}
          isAr={isAr}
          onClose={() => setOfferEditing(null)}
          onSave={(patch, extended, removed) => {
            if (onUpdateProperty(offerEditing.id, patch) !== false) {
              triggerToast(removed
                ? (isAr ? 'تم إنهاء العرض — رجع السعر كما كان' : 'Offer ended — price back to normal')
                : extended
                  ? (isAr ? 'تم تمديد العرض — سيظهر للعملاء "تم تمديد العرض"' : 'Offer extended — visitors will see "Offer extended"')
                  : (isAr ? 'تم حفظ العرض — يظهر في موعده وينتهي تلقائياً' : 'Offer saved — it starts on time and ends automatically'), 'success');
            }
            setOfferEditing(null);
          }}
        />
      )}

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
            style={{ color: statusFilter === 'published' ? 'var(--crm-positive)' : undefined }}
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
            style={{ padding: '6px 14px', fontSize: 'var(--crm-text-base)', width: '220px', borderRadius: 'var(--radius-pill)' }}
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
                <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--crm-muted)' }}>
                  <Building size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
                  <p>{isAr ? 'لا توجد عقارات مطابقة للفلتر المحدد' : 'No properties found in this tab'}</p>
                </td>
              </tr>
            ) : (
              filteredProperties.map((prop) => {
                return (
                  <PropertyTableRow
                    key={prop.id}
                    prop={prop}
                    isAr={isAr}
                    areas={areas}
                    handleStatusChange={handleStatusChange}
                    handleToggleVisibility={handleToggleVisibility}
                    handleOpenEdit={handleOpenEdit}
                    handleSoftDelete={handleSoftDelete}
                    handleRestore={handleRestore}
                    handlePermanentDelete={handlePermanentDelete}
                    onUpdateProperty={onUpdateProperty}
                    triggerToast={triggerToast}
                    setSlotEditing={setSlotEditing}
                    setOfferEditing={setOfferEditing}
                    setNotifierProperty={setNotifierProperty}
                    setNotifierEventType={setNotifierEventType}
                  />
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Modal */}
      {showAddModal && (
        <PropertyFormModal
          areas={areas}
          badgePresets={badgePresets}
          editingPropertyId={editingPropertyId}
          form={form}
          handleAddCustomAmenity={handleAddCustomAmenity}
          handleDragLeave={handleDragLeave}
          handleDragOver={handleDragOver}
          handleDrop={handleDrop}
          handleFileUpload={handleFileUpload}
          handleRemoveCustomAmenity={handleRemoveCustomAmenity}
          handleRemoveImage={handleRemoveImage}
          handleSetPrimaryImage={handleSetPrimaryImage}
          handleSubmit={handleSubmit}
          handleUpdateCustomAmenity={handleUpdateCustomAmenity}
          isAr={isAr}
          isDraggingOver={isDraggingOver}
          isUploadingImages={isUploadingImages}
          setForm={setForm}
          setShowAddModal={setShowAddModal}
          setShowMapPicker={setShowMapPicker}
          uploadProgressText={uploadProgressText}
        />
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
