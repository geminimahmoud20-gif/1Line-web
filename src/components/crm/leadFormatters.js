// Lead labels and CSV export rows for the CRM leads table (Arabic / English).
import { PROPERTY_TYPES } from '../../data/propertiesData';
import { areaLabel } from '../../utils/placeLabels';
import { getAreas } from '../../utils/areasData';
import { formatLeadType } from '../../utils/crmLabels';
import { leadScore } from '../../utils/crmLeadViews';

// Leads keep area/budget/propertyType under `details`; exporting the raw objects left those columns empty.
export const LEAD_EXPORT_HEADERS = {
  id: 'المعرف',
  name: 'اسم العميل',
  phone: 'رقم الهاتف',
  whatsapp: 'رقم الواتساب',
  email: 'البريد الإلكتروني',
  type: 'نوع الطلب',
  propertyType: 'نوع العقار',
  area: 'المنطقة',
  budget: 'الميزانية',
  status: 'الحالة',
  temperature: 'درجة الاهتمام',
  score: 'التقييم',
  assignedTo: 'المسؤول',
  source: 'المصدر',
  nextFollowUpAt: 'المتابعة القادمة',
  createdAt: 'تاريخ الإنشاء',
  notes: 'الملاحظات'
};

/** Formatters bound to the current language; `t` is the CRM translation table. */
export function makeLeadFormatters(isAr, t = {}) {
  const getLocalizedPropertyType = (typeKey) => {
    if (!typeKey || typeKey === 'undefined' || typeKey === 'null') return isAr ? 'عقار غير محدد' : 'N/A';
    const found = PROPERTY_TYPES.find(t => t.id === typeKey);
    if (found) return isAr ? found.name_ar : found.name_en;
    const fallbackMap = {
      apartment: 'شقة سكنية',
      retail: 'محل تجاري',
      villa: 'فيلا / تاون هاوس',
      office: 'مكتب إداري / عيادة',
      land: 'قطعة أرض',
      building: 'عمارة سكنية'
    };
    return fallbackMap[typeKey.toLowerCase()] || formatLeadType(typeKey, isAr);
  };

  const getLocalizedArea = (areaKey) => {
    if (!areaKey || areaKey === 'undefined' || areaKey === 'null') return isAr ? 'سوهاج' : 'Sohag';
    if (areaKey === 'all') return isAr ? 'كل المناطق' : 'Any area';
    // The live list only. An old id (east, kawthar…) keeps its old name, marked as removed
    const found = getAreas().find(a => a.id === areaKey);
    if (found) return isAr ? found.name_ar : (found.name_en || found.name_ar);
    const legacy = areaLabel(areaKey, isAr);
    if (String(areaKey).startsWith('cairo_')) return legacy; // Greater Cairo choices in the buy wizard
    if (/[\u0600-\u06FF]/.test(areaKey)) return areaKey;     // typed text, already a place name
    if (legacy && legacy !== areaKey) return isAr ? `${legacy} (منطقة محذوفة)` : `${legacy} (removed area)`;
    return isAr ? 'منطقة محذوفة' : 'Removed area';
  };

  const formatLeadStatus = (status) => {
    const map = {
      new: ['جديد', 'New'],
      contacted: ['تم التواصل', 'Contacted'],
      site_visit: ['معاينة مجدولة', 'Site visit'],
      negotiating: ['قيد التفاوض', 'Negotiating'],
      closing: ['توقيع وحجز', 'Closing'],
      closed: ['صفقة ناجحة', 'Closed won'],
      lost: ['مفقود', 'Lost']
    };
    const hit = map[status] || map.new;
    return isAr ? hit[0] : hit[1];
  };

  const formatLeadTypeBadge = (type) => {
    if (isAr) {
      const map = {
        buyer: 'طلب شراء',
        seller: 'عرض بيع',
        reservation_request: 'طلب حجز مبدئي',
        viewing_request: 'طلب معاينة',
        investor: 'مستثمر VIP',
        broker: 'وسيط عقاري',
        callback_request: 'طلب اتصال',
        express_buyer: 'طلب شراء سريع',
        request: 'استفسار عام'
      };
      return map[type] || t[type] || type;
    }
    return t[type] || type;
  };

  const toLeadExportRow = (l) => {
    const d = l.details || {};
    const areaKey = l.area || d.area || d.district;
    const typeKey = l.propertyType || d.propertyType;
    return {
      id: l.id,
      name: l.name,
      phone: l.phone,
      whatsapp: l.whatsapp,
      email: l.email || d.email || '',
      type: formatLeadTypeBadge(l.type),
      propertyType: typeKey ? getLocalizedPropertyType(typeKey) : '',
      area: areaKey ? getLocalizedArea(areaKey) : '',
      budget: l.budget || d.budget || d.expectedPrice || '',
      status: formatLeadStatus(l.status),
      temperature: { hot: 'ساخن', warm: 'دافئ', cold: 'بارد' }[l.temperature] || '',
      score: leadScore(l).score,
      assignedTo: l.assignedTo || '',
      source: l.source || '',
      nextFollowUpAt: l.nextFollowUpAt || '',
      createdAt: l.createdAt || l.timestamp || '',
      notes: l.notes || ''
    };
  };

  return { getLocalizedPropertyType, getLocalizedArea, formatLeadStatus, formatLeadTypeBadge, toLeadExportRow };
}
