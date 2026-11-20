import { useMemo } from 'react';
import { Megaphone, Activity, ChevronLeft, ChevronRight } from 'lucide-react';
import { cohortReports } from '../../utils/performanceReport';
import { BarList, EmptyState } from '../ui';
import './executive-summary.css';

/** «التسويق»: which source brings clients and which brings deals, then the campaign and visitor reports */
export default function MarketingReportPanel({ leads = [], range, lang = 'ar', onOpenTab }) {
  const isAr = lang !== 'en';
  const L = (ar, en) => (isAr ? ar : en);
  const { sources } = useMemo(() => cohortReports(leads, range), [leads, range]);
  const Go = isAr ? ChevronLeft : ChevronRight;
  const best = sources.filter((s) => s.leads >= 5).sort((a, b) => b.visitPct - a.visitPct)[0];

  return (
    <div className="xs">
      <div className="xs-grid">
        <section className="xs-card" aria-labelledby="mk-count">
          <h2 id="mk-count" className="xs-h">{L('العملاء جم منين؟', 'Where clients came from')}</h2>
          {sources.length === 0 ? <EmptyState title={L('مفيش عملاء في الفترة دي', 'No clients in this period')} /> : (
            <BarList items={sources.map((s) => ({ id: s.id, label: s.label, value: s.leads, note: L(`${s.visitPct}% معاينة · ${s.closed} صفقة`, `${s.visitPct}% viewing · ${s.closed} deals`) }))} ariaLabel={L('العملاء حسب المصدر', 'Clients by source')} />
          )}
        </section>
        <section className="xs-card" aria-labelledby="mk-quality">
          <h2 id="mk-quality" className="xs-h">{L('أنهي مصدر بيجيب عملاء جادّين؟', 'Which source brings serious clients')}</h2>
          {sources.length === 0 ? <EmptyState title={L('مفيش عملاء في الفترة دي', 'No clients in this period')} /> : (
            <>
              <BarList tone="success" max={100} items={sources.filter((s) => s.leads > 0).map((s) => ({ id: s.id, label: s.label, value: s.visitPct, note: L(`من ${s.leads} عميل`, `of ${s.leads}`) }))} valueText={(it) => `${it.value}%`} ariaLabel={L('نسبة الوصول لمعاينة حسب المصدر', 'Viewing rate by source')} />
              {best && <p className="xs-note">{L(`أفضل مصدر: «${best.label}» (${best.visitPct}% وصلوا لمعاينة). زوّد الميزانية عليه.`, `Best source: ${best.label} (${best.visitPct}% reach a viewing).`)}</p>}
            </>
          )}
        </section>
      </div>
      {onOpenTab && (
        <ul className="pr-links">
          <li><button type="button" onClick={() => onOpenTab('campaigns')}><Megaphone size={18} aria-hidden="true" /><span><b>{L('تقرير الحملات', 'Campaigns')}</b><small>{L('كل إعلان جاب كام عميل وكلّفك كام', 'What each ad brought and cost')}</small></span><Go size={16} aria-hidden="true" className="pr-links__go" /></button></li>
          <li><button type="button" onClick={() => onOpenTab('visitor_intelligence')}><Activity size={18} aria-hidden="true" /><span><b>{L('زوار الموقع', 'Site visitors')}</b><small>{L('الزيارات ومصادرها وأكتر العقارات مشاهدة', 'Visits, sources, most viewed listings')}</small></span><Go size={16} aria-hidden="true" className="pr-links__go" /></button></li>
        </ul>
      )}
    </div>
  );
}
