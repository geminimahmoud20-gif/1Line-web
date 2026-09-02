import { useState, useMemo } from 'react';
import { ShieldCheck, Calculator, FileText, CheckCircle2, HelpCircle } from 'lucide-react';

export default function LegalTaxCalculator({ price = 2500000, lang = 'ar' }) {
  const isAr = lang === 'ar';

  const [unitPrice, setUnitPrice] = useState(price);
  const [maintenancePercent, setMaintenancePercent] = useState(5); // 5% - 8%

  // Calculations
  const dispositionTax = useMemo(() => Math.round(unitPrice * 0.025), [unitPrice]); // 2.5% Tax
  const registrationFee = useMemo(() => {
    // Egyptian Notary Law tiered max cap (typically 2000 - 4000 EGP)
    return 3900;
  }, []);
  const maintenanceDeposit = useMemo(() => Math.round(unitPrice * (maintenancePercent / 100)), [unitPrice, maintenancePercent]);
  const legalAuditFee = 0; // Free certified audit from One Line platform

  const totalAcquisitionCost = useMemo(() => {
    return unitPrice + dispositionTax + registrationFee + maintenanceDeposit + legalAuditFee;
  }, [unitPrice, dispositionTax, registrationFee, maintenanceDeposit, legalAuditFee]);

  return (
    <div className="legal-tax-calculator-card">
      <div className="tax-calc-header">
        <div className="tax-icon-glow">
          <Calculator size={20} className="text-white" />
        </div>
        <div>
          <h4>{isAr ? 'حاسبة التكاليف الحكومية والضرائب ورسوم التملك' : 'Legal Fees, Tax & Full Acquisition Breakdown'}</h4>
          <p>{isAr ? 'احسب المصاريف الدقيقة الإضافية (ضريبة التصرفات 2.5%، الشهر العقاري، ووديعة الصيانة)' : 'Calculate exact government taxes, notary fees, and deposits'}</p>
        </div>
      </div>

      <div className="tax-breakdown-table">
        <div className="breakdown-row">
          <div className="row-label">
            <span>{isAr ? 'سعر العقار الصافي المتفق عليه' : 'Agreed Property Price'}</span>
          </div>
          <strong className="row-value">{unitPrice.toLocaleString()} ج.م</strong>
        </div>

        <div className="breakdown-row">
          <div className="row-label">
            <span>{isAr ? 'ضريبة التصرفات العقارية (2.5% طبقاً للقانون)' : 'Real Estate Disposition Tax (2.5%)'}</span>
            <small>{isAr ? '(يلتزم بها البائع قانونياً أو حسب الاتفاق)' : '(Legally borne by seller or by contract terms)'}</small>
          </div>
          <strong className="row-value text-muted">+{dispositionTax.toLocaleString()} ج.م</strong>
        </div>

        <div className="breakdown-row">
          <div className="row-label">
            <span>{isAr ? 'رسوم التوثيق والشهر العقاري والتراخيص' : 'Notary & Registration Official Fees'}</span>
            <small>{isAr ? '(الحد الأقصى للرسوم الحكومية المميكنة)' : '(Official government notary fee cap)'}</small>
          </div>
          <strong className="row-value text-muted">+{registrationFee.toLocaleString()} ج.م</strong>
        </div>

        <div className="breakdown-row">
          <div className="row-label">
            <span>{isAr ? `وديعة الصيانة وخدمات العمارة (${maintenancePercent}%)` : `Maintenance Deposit (${maintenancePercent}%)`}</span>
            <small>{isAr ? '(تدفع مرة واحدة للأسانسير والواجهة والنظافة)' : '(One-time fund for elevator & building upkeep)'}</small>
          </div>
          <strong className="row-value text-muted">+{maintenanceDeposit.toLocaleString()} ج.م</strong>
        </div>

        <div className="breakdown-row highlight-free">
          <div className="row-label">
            <span className="text-success">{isAr ? 'الفحص القانوني والتدقيق المعتمد' : 'Legal Due Diligence & Audit'}</span>
            <small>{isAr ? '(خدمة مجانية 100% لعملاء منصة 1Line)' : '(100% Free with 1Line Platform)'}</small>
          </div>
          <strong className="row-value text-success">{isAr ? 'مجاناً 0 ج.م' : 'FREE'}</strong>
        </div>

        <div className="breakdown-row grand-total-row">
          <div className="row-label">
            <strong>{isAr ? 'إجمالي التكلفة الشاملة للتملك النهائي' : 'Grand Total Acquisition Cost'}</strong>
          </div>
          <strong className="row-value grand-total-price">{totalAcquisitionCost.toLocaleString()} ج.م</strong>
        </div>
      </div>
    </div>
  );
}
