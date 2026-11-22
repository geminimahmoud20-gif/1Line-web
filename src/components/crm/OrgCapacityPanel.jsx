import { useMemo, useState } from 'react';
import { Gauge, Users, TriangleAlert, UserX, Crown, Network, Building2 } from 'lucide-react';
import { getActiveAccessConfig } from '../../services/accessConfig';
import { useGoals } from '../../hooks/useGoals';
import { orgReport, DEFAULT_CAPACITY } from '../../utils/orgReport';
import { CAPACITY_KEY } from '../../utils/goals';
import { EmptyState, KpiRow, KpiTile, Avatar, Badge, Meter, RingGauge, IconBadge } from '../ui';
import './report-dash.css';

const num = (n) => Number(n || 0).toLocaleString('en-US');
const LEVEL = {
  over: { ar: 'فوق طاقته', tone: 'danger' },
  high: { ar: 'قرّب يتملي', tone: 'warning' },
  ok: { ar: 'مناسب', tone: 'info' },
  low: { ar: 'عنده مساحة', tone: 'success' },
};
const TEAM_TONES = ['info', 'accent', 'success', 'warning'];
const loadTone = (pct) => (pct > 100 ? 'danger' : pct >= 80 ? 'warning' : 'success');

function Person({ p, lead = false, isAr, canManage, draft, setDraft, onSave }) {
  const L = (ar, en) => (isAr ? ar : en);
  const lv = p.level ? LEVEL[p.level] : null;
  return (
    <li className={`rd-person${lead ? ' rd-person--lead' : ''}`}>
      <div className="rd-person__head">
        <Avatar name={p.name || '؟'} />
        <div className="rd-person__who">
          <strong>{p.name || L('من غير اسم', 'Unnamed')}</strong>
          <span><Badge tone={lead ? 'primary' : 'neutral'}>{p.roleLabel}</Badge></span>
        </div>
        {lv && <Badge tone={lv.tone} dot>{lv.ar}</Badge>}
      </div>
      {p.level && (
        <>
          <Meter value={p.open} max={p.capacity} tone={LEVEL[p.level].tone} label={L(`${num(p.open)} عميل مفتوح من ${num(p.capacity)}`, `${p.open} of ${p.capacity}`)} valueText={`${p.pct}%`} />
          <div className="rd-person__stats">
            <span>{L('ملاك', 'owners')} <b>{num(p.sellers)}</b></span>
            <span>{L('مشترين', 'buyers')} <b>{num(p.buyers)}</b></span>
            {p.idle > 0 && <Badge tone="warning">{L(`${num(p.idle)} من غير لمسة 48 ساعة`, `${p.idle} idle`)}</Badge>}
            {canManage && (
              <label className="rd-person__cap">
                {L('السعة', 'Capacity')}
                <input className="ui-input rd-input" inputMode="numeric" value={draft[p.uid] ?? (p.customCapacity ? p.capacity : '')} placeholder={String(p.capacity)}
                  onChange={(e) => setDraft((d) => ({ ...d, [p.uid]: e.target.value }))} onBlur={() => onSave(p.uid)} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }} />
              </label>
            )}
          </div>
        </>
      )}
      {p.duties.length > 0 && (
        <details className="rd-person__duties">
          <summary>{L(`المهام (${p.duties.length})`, `Duties (${p.duties.length})`)}</summary>
          <ul>{p.duties.map((d) => <li key={d}>{d}</li>)}</ul>
        </details>
      )}
    </li>
  );
}

