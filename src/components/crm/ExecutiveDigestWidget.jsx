import { useState, useMemo } from 'react';
import {
  Sun,
  Share2,
  Users,
  Car,
  ShieldAlert,
  Coins,
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
      background: 'linear-gradient(135deg, var(--crm-ink) 0%, var(--crm-navy-light) 100%)',
      borderRadius: '16px',
      padding: '18px 20px',
      color: 'var(--crm-card)',
      border: '1.5px solid var(--crm-accent)',
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
            border: '1px solid var(--crm-accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--crm-accent)'
          }}>
            <Sun size={20} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 'var(--crm-text-md)', fontWeight: 800, color: 'var(--crm-card)' }}>
              {L('ملخص الصباح التنفيذي (Daily Executive Digest)', 'Daily Executive Digest')}
            </h3>
            <span style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-line-strong)' }}>{digest.dateStr}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            size="sm"
            variant="ghost"
            style={{ color: 'var(--crm-accent)', border: '1px solid rgba(212, 175, 55, 0.4)' }}
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
              background: 'rgb(37, 211, 102)',
              color: 'var(--crm-card)',
              border: 'none',
              fontWeight: 700,
              fontSize: 'var(--crm-text-xs)',
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
          <span style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Users size={12} /> {L('عملاء آخر 24 س', 'New (24h)')}
          </span>
          <div style={{ fontSize: 'var(--crm-text-lg)', fontWeight: 800, color: 'var(--crm-info)', marginTop: '2px' }}>
            {digest.newLeadsCount}
          </div>
        </div>

        {/* Visits Today */}
        <div style={{ background: 'rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '10px 14px', border: '1px solid rgba(255,255,255,0.1)' }}>
          <span style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Car size={12} /> {L('معاينات اليوم', 'Visits Today')}
          </span>
          <div style={{ fontSize: 'var(--crm-text-lg)', fontWeight: 800, color: 'var(--crm-positive)', marginTop: '2px' }}>
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
          <span style={{ fontSize: 'var(--crm-text-xs)', color: digest.sla.criticalCount > 0 ? 'var(--crm-danger)' : 'var(--crm-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ShieldAlert size={12} /> {L('تنبيهات SLA الحرجة', 'Critical SLA')}
          </span>
          <div style={{ fontSize: 'var(--crm-text-lg)', fontWeight: 800, color: digest.sla.criticalCount > 0 ? 'var(--crm-danger)' : 'var(--crm-positive-line)', marginTop: '2px' }}>
            {digest.sla.criticalCount}
          </div>
        </div>

        {/* 30d Cashflow */}
        <div style={{ background: 'rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '10px 14px', border: '1px solid rgba(255,255,255,0.1)' }}>
          <span style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Coins size={12} /> {L('سيولة 30 يوم متوقعة', '30d Expected')}
          </span>
          <div style={{ fontSize: 'var(--crm-text-lg)', fontWeight: 800, color: 'var(--crm-accent)', marginTop: '2px' }}>
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
            color: 'var(--crm-accent)',
            fontSize: 'var(--crm-text-xs)',
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
            fontSize: 'var(--crm-text-xs)',
            background: 'rgba(0, 0, 0, 0.35)',
            border: '1px solid rgba(212, 175, 55, 0.3)',
            borderRadius: '8px',
            padding: '12px',
            color: 'var(--crm-line)',
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
