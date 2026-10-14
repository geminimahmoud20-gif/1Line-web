// src/components/crm/lead-profile/LeadDrawerMatching.jsx
import { useMemo } from 'react';
import { Building, Sparkles, ExternalLink, Share2, CheckCircle2, Search, ArrowUpRight } from 'lucide-react';
import { SITE_URL } from '../../../config/siteConfig';
import { rankAndNominateProperties, formatNominationWhatsAppPitch } from '../../../services/matchingEngineV2';

export default function LeadDrawerMatching({
  areaName,
  egWhatsapp,
  isAr,
  lead,
  properties = [],
  onUpdateLead,
  triggerToast
}) {
  // Compute multi-factor matching, 3-tier nomination pack, and search request fallback
  const matchingResult = useMemo(() => {
    return rankAndNominateProperties(lead, properties);
  }, [lead, properties]);

  const { matches, nominationPack, canAssemble3TierPack, needsSearchRequest, searchRequestDraft } = matchingResult;

  // Map for quick title & price lookup
  const propertiesMap = useMemo(() => {
    const map = {};
    properties.forEach(p => { map[p.id] = p; });
    return map;
  }, [properties]);

  const handleSendFullPack = () => {
    if (!canAssemble3TierPack) return;
    const pitchText = formatNominationWhatsAppPitch(lead, nominationPack, propertiesMap);
    const waUrl = `https://wa.me/${egWhatsapp}?text=${encodeURIComponent(pitchText)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
    triggerToast?.(isAr ? 'تم فتح واتساب لإرسال باقة الترشيحات الثلاثية' : '3-Tier Nomination pack opened in WhatsApp', 'success');
  };

  const handleApproveNominations = () => {
    if (!onUpdateLead || !canAssemble3TierPack) return;
    onUpdateLead(lead.id, {
      nominations: nominationPack,
      nominatedAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString()
    }, lead.version);
    triggerToast?.(isAr ? 'تم اعتماد باقة الترشيحات الثلاثية في ملف العميل بنجاح!' : '3-Tier pack approved for lead profile', 'success');
  };

  const handleOpenSearchRequest = () => {
    if (!onUpdateLead || !searchRequestDraft) return;
    onUpdateLead(lead.id, {
      hasOpenSearchRequest: true,
      searchRequest: searchRequestDraft,
      searchRequestOpenedAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString()
    }, lead.version);
    triggerToast?.(isAr ? 'تم فتح طلب بحث موجّه للمخزون بمهلة 7 أيام بنجاح!' : 'SearchRequest opened with 7-day SLA', 'success');
  };

  const hasApprovedNominations = (lead.nominations?.length || 0) >= 3;
  const hasOpenSearchRequest = Boolean(lead.hasOpenSearchRequest || lead.searchRequest);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* 1Line OS Status Banner */}
      <div style={{
        background: 'var(--crm-subtle)',
        border: '1px solid var(--crm-line)',
        borderRadius: '10px',
        padding: '12px 14px',
        fontSize: 'var(--crm-text-xs)',
        color: 'var(--crm-ink)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={14} style={{ color: 'var(--crm-accent)' }} />
            {isAr ? 'محرك المطابقة المتقدم (1Line OS Matching Engine V2)' : 'Matching Engine V2'}
          </span>
          <span style={{
            fontSize: 'var(--crm-text-xs)',
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: '999px',
            background: hasApprovedNominations || hasOpenSearchRequest ? 'var(--crm-positive-soft)' : 'var(--crm-warn-soft)',
            color: hasApprovedNominations || hasOpenSearchRequest ? 'var(--crm-positive)' : 'var(--crm-warn)'
          }}>
            {hasApprovedNominations
              ? (isAr ? '✓ 3 ترشيحات معتمدة' : '3 Nominations Approved')
              : hasOpenSearchRequest
              ? (isAr ? '⏳ طلب بحث مفتوح (7 أيام)' : 'Search Request Active')
              : (isAr ? 'مطلوب استيفاء الترشيحات' : 'Pending Deliverable')}
          </span>
        </div>
        <div style={{ color: 'var(--crm-muted)', fontSize: 'var(--crm-text-xs)' }}>
          {isAr
            ? `مطابقة فورية للميزانية (${lead.budget || lead.details?.budget || 'غير محددة'}) ومنطقة (${areaName}) مع استبعاد المرفوضات والمطورين غير المعتمدين.`
            : `Live matching for target budget and area with rejection filtering.`}
        </div>
      </div>

      {/* 3-Tier Nomination Pack Section (Closest, Value, Challenge) */}
      {canAssemble3TierPack && (
        <div style={{
          background: 'var(--crm-card)',
          border: '1px solid var(--crm-accent-line, var(--crm-line))',
          borderRadius: '12px',
          padding: '14px',
          boxShadow: 'var(--crm-shadow, 0 2px 6px rgba(0,0,0,0.05))'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h4 style={{ margin: 0, fontSize: 'var(--crm-text-sm)', fontWeight: 800, color: 'var(--crm-ink)' }}>
              🎯 {isAr ? 'باقة الترشيحات الثلاثية المقترحة' : '3-Tier Nomination Pack'}
            </h4>
            <span style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-muted)' }}>
              {isAr ? 'القاعدة الذهبية للمبيعات' : 'Sales Golden Rule'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
            {nominationPack.map((nom, idx) => {
              const prop = propertiesMap[nom.propertyId] || {};
              const badges = [
                { role: 'closest', label: isAr ? '1. الأقرب' : '1. Closest', color: 'var(--crm-info)' },
                { role: 'value', label: isAr ? '2. القيمة' : '2. Value', color: 'var(--crm-positive)' },
                { role: 'challenge', label: isAr ? '3. التحدي' : '3. Challenge', color: 'var(--crm-warn)' }
              ];
              const badge = badges[idx] || badges[0];

              return (
                <div
                  key={nom.propertyId}
                  style={{
                    background: 'var(--crm-subtle)',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1px solid var(--crm-line)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <span style={{
                      fontSize: 'var(--crm-text-xs)',
                      fontWeight: 800,
                      color: badge.color,
                      marginInlineEnd: '6px'
                    }}>
                      {badge.label}
                    </span>
                    <span style={{ fontSize: 'var(--crm-text-xs)', fontWeight: 600, color: 'var(--crm-ink)' }}>
                      {prop.title_ar || prop.title_en || 'وحدة مختارة'}
                    </span>
                  </div>
                  <strong style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-accent)' }}>
                    {prop.price ? prop.price.toLocaleString('en-US') + ' ج' : '—'}
                  </strong>
                </div>
              );
            })}
          </div>

          {/* Action Buttons for 3-Tier Pack */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleSendFullPack}
              className="btn btn-sm"
              style={{
                background: 'var(--brand-whatsapp-solid)',
                color: 'var(--crm-on-dark)',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: 'var(--crm-text-xs)',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Share2 size={13} />
              <span>{isAr ? 'إرسال الباقة للعميل (واتساب)' : 'Send Pack via WA'}</span>
            </button>

            {onUpdateLead && (
              <button
                type="button"
                onClick={handleApproveNominations}
                disabled={hasApprovedNominations}
                className="btn btn-sm btn-outline"
                style={{
                  borderRadius: '8px',
                  padding: '6px 12px',
                  fontSize: 'var(--crm-text-xs)',
                  fontWeight: 700,
                  cursor: hasApprovedNominations ? 'default' : 'pointer',
                  opacity: hasApprovedNominations ? 0.7 : 1
                }}
              >
                <CheckCircle2 size={13} style={{ color: 'var(--crm-positive)' }} />
                <span>{hasApprovedNominations ? (isAr ? 'تم الاعتماد مسبقاً' : 'Approved') : (isAr ? 'اعتماد الترشيحات لفتح المرحلة' : 'Approve Pack')}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Fallback: SearchRequest Alert if Inventory < 3 */}
      {needsSearchRequest && (
        <div style={{
          background: 'var(--crm-warn-soft)',
          border: '1px solid var(--crm-warn-line)',
          borderRadius: '12px',
          padding: '14px'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <Search size={18} style={{ color: 'var(--crm-warn)', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontSize: 'var(--crm-text-sm)', fontWeight: 800, color: 'var(--crm-warn)' }}>
                {isAr ? 'المخزون الحالي غير كافٍ لـ 3 ترشيحات' : 'Insufficient Inventory for 3 Nominations'}
              </div>
              <p style={{ margin: '4px 0 10px', fontSize: 'var(--crm-text-xs)', color: 'var(--crm-body)', lineHeight: 1.5 }}>
                {isAr
                  ? `عُثر على ${matches.length} وحدات مطابقة فقط. قواعد 1Line تفرض فتح طلب بحث موجّه للمخزون بمهلة 7 أيام لاستكمال الترشيحات.`
                  : `Only ${matches.length} matching properties found. 1Line rules mandate opening a SearchRequest with 7-day SLA.`}
              </p>

              {onUpdateLead && (
                <button
                  type="button"
                  onClick={handleOpenSearchRequest}
                  disabled={hasOpenSearchRequest}
                  className="btn btn-sm"
                  style={{
                    background: 'var(--crm-brand-navy)',
                    color: 'var(--crm-on-dark)',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    fontSize: 'var(--crm-text-xs)',
                    fontWeight: 700,
                    border: 'none',
                    cursor: hasOpenSearchRequest ? 'default' : 'pointer',
                    opacity: hasOpenSearchRequest ? 0.7 : 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <ArrowUpRight size={14} />
                  <span>{hasOpenSearchRequest ? (isAr ? 'طلب البحث مفتوح حالياً' : 'Search Request Active') : (isAr ? 'فتح طلب بحث للمخزون (مهلة 7 أيام)' : 'Open Search Request (7-Day SLA)')}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Matching Properties List */}
      <div style={{ fontSize: 'var(--crm-text-xs)', fontWeight: 700, color: 'var(--crm-muted)', marginTop: '4px' }}>
        {isAr ? `الوحدات المطابقة المتاحة في المخزون (${matches.length}):` : `Matched Inventory Properties (${matches.length}):`}
      </div>

      {matches.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '30px', color: 'var(--crm-muted)' }}>
          <Building size={32} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
          <p style={{ margin: 0, fontSize: 'var(--crm-text-sm)' }}>
            {isAr ? 'لا توجد وحدات مطابقة حالياً. يرجى فتح طلب بحث للمخزون.' : 'No direct matches found. Please open a Search Request.'}
          </p>
        </div>
      ) : (
        matches.map(item => {
          const p = item.property;
          const propShareMsg = encodeURIComponent(
            `أهلاً بك أستاذ ${lead.name}، بناءً على طلبك أرشح لك وحدة مميزة بمحفظة 1Line (${item.score}% تطابق):\n` +
            `🏢 ${p.title_ar || p.title_en}\n` +
            `📍 الموقع: ${p.locationName_ar || p.areaKey}\n` +
            `💰 السعر: ${p.price?.toLocaleString('en-US')} ج.م\n` +
            `🔗 تفاصيل الوحدة: ${SITE_URL}/properties/${p.id}`
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
                    background: item.score >= 80 ? 'var(--crm-positive-soft)' : 'var(--crm-info-soft)',
                    color: item.score >= 80 ? 'var(--crm-positive)' : 'var(--crm-info)'
                  }}>
                    {item.score}% {isAr ? 'تطابق' : 'Match'}
                  </span>
                  <strong style={{ fontSize: 'var(--crm-text-sm)', color: 'var(--crm-accent)' }}>
                    {p.price?.toLocaleString('en-US')} ج.م
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
                  {p.locationName_ar || p.areaKey} • {p.size || p.area || '—'} م²
                  {item.reasons.length > 0 && ` • ${item.reasons.slice(0, 2).join('، ')}`}
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
                    <span>{isAr ? 'واتساب' : 'WhatsApp'}</span>
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
