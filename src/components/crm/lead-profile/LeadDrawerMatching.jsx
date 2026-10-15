// src/components/crm/lead-profile/LeadDrawerMatching.jsx
import { useMemo } from 'react';
import { Building, ExternalLink, Share2, CheckCircle2, Search } from 'lucide-react';
import { SITE_URL } from '../../../config/siteConfig';
import { rankAndNominateProperties, formatNominationWhatsAppPitch } from '../../../services/matchingEngineV2';
import { Badge, Button, EmptyState } from '../../ui';

const TIERS = [
  { ar: 'الأقرب لطلبه', en: 'Closest', tone: 'info' },
  { ar: 'أحسن قيمة', en: 'Best value', tone: 'success' },
  { ar: 'خيار أعلى', en: 'Stretch', tone: 'warning' }
];

export default function LeadDrawerMatching({
  areaName,
  egWhatsapp,
  isAr,
  lead,
  matchingResult: givenResult,
  properties = [],
  onUpdateLead,
  triggerToast
}) {
  const L = (ar, en) => (isAr ? ar : en);
  // The drawer passes the ranking it already computed for the tab count
  const computed = useMemo(() => (givenResult ? null : rankAndNominateProperties(lead, properties)), [givenResult, lead, properties]);
  const { matches = [], nominationPack = [], canAssemble3TierPack, needsSearchRequest, searchRequestDraft } = givenResult || computed;

  const propertiesMap = useMemo(() => {
    const map = {};
    properties.forEach(p => { map[p.id] = p; });
    return map;
  }, [properties]);

  const handleSendFullPack = () => {
    if (!canAssemble3TierPack || !egWhatsapp) return;
    const pitchText = formatNominationWhatsAppPitch(lead, nominationPack, propertiesMap);
    window.open(`https://wa.me/${egWhatsapp}?text=${encodeURIComponent(pitchText)}`, '_blank', 'noopener,noreferrer');
    triggerToast?.(L('اتفتح واتساب بالترشيحات التلاتة', 'WhatsApp opened with the 3 picks'), 'success');
  };

  const handleApproveNominations = () => {
    if (!onUpdateLead || !canAssemble3TierPack) return;
    onUpdateLead(lead.id, {
      nominations: nominationPack,
      nominatedAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString()
    }, lead.version);
    triggerToast?.(L('الترشيحات اتسجّلت في ملف العميل', 'Picks saved to the client file'), 'success');
  };

  const handleOpenSearchRequest = () => {
    if (!onUpdateLead || !searchRequestDraft) return;
    onUpdateLead(lead.id, {
      hasOpenSearchRequest: true,
      searchRequest: searchRequestDraft,
      searchRequestOpenedAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString()
    }, lead.version);
    triggerToast?.(L('اتفتح طلب بحث، قدامكم 7 أيام', 'Search request opened (7 days)'), 'success');
  };

  const hasApprovedNominations = (lead.nominations?.length || 0) >= 3;
  const hasOpenSearchRequest = Boolean(lead.hasOpenSearchRequest || lead.searchRequest);
  const budget = lead.budget || lead.details?.budget;

  return (
    <div className="crm-ld__stack">
      <p className="crm-ld__hint">
        {L(`بنقارن الميزانية (${budget || 'مش محددة'}) والمنطقة (${areaName}) بالعقارات المتاحة، ومن غير اللي العميل رفضها قبل كده.`,
          `Matching budget (${budget || 'not set'}) and area (${areaName}) against available listings, skipping ones the client turned down.`)}
        {' '}
        {hasApprovedNominations
          ? <Badge tone="success">{L('3 ترشيحات متسجّلة', '3 picks saved')}</Badge>
          : hasOpenSearchRequest ? <Badge tone="info">{L('طلب بحث مفتوح', 'Search request open')}</Badge> : null}
      </p>

      {canAssemble3TierPack && (
        <section className="crm-ld__block" aria-labelledby="crm-ld-pack">
          <h3 id="crm-ld-pack" className="crm-ld__h">{L('أحسن 3 ترشيحات', 'Top 3 picks')}</h3>
          <ol className="crm-ld__list">
            {nominationPack.map((nom, idx) => {
              const prop = propertiesMap[nom.propertyId] || {};
              const tier = TIERS[idx] || TIERS[0];
              return (
                <li key={nom.propertyId} className="crm-ld__pick">
                  <Badge tone={tier.tone}>{isAr ? tier.ar : tier.en}</Badge>
                  <span className="crm-ld__pick-title">{prop.title_ar || prop.title_en || L('وحدة مختارة', 'Selected unit')}</span>
                  <strong className="crm-ld__price">{prop.price ? `${Number(prop.price).toLocaleString('en-US')} ${L('ج.م', 'EGP')}` : '—'}</strong>
                </li>
              );
            })}
          </ol>
          <div className="crm-ld__row">
            {egWhatsapp && (
              <Button size="sm" icon={<Share2 size={16} aria-hidden="true" />} onClick={handleSendFullPack}>
                {L('ابعتهم للعميل واتساب', 'Send on WhatsApp')}
              </Button>
            )}
            {onUpdateLead && (
              <Button variant="secondary" size="sm" icon={<CheckCircle2 size={16} aria-hidden="true" />} disabled={hasApprovedNominations} onClick={handleApproveNominations}>
                {hasApprovedNominations ? L('متسجّلين', 'Saved') : L('سجّلهم في الملف', 'Save to file')}
              </Button>
            )}
          </div>
        </section>
      )}

      {needsSearchRequest && (
        <section className="crm-ld__block crm-ld__block--warn" aria-labelledby="crm-ld-search">
          <h3 id="crm-ld-search" className="crm-ld__h"><Search size={16} aria-hidden="true" />{L('المتاح أقل من 3 عقارات', 'Fewer than 3 matches')}</h3>
          <p className="crm-ld__hint">
            {L(`لقينا ${matches.length} بس. افتح طلب بحث علشان الفريق يدوّر على عقارات تانية خلال 7 أيام.`,
              `Only ${matches.length} found. Open a search request so the team looks for more within 7 days.`)}
          </p>
          {onUpdateLead && (
            <Button size="sm" disabled={hasOpenSearchRequest} onClick={handleOpenSearchRequest}>
              {hasOpenSearchRequest ? L('طلب البحث مفتوح', 'Search request open') : L('افتح طلب بحث', 'Open search request')}
            </Button>
          )}
        </section>
      )}

      <h3 className="crm-ld__h">{L(`العقارات المناسبة (${matches.length})`, `Matching listings (${matches.length})`)}</h3>
      {matches.length === 0 ? (
        <EmptyState
          icon={<Building size={22} />}
          title={L('مفيش عقارات مناسبة دلوقتي', 'No matching listings yet')}
          description={L('افتح طلب بحث، وأول ما يتضاف عقار مناسب هيظهر هنا.', 'Open a search request; new matches show up here.')}
        />
      ) : (
        <ul className="crm-ld__list">
          {matches.map(item => {
            const p = item.property;
            const shareMsg = encodeURIComponent(
              `أهلاً بك أستاذ ${lead.name}، بناءً على طلبك أرشح لك وحدة مميزة بمحفظة 1Line (${item.score}% تطابق):\n` +
              `${p.title_ar || p.title_en}\n` +
              `الموقع: ${p.locationName_ar || p.areaKey}\n` +
              `السعر: ${p.price?.toLocaleString('en-US')} ج.م\n` +
              `تفاصيل الوحدة: ${SITE_URL}/properties/${p.id}`
            );
            return (
              <li key={p.id} className="crm-ld__match">
                <img src={p.images?.[0] || '/og-image.jpg'} alt="" loading="lazy" />
                <div className="crm-ld__match-body">
                  <div className="crm-ld__match-top">
                    <Badge tone={item.score >= 80 ? 'success' : 'info'}>{L(`تطابق ${item.score}%`, `${item.score}% match`)}</Badge>
                    <strong className="crm-ld__price">{p.price ? `${Number(p.price).toLocaleString('en-US')} ${L('ج.م', 'EGP')}` : '—'}</strong>
                  </div>
                  <span className="crm-ld__match-title">{p.title_ar || p.title_en}</span>
                  <span className="crm-ld__match-meta">
                    {[p.locationName_ar || p.areaKey, (p.size || p.area) && `${p.size || p.area} ${L('م²', 'm²')}`, ...item.reasons.slice(0, 2)].filter(Boolean).join(' · ')}
                  </span>
                  <div className="crm-ld__row">
                    {egWhatsapp && (
                      <a href={`https://wa.me/${egWhatsapp}?text=${shareMsg}`} target="_blank" rel="noopener noreferrer" className="ui-btn ui-btn--secondary ui-btn--sm">
                        <Share2 size={16} aria-hidden="true" />{L('ابعته واتساب', 'WhatsApp')}
                      </a>
                    )}
                    <a href={`/properties/${p.id}`} target="_blank" rel="noopener noreferrer" className="ui-btn ui-btn--ghost ui-btn--sm">
                      <ExternalLink size={16} aria-hidden="true" />{L('صفحة العقار', 'Listing page')}
                    </a>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
