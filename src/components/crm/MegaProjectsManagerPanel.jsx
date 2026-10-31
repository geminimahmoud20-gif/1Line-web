import { useState, useMemo, useRef, useEffect } from 'react';
import useOpenRequest from '../../hooks/useOpenRequest';
import { Building2, Plus, Edit3, Trash2, MapPin, Search, Eye, EyeOff, Flame } from 'lucide-react';
import { projectSampleFlags } from '../../utils/sampleDataFlags';
import useBodyScrollLock from '../../hooks/useBodyScrollLock';
import ProjectFormModal from './ProjectFormModal';
import OfferModal from './OfferModal';
import './projects-manager.css';
import { offerState } from '../../utils/propertyOffers';
import { useConfirm } from '../ui';
import { approvalLabel, blockedByApproval, approveUpdate, rejectUpdate } from '../../utils/publishApproval';

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
  triggerToast = () => {},
  openRequest = null,
  readOnly = false,
  canApprove = false
}) {
  const confirm = useConfirm();
  const isAr = lang === 'ar';
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  useBodyScrollLock(isModalOpen);
  const isSavingRef = useRef(false);

  useEffect(() => {
    if (!isModalOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isSavingRef.current) {
        setIsModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  const [editingProjectId, setEditingProjectId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [offerEditing, setOfferEditing] = useState(null);
  
  // Form State
  const initialForm = {
    title_ar: '',
    title_en: '',
    brandTag: '',
    // Starts empty: each figure below is published as a fact about the project
    developer_ar: '',
    developer_en: '',
    location_ar: '',
    location_en: '',
    category: 'residential',
    startPrice: '',
    downPaymentPercent: '',
    installmentYears: '',
    deliveryDate_ar: '',
    deliveryDate_en: '',
    progress: 0,
    progressBreakdown: {
      concrete: 0,
      masonry: 0,
      finishing: 0,
      infrastructure: 0
    },
    area_sqm: '',
    totalUnits: '',
    availableUnits: '',
    roiEstimate: '',
    images: [],
    features_ar: '',
    features_en: '',
    description_ar: '',
    description_en: '',
    brochureUrl: ''
  };

  const [formData, setFormData] = useState(initialForm);
  // Empty field → default; 0 stays 0 (sold out / not started)
  const numOr = (v, fallback) => (v === '' || v == null || !Number.isFinite(Number(v)) ? fallback : Number(v));

  const handleOpenAddModal = () => {
    setEditingProjectId(null);
    setFormData(initialForm);
    setIsModalOpen(true);
  };

  useOpenRequest(openRequest, ['add_project'], () => { if (!readOnly) handleOpenAddModal(); });

  const handleOpenEditModal = (proj) => {
    setEditingProjectId(proj.id);
    setFormData({
      ...proj,
      features_ar: Array.isArray(proj.features_ar) ? proj.features_ar.join(', ') : (proj.features_ar || ''),
      features_en: Array.isArray(proj.features_en) ? proj.features_en.join(', ') : (proj.features_en || ''),
      images: Array.isArray(proj.images) ? proj.images.filter(Boolean) : [],
      // A project saved without stages opens at 0%, not with made-up figures
      progressBreakdown: { concrete: 0, masonry: 0, finishing: 0, infrastructure: 0, ...(proj.progressBreakdown || {}) }
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isSaving || isSavingRef.current) return;

    if (!formData.title_ar) {
      triggerToast(isAr ? 'يرجى إدخال اسم المشروع بالعربية' : 'Please enter project title', 'error');
      return;
    }
    if (!(Number(formData.startPrice) > 0)) {
      triggerToast(isAr ? 'اكتب سعر البداية الحقيقي للمشروع' : 'Enter the real starting price', 'error');
      return;
    }

    isSavingRef.current = true;
    setIsSaving(true);
    try {

    const payload = {
      ...formData,
      // Blank stays blank (0 = not given): no invented 15% / 5 years / 100 units
      startPrice: Number(formData.startPrice),
      downPaymentPercent: Number(formData.downPaymentPercent) || 0,
      installmentYears: Number(formData.installmentYears) || 0,
      progress: numOr(formData.progress, 0),
      totalUnits: numOr(formData.totalUnits, 0),
      availableUnits: numOr(formData.availableUnits, 0),
      // Saving a sample from here makes it the admin's own project
      isDemo: false,
      features_ar: typeof formData.features_ar === 'string' 
        ? formData.features_ar.split(',').map(s => s.trim()).filter(Boolean)
        : formData.features_ar,
      features_en: typeof formData.features_en === 'string'
        ? formData.features_en.split(',').map(s => s.trim()).filter(Boolean)
        : formData.features_en
    };

    if (editingProjectId) {
      if (onUpdateProject) {
        const res = onUpdateProject(editingProjectId, payload);
        if (res === false) return;
        triggerToast(isAr ? 'تم تحديث المشروع بنجاح' : 'Project updated successfully', 'success');
      }
    } else {
      const newProj = {
        id: 'proj-' + Date.now(),
        ...payload
      };
      if (onAddProject) {
        const res = onAddProject(newProj);
        if (res === false) return;
        triggerToast(isAr ? 'تمت إضافة المشروع بنجاح' : 'Project added successfully', 'success');
      }
    }

    setIsModalOpen(false);
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  };

  // Hidden projects stay here but leave the projects page, the homepage and search
  const toggleHidden = (proj) => {
    if (!onUpdateProject) return;
    const hide = !proj.isHidden;
    if (onUpdateProject(proj.id, { isHidden: hide }) === false) return;
    triggerToast(hide
      ? (isAr ? 'تم إخفاء المشروع من الموقع' : 'Project hidden from the site')
      : (isAr ? 'المشروع ظاهر على الموقع تاني' : 'Project is visible on the site again'), 'success');
  };

  const handleDelete = async (projId, title) => {
    if (await confirm({ message: isAr ? `هل أنت متأكد من حذف مشروع: ${title}؟` : `Are you sure you want to delete ${title}?`, tone: 'danger' })) {
      if (onDeleteProject) {
        const res = onDeleteProject(projId);
        if (res !== false) {
          triggerToast(isAr ? 'تم حذف المشروع بنجاح' : 'Project deleted successfully', 'info');
        }
      }
    }
  };

  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const titleAr = (p.title_ar || '').toLowerCase();
      const titleEn = (p.title_en || '').toLowerCase();
      const devAr = (p.developer_ar || '').toLowerCase();
      const devEn = (p.developer_en || '').toLowerCase();
      const locAr = (p.location_ar || '').toLowerCase();
      const locEn = (p.location_en || '').toLowerCase();
      const q = searchQuery.trim().toLowerCase();

      const matchSearch = !q || titleAr.includes(q) || titleEn.includes(q) || devAr.includes(q) || devEn.includes(q) || locAr.includes(q) || locEn.includes(q);
      const matchCat = selectedCategory === 'all' || p.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [projects, searchQuery, selectedCategory]);

  // Running or upcoming offer, next to the project name
  const offerBadge = (p) => {
    if (!p.offer) return null;
    const state = offerState({ ...p, price: p.startPrice });
    if (state === 'active') return <span className="pjm-badge is-offer"><Flame size={11} aria-hidden="true" />{isAr ? `عرض لحد ${p.offer.until}` : `Offer to ${p.offer.until}`}</span>;
    if (state === 'scheduled') return <span className="pjm-badge">{isAr ? `عرض يبدأ ${p.offer.from}` : `Offer from ${p.offer.from}`}</span>;
    if (state === 'expired') return <span className="pjm-badge">{isAr ? 'العرض انتهى' : 'Offer ended'}</span>;
    return null;
  };

  return (
    <div className="crm-prop-manager-wrapper">
      {/* Top Header & Actions Strip */}
      <div className="crm-modern-header-strip">
        <div className="crm-header-title-group">
          <h2 className="crm-header-main-title">
            <Building2 size={22} style={{ color: 'var(--crm-accent-text)' }} />
            <span>{isAr ? 'إدارة المشروعات الكبرى والكمبوندات' : 'Mega Projects Management Hub'}</span>
          </h2>
          <div className="crm-header-subtitle">
            <span>
              {isAr 
                ? 'إضافة مشروعات جديدة، تحديث نسب الإنجاز الميداني، وتعديل خطط السداد' 
                : 'Add flagship compounds, update live construction milestones, and manage payment plans'}
            </span>
            <span>•</span>
            <span className="crm-header-count-pill">
              {projects.length} {isAr ? 'مشروع' : 'projects'}
              {projects.some((p) => p.isHidden) && ` · ${projects.filter((p) => p.isHidden).length} ${isAr ? 'مخفي' : 'hidden'}`}
            </span>
          </div>
        </div>

        <div className="crm-header-actions-group">
          <button
            type="button"
            className="crm-btn-primary-gold"
            disabled={readOnly}
            onClick={handleOpenAddModal}
          >
            <Plus size={16} />
            <span>{isAr ? 'إضافة مشروع جديد' : 'Add New Project'}</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="crm-modern-triage-hub" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div className="crm-triage-scroll-strip" style={{ margin: 0, padding: 0 }}>
            {[
              { id: 'all', label_ar: 'الكل', label_en: 'All' },
              { id: 'residential', label_ar: 'كمبوندات سكنية', label_en: 'Residential' },
              { id: 'commercial', label_ar: 'مولات تجارية', label_en: 'Commercial' }
            ].map(cat => (
              <button
                key={cat.id}
                type="button"
                className={`crm-triage-tab-btn ${selectedCategory === cat.id ? 'is-active' : ''}`}
                onClick={() => setSelectedCategory(cat.id)}
              >
                <span>{isAr ? cat.label_ar : cat.label_en}</span>
              </button>
            ))}
          </div>

          <div className="crm-search-pill-wrapper" style={{ minWidth: '240px' }}>
            <Search size={15} className="crm-search-pill-icon" />
            <input
              type="text"
              placeholder={isAr ? 'بحث باسم المشروع أو المطور...' : 'Search project or developer...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="crm-search-pill-input"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="crm-search-pill-clear"
                title={isAr ? 'مسح البحث' : 'Clear search'}
              >
                ✕
              </button>
            )}
          </div>
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
                <tr key={p.id} className={p.isHidden ? 'pjm-row-hidden' : undefined}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <img src={p.images?.[0] || '/no-photo.svg'} alt={title} style={{ width: '56px', height: '42px', borderRadius: '6px', objectFit: 'cover' }} />
                      <div>
                        <strong style={{ fontSize: 'var(--crm-text-base)', color: 'var(--crm-ink)', display: 'block' }}>{title}</strong>
                        {p.brandTag && <span style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-accent-text)', fontWeight: 'bold' }}>{p.brandTag}</span>}
                        {p.isDemo && (
                          <span title={isAr ? 'مشروع مثال يظهر للزوار بشارة "مثال توضيحي". احذفه أو عدّله واحفظه ليصبح مشروعك.' : 'Sample project, labelled on the site. Delete it, or edit and save to make it yours.'} style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-warn)', fontWeight: 'bold', marginInlineStart: 6 }}>
                            {isAr ? 'مثال توضيحي' : 'Sample'}
                          </span>
                        )}
                        {p.isHidden && (
                          <span className="pjm-badge is-hidden"><EyeOff size={11} aria-hidden="true" />{isAr ? 'مخفي من الموقع' : 'Hidden'}</span>
                        )}
                        {offerBadge(p)}
                        {blockedByApproval(p) && (
                          <span className="pjm-approval" role="status">
                            <span className={`pjm-badge ${p.approval === 'rejected' ? 'is-hidden' : 'is-offer'}`} title={approvalLabel(p, isAr)}>{p.approval === 'rejected' ? (isAr ? 'مرفوض' : 'Rejected') : (isAr ? 'بانتظار الموافقة' : 'Awaiting approval')}</span>
                            {canApprove && !readOnly && (
                              <>
                                <button type="button" className="pjm-approve" onClick={() => { if (onUpdateProject(p.id, approveUpdate()) !== false) triggerToast(isAr ? 'اتوافق على المشروع وهيظهر على الموقع' : 'Approved; the project is on the site', 'success'); }}>
                                  {isAr ? 'موافقة ونشر' : 'Approve'}
                                </button>
                                {p.approval === 'pending' && (
                                  <button type="button" className="pjm-reject" onClick={() => { if (onUpdateProject(p.id, rejectUpdate()) !== false) triggerToast(isAr ? 'اترفض ومش هيظهر على الموقع' : 'Rejected; kept off the site', 'info'); }}>
                                    {isAr ? 'رفض' : 'Reject'}
                                  </button>
                                )}
                              </>
                            )}
                          </span>
                        )}
                        {projectSampleFlags(p).length > 0 && (
                          <span title={`${isAr ? 'لسه فيه قيم من النموذج القديم: ' : 'Still has old form defaults: '}${projectSampleFlags(p).join(' • ')}`} style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-warn)', fontWeight: 'bold', marginInlineStart: 6, cursor: 'help' }}>
                            ⚠️ {isAr ? 'راجع البيانات' : 'Review data'}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: 'var(--crm-text-sm)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--crm-muted)' }}>
                        <MapPin size={12} />
                        <span>{location}</span>
                      </div>
                      <span style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-ink)', fontWeight: '700' }}>{dev}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: 'var(--crm-text-sm)' }}>
                      <strong className="text-primary">{p.startPrice.toLocaleString('en-US')} ج.م</strong>
                      <div style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-muted)' }}>{p.downPaymentPercent}% مقدم • {p.installmentYears} سنوات</div>
                    </div>
                  </td>
                  <td>
                    <div style={{ minWidth: '140px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--crm-text-xs)', fontWeight: 700, marginBottom: '3px' }}>
                        <span>{isAr ? 'الإجمالي:' : 'Total:'}</span>
                        <span className="text-emerald">{p.progress}%</span>
                      </div>
                      <div style={{ height: '6px', background: 'var(--crm-subtle-2)', borderRadius: '10px', overflow: 'hidden', marginBottom: '4px' }}>
                        <div style={{ width: `${p.progress}%`, height: '100%', background: 'linear-gradient(90deg, var(--crm-positive-solid), var(--crm-positive-solid))' }} />
                      </div>
                      <div style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-muted)', display: 'flex', gap: '4px' }}>
                        <span>خ:{bk.concrete}%</span>|<span>م:{bk.masonry}%</span>|<span>ت:{bk.finishing}%</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: 'var(--crm-text-sm)', fontWeight: 700, color: 'var(--crm-positive)' }}>
                      {p.availableUnits} / {p.totalUnits || '-'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost pjm-act"
                        disabled={readOnly}
                        onClick={() => toggleHidden(p)}
                        aria-pressed={!p.isHidden}
                        title={p.isHidden ? (isAr ? 'إظهار على الموقع' : 'Show on the site') : (isAr ? 'إخفاء من الموقع' : 'Hide from the site')}
                      >
                        {p.isHidden ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm btn-ghost pjm-act${p.offer && ['active', 'scheduled'].includes(offerState({ ...p, price: p.startPrice })) ? ' is-offer' : ''}`}
                        disabled={readOnly || p.isDemo || !Number(p.startPrice)}
                        onClick={() => setOfferEditing(p)}
                        title={p.isDemo
                          ? (isAr ? 'احفظ المشروع كمشروعك الأول عشان تعمل عليه عرض' : 'Save the sample as your own project first')
                          : (isAr ? 'عرض كاش لفترة محدودة' : 'Limited-time cash offer')}
                      >
                        <Flame size={15} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost"
                        disabled={readOnly}
                        onClick={() => handleOpenEditModal(p)}
                        title={isAr ? 'تعديل المشروع ونسب الإنجاز' : 'Edit Project'}
                        style={{ padding: '6px', color: 'var(--crm-ink)' }}
                      >
                        <Edit3 size={15} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost"
                        disabled={readOnly}
                        onClick={() => handleDelete(p.id, title)}
                        title={isAr ? 'حذف المشروع' : 'Delete'}
                        style={{ padding: '6px', color: 'var(--crm-danger)' }}
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

      {offerEditing && (
        <OfferModal
          property={{ ...offerEditing, price: offerEditing.startPrice }}
          subject="project"
          isAr={isAr}
          onClose={() => setOfferEditing(null)}
          onSave={(patch, extended, removed) => {
            if (onUpdateProject && onUpdateProject(offerEditing.id, patch) !== false) {
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

      {/* Add / Edit form: sections, photo upload and the shared photo manager */}
      {isModalOpen && (
        <ProjectFormModal
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleSubmit}
          onClose={() => { if (!isSavingRef.current) setIsModalOpen(false); }}
          isSaving={isSaving}
          editing={Boolean(editingProjectId)}
          isAr={isAr}
          triggerToast={triggerToast}
        />
      )}
    </div>
  );
}
