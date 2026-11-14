import NotesThread from './NotesThread';
import { PageHeader } from '../ui';
import { TEAM_THREAD_ID } from '../../utils/teamNotes';

/** «محادثة الفريق»: one thread for the whole team; @name sends a message to a colleague as a notification */
export default function TeamChatPanel({ lang = 'ar' }) {
  const isAr = lang === 'ar';
  return (
    <div className="tn-page">
      <PageHeader
        title={isAr ? 'محادثة الفريق' : 'Team chat'}
        description={isAr ? 'رسالة لكل الفريق. اكتب @ واسم زميلك عشان توصله إشعار.' : 'A thread for the whole team. @name notifies a colleague.'}
      />
      <NotesThread entityType="team" entityId={TEAM_THREAD_ID} lang={lang} />
    </div>
  );
}
