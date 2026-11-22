import { AlertTriangle } from 'lucide-react';
import { useProperties } from '../../context/PropertiesContext';
import './alert-health-banner.css';

// Why the client list did not load, in words the team can act on. The code stays visible for whoever checks Firebase.
const REASONS = {
  'permission-denied': 'قاعدة البيانات رفضت الطلب: غالبًا التحقق من الجهاز (App Check) فشل على المتصفح ده، أو صلاحيات الحساب اتغيّرت.',
  'resource-exhausted': 'حد الاستخدام اليومي لقاعدة البيانات خلص. البيانات هترجع لما الحد يتجدد أو الخطة تتغيّر.',
  unavailable: 'مفيش اتصال بقاعدة البيانات دلوقتي.',
  unauthenticated: 'جلسة الدخول انتهت. اخرج وادخل تاني.',
};

/** Shown at the top of the CRM when the clients could not be loaded: pages full of zeros said nothing about why. */
export default function LeadsLoadError() {
  const { leadsError } = useProperties();
  if (!leadsError) return null;
  return (
    <div className="crm-alert-health" role="alert">
      <AlertTriangle size={18} aria-hidden="true" />
      <p>
        العملاء مش بيتحمّلوا، فالأرقام اللي تحت مش صحيحة. {REASONS[leadsError] || 'حصل خطأ في قاعدة البيانات.'}
        {' '}<bdi dir="ltr">({leadsError})</bdi>
      </p>
      <div className="crm-alert-health__actions">
        <button type="button" className="ui-btn ui-btn--secondary ui-btn--sm" onClick={() => window.location.reload()}>حدّث الصفحة</button>
      </div>
    </div>
  );
}
