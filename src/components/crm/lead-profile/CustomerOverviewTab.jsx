import { Edit3, Save, Lock } from 'lucide-react';
import { getAreas } from '../../../utils/areasData';
import { formArea } from '../../../utils/areaLookup';
import DeskOptions from '../DeskOptions';
import { canViewLeadPhone, maskPhoneNumber, canEditLead } from '../../../utils/rbacRules';
import AreaOptions from '../../common/AreaOptions';

export default function CustomerOverviewTab({
  people = [],
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
      <div className="cp-ov__head">
        <h4 className="cp__h">{isAr ? 'البيانات والقدرة المالية' : 'Client details & budget'}</h4>
        {canEditLead(userRole, lead) ? (
          <button type="button" className={`cp__btn ${isEditing ? 'cp__btn--primary' : ''}`} onClick={() => setIsEditing(!isEditing)}>
            <Edit3 size={14} aria-hidden="true" />
            <span>{isEditing ? (isAr ? 'وضع العرض' : 'View Mode') : (isAr ? 'تعديل' : 'Edit')}</span>
          </button>
        ) : (
          <span className="cp__locked"><Lock size={12} aria-hidden="true" />{isAr ? 'للقراءة فقط' : 'Read-only'}</span>
        )}
      </div>

      <div className="cp-ov__tags" aria-label={isAr ? 'وسوم العميل' : 'Client tags'}>
        {AVAILABLE_TAGS.map((tagObj) => {
          const isSelected = (formData.tags || []).includes(tagObj.name_ar);
          return (
            <button
              key={tagObj.id}
              type="button"
              aria-pressed={isSelected}
              className={`cp-ov__tag ${isSelected ? 'is-on' : ''} ${isEditing ? 'is-edit' : ''}`}
              onClick={() => isEditing && handleToggleTag(tagObj.name_ar)}
            >
              {tagObj.name_ar}
            </button>
          );
        })}
      </div>

      {/* Fields Grid */}
      <form onSubmit={handleSaveProfile}>
        <div className="cms-form-grid cp-ov__grid">
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
              <option value="cash">كاش فوري (Cash)</option>
              <option value="installments">تقسيط على أقساط مريحة</option>
              <option value="mortgage">تمويل عقاري بنكي</option>
            </select>
          </div>

          {/* Area */}
          <div className="form-group-item">
            <label>{isAr ? 'المنطقة المستهدفة:' : 'Target Area:'}</label>
            <select
              disabled={!isEditing}
              value={formArea(formData.area, getAreas(), { allowAll: true })}
              onChange={(e) => setFormData({ ...formData, area: e.target.value })}
            >
              <option value="" disabled>{formData.area && formArea(formData.area, getAreas(), { allowAll: true }) === '' ? (isAr ? 'المنطقة المحفوظة اتمسحت، اختار منطقة' : 'Saved area was deleted, choose one') : (isAr ? 'اختار المنطقة' : 'Choose an area')}</option>
              <AreaOptions areas={getAreas()} isAr={isAr} includeAll={getAreas().some((a) => a?.id === 'all')} />
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
              <option value="">غير محدد</option>
              <option value="hot">ساخن جداً (Hot - شراء خلال 7 أيام)</option>
              <option value="warm">دافئ (Warm - شراء خلال شهر)</option>
              <option value="cold">بارد / مستكشف (Cold)</option>
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
              <DeskOptions role={userRole} current={formData.assignedTo} lang={lang} people={people} />
            </select>
          </div>
        </div>

        {isEditing && (
          <div className="cp-ov__save">
            <button type="submit" className="btn btn-primary">
              <Save size={16} />
              <span>{isAr ? 'حفظ كافة التعديلات' : 'Save Changes'}</span>
            </button>
          </div>
        )}
      </form>
    </div>

  );
}
