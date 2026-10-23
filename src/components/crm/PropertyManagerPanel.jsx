import { useState, useEffect, useMemo } from 'react';
import useOpenRequest from '../../hooks/useOpenRequest';
import { Building, Plus, Upload, Search, Star, ChevronDown, AlertTriangle, SlidersHorizontal, X } from 'lucide-react';
import { PageHeader, Button, Card, Badge, Chip, EmptyState, SegmentedControl, Select, Input, useConfirm } from '../ui';
import { toLatinDigits } from '../../utils/latinDigits';
import ListingsBulkBar from './ListingsBulkBar';
import ListingsReport from './ListingsReport';
import { listingIssues, matchesFilters, sortListings, SORTS, ISSUES, NO_AREA } from '../../utils/listingReview';
import './properties-panel.css';
import { getAreas } from '../../utils/areasData';
import HomepageSlotsBoard, { FeaturedSlotModal } from './HomepageSlotsBoard';
import { homepageSummary } from '../../utils/featuredSlots';
import { hasNoRooms, isLandType, categoryOfType } from '../../utils/propertyKinds';

import DataImportModal from './DataImportModal';
import ExportMenu from './ExportMenu';
import { propertyToRow } from '../../utils/transfer/propertySchema';
import InteractiveMapPickerModal from './InteractiveMapPickerModal';
import WhatsAppMatchNotifierModal from './WhatsAppMatchNotifierModal';
import { findMatchingClientsForProperty } from '../../utils/matchingEngine';

import { uploadMultipleImages, uploadInlinePhoto } from '../../utils/imageUploadService';
import ThumbBackfillCard from './ThumbBackfillCard';

// Accurate GPS Coordinates map for Sohag Districts
import PropertyFormModal from './PropertyFormModal';
import PropertyTableRow from './PropertyTableRow';
import PropertyFacetFilter from './PropertyFacetFilter';
import { PROPERTY_TYPES } from '../../data/propertiesData';

const SHORT_TYPE_AR = { apartment: 'شقق ودوبلكس', villa: 'فيلات', commercial: 'محلات', office: 'مكاتب وعيادات', land: 'أراضي', agri_land: 'أراضي زراعية', farm: 'مزارع', factory: 'مصانع وورش', warehouse: 'مخازن', industrial_land: 'أراضي صناعية' };
const SHORT_TYPE_EN = { apartment: 'Apartments', villa: 'Villas', commercial: 'Shops', office: 'Offices & clinics', land: 'Land', agri_land: 'Farmland', farm: 'Farms', factory: 'Factories', warehouse: 'Warehouses', industrial_land: 'Industrial land' };
const LIST_PAGE = 25;
import OfferModal from './OfferModal';
import { getNormalizedPropertyStatus } from '../../utils/crmLeadViews';
import { useProperties } from '../../context/PropertiesContext';
const SOHAG_AREA_COORDINATES = {
  east: { lat: 26.5569, lng: 31.7001 },
  new_sohag: { lat: 26.4715, lng: 31.6620 },
  west: { lat: 26.5600, lng: 31.6850 },
  markaz: { lat: 26.5700, lng: 31.6700 },
  akhmeem: { lat: 26.5630, lng: 31.7450 }
};
// Every area's own center (Tahta, Girga, Kawthar, Thakafa… included); the table above only covers legacy keys
const areaCenter = (key) => SOHAG_AREA_COORDINATES[key] || getAreas().find((a) => a.id === key)?.center || null;

const DEFAULT_FORM_STATE = {
  title_ar: '',
  title_en: '',
  type: 'apartment',
  areaKey: 'east',
  // A new listing starts empty: every fact on it (price, size, rooms, finishing, photos) must come
  // from the owner. Pre-filled samples were being published whenever a field was left unchanged.
  locationName_ar: '',
  locationName_en: '',
  price: '',
  downPayment: 0,
  monthlyInstallment: 0,
  installmentYears: 0,
  size: '',
  bedrooms: '',
  bathrooms: '',
  floor: '',
  finishing_ar: '',
  finishing_en: '',
  status: 'published', // 'published' | 'hidden' | 'under_negotiation' | 'sold'
  featured: false,
  priorityRank: 0,
  badge_ar: '',
  badge_en: '',
  images: [],
  // Written per listing; a pre-filled "luxury / great view" text would be published as fact
  description_ar: '',
  description_en: '',
  // Panoramic photo viewer; off until the listing has photos worth panning
  virtualTour: false,
  isDeleted: false,
  // No legal record until the team actually reviews the documents (CRM → الموقف القانوني)
  legalStatus: null,
  customBenchmarkPrice: '',
  nearbyAmenities: []
};

