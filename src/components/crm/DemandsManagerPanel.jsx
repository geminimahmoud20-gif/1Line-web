import { useState } from 'react';
import { 
  Zap, 
  Plus, 
  Check, 
  X, 
  Trash2, 
  Edit3, 
  Clock, 
  MapPin, 
  DollarSign, 
  Phone, 
  MessageSquare, 
  Search, 
  Filter, 
  CheckCircle, 
  AlertCircle, 
  ShieldCheck, 
  Globe, 
  Eye, 
  EyeOff, 
  Sparkles, 
  Send,
  Building2,
  Calendar,
  Layers,
  Download,
  Home,
  Share2
} from 'lucide-react';
import { exportToCsv } from '../../utils/exportCsv';

const AREA_OPTIONS = [
  { value: 'east', label_ar: 'شرق سوهاج', label_en: 'East Sohag' },
  { value: 'new_sohag', label_ar: 'سوهاج الجديدة', label_en: 'New Sohag' },
  { value: 'kawthar', label_ar: 'حي الكوثر', label_en: 'Al-Kawthar' },
  { value: 'center', label_ar: 'وسط البلد - الجامعة', label_en: 'City Center / University' },
  { value: 'west', label_ar: 'غرب سوهاج', label_en: 'West Sohag' },
  { value: 'akhmeem', label_ar: 'أخميم', label_en: 'Akhmeem' }
];

const PROP_TYPE_OPTIONS = [
  { value: 'apartment', label_ar: 'شقة سكنية', label_en: 'Apartment' },
  { value: 'villa', label_ar: 'فيلا / تاون هاوس', label_en: 'Villa / Townhouse' },
  { value: 'land', label_ar: 'أرض استثمارية / بناء', label_en: 'Land / Plot' },
  { value: 'retail', label_ar: 'محل تجاري / فرنشايز', label_en: 'Commercial Retail Shop' },
  { value: 'office', label_ar: 'مكتب إداري / عيادة', label_en: 'Admin Office / Clinic' },
  { value: 'building', label_ar: 'عمارة / برج سكني', label_en: 'Entire Building' }
];

