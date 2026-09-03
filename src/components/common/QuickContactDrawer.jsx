import { useState, useEffect } from 'react';
import { Phone, MessageSquare, ShieldCheck, Clock, X, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { 
  getFounderSettings, 
  getWhatsAppUrl, 
  getPhoneCallUrl, 
  cleanPhoneNumber 
} from '../../utils/founderCmsData';

export default function QuickContactDrawer({
  isOpen,
  onClose,
  onOpenCallbackModal,
  lang = 'ar'
}) {
  const isAr = lang === 'ar';
  const [cms, setCms] = useState(() => getFounderSettings());

  useEffect(() => {
    const handleUpdate = () => setCms(getFounderSettings());
    window.addEventListener('oneline_founder_cms_updated', handleUpdate);
    return () => window.removeEventListener('oneline_founder_cms_updated', handleUpdate);
  }, []);

  if (!isOpen) return null;

  const currentPhone = cleanPhoneNumber(cms.phoneNumber || '+201223222956');

  const handleWhatsAppSales = () => {
    const text = isAr 
      ? 'مرحباً، أريد التواصل مع مستشار مبيعات 1Line للاستفسار عن العقارات المتاحة بسوهاج.' 
      : 'Hello, I would like to connect with a 1Line sales advisor regarding available properties in Sohag.';
    window.open(getWhatsAppUrl(text), '_blank');
    onClose();
  };

  const handleWhatsAppVip = () => {
    const text = isAr 
      ? 'مرحباً، أنا مستثمر / مغترب وأريد التواصل مع مكتب كبار العملاء (VIP Desk).' 
      : 'Hello, I am an investor / expat looking for the VIP Investment Desk.';
    window.open(getWhatsAppUrl(text), '_blank');
    onClose();
  };

  return (
    <div className="mobile-filter-backdrop" onClick={onClose}>
      <div className="quick-contact-drawer-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="drawer-header-strip">
          <div className="drawer-header-title">
            <Sparkles size={18} className="text-gold" />
            <h3>{isAr ? 'قنوات التواصل السريع الفوري' : 'Instant Direct Contact'}</h3>
          </div>
          <button type="button" className="drawer-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Channels List */}
        <div className="quick-contact-channels-list">
          {/* 1. Direct Phone Call */}
          <a href={getPhoneCallUrl()} className="contact-channel-item channel-call" onClick={onClose}>
            <div className="channel-icon-circle bg-blue">
              <Phone size={22} />
            </div>
            <div className="channel-info-text">
              <div className="channel-title-badge">
                <strong>{isAr ? 'اتصال هاتفي مباشر (الخط الساخن)' : 'Direct Hot-Line Call'}</strong>
                <span className="live-status-pill">{isAr ? 'متاح الآن' : 'Active'}</span>
              </div>
              <span className="channel-sub">{currentPhone} - {isAr ? 'مستشارونا متاحون للرد الفوري' : 'Our advisors are ready'}</span>
            </div>
            {isAr ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </a>

          {/* 2. WhatsApp Sales Chat */}
          <button type="button" className="contact-channel-item channel-wa" onClick={handleWhatsAppSales}>
            <div className="channel-icon-circle bg-green">
              <MessageSquare size={22} />
            </div>
            <div className="channel-info-text">
              <div className="channel-title-badge">
                <strong>{isAr ? 'محادثة واتساب مبيعات سوهاج' : 'Sohag Sales WhatsApp'}</strong>
                <span className="fast-reply-pill">{isAr ? 'رد خلال 60 ثانية' : 'Fast Reply'}</span>
              </div>
              <span className="channel-sub">{isAr ? 'إرسال صور وتفاصيل العقارات المتاحة فوراً' : 'Instant property specs & photos'}</span>
            </div>
            {isAr ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>

          {/* 3. VIP Expat & Investors Desk */}
          <button type="button" className="contact-channel-item channel-vip" onClick={handleWhatsAppVip}>
            <div className="channel-icon-circle bg-gold">
              <ShieldCheck size={22} />
            </div>
            <div className="channel-info-text">
              <div className="channel-title-badge">
                <strong>{isAr ? 'مكتب المستثمرين والمغتربين (VIP Desk)' : 'VIP Expat & Investor Desk'}</strong>
              </div>
              <span className="channel-sub">{isAr ? 'فرص استثمارية وحصص تجارية بعوائد دولارية' : 'High ROI commercial & residential portfolios'}</span>
            </div>
            {isAr ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>

          {/* 4. Instant 60-Sec Callback Request */}
          <button
            type="button"
            className="contact-channel-item channel-callback"
            onClick={() => {
              onClose();
              if (onOpenCallbackModal) onOpenCallbackModal();
            }}
          >
            <div className="channel-icon-circle bg-purple">
              <Clock size={22} />
            </div>
            <div className="channel-info-text">
              <div className="channel-title-badge">
                <strong>{isAr ? 'طلب معاودة الاتصال بي فوراً' : 'Request 60-Sec Callback'}</strong>
              </div>
              <span className="channel-sub">{isAr ? 'اترك رقمك وسيتصل بك مستشارنا خلال دقائق' : 'Leave your number and we will call you'}</span>
            </div>
            {isAr ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>
        </div>

        {/* Footer Guarantee */}
        <div className="contact-drawer-footer-note">
          <ShieldCheck size={14} className="text-gold" />
          <span>{isAr ? 'خدمة عملاء معتمدة ومجانية 100% من منصة 1Line العقارية' : '100% Free Consultation by 1Line Real Estate'}</span>
        </div>
      </div>
    </div>
  );
}

