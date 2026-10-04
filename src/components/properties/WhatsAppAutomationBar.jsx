import { useState } from 'react';
import { FileText, Share2, Check, Sparkles } from 'lucide-react';
import { brochureRequestUrl, trackBrochureRequest } from '../../utils/brochure/requestBrochure';
import { getWhatsAppUrl, getDynamicPhone } from '../../utils/founderCmsData';
import { formatCurrencyPrice, getPriceBenchmark } from '../../utils/currencyAndBenchmark';
import '../../styles/expat-suite.css';

const WaIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="currentColor">
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm5.8 14.13c-.24.68-1.42 1.3-1.95 1.35-.5.05-.97.23-3.27-.68-2.77-1.09-4.52-3.93-4.66-4.11-.13-.18-1.1-1.47-1.1-2.8 0-1.33.7-1.99.95-2.26.25-.27.54-.34.72-.34h.52c.17 0 .39-.06.61.47.24.56.8 1.94.87 2.08.07.14.12.3.02.48-.09.18-.14.3-.27.46-.14.16-.29.36-.41.48-.14.14-.28.29-.12.56.16.27.71 1.17 1.52 1.9 1.05.93 1.93 1.22 2.2 1.36.27.14.43.11.59-.07.16-.18.68-.79.86-1.07.18-.27.36-.23.61-.14.25.09 1.59.75 1.86.89.27.14.45.2.52.32.07.11.07.66-.17 1.33Z" />
  </svg>
);

/**
 * Share toolbar under the gallery: brochure request on WhatsApp, 9:16 story card, WhatsApp and native share.
 * The shared text only states facts the listing actually carries.
 */
export default function WhatsAppAutomationBar({ property, lang = 'ar', currency = 'EGP', triggerToast, onOpenStoryCard }) {
  const [copied, setCopied] = useState(false);

  const isAr = lang === 'ar';
  const title = isAr ? property.title_ar : property.title_en;
  const location = isAr ? property.locationName_ar : property.locationName_en;
  const priceData = formatCurrencyPrice(property.price, currency, lang);
  const benchmark = getPriceBenchmark(property, lang);
  const fmt = (n) => (Number(n) || 0).toLocaleString('en-US');

  const priceFormatted = `${priceData.primary} ${priceData.symbol}${priceData.approx ? ` (${priceData.approx})` : ''}`;
  const hasPlan = Number(property.monthlyInstallment) > 0;
  const dynamicPhone = getDynamicPhone();
  const url = typeof window !== 'undefined' ? window.location.href : '';
  // Legal line only when the listing has a legal record — no blanket "100% verified" claims
  const legal = property.legalStatus
    ? (isAr ? property.legalStatus.ownershipType_ar : property.legalStatus.ownershipType_en || property.legalStatus.ownershipType_ar)
    : '';

  const lines = isAr
    ? [
      '*🏛️ تفاصيل العقار من 1Line*',
      `📌 *العقار:* ${title}`,
      `📍 *الموقع:* ${location}`,
      `💰 *السعر:* ${priceFormatted}`,
      benchmark ? `📊 *مقارنة بالحي:* ${benchmark.badgeLabel}` : null,
      hasPlan ? `💵 *المقدم:* ${fmt(property.downPayment)} ج.م — *القسط:* ${fmt(property.monthlyInstallment)} ج.م شهرياً` : '💵 *السداد:* كاش',
      `📐 *المساحة:* ${property.size} م²${property.bedrooms ? ` — ${property.bedrooms} غرف` : ''}`,
      legal ? `🛡️ *الموقف القانوني:* ${legal}` : null,
      `🔗 ${url}`,
      `📞 للمعاينة: ${dynamicPhone}`
    ]
    : [
      '*🏛️ Property details — 1Line*',
      `📌 *Listing:* ${title}`,
      `📍 *Location:* ${location}`,
      `💰 *Price:* ${priceFormatted}`,
      benchmark ? `📊 *District comparison:* ${benchmark.badgeLabel}` : null,
      hasPlan ? `💵 *Down:* ${fmt(property.downPayment)} EGP — *Monthly:* ${fmt(property.monthlyInstallment)} EGP` : '💵 *Payment:* cash',
      `📐 *Area:* ${property.size} m²${property.bedrooms ? ` — ${property.bedrooms} beds` : ''}`,
      legal ? `🛡️ *Legal status:* ${legal}` : null,
      `🔗 ${url}`,
      `📞 Viewings: ${dynamicPhone}`
    ];
  const shareText = lines.filter(Boolean).join('\n');

  const handleWhatsApp = () => window.open(getWhatsAppUrl(shareText), '_blank', 'noopener');

  // Native share sheet on phones; copy as a fallback
  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, text: shareText.replace(`🔗 ${url}\n`, ''), url });
        return;
      } catch (err) {
        if (err?.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      triggerToast?.(isAr ? 'تم نسخ تفاصيل العقار' : 'Details copied', 'success');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      triggerToast?.(isAr ? 'تعذر النسخ' : 'Copy failed', 'error');
    }
  };

  return (
    <div className="xs-share" role="toolbar" aria-label={isAr ? 'مشاركة العقار' : 'Share this property'}>
      <span className="xs-share-label">{isAr ? 'شارك العقار' : 'Share'}</span>
      <div className="xs-share-actions">
        <a className="xs-share-btn is-gold" href={brochureRequestUrl(property)} target="_blank" rel="noopener noreferrer" onClick={() => trackBrochureRequest(property)}>
          <FileText size={16} aria-hidden="true" />
          <span>{isAr ? 'اطلب البروشور على واتساب' : 'Brochure on WhatsApp'}</span>
        </a>
        {onOpenStoryCard && (
          <button type="button" className="xs-share-btn" onClick={onOpenStoryCard}>
            <Sparkles size={16} aria-hidden="true" />
            <span>{isAr ? 'بطاقة ستوري' : 'Story card'}</span>
          </button>
        )}
        <button type="button" className="xs-share-btn is-wa" onClick={handleWhatsApp}>
          <WaIcon />
          <span>{isAr ? 'واتساب' : 'WhatsApp'}</span>
        </button>
        <button type="button" className="xs-share-btn" onClick={handleShare}>
          {copied ? <Check size={16} aria-hidden="true" /> : <Share2 size={16} aria-hidden="true" />}
          <span>{copied ? (isAr ? 'تم النسخ' : 'Copied') : (isAr ? 'مشاركة' : 'Share')}</span>
        </button>
      </div>
    </div>
  );
}