export default function DemandsManagerPanel({
  demands = [],
  properties = [],
  onAddDemand,
  onApproveDemand,
  onUpdateDemand,
  onDeleteDemand,
  onUnpublishDemand,
  lang = 'ar',
  triggerToast
}) {
  const isAr = lang === 'ar';

  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pending' | 'published' | 'archived'
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingDemand, setEditingDemand] = useState(null);
  const [matchModalDemand, setMatchModalDemand] = useState(null);

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
    exportToCsv('OneLine_Buyer_Demands', filteredDemands, headers);
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

  // Calculate KPIs
  const totalDemandsCount = demands.length;
  const pendingCount = demands.filter(d => (d.status === 'pending')).length;
  const publishedCount = demands.filter(d => (d.status || 'published') === 'published').length;
  const totalPurchasingPower = demands
    .filter(d => (d.status || 'published') === 'published')
    .reduce((sum, d) => sum + (typeof d.budget === 'number' ? d.budget : parseInt(String(d.budget).replace(/,/g, '')) || 0), 0);

  // Filtered List
  const filteredDemands = demands.filter(demand => {
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
      timestamp: isAr ? 'الآن' : 'Just now',
      clientName: '',
      phone: '',
      whatsapp: '',
      status: 'published'
    });
    setEditingDemand(null);
    setShowAddModal(true);
  };

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
      onUpdateDemand(editingDemand.id, demandPayload);
      triggerToast?.(isAr ? 'تم تعديل بيانات الطلب بنجاح' : 'Demand updated successfully', 'success');
    } else {
      onAddDemand(demandPayload);
      triggerToast?.(isAr ? 'تمت إضافة ونشر الطلب بنجاح' : 'New demand published successfully', 'success');
    }

    setShowAddModal(false);
    setEditingDemand(null);
  };

  const handleQuickApprove = (demand) => {
    onApproveDemand(demand.id);
    triggerToast?.(
      isAr 
        ? `تم اعتماد الطلب ونشره فوراً في الصفحة الرئيسية وبوابة الطلبات!` 
        : `Demand approved and published live!`, 
      'success'
    );
  };

  const handleQuickReject = (demandId) => {
    if (window.confirm(isAr ? 'هل أنت متأكد من رفض وحذف هذا الطلب؟' : 'Are you sure you want to reject and delete this request?')) {
      onDeleteDemand(demandId);
      triggerToast?.(isAr ? 'تم حذف الطلب' : 'Demand rejected/deleted', 'info');
    }
  };

  return (
    <div className="demands-manager-container" style={{ animation: 'fadeIn 0.3s ease' }}>
      {/* 1. Header & KPI Metrics */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.9) 100%)',
        border: '1px solid rgba(217, 119, 6, 0.3)',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(217, 119, 6, 0.15)', color: 'var(--accent-gold)' }}>
                <Zap size={24} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.4rem', color: '#fff', margin: 0 }}>
                  {isAr ? 'إدارة طلبات المشترين واعتمادها (Market Demands CMS)' : 'Buyer Demands Management & Approval'}
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '4px 0 0' }}>
                  {isAr 
                    ? 'راجع طلبات المشترين والمستثمرين الواردة من الموقع، ودقق مواصفاتها واعتمد نشرها مباشرة أمام البائعين.' 
                    : 'Review, verify and approve active buyer requests submitted across the platform.'}
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button 
              type="button" 
              className="btn btn-outline"
              onClick={handleExportCsv}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '10px', fontSize: '0.84rem' }}
              title={isAr ? 'تصدير جدول الطلبات إلى ملف Excel' : 'Export Demands to CSV'}
            >
              <Download size={16} />
              <span>{isAr ? 'تصدير Excel' : 'Export CSV'}</span>
            </button>

            <button 
              type="button" 
              className="btn btn-primary"
              onClick={handleOpenAdd}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '10px', fontWeight: 'bold' }}
            >
              <Plus size={18} />
              <span>{isAr ? 'إضافة طلب مباشر من الإدارة' : 'Add Direct Demand'}</span>
            </button>
          </div>
        </div>

        {/* Quick KPI Stat Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '14px 18px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{isAr ? 'إجمالي الطلبات' : 'Total Demands'}</span>
            <div style={{ fontSize: '1.6rem', fontWeight: '900', color: '#fff', marginTop: '4px' }}>
              {totalDemandsCount}
            </div>
          </div>

          <div style={{ 
            background: pendingCount > 0 ? 'rgba(217, 119, 6, 0.15)' : 'rgba(255, 255, 255, 0.04)', 
            border: pendingCount > 0 ? '1px solid var(--accent-gold)' : '1px solid rgba(255, 255, 255, 0.08)', 
            borderRadius: '12px', 
            padding: '14px 18px' 
          }}>
            <span style={{ fontSize: '0.8rem', color: pendingCount > 0 ? 'var(--accent-gold)' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={14} />
              <span>{isAr ? 'قيد مراجعة الإدارة' : 'Pending Review'}</span>
            </span>
            <div style={{ fontSize: '1.6rem', fontWeight: '900', color: pendingCount > 0 ? 'var(--accent-gold)' : '#fff', marginTop: '4px' }}>
              {pendingCount}
            </div>
          </div>

          <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '12px', padding: '14px 18px' }}>
            <span style={{ fontSize: '0.8rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle size={14} />
              <span>{isAr ? 'منشور نشط على الموقع' : 'Published Live'}</span>
            </span>
            <div style={{ fontSize: '1.6rem', fontWeight: '900', color: '#10b981', marginTop: '4px' }}>
              {publishedCount}
            </div>
          </div>

          <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '12px', padding: '14px 18px' }}>
            <span style={{ fontSize: '0.8rem', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <DollarSign size={14} />
              <span>{isAr ? 'القوة الشرائية الجاهزة' : 'Total Buying Power'}</span>
            </span>
            <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#60a5fa', marginTop: '4px' }}>
              {(totalPurchasingPower / 1000000).toFixed(1)} {isAr ? 'مليون ج.م' : 'M EGP'}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Filter Bar & Search */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.6)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '12px',
        padding: '14px 18px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px'
      }}>
        {/* Status Tabs */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`btn btn-sm ${statusFilter === 'all' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setStatusFilter('all')}
            style={{ borderRadius: '20px', fontSize: '0.8rem', padding: '6px 14px' }}
          >
            {isAr ? 'جميع الطلبات' : 'All'} ({totalDemandsCount})
          </button>
          <button
            type="button"
            className={`btn btn-sm ${statusFilter === 'pending' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setStatusFilter('pending')}
            style={{ 
              borderRadius: '20px', 
              fontSize: '0.8rem', 
              padding: '6px 14px',
              background: statusFilter === 'pending' ? 'var(--accent-gold)' : undefined,
              color: statusFilter === 'pending' ? '#000' : undefined,
              fontWeight: 'bold'
            }}
          >
            {isAr ? 'قيد المراجعة' : 'Pending Review'} ({pendingCount})
          </button>
          <button
            type="button"
            className={`btn btn-sm ${statusFilter === 'published' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setStatusFilter('published')}
            style={{ borderRadius: '20px', fontSize: '0.8rem', padding: '6px 14px' }}
          >
            {isAr ? 'المنشورة لايف' : 'Published'} ({publishedCount})
          </button>
        </div>

        {/* Type Filter & Search Box */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', flex: 1, justifyContent: 'flex-end' }}>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: 'var(--text-primary)',
              fontSize: '0.82rem'
            }}
          >
            <option value="all">{isAr ? 'كل أنواع العقارات' : 'All Types'}</option>
            {PROP_TYPE_OPTIONS.map(t => (
              <option key={t.value} value={t.value}>{isAr ? t.label_ar : t.label_en}</option>
            ))}
          </select>

          <div style={{ position: 'relative', minWidth: '220px' }}>
            <Search size={15} style={{ position: 'absolute', top: '10px', [isAr ? 'right' : 'left']: '10px', color: 'var(--text-secondary)' }} />
            <input
              type="text"
              placeholder={isAr ? 'بحث بالنص، العميل، الهاتف، المنطقة...' : 'Search by keyword, client...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 12px',
                paddingInlineStart: '32px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: 'var(--text-primary)',
                fontSize: '0.82rem'
              }}
            />
          </div>
        </div>
      </div>

      {/* 3. Demands Cards Grid */}
      {filteredDemands.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          background: 'rgba(15, 23, 42, 0.4)',
          border: '1px dashed rgba(255, 255, 255, 0.15)',
          borderRadius: '16px'
        }}>
          <Zap size={40} style={{ color: 'var(--text-secondary)', opacity: 0.4, margin: '0 auto 12px' }} />
          <h4 style={{ color: 'var(--text-primary)', fontSize: '1.1rem', marginBottom: '6px' }}>
            {isAr ? 'لا توجد طلبات مطابقة للفلتر المحدد' : 'No demands match this filter'}
          </h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            {isAr ? 'يمكنك تغيير الفلاتر أو إضافة طلب جديد مباشرة.' : 'Try adjusting your filters or create a new demand.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '18px' }}>
          {filteredDemands.map((demand) => {
            const isPending = demand.status === 'pending';
            const isPublished = (demand.status || 'published') === 'published';
            const urgencyColor = demand.urgency === 'high' ? '#ef4444' : demand.urgency === 'medium' ? 'var(--accent-gold)' : '#06b6d4';
            const budgetNum = typeof demand.budget === 'number' ? demand.budget : parseInt(String(demand.budget).replace(/,/g, '')) || 0;

            return (
              <div 
                key={demand.id} 
                style={{
                  background: isPending ? 'linear-gradient(145deg, rgba(30, 27, 75, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)' : 'rgba(15, 23, 42, 0.75)',
                  border: isPending ? '2px solid var(--accent-gold)' : '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '14px',
                  padding: '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: isPending ? '0 0 20px rgba(217, 119, 6, 0.2)' : '0 4px 12px rgba(0,0,0,0.2)',
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
                          background: 'rgba(217, 119, 6, 0.2)', 
                          color: 'var(--accent-gold)', 
                          border: '1px solid var(--accent-gold)',
                          padding: '3px 9px', 
                          borderRadius: '12px', 
                          fontSize: '0.72rem', 
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
                          background: 'rgba(16, 185, 129, 0.15)', 
                          color: '#10b981', 
                          border: '1px solid rgba(16, 185, 129, 0.4)',
                          padding: '3px 9px', 
                          borderRadius: '12px', 
                          fontSize: '0.72rem', 
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
                        background: 'rgba(255, 255, 255, 0.08)', 
                        color: urgencyColor, 
                        padding: '3px 8px', 
                        borderRadius: '12px', 
                        fontSize: '0.7rem', 
                        fontWeight: 'bold' 
                      }}>
                        {demand.urgency === 'high' ? (isAr ? 'مستعجل كاش' : 'Urgent Cash') : (isAr ? 'طلب جاد' : 'Serious Buyer')}
                      </span>
                    </div>

                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                      {demand.timestamp || (demand.createdAt ? new Date(demand.createdAt).toLocaleDateString('ar-EG') : '')}
                    </span>
                  </div>

                  {/* Demand Text */}
                  <h4 style={{ fontSize: '0.94rem', color: '#fff', fontWeight: '600', lineHeight: '1.6', marginBottom: '12px' }}>
                    {isAr ? demand.text_ar : demand.text_en || demand.text_ar}
                  </h4>

                  {/* English preview if available */}
                  {demand.text_en && demand.text_ar !== demand.text_en && (
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontStyle: 'italic', marginBottom: '12px', direction: 'ltr', textAlign: 'left' }}>
                      {demand.text_en}
                    </p>
                  )}

                  {/* Meta Specs Grid */}
                  <div style={{
                    background: 'rgba(0, 0, 0, 0.25)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    marginBottom: '14px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '12px',
                    fontSize: '0.8rem',
                    border: '1px solid rgba(255, 255, 255, 0.05)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-secondary)' }}>
                      <MapPin size={13} style={{ color: 'var(--accent-gold)' }} />
                      <span>{isAr ? (demand.area_ar || demand.area) : (demand.area_en || demand.area)}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#10b981', fontWeight: 'bold' }}>
                      <DollarSign size={13} />
                      <span>{budgetNum.toLocaleString()} {isAr ? 'ج.م' : 'EGP'}</span>
                    </div>

                    {demand.paymentMethod && (
                      <div style={{ color: 'var(--text-secondary)' }}>
                        <span>{demand.paymentMethod === 'cash' ? (isAr ? 'كاش فوري' : 'Cash') : (isAr ? 'تقسيط' : 'Installments')}</span>
                      </div>
                    )}
                  </div>

                  {/* Client Confidential Contact Info (For Admin Only) */}
                  {(demand.clientName || demand.phone) && (
                    <div style={{ 
                      background: 'rgba(217, 119, 6, 0.08)', 
                      border: '1px dashed rgba(217, 119, 6, 0.3)', 
                      borderRadius: '8px', 
                      padding: '8px 12px', 
                      marginBottom: '14px',
                      fontSize: '0.78rem'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong style={{ color: 'var(--accent-gold)' }}>
                            {demand.clientName || (isAr ? 'عميل بدون اسم' : 'Anonymous Buyer')}
                          </strong>
                          {demand.phone && (
                            <div style={{ color: 'var(--text-secondary)', marginTop: '2px', direction: 'ltr', textAlign: 'right' }}>
                              {demand.phone}
                            </div>
                          )}
                        </div>

                        {/* Direct WhatsApp / Call Buttons for Admin */}
                        {demand.phone && (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <a 
                              href={`https://wa.me/${demand.whatsapp ? demand.whatsapp.replace(/[^0-9]/g, '') : demand.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`أهلاً بك أستاذ ${demand.clientName || ''}، بخصوص طلبك العقاري في منصة 1Line (${demand.text_ar || ''})`)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-sm"
                              style={{ 
                                background: '#25D366', 
                                color: '#fff', 
                                padding: '4px 8px', 
                                borderRadius: '6px', 
                                fontSize: '0.72rem',
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
                              style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '0.72rem' }}
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
                <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {isPending ? (
                    <>
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={() => handleQuickApprove(demand)}
                        style={{ 
                          flex: 1, 
                          background: 'linear-gradient(135deg, #10b981, #059669)', 
                          borderColor: '#10b981',
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          gap: '6px',
                          fontSize: '0.78rem',
                          fontWeight: 'bold'
                        }}
                      >
                        <Check size={14} />
                        <span>{isAr ? 'موافقة ونشر في الموقع' : 'Approve & Publish Live'}</span>
                      </button>

                      {properties.length > 0 && (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline"
                          onClick={() => setMatchModalDemand(demand)}
                          style={{ padding: '6px 10px', fontSize: '0.78rem', borderColor: 'var(--accent-gold)', color: 'var(--accent-gold)' }}
                          title={isAr ? 'مطابقة العقارات المتوفرة مع هذا الطلب' : 'Match available units'}
                        >
                          <Sparkles size={13} />
                          <span>{getMatchingProperties(demand).length}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        className="btn btn-sm btn-outline"
                        onClick={() => handleOpenEdit(demand)}
                        style={{ padding: '6px 10px', fontSize: '0.78rem' }}
                        title={isAr ? 'تعديل الصياغة قبل النشر' : 'Edit specs'}
                      >
                        <Edit3 size={13} />
                        <span>{isAr ? 'تعديل' : 'Edit'}</span>
                      </button>

                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => handleQuickReject(demand.id)}
                        style={{ 
                          background: 'rgba(239, 68, 68, 0.15)', 
                          color: '#ef4444', 
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          padding: '6px 10px', 
                          fontSize: '0.78rem' 
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
                        className="btn btn-sm btn-outline"
                        onClick={() => handleOpenEdit(demand)}
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.78rem' }}
                      >
                        <Edit3 size={13} />
                        <span>{isAr ? 'تعديل البيانات' : 'Edit Details'}</span>
                      </button>

                      {properties.length > 0 && (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline"
                          onClick={() => setMatchModalDemand(demand)}
                          style={{ padding: '6px 10px', fontSize: '0.78rem', borderColor: 'var(--accent-gold)', color: 'var(--accent-gold)' }}
                          title={isAr ? 'مطابقة العقارات المتوفرة مع هذا الطلب' : 'Match available units'}
                        >
                          <Sparkles size={13} />
                          <span>{isAr ? `مطابقة (${getMatchingProperties(demand).length})` : `Matches (${getMatchingProperties(demand).length})`}</span>
                        </button>
                      )}

                      {onUnpublishDemand && (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline"
                          onClick={() => onUnpublishDemand(demand.id)}
                          style={{ padding: '6px 10px', fontSize: '0.78rem', color: 'var(--accent-gold)' }}
                          title={isAr ? 'إلغاء النشر مؤقتاً' : 'Unpublish'}
                        >
                          <EyeOff size={13} />
                        </button>
                      )}

                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => handleQuickReject(demand.id)}
                        style={{ 
                          background: 'rgba(239, 68, 68, 0.15)', 
                          color: '#ef4444', 
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          padding: '6px 10px', 
                          fontSize: '0.78rem' 
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
        <div className="track-modal-backdrop" onClick={() => setShowAddModal(false)} style={{ zIndex: 1200 }}>
          <div 
            className="track-modal-card" 
            onClick={(e) => e.stopPropagation()} 
            style={{ 
              maxWidth: '650px', 
              width: '95%', 
              maxHeight: '90vh', 
              overflowY: 'auto',
              borderRadius: '20px',
              border: '1px solid var(--accent-gold)'
            }}
          >
            <button type="button" className="modal-close-btn" onClick={() => setShowAddModal(false)}>
              <X size={20} />
            </button>

            <div className="track-modal-header" style={{ marginBottom: '18px' }}>
              <div className="track-icon-wrap" style={{ background: 'linear-gradient(135deg, #d97706, #b45309)' }}>
                <Edit3 size={20} style={{ color: '#fff' }} />
              </div>
              <h3>
                {editingDemand 
                  ? (isAr ? 'تعديل وتدقيق طلب المشتري' : 'Edit & Refine Buyer Demand')
                  : (isAr ? 'إضافة طلب شراء عقاري جديد (من الإدارة)' : 'Add Direct Buyer Demand')}
              </h3>
              <p>
                {isAr 
                  ? 'قم بضبط النص والميزانية والمنطقة بدقة قبل النشر العام في الموقع.' 
                  : 'Refine demand details before publishing to public portal.'}
              </p>
            </div>

            <form onSubmit={handleSaveForm} className="booking-form-wrap" style={{ gap: '14px' }}>
              {/* Arabic Description */}
              <div className="form-group-item">
                <label>{isAr ? 'نص الطلب باللغة العربية (الظاهر للجمهور) *' : 'Arabic Demand Text (Public) *'}</label>
                <textarea
                  rows={3}
                  required
                  placeholder={isAr ? 'مثال: مطلوب شقة سكنية 160 متر في منطقة شرق سوهاج بميزانية 3.2 مليون كاش - استلام فوري.' : 'e.g. Wanted: 160 sqm apartment...'}
                  value={formData.text_ar}
                  onChange={(e) => setFormData({ ...formData, text_ar: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: 'var(--text-primary)',
                    fontSize: '0.88rem'
                  }}
                />
              </div>

              {/* English Description */}
              <div className="form-group-item">
                <label>{isAr ? 'نص الطلب باللغة الإنجليزية (اختياري)' : 'English Demand Text (Optional)'}</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Wanted: 160 sqm residential apartment in East Sohag, budget 3.2M EGP Cash..."
                  value={formData.text_en}
                  onChange={(e) => setFormData({ ...formData, text_en: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: 'var(--text-primary)',
                    fontSize: '0.88rem',
                    direction: 'ltr',
                    textAlign: 'left'
                  }}
                />
              </div>

              {/* Type & Area */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group-item">
                  <label>{isAr ? 'نوع العقار' : 'Property Type'}</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  >
                    {PROP_TYPE_OPTIONS.map(t => (
                      <option key={t.value} value={t.value}>{isAr ? t.label_ar : t.label_en}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group-item">
                  <label>{isAr ? 'المنطقة' : 'District'}</label>
                  <select
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                  >
                    {AREA_OPTIONS.map(a => (
                      <option key={a.value} value={a.value}>{isAr ? a.label_ar : a.label_en}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Budget & Urgency */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group-item">
                  <label>{isAr ? 'الميزانية (جنيه مصري)' : 'Budget (EGP)'} *</label>
                  <input
                    type="number"
                    required
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                    step="50000"
                  />
                </div>

                <div className="form-group-item">
                  <label>{isAr ? 'درجة الجدية / الاستعجال' : 'Urgency'}</label>
                  <select
                    value={formData.urgency}
                    onChange={(e) => setFormData({ ...formData, urgency: e.target.value })}
                  >
                    <option value="high">{isAr ? 'مستعجل كاش (عالي الأولوية)' : 'Urgent Cash'}</option>
                    <option value="medium">{isAr ? 'طلب جاد (عادي)' : 'Serious Buyer'}</option>
                    <option value="low">{isAr ? 'شراء مستقبلي / فرصة' : 'Low / Opportunity'}</option>
                  </select>
                </div>
              </div>

              {/* Publishing Status */}
              <div className="form-group-item">
                <label>{isAr ? 'حالة النشر والظهور على الموقع' : 'Listing Status'}</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  style={{ fontWeight: 'bold' }}
                >
                  <option value="published">{isAr ? '✅ معتمد ومنشور مباشرة على الموقع' : 'Published / Live'}</option>
                  <option value="pending">{isAr ? '⏳ قيد المراجعة (غير ظاهر للجمهور)' : 'Pending Review'}</option>
                  <option value="archived">{isAr ? '📁 مؤرشف / تم إغلاق الصفقة' : 'Archived / Closed'}</option>
                </select>
              </div>

              {/* Optional Client Details */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '10px', marginTop: '4px' }}>
                <small style={{ color: 'var(--accent-gold)', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>
                  {isAr ? 'بيانات المشتري (خاصة للإدارة فقط)' : 'Confidential Buyer Contact Info (Admin Only)'}
                </small>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group-item">
                    <label>{isAr ? 'اسم العميل' : 'Client Name'}</label>
                    <input
                      type="text"
                      placeholder={isAr ? 'اسم العميل' : 'Name'}
                      value={formData.clientName || ''}
                      onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                    />
                  </div>
                  <div className="form-group-item">
                    <label>{isAr ? 'رقم الهاتف' : 'Phone'}</label>
                    <input
                      type="text"
                      placeholder="010XXXXXXXX"
                      value={formData.phone || ''}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '12px', fontWeight: 'bold' }}>
                  <Sparkles size={16} />
                  <span>{editingDemand ? (isAr ? 'حفظ التعديلات' : 'Save Changes') : (isAr ? 'نشر الطلب الآن' : 'Publish Demand')}</span>
                </button>
                <button type="button" className="btn btn-outline" onClick={() => setShowAddModal(false)}>
                  <span>{isAr ? 'إلغاء' : 'Cancel'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Matching Units Modal */}
      {matchModalDemand && (
        <div className="track-modal-backdrop" onClick={() => setMatchModalDemand(null)} style={{ zIndex: 1200 }}>
          <div 
            className="track-modal-card" 
            onClick={(e) => e.stopPropagation()} 
            style={{ 
              maxWidth: '850px', 
              width: '95%', 
              maxHeight: '90vh', 
              overflowY: 'auto',
              borderRadius: '20px',
              border: '1px solid var(--accent-gold)'
            }}
          >
            <button type="button" className="modal-close-btn" onClick={() => setMatchModalDemand(null)}>
              <X size={20} />
            </button>

            <div className="track-modal-header" style={{ marginBottom: '18px' }}>
              <div className="track-icon-wrap" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                <Home size={22} style={{ color: '#fff' }} />
              </div>
              <h3>{isAr ? 'العقارات المتاحة المطابقة لطلب المشتري' : 'Matching Inventory Units'}</h3>
              <p>
                {isAr 
                  ? 'محرك المطابقة الذكي يبحث في محفظة العقارات الموثقة بسوهاج لاقتراح أنسب الوحدات للمشتري فوراً.' 
                  : 'Instant matching engine queries verified database for top matching units.'}
              </p>
            </div>

            {/* Demand Summary Pill */}
            <div style={{
              background: 'rgba(217, 119, 6, 0.1)',
              border: '1px solid rgba(217, 119, 6, 0.3)',
              borderRadius: '12px',
              padding: '12px 16px',
              marginBottom: '20px',
              fontSize: '0.85rem'
            }}>
              <strong style={{ color: 'var(--accent-gold)', display: 'block', marginBottom: '4px' }}>
                {isAr ? 'الطلب المستهدف للمطابقة:' : 'Target Demand:'} {matchModalDemand.clientName ? `(${matchModalDemand.clientName})` : ''}
              </strong>
              <p style={{ margin: 0, color: 'var(--text-primary)' }}>
                {isAr ? matchModalDemand.text_ar : matchModalDemand.text_en || matchModalDemand.text_ar}
              </p>
              <div style={{ display: 'flex', gap: '14px', marginTop: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <span>📍 {isAr ? (matchModalDemand.area_ar || matchModalDemand.area) : matchModalDemand.area}</span>
                <span>💰 {(typeof matchModalDemand.budget === 'number' ? matchModalDemand.budget : parseInt(String(matchModalDemand.budget).replace(/,/g, '')) || 0).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}</span>
              </div>
            </div>

            {/* Matching Properties List */}
            {getMatchingProperties(matchModalDemand).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                <AlertCircle size={32} style={{ color: 'var(--accent-gold)', margin: '0 auto 10px' }} />
                <h4 style={{ color: '#fff', marginBottom: '6px' }}>
                  {isAr ? 'لم يتم العثور على وحدات مطابقة حالياً' : 'No exact matching units found'}
                </h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem' }}>
                  {isAr 
                    ? 'يمكنك مراجعة الأقسام الأخرى أو تسجيل عقار جديد من قسم إدارة العقارات.' 
                    : 'Consider expanding your price filter or listing a new property in the CMS.'}
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '14px' }}>
                {getMatchingProperties(matchModalDemand).map((p) => {
                  const shareText = `أهلاً بك أستاذ ${matchModalDemand.clientName || 'العميل'}، بخصوص طلبك العقاري في منصة 1Line: يسعدنا ترشيح هذا العقار المطابق لطلبك تماماً:\n"${p.title_ar || p.title}"\nالسعر: ${p.price.toLocaleString()} ج.م في ${p.locationName_ar || p.areaKey}\nالمعاينة والتفاصيل: ${window.location.origin}/properties/${p.id}`;
                  const cleanPhone = matchModalDemand.phone ? matchModalDemand.phone.replace(/[^0-9]/g, '') : '';

                  return (
                    <div 
                      key={p.id}
                      style={{
                        background: 'rgba(15, 23, 42, 0.7)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div style={{ position: 'relative', height: '130px' }}>
                        <img 
                          src={p.images?.[0] || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80'} 
                          alt={p.title_ar} 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <span style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(15,23,42,0.85)', color: 'var(--accent-gold)', fontSize: '0.7rem', padding: '2px 8px', borderRadius: '8px', fontWeight: 'bold' }}>
                          {p.price.toLocaleString()} ج.م
                        </span>
                      </div>

                      <div style={{ padding: '12px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div>
                          <h4 style={{ fontSize: '0.88rem', color: '#fff', margin: '0 0 6px', fontWeight: 'bold', lineHeight: '1.4' }}>
                            {isAr ? p.title_ar : p.title_en || p.title_ar}
                          </h4>
                          <small style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <MapPin size={11} className="text-gold" />
                            <span>{isAr ? (p.locationName_ar || p.areaKey) : (p.locationName_en || p.areaKey)}</span>
                          </small>
                          <div style={{ display: 'flex', gap: '10px', marginTop: '8px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {p.size && <span>📐 {p.size} م²</span>}
                            {p.bedrooms && <span>🛏️ {p.bedrooms} غرف</span>}
                          </div>
                        </div>

                        {/* WhatsApp Pitch Share Button */}
                        {cleanPhone ? (
                          <a
                            href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(shareText)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-sm btn-primary"
                            style={{ 
                              marginTop: '12px', 
                              background: '#25D366', 
                              borderColor: '#25D366',
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center', 
                              gap: '6px',
                              fontSize: '0.76rem',
                              fontWeight: 'bold',
                              padding: '8px'
                            }}
                          >
                            <Share2 size={13} />
                            <span>{isAr ? 'إرسال العرض للعميل (واتساب)' : 'Send Deal via WhatsApp'}</span>
                          </a>
                        ) : (
                          <div style={{ marginTop: '10px', fontSize: '0.72rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                            {isAr ? 'رقم العميل غير متاح للمراسلة' : 'No direct client phone recorded'}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <button 
                type="button" 
                className="btn btn-outline" 
                onClick={() => setMatchModalDemand(null)}
                style={{ minWidth: '140px' }}
              >
                <span>{isAr ? 'إغلاق' : 'Close'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
