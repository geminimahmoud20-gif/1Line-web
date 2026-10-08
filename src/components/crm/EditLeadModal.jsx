import { Save, X } from 'lucide-react';
import { SOHAG_AREAS, PROPERTY_TYPES } from '../../data/propertiesData';

export default function EditLeadModal({
  handleSaveLeadEdits,
  isAr,
  leadFormData,
  setEditingLead,
  setLeadFormData
}) {
  return (
    <div className="track-modal-backdrop" onClick={() => setEditingLead(null)}>
      <div className="property-form-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
        <div className="modal-form-header">
          <h3>{isAr ? 'تعديل وتصحيح بيانات العميل' : 'Edit Lead Details'}</h3>
          <button type="button" className="drawer-close-btn" onClick={() => setEditingLead(null)} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSaveLeadEdits} className="property-cms-form">
          <div className="cms-form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group-item">
              <label>{isAr ? 'اسم العميل *' : 'Full Name *'}</label>
              <input
                type="text"
                value={leadFormData.name}
                onChange={(e) => setLeadFormData({ ...leadFormData, name: e.target.value })}
                required
              />
            </div>

            <div className="form-group-item">
              <label>{isAr ? 'رقم الهاتف الأساسي *' : 'Phone *'}</label>
              <input
                type="text"
                value={leadFormData.phone}
                onChange={(e) => setLeadFormData({ ...leadFormData, phone: e.target.value })}
                required
              />
            </div>

            <div className="form-group-item">
              <label>{isAr ? 'رقم الواتساب * (إلزامي)' : 'WhatsApp * (Required)'}</label>
              <input
                type="text"
                value={leadFormData.whatsapp}
                onChange={(e) => setLeadFormData({ ...leadFormData, whatsapp: e.target.value })}
                required
              />
            </div>

            <div className="form-group-item">
              <label>{isAr ? 'نوع الطلب' : 'Lead Type'}</label>
              <select
                value={leadFormData.type}
                aria-label={isAr ? 'نوع الطلب' : 'Request type'}
                onChange={(e) => setLeadFormData({ ...leadFormData, type: e.target.value })}
              >
                <option value="buyer">{isAr ? 'طلب شراء' : 'Buyer'}</option>
                <option value="seller">{isAr ? 'عرض بيع' : 'Seller'}</option>
                <option value="broker">{isAr ? 'وسيط عقاري' : 'Broker'}</option>
                <option value="investor">{isAr ? 'مستثمر' : 'Investor'}</option>
                <option value="request">{isAr ? 'طلب مخصص' : 'Special Request'}</option>
              </select>
            </div>

            <div className="form-group-item">
              <label>{isAr ? 'الموقع / المنطقة بسوهاج * (إلزامي)' : 'Target Area in Sohag * (Required)'}</label>
              <select
                value={leadFormData.area}
                aria-label={isAr ? 'المنطقة' : 'Area'}
                onChange={(e) => setLeadFormData({ ...leadFormData, area: e.target.value })}
                required
              >
                {SOHAG_AREAS.filter(a => a.id !== 'all').map(a => (
                  <option key={a.id} value={a.id}>{isAr ? a.name_ar : a.name_en}</option>
                ))}
              </select>
            </div>

            <div className="form-group-item">
              <label>{isAr ? 'العقارات المهتم بها / نوع العقار * (إلزامي)' : 'Interested Property Type * (Required)'}</label>
              <select
                value={leadFormData.propertyType}
                aria-label={isAr ? 'نوع العقار' : 'Property type'}
                onChange={(e) => setLeadFormData({ ...leadFormData, propertyType: e.target.value })}
                required
              >
                {PROPERTY_TYPES.filter(t => t.id !== 'all').map(t => (
                  <option key={t.id} value={t.id}>{isAr ? t.name_ar : t.name_en}</option>
                ))}
              </select>
            </div>

            <div className="form-group-item">
              <label>{isAr ? 'الميزانية / السعر المتوقع (ج.م)' : 'Budget / Price (EGP)'}</label>
              <input
                type="text"
                value={leadFormData.budget}
                onChange={(e) => setLeadFormData({ ...leadFormData, budget: e.target.value })}
                placeholder="مثال: 3,000,000"
              />
            </div>

            <div className="form-group-item">
              <label>{isAr ? 'حالة المتابعة' : 'Status'}</label>
              <select
                value={leadFormData.status}
                aria-label={isAr ? 'الحالة' : 'Status'}
                onChange={(e) => setLeadFormData({ ...leadFormData, status: e.target.value })}
              >
                <option value="new">{isAr ? 'جديد' : 'New'}</option>
                <option value="contacted">{isAr ? 'تم التواصل' : 'Contacted'}</option>
                <option value="site_visit">{isAr ? 'معاينة مجدولة' : 'Site visit'}</option>
                <option value="negotiating">{isAr ? 'قيد التفاوض' : 'Negotiating'}</option>
                <option value="closing">{isAr ? 'توقيع وحجز' : 'Closing'}</option>
                <option value="closed">{isAr ? 'صفقة ناجحة' : 'Closed won'}</option>
              </select>
            </div>

            <div className="form-group-item">
              <label>{isAr ? 'البريد الإلكتروني' : 'Email Address'}</label>
              <input
                type="email"
                value={leadFormData.email}
                onChange={(e) => setLeadFormData({ ...leadFormData, email: e.target.value })}
                placeholder="client@example.com"
                style={{ direction: 'ltr', textAlign: 'left' }}
              />
            </div>

            <div className="form-group-item">
              <label>{isAr ? 'مصدر العميل' : 'Lead Source'}</label>
              <input
                type="text"
                value={leadFormData.source}
                onChange={(e) => setLeadFormData({ ...leadFormData, source: e.target.value })}
                placeholder="Facebook, Direct, WhatsApp..."
              />
            </div>

            <div className="form-group-item">
              <label>{isAr ? 'درجة الاهتمام' : 'Temperature'}</label>
              <select
                value={leadFormData.temperature}
                aria-label={isAr ? 'درجة الاهتمام' : 'Temperature'}
                onChange={(e) => setLeadFormData({ ...leadFormData, temperature: e.target.value })}
              >
                <option value="">{isAr ? 'غير محدد' : 'Not set'}</option>
                <option value="hot">🔥 {isAr ? 'ساخن' : 'Hot'}</option>
                <option value="warm">⚡ {isAr ? 'متوسط' : 'Warm'}</option>
                <option value="cold">❄️ {isAr ? 'بارد' : 'Cold'}</option>
              </select>
            </div>

            <div className="form-group-item">
              <label>{isAr ? 'موعد المتابعة القادم' : 'Next Follow-Up Date & Time'}</label>
              <input
                type="datetime-local"
                value={leadFormData.nextFollowUpAt}
                onChange={(e) => setLeadFormData({ ...leadFormData, nextFollowUpAt: e.target.value })}
                style={{ direction: 'ltr' }}
              />
            </div>

            <div className="form-group-item">
              <label>{isAr ? 'المستشار المسؤول' : 'Assigned Agent'}</label>
              <select
                value={leadFormData.assignedTo}
                aria-label={isAr ? 'المسؤول' : 'Owner'}
                onChange={(e) => setLeadFormData({ ...leadFormData, assignedTo: e.target.value })}
              >
                <option value="Dr. Mahmoud Elbaz">Dr. Mahmoud Elbaz</option>
                <option value="Sales Team A">Sales Team A</option>
                <option value="Sales Team B">Sales Team B</option>
                <option value="Unassigned">Unassigned</option>
              </select>
            </div>
          </div>

          <div className="form-group-item" style={{ marginTop: '12px' }}>
            <label>{isAr ? 'ملاحظات العقد والاتصال' : 'Notes'}</label>
            <textarea
              rows="3"
              className="form-input"
              style={{ width: '100%', resize: 'vertical' }}
              value={leadFormData.notes}
              onChange={(e) => setLeadFormData({ ...leadFormData, notes: e.target.value })}
              placeholder="سجل نتائج المكالمات وملاحظات العميل هنا..."
            />
          </div>

          <div className="cms-modal-actions" style={{ marginTop: '20px' }}>
            <button type="button" className="btn btn-outline" onClick={() => setEditingLead(null)}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button type="submit" className="btn btn-primary">
              <Save size={16} />
              <span>{isAr ? 'حفظ التعديلات' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>

  );
}
