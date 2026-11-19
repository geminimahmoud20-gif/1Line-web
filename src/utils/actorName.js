// The signed-in staff member's display name, set once by the CRM shell, so the activity log can say who did
// something without every caller passing it (and without loading Firebase on the public site).
let name = '';
export const setActorName = (value) => { name = String(value || '').trim().slice(0, 60); };
export const getActorName = () => name;
