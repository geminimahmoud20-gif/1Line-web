// Constants shared by DemandsManagerPanel.jsx and its extracted sections.

// Areas come from the CRM's own list (utils/areasData → getAreas), never a fixed copy here.

export const PROP_TYPE_OPTIONS = [
  { value: 'apartment', label_ar: 'شقة سكنية', label_en: 'Apartment' },
  { value: 'villa', label_ar: 'فيلا / تاون هاوس', label_en: 'Villa / Townhouse' },
  { value: 'land', label_ar: 'أرض استثمارية / بناء', label_en: 'Land / Plot' },
  { value: 'retail', label_ar: 'محل تجاري / فرنشايز', label_en: 'Commercial Retail Shop' },
  { value: 'office', label_ar: 'مكتب إداري / عيادة', label_en: 'Admin Office / Clinic' },
  { value: 'building', label_ar: 'عمارة / برج سكني', label_en: 'Entire Building' },
  { value: 'agri_land', label_ar: 'أرض زراعية', label_en: 'Farmland' },
  { value: 'farm', label_ar: 'مزرعة / حديقة فاكهة', label_en: 'Farm / Orchard' },
  { value: 'factory', label_ar: 'مصنع / ورشة', label_en: 'Factory / Workshop' },
  { value: 'warehouse', label_ar: 'مخزن / مستودع', label_en: 'Warehouse' },
  { value: 'industrial_land', label_ar: 'أرض صناعية', label_en: 'Industrial Land' }
];
