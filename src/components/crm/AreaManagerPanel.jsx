import { useState, useEffect, useMemo } from 'react';
import { MapPin, Plus, Edit3, Trash2, RotateCcw, Search, CheckCircle2, Navigation, X, AlertTriangle } from 'lucide-react';
import { getAreas, addArea, updateArea, deleteArea, resetAreasToDefault, normalizeAreaKey } from '../../utils/areasData';
import { useProperties } from '../../context/PropertiesContext';
import AreaFormModal from './AreaFormModal';
import { moveLeadsToArea, moveDemandsToArea } from '../../firebaseLazy';

export default function AreaManagerPanel({ lang = 'ar', triggerToast, properties = [] }) {
  const isAr = lang === 'ar';
  const [areas, setAreas] = useState(() => getAreas());
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Modal States
  const [modalMode, setModalMode] = useState(null); // 'add' | 'edit' | null
  const [activeArea, setActiveArea] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [moveToId, setMoveToId] = useState('');
  const { handleUpdateProperty } = useProperties();

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
      annualGrowthRate: 0
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

  // Delete Area — listings in it are moved first, so none is left pointing at a missing area
  const handleDeleteArea = async (id) => {
    if (id === 'all') {
      if (triggerToast) triggerToast(isAr ? 'لا يمكن حذف خيار "كل المناطق" لأنه خيار نظامي رئيسي' : 'Cannot delete system default', 'error');
      return;
    }
    const linked = areaProperties(id);
    // Leads and requests can point at the area too (most aren't loaded here), so a destination is always required
    if (!moveToId || !handleUpdateProperty) {
      if (triggerToast) triggerToast(isAr ? 'اختار المنطقة اللي هينتقل لها العقارات والعملاء والطلبات الأول' : 'Choose where to move listings, leads and requests first', 'error');
      return;
    }

    setIsSaving(true);
    try {
      linked.forEach((p) => handleUpdateProperty(p.id, { areaKey: moveToId }));
      const [leadsMoved, demandsMoved] = await Promise.all([moveLeadsToArea(id, moveToId), moveDemandsToArea(id, moveToId)]);
      if (!leadsMoved.ok || !demandsMoved.ok) {
        // Keep the area: deleting it now would orphan the records that failed to move
        if (triggerToast) triggerToast(isAr ? 'تعذّر نقل العملاء/الطلبات، المنطقة لم تُحذف. حاول تاني.' : 'Could not move leads/requests; area kept. Try again.', 'error');
        return;
      }
      await deleteArea(id);
      setAreas(getAreas());
      setDeleteConfirmId(null);
      setMoveToId('');
      if (triggerToast) {
        triggerToast(isAr
          ? `تم حذف المنطقة ونقل ${linked.length} عقار و${leadsMoved.moved} عميل و${demandsMoved.moved} طلب`
          : `Area deleted: ${linked.length} listings, ${leadsMoved.moved} leads, ${demandsMoved.moved} requests moved`, 'success');
      }
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

  // Listings saved under this area (areaKey, in any of its legacy spellings)
  const areaProperties = (areaId) => (areaId === 'all'
    ? properties
    : properties.filter((p) => p && !p.isDemo && normalizeAreaKey(p.areaKey || p.location || '') === areaId));
  const getAreaPropertiesCount = (areaId) => areaProperties(areaId).length;

  return (
    <div className="crm-subpanel-container animate-fadeIn">
      {/* Top Banner & Header */}
      <div className="crm-card" style={{ marginBottom: '20px', borderLeft: '4px solid var(--crm-accent)' }}>
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
                <h2 style={{ fontSize: 'var(--crm-text-lg)', fontWeight: 700, color: 'var(--crm-ink)', margin: 0 }}>
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
                background: 'linear-gradient(135deg, var(--crm-warn-solid), var(--crm-warn-solid))',
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
            <strong style={{ display: 'block', fontSize: 'var(--crm-text-lg)', color: 'var(--crm-ink)', marginTop: '2px' }}>{stats.total} {isAr ? 'منطقة' : 'Areas'}</strong>
          </div>
          <div style={{ background: 'var(--crm-subtle)', padding: '10px 14px', borderRadius: '10px' }}>
            <span style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-faint)' }}>{isAr ? 'الأحياء المخصصة المضافة' : 'Custom Added Districts'}</span>
            <strong style={{ display: 'block', fontSize: 'var(--crm-text-lg)', color: 'var(--crm-accent-text)', marginTop: '2px' }}>{stats.custom} {isAr ? 'حي إضافي' : 'Custom'}</strong>
          </div>
          <div style={{ background: 'var(--crm-subtle)', padding: '10px 14px', borderRadius: '10px' }}>
            <span style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-faint)' }}>{isAr ? 'الأحياء الأساسية الرسمية' : 'System Districts'}</span>
            <strong style={{ display: 'block', fontSize: 'var(--crm-text-lg)', color: 'var(--crm-info)', marginTop: '2px' }}>{stats.system} {isAr ? 'مناطق رئيسية' : 'Core'}</strong>
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
                      <h3 style={{ fontSize: 'var(--crm-text-lg)', fontWeight: 700, color: 'var(--crm-ink)', margin: 0 }}>
                        {area.name_ar}
                      </h3>
                      <span style={{ 
                        fontSize: 'var(--crm-text-xs)', 
                        padding: '2px 8px', 
                        borderRadius: '6px', 
                        background: isSystem ? 'rgba(37, 99, 235, 0.1)' : 'rgba(217, 119, 6, 0.15)',
                        color: isSystem ? 'var(--crm-info)' : 'var(--crm-gold-on-dark)',
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
                    {isAr ? `متوسط: ${(area.avgPricePerMeter || 15000).toLocaleString('en-US')} ج.م/م²` : `Avg: ${(area.avgPricePerMeter || 15000).toLocaleString('en-US')} EGP/m²`}
                  </span>
                  {Number(area.annualGrowthRate) > 0 && <span style={{
                    fontSize: 'var(--crm-text-xs)',
                    fontWeight: '700',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: 'rgba(16, 185, 129, 0.12)',
                    color: 'var(--crm-positive)',
                    border: '1px solid rgba(16, 185, 129, 0.25)'
                  }}>
                    {isAr ? `نمو: +${area.annualGrowthRate}%` : `Growth: +${area.annualGrowthRate}%`}
                  </span>}
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
                    onClick={() => { setMoveToId(''); setDeleteConfirmId(area.id); }}
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
        <AreaFormModal
          formData={formData}
          handleSubmitForm={handleSubmitForm}
          isAr={isAr}
          isSaving={isSaving}
          modalMode={modalMode}
          setFormData={setFormData}
          setModalMode={setModalMode}
        />
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
              color: 'var(--crm-on-dark-danger)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto'
            }}>
              <AlertTriangle size={28} />
            </div>

            <h3 id="area-delete-title" style={{ margin: '0 0 8px 0', color: 'var(--crm-on-dark)', fontSize: 'var(--crm-text-lg)' }}>
              {isAr
                ? `حذف «${areas.find((a) => a.id === deleteConfirmId)?.name_ar || deleteConfirmId}»؟`
                : 'Confirm District Deletion'}
            </h3>
            <p style={{ color: 'var(--crm-on-dark-muted)', fontSize: 'var(--crm-text-base)', marginBottom: '10px' }}>
              {isAr
                ? 'سيتم إزالة الحي من فلاتر البحث ونماذج البيع والشراء في الموقع.'
                : 'The district will be removed from all search filters.'}
            </p>
            {(
              <div style={{ color: 'var(--crm-on-dark-danger)', fontSize: 'var(--crm-text-sm)', fontWeight: 700, background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', padding: '10px', marginBottom: '18px', textAlign: 'start' }}>
                <label htmlFor="area-move-to" style={{ display: 'block', marginBottom: '6px' }}>
                  {isAr
                    ? `انقل العقارات (${getAreaPropertiesCount(deleteConfirmId)}) والعملاء والطلبات اللي على المنطقة دي إلى:`
                    : `Move its listings (${getAreaPropertiesCount(deleteConfirmId)}), leads and requests to:`}
                </label>
                <select
                  id="area-move-to"
                  value={moveToId}
                  onChange={(e) => setMoveToId(e.target.value)}
                  disabled={isSaving}
                  style={{ width: '100%', padding: '8px', borderRadius: '8px', fontWeight: 600 }}
                >
                  <option value="">{isAr ? 'اختار منطقة…' : 'Choose an area…'}</option>
                  {areas.filter((a) => a.id !== 'all' && a.id !== deleteConfirmId).map((a) => (
                    <option key={a.id} value={a.id}>{isAr ? a.name_ar : (a.name_en || a.name_ar)}</option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setDeleteConfirmId(null)}
                disabled={isSaving}
                style={{ padding: '9px 18px', color: 'var(--crm-on-dark-muted)' }}
              >
                {isAr ? 'تراجع' : 'Cancel'}
              </button>

              <button
                type="button"
                onClick={() => handleDeleteArea(deleteConfirmId)}
                disabled={isSaving || !moveToId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'var(--crm-danger-solid)',
                  color: 'var(--crm-on-dark)',
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
