/**
 * 🌐 ONELINE SEO & STRUCTURED DATA (JSON-LD) ENGINE 2026
 * Dynamically manages document title, OpenGraph tags, meta descriptions,
 * and injects Google-compliant Schema.org RealEstateListing & Organization schemas.
 */

const BASE_URL = 'https://1line-sohag.com';
const DEFAULT_TITLE = '1Line | المنصة العقارية الذكية بسوهاج | التطوير والاستثمار العقاري المعتمد';
const DEFAULT_DESC = 'المنصة العقارية الأولى المعتمدة بسوهاج وسوهاج الجديدة برؤية د. محمود الباز. عقارات مفحوصة هندسياً وقانونياً 100%، طلبات كاش فورية، ومؤشرات السوق المعتمدة.';
const DEFAULT_IMAGE = '/logo.png';

/**
 * Set or update a meta tag in document head
 */
function setMetaTag(attrName, attrValue, content) {
  if (typeof document === 'undefined') return;
  let element = document.querySelector(`meta[${attrName}="${attrValue}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attrName, attrValue);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

/**
 * Inject or update JSON-LD structured data script
 */
export function injectJsonLdSchema(schemaId, schemaObject) {
  if (typeof document === 'undefined') return;
  let script = document.getElementById(schemaId);
  if (!script) {
    script = document.createElement('script');
    script.id = schemaId;
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(schemaObject, null, 2);
}

/**
 * Update Page SEO & Social Sharing Tags dynamically
 */
export function updatePageSeo({
  title,
  description,
  image,
  url,
  type = 'website',
  schemaId,
  schema
}) {
  if (typeof document === 'undefined') return;

  const finalTitle = title ? `${title} | 1Line سوهاج` : DEFAULT_TITLE;
  const finalDesc = description || DEFAULT_DESC;
  const finalImage = image ? (image.startsWith('http') ? image : `${BASE_URL}${image}`) : `${BASE_URL}${DEFAULT_IMAGE}`;
  const finalUrl = url ? `${BASE_URL}${url}` : (typeof window !== 'undefined' ? window.location.href : BASE_URL);

  // 1. Standard HTML Title & Description
  document.title = finalTitle;
  setMetaTag('name', 'description', finalDesc);

  // 2. OpenGraph Meta Tags (Facebook, WhatsApp, Telegram previews)
  setMetaTag('property', 'og:title', finalTitle);
  setMetaTag('property', 'og:description', finalDesc);
  setMetaTag('property', 'og:image', finalImage);
  setMetaTag('property', 'og:url', finalUrl);
  setMetaTag('property', 'og:type', type);
  setMetaTag('property', 'og:site_name', '1Line Real Estate Solutions');
  setMetaTag('property', 'og:locale', 'ar_EG');

  // 3. Twitter Card Tags
  setMetaTag('name', 'twitter:card', 'summary_large_image');
  setMetaTag('name', 'twitter:title', finalTitle);
  setMetaTag('name', 'twitter:description', finalDesc);
  setMetaTag('name', 'twitter:image', finalImage);

  // 4. Inject Schema.org JSON-LD if provided
  if (schemaId && schema) {
    injectJsonLdSchema(schemaId, schema);
  }
}

/**
 * Build Google Schema.org for a Single Property Listing
 */
export function buildPropertySchema(property, lang = 'ar') {
  if (!property) return null;

  const isAr = lang === 'ar';
  const title = isAr ? (property.title_ar || property.title) : (property.title_en || property.title);
  const desc = isAr ? (property.desc_ar || property.description) : (property.desc_en || property.description);
  const price = property.price ? Number(property.price) : 0;

  return {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: title,
    description: desc,
    url: typeof window !== 'undefined' ? window.location.href : `${BASE_URL}/properties/${property.id}`,
    image: Array.isArray(property.images) && property.images.length > 0 ? property.images : [property.image],
    offers: {
      '@type': 'Offer',
      price: price,
      priceCurrency: 'EGP',
      availability: property.status === 'sold' ? 'https://schema.org/Sold' : 'https://schema.org/InStock',
      validFrom: property.createdAt || new Date().toISOString()
    },
    geo: property.coordinates ? {
      '@type': 'GeoCoordinates',
      latitude: property.coordinates.lat,
      longitude: property.coordinates.lng
    } : undefined,
    containedInPlace: {
      '@type': 'Place',
      name: isAr ? 'محافظة سوهاج' : 'Sohag Governorate',
      address: {
        '@type': 'PostalAddress',
        addressLocality: isAr ? 'سوهاج' : 'Sohag',
        addressRegion: isAr ? 'سوهاج' : 'Sohag',
        addressCountry: 'EG'
      }
    }
  };
}

/**
 * Build Schema.org for 1Line Organization & RealEstateAgent
 */
export function buildOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'RealEstateAgent',
    name: '1Line للتطوير والاستثمار العقاري',
    alternateName: '1Line Real Estate Solutions',
    url: BASE_URL,
    logo: `${BASE_URL}/logo.png`,
    description: DEFAULT_DESC,
    founder: {
      '@type': 'Person',
      name: 'د. محمود الباز',
      jobTitle: 'المؤسس ورئيس مجلس الإدارة'
    },
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'شارع الجمهورية الرئيسي، برج 1Line الإداري',
      addressLocality: 'سوهاج',
      addressRegion: 'سوهاج',
      postalCode: '82511',
      addressCountry: 'EG'
    },
    areaServed: [
      'شرق سوهاج',
      'سوهاج الجديدة',
      'كورنيش النيل',
      'مدينة ناصر',
      'حي الكوثر',
      'طهطا',
      'جرجا',
      'أخميم'
    ],
    priceRange: 'EGP 500,000 - EGP 50,000,000'
  };
}
