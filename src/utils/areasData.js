import { saveSettings, loadSettings, subscribeToSettings } from '../firebaseService';

export const DEFAULT_SOHAG_AREAS = [
  {
    id: 'all',
    name_ar: 'كل المناطق',
    name_en: 'All Locations',
    label_ar: 'أي منطقة في سوهاج (أفضل فرصة متاحة)',
    label_en: 'Any District in Sohag',
    center: { lat: 26.5569, lng: 31.7001 },
    zoom: 12,
    isSystem: true,
    description_ar: 'البحث في جميع أنحاء ومراكز محافظة سوهاج'
  },
  {
    id: 'east',
    name_ar: 'شرق سوهاج',
    name_en: 'East Sohag',
    label_ar: 'شرق سوهاج (الجمهورية وسيتي وميدان الثقافة)',
    label_en: 'East Sohag (El Gomhoureya & City)',
    center: { lat: 26.5569, lng: 31.7001 },
    zoom: 14,
    description_ar: 'أرقى المناطق التجارية والسكنية وكورنيش النيل الشرقي'
  },
  {
    id: 'new_sohag',
    name_ar: 'سوهاج الجديدة',
    name_en: 'New Sohag',
    label_ar: 'سوهاج الجديدة (الحي الأول، الثاني، المحور المركزي)',
    label_en: 'New Sohag (Districts 1, 2 & Central Axis)',
    center: { lat: 26.4715, lng: 31.6620 },
    zoom: 13,
    description_ar: 'المدينة الذكية المستقبلية وأعلى عائد استثماري ونمو سكني'
  },
  {
    id: 'west',
    name_ar: 'غرب سوهاج',
    name_en: 'West Sohag',
    label_ar: 'غرب سوهاج (الشهيد والمحطة والشبان المسلمين)',
    label_en: 'West Sohag (El Shaheed & Station)',
    center: { lat: 26.5500, lng: 31.6850 },
    zoom: 14,
    description_ar: 'كثافة سكانية وحيوية تجارية عالية وقرب من محطة القطار'
  },
  {
    id: 'center',
    name_ar: 'وسط البلد',
    name_en: 'City Center',
    label_ar: 'وسط البلد (ميدان العارف والشارع الجديد والجامعة)',
    label_en: 'City Center (Al Aref & University)',
    center: { lat: 26.5620, lng: 31.6910 },
    zoom: 14,
    description_ar: 'قلب سوهاج النابض بالأنشطة التجارية والخدمات الطبية'
  },
  {
    id: 'kawthar',
    name_ar: 'حي الكوثر',
    name_en: 'Al Kawthar',
    label_ar: 'حي الكوثر (المنطقة الصناعية والإسكان المتميز)',
    label_en: 'Al Kawthar District',
    center: { lat: 26.5920, lng: 31.7850 },
    zoom: 13,
    description_ar: 'الموقع الاستراتيجي الصناعي والسكني الواعد شرق النيل'
  },
  {
    id: 'akhmeem',
    name_ar: 'أخميم',
    name_en: 'Akhmeem',
    label_ar: 'أخميم (شارع بورسعيد وميدان الست دميانة والسنترال)',
    label_en: 'Akhmeem City',
    center: { lat: 26.5650, lng: 31.7450 },
    zoom: 14,
    description_ar: 'مدينة التاريخ والنسيج وعقارات سكنية وتجارية مميزة'
  },
  {
    id: 'tahta',
    name_ar: 'طهطا',
    name_en: 'Tahta',
    label_ar: 'طهطا (شارع المحطة ووسط المدينة والتجاري)',
    label_en: 'Tahta City',
    center: { lat: 26.7690, lng: 31.5020 },
    zoom: 13,
    description_ar: 'عاصمة التجارة والأثاث في شمال سوهاج'
  },
  {
    id: 'girga',
    name_ar: 'جرجا',
    name_en: 'Girga',
    label_ar: 'جرجا (الكورنيش والميدان الرئيسي وشارع البحر)',
    label_en: 'Girga City',
    center: { lat: 26.3360, lng: 31.8920 },
    zoom: 13,
    description_ar: 'المركز التجاري والحيوي الأكبر في جنوب سوهاج'
  }
];

