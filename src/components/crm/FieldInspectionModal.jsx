import { useState, useId } from 'react';
import {
  X,
  CheckCircle2,
  MapPin,
  Camera,
  UploadCloud,
  Zap,
  Droplet,
  Flame,
  ShieldCheck,
  Scale,
  FileText,
  Share2,
  Navigation,
  Trash2,
  ExternalLink,
  AlertTriangle,
  Building,
  Coins,
  Loader2
} from 'lucide-react';
import { formatWhatsAppPhone } from '../../utils/matchingEngine';
import { compressImage } from '../../utils/imageUploadService';
import { resolveReferencePrice } from '../../utils/pricingEvaluation';
import { areaNameOf } from '../../utils/areaLookup';
import { getAreas } from '../../data/propertiesData';
import { userDisplayName } from '../../utils/assignees';
import './field-inspection.css';

export default function FieldInspectionModal({
  isOpen,
  onClose,
  lead,
  property = null,
  properties = [],
  onSaveReport,
  lang = 'ar',
  triggerToast,
  currentUser = null
}) {
  const isAr = lang === 'ar';
  const existingReport = lead?.siteVisitReport || lead?.siteVisit?.report || null;
  const details = lead?.details || {};

  // Form State
  const [activeTab, setActiveTab] = useState('inspection'); // 'inspection' | 'valuation' | 'photos'
  const [saving, setSaving] = useState(false);
  const [compressingPhotos, setCompressingPhotos] = useState(false);
  const [locatingGps, setLocatingGps] = useState(false);

  // 1. Basic Unit Facts
  const [unitType, setUnitType] = useState(() => existingReport?.unitType || details.propertyType || lead?.propertyType || property?.type || 'apartment');
  const [floor, setFloor] = useState(() => existingReport?.floor ?? (details.floor || property?.floor || ''));
  const [size, setSize] = useState(() => existingReport?.size ?? (details.size || property?.size || ''));
  const [rooms, setRooms] = useState(() => existingReport?.rooms ?? (details.rooms || property?.bedrooms || ''));
  const [bathrooms, setBathrooms] = useState(() => existingReport?.bathrooms ?? (details.bathrooms || property?.bathrooms || ''));
  const [streetWidth, setStreetWidth] = useState(() => existingReport?.streetWidth || 'medium'); // 'narrow' (<8m) | 'medium' (10-15m) | 'wide' (20m+)
  const [locationNotes, setLocationNotes] = useState(() => existingReport?.locationNotes || '');

  // 2. GPS Geolocation
  const [gps, setGps] = useState(() => existingReport?.gps || property?.coordinates || { lat: null, lng: null, accuracy: null });

  // 3. Utilities & Infrastructure Audit
  const [electricity, setElectricity] = useState(() => existingReport?.electricity || {
    meterType: 'card', // 'card' | 'classic' | 'uninstalled'
    meterNumber: '',
    status: 'working' // 'working' | 'needs_maintenance'
  });

  const [water, setWater] = useState(() => existingReport?.water || {
    connection: 'separate', // 'separate' | 'shared' | 'none'
    meterInstalled: true
  });

  const [naturalGas, setNaturalGas] = useState(() => existingReport?.naturalGas || 'connected'); // 'connected' | 'building' | 'none'
  const [sewage, setSewage] = useState(() => existingReport?.sewage || 'network'); // 'network' | 'cesspool'
  const [elevator, setElevator] = useState(() => existingReport?.elevator || 'working'); // 'working' | 'installing' | 'none'
  const [buildingEntrance, setBuildingEntrance] = useState(() => existingReport?.buildingEntrance || 'marble'); // 'marble' | 'finished' | 'unfinished'

  // 4. Structural & Finishing Condition
  const [finishingLevel, setFinishingLevel] = useState(() => existingReport?.finishingLevel || details.finishing || 'super_lux'); // 'super_lux' | 'lux' | 'semi_finished' | 'red_brick'
  const [wallsCondition, setWallsCondition] = useState(() => existingReport?.wallsCondition || 'sound'); // 'sound' | 'hairline_cracks' | 'structural_cracks' | 'moisture'
  const [orientation, _setOrientation] = useState(() => existingReport?.orientation || 'maritime'); // 'maritime' (بحري) | 'southern' (قبلي) | 'eastern' | 'western'
  const [viewQuality, _setViewQuality] = useState(() => existingReport?.viewQuality || 'panoramic'); // 'panoramic' | 'street' | 'internal'

  // 5. Legal Clearance & Reconciliation
  const [deedType, setDeedType] = useState(() => existingReport?.deedType || 'registered'); // 'registered' | 'court_validity' | 'authority_allocation' | 'poa'
  const [reconciliation, setReconciliation] = useState(() => existingReport?.reconciliation || 'approved'); // 'approved' (نموذج 10) | 'in_progress' | 'exempt' | 'unlicensed'
  const [financialClearance, setFinancialClearance] = useState(() => existingReport?.financialClearance || 'clear'); // 'clear' | 'installments' | 'dispute'

  // 6. Valuation & Pricing
  const [askingPrice, setAskingPrice] = useState(() => existingReport?.askingPrice ?? (details.askingPrice || details.expectedPrice || property?.price || ''));
  const [recommendedPrice, setRecommendedPrice] = useState(() => existingReport?.recommendedPrice ?? '');
  const [liquidityRating, setLiquidityRating] = useState(() => existingReport?.liquidityRating || 'medium'); // 'high' (<30d) | 'medium' (1-3mo) | 'slow' (>3mo)
  const [agentNotes, setAgentNotes] = useState(() => existingReport?.agentNotes || lead?.notes || '');

  // 7. Photos
  const [photos, setPhotos] = useState(() => existingReport?.photos || []);
  const cameraInputId = useId();
  const galleryInputId = useId();

  if (!isOpen || !lead) return null;

  // Resolve Area & Reference Market Benchmark
  const areas = getAreas();
  const areaKey = property?.areaKey || details.area || lead.area || '';
  const areaDisplayName = areaNameOf(areaKey, areas, isAr) || (isAr ? 'سوهاج' : 'Sohag');

  const refPrice = resolveReferencePrice(
    { areaKey, type: unitType, size: Number(size) || 100 },
    areas,
    properties
  );

  const numAsking = Number(askingPrice) || 0;
  const numSize = Number(size) || 0;
  const askingPerSqm = numSize > 0 && numAsking > 0 ? Math.round(numAsking / numSize) : 0;
  const benchmarkPerSqm = refPrice?.perSqm || 0;

  // Valuation Status
  let valuationTone = 'neutral';
  let valuationText = isAr ? 'قيد التقييم' : 'Under evaluation';
  if (askingPerSqm > 0 && benchmarkPerSqm > 0) {
    const diffPct = Math.round(((askingPerSqm - benchmarkPerSqm) / benchmarkPerSqm) * 100);
    if (diffPct <= -12) {
      valuationTone = 'good';
      valuationText = isAr ? `فرصة لقطة أقل من سعر السوق بـ ${Math.abs(diffPct)}%` : `${Math.abs(diffPct)}% below market (Opportunity)`;
    } else if (diffPct >= 18) {
      valuationTone = 'bad';
      valuationText = isAr ? `مبالغ فيه أعلى من متوسط السوق بـ ${diffPct}%` : `${diffPct}% above market`;
    } else {
      valuationTone = 'info';
      valuationText = isAr ? `سعر عادل ومتوافق مع أسعار ${areaDisplayName}` : `Fair market price for ${areaDisplayName}`;
    }
  }

  // 1-Tap GPS Geolocation
  const handleFetchGps = () => {
    if (!navigator.geolocation) {
      triggerToast?.(isAr ? 'متصفحك لا يدعم تحديد الموقع الجغرافي GPS' : 'Geolocation not supported', 'error');
      return;
    }
    setLocatingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
          accuracy: Math.round(pos.coords.accuracy),
          timestamp: new Date().toISOString()
        };
        setGps(coords);
        setLocatingGps(false);
        triggerToast?.(
          isAr
            ? `تم تحديد الإحداثيات الميدانية بدقة (±${coords.accuracy} متر)`
            : `GPS coordinates captured (±${coords.accuracy}m)`,
          'success'
        );
      },
      (err) => {
        setLocatingGps(false);
        console.warn('GPS Error:', err);
        triggerToast?.(
          isAr ? 'تعذر جلب موقع GPS. تأكد من تفعيل صلاحية الموقع بالموبايل.' : 'Could not access GPS. Please enable location permissions.',
          'error'
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  // Photo Handling with client-side canvas compression
  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setCompressingPhotos(true);
    try {
      const compressedList = [];
      for (const f of files) {
        try {
          const comp = await compressImage(f, { maxWidth: 1400, quality: 0.82 });
          compressedList.push({
            id: 'photo-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
            url: comp.dataUrl,
            sizeKb: comp.sizeKb,
            name: f.name
          });
        } catch (err) {
          console.warn('Failed to compress inspection photo:', err);
        }
      }
      setPhotos((prev) => [...prev, ...compressedList]);
      triggerToast?.(
        isAr ? `تم ضغط وحفظ ${compressedList.length} صورة بنجاح جاهزة للمعاينة` : `${compressedList.length} photos added`,
        'success'
      );
    } finally {
      setCompressingPhotos(false);
      e.target.value = '';
    }
  };

  const handleRemovePhoto = (id) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  // Compile Full Inspection Report Object
  const compileReportData = () => {
    const nowIso = new Date().toISOString();
    const inspector = userDisplayName(currentUser) || 'مستشار 1Line الميداني';

    return {
      leadId: lead.id,
      propertyId: property?.id || details.targetPropertyId || null,
      inspectedAt: nowIso,
      inspector,
      areaKey,
      areaName: areaDisplayName,
      unitType,
      floor,
      size: Number(size) || 0,
      rooms: Number(rooms) || 0,
      bathrooms: Number(bathrooms) || 0,
      streetWidth,
      locationNotes,
      gps,
      utilities: {
        electricity,
        water,
        naturalGas,
        sewage,
        elevator,
        buildingEntrance
      },
      structural: {
        finishingLevel,
        wallsCondition,
        orientation,
        viewQuality
      },
      legal: {
        deedType,
        reconciliation,
        financialClearance
      },
      valuation: {
        askingPrice: numAsking,
        askingPerSqm,
        benchmarkPerSqm,
        recommendedPrice: Number(recommendedPrice) || (benchmarkPerSqm > 0 && numSize > 0 ? benchmarkPerSqm * numSize : numAsking),
        valuationTone,
        valuationText,
        liquidityRating
      },
      photos: photos.map((p) => ({ id: p.id, url: p.url, sizeKb: p.sizeKb })),
      agentNotes
    };
  };

  // Save Report and satisfy Gate 2 Deliverables
  const handleSave = async () => {
    setSaving(true);
    try {
      const reportData = compileReportData();

      if (onSaveReport) {
        await onSaveReport(lead.id, {
          siteVisitReport: reportData,
          siteVisit: {
            ...(lead.siteVisit || {}),
            completed: true,
            completedAt: reportData.inspectedAt,
            report: reportData
          },
          gate2Passed: true,
          lastActivityAt: reportData.inspectedAt,
          _bypassGate: true,
          activityLogs: [
            {
              timestamp: reportData.inspectedAt,
              action: `تم اعتماد تقرير الفحص الميداني والمعاينة والتثمين (${areaDisplayName} - ${numSize}م²) بواسطة ${reportData.inspector}`,
              kind: 'inspection',
              outcome: 'viewing_done',
              agent: reportData.inspector
            },
            ...(lead.activityLogs || [])
          ]
        });
      }

      triggerToast?.(
        isAr ? 'تم حفظ واعتماد تقرير الفحص الميداني والتثمين واجتياز شروط مرحلة المعاينة ✅' : 'Field inspection report saved & Gate 2 satisfied!',
        'success'
      );
      onClose();
    } catch (err) {
      console.error('Error saving field inspection:', err);
      triggerToast?.(isAr ? 'حدث خطأ أثناء حفظ التقرير' : 'Failed to save report', 'error');
    } finally {
      setSaving(false);
    }
  };

  // WhatsApp Summary Generator
  const handleShareWhatsApp = () => {
    const report = compileReportData();
    const cleanPhone = (lead.whatsapp || lead.phone || '').replace(/[^0-9]/g, '');

    const lines = [
      `🏛️ *تقرير الفحص والمعاينة الميدانية والتثمين — 1Line OS*`,
      `📅 *التاريخ:* ${new Date().toLocaleDateString('ar-EG-u-nu-latn')}`,
      `👤 *العميل:* ${lead.name}`,
      `📍 *المنطقة:* ${areaDisplayName} ${locationNotes ? `(${locationNotes})` : ''}`,
      gps.lat && gps.lng ? `🗺️ *إحداثيات GPS:* https://maps.google.com/?q=${gps.lat},${gps.lng}` : '',
      `───────────────`,
      `🏢 *مواصفات الوحدة:*`,
      `• النوع: ${unitType === 'apartment' ? 'شقة' : unitType === 'villa' ? 'فيلا' : 'وحدة'} | الدور: ${floor || '—'} | المساحة: ${size || '—'}م²`,
      `• الغرف: ${rooms || '—'} | الحمامات: ${bathrooms || '—'}`,
      `• الشارع: ${streetWidth === 'wide' ? 'رئيسي واسع (20+ م)' : streetWidth === 'medium' ? 'متوسط (10-15 م)' : 'جانبي (<8 م)'}`,
      `• الواجهة والتهوية: ${orientation === 'maritime' ? 'بحري صريح' : orientation === 'western' ? 'غربي' : 'شرقي/قبلي'}`,
      `───────────────`,
      `⚡ *فحص المرافق والبنية التحتية:*`,
      `• الكهرباء: ${electricity.meterType === 'card' ? 'عداد كارت مسبق الدفع' : electricity.meterType === 'classic' ? 'عداد قديم' : 'مقايسة'}${electricity.meterNumber ? ` (رقم: ${electricity.meterNumber})` : ''}`,
      `• المياه: ${water.connection === 'separate' ? 'عداد مياه مستقل' : 'عداد مشترك'}`,
      `• الغاز الطبيعي: ${naturalGas === 'connected' ? 'شغال بالوحدة' : naturalGas === 'building' ? 'واصل للعمارة' : 'غير متوفر'}`,
      `• الصرف الصحي: ${sewage === 'network' ? 'شبكة عمومية' : 'بيارة'}`,
      `• المصعد: ${elevator === 'working' ? 'أسانسير شغال ومفحوص' : elevator === 'installing' ? 'جاري التركيب' : 'لا يوجد'}`,
      `• المدخل والواجهة: ${buildingEntrance === 'marble' ? 'مدخل رخام فاخر' : 'تشطيب عادي'}`,
      `───────────────`,
      `⚖️ *الفحص القانوني:*`,
      `• سند الملكية: ${deedType === 'registered' ? 'عقد مسجل شهر عقاري' : deedType === 'authority_allocation' ? 'تخصيص جهاز سوهاج الجديدة' : 'صحة ونفاذ / توقيع'}`,
      `• التصالح (نموذج 10): ${reconciliation === 'approved' ? 'يوجد نموذج 10 نهائي' : reconciliation === 'exempt' ? 'مرخص بدون مخالفات' : 'جاري / قيد الفحص'}`,
      `• الموقف المالي: ${financialClearance === 'clear' ? 'خالص الثمن بدون أي مستحقات' : 'يوجد التزامات أو أقساط'}`,
      `───────────────`,
      `💰 *التثمين المالي ومؤشر السوق:*`,
      `• السعر المطلوب: ${Number(askingPrice).toLocaleString('en-US')} ج.م`,
      `• سعر المتر الفعلي: ${askingPerSqm.toLocaleString('en-US')} ج.م/م²`,
      benchmarkPerSqm > 0 ? `• متوسط سعر المتر العادل بالمنطقة: ${benchmarkPerSqm.toLocaleString('en-US')} ج.م/م²` : '',
      `• تقييم التسعير: ${valuationText}`,
      `• سرعة السيولة والبيع: ${liquidityRating === 'high' ? 'سريعة جداً (< 30 يوم)' : liquidityRating === 'medium' ? 'متوسطة (1-3 شهور)' : 'فرصة استثمارية طويلة'}`,
      report.recommendedPrice ? `• السعر المقترح من 1Line: ${Number(report.recommendedPrice).toLocaleString('en-US')} ج.م` : '',
      agentNotes ? `\n📝 *ملاحظات المستشار الميداني:*\n${agentNotes}` : '',
      `\n✅ تقرير معتمد من المستشار: *${report.inspector}* — 1Line Real Estate`
    ].filter(Boolean).join('\n');

    if (cleanPhone) {
      window.open(`https://wa.me/${formatWhatsAppPhone(cleanPhone)}?text=${encodeURIComponent(lines)}`, '_blank');
    } else {
      navigator.clipboard?.writeText?.(lines);
      triggerToast?.(isAr ? 'تم نسخ التقرير الشامل للحافظة لمشاركته عبر الواتساب' : 'Report copied to clipboard', 'info');
    }
  };

  return (
    <div className="field-inspection-backdrop" onClick={onClose}>
      <div className="field-inspection-card" onClick={(e) => e.stopPropagation()} dir={isAr ? 'rtl' : 'ltr'}>
        {/* Header */}
        <div className="field-inspection-header">
          <div className="field-inspection-title-wrap">
            <div className="field-inspection-icon-badge">
              <Building size={20} />
            </div>
            <div>
              <h2>{isAr ? 'استمارة الفحص الميداني والتثمين العقاري' : 'Field Inspection & Valuation Form'}</h2>
              <p>
                {lead.name} • {areaDisplayName} {property?.unitCode ? `(${property.unitCode})` : ''}
              </p>
            </div>
          </div>
          <button type="button" className="fi-btn-close" onClick={onClose} aria-label={isAr ? 'إغلاق' : 'Close'}>
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="fi-tabs">
          <button
            type="button"
            className={`fi-tab ${activeTab === 'inspection' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('inspection')}
          >
            <ShieldCheck size={16} />
            <span>{isAr ? 'الفحص الميداني والمرافق' : 'Utilities & Audit'}</span>
          </button>
          <button
            type="button"
            className={`fi-tab ${activeTab === 'valuation' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('valuation')}
          >
            <Scale size={16} />
            <span>{isAr ? 'التثمين ومؤشر السوق' : 'Valuation & Pricing'}</span>
          </button>
          <button
            type="button"
            className={`fi-tab ${activeTab === 'photos' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('photos')}
          >
            <Camera size={16} />
            <span>
              {isAr ? 'صور المعاينة' : 'Inspection Photos'} ({photos.length})
            </span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="field-inspection-body">
          {/* TAB 1: INSPECTION & AUDIT */}
          {activeTab === 'inspection' && (
            <>
              {/* GPS Location Capture */}
              <div className="fi-section">
                <div className="fi-section-header">
                  <div className="fi-section-title">
                    <MapPin size={18} className="text-gold" />
                    <span>{isAr ? 'إحداثيات الـ GPS والموقع الفعلي' : 'GPS Coordinates & Location'}</span>
                  </div>
                  <button
                    type="button"
                    className="fi-gps-btn"
                    onClick={handleFetchGps}
                    disabled={locatingGps}
                  >
                    {locatingGps ? <Loader2 size={15} className="fi-spin" /> : <Navigation size={15} />}
                    <span>{locatingGps ? (isAr ? 'جاري التحديد...' : 'Locating...') : (isAr ? 'تثبيت اللوكيشن الفعلي 📍' : 'Pin GPS Location')}</span>
                  </button>
                </div>

                {gps.lat && gps.lng ? (
                  <div className="fi-gps-badge">
                    <CheckCircle2 size={16} className="text-emerald" />
                    <span className="fi-gps-coords">
                      {gps.lat.toFixed(5)}, {gps.lng.toFixed(5)} {gps.accuracy ? `(±${gps.accuracy}م)` : ''}
                    </span>
                    <a
                      href={`https://maps.google.com/?q=${gps.lat},${gps.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="fi-gps-link"
                    >
                      <ExternalLink size={14} />
                      <span>{isAr ? 'عرض بالخريطة' : 'View map'}</span>
                    </a>
                  </div>
                ) : (
                  <p className="fi-hint">
                    {isAr
                      ? 'اضغط زر تثبيت اللوكيشن لتسجيل إحداثيات العقار الميدانية بدقة على الخريطة أثناء تواجدك بالموقع.'
                      : 'Click Pin GPS to save the precise real coordinates while at the site.'}
                  </p>
                )}

                <div className="fi-grid-2" style={{ marginTop: '10px' }}>
                  <div className="fi-field">
                    <label>{isAr ? 'عرض الشارع المؤدي للعقار' : 'Street Width'}</label>
                    <div className="fi-pills-row">
                      <button
                        type="button"
                        className={`fi-pill ${streetWidth === 'wide' ? 'is-active' : ''}`}
                        onClick={() => setStreetWidth('wide')}
                      >
                        {isAr ? 'رئيسي (20+ م)' : 'Wide (20m+)'}
                      </button>
                      <button
                        type="button"
                        className={`fi-pill ${streetWidth === 'medium' ? 'is-active' : ''}`}
                        onClick={() => setStreetWidth('medium')}
                      >
                        {isAr ? 'متوسط (10-15 م)' : 'Medium (10-15m)'}
                      </button>
                      <button
                        type="button"
                        className={`fi-pill ${streetWidth === 'narrow' ? 'is-active-warning' : ''}`}
                        onClick={() => setStreetWidth('narrow')}
                      >
                        {isAr ? 'ضيق (< 8 م)' : 'Narrow (< 8m)'}
                      </button>
                    </div>
                  </div>

                  <div className="fi-field">
                    <label>{isAr ? 'علامة مميزة أو اسم الشارع' : 'Landmark / Street'}</label>
                    <input
                      type="text"
                      className="fi-input"
                      value={locationNotes}
                      onChange={(e) => setLocationNotes(e.target.value)}
                      placeholder={isAr ? 'مثال: بجوار مستشفى الهلال أو برج الأطباء' : 'e.g. Near El-Helal Hospital'}
                    />
                  </div>
                </div>
              </div>

              {/* Physical Specifications */}
              <div className="fi-section">
                <div className="fi-section-header">
                  <div className="fi-section-title">
                    <Building size={18} className="text-gold" />
                    <span>{isAr ? 'بيانات ومواصفات الوحدة' : 'Unit Specifications'}</span>
                  </div>
                </div>

                <div className="fi-grid-3">
                  <div className="fi-field">
                    <label>{isAr ? 'نوع الوحدة' : 'Property Type'}</label>
                    <select
                      className="fi-select"
                      value={unitType}
                      onChange={(e) => setUnitType(e.target.value)}
                    >
                      <option value="apartment">{isAr ? 'شقة سكنية' : 'Apartment'}</option>
                      <option value="duplex">{isAr ? 'دوبلكس' : 'Duplex'}</option>
                      <option value="villa">{isAr ? 'فيلا / منزل مستقل' : 'Villa'}</option>
                      <option value="commercial">{isAr ? 'محل تجاري' : 'Commercial Shop'}</option>
                      <option value="office">{isAr ? 'مكتب إداري / عيادة' : 'Office / Clinic'}</option>
                      <option value="land">{isAr ? 'أرض فضاء' : 'Land'}</option>
                    </select>
                  </div>

                  <div className="fi-field">
                    <label>{isAr ? 'المساحة الإجمالية (م²)' : 'Size (sqm)'}</label>
                    <input
                      type="number"
                      className="fi-input"
                      value={size}
                      onChange={(e) => setSize(e.target.value)}
                      placeholder="120"
                    />
                  </div>

                  <div className="fi-field">
                    <label>{isAr ? 'الدور' : 'Floor'}</label>
                    <input
                      type="text"
                      className="fi-input"
                      value={floor}
                      onChange={(e) => setFloor(e.target.value)}
                      placeholder={isAr ? 'مثال: الثالث' : '3'}
                    />
                  </div>
                </div>

                <div className="fi-grid-2" style={{ marginTop: '8px' }}>
                  <div className="fi-field">
                    <label>{isAr ? 'عدد الغرف' : 'Bedrooms'}</label>
                    <input
                      type="number"
                      className="fi-input"
                      value={rooms}
                      onChange={(e) => setRooms(e.target.value)}
                      placeholder="3"
                    />
                  </div>

                  <div className="fi-field">
                    <label>{isAr ? 'عدد الحمامات' : 'Bathrooms'}</label>
                    <input
                      type="number"
                      className="fi-input"
                      value={bathrooms}
                      onChange={(e) => setBathrooms(e.target.value)}
                      placeholder="1"
                    />
                  </div>
                </div>
              </div>

              {/* Utilities Audit Checklist */}
              <div className="fi-section">
                <div className="fi-section-header">
                  <div className="fi-section-title">
                    <Zap size={18} className="text-gold" />
                    <span>{isAr ? 'فحص شبكات المرافق والبنية التحتية' : 'Utilities Audit'}</span>
                  </div>
                </div>

                <div className="fi-field">
                  <label>{isAr ? 'الكهرباء والعداد' : 'Electricity & Meter'}</label>
                  <div className="fi-pills-row">
                    <button
                      type="button"
                      className={`fi-pill ${electricity.meterType === 'card' ? 'is-active' : ''}`}
                      onClick={() => setElectricity({ ...electricity, meterType: 'card' })}
                    >
                      {isAr ? 'عداد كارت مسبق الدفع' : 'Prepaid Card'}
                    </button>
                    <button
                      type="button"
                      className={`fi-pill ${electricity.meterType === 'classic' ? 'is-active' : ''}`}
                      onClick={() => setElectricity({ ...electricity, meterType: 'classic' })}
                    >
                      {isAr ? 'عداد قديم (فاتورة)' : 'Classic Meter'}
                    </button>
                    <button
                      type="button"
                      className={`fi-pill ${electricity.meterType === 'uninstalled' ? 'is-active-warning' : ''}`}
                      onClick={() => setElectricity({ ...electricity, meterType: 'uninstalled' })}
                    >
                      {isAr ? 'مقايسة لم تدخل' : 'No Meter'}
                    </button>
                  </div>
                </div>

                <div className="fi-grid-2" style={{ marginTop: '8px' }}>
                  <div className="fi-field">
                    <label>
                      <Droplet size={14} className="text-blue" />
                      <span>{isAr ? 'المياه' : 'Water'}</span>
                    </label>
                    <div className="fi-pills-row">
                      <button
                        type="button"
                        className={`fi-pill ${water.connection === 'separate' ? 'is-active' : ''}`}
                        onClick={() => setWater({ ...water, connection: 'separate' })}
                      >
                        {isAr ? 'عداد مستقل' : 'Separate'}
                      </button>
                      <button
                        type="button"
                        className={`fi-pill ${water.connection === 'shared' ? 'is-active' : ''}`}
                        onClick={() => setWater({ ...water, connection: 'shared' })}
                      >
                        {isAr ? 'عداد مجمع' : 'Shared'}
                      </button>
                    </div>
                  </div>

                  <div className="fi-field">
                    <label>
                      <Flame size={14} className="text-orange" />
                      <span>{isAr ? 'الغاز الطبيعي' : 'Natural Gas'}</span>
                    </label>
                    <div className="fi-pills-row">
                      <button
                        type="button"
                        className={`fi-pill ${naturalGas === 'connected' ? 'is-active' : ''}`}
                        onClick={() => setNaturalGas('connected')}
                      >
                        {isAr ? 'شغال بالوحدة' : 'Connected'}
                      </button>
                      <button
                        type="button"
                        className={`fi-pill ${naturalGas === 'building' ? 'is-active' : ''}`}
                        onClick={() => setNaturalGas('building')}
                      >
                        {isAr ? 'واصل للعمارة' : 'At building'}
                      </button>
                      <button
                        type="button"
                        className={`fi-pill ${naturalGas === 'none' ? 'is-active-warning' : ''}`}
                        onClick={() => setNaturalGas('none')}
                      >
                        {isAr ? 'غير متوفر' : 'None'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="fi-grid-3" style={{ marginTop: '8px' }}>
                  <div className="fi-field">
                    <label>{isAr ? 'المصعد (الأسانسير)' : 'Elevator'}</label>
                    <select
                      className="fi-select"
                      value={elevator}
                      onChange={(e) => setElevator(e.target.value)}
                    >
                      <option value="working">{isAr ? 'شغال ومفحوص' : 'Working'}</option>
                      <option value="installing">{isAr ? 'جاري التركيب' : 'Installing'}</option>
                      <option value="none">{isAr ? 'لا يوجد مصعد' : 'None'}</option>
                    </select>
                  </div>

                  <div className="fi-field">
                    <label>{isAr ? 'الصرف الصحي' : 'Sewage'}</label>
                    <select
                      className="fi-select"
                      value={sewage}
                      onChange={(e) => setSewage(e.target.value)}
                    >
                      <option value="network">{isAr ? 'شبكة عمومية' : 'Public Network'}</option>
                      <option value="cesspool">{isAr ? 'بيارة / خزان' : 'Cesspool'}</option>
                    </select>
                  </div>

                  <div className="fi-field">
                    <label>{isAr ? 'مدخل العمارة' : 'Entrance'}</label>
                    <select
                      className="fi-select"
                      value={buildingEntrance}
                      onChange={(e) => setBuildingEntrance(e.target.value)}
                    >
                      <option value="marble">{isAr ? 'مدخل رخام فاخر' : 'Marble'}</option>
                      <option value="finished">{isAr ? 'تشطيب عادي' : 'Finished'}</option>
                      <option value="unfinished">{isAr ? 'طوب / غير مشطب' : 'Unfinished'}</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Structural & Legal Inspection */}
              <div className="fi-section">
                <div className="fi-section-header">
                  <div className="fi-section-title">
                    <ShieldCheck size={18} className="text-gold" />
                    <span>{isAr ? 'الحالة الإنشائية والسند القانوني' : 'Structure & Legal Audit'}</span>
                  </div>
                </div>

                <div className="fi-grid-2">
                  <div className="fi-field">
                    <label>{isAr ? 'مستوى التشطيب الفعلي' : 'Finishing'}</label>
                    <select
                      className="fi-select"
                      value={finishingLevel}
                      onChange={(e) => setFinishingLevel(e.target.value)}
                    >
                      <option value="super_lux">{isAr ? 'سوبر لوكس (جاهز للسكن فوراً)' : 'Super Lux'}</option>
                      <option value="lux">{isAr ? 'لوكس' : 'Lux'}</option>
                      <option value="semi_finished">{isAr ? 'نصف تشطيب (محارة وحلوق)' : 'Semi-finished'}</option>
                      <option value="red_brick">{isAr ? 'طوب أحمر على العظم' : 'Red Brick'}</option>
                    </select>
                  </div>

                  <div className="fi-field">
                    <label>{isAr ? 'حالة الحوائط والأسقف' : 'Walls Condition'}</label>
                    <select
                      className="fi-select"
                      value={wallsCondition}
                      onChange={(e) => setWallsCondition(e.target.value)}
                    >
                      <option value="sound">{isAr ? 'سليم تماماً بدون عيوب' : 'Sound'}</option>
                      <option value="hairline_cracks">{isAr ? 'شروخ دهان سطحية بسيطة' : 'Hairline Cracks'}</option>
                      <option value="moisture">{isAr ? 'يوجد نشع ورطوبة بحاجة لمعالجة' : 'Moisture'}</option>
                      <option value="structural_cracks">{isAr ? 'شروخ نافذة تحتاج فحص هندسي' : 'Structural Cracks'}</option>
                    </select>
                  </div>
                </div>

                <div className="fi-grid-3" style={{ marginTop: '8px' }}>
                  <div className="fi-field">
                    <label>{isAr ? 'سند الملكية' : 'Deed Status'}</label>
                    <select
                      className="fi-select"
                      value={deedType}
                      onChange={(e) => setDeedType(e.target.value)}
                    >
                      <option value="registered">{isAr ? 'عقد مسجل شهر عقاري' : 'Notary Registered'}</option>
                      <option value="authority_allocation">{isAr ? 'تخصيص جهاز سوهاج الجديدة' : 'Authority Allocated'}</option>
                      <option value="court_validity">{isAr ? 'صحة توقيع ونفاذ' : 'Court Signature Validity'}</option>
                      <option value="poa">{isAr ? 'توكيل رسمي بيع للنفس' : 'Power of Attorney'}</option>
                    </select>
                  </div>

                  <div className="fi-field">
                    <label>{isAr ? 'التصالح (نموذج 10)' : 'Reconciliation'}</label>
                    <select
                      className="fi-select"
                      value={reconciliation}
                      onChange={(e) => setReconciliation(e.target.value)}
                    >
                      <option value="approved">{isAr ? 'يوجد نموذج 10 نهائي' : 'Model 10 Approved'}</option>
                      <option value="exempt">{isAr ? 'مرخص بدون مخالفات' : 'Licensed / Exempt'}</option>
                      <option value="in_progress">{isAr ? 'جاري السداد (نموذج 3)' : 'In Progress'}</option>
                      <option value="unlicensed">{isAr ? 'مخالف بدون تصالح' : 'Unlicensed'}</option>
                    </select>
                  </div>

                  <div className="fi-field">
                    <label>{isAr ? 'الموقف المالي والأقساط' : 'Financial Clearance'}</label>
                    <select
                      className="fi-select"
                      value={financialClearance}
                      onChange={(e) => setFinancialClearance(e.target.value)}
                    >
                      <option value="clear">{isAr ? 'خالص الثمن بدون مستحقات' : 'Fully Paid'}</option>
                      <option value="installments">{isAr ? 'يوجد أقساط متبقية للجهاز/المطور' : 'Pending Installments'}</option>
                      <option value="dispute">{isAr ? 'يوجد نزاع أو ورثة' : 'Dispute / Heirs'}</option>
                    </select>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* TAB 2: VALUATION & PRICING BENCHMARK */}
          {activeTab === 'valuation' && (
            <>
              <div className="fi-val-card">
                <div className="fi-val-badge">{isAr ? 'مؤشر التثمين الذكي لـ 1Line' : '1Line Fair Valuation'}</div>

                <div className="fi-val-stat">
                  <div className="fi-val-num">
                    {askingPerSqm ? askingPerSqm.toLocaleString('en-US') : '—'}
                  </div>
                  <div className="fi-val-unit">{isAr ? 'ج.م / م² (سعر المالك)' : 'EGP / sqm (Asking)'}</div>
                </div>

                <div className="fi-benchmark-row">
                  <div className="fi-benchmark-item">
                    <span>{isAr ? 'متوسط سعر المنطقة:' : 'Market Avg:'}</span>
                    <strong>{benchmarkPerSqm ? `${benchmarkPerSqm.toLocaleString('en-US')} ج.م/م²` : '—'}</strong>
                  </div>
                  <div className="fi-benchmark-item">
                    <span>{isAr ? 'المنطقة المحسوبة:' : 'Reference Area:'}</span>
                    <strong>{areaDisplayName}</strong>
                  </div>
                </div>

                <div className={`fi-val-status fi-val-status--${valuationTone}`}>
                  {valuationTone === 'good' && <CheckCircle2 size={16} />}
                  {valuationTone === 'bad' && <AlertTriangle size={16} />}
                  {valuationTone === 'info' && <Scale size={16} />}
                  <span>{valuationText}</span>
                </div>
              </div>

              <div className="fi-section" style={{ marginTop: '16px' }}>
                <div className="fi-section-header">
                  <div className="fi-section-title">
                    <Coins size={18} className="text-gold" />
                    <span>{isAr ? 'أرقام التسعير والسيولة' : 'Pricing & Liquidity Score'}</span>
                  </div>
                </div>

                <div className="fi-grid-2">
                  <div className="fi-field">
                    <label>{isAr ? 'السعر المطلوب من المالك (ج.م)' : 'Asking Price (EGP)'}</label>
                    <input
                      type="number"
                      className="fi-input"
                      value={askingPrice}
                      onChange={(e) => setAskingPrice(e.target.value)}
                      placeholder="1,500,000"
                    />
                  </div>

                  <div className="fi-field">
                    <label>{isAr ? 'السعر العادل المقترح من 1Line (ج.م)' : 'Recommended Fair Price (EGP)'}</label>
                    <input
                      type="number"
                      className="fi-input"
                      value={recommendedPrice}
                      onChange={(e) => setRecommendedPrice(e.target.value)}
                      placeholder={benchmarkPerSqm && numSize ? (benchmarkPerSqm * numSize).toLocaleString('en-US') : '1,400,000'}
                    />
                  </div>
                </div>

                <div className="fi-field" style={{ marginTop: '10px' }}>
                  <label>{isAr ? 'سرعة السيولة المتوقعة للوحدة بهذا السعر' : 'Expected Liquidity Speed'}</label>
                  <div className="fi-pills-row">
                    <button
                      type="button"
                      className={`fi-pill ${liquidityRating === 'high' ? 'is-active' : ''}`}
                      onClick={() => setLiquidityRating('high')}
                    >
                      {isAr ? '⚡ سريعة جداً (< 30 يوم)' : 'Fast (< 30 days)'}
                    </button>
                    <button
                      type="button"
                      className={`fi-pill ${liquidityRating === 'medium' ? 'is-active' : ''}`}
                      onClick={() => setLiquidityRating('medium')}
                    >
                      {isAr ? '⚖️ متوسطة (1-3 شهور)' : 'Medium (1-3 mos)'}
                    </button>
                    <button
                      type="button"
                      className={`fi-pill ${liquidityRating === 'slow' ? 'is-active-warning' : ''}`}
                      onClick={() => setLiquidityRating('slow')}
                    >
                      {isAr ? '⏳ استثمار طويل (> 3 شهور)' : 'Slow (> 3 mos)'}
                    </button>
                  </div>
                </div>

                <div className="fi-field" style={{ marginTop: '10px' }}>
                  <label>{isAr ? 'ملاحظات المستشار العقاري الميداني' : 'Agent Field Notes'}</label>
                  <textarea
                    className="fi-textarea"
                    rows={3}
                    value={agentNotes}
                    onChange={(e) => setAgentNotes(e.target.value)}
                    placeholder={isAr ? 'اكتب تقييمك للموقع، مدى مرونة المالك في التفاوض، وأي ملاحظات جوهرية...' : 'Write key notes regarding seller flexibility, view, etc.'}
                  />
                </div>
              </div>
            </>
          )}

          {/* TAB 3: PHOTOS */}
          {activeTab === 'photos' && (
            <div className="fi-section">
              <div className="fi-section-header">
                <div className="fi-section-title">
                  <Camera size={18} className="text-gold" />
                  <span>{isAr ? 'صور الفحص والمعاينة الميدانية' : 'Field Inspection Photos'}</span>
                </div>
                <div className="fi-photo-actions">
                  <label className="fi-upload-btn" htmlFor={cameraInputId}>
                    <Camera size={15} />
                    <span>{isAr ? 'فتح الكاميرا 📸' : 'Camera'}</span>
                  </label>
                  <input
                    id={cameraInputId}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    multiple
                    style={{ display: 'none' }}
                    onChange={handlePhotoUpload}
                    disabled={compressingPhotos}
                  />

                  <label className="fi-upload-btn fi-upload-btn--secondary" htmlFor={galleryInputId}>
                    <UploadCloud size={15} />
                    <span>{isAr ? 'من الاستوديو' : 'Gallery'}</span>
                  </label>
                  <input
                    id={galleryInputId}
                    type="file"
                    accept="image/*"
                    multiple
                    style={{ display: 'none' }}
                    onChange={handlePhotoUpload}
                    disabled={compressingPhotos}
                  />
                </div>
              </div>

              {compressingPhotos && (
                <div className="fi-compress-alert">
                  <Loader2 size={16} className="fi-spin text-gold" />
                  <span>{isAr ? 'جاري ضغط الصور بدقة عالية لتناسب شبكة الموبايل...' : 'Compressing photos...'}</span>
                </div>
              )}

              {photos.length === 0 ? (
                <div className="fi-photos-empty">
                  <Camera size={36} className="text-muted" />
                  <p>{isAr ? 'لم يتم إضافة صور للمعاينة بعد.' : 'No photos taken yet.'}</p>
                  <span>{isAr ? 'التقط صوراً للغرف، الواجهة، المدخل، وعيوب الدهانات إن وجدت.' : 'Take photos of rooms, entrance, and facade.'}</span>
                </div>
              ) : (
                <div className="fi-photos-container">
                  {photos.map((p, idx) => (
                    <div key={p.id || idx} className="fi-photo-tile">
                      <img src={p.url} alt={`Inspection Photo ${idx + 1}`} loading="lazy" />
                      <button
                        type="button"
                        className="fi-photo-remove"
                        onClick={() => handleRemovePhoto(p.id)}
                        aria-label={isAr ? 'حذف' : 'Remove'}
                      >
                        <Trash2 size={14} />
                      </button>
                      <span className="fi-photo-badge">{p.sizeKb ? `${p.sizeKb}KB` : `#${idx + 1}`}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer with Actions */}
        <div className="field-inspection-footer">
          <button
            type="button"
            className="fi-btn-whatsapp"
            onClick={handleShareWhatsApp}
            title={isAr ? 'مشاركة التقرير عبر الواتساب' : 'Share report via WhatsApp'}
          >
            <Share2 size={16} />
            <span>{isAr ? 'مشاركة تقرير واتساب 📲' : 'Share WhatsApp'}</span>
          </button>

          <div className="fi-footer-main-actions">
            <button
              type="button"
              className="fi-btn-secondary"
              onClick={onClose}
              disabled={saving}
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>

            <button
              type="button"
              className="fi-btn-primary"
              onClick={handleSave}
              disabled={saving || compressingPhotos}
            >
              {saving ? <Loader2 size={16} className="fi-spin" /> : <FileText size={16} />}
              <span>{saving ? (isAr ? 'جاري الاعتماد...' : 'Saving...') : (isAr ? 'اعتماد التقرير الميداني ✅' : 'Approve & Save')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
