// Shared styles for the analytics dashboard pieces.

export const card = {
  background: 'var(--crm-card)',
  border: '1px solid var(--crm-line)',
  borderRadius: 'var(--radius-md)',
  boxShadow: 'var(--crm-shadow)',
  padding: '16px 18px',
  minWidth: 0,
};

export const LEVEL_STYLE = {
  hot: { ar: 'جاد جداً', en: 'Hot', tone: 'danger' },
  warm: { ar: 'مهتم', en: 'Warm', tone: 'warn' },
  cold: { ar: 'بيستكشف', en: 'Browsing', tone: 'info' },
};
