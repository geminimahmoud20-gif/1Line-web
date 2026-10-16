import { useState } from 'react';
import { Coins } from 'lucide-react';
import { Button, Input } from '../../ui';
import { leadCommission, DEFAULT_COMMISSION_PCT } from '../../../utils/commission';
import { toLatinDigits } from '../../../utils/latinDigits';

const money = (n) => Number(n || 0).toLocaleString('en-US');
const digits = (v) => toLatinDigits(String(v ?? '')).replace(/[^\d.]/g, '');

/** Deal value and commission for one lead; the team can set the agreed value and rate. */
export default function LeadCommissionBox({ lead, isAr, onUpdateLead }) {
  const L = (ar, en) => (isAr ? ar : en);
  const c = leadCommission(lead);
  const [value, setValue] = useState(lead.dealValue ? String(lead.dealValue) : '');
  const [pct, setPct] = useState(lead.commissionPct ? String(lead.commissionPct) : '');
  const dirty = value !== (lead.dealValue ? String(lead.dealValue) : '') || pct !== (lead.commissionPct ? String(lead.commissionPct) : '');
  const pctNum = Number(pct);
  const pctBad = pct !== '' && !(pctNum > 0 && pctNum <= 20);

  const save = () => {
    if (pctBad) return;
    onUpdateLead(lead.id, { dealValue: value ? Number(value) : null, commissionPct: pct ? pctNum : null }, lead.version);
  };

  return (
    <section className="crm-ld__block" aria-labelledby="crm-ld-commission">
      <div className="crm-ld__block-head">
        <h3 id="crm-ld-commission" className="crm-ld__h"><Coins size={16} aria-hidden="true" />{L('العمولة', 'Commission')}</h3>
      </div>
      <dl className="crm-ld__facts">
        <div><dt>{L('قيمة الصفقة', 'Deal value')}</dt><dd>{c.value ? `${money(c.value)} ${L('ج.م', 'EGP')}` : '—'}</dd></div>
        <div><dt>{L('لو اتقفلت', 'If it closes')}</dt><dd>{c.gross ? `${money(c.gross)} ${L('ج.م', 'EGP')}` : '—'} <small>({c.pct}%)</small></dd></div>
        <div><dt>{L('المتوقع بالمرحلة', 'Weighted by stage')}</dt><dd>{c.weighted ? `${money(c.weighted)} ${L('ج.م', 'EGP')}` : '—'} <small>({Math.round(c.probability * 100)}%)</small></dd></div>
      </dl>
      {onUpdateLead && (
        <div className="crm-ld__commission-edit">
          <Input
            label={L('القيمة المتفق عليها', 'Agreed value')}
            hint={L('فاضي = السعر المطلوب أو الميزانية', 'Empty = asking price or budget')}
            inputMode="numeric"
            value={value ? money(value) : ''}
            onChange={(e) => setValue(digits(e.target.value).replace(/\..*/, '').slice(0, 12))}
          />
          <Input
            label={L('نسبة العمولة %', 'Commission %')}
            hint={L(`فاضي = ${DEFAULT_COMMISSION_PCT}%`, `Empty = ${DEFAULT_COMMISSION_PCT}%`)}
            error={pctBad ? L('من 0.1 لـ 20', '0.1 to 20') : undefined}
            inputMode="decimal"
            value={pct}
            onChange={(e) => setPct(digits(e.target.value).slice(0, 5))}
          />
          <Button size="sm" variant="secondary" disabled={!dirty || pctBad} onClick={save}>{L('احفظ', 'Save')}</Button>
        </div>
      )}
    </section>
  );
}
