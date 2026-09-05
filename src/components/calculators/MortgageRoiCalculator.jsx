import { useState, useMemo } from 'react';
import { 
  Calculator, 
  TrendingUp, 
  Sparkles, 
  PieChart, 
  ArrowRight, 
  CheckCircle2, 
  Copy, 
  Check, 
  FileText,
  Building2,
  Landmark,
  Handshake,
  Percent,
  Globe
} from 'lucide-react';
import { trackEvent } from '../../utils/visitorTracker';
import { getWhatsAppUrl } from '../../utils/founderCmsData';

export default function MortgageRoiCalculator({ 
  lang = 'ar', 
  currency = 'EGP',
  initialPrice = 3500000, 
  initialDownpaymentPercent = 20,
  initialYears = 5 
}) {
  const [activeTab, setActiveTab] = useState('mortgage'); // 'mortgage' | 'roi'
  const [price, setPrice] = useState(initialPrice);
  const [downpaymentPercent, setDownpaymentPercent] = useState(initialDownpaymentPercent);
  const [years, setYears] = useState(initialYears);
  const [interestRate, setInterestRate] = useState(12); // Annual rate in % (step 1%)
  const [copied, setCopied] = useState(false);
  
  // ROI States
  const [monthlyRent, setMonthlyRent] = useState(18000);
  const annualMaintenance = 10000;
  const [annualAppreciation, setAnnualAppreciation] = useState(15); // Capital growth %
  const isAr = lang === 'ar';

  const formatCurrency = (valInEgp) => {
    return `${Math.round(valInEgp).toLocaleString()} ${isAr ? 'ج.م' : 'EGP'}`;
  };

  // Egyptian Financing Programs Presets
  const FINANCING_PROGRAMS = [
    { id: 'dev_0', name_ar: 'تقسيط مباشر من المطور', name_en: 'Direct Developer 0%', rate: 0, desc_ar: 'بدون فوائد بنكية', icon: Handshake },
    { id: 'cbe_3', name_ar: 'مبادرة البنك المركزي (3%)', name_en: 'CBE 3% Initiative', rate: 3, desc_ar: 'لمحدودي ومتوسطي الدخل', icon: Landmark },
    { id: 'cbe_8', name_ar: 'مبادرة التمويل العقاري (8%)', name_en: 'Mortgage 8% Initiative', rate: 8, desc_ar: 'فائدة متناقصة ميسرة', icon: Landmark },
    { id: 'bank_12', name_ar: 'مرابحة بنكية / تمويل تجاري (12%)', name_en: 'Islamic Murabaha / Bank 12%', rate: 12, desc_ar: 'تمويل سريع للوحدات الفاخرة', icon: Building2 },
  ];

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

  // Visual Breakdown Percentages for Progress Bar (Consistent with Property Price)
  const downpaymentShare = downpaymentPercent;
  const principalShare = Math.max(0, 100 - downpaymentPercent);

  // Dynamic slider track fill percentages for active color fill
  const priceFillPct = Math.min(100, Math.max(0, ((price - 500000) / (20000000 - 500000)) * 100));
  const downpaymentFillPct = Math.min(100, Math.max(0, ((downpaymentPercent - 5) / (80 - 5)) * 100));
  const yearsFillPct = Math.min(100, Math.max(0, ((years - 1) / (15 - 1)) * 100));
  const interestFillPct = Math.min(100, Math.max(0, (interestRate / 24) * 100));
  const rentFillPct = Math.min(100, Math.max(0, ((monthlyRent - 2000) / (100000 - 2000)) * 100));
  const growthFillPct = Math.min(100, Math.max(0, ((annualAppreciation - 3) / (35 - 3)) * 100));

  // ROI Calculations
  const annualGrossRent = useMemo(() => monthlyRent * 12, [monthlyRent]);
  const annualNetIncome = useMemo(() => Math.max(0, annualGrossRent - annualMaintenance), [annualGrossRent, annualMaintenance]);
  const netYield = useMemo(() => ((annualNetIncome / (price || 1)) * 100).toFixed(2), [annualNetIncome, price]);
  const estimatedValueAfter5Years = useMemo(() => {
    return Math.round(price * Math.pow(1 + (annualAppreciation / 100), 5));
  }, [price, annualAppreciation]);

  const handleCopyPlan = () => {
    const text = isAr 
      ? `🏢 خطة التمويل والأقساط - 1Line Real Estate (${currency})\n` +
        `• سعر الوحدة: ${formatCurrency(price)}\n` +
        `• المقدم المطلوب (${downpaymentPercent}%): ${formatCurrency(downPaymentAmount)}\n` +
        `• القسط الشهري: ${formatCurrency(monthlyInstallment)}\n` +
        `• مدة التقسيط: ${years} سنوات (${years * 12} شهر)\n` +
        `• معدل الفائدة/المرابحة: ${interestRate}%\n` +
        `• إجمالي المبلغ المسترد: ${formatCurrency(totalPaid)}\n` +
        `📞 للاستفسار وحجز الوحدة: +20 101 234 5678`
      : `🏢 Mortgage & Payment Plan - 1Line Real Estate (${currency})\n` +
        `• Price: ${formatCurrency(price)}\n` +
        `• Downpayment (${downpaymentPercent}%): ${formatCurrency(downPaymentAmount)}\n` +
        `• Monthly Installment: ${formatCurrency(monthlyInstallment)}\n` +
        `• Duration: ${years} Years\n` +
        `• Rate: ${interestRate}%\n` +
        `• Total Repayment: ${formatCurrency(totalPaid)}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    trackEvent('calculator_used', { price, monthlyInstallment, type: activeTab });
    setTimeout(() => setCopied(false), 3000);
  };

  // Handler for custom EGP downpayment amount input
  const handleDownpaymentAmountChange = (val) => {
    const numericVal = Math.max(0, parseInt(val) || 0);
    if (price > 0) {
      const calculatedPct = Math.min(80, Math.max(5, Math.round((numericVal / price) * 100)));
      setDownpaymentPercent(calculatedPct);
    }
  };

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
        {/* Input Sliders & Controls Column */}
        <div className="calc-inputs-column">
          
          {/* 1. Property Price (Direct Type + Range + Presets) */}
          <div className="calc-input-card">
            <div className="calc-label-row">
              <label className="calc-field-title">
                {isAr ? 'سعر العقار الإجمالي' : 'Total Property Price'}
              </label>
              <div className="calc-direct-input-wrap">
                <input
                  type="number"
                  min="300000"
                  max="50000000"
                  step="25000"
                  value={price}
                  onChange={(e) => setPrice(Math.min(50000000, Math.max(0, parseInt(e.target.value) || 0)))}
                  className="direct-num-input"
                  title={isAr ? 'اكتب السعر هنا مباشرة' : 'Type price directly'}
                />
                <span className="direct-curr-tag">{isAr ? 'ج.م' : 'EGP'}</span>
              </div>
            </div>

            {/* Slider with Active Gradient Fill & LTR Alignment */}
            <div className="calc-slider-track-wrap">
              <input
                type="range"
                min="500000"
                max="20000000"
                step="25000"
                value={Math.min(20000000, Math.max(500000, price))}
                onChange={(e) => setPrice(parseInt(e.target.value))}
                className="calc-range"
                style={{
                  background: `linear-gradient(to right, #0d48a1 0%, #0d48a1 ${priceFillPct}%, #e2e8f0 ${priceFillPct}%, #e2e8f0 100%)`
                }}
              />
              <div className="calc-range-limits-ltr">
                <span>{isAr ? '500 ألف ج.م' : '500K'}</span>
                <span>{isAr ? '10 مليون' : '10M'}</span>
                <span>{isAr ? '20 مليون ج.م' : '20M EGP'}</span>
              </div>
            </div>
            
            {/* Quick Price Preset Chips (Ascending Order) */}
            <div className="calc-quick-chips-row">
              {[1500000, 2500000, 3500000, 5000000, 8000000, 12000000].map((pVal) => (
                <button
                  key={pVal}
                  type="button"
                  className={`calc-chip-btn ${price === pVal ? 'active' : ''}`}
                  onClick={() => setPrice(pVal)}
                >
                  {(pVal / 1000000).toLocaleString()} {isAr ? 'مليون' : 'M'}
                </button>
              ))}
            </div>
          </div>

          {activeTab === 'mortgage' ? (
            <>
              {/* 2. Downpayment % & Amount (1% Precision Slider + Direct % & EGP Typing) */}
              <div className="calc-input-card">
                <div className="calc-label-row">
                  <label className="calc-field-title">
                    {isAr ? 'نسبة وقيمة الدفعة الأولى (المقدم)' : 'Downpayment (Percentage & Amount)'}
                  </label>
                  
                  {/* Dual Direct Input (Percentage % & Amount EGP) */}
                  <div className="calc-dual-inputs-group">
                    <div className="calc-direct-input-wrap mini-wrap">
                      <input
                        type="number"
                        min="5"
                        max="80"
                        step="1"
                        value={downpaymentPercent}
                        onChange={(e) => setDownpaymentPercent(Math.min(80, Math.max(1, parseInt(e.target.value) || 1)))}
                        className="direct-num-input"
                        title={isAr ? 'اكتب نسبة المقدم مباشرة' : 'Type downpayment percentage'}
                      />
                      <span className="direct-curr-tag">%</span>
                    </div>

                    <div className="calc-direct-input-wrap">
                      <input
                        type="number"
                        min="50000"
                        max={price}
                        step="10000"
                        value={downPaymentAmount}
                        onChange={(e) => handleDownpaymentAmountChange(e.target.value)}
                        className="direct-num-input"
                        title={isAr ? 'اكتب قيمة المقدم بالجنيه مباشرة' : 'Type downpayment amount in EGP'}
                      />
                      <span className="direct-curr-tag">{isAr ? 'ج.م' : 'EGP'}</span>
                    </div>
                  </div>
                </div>

                {/* Slider with exact 1% Precision & Active Fill */}
                <div className="calc-slider-track-wrap">
                  <input
                    type="range"
                    min="5"
                    max="80"
                    step="1"
                    value={downpaymentPercent}
                    onChange={(e) => setDownpaymentPercent(parseInt(e.target.value))}
                    className="calc-range"
                    style={{
                      background: `linear-gradient(to right, #f59e0b 0%, #f59e0b ${downpaymentFillPct}%, #e2e8f0 ${downpaymentFillPct}%, #e2e8f0 100%)`
                    }}
                  />
                  <div className="calc-range-limits-ltr">
                    <span>5% ({isAr ? 'أدنى مقدم' : 'Min'})</span>
                    <span>40%</span>
                    <span>80% ({isAr ? 'أقصى مقدم' : 'Max'})</span>
                  </div>
                </div>

                {/* Quick Downpayment % Chips (Ascending Order) */}
                <div className="calc-quick-chips-row">
                  {[5, 10, 15, 20, 25, 30, 40, 50].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      className={`calc-chip-btn ${downpaymentPercent === pct ? 'active' : ''}`}
                      onClick={() => setDownpaymentPercent(pct)}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Repayment Duration (Direct Typing + 1-Year Step Slider + Chips) */}
              <div className="calc-input-card">
                <div className="calc-label-row">
                  <label className="calc-field-title">
                    {isAr ? 'مدة التقسيط وسنوات السداد' : 'Repayment Duration'}
                  </label>
                  <div className="calc-direct-input-wrap">
                    <input
                      type="number"
                      min="1"
                      max="15"
                      step="1"
                      value={years}
                      onChange={(e) => setYears(Math.min(25, Math.max(1, parseInt(e.target.value) || 1)))}
                      className="direct-num-input"
                      title={isAr ? 'اكتب عدد السنوات مباشرة' : 'Type duration in years'}
                    />
                    <span className="direct-curr-tag">{isAr ? 'سنوات' : 'Yrs'}</span>
                  </div>
                </div>

                {/* Range Slider 1-Year Step & Active Fill */}
                <div className="calc-slider-track-wrap">
                  <input
                    type="range"
                    min="1"
                    max="15"
                    step="1"
                    value={years}
                    onChange={(e) => setYears(parseInt(e.target.value))}
                    className="calc-range"
                    style={{
                      background: `linear-gradient(to right, #0d48a1 0%, #0d48a1 ${yearsFillPct}%, #e2e8f0 ${yearsFillPct}%, #e2e8f0 100%)`
                    }}
                  />
                  <div className="calc-range-limits-ltr">
                    <span>{isAr ? 'سنة واحدة' : '1 Year'}</span>
                    <span>{isAr ? '7 سنوات' : '7 Years'}</span>
                    <span>{isAr ? '15 سنة' : '15 Years'}</span>
                  </div>
                </div>

                {/* Quick Duration Chips (Ascending Order) */}
                <div className="calc-quick-chips-row">
                  {[1, 2, 3, 5, 7, 10, 15].map((y) => (
                    <button
                      key={y}
                      type="button"
                      className={`calc-chip-btn ${years === y ? 'active' : ''}`}
                      onClick={() => setYears(y)}
                    >
                      {y} {isAr ? (y === 1 ? 'سنة' : (y === 2 ? 'سنتين' : 'سنوات')) : 'Yrs'} ({y * 12} {isAr ? 'شهر' : 'mo'})
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Financing Rate & Egyptian Programs (1% Step Slider + Direct % Input + 4 Presets) */}
              <div className="calc-input-card">
                <div className="calc-label-row">
                  <label className="calc-field-title">
                    {isAr ? 'معدل الفائدة أو المرابحة السنوية' : 'Annual Margin / Interest Rate'}
                  </label>
                  <div className="calc-direct-input-wrap mini-wrap">
                    <input
                      type="number"
                      min="0"
                      max="30"
                      step="0.5"
                      value={interestRate}
                      onChange={(e) => setInterestRate(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="direct-num-input"
                      title={isAr ? 'اكتب نسبة الفائدة أو المرابحة مباشرة' : 'Type interest rate'}
                    />
                    <span className="direct-curr-tag">%</span>
                  </div>
                </div>

                {/* Slider with 1% Precision & Active Fill */}
                <div className="calc-slider-track-wrap">
                  <input
                    type="range"
                    min="0"
                    max="24"
                    step="1"
                    value={interestRate}
                    onChange={(e) => setInterestRate(parseFloat(e.target.value))}
                    className="calc-range"
                    style={{
                      background: `linear-gradient(to right, #0d48a1 0%, #0d48a1 ${interestFillPct}%, #e2e8f0 ${interestFillPct}%, #e2e8f0 100%)`
                    }}
                  />
                  <div className="calc-range-limits-ltr">
                    <span>0% ({isAr ? 'بدون فوائد' : '0%'})</span>
                    <span>12%</span>
                    <span>24% ({isAr ? 'أقصى نسبة' : '24% Max'})</span>
                  </div>
                </div>

                {/* Egyptian Financing Program Cards */}
                <div className="calc-programs-grid">
                  {FINANCING_PROGRAMS.map((prog) => {
                    const Icon = prog.icon;
                    const isActive = interestRate === prog.rate;
                    return (
                      <button
                        key={prog.id}
                        type="button"
                        className={`calc-program-card ${isActive ? 'active' : ''}`}
                        onClick={() => setInterestRate(prog.rate)}
                      >
                        <div className="prog-card-top">
                          <Icon size={14} className={isActive ? 'text-gold' : 'text-primary'} />
                          <strong className="prog-rate-tag">{prog.rate}%</strong>
                        </div>
                        <div className="prog-name">{isAr ? prog.name_ar : prog.name_en}</div>
                        <div className="prog-desc">{isAr ? prog.desc_ar : prog.name_en}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* ROI: Expected Monthly Rent (Direct EGP Input + Range Slider) */}
              <div className="calc-input-card">
                <div className="calc-label-row">
                  <label className="calc-field-title">{isAr ? 'الإيجار الشهري المتوقع' : 'Expected Monthly Rent'}</label>
                  <div className="calc-direct-input-wrap">
                    <input
                      type="number"
                      min="2000"
                      max="200000"
                      step="500"
                      value={monthlyRent}
                      onChange={(e) => setMonthlyRent(Math.max(0, parseInt(e.target.value) || 0))}
                      className="direct-num-input"
                    />
                    <span className="direct-curr-tag">{isAr ? 'ج.م' : 'EGP'}</span>
                  </div>
                </div>
                
                <div className="calc-slider-track-wrap">
                  <input
                    type="range"
                    min="2000"
                    max="100000"
                    step="500"
                    value={monthlyRent}
                    onChange={(e) => setMonthlyRent(parseInt(e.target.value))}
                    className="calc-range"
                    style={{
                      background: `linear-gradient(to right, #0d48a1 0%, #0d48a1 ${rentFillPct}%, #e2e8f0 ${rentFillPct}%, #e2e8f0 100%)`
                    }}
                  />
                  <div className="calc-range-limits-ltr">
                    <span>2,000 {isAr ? 'ج.م' : 'EGP'}</span>
                    <span>50,000</span>
                    <span>100,000 {isAr ? 'ج.م' : 'EGP'}</span>
                  </div>
                </div>

                <div className="calc-quick-chips-row">
                  {[10000, 15000, 20000, 30000, 45000, 60000].map((rVal) => (
                    <button
                      key={rVal}
                      type="button"
                      className={`calc-chip-btn ${monthlyRent === rVal ? 'active' : ''}`}
                      onClick={() => setMonthlyRent(rVal)}
                    >
                      {rVal.toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
                    </button>
                  ))}
                </div>
              </div>

              {/* ROI: Expected Annual Appreciation (1% Precision Slider + Direct % Typing) */}
              <div className="calc-input-card">
                <div className="calc-label-row">
                  <label className="calc-field-title">{isAr ? 'معدل نمو سعر العقار السنوي (Capital Growth)' : 'Annual Capital Appreciation'}</label>
                  <div className="calc-direct-input-wrap mini-wrap">
                    <input
                      type="number"
                      min="2"
                      max="40"
                      step="1"
                      value={annualAppreciation}
                      onChange={(e) => setAnnualAppreciation(Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))}
                      className="direct-num-input"
                    />
                    <span className="direct-curr-tag">%</span>
                  </div>
                </div>

                <div className="calc-slider-track-wrap">
                  <input
                    type="range"
                    min="3"
                    max="35"
                    step="1"
                    value={annualAppreciation}
                    onChange={(e) => setAnnualAppreciation(parseInt(e.target.value))}
                    className="calc-range"
                    style={{
                      background: `linear-gradient(to right, #0d48a1 0%, #0d48a1 ${growthFillPct}%, #e2e8f0 ${growthFillPct}%, #e2e8f0 100%)`
                    }}
                  />
                  <div className="calc-range-limits-ltr">
                    <span>3% ({isAr ? 'متحفظ' : 'Conservative'})</span>
                    <span>18% ({isAr ? 'متوسط سوهاج' : 'Avg'})</span>
                    <span>35% ({isAr ? 'سوهاج الجديدة' : 'Max'})</span>
                  </div>
                </div>

                <div className="calc-quick-chips-row">
                  {[8, 12, 15, 18, 22, 30].map((growth) => (
                    <button
                      key={growth}
                      type="button"
                      className={`calc-chip-btn ${annualAppreciation === growth ? 'active' : ''}`}
                      onClick={() => setAnnualAppreciation(growth)}
                    >
                      {growth}% {isAr ? 'سنوياً' : '/ yr'}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Output Results Summary Card (Left Column) */}
        <div className="calc-results-column">
          {activeTab === 'mortgage' ? (
            <div className="calc-results-card">
              {/* Highlight Result Header */}
              <div className="result-highlight-box">
                <span className="result-label">{isAr ? 'القسط الشهري التقديري' : 'Estimated Monthly Payment'}</span>
                <h2 className="result-primary-number">
                  {formatCurrency(monthlyInstallment)} <span className="curr">{isAr ? '/ شهر' : '/ mo'}</span>
                </h2>
                {currency !== 'EGP' && (
                  <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '4px' }}>
                    ({monthlyInstallment.toLocaleString()} ج.م / شهر)
                  </div>
                )}
                <div className="result-center-gold-line" />
              </div>

              {/* Visual Multi-Segment Allocation Bar (Consistent with Property Price) */}
              <div className="calc-visual-allocation-wrap">
                <div className="allocation-bar-header">
                  <span>{isAr ? 'توزيع سداد سعر العقار الأصلي' : 'Property Value Distribution'}</span>
                  <strong>{formatCurrency(price)}</strong>
                </div>
                <div className="multi-segment-bar">
                  <div className="seg-downpayment" style={{ width: `${downpaymentShare}%` }} title={isAr ? `المقدم: ${downpaymentShare}%` : `Downpayment: ${downpaymentShare}%`} />
                  <div className="seg-principal" style={{ width: `${principalShare}%` }} title={isAr ? `التمويل المتبقي: ${principalShare}%` : `Loan: ${principalShare}%`} />
                </div>
                <div className="allocation-legend-row">
                  <span className="legend-item"><span className="dot dot-gold" /> {isAr ? `المقدم (${downpaymentShare}%): ${formatCurrency(downPaymentAmount)}` : `Downpayment (${downpaymentShare}%)`}</span>
                  <span className="legend-item"><span className="dot dot-blue" /> {isAr ? `الممول (${principalShare}%): ${formatCurrency(loanAmount)}` : `Financed (${principalShare}%)`}</span>
                </div>
              </div>

              {/* High Contrast Breakdown List */}
              <div className="calc-breakdown-list">
                <div className="calc-breakdown-glass-row">
                  <span className="glass-row-lbl">{isAr ? 'الدفعة الأولى (المقدم)' : 'Required Downpayment'}</span>
                  <strong className="glass-row-val text-gold">{formatCurrency(downPaymentAmount)}</strong>
                </div>

                <div className="calc-breakdown-glass-row">
                  <span className="glass-row-lbl">{isAr ? 'مبلغ التمويل المتبقي' : 'Financed Balance'}</span>
                  <strong className="glass-row-val text-blue-light">{formatCurrency(loanAmount)}</strong>
                </div>

                <div className="calc-breakdown-glass-row">
                  <span className="glass-row-lbl">{isAr ? 'إجمالي الفائدة / المرابحة على المدة' : 'Total Est. Margin'}</span>
                  <strong className="glass-row-val">{formatCurrency(totalInterest)}</strong>
                </div>

                <div className="calc-breakdown-glass-row total-highlight-row">
                  <span className="glass-row-lbl">{isAr ? 'إجمالي المدفوعات الكلية' : 'Total Repayment'}</span>
                  <strong className="glass-row-val text-success">{formatCurrency(totalPaid)}</strong>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="calc-card-footer" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <a
                  href={getWhatsAppUrl(`مرحباً 1Line، أريد الاستفسار عن تمويل عقار بقيمة ${formatCurrency(price)} وقسط شهري ${formatCurrency(monthlyInstallment)} بنظام ${interestRate}% لمدة ${years} سنوات.`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary btn-full calc-cta-btn"
                >
                  <Sparkles size={16} className="text-gold" />
                  <span>{isAr ? 'طلب موافقة تمويل مبدئية فورية' : 'Request Instant Pre-Approval'}</span>
                </a>

                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  onClick={handleCopyPlan}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.84rem' }}
                >
                  {copied ? <Check size={14} style={{ color: 'var(--emerald)' }} /> : <Copy size={14} />}
                  <span>{copied ? (isAr ? 'تم نسخ الخطة للحافظة! 📋' : 'Plan Copied!') : (isAr ? 'نسخ خطة الأقساط للمشاركة' : 'Copy Payment Breakdown')}</span>
                </button>
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
                  <strong className="glass-row-val text-gold">{formatCurrency(annualGrossRent)}</strong>
                </div>

                <div className="calc-breakdown-glass-row">
                  <span className="glass-row-lbl">{isAr ? 'القيمة الرأسمالية المتوقعة (5 سنوات)' : 'Est. Property Value (5 Yrs)'}</span>
                  <strong className="glass-row-val text-blue-light">{formatCurrency(estimatedValueAfter5Years)}</strong>
                </div>

                <div className="calc-breakdown-glass-row total-highlight-row">
                  <span className="glass-row-lbl">{isAr ? 'إجمالي الأرباح والعوائد (5 سنوات)' : 'Total 5-Yr Returns'}</span>
                  <strong className="glass-row-val text-success">
                    {formatCurrency(estimatedValueAfter5Years - price + (annualNetIncome * 5))}
                  </strong>
                </div>
              </div>

              {/* 5-Year Capital Growth Simulation Timeline */}
              <div className="five-year-growth-card" style={{
                background: 'linear-gradient(135deg, rgba(8, 18, 38, 0.95) 0%, rgba(13, 72, 161, 0.9) 100%)',
                color: '#ffffff',
                padding: '14px',
                borderRadius: 'var(--radius-md)',
                marginTop: '12px',
                border: '1px solid rgba(255, 202, 40, 0.3)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: '800' }}>
                    <Sparkles size={14} style={{ color: '#ffca28' }} />
                    <span>{isAr ? 'نمو رأس المال التراكمي (5 سنوات)' : '5-Year Wealth Forecast'}</span>
                  </span>
                  <span style={{
                    background: 'rgba(255, 202, 40, 0.2)',
                    color: '#ffca28',
                    border: '1px solid rgba(255, 202, 40, 0.4)',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '0.72rem',
                    fontWeight: '900'
                  }}>
                    +{Math.round(((estimatedValueAfter5Years - price) / price) * 100)}% {isAr ? 'عائد رأسمالي' : 'Gain'}
                  </span>
                </div>

                {/* Micro Progression Timeline */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px', textAlign: 'center', margin: '10px 0' }}>
                  {[1, 2, 3, 4, 5].map((yr) => {
                    const yrVal = Math.round(price * Math.pow(1 + (annualAppreciation / 100), yr));
                    return (
                      <div key={yr} style={{ background: 'rgba(255, 255, 255, 0.08)', borderRadius: '6px', padding: '6px 2px' }}>
                        <div style={{ fontSize: '0.66rem', color: '#94a3b8' }}>{isAr ? `سنة ${yr}` : `Yr ${yr}`}</div>
                        <div style={{ fontSize: '0.72rem', fontWeight: '800', color: '#ffca28', marginTop: '2px' }}>
                          {formatCurrency(yrVal)}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '8px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.15)',
                  fontSize: '0.76rem'
                }}>
                  <span style={{ color: '#cbd5e1' }}>{isAr ? 'صافي الربح التراكمي المتوقع:' : 'Net Capital Profit:'}</span>
                  <strong style={{ color: '#10b981', fontWeight: '900' }}>+{formatCurrency(estimatedValueAfter5Years - price)}</strong>
                </div>
              </div>

              <div className="calc-card-footer" style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
                <a
                  href={getWhatsAppUrl(`مرحباً 1Line، أريد دراسة جدوى استثمارية لعقار بقيمة ${formatCurrency(price)} بعائد إيجاري ${netYield}% ونمو سنوي ${annualAppreciation}%`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary btn-full calc-cta-btn"
                >
                  <TrendingUp size={16} />
                  <span>{isAr ? 'طلب استشارة استثمارية خاصة' : 'Request Investment Consultation'}</span>
                </a>

                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  onClick={handleCopyPlan}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.84rem' }}
                >
                  {copied ? <Check size={14} style={{ color: 'var(--emerald)' }} /> : <Copy size={14} />}
                  <span>{copied ? (isAr ? 'تم نسخ الدراسة للحافظة! 📋' : 'Study Copied!') : (isAr ? 'نسخ ملخص دراسة الجدوى' : 'Copy Feasibility Summary')}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
