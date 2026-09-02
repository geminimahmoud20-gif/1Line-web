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
