import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { PROPERTIES_DATA } from '../data/propertiesData';
import { MEGA_PROJECTS } from '../data/projectsData';
import { INITIAL_LEADS, INITIAL_DEMANDS } from '../data/mockData';
import {
  saveLead,
  subscribeToLeads,
  subscribeToDemands,
  isFirebaseActive,
  saveNotification,
  updateLeadField,
  deleteLead,
  saveDemand,
  updateDemandStatus,
  deleteDemandDoc,
  subscribeToCatalog,
  upsertCatalogItem,
  deleteCatalogItem
} from '../firebaseLazy';
import { playNotificationChime } from '../utils/notificationHub';
import { sanitizeObject, normalizePhoneNumber } from '../utils/securityShield';
import { identifyVisitor, getCurrentSessionJourney, getAttributionData } from '../utils/visitorTracker';
import { routeLeadAutomatically } from '../utils/leadRoutingEngine';
import { isRecordArray, readStoredJson } from '../utils/browserStorage';
import { normalizeAreaKey } from '../utils/areasData';
import { usePreferences } from './PreferencesContext';
import { useUIModal } from './UIModalContext';

const PropertiesContext = createContext(null);

export function PropertiesProvider({ children }) {
  const { lang, soundEnabled } = usePreferences();
  const { triggerToast } = useUIModal();

  // Properties State
  const [properties, setProperties] = useState(() => {
    const stored = readStoredJson('oneline_properties', PROPERTIES_DATA, isRecordArray);
    if (Array.isArray(stored) && stored.length > 0) {
      const validStored = stored.filter(p => p && typeof p === 'object' && p.id);
      const existingIds = new Set(validStored.map(p => p.id));
      const missing = PROPERTIES_DATA.filter(p => p && !existingIds.has(p.id));
      if (missing.length > 0) {
        const merged = [...validStored, ...missing];
        try { localStorage.setItem('oneline_properties', JSON.stringify(merged)); } catch { /* storage unavailable */ }
        return merged;
      }
      return validStored.length > 0 ? validStored : PROPERTIES_DATA;
    }
    return PROPERTIES_DATA;
  });

  // Cloud write results → one honest toast. Local state is already updated, so the UI never waits.
  const reportCatalogSync = useCallback((promise) => {
    Promise.resolve(promise).then((res) => {
      if (res?.ok) return;
      const isAr = lang === 'ar';
      const msg = res?.reason === 'too-large'
        ? (isAr ? 'لم يُنشر على الموقع: حجم البيانات/الصور المضمّنة أكبر من الحد المسموح (1MB). ارفع الصور كروابط بدلاً من تضمينها.' : 'Not published: item exceeds 1MB — use image URLs.')
        : res?.reason === 'permission-denied'
          ? (isAr ? 'تم الحفظ على هذا الجهاز فقط — حسابك لا يملك صلاحية النشر السحابي.' : 'Saved on this device only — no cloud permission.')
          : (isAr ? 'تم الحفظ على هذا الجهاز فقط — تعذّر النشر السحابي، أعد المحاولة عند توفر الاتصال.' : 'Saved on this device only — cloud sync failed.');
      triggerToast(msg, 'error');
    }).catch(() => {});
  }, [lang, triggerToast]);

  // Synced after each render; handlers also set it immediately so back-to-back updates see each other
  const propertiesRef = useRef(properties);
  useEffect(() => { propertiesRef.current = properties; }, [properties]);

  const persistProperties = (list) => {
    try { localStorage.setItem('oneline_properties', JSON.stringify(list)); } catch { /* quota / private mode */ }
  };

  const handleAddProperty = useCallback((newProp) => {
    const updated = [newProp, ...propertiesRef.current];
    propertiesRef.current = updated; // back-to-back updates (slot reordering) must see each other
    setProperties(updated);
    persistProperties(updated);
    reportCatalogSync(upsertCatalogItem('properties', newProp));
  }, [reportCatalogSync]);

  const handleUpdateProperty = useCallback((id, updatedData) => {
    const current = propertiesRef.current.find((p) => p.id === id);
    if (!current) return;
    const merged = { ...current, ...updatedData };
    const updated = propertiesRef.current.map((p) => (p.id === id ? merged : p));
    propertiesRef.current = updated; // back-to-back updates (slot reordering) must see each other
    setProperties(updated);
    persistProperties(updated);
    reportCatalogSync(upsertCatalogItem('properties', merged));
  }, [reportCatalogSync]);

  const handleDeleteProperty = useCallback((id) => {
    const updated = propertiesRef.current.filter((p) => p.id !== id);
    propertiesRef.current = updated; // back-to-back updates (slot reordering) must see each other
    setProperties(updated);
    persistProperties(updated);
    reportCatalogSync(deleteCatalogItem('properties', id));
  }, [reportCatalogSync]);

  // Mega Projects State
  const [projects, setProjects] = useState(() => {
    const stored = readStoredJson('oneline_mega_projects', MEGA_PROJECTS, isRecordArray);
    if (Array.isArray(stored) && stored.length > 0) {
      const validStored = stored.filter(p => p && typeof p === 'object' && p.id);
      const existingIds = new Set(validStored.map(p => p.id));
      const missing = MEGA_PROJECTS.filter(p => p && !existingIds.has(p.id));
      if (missing.length > 0) {
        const merged = [...validStored, ...missing];
        try { localStorage.setItem('oneline_mega_projects', JSON.stringify(merged)); } catch { /* storage unavailable */ }
        return merged;
      }
      return validStored.length > 0 ? validStored : MEGA_PROJECTS;
    }
    return MEGA_PROJECTS;
  });

  const projectsRef = useRef(projects);
  useEffect(() => { projectsRef.current = projects; }, [projects]);

  const persistProjects = (list) => {
    try { localStorage.setItem('oneline_mega_projects', JSON.stringify(list)); } catch { /* quota / private mode */ }
  };

  const handleAddProject = useCallback((newProj) => {
    const updated = [newProj, ...projectsRef.current];
    projectsRef.current = updated;
    setProjects(updated);
    persistProjects(updated);
    reportCatalogSync(upsertCatalogItem('projects', newProj));
    triggerToast(lang === 'ar' ? 'تم إضافة المشروع' : 'Project added', 'success');
  }, [lang, triggerToast, reportCatalogSync]);

  const handleUpdateProject = useCallback((id, updatedData) => {
    const current = projectsRef.current.find((p) => p.id === id);
    if (!current) return;
    const merged = { ...current, ...updatedData };
    const updated = projectsRef.current.map((p) => (p.id === id ? merged : p));
    projectsRef.current = updated;
    setProjects(updated);
    persistProjects(updated);
    reportCatalogSync(upsertCatalogItem('projects', merged));
    triggerToast(lang === 'ar' ? 'تم تحديث بيانات المشروع' : 'Project updated', 'success');
  }, [lang, triggerToast, reportCatalogSync]);

  const handleDeleteProject = useCallback((id) => {
    const updated = projectsRef.current.filter((p) => p.id !== id);
    projectsRef.current = updated;
    setProjects(updated);
    persistProjects(updated);
    reportCatalogSync(deleteCatalogItem('projects', id));
    triggerToast(lang === 'ar' ? 'تم حذف المشروع' : 'Project deleted', 'info');
  }, [lang, triggerToast, reportCatalogSync]);

  // Live catalog from Firestore for every visitor: cloud docs override the bundled seed
  // by id, tombstones remove items, cloud-only items (added in the CRM) go first.
  useEffect(() => {
    const applyCloud = (setter, storageKey) => (cloudDocs) => {
      if (!Array.isArray(cloudDocs) || cloudDocs.length === 0) return;
      setter((prev) => {
        const byId = new Map(prev.map((p) => [String(p.id), p]));
        const fresh = [];
        for (const docItem of cloudDocs) {
          const key = String(docItem.id);
          if (docItem.deleted) { byId.delete(key); continue; }
          if (byId.has(key)) byId.set(key, { ...byId.get(key), ...docItem });
          else fresh.push(docItem);
        }
        fresh.sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
        const next = [...fresh, ...byId.values()];
        try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* storage unavailable */ }
        return next;
      });
    };
    const unsubProps = subscribeToCatalog('properties', applyCloud(setProperties, 'oneline_properties'));
    const unsubProjects = subscribeToCatalog('projects', applyCloud(setProjects, 'oneline_mega_projects'));
    return () => { unsubProps(); unsubProjects(); };
  }, []);

  // Favorites State
  const [favorites, setFavorites] = useState(() => {
    const raw = readStoredJson('oneline_favorites', [], Array.isArray);
    return Array.isArray(raw) ? raw.filter(id => typeof id === 'string' || typeof id === 'number') : [];
  });

  const toggleFavorite = useCallback((propertyId) => {
    setFavorites((prev) => {
      const exists = prev.includes(propertyId);
      const updated = exists ? prev.filter((id) => id !== propertyId) : [...prev, propertyId];
      localStorage.setItem('oneline_favorites', JSON.stringify(updated));
      triggerToast(
        exists 
          ? (lang === 'ar' ? 'تمت الإزالة من المفضلة' : 'Removed from favorites')
          : (lang === 'ar' ? 'تمت الإضافة إلى المفضلة' : 'Saved to favorites'),
        'success'
      );
      return updated;
    });
  }, [lang, triggerToast]);

  const clearFavorites = useCallback((silent = false) => {
    setFavorites([]);
    localStorage.removeItem('oneline_favorites');
    if (!silent) {
      triggerToast(lang === 'ar' ? 'تم مسح قائمة المفضلة' : 'Favorites cleared', 'info');
    }
  }, [lang, triggerToast]);

  const restoreFavorites = useCallback((newFavs = []) => {
    if (Array.isArray(newFavs)) {
      const sanitized = newFavs.filter(id => typeof id === 'string' || typeof id === 'number');
      setFavorites(sanitized);
      try {
        localStorage.setItem('oneline_favorites', JSON.stringify(sanitized));
      } catch { /* storage unavailable */ }
    }
  }, []);

  // Compare List State (Up to 4 properties)
  const [compareList, setCompareList] = useState([]);

  const toggleCompare = useCallback((property) => {
    setCompareList((prev) => {
      const exists = prev.some((p) => p.id === property.id);
      if (exists) {
        triggerToast(lang === 'ar' ? 'تمت الإزالة من قائمة المقارنة' : 'Removed from comparison', 'info');
        return prev.filter((p) => p.id !== property.id);
      }
      if (prev.length >= 4) {
        triggerToast(lang === 'ar' ? 'يمكنك مقارنة 4 عقارات كحد أقصى' : 'Max 4 properties for comparison', 'error');
        return prev;
      }
      triggerToast(lang === 'ar' ? 'تمت الإضافة إلى قائمة المقارنة' : 'Added to comparison', 'success');
      return [...prev, property];
    });
  }, [lang, triggerToast]);

  const addToCompare = useCallback((property) => {
    setCompareList((prev) => {
      if (prev.some((p) => p.id === property.id)) return prev;
      if (prev.length >= 4) {
        triggerToast(lang === 'ar' ? 'يمكنك مقارنة 4 عقارات كحد أقصى' : 'Max 4 properties for comparison', 'error');
        return prev;
      }
      triggerToast(lang === 'ar' ? 'تمت الإضافة إلى قائمة المقارنة' : 'Added to comparison', 'success');
      return [...prev, property];
    });
  }, [lang, triggerToast]);

  const removeCompare = useCallback((propertyId) => {
    setCompareList((prev) => prev.filter((p) => p.id !== propertyId));
  }, []);

  const clearCompare = useCallback(() => {
    setCompareList([]);
  }, []);

  // CRM Leads State
  const [leads, setLeads] = useState(() => {
    const stored = readStoredJson('oneline_crm_leads', INITIAL_LEADS, isRecordArray);
    return Array.isArray(stored) ? stored.filter(l => l && typeof l === 'object') : INITIAL_LEADS;
  });
  const leadsRef = useRef(leads);
  useEffect(() => {
    leadsRef.current = leads;
  }, [leads]);

  // Demands State
  const [demands, setDemands] = useState(() => {
    const fallback = INITIAL_DEMANDS.map((d) => ({ ...d, status: d.status || 'published' }));
    const stored = readStoredJson('oneline_demands', fallback, isRecordArray);
    const valid = Array.isArray(stored) ? stored.filter(d => d && typeof d === 'object') : fallback;
    return valid.length > 0 ? valid : fallback;
  });

  // Add New Lead Handler
  const handleAddNewLead = useCallback(async (leadData, extraData, sourceLabel) => {
    let rawLead = leadData;
    if (typeof leadData === 'string' && extraData && typeof extraData === 'object') {
      rawLead = {
        ...extraData,
        type: extraData.type || leadData,
        source: sourceLabel || extraData.source || 'Direct Entry'
      };
    }

    const cleanData = sanitizeObject(rawLead || leadData);
    const normalizedName = (cleanData.name || cleanData.clientName || '').trim();
    const rawPhone = cleanData.phone || cleanData.whatsapp || '';
    const rawWhatsapp = cleanData.whatsapp || cleanData.phone || '';
    const normalizedPropertyType = cleanData.propertyType || cleanData.details?.propertyType || cleanData.targetType || cleanData.type || 'residential';
    const rawArea = cleanData.area || cleanData.details?.area || cleanData.location || 'new_sohag';
    const normalizedArea = normalizeAreaKey(rawArea);

    const standardizedData = {
      ...cleanData,
      name: normalizedName || 'عميل مسجل',
      phone: rawPhone,
      whatsapp: rawWhatsapp,
      propertyType: normalizedPropertyType,
      area: normalizedArea,
      details: {
        ...(cleanData.details || {}),
        propertyType: normalizedPropertyType,
        area: normalizedArea
      }
    };

    const incomingPhone = normalizePhoneNumber(rawPhone || rawWhatsapp);
    identifyVisitor(standardizedData);
    const sessionJourney = getCurrentSessionJourney();

    if (soundEnabled) {
      playNotificationChime();
    }

    // Compute the lead synchronously from the latest list (a setState updater may run later,
    // which previously left finalLead null and skipped the cloud save).
    const buildNextLeads = (prev) => {
      let finalLead;
      const existingIndex = prev.findIndex(
        (l) => normalizePhoneNumber(l.phone || l.whatsapp) === incomingPhone
      );

      if (existingIndex !== -1 && incomingPhone) {
        const existing = prev[existingIndex];
        const newLog = {
          timestamp: new Date().toISOString(),
          action: `تسجيل اهتمام إضافي: طلب ${standardizedData.propertyType || standardizedData.type || 'جديد'}`
        };

        const nowIso = new Date().toISOString();
        const mergedLead = {
          ...existing,
          name: existing.name || standardizedData.name,
          whatsapp: standardizedData.whatsapp || existing.whatsapp,
          phone: standardizedData.phone || existing.phone,
          email: standardizedData.email || existing.email || '',
          source: existing.source || standardizedData.source || 'website',
          type: standardizedData.type || existing.type || 'buyer',
          budget: standardizedData.budget || existing.budget || existing.details?.budget || '',
          propertyType: standardizedData.propertyType || existing.propertyType,
          area: standardizedData.area || existing.area,
          score: Math.min(100, (existing.score || 80) + 10),
          temperature: existing.temperature || 'hot',
          status: existing.status || 'new',
          assignedTo: existing.assignedTo || 'Sales Advisor Team',
          nextFollowUpAt: standardizedData.nextFollowUpAt || existing.nextFollowUpAt || null,
          createdAt: existing.createdAt || existing.timestamp || nowIso,
          updatedAt: nowIso,
          createdBy: existing.createdBy || 'online_visitor',
          lastActivityAt: nowIso,
          timestamp: nowIso,
          notes: `${existing.notes ? existing.notes + ' | ' : ''}طلب إضافي: ${standardizedData.propertyType || ''} في ${standardizedData.area || ''}`,
          details: { ...(existing.details || {}), ...(standardizedData.details || {}) },
          activityLogs: [newLog, ...(existing.activityLogs || [])],
          digitalJourney: (sessionJourney.events && sessionJourney.events.length > 0) ? sessionJourney.events : (existing.digitalJourney || []),
          dwellTimeFormatted: sessionJourney.dwellTimeFormatted || existing.dwellTimeFormatted || '1د 15ث',
          isLiveTracked: true
        };

        finalLead = mergedLead;
        const updated = [...prev];
        updated[existingIndex] = mergedLead;
        return { updated, finalLead };
      } else {
        const nowIso = new Date().toISOString();
        const attribution = getAttributionData();
        const rawNewLead = {
          id: 'lead-' + Date.now(),
          timestamp: new Date().toISOString(),
          status: 'new',
          name: standardizedData.name,
          phone: standardizedData.phone,
          whatsapp: standardizedData.whatsapp,
          email: standardizedData.email || '',
          source: standardizedData.source || 'website',
          type: standardizedData.type || 'buyer',
          budget: standardizedData.budget || standardizedData.details?.budget || '',
          area: standardizedData.area || 'new_sohag',
          propertyType: standardizedData.propertyType || 'apartment',
          notes: standardizedData.notes || '',
          temperature: standardizedData.temperature || 'hot',
          score: typeof standardizedData.score === 'number' ? standardizedData.score : 85,
          assignedTo: standardizedData.assignedTo || 'Unassigned',
          nextFollowUpAt: standardizedData.nextFollowUpAt || null,
          createdAt: nowIso,
          updatedAt: nowIso,
          createdBy: standardizedData.createdBy || 'online_visitor',
          lastActivityAt: nowIso,
          followUp: 'Pending Contact',
          activityLogs: [{
            timestamp: nowIso,
            action: 'تسجيل العميل لأول مرة عبر المنصة'
          }],
          digitalJourney: sessionJourney.events || [],
          dwellTimeFormatted: sessionJourney.dwellTimeFormatted || '45 ثانية',
          dwellTimeSeconds: sessionJourney.dwellTimeSeconds || 45,
          isLiveTracked: true,
          marketingAttribution: attribution,
          utmSource: attribution?.source || 'مباشر',
          utmCampaign: attribution?.campaign || 'direct',
          ...standardizedData
        };

        // 🤖 Automated Lead Routing & Round-Robin Load Balance
        const newLead = routeLeadAutomatically(rawNewLead, prev);

        finalLead = newLead;
        const updated = [newLead, ...prev];
        return { updated, finalLead };
      }
    };

    const { updated: nextLeads, finalLead } = buildNextLeads(leadsRef.current);
    leadsRef.current = nextLeads;
    setLeads(nextLeads);
    try {
      localStorage.setItem('oneline_crm_leads', JSON.stringify(nextLeads));
    } catch {
      // Storage full or blocked; the cloud save below still runs
    }

    if (isFirebaseActive() && finalLead) {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        try {
          const queue = JSON.parse(localStorage.getItem('oneline_offline_lead_queue') || '[]');
          queue.push(finalLead);
          localStorage.setItem('oneline_offline_lead_queue', JSON.stringify(queue));
          triggerToast(lang === 'ar' ? 'تم حفظ الطلب محلياً دون اتصال وسيتم رفعه تلقائياً فور توفر الإنترنت 📶' : 'Saved offline! Will sync automatically when connected.', 'info');
        } catch { /* storage unavailable */ }
      } else {
        // Save in the background: Firestore's addDoc waits for a server ack, which can hang on a
        // weak connection, so the visitor's confirmation must not depend on it.
        saveLead(finalLead)
          .then(() => {
            // Notifications are admin-only in Firestore rules; a failure here must never re-queue the lead.
            saveNotification(`Lead update: ${finalLead.name || 'Client'}`).catch(() => {});
          })
          .catch((err) => {
            console.error('Firebase save lead error:', err);
            try {
              const queue = JSON.parse(localStorage.getItem('oneline_offline_lead_queue') || '[]');
              if (!queue.some((q) => q && q.id === finalLead.id)) queue.push(finalLead);
              localStorage.setItem('oneline_offline_lead_queue', JSON.stringify(queue));
            } catch { /* storage unavailable */ }
          });
      }
    }

    return finalLead;
  }, [soundEnabled, lang, triggerToast]);

  // Offline queue recovery
  useEffect(() => {
    const handleOnline = async () => {
      try {
        const queue = JSON.parse(localStorage.getItem('oneline_offline_lead_queue') || '[]');
        if (Array.isArray(queue) && queue.length > 0 && isFirebaseActive()) {
          for (const item of queue) {
            await saveLead(item);
          }
          localStorage.removeItem('oneline_offline_lead_queue');
          triggerToast(lang === 'ar' ? `تمت مزامنة ${queue.length} طلبات مسجلة دون اتصال بنجاح! 📶` : `Synced ${queue.length} offline leads!`, 'success');
        }
      } catch (err) {
        console.error('Offline queue sync error:', err);
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [lang, triggerToast]);

  // Demands Handlers
  const handleAddPublicDemand = useCallback(async (newDemand) => {
    const sanitizedDemand = sanitizeObject(newDemand);
    setDemands((prev) => {
      const updated = [sanitizedDemand, ...prev];
      localStorage.setItem('oneline_demands', JSON.stringify(updated));
      return updated;
    });

    handleAddNewLead({
      name: sanitizedDemand.clientName || 'مشتري عقار',
      phone: sanitizedDemand.phone,
      whatsapp: sanitizedDemand.whatsapp,
      source: 'طلب شراء عقار (مراجعة الإدارة)',
      notes: `طلب شراء جديد: ${sanitizedDemand.text_ar || ''} | الميزانية: ${sanitizedDemand.budget} ج.م | المنطقة: ${sanitizedDemand.area_ar || sanitizedDemand.area}`,
      type: 'buyer_demand',
      status: 'new',
      details: {
        demandId: sanitizedDemand.id,
        budget: sanitizedDemand.budget,
        propertyType: sanitizedDemand.type,
        area: sanitizedDemand.area
      }
    });

    if (isFirebaseActive()) {
      saveDemand(sanitizedDemand);
    }
  }, [handleAddNewLead]);

  const handleAddAdminDemand = useCallback((demandPayload) => {
    const sanitizedPayload = sanitizeObject(demandPayload);
    setDemands((prev) => {
      const updated = [sanitizedPayload, ...prev];
      localStorage.setItem('oneline_demands', JSON.stringify(updated));
      return updated;
    });
    if (isFirebaseActive()) {
      saveDemand(sanitizedPayload);
    }
  }, []);

  const handleApproveDemand = useCallback((demandId) => {
    setDemands((prev) => {
      const updated = prev.map(d => d.id === demandId ? { 
        ...d, 
        status: 'published', 
        approvedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } : d);
      const sorted = [...updated].sort((a, b) => {
        const timeA = new Date(a.approvedAt || a.createdAt || a.timestamp || 0).getTime();
        const timeB = new Date(b.approvedAt || b.createdAt || b.timestamp || 0).getTime();
        return timeB - timeA;
      });
      localStorage.setItem('oneline_demands', JSON.stringify(sorted));
      return sorted;
    });
    if (isFirebaseActive()) {
      updateDemandStatus(demandId, { status: 'published', approvedAt: new Date().toISOString() });
    }
  }, []);

  const handleUpdateDemand = useCallback((demandId, updatedData) => {
    setDemands((prev) => {
      const updated = prev.map(d => d.id === demandId ? { ...d, ...updatedData } : d);
      localStorage.setItem('oneline_demands', JSON.stringify(updated));
      return updated;
    });
    if (isFirebaseActive()) {
      updateDemandStatus(demandId, updatedData);
    }
  }, []);

  const handleDeleteDemand = useCallback((demandId) => {
    setDemands((prev) => {
      const updated = prev.filter(d => d.id !== demandId);
      localStorage.setItem('oneline_demands', JSON.stringify(updated));
      return updated;
    });
    if (isFirebaseActive()) {
      deleteDemandDoc(demandId);
    }
  }, []);

  const handleUnpublishDemand = useCallback((demandId) => {
    setDemands((prev) => {
      const updated = prev.map(d => d.id === demandId ? { ...d, status: 'pending' } : d);
      localStorage.setItem('oneline_demands', JSON.stringify(updated));
      return updated;
    });
    if (isFirebaseActive()) {
      updateDemandStatus(demandId, { status: 'pending' });
    }
  }, []);

  // Firebase Real-time subscriptions
  useEffect(() => {
    if (isFirebaseActive()) {
      const unsubLeads = subscribeToLeads((cloudLeads, meta) => {
        if (cloudLeads && cloudLeads.length > 0) {
          const valid = cloudLeads.filter(l => l && typeof l === 'object');
          if (meta?.fromCache) {
            // Cache-only snapshot (offline / first paint): merge, never shrink the list to it
            setLeads((prev) => {
              const byId = new Map(prev.map((l) => [String(l.id), l]));
              valid.forEach((l) => byId.set(String(l.id), { ...byId.get(String(l.id)), ...l }));
              const fresh = valid.filter((l) => !prev.some((p) => String(p.id) === String(l.id)));
              return [...fresh, ...prev.map((p) => byId.get(String(p.id)))];
            });
          } else {
            setLeads(valid);
          }
        }
      });
      const unsubDemands = subscribeToDemands((cloudDemands, meta) => {
        if (cloudDemands && cloudDemands.length > 0) {
          const valid = cloudDemands.filter(d => d && typeof d === 'object');
          if (meta?.fromCache) {
            // Cache-only snapshot: add/refresh, never shrink the list to this device's pending writes
            setDemands((prev) => {
              const ids = new Set(valid.map((d) => String(d.id)));
              return [...valid, ...prev.filter((d) => !ids.has(String(d.id)))];
            });
            return;
          }
          const sorted = [...valid].sort((a, b) => {
            const timeA = new Date(a?.approvedAt || a?.createdAt || a?.timestamp || 0).getTime();
            const timeB = new Date(b?.approvedAt || b?.createdAt || b?.timestamp || 0).getTime();
            return timeB - timeA;
          });
          setDemands(sorted);
        }
      });
      return () => { 
        if (unsubLeads) unsubLeads(); 
        if (unsubDemands) unsubDemands();
      };
    }
  }, []);

  // CRM Leads Handlers
  const handleUpdateLead = useCallback(async (id, updatedFields) => {
    const nowIso = new Date().toISOString();
    const enrichedFields = {
      ...updatedFields,
      updatedAt: nowIso,
      lastActivityAt: nowIso
    };

    // Optimistic update: the UI changes now and Firestore saves in the background.
    // Firestore only resolves once the server acks — on a weak connection the old
    // "await first" version left the kanban card unmoved while the caller had already
    // shown "moved successfully". On a real failure only the changed fields roll back.
    const previousValues = {};
    const current = leadsRef.current.find((l) => l.id === id);
    if (current) Object.keys(enrichedFields).forEach((k) => { previousValues[k] = current[k]; });

    const applyToLeads = (mutate) => setLeads((prev) => {
      const updated = prev.map((l) => (l.id === id ? mutate(l) : l));
      try { localStorage.setItem('oneline_crm_leads', JSON.stringify(updated)); } catch { /* storage full / private mode */ }
      leadsRef.current = updated;
      return updated;
    });

    applyToLeads((l) => ({
      ...l,
      ...enrichedFields,
      activityLogs: [{ timestamp: nowIso, action: `تحديث بيانات: ${Object.keys(updatedFields).join(', ')}` }, ...(l.activityLogs || [])]
    }));

    if (isFirebaseActive()) {
      updateLeadField(id, enrichedFields).then((saved) => {
        if (saved !== false) return;
        applyToLeads((l) => ({ ...l, ...previousValues }));
        triggerToast(
          lang === 'ar'
            ? 'تعذر حفظ التعديل في Firebase فتم التراجع عنه. تأكد من الاتصال وصلاحية حسابك.'
            : 'Could not save to Firebase — the change was reverted. Check your connection and permissions.',
          'error'
        );
      }).catch(() => {});
    }

    return true;
  }, [lang, triggerToast]);

  const handleDeleteLead = useCallback(async (id) => {
    setLeads((prev) => {
      const updated = prev.filter((l) => l.id !== id);
      localStorage.setItem('oneline_crm_leads', JSON.stringify(updated));
      return updated;
    });

    if (isFirebaseActive()) {
      try {
        await deleteLead(id);
      } catch (err) {
        console.error('Firebase delete lead error:', err);
      }
    }
  }, []);

  const value = {
    properties,
    handleAddProperty,
    handleUpdateProperty,
    handleDeleteProperty,
    projects,
    handleAddProject,
    handleUpdateProject,
    handleDeleteProject,
    favorites,
    toggleFavorite,
    clearFavorites,
    restoreFavorites,
    compareList,
    toggleCompare,
    addToCompare,
    removeCompare,
    clearCompare,
    leads,
    setLeads,
    handleAddNewLead,
    handleUpdateLead,
    handleDeleteLead,
    demands,
    handleAddPublicDemand,
    handleAddAdminDemand,
    handleApproveDemand,
    handleUpdateDemand,
    handleDeleteDemand,
    handleUnpublishDemand
  };

  return (
    <PropertiesContext.Provider value={value}>
      {children}
    </PropertiesContext.Provider>
  );
}

export function useProperties() {
  const context = useContext(PropertiesContext);
  if (!context) {
    throw new Error('useProperties must be used within a PropertiesProvider');
  }
  return context;
}
