// SEO for routes whose page components don't call updatePageSeo themselves.
const sell = {
  title_ar: 'قيّم عقارك واعرضه للبيع في سوهاج والقاهرة الكبرى',
  title_en: 'Value and sell your property in Sohag and Greater Cairo',
  desc_ar: 'احصل على نطاق سعري استرشادي لعقارك خلال دقيقتين، ثم مراجعة ميدانية للمستندات وخطة عرض قبل التسويق. أراضٍ، شقق، فيلات، محلات ومكاتب.',
  desc_en: 'Get an indicative price range in two minutes, followed by an on-site document review and a marketing plan before listing.',
};

export const ROUTE_SEO = {
  '/sell': sell,
  '/valuation': sell,
  '/buy': {
    title_ar: 'اطلب عقاراً بمواصفاتك — مطابقة شخصية',
    title_en: 'Request a property to your brief',
    desc_ar: 'حدد الغرض والمنطقة والميزانية، ويرسل لك مستشار 1Line قائمة مختصرة بالوحدات المطابقة مع مراجعة مستنداتها قبل المعاينة.',
    desc_en: 'Tell us purpose, area and budget; a 1Line advisor sends a short list of matching units with documents reviewed before viewing.',
  },
  '/private-office': {
    title_ar: 'المكتب الخاص — صفقات عقارية غير معلنة',
    title_en: 'Private Office — off-market real estate',
    desc_ar: 'خدمة سرية لكبار الملاك والمستثمرين: عرض وشراء أصول عالية القيمة دون إعلان عام، بموجب اتفاقية سرية ومستشار مخصص.',
    desc_en: 'Confidential service for owners and investors: buy or sell high-value assets without public listing, under NDA with a dedicated advisor.',
  },
  '/investor': {
    title_ar: 'مركز المستثمرين — دراسات عائد وفرص استثمارية',
    title_en: 'Investor Center — yield studies and opportunities',
    desc_ar: 'دراسة عائد مبدئية لأصول سكنية وتجارية وأراضٍ في سوهاج والقاهرة الكبرى، مع مراجعة قانونية للأصل قبل القرار.',
    desc_en: 'Preliminary yield studies for residential, commercial and land assets, with legal review before you decide.',
  },
  '/demands': {
    title_ar: 'طلبات المشترين الحالية',
    title_en: 'Current buyer requests',
    desc_ar: 'طلبات شراء مسجلة لدى 1Line. إن كان لديك عقار مطابق، اعرضه ليصل مباشرة للمشتري المناسب.',
    desc_en: 'Buyer requests registered with 1Line. If you own a matching property, submit it to reach the right buyer.',
  },
  '/broker': {
    title_ar: 'شراكة الوسطاء العقاريين',
    title_en: 'Broker partnership',
    desc_ar: 'انضم لشبكة شركاء 1Line وتعاون على صفقات موثقة بعمولة واضحة ومكتوبة.',
    desc_en: 'Join the 1Line partner network and co-broker documented deals on written terms.',
  },
  '/referral': {
    title_ar: 'برنامج الترشيحات',
    title_en: 'Referral program',
    desc_ar: 'رشّح مالكاً أو مشترياً لـ 1Line واحصل على مكافأة عند إتمام الصفقة وفق شروط مكتوبة.',
    desc_en: 'Refer an owner or buyer and receive a reward when the deal closes, under written terms.',
  },
  '/special': {
    title_ar: 'طلبات عقارية خاصة',
    title_en: 'Bespoke property requests',
    desc_ar: 'أراضٍ بمساحات كبيرة، مقرات شركات، أو أصول بمواصفات نادرة: صف طلبك ونبحث لك بسرية.',
    desc_en: 'Large land, corporate HQs or rare specs: describe your brief and we search confidentially.',
  },
  '/my-account': {
    title_ar: 'حسابي',
    title_en: 'My account',
    desc_ar: 'المفضلة والمقارنات ومواعيد المعاينة.',
    desc_en: 'Favorites, comparisons and viewings.',
    noindex: true,
  },
  '/crm': {
    title_ar: 'لوحة الإدارة',
    title_en: 'Admin',
    desc_ar: 'منطقة داخلية.',
    desc_en: 'Internal area.',
    noindex: true,
  },
};
ROUTE_SEO['/off-market'] = ROUTE_SEO['/private-office'];
ROUTE_SEO['/special-requests'] = ROUTE_SEO['/special'];
