import { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
  deleteDemandDoc
} from '../firebaseService';
import { playNotificationChime } from '../utils/notificationHub';
import { sanitizeObject, normalizePhoneNumber } from '../utils/securityShield';
import { identifyVisitor, getCurrentSessionJourney } from '../utils/visitorTracker';
import { isRecordArray, readStoredJson } from '../utils/browserStorage';
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
      const existingIds = new Set(stored.map(p => p.id));
      const missing = PROPERTIES_DATA.filter(p => !existingIds.has(p.id));
      if (missing.length > 0) {
        const merged = [...stored, ...missing];
        localStorage.setItem('oneline_properties', JSON.stringify(merged));
        return merged;
      }
      return stored;
    }
    return PROPERTIES_DATA;
  });

  const handleAddProperty = useCallback((newProp) => {
    setProperties((prev) => {
      const updated = [newProp, ...prev];
      localStorage.setItem('oneline_properties', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const handleUpdateProperty = useCallback((id, updatedData) => {
    setProperties((prev) => {
      const updated = prev.map((p) => (p.id === id ? { ...p, ...updatedData } : p));
      localStorage.setItem('oneline_properties', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const handleDeleteProperty = useCallback((id) => {
    setProperties((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      localStorage.setItem('oneline_properties', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Mega Projects State
  const [projects, setProjects] = useState(() => {
    const stored = readStoredJson('oneline_mega_projects', MEGA_PROJECTS, isRecordArray);
    if (Array.isArray(stored) && stored.length > 0) {
      const existingIds = new Set(stored.map(p => p.id));
      const missing = MEGA_PROJECTS.filter(p => !existingIds.has(p.id));
      if (missing.length > 0) {
        const merged = [...stored, ...missing];
        localStorage.setItem('oneline_mega_projects', JSON.stringify(merged));
        return merged;
      }
      return stored;
    }
    return MEGA_PROJECTS;
  });

  const handleAddProject = useCallback((newProj) => {
    setProjects((prev) => {
      const updated = [newProj, ...prev];
      localStorage.setItem('oneline_mega_projects', JSON.stringify(updated));
      return updated;
    });
    triggerToast(lang === 'ar' ? 'تم إضافة المشروع بنجاح 🏢' : 'Project added!', 'success');
  }, [lang, triggerToast]);

  const handleUpdateProject = useCallback((id, updatedData) => {
    setProjects((prev) => {
      const updated = prev.map((p) => (p.id === id ? { ...p, ...updatedData } : p));
      localStorage.setItem('oneline_mega_projects', JSON.stringify(updated));
      return updated;
    });
    triggerToast(lang === 'ar' ? 'تم تحديث بيانات المشروع ونسب الإنجاز بنجاح 💾' : 'Project updated!', 'success');
  }, [lang, triggerToast]);

  const handleDeleteProject = useCallback((id) => {
    setProjects((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      localStorage.setItem('oneline_mega_projects', JSON.stringify(updated));
      return updated;
    });
    triggerToast(lang === 'ar' ? 'تم حذف المشروع بنجاح 🗑️' : 'Project deleted!', 'info');
  }, [lang, triggerToast]);

  // Favorites State
  const [favorites, setFavorites] = useState(() => {
    return readStoredJson('oneline_favorites', [], Array.isArray);
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

  const clearFavorites = useCallback(() => {
    setFavorites([]);
    localStorage.removeItem('oneline_favorites');
    triggerToast(lang === 'ar' ? 'تم مسح قائمة المفضلة' : 'Favorites cleared', 'info');
  }, [lang, triggerToast]);

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
    return readStoredJson('oneline_crm_leads', INITIAL_LEADS, isRecordArray);
  });

  // Demands State
  const [demands, setDemands] = useState(() => {
    const fallback = INITIAL_DEMANDS.map((d) => ({ ...d, status: d.status || 'published' }));
    const stored = readStoredJson('oneline_demands', fallback, isRecordArray);
    return Array.isArray(stored) && stored.length > 0 ? stored : fallback;
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
    const normalizedArea = cleanData.area || cleanData.details?.area || cleanData.location || 'sohag_jadida';

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

    let finalLead = null;

    setLeads((prev) => {
      const existingIndex = prev.findIndex(
        (l) => normalizePhoneNumber(l.phone || l.whatsapp) === incomingPhone
      );

      if (existingIndex !== -1 && incomingPhone) {
        const existing = prev[existingIndex];
        const newLog = {
          timestamp: new Date().toISOString(),
          action: `تسجيل اهتمام إضافي: طلب ${standardizedData.propertyType || standardizedData.type || 'جديد'}`
        };

        const mergedLead = {
          ...existing,
          name: existing.name || standardizedData.name,
          whatsapp: standardizedData.whatsapp || existing.whatsapp,
          phone: standardizedData.phone || existing.phone,
          propertyType: standardizedData.propertyType || existing.propertyType,
          area: standardizedData.area || existing.area,
          score: Math.min(100, (existing.score || 80) + 10),
          timestamp: new Date().toISOString(),
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
        localStorage.setItem('oneline_crm_leads', JSON.stringify(updated));
        return updated;
      } else {
        const newLead = {
          id: 'lead-' + Date.now(),
          timestamp: new Date().toISOString(),
          status: 'new',
          followUp: 'Pending Contact',
          assignedTo: 'Sales Advisor Team',
          score: 85,
          temperature: 'hot',
          activityLogs: [{
            timestamp: new Date().toISOString(),
            action: 'تسجيل العميل لأول مرة عبر المنصة'
          }],
          digitalJourney: sessionJourney.events || [],
          dwellTimeFormatted: sessionJourney.dwellTimeFormatted || '45 ثانية',
          dwellTimeSeconds: sessionJourney.dwellTimeSeconds || 45,
          isLiveTracked: true,
          ...standardizedData
        };

        finalLead = newLead;
        const updated = [newLead, ...prev];
        localStorage.setItem('oneline_crm_leads', JSON.stringify(updated));
        return updated;
      }
    });

    if (isFirebaseActive() && finalLead) {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        try {
          const queue = JSON.parse(localStorage.getItem('oneline_offline_lead_queue') || '[]');
          queue.push(finalLead);
          localStorage.setItem('oneline_offline_lead_queue', JSON.stringify(queue));
          triggerToast(lang === 'ar' ? 'تم حفظ الطلب محلياً دون اتصال وسيتم رفعه تلقائياً فور توفر الإنترنت 📶' : 'Saved offline! Will sync automatically when connected.', 'info');
        } catch (e) {}
      } else {
        try {
          await saveLead(finalLead);
          await saveNotification(`Lead update: ${finalLead.name || 'Client'}`);
        } catch (err) {
          console.error('Firebase save lead error:', err);
          try {
            const queue = JSON.parse(localStorage.getItem('oneline_offline_lead_queue') || '[]');
            queue.push(finalLead);
            localStorage.setItem('oneline_offline_lead_queue', JSON.stringify(queue));
          } catch (e) {}
        }
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
      const unsubLeads = subscribeToLeads((cloudLeads) => {
        if (cloudLeads && cloudLeads.length > 0) {
          setLeads(cloudLeads);
        }
      });
      const unsubDemands = subscribeToDemands((cloudDemands) => {
        if (cloudDemands && cloudDemands.length > 0) {
          const sorted = [...cloudDemands].sort((a, b) => {
            const timeA = new Date(a.approvedAt || a.createdAt || a.timestamp || 0).getTime();
            const timeB = new Date(b.approvedAt || b.createdAt || b.timestamp || 0).getTime();
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
    if (isFirebaseActive()) {
      const saved = await updateLeadField(id, updatedFields);
      if (!saved) {
        triggerToast(
          lang === 'ar'
            ? 'تعذر حفظ التعديل في Firebase. تأكد من نشر قواعد Firestore وتسجيل الدخول بحساب المدير.'
            : 'Could not save to Firebase. Check Firestore rules and your admin sign-in.',
          'error'
        );
        return false;
      }
    }

    setLeads((prev) => {
      const updated = prev.map((l) => {
        if (l.id === id) {
          const activityLogs = l.activityLogs || [];
          const newLog = {
            timestamp: new Date().toISOString(),
            action: `تحديث بيانات: ${Object.keys(updatedFields).join(', ')}`
          };
          return { ...l, ...updatedFields, activityLogs: [newLog, ...activityLogs] };
        }
        return l;
      });
      localStorage.setItem('oneline_crm_leads', JSON.stringify(updated));
      return updated;
    });

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
