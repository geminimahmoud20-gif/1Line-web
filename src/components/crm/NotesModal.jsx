import { Modal } from '../ui';
import NotesThread from './NotesThread';
import { ENTITY_LABEL } from '../../utils/teamNotes';

/** The team's notes on one client, listing or project in a dialog (listing and project rows open it) */
export default function NotesModal({ open, onClose, entityType, entityId, entityName = '', lang = 'ar' }) {
  const isAr = lang === 'ar';
  const kind = (ENTITY_LABEL[entityType] || {})[isAr ? 'ar' : 'en'] || '';
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={isAr ? 'ملاحظات الفريق' : 'Team notes'}
      description={entityName ? `${kind}: ${entityName}` : kind}
      closeLabel={isAr ? 'إغلاق' : 'Close'}
    >
      {open && <NotesThread entityType={entityType} entityId={entityId} entityName={entityName} lang={lang} />}
    </Modal>
  );
}
