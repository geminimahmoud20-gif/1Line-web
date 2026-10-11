import { useEffect, useState } from 'react';
import { getAreas } from '../utils/areasData';

/** The current area list, refreshed when the CRM or the cloud copy changes it. */
export default function useAreas() {
  const [areas, setAreas] = useState(() => getAreas());
  useEffect(() => {
    const refresh = () => setAreas(getAreas());
    window.addEventListener('oneline_areas_updated', refresh);
    return () => window.removeEventListener('oneline_areas_updated', refresh);
  }, []);
  return areas;
}
