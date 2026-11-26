import { useState, useMemo } from 'react';
import { FileText, Plus, Eye, Download, Trash2, Upload, Shield, FileCheck, Receipt, FolderOpen } from 'lucide-react';
import { Button, Modal, Input, Select, Textarea, Badge, EmptyState, useConfirm } from '../../ui';
import { useAuth } from '../../../context/AuthContext';
import { userDisplayName } from '../../../utils/assignees';
import './client-documents.css';

const CATEGORIES = [
  { id: 'national_id', ar: 'بطاقة هوية', en: 'National ID', tone: 'primary', Icon: Shield },
  { id: 'contract', ar: 'عقد / توكيل', en: 'Contract / POA', tone: 'accent', Icon: FileCheck },
  { id: 'receipt', ar: 'إيصال / سداد', en: 'Receipt / Payment', tone: 'success', Icon: Receipt },
  { id: 'inspection', ar: 'معاينة وتثمين', en: 'Inspection Report', tone: 'info', Icon: FileText },
  { id: 'other', ar: 'مستندات أخرى', en: 'Other', tone: 'neutral', Icon: FolderOpen }
];

// Documents are embedded as base64 directly on the lead's own Firestore document (no separate blob
// storage for them yet), so the real ceiling is Firestore's 1 MiB per-document hard limit, not
// whatever the upload box advertises. Base64 inflates a file by ~4/3; these budgets leave room for
// the lead's other fields and for documents already attached (see services/catalog.js's
// MAX_DOC_BYTES for the same reasoning applied to listings).
const MAX_DOCUMENT_BYTES = 600 * 1024; // raw file size, before base64
const MAX_TOTAL_DOCUMENT_BYTES = 800 * 1024; // combined base64 size of every attached document

