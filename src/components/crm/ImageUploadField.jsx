import { useState } from 'react';
import { Upload, Loader2, Trash2 } from 'lucide-react';
import { uploadProfilePhoto } from '../../utils/imageUploadService';
import './image-upload-field.css';

const REASONS = {
  dev: ['الرفع شغال على الموقع الحقيقي بس، مش على نسخة التجربة.', 'Uploads work on the live site only.'],
  type: ['الملف ده مش صورة. اختار JPG أو PNG أو WebP.', 'That file is not an image (JPG, PNG or WebP).']
};

/**
 * A picture the team uploads from the device: preview, «ارفع صورة من الجهاز» / «غيّر الصورة»,
 * and «شيل الصورة». There is no link field: every CRM picture is stored with the site's own
 * files (Blob), shrunk to maxWidth × maxHeight, so nothing on the site depends on another
 * website's link staying up. A picture saved earlier as a link still shows and can be replaced.
 */
export default function ImageUploadField({
  label,
  value = '',
  onChange,
  name = 'crm-photo',
  maxWidth = 1200,
  maxHeight = 1200,
  isAr = true,
  hint = '',
  previewShape = 'wide', // 'wide' | 'portrait' | 'round'
  required = false
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const L = (ar, en) => (isAr ? ar : en);

  const pick = async (file) => {
    if (!file) return;
    setError('');
    if (!/^image\//.test(file.type)) { setError(L(...REASONS.type)); return; }
    setBusy(true);
    const res = await uploadProfilePhoto(file, `${name}-${Date.now().toString(36)}`, { maxWidth, maxHeight });
    setBusy(false);
    if (res.ok) onChange(res.url);
    else setError(REASONS[res.reason] ? L(...REASONS[res.reason]) : L('الصورة مارفعتش. اتأكد من النت وجرّب تاني.', 'Upload failed. Check the connection and try again.'));
  };

  return (
    <div className="iuf">
      {label && <span className="iuf-label">{label}{required ? ' *' : ''}</span>}
      <div className="iuf-row">
        <div className={`iuf-preview iuf-preview--${previewShape}`}>
          {value ? <img src={value} alt="" loading="lazy" /> : <span>{L('مفيش صورة', 'No picture')}</span>}
        </div>
        <div className="iuf-actions">
          <label className={`btn btn-sm ${value ? 'btn-outline' : 'btn-primary'} iuf-upload`}>
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            <span>{busy ? L('جاري الرفع…', 'Uploading…') : value ? L('غيّر الصورة', 'Change picture') : L('ارفع صورة من الجهاز', 'Upload from device')}</span>
            <input type="file" accept="image/*" hidden disabled={busy} onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />
          </label>
          {value && !busy && (
            <button type="button" className="btn btn-sm btn-ghost iuf-remove" onClick={() => onChange('')}>
              <Trash2 size={14} />
              <span>{L('شيل الصورة', 'Remove')}</span>
            </button>
          )}
        </div>
      </div>
      {hint && <small className="iuf-hint">{hint}</small>}
      {error && <small className="iuf-error" role="alert">{error}</small>}
    </div>
  );
}
