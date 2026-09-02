import React, { useState } from 'react';
import { 
  Bot, 
  Sparkles, 
  X, 
  Send, 
  MessageSquare, 
  TrendingUp, 
  MapPin, 
  ShieldCheck, 
  Building, 
  DollarSign,
  ChevronRight,
  ExternalLink
} from 'lucide-react';

export const SOHAG_AI_KNOWLEDGE = [
  {
    q_ar: 'ما هي أفضل منطقة للشراء بميزانية 2 مليون ج.م؟',
    q_en: 'Best area for a 2M EGP budget?',
    a_ar: 'بميزانية 2 مليون ج.م، ننصحك بالتوجه فوراً إلى **سوهاج الجديدة (الحي الأول أو الثاني)** حيث يمكنك شراء شقة فاخرة 140-160م² تشطيب سوبر لوكس أو في كمبوند تحت الإنشاء بمقدم 20% وأقساط تصل إلى 5 سنوات. كما يمكنك البحث في منطقة **حي الكوثر** لمساحات أكبر وعوائد إيجارية ممتازة.',
    tag: 'budget'
  },
  {
    q_ar: 'كم متوسط سعر المتر السكني والتجاري بسوهاج 2026؟',
    q_en: 'Average price per sqm in Sohag?',
    a_ar: 'متوسطات أسعار المتر في سوهاج لعام 2026:\n• **كورنيش النيل:** 28,000 - 35,000 ج.م/م²\n• **شرق سوهاج (الجمهورية وسيتي):** 20,000 - 24,000 ج.م/م²\n• **سوهاج الجديدة:** 16,500 - 19,500 ج.م/م²\n• **المحلات التجارية (مواقع رئيسية):** 60,000 - 110,000 ج.م/م²',
    tag: 'price'
  },
  {
    q_ar: 'كيف أضمن الموقف القانوني للعقار قبل الشراء؟',
    q_en: 'How to verify property legal status?',
    a_ar: 'تأكد دائماً من 3 مستندات أساسية:\n1. **تسلسل الملكية:** عقد مسجل شهر عقاري أو حكم صحة ونفاذ نهائي.\n2. **ترخيص البناء الرسمي:** والتأكد من مطابقة الدور للترخيص بدون مخالفات.\n3. **شهادة سداد التصالح (نموذج 10):** إن كان العقار به تصالح معتمد من جهاز المدينة أو الحي.',
    tag: 'legal'
  },
  {
    q_ar: 'ما هي أعلى المشروعات عائداً استثمارياً في سوهاج؟',
    q_en: 'Top high-yield projects in Sohag?',
    a_ar: 'المشروعات التجارية والمولات على المحاور الرئيسية في **سوهاج الجديدة** تحقق حالياً أعلى عائد إيجاري يصل إلى **15.5% - 18% سنوياً**، تليها العيادات والمقرات الطبية في منطقة **شرق سوهاج** بعائد 13.5% سنوياً.',
    tag: 'invest'
  }
];

