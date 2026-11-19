import { useEffect, useMemo, useState } from 'react';
import { TrendingDown, TrendingUp, Info, AlertTriangle } from 'lucide-react';
import { moneyReport } from '../../utils/moneyReport';
import { loadCampaignSpend } from '../../firebaseLazy';
import { campaignLabel } from '../../utils/crmLabels';
import { EmptyState } from '../ui';

const SPEND_KEY = 'crm_campaign_spend_v1';
const readLocalSpend = () => { try { return JSON.parse(localStorage.getItem(SPEND_KEY) || '{}') || {}; } catch { return {}; } };
const num = (n) => Number(n || 0).toLocaleString('en-US');
const egp = (n, isAr) => `${num(n)} ${isAr ? 'ج.م' : 'EGP'}`;

/** «القمع والفلوس»: what the ads cost, what they brought, what a deal cost, what it paid, and what is still coming. */
export default function MoneyReportPanel({ leads = [], lang = 'ar', onOpenTab }) {
  const isAr = lang !== 'en';
  const L = (ar, en) => (isAr ? ar : en);
  const [now] = useState(() => Date.now());
  const [spend, setSpend] = useState(readLocalSpend);
  useEffect(() => {
    let alive = true;
    loadCampaignSpend().then((remote) => { if (alive && remote) setSpend((local) => ({ ...local, ...remote })); }).catch(() => { /* the copy on this device is used */ });
    return () => { alive = false; };
  }, []);
  const r = useMemo(() => moneyReport(leads, { spend, now }), [leads, spend, now]);
  const { ads, forecast, funnel, campaigns } = r;
  const stage = (id) => r.stageLabel(id, isAr);

  const cards = [
    { id: 'spend', ar: 'الإنفاق على الإعلانات', en: 'Ad spend', v: ads.hasSpend ? egp(ads.spend, isAr) : '—' },
    { id: 'leads', ar: 'عملاء من الإعلانات', en: 'Ad clients', v: num(ads.leads) },
    { id: 'cpl', ar: 'تكلفة العميل', en: 'Cost per client', v: ads.costPerLead ? egp(ads.costPerLead, isAr) : '—' },
    { id: 'cpv', ar: 'تكلفة المعاينة', en: 'Cost per viewing', v: ads.costPerVisit ? egp(ads.costPerVisit, isAr) : '—' },
    { id: 'cpd', ar: 'تكلفة الصفقة', en: 'Cost per deal', v: ads.costPerDeal ? egp(ads.costPerDeal, isAr) : '—' },
    { id: 'won', ar: 'عمولة الصفقات المقفولة', en: 'Commission won', v: ads.wonCommission ? egp(ads.wonCommission, isAr) : '—' }
  ];
  const profitUp = ads.profit >= 0;

  return (
    <section className="pr-panel" aria-label={L('القمع والفلوس', 'Funnel and money')}>
      <ul className="pr-findings" aria-label={L('ملاحظات', 'Findings')}>
        <li className="is-info"><Info size={18} aria-hidden="true" /><span>{L('الأرقام هنا «من البداية»: الإنفاق بيتسجّل لكل حملة مش لكل يوم، فمقارنته بفترة معيّنة هتبقى مضللة.', 'All time: spend is entered per campaign, not per day, so a date range would mislead.')}</span></li>
        {!ads.hasSpend && (
          <li className="is-warn">
            <AlertTriangle size={18} aria-hidden="true" />
            <span>
              {L('مفيش إنفاق مسجّل، فالتكاليف والربح مش ظاهرين. اكتب الصرف أو اسحبه من فيسبوك في تقرير الحملات.', 'No spend entered, so costs and profit are hidden. Enter it, or pull it from Facebook, in the campaign report.')}{' '}
              {onOpenTab && <button type="button" className="ui-btn ui-btn--secondary ui-btn--sm" onClick={() => onOpenTab('campaigns')}>{L('افتح تقرير الحملات', 'Open the campaign report')}</button>}
            </span>
          </li>
        )}
      </ul>

      <div className="pr-cards">
        {cards.map((c) => (
          <div key={c.id} className="pr-card">
            <span className="pr-card__label">{L(c.ar, c.en)}</span>
            <strong className="pr-card__value">{c.v}</strong>
            <span className="pr-card__delta">&nbsp;</span>
          </div>
        ))}
        <div className="pr-card">
          <span className="pr-card__label">{L('الربح من الإعلانات', 'Profit from ads')}</span>
          <strong className="pr-card__value">{ads.hasSpend ? egp(ads.profit, isAr) : '—'}</strong>
          {ads.hasSpend ? (
            <span className={`pr-card__delta is-${profitUp ? 'up' : 'down'}`}>
              {profitUp ? <TrendingUp size={14} aria-hidden="true" /> : <TrendingDown size={14} aria-hidden="true" />}
              {ads.returnPerEgp ? `${ads.returnPerEgp} ${L('ج.م رجعت لكل ١ ج.م', 'EGP back per 1 EGP')}` : L('لسه مفيش صفقة مقفولة', 'No deal closed yet')}
            </span>
          ) : <span className="pr-card__delta">&nbsp;</span>}
        </div>
      </div>

      <div className="pr-block">
        <h3>{L('اللي جاي', 'What is still coming')}</h3>
        <div className="pr-cards">
          <div className="pr-card">
            <span className="pr-card__label">{L('عمولة متوقعة من الصفقات المفتوحة', 'Expected from open deals')}</span>
            <strong className="pr-card__value">{egp(forecast.weighted, isAr)}</strong>
            <span className="pr-card__delta">{L('لو اتقفلت كلها:', 'If all close:')} {egp(forecast.gross, isAr)}</span>
          </div>
          <div className="pr-card">
            <span className="pr-card__label">{L('اتحققت الشهر ده', 'Won this month')}</span>
            <strong className="pr-card__value">{egp(forecast.wonThisMonth, isAr)}</strong>
            <span className="pr-card__delta">{num(forecast.wonCount)} {L('صفقة', 'deals')}</span>
          </div>
          <div className="pr-card">
            <span className="pr-card__label">{L('قريبة من الإغلاق', 'Near closing')}</span>
            <strong className="pr-card__value">{egp(forecast.late, isAr)}</strong>
            <span className="pr-card__delta">{L('تفاوض وإغلاق', 'Negotiating + closing')}</span>
          </div>
        </div>
        {forecast.missingValue > 0 && <p className="pr-note">{L(`${num(forecast.missingValue)} صفقة مفتوحة من غير قيمة مسجّلة، فمش محسوبة في المتوقع. سجّل قيمة الصفقة في ملف العميل علشان الرقم يبقى أدق.`, `${num(forecast.missingValue)} open deals have no value entered and are left out of the forecast.`)}</p>}
      </div>

      <div className="pr-block">
        <h3>{L('أكتر خطوة بتخسّرك عملاء', 'The step that loses the most clients')}</h3>
        {!funnel.weakest ? (
          <EmptyState title={L('لسه مفيش عملاء كفاية', 'Not enough clients yet')} description={L('الحكم بيظهر لما يبقى عندك ١٠ عملاء على الأقل عدّوا الخطوة اللي قبلها.', 'It appears once at least 10 clients have passed the step before.')} />
        ) : (
          <p>
            {L('من', 'From')} «{stage(funnel.weakest.from)}» {L('لـ', 'to')} «{stage(funnel.weakest.to)}»: <b>{funnel.weakest.rate}%</b> {L('بس بيكملوا', 'only carry on')} ({num(funnel.weakest.lost)} {L('من', 'of')} {num(funnel.weakest.of)} {L('وقفوا', 'stopped')}).{' '}
            <small className="pr-note">{L('ده أقل معدّل عبور بين الخطوات بعد ما بنتجاهل الخطوات اللي عيّنتها صغيرة، يعني أول مكان تحسّن فيه.', 'The lowest pass-through rate among steps with enough clients: the first place to improve.')}</small>
          </p>
        )}
        {onOpenTab && <p><button type="button" className="ui-btn ui-btn--secondary ui-btn--sm" onClick={() => onOpenTab('campaigns')}>{L('تقرير الحملات بالتفصيل', 'Campaign report in detail')}</button></p>}
      </div>

      {(campaigns.best.length > 0 || campaigns.bleeding.length > 0) && (
        <div className="pr-block">
          <h3>{L('الحملات', 'Campaigns')}</h3>
          {campaigns.best.length > 0 && (
            <>
              <p className="pr-note">{L('أكتر حملات رجّعت فلوس:', 'Paying back best:')}</p>
              <ul className="pr-team">
                {campaigns.best.map((c) => <li key={c.key}><span className="pr-team__name">{campaignLabel(c.campaign)}</span><span>{c.returnPerEgp} {L('ج.م لكل ١ ج.م', 'EGP per 1 EGP')}</span><span>{egp(c.spend, isAr)}</span></li>)}
              </ul>
            </>
          )}
          {campaigns.bleeding.length > 0 && (
            <>
              <p className="pr-note">{L('صرفت فلوس وماحدش وصل لمعاينة (راجع جودتها أو وقّفها):', 'Spent money, nobody reached a viewing (review or stop):')}</p>
              <ul className="pr-team">
                {campaigns.bleeding.map((c) => <li key={c.key}><span className="pr-team__name">{campaignLabel(c.campaign)}</span><span>{num(c.leads)} {L('عميل', 'clients')}</span><span>{egp(c.spend, isAr)}</span></li>)}
              </ul>
            </>
          )}
        </div>
      )}
    </section>
  );
}
