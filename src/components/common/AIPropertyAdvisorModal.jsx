import { useState, useRef, useEffect } from 'react';
import { Building, Sparkles, X, Send, PhoneCall, ArrowRight, ArrowLeft } from 'lucide-react';
import { getWhatsAppUrl } from '../../utils/founderCmsData';
import { getAreas } from '../../utils/areasData';
import { areaMarketStats, budgetMatches } from '../../utils/marketStats';

// Questions with fixed, honest answers. Price and budget answers are computed from the listings
// published right now (utils/marketStats), never typed-in market figures.
const FAQ = [
  { tag: 'budget', q_ar: 'إيه المتاح بميزانية لحد 3 مليون؟', q_en: 'What is available up to 3M EGP?' },
  { tag: 'price', q_ar: 'متوسط سعر المتر في كل منطقة كام؟', q_en: 'Average price per m² by district?' },
  { tag: 'legal', q_ar: 'أتأكد من الموقف القانوني إزاي قبل الشراء؟', q_en: 'How do I check the legal status before buying?' },
  { tag: 'invest', q_ar: 'أشتري للاستثمار ولا للسكن؟ أبدأ منين؟', q_en: 'Buying to invest — where do I start?' },
];

export default function AIPropertyAdvisorModal({
  isOpen,
  onClose,
  lang = 'ar',
  onOpenCallbackModal,
  properties = []
}) {
  const isAr = lang === 'ar';
  const areas = getAreas();
  const areaName = (id) => {
    const a = areas.find((x) => x.id === id);
    return a ? (isAr ? a.name_ar : a.name_en || a.name_ar) : id;
  };
  const n = (v) => Number(v || 0).toLocaleString('en-US');
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: isAr 
        ? 'أهلاً بيك 👋 دي إجابات جاهزة لأكتر الأسئلة اللي بتوصلنا، والأسعار فيها محسوبة من العقارات المعروضة على الموقع دلوقتي. لأي سؤال خاص بوحدة معينة، كلّم حد من الفريق من الزرار تحت.'
        : 'Hi 👋 These are ready answers to common questions; prices come from the listings on the site right now. For anything about a specific unit, talk to the team using the button below.',
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
      const stats = areaMarketStats(properties);
      const asked = (words) => words.some((w) => lower.includes(w));
      let reply = '';

      // A district named in the question → that district's figures from current listings
      const namedArea = stats.find((st) => {
        const a = areas.find((x) => x.id === st.areaId);
        return a && [a.name_ar, a.name_en, a.label_ar].filter(Boolean).some((nm) => lower.includes(String(nm).toLowerCase()));
      });

      if (namedArea) {
        const r = namedArea.residential;
        const c = namedArea.commercial;
        reply = isAr
          ? `**${areaName(namedArea.areaId)}** — من العروض الحالية على الموقع (${n(namedArea.total)} عرض):\n`
            + (r.medianPpm ? `• السكني: وسيط سعر المتر ${n(r.medianPpm)} ج.م (من ${r.ppmSample} عرض)\n` : '')
            + (c.medianPpm ? `• التجاري: وسيط سعر المتر ${n(c.medianPpm)} ج.م (من ${c.ppmSample} عرض)\n` : '')
            + 'دي أسعار معروضة مش أسعار بيع نهائية.'
          : `${areaName(namedArea.areaId)}: ${n(namedArea.total)} current listings. Homes median ${n(r.medianPpm)} EGP/m²; commercial ${n(c.medianPpm)} EGP/m² (asking prices).`;
      } else if (asked(['متر', 'سعر', 'price', 'sqm', 'm²'])) {
        const rows = stats.filter((st) => st.residential.medianPpm || st.commercial.medianPpm).slice(0, 6);
        reply = rows.length
          ? (isAr
            ? 'وسيط سعر المتر من العروض الحالية على الموقع:\n' + rows.map((st) => `• **${areaName(st.areaId)}:** ${st.residential.medianPpm ? `سكني ${n(st.residential.medianPpm)}` : ''}${st.residential.medianPpm && st.commercial.medianPpm ? ' • ' : ''}${st.commercial.medianPpm ? `تجاري ${n(st.commercial.medianPpm)}` : ''} ج.م/م²`).join('\n') + '\nدي أسعار معروضة، وبتتغير مع العروض. التفاصيل في صفحة "أسعار المتر".'
            : rows.map((st) => `${areaName(st.areaId)}: homes ${n(st.residential.medianPpm)} / commercial ${n(st.commercial.medianPpm)} EGP/m²`).join('\n'))
          : (isAr ? 'لسه مفيش عروض كفاية على الموقع نحسب منها متوسط سعر المتر. كلّم الفريق ونبعتلك أسعار حقيقية للمنطقة اللي محتاجها.' : 'Not enough listings yet to compute averages; ask the team for real prices.');
      } else if (asked(['ميزاني', 'مليون', 'budget', 'قسط', 'أقساط'])) {
        const digits = (query.match(/[\d.,٠-٩]+/) || [''])[0].replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/,/g, '');
        const num = Number(digits) || 0;
        const budget = num > 0 && num < 1000 ? num * 1e6 : (num || 3e6);
        const m = budgetMatches(properties, budget);
        reply = isAr
          ? `في حدود **${n(budget)} ج.م** فيه دلوقتي **${n(m.count)} عقار** معروض على الموقع`
            + (m.areas.length ? `، أغلبهم في: ${m.areas.slice(0, 3).map(([id, c]) => `${areaName(id)} (${c})`).join('، ')}.` : '.')
            + '\nتقدر تشوفهم من صفحة العقارات بفلتر السعر، أو تسجّل طلبك ونبلغك أول ما ينزل المناسب.'
          : `${n(m.count)} listings within ${n(budget)} EGP right now.`;
      } else if (asked(['قانون', 'شهر عقاري', 'عقد', 'تصالح', 'ترخيص', 'legal'])) {
        reply = isAr
          ? 'قبل ما تدفع أي مبلغ اتأكد من:\n1. **تسلسل الملكية:** عقد مسجل أو حكم صحة ونفاذ.\n2. **رخصة البناء:** والدور مطابق للترخيص.\n3. **التصالح:** لو فيه مخالفات، نموذج التصالح النهائي وإيصالات السداد.\nلكل عقار على الموقع فيه خانة "الموقف القانوني" بتوضح اللي اتراجع فعلاً واللي لسه. وننصحك تراجع المستندات مع محاميك.'
          : 'Before paying anything check the title chain, the building licence and any reconciliation papers. Each listing shows what has actually been reviewed. Have your own lawyer check the documents.';
      } else if (asked(['استثمار', 'عائد', 'ارباح', 'أرباح', 'تجاري', 'invest'])) {
        reply = isAr
          ? 'مفيش رقم عائد ثابت نقدر نوعدك بيه — العائد بيتحدد بالموقع والإيجار الفعلي وحالة الوحدة. الأحسن:\n• حدد نوع الوحدة (سكني/تجاري) والمنطقة.\n• اطلب إيجارات مقارنة فعلية في نفس الشارع.\n• قارن سعر المتر بالوسيط في صفحة "أسعار المتر".'
          : 'There is no fixed return we can promise; it depends on location, real rents and condition. Ask for comparable rents and compare the price per m² with the district median.';
      } else if (asked(['بيع', 'اعرض', 'تقييم', 'sell'])) {
        reply = isAr
          ? 'لو عايز تعرض عقارك أو تعرف سعره: استخدم معالج البيع في الموقع، أو ابعتلنا التفاصيل على واتساب ونراجعها ونرد عليك.'
          : 'To list or value your property, use the sell wizard or send us the details on WhatsApp.';
      } else {
        reply = isAr
          ? 'معنديش إجابة جاهزة للسؤال ده. كلّم حد من الفريق من الزرار تحت وهيرد عليك.'
          : 'I do not have a ready answer for that. Use the button below to talk to the team.';
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
            <div className="ai-bot-avatar">
              <Building size={20} style={{ color: '#D4AF37' }} />
            </div>
            <div>
              <div className="flex-center gap-6">
                <h3 className="ai-title">{isAr ? 'أسئلة شائعة عن الشراء في سوهاج' : 'Common questions about buying in Sohag'}</h3>
              </div>
              <span className="ai-status-sub">
                {isAr ? 'إجابات جاهزة • الأسعار من العروض الحالية' : 'Ready answers • prices from current listings'}
              </span>
            </div>
          </div>

          <button type="button" className="drawer-close-btn" onClick={onClose} aria-label="إغلاق">
            <X size={20} />
          </button>
        </div>

        {/* Quick Question Prompts Strip */}
        <div className="ai-quick-prompts-strip">
          {FAQ.map((item, idx) => (
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
          padding: '10px 16px',
          background: 'rgba(10, 25, 47, 0.04)',
          borderTop: '1px solid rgba(197, 160, 89, 0.2)'
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
                padding: '9px 12px',
                borderRadius: '8px',
                background: 'rgba(212, 175, 55, 0.1)',
                color: '#D4AF37',
                border: '1px solid rgba(212, 175, 55, 0.35)',
                fontSize: '0.82rem',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <PhoneCall size={14} />
              <span>{isAr ? 'اطلب مكالمة من الفريق' : 'Request a call'}</span>
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
              background: '#128C4A',
              color: '#ffffff',
              border: 'none',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <span>{isAr ? 'كلّم الفريق على واتساب' : 'Chat on WhatsApp'}</span>
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
            <button type="submit" className="ai-send-btn" disabled={!userInput.trim()} aria-label="إرسال">
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
