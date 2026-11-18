// src/components/crm/lead-profile/LeadDrawerBuyers.jsx
// «مشترين مناسبين»: an owner's file lists the buyers (open buyer leads and buyer requests) whose
// area, kind of property and budget fit the unit the owner wants to sell, not units to buy.
import { useMemo } from 'react';
import { Users, Share2 } from 'lucide-react';
import { formatWhatsAppPhone } from '../../../utils/matchingEngine';
import { sellerUnitOf } from '../../../utils/leadPipeline';
import { Badge, EmptyState } from '../../ui';

const money = (n) => Number(n || 0).toLocaleString('en-US');

export default function LeadDrawerBuyers({ lead, buyers = [], areaName, propTypeName, isAr }) {
  const L = (ar, en) => (isAr ? ar : en);
  const unit = useMemo(() => sellerUnitOf(lead), [lead]);

  return (
    <div className="crm-ld__stack">
      <p className="crm-ld__hint">
        {L(`بندوّر على مشترين بيدوّروا على ${propTypeName} في ${areaName}${unit.price ? ` وميزانيتهم قريبة من ${money(unit.price)} ج.م` : ''}، من العملاء المفتوحين وطلبات الشراء.`,
          `Looking for open buyers and buyer requests who want a ${propTypeName} in ${areaName}${unit.price ? ` with a budget near ${money(unit.price)} EGP` : ''}.`)}
      </p>

      <h3 className="crm-ld__h">{L(`مشترين مناسبين (${buyers.length})`, `Matching buyers (${buyers.length})`)}</h3>
      {buyers.length === 0 ? (
        <EmptyState
          icon={<Users size={22} />}
          title={L('مفيش مشترين مناسبين دلوقتي', 'No matching buyers yet')}
          description={L('أول ما يدخل مشتري بيدوّر على عقار زي ده هيظهر هنا. سجّل السعر المطلوب عشان الترشيح يبقى أدق.', 'Buyers who fit this unit show up here. Set the asking price for a closer match.')}
        />
      ) : (
        <ul className="crm-ld__list">
          {buyers.map((b) => {
            const wa = formatWhatsAppPhone(b.whatsapp || b.phone);
            const msg = encodeURIComponent(
              `أهلاً أستاذ ${b.name}، معاك 1Line. عندنا ${propTypeName} في ${areaName}` +
              (unit.size ? ` مساحة ${unit.size} م²` : '') +
              (unit.price ? ` بسعر حوالي ${money(unit.price)} ج.م` : '') +
              '، قريب من اللي حضرتك بتدوّر عليه. تحب نرتّب معاينة؟'
            );
            return (
              <li key={`${b.source}-${b.id}`} className="crm-ld__match">
                <div className="crm-ld__match-body">
                  <div className="crm-ld__match-top">
                    <Badge tone={b.score >= 80 ? 'success' : 'info'}>{L(`تطابق ${b.score}%`, `${b.score}% match`)}</Badge>
                    <strong className="crm-ld__price">{b.leadBudget ? `${money(b.leadBudget)} ${L('ج.م', 'EGP')}` : L('الميزانية مش متسجّلة', 'No budget')}</strong>
                  </div>
                  <span className="crm-ld__match-title">{b.name}</span>
                  <span className="crm-ld__match-meta">{b.source}</span>
                  {wa && (
                    <div className="crm-ld__row">
                      <a href={`https://wa.me/${wa}?text=${msg}`} target="_blank" rel="noopener noreferrer" className="ui-btn ui-btn--secondary ui-btn--sm">
                        <Share2 size={16} aria-hidden="true" />{L('كلّمه واتساب', 'WhatsApp')}
                      </a>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
