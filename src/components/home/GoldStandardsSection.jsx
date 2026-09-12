import { ShieldCheck, Scale, Award, Video, CheckCircle2, Sparkles } from 'lucide-react';

export default function GoldStandardsSection({ lang = 'ar' }) {
  const isAr = lang === 'ar';

  const standards = [
    {
      icon: ShieldCheck,
      number: '01',
      title_ar: 'التدقيق القانوني الصارم 100%',
      title_en: '100% Verified Legal Audit',
      desc_ar: 'فحص هندسي وقانوني شامل لتسلسل الملكية وتراخيص البناء وصحة التوكيلات من الإدارة القانونية قبل عرض أي عقار.',
      desc_en: 'Comprehensive title deed review, municipal permits verification, and zero legal disputes before any listing.'
    },
    {
      icon: Scale,
      number: '02',
      title_ar: 'التقييم السعري العادل والمعتمد',
      title_en: 'Certified Fair Valuation',
      desc_ar: 'مؤشرات سعرية لحظية مبنية على صفقات حقيقية منفذة بسوهاج، تضمن حماية مدخرات المشتري من أي مغالاة تسعيرية.',
      desc_en: 'Real-time market price benchmarks rooted in closed deals to protect buyer capital from artificial inflation.'
    },
    {
      icon: Award,
      number: '03',
      title_ar: 'صفر عمولة على البائع ومطابقة فورية',
      title_en: 'Zero Seller Fees & Fast Match',
      desc_ar: 'تسويق احترافي مجاني بالكامل لأصحاب العقارات، مع مطابقة مباشرة وفورية مع أكثر من 500 مشترٍ ومستثمر كاش جاهزين.',
      desc_en: 'Free professional marketing for sellers with direct matching to 500+ pre-qualified cash buyers.'
    },
    {
      icon: Video,
      number: '04',
      title_ar: 'منظومة رعاية مغتربي الخليج',
      title_en: 'Gulf Expats Concierge Desk',
      desc_ar: 'معاينات فيديو حية 4K، وتسهيلات التحويلات البنكية الرسمية، ومتابعة الإجراءات والتوكيلات حتى تسليم مفتاح الوحدة.',
      desc_en: 'Live 4K video walk-throughs, certified power of attorney facilitation, and complete remote ownership procedures.'
    }
  ];

  return (
    <section className="homepage-section gold-standards-section">
      <div className="section-header-centered">
        <div className="section-pill-tag">
          <Sparkles size={14} className="text-gold" />
          <span>{isAr ? 'الضمان المؤسسي والريادة' : 'Institutional Trust & Leadership'}</span>
        </div>
        <h2 className="section-heading-primary">
          {isAr ? 'معايير الأمان الأربعة المعتمدة في 1Line' : 'The 4 1Line Golden Standards'}
        </h2>
        <p className="section-heading-desc">
          {isAr 
            ? 'لماذا يأتمننا مئات المستثمرين والأسر بسوهاج ومغتربي الخليج على صفقاتهم العقارية الكبرى؟' 
            : 'Why leading investors, families, and Gulf expats trust 1Line for high-value property transactions.'}
        </p>
      </div>

      <div className="gold-standards-grid">
        {standards.map((std, idx) => {
          const IconComp = std.icon;
          return (
            <div key={idx} className="gold-standard-card">
              <div className="standard-card-header">
                <div className="standard-icon-box">
                  <IconComp size={24} />
                </div>
                <span className="standard-number">{std.number}</span>
              </div>

              <h3 className="standard-card-title">
                {isAr ? std.title_ar : std.title_en}
              </h3>

              <p className="standard-card-desc">
                {isAr ? std.desc_ar : std.desc_en}
              </p>

              <div className="standard-card-badge">
                <CheckCircle2 size={13} className="text-emerald" />
                <span>{isAr ? 'ضمان مؤسسي معتمد' : 'Guaranteed Standard'}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
