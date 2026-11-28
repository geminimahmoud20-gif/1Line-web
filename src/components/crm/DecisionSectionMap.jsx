import { categorySummary } from '../../utils/decisionInsights';

// Fixed pentagon layout, kpi in the centre since it aggregates every other section.
// Ring order follows how the data actually flows: marketing brings leads into the
// pipeline (flow), the team works what's in it, what it can't save becomes a loss
// (risk), a loss often traces back to a stock gap, and stock gaps are what
// marketing/sourcing should chase next — closing the loop back to marketing.
const POS = {
  marketing: { x: 160, y: 68 },
  flow: { x: 266, y: 145 },
  team: { x: 226, y: 271 },
  risk: { x: 94, y: 271 },
  stock: { x: 54, y: 145 },
  kpi: { x: 160, y: 180 },
};
const RING = ['marketing', 'flow', 'team', 'risk', 'stock'];
const EDGES = [
  ...RING.map((id, i) => [id, RING[(i + 1) % RING.length]]),
  ...RING.map((id) => [id, 'kpi']),
];
const TONE = { critical: 'danger', warning: 'warning', info: 'info', ok: 'success' };
const WORD_AR = { critical: 'عاجل', warning: 'تنبيه', info: 'ملحوظة', ok: 'تمام' };
const WORD_EN = { critical: 'Critical', warning: 'Warning', info: 'Note', ok: 'OK' };
const LABEL_AR = { marketing: 'التسويق', flow: 'تدفق الشغل', team: 'الفريق', risk: 'الخسائر', stock: 'العقارات والطلب', kpi: 'المؤشرات' };
const LABEL_EN = { marketing: 'Marketing', flow: 'Workflow', team: 'Team', risk: 'Losses', stock: 'Stock & demand', kpi: 'KPIs' };
const TAB = { marketing: 'marketing', flow: 'flow', team: 'org', risk: 'risk', stock: 'stock', kpi: 'kpi' };
const NODE_R = { marketing: 34, flow: 34, team: 34, risk: 34, stock: 34, kpi: 42 };

/**
 * «خريطة الأقسام»: the six sections the decision center reads, connected the way data actually
 * flows between them, each coloured and numbered by its own worst finding right now (0/ok = green).
 * The connections are fixed (how the business works), the colour and count are live.
 */
export default function DecisionSectionMap({ insights = [], lang = 'ar', onJumpTab }) {
  const isAr = lang !== 'en';
  const rows = categorySummary(insights);
  const LABEL = isAr ? LABEL_AR : LABEL_EN;
  const WORD = isAr ? WORD_AR : WORD_EN;

  return (
    <div className="dsm" dir={isAr ? 'rtl' : 'ltr'}>
      <svg className="dsm-svg" viewBox="0 0 320 340" role="img" aria-label={isAr ? 'خريطة أقسام النظام وحالة كل قسم' : 'System section map and the status of each section'}>
        <g className="dsm-edges">
          {EDGES.map(([a, b]) => (
            <line key={`${a}-${b}`} x1={POS[a].x} y1={POS[a].y} x2={POS[b].x} y2={POS[b].y} />
          ))}
        </g>
        {rows.map((r) => {
          const pos = POS[r.category];
          const tone = TONE[r.severity];
          const radius = NODE_R[r.category];
          const label = LABEL[r.category];
          const word = WORD[r.severity];
          return (
            <g
              key={r.category}
              className={`dsm-node ui-tone-${tone}`}
              transform={`translate(${pos.x}, ${pos.y})`}
              tabIndex={onJumpTab ? 0 : undefined}
              role={onJumpTab ? 'button' : 'img'}
              aria-label={`${label}: ${word}${r.count ? ` (${r.count})` : ''}`}
              onClick={onJumpTab ? () => onJumpTab(TAB[r.category]) : undefined}
              onKeyDown={onJumpTab ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onJumpTab(TAB[r.category]); } } : undefined}
            >
              <circle r={radius} />
              <text className="dsm-node__value" y={r.severity === 'ok' ? 7 : 6}>{r.severity === 'ok' ? '✓' : r.count}</text>
              <text className="dsm-node__label" y={radius + 16}>{label}</text>
              <text className="dsm-node__word" y={radius + 30}>{word}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
