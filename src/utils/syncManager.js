// =============================================================
//  1LINE SOLUTIONS CRM - ENTERPRISE OFFLINE & SYNC MANAGER
// =============================================================

export const SYNC_STATUS = {
  SYNCED: 'synced',               // تم الحفظ والمزامنة بنجاح
  PENDING: 'pending',             // تم الحفظ محلياً — بانتظار المزامنة
  RETRYING: 'retrying',           // فشلت المزامنة — إعادة المحاولة
  FAILED: 'failed'                // تعذر الاتصال النهائي
};

export const SYNC_STATUS_LABELS = {
  [SYNC_STATUS.SYNCED]: {
    ar: 'تم الحفظ والمزامنة بنجاح 🟢',
    en: 'Saved & Synced Successfully'
  },
  [SYNC_STATUS.PENDING]: {
    ar: 'تم الحفظ محلياً — بانتظار المزامنة ⏳',
    en: 'Saved Locally — Pending Sync'
  },
  [SYNC_STATUS.RETRYING]: {
    ar: 'فشلت المزامنة — إعادة المحاولة 🔄',
    en: 'Sync Failed — Retrying'
  },
  [SYNC_STATUS.FAILED]: {
    ar: 'تعذر الاتصال بالسحابة ⚠️',
    en: 'Cloud Sync Failed'
  }
};

const SYNC_STORAGE_KEY = 'oneline_offline_sync_queue';
const LAST_SYNC_TIME_KEY = 'oneline_last_successful_sync';

/**
 * Generates an Idempotency Key to prevent duplicate records
 */
export const generateIdempotencyKey = (entityType, entityData) => {
  const phone = entityData.phone || entityData.whatsapp || '';
  const id = entityData.id || '';
  const type = entityType || 'item';
  return `${type}-${phone}-${id}-${Date.now()}`;
};

/**
 * Enqueues an offline mutation item with idempotency and retry metadata
 */
export const enqueueOfflineItem = (entityType, entityData) => {
  try {
    const raw = localStorage.getItem(SYNC_STORAGE_KEY);
    const queue = raw ? JSON.parse(raw) : [];

    const idempotencyKey = entityData.idempotencyKey || generateIdempotencyKey(entityType, entityData);

    // Prevent duplicate queueing within 60s
    const isDuplicate = queue.some(item => 
      item.idempotencyKey === idempotencyKey || 
      (item.entityData?.phone === entityData.phone && Math.abs(Date.now() - item.enqueuedAt) < 60000)
    );

    if (isDuplicate) {
      return { success: false, status: SYNC_STATUS.PENDING, isDuplicate: true };
    }

    const queueItem = {
      queueId: `queue-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      idempotencyKey,
      entityType,
      entityData,
      status: SYNC_STATUS.PENDING,
      retryCount: 0,
      enqueuedAt: Date.now(),
      lastAttemptAt: null
    };

    queue.push(queueItem);
    localStorage.setItem(SYNC_STORAGE_KEY, JSON.stringify(queue));

    return { success: true, status: SYNC_STATUS.PENDING, queueItem };
  } catch (err) {
    console.error('Failed to enqueue offline item:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Returns pending offline queue items
 */
export const getPendingSyncQueue = () => {
  try {
    const raw = localStorage.getItem(SYNC_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

/**
 * Marks successful sync and removes from queue
 */
export const markItemSynced = (queueId) => {
  try {
    const queue = getPendingSyncQueue().filter(i => i.queueId !== queueId);
    localStorage.setItem(SYNC_STORAGE_KEY, JSON.stringify(queue));
    localStorage.setItem(LAST_SYNC_TIME_KEY, new Date().toISOString());
  } catch (e) {}
};

/**
 * Calculates human-readable time since last sync
 */
export const formatTimeSinceLastSync = (lang = 'ar') => {
  try {
    const lastSync = localStorage.getItem(LAST_SYNC_TIME_KEY);
    if (!lastSync) {
      return lang === 'ar' ? 'لم تتم مزامنة بعد' : 'No recent sync';
    }
    const elapsedMinutes = Math.floor((Date.now() - new Date(lastSync).getTime()) / 60000);
    if (elapsedMinutes <= 1) {
      return lang === 'ar' ? 'آخر مزامنة: الآن' : 'Last sync: Just now';
    }
    return lang === 'ar' 
      ? `آخر مزامنة: منذ ${elapsedMinutes} دقيقة` 
      : `Last sync: ${elapsedMinutes} min ago`;
  } catch (e) {
    return '';
  }
};
