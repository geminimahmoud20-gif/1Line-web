import { useEffect, useMemo, useState } from 'react';
import { Compass, Building, Hourglass, Users, Megaphone, ShieldAlert, Gauge, ChevronLeft, ChevronRight } from 'lucide-react';
import { getActiveAccessConfig } from '../../services/accessConfig';
import { useGoals } from '../../hooks/useGoals';
import { loadMonthlySpend } from '../../firebaseLazy';
import { buildDecisionInsights } from '../../utils/decisionInsights';
import { getAreas } from '../../utils/areasData';
import { EmptyState, IconBadge } from '../ui';
import './report-dash.css';

const CATEGORY_ICON = { stock: Building, flow: Hourglass, team: Users, marketing: Megaphone, risk: ShieldAlert, kpi: Gauge };
const SEVERITY_TONE = { critical: 'danger', warning: 'warning', info: 'info' };

/**
 * «مركز القرار»: cross-references every report already in the hub (تسويق، فريق، تدفق شغل، عقارات
 * وطلب، مؤشرات، خسائر) into one ranked list of decisions worth making right now - not another
 * metric, just what today's numbers across all of them mean together. Founder-only.
 */
export default function DecisionCenterPanel({ leads = [], properties = [], demands = [], members = [], lang = 'ar', onJumpTab }) {
  const isAr = lang !== 'en';
  const L = (ar, en) => (isAr ? ar : en);
  const Go = isAr ? ChevronLeft : ChevronRight;
  const { goals } = useGoals();
  const [spend, setSpend] = useState({});
  useEffect(() => {
    let alive = true;
    loadMonthlySpend().then((m) => { if (alive && m) setSpend(m); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const insights = useMemo(() => buildDecisionInsights({
    leads,
    properties,
    demands,
    members,
    access: getActiveAccessConfig() || {},
    capacity: goals,
    spend,
    areas: getAreas(),
  }), [leads, properties, demands, members, goals, spend]);

  if (insights.length === 0) {
    return <EmptyState title={L('مفيش قرارات عاجلة دلوقتي', 'Nothing urgent right now')} description={L('كل الأقسام في وضع طبيعي حسب آخر بيانات.', 'Every section looks healthy on the latest data.')} />;
  }

  return (
    <div className="rd">
      <p className="rd-note">
        {L(
          'كل بند هنا جايّ من تقرير موجود بالفعل في المركز ده - الأرقام نفسها، بس مربوطة ببعضها عشان توضح القرار. الأعجل الأول.',
          'Every item here comes from a report already in this hub — same numbers, just cross-linked to make the decision clear. Most urgent first.'
        )}
      </p>
      <ul className="rd-list rd-list--insights">
        {insights.map((ins) => {
          const Icon = CATEGORY_ICON[ins.category] || Compass;
          const tone = SEVERITY_TONE[ins.severity];
          return (
            <li key={ins.id} className={`rd-alert rd-alert--insight ui-tone-${tone}`}>
              <IconBadge icon={<Icon size={20} />} tone={tone} />
              <div className="rd-alert__body">
                <strong>{ins.title_ar}</strong>
                <p>{ins.detail_ar}</p>
                <p><b>{L('الإجراء المقترح:', 'Suggested action:')}</b> {ins.action_ar}</p>
              </div>
              {onJumpTab && (
                <button type="button" className="rd-alert__go" onClick={() => onJumpTab(ins.tab)}>
                  {L('افتح', 'Open')}
                  <Go size={14} aria-hidden="true" />
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
