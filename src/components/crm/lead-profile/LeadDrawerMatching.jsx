import { Building, Sparkles, ExternalLink, Share2 } from 'lucide-react';

export default function LeadDrawerMatching({
  areaName,
  egWhatsapp,
  isAr,
  lead,
  matchedProperties
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{
        background: 'rgba(169, 130, 74, 0.08)',
        border: '1px solid rgba(169, 130, 74, 0.25)',
        borderRadius: '10px',
        padding: '10px 14px',
        fontSize: 'var(--crm-text-xs)',
        color: 'var(--crm-ink)'
      }}>
        <Sparkles size={15} style={{ color: 'var(--crm-accent)', marginInlineEnd: '6px', verticalAlign: 'middle' }} />
        <span>
          {isAr 
            ? `وحدات معتمدة مطابقة لميزانية (${lead.budget || lead.details?.budget || 'غير محددة'}) ومنطقة (${areaName}):` 
            : `Matching properties for budget and area:`}
        </span>
      </div>

      {matchedProperties.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '30px', color: 'var(--crm-muted)' }}>
          <Building size={32} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
          <p style={{ margin: 0, fontSize: 'var(--crm-text-sm)' }}>
            {isAr ? 'لا توجد وحدات مطابقة تماماً حالياً بالمحفظة. جرب توسيع معايير البحث.' : 'No direct property matches found.'}
          </p>
        </div>
      ) : (
        matchedProperties.map(p => {
          const propShareMsg = encodeURIComponent(
            `أهلاً بك أستاذ ${lead.name}، بناءً على طلبك أرشح لك وحدة مميزة بمحفظة 1Line:\n` +
            `🏢 ${p.title_ar || p.title_en}\n` +
            `📍 الموقع: ${p.locationName_ar || p.areaKey}\n` +
            `💰 السعر: ${p.price?.toLocaleString()} ج.م\n` +
            `🔗 تفاصيل الوحدة: https://1-line-qkzp9.vercel.app/properties/${p.id}`
          );
          const shareHref = `https://wa.me/${egWhatsapp}?text=${propShareMsg}`;

          return (
            <div
              key={p.id}
              style={{
                background: 'var(--crm-card)',
                border: '1px solid var(--crm-line)',
                borderRadius: '12px',
                padding: '12px',
                display: 'flex',
                gap: '12px',
                alignItems: 'center'
              }}
            >
              <img
                src={p.images?.[0] || '/og-image.jpg'}
                alt={p.title_ar || 'Property'}
                style={{
                  width: '74px',
                  height: '74px',
                  borderRadius: '8px',
                  objectFit: 'cover',
                  flexShrink: 0
                }}
              />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{
                    fontSize: 'var(--crm-text-xs)',
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: '4px',
                    background: 'rgba(4, 120, 87, 0.1)',
                    color: 'var(--crm-positive)'
                  }}>
                    {p._matchScore}% {isAr ? 'تطابق' : 'Match'}
                  </span>
                  <strong style={{ fontSize: 'var(--crm-text-sm)', color: 'var(--crm-accent)' }}>
                    {p.price?.toLocaleString()} ج.م
                  </strong>
                </div>

                <div style={{
                  fontSize: 'var(--crm-text-sm)',
                  fontWeight: 700,
                  marginTop: '3px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {p.title_ar || p.title_en}
                </div>

                <div style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-muted)', marginTop: '2px' }}>
                  {p.locationName_ar || p.areaKey} • {p.area} م²
                </div>

                {/* Direct Match Action */}
                <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                  <a
                    href={shareHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-sm"
                    style={{
                      background: 'var(--brand-whatsapp-solid)',
                      color: 'var(--crm-on-dark)',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: 'var(--crm-text-xs)',
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Share2 size={12} />
                    <span>{isAr ? 'إرسال للعميل عبر واتساب' : 'Share via WA'}</span>
                  </a>

                  <a
                    href={`/properties/${p.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-sm btn-outline"
                    style={{
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: 'var(--crm-text-xs)',
                      textDecoration: 'none',
                      color: 'var(--crm-ink)'
                    }}
                  >
                    <ExternalLink size={12} />
                    <span>{isAr ? 'معاينة' : 'View'}</span>
                  </a>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>

  );
}