/** «الهيكل والسعة»: the team as it is arranged, each role's duties, and how full each person is against what he can hold */
export default function OrgCapacityPanel({ leads = [], members = [], me, lang = 'ar', canManage = false, triggerToast }) {
  const isAr = lang !== 'en';
  const L = (ar, en) => (isAr ? ar : en);
  const { goals, ready, save } = useGoals();
  const [draft, setDraft] = useState({});
  const r = useMemo(() => orgReport(leads, members, getActiveAccessConfig() || {}, goals), [leads, members, goals]);

  const saveCap = async (uid) => {
    if (draft[uid] === undefined) return;
    const value = Math.max(0, Math.round(Number(String(draft[uid]).replace(/[^\d]/g, '')) || 0));
    setDraft((d) => { const { [uid]: _drop, ...rest } = d; return rest; });
    const current = goals.people?.[uid]?.[CAPACITY_KEY] || 0;
    if (value === current) return;
    const person = { ...(goals.people?.[uid] || {}) };
    if (value) person[CAPACITY_KEY] = value; else delete person[CAPACITY_KEY];
    const ok = await save({ ...goals, people: { ...goals.people, [uid]: person } }, me?.uid);
    triggerToast?.(ok ? L('اتحفظت السعة', 'Capacity saved') : L('ما اتحفظتش، جرّب تاني', 'Not saved'), ok ? 'success' : 'error');
  };
  const saveDefault = async () => {
    if (draft.__team === undefined) return;
    const value = Math.max(0, Math.round(Number(String(draft.__team).replace(/[^\d]/g, '')) || 0));
    setDraft((d) => { const { __team: _drop, ...rest } = d; return rest; });
    const team = { ...(goals.team || {}) };
    if (value) team[CAPACITY_KEY] = value; else delete team[CAPACITY_KEY];
    const ok = await save({ ...goals, team }, me?.uid);
    triggerToast?.(ok ? L('اتحفظت السعة الافتراضية', 'Default saved') : L('ما اتحفظتش، جرّب تاني', 'Not saved'), ok ? 'success' : 'error');
  };

  if (!members.length) return <EmptyState title={L('قايمة الفريق مش متاحة', 'Team list not available')} description={L('القايمة الكاملة بتظهر للمدير العام.', 'The full list shows to the super admin.')} />;
  const p = { isAr, canManage: canManage && ready, draft, setDraft, onSave: saveCap };
  const t = r.totals;
  const over = r.people.filter((x) => x.level === 'over').length;
  const room = r.people.filter((x) => x.level === 'low').length;
  const levels = ['over', 'high', 'ok', 'low'].map((id) => ({ id, ...LEVEL[id], count: r.people.filter((x) => x.level === id).length }));

  return (
    <div className="rd">
      <KpiRow label={L('أرقام الفريق', 'Team figures')}>
        <KpiTile label={L('حمل فريق المبيعات', 'Sales team load')} value={t.pct} unit="%" icon={<Gauge size={18} />} tone={loadTone(t.pct)} hint={L(`${num(t.open)} عميل من سعة ${num(t.capacity)}`, `${t.open} of ${t.capacity}`)} />
        <KpiTile label={L('بياعين', 'Salespeople')} value={t.sellers} icon={<Users size={18} />} tone="info" hint={L(`من ${num(t.people)} في الفريق`, `of ${t.people}`)} />
        <KpiTile label={L('فوق طاقتهم', 'Over capacity')} value={over} icon={<TriangleAlert size={18} />} tone={over ? 'danger' : 'success'} hint={L(`وعندهم مساحة: ${num(room)}`, `with room: ${room}`)} />
        <KpiTile label={L('عملاء من غير مسؤول', 'Unassigned clients')} value={r.unassigned.open} icon={<UserX size={18} />} tone="accent" hint={L(`ملاك ${num(r.unassigned.sellers)} · مشترين ${num(r.unassigned.buyers)}`, `owners ${r.unassigned.sellers} · buyers ${r.unassigned.buyers}`)} />
      </KpiRow>

      <div className="rd-grid">
        <section className="rd-card" aria-labelledby="org-teams">
          <div>
            <h3 id="org-teams" className="rd-card__title">{L('حمل كل فريق', 'Load per team')}</h3>
            <p className="rd-card__sub">{L('عملاء البياعين المفتوحين ÷ سعتهم', 'Open clients ÷ capacity')}</p>
          </div>
          {r.teams.map((team, i) => (
            <Meter key={team.id} value={team.open} max={team.capacity || 1} tone={TEAM_TONES[i % TEAM_TONES.length]} size="lg"
              label={`${team.label} · ${L(`${num(team.open)} من ${num(team.capacity)}`, `${team.open}/${team.capacity}`)}`} valueText={`${team.pct}%`} />
          ))}
          {canManage && ready && (
            <label className="rd-person__cap">
              {L('السعة الافتراضية لكل بياع (عملاء مفتوحين في نفس الوقت)', 'Default capacity per salesperson')}
              <input className="ui-input rd-input" inputMode="numeric" value={draft.__team ?? (goals.team?.[CAPACITY_KEY] || '')} placeholder={String(DEFAULT_CAPACITY)}
                onChange={(e) => setDraft((d) => ({ ...d, __team: e.target.value }))} onBlur={saveDefault} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }} />
            </label>
          )}
        </section>
        <section className="rd-card" aria-labelledby="org-ring">
          <div>
            <h3 id="org-ring" className="rd-card__title">{L('الفريق كله', 'Whole team')}</h3>
            <p className="rd-card__sub">{L('مين في أنهي مستوى حمل', 'Who is at which load')}</p>
          </div>
          <div className="rd-person__head">
            <RingGauge value={Math.min(t.pct, 100)} center={`${t.pct}%`} caption={L('حمل', 'load')} tone={loadTone(t.pct)} size={112} />
            <ul className="rd-list">
              {levels.map((lv) => (
                <li key={lv.id} className="rd-legend"><span className={`ui-tone-${lv.tone}`}><i />{lv.ar}: <b>{num(lv.count)}</b></span></li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      <section className="rd-card rd-org" aria-labelledby="org-chart">
        <div>
          <h3 id="org-chart" className="rd-card__title"><Network size={18} aria-hidden="true" /> {L('الهيكل الإداري', 'Structure')}</h3>
          <p className="rd-card__sub">{L('المهام من صلاحيات كل دور في «إدارة الفريق»؛ لو مهمة ناقصة أو زيادة عدّل صلاحيات الدور', 'Duties come from each role’s permissions')}</p>
        </div>
        {r.top.length > 0 && (
          <ul className="rd-org__top rd-list">{r.top.map((x) => <Person key={x.uid} p={x} lead {...p} />)}</ul>
        )}
        <div className="rd-org__teams">
          {r.teams.map((team, i) => (
            <div className={`rd-card rd-team ui-tone-${TEAM_TONES[i % TEAM_TONES.length]}`} key={team.id}>
              <div className="rd-team__head">
                <span className="rd-card__title"><IconBadge icon={<Users size={16} />} tone={TEAM_TONES[i % TEAM_TONES.length]} size="sm" /> {team.label}</span>
                <Badge tone={loadTone(team.pct)}>{team.pct}%</Badge>
              </div>
              <ul className="rd-list rd-org">
                {team.managers.map((x) => <Person key={x.uid} p={x} lead {...p} />)}
                {team.people.map((x) => <Person key={x.uid} p={x} {...p} />)}
              </ul>
            </div>
          ))}
          {r.support.length > 0 && (
            <div className="rd-card rd-team ui-tone-neutral">
              <div className="rd-team__head"><span className="rd-card__title"><IconBadge icon={<Building2 size={16} />} tone="neutral" size="sm" /> {L('الإدارات المساندة', 'Support')}</span></div>
              <ul className="rd-list rd-org">{r.support.map((x) => <Person key={x.uid} p={x} {...p} />)}</ul>
            </div>
          )}
        </div>
        <p className="rd-note"><Crown size={12} aria-hidden="true" /> {L('الحمل = العملاء المفتوحين (من جديد لحد الإغلاق) ÷ السعة. «فوق طاقته» فوق 100%، «قرّب يتملي» من 80%، «عنده مساحة» تحت 30%.', 'Load = open clients ÷ capacity.')}</p>
      </section>
    </div>
  );
}
