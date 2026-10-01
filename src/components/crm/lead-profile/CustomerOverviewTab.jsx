import { Edit3, Save, Lock } from 'lucide-react';
import { getAreas } from '../../../utils/areasData';
import DeskOptions from '../DeskOptions';
import { canViewLeadPhone, maskPhoneNumber, canEditLead } from '../../../utils/rbacRules';

export default function CustomerOverviewTab({
  AVAILABLE_TAGS,
  formData,
  handleSaveProfile,
  handleToggleTag,
  isAr,
  isEditing,
  lang,
  lead,
  setFormData,
  setIsEditing,
  userRole
}) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h4 style={{ margin: 0, color: 'var(--crm-ink)', fontSize: 'var(--crm-text-md)', fontWeight: 700 }}>
          📊 {isAr ? 'البيانات الشخصية والقدرة المالية' : 'Client Profile & Financial Capability'}
        </h4>
        {canEditLead(userRole, lead) ? (
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setIsEditing(!isEditing)}
            style={{
              fontSize: 'var(--crm-text-xs)',
              fontWeight: 'bold',
              background: isEditing ? 'var(--crm-brand-navy)' : 'var(--crm-subtle)',
              color: isEditing ? 'var(--crm-on-dark)' : 'var(--crm-ink)',
              border: '1px solid var(--crm-line-strong)',
              borderRadius: '8px'
            }}
          >
            <Edit3 size={13} />
            <span>{isEditing ? (isAr ? 'وضع العرض' : 'View Mode') : (isAr ? 'تعديل البيانات' : 'Edit Profile')}</span>
          </button>
        ) : (
          <span className="badge" style={{ fontSize: 'var(--crm-text-xs)', background: 'var(--crm-subtle)', color: 'var(--crm-muted)', border: '1px solid var(--crm-line)' }}>
            <Lock size={11} style={{ display: 'inline', marginInlineEnd: '4px' }} />
            {isAr ? 'للقراءة فقط' : 'Read-only'}
          </span>
        )}
      </div>

      {/* Tags Strip */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-body)', display: 'block', marginBottom: '6px', fontWeight: '600' }}>
          🏷️ {isAr ? 'وسوم وتصنيف العميل:' : 'Client Tags:'}
        </label>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {AVAILABLE_TAGS.map(tagObj => {
            const isSelected = (formData.tags || []).includes(tagObj.name_ar);
            return (
              <button
                key={tagObj.id}
                type="button"
                onClick={() => isEditing && handleToggleTag(tagObj.name_ar)}
                style={{
                  background: isSelected ? 'var(--crm-info-soft)' : 'var(--crm-subtle)',
                  color: isSelected ? 'var(--crm-info)' : 'var(--crm-faint)',
                  border: isSelected ? '1px solid var(--crm-info)' : '1px solid var(--crm-line-strong)',
                  borderRadius: 'var(--radius-pill)',
                  padding: '4px 10px',
                  fontSize: 'var(--crm-text-xs)',
                  fontWeight: isSelected ? 'bold' : 'normal',
                  cursor: isEditing ? 'pointer' : 'default'
                }}
              >
                {tagObj.name_ar}
              </button>
            );
          })}
        </div>
      </div>

      {/* Fields Grid */}
      <form onSubmit={handleSaveProfile}>
        <div className="cms-form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
          {/* Phone */}
          <div className="form-group-item">
            <label>{isAr ? 'رقم الهاتف الأساسي:' : 'Primary Phone:'}</label>
            <input
              type="text"
              disabled={!isEditing || !canViewLeadPhone(userRole)}
              value={canViewLeadPhone(userRole) ? formData.phone : maskPhoneNumber(formData.phone, userRole)}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          {/* WhatsApp */}
          <div className="form-group-item">
            <label>{isAr ? 'رقم الواتساب:' : 'WhatsApp:'}</label>
            <input
              type="text"
              disabled={!isEditing || !canViewLeadPhone(userRole)}
              value={canViewLeadPhone(userRole) ? formData.whatsapp : maskPhoneNumber(formData.whatsapp, userRole)}
              onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
            />
          </div>

          {/* Alt Phone */}
          <div className="form-group-item">
            <label>{isAr ? 'رقم هاتف بديل / قريب:' : 'Alternative Phone:'}</label>
            <input
              type="text"
              disabled={!isEditing || !canViewLeadPhone(userRole)}
              placeholder="010XXXXXXXX"
              value={canViewLeadPhone(userRole) ? formData.altPhone : maskPhoneNumber(formData.altPhone, userRole)}
              onChange={(e) => setFormData({ ...formData, altPhone: e.target.value })}
            />
          </div>

          {/* City or Expat */}
          <div className="form-group-item">
            <label>{isAr ? 'محل الإقامة / دولة الاغتراب:' : 'City / Expat Location:'}</label>
            <input
              type="text"
              disabled={!isEditing}
              placeholder="مثال: سوهاج / السعودية - الرياض"
              value={formData.cityOrExpat}
              onChange={(e) => setFormData({ ...formData, cityOrExpat: e.target.value })}
            />
          </div>

          {/* Budget */}
          <div className="form-group-item">
            <label>{isAr ? 'الميزانية المالية (ج.م):' : 'Budget (EGP):'}</label>
            <input
              type="text"
              disabled={!isEditing}
              value={formData.budget}
              onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
            />
          </div>

          {/* Financing Method */}
          <div className="form-group-item">
            <label>{isAr ? 'طريقة السداد المفضلة:' : 'Payment Preference:'}</label>
            <select
              disabled={!isEditing}
              value={formData.financing}
              onChange={(e) => setFormData({ ...formData, financing: e.target.value })}
            >
              <option value="cash">💵 كاش فوري (Cash)</option>
              <option value="installments">💳 تقسيط على أقساط مريحة</option>
              <option value="mortgage">🏦 تمويل عقاري بنكي</option>
            </select>
          </div>

          {/* Area */}
          <div className="form-group-item">
            <label>{isAr ? 'المنطقة المستهدفة:' : 'Target Area:'}</label>
            <select
              disabled={!isEditing}
              value={formData.area}
              onChange={(e) => setFormData({ ...formData, area: e.target.value })}
            >
              {getAreas().map(a => (
                <option key={a.id} value={a.id}>{isAr ? (a.name_ar || a.label_ar) : (a.name_en || a.label_en)}</option>
              ))}
            </select>
          </div>

          {/* Temperature */}
          <div className="form-group-item">
            <label>{isAr ? 'درجة حرارة العميل:' : 'Lead Temperature:'}</label>
            <select
              disabled={!isEditing}
              value={formData.temperature}
              onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
            >
              <option value="hot">🔥 ساخن جداً (Hot - شراء خلال 7 أيام)</option>
              <option value="warm">⚡ دافئ (Warm - شراء خلال شهر)</option>
              <option value="cold">❄️ بارد / مستكشف (Cold)</option>
            </select>
          </div>

          {/* Assigned Agent */}
          <div className="form-group-item">
            <label>{isAr ? 'المستشار المسؤول:' : 'Assigned Agent:'}</label>
            <select
              disabled={!isEditing}
              value={formData.assignedTo}
              onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
            >
              <DeskOptions role={userRole} current={formData.assignedTo} lang={lang} />
            </select>
          </div>
        </div>

        {isEditing && (
          <div className="cms-modal-actions" style={{ marginTop: '20px' }}>
            <button type="submit" className="btn btn-primary" style={{ background: 'var(--gradient-gold)' }}>
              <Save size={16} />
              <span>{isAr ? 'حفظ كافة التعديلات' : 'Save Changes'}</span>
            </button>
          </div>
        )}
      </form>
    </div>

  );
}
