import { CheckCircle2, Sparkles, ShieldCheck, Clock, Percent } from 'lucide-react';
import MortgageRoiCalculator from '../components/calculators/MortgageRoiCalculator';

export default function FinancingPage({ lang = 'ar' }) {
  const isAr = lang === 'ar';

  return (
    <div className="financing-page-wrapper">
      {/* Deep Navy Luxury Hero Header */}
      <section className="financing-hero-section">
        <div className="financing-hero-container">
          <div className="financing-badge-pill">
            <Sparkles size={15} className="text-gold" />
            <span>{isAr ? 'برنامج One Line Now للتمويل والتقسيط العقاري' : 'One Line Now Mortgage & Installment Program'}</span>
          </div>

          <h1>{isAr ? 'امتلك عقارك اليوم بأطول فترة سداد وأقل مقدم في سوهاج' : 'Own Your Property with Long-Term Flexible Financing in Sohag'}</h1>
          <p>
            {isAr 
              ? 'احسب قسطك الشهري بدقة، خطط ميزانيتك المالية، أو حلل العائد الاستثماري لصفقاتك السكنية والتجارية بشفافية تامة.' 
              : 'Calculate your exact monthly payments, budget your finances, and analyze investment ROI with total clarity.'}
          </p>
        </div>
      </section>

      {/* Main Interactive Calculator */}
      <section className="financing-calc-section">
        <div className="financing-container">
          <MortgageRoiCalculator lang={lang} />
        </div>
      </section>

      {/* Program Benefits Strip */}
      <section className="financing-benefits-section">
        <div className="financing-container">
          <div className="section-header-centered">
            <h2>{isAr ? 'لماذا تختار برامج التقسيط والتمويل من ون لاين؟' : 'Why Choose One Line Financing Programs?'}</h2>
            <p>{isAr ? 'حلول مالية صُممت خصيصاً لتناسب التدفقات النقدية للمشترين والمستثمرين في سوهاج' : 'Tailored financing solutions designed for Upper Egypt homebuyers and investors'}</p>
          </div>

          <div className="financing-benefits-grid">
            <div className="fin-benefit-card">
              <div className="fin-benefit-icon"><Clock size={24} className="text-gold" /></div>
              <h3>{isAr ? 'فترات سداد مرنة حتى 7 سنوات' : 'Up to 7 Years Repayment'}</h3>
              <p>{isAr ? 'أطول فترة تقسيط مريحة تناسب تدفقاتك المالية الشهرية أو ربع السنوية بدون أعباء مفاجئة.' : 'Longest flexible tenure matching your cash flow with zero hidden fees.'}</p>
            </div>

            <div className="fin-benefit-card">
              <div className="fin-benefit-icon"><Percent size={24} className="text-gold" /></div>
              <h3>{isAr ? 'مقدمات تبدأ من 15% فقط' : 'Downpayments from 15%'}</h3>
              <p>{isAr ? 'ادفع أقل مقدم ممكن واستلم وحدتك السكنية أو التجارية فوراً مع خطة دفع واضحة.' : 'Pay minimal upfront capital and receive your property keys immediately.'}</p>
            </div>

            <div className="fin-benefit-card">
              <div className="fin-benefit-icon"><ShieldCheck size={24} className="text-gold" /></div>
              <h3>{isAr ? 'موافقة مبدئية خلال 48 ساعة' : 'Fast 48h Pre-Approval'}</h3>
              <p>{isAr ? 'فحص ائتماني سريع ومباشر بأقل المستندات وبدون تعقيدات أو اشتراطات بنكية مرهقة.' : 'Hassle-free pre-approval with minimal paperwork and direct consultation.'}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
