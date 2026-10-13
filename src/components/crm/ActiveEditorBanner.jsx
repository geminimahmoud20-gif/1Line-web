// src/components/crm/ActiveEditorBanner.jsx
// 1Line OS Soft Lease & Live Editing Presence Banner
import { useState, useEffect } from 'react';
import { Lock, Unlock, RefreshCw } from 'lucide-react';
import { isLeaseActive } from '../../services/concurrencyEngine';

export default function ActiveEditorBanner({
  activeEditor,
  currentUser = {},
  onForceUnlock,
  onRefresh,
  isAr = true
}) {
  const [secondsRemaining, setSecondsRemaining] = useState(0);

  useEffect(() => {
    if (!activeEditor?.expiresAt) return;

    const updateRemaining = () => {
      const nowMs = Date.now();
      const expiresMs = new Date(activeEditor.expiresAt).getTime();
      setSecondsRemaining(Math.max(0, Math.ceil((expiresMs - nowMs) / 1000)));
    };

    updateRemaining();
    const interval = setInterval(updateRemaining, 1000);
    return () => clearInterval(interval);
  }, [activeEditor]);

  if (!isLeaseActive(activeEditor) || activeEditor.uid === currentUser.uid) {
    return null;
  }

  const isSuperAdmin = currentUser.role === 'super_admin';
  const mins = Math.floor(secondsRemaining / 60);
  const secs = secondsRemaining % 60;
  const timeFormatted = mins > 0 ? `${mins}:${String(secs).padStart(2, '0')}` : `${secs}s`;

  return (
    <div
      style={{
        background: 'rgba(245, 158, 11, 0.1)',
        border: '1.5px solid var(--crm-warn)',
        borderRadius: '10px',
        padding: '10px 14px',
        marginBottom: '14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        flexWrap: 'wrap',
        animation: 'pulse 2s infinite'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Lock size={16} style={{ color: 'var(--crm-warn)', flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 'var(--crm-text-xs)', fontWeight: 800, color: 'var(--crm-ink)' }}>
            {isAr ? `🔒 هذا السجل قيد التعديل حالياً بواسطة "${activeEditor.name}"` : `🔒 Currently being edited by "${activeEditor.name}"`}
          </div>
          <div style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-muted)', marginTop: '2px' }}>
            {isAr ? `قفل مؤقت لمنع التضارب (متبقي ${timeFormatted})` : `Temporary lease to avoid collisions (${timeFormatted} left)`}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            style={{
              background: 'var(--crm-card)',
              border: '1px solid var(--crm-line)',
              borderRadius: '6px',
              padding: '5px 10px',
              fontSize: 'var(--crm-text-xs)',
              fontWeight: 700,
              cursor: 'pointer',
              color: 'var(--crm-ink)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <RefreshCw size={12} />
            <span>{isAr ? 'تحديث' : 'Refresh'}</span>
          </button>
        )}

        {isSuperAdmin && onForceUnlock && (
          <button
            type="button"
            onClick={onForceUnlock}
            title={isAr ? 'صلاحية المدير: فك القفل وتجاوز المستند' : 'Admin override'}
            style={{
              background: 'var(--crm-warn)',
              color: 'var(--crm-on-dark)',
              border: 'none',
              borderRadius: '6px',
              padding: '5px 10px',
              fontSize: 'var(--crm-text-xs)',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <Unlock size={12} />
            <span>{isAr ? 'فك القفل (إدارة)' : 'Force Unlock'}</span>
          </button>
        )}
      </div>
    </div>
  );
}
