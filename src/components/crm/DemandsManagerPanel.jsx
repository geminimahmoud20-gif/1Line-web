import { useState, useMemo, useEffect } from 'react';
import useOpenRequest from '../../hooks/useOpenRequest';
import { Zap, Plus, Check, Trash2, Edit3, Clock, MapPin, DollarSign, Phone, MessageSquare, Search, CheckCircle, EyeOff, Sparkles, Download } from 'lucide-react';
import { exportToCsv } from '../../utils/exportCsv';
import { canViewLeadPhone, maskPhoneNumber, canEditProperties } from '../../utils/rbacRules';
import { reconcilePublicDemands } from '../../firebaseLazy';
import DemandFormModal from './demands/DemandFormModal';
import DemandMatchModal from './demands/DemandMatchModal';
import { AREA_OPTIONS, PROP_TYPE_OPTIONS } from './DemandsManagerPanelData';
import { formatWhatsAppPhone } from '../../utils/matchingEngine';
import { recordTimeLabel } from '../../utils/relativeTime';



export default function DemandsManagerPanel({
  demands = [],
  properties = [],
  onAddDemand,
  onApproveDemand,
  onUpdateDemand,
  onDeleteDemand,
  onUnpublishDemand,
  lang = 'ar',
  userRole = 'super_admin',
  triggerToast,
  openRequest = null,
  readOnly = false
}) {
  const isAr = lang === 'ar';
  const canViewPhone = canViewLeadPhone(userRole);

  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pending' | 'published' | 'archived'
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingDemand, setEditingDemand] = useState(null);
  const [matchModalDemand, setMatchModalDemand] = useState(null);

  // Once per session, an editor brings public_demands (the contact-free copies visitors read)
  // in line with the published demands — covers demands published before the copies existed.
  const canPublish = canEditProperties(userRole);
  const hasDemands = demands.length > 0;
  useEffect(() => {
    if (!canPublish || !hasDemands) return;
    try {
      if (sessionStorage.getItem('oneline_public_demands_synced')) return;
      sessionStorage.setItem('oneline_public_demands_synced', '1');
    } catch { /* storage unavailable — still sync */ }
    reconcilePublicDemands(demands).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once, when the list first arrives
  }, [canPublish, hasDemands]);

  // Auto-matching properties algorithm
  const getMatchingProperties = (demand) => {
    if (!demand || !properties || properties.length === 0) return [];
    const b = typeof demand.budget === 'number' ? demand.budget : parseInt(String(demand.budget).replace(/,/g, '')) || 0;
    return properties.filter(p => {
      const typeMatch = !demand.type || p.type === demand.type;
      const areaMatch = !demand.area || p.areaKey === demand.area;
      const priceMatch = p.price <= (b * 1.25);
      return typeMatch && (areaMatch || priceMatch);
    });
  };

  // Memoized Filtered List
  const filteredDemands = useMemo(() => {
    return demands.filter(demand => {
      const currentStatus = demand.status || 'published';
      if (statusFilter !== 'all' && currentStatus !== statusFilter) return false;
      if (typeFilter !== 'all' && demand.type !== typeFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const textAr = (demand.text_ar || '').toLowerCase();
        const textEn = (demand.text_en || '').toLowerCase();
        const client = (demand.clientName || '').toLowerCase();
        const phone = (demand.phone || '').toLowerCase();
        const area = (demand.area_ar || demand.area_en || demand.area || '').toLowerCase();
        return textAr.includes(q) || textEn.includes(q) || client.includes(q) || phone.includes(q) || area.includes(q);
      }
      return true;
    });
  }, [demands, statusFilter, typeFilter, searchQuery]);

  const handleExportCsv = () => {
    const headers = {
      id: isAr ? 'المعرف' : 'ID',
      clientName: isAr ? 'اسم العميل' : 'Client Name',
      phone: isAr ? 'الهاتف' : 'Phone',
      type: isAr ? 'نوع العقار' : 'Property Type',
      area_ar: isAr ? 'المنطقة' : 'Area',
      budget: isAr ? 'الميزانية (ج.م)' : 'Budget (EGP)',
      status: isAr ? 'الحالة' : 'Status',
      urgency: isAr ? 'الاستعجال' : 'Urgency',
      text_ar: isAr ? 'نص الطلب' : 'Details'
    };
    const exportedData = filteredDemands.map(d => ({
      ...d,
      phone: canViewPhone ? (d.phone || '—') : maskPhoneNumber(d.phone, userRole)
    }));
    exportToCsv('OneLine_Buyer_Demands', exportedData, headers);
    triggerToast?.(isAr ? 'تم تصدير الطلبات بنجاح إلى ملف Excel!' : 'Demands exported to CSV!', 'success');
  };

  // Form State for Add / Edit
  const [formData, setFormData] = useState({
    id: '',
    text_ar: '',
    text_en: '',
    area: 'east',
    area_ar: 'شرق سوهاج',
    area_en: 'East Sohag',
    type: 'apartment',
    budget: 3000000,
    urgency: 'high',
    timestamp: 'الآن',
    clientName: '',
    phone: '',
    whatsapp: '',
    status: 'published'
  });

  // Calculate KPIs in a single memoized pass
  const { totalDemandsCount, pendingCount, publishedCount, totalPurchasingPower } = useMemo(() => {
    let pending = 0;
    let published = 0;
    let purchasingPower = 0;
    for (let i = 0; i < demands.length; i++) {
      const d = demands[i];
      const st = d.status || 'published';
      if (d.status === 'pending') pending++;
      if (st === 'published') {
        published++;
        const b = typeof d.budget === 'number' ? d.budget : parseInt(String(d.budget).replace(/,/g, ''), 10) || 0;
        purchasingPower += b;
      }
    }
    return {
      totalDemandsCount: demands.length,
      pendingCount: pending,
      publishedCount: published,
      totalPurchasingPower: purchasingPower
    };
  }, [demands]);

  const handleOpenAdd = () => {
    setFormData({
      id: `dem-adm-${Date.now()}`,
      text_ar: '',
      text_en: '',
      area: 'east',
      area_ar: 'شرق سوهاج',
      area_en: 'East Sohag',
      type: 'apartment',
      budget: 3000000,
      urgency: 'high',
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      clientName: '',
      phone: '',
      whatsapp: '',
      status: 'published'
    });
    setEditingDemand(null);
    setShowAddModal(true);
  };

  useOpenRequest(openRequest, ['add_demand'], () => { if (!readOnly) handleOpenAdd(); });

  const handleOpenEdit = (demand) => {
    setEditingDemand(demand);
    setFormData({
      ...demand,
      budget: typeof demand.budget === 'number' ? demand.budget : parseInt(String(demand.budget).replace(/,/g, '')) || 2500000
    });
    setShowAddModal(true);
  };

  const handleSaveForm = (e) => {
    e.preventDefault();

    if (!formData.text_ar && !formData.text_en) {
      triggerToast?.(isAr ? 'يرجى كتابة نص الطلب' : 'Please provide request description', 'error');
      return;
    }

    const areaObj = AREA_OPTIONS.find(a => a.value === formData.area) || AREA_OPTIONS[0];

    const demandPayload = {
      ...formData,
      area_ar: areaObj.label_ar,
      area_en: areaObj.label_en,
      budget: parseInt(String(formData.budget).replace(/,/g, '')) || 2500000,
      updatedAt: new Date().toISOString()
    };

    if (editingDemand) {
      const res = onUpdateDemand?.(editingDemand.id, demandPayload);
      if (res === false) return;
      triggerToast?.(isAr ? 'تم تعديل بيانات الطلب بنجاح' : 'Demand updated successfully', 'success');
    } else {
      const res = onAddDemand?.(demandPayload);
      if (res === false) return;
      triggerToast?.(isAr ? 'تمت إضافة ونشر الطلب بنجاح' : 'New demand published successfully', 'success');
    }

    setShowAddModal(false);
    setEditingDemand(null);
  };

  const handleQuickApprove = (demand) => {
    const res = onApproveDemand?.(demand.id);
    if (res === false) return;
    triggerToast?.(
      isAr 
        ? `تم اعتماد الطلب ونشره فوراً في الصفحة الرئيسية وبوابة الطلبات!` 
        : `Demand approved and published live!`, 
      'success'
    );
  };

  const handleQuickReject = (demandId) => {
    if (window.confirm(isAr ? 'هل أنت متأكد من رفض وحذف هذا الطلب؟' : 'Are you sure you want to reject and delete this request?')) {
      const res = onDeleteDemand?.(demandId);
      if (res === false) return;
      triggerToast?.(isAr ? 'تم حذف الطلب' : 'Demand rejected/deleted', 'info');
    }
  };

  return (
    <div className="demands-manager-container" style={{ animation: 'fadeIn 0.3s ease' }}>
      {/* 1. Header Strip */}
      <div className="crm-modern-header-strip">
        <div className="crm-header-title-group">
          <h2 className="crm-header-main-title">
            <Zap size={22} style={{ color: 'var(--crm-accent-text)' }} />
            <span>{isAr ? 'إدارة طلبات المشترين واعتمادها' : 'Buyer Demands Management'}</span>
            <span className="crm-badge-360">Demand 360°</span>
          </h2>
          <div className="crm-header-subtitle">
            <span>
              {isAr 
                ? 'تدقيق واعتماد طلبات المشترين والمستثمرين ونشرها مباشرة أمام أصحاب العقارات' 
                : 'Review, verify and approve active buyer requests across the platform'}
            </span>
            <span>•</span>
            <span className="crm-header-count-pill">
              {filteredDemands.length} {isAr ? 'طلب معروض' : 'demands'}
            </span>
          </div>
        </div>

        <div className="crm-header-actions-group">
          <button 
            type="button" 
            className="crm-btn-secondary-modern"
            onClick={handleExportCsv}
            title={isAr ? 'تصدير جدول الطلبات إلى ملف Excel' : 'Export Demands to CSV'}
          >
            <Download size={15} />
            <span>{isAr ? 'تصدير Excel' : 'Export CSV'}</span>
          </button>

          <button 
            type="button" 
            className="crm-btn-primary-gold"
            disabled={readOnly}
            onClick={handleOpenAdd}
          >
            <Plus size={16} />
            <span>{isAr ? 'إضافة طلب مباشر' : 'Add Direct Demand'}</span>
          </button>
        </div>
      </div>

      {/* Quick KPI Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '20px' }}>
        <div className="crm-metric-card-executive">
          <span style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-muted)', fontWeight: '600' }}>{isAr ? 'إجمالي الطلبات' : 'Total Demands'}</span>
          <div style={{ fontSize: 'var(--crm-text-xl)', fontWeight: 800, color: 'var(--crm-ink)', marginTop: '4px' }}>
            {totalDemandsCount}
          </div>
        </div>

        <div className="crm-metric-card-executive" style={pendingCount > 0 ? { background: 'var(--crm-warn-soft)', borderColor: 'var(--crm-warn-line)' } : undefined}>
          <span style={{ fontSize: 'var(--crm-text-xs)', color: pendingCount > 0 ? 'var(--crm-warn)' : 'var(--crm-muted)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={14} />
            <span>{isAr ? 'قيد مراجعة الإدارة' : 'Pending Review'}</span>
          </span>
          <div style={{ fontSize: 'var(--crm-text-xl)', fontWeight: 800, color: pendingCount > 0 ? 'var(--crm-warn)' : 'var(--crm-ink)', marginTop: '4px' }}>
            {pendingCount}
          </div>
        </div>

        <div className="crm-metric-card-executive" style={{ borderColor: 'var(--crm-positive-line)' }}>
          <span style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-positive)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle size={14} />
            <span>{isAr ? 'منشور نشط على الموقع' : 'Published Live'}</span>
          </span>
          <div style={{ fontSize: 'var(--crm-text-xl)', fontWeight: 800, color: 'var(--crm-positive)', marginTop: '4px' }}>
            {publishedCount}
          </div>
        </div>

        <div className="crm-metric-card-executive" style={{ borderColor: 'var(--crm-info-line)' }}>
          <span style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-info)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <DollarSign size={14} />
            <span>{isAr ? 'القوة الشرائية الجاهزة' : 'Total Buying Power'}</span>
          </span>
          <div style={{ fontSize: 'var(--crm-text-xl)', fontWeight: 800, color: 'var(--crm-info)', marginTop: '4px' }}>
            {(totalPurchasingPower / 1000000).toFixed(1)} {isAr ? 'مليون ج.م' : 'M EGP'}
          </div>
        </div>
      </div>

      {/* 2. Modern Triage & Filter Hub */}
      <div className="crm-modern-triage-hub">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          {/* Status Tabs */}
          <div className="crm-triage-scroll-strip" style={{ margin: 0, padding: 0 }}>
            <button
              type="button"
              className={`crm-triage-tab-btn ${statusFilter === 'all' ? 'is-active' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              <span>{isAr ? 'جميع الطلبات' : 'All'}</span>
              <span className="crm-triage-counter">{totalDemandsCount}</span>
            </button>
            <button
              type="button"
              className={`crm-triage-tab-btn ${statusFilter === 'pending' ? 'is-active' : ''}`}
              onClick={() => setStatusFilter('pending')}
            >
              <Clock size={13} />
              <span>{isAr ? 'قيد المراجعة' : 'Pending Review'}</span>
              <span className="crm-triage-counter" style={{ background: 'var(--crm-warn)', color: 'var(--crm-on-dark)' }}>{pendingCount}</span>
            </button>
            <button
              type="button"
              className={`crm-triage-tab-btn ${statusFilter === 'published' ? 'is-active' : ''}`}
              onClick={() => setStatusFilter('published')}
            >
              <CheckCircle size={13} />
              <span>{isAr ? 'المنشورة لايف' : 'Published'}</span>
              <span className="crm-triage-counter">{publishedCount}</span>
            </button>
          </div>

          {/* Type Filter & Search Box */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <select
              value={typeFilter}
              aria-label={isAr ? 'تصفية حسب نوع العقار' : 'Filter by property type'}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="crm-select-custom-pill"
            >
              <option value="all">{isAr ? 'كل أنواع العقارات' : 'All Types'}</option>
              {PROP_TYPE_OPTIONS.map(t => (
                <option key={t.value} value={t.value}>{isAr ? t.label_ar : t.label_en}</option>
              ))}
            </select>

            <div className="crm-search-pill-wrapper" style={{ minWidth: '220px' }}>
              <Search size={15} className="crm-search-pill-icon" />
              <input
                type="text"
                placeholder={isAr ? 'بحث سريع في الطلبات...' : 'Search demands...'}
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
      </div>

      {/* 3. Demands Cards Grid */}
      {filteredDemands.length === 0 ? (
        <div className="crm-empty-state-card">
          <div className="crm-empty-state-icon-glow">
            <Zap size={26} style={{ color: 'var(--crm-accent-text)' }} />
          </div>
          <h4 style={{ color: 'var(--crm-ink)', fontSize: 'var(--crm-text-lg)', marginBottom: '6px', fontWeight: '700' }}>
            {isAr ? 'لا توجد طلبات مطابقة للفلتر المحدد' : 'No demands match this filter'}
          </h4>
          <p style={{ color: 'var(--crm-muted)', fontSize: 'var(--crm-text-base)', maxWidth: '420px', margin: '0 auto 16px' }}>
            {isAr ? 'يمكنك تغيير الفلاتر أو إضافة طلب جديد مباشرة.' : 'Try adjusting your filters or create a new demand.'}
          </p>
          <button
            type="button"
            className="crm-btn-primary-gold"
            onClick={handleOpenAdd}
            disabled={readOnly}
          >
            <Plus size={15} />
            <span>{isAr ? 'إضافة طلب جديد' : 'Add Demand'}</span>
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '18px' }}>
          {filteredDemands.map((demand) => {
            const isPending = demand.status === 'pending';
            const urgencyColor = demand.urgency === 'high' ? 'var(--crm-danger)' : demand.urgency === 'medium' ? 'var(--crm-warn)' : 'var(--crm-info)';
            const budgetNum = typeof demand.budget === 'number' ? demand.budget : parseInt(String(demand.budget).replace(/,/g, '')) || 0;

            return (
              <div 
                key={demand.id} 
                style={{
                  background: isPending ? 'var(--crm-card)' : 'var(--crm-card)',
                  border: isPending ? '2px solid var(--crm-warn)' : '1px solid var(--crm-line)',
                  borderRadius: '14px',
                  padding: '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: isPending ? '0 4px 16px rgba(245, 158, 11, 0.12)' : '0 1px 3px rgba(0,0,0,0.04)',
                  position: 'relative',
                  transition: 'all 0.2s ease'
                }}
              >
                {/* Top Badge Row */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {isPending ? (
                        <span style={{ 
                          background: 'var(--crm-warn-soft)', 
                          color: 'var(--crm-warn)', 
                          border: '1px solid var(--crm-warn-line)',
                          padding: '3px 9px', 
                          borderRadius: '12px', 
                          fontSize: 'var(--crm-text-xs)', 
                          fontWeight: 'bold',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <Clock size={11} />
                          <span>{isAr ? 'قيد مراجعة الإدارة' : 'Pending Review'}</span>
                        </span>
                      ) : (
                        <span style={{ 
                          background: 'var(--crm-positive-soft)', 
                          color: 'var(--crm-positive)', 
                          border: '1px solid var(--crm-positive-line)',
                          padding: '3px 9px', 
                          borderRadius: '12px', 
                          fontSize: 'var(--crm-text-xs)', 
                          fontWeight: 'bold',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <CheckCircle size={11} />
                          <span>{isAr ? 'معتمد ومنشور' : 'Live on Site'}</span>
                        </span>
                      )}

                      <span style={{ 
                        background: 'var(--crm-subtle-2)', 
                        color: urgencyColor, 
                        padding: '3px 8px', 
                        borderRadius: '12px', 
                        fontSize: 'var(--crm-text-xs)', 
                        fontWeight: 'bold' 
                      }}>
                        {demand.urgency === 'high' ? (isAr ? 'مستعجل كاش' : 'Urgent Cash') : (isAr ? 'طلب جاد' : 'Serious Buyer')}
                      </span>
                    </div>

                    <span style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-muted)' }}>
                      {recordTimeLabel(demand, isAr)}
                    </span>
                  </div>

                  {/* Demand Text */}
                  <h4 style={{ fontSize: 'var(--crm-text-md)', color: 'var(--crm-ink)', fontWeight: '700', lineHeight: '1.6', marginBottom: '12px' }}>
                    {isAr ? demand.text_ar : demand.text_en || demand.text_ar}
                  </h4>

                  {/* English preview if available */}
                  {demand.text_en && demand.text_ar !== demand.text_en && (
                    <p style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-muted)', fontStyle: 'italic', marginBottom: '12px', direction: 'ltr', textAlign: 'left' }}>
                      {demand.text_en}
                    </p>
                  )}

                  {/* Meta Specs Grid */}
                  <div style={{
                    background: 'var(--crm-subtle)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    marginBottom: '14px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '12px',
                    fontSize: 'var(--crm-text-sm)',
                    border: '1px solid var(--crm-line)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--crm-body)' }}>
                      <MapPin size={13} style={{ color: 'var(--crm-accent-text)' }} />
                      <span>{isAr ? (demand.area_ar || demand.area) : (demand.area_en || demand.area)}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--crm-positive)', fontWeight: 'bold' }}>
                      <DollarSign size={13} />
                      <span>{budgetNum.toLocaleString('en-US')} {isAr ? 'ج.م' : 'EGP'}</span>
                    </div>

                    {demand.paymentMethod && (
                      <div style={{ color: 'var(--crm-muted)' }}>
                        <span>{demand.paymentMethod === 'cash' ? (isAr ? 'كاش فوري' : 'Cash') : (isAr ? 'تقسيط' : 'Installments')}</span>
                      </div>
                    )}
                  </div>

                  {/* Client Confidential Contact Info (For Authorized Roles Only) */}
                  {(demand.clientName || demand.phone) && (
                    <div style={{ 
                      background: 'var(--crm-warn-soft)', 
                      border: '1px dashed var(--crm-warn-line)', 
                      borderRadius: '8px', 
                      padding: '8px 12px', 
                      marginBottom: '14px',
                      fontSize: 'var(--crm-text-xs)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong style={{ color: 'var(--crm-warn)' }}>
                            {demand.clientName || (isAr ? 'عميل بدون اسم' : 'Anonymous Buyer')}
                          </strong>
                          {demand.phone && (
                            <div style={{ color: 'var(--crm-muted)', marginTop: '2px', direction: 'ltr', textAlign: 'right' }}>
                              {canViewPhone ? demand.phone : maskPhoneNumber(demand.phone, userRole)}
                            </div>
                          )}
                        </div>

                        {/* Direct WhatsApp / Call Buttons for Authorized Roles */}
                        {demand.phone && canViewPhone && (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <a 
                              href={`https://wa.me/${formatWhatsAppPhone(demand.whatsapp || demand.phone || '')}?text=${encodeURIComponent(`أهلاً بك أستاذ ${demand.clientName || ''}، بخصوص طلبك العقاري في منصة 1Line (${demand.text_ar || ''})`)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-sm"
                              style={{ 
                                background: 'var(--brand-whatsapp-solid)', 
                                color: 'var(--crm-on-dark)', 
                                padding: '4px 8px', 
                                borderRadius: '6px', 
                                fontSize: 'var(--crm-text-xs)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                              title="WhatsApp"
                            >
                              <MessageSquare size={12} />
                              <span>واتساب</span>
                            </a>

                            <a 
                              href={`tel:${demand.phone}`}
                              className="btn btn-sm btn-outline"
                              style={{ padding: '4px 8px', borderRadius: '6px', fontSize: 'var(--crm-text-xs)' }}
                              title="Call"
                            >
                              <Phone size={12} />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Admin Control Actions */}
                <div style={{ borderTop: '1px solid var(--crm-line)', paddingTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {isPending ? (
                    <>
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        disabled={readOnly}
                        onClick={() => handleQuickApprove(demand)}
                        style={{ 
                          flex: 1, 
                          background: 'var(--crm-positive-solid)', 
                          borderColor: 'var(--crm-positive-solid)',
                          color: 'var(--crm-on-dark)',
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          gap: '6px',
                          fontSize: 'var(--crm-text-xs)',
                          fontWeight: 'bold',
                          borderRadius: '8px'
                        }}
                      >
                        <Check size={14} />
                        <span>{isAr ? 'موافقة ونشر في الموقع' : 'Approve & Publish Live'}</span>
                      </button>

                      {properties.length > 0 && (
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => setMatchModalDemand(demand)}
                          style={{ 
                            padding: '6px 10px', 
                            fontSize: 'var(--crm-text-xs)', 
                            background: 'var(--crm-warn-soft)',
                            border: '1px solid var(--crm-warn-line)', 
                            color: 'var(--crm-warn)',
                            borderRadius: '8px',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          title={isAr ? 'مطابقة العقارات المتوفرة مع هذا الطلب' : 'Match available units'}
                        >
                          <Sparkles size={13} />
                          <span>{getMatchingProperties(demand).length}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        className="btn btn-sm"
                        disabled={readOnly}
                        onClick={() => handleOpenEdit(demand)}
                        style={{ 
                          padding: '6px 10px', 
                          fontSize: 'var(--crm-text-xs)',
                          background: 'var(--crm-info-soft)',
                          color: 'var(--crm-info)',
                          border: '1px solid var(--crm-info-line)',
                          borderRadius: '8px',
                          fontWeight: 'bold'
                        }}
                        title={isAr ? 'تعديل الصياغة قبل النشر' : 'Edit specs'}
                      >
                        <Edit3 size={13} />
                        <span>{isAr ? 'تعديل' : 'Edit'}</span>
                      </button>

                      <button
                        type="button"
                        className="btn btn-sm"
                        disabled={readOnly}
                        onClick={() => handleQuickReject(demand.id)}
                        style={{ 
                          background: 'var(--crm-danger-soft)', 
                          color: 'var(--crm-danger)', 
                          border: '1px solid var(--crm-danger-line)',
                          padding: '6px 10px', 
                          fontSize: 'var(--crm-text-xs)',
                          borderRadius: '8px'
                        }}
                        title={isAr ? 'رفض وحذف' : 'Reject'}
                      >
                        <Trash2 size={13} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="btn btn-sm"
                        disabled={readOnly}
                        onClick={() => handleOpenEdit(demand)}
                        style={{ 
                          flex: 1, 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          gap: '6px', 
                          fontSize: 'var(--crm-text-xs)',
                          background: 'var(--crm-info-soft)',
                          color: 'var(--crm-info)',
                          border: '1px solid var(--crm-info-line)',
                          borderRadius: '8px',
                          fontWeight: 'bold'
                        }}
                      >
                        <Edit3 size={13} />
                        <span>{isAr ? 'تعديل البيانات' : 'Edit Details'}</span>
                      </button>

                      {properties.length > 0 && (
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => setMatchModalDemand(demand)}
                          style={{ 
                            padding: '6px 12px', 
                            fontSize: 'var(--crm-text-xs)', 
                            background: 'var(--crm-warn-soft)',
                            border: '1px solid var(--crm-warn-line)', 
                            color: 'var(--crm-warn)',
                            borderRadius: '8px',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}
                          title={isAr ? 'مطابقة العقارات المتوفرة مع هذا الطلب' : 'Match available units'}
                        >
                          <Sparkles size={13} />
                          <span>{isAr ? `مطابقة (${getMatchingProperties(demand).length})` : `Matches (${getMatchingProperties(demand).length})`}</span>
                        </button>
                      )}

                      {onUnpublishDemand && (
                        <button
                          type="button"
                          className="btn btn-sm"
                          disabled={readOnly}
                          onClick={() => {
                            const res = onUnpublishDemand(demand.id);
                            if (res !== false) {
                              triggerToast?.(isAr ? 'تم إيقاف نشر الطلب بنجاح' : 'Demand unpublished', 'info');
                            }
                          }}
                          style={{ 
                            padding: '6px 10px', 
                            fontSize: 'var(--crm-text-xs)', 
                            background: 'rgba(255, 255, 255, 0.06)',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            color: 'var(--crm-faint)',
                            borderRadius: '8px'
                          }}
                          title={isAr ? 'إلغاء النشر مؤقتاً' : 'Unpublish'}
                        >
                          <EyeOff size={13} />
                        </button>
                      )}

                      <button
                        type="button"
                        className="btn btn-sm"
                        disabled={readOnly}
                        onClick={() => handleQuickReject(demand.id)}
                        style={{ 
                          background: 'rgba(239, 68, 68, 0.15)', 
                          color: 'var(--crm-danger)', 
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          padding: '6px 10px', 
                          fontSize: 'var(--crm-text-xs)',
                          borderRadius: '8px'
                        }}
                        title={isAr ? 'حذف' : 'Delete'}
                      >
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Modal for Adding / Editing Demand in CRM */}
      {showAddModal && (
        <DemandFormModal
          editingDemand={editingDemand}
          formData={formData}
          handleSaveForm={handleSaveForm}
          isAr={isAr}
          setFormData={setFormData}
          setShowAddModal={setShowAddModal}
        />
      )}

      {/* 5. Matching Units Modal */}
      {matchModalDemand && (
        <DemandMatchModal
          canViewPhone={canViewPhone}
          getMatchingProperties={getMatchingProperties}
          isAr={isAr}
          matchModalDemand={matchModalDemand}
          setMatchModalDemand={setMatchModalDemand}
        />
      )}
    </div>
  );
}
