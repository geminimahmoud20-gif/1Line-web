import { useState, useRef, useEffect } from 'react';
import { 
  Building, 
  Sparkles, 
  X, 
  Send, 
  PhoneCall, 
  ShieldCheck, 
  TrendingUp, 
  Compass,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import { getWhatsAppUrl } from '../../utils/founderCmsData';

const SOHAG_AI_KNOWLEDGE = [
  {
    tag: 'budget',
    q_ar: 'ما هي أفضل فرصة للشراء بميزانية 2 إلى 3 مليون ج.م؟',
    q_en: 'Best opportunity for 2M - 3M EGP budget?',
    a_ar: 'بميزانية بين **2 إلى 3 مليون ج.م**، تتصدر **سوهاج الجديدة (الحي الأول والحي الثاني)** خيارات التميز. يمكنك امتلاك شقة فاخرة بمساحة 140-165م² استلام فوري تشطيب ألترا لوكس، أو التعاقد في كمبوند سكني متكامل بمقدم 20% وأقساط مريحة تصل إلى 5-7 سنوات. للمستثمرين الباحثين عن عائد إيجاري سريع، يمكن أيضاً اقتناء وحدة تجارية أو عيادة طبية تحت الإنشاء.',
    a_en: 'For 2M-3M EGP, New Sohag (Districts 1 & 2) offers premier luxury apartments (140-165 sqm) ready to move, or off-plan units with up to 7-year installment plans.'
  },
  {
    tag: 'price',
    q_ar: 'ما هو متوسط سعر المتر السكني والتجاري بسوهاج 2026؟',
    q_en: 'What is the average price per sqm in Sohag for 2026?',
    a_ar: 'مؤشرات أسعار المتر في سوهاج لعام 2026 وفق الصفقات الميدانية المعتمدة:\n• **كورنيش النيل (الواجهة النيلية):** 28,000 - 36,000 ج.م/م²\n• **شرق سوهاج (شارع الجمهورية وسيتي):** 21,000 - 25,500 ج.م/م²\n• **سوهاج الجديدة (الكمبوندات والأحياء الحديثة):** 16,800 - 19,800 ج.م/م²\n• **المحلات التجارية (المواقع والمولات الحيوية):** 65,000 - 115,000 ج.م/م²',
    a_en: 'Official 2026 Sohag Benchmarks:\n• Nile Corniche: 28k - 36k EGP/sqm\n• East Sohag (El Gomhoreya / City): 21k - 25.5k EGP/sqm\n• New Sohag: 16.8k - 19.8k EGP/sqm\n• Commercial Retail: 65k - 115k EGP/sqm'
  },
  {
    tag: 'legal',
    q_ar: 'كيف أضمن الموقف القانوني للعقار وتراخيص البناء قبل الشراء؟',
    q_en: 'How to verify property legal status and building permits?',
    a_ar: 'في 1Line نتبع بروتوكول تدقيق ثلاثي صارم:\n1. **تسلسل الملكية المعتمد:** عقد مسجل شهر عقاري رسمي أو حكم صحة ونفاذ مشهر غير مطعون عليه.\n2. **رخصة البناء الإنشائية:** التأكد من وجود كروكي معتمد ومطابقة الدور للترخيص دون أدوار مخالفة.\n3. **شهادة التصالح النموذجية (نموذج 10 النهائي):** الصادرة من الإدارة الهندسية بالحي أو جهاز سوهاج الجديدة مع إيصالات سداد كافة الرسوم.',
    a_en: 'Strict 1Line 3-step legal audit: Registered Land Registry deed, official building permit matching the floor, and Form 10 reconciliation certificate.'
  },
  {
    tag: 'invest',
    q_ar: 'ما هي المشروعات والمجالات الأعلى عائداً استثمارياً في سوهاج؟',
    q_en: 'What are the highest yield real estate investments in Sohag?',
    a_ar: 'تتصدر **المساحات التجارية والعيادات الطبية في سوهاج الجديدة** قائمة العوائد الاستثمارية بعائد سنوي متوقع يتراوح بين **14.5% إلى 18.5%**، مدفوعة بافتتاح مجمعات البنوك، الجامعات الخاصة، ومحاور التنمية المركزية. تليها المقرات الإدارية في **شرق سوهاج** بعائد 13% سنوياً وسرعة إعادة تأجير فائقة.',
    a_en: 'Commercial retail and clinics in New Sohag deliver the highest yields (14.5% - 18.5% annually), followed by medical hubs in East Sohag.'
  }
];

export default function AIPropertyAdvisorModal({
  isOpen,
  onClose,
  lang = 'ar',
  onOpenCallbackModal
}) {
  const isAr = lang === 'ar';
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: isAr 
        ? 'أهلاً بك في منصة 1Line للاستشارات العقارية المعتمدة بسوهاج 🏛️.\nأنا مستشارك الذكي المباشر، ومزود بأحدث مؤشرات أسعار المتر، المشروعات الكبرى، وتدقيق الموقف القانوني لعام 2026. كيف أستطيع مساعدتك اليوم؟'
        : 'Welcome to 1Line Certified Real Estate Advisory in Sohag 🏛️. How can I assist you with market valuations, legal checks, or investment yields today?',
      time: 'الآن'
    }
  ]);
  const [userInput, setUserInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  if (!isOpen) return null;

  const handleSendMessage = (textToSend) => {
    const query = textToSend || userInput;
    if (!query.trim()) return;

    const userMsg = { sender: 'user', text: query, time: 'الآن' };
    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setUserInput('');
    setIsTyping(true);

    setTimeout(() => {
      const lower = query.toLowerCase();
      let reply = '';

      const matched = SOHAG_AI_KNOWLEDGE.find(k => 
        (lower.includes('متر') || lower.includes('سعر')) && k.tag === 'price' ||
        (lower.includes('ميزاني') || lower.includes('مليون') || lower.includes('قسط')) && k.tag === 'budget' ||
        (lower.includes('قانون') || lower.includes('شهر عقاري') || lower.includes('عقد') || lower.includes('تصالح') || lower.includes('ترخيص')) && k.tag === 'legal' ||
        (lower.includes('استثمار') || lower.includes('عائد') || lower.includes('ارباح') || lower.includes('تجاري') || lower.includes('مول')) && k.tag === 'invest'
      );

      if (matched) {
        reply = isAr ? matched.a_ar : matched.a_en;
      } else if (lower.includes('جديدة') || lower.includes('سوهاج الجديدة')) {
        reply = isAr
          ? 'سوهاج الجديدة هي الحصان الرابح للاستثمار العقاري في الصعيد لعام 2026. تتميز ببنية تحتية عالمية، مجمعات سكنية راقية، وفرص استثمارية تجارية بمقدمات تبدأ من 15% وفترات سداد حتى 7 سنوات.'
          : 'New Sohag is the prime investment hub for 2026 with rapid appreciation and modern gated communities.';
      } else if (lower.includes('شرق') || lower.includes('الجمهورية') || lower.includes('سيتي')) {
        reply = isAr
          ? 'منطقة شرق سوهاج (شارع الجمهورية، سيتي، والزهراء) هي أرقى مناطق سوهاج السكنية والتجارية وأكثرها طلباً. متوسط سعر المتر 21,000 - 25,500 ج.م للشقق السكنية، وتتميز بسرعة البيع وإمكانية التأجير الفوري.'
          : 'East Sohag remains the most prestigious and liquid residential district in Sohag.';
      } else if (lower.includes('بيع') || lower.includes('اعرض') || lower.includes('تقييم')) {
        reply = isAr
          ? 'إذا كنت ترغب في عرض عقارك للبيع أو الحصول على تقييم سوقي دقيق، يمكنك استخدام معالج التقييم الفوري بالموقع، أو إرسال تفاصيل الوحدة مباشرة لنقوم بتصويرها وعرضها على أكثر من 500 مشترٍ مسجل بدون عمولات على البائع.'
          : 'If you want to list or value a property, use our instant valuation engine or contact our sales team.';
      } else {
        reply = isAr
          ? 'شكراً لاستفسارك الكريم! مؤشرات سوق عقارات سوهاج لعام 2026 تتطلب في كثير من الأحيان دراسة محددة لموقع الوحدة ونوع التراخيص. يمكنك الضغط بالأسفل لجدولة استشارة VIP مجانية مع مستشارنا المعتمد أو المتابعة الفورية عبر واتساب.'
          : 'Thank you! For specific property valuations, our certified consultants are ready to assist you via WhatsApp or a VIP consultation call.';
      }

      setMessages(prev => [...prev, { sender: 'bot', text: reply, time: 'الآن' }]);
      setIsTyping(false);
    }, 500);
  };

  const handleTransferToWhatsApp = () => {
    const lastMsg = messages[messages.length - 1]?.text || 'استشارة عقارية';
    const cleanSnippet = lastMsg.replace(/[*#]/g, '').slice(0, 140);
    const msg = isAr 
      ? `مرحباً 1Line سوهاج، أود استكمال استشارتي العقارية بخصوص:\n"${cleanSnippet}..."\nمع مستشار عقاري متخصص.`
      : 'Hello 1Line Sohag, I would like to speak with a property consultant regarding my inquiry.';
    window.open(getWhatsAppUrl(msg), '_blank');
  };

  // Safe helper to render formatted text with bold tags without raw vulnerable HTML
  const renderFormattedText = (text) => {
    const lines = text.split('\n');
    return lines.map((line, lIdx) => {
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <span key={lIdx} style={{ display: 'block', marginBottom: lIdx < lines.length - 1 ? '4px' : 0 }}>
          {parts.map((part, pIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={pIdx} style={{ color: 'var(--accent-gold, #d97706)' }}>{part.slice(2, -2)}</strong>;
            }
            return <span key={pIdx}>{part}</span>;
          })}
        </span>
      );
    });
  };

  return (
    <div className="compare-drawer-backdrop" onClick={onClose}>
      <div className="ai-advisor-modal-card luxury-advisor-window" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="ai-advisor-header">
          <div className="flex-center gap-10">
            <div className="ai-bot-avatar" style={{ background: 'linear-gradient(135deg, #0b4ea2 0%, #1e3a8a 100%)' }}>
              <Building size={20} className="text-white" />
            </div>
            <div>
              <div className="flex-center gap-6">
                <h3 className="ai-title">{isAr ? 'مستشار 1Line العقاري المعتمد' : '1Line Certified Property Advisor'}</h3>
                <span className="ai-live-badge" style={{ background: '#10b981' }}>{isAr ? 'حي ومباشر' : 'Live'}</span>
              </div>
              <span className="ai-status-sub">
                {isAr ? 'رؤية دقيقة لمؤشرات سوق سوهاج 2026 • فحص وتدقيق قانوني' : 'Certified Market Insights & Legal Due Diligence'}
              </span>
            </div>
          </div>

          <button type="button" className="drawer-close-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Quick Question Prompts Strip */}
        <div className="ai-quick-prompts-strip">
          {SOHAG_AI_KNOWLEDGE.map((item, idx) => (
            <button
              key={idx}
              type="button"
              className="ai-prompt-pill"
              onClick={() => handleSendMessage(isAr ? item.q_ar : item.q_en)}
            >
              <Sparkles size={12} className="text-gold" />
              <span>{isAr ? item.q_ar : item.q_en}</span>
            </button>
          ))}
        </div>

        {/* Chat Messages Body */}
        <div className="ai-chat-body">
          {messages.map((msg, index) => (
            <div key={index} className={`ai-message-row ${msg.sender === 'user' ? 'user-side' : 'bot-side'}`}>
              {msg.sender === 'bot' && (
                <div className="msg-bot-avatar" style={{ background: 'var(--primary, #071e3d)' }}>
                  <Building size={14} className="text-gold" />
                </div>
              )}
              <div className={`msg-bubble ${msg.sender === 'user' ? 'user-bubble' : 'bot-bubble'}`}>
                <div className="msg-text-content">
                  {renderFormattedText(msg.text)}
                </div>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="ai-message-row bot-side">
              <div className="msg-bot-avatar" style={{ background: 'var(--primary, #071e3d)' }}>
                <Building size={14} className="text-gold" />
              </div>
              <div className="msg-bubble bot-bubble typing-dots">
                <span></span><span></span><span></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Action Bar: Book VIP Call / WhatsApp escalation */}
        <div style={{
          display: 'flex',
          gap: '8px',
          padding: '8px 16px',
          background: 'rgba(15, 23, 42, 0.03)',
          borderTop: '1px solid rgba(148, 163, 184, 0.15)'
        }}>
          {onOpenCallbackModal && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenCallbackModal();
              }}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '8px 12px',
                borderRadius: '8px',
                background: 'rgba(217, 119, 6, 0.1)',
                color: 'var(--accent-gold, #d97706)',
                border: '1px solid rgba(217, 119, 6, 0.3)',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <PhoneCall size={14} />
              <span>{isAr ? 'حجز جلسة استشارة VIP مجانية' : 'Book Free VIP Call'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleTransferToWhatsApp}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '8px 12px',
              borderRadius: '8px',
              background: '#25D366',
              color: '#ffffff',
              border: 'none',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <span>{isAr ? 'متابعة مع المستشار عبر واتساب' : 'Chat on WhatsApp'}</span>
            {isAr ? <ArrowLeft size={14} /> : <ArrowRight size={14} />}
          </button>
        </div>

        {/* Footer Chat Input */}
        <div className="ai-chat-footer">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} 
            className="ai-input-form-row"
          >
            <input
              type="text"
              className="ai-chat-input"
              placeholder={isAr ? 'اسأل عن أسعار المتر، التراخيص، أو أفضل مناطق سوهاج...' : 'Ask about prices, legal checks, or districts...'}
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
            />
            <button type="submit" className="ai-send-btn" disabled={!userInput.trim()} aria-label="Send">
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
