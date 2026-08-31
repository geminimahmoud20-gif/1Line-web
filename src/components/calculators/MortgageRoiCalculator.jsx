import { useState, useMemo } from 'react';
import { Calculator, TrendingUp, Sparkles, PieChart, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function MortgageRoiCalculator({ 
  lang = 'ar', 
  initialPrice = 3500000, 
  initialDownpaymentPercent = 20,
  initialYears = 5 
}) {
  const [activeTab, setActiveTab] = useState('mortgage'); // 'mortgage' | 'roi'
  const [price, setPrice] = useState(initialPrice);
  const [downpaymentPercent, setDownpaymentPercent] = useState(initialDownpaymentPercent);
  const [years, setYears] = useState(initialYears);
  const [interestRate, setInterestRate] = useState(12); // Annual rate in %
  
  // ROI States
  const [monthlyRent, setMonthlyRent] = useState(18000);
  const annualMaintenance = 10000;
  const [annualAppreciation, setAnnualAppreciation] = useState(15); // Capital growth %

  const isAr = lang === 'ar';

  // Mortgage Calculations
  const downPaymentAmount = useMemo(() => {
    return Math.round((price * downpaymentPercent) / 100);
  }, [price, downpaymentPercent]);

  const loanAmount = useMemo(() => {
    return Math.max(0, price - downPaymentAmount);
  }, [price, downPaymentAmount]);

  const monthlyInstallment = useMemo(() => {
    if (loanAmount <= 0) return 0;
    const monthlyRate = (interestRate / 100) / 12;
    const totalMonths = years * 12;
    if (monthlyRate === 0) return Math.round(loanAmount / totalMonths);
    const monthly = (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / (Math.pow(1 + monthlyRate, totalMonths) - 1);
    return Math.round(monthly);
  }, [loanAmount, interestRate, years]);

  const totalPaid = useMemo(() => {
    return downPaymentAmount + (monthlyInstallment * years * 12);
  }, [downPaymentAmount, monthlyInstallment, years]);

  const totalInterest = useMemo(() => {
    return Math.max(0, totalPaid - price);
  }, [totalPaid, price]);

  // Visual Breakdown Percentages for Progress Bar
  const downpaymentShare = useMemo(() => {
    if (totalPaid <= 0) return 20;
    return Math.round((downPaymentAmount / totalPaid) * 100);
  }, [downPaymentAmount, totalPaid]);

  const principalShare = useMemo(() => {
    if (totalPaid <= 0) return 55;
    return Math.round((loanAmount / totalPaid) * 100);
  }, [loanAmount, totalPaid]);

  const interestShare = useMemo(() => {
    return Math.max(0, 100 - downpaymentShare - principalShare);
  }, [downpaymentShare, principalShare]);

  // ROI Calculations
  const annualGrossRent = useMemo(() => monthlyRent * 12, [monthlyRent]);
  const annualNetIncome = useMemo(() => Math.max(0, annualGrossRent - annualMaintenance), [annualGrossRent, annualMaintenance]);
  const netYield = useMemo(() => ((annualNetIncome / price) * 100).toFixed(2), [annualNetIncome, price]);
  const estimatedValueAfter5Years = useMemo(() => {
    return Math.round(price * Math.pow(1 + (annualAppreciation / 100), 5));
  }, [price, annualAppreciation]);

  return (
    <div className="calculator-wrapper-box">
      {/* Centered Tab Switcher */}
      <div className="calc-tab-switcher-centered">
        <button
          type="button"
          className={`calc-tab-btn ${activeTab === 'mortgage' ? 'active' : ''}`}
          onClick={() => setActiveTab('mortgage')}
        >
          <Calculator size={16} />
          <span>{isAr ? 'حاسبة التمويل والأقساط' : 'Mortgage & Installments'}</span>
        </button>
        <button
          type="button"
          className={`calc-tab-btn ${activeTab === 'roi' ? 'active' : ''}`}
          onClick={() => setActiveTab('roi')}
        >
          <TrendingUp size={16} />
          <span>{isAr ? 'تحليل العائد الاستثماري (ROI)' : 'Investment ROI Analysis'}</span>
        </button>
      </div>

      <div className="calc-main-grid">
        {/* Input Sliders & Controls */}
        <div className="calc-inputs-column">
          {/* Property Price with Direct Numeric Input */}
          <div className="calc-input-card">
            <div className="calc-label-row">
              <label>{isAr ? 'سعر العقار الإجمالي' : 'Total Property Price'}</label>
              <div className="calc-direct-input-wrap">
                <input
                  type="number"
                  min="500000"
                  max="50000000"
                  step="50000"
                  value={price}
                  onChange={(e) => setPrice(Math.max(0, parseInt(e.target.value) || 0))}
                  className="direct-num-input"
                />
                <span className="direct-curr-tag">{isAr ? 'ج.م' : 'EGP'}</span>
              </div>
            </div>
            <input
              type="range"
              min="500000"
              max="20000000"
              step="50000"
              value={price}
              onChange={(e) => setPrice(parseInt(e.target.value))}
              className="calc-range"
            />
            <div className="calc-range-limits">
              <span>{isAr ? '500 ألف' : '500K'}</span>
              <span>{isAr ? '10 مليون' : '10M'}</span>
              <span>{isAr ? '20 مليون ج.م' : '20M EGP'}</span>
            </div>
          </div>

          {activeTab === 'mortgage' ? (
            <>
              {/* Downpayment with Direct Number & Slider */}
              <div className="calc-input-card">
                <div className="calc-label-row">
                  <label>{isAr ? 'نسبة الدفعة الأولى (المقدم)' : 'Downpayment Percentage'}</label>
                  <strong className="calc-value-display text-gold">
                    {downpaymentPercent}% ({downPaymentAmount.toLocaleString()} {isAr ? 'ج.م' : 'EGP'})
                  </strong>
                </div>
                <input
                  type="range"
                  min="10"
                  max="60"
                  step="5"
                  value={downpaymentPercent}
                  onChange={(e) => setDownpaymentPercent(parseInt(e.target.value))}
                  className="calc-range"
                />
                <div className="calc-range-limits">
                  <span>10% {isAr ? 'أدنى مقدم' : 'Min'}</span>
                  <span>30% {isAr ? 'متوسط' : 'Avg'}</span>
                  <span>60% {isAr ? 'أقصى مقدم' : 'Max'}</span>
                </div>
              </div>

              {/* Installment Duration */}
              <div className="calc-input-card">
                <div className="calc-label-row">
                  <label>{isAr ? 'مدة التقسيط وسنوات السداد' : 'Repayment Duration'}</label>
                  <strong className="calc-value-display">
                    {years} {isAr ? 'سنوات' : 'Years'} ({years * 12} {isAr ? 'شهراً' : 'Months'})
                  </strong>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={years}
                  onChange={(e) => setYears(parseInt(e.target.value))}
                  className="calc-range"
                />
                <div className="calc-range-limits">
                  <span>{isAr ? 'سنة واحدة' : '1 Year'}</span>
                  <span>{isAr ? '5 سنوات' : '5 Years'}</span>
                  <span>{isAr ? '10 سنوات' : '10 Years'}</span>
                </div>
              </div>

              {/* Interest / Profit Margin Rate */}
              <div className="calc-input-card">
                <div className="calc-label-row">
                  <label>{isAr ? 'معدل الفائدة أو المرابحة السنوية' : 'Annual Margin Rate'}</label>
                  <strong className="calc-value-display">{interestRate}%</strong>
                </div>
                <input
                  type="range"
                  min="0"
                  max="20"
                  step="0.5"
                  value={interestRate}
                  onChange={(e) => setInterestRate(parseFloat(e.target.value))}
                  className="calc-range"
                />
                <div className="calc-range-limits">
                  <span>0% {isAr ? 'بدون فوائد' : '0%'}</span>
                  <span>10%</span>
                  <span>20% {isAr ? 'أقصى نسبة' : '20% Max'}</span>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Expected Monthly Rent */}
              <div className="calc-input-card">
                <div className="calc-label-row">
                  <label>{isAr ? 'الإيجار الشهري المتوقع' : 'Expected Monthly Rent'}</label>
                  <div className="calc-direct-input-wrap">
                    <input
                      type="number"
                      min="2000"
                      max="150000"
                      step="500"
                      value={monthlyRent}
                      onChange={(e) => setMonthlyRent(Math.max(0, parseInt(e.target.value) || 0))}
                      className="direct-num-input"
                    />
                    <span className="direct-curr-tag">{isAr ? 'ج.م' : 'EGP'}</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="2000"
                  max="100000"
                  step="1000"
                  value={monthlyRent}
                  onChange={(e) => setMonthlyRent(parseInt(e.target.value))}
                  className="calc-range"
                />
                <div className="calc-range-limits">
                  <span>2,000 {isAr ? 'ج.م' : 'EGP'}</span>
                  <span>50,000</span>
                  <span>100,000 {isAr ? 'ج.م' : 'EGP'}</span>
                </div>
              </div>

              {/* Expected Annual Appreciation */}
              <div className="calc-input-card">
                <div className="calc-label-row">
                  <label>{isAr ? 'معدل نمو سعر العقار السنوي' : 'Annual Capital Growth'}</label>
                  <strong className="calc-value-display text-primary">{annualAppreciation}% {isAr ? 'سنوياً' : '/ yr'}</strong>
                </div>
                <input
                  type="range"
                  min="5"
                  max="35"
                  step="1"
                  value={annualAppreciation}
                  onChange={(e) => setAnnualAppreciation(parseInt(e.target.value))}
                  className="calc-range"
                />
                <div className="calc-range-limits">
                  <span>5% {isAr ? 'متحفظ' : 'Conservative'}</span>
                  <span>18% {isAr ? 'متوسط سوهاج' : 'Sohag Avg'}</span>
                  <span>35% {isAr ? 'سوهاج الجديدة' : 'New Sohag'}</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Output Results Summary Card */}
        <div className="calc-results-column">
          {activeTab === 'mortgage' ? (
            <div className="calc-results-card">
              {/* Highlight Result Header */}
              <div className="result-highlight-box">
                <span className="result-label">{isAr ? 'القسط الشهري التقديري' : 'Estimated Monthly Payment'}</span>
                <h2 className="result-primary-number">
                  {monthlyInstallment.toLocaleString()} <span className="curr">{isAr ? 'ج.م / شهر' : 'EGP / mo'}</span>
                </h2>
                <div className="result-center-gold-line" />
              </div>

              {/* Visual Multi-Segment Allocation Bar */}
              <div className="calc-visual-allocation-wrap">
                <div className="allocation-bar-header">
                  <span>{isAr ? 'هيكل وتوزيع إجمالي المدفوعات' : 'Payment Allocation Breakdown'}</span>
                  <strong>{totalPaid.toLocaleString()} {isAr ? 'ج.م' : 'EGP'}</strong>
                </div>
                <div className="multi-segment-bar">
                  <div className="seg-downpayment" style={{ width: `${downpaymentShare}%` }} title={isAr ? `المقدم: ${downpaymentShare}%` : `Downpayment: ${downpaymentShare}%`} />
                  <div className="seg-principal" style={{ width: `${principalShare}%` }} title={isAr ? `أصل القرض: ${principalShare}%` : `Loan: ${principalShare}%`} />
                  <div className="seg-interest" style={{ width: `${interestShare}%` }} title={isAr ? `الفائدة: ${interestShare}%` : `Interest: ${interestShare}%`} />
                </div>
                <div className="allocation-legend-row">
                  <span className="legend-item"><span className="dot dot-gold" /> {isAr ? `المقدم (${downpaymentShare}%)` : 'Downpayment'}</span>
                  <span className="legend-item"><span className="dot dot-blue" /> {isAr ? `أصل القرض (${principalShare}%)` : 'Loan Principal'}</span>
                  <span className="legend-item"><span className="dot dot-emerald" /> {isAr ? `المرابحة (${interestShare}%)` : 'Interest'}</span>
                </div>
              </div>

              {/* High Contrast Breakdown List */}
              <div className="calc-breakdown-list">
                <div className="calc-breakdown-glass-row">
                  <span className="glass-row-lbl">{isAr ? 'الدفعة الأولى (المقدم)' : 'Required Downpayment'}</span>
                  <strong className="glass-row-val text-gold">{downPaymentAmount.toLocaleString()} {isAr ? 'ج.م' : 'EGP'}</strong>
                </div>

                <div className="calc-breakdown-glass-row">
                  <span className="glass-row-lbl">{isAr ? 'مبلغ التمويل المتبقي' : 'Financed Balance'}</span>
                  <strong className="glass-row-val text-blue-light">{loanAmount.toLocaleString()} {isAr ? 'ج.م' : 'EGP'}</strong>
                </div>

                <div className="calc-breakdown-glass-row">
                  <span className="glass-row-lbl">{isAr ? 'إجمالي الفائدة على المدة' : 'Total Est. Interest'}</span>
                  <strong className="glass-row-val">{totalInterest.toLocaleString()} {isAr ? 'ج.م' : 'EGP'}</strong>
                </div>

                <div className="calc-breakdown-glass-row total-highlight-row">
                  <span className="glass-row-lbl">{isAr ? 'إجمالي المدفوعات الكلية' : 'Total Repayment'}</span>
                  <strong className="glass-row-val text-success">{totalPaid.toLocaleString()} {isAr ? 'ج.م' : 'EGP'}</strong>
                </div>
              </div>

              {/* Action Button */}
              <div className="calc-card-footer">
                <a
                  href={`https://wa.me/201012345678?text=${encodeURIComponent(`مرحباً ون لاين، أريد الاستفسار عن تمويل عقار بقيمة ${price.toLocaleString()} ج.م وقسط شهري ${monthlyInstallment.toLocaleString()} ج.م`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary btn-full calc-cta-btn"
                >
                  <Sparkles size={16} />
                  <span>{isAr ? 'طلب موافقة تمويل مبدئية فورية' : 'Request Instant Pre-Approval'}</span>
                </a>
              </div>
            </div>
          ) : (
            <div className="calc-results-card roi-results">
              <div className="result-highlight-box">
                <span className="result-label">{isAr ? 'صافي العائد الإيجاري السنوي (Cap Rate)' : 'Net Rental Yield'}</span>
                <h2 className="result-primary-number text-success">
                  {netYield}% <span className="curr">{isAr ? 'سنوياً' : '/ year'}</span>
                </h2>
                <div className="result-center-gold-line bg-success" />
              </div>

              <div className="calc-breakdown-list">
                <div className="calc-breakdown-glass-row">
                  <span className="glass-row-lbl">{isAr ? 'إجمالي الدخل الإيجاري السنوي' : 'Gross Annual Rent'}</span>
                  <strong className="glass-row-val text-gold">{annualGrossRent.toLocaleString()} {isAr ? 'ج.م' : 'EGP'}</strong>
                </div>

                <div className="calc-breakdown-glass-row">
                  <span className="glass-row-lbl">{isAr ? 'القيمة الرأسمالية المتوقعة (5 سنوات)' : 'Est. Property Value (5 Yrs)'}</span>
                  <strong className="glass-row-val text-blue-light">{estimatedValueAfter5Years.toLocaleString()} {isAr ? 'ج.م' : 'EGP'}</strong>
                </div>

                <div className="calc-breakdown-glass-row total-highlight-row">
                  <span className="glass-row-lbl">{isAr ? 'إجمالي الأرباح والعوائد (5 سنوات)' : 'Total 5-Yr Returns'}</span>
                  <strong className="glass-row-val text-success">
                    {(estimatedValueAfter5Years - price + (annualNetIncome * 5)).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
                  </strong>
                </div>
              </div>

              <div className="calc-card-footer">
                <a
                  href={`https://wa.me/201012345678?text=${encodeURIComponent(`مرحباً ون لاين، أريد دراسة جدوى استثمارية لعقار بقيمة ${price.toLocaleString()} ج.م بعائد إيجاري ${netYield}%`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary btn-full calc-cta-btn"
                >
                  <TrendingUp size={16} />
                  <span>{isAr ? 'طلب استشارة استثمارية خاصة' : 'Request Investment Consultation'}</span>
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
