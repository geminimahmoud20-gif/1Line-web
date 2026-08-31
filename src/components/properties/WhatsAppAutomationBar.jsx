import { useState } from 'react';
import { Download, MessageSquare, Share2, Check, Sparkles } from 'lucide-react';
import { generatePropertyPdf } from '../../utils/pdfBrochure';

export default function WhatsAppAutomationBar({ property, lang = 'ar', triggerToast, onOpenStoryCard }) {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [copied, setCopied] = useState(false);

  const isAr = lang === 'ar';
  const title = isAr ? property.title_ar : property.title_en;
  const location = isAr ? property.locationName_ar : property.locationName_en;
  const priceFormatted = `${property.price.toLocaleString()} ${isAr ? 'ج.م' : 'EGP'}`;
  const downPaymentFormatted = `${property.downPayment?.toLocaleString() || 0} ${isAr ? 'ج.م' : 'EGP'}`;
  const monthlyFormatted = `${property.monthlyInstallment?.toLocaleString() || 0} ${isAr ? 'ج.م' : 'EGP'}`;
  const legalId = property.legalStatus?.inspectionReportId || `LAW-SOH-${property.id.toUpperCase()}`;

  // Formatted WhatsApp Message for Client
  const whatsAppText = isAr
    ? `*🏛️ تفاصيل العقار من منصة ون لاين بسوهاج*
----------------------------------------
📌 *العقار:* ${title}
📍 *الموقع:* ${location}
💰 *السعر الإجمالي:* ${priceFormatted}
💵 *المقدم المطلوب:* ${downPaymentFormatted}
🗓️ *القسط الشهري:* ${monthlyFormatted}
📐 *المساحة:* ${property.size} متر مربع (${property.bedrooms || 0} غرف نوم)
🛡️ *كود الفحص والضمان القانوني:* ${legalId} (100% مسجل ومرخص)
----------------------------------------
🔗 *رابط العقار والبروشور:* ${window.location.href}
📞 *للحجز والمعاينة الفورية:* 01012345678`
    : `*🏛️ Property Details - One Line Sohag*
----------------------------------------
📌 *Listing:* ${title}
📍 *Location:* ${location}
💰 *Price:* ${priceFormatted}
💵 *Downpayment:* ${downPaymentFormatted}
🗓️ *Monthly Installment:* ${monthlyFormatted}
📐 *Area:* ${property.size} sqm (${property.bedrooms || 0} Beds)
🛡️ *Legal Audit ID:* ${legalId} (100% Verified)
----------------------------------------
🔗 *Link:* ${window.location.href}
📞 *Viewing & Inquiry:* +20 101 234 5678`;

  // 1. Download PDF Brochure Handler
  const handleDownloadPdf = () => {
    setIsGeneratingPdf(true);
    try {
      generatePropertyPdf(property, lang);
      if (triggerToast) {
        triggerToast(isAr ? 'تم تجهيز وتنزيل بروشور العقار PDF بنجاح!' : 'PDF Brochure downloaded successfully!', 'success');
      }
    } catch (err) {
      console.error('PDF generation error:', err);
      if (triggerToast) {
        triggerToast(isAr ? 'حدث خطأ أثناء تنزيل البروشور' : 'Error generating PDF', 'error');
      }
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // 2. Direct WhatsApp Broadcast
  const handleWhatsAppDirect = () => {
    const waUrl = `https://wa.me/201012345678?text=${encodeURIComponent(whatsAppText)}`;
    window.open(waUrl, '_blank');
  };

  // 3. Copy Formatted Message
  const handleCopyText = () => {
    navigator.clipboard.writeText(whatsAppText);
    setCopied(true);
    if (triggerToast) {
      triggerToast(isAr ? 'تم نسخ تفاصيل العقار بصيغة واتساب الاحترافية' : 'Property details copied for WhatsApp!', 'success');
    }
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="whatsapp-automation-bar-card">
      <div className="wa-bar-header">
        <div className="wa-bar-titles">
          <div className="wa-icon-glow">
            <MessageSquare size={20} className="text-white" />
          </div>
          <div>
            <h4>{isAr ? 'الربط التلقائي والبروشور والستوري الذكي' : 'WhatsApp Automation & Story Generator'}</h4>
            <p>{isAr ? 'حمّل ملف الـ PDF أو بطاقة الستوري لإنستجرام أو أرسل المواصفات لواتسابك مباشرة' : 'Download PDF, generate 9:16 story, or send to WhatsApp'}</p>
          </div>
        </div>
      </div>

      <div className="wa-bar-actions-row">
        {/* PDF Download Button */}
        <button
          type="button"
          className="btn btn-download-pdf"
          onClick={handleDownloadPdf}
          disabled={isGeneratingPdf}
        >
          <Download size={16} />
          <span>{isGeneratingPdf ? (isAr ? 'جاري الإنشاء...' : 'Generating...') : (isAr ? 'تحميل بروشور PDF' : 'Download PDF')}</span>
        </button>

        {/* Social Story Card Button */}
        {onOpenStoryCard && (
          <button
            type="button"
            className="btn btn-story-card"
            onClick={onOpenStoryCard}
          >
            <Sparkles size={16} />
            <span>{isAr ? 'بطاقة ستوري (9:16)' : 'Story Card'}</span>
          </button>
        )}

        {/* Send to WhatsApp Button */}
        <button
          type="button"
          className="btn btn-whatsapp-direct"
          onClick={handleWhatsAppDirect}
        >
          <MessageSquare size={16} />
          <span>{isAr ? 'إرسال لواتسابي' : 'WhatsApp'}</span>
        </button>

        {/* Copy Text Button */}
        <button
          type="button"
          className="btn btn-copy-wa"
          onClick={handleCopyText}
          title={isAr ? 'نسخ نص الرسالة' : 'Copy Message'}
        >
          {copied ? <Check size={16} className="text-success" /> : <Share2 size={16} />}
          <span>{copied ? (isAr ? 'تم النسخ' : 'Copied') : (isAr ? 'نسخ' : 'Copy')}</span>
        </button>
      </div>
    </div>
  );
}
