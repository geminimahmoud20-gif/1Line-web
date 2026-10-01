/**
 * Read persisted JSON without allowing stale or corrupt browser data to break
 * the application render. Invalid values are removed so the next start is
 * clean rather than repeatedly failing with the same value.
 */
export function readStoredJson(key, fallback, isValid = () => true) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;

    const value = JSON.parse(raw);
    if (isValid(value)) return value;

    localStorage.removeItem(key);
  } catch (error) {
    console.warn(`Ignoring invalid saved data for ${key}:`, error);
    try {
      localStorage.removeItem(key);
    } catch {
      // Storage may be unavailable (for example, in a restricted browser mode).
    }
  }

  return fallback;
}

export const isRecordArray = (value) =>
  Array.isArray(value) && value.every((item) => item && typeof item === 'object' && !Array.isArray(item));

// A visitor's own submitted demands. The public demand list carries no contact details, so the
// client account page finds "my demands" here (this device) instead of matching phones.
const MY_DEMANDS_KEY = 'oneline_my_demands';
const MY_DEMANDS_MAX = 30;

export function readMyDemands() {
  return readStoredJson(MY_DEMANDS_KEY, [], isRecordArray);
}

export function rememberMyDemand(demand) {
  if (!demand || !demand.id) return;
  try {
    const list = [demand, ...readMyDemands().filter((d) => d.id !== demand.id)].slice(0, MY_DEMANDS_MAX);
    localStorage.setItem(MY_DEMANDS_KEY, JSON.stringify(list));
  } catch {
    // Storage full or unavailable — the demand is still saved in the cloud
  }
}
