// Arabic / English names for the area and property-type keys stored on leads (east, villa…), shared by
// the CRM alerts and the server's WhatsApp message. Pure data: safe to import from api/.

export const PROPERTY_TYPE_LABELS = {
  apartment: ['شقة', 'Apartment'],
  villa: ['بيت أو فيلا', 'House / villa'],
  building: ['عمارة', 'Building'],
  retail: ['محل', 'Shop'],
  commercial: ['محل تجاري', 'Commercial'],
  office: ['مكتب أو عيادة', 'Office / clinic'],
  administrative: ['مكتب إداري', 'Office'],
  land: ['أرض', 'Land'],
  agri_land: ['أرض زراعية', 'Farmland'],
  farm: ['مزرعة', 'Farm'],
  factory: ['مصنع أو ورشة', 'Factory / workshop'],
  warehouse: ['مخزن', 'Warehouse'],
  industrial_land: ['أرض صناعية', 'Industrial land'],
  agricultural: ['زراعي', 'Agricultural'],
  industrial: ['صناعي', 'Industrial'],
  residential: ['سكني', 'Residential']
};

// Default districts and Greater Cairo; districts added in the CRM are looked up by the caller
export const AREA_LABELS = {
  east: ['شرق سوهاج', 'East Sohag'],
  corniche: ['كورنيش النيل', 'Nile Corniche'],
  new_sohag: ['سوهاج الجديدة', 'New Sohag'],
  west: ['غرب سوهاج', 'West Sohag'],
  center: ['وسط البلد', 'City centre'],
  thakafa: ['منطقة الثقافة', 'El Thakafa'],
  kawthar: ['حي الكوثر', 'Al-Kawthar'],
  akhmeem: ['أخميم', 'Akhmeem'],
  tahta: ['طهطا', 'Tahta'],
  girga: ['جرجا', 'Girga'],
  cairo_new_cairo: ['القاهرة الجديدة والتجمع', 'New Cairo'],
  cairo_zayed: ['الشيخ زايد', 'Sheikh Zayed'],
  cairo_october: ['السادس من أكتوبر', '6th of October'],
  cairo_capital: ['العاصمة الإدارية', 'New Capital'],
  cairo_other: ['القاهرة الكبرى', 'Greater Cairo']
};

const pick = (table, key, isAr) => {
  const hit = table[String(key || '').toLowerCase()];
  return hit ? hit[isAr ? 0 : 1] : '';
};

/** Known key → its name; anything else (already Arabic, a free-text area) comes back as given. */
export const propertyTypeLabel = (key, isAr = true) => pick(PROPERTY_TYPE_LABELS, key, isAr) || String(key || '');
export const areaLabel = (key, isAr = true, extraAreas = []) => {
  const custom = extraAreas.find((a) => a?.id === key);
  if (custom) return (isAr ? custom.name_ar : custom.name_en) || String(key);
  return pick(AREA_LABELS, key, isAr) || String(key || '');
};