const LOCAL_STORAGE_KEY = 'oneline_custom_areas';
const SETTING_DOC_KEY = 'areas_cms';

/**
 * Get all active areas from LocalStorage or default fallbacks
 */
export function getAreas() {
  if (typeof window === 'undefined') return DEFAULT_SOHAG_AREAS;
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error reading custom areas:', err);
  }
  return DEFAULT_SOHAG_AREAS;
}

/**
 * Save custom areas locally and sync to Firestore
 */
export async function saveAreas(areasList) {
  if (!Array.isArray(areasList) || areasList.length === 0) return;
  
  // 1. Immediate Local Persistence
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(areasList));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('oneline_areas_updated', { detail: areasList }));
    }
  } catch (err) {
    console.error('Error saving areas to localStorage:', err);
  }

  // 2. Cloud Firestore Persistence
  try {
    await saveSettings(SETTING_DOC_KEY, {
      areas: areasList,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.warn('Firestore cloud sync for areas deferred (offline/cached):', err);
  }
}

/**
 * Add a new area/district
 */
export async function addArea(areaData) {
  const currentAreas = getAreas();
  const rawId = (areaData.id || areaData.name_en || areaData.name_ar || `area_${Date.now()}`)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_]/g, '_');
  
  // Ensure unique ID
  let uniqueId = rawId;
  let counter = 1;
  while (currentAreas.some(a => a.id === uniqueId)) {
    uniqueId = `${rawId}_${counter++}`;
  }

  const newArea = {
    id: uniqueId,
    name_ar: areaData.name_ar?.trim() || 'حي جديد',
    name_en: areaData.name_en?.trim() || 'New District',
    label_ar: areaData.label_ar?.trim() || areaData.name_ar?.trim() || 'حي جديد',
    label_en: areaData.label_en?.trim() || areaData.name_en?.trim() || 'New District',
    center: areaData.center || { lat: 26.5569, lng: 31.7001 },
    zoom: areaData.zoom || 14,
    description_ar: areaData.description_ar?.trim() || '',
    isSystem: false,
    createdAt: new Date().toISOString()
  };

  const updated = [...currentAreas, newArea];
  await saveAreas(updated);
  return newArea;
}

/**
 * Update an existing area
 */
export async function updateArea(id, patch) {
  const currentAreas = getAreas();
  const updated = currentAreas.map(a => {
    if (a.id === id) {
      return {
        ...a,
        ...patch,
        label_ar: patch.label_ar || patch.name_ar || a.label_ar || a.name_ar,
        label_en: patch.label_en || patch.name_en || a.label_en || a.name_en,
        updatedAt: new Date().toISOString()
      };
    }
    return a;
  });

  await saveAreas(updated);
  return updated;
}

/**
 * Delete an area (Safety protection: cannot delete 'all')
 */
export async function deleteArea(id) {
  if (id === 'all') return false;
  const currentAreas = getAreas();
  const updated = currentAreas.filter(a => a.id !== id);
  await saveAreas(updated);
  return true;
}

/**
 * Reset areas back to default list
 */
export async function resetAreasToDefault() {
  await saveAreas(DEFAULT_SOHAG_AREAS);
  return DEFAULT_SOHAG_AREAS;
}

/**
 * Initialize real-time cloud listener for areas
 */
export function initAreasSync() {
  if (typeof window === 'undefined') return () => {};

  return subscribeToSettings(SETTING_DOC_KEY, (cloudData) => {
    if (cloudData && Array.isArray(cloudData.areas) && cloudData.areas.length > 0) {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cloudData.areas));
        window.dispatchEvent(new CustomEvent('oneline_areas_updated', { detail: cloudData.areas }));
      } catch (e) {
        console.error('Error applying cloud areas sync:', e);
      }
    }
  });
}