const fmtDate = (iso, isAr) => {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isFinite(d.getTime())
    ? d.toLocaleDateString(isAr ? 'ar-EG-u-nu-latn' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : '';
};

export default function ClientDocuments({ lead, isAr = true, onUpdateLead, triggerToast }) {
  const { currentUser } = useAuth();
  const confirm = useConfirm();
  const [filter, setFilter] = useState('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);

  // Upload Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState('national_id');
  const [notes, setNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileDataUrl, setFileDataUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  // Dependency is `lead` (not `lead?.documents`): that's what the compiler infers from this access,
  // and a narrower manual array here made it skip optimizing the component entirely.
  const docs = useMemo(() => (Array.isArray(lead?.documents) ? lead.documents : []), [lead]);

  const filteredDocs = useMemo(() => {
    if (filter === 'all') return docs;
    return docs.filter((d) => d.type === filter);
  }, [docs, filter]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_DOCUMENT_BYTES) {
      triggerToast?.(
        isAr
          ? `أقصى حجم للملف ${Math.round(MAX_DOCUMENT_BYTES / 1024)} كيلوبايت (المستندات بتتخزن كاملة في ملف العميل)`
          : `Max file size is ${Math.round(MAX_DOCUMENT_BYTES / 1024)}KB`,
        'error'
      );
      return;
    }
    setSelectedFile(file);
    if (!name.trim()) {
      setName(file.name.replace(/\.[^/.]+$/, ''));
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setFileDataUrl(ev.target?.result || '');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveDocument = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      triggerToast?.(isAr ? 'اكتب اسم المستند' : 'Enter document title', 'error');
      return;
    }
    if (!fileDataUrl && !selectedFile) {
      triggerToast?.(isAr ? 'اختر ملف المستند' : 'Choose a file to attach', 'error');
      return;
    }
    const existingBytes = docs.reduce((sum, d) => sum + (d.url?.length || 0), 0);
    if (existingBytes + fileDataUrl.length > MAX_TOTAL_DOCUMENT_BYTES) {
      triggerToast?.(isAr ? 'إجمالي حجم مستندات العميل وصل للحد الأقصى. احذف مستنداً قديماً أولاً.' : 'Total document size limit reached. Delete an old document first.', 'error');
      return;
    }

    setUploading(true);
    const catObj = CATEGORIES.find((c) => c.id === category) || CATEGORIES[0];
    const catLabel = isAr ? catObj.ar : catObj.en;
    const authorName = userDisplayName(currentUser) || (isAr ? 'مسؤول المبيعات' : 'Sales Advisor');
    const nowIso = new Date().toISOString();

    const newDoc = {
      id: `doc-${Date.now()}`,
      name: name.trim(),
      type: category,
      url: fileDataUrl,
      fileName: selectedFile?.name || 'document',
      fileSize: selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : '',
      uploadedAt: nowIso,
      uploadedBy: authorName,
      notes: notes.trim()
    };

    const nextDocs = [newDoc, ...docs];
    const taskLog = {
      timestamp: nowIso,
      action: isAr ? `أضاف مستنداً: ${newDoc.name} (${catLabel})` : `Uploaded document: ${newDoc.name}`,
      kind: 'docs',
      ...(authorName ? { agent: authorName } : {})
    };

    const nextLogs = [taskLog, ...(Array.isArray(lead?.activityLogs) ? lead.activityLogs : [])].slice(0, 100);

    const ok = onUpdateLead ? await onUpdateLead(lead.id, { documents: nextDocs, activityLogs: nextLogs }, lead?.version) : true;
    setUploading(false);

    if (ok !== false) {
      triggerToast?.(isAr ? 'تم حفظ المستند بنجاح' : 'Document saved', 'success');
      setShowUploadModal(false);
      setName('');
      setNotes('');
      setSelectedFile(null);
      setFileDataUrl('');
    } else {
      triggerToast?.(isAr ? 'تعذر حفظ المستند، حاول ثانية' : 'Failed to save document', 'error');
    }
  };

  const handleDelete = async (docId, docName) => {
    const ok = await confirm({
      title: isAr ? 'حذف هذا المستند؟' : 'Delete this document?',
      message: isAr ? `هل أنت متأكد من حذف «${docName}» من ملف العميل؟` : `Are you sure you want to remove "${docName}"?`,
      confirmLabel: isAr ? 'حذف المستند' : 'Delete'
    });
    if (!ok) return;

    const nextDocs = docs.filter((d) => d.id !== docId);
    const nowIso = new Date().toISOString();
    const deleteLog = {
      timestamp: nowIso,
      action: isAr ? `حذف مستنداً: ${docName}` : `Deleted document: ${docName}`,
      kind: 'docs',
      agent: userDisplayName(currentUser) || ''
    };
    const nextLogs = [deleteLog, ...(Array.isArray(lead?.activityLogs) ? lead.activityLogs : [])].slice(0, 100);

    const saved = onUpdateLead ? await onUpdateLead(lead.id, { documents: nextDocs, activityLogs: nextLogs }, lead?.version) : true;
    if (saved !== false) {
      triggerToast?.(isAr ? 'تم حذف المستند' : 'Document deleted', 'info');
    }
  };

  const isImage = (url = '', fileName = '') => {
    return /^data:image\//i.test(url) || /\.(png|jpe?g|webp|gif|svg)$/i.test(fileName);
  };

  return (
    <div className="cd-panel">
      <div className="cd-header">
        <h4 className="cd-title">
          <FileText size={18} aria-hidden="true" />
          {isAr ? 'مستندات وعقود العميل' : 'Client Documents & Contracts'}
          <Badge tone="neutral">{docs.length}</Badge>
        </h4>
        <Button
          size="sm"
          variant="primary"
          icon={<Plus size={16} aria-hidden="true" />}
          onClick={() => setShowUploadModal(true)}
        >
          {isAr ? 'إضافة مستند' : 'Add Document'}
        </Button>
      </div>

      <div className="cd-filter-bar" role="group" aria-label={isAr ? 'تصنيفات المستندات' : 'Document categories'}>
        <button
          type="button"
          className={`cd-filter-btn ${filter === 'all' ? 'is-active' : ''}`}
          onClick={() => setFilter('all')}
        >
          {isAr ? 'الكل' : 'All'} ({docs.length})
        </button>
        {CATEGORIES.map((c) => {
          const count = docs.filter((d) => d.type === c.id).length;
          return (
            <button
              key={c.id}
              type="button"
              className={`cd-filter-btn ${filter === c.id ? 'is-active' : ''}`}
              onClick={() => setFilter(c.id)}
            >
              <c.Icon size={14} aria-hidden="true" />
              {isAr ? c.ar : c.en} ({count})
            </button>
          );
        })}
      </div>

      {filteredDocs.length === 0 ? (
        <EmptyState
          title={isAr ? 'لا توجد مستندات مرفقة' : 'No documents attached'}
          description={
            isAr
              ? 'يمكنك أرشفة صور بطاقات الهوية، عقود البيع، إيصالات الدفع، وتقارير المعاينة هنا بأمان.'
              : 'Upload and archive client IDs, contracts, payment receipts, and inspection sheets here.'
          }
          action={
            <Button
              size="sm"
              variant="secondary"
              icon={<Upload size={16} aria-hidden="true" />}
              onClick={() => setShowUploadModal(true)}
            >
              {isAr ? 'رفع أول مستند' : 'Upload first document'}
            </Button>
          }
        />
      ) : (
        <div className="cd-grid">
          {filteredDocs.map((doc) => {
            const cat = CATEGORIES.find((c) => c.id === doc.type) || CATEGORIES[4];
            const hasImg = isImage(doc.url, doc.fileName);
            return (
              <div key={doc.id} className="cd-card">
                <div className="cd-card__head">
                  <div className="cd-card__info">
                    <span className="cd-card__name" title={doc.name}>
                      {doc.name}
                    </span>
                    <div className="cd-card__meta">
                      <Badge tone={cat.tone}>{isAr ? cat.ar : cat.en}</Badge>
                      <span>{fmtDate(doc.uploadedAt, isAr)}</span>
                      {doc.fileSize && <span>· {doc.fileSize}</span>}
                    </div>
                  </div>
                </div>

                {hasImg ? (
                  <div
                    className="cd-card__thumb"
                    onClick={() => setPreviewDoc(doc)}
                    role="button"
                    tabIndex={0}
                    aria-label={isAr ? `معاينة ${doc.name}` : `Preview ${doc.name}`}
                  >
                    <img src={doc.url} alt={doc.name} loading="lazy" />
                  </div>
                ) : (
                  <div className="cd-card__thumb" onClick={() => setPreviewDoc(doc)}>
                    <div className="cd-card__thumb-doc">
                      <cat.Icon size={32} aria-hidden="true" />
                      <span>{doc.fileName || doc.name}</span>
                    </div>
                  </div>
                )}

                {doc.notes && <p className="cd-card__notes">{doc.notes}</p>}

                {doc.uploadedBy && (
                  <small className="cd-card__meta">
                    {isAr ? `بواسطة: ${doc.uploadedBy}` : `By: ${doc.uploadedBy}`}
                  </small>
                )}

                <div className="cd-card__actions">
                  <Button
                    size="xs"
                    variant="ghost"
                    icon={<Eye size={14} aria-hidden="true" />}
                    onClick={() => setPreviewDoc(doc)}
                  >
                    {isAr ? 'معاينة' : 'View'}
                  </Button>
                  {doc.url && (
                    <a
                      href={doc.url}
                      download={doc.fileName || doc.name}
                      className="ui-btn ui-btn--ghost ui-btn--xs"
                      title={isAr ? 'تنزيل' : 'Download'}
                    >
                      <Download size={14} aria-hidden="true" />
                      {isAr ? 'تنزيل' : 'Download'}
                    </a>
                  )}
                  <Button
                    size="xs"
                    variant="ghost"
                    tone="danger"
                    icon={<Trash2 size={14} aria-hidden="true" />}
                    onClick={() => handleDelete(doc.id, doc.name)}
                    aria-label={isAr ? 'حذف' : 'Delete'}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <Modal
          open
          onClose={() => !uploading && setShowUploadModal(false)}
          title={isAr ? 'إضافة مستند إلى ملف العميل' : 'Add Document'}
          description={lead?.name ? `${lead.name}` : ''}
          closeLabel={isAr ? 'إلغاء' : 'Cancel'}
        >
          <form className="cd-upload-form" onSubmit={handleSaveDocument}>
            <label className="cd-file-drop">
              <Upload size={28} aria-hidden="true" />
              <span>
                {selectedFile
                  ? (isAr ? `الملف المختار: ${selectedFile.name} (${(selectedFile.size / 1024).toFixed(1)} KB)` : selectedFile.name)
                  : (isAr ? 'انقر لاختيار ملف (صورة أو PDF حتى 10 ميجا)' : 'Click to select image or PDF (up to 10MB)')}
              </span>
              <input type="file" accept="image/*,.pdf,.doc,.docx" onChange={handleFileChange} />
            </label>

            <Input
              label={isAr ? 'اسم المستند' : 'Document Title'}
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isAr ? 'مثال: بطاقة الرقم القومي (وجهين) / عقد التخصيص' : 'e.g. National ID / Allocation Deed'}
            />

            <Select
              label={isAr ? 'تصنيف المستند' : 'Category'}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              options={CATEGORIES.map((c) => ({
                value: c.id,
                label: isAr ? c.ar : c.en
              }))}
            />

            <Textarea
              label={isAr ? 'ملاحظات إضافية (اختياري)' : 'Notes (optional)'}
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={isAr ? 'مثال: تم تدقيق الأصل، سارية حتى 2028' : 'Any verification notes...'}
            />

            <div className="cd-form-actions">
              <Button
                type="button"
                variant="secondary"
                disabled={uploading}
                onClick={() => setShowUploadModal(false)}
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button type="submit" variant="primary" loading={uploading} disabled={!name.trim() || !fileDataUrl}>
                {isAr ? 'حفظ في الملف' : 'Save Document'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Preview Modal */}
      {previewDoc && (
        <Modal
          open
          onClose={() => setPreviewDoc(null)}
          title={previewDoc.name}
          description={previewDoc.fileName}
          closeLabel={isAr ? 'إغلاق' : 'Close'}
          size="lg"
        >
          <div className="cd-preview-modal">
            {isImage(previewDoc.url, previewDoc.fileName) ? (
              <img src={previewDoc.url} alt={previewDoc.name} className="cd-preview-img" />
            ) : (
              <div className="cd-preview-non-img">
                <FileText size={48} aria-hidden="true" />
                <p>{isAr ? 'هذا المستند ليس صورة مباشرة (ملف PDF أو مستند نصي).' : 'Document is not an image.'}</p>
                {previewDoc.url && (
                  <a href={previewDoc.url} download={previewDoc.fileName} className="ui-btn ui-btn--primary">
                    <Download size={16} aria-hidden="true" />
                    {isAr ? 'تنزيل وفتح الملف' : 'Download file'}
                  </a>
                )}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