export default function PropertyManagerPanel({
  properties = [],
  leads = [],
  demands = [],
  onAddProperty,
  onUpdateProperty,
  onDeleteProperty,
  onImportProperties,
  onImportLeads,
  lang = 'ar',
  triggerToast,
  externalNewPropertyData = null,
  onClearExternalData = () => {},
  openRequest = null,
  readOnly = false
}) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPropertyId, setEditingPropertyId] = useState(null);
  const [typeFilter, setTypeFilter] = useState('all');
  const [areaFilter, setAreaFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState('list'); // 'list' | 'report'
  const [readiness, setReadiness] = useState('all'); // 'all' | 'ready' | 'incomplete'
  const [issueFilter, setIssueFilter] = useState('all');
  const [range, setRange] = useState({ priceMin: '', priceMax: '', sizeMin: '', sizeMax: '' });
  const [sortKey, setSortKey] = useState('newest');
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const confirm = useConfirm();
  const { unsyncedProperties = {}, cloudPropertyIds, retryPropertySync, discardLocalProperty } = useProperties();
  // Photos stored inside a listing (refused upload) → Blob, then save: the listing gets small
  // enough for the database without anyone retyping it or picking the photos again
  const [uploadingInline, setUploadingInline] = useState(null); // { id, done, total }
  const handleUploadInline = async (prop) => {
    const images = Array.isArray(prop.images) ? prop.images : [];
    const total = images.filter((u) => String(u).startsWith('data:image/')).length;
    if (!total) return;
    let done = 0;
    let failed = 0;
    setUploadingInline({ id: prop.id, done, total });
    const next = [];
    for (const [i, url] of images.entries()) {
      if (!String(url).startsWith('data:image/')) { next.push(url); continue; }
      const uploaded = await uploadInlinePhoto(url, prop.id, i);
      if (uploaded) next.push(uploaded); else { next.push(url); failed += 1; }
      done += 1;
      setUploadingInline({ id: prop.id, done, total });
    }
    setUploadingInline(null);
    if (failed < total) onUpdateProperty(prop.id, { images: next });
    triggerToast(
      failed
        ? (isAr ? `اترفع ${total - failed} من ${total} صورة. الباقي اترفض: اتأكد إن حسابك معاه صلاحية «إضافة وتعديل العقارات» واخرج وادخل تاني، وبعدين جرّب تاني.` : `${total - failed}/${total} photos uploaded. Check the listing permission, sign out and in, then try again.`)
        : (isAr ? `اترفعت الـ${total} صورة، والوحدة اتبعتت للسيرفر.` : `All ${total} photos uploaded and the listing was sent.`),
      failed ? 'error' : 'success'
    );
  };
  const handleDiscardLocal = async (id) => {
    const ok = await confirm({
      title: isAr ? 'تمسح النسخة اللي على الجهاز ده؟' : 'Remove this device copy?',
      tone: 'danger',
      message: isAr ? 'الوحدة دي مش على السيرفر، فهتتمسح من الجهاز ده بس، ومش هتأثر على حاجة عند حد تاني.' : 'This listing is not in the database; it is removed from this device only.',
      confirmLabel: isAr ? 'امسحها' : 'Remove',
      cancelLabel: isAr ? 'لأ' : 'Cancel'
    });
    if (ok) discardLocalProperty(id);
  };
  const [showSlots, setShowSlots] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [notifierProperty, setNotifierProperty] = useState(null);
  const [notifierEventType, setNotifierEventType] = useState('new_unit');
  const [areas, setAreas] = useState(() => getAreas());
  const [slotEditing, setSlotEditing] = useState(null); // property being scheduled for the homepage
  const [offerEditing, setOfferEditing] = useState(null); // property whose limited-time offer is being edited
  const [importOpen, setImportOpen] = useState(false);

  useEffect(() => {
    const handleUpdate = () => setAreas(getAreas());
    window.addEventListener('oneline_areas_updated', handleUpdate);
    return () => window.removeEventListener('oneline_areas_updated', handleUpdate);
  }, []);

  const isAr = lang === 'ar';

  const [form, setForm] = useState(DEFAULT_FORM_STATE);

  // Handle external conversion request (from CRM Leads to Property)
  const [prevExternalData, setPrevExternalData] = useState(null);
  if (externalNewPropertyData && externalNewPropertyData !== prevExternalData) {
    setPrevExternalData(externalNewPropertyData);
    setEditingPropertyId(null);
    setForm({
      ...DEFAULT_FORM_STATE,
      ...externalNewPropertyData
    });
    setShowAddModal(true);
  }

  useEffect(() => {
    if (externalNewPropertyData) {
      onClearExternalData?.();
    }
  }, [externalNewPropertyData, onClearExternalData]);

  const handleOpenAdd = () => {
    setEditingPropertyId(null);
    setForm(DEFAULT_FORM_STATE);
    setShowAddModal(true);
  };
  useOpenRequest(openRequest, ['add_property'], () => { if (!readOnly) handleOpenAdd(); });

  const handleOpenEdit = (prop) => {
    setEditingPropertyId(prop.id);
    setForm({
      ...DEFAULT_FORM_STATE,
      ...prop,
      bedrooms: hasNoRooms(prop.type) ? 0 : (prop.bedrooms || 0),
      bathrooms: isLandType(prop.type) ? 0 : (prop.bathrooms || 0),
      status: prop.status || (prop.isArchived ? 'hidden' : 'published')
    });
    setShowAddModal(true);
  };

  // Quick Toggle Visibility (Active / Hidden)
  const handleToggleVisibility = async (prop) => {
    // Anything the site shows (published, under negotiation, sold…) is hidden; hidden/draft is published.
    // It used to compare with 'published' only, so the eye on an "under negotiation" listing
    // published it instead of hiding it.
    const currentStatus = prop.status || (prop.isArchived ? 'hidden' : 'published');
    const hiding = !['hidden', 'draft'].includes(currentStatus);
    const missing = issuesOf(prop);
    if (!hiding && missing.length) {
      const ok = await confirm({
        title: isAr ? 'العقار ده ناقص بيانات' : 'This listing is incomplete',
        tone: 'primary',
        message: isAr
          ? `ناقص: ${missing.map((k) => ISSUES[k].ar).join('، ')}. الزوار هيشوفوه كده. تنشره برضه؟`
          : `Missing: ${missing.map((k) => ISSUES[k].en).join(', ')}. Publish anyway?`,
        confirmLabel: isAr ? 'انشره برضه' : 'Publish anyway',
        cancelLabel: isAr ? 'لأ' : 'Cancel'
      });
      if (!ok) return;
    }
    // Showing it again restores what it was before (e.g. still "under negotiation")
    const newStatus = hiding ? 'hidden' : (prop.statusBeforeHide || 'published');
    const res = onUpdateProperty(prop.id, { status: newStatus, statusBeforeHide: hiding ? currentStatus : null });
    if (res === false) return;
    triggerToast(
      !hiding
        ? (isAr ? 'تم تفعيل وإظهار العقار على الموقع للزوار' : 'Property is now Published live')
        : (isAr ? 'تم إخفاء العقار مؤقتاً من الموقع' : 'Property is now Hidden from website'),
      'info'
    );
  };

  // Quick Status Change from Table Row
  const handleStatusChange = (propId, newStatus) => {
    const res = onUpdateProperty(propId, { status: newStatus });
    if (res === false) return;
    const targetProp = properties.find(p => p.id === propId);
    if (newStatus === 'sold' && targetProp) {
      setNotifierProperty(targetProp);
      setNotifierEventType('sold_unit');
    }
    triggerToast(isAr ? `تم تحديث حالة العقار بنجاح` : `Property status updated`, 'success');
  };

  // Soft Delete (Move to Trash)
  const handleSoftDelete = async (propId) => {
    if (await confirm({
      title: isAr ? 'نقل للمهملات؟' : 'Move to trash?',
      message: isAr ? 'تقدر ترجّعه بعدين من سلة المهملات.' : 'You can restore it from the trash later.',
      confirmLabel: isAr ? 'انقله' : 'Move',
      cancelLabel: isAr ? 'لأ' : 'Cancel'
    })) {
      const res = onUpdateProperty(propId, { isDeleted: true, status: 'trash' });
      if (res !== false) {
        triggerToast(isAr ? 'تم نقل العقار إلى سلة المهملات' : 'Property moved to Trash', 'info');
      }
    }
  };

  // Restore from Trash
  const handleRestore = (propId) => {
    const res = onUpdateProperty(propId, { isDeleted: false, status: 'published' });
    if (res !== false) {
      triggerToast(isAr ? 'تم استرجاع العقار وإعادة نشره بنجاح!' : 'Property restored and published!', 'success');
    }
  };

  // Permanent Hard Delete
  const handlePermanentDelete = async (propId) => {
    if (await confirm({
      title: isAr ? 'حذف نهائي؟' : 'Delete permanently?',
      message: isAr ? 'مش هتقدر ترجّعه تاني.' : 'This cannot be undone.',
      confirmLabel: isAr ? 'احذف' : 'Delete',
      cancelLabel: isAr ? 'لأ' : 'Cancel'
    })) {
      const res = onDeleteProperty(propId);
      if (res !== false) {
        triggerToast(isAr ? 'تم الحذف النهائي للعقار' : 'Property permanently deleted', 'info');
      }
    }
  };

  // Advanced Cloud Upload & Multi-Image Canvas Compressor
  const MAX_FILE_SIZE_MB = 15;
  const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const processSelectedFiles = async (filesList) => {
    const files = Array.from(filesList);
    if (!files.length) return;

    // Filter out non-images or oversized files
    const validFiles = [];
    const oversizedFiles = [];

    files.forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      if (file.size > MAX_FILE_SIZE_BYTES) {
        oversizedFiles.push(file.name);
      } else {
        validFiles.push(file);
      }
    });

    if (oversizedFiles.length > 0) {
      triggerToast(
        isAr 
          ? `تم رفض ${oversizedFiles.length} صورة لتجاوز الحد الأقصى (${MAX_FILE_SIZE_MB}MB): ${oversizedFiles.join(', ')}`
          : `${oversizedFiles.length} file(s) rejected (exceeds ${MAX_FILE_SIZE_MB}MB limit)`,
        'error'
      );
    }

    if (validFiles.length === 0) return;

    setIsUploadingImages(true);
    setUploadProgressText(isAr ? `جاري ضغط ومعالجة ${validFiles.length} صورة...` : `Compressing ${validFiles.length} photos...`);

    try {
      const propId = editingPropertyId || `prop_${Date.now()}`;
      const uploadedUrls = await uploadMultipleImages(
        validFiles, 
        propId, 
        (done, total) => {
          setUploadProgressText(
            isAr 
              ? `تم رفع ومعالجة ${done} من ${total} صورة...` 
              : `Processed ${done}/${total} photos...`
          );
        }
      );

      if (uploadedUrls.inlineCount > 0) {
        triggerToast(
          isAr
            ? `${uploadedUrls.inlineCount} صورة ماترفعتش على السيرفر واتحفظت جوا الوحدة، فالوحدة ممكن متتنشرش. اتأكد إن حسابك معاه صلاحية «إضافة وتعديل العقارات»، واخرج وادخل تاني، وارفع الصور من جديد.`
            : `${uploadedUrls.inlineCount} photo(s) were not uploaded and stay inside the listing, so it may not publish. Check your listing permission, sign out and in, then upload again.`,
          'error'
        );
      }
      if (uploadedUrls.length > 0) {
        setForm((prev) => ({
          ...prev,
          images: [...uploadedUrls, ...prev.images]
        }));
        if (!uploadedUrls.inlineCount) {
          triggerToast(
            isAr
              ? `تم ضغط ورفع ${uploadedUrls.length} صورة بنجاح بجودة معمارية فائقة ⚡`
              : `${uploadedUrls.length} photos compressed & saved successfully!`,
            'success'
          );
        }
      }
    } catch (err) {
      console.error('Image upload failed:', err);
      triggerToast(isAr ? 'حدث خطأ أثناء معالجة الصور' : 'Failed to process images', 'error');
    } finally {
      setIsUploadingImages(false);
      setUploadProgressText('');
    }
  };

  const handleFileUpload = (e) => {
    processSelectedFiles(e.target.files);
    e.target.value = '';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    if (e.dataTransfer && e.dataTransfer.files) {
      processSelectedFiles(e.dataTransfer.files);
    }
  };

  const handleSetPrimaryImage = (indexToPrimary) => {
    setForm((prev) => {
      const selected = prev.images[indexToPrimary];
      const rest = prev.images.filter((_, idx) => idx !== indexToPrimary);
      return {
        ...prev,
        images: [selected, ...rest]
      };
    });
    triggerToast(isAr ? 'تم تعيين الصورة كغلاف رئيسي للعقار 🌟' : 'Set as primary cover photo', 'success');
  };

  const handleRemoveImage = (indexToRemove) => {
    setForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, idx) => idx !== indexToRemove)
    }));
  };

  // Handlers for Custom Amenities per Property
  const handleAddCustomAmenity = () => {
    const newItem = {
      id: Date.now(),
      name_ar: '',
      name_en: '',
      category: 'education',
      distance: '500 متر',
      timeWalk: '6 دقائق',
      timeDrive: '2 دقيقة'
    };
    setForm(prev => ({
      ...prev,
      nearbyAmenities: [...(prev.nearbyAmenities || []), newItem]
    }));
  };

  const handleUpdateCustomAmenity = (index, field, value) => {
    setForm(prev => {
      const list = [...(prev.nearbyAmenities || [])];
      list[index] = { ...list[index], [field]: value };
      return { ...prev, nearbyAmenities: list };
    });
  };

  const handleRemoveCustomAmenity = (index) => {
    setForm(prev => ({
      ...prev,
      nearbyAmenities: (prev.nearbyAmenities || []).filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title_ar || !form.price || !form.size) {
      triggerToast(isAr ? 'يرجى ملء الحقول الأساسية (العنوان، السعر، المساحة)' : 'Please fill required fields (title, price, size)', 'error');
      return;
    }

    // 🛡️ Validate no negative or zero values for critical numeric fields
    if (form.price <= 0) {
      triggerToast(isAr ? 'السعر يجب أن يكون أكبر من صفر' : 'Price must be greater than zero', 'error');
      return;
    }
    if (form.size <= 0) {
      triggerToast(isAr ? 'المساحة يجب أن تكون أكبر من صفر' : 'Size must be greater than zero', 'error');
      return;
    }
    if (form.downPayment < 0 || form.monthlyInstallment < 0) {
      triggerToast(isAr ? 'قيم المقدم والأقساط لا يمكن أن تكون سالبة' : 'Payment values cannot be negative', 'error');
      return;
    }

    // 🗺️ Assign Real GPS Coordinates matching the selected Sohag district
    const baseCoords = areaCenter(form.areaKey) || { lat: 26.5569, lng: 31.7001 };
    // Slight random offset (approx 100-300m) to prevent multiple units in the same district from stacking directly on top of each other
    const randomOffset = (Math.random() - 0.5) * 0.005;
    const finalCoords = (form.coordinates?.lat && form.coordinates.lat !== 26.5500) ? form.coordinates : {
      lat: Number((baseCoords.lat + randomOffset).toFixed(6)),
      lng: Number((baseCoords.lng + randomOffset).toFixed(6))
    };

    // Cleanse sector-specific attributes (land, shops, offices, farms and factories have 0 bedrooms)
    const isLand = isLandType(form.type);
    const cleanForm = {
      ...form,
      category: categoryOfType(form.type),
      bedrooms: hasNoRooms(form.type) ? 0 : (parseInt(form.bedrooms) || 0),
      bathrooms: isLand ? 0 : (parseInt(form.bathrooms) || 0),
      floor: isLand ? 0 : (parseInt(form.floor) || 0)
    };

    if (editingPropertyId) {
      onUpdateProperty(editingPropertyId, { ...cleanForm, coordinates: finalCoords });
      triggerToast(isAr ? 'تم تحديث بيانات العقار وموقعه على الخريطة بنجاح!' : 'Property updated successfully!', 'success');
    } else {
      const newProp = {
        id: 'prop-' + Date.now(),
        ...cleanForm,
        coordinates: finalCoords
      };
      onAddProperty(newProp);
      triggerToast(isAr ? 'تمت إضافة العقار وتثبيت موقعه الفعلي على الخريطة بنجاح!' : 'New property added successfully!', 'success');

      // 🎯 Auto-check matching clients in database
      const matched = findMatchingClientsForProperty(newProp, leads, demands);
      if (matched.length > 0) {
        setNotifierProperty(newProp);
        setNotifierEventType('new_unit');
      }
    }

    setShowAddModal(false);
  };

  // Memoized status counts in a single pass $O(N)$
  const { activeCount, hiddenCount, negotiationCount, soldCount, trashCount } = useMemo(() => {
    let active = 0;
    let hidden = 0;
    let negotiation = 0;
    let sold = 0;
    let trash = 0;

    for (let i = 0; i < properties.length; i++) {
      const p = properties[i];
      const st = getNormalizedPropertyStatus(p);
      if (st === 'trash') trash++;
      else if (st === 'published') active++;
      else if (st === 'hidden') hidden++;
      else if (st === 'under_negotiation') negotiation++;
      else if (st === 'sold') sold++;
    }

    return {
      activeCount: active,
      hiddenCount: hidden,
      negotiationCount: negotiation,
      soldCount: sold,
      trashCount: trash
    };
  }, [properties]);

  // What each listing still lacks before it can go on the site (photo, price, area…)
  const knownAreas = useMemo(() => new Set(areas.map((a) => a.id)), [areas]);
  const issuesMap = useMemo(() => {
    const m = new Map();
    properties.forEach((p) => m.set(p.id, listingIssues(p, knownAreas)));
    return m;
  }, [properties, knownAreas]);
  const issuesOf = (p) => issuesMap.get(p.id) || [];

  const filters = { status: statusFilter, type: typeFilter, area: areaFilter, readiness, issue: issueFilter, ...range, q: searchQuery };
  const filteredProperties = useMemo(
    () => sortListings(properties.filter((p) => matchesFilters(p, filters, issuesMap.get(p.id) || [])), sortKey, (p) => issuesMap.get(p.id) || []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [properties, issuesMap, statusFilter, typeFilter, areaFilter, readiness, issueFilter, range, searchQuery, sortKey]
  );

  // Readiness counts within the current status (so "جاهز للنشر" under "للمراجعة" means hidden + complete)
  const readinessCounts = useMemo(() => {
    const base = properties.filter((p) => matchesFilters(p, { status: statusFilter }, []));
    const ready = base.filter((p) => (issuesMap.get(p.id) || []).length === 0).length;
    return { all: base.length, ready, incomplete: base.length - ready };
  }, [properties, issuesMap, statusFilter]);

  const legacyCount = useMemo(() => properties.filter((p) => !p.isDeleted && (issuesMap.get(p.id) || []).includes('legacy')).length, [properties, issuesMap]);
  const moreFiltersCount = (readiness !== 'all') + (issueFilter !== 'all') + Object.values(range).filter((v) => v !== '').length;
  const moreFiltersOn = moreFiltersCount > 0;
  const anyFilterOn = moreFiltersOn || typeFilter !== 'all' || areaFilter !== 'all' || searchQuery !== '';

  const clearFilters = () => {
    setTypeFilter('all'); setAreaFilter('all'); setReadiness('all'); setIssueFilter('all');
    setRange({ priceMin: '', priceMax: '', sizeMin: '', sizeMax: '' }); setSearchQuery('');
  };

  // Long lists render in pages of 25; any filter change starts again from the first page
  const pageKey = `${JSON.stringify(filters)}|${sortKey}`;
  const [paging, setPaging] = useState({ key: pageKey, n: LIST_PAGE });
  const shown = paging.key === pageKey ? paging.n : LIST_PAGE;
  const setShown = (next) => setPaging({ key: pageKey, n: typeof next === 'function' ? next(shown) : next });
  const pageRows = filteredProperties.slice(0, shown);

  // Selection (bulk actions) only ever holds rows that are on screen
  const visibleIds = useMemo(() => new Set(filteredProperties.map((p) => p.id)), [filteredProperties]);
  const selectedIds = [...selected].filter((id) => visibleIds.has(id));
  const toggleOne = (id, on) => setSelected((prev) => { const next = new Set(prev); if (on) next.add(id); else next.delete(id); return next; });
  const allOnScreen = filteredProperties.length > 0 && selectedIds.length === filteredProperties.length;
  const toggleAll = (on) => setSelected(on ? new Set(filteredProperties.map((p) => p.id)) : new Set());

  // From the report: open the list with a filter already applied
  const openList = (patch) => {
    clearFilters();
    setStatusFilter(patch.status || 'all');
    if (patch.readiness) setReadiness(patch.readiness);
    if (patch.issue) setIssueFilter(patch.issue);
    if (patch.area) setAreaFilter(patch.area);
    if (patch.type) setTypeFilter(patch.type);
    setView('list');
  };

  // Pill filter options: only the types and areas that have listings (outside the trash), with counts
  const homeSummary = useMemo(() => homepageSummary(properties), [properties]);

  const facets = useMemo(() => {
    const live = properties.filter((p) => !(p.isDeleted || p.status === 'trash'));
    const count = (key) => live.reduce((m, p) => { const k = p[key]; if (k) m.set(k, (m.get(k) || 0) + 1); return m; }, new Map());
    const byType = count('type');
    const byArea = count('areaKey');
    const noArea = live.filter((p) => (issuesMap.get(p.id) || []).includes('area')).length;
    return {
      types: PROPERTY_TYPES.filter((t) => t.id !== 'all' && byType.get(t.id))
        .map((t) => ({ id: t.id, label: (isAr ? SHORT_TYPE_AR : SHORT_TYPE_EN)[t.id] || (isAr ? t.name_ar : t.name_en), count: byType.get(t.id) })),
      areas: [
        ...areas.filter((a) => a.id !== 'all' && byArea.get(a.id))
          .map((a) => ({ id: a.id, label: isAr ? (a.name_ar || a.label_ar || a.id) : (a.name_en || a.name_ar || a.id), count: byArea.get(a.id) }))
          .sort((x, y) => y.count - x.count),
        ...(noArea ? [{ id: NO_AREA, label: isAr ? 'من غير منطقة' : 'No area', count: noArea, warn: true }] : [])
      ]
    };
  }, [properties, areas, isAr, issuesMap]);

  const badgePresets = [
    { ar: 'عرض مميز', en: 'Featured Deal' },
    { ar: 'حصري لـ 1Line', en: 'Exclusive Deal' },
    { ar: 'لقطة الأسبوع', en: 'Deal of the Week' },
    { ar: 'خصم الكاش الفوري', en: 'Instant Cash Discount' },
    { ar: 'تم تخفيض السعر', en: 'Price Reduced' },
    { ar: 'مناسب للاستثمار', en: 'Investment Opportunity' },
    { ar: 'مرخص 100% شهر عقاري', en: '100% Legally Verified' },
    { ar: 'متاح للتمويل العقاري', en: 'Mortgage Eligible' }
  ];

  return (
    <div className="property-manager-panel crm-props">
      <PageHeader
        title={isAr ? 'العقارات' : 'Listings'}
        description={isAr
          ? `${activeCount} معروض · ${hiddenCount} للمراجعة · ${negotiationCount} تحت التفاوض${soldCount ? ` · ${soldCount} اتباع` : ''}`
          : `${activeCount} live · ${hiddenCount} hidden · ${negotiationCount} in negotiation${soldCount ? ` · ${soldCount} sold` : ''}`}
        actions={(
          <>
            <Button icon={<Plus size={16} aria-hidden="true" />} onClick={handleOpenAdd} disabled={readOnly} title={readOnly ? (isAr ? 'دورك للعرض فقط' : 'View-only role') : undefined}>
              {isAr ? 'عقار جديد' : 'New listing'}
            </Button>
            {onImportProperties && (
              <Button variant="secondary" icon={<Upload size={16} aria-hidden="true" />} onClick={() => setImportOpen(true)}>
                {isAr ? 'استيراد' : 'Import'}
              </Button>
            )}
            <ExportMenu
              label={isAr ? 'تصدير' : 'Export'}
              baseName="1Line_Properties"
              sheetName="العقارات"
              getRows={() => (selected.size ? properties.filter((p) => selected.has(p.id)) : properties).filter((p) => !p.isDemo).map((p) => propertyToRow(p, areas))}
              getJson={() => ({ platform: '1Line Real Estate', timestamp: new Date().toISOString(), propertiesCount: properties.length, properties: properties.filter((p) => !p.isDemo) })}
              disabled={!properties.some((p) => !p.isDemo)}
              onDone={(format, ok) => triggerToast(ok ? (isAr ? 'تم تجهيز الملف وتنزيله' : 'File downloaded') : (isAr ? 'تعذّر تجهيز الملف' : 'Export failed'), ok ? 'success' : 'error')}
            />
          </>
        )}
      />

      {importOpen && (
        <DataImportModal
          entity="properties"
          existing={properties}
          existingLeads={leads}
          areas={areas}
          canImportOwners={!!onImportLeads}
          onImport={(plan) => onImportProperties(plan.items.filter((x) => x.action !== 'skip').map((x) => x.property))}
          onImportOwners={onImportLeads}
          onClose={() => setImportOpen(false)}
        />
      )}

      {/* What visitors see on the homepage right now: featured slots, periods, order (folded by default) */}
      <Card padding="compact" className="crm-props__slots">
        <button
          type="button"
          className="crm-props__slots-toggle"
          aria-expanded={showSlots}
          aria-controls="crm-props-slots"
          onClick={() => setShowSlots((v) => !v)}
        >
          <Star size={16} aria-hidden="true" />
          <span className="crm-props__slots-title">{isAr ? 'العقارات المميزة في الصفحة الرئيسية' : 'Featured on the homepage'}</span>
          <Badge tone={homeSummary.live > 0 ? 'accent' : undefined}>{isAr ? `${homeSummary.live} في الواجهة` : `${homeSummary.live} on homepage`}</Badge>
          {homeSummary.blocked.length > 0 && (
            <Badge tone="warning">{isAr ? `${homeSummary.blocked.length} متثبّتة ومش ظاهرة` : `${homeSummary.blocked.length} pinned, not shown`}</Badge>
          )}
          <ChevronDown size={16} aria-hidden="true" className={showSlots ? 'is-open' : undefined} />
        </button>
        {showSlots && (
          <div id="crm-props-slots">
            <HomepageSlotsBoard properties={properties} onUpdateProperty={onUpdateProperty} isAr={isAr} />
          </div>
        )}
      </Card>
      {!readOnly && (
        <ThumbBackfillCard properties={properties} onUpdateProperty={onUpdateProperty} isAr={isAr} triggerToast={triggerToast} />
      )}
      {slotEditing && (
        <FeaturedSlotModal
          property={slotEditing}
          isAr={isAr}
          nextOrder={homeSummary.pinned + 1}
          onClose={() => setSlotEditing(null)}
          onSave={(patch) => {
            if (onUpdateProperty(slotEditing.id, patch) !== false) {
              triggerToast(isAr ? 'تم جدولة التمييز في الصفحة الرئيسية' : 'Homepage feature scheduled', 'success');
            }
            setSlotEditing(null);
          }}
        />
      )}

      {offerEditing && (
        <OfferModal
          property={offerEditing}
          isAr={isAr}
          onClose={() => setOfferEditing(null)}
          onSave={(patch, extended, removed) => {
            if (onUpdateProperty(offerEditing.id, patch) !== false) {
              triggerToast(removed
                ? (isAr ? 'تم إنهاء العرض — رجع السعر كما كان' : 'Offer ended — price back to normal')
                : extended
                  ? (isAr ? 'تم تمديد العرض — سيظهر للعملاء "تم تمديد العرض"' : 'Offer extended — visitors will see "Offer extended"')
                  : (isAr ? 'تم حفظ العرض — يظهر في موعده وينتهي تلقائياً' : 'Offer saved — it starts on time and ends automatically'), 'success');
            }
            setOfferEditing(null);
          }}
        />
      )}

      <SegmentedControl
        label={isAr ? 'طريقة العرض' : 'View'}
        value={view}
        onChange={setView}
        options={[
          { value: 'list', label: isAr ? 'الوحدات' : 'Listings' },
          { value: 'report', label: isAr ? 'التقارير' : 'Reports' }
        ]}
      />

      {view === 'report' ? (
        <ListingsReport properties={properties} areas={areas} isAr={isAr} onOpenList={openList} />
      ) : (
        <>
          {legacyCount > 0 && issueFilter !== 'legacy' && (
            <div role="status" className="crm-props__notice">
              <AlertTriangle size={16} aria-hidden="true" />
              <span>
                {isAr
                  ? `${legacyCount} عقار فيهم بيانات من نموذج الإضافة القديم (صورة افتراضية أو سعر تقديري). راجعهم.`
                  : `${legacyCount} listings carry legacy template values (placeholder photo or sample price). Please review.`}
              </span>
              <Button variant="secondary" size="sm" onClick={() => { setIssueFilter('legacy'); setShowMoreFilters(true); }}>
                {isAr ? 'اعرضهم' : 'Show them'}
              </Button>
            </div>
          )}

          {/* Status tabs, then one row: search, type, area, sort, more filters */}
          <div className="crm-props__chips crm-props__status" role="group" aria-label={isAr ? 'حالة العرض' : 'Display status'}>
            <Chip pressed={statusFilter === 'all'} count={properties.length - trashCount} onClick={() => setStatusFilter('all')}>{isAr ? 'الكل' : 'All'}</Chip>
            <Chip pressed={statusFilter === 'published'} count={activeCount} onClick={() => setStatusFilter('published')}>{isAr ? 'معروضة' : 'Live'}</Chip>
            <Chip pressed={statusFilter === 'hidden'} count={hiddenCount} onClick={() => setStatusFilter('hidden')}>{isAr ? 'مخفية / للمراجعة' : 'Hidden / to review'}</Chip>
            <Chip pressed={statusFilter === 'under_negotiation'} count={negotiationCount} onClick={() => setStatusFilter('under_negotiation')}>{isAr ? 'تحت التفاوض' : 'Negotiation'}</Chip>
            <Chip pressed={statusFilter === 'sold'} count={soldCount} onClick={() => setStatusFilter('sold')}>{isAr ? 'اتباعت' : 'Sold'}</Chip>
            <Chip pressed={statusFilter === 'trash'} count={trashCount} onClick={() => setStatusFilter('trash')}>{isAr ? 'المهملات' : 'Trash'}</Chip>
          </div>

          <div className="crm-props__filterbar">
            <label className="crm-props__search">
              <Search size={16} aria-hidden="true" />
              <input
                type="search"
                aria-label={isAr ? 'بحث في العقارات' : 'Search listings'}
                placeholder={isAr ? 'اسم، كود، منطقة أو عنوان' : 'Title, code, area or address'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </label>
            <PropertyFacetFilter
              types={facets.types}
              areas={facets.areas}
              total={properties.length - trashCount}
              typeFilter={typeFilter}
              areaFilter={areaFilter}
              onType={setTypeFilter}
              onArea={setAreaFilter}
              isAr={isAr}
            />
            <Select
              hideLabel
              label={isAr ? 'الترتيب' : 'Sort'}
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value)}
              options={Object.entries(SORTS).map(([value, o]) => ({ value, label: isAr ? o.ar : o.en }))}
            />
            <Button
              variant="secondary"
              size="sm"
              icon={<SlidersHorizontal size={15} aria-hidden="true" />}
              aria-expanded={showMoreFilters}
              aria-controls="crm-props-more"
              onClick={() => setShowMoreFilters((v) => !v)}
            >
              {isAr ? 'فلاتر أكتر' : 'More filters'}{moreFiltersOn ? ` (${moreFiltersCount})` : ''}
            </Button>
            {anyFilterOn && (
              <Button variant="ghost" size="sm" icon={<X size={15} aria-hidden="true" />} onClick={clearFilters}>
                {isAr ? 'امسح الفلاتر' : 'Clear'}
              </Button>
            )}
          </div>

          {showMoreFilters && (
            <Card padding="compact" id="crm-props-more" className="crm-props__more">
              {statusFilter !== 'trash' && (
                <Select
                  label={isAr ? 'اكتمال البيانات' : 'Data'}
                  value={readiness}
                  onChange={(e) => setReadiness(e.target.value)}
                  options={[
                    { value: 'all', label: `${isAr ? 'كل الوحدات' : 'Any'} (${readinessCounts.all})` },
                    { value: 'ready', label: `${isAr ? 'بياناتها كاملة' : 'Complete'} (${readinessCounts.ready})` },
                    { value: 'incomplete', label: `${isAr ? 'ناقصها بيانات' : 'Incomplete'} (${readinessCounts.incomplete})` }
                  ]}
                />
              )}
              <Select
                label={isAr ? 'ناقصه إيه' : 'Missing'}
                value={issueFilter}
                onChange={(e) => setIssueFilter(e.target.value)}
                options={[{ value: 'all', label: isAr ? 'أي حاجة' : 'Anything' }, ...Object.entries(ISSUES).map(([value, o]) => ({ value, label: isAr ? o.ar : o.en }))]}
              />
              {[
                ['priceMin', isAr ? 'السعر من' : 'Price from'],
                ['priceMax', isAr ? 'السعر لحد' : 'Price to'],
                ['sizeMin', isAr ? 'المساحة من (م²)' : 'Size from (m²)'],
                ['sizeMax', isAr ? 'المساحة لحد (م²)' : 'Size to (m²)']
              ].map(([key, label]) => (
                <Input
                  key={key}
                  label={label}
                  inputMode="numeric"
                  value={range[key] ? Number(range[key]).toLocaleString('en-US') : ''}
                  onChange={(e) => setRange((r) => ({ ...r, [key]: toLatinDigits(e.target.value).replace(/\D/g, '').slice(0, 12) }))}
                />
              ))}
              <Button variant="ghost" size="sm" icon={<X size={15} aria-hidden="true" />} onClick={clearFilters}>
                {isAr ? 'امسح الفلاتر' : 'Clear filters'}
              </Button>
            </Card>
          )}

          {selectedIds.length > 0 && (
            <ListingsBulkBar
              ids={selectedIds}
              properties={properties}
              issuesOf={issuesOf}
              areas={areas}
              isAr={isAr}
              onUpdateProperty={onUpdateProperty}
              triggerToast={triggerToast}
              onDone={() => setSelected(new Set())}
            />
          )}

          <p className="crm-props__count" aria-live="polite">
            {pageRows.length < filteredProperties.length
              ? (isAr ? `عارض ${pageRows.length} من ${filteredProperties.length} وحدة` : `Showing ${pageRows.length} of ${filteredProperties.length}`)
              : (isAr ? `${filteredProperties.length} وحدة` : `${filteredProperties.length} listings`)}
          </p>

          {/* Properties Table */}
          <div className="admin-table-wrapper">
            <table className="admin-data-table crm-props-table">
              <thead>
                <tr>
                  <th className="crm-prow__check">
                    <input
                      type="checkbox"
                      checked={allOnScreen}
                      disabled={readOnly || filteredProperties.length === 0}
                      onChange={(e) => toggleAll(e.target.checked)}
                      aria-label={isAr ? 'اختيار كل الظاهر' : 'Select all shown'}
                    />
                  </th>
                  <th>{isAr ? 'العقار' : 'Property'}</th>
                  <th>{isAr ? 'السعر' : 'Price'}</th>
                  <th>{isAr ? 'المساحة' : 'Size'}</th>
                  <th>{isAr ? 'الحالة' : 'Status'}</th>
                  <th>{isAr ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody>
                {filteredProperties.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="crm-props__empty">
                      <EmptyState
                        icon={<Building size={22} />}
                        title={isAr ? 'مفيش عقارات بالفلتر ده' : 'No listings match'}
                        description={isAr ? 'غيّر الحالة أو النوع أو البحث.' : 'Change the status, type or search.'}
                      />
                    </td>
                  </tr>
                ) : (
                  pageRows.map((prop) => (
                    <PropertyTableRow
                      readOnly={readOnly}
                      key={prop.id}
                      prop={prop}
                      issues={issuesOf(prop)}
                      selected={selected.has(prop.id)}
                      onSelect={toggleOne}
                      isAr={isAr}
                      areas={areas}
                      handleStatusChange={handleStatusChange}
                      handleToggleVisibility={handleToggleVisibility}
                      handleOpenEdit={handleOpenEdit}
                      handleSoftDelete={handleSoftDelete}
                      handleRestore={handleRestore}
                      handlePermanentDelete={handlePermanentDelete}
                      onUpdateProperty={onUpdateProperty}
                      triggerToast={triggerToast}
                      setSlotEditing={setSlotEditing}
                      setOfferEditing={setOfferEditing}
                      setNotifierProperty={setNotifierProperty}
                      setNotifierEventType={setNotifierEventType}
                      syncIssue={unsyncedProperties[String(prop.id)] || null}
                      onRetrySync={readOnly ? undefined : retryPropertySync}
                      onDiscardLocal={cloudPropertyIds && !cloudPropertyIds.has(String(prop.id)) ? handleDiscardLocal : undefined}
                      onUploadInline={readOnly ? undefined : handleUploadInline}
                      inlineProgress={uploadingInline?.id === prop.id ? uploadingInline : null}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
          {pageRows.length < filteredProperties.length && (
            <div className="crm-props__more-rows">
              <Button variant="secondary" onClick={() => setShown((n) => n + LIST_PAGE)}>
                {isAr
                  ? `اعرض ${Math.min(LIST_PAGE, filteredProperties.length - pageRows.length)} كمان`
                  : `Show ${Math.min(LIST_PAGE, filteredProperties.length - pageRows.length)} more`}
              </Button>
              <Button variant="ghost" onClick={() => setShown(filteredProperties.length)}>
                {isAr ? `اعرض الكل (${filteredProperties.length})` : `Show all (${filteredProperties.length})`}
              </Button>
            </div>
          )}
        </>
      )}

      {/* Add / Edit Modal */}
      {showAddModal && (
        <PropertyFormModal
          areas={areas}
          badgePresets={badgePresets}
          editingPropertyId={editingPropertyId}
          form={form}
          handleAddCustomAmenity={handleAddCustomAmenity}
          handleDragLeave={handleDragLeave}
          handleDragOver={handleDragOver}
          handleDrop={handleDrop}
          handleFileUpload={handleFileUpload}
          handleRemoveCustomAmenity={handleRemoveCustomAmenity}
          handleRemoveImage={handleRemoveImage}
          handleSetPrimaryImage={handleSetPrimaryImage}
          handleSubmit={handleSubmit}
          handleUpdateCustomAmenity={handleUpdateCustomAmenity}
          isAr={isAr}
          isDraggingOver={isDraggingOver}
          isUploadingImages={isUploadingImages}
          setForm={setForm}
          setShowAddModal={setShowAddModal}
          setShowMapPicker={setShowMapPicker}
          uploadProgressText={uploadProgressText}
        />
      )}

      {/* 📍 Interactive GIS Rooftop Map Picker Modal */}
      {showMapPicker && (
        <InteractiveMapPickerModal
          isOpen={showMapPicker}
          onClose={() => setShowMapPicker(false)}
          initialCoordinates={form.coordinates || areaCenter(form.areaKey)}
          onConfirmCoordinates={(coords) => setForm(prev => ({ ...prev, coordinates: coords, locationExact: true }))}
          lang={lang}
          triggerToast={triggerToast}
        />
      )}

      {/* 💬 Smart WhatsApp Retargeting & Matched Leads Modal */}
      {notifierProperty && (
        <WhatsAppMatchNotifierModal
          isOpen={Boolean(notifierProperty)}
          onClose={() => setNotifierProperty(null)}
          property={notifierProperty}
          allProperties={properties}
          leads={leads}
          demands={demands}
          defaultEventType={notifierEventType}
          lang={lang}
          triggerToast={triggerToast}
        />
      )}
    </div>
  );
}
