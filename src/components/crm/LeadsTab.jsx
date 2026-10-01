import { Download, Building, Users, User, Inbox, MessageSquare, Edit3, Trash2, Clock, Zap, Plus, UserPlus, Send, Archive } from 'lucide-react';
import { canExportCsv, canEditLeadsRole } from '../../utils/rbacRules';
import { SOHAG_AREAS } from '../../data/propertiesData';
import { formatFollowUp, formatBudget } from '../../utils/crmLabels';
import DeskOptions from './DeskOptions';

export default function LeadsTab({
  activeRole,
  areaFilter,
  currentRoleObj,
  filteredLeads,
  getLocalizedArea,
  getLocalizedPropertyType,
  handleBulkAssign,
  handleBulkDelete,
  handleBulkExportSelected,
  handleClaimLead,
  handleDeleteLeadClick,
  handleExportCSV,
  handleOpenEditLead,
  handleToggleSelectAll,
  handleToggleSelectOne,
  isAr,
  isSuperAdmin,
  kbdIndex,
  lang,
  leadFilter,
  leads,
  onConvertToProperty,
  onDispatchLeadClick,
  onUpdateLead,
  onWhatsAppClick,
  searchQuery,
  selectedLeadIds,
  setAreaFilter,
  setKbdIndex,
  setLeadFilter,
  setQuickDrawerLead,
  setSearchQuery,
  setSelectedLeadIds,
  setShowAddLeadModal,
  setTemperatureFilter,
  setViewingProfileLead,
  temperatureFilter,
  triggerToast
}) {
  return (
    <div className="crm-table-container">
      {/* Top Control Strip */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={20} className="text-gold" />
            {isAr ? 'قاعدة بيانات العملاء الشاملة' : 'Customer 360° Database'}
          </h3>
          <span style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-muted)' }}>
            {isAr ? `إجمالي العملاء: ${leads.length} عميل | المطابق للفلتر: ${filteredLeads.length}` : `Total Leads: ${leads.length} | Filtered: ${filteredLeads.length}`}
          </span>
        </div>

        {/* Quick Add Lead & Export Actions */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() => setShowAddLeadModal(true)}
            style={{
              background: 'var(--gradient-gold)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 10px rgba(217, 119, 6, 0.3)'
            }}
          >
            <UserPlus size={15} />
            <span>{isAr ? 'إضافة عميل جديد ➕' : 'Add New Lead ➕'}</span>
          </button>
          {canExportCsv(activeRole) && (
            <button
              type="button"
              className="btn btn-sm btn-outline"
              onClick={() => handleExportCSV(filteredLeads)}
              disabled={filteredLeads.length === 0}
              title={isAr ? 'تصدير العملاء الظاهرين حالياً (حسب الفلتر والبحث)' : 'Export the current filtered view'}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Download size={15} />
              <span>{isAr ? `تصدير Excel (${filteredLeads.length})` : `Export (${filteredLeads.length})`}</span>
            </button>
          )}
        </div>
      </div>

      {/* Advanced Multi-Filters Toolbar */}
      <div className="crm-table-header" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
        {/* Stage & Workflow Quick Tabs */}
        <div className="table-filters" style={{ flexWrap: 'wrap', gap: '6px' }}>
          <button className={`table-filter-btn ${leadFilter === 'all' ? 'active' : ''}`} onClick={() => setLeadFilter('all')}>
            {isAr ? 'كل العملاء' : 'All Leads'} ({leads.filter(l => !l.isArchived).length})
          </button>
          <button className={`table-filter-btn ${leadFilter === 'new' ? 'active' : ''}`} onClick={() => setLeadFilter('new')}>
            ✨ {isAr ? 'عملاء جدد' : 'New Leads'} ({leads.filter(l => !l.isArchived && (l.status === 'new' || !l.status)).length})
          </button>
          <button className={`table-filter-btn ${leadFilter === 'due' ? 'active' : ''}`} onClick={() => setLeadFilter('due')}>
            ⏰ {isAr ? 'متابعة اليوم' : 'Due Today'}
          </button>
          <button className={`table-filter-btn ${leadFilter === 'qualified' ? 'active' : ''}`} onClick={() => setLeadFilter('qualified')}>
            🎯 {isAr ? 'مؤهلون للشراء' : 'Qualified'}
          </button>
          <button className={`table-filter-btn ${leadFilter === 'buyer' ? 'active' : ''}`} onClick={() => setLeadFilter('buyer')}>
            {isAr ? 'طلبات شراء' : 'Buyers'}
          </button>
          <button className={`table-filter-btn ${leadFilter === 'seller' ? 'active' : ''}`} onClick={() => setLeadFilter('seller')}>
            {isAr ? 'عروض بيع' : 'Sellers'}
          </button>
          <button className={`table-filter-btn ${leadFilter === 'investor' ? 'active' : ''}`} onClick={() => setLeadFilter('investor')}>
            💎 {isAr ? 'مستثمرون VIP' : 'Investors'}
          </button>
          <button className={`table-filter-btn ${leadFilter === 'archived' ? 'active' : ''}`} onClick={() => setLeadFilter('archived')} style={{ color: leadFilter === 'archived' ? 'var(--crm-warn)' : undefined }}>
            📦 {isAr ? 'المؤرشفون' : 'Archived'} ({leads.filter(l => l.isArchived).length})
          </button>
        </div>

        {/* Secondary Filters (Temperature & Area) */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Temperature Filter */}
          <select
            value={temperatureFilter}
            aria-label={isAr ? 'تصفية حسب درجة الاهتمام' : 'Filter by temperature'}
            onChange={(e) => setTemperatureFilter(e.target.value)}
            className="form-input"
            style={{ padding: '6px 10px', fontSize: 'var(--crm-text-xs)', borderRadius: 'var(--radius-pill)', width: 'auto' }}
          >
            <option value="all">🌡️ {isAr ? 'كل درجات الحرارة' : 'All Temperatures'}</option>
            <option value="hot">🔥 {isAr ? 'ساخن جداً' : 'Hot'}</option>
            <option value="warm">⚡ {isAr ? 'دافئ' : 'Warm'}</option>
            <option value="cold">❄️ {isAr ? 'بارد' : 'Cold'}</option>
          </select>

          {/* Area Filter */}
          <select
            value={areaFilter}
            aria-label={isAr ? 'تصفية حسب المنطقة' : 'Filter by area'}
            onChange={(e) => setAreaFilter(e.target.value)}
            className="form-input"
            style={{ padding: '6px 10px', fontSize: 'var(--crm-text-xs)', borderRadius: 'var(--radius-pill)', width: 'auto' }}
          >
            <option value="all">📍 {isAr ? 'كل مناطق سوهاج' : 'All Areas'}</option>
            {SOHAG_AREAS.filter(a => a.id !== 'all').map(a => (
              <option key={a.id} value={a.id}>{isAr ? a.name_ar : a.name_en}</option>
            ))}
          </select>

          {/* Text Search */}
          <input 
            type="text" 
            placeholder={isAr ? 'بحث بالاسم، الهاتف، الوسم، الاغتراب...' : 'Search name/phone/tag...'} 
            className="form-input" 
            style={{ padding: '6px 14px', fontSize: 'var(--crm-text-sm)', width: '220px', borderRadius: 'var(--radius-pill)' }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* ⚡ BULK ACTIONS FLOATING TOOLBAR */}
      {selectedLeadIds.length > 0 && (
        <div style={{
          background: 'rgba(217, 119, 6, 0.12)',
          border: '1px solid var(--crm-accent)',
          borderRadius: 'var(--radius-sm)',
          padding: '10px 16px',
          marginBottom: '14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge" style={{ background: 'var(--crm-accent)', color: 'var(--crm-on-accent)', fontWeight: 'bold' }}>
              {selectedLeadIds.length} {isAr ? 'عميل محدد' : 'selected'}
            </span>
            <span style={{ fontSize: 'var(--crm-text-sm)', color: 'var(--crm-ink)' }}>
              {isAr ? 'إجراءات جماعية فورية:' : 'Bulk Actions:'}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Bulk Assign Agent Dropdown */}
            {canEditLeadsRole(activeRole) && <select
              aria-label={isAr ? 'تعيين مسؤول للعملاء المحددين' : 'Assign selected leads'}
              onChange={(e) => {
                if (e.target.value) handleBulkAssign(e.target.value);
              }}
              className="form-input"
              style={{ padding: '4px 8px', fontSize: 'var(--crm-text-xs)', width: 'auto' }}
              defaultValue=""
            >
              <option value="" disabled>👥 {isAr ? 'تعيين مسؤول جماعي...' : 'Assign Agent...'}</option>
              <DeskOptions role={activeRole} lang={lang} />
            </select>}

            {/* Bulk Export */}
            <button
              type="button"
              className="btn btn-sm btn-outline"
              onClick={handleBulkExportSelected}
              style={{ padding: '4px 10px', fontSize: 'var(--crm-text-xs)' }}
            >
              <Download size={13} />
              <span>{isAr ? 'تصدير المحدد (CSV)' : 'Export CSV'}</span>
            </button>

            {/* Bulk Delete (Super Admin Only) */}
            {isSuperAdmin && (
              <button
                type="button"
                className="btn btn-sm"
                onClick={handleBulkDelete}
                style={{ padding: '4px 10px', fontSize: 'var(--crm-text-xs)', background: 'rgba(239, 68, 68, 0.15)', color: 'var(--rose)', border: '1px solid var(--rose)' }}
              >
                <Trash2 size={13} />
                <span>{isAr ? 'حذف المحدد' : 'Delete'}</span>
              </button>
            )}

            {/* Clear Selection */}
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => setSelectedLeadIds([])}
              style={{ padding: '4px 8px', fontSize: 'var(--crm-text-xs)' }}
            >
              ✕ {isAr ? 'إلغاء التحديد' : 'Clear'}
            </button>
          </div>
        </div>
      )}

      {/* Leads Table */}
      <p className="crm-kbd-hint" aria-hidden="true">
        {isAr ? 'اختصارات: J / K للتنقل · Enter للمعاينة · W واتساب · S الحالة' : 'Shortcuts: J / K move · Enter open · W WhatsApp · S status'}
      </p>
      <div className="crm-table-scroll-wrapper" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>
        <table className="crm-table" data-kbd="leads">
        <thead>
          <tr>
            <th style={{ width: '36px', textAlign: 'center' }}>
              <input
                type="checkbox"
                checked={selectedLeadIds.length > 0 && selectedLeadIds.length === filteredLeads.length}
                aria-label={isAr ? 'تحديد كل العملاء الظاهرين' : 'Select all visible leads'}
                onChange={() => handleToggleSelectAll(filteredLeads)}
                style={{ cursor: 'pointer' }}
              />
            </th>
            <th>{isAr ? 'العميل والملف الشخصي' : 'Client Profile'}</th>
            <th>{isAr ? 'المواصفات والميزانية' : 'Requirements'}</th>
            <th>{isAr ? 'الجدية والحرارة' : 'Score & Temp'}</th>
            <th>{isAr ? 'الحالة' : 'Status'}</th>
            <th>{isAr ? 'المتابعة القادمة' : 'Next Action'}</th>
            <th>{isAr ? 'المسؤول' : 'Agent'}</th>
            <th>{isAr ? 'الإجراءات' : 'Actions'}</th>
          </tr>
        </thead>
        <tbody>
          {filteredLeads.length === 0 ? (
            <tr>
              <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: 'var(--crm-muted)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                  <Inbox size={32} style={{ color: 'var(--crm-accent-text)' }} />
                  <span style={{ fontSize: 'var(--crm-text-base)' }}>{isAr ? 'لم يتم العثور على أي عملاء يطابقون خيارات البحث الحالية.' : 'No leads found.'}</span>
                </div>
              </td>
            </tr>
          ) : (
            filteredLeads.map((l, rowIndex) => {
              const isSelected = selectedLeadIds.includes(l.id);
              const temp = l.temperature || 'hot';

              return (
                <tr
                  key={l.id}
                  data-lead-id={l.id}
                  className={`crm-lead-row ${rowIndex === kbdIndex ? 'is-kbd-active' : ''}`}
                  aria-current={rowIndex === kbdIndex ? 'true' : undefined}
                  style={{ background: isSelected ? 'rgba(217, 119, 6, 0.05)' : undefined }}
                  onClick={(e) => {
                    // Row click opens the quick drawer (not the full-screen profile); controls keep their own behaviour
                    if (e.target.closest('button, a, input, select, label, summary, details')) return;
                    setKbdIndex(rowIndex);
                    setQuickDrawerLead(l);
                  }}
                >
                  {/* Checkbox */}
                  <td style={{ textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelectOne(l.id)}
                      aria-label={isAr ? `تحديد ${l.name || 'العميل'}` : `Select ${l.name || 'lead'}`}
                      style={{ cursor: 'pointer' }}
                    />
                  </td>

                  {/* Client Info + 360 Trigger */}
                  <td data-label={isAr ? 'الاسم والملف' : 'Name & Profile'}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {/* Real button: keyboard reachable, and never an invisible empty link when the name is missing */}
                        <button
                          type="button"
                          className="crm-lead-name-btn"
                          onClick={() => setQuickDrawerLead(l)}
                          title={isAr ? 'فتح المعاينة السريعة وتسجيل المكالمة' : 'Open Quick Drawer'}
                        >
                          {l.name?.trim() || <span className="crm-empty-value">{isAr ? 'عميل بدون اسم' : 'Unnamed lead'}</span>}
                        </button>
                        {l.cityOrExpat && l.cityOrExpat !== 'سوهاج' && (
                          <span style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--cyan)', background: 'var(--cyan-bg)', padding: '1px 5px', borderRadius: '4px' }}>
                            ✈️ {l.cityOrExpat}
                          </span>
                        )}
                      </div>

                      <span style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-muted)' }}><bdi>{l.phone || l.whatsapp || '—'}</bdi></span>

                      {/* Tags Display */}
                      {l.tags && l.tags.length > 0 && (
                        <div style={{ display: 'flex', gap: '4px', marginTop: '3px', flexWrap: 'wrap' }}>
                          {l.tags.slice(0, 2).map((t, i) => (
                            <span key={i} style={{ fontSize: 'var(--crm-text-xs)', background: 'rgba(255,255,255,0.05)', padding: '1px 5px', borderRadius: '3px', color: 'var(--crm-accent-text)' }}>
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Requirements */}
                  <td data-label={isAr ? 'المواصفات' : 'Requirements'}>
                    <div style={{ fontSize: 'var(--crm-text-sm)', maxWidth: '280px', whiteSpace: 'normal' }}>
                      {l.details?.budget && (
                        <strong style={{ color: 'var(--crm-positive)', display: 'block', marginBottom: '2px' }}>
                          <bdi>{formatBudget(l.details.budget, isAr)}</bdi>
                        </strong>
                      )}
                      <span style={{ color: 'var(--crm-muted)' }}>
                        {getLocalizedPropertyType(l.propertyType || l.details?.propertyType || l.type)} • {getLocalizedArea(l.area || l.details?.area || l.details?.district || 'east')}
                      </span>
                    </div>
                  </td>

                  {/* Score & Temperature */}
                  <td data-label={isAr ? 'الجدية والحرارة' : 'Score & Temp'}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className={`lead-score-pill ${l.score >= 85 ? 'score-high' : 'score-medium'}`}>
                        {l.score || 85}%
                      </span>
                      <span title={temp === 'hot' ? 'عميل ساخن للشراء' : temp === 'warm' ? 'عميل دافئ' : 'عميل مستكشف'}>
                        {temp === 'hot' ? '🔥' : temp === 'warm' ? '⚡' : '❄️'}
                      </span>
                    </div>
                  </td>

                  {/* Status */}
                  <td data-label={isAr ? 'الحالة' : 'Status'}>
                    <div className={`crm-status-select-wrap status-pill-${l.status || 'new'}`}>
                      <span className="crm-status-dot" />
                      <select 
                        value={l.status || 'new'} 
                        aria-label={isAr ? `حالة ${l.name || 'العميل'}` : `Status of ${l.name || 'lead'}`}
                        data-status={l.status || 'new'}
                        onChange={(e) => {
                          if (onUpdateLead) onUpdateLead(l.id, { status: e.target.value });
                        }}
                        className="crm-status-select"
                        title={isAr ? 'تغيير مرحلة العميل' : 'Change Status'}
                      >
                        <option value="new">{isAr ? 'طلب جديد' : 'New'}</option>
                        <option value="contacted">{isAr ? 'تم التواصل' : 'Contacted'}</option>
                        <option value="site_visit">{isAr ? 'معاينة مجدولة' : 'Site Visit'}</option>
                        <option value="negotiating">{isAr ? 'قيد التفاوض' : 'Negotiating'}</option>
                        <option value="closing">{isAr ? 'توقيع وحجز' : 'Closing'}</option>
                        <option value="closed">{isAr ? 'صفقة ناجحة' : 'Closed Won'}</option>
                      </select>
                    </div>
                  </td>

                  {/* Next Action / Follow-up */}
                  <td data-label={isAr ? 'المتابعة القادمة' : 'Next Action'}>
                    <div 
                      className="crm-next-action-cell"
                      onClick={() => setQuickDrawerLead(l)}
                      title={isAr ? 'انقر لتحديث المتابعة والمعاينة السريعة' : 'Click to update next action'}
                    >
                      {l.nextActionNote || l.followUp ? (
                        <div className="crm-next-action-pill">
                          <Clock size={12} className="crm-next-action-icon" />
                          <span className="crm-next-action-text" title={formatFollowUp(l.nextActionNote || l.followUp, isAr)}>{formatFollowUp(l.nextActionNote || l.followUp, isAr)}</span>
                        </div>
                      ) : (
                        <span className="crm-next-action-empty">
                          <Plus size={11} /> {isAr ? 'جدولة متابعة' : 'Add action'}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Agent */}
                  <td data-label={isAr ? 'المسؤول' : 'Agent'}>
                    <div className="crm-agent-select-wrap">
                      <div className="crm-agent-avatar-sm">
                        {l.assignedTo && l.assignedTo !== 'Unassigned' ? l.assignedTo.charAt(0) : '—'}
                      </div>
                      <select 
                        value={l.assignedTo || 'Unassigned'} 
                        aria-label={isAr ? `المسؤول عن ${l.name || 'العميل'}` : `Owner of ${l.name || 'lead'}`}
                        onChange={(e) => {
                          if (onUpdateLead) onUpdateLead(l.id, { assignedTo: e.target.value });
                        }}
                        className="crm-agent-select"
                        title={isAr ? 'تعيين مسؤول المبيعات' : 'Assign Agent'}
                      >
                        <DeskOptions role={activeRole} current={l.assignedTo || 'Unassigned'} lang={lang} />
                      </select>
                    </div>
                  </td>

                  {/* Actions */}
                  <td data-label={isAr ? 'الإجراءات' : 'Actions'}>
                    <div className="crm-action-group">
                      {/* Quick Drawer Fast Inspection */}
                      <button
                        type="button"
                        className="crm-btn-quick"
                        onClick={() => setQuickDrawerLead(l)}
                        title={isAr ? 'معاينة سريعة وتسجيل مكالمة' : 'Quick Drawer'}
                      >
                        <Zap size={13} />
                        <span>{isAr ? 'سريع' : 'Quick'}</span>
                      </button>

                      {/* WhatsApp Direct Contact */}
                      <button 
                        type="button"
                        className="crm-icon-btn is-whatsapp" 
                        onClick={() => onWhatsAppClick(l)} 
                        title={isAr ? 'محادثة العميل مباشرة عبر واتساب' : 'WhatsApp'}
                      >
                        <MessageSquare size={13} />
                      </button>

                      {/* 360° Profile */}
                      <button
                        type="button"
                        className="crm-icon-btn"
                        onClick={() => setViewingProfileLead(l)}
                        title={isAr ? 'فتح ملف العميل الشامل 360°' : 'Profile 360°'}
                      >
                        <User size={13} />
                      </button>

                      {/* Edit Modal */}
                      <button
                        type="button"
                        className="crm-icon-btn"
                        onClick={() => handleOpenEditLead(l)}
                        title={isAr ? 'تعديل بيانات العميل' : 'Edit'}
                      >
                        <Edit3 size={13} />
                      </button>

                      {/* Dispatch Lead via WhatsApp */}
                      <button 
                        type="button"
                        className="crm-icon-btn" 
                        onClick={() => onDispatchLeadClick(l)} 
                        title={isAr ? 'إحالة بيانات العميل لمسؤول المبيعات عبر واتساب' : 'Dispatch'}
                      >
                        <Send size={12} />
                      </button>

                      {/* Convert to Property */}
                      {onConvertToProperty && (
                        <button 
                          type="button"
                          className="crm-icon-btn" 
                          onClick={() => onConvertToProperty(l)}
                          title={isAr ? 'تحويل لعقار معروض بالموقع' : 'Convert'}
                        >
                          <Building size={12} />
                        </button>
                      )}

                      {/* Claim Lead */}
                      {!isSuperAdmin && l.assignedTo !== currentRoleObj.agentName && (
                        <button
                          type="button"
                          className="crm-icon-btn"
                          onClick={() => handleClaimLead(l.id)}
                          title={isAr ? `استلام هذا العميل وتعيينه لـ ${currentRoleObj.label_ar}` : 'Claim'}
                        >
                          <UserPlus size={12} />
                        </button>
                      )}

                      {/* Archive Lead Toggle */}
                      <button
                        type="button"
                        className="crm-icon-btn"
                        onClick={() => {
                          const newStatus = l.isArchived ? false : true;
                          if (onUpdateLead) {
                            onUpdateLead(l.id, { isArchived: newStatus });
                          }
                          triggerToast(isAr ? (newStatus ? 'تم نقل العميل للأرشيف 📦' : 'تم استعادة العميل من الأرشيف') : (newStatus ? 'Lead archived' : 'Lead restored'), 'info');
                        }}
                        title={l.isArchived ? (isAr ? 'استعادة من الأرشيف' : 'Unarchive') : (isAr ? 'أرشفة العميل' : 'Archive')}
                      >
                        <Archive size={12} />
                      </button>

                      {/* Delete Lead (Super Admin Only) */}
                      {isSuperAdmin && (
                        <button 
                          type="button"
                          className="crm-icon-btn is-danger" 
                          onClick={() => handleDeleteLeadClick(l.id, l.name)} 
                          title={isAr ? 'حذف العميل نهائياً' : 'Delete'}
                        >
                          <Trash2 size={12} />
                        </button>
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
    </div>

  );
}
