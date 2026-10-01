// =============================================================
//  ONE LINE SOLUTIONS - FIREBASE DATA SERVICE LAYER
//  Handles all CRUD operations for Leads, Demands, and Notifications.
//  Falls back to localStorage if Firebase is not configured.
// =============================================================

//  The implementation lives in src/services/ (one module per domain); this file is the single
//  import point the app and firebaseLazy.js use.

export * from './services/catalog.js';
export * from './services/cmsMedia.js';
export * from './services/adStats.js';
export * from './services/leads.js';
export * from './services/deals.js';
export * from './services/notifications.js';
export { REQUEST_CONTACT_FIELDS } from './services/requestContacts.js';
export * from './services/demands.js';
export * from './services/intake.js';
export * from './services/settings.js';
export * from './services/auth.js';
