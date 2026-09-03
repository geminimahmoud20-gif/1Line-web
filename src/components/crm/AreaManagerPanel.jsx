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
    window.addEventListener('oneline_areas_updated', handleUpdate);
    return () => window.removeEventListener('oneline_areas_updated', handleUpdate);
  }, []);

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
      description_ar: ''
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
      lat: area.center?.lat || 26.5569,
      lng: area.center?.lng || 31.7001,
      zoom: area.zoom || 14,
      description_ar: area.description_ar || ''
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

    setIsSaving(true);
    try {
      if (modalMode === 'add') {
        await addArea({
          id: formData.id,
          name_ar: formData.name_ar,
          name_en: formData.name_en || formData.name_ar,
          label_ar: formData.label_ar || formData.name_ar,
          label_en: formData.label_en || formData.name_en || formData.name_ar,
          center: { lat: parseFloat(formData.lat) || 26.5569, lng: parseFloat(formData.lng) || 31.7001 },
          zoom: parseInt(formData.zoom, 10) || 14,
          description_ar: formData.description_ar
        });
        if (triggerToast) triggerToast(isAr ? 'تمت إضافة المنطقة بنجاح ونشرها على كامل الموقع! 🎉' : 'Area added successfully!', 'success');
      } else if (modalMode === 'edit' && activeArea) {
        await updateArea(activeArea.id, {
          name_ar: formData.name_ar,
          name_en: formData.name_en,
          label_ar: formData.label_ar,
          label_en: formData.label_en,
          center: { lat: parseFloat(formData.lat) || 26.5569, lng: parseFloat(formData.lng) || 31.7001 },
          zoom: parseInt(formData.zoom, 10) || 14,
          description_ar: formData.description_ar
        });
        if (triggerToast) triggerToast(isAr ? 'تم تحديث بيانات المنطقة ونشرها سحابياً! ✏️' : 'Area updated successfully!', 'success');
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
                color: 'var(--accent-gold)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <MapPin size={22} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#fff', margin: 0 }}>
                  {isAr ? '🗺️ إدارة المناطق والأحياء (Sohag Districts CMS)' : '🗺️ Sohag Districts & Areas CMS'}
                </h2>
                <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
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
              fontSize: '0.78rem',
              fontWeight: '700',
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#10b981',
              border: '1px solid rgba(16, 185, 129, 0.3)'
            }}>
              <CheckCircle2 size={13} />
              {isAr ? 'مزامنة سحابية حية (Firestore)' : 'Live Cloud Sync'}
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
                color: '#fff',
                padding: '9px 16px',
                borderRadius: '10px',
                fontWeight: 'bold',
                fontSize: '0.88rem'
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
                fontSize: '0.82rem',
                color: '#cbd5e1',
                borderColor: 'rgba(255, 255, 255, 0.15)'
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
          borderTop: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '10px 14px', borderRadius: '10px' }}>
            <span style={{ fontSize: '0.76rem', color: '#94a3b8' }}>{isAr ? 'إجمالي المناطق والأحياء' : 'Total Districts'}</span>
            <strong style={{ display: 'block', fontSize: '1.2rem', color: '#fff', marginTop: '2px' }}>{stats.total} {isAr ? 'منطقة' : 'Areas'}</strong>
          </div>
          <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '10px 14px', borderRadius: '10px' }}>
            <span style={{ fontSize: '0.76rem', color: '#94a3b8' }}>{isAr ? 'الأحياء المخصصة المضافة' : 'Custom Added Districts'}</span>
            <strong style={{ display: 'block', fontSize: '1.2rem', color: 'var(--accent-gold)', marginTop: '2px' }}>{stats.custom} {isAr ? 'حي إضافي' : 'Custom'}</strong>
          </div>
          <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '10px 14px', borderRadius: '10px' }}>
            <span style={{ fontSize: '0.76rem', color: '#94a3b8' }}>{isAr ? 'الأحياء الأساسية الرسمية' : 'System Districts'}</span>
            <strong style={{ display: 'block', fontSize: '1.2rem', color: '#38bdf8', marginTop: '2px' }}>{stats.system} {isAr ? 'مناطق رئيسية' : 'Core'}</strong>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="crm-card" style={{ marginBottom: '20px', padding: '14px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Search size={18} style={{ color: '#94a3b8' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isAr ? 'بحث سريع باسم الحي، المعرف، أو المعالم الرئيسية...' : 'Search districts by name, ID, or landmarks...'}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              color: '#fff',
              fontSize: '0.9rem',
              outline: 'none'
            }}
          />
          {searchQuery && (
            <button 
              type="button" 
              onClick={() => setSearchQuery('')}
              style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
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
                border: area.id === 'all' ? '1px dashed rgba(217, 119, 6, 0.4)' : '1px solid rgba(255, 255, 255, 0.09)',
                background: area.id === 'all' ? 'rgba(217, 119, 6, 0.04)' : 'var(--glass-bg)',
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
                      <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#fff', margin: 0 }}>
                        {area.name_ar}
                      </h3>
                      <span style={{ 
                        fontSize: '0.72rem', 
                        padding: '2px 8px', 
                        borderRadius: '6px', 
                        background: isSystem ? 'rgba(56, 189, 248, 0.15)' : 'rgba(217, 119, 6, 0.15)',
                        color: isSystem ? '#38bdf8' : 'var(--accent-gold)',
                        fontWeight: '600'
                      }}>
                        #{area.id}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '2px', display: 'block' }}>
                      {area.name_en || area.id}
                    </span>
                  </div>

                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    padding: '4px 10px',
                    borderRadius: '8px',
                    background: propCount > 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                    color: propCount > 0 ? '#10b981' : '#64748b'
                  }}>
                    {propCount} {isAr ? 'عقار' : 'Props'}
                  </span>
                </div>

                {/* Description / Landmarks */}
                {area.label_ar && area.label_ar !== area.name_ar && (
                  <div style={{ 
                    fontSize: '0.82rem', 
                    color: '#cbd5e1', 
                    background: 'rgba(0, 0, 0, 0.2)', 
                    padding: '8px 10px', 
                    borderRadius: '8px',
                    marginBottom: '10px'
                  }}>
                    <strong style={{ color: 'var(--accent-gold)', fontSize: '0.75rem', display: 'block', marginBottom: '2px' }}>
                      {isAr ? 'التفاصيل والمعالم:' : 'Details & Landmarks:'}
                    </strong>
                    {area.label_ar}
                  </div>
                )}

                {/* Coordinates & Geo Info */}
                {area.center && (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px', 
                    fontSize: '0.75rem', 
                    color: '#64748b',
                    marginBottom: '14px' 
                  }}>
                    <Navigation size={12} style={{ color: 'var(--accent-gold)' }} />
                    <span>Lat: {area.center.lat.toFixed(4)}, Lng: {area.center.lng.toFixed(4)}</span>
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
                borderTop: '1px solid rgba(255, 255, 255, 0.08)'
              }}>
                <button
                  type="button"
                  className="btn-action-mini"
                  onClick={() => handleOpenEdit(area)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    background: 'rgba(255, 255, 255, 0.08)',
                    color: '#fff',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
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
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      background: 'rgba(239, 68, 68, 0.12)',
                      color: '#f87171',
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
        <div style={{ textAlign: 'center', padding: '50px 20px', color: '#94a3b8' }}>
          <MapPin size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
          <h4>{isAr ? 'لم يتم العثور على مناطق مطابقة لبحثك' : 'No matching districts found'}</h4>
          <p style={{ fontSize: '0.85rem' }}>{isAr ? 'جرب البحث بكلمات أخرى أو أضف الحي الجديد الآن.' : 'Try another query or add a new district.'}</p>
        </div>
      )}

      {/* MODAL: Add / Edit Area */}
      {modalMode && (
        <div className="crm-modal-backdrop" onClick={() => setModalMode(null)}>
          <div className="crm-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px' }}>
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
                  <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#fff' }}>
                    {modalMode === 'add' ? (isAr ? 'إضافة حي أو منطقة جديدة' : 'Add New District') : (isAr ? 'تعديل بيانات المنطقة' : 'Edit District')}
                  </h3>
                  <small style={{ color: '#94a3b8' }}>
                    {isAr ? 'تحديث ونشر فوري على كافة فلاتر ومعالجات الموقع' : 'Instant live update across platform'}
                  </small>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setModalMode(null)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitForm}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div className="form-group-item">
                  <label style={{ display: 'block', fontSize: '0.82rem', color: '#cbd5e1', marginBottom: '6px' }}>
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
                      fontSize: '0.88rem'
                    }}
                  />
                </div>

                <div className="form-group-item">
                  <label style={{ display: 'block', fontSize: '0.82rem', color: '#cbd5e1', marginBottom: '6px' }}>
                    {isAr ? 'الاسم بالإنجليزية (English)' : 'District Name (English)'}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Tahta or Al Salam"
                    value={formData.name_en}
                    onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                    style={{
                      width: '100%',
                      background: 'rgba(0, 0, 0, 0.4)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '0.88rem'
                    }}
                  />
                </div>
              </div>

              {/* Detailed Label for Dropdowns */}
              <div className="form-group-item" style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', color: '#cbd5e1', marginBottom: '6px' }}>
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
                    fontSize: '0.88rem'
                  }}
                />
              </div>

              {/* Coordinates: Lat & Lng */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div className="form-group-item">
                  <label style={{ display: 'block', fontSize: '0.82rem', color: '#cbd5e1', marginBottom: '6px' }}>
                    {isAr ? 'خط العرض (Latitude)' : 'Latitude'}
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
                      fontSize: '0.88rem'
                    }}
                  />
                </div>

                <div className="form-group-item">
                  <label style={{ display: 'block', fontSize: '0.82rem', color: '#cbd5e1', marginBottom: '6px' }}>
                    {isAr ? 'خط الطول (Longitude)' : 'Longitude'}
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
                      fontSize: '0.88rem'
                    }}
                  />
                </div>
              </div>

              {/* Description */}
              <div className="form-group-item" style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', color: '#cbd5e1', marginBottom: '6px' }}>
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
                    fontSize: '0.88rem',
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
        <div className="crm-modal-backdrop" onClick={() => setDeleteConfirmId(null)}>
          <div className="crm-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px', textAlign: 'center' }}>
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

            <h3 style={{ margin: '0 0 8px 0', color: '#fff', fontSize: '1.15rem' }}>
              {isAr ? 'تأكيد حذف المنطقة' : 'Confirm District Deletion'}
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.88rem', marginBottom: '20px' }}>
              {isAr 
                ? 'هل أنت متأكد من رغبتك في حذف هذا الحي؟ سيتم إزالته من جميع فلاتر الموقع ومعالجات البحث.' 
                : 'Are you sure you want to delete this district from all search filters?'}
            </p>

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
