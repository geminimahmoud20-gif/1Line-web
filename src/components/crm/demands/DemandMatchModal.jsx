import { X, MapPin, AlertCircle, Home, Share2 } from 'lucide-react';

export default function DemandMatchModal({
  canViewPhone,
  getMatchingProperties,
  isAr,
  matchModalDemand,
  setMatchModalDemand
}) {
  return (
    <div className="track-modal-backdrop" onClick={() => setMatchModalDemand(null)} style={{ zIndex: 1200 }}>
      <div 
        className="track-modal-card" 
        onClick={(e) => e.stopPropagation()} 
        style={{ 
          maxWidth: '850px', 
          width: '95%', 
          maxHeight: '90vh', 
          overflowY: 'auto',
          borderRadius: '20px',
          border: '1px solid var(--crm-accent)'
        }}
      >
        <button type="button" className="modal-close-btn" onClick={() => setMatchModalDemand(null)}>
          <X size={20} />
        </button>

        <div className="track-modal-header" style={{ marginBottom: '18px' }}>
          <div className="track-icon-wrap" style={{ background: 'linear-gradient(135deg, var(--crm-positive-solid), var(--crm-positive-solid))' }}>
            <Home size={22} style={{ color: 'var(--crm-on-dark)' }} />
          </div>
          <h3>{isAr ? 'العقارات المتاحة المطابقة لطلب المشتري' : 'Matching Inventory Units'}</h3>
          <p>
            {isAr 
              ? 'محرك المطابقة الذكي يبحث في محفظة العقارات الموثقة بسوهاج لاقتراح أنسب الوحدات للمشتري فوراً.' 
              : 'Instant matching engine queries verified database for top matching units.'}
          </p>
        </div>

        {/* Demand Summary Pill */}
        <div style={{
          background: 'rgba(217, 119, 6, 0.1)',
          border: '1px solid rgba(217, 119, 6, 0.3)',
          borderRadius: '12px',
          padding: '12px 16px',
          marginBottom: '20px',
          fontSize: 'var(--crm-text-base)'
        }}>
          <strong style={{ color: 'var(--crm-accent-text)', display: 'block', marginBottom: '4px' }}>
            {isAr ? 'الطلب المستهدف للمطابقة:' : 'Target Demand:'} {matchModalDemand.clientName ? `(${matchModalDemand.clientName})` : ''}
          </strong>
          <p style={{ margin: 0, color: 'var(--crm-ink)' }}>
            {isAr ? matchModalDemand.text_ar : matchModalDemand.text_en || matchModalDemand.text_ar}
          </p>
          <div style={{ display: 'flex', gap: '14px', marginTop: '8px', fontSize: 'var(--crm-text-sm)', color: 'var(--crm-muted)' }}>
            <span>📍 {isAr ? (matchModalDemand.area_ar || matchModalDemand.area) : matchModalDemand.area}</span>
            <span>💰 {(typeof matchModalDemand.budget === 'number' ? matchModalDemand.budget : parseInt(String(matchModalDemand.budget).replace(/,/g, '')) || 0).toLocaleString('en-US')} {isAr ? 'ج.م' : 'EGP'}</span>
          </div>
        </div>

        {/* Matching Properties List */}
        {getMatchingProperties(matchModalDemand).length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)' }}>
            <AlertCircle size={32} style={{ color: 'var(--crm-accent-text)', margin: '0 auto 10px' }} />
            <h4 style={{ color: 'var(--crm-on-dark)', marginBottom: '6px' }}>
              {isAr ? 'لم يتم العثور على وحدات مطابقة حالياً' : 'No exact matching units found'}
            </h4>
            <p style={{ color: 'var(--crm-muted)', fontSize: 'var(--crm-text-sm)' }}>
              {isAr 
                ? 'يمكنك مراجعة الأقسام الأخرى أو تسجيل عقار جديد من قسم إدارة العقارات.' 
                : 'Consider expanding your price filter or listing a new property in the CMS.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '14px' }}>
            {getMatchingProperties(matchModalDemand).map((p) => {
              const siteOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://1linesohag.com';
              const shareText = `أهلاً بك أستاذ ${matchModalDemand.clientName || 'العميل'}، بخصوص طلبك العقاري في منصة 1Line: يسعدنا ترشيح هذا العقار المطابق لطلبك تماماً:\n"${p.title_ar || p.title}"\nالسعر: ${p.price.toLocaleString('en-US')} ج.م في ${p.locationName_ar || p.areaKey}\nالمعاينة والتفاصيل: ${siteOrigin}/properties/${p.id}`;
              const cleanPhone = matchModalDemand.phone ? matchModalDemand.phone.replace(/[^0-9]/g, '') : '';

              return (
                <div 
                  key={p.id}
                  style={{
                    background: 'rgba(15, 23, 42, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  <div style={{ position: 'relative', height: '130px' }}>
                    <img 
                      src={p.images?.[0] || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80'} 
                      alt={p.title_ar} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <span style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(15,23,42,0.85)', color: 'var(--crm-accent-text)', fontSize: 'var(--crm-text-xs)', padding: '2px 8px', borderRadius: '8px', fontWeight: 'bold' }}>
                      {p.price.toLocaleString('en-US')} ج.م
                    </span>
                  </div>

                  <div style={{ padding: '12px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <h4 style={{ fontSize: 'var(--crm-text-base)', color: 'var(--crm-on-dark)', margin: '0 0 6px', fontWeight: 'bold', lineHeight: '1.4' }}>
                        {isAr ? p.title_ar : p.title_en || p.title_ar}
                      </h4>
                      <small style={{ color: 'var(--crm-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={11} className="text-gold" />
                        <span>{isAr ? (p.locationName_ar || p.areaKey) : (p.locationName_en || p.areaKey)}</span>
                      </small>
                      <div style={{ display: 'flex', gap: '10px', marginTop: '8px', fontSize: 'var(--crm-text-xs)', color: 'var(--crm-muted)' }}>
                        {p.size && <span>📐 {p.size} م²</span>}
                        {p.bedrooms && <span>🛏️ {p.bedrooms} غرف</span>}
                      </div>
                    </div>

                    {/* WhatsApp Pitch Share Button */}
                    {cleanPhone && canViewPhone ? (
                      <a
                        href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(shareText)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-sm btn-primary"
                        style={{ 
                          marginTop: '12px', 
                          background: 'var(--brand-whatsapp-solid)', 
                          borderColor: 'var(--brand-whatsapp)',
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          gap: '6px',
                          fontSize: 'var(--crm-text-xs)',
                          fontWeight: 'bold',
                          padding: '8px'
                        }}
                      >
                        <Share2 size={13} />
                        <span>{isAr ? 'إرسال العرض للعميل (واتساب)' : 'Send Deal via WhatsApp'}</span>
                      </a>
                    ) : (
                      <div style={{ marginTop: '10px', fontSize: 'var(--crm-text-xs)', color: 'var(--crm-muted)', textAlign: 'center' }}>
                        {!canViewPhone ? (isAr ? '🔒 الهاتف محجوب للمراقبين' : '🔒 Phone hidden for viewers') : (isAr ? 'رقم العميل غير متاح للمراسلة' : 'No direct client phone recorded')}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button 
            type="button" 
            className="btn btn-outline" 
            onClick={() => setMatchModalDemand(null)}
            style={{ minWidth: '140px' }}
          >
            <span>{isAr ? 'إغلاق' : 'Close'}</span>
          </button>
        </div>
      </div>
    </div>

  );
}
