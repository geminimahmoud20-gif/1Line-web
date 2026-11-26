import { useMemo } from 'react';
import { UserCheck } from 'lucide-react';
import { useTasks } from '../../../hooks/useTasks';
import { Avatar, Badge } from '../../ui';
import LeadTasks from './LeadTasks';
import NotesThread from '../NotesThread';
import { participantsOf } from '../../../utils/leadTeam';
import './lead-team.css';

/**
 * «الفريق»: everything the team does around one client in one place: who has the client and who else has worked it,
 * the tasks on the client (a manager gives one to the owner from here), and the comments between colleagues.
 */
export default function LeadTeamPanel({ lead, isAr, triggerToast, onUpdateLead, members = [], canAssign = false, activeRole }) {
  const L = (ar, en) => (isAr ? ar : en);
  const { tasks } = useTasks();
  const people = useMemo(() => participantsOf(lead, tasks), [lead, tasks]);
  const owner = people.find((p) => p.role === 'owner');
  const others = people.filter((p) => p.role !== 'owner');

  return (
    <div className="lt">
      <section className="lt__people" aria-label={L('مين على العميل ده', 'Who is on this client')}>
        <h3 className="lt__h"><UserCheck size={16} aria-hidden="true" />{L('على العميل ده', 'On this client')}</h3>
        <ul className="lt__list">
          {owner ? (
            <li className="lt__person is-owner">
              <Avatar name={owner.name} size="sm" />
              <span><b>{owner.name}</b><small>{L('المسؤول', 'Owner')}{lead.assignedTo && lead.assignedTo !== 'Unassigned' ? ` · ${lead.assignedTo}` : ''}</small></span>
            </li>
          ) : (
            <li className="lt__person is-empty"><span><b>{L('لسه من غير مسؤول', 'Nobody holds this client')}</b><small>{lead.assignedTo && lead.assignedTo !== 'Unassigned' ? lead.assignedTo : L('في الصندوق المشترك', 'In the shared pool')}</small></span></li>
          )}
          {others.map((p) => (
            <li key={p.name} className="lt__person">
              <Avatar name={p.name} size="sm" />
              <span><b>{p.name}</b><small>{p.why.map((w) => L(w.ar, w.en)).join(' · ')}</small></span>
            </li>
          ))}
        </ul>
        {!others.length && owner && <p className="lt__hint">{L('لسه محدش تاني اشتغل على العميل ده. اكتب تعليق أو كلّف زميل بمهمة ويظهر هنا.', 'Nobody else has worked on this client yet.')}</p>}
        {others.length > 0 && <Badge tone="neutral">{L(`${others.length + (owner ? 1 : 0)} على العميل`, `${others.length + (owner ? 1 : 0)} people`)}</Badge>}
      </section>

      <LeadTasks lead={lead} isAr={isAr} triggerToast={triggerToast} onUpdateLead={onUpdateLead} members={members} canAssign={canAssign} title={L('مهام العميل', 'Client tasks')} activeRole={activeRole} />

      <section className="lt__comments" aria-label={L('تعليقات الفريق', 'Team comments')}>
        <h3 className="lt__h">{L('تعليقات الفريق', 'Team comments')}</h3>
        <p className="lt__hint">{L('كلام بين الفريق عن العميل ده بس، العميل مش بيشوفه. اكتب @ واسم زميل علشان يوصله تنبيه.', 'Between colleagues only; the client never sees it. Type @ and a name to notify someone.')}</p>
        <NotesThread entityType="lead" entityId={lead.id} entityName={lead.name || ''} lang={isAr ? 'ar' : 'en'} className="crm-ld__team" />
      </section>
    </div>
  );
}
