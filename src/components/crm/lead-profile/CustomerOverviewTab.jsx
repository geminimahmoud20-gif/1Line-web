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
  isSeller = false,
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
        <h4 className="cp__h">{isSeller ? (isAr ? 'بيانات المالك والعقار' : 'Owner & property details') : (isAr ? 'البيانات والقدرة المالية' : 'Client details & budget')}</h4>
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
          {/* Client type: buyer, seller, broker, investor */}
          <div className="form-group-item">
            <label>{isAr ? 'نوع العميل:' : 'Client type:'}</label>
            <select
              disabled={!isEditing}
              value={formData.type || 'buyer'}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            >
              <option value="buyer">{isAr ? 'مشتري' : 'Buyer'}</option>
              <option value="seller">{isAr ? 'بائع' : 'Seller'}</option>
              <option value="broker">{isAr ? 'وسيط' : 'Broker'}</option>
              <option value="investor">{isAr ? 'مستثمر' : 'Investor'}</option>
            </select>
          </div>

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
            <label>{isSeller ? (isAr ? 'السعر المطلوب للعقار (ج.م):' : 'Asking price (EGP):') : (isAr ? 'الميزانية المالية (ج.م):' : 'Budget (EGP):')}</label>
            <input
              type="text"
              disabled={!isEditing}
              value={formData.budget}
              onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
            />
            {isSeller && Number(String(formData.budget).replace(/[^0-9.]/g, '')) > 0 && Number(String(formData.budget).replace(/[^0-9.]/g, '')) < 100000 && (
              <small style={{ color: 'var(--ui-warning, #d97706)', display: 'block', marginTop: '4px', fontSize: '11px' }}>
                ⚠️ {isAr ? 'تنبيه: المبلغ أقل من 100 ألف، هل هذا سعر المتر أم إجمالي قيمة العقار؟' : 'Warning: Amount < 100k, is this per m² or total price?'}
              </small>
            )}
          </div>

          {/* Financing Method */}
          <div className="form-group-item">
            <label>{isSeller ? (isAr ? 'طريقة السداد اللي يقبلها من المشتري:' : 'Payment he accepts:') : (isAr ? 'طريقة السداد المفضلة:' : 'Payment Preference:')}</label>
            <select
              disabled={!isEditing}
              value={formData.financing}
              onChange={(e) => setFormData({ ...formData, financing: e.target.value })}
            >
              <option value="cash">{isSeller ? 'كاش فقط' : 'كاش فوري (Cash)'}</option>
              <option value="installments">{isSeller ? 'يقبل التقسيط' : 'تقسيط على أقساط مريحة'}</option>
              <option value="mortgage">{isSeller ? 'يقبل التمويل العقاري' : 'تمويل عقاري بنكي'}</option>
            </select>
          </div>

          {/* Area */}
          <div className="form-group-item">
            <label>{isSeller ? (isAr ? 'منطقة العقار:' : 'Property area:') : (isAr ? 'المنطقة المستهدفة:' : 'Target Area:')}</label>
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
            <label>{isSeller ? (isAr ? 'درجة جدية المالك:' : 'Owner seriousness:') : (isAr ? 'درجة حرارة العميل:' : 'Lead Temperature:')}</label>
            <select
              disabled={!isEditing}
              value={formData.temperature}
              onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
            >
              <option value="">غير محدد</option>
              <option value="hot">{isSeller ? 'ساخن جداً (عايز يبيع خلال 7 أيام)' : 'ساخن جداً (Hot - شراء خلال 7 أيام)'}</option>
              <option value="warm">{isSeller ? 'دافئ (عايز يبيع خلال شهر)' : 'دافئ (Warm - شراء خلال شهر)'}</option>
              <option value="cold">{isSeller ? 'بارد / بيسأل بس' : 'بارد / مستكشف (Cold)'}</option>
            </select>
          </div>

          {/* Property Type */}
          <div className="form-group-item">
            <label>{isSeller ? (isAr ? 'نوع العقار المعروض:' : 'Offered Property Type:') : (isAr ? 'نوع العقار المطلوب:' : 'Desired Property Type:')}</label>
            <select
              disabled={!isEditing}
              value={formData.propertyType || 'apartment'}
              onChange={(e) => setFormData({ ...formData, propertyType: e.target.value })}
            >
              <option value="apartment">{isAr ? 'شقة سكنية / دوبلكس' : 'Apartment / Duplex'}</option>
              <option value="villa">{isAr ? 'فيلا / تاون هاوس' : 'Villa / Townhouse'}</option>
              <option value="commercial">{isAr ? 'محل تجاري' : 'Commercial Shop'}</option>
              <option value="office">{isAr ? 'مكتب إداري / عيادة' : 'Office / Clinic'}</option>
              <option value="land">{isAr ? 'قطعة أرض' : 'Land Plot'}</option>
              <option value="building">{isAr ? 'عمارة / مبنى كامل' : 'Full Building'}</option>
              <option value="industrial_land">{isAr ? 'أرض صناعية' : 'Industrial Land'}</option>
              <option value="agri_land">{isAr ? 'أرض زراعية / مزرعة' : 'Agricultural Land'}</option>
              <option value="factory">{isAr ? 'مصنع / ورشة' : 'Factory / Workshop'}</option>
              <option value="warehouse">{isAr ? 'مخزن / مستودع' : 'Warehouse'}</option>
            </select>
          </div>

          {/* Size (Seller) or Down Payment (Buyer) */}
          {isSeller ? (
            <div className="form-group-item">
              <label>{isAr ? 'المساحة (م²):' : 'Size (sqm):'}</label>
              <input
                type="number"
                disabled={!isEditing}
                placeholder="150"
                value={formData.size || ''}
                onChange={(e) => setFormData({ ...formData, size: e.target.value })}
              />
            </div>
          ) : (
            <div className="form-group-item">
              <label>{isAr ? 'المقدم المتاح (ج.م):' : 'Available Down Payment (EGP):'}</label>
              <input
                type="text"
                disabled={!isEditing}
                placeholder="مثال: 500,000"
                value={formData.downPayment || ''}
                onChange={(e) => setFormData({ ...formData, downPayment: e.target.value })}
              />
            </div>
          )}

          {/* Floor & Rooms (Seller) or Monthly Installment & Purpose (Buyer) */}
          {isSeller ? (
            <>
              <div className="form-group-item">
                <label>{isAr ? 'الدور:' : 'Floor:'}</label>
                <input
                  type="text"
                  disabled={!isEditing}
                  placeholder="مثال: أرضي / الدور 3"
                  value={formData.floor || ''}
                  onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                />
              </div>
              <div className="form-group-item">
                <label>{isAr ? 'عدد الغرف:' : 'Rooms Count:'}</label>
                <input
                  type="text"
                  disabled={!isEditing}
                  placeholder="مثال: 3 غرف ورسيبشن"
                  value={formData.rooms || ''}
                  onChange={(e) => setFormData({ ...formData, rooms: e.target.value })}
                />
              </div>
            </>
          ) : (
            <>
              <div className="form-group-item">
                <label>{isAr ? 'القسط الشهري الأقصى (ج.م):' : 'Max Monthly Installment:'}</label>
                <input
                  type="text"
                  disabled={!isEditing}
                  placeholder="مثال: 20,000"
                  value={formData.monthlyInstallment || ''}
                  onChange={(e) => setFormData({ ...formData, monthlyInstallment: e.target.value })}
                />
              </div>
              <div className="form-group-item">
                <label>{isAr ? 'الغرض من الشراء:' : 'Buying Purpose:'}</label>
                <select
                  disabled={!isEditing}
                  value={formData.purpose || 'live'}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                >
                  <option value="live">{isAr ? 'سكن عائلي أساسي' : 'Primary Residence'}</option>
                  <option value="invest">{isAr ? 'استثمار وتأجير' : 'Investment & Rental'}</option>
                  <option value="commercial">{isAr ? 'تشغيل تجاري أو مقر عمل' : 'Business / Commercial'}</option>
                </select>
              </div>
            </>
          )}

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
