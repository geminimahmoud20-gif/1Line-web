import { useState } from 'react';
import { Button, Input } from '../../ui';
import { askingPriceOf } from '../../../utils/leadPipeline';
import { toLatinDigits } from '../../../utils/latinDigits';

const money = (n) => Number(n || 0).toLocaleString('en-US');

/**
 * The price the owner agreed to list at, after the inspection and valuation. An owner who asked us
 * to value the property comes in without one, and the pipeline needs it before «معروض للبيع».
 */
export default function SellerAskingPrice({ lead, isAr, onUpdateLead }) {
  const L = (ar, en) => (isAr ? ar : en);
  const saved = askingPriceOf(lead);
  const [value, setValue] = useState(saved ? String(saved) : '');
  const dirty = value !== (saved ? String(saved) : '');

  const save = () => {
    if (!value) return;
    onUpdateLead(lead.id, { askingPrice: Number(value), lastActivityAt: new Date().toISOString() }, lead.version);
  };

  return (
    <div className="crm-ld__commission-edit">
      <Input
        label={L('السعر اللي هنعرض بيه', 'Listing price')}
        hint={saved ? L('اتفقنا عليه مع المالك', 'Agreed with the owner') : L('سجّله بعد المعاينة والتقييم عشان نقدر نعرض العقار', 'Set it after the inspection to list the unit')}
        inputMode="numeric"
        value={value ? money(value) : ''}
        onChange={(e) => setValue(toLatinDigits(e.target.value).replace(/[^\d]/g, '').slice(0, 12))}
      />
      <Button size="sm" variant="secondary" disabled={!dirty || !value} onClick={save}>{L('احفظ', 'Save')}</Button>
    </div>
  );
}
