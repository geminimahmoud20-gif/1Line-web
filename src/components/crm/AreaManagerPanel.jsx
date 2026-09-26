import { useState, useEffect, useMemo } from 'react';
import { 
  MapPin, 
  Plus, 
  Edit3, 
  Trash2, 
  Save, 
  RotateCcw, 
  Search, 
  CheckCircle2, 
  ShieldCheck, 
  Globe, 
  Sparkles, 
  Navigation, 
  Layers, 
  X,
  AlertTriangle,
  Compass,
  Building,
  Check
} from 'lucide-react';
import { 
  getAreas, 
  saveAreas, 
  addArea, 
  updateArea, 
  deleteArea, 
  resetAreasToDefault, 
  DEFAULT_SOHAG_AREAS 
} from '../../utils/areasData';

export default function AreaManagerPanel({ lang = 'ar', triggerToast, properties = [], leads = [] }) {
  const isAr = lang === 'ar';
  const [areas, setAreas] = useState(() => getAreas());
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Modal States
  const [modalMode, setModalMode] = useState(null); // 'add' | 'edit' | null
  const [activeArea, setActiveArea] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Form State for Add / Edit
  const [formData, setFormData] = useState({
    id: '',
    name_ar: '',
    name_en: '',
    label_ar: '',
    label_en: '',
    lat: 26.5569,
    lng: 31.7001,
    zoom: 14,
    description_ar: ''
  });

  // Listen to external/cloud updates
  useEffect(() => {
    const handleUpdate = () => {
      setAreas(getAreas());
    };
    const handleSyncFailed = () => {
      if (triggerToast) triggerToast(isAr ? 'تم الحفظ على هذا الجهاز فقط — تعذّرت المزامنة السحابية، تحقق من الاتصال وأعد الحفظ' : 'Saved locally only — cloud sync failed', 'error');
    };
    window.addEventListener('oneline_areas_updated', handleUpdate);
    window.addEventListener('oneline_areas_sync_failed', handleSyncFailed);
    return () => {
      window.removeEventListener('oneline_areas_updated', handleUpdate);
      window.removeEventListener('oneline_areas_sync_failed', handleSyncFailed);
    };
  }, [triggerToast, isAr]);

  // Esc closes whichever modal is open; lock page scroll behind it
  useEffect(() => {
    if (!modalMode && !deleteConfirmId) return undefined;
    const onKey = (e) => {
      if (e.key !== 'Escape' || isSaving) return;
      setModalMode(null);
      setDeleteConfirmId(null);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [modalMode, deleteConfirmId, isSaving]);

  // Filtered areas
  const filteredAreas = useMemo(() => {
    if (!searchQuery.trim()) return areas;
    const q = searchQuery.toLowerCase().trim();
    return areas.filter(a => 
      a.name_ar?.toLowerCase().includes(q) ||
      a.name_en?.toLowerCase().includes(q) ||
      a.label_ar?.toLowerCase().includes(q) ||
      a.id?.toLowerCase().includes(q)
    );
  }, [areas, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = areas.length;
    const system = areas.filter(a => a.isSystem).length;
    const custom = total - system;
    return { total, system, custom };
  }, [areas]);

  // Open Add Modal
  const handleOpenAdd = () => {
    setFormData({
      id: '',
      name_ar: '',
      name_en: '',
      label_ar: '',
      label_en: '',
      lat: 26.5569,
      lng: 31.7001,
      zoom: 14,
      description_ar: '',
      avgPricePerMeter: 15000,
      annualGrowthRate: 75
    });
    setModalMode('add');
  };

  // Open Edit Modal
  const handleOpenEdit = (area) => {
    setActiveArea(area);
    setFormData({
      id: area.id,
      name_ar: area.name_ar || '',
      name_en: area.name_en || '',
      label_ar: area.label_ar || '',
      label_en: area.label_en || '',
      lat: area.center?.lat ?? 26.5569,
      lng: area.center?.lng ?? 31.7001,
      zoom: area.zoom ?? 14,
      description_ar: area.description_ar || '',
      avgPricePerMeter: area.avgPricePerMeter ?? 15000,
      annualGrowthRate: area.annualGrowthRate ?? 0
    });
    setModalMode('edit');
  };

  // Save Add / Edit
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!formData.name_ar.trim()) {
      if (triggerToast) triggerToast(isAr ? 'يرجى إدخال اسم المنطقة بالعربية' : 'Please enter Arabic name', 'error');
      return;
    }
    const lat = Number(formData.lat);
    const lng = Number(formData.lng);
    const price = Number(formData.avgPricePerMeter);
    const growth = Number(formData.annualGrowthRate);
    // Egypt bounding box — catches swapped or mistyped coordinates before they reach the public map
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < 22 || lat > 32 || lng < 24.5 || lng > 37) {
      if (triggerToast) triggerToast(isAr ? 'الإحداثيات خارج مصر — تأكد من خط العرض (22–32) وخط الطول (24.5–37)' : 'Coordinates must be inside Egypt', 'error');
      return;
    }
    if (!Number.isFinite(price) || price < 1000 || price > 1000000) {
      if (triggerToast) triggerToast(isAr ? 'متوسط سعر المتر يجب أن يكون بين 1,000 و 1,000,000 ج.م' : 'Price per m² must be 1,000–1,000,000 EGP', 'error');
      return;
    }
    if (!Number.isFinite(growth) || growth < 0 || growth > 500) {
      if (triggerToast) triggerToast(isAr ? 'نسبة النمو يجب أن تكون بين 0 و 500%' : 'Growth must be 0–500%', 'error');
      return;
    }

    setIsSaving(true);
    try {
      if (modalMode === 'add') {
        await addArea({
          id: formData.id,
          name_ar: formData.name_ar,
          name_en: formData.name_en || formData.name_ar,
          label_ar: formData.label_ar || formData.name_ar,
          label_en: formData.label_en || formData.name_en || formData.name_ar,
          center: { lat, lng },
          zoom: parseInt(formData.zoom, 10) || 14,
          description_ar: formData.description_ar,
          avgPricePerMeter: price,
          annualGrowthRate: growth
        });
        if (triggerToast) triggerToast(isAr ? 'تمت إضافة المنطقة' : 'Area added', 'success');
      } else if (modalMode === 'edit' && activeArea) {
        await updateArea(activeArea.id, {
          name_ar: formData.name_ar.trim(),
          name_en: formData.name_en.trim(),
          label_ar: formData.label_ar.trim(),
          label_en: formData.label_en.trim(),
          center: { lat, lng },
          zoom: parseInt(formData.zoom, 10) || 14,
          description_ar: formData.description_ar.trim(),
          avgPricePerMeter: price,
          annualGrowthRate: growth
        });
        if (triggerToast) triggerToast(isAr ? 'تم حفظ تعديلات المنطقة' : 'Area updated', 'success');
      }
      setAreas(getAreas());
      setModalMode(null);
    } catch (err) {
      console.error('Error saving area:', err);
      if (triggerToast) triggerToast(isAr ? 'حدث خطأ أثناء حفظ المنطقة' : 'Failed to save area', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Area
  const handleDeleteArea = async (id) => {
    if (id === 'all') {
      if (triggerToast) triggerToast(isAr ? 'لا يمكن حذف خيار "كل المناطق" لأنه خيار نظامي رئيسي' : 'Cannot delete system default', 'error');
      return;
    }

    setIsSaving(true);
    try {
      await deleteArea(id);
      setAreas(getAreas());
      setDeleteConfirmId(null);
      if (triggerToast) triggerToast(isAr ? 'تم حذف المنطقة بنجاح وتحديث فلاتر الموقع! 🗑️' : 'Area deleted successfully!', 'success');
    } catch (err) {
      console.error('Error deleting area:', err);
      if (triggerToast) triggerToast(isAr ? 'حدث خطأ أثناء الحذف' : 'Failed to delete', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to Defaults
  const handleResetDefaults = async () => {
    if (window.confirm(isAr ? 'هل أنت متأكد من رغبتك في استعادة قائمة الأحياء والمناطق الافتراضية الأصلية لسوهاج؟' : 'Reset areas to default?')) {
      setIsSaving(true);
      try {
        await resetAreasToDefault();
        setAreas(getAreas());
        if (triggerToast) triggerToast(isAr ? 'تمت استعادة قائمة الأحياء الافتراضية بنجاح 🔄' : 'Areas reset to defaults', 'success');
      } catch (err) {
        console.error('Error resetting areas:', err);
      } finally {
        setIsSaving(false);
      }
    }
  };

  // Count properties in area
  const getAreaPropertiesCount = (areaId) => {
    if (areaId === 'all') return properties.length;
    return properties.filter(p => p.location === areaId).length;
  };

  return (
    <div className="crm-subpanel-container animate-fadeIn">
      {/* Top Banner & Header */}
      <div className="crm-card" style={{ marginBottom: '20px', borderLeft: '4px solid var(--accent-gold)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <div style={{ 
                background: 'linear-gradient(135deg, rgba(217, 119, 6, 0.2), rgba(180, 83, 9, 0.4))', 
                padding: '8px', 
                borderRadius: '10px', 
                color: 'var(--crm-accent-text)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <MapPin size={22} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--crm-ink)', margin: 0 }}>
                  {isAr ? '🗺️ إدارة المناطق والأحياء' : '🗺️ Sohag Districts & Areas CMS'}
                </h2>
                <span style={{ fontSize: 'var(--crm-text-sm)', color: 'var(--crm-faint)' }}>
                  {isAr ? 'إضافة وتعديل وحذف مناطق محافظة سوهاج مع المزامنة السحابية الفورية لكافة شاشات وفلاتر الموقع' : 'Manage all districts & sync real-time across platform'}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: 'var(--crm-text-xs)',
              fontWeight: '700',
              background: 'rgba(16, 185, 129, 0.15)',
              color: 'var(--crm-positive)',
              border: '1px solid rgba(16, 185, 129, 0.3)'
            }}>
              <CheckCircle2 size={13} />
              {isAr ? 'مزامنة سحابية حية' : 'Live Cloud Sync'}
            </span>

            <button
              type="button"
              className="btn btn-primary"
              onClick={handleOpenAdd}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'linear-gradient(135deg, #d97706, #b45309)',
                color: 'var(--crm-ink)',
                padding: '9px 16px',
                borderRadius: '10px',
                fontWeight: 'bold',
                fontSize: 'var(--crm-text-base)'
              }}
            >
              <Plus size={16} />
              <span>{isAr ? 'إضافة حي / منطقة جديدة' : 'Add New District'}</span>
            </button>

            <button
              type="button"
              className="btn btn-outline"
              onClick={handleResetDefaults}
              title={isAr ? 'استعادة الأحياء الافتراضية' : 'Reset Defaults'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 14px',
                fontSize: 'var(--crm-text-sm)',
                color: 'var(--crm-body)',
                borderColor: 'var(--crm-line-strong)'
              }}
            >
              <RotateCcw size={14} />
              <span>{isAr ? 'استعادة الافتراضيات' : 'Reset'}</span>
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
          gap: '12px', 
          marginTop: '18px',
          paddingTop: '16px',
          borderTop: '1px solid var(--crm-line)'
        }}>
          <div style={{ background: 'var(--crm-subtle)', padding: '10px 14px', borderRadius: '10px' }}>
            <span style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-faint)' }}>{isAr ? 'إجمالي المناطق والأحياء' : 'Total Districts'}</span>
            <strong style={{ display: 'block', fontSize: '1.2rem', color: 'var(--crm-ink)', marginTop: '2px' }}>{stats.total} {isAr ? 'منطقة' : 'Areas'}</strong>
          </div>
          <div style={{ background: 'var(--crm-subtle)', padding: '10px 14px', borderRadius: '10px' }}>
            <span style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-faint)' }}>{isAr ? 'الأحياء المخصصة المضافة' : 'Custom Added Districts'}</span>
            <strong style={{ display: 'block', fontSize: '1.2rem', color: 'var(--crm-accent-text)', marginTop: '2px' }}>{stats.custom} {isAr ? 'حي إضافي' : 'Custom'}</strong>
          </div>
          <div style={{ background: 'var(--crm-subtle)', padding: '10px 14px', borderRadius: '10px' }}>
            <span style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-faint)' }}>{isAr ? 'الأحياء الأساسية الرسمية' : 'System Districts'}</span>
            <strong style={{ display: 'block', fontSize: '1.2rem', color: 'var(--crm-info)', marginTop: '2px' }}>{stats.system} {isAr ? 'مناطق رئيسية' : 'Core'}</strong>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="crm-card" style={{ marginBottom: '20px', padding: '14px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Search size={18} style={{ color: 'var(--crm-faint)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isAr ? 'بحث سريع باسم الحي، المعرف، أو المعالم الرئيسية...' : 'Search districts by name, ID, or landmarks...'}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              color: 'var(--crm-ink)',
              fontSize: 'var(--crm-text-base)',
              outline: 'none'
            }}
          />
          {searchQuery && (
            <button 
              type="button" 
              onClick={() => setSearchQuery('')}
              style={{ background: 'transparent', border: 'none', color: 'var(--crm-faint)', cursor: 'pointer' }}
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Areas Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
        gap: '16px' 
      }}>
        {filteredAreas.map((area) => {
          const propCount = getAreaPropertiesCount(area.id);
          const isSystem = area.isSystem || area.id === 'all';

          return (
            <div 
              key={area.id} 
              className="crm-card area-item-card animate-fadeIn"
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                border: area.id === 'all' ? '1px dashed rgba(217, 119, 6, 0.4)' : '1px solid var(--crm-line)',
                background: area.id === 'all' ? 'rgba(217, 119, 6, 0.04)' : 'var(--crm-card)',
                padding: '18px',
                borderRadius: '12px',
                transition: 'all 0.2s ease'
              }}
            >
              <div>
                {/* Card Top Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--crm-ink)', margin: 0 }}>
                        {area.name_ar}
                      </h3>
                      <span style={{ 
                        fontSize: 'var(--crm-text-xs)', 
                        padding: '2px 8px', 
                        borderRadius: '6px', 
                        background: isSystem ? 'rgba(37, 99, 235, 0.1)' : 'rgba(217, 119, 6, 0.15)',
                        color: isSystem ? 'var(--crm-info)' : 'var(--accent-gold)',
                        fontWeight: '600'
                      }}>
                        #{area.id}
                      </span>
                    </div>
                    <span style={{ fontSize: 'var(--crm-text-sm)', color: 'var(--crm-faint)', marginTop: '2px', display: 'block' }}>
                      {area.name_en || area.id}
                    </span>
                  </div>

                  <span style={{
                    fontSize: 'var(--crm-text-xs)',
                    fontWeight: 'bold',
                    padding: '4px 10px',
                    borderRadius: '8px',
                    background: propCount > 0 ? 'rgba(16, 185, 129, 0.15)' : 'var(--crm-subtle)',
                    color: propCount > 0 ? 'var(--crm-positive)' : 'var(--crm-muted)'
                  }}>
                    {propCount} {isAr ? 'عقار' : 'Props'}
                  </span>
                </div>

                {/* Description / Landmarks */}
                {area.label_ar && area.label_ar !== area.name_ar && (
                  <div style={{ 
                    fontSize: 'var(--crm-text-sm)', 
                    color: 'var(--crm-body)', 
                    background: 'var(--crm-subtle)', 
                    padding: '8px 10px', 
                    borderRadius: '8px',
                    marginBottom: '10px'
                  }}>
                    <strong style={{ color: 'var(--crm-accent-text)', fontSize: 'var(--crm-text-xs)', display: 'block', marginBottom: '2px' }}>
                      {isAr ? 'التفاصيل والمعالم:' : 'Details & Landmarks:'}
                    </strong>
                    {area.label_ar}
                  </div>
                )}

                {/* Benchmark & Growth Highlights */}
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  flexWrap: 'wrap',
                  marginBottom: '12px'
                }}>
                  <span style={{
                    fontSize: 'var(--crm-text-xs)',
                    fontWeight: '700',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: 'rgba(217, 119, 6, 0.12)',
                    color: 'var(--crm-accent-text)',
                    border: '1px solid rgba(217, 119, 6, 0.25)'
                  }}>
                    {isAr ? `متوسط: ${(area.avgPricePerMeter || 15000).toLocaleString()} ج.م/م²` : `Avg: ${(area.avgPricePerMeter || 15000).toLocaleString()} EGP/m²`}
                  </span>
                  <span style={{
                    fontSize: 'var(--crm-text-xs)',
                    fontWeight: '700',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: 'rgba(16, 185, 129, 0.12)',
                    color: 'var(--crm-positive)',
                    border: '1px solid rgba(16, 185, 129, 0.25)'
                  }}>
                    {isAr ? `نمو: +${area.annualGrowthRate ?? 0}%` : `Growth: +${area.annualGrowthRate ?? 0}%`}
                  </span>
                  {area.amenities?.length > 0 && (
                    <span style={{
                      fontSize: 'var(--crm-text-xs)',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      background: 'rgba(56, 189, 248, 0.1)',
                      color: 'var(--crm-info)'
                    }}>
                      {isAr ? `${area.amenities.length} معالم حيوية` : `${area.amenities.length} Amenities`}
                    </span>
                  )}
                </div>

                {/* Coordinates & Geo Info */}
                {area.center && (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px', 
                    fontSize: 'var(--crm-text-xs)', 
                    color: 'var(--crm-muted)',
                    marginBottom: '14px' 
                  }}>
                    <Navigation size={12} style={{ color: 'var(--crm-accent-text)' }} />
                    <span dir="ltr">Lat: {Number(area.center.lat).toFixed(4)}, Lng: {Number(area.center.lng).toFixed(4)}</span>
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'flex-end', 
                gap: '8px',
                paddingTop: '12px',
                borderTop: '1px solid var(--crm-line)'
              }}>
                <button
                  type="button"
                  className="btn-action-mini"
                  onClick={() => handleOpenEdit(area)}
                  aria-label={isAr ? `تعديل ${area.name_ar}` : `Edit ${area.name_en || area.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: 'var(--crm-text-sm)',
                    background: 'var(--crm-card)',
                    color: 'var(--crm-ink)',
                    border: '1px solid var(--crm-line-strong)',
                    cursor: 'pointer'
                  }}
                >
                  <Edit3 size={13} />
                  <span>{isAr ? 'تعديل' : 'Edit'}</span>
                </button>

                {area.id !== 'all' && (
                  <button
                    type="button"
                    className="btn-action-mini"
                    onClick={() => setDeleteConfirmId(area.id)}
                    aria-label={isAr ? `حذف ${area.name_ar}` : `Delete ${area.name_en || area.id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: 'var(--crm-text-sm)',
                      background: 'rgba(239, 68, 68, 0.12)',
                      color: 'var(--crm-danger)',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      cursor: 'pointer'
                    }}
                  >
                    <Trash2 size={13} />
                    <span>{isAr ? 'حذف' : 'Delete'}</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredAreas.length === 0 && (
        <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--crm-faint)' }}>
          <MapPin size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
          <h4>{isAr ? 'لم يتم العثور على مناطق مطابقة لبحثك' : 'No matching districts found'}</h4>
          <p style={{ fontSize: 'var(--crm-text-base)' }}>{isAr ? 'جرب البحث بكلمات أخرى أو أضف الحي الجديد الآن.' : 'Try another query or add a new district.'}</p>
        </div>
      )}

      {/* MODAL: Add / Edit Area */}
      {modalMode && (
        <div className="crm-modal-backdrop" onClick={() => !isSaving && setModalMode(null)}>
          <div className="crm-modal-card" role="dialog" aria-modal="true" aria-labelledby="area-modal-title" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ 
                  background: 'linear-gradient(135deg, rgba(217, 119, 6, 0.2), rgba(180, 83, 9, 0.4))', 
                  padding: '8px', 
                  borderRadius: '10px', 
                  color: 'var(--accent-gold)' 
                }}>
                  {modalMode === 'add' ? <Plus size={20} /> : <Edit3 size={20} />}
                </div>
                <div>
                  <h3 id="area-modal-title" style={{ margin: 0, fontSize: '1.15rem', color: '#fff' }}>
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
                  <label style={{ display: 'block', fontSize: 'var(--crm-text-sm)', color: '#cbd5e1', marginBottom: '6px' }}>
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
                      color: '#fff',
                      fontSize: 'var(--crm-text-base)'
                    }}
                  />
                </div>

                <div className="form-group-item">
                  <label style={{ display: 'block', fontSize: 'var(--crm-text-sm)', color: '#cbd5e1', marginBottom: '6px' }}>
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
                      color: '#fff',
                      fontSize: 'var(--crm-text-base)'
                    }}
                  />
                </div>
              </div>

              {/* Detailed Label for Dropdowns */}
              <div className="form-group-item" style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: 'var(--crm-text-sm)', color: '#cbd5e1', marginBottom: '6px' }}>
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
                    color: '#fff',
                    fontSize: 'var(--crm-text-base)'
                  }}
                />
              </div>

              {/* Coordinates: Lat & Lng */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div className="form-group-item">
                  <label style={{ display: 'block', fontSize: 'var(--crm-text-sm)', color: '#cbd5e1', marginBottom: '6px' }}>
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
                      color: '#fff',
                      fontSize: 'var(--crm-text-base)'
                    }}
                  />
                </div>

                <div className="form-group-item">
                  <label style={{ display: 'block', fontSize: 'var(--crm-text-sm)', color: '#cbd5e1', marginBottom: '6px' }}>
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
                      color: '#fff',
                      fontSize: 'var(--crm-text-base)'
                    }}
                  />
                </div>
              </div>

              {/* Market Benchmark: Avg Price Per Meter & Growth Rate */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div className="form-group-item">
                  <label style={{ display: 'block', fontSize: 'var(--crm-text-sm)', color: '#cbd5e1', marginBottom: '6px' }}>
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
                      color: 'var(--accent-gold)',
                      fontWeight: 'bold',
                      fontSize: 'var(--crm-text-base)'
                    }}
                  />
                  <small style={{ color: 'var(--crm-faint)', fontSize: 'var(--crm-text-xs)', display: 'block', marginTop: '4px' }}>
                    {isAr ? 'يحدد معيار عدالة الأسعار التلقائي للحي' : 'Sets valuation benchmark for district'}
                  </small>
                </div>

                <div className="form-group-item">
                  <label style={{ display: 'block', fontSize: 'var(--crm-text-sm)', color: '#cbd5e1', marginBottom: '6px' }}>
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
                <label style={{ display: 'block', fontSize: 'var(--crm-text-sm)', color: '#cbd5e1', marginBottom: '6px' }}>
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
                    color: '#fff',
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
                  style={{ padding: '10px 18px', color: '#cbd5e1' }}
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
                    background: 'linear-gradient(135deg, #d97706, #b45309)',
                    padding: '10px 22px',
                    borderRadius: '10px',
                    fontWeight: 'bold',
                    color: '#fff'
                  }}
                >
                  <Save size={16} />
                  <span>{isSaving ? (isAr ? 'جاري النشر السحابي...' : 'Saving...') : (isAr ? 'حفظ ونشر الحي فوراً' : 'Save & Publish')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Delete Confirmation */}
      {deleteConfirmId && (
        <div className="crm-modal-backdrop" onClick={() => !isSaving && setDeleteConfirmId(null)}>
          <div className="crm-modal-card" role="alertdialog" aria-modal="true" aria-labelledby="area-delete-title" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px', textAlign: 'center' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#f87171',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto'
            }}>
              <AlertTriangle size={28} />
            </div>

            <h3 id="area-delete-title" style={{ margin: '0 0 8px 0', color: '#fff', fontSize: '1.15rem' }}>
              {isAr
                ? `حذف «${areas.find((a) => a.id === deleteConfirmId)?.name_ar || deleteConfirmId}»؟`
                : 'Confirm District Deletion'}
            </h3>
            <p style={{ color: '#cbd5e1', fontSize: 'var(--crm-text-base)', marginBottom: getAreaPropertiesCount(deleteConfirmId) > 0 ? '10px' : '20px' }}>
              {isAr
                ? 'سيتم إزالة الحي من فلاتر البحث ونماذج البيع والشراء في الموقع.'
                : 'The district will be removed from all search filters.'}
            </p>
            {getAreaPropertiesCount(deleteConfirmId) > 0 && (
              <p style={{ color: '#fca5a5', fontSize: 'var(--crm-text-sm)', fontWeight: 700, background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', padding: '8px 10px', marginBottom: '18px' }}>
                {isAr
                  ? `تنبيه: ${getAreaPropertiesCount(deleteConfirmId)} عقار مرتبط بهذا الحي وسيظهر بدون اسم منطقة. انقلها لحي آخر أولاً.`
                  : `${getAreaPropertiesCount(deleteConfirmId)} listings use this district.`}
              </p>
            )}

            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setDeleteConfirmId(null)}
                disabled={isSaving}
                style={{ padding: '9px 18px', color: '#cbd5e1' }}
              >
                {isAr ? 'تراجع' : 'Cancel'}
              </button>

              <button
                type="button"
                onClick={() => handleDeleteArea(deleteConfirmId)}
                disabled={isSaving}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#dc2626',
                  color: '#fff',
                  border: 'none',
                  padding: '9px 20px',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                <Trash2 size={15} />
                <span>{isSaving ? (isAr ? 'جاري الحذف...' : 'Deleting...') : (isAr ? 'نعم، احذف المنطقة' : 'Delete')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
