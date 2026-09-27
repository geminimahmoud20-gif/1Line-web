import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Building2, 
  MapPin, 
  Calculator, 
  ShieldCheck, 
  Globe, 
  Coins, 
  PhoneCall, 
  MessageSquare, 
  Search, 
  ChevronDown, 
  Sparkles, 
  ArrowLeft, 
  ArrowRight, 
  Clock, 
  CheckCircle2, 
  X,
  FileCheck2,
  ExternalLink
} from 'lucide-react';
import { injectJsonLdSchema } from '../../utils/seoHelper';
import { CONTACT, SERVICE_AREAS } from '../../config/siteConfig';
import { getDynamicPhone, getWhatsAppUrl } from '../../utils/founderCmsData';

export default function FaqSection({ lang = 'ar' }) {
  const isAr = lang === 'ar';
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [openIds, setOpenIds] = useState(['services-overview']);

  const phone = getDynamicPhone();
  const sohag = (isAr ? SERVICE_AREAS.sohag_ar : SERVICE_AREAS.sohag_en).join(isAr ? '، ' : ', ');
  const cairo = (isAr ? SERVICE_AREAS.cairo_ar : SERVICE_AREAS.cairo_en).join(isAr ? '، ' : ', ');

  const categories = useMemo(() => [
    { id: 'all', label: isAr ? 'جميع الأسئلة' : 'All Questions' },
    { id: 'services', label: isAr ? 'الخدمات والمناطق' : 'Services & Areas' },
    { id: 'valuation', label: isAr ? 'التقييم والتسعير' : 'Valuation' },
    { id: 'legal', label: isAr ? 'الفحص والضمان' : 'Legal Due Diligence' },
    { id: 'expats', label: isAr ? 'المغتربون والرسوم' : 'Expats & Fees' },
  ], [isAr]);

  const faqItems = useMemo(() => [
    {
      id: 'services-overview',
      category: 'services',
      icon: Building2,
      question: isAr ? 'ما الخدمات التي تقدمها 1Line Solutions؟' : 'What services does 1Line Solutions offer?',
      answer: isAr
        ? 'ون لاين (1Line Solutions) شركة وساطة واستشارات عقارية متخصصة في الأصول عالية القيمة: بيع وشراء الأراضي والشقق والفيلات والمحلات والمكاتب، التقييم السعري الهندسي المعتمد، مراجعة مستندات الملكية والتراخيص قبل التعاقد، المكتب الخاص للصفقات غير المعلنة (Off-Market)، وإدارة متكاملة لطلبات المغتربين.'
        : '1Line Solutions is a premier real estate brokerage and advisory firm for high-value assets: land, residential, luxury villas, commercial shops, certified engineering valuation, title review, discreet Off-Market deals, and remote expat services.',
      highlight: isAr ? 'وساطة مؤسسية مرخصة • استشارات صفقات كبرى' : 'Licensed Advisory • High-Value Transactions',
      action: {
        to: '/properties',
        label: isAr ? 'تصفح المشروعات والفرص' : 'Browse Properties'
      }
    },
    {
      id: 'areas-covered',
      category: 'services',
      icon: MapPin,
      question: isAr ? 'ما المناطق التي تغطيها 1Line؟' : 'Which areas does 1Line cover?',
      answer: isAr
        ? `نركز عملياتنا الميدانية والتسويقية على محافظة سوهاج (${sohag}) بما يشمل المشروعات السكنية والتجارية، بالإضافة إلى إدارة المحافظ الاستثمارية والأصول المميزة في القاهرة الكبرى (${cairo}).`
        : `Our core ground operations cover Sohag Governorate (${sohag}), as well as strategic prime assets and corporate developments across Greater Cairo (${cairo}).`,
      highlight: isAr ? 'تغطية ميدانية مباشرة في سوهاج والقاهرة' : 'Active presence in Sohag & Greater Cairo',
      action: {
        to: '/properties',
        label: isAr ? 'استعرض أحياء سوهاج المتاحة' : 'View Sohag Districts'
      }
    },
    {
      id: 'market-valuation',
      category: 'valuation',
      icon: Calculator,
      question: isAr ? 'كيف أعرف سعر السوق العادل لعقاري؟' : 'How do I determine the fair market price of my property?',
      answer: isAr
        ? 'يمكنك استخدام خوارزمية التقييم في صفحة «قيّم عقارك» لتحصل على نطاق سعري استرشادي دقيق خلال دقيقتين. بعد ذلك يعاين مستشار التقييم العقار ميدانياً ويقارنه بعروض وصفقات حقيقية نُفذت في نفس الشارع لتقديم تقرير تقييم هندسي واستراتيجية تسعير تحميك من الركود أو البيع بأقل من القيمة.'
        : 'Use our smart valuation engine on the "Valuation" page for an immediate indicative estimate. A valuation advisor then inspects the site and benchmarks with verified closed deals in the same street to formulate a precise market report.',
      highlight: isAr ? 'تقييم فوري بالذكاء الاصطناعي + معاينة ميدانية' : 'Instant AI estimate + On-site inspection',
      action: {
        to: '/valuation',
        label: isAr ? 'احسب القيمة العادلة الآن مجاناً' : 'Calculate Fair Value Now'
      }
    },
    {
      id: 'legal-due-diligence',
      category: 'legal',
      icon: ShieldCheck,
      question: isAr ? 'هل تراجعون المستندات القانونية قبل البيع أو الشراء؟' : 'Do you review legal documents before listing or purchase?',
      answer: isAr
        ? 'نعم، بكل حسم. نراجع تسلسل الملكية وتراخيص البناء وسريان وصحة التوكيلات قبل عرض أي عقار، ونسلم المشتري والبائع ملخص التدقيق القانوني قبل إبرام أي تعاقد لضمان خلو العقار من النزاعات أو المخالفات، مع تشجيع الطرفين دائماً على الاستعانة بمحاميهم الخاص.'
        : 'Yes, rigorously. We examine chain of title, building permits, and power of attorney validity before listing, delivering a comprehensive legal review summary before contracts to safeguard both parties against disputes.',
      highlight: isAr ? 'فحص تسلسل الملكية والتراخيص بنسبة 100%' : '100% Chain of title & permit audit',
      action: {
        isWhatsApp: true,
        label: isAr ? 'استشر المستشار القانوني' : 'Consult Legal Advisor',
        msg: isAr ? 'مرحباً، أود استشارة بخصوص تدقيق قانوني وتراخيص عقار في سوهاج.' : 'Hello, inquiring about property legal review in Sohag.'
      }
    },
    {
      id: 'expat-remote-service',
      category: 'expats',
      icon: Globe,
      question: isAr ? 'هل يمكنني البيع أو الشراء وأنا خارج مصر؟' : 'Can I buy or sell while living abroad?',
      answer: isAr
        ? 'بالتأكيد. طوّرنا خدمة "معاينة الغربة" للمصريين بالخارج، والتي تتضمن جولات فيديو مباشرة عبر واتساب من أرض الموقع، وتصوير درون تفصيلي للشارع ومستوى الجيران ومراحل البناء، ومتابعة دقيقة لإجراءات التوكيلات القنصلية والتحويلات البنكية الرسمية حتى تسليم المفتاح.'
        : 'Absolutely. We designed our Expat Remote Service offering live WhatsApp video walkthroughs, 4K drone neighborhood surveys, power-of-attorney coordination, and verified official bank transfers until key handover.',
      highlight: isAr ? 'معاينة فيديو حية + تصوير درون للمغتربين' : 'Live WhatsApp tours + Drone footage',
      action: {
        isWhatsApp: true,
        label: isAr ? 'طلب معاينة فيديو حية للغربة' : 'Request Expat Video Tour',
        msg: isAr ? 'مرحباً 1Line، أنا مغترب وأرغب في ترتيب جولة معاينة فيديو مباشرة لعقار.' : 'Hello 1Line, I am an expat interested in a live property video tour.'
      }
    },
    {
      id: 'brokerage-fees',
      category: 'expats',
      icon: Coins,
      question: isAr ? 'كيف تُحدَّد الأتعاب وهل أدفع شيئاً عبر الموقع الإلكتروني؟' : 'How are brokerage fees determined, and are there online payments?',
      answer: isAr
        ? 'أتعاب الوساطة للبائع والمشتري تُحدَّد وتُكتب في اتفاق واضح قبل بدء أي خدمة، والمعاينة الميدانية للموقع مجانية. موقع 1Line لا يقبل أي مدفوعات إلكترونية عبر البطاقات، وأي مقدمات حجز أو سداد تتم حصراً عبر حسابات بنكية رسمية وبخطابات حجز وإيصالات معتمدة من الشركة.'
        : 'Brokerage fees for sellers and buyers are agreed in writing before any service starts, and on-site viewings are free. The website takes no card payments; deposits go only through official bank accounts with company reservation letters and receipts.',
      highlight: isAr ? 'أتعاب مكتوبة مسبقاً • معاينة مجانية • بدون دفع إلكتروني' : 'Written fees upfront • free viewing • no online payments',
      action: null
    },
    {
      id: 'contact-channels',
      category: 'services',
      icon: PhoneCall,
      question: isAr ? 'كيف يمكنني التواصل مع فريق 1Line؟' : 'How do I get in touch with 1Line team?',
      answer: isAr
        ? `يمكنك الاتصال هاتفياً أو عبر واتساب مباشرة على مدار اليوم على رقم ${phone}. كما نرحب بزيارتك لمقرنا الرئيسي في (${CONTACT.address_ar}) خلال مواعيد العمل الرسمية (${CONTACT.hours_ar})، أو مراسلتنا على ${CONTACT.email}.`
        : `Reach us via phone or WhatsApp 7 days a week at ${phone}. You are also welcome at our flagship office (${CONTACT.address_en}) during operating hours (${CONTACT.hours_en}), or email ${CONTACT.email}.`,
      highlight: isAr ? 'استجابة سريعة هاتفياً وعبر واتساب' : 'Direct Phone & WhatsApp Hotline',
      action: {
        isCall: true,
        label: isAr ? 'اتصل الآن بالرقم المباشر' : 'Call Direct Hotline'
      }
    }
  ], [isAr, sohag, cairo, phone]);

  // Filter items by category and search
  const filteredFaqs = useMemo(() => {
    return faqItems.filter((item) => {
      const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
      if (!searchQuery.trim()) return matchesCategory;

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = 
        item.question.toLowerCase().includes(q) || 
        item.answer.toLowerCase().includes(q) ||
        (item.highlight && item.highlight.toLowerCase().includes(q));

      return matchesCategory && matchesSearch;
    });
  }, [faqItems, activeCategory, searchQuery]);

  // Inject structured JSON-LD schema for SEO
  useEffect(() => {
    injectJsonLdSchema('faq-schema', {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      inLanguage: isAr ? 'ar-EG' : 'en',
      mainEntity: faqItems.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: { '@type': 'Answer', text: item.answer }
      }))
    });
    return () => document.getElementById('faq-schema')?.remove();
  }, [faqItems, isAr]);

  const toggleFaq = (id) => {
    setOpenIds((prev) => 
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <section className="lx-faq-section" aria-labelledby="faq-title" dir={isAr ? 'rtl' : 'ltr'}>
      <header className="lx-faq-head">
        <span className="lx-faq-kicker">
          <Sparkles size={13} strokeWidth={2} aria-hidden="true" />
          {isAr ? 'الشفافية المؤسسية والأسئلة الشائعة' : 'Institutional FAQ & Transparency'}
        </span>
        <h2 id="faq-title">
          {isAr ? 'إجابات مباشرة وشفافة قبل أول مكالمة' : 'Direct answers before your first call'}
        </h2>
        <p className="lx-faq-lead">
          {isAr
            ? 'كل ما يود الملاك، المشترون، والمستثمرون معرفته حول الرسوم، الفحص القانوني، التقييم، وخدمة المغتربين.'
            : 'Everything owners, buyers and investors ask about fees, due diligence, valuation and expat advisory.'}
        </p>
      </header>

      <div className="lx-faq-container">
        {/* Main column: Search, Categories, and Accordion Cards */}
        <div className="lx-faq-main">
          {/* Live Search Box */}
          <div className="lx-faq-search-wrap">
            <Search size={18} className="lx-faq-search-icon" aria-hidden="true" />
            <input
              type="text"
              className="lx-faq-search-input"
              placeholder={isAr ? 'ابحث في الأسئلة والحلول العقارية (مثل: عمولة، تقييم، مغتربين)...' : 'Search FAQ (e.g. commission, valuation, expats)...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label={isAr ? 'بحث في الأسئلة الشائعة' : 'Search FAQ'}
            />
            {searchQuery && (
              <button 
                type="button" 
                className="lx-faq-search-clear" 
                onClick={() => setSearchQuery('')}
                aria-label={isAr ? 'مسح البحث' : 'Clear search'}
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="lx-faq-pills" role="tablist">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                role="tab"
                aria-selected={activeCategory === cat.id}
                className={`lx-faq-pill ${activeCategory === cat.id ? 'is-active' : ''}`}
                onClick={() => setActiveCategory(cat.id)}
              >
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          {/* Cards List */}
          <div className="lx-faq-list">
            {filteredFaqs.length > 0 ? (
              filteredFaqs.map((item) => {
                const isOpen = openIds.includes(item.id);
                const IconComponent = item.icon;

                return (
                  <article 
                    key={item.id} 
                    className={`lx-faq-card ${isOpen ? 'is-open' : ''}`}
                  >
                    <button
                      type="button"
                      className="lx-faq-trigger"
                      onClick={() => toggleFaq(item.id)}
                      aria-expanded={isOpen}
                    >
                      <div className="lx-faq-trigger-content">
                        <div className="lx-faq-icon-box" aria-hidden="true">
                          <IconComponent size={18} strokeWidth={2} />
                        </div>
                        <h3 className="lx-faq-question">{item.question}</h3>
                      </div>
                      <div className="lx-faq-chevron-wrap" aria-hidden="true">
                        <ChevronDown size={18} className="lx-faq-chevron" />
                      </div>
                    </button>

                    {isOpen && (
                      <div className="lx-faq-body">
                        {item.highlight && (
                          <div className="lx-faq-highlight">
                            <CheckCircle2 size={14} strokeWidth={2.5} />
                            <span>{item.highlight}</span>
                          </div>
                        )}
                        <p className="lx-faq-answer">{item.answer}</p>
                        
                        {item.action && (
                          <div className="lx-faq-action-row">
                            {item.action.to ? (
                              <Link to={item.action.to} className="lx-faq-link-btn">
                                <span>{item.action.label}</span>
                                {isAr ? <ArrowLeft size={14} /> : <ArrowRight size={14} />}
                              </Link>
                            ) : item.action.isWhatsApp ? (
                              <a
                                href={getWhatsAppUrl(item.action.msg || 'مرحباً، لدي استفسار بخصوص خدمات 1Line.')}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="lx-faq-link-btn lx-faq-link-btn--wa"
                              >
                                <MessageSquare size={14} />
                                <span>{item.action.label}</span>
                              </a>
                            ) : item.action.isCall ? (
                              <a
                                href={`tel:${phone}`}
                                className="lx-faq-link-btn"
                              >
                                <PhoneCall size={14} />
                                <span>{item.action.label}</span>
                              </a>
                            ) : null}
                          </div>
                        )}
                      </div>
                    )}
                  </article>
                );
              })
            ) : (
              <div className="lx-faq-empty">
                <p>{isAr ? 'لم نجد أسئلة تطابق بحثك الحالي.' : 'No matching questions found.'}</p>
                <button 
                  type="button" 
                  className="lx-faq-reset-btn" 
                  onClick={() => { setSearchQuery(''); setActiveCategory('all'); }}
                >
                  {isAr ? 'عرض جميع الأسئلة' : 'Reset Filters'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar: Sticky Concierge & Direct Advisory Card */}
        <aside className="lx-faq-sidebar" aria-label={isAr ? 'مستشار الصفقات المباشر' : 'Direct Advisory Concierge'}>
          <div className="lx-concierge-card">
            <div className="lx-concierge-header">
              <div className="lx-concierge-icon-wrap" aria-hidden="true">
                <MessageSquare size={20} strokeWidth={2} />
              </div>
              <div className="lx-concierge-status">
                <span className="lx-live-dot" />
                <span>{isAr ? 'مستشار الصفقات متصل الآن' : 'Advisor Online'}</span>
              </div>
            </div>

            <h3 className="lx-concierge-title">
              {isAr ? 'هل لديك استفسار خاص بصفقتك؟' : 'Have a custom inquiry?'}
            </h3>
            
            <p className="lx-concierge-desc">
              {isAr 
                ? 'فريق إدارة الأصول والاستشارات العقارية بسوهاج والقاهرة جاهز لمناقشة تسعير عقارك، فحص المستندات، أو ترتيب معاينة مباشرة.'
                : 'Our asset advisory team is ready to discuss property valuation, title audit, or arrange a private consultation.'}
            </p>

            <div className="lx-concierge-actions">
              <a 
                href={getWhatsAppUrl(isAr ? 'مرحباً 1Line، لدي استفسار عقاري خاص وأود التحدث مباشرة مع المستشار.' : 'Hello 1Line, I have a custom inquiry and would like to speak with an advisor.')} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="lx-concierge-btn lx-concierge-btn--whatsapp"
              >
                <MessageSquare size={17} strokeWidth={2.2} />
                <span>{isAr ? 'تحدث مع المستشار عبر واتساب' : 'Chat via WhatsApp'}</span>
              </a>

              <a 
                href={`tel:${phone}`} 
                className="lx-concierge-btn lx-concierge-btn--phone"
              >
                <PhoneCall size={16} strokeWidth={2} />
                <span>{isAr ? 'اتصال هاتفي مباشر' : 'Call Direct Line'}</span>
                <bdi className="lx-concierge-phone-num">{phone}</bdi>
              </a>
            </div>

            <div className="lx-concierge-trust-points">
              <div className="lx-trust-point">
                <ShieldCheck size={15} strokeWidth={2.2} />
                <span>{isAr ? 'سرية تامة لبيانات العميل والصفقة' : '100% Client & Deal Discretion'}</span>
              </div>
              <div className="lx-trust-point">
                <Clock size={15} strokeWidth={2.2} />
                <span>{isAr ? 'طوال أيام الأسبوع: 9ص - 10م' : 'Hours: 7 days a week, 9am - 10pm'}</span>
              </div>
              <div className="lx-trust-point">
                <FileCheck2 size={15} strokeWidth={2.2} />
                <span>{isAr ? 'استشارة أولية مجانية بدون التزام' : 'Complimentary initial advisory'}</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
