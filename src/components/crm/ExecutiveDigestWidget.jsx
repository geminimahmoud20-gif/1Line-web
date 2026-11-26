import { useState, useMemo } from 'react';
import {
  Sun,
  Share2,
  Users,
  Car,
  ShieldAlert,
  Coins,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Copy
} from 'lucide-react';
import { generateExecutiveDigest } from '../../utils/executiveDigest';
import { Button } from '../ui';

export default function ExecutiveDigestWidget({
  leads = [],
  properties = [],
  tasks = [],
  lang = 'ar',
  triggerToast
}) {
  const isAr = lang === 'ar';
  const L = (ar, en) => (isAr ? ar : en);
  const [showFullText, setShowFullText] = useState(false);

  const digest = useMemo(() => {
    return generateExecutiveDigest({ leads, properties, tasks, isAr });
  }, [leads, properties, tasks, isAr]);

  const handleShareWhatsApp = () => {
    navigator.clipboard?.writeText?.(digest.whatsappDigestText);
    const waUrl = `https://wa.me/?text=${encodeURIComponent(digest.whatsappDigestText)}`;
    window.open(waUrl, '_blank');
    triggerToast?.(isAr ? 'تم فتح واتساب ونسخ الملخص التنفيذي بنجاح!' : 'Executive digest copied & WhatsApp opened!', 'success');
  };

  const handleCopyOnly = () => {
    navigator.clipboard?.writeText?.(digest.whatsappDigestText);
    triggerToast?.(isAr ? 'تم نسخ التقرير التنفيذي للحافظة' : 'Copied to clipboard', 'info');
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0B1C36 0%, #152C4F 100%)',
      borderRadius: '16px',
      padding: '18px 20px',
      color: '#FFFFFF',
      border: '1.5px solid #D4AF37',
      boxShadow: '0 10px 25px -5px rgba(11, 28, 54, 0.3)',
      marginBottom: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px'
    }} dir={isAr ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'rgba(212, 175, 55, 0.2)',
            border: '1px solid #D4AF37',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#D4AF37'
          }}>
            <Sun size={20} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#FFFFFF' }}>
              {L('ملخص الصباح التنفيذي (Daily Executive Digest)', 'Daily Executive Digest')}
            </h3>
            <span style={{ fontSize: '12px', color: '#CBD5E1' }}>{digest.dateStr}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            size="sm"
            variant="ghost"
            style={{ color: '#D4AF37', border: '1px solid rgba(212, 175, 55, 0.4)' }}
            icon={<Copy size={14} />}
            onClick={handleCopyOnly}
          >
            {L('نسخ', 'Copy')}
          </Button>

          <button
            type="button"
            onClick={handleShareWhatsApp}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              background: '#25D366',
              color: '#FFFFFF',
              border: 'none',
              fontWeight: 700,
              fontSize: '12px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Share2 size={14} />
            <span>{L('مشاركة التقرير عبر الواتساب 📲', 'Share WhatsApp Digest')}</span>
          </button>
        </div>
      </div>

      {/* 4 Executive KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
        gap: '10px'
      }}>
        {/* New Leads */}
        <div style={{ background: 'rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '10px 14px', border: '1px solid rgba(255,255,255,0.1)' }}>
          <span style={{ fontSize: '11px', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Users size={12} /> {L('عملاء آخر 24 س', 'New (24h)')}
          </span>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#38BDF8', marginTop: '2px' }}>
            {digest.newLeadsCount}
          </div>
        </div>

        {/* Visits Today */}
        <div style={{ background: 'rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '10px 14px', border: '1px solid rgba(255,255,255,0.1)' }}>
          <span style={{ fontSize: '11px', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Car size={12} /> {L('معاينات اليوم', 'Visits Today')}
          </span>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#34D399', marginTop: '2px' }}>
            {digest.visitsTodayCount}
          </div>
        </div>

        {/* Critical SLA */}
        <div style={{
          background: digest.sla.criticalCount > 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.08)',
          borderRadius: '10px',
          padding: '10px 14px',
          border: digest.sla.criticalCount > 0 ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(255,255,255,0.1)'
        }}>
          <span style={{ fontSize: '11px', color: digest.sla.criticalCount > 0 ? '#FCA5A5' : '#94A3B8', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ShieldAlert size={12} /> {L('تنبيهات SLA الحرجة', 'Critical SLA')}
          </span>
          <div style={{ fontSize: '20px', fontWeight: 800, color: digest.sla.criticalCount > 0 ? '#F87171' : '#A7F3D0', marginTop: '2px' }}>
            {digest.sla.criticalCount}
          </div>
        </div>

        {/* 30d Cashflow */}
        <div style={{ background: 'rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '10px 14px', border: '1px solid rgba(255,255,255,0.1)' }}>
          <span style={{ fontSize: '11px', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Coins size={12} /> {L('سيولة 30 يوم متوقعة', '30d Expected')}
          </span>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#D4AF37', marginTop: '2px' }}>
            {digest.cashflow.horizon30d.toLocaleString('en-US')} ج.م
          </div>
        </div>
      </div>

      {/* Accordion Toggle for Text Preview */}
      <div>
        <button
          type="button"
          onClick={() => setShowFullText((v) => !v)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#D4AF37',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: 0
          }}
        >
          <span>{showFullText ? L('إخفاء نص الرسالة الكامل', 'Hide text') : L('معاينة نص التقرير الصباحي المنسق 📋', 'Preview WhatsApp text')}</span>
          {showFullText ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {showFullText && (
          <pre style={{
            margin: '10px 0 0',
            whiteSpace: 'pre-wrap',
            fontFamily: 'inherit',
            fontSize: '11px',
            background: 'rgba(0, 0, 0, 0.35)',
            border: '1px solid rgba(212, 175, 55, 0.3)',
            borderRadius: '8px',
            padding: '12px',
            color: '#E2E8F0',
            maxHeight: '260px',
            overflowY: 'auto'
          }}>
            {digest.whatsappDigestText}
          </pre>
        )}
      </div>
    </div>
  );
}