export default function AIPropertyAdvisorModal({
  isOpen,
  onClose,
  lang = 'ar'
}) {
  const isAr = lang === 'ar';
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: isAr 
        ? 'مرحباً بك! أنا مستشارك العقاري الذكي في سوهاج 🤖🏠. يسعدني مساعدتك في حساب الأسعار، اختيار أفضل الأحياء، وتقديم المشورة الاستثمارية والقانونية. كيف يمكنني مساعدتك اليوم؟'
        : 'Welcome! I am your Sohag AI Real Estate Advisor 🤖🏠. How can I assist you with prices, district insights, or investments today?',
      time: 'الآن'
    }
  ]);
  const [userInput, setUserInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  if (!isOpen) return null;

  const handleSendMessage = (textToSend) => {
    const query = textToSend || userInput;
    if (!query.trim()) return;

    const userMsg = { sender: 'user', text: query, time: 'الآن' };
    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setUserInput('');
    setIsTyping(true);

    setTimeout(() => {
      // Find matching knowledge or generate intelligent Sohag advice
      const lower = query.toLowerCase();
      let reply = '';

      const matched = SOHAG_AI_KNOWLEDGE.find(k => 
        lower.includes('متر') || lower.includes('سعر') && k.tag === 'price' ||
        lower.includes('ميزاني') || lower.includes('مليون') && k.tag === 'budget' ||
        lower.includes('قانون') || lower.includes('شهر عقاري') || lower.includes('عقد') && k.tag === 'legal' ||
        lower.includes('استثمار') || lower.includes('عائد') || lower.includes('ارباح') && k.tag === 'invest'
      );

      if (matched) {
        reply = isAr ? matched.a_ar : matched.q_en;
      } else if (lower.includes('جديدة') || lower.includes('سوهاج الجديدة')) {
        reply = isAr
          ? 'سوهاج الجديدة هي الحصان الرابح للاستثمار العقاري في الصعيد لعام 2026. تتميز ببنية تحتية عالمية، جامعات، وأضخم مجمعات سكنية وتجارية. متوسط سعر المتر السكني يتراوح بين 16,500 إلى 19,500 ج.م مع خطط تقسيط تصل لـ 7 سنوات.'
          : 'New Sohag is the prime investment hub for 2026 with rapid capital appreciation and modern gated communities.';
      } else if (lower.includes('شرق') || lower.includes('الجمهورية') || lower.includes('سيتي')) {
        reply = isAr
          ? 'منطقة شرق سوهاج (شارع الجمهورية، سيتي، والزهراء) هي أرقى مناطق سوهاج السكنية والتجارية وأكثرها طلباً. متوسط سعر المتر 20,000 - 24,000 ج.م للشقق السكنية، وتتميز بسرعة البيع وإمكانية التأجير الفوري.'
          : 'East Sohag remains the most prestigious and liquid residential district in Sohag.';
      } else {
        reply = isAr
          ? `شكراً لاستفسارك! بناءً على مؤشرات سوق عقارات سوهاج الحالية: يمكن لفريق 1Line تزويدك بقائمة مخصصة ومطابقة لطلبك تماماً مع فحص قانوني مجاني. يمكنك أيضاً الضغط بالأسفل للتواصل المباشر مع استشاري مبيعات 1Line.`
          : 'Thank you! Our advisory team is ready to provide tailored units and legal verification.';
      }

      setMessages(prev => [...prev, { sender: 'bot', text: reply, time: 'الآن' }]);
      setIsTyping(false);
    }, 700);
  };

  const handleTransferToWhatsApp = () => {
    const lastMsg = messages[messages.length - 1]?.text || 'استشارة عقارية';
    const msg = isAr 
      ? `مرحباً 1Line، كنت أتحدث مع المستشار الذكي في الموقع بخصوص:\n"${lastMsg.slice(0, 120)}..."\nوأرغب في استكمال الاستشارة مع مستشار عقاري متخصص.`
      : 'Hello 1Line, I would like to speak with a human property consultant regarding my inquiry.';
    window.open(`https://wa.me/201012345678?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="compare-drawer-backdrop" onClick={onClose}>
      <div className="ai-advisor-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="ai-advisor-header">
          <div className="flex-center gap-10">
            <div className="ai-bot-avatar">
              <Bot size={22} className="text-gold" />
            </div>
            <div>
              <div className="flex-center gap-6">
                <h3 className="ai-title">{isAr ? 'مستشارك العقاري الذكي' : 'Sohag AI Property Advisor'}</h3>
                <span className="ai-live-badge">AI 2.0</span>
              </div>
              <span className="ai-status-sub">{isAr ? 'متصل الآن • مدرب على بيانات سوق سوهاج 2026' : 'Online • Trained on Sohag Real Estate Data'}</span>
            </div>
          </div>

          <button type="button" className="drawer-close-btn" onClick={onClose}>
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
              onClick={() => handleSendMessage(item.q_ar)}
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
                <div className="msg-bot-avatar"><Bot size={16} /></div>
              )}
              <div className={`msg-bubble ${msg.sender === 'user' ? 'user-bubble' : 'bot-bubble'}`}>
                <div className="msg-text-content" dangerouslySetInnerHTML={{ 
                  __html: msg.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>') 
                }} />
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="ai-message-row bot-side">
              <div className="msg-bot-avatar"><Bot size={16} /></div>
              <div className="msg-bubble bot-bubble typing-dots">
                <span></span><span></span><span></span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Chat Input & WhatsApp Escalate */}
        <div className="ai-chat-footer">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} 
            className="ai-input-form-row"
          >
            <input
              type="text"
              placeholder={isAr ? 'اسأل المستشار الذكي عن الأسعار، المناطق، أو الاستثمار...' : 'Ask about prices, compounds, ROI...'}
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              className="ai-chat-input"
            />
            <button type="submit" className="ai-send-btn" disabled={!userInput.trim()}>
              <Send size={16} />
            </button>
          </form>

          <div className="ai-escalate-strip">
            <button type="button" className="btn-escalate-whatsapp" onClick={handleTransferToWhatsApp}>
              <MessageSquare size={14} />
              <span>{isAr ? 'استكمال الاستشارة مع خبير 1Line عبر الواتساب' : 'Chat with Human Consultant on WhatsApp'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
