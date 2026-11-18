// =============================================================
//  «أداء الإعلانات»: totals, per-campaign health and plain-language findings from what Meta reports
//  per campaign ({ id, name, spend, impressions, reach, frequency, linkClicks, leads, messages, results }).
//  Pure, so tests/unit/ads-insights.test.mjs runs it. Spend is in EGP (the pull refuses other currencies).
// =============================================================

const safeDiv = (a, b) => (b > 0 ? a / b : 0);
const nf = (n) => Math.round(n).toLocaleString('en-US');
// A campaign's name inside an Arabic sentence: isolated, so a Latin name does not reorder the figures around it
const q = (name) => `«\u2068${name}\u2069»`;

/** Link click-through rate in %, and the cost of a click / a thousand impressions / a result */
export const campaignRates = (c) => ({
  ctr: safeDiv(c.linkClicks, c.impressions) * 100,
  cpc: safeDiv(c.spend, c.linkClicks),
  cpm: safeDiv(c.spend, c.impressions) * 1000,
  cpr: safeDiv(c.spend, c.results)
});

export function adsTotals(campaigns = []) {
  const t = campaigns.reduce((a, c) => ({
    spend: a.spend + c.spend, impressions: a.impressions + c.impressions, linkClicks: a.linkClicks + c.linkClicks,
    leads: a.leads + c.leads, messages: a.messages + c.messages, results: a.results + c.results
  }), { spend: 0, impressions: 0, linkClicks: 0, leads: 0, messages: 0, results: 0 });
  return { ...t, campaigns: campaigns.length, ...campaignRates(t) };
}

/** 'good' | 'bad' | 'ok': a result cheaper than 70% of the average is good; real money with no result is bad */
export function campaignHealth(c, totals) {
  const minSpend = Math.max(200, totals.spend * 0.05);
  if (c.results === 0) return c.spend >= minSpend ? 'bad' : 'ok';
  const avg = totals.cpr;
  if (avg && c.results >= 3 && campaignRates(c).cpr <= avg * 0.7) return 'good';
  if (avg && c.results >= 3 && campaignRates(c).cpr >= avg * 1.6) return 'bad';
  return 'ok';
}

/**
 * What to do next, in order of importance: [{ tone: 'warn'|'good'|'info', text }].
 * Every rule needs enough volume to mean something, so a campaign with a few pounds never triggers it.
 */
export function adsFindings(campaigns = []) {
  const live = campaigns.filter((c) => c.spend > 0);
  if (!live.length) return [];
  const t = adsTotals(live);
  const out = [];
  const minSpend = Math.max(200, t.spend * 0.05);

  if (t.results === 0) {
    out.push({ tone: 'warn', text: `صرفت ${nf(t.spend)} ج.م وميتا ما سجلتش ولا نتيجة (عميل محتمل أو محادثة). غالبًا الحملات هدفها زيارات أو تفاعل، أو التتبع مش متظبط. شغّل حملات بهدف «عملاء محتملين» أو «رسائل» عشان تقدر تقارن التكلفة.` });
  } else {
    const dead = live.filter((c) => c.results === 0 && c.spend >= minSpend).sort((a, b) => b.spend - a.spend);
    if (dead.length) {
      const sum = dead.reduce((a, c) => a + c.spend, 0);
      out.push({ tone: 'warn', text: `${nf(sum)} ج.م (${Math.round((sum / t.spend) * 100)}% من الصرف) راحت على ${dead.length} حملة من غير ولا نتيجة، أكبرها ${q(dead[0].name)}. وقّفها أو غيّر الإعلان والجمهور.` });
    }
    const rated = live.filter((c) => c.results >= 3).map((c) => ({ c, cpr: campaignRates(c).cpr })).sort((a, b) => a.cpr - b.cpr);
    if (rated.length) {
      const best = rated[0];
      const ratio = t.cpr ? t.cpr / best.cpr : 1;
      out.push({ tone: 'good', text: `أرخص نتيجة من ${q(best.c.name)}: ${nf(best.cpr)} ج.م للنتيجة${ratio >= 1.2 ? ` (أرخص ${ratio.toFixed(1)} مرة من المتوسط ${nf(t.cpr)})` : ''}. زوّد ميزانيتها تدريجيًا حوالي 20% كل كام يوم وراقب التكلفة.` });
      const worst = rated[rated.length - 1];
      if (rated.length > 1 && worst.cpr >= best.cpr * 2) {
        out.push({ tone: 'warn', text: `${q(worst.c.name)} بتكلّف ${nf(worst.cpr)} ج.م للنتيجة، ${(worst.cpr / best.cpr).toFixed(1)} مرة أغلى من أرخص حملة. انقل جزء من ميزانيتها للأرخص.` });
      }
    }
  }

  const weak = live.filter((c) => c.impressions >= 3000 && campaignRates(c).ctr < 0.8).sort((a, b) => b.spend - a.spend);
  if (weak.length) out.push({ tone: 'warn', text: `الإعلان مش بيشد الناس في ${weak.length} حملة (نسبة النقر أقل من 0.8%)، أولها ${q(weak[0].name)} (${campaignRates(weak[0]).ctr.toFixed(2)}%). جرّب صورة أو فيديو مختلف وعنوان أوضح.` });

  const tired = live.filter((c) => c.impressions >= 3000 && c.frequency >= 3.5).sort((a, b) => b.frequency - a.frequency);
  if (tired.length) out.push({ tone: 'warn', text: `${q(tired[0].name)} ظهرت لنفس الناس ${tired[0].frequency} مرة في المتوسط. الجمهور اتعب منها: وسّع الجمهور أو بدّل الإعلان.` });

  if (live.length > 1) {
    const top = live[0];
    const share = Math.round((top.spend / t.spend) * 100);
    if (share >= 60) out.push({ tone: 'info', text: `${share}% من الصرف على حملة واحدة (${q(top.name)}). لو أداؤها مش أحسن واحدة، وزّع الميزانية.` });
  }
  return out;
}
