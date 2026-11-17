import { Activity } from 'lucide-react';
import VisitorJourney from '../analytics/VisitorJourney';
import '../client-profile.css';

const TONE = {
  whatsapp_click: ['positive', 'نقرة واتساب', 'WhatsApp click'],
  calculator_used: ['info', 'حاسبة التمويل', 'Calculator used'],
  property_view: ['warn', 'تصفح عقار', 'Listing viewed'],
  compare_added: ['violet', 'إضافة للمقارنة', 'Added to compare'],
  favorite_added: ['danger', 'إضافة للمفضلة', 'Favorited'],
  brochure_request: ['info', 'طلب بروشور (واتساب)', 'Brochure request'],
  brochure_download: ['info', 'تنزيل بروشور', 'PDF brochure']
};

/** «رحلة الزائر»: what the client opened on the site before sending the request */
export default function ClientJourney({ lead, properties = [], isAr }) {
  const events = Array.isArray(lead?.digitalJourney) ? lead.digitalJourney : [];
  const when = (t) => {
    const d = new Date(t);
    return Number.isFinite(d.getTime()) ? `${d.toLocaleTimeString(isAr ? 'ar-EG-u-nu-latn' : 'en-US', { hour: '2-digit', minute: '2-digit' })} · ${d.toLocaleDateString(isAr ? 'ar-EG-u-nu-latn' : 'en-US', { day: 'numeric', month: 'short' })}` : '';
  };
  // The server-side profile, when the visitor accepted analytics on submitting
  if (lead?.analyticsVisitorId) return <VisitorJourney visitorId={lead.analyticsVisitorId} properties={properties} isAr={isAr} />;
  return (
    <div className="cp__stack">
      <div className={`cp__note ${events.length ? 'cp__note--ok' : ''}`}>
        <h4 className="cp__h"><Activity size={16} aria-hidden="true" />{isAr ? 'سلوك التصفح قبل الطلب' : 'Browsing before the request'}</h4>
        <p>
          {events.length
            ? (isAr ? 'الصفحات والعقارات اللي العميل فتحها قبل ما يبعت طلبه، متسجلة من جهازه.' : 'Pages and listings the client opened before submitting, recorded on their device.')
            : (isAr ? 'مفيش رحلة متسجلة للعميل ده (بتتسجل بس لما يبعت طلبه من الموقع على جهازه).' : 'No journey recorded (only captured when the client submits from the site).')}
        </p>
        {lead?.dwellTimeFormatted && <span className="cp__chip">{isAr ? `مدة الجلسة: ${lead.dwellTimeFormatted}` : `Session: ${lead.dwellTimeFormatted}`}</span>}
      </div>
      {events.length > 0 && (
        <ol className="cp__events">
          {events.map((evt, idx) => {
            const [tone, ar, en] = TONE[evt.eventType] || ['info', 'تصفح الموقع', 'Page view'];
            return (
              <li key={evt.id || idx} className="cp__event" data-tone={tone}>
                <span className="cp__event-tag">{isAr ? ar : en}</span>
                <strong className="cp__event-title">{evt.metadata?.title || evt.url || (isAr ? 'تصفح صفحة' : 'Page visit')}</strong>
                <span className="cp__event-time">{when(evt.timestamp)}</span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
