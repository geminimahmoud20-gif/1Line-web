import { categorySummary } from '../../utils/decisionInsights';

// Fixed pentagon layout, one node per department, following how work actually moves between them:
// marketing brings in leads -> sales works the pipeline -> what closes goes to ops to fulfil ->
// ops turns into billed commission for finance -> finance funds and reports on the team hr manages
// -> hr's own capacity is what limits how well marketing's leads get worked, closing the loop.
const RING = ['marketing', 'sales', 'ops', 'finance', 'hr'];
const POS = {
  marketing: { x: 160, y: 68 },
  sales: { x: 266, y: 145 },
  ops: { x: 226, y: 271 },
  finance: { x: 94, y: 271 },
  hr: { x: 54, y: 145 },
};
const EDGES = RING.map((id, i) => [id, RING[(i + 1) % RING.length]]);
const TONE = { critical: 'danger', warning: 'warning', info: 'info', ok: 'success' };
const WORD_AR = { critical: 'عاجل', warning: 'تنبيه', info: 'ملحوظة', ok: 'تمام' };
const WORD_EN = { critical: 'Critical', warning: 'Warning', info: 'Note', ok: 'OK' };
const LABEL_AR = { marketing: 'التسويق', sales: 'المبيعات', ops: 'التشغيل', finance: 'المالية', hr: 'الموارد البشرية' };
const LABEL_EN = { marketing: 'Marketing', sales: 'Sales', ops: 'Operations', finance: 'Finance', hr: 'HR' };
const TAB = { marketing: 'marketing', sales: 'flow', ops: 'stock', finance: 'sales', hr: 'org' };
const NODE_R = 34;

/**
 * «خريطة الأقسام»: the company's five departments, connected the way work actually flows between
 * them, each coloured and numbered by its own worst finding right now (0/ok = green). The
 * connections are fixed (how the business works), the colour and count are live from
 * categorySummary().
 */
export default function DecisionSectionMap({ insights = [], lang = 'ar', onJumpTab }) {
  const isAr = lang !== 'en';
  const rows = categorySummary(insights);
  const LABEL = isAr ? LABEL_AR : LABEL_EN;
  const WORD = isAr ? WORD_AR : WORD_EN;

  return (
    <div className="dsm" dir={isAr ? 'rtl' : 'ltr'}>
      <svg className="dsm-svg" viewBox="0 0 320 340" role="img" aria-label={isAr ? 'خريطة أقسام الشركة وحالة كل قسم' : 'Company department map and the status of each one'}>
        <g className="dsm-edges">
          {EDGES.map(([a, b]) => (
            <line key={`${a}-${b}`} x1={POS[a].x} y1={POS[a].y} x2={POS[b].x} y2={POS[b].y} />
          ))}
        </g>
        {rows.map((r) => {
          const pos = POS[r.category];
          const tone = TONE[r.severity];
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
              <circle r={NODE_R} />
              <text className="dsm-node__value" y={r.severity === 'ok' ? 7 : 6}>{r.severity === 'ok' ? '✓' : r.count}</text>
              <text className="dsm-node__label" y={NODE_R + 16}>{label}</text>
              <text className="dsm-node__word" y={NODE_R + 30}>{word}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
