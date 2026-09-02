import { useState } from 'react';
import { 
  X, 
  FileText, 
  Download, 
  Send, 
  CheckCircle2, 
  Building2, 
  User, 
  DollarSign, 
  Sparkles,
  ShieldCheck,
  Calendar
} from 'lucide-react';
import { generateReservationContractPdf } from '../../utils/contractPdfGenerator';
import { trackEvent } from '../../utils/visitorTracker';

/**
 * ContractStudioModal Component
 * Enterprise Real Estate Reservation Agreement & Contract Generator for CRM admins.
 */
export default function ContractStudioModal({
  isOpen,
  onClose,
  leads = [],
  properties = [],
  lang = 'ar',
  triggerToast = () => {}
}) {
  if (!isOpen) return null;
  const isAr = lang === 'ar';

  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [selectedPropertyId, setSelectedPropertyId] = useState('');

  const [formData, setFormData] = useState({
    buyerName: 'محمد أحمد علي',
    buyerPhone: '+20 101 234 5678',
    buyerNationalId: '29001012600000',
    buyerAddress: 'سوهاج - شارع الجمهورية',
    propertyTitle: 'شقة فاخرة ناصية بحرية',
    propertyLocation: 'سوهاج الجديدة - الحي الأول',
    propertySize: 165,
    propertyPrice: 3500000,
    depositAmount: 50000,
    paymentMethod: 'InstaPay (إنستاباي)',
    transactionRef: `REF-OL-${Math.floor(100000 + Math.random() * 900000)}`
  });

  // Auto-fill from selected Lead
  const handleLeadSelect = (e) => {
    const leadId = e.target.value;
    setSelectedLeadId(leadId);
    if (!leadId) return;

    const lead = leads.find((l) => l.id === leadId);
    if (lead) {
      setFormData((prev) => ({
        ...prev,
        buyerName: lead.name || prev.buyerName,
        buyerPhone: lead.phone || prev.buyerPhone,
        buyerNationalId: lead.nationalId || prev.buyerNationalId
      }));
    }
  };

  // Auto-fill from selected Property
  const handlePropertySelect = (e) => {
    const propId = e.target.value;
    setSelectedPropertyId(propId);
    if (!propId) return;

    const prop = properties.find((p) => p.id === propId);
    if (prop) {
      setFormData((prev) => ({
        ...prev,
        propertyTitle: isAr ? prop.title_ar : prop.title_en,
        propertyLocation: isAr ? prop.locationName_ar : prop.locationName_en,
        propertySize: prop.size || prev.propertySize,
        propertyPrice: prop.price || prev.propertyPrice,
        depositAmount: prop.downPayment ? Math.min(50000, Math.round(prop.downPayment * 0.1)) : 50000
      }));
    }
  };

  const handleGeneratePdf = () => {
    try {
      generateReservationContractPdf({
        buyerName: formData.buyerName,
        buyerPhone: formData.buyerPhone,
        buyerNationalId: formData.buyerNationalId,
        buyerAddress: formData.buyerAddress,
        property: {
          id: selectedPropertyId || 'PROP-CUSTOM',
          title_ar: formData.propertyTitle,
          title_en: formData.propertyTitle,
          locationName_ar: formData.propertyLocation,
          locationName_en: formData.propertyLocation,
          size: formData.propertySize,
          price: formData.propertyPrice,
          downPayment: Math.round(formData.propertyPrice * 0.2),
          monthlyInstallment: Math.round((formData.propertyPrice * 0.8) / 60)
        },
        depositAmount: formData.depositAmount,
        paymentMethod: formData.paymentMethod,
        transactionRef: formData.transactionRef
      });

      triggerToast(isAr ? 'تم إنشاء وتحميل عقد الحجز المعتمد بنجاح! 📄' : 'Reservation agreement PDF generated!', 'success');
      trackEvent('crm_contract_pdf_generated', { buyerName: formData.buyerName, price: formData.propertyPrice });
    } catch (err) {
      console.error(err);
      triggerToast(isAr ? 'حدث خطأ أثناء إنشاء العقد' : 'Failed to generate agreement', 'error');
    }
  };

  const whatsappText = encodeURIComponent(
    `🏢 شركة 1Line للاستثمار والتطوير العقاري - سوهاج\n` +
    `مرحباً أستاذ / ${formData.buyerName}\n` +
    `تم إصدار استمارة وعقد حجز وحدتكم العقارية وسند الاستلام المبدئي:\n` +
    `• الوحدة: ${formData.propertyTitle}\n` +
    `• الموقع: ${formData.propertyLocation}\n` +
    `• إجمالي الثمن: ${formData.propertyPrice.toLocaleString()} ج.م\n` +
    `• مبلغ جدية الحجز المؤكد: ${formData.depositAmount.toLocaleString()} ج.م (${formData.paymentMethod})\n` +
    `• الرقم المرجعي: ${formData.transactionRef}\n` +
    `📞 للاستفسار والتواصل مع الإدارة القانونية: +20 101 234 5678`
  );

  return (
    <div className="track-modal-backdrop" onClick={onClose}>
      <div 
        className="deposit-modal-card" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '640px', width: '94%' }}
      >
        <button type="button" className="modal-close-btn" onClick={onClose}>
          <X size={20} />
        </button>

        {/* Modal Header */}
        <div className="deposit-modal-header">
          <div className="deposit-icon-glow" style={{ background: 'var(--gradient-gold)' }}>
            <FileText size={24} style={{ color: '#092347' }} />
          </div>
          <div>
            <h3>{isAr ? 'استوديو إصدار عقود الحجز والاتفاقيات الرسمية' : 'Official Reservation Contract Studio'}</h3>
            <p>{isAr ? 'توليد عقود حجز وسندات استلام مبدئية معتمدة بصيغة PDF فورياً' : 'Generate certified bilingual property reservation agreements'}</p>
          </div>
        </div>

        <div className="deposit-modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {/* Fast Auto-Fill Selectors Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div className="form-group-item">
              <label style={{ fontSize: '0.8rem', fontWeight: '800' }}>{isAr ? 'اختر العميل (تعبئة تلقائية)' : 'Select Lead'}</label>
              <select 
                value={selectedLeadId} 
                onChange={handleLeadSelect}
                style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: '#fff' }}
              >
                <option value="">{isAr ? '-- اختر عميل من الـ CRM --' : '-- Choose from CRM --'}</option>
                {leads.map((l) => (
                  <option key={l.id} value={l.id}>{l.name} ({l.phone})</option>
                ))}
              </select>
            </div>

            <div className="form-group-item">
              <label style={{ fontSize: '0.8rem', fontWeight: '800' }}>{isAr ? 'اختر العقار (تعبئة تلقائية)' : 'Select Property'}</label>
              <select 
                value={selectedPropertyId} 
                onChange={handlePropertySelect}
                style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: '#fff' }}
              >
                <option value="">{isAr ? '-- اختر عقار من الكتالوج --' : '-- Choose Property --'}</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>{isAr ? p.title_ar : p.title_en} ({p.price.toLocaleString()} ج.م)</option>
                ))}
              </select>
            </div>
          </div>

          {/* Detailed Form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Buyer Details */}
            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
              <strong style={{ fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', color: 'var(--primary)' }}>
                <User size={14} />
                <span>{isAr ? 'بيانات المشتري والحاجز' : 'Buyer Information'}</span>
              </strong>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <input
                  type="text"
                  placeholder={isAr ? 'اسم العميل بالكامل' : 'Full Name'}
                  value={formData.buyerName}
                  onChange={(e) => setFormData({ ...formData, buyerName: e.target.value })}
                  style={{ padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}
                />

                <input
                  type="text"
                  placeholder={isAr ? 'رقم الهاتف / الواتساب' : 'Phone'}
                  value={formData.buyerPhone}
                  onChange={(e) => setFormData({ ...formData, buyerPhone: e.target.value })}
                  style={{ padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}
                />

                <input
                  type="text"
                  placeholder={isAr ? 'الرقم القومي (14 رقم)' : 'National ID'}
                  value={formData.buyerNationalId}
                  onChange={(e) => setFormData({ ...formData, buyerNationalId: e.target.value })}
                  style={{ padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}
                />

                <input
                  type="text"
                  placeholder={isAr ? 'محل الإقامة / العنوان' : 'Address'}
                  value={formData.buyerAddress}
                  onChange={(e) => setFormData({ ...formData, buyerAddress: e.target.value })}
                  style={{ padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}
                />
              </div>
            </div>

            {/* Property & Financial Details */}
            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
              <strong style={{ fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', color: 'var(--primary)' }}>
                <Building2 size={14} />
                <span>{isAr ? 'بيانات الوحدة والماليات' : 'Property & Pricing'}</span>
              </strong>

              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '8px', marginBottom: '8px' }}>
                <input
                  type="text"
                  placeholder={isAr ? 'اسم ومواصفات الوحدة' : 'Property Title'}
                  value={formData.propertyTitle}
                  onChange={(e) => setFormData({ ...formData, propertyTitle: e.target.value })}
                  style={{ padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}
                />

                <input
                  type="text"
                  placeholder={isAr ? 'المنطقة والمدينة' : 'Location'}
                  value={formData.propertyLocation}
                  onChange={(e) => setFormData({ ...formData, propertyLocation: e.target.value })}
                  style={{ padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{isAr ? 'إجمالي الثمن (ج.م)' : 'Total Price'}</label>
                  <input
                    type="number"
                    value={formData.propertyPrice}
                    onChange={(e) => setFormData({ ...formData, propertyPrice: parseInt(e.target.value) || 0 })}
                    style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{isAr ? 'مبلغ جدية الحجز (ج.م)' : 'Deposit (EGP)'}</label>
                  <input
                    type="number"
                    value={formData.depositAmount}
                    onChange={(e) => setFormData({ ...formData, depositAmount: parseInt(e.target.value) || 0 })}
                    style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{isAr ? 'طريقة الدفع' : 'Payment Method'}</label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: '#fff' }}
                  >
                    <option value="InstaPay (إنستاباي)">InstaPay (إنستاباي)</option>
                    <option value="Vodafone Cash (فودافون كاش)">Vodafone Cash (فودافون كاش)</option>
                    <option value="تحويل بنكي رسمي">تحويل بنكي رسمي</option>
                    <option value="سداد نقدي بمقر الشركة">سداد نقدي بمقر الشركة</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '18px' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleGeneratePdf}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <Download size={16} />
              <span>{isAr ? 'تحميل العقد المعتمد (PDF)' : 'Download Agreement (PDF)'}</span>
            </button>

            <a
              href={`https://wa.me/${formData.buyerPhone.replace(/[^0-9]/g, '')}?text=${whatsappText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'var(--emerald)', color: '#fff' }}
            >
              <Send size={15} />
              <span>{isAr ? 'إرسال بيانات العقد واتساب' : 'Send on WhatsApp'}</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
