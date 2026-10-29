import { useEffect, useState } from 'react';
import { Bell, Send, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { loadNotifyStatus, sendTestAlert } from '../../firebaseLazy';
import { desktopAlertsState, enableDesktopAlerts, showSystemAlert } from '../../utils/newLeadAlerts';
import { playNotificationChime } from '../../utils/notificationHub';

// CRM → إدارة المنظومة → تنبيهات الطلبات: is the WhatsApp alert working (last message that went
// out, last one that didn't, a test message), and are notifications on for this device.

const when = (ms) => (ms ? new Intl.DateTimeFormat('ar-EG-u-nu-latn', {
  timeZone: 'Africa/Cairo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true
}).format(new Date(ms)) : '');

const TEST_RESULT = {
  'not-configured': (r) => (r.serviceAccount === false
    ? 'تنبيهات الواتساب مش متظبطة: مفتاح Firebase (FIREBASE_SERVICE_ACCOUNT) مش موجود في إعدادات Vercel.'
    : 'تنبيهات الواتساب مش متظبطة: مفيش رقم متسجل. في Vercel ← Settings ← Environment Variables حط WHATSAPP_CALLMEBOT بالشكل 2010xxxxxxxx:المفتاح وبعدين اعمل Redeploy.'),
  'send-failed': () => 'الرسالة ماوصلتش لأي رقم. غالبًا مفتاح CallMeBot غلط أو الرقم لسه مش مفعّل عندهم.',
  forbidden: () => 'الزرار ده للمدير العام بس.',
  'no-api': () => 'الزرار شغال على الموقع الحقيقي بس (www.1lineestate.com).',
  network: () => 'مفيش نت. جرّب تاني.',
  unauthenticated: () => 'سجّل دخولك تاني وجرّب.'
};

const box = { background: 'var(--crm-card)', border: '1px solid var(--crm-line)', borderRadius: '12px', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '10px' };
const line = { fontSize: 'var(--crm-text-sm)', color: 'var(--crm-body)', lineHeight: 1.7, margin: 0 };

export default function AlertsSettingsPanel() {
  const [status, setStatus] = useState(undefined); // undefined: loading, null: nothing recorded yet
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState(null);
  const [deviceState, setDeviceState] = useState(desktopAlertsState);

  const refresh = () => loadNotifyStatus().then(setStatus).catch(() => setStatus(null));
  useEffect(() => { refresh(); }, []);

  const runTest = async () => {
    setTesting(true);
    setResult(null);
    const r = await sendTestAlert();
    setTesting(false);
    setResult(r.ok
      ? { ok: true, text: `اتبعتت على ${r.sent} من ${r.channels} رقم. اتأكد إنها وصلت على الواتساب.` }
      : { ok: false, text: (TEST_RESULT[r.error] || TEST_RESULT['send-failed'])(r) });
    refresh();
  };

  const failingNow = status && status.lastFailAt > status.lastOkAt;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '720px' }}>
      <section style={box}>
        <strong style={{ color: 'var(--crm-ink)', fontSize: 'var(--crm-text-md)' }}>تنبيهات الواتساب للطلبات الجديدة</strong>
        <p style={line}>كل طلب جديد من الموقع بيوصل رسالة واتساب للفريق فيها ملخص الطلب ولينك بيفتحه في الـCRM. لو الإرسال فشل، السيرفر بيحاول تاني.</p>

        {status === undefined && <p style={line}><Loader2 size={14} className="animate-spin" /> جاري التحميل…</p>}
        {status === null && <p style={line}>لسه مفيش ولا رسالة اتسجلت. دوس «ابعت رسالة تجربة» عشان تتأكد إنها شغالة.</p>}
        {status && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {failingNow
              ? <p style={{ ...line, color: 'var(--crm-danger)', fontWeight: 700 }}><AlertTriangle size={14} /> آخر رسالة ماوصلتش ({when(status.lastFailAt)}). جرّب رسالة تجربة.</p>
              : <p style={{ ...line, color: 'var(--crm-positive)', fontWeight: 700 }}><CheckCircle2 size={14} /> شغالة</p>}
            {status.lastOkAt > 0 && <p style={line}>آخر رسالة وصلت: {when(status.lastOkAt)}{status.lastOkRef === 'test' ? ' (تجربة)' : ''}</p>}
            {status.lastFailAt > 0 && <p style={line}>آخر رسالة فشلت: {when(status.lastFailAt)}{status.lastFailRef === 'test' ? ' (تجربة)' : ''}</p>}
            {status.channels > 0 && <p style={line}>بتتبعت على {status.channels} رقم.</p>}
          </div>
        )}

        <div>
          <button type="button" className="crm-btn-primary-gold" onClick={runTest} disabled={testing}>
            {testing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            <span>{testing ? 'جاري الإرسال…' : 'ابعت رسالة تجربة'}</span>
          </button>
        </div>
        {result && (
          <p role="status" style={{ ...line, fontWeight: 700, color: result.ok ? 'var(--crm-positive)' : 'var(--crm-danger)' }}>{result.text}</p>
        )}
      </section>

      <section style={box}>
        <strong style={{ color: 'var(--crm-ink)', fontSize: 'var(--crm-text-md)' }}>إشعارات الجهاز ده</strong>
        <p style={line}>والـCRM مفتوح (حتى لو في الخلفية) بيطلع إشعار على الجهاز مع صوت لكل طلب جديد. لما تدوس عليه بيفتح الطلب.</p>
        {deviceState === 'granted' && <p style={{ ...line, color: 'var(--crm-positive)', fontWeight: 700 }}><CheckCircle2 size={14} /> مفعّلة على الجهاز ده</p>}
        {deviceState === 'default' && (
          <div>
            <button type="button" className="crm-btn-primary-gold" onClick={async () => { await enableDesktopAlerts(); setDeviceState(desktopAlertsState()); }}>
              <Bell size={16} /><span>فعّل الإشعارات على الجهاز ده</span>
            </button>
          </div>
        )}
        {deviceState === 'denied' && <p style={{ ...line, color: 'var(--crm-danger)' }}>الإشعارات مقفولة للموقع ده من إعدادات المتصفح. افتحها من القفل جنب العنوان ← الإشعارات ← سماح، وبعدين حدّث الصفحة.</p>}
        {deviceState === 'unsupported' && <p style={line}>المتصفح ده مش بيدعم الإشعارات. على الآيفون: ثبّت الـCRM على الشاشة الرئيسية (مشاركة ← إضافة إلى الشاشة الرئيسية) وافتحه من هناك.</p>}
        {deviceState === 'granted' && (
          <div>
            <button
              type="button"
              className="btn btn-sm btn-outline"
              onClick={() => { playNotificationChime(); showSystemAlert('🔔 تجربة — 1Line', { body: 'الإشعارات شغالة على الجهاز ده.', tag: 'test', data: { url: '/crm' } }); }}
            >
              <Bell size={14} /><span>جرّب إشعار</span>
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
