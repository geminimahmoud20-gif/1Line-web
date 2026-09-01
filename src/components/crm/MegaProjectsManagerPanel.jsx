import { useState } from 'react';
import { 
  Building2, 
  Plus, 
  Edit3, 
  Trash2, 
  Sparkles, 
  CheckCircle2, 
  Percent, 
  MapPin, 
  Calendar, 
  Layers, 
  DollarSign, 
  Save, 
  X, 
  Image as ImageIcon,
  Search,
  Flame,
  ArrowUpRight
} from 'lucide-react';

/**
 * MegaProjectsManagerPanel Component
 * Full CRUD management dashboard for Mega Projects & Flagship Compounds
 * allowing CRM admins to add, edit progress percentages, update pricing, and delete projects.
 */
export default function MegaProjectsManagerPanel({
  projects = [],
  onAddProject,
  onUpdateProject,
  onDeleteProject,
  lang = 'ar',
  triggerToast = () => {}
}) {
  const isAr = lang === 'ar';
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState(null);
  
  // Form State
  const initialForm = {
    title_ar: '',
    title_en: '',
    brandTag: '',
    developer_ar: 'شركة ون لاين للتطوير العقاري',
    developer_en: 'One Line Real Estate Developments',
    location_ar: 'سوهاج الجديدة - الحي السكني',
    location_en: 'New Sohag',
    category: 'residential',
    startPrice: 2500000,
    downPaymentPercent: 15,
    installmentYears: 5,
    deliveryDate_ar: 'ديسمبر 2026',
    deliveryDate_en: 'Dec 2026',
    progress: 75,
    progressBreakdown: {
      concrete: 100,
      masonry: 80,
      finishing: 50,
      infrastructure: 70
    },
    area_sqm: '25,000 م²',
    totalUnits: 150,
    availableUnits: 25,
    roiEstimate: 12.5,
    images: [
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80'
    ],
    features_ar: 'أمن وحراسة 24 ساعة, لاندسكيب وبحيرات صناعية, مول تجاري خاص',
    features_en: '24/7 Security, Landscape & Water Features, Private Mall',
    description_ar: 'مشروع متميز في أرقى مواقع سوهاج بتصميمات معمارية حديثة وتقسيط مريح.',
    description_en: 'Premier development in prime Sohag location with flexible payment terms.'
  };

  const [formData, setFormData] = useState(initialForm);

  const handleOpenAddModal = () => {
    setEditingProjectId(null);
    setFormData(initialForm);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (proj) => {
    setEditingProjectId(proj.id);
    setFormData({
      ...proj,
      features_ar: Array.isArray(proj.features_ar) ? proj.features_ar.join(', ') : (proj.features_ar || ''),
      features_en: Array.isArray(proj.features_en) ? proj.features_en.join(', ') : (proj.features_en || ''),
      images: proj.images && proj.images.length > 0 ? proj.images : [initialForm.images[0]],
      progressBreakdown: proj.progressBreakdown || { concrete: 100, masonry: 80, finishing: 50, infrastructure: 70 }
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title_ar) {
      triggerToast(isAr ? 'يرجى إدخال اسم المشروع بالعربية' : 'Please enter project title', 'error');
      return;
    }

    const payload = {
      ...formData,
      startPrice: Number(formData.startPrice) || 2000000,
      downPaymentPercent: Number(formData.downPaymentPercent) || 15,
      installmentYears: Number(formData.installmentYears) || 5,
      progress: Number(formData.progress) || 50,
      totalUnits: Number(formData.totalUnits) || 100,
      availableUnits: Number(formData.availableUnits) || 20,
      features_ar: typeof formData.features_ar === 'string' 
        ? formData.features_ar.split(',').map(s => s.trim()).filter(Boolean)
        : formData.features_ar,
      features_en: typeof formData.features_en === 'string'
        ? formData.features_en.split(',').map(s => s.trim()).filter(Boolean)
        : formData.features_en
    };

    if (editingProjectId) {
      if (onUpdateProject) {
        onUpdateProject(editingProjectId, payload);
      }
    } else {
      const newProj = {
        id: 'proj-' + Date.now(),
        ...payload
      };
      if (onAddProject) {
        onAddProject(newProj);
      }
    }

    setIsModalOpen(false);
  };

  const handleDelete = (projId, title) => {
    if (window.confirm(isAr ? `هل أنت متأكد من حذف مشروع: ${title}؟` : `Are you sure you want to delete ${title}?`)) {
      if (onDeleteProject) {
        onDeleteProject(projId);
      }
    }
  };

  const filteredProjects = projects.filter(p => {
    const title = isAr ? p.title_ar : p.title_en;
    const matchSearch = !searchQuery || title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = selectedCategory === 'all' || p.category === selectedCategory;
    return matchSearch && matchCat;
  });

  return (
    <div className="crm-prop-manager-wrapper">
      {/* Top Header & Actions Strip */}
      <div className="crm-manager-topbar">
        <div>
          <h3 className="crm-manager-title">
            <Building2 size={20} className="text-primary" />
            <span>{isAr ? 'إدارة المشروعات الكبرى والكمبوندات' : 'Mega Projects Management Hub'}</span>
            <span className="count-badge-gold">{projects.length}</span>
          </h3>
          <p className="crm-manager-sub">
            {isAr 
              ? 'إضافة مشروعات جديدة، تحديث نسب الإنجاز الميداني (خرسانات/مباني/تشطيب)، وتعديل خطط السداد' 
              : 'Add new flagship compounds, update live construction milestones, and manage payment plans'}
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary btn-add-prop-cta"
          onClick={handleOpenAddModal}
        >
          <Plus size={16} />
          <span>{isAr ? 'إضافة مشروع جديد +' : 'Add New Project +'}</span>
        </button>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="crm-manager-filter-bar">
        <div className="crm-search-box-wrap">
          <Search size={15} />
          <input
            type="text"
            placeholder={isAr ? 'بحث باسم المشروع أو المطور...' : 'Search project or developer...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="crm-cat-pills">
          {[
            { id: 'all', label_ar: 'الكل', label_en: 'All' },
            { id: 'residential', label_ar: 'كمبوندات سكنية', label_en: 'Residential' },
            { id: 'commercial', label_ar: 'مولات تجارية', label_en: 'Commercial' }
          ].map(cat => (
            <button
              key={cat.id}
              type="button"
              className={`cat-pill-btn ${selectedCategory === cat.id ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat.id)}
            >
              {isAr ? cat.label_ar : cat.label_en}
            </button>
          ))}
        </div>
      </div>

      {/* Projects Table / Card Grid */}
      <div className="crm-projects-table-wrap">
        <table className="crm-modern-table">
          <thead>
            <tr>
              <th>{isAr ? 'المشروع' : 'Project'}</th>
              <th>{isAr ? 'الموقع والمطور' : 'Location & Developer'}</th>
              <th>{isAr ? 'السعر والمقدم' : 'Price & Plan'}</th>
              <th>{isAr ? 'نسبة الإنجاز الميداني' : 'Construction Progress'}</th>
              <th>{isAr ? 'الوحدات المتاحة' : 'Units'}</th>
              <th>{isAr ? 'إجراءات' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody>
            {filteredProjects.map((p) => {
              const title = isAr ? p.title_ar : p.title_en;
              const location = isAr ? p.location_ar : p.location_en;
              const dev = isAr ? p.developer_ar : p.developer_en;
              const bk = p.progressBreakdown || { concrete: 100, masonry: 80, finishing: 50 };

              return (
                <tr key={p.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <img src={p.images[0]} alt={title} style={{ width: '56px', height: '42px', borderRadius: '6px', objectFit: 'cover' }} />
                      <div>
                        <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)', display: 'block' }}>{title}</strong>
                        {p.brandTag && <span style={{ fontSize: '0.7rem', color: 'var(--accent-gold)', fontWeight: 'bold' }}>{p.brandTag}</span>}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.8rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)' }}>
                        <MapPin size={12} />
                        <span>{location}</span>
                      </div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: '700' }}>{dev}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.82rem' }}>
                      <strong className="text-primary">{p.startPrice.toLocaleString()} ج.م</strong>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{p.downPaymentPercent}% مقدم • {p.installmentYears} سنوات</div>
                    </div>
                  </td>
                  <td>
                    <div style={{ minWidth: '140px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: '800', marginBottom: '3px' }}>
                        <span>{isAr ? 'الإجمالي:' : 'Total:'}</span>
                        <span className="text-emerald">{p.progress}%</span>
                      </div>
                      <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '10px', overflow: 'hidden', marginBottom: '4px' }}>
                        <div style={{ width: `${p.progress}%`, height: '100%', background: 'linear-gradient(90deg, #10b981, #059669)' }} />
                      </div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'flex', gap: '4px' }}>
                        <span>خ:{bk.concrete}%</span>|<span>م:{bk.masonry}%</span>|<span>ت:{bk.finishing}%</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--emerald)' }}>
                      {p.availableUnits} / {p.totalUnits || '-'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost"
                        onClick={() => handleOpenEditModal(p)}
                        title={isAr ? 'تعديل المشروع ونسب الإنجاز' : 'Edit Project'}
                        style={{ padding: '6px', color: 'var(--primary)' }}
                      >
                        <Edit3 size={15} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost"
                        onClick={() => handleDelete(p.id, title)}
                        title={isAr ? 'حذف المشروع' : 'Delete'}
                        style={{ padding: '6px', color: '#ef4444' }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="track-modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="deposit-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '720px', width: '95%' }}>
            <button type="button" className="modal-close-btn" onClick={() => setIsModalOpen(false)}>
              <X size={20} />
            </button>

            <div className="deposit-modal-header">
              <div className="deposit-icon-glow">
                <Building2 size={24} style={{ color: 'var(--primary)' }} />
              </div>
              <div>
                <h3>{editingProjectId ? (isAr ? 'تعديل بيانات ونسب إنجاز المشروع' : 'Edit Mega Project') : (isAr ? 'إضافة مشروع / كمبوند جديد' : 'Add New Mega Project')}</h3>
                <p>{isAr ? 'إدخال مواصفات المشروع، الأسعار، صور العرض، ونسب التنفيذ الميداني' : 'Fill in project details, pricing, visuals, and milestone breakdown'}</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="deposit-modal-body" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: '800' }}>{isAr ? 'اسم المشروع (عربي) *' : 'Project Title (Arabic)'}</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: كمبوند لؤلؤة سوهاج الجديدة"
                    value={formData.title_ar}
                    onChange={(e) => setFormData({ ...formData, title_ar: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: '800' }}>{isAr ? 'الشارة التجارية (Brand Tag)' : 'Brand Tag'}</label>
                  <input
                    type="text"
                    placeholder="مثال: Pearl Compound"
                    value={formData.brandTag}
                    onChange={(e) => setFormData({ ...formData, brandTag: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: '800' }}>{isAr ? 'الشركة المطورة (عربي)' : 'Developer'}</label>
                  <input
                    type="text"
                    value={formData.developer_ar}
                    onChange={(e) => setFormData({ ...formData, developer_ar: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: '800' }}>{isAr ? 'الموقع الجغرافي' : 'Location'}</label>
                  <input
                    type="text"
                    value={formData.location_ar}
                    onChange={(e) => setFormData({ ...formData, location_ar: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}
                  />
                </div>
              </div>

              {/* Financials Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{isAr ? 'يبدأ من (ج.م)' : 'Start Price'}</label>
                  <input
                    type="number"
                    value={formData.startPrice}
                    onChange={(e) => setFormData({ ...formData, startPrice: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{isAr ? 'نسبة المقدم %' : 'Downpayment %'}</label>
                  <input
                    type="number"
                    value={formData.downPaymentPercent}
                    onChange={(e) => setFormData({ ...formData, downPaymentPercent: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{isAr ? 'سنوات التقسيط' : 'Years'}</label>
                  <input
                    type="number"
                    value={formData.installmentYears}
                    onChange={(e) => setFormData({ ...formData, installmentYears: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{isAr ? 'موعد التسليم' : 'Delivery'}</label>
                  <input
                    type="text"
                    value={formData.deliveryDate_ar}
                    onChange={(e) => setFormData({ ...formData, deliveryDate_ar: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}
                  />
                </div>
              </div>

              {/* Live Construction Milestones Sliders Box */}
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', marginBottom: '12px' }}>
                <strong style={{ fontSize: '0.84rem', color: 'var(--primary)', display: 'block', marginBottom: '8px' }}>
                  🏗️ {isAr ? 'نسب التنفيذ الميداني للمشروع (Construction Milestones)' : 'Construction Milestones'}
                </strong>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: '800' }}>
                      <span>{isAr ? 'نسبة الإنجاز الإجمالية:' : 'Overall Progress:'}</span>
                      <strong className="text-emerald">{formData.progress}%</strong>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={formData.progress}
                      onChange={(e) => setFormData({ ...formData, progress: parseInt(e.target.value) || 0 })}
                      style={{ width: '100%', accentColor: 'var(--emerald)', cursor: 'pointer' }}
                    />
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: '800' }}>
                      <span>{isAr ? 'نسبة الخرسانات:' : 'Concrete:'}</span>
                      <strong>{formData.progressBreakdown?.concrete || 0}%</strong>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={formData.progressBreakdown?.concrete || 0}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        progressBreakdown: { ...formData.progressBreakdown, concrete: parseInt(e.target.value) || 0 } 
                      })}
                      style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer' }}
                    />
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: '800' }}>
                      <span>{isAr ? 'نسبة المباني والحوائط:' : 'Masonry:'}</span>
                      <strong>{formData.progressBreakdown?.masonry || 0}%</strong>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={formData.progressBreakdown?.masonry || 0}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        progressBreakdown: { ...formData.progressBreakdown, masonry: parseInt(e.target.value) || 0 } 
                      })}
                      style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer' }}
                    />
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: '800' }}>
                      <span>{isAr ? 'نسبة التشطيبات:' : 'Finishing:'}</span>
                      <strong>{formData.progressBreakdown?.finishing || 0}%</strong>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={formData.progressBreakdown?.finishing || 0}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        progressBreakdown: { ...formData.progressBreakdown, finishing: parseInt(e.target.value) || 0 } 
                      })}
                      style={{ width: '100%', accentColor: 'var(--accent-gold)', cursor: 'pointer' }}
                    />
                  </div>
                </div>
              </div>

              {/* Units & Image URL */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '8px', marginBottom: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{isAr ? 'إجمالي الوحدات' : 'Total Units'}</label>
                  <input
                    type="number"
                    value={formData.totalUnits}
                    onChange={(e) => setFormData({ ...formData, totalUnits: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{isAr ? 'الوحدات المتاحة' : 'Available'}</label>
                  <input
                    type="number"
                    value={formData.availableUnits}
                    onChange={(e) => setFormData({ ...formData, availableUnits: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{isAr ? 'رابط الصورة الرئيسية' : 'Image URL'}</label>
                  <input
                    type="text"
                    value={formData.images[0] || ''}
                    onChange={(e) => setFormData({ ...formData, images: [e.target.value] })}
                    style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}
                  />
                </div>
              </div>

              {/* Description */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{isAr ? 'وصف المشروع والمميزات' : 'Description'}</label>
                <textarea
                  rows="2"
                  value={formData.description_ar}
                  onChange={(e) => setFormData({ ...formData, description_ar: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setIsModalOpen(false)}
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Save size={16} />
                  <span>{editingProjectId ? (isAr ? 'حفظ التعديلات' : 'Save Changes') : (isAr ? 'إضافة المشروع' : 'Add Project')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
