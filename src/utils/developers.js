// =============================================================
//  Developers (شركات التطوير): one record per company, kept in settings/developers ({ list })
//  like the areas list. The CRM edits it (admins: firestore.rules settings write); projects point
//  to a developer by developerId and keep developer_ar as a copy of the name for older screens.
//  Pure helpers are tested in tests/unit/developers.test.mjs.
// =============================================================
import { useEffect, useState } from 'react';
import { saveSettings, subscribeToSettings } from '../firebaseLazy.js';

export const DEVELOPERS_KEY = 'developers';
const CACHE_KEY = 'oneline_developers';

export const EMPTY_DEVELOPER = {
  id: '', name_ar: '', name_en: '', logo: '', about_ar: '', founded: '', deliveredProjects: '', phone: '', website: '', facebook: ''
};

const str = (v, max = 400) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** A link-safe name for the developer's page: the English name, else the id */
export function developerSlug(d) {
  const base = str(d?.name_en).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return base || String(d?.id || '').toLowerCase();
}

/** Clean list: known fields only, a name required, ids kept, duplicates (same id) dropped */
export function normalizeDevelopers(list) {
  const seen = new Set();
  return (Array.isArray(list) ? list : [])
    .map((d) => ({
      id: str(d?.id, 60) || `dev-${Date.now()}`,
      name_ar: str(d?.name_ar, 120),
      name_en: str(d?.name_en, 120),
      logo: /^https?:\/\//.test(str(d?.logo, 600)) ? str(d.logo, 600) : '',
      about_ar: str(d?.about_ar, 2000),
      founded: str(String(d?.founded ?? ''), 10),
      deliveredProjects: str(String(d?.deliveredProjects ?? ''), 10),
      phone: str(d?.phone, 30),
      website: /^https?:\/\//.test(str(d?.website)) ? str(d.website) : '',
      facebook: /^https?:\/\//.test(str(d?.facebook)) ? str(d.facebook) : ''
    }))
    .filter((d) => d.name_ar && !seen.has(d.id) && seen.add(d.id));
}

export const developerOf = (project, developers = []) =>
  (project?.developerId && developers.find((d) => d.id === project.developerId)) || null;

/**
 * The developer name to show for a project: the copy saved on the project (developer_ar / developer_en), else the
 * linked developer's own name (a project saved before the developer existed or without the copy still shows it).
 * English falls back to the Arabic name.
 */
export function developerNameOf(project, developers = [], isAr = true) {
  const linked = developerOf(project, developers);
  const ar = str(project?.developer_ar) || linked?.name_ar || '';
  const en = str(project?.developer_en) || linked?.name_en || '';
  return isAr ? ar : (en || ar);
}

/** The developer's projects (by developerId, or by the old free-text name when not linked yet) */
export const projectsOf = (developer, projects = []) => (Array.isArray(projects) ? projects : []).filter((p) =>
  p && !p.isDeleted && (p.developerId === developer.id || (!p.developerId && str(p.developer_ar) && str(p.developer_ar) === developer.name_ar)));

const readCache = () => {
  try { return normalizeDevelopers(JSON.parse(localStorage.getItem(CACHE_KEY) || '[]')); } catch { return []; }
};

const UPDATED_EVENT = 'oneline_developers_updated';

/** The list from the cached /api/catalog: kept on this device and handed to open pages */
export function applyDevelopers(list) {
  const clean = normalizeDevelopers(list);
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(clean)); } catch { /* private mode */ }
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(UPDATED_EVENT, { detail: clean }));
  return clean;
}

export async function saveDevelopers(list) {
  const clean = normalizeDevelopers(list);
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(clean)); } catch { /* private mode */ }
  const ok = await saveSettings(DEVELOPERS_KEY, { list: clean });
  if (ok === false) throw new Error('saveSettings returned false');
  return clean;
}

/**
 * { list, loaded }: the developers list, live from settings/developers (cached on this device for a
 * fast start). `loaded` turns true once the saved list has been read, so a page can tell «not
 * loaded yet» from «no such developer».
 */
export function useDevelopersState() {
  const [state, setState] = useState(() => ({ list: readCache(), loaded: false }));
  useEffect(() => {
    // No saved list at all never calls back: stop waiting after a few seconds
    const timer = setTimeout(() => setState((s) => (s.loaded ? s : { ...s, loaded: true })), 12000);
    // Visitors get the list with the cached catalog, usually before Firestore has even loaded
    const onCatalog = (e) => {
      clearTimeout(timer);
      setState({ list: Array.isArray(e.detail) ? e.detail : readCache(), loaded: true });
    };
    window.addEventListener(UPDATED_EVENT, onCatalog);
    const unsubscribe = subscribeToSettings(DEVELOPERS_KEY, (data) => {
      clearTimeout(timer);
      const clean = normalizeDevelopers(data?.list);
      setState({ list: clean, loaded: true });
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(clean)); } catch { /* private mode */ }
    });
    return () => {
      clearTimeout(timer);
      window.removeEventListener(UPDATED_EVENT, onCatalog);
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);
  return state;
}

/** The developers list, live from settings/developers */
export function useDevelopers() {
  return useDevelopersState().list;
}

/** The developer's page on the site */
export const developerPath = (d) => `/developers/${encodeURIComponent(developerSlug(d))}`;

/** The developer a /developers/<slug> link points to (its slug, or its id for older links) */
export const findDeveloper = (slug, developers = []) => {
  const key = String(slug || '').toLowerCase();
  if (!key) return null;
  return developers.find((d) => developerSlug(d) === key) || developers.find((d) => String(d.id).toLowerCase() === key) || null;
};

/** The developer of a project: the linked record, else one whose name matches the old free-text name */
export const projectDeveloper = (project, developers = []) => developerOf(project, developers)
  || (str(project?.developer_ar) ? developers.find((d) => d.name_ar === str(project.developer_ar)) || null : null);
