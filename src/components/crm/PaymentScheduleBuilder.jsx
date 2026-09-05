import { useState } from 'react';
import { 
  Calculator, 
  FileText, 
  Printer, 
  Calendar, 
  DollarSign, 
  QrCode, 
  ShieldCheck 
} from 'lucide-react';

export default function PaymentScheduleBuilder({
  properties = [],
  leads = [],
  lang = 'ar'
}) {
  const isAr = lang === 'ar';

  const [selectedPropertyId, setSelectedPropertyId] = useState(properties[0]?.id || '');
  const [selectedLeadId, setSelectedLeadId] = useState(leads[0]?.id || '');
  
  // Custom Calculation Parameters
  const [customPrice, setCustomPrice] = useState(3500000);
  const [downPaymentPercent, setDownPaymentPercent] = useState(20);
  const [years, setYears] = useState(5);
  const [frequency, setFrequency] = useState('quarterly'); // 'monthly' | 'quarterly' | 'semi_annual' | 'annual'
  const [maintenancePercent, setMaintenancePercent] = useState(7);

  // E-Receipt Modal State
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptDepositAmount, setReceiptDepositAmount] = useState(50000);
  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash' | 'bank_transfer' | 'cheque' | 'vodafone_cash'
  const [receiptSerial] = useState(() => `ONE-REC-2026-${Math.floor(1000 + Math.random() * 9000)}`);

  const selectedProp = properties.find(p => p.id === selectedPropertyId) || properties[0] || {};
  const selectedLead = leads.find(l => l.id === selectedLeadId) || leads[0] || {};

  // Financial Calculations
  const totalPrice = customPrice || selectedProp.price || 3500000;
  const downPaymentAmount = Math.round((totalPrice * downPaymentPercent) / 100);
  const maintenanceAmount = Math.round((totalPrice * maintenancePercent) / 100);
  const remainingForInstallments = totalPrice - downPaymentAmount;

  const installmentsCount = 
    frequency === 'monthly' ? years * 12 :
    frequency === 'quarterly' ? years * 4 :
    frequency === 'semi_annual' ? years * 2 : years;

  const installmentAmount = Math.round(remainingForInstallments / installmentsCount);

  // Generate Table of Installment Dates
  const generateScheduleRows = () => {
    const rows = [];
    const startDate = new Date();
    
    // 1. Down Payment
    rows.push({
      number: 1,
      type: isAr ? 'دفعة التعاقد والمقدم' : 'Contract Down Payment',
      date: startDate.toLocaleDateString(isAr ? 'ar-EG' : 'en-US'),
      amount: downPaymentAmount,
      status: isAr ? 'مستحق فوراً' : 'Due Now'
    });

    // 2. Installments
    let stepMonths = 
      frequency === 'monthly' ? 1 :
      frequency === 'quarterly' ? 3 :
      frequency === 'semi_annual' ? 6 : 12;

    for (let i = 1; i <= Math.min(installmentsCount, 12); i++) {
      const installDate = new Date();
      installDate.setMonth(installDate.getMonth() + (i * stepMonths));
      
      rows.push({
        number: i + 1,
        type: isAr ? `القسط رقم (${i}) - ${frequency === 'quarterly' ? 'ربع سنوي' : 'شهري'}` : `Installment #${i}`,
        date: installDate.toLocaleDateString(isAr ? 'ar-EG' : 'en-US'),
        amount: installmentAmount,
        status: isAr ? 'مجدول' : 'Scheduled'
      });
    }

    return rows;
  };

  const scheduleRows = generateScheduleRows();

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="payment-schedule-builder-card">
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <Calculator size={22} className="text-gold" />
            {isAr ? 'مُولّد جداول السداد وإيصالات الحجز الإلكترونية' : 'Financial Schedule & E-Reservation Hub'}
          </h3>
          <p className="section-subtitle" style={{ margin: '4px 0 0' }}>
            {isAr ? 'هندسة خطط الأقساط المخصصة، حساب دفعات الصيانة والاستلام، وطباعة إيصالات الحجز الرسمية' : 'Build custom installment plans and generate official verified reservation receipts'}
          </p>
        </div>

        {/* Generate Official Receipt Button */}
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setShowReceiptModal(true)}
          style={{ background: 'var(--gradient-gold)', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <FileText size={16} />
          <span>{isAr ? 'إصدار إيصال حجز رسمي (E-Receipt)' : 'Issue Official E-Receipt'}</span>
        </button>
      </div>

      {/* Plan Customizer Form */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.6)',
        border: '1px solid var(--border-light)',
        borderRadius: 'var(--radius-md)',
        padding: '20px',
        marginBottom: '24px'
      }}>
        <h4 style={{ fontSize: '0.9rem', marginBottom: '16px', color: 'var(--accent-gold)' }}>
          ⚙️ {isAr ? 'تخصيص معايير الخطة المالية للوحدة' : 'Payment Plan Parameters'}
        </h4>

        <div className="cms-form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
          {/* Select Property */}
          <div className="form-group-item">
            <label>{isAr ? 'العقار المستهدف:' : 'Property:'}</label>
            <select
              value={selectedPropertyId}
              onChange={(e) => {
                setSelectedPropertyId(e.target.value);
                const p = properties.find(x => x.id === e.target.value);
                if (p?.price) setCustomPrice(p.price);
              }}
              style={{ fontWeight: 'bold' }}
            >
              {properties.map(p => (
                <option key={p.id} value={p.id}>
                  {isAr ? p.title_ar : p.title_en} ({p.price?.toLocaleString()} ج.م)
                </option>
              ))}
            </select>
          </div>

          {/* Select Lead / Client */}
          <div className="form-group-item">
            <label>{isAr ? 'العميل المستهدف للإيصال:' : 'Client:'}</label>
            <select
              value={selectedLeadId}
              onChange={(e) => setSelectedLeadId(e.target.value)}
              style={{ fontWeight: 'bold' }}
            >
              {leads.map(l => (
                <option key={l.id} value={l.id}>
                  {l.name} ({l.phone || 'بدون هاتف'})
                </option>
              ))}
            </select>
          </div>

          {/* Custom Price */}
          <div className="form-group-item">
            <label>{isAr ? 'السعر الإجمالي المتفق عليه (ج.م):' : 'Total Price (EGP):'}</label>
            <input
              type="number"
              value={customPrice}
              onChange={(e) => setCustomPrice(parseInt(e.target.value) || 0)}
            />
          </div>

          {/* Down Payment % */}
          <div className="form-group-item">
            <label>{isAr ? `المقدم (${downPaymentPercent}%):` : `Down Payment (${downPaymentPercent}%):`}</label>
            <select
              value={downPaymentPercent}
              onChange={(e) => setDownPaymentPercent(parseInt(e.target.value))}
            >
              <option value="10">10% ({((totalPrice * 0.1)).toLocaleString()} ج.م)</option>
              <option value="15">15% ({((totalPrice * 0.15)).toLocaleString()} ج.م)</option>
              <option value="20">20% ({((totalPrice * 0.2)).toLocaleString()} ج.م)</option>
              <option value="25">25% ({((totalPrice * 0.25)).toLocaleString()} ج.م)</option>
              <option value="30">30% ({((totalPrice * 0.3)).toLocaleString()} ج.م)</option>
              <option value="40">40% ({((totalPrice * 0.4)).toLocaleString()} ج.م)</option>
              <option value="50">50% ({((totalPrice * 0.5)).toLocaleString()} ج.م)</option>
            </select>
          </div>

          {/* Years */}
          <div className="form-group-item">
            <label>{isAr ? 'مدة التقسيط:' : 'Installment Years:'}</label>
            <select
              value={years}
              onChange={(e) => setYears(parseInt(e.target.value))}
            >
              <option value="1">سنة واحدة (1 Yr)</option>
              <option value="2">سنتان (2 Yrs)</option>
              <option value="3">3 سنوات (3 Yrs)</option>
              <option value="4">4 سنوات (4 Yrs)</option>
              <option value="5">5 سنوات (5 Yrs)</option>
              <option value="6">6 سنوات (6 Yrs)</option>
              <option value="7">7 سنوات (7 Yrs)</option>
            </select>
          </div>

          {/* Frequency */}
          <div className="form-group-item">
            <label>{isAr ? 'دورية سداد الأقساط:' : 'Payment Frequency:'}</label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
            >
              <option value="quarterly">ربع سنوي (كل 3 شهور - الأكثر طلباً)</option>
              <option value="monthly">شهرياً (كل شهر)</option>
              <option value="semi_annual">نصف سنوي (كل 6 شهور)</option>
              <option value="annual">سنوي (كل سنة)</option>
            </select>
          </div>

          {/* Maintenance Deposit % */}
          <div className="form-group-item">
            <label>{isAr ? `وديعة الصيانة (${maintenancePercent}%):` : `Maintenance (${maintenancePercent}%):`}</label>
            <select
              value={maintenancePercent}
              onChange={(e) => setMaintenancePercent(parseInt(e.target.value))}
            >
              <option value="5">5% ({((totalPrice * 0.05)).toLocaleString()} ج.م)</option>
              <option value="7">7% ({((totalPrice * 0.07)).toLocaleString()} ج.م)</option>
              <option value="8">8% ({((totalPrice * 0.08)).toLocaleString()} ج.م)</option>
              <option value="10">10% ({((totalPrice * 0.1)).toLocaleString()} ج.م)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Financial Breakdown KPIs */}
      <div className="crm-stats-grid" style={{ marginBottom: '24px' }}>
        <div className="crm-stat-card">
          <div className="crm-stat-icon" style={{ background: 'var(--emerald-bg)', color: 'var(--emerald)' }}>
            <DollarSign size={20} />
          </div>
          <div className="crm-stat-info">
            <span className="crm-stat-num">{downPaymentAmount.toLocaleString()}</span>
            <span className="crm-stat-lbl">{isAr ? 'مقدم التعاقد المطلوب (ج.م)' : 'Required Down Payment'}</span>
          </div>
        </div>

        <div className="crm-stat-card">
          <div className="crm-stat-icon" style={{ background: 'var(--accent-gold-light)', color: 'var(--accent-gold)' }}>
            <Calendar size={20} />
          </div>
          <div className="crm-stat-info">
            <span className="crm-stat-num">{installmentAmount.toLocaleString()}</span>
            <span className="crm-stat-lbl">
              {isAr ? `قيمة القسط (${frequency === 'quarterly' ? 'الربع سنوي' : 'الشهري'})` : 'Installment Value'}
            </span>
          </div>
        </div>

        <div className="crm-stat-card">
          <div className="crm-stat-icon" style={{ background: 'var(--cyan-bg)', color: 'var(--cyan)' }}>
            <ShieldCheck size={20} />
          </div>
          <div className="crm-stat-info">
            <span className="crm-stat-num">{maintenanceAmount.toLocaleString()}</span>
            <span className="crm-stat-lbl">{isAr ? 'وديعة الصيانة عند الاستلام (ج.م)' : 'Maintenance Deposit'}</span>
          </div>
        </div>
      </div>

      {/* Schedule Table Preview */}
      <div className="admin-table-wrapper">
        <h4 style={{ margin: '0 0 14px 0', fontSize: '0.95rem' }}>
          📑 {isAr ? 'جدول الدفعات والاستحقاقات المالية المعتمد:' : 'Certified Payment Schedule:'}
        </h4>
        <table className="admin-data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>{isAr ? 'نوع الدفعة' : 'Payment Type'}</th>
              <th>{isAr ? 'تاريخ الاستحقاق' : 'Due Date'}</th>
              <th>{isAr ? 'المبلغ المستحق (ج.م)' : 'Amount (EGP)'}</th>
              <th>{isAr ? 'حالة السداد' : 'Status'}</th>
            </tr>
          </thead>
          <tbody>
            {scheduleRows.map((row) => (
              <tr key={row.number}>
                <td style={{ fontWeight: 'bold' }}>{row.number}</td>
                <td><strong>{row.type}</strong></td>
                <td>{row.date}</td>
                <td><strong style={{ color: 'var(--emerald)' }}>{row.amount.toLocaleString()} ج.م</strong></td>
                <td>
                  <span className="badge" style={{
                    background: row.number === 1 ? 'var(--emerald-bg)' : 'rgba(255,255,255,0.05)',
                    color: row.number === 1 ? 'var(--emerald)' : 'var(--text-secondary)'
                  }}>
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 📜 E-RESERVATION OFFICIAL RECEIPT MODAL */}
      {showReceiptModal && (
        <div className="track-modal-backdrop" onClick={() => setShowReceiptModal(false)}>
          <div className="property-form-modal-card animate-fadeIn" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '680px' }}>
            <div className="modal-form-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={22} className="text-gold" />
                <h3 style={{ margin: 0 }}>
                  {isAr ? 'إيصال استلام جدية حجز رسمي معتمد' : 'Official Verified E-Reservation Slip'}
                </h3>
              </div>
              <button type="button" className="drawer-close-btn" onClick={() => setShowReceiptModal(false)}>✕</button>
            </div>

            {/* Receipt Parameters Controls */}
            <div style={{ display: 'flex', gap: '14px', padding: '12px 16px 0', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '160px' }}>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  {isAr ? 'مبلغ جدية الحجز (ج.م):' : 'Deposit (EGP):'}
                </label>
                <input
                  type="number"
                  value={receiptDepositAmount}
                  onChange={(e) => setReceiptDepositAmount(parseInt(e.target.value) || 0)}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '4px' }}
                />
              </div>
              <div style={{ flex: 1, minWidth: '160px' }}>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  {isAr ? 'طريقة السداد:' : 'Payment Method:'}
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '4px' }}
                >
                  <option value="cash">{isAr ? 'نقداً بخزينة الشركة' : 'Cash'}</option>
                  <option value="bank_transfer">{isAr ? 'تحويل بنكي رسمي' : 'Bank Transfer'}</option>
                  <option value="vodafone_cash">{isAr ? 'فودافون كاش / إنستاباي' : 'Vodafone Cash / InstaPay'}</option>
                </select>
              </div>
            </div>

            {/* Printable Receipt Paper Body */}
            <div id="printable-receipt-area" style={{
              background: '#ffffff',
              color: '#0f172a',
              padding: '28px',
              borderRadius: 'var(--radius-sm)',
              margin: '16px',
              border: '2px solid #e2e8f0',
              fontFamily: 'Cairo, sans-serif'
            }}>
              {/* Receipt Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #d97706', paddingBottom: '14px', marginBottom: '18px' }}>
                <div>
                  <h2 style={{ margin: 0, color: '#0f172a', fontSize: '1.3rem' }}>شركة 1Line للحلول العقارية</h2>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>1LINE REAL ESTATE SOLUTIONS — SOHAG HQ</span>
                </div>
                <div style={{ textAlign: isAr ? 'left' : 'right' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#d97706', display: 'block' }}>رقم الإيصال الإلكتروني:</span>
                  <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>{receiptSerial}</strong>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>التاريخ: {new Date().toLocaleDateString('ar-EG')}</span>
                </div>
              </div>

              {/* Receipt Details Box */}
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '6px', marginBottom: '16px', fontSize: '0.9rem', lineHeight: '1.8' }}>
                <p style={{ margin: 0 }}>
                  استلمنا من السيد / السيدة: <strong style={{ color: '#0f172a', textDecoration: 'underline' }}>{selectedLead.name || 'العميل الموقر'}</strong>
                </p>
                <p style={{ margin: 0 }}>
                  رقم الهاتف: <strong>{selectedLead.phone || '010XXXXXXXX'}</strong>
                </p>
                <p style={{ margin: 0 }}>
                  مبلغ وقدره: <strong style={{ color: '#16a34a', fontSize: '1.1rem' }}>{receiptDepositAmount.toLocaleString()} ج.م</strong> (فقط خمسون ألف جنيهاً مصرياً لا غير).
                </p>
                <p style={{ margin: 0 }}>
                  طريقة السداد: <strong>{paymentMethod === 'cash' ? 'نقداً بخزينة الشركة' : paymentMethod === 'bank_transfer' ? 'تحويل بنكي رسمي' : 'فودافون كاش / إنستاباي'}</strong>
                </p>
                <p style={{ margin: 0 }}>
                  وذلك كجدية حجز مبدئي للوحدة: <strong style={{ color: '#d97706' }}>{isAr ? selectedProp.title_ar : selectedProp.title_en}</strong>
                </p>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                  بالموقع: {isAr ? selectedProp.locationName_ar : selectedProp.locationName_en} — بإجمالي سعر: {totalPrice.toLocaleString()} ج.م.
                </p>
              </div>

              {/* QR Verification & Signatures */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid #cbd5e1' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ padding: '6px', background: '#0f172a', borderRadius: '6px', color: '#ffffff' }}>
                    <QrCode size={44} />
                  </div>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', maxWidth: '140px' }}>
                    رمز QR للتحقق الرقمي من صحة الإيصال في النظام المركزي
                  </span>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>خاتم وتوقيع الإدارة المالية:</span>
                  <div style={{ marginTop: '6px', color: '#d97706', fontWeight: 'bold', fontSize: '0.85rem' }}>
                    شركة 1Line للاستثمار العقاري
                  </div>
                  <span style={{ fontSize: '0.65rem', color: '#16a34a' }}>✓ تم السداد والاعتماد إلكترونياً</span>
                </div>
              </div>
            </div>

            {/* Receipt Modal Actions */}
            <div className="cms-modal-actions" style={{ padding: '0 16px 16px' }}>
              <button type="button" className="btn btn-outline" onClick={() => setShowReceiptModal(false)}>
                {isAr ? 'إغلاق' : 'Close'}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handlePrintReceipt}
                style={{ background: 'var(--gradient-gold)', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Printer size={16} />
                <span>{isAr ? 'طباعة الإيصال الفوري (Print PDF)' : 'Print Official Receipt'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
