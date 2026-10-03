import { Phone, MessageSquare, Calendar, Send } from 'lucide-react';

export default function LeadDrawerOverview({
  egWhatsapp,
  handleLogCall,
  handleScheduleViewing,
  isAr,
  properties,
  selectedViewingPropId,
  setSelectedViewingPropId,
  setShowViewingForm,
  setViewingDateTime,
  showViewingForm,
  viewingDateTime,
  whatsappTemplates
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* 1. Quick Call Logger */}
      <div style={{
        background: 'var(--crm-card)',
        border: '1px solid var(--crm-line)',
        borderRadius: '12px',
        padding: '14px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
          <Phone size={15} style={{ color: 'var(--crm-accent, var(--crm-accent-text))' }} />
          <strong style={{ fontSize: 'var(--crm-text-sm)' }}>{isAr ? 'تسجيل نتيجة مكالمة سريعة بنقرة واحدة:' : 'Log Call Outcome (1-Click):'}</strong>
        </div>

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {[
            { label: isAr ? 'لم يرد' : 'No Answer', color: 'var(--crm-muted)' },
            { label: isAr ? 'طلب مهلة للاتصال' : 'Callback', color: 'var(--crm-warn)' },
            { label: isAr ? 'مهتم ويبحث بجدية' : 'Interested', color: 'var(--crm-positive)' },
            { label: isAr ? 'تم تحديد موعد معاينة' : 'Viewing Set', color: 'var(--crm-info)' },
            { label: isAr ? 'غير مناسب / ميزانية أقل' : 'Not Match', color: 'var(--crm-danger)' }
          ].map((btn, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleLogCall(btn.label)}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                fontSize: 'var(--crm-text-xs)',
                fontWeight: 600,
                background: 'var(--crm-subtle)',
                border: '1px solid var(--crm-line)',
                color: btn.color,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. WhatsApp Pre-formatted Pitches */}
      <div style={{
        background: 'var(--crm-card)',
        border: '1px solid var(--crm-line)',
        borderRadius: '12px',
        padding: '14px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
          <MessageSquare size={15} style={{ color: 'var(--brand-whatsapp)' }} />
          <strong style={{ fontSize: 'var(--crm-text-sm)' }}>{isAr ? 'رسائل واتساب تسويقية جاهزة للإرسال:' : 'Instant WhatsApp Pitches:'}</strong>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {whatsappTemplates.map((tpl, i) => {
            const waHref = `https://wa.me/${egWhatsapp}?text=${encodeURIComponent(tpl.msg)}`;
            return (
              <div
                key={i}
                style={{
                  background: 'var(--crm-subtle)',
                  border: '1px solid var(--crm-line)',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px'
                }}
              >
                <div>
                  <div style={{ fontSize: 'var(--crm-text-sm)', fontWeight: 700, color: 'var(--crm-ink)' }}>{tpl.title}</div>
                  <div style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-muted)', marginTop: '2px', lineClamp: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '320px' }}>
                    {tpl.msg}
                  </div>
                </div>

                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm"
                  style={{
                    background: 'var(--brand-whatsapp-solid)',
                    color: 'var(--crm-on-dark)',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: 'var(--crm-text-xs)',
                    fontWeight: 700,
                    textDecoration: 'none',
                    flexShrink: 0
                  }}
                >
                  <Send size={12} />
                  <span>{isAr ? 'إرسال' : 'Send'}</span>
                </a>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Schedule Viewing Toggle / Form */}
      <div style={{
        background: 'var(--crm-card)',
        border: '1px solid var(--crm-line)',
        borderRadius: '12px',
        padding: '14px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={15} style={{ color: 'var(--crm-accent, var(--crm-accent-text))' }} />
            <strong style={{ fontSize: 'var(--crm-text-sm)' }}>{isAr ? 'جدولة موعد معاينة ميدانية:' : 'Schedule Property Viewing:'}</strong>
          </div>

          <button
            type="button"
            onClick={() => setShowViewingForm(!showViewingForm)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--crm-accent, var(--crm-accent-text))',
              fontWeight: 700,
              fontSize: 'var(--crm-text-xs)',
              cursor: 'pointer'
            }}
          >
            {showViewingForm ? (isAr ? 'إلغاء' : 'Cancel') : (isAr ? '+ جدولة الآن' : '+ Schedule')}
          </button>
        </div>

        {showViewingForm && (
          <form onSubmit={handleScheduleViewing} style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: 'var(--crm-text-xs)', fontWeight: 600, marginBottom: '4px' }}>
                {isAr ? 'اختر الوحدة المراد معاينتها:' : 'Select Property:'}
              </label>
              <select
                value={selectedViewingPropId}
                onChange={(e) => setSelectedViewingPropId(e.target.value)}
                required
                className="form-input"
                style={{ width: '100%', padding: '6px 10px', fontSize: 'var(--crm-text-xs)', borderRadius: '8px' }}
              >
                <option value="">{isAr ? '-- اختر العقار من المحفظة --' : '-- Choose Property --'}</option>
                {properties.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.id.toUpperCase()} — {p.title_ar || p.title_en} ({p.price?.toLocaleString('en-US')} ج.م)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 'var(--crm-text-xs)', fontWeight: 600, marginBottom: '4px' }}>
                {isAr ? 'تاريخ ووقت المعاينة المفضل:' : 'Date & Time:'}
              </label>
              <input
                type="datetime-local"
                value={viewingDateTime}
                onChange={(e) => setViewingDateTime(e.target.value)}
                required
                className="form-input"
                style={{ width: '100%', padding: '6px 10px', fontSize: 'var(--crm-text-xs)', borderRadius: '8px' }}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: 'var(--crm-text-sm)',
                fontWeight: 700,
                background: 'var(--crm-accent)',
                color: 'var(--crm-on-dark)',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              {isAr ? 'تأكيد المعاينة وجدولة التنبيه' : 'Confirm Viewing Schedule'}
            </button>
          </form>
        )}
      </div>
    </div>

  );
}
