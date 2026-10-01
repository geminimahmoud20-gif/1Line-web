

export default function AutomationTab({
  addNotification,
  isAr,
  triggerToast
}) {
  return (
    <div className="crm-table-container">
      <h3>{isAr ? 'إعدادات الأتمتة والتنبيهات الفورية' : 'Automation & Instant Alert Hub'}</h3>
      <p className="section-subtitle" style={{ marginBottom: '24px' }}>
        {isAr ? 'قم بإعداد قنوات التنبيه الفوري لمالك الموقع فور تسجيل أي طلب جديد لسرعة إغلاق الصفقات.' : 'Configure instant notification channels'}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        <div className="crm-surface-navy" style={{ background: 'var(--crm-brand-navy)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
          <h4 style={{ marginBottom: '10px', color: 'var(--crm-gold-on-dark)' /* light gold: this card is always navy (var(--crm-ink)) */ }}>
            📱 {isAr ? 'التنبيه الفوري عبر الواتساب والتيليجرام' : 'Instant Webhook / WhatsApp Push'}
          </h4>
          <p style={{ fontSize: 'var(--crm-text-base)', color: 'var(--crm-muted)', marginBottom: '16px' }}>
            {isAr ? 'عند تسجيل أي عميل مهتم على الموقع، يُرسل النظام إشعاراً فورياً على هاتف المدير يتضمن (الاسم، الهاتف، الميزانية، ونقاط الجدية).' : 'Pushes lead info to management phone instantly.'}
          </p>
          
          <button 
            className="btn btn-primary" 
            onClick={() => {
              triggerToast(isAr ? 'تم إرسال إشعار تجريبي فوري لهاتف الإدارة بنجاح! 🔔' : 'Test notification sent to management phone!');
              addNotification('إشعار فوري: عميل جديد مهتم بشراء شقة في شرق سوهاج بميزانية 3.5M ج.م (جدية 95%)');
            }}
          >
            {isAr ? 'اختبار إرسال إشعار تجريبي للإدارة' : 'Send Test Notification'}
          </button>
        </div>

        <div className="crm-surface-navy" style={{ background: 'var(--crm-brand-navy)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
          <h4 style={{ marginBottom: '10px', color: 'var(--crm-positive)' }}>
            🎯 {isAr ? 'قواعد التوزيع الذكي للعملاء' : 'Smart Auto-Assignment'}
          </h4>
          <p style={{ fontSize: 'var(--crm-text-base)', color: 'var(--crm-muted)', marginBottom: '16px' }}>
            {isAr ? 'توجيه العملاء أصحاب الميزانيات المرتفعة (> 5 مليون) مباشرة للدكتور محمود الباز، وتوزيع باقي الطلبات بالتساوي على Sales Team A و B.' : 'Auto distributes VIP leads.'}
          </p>
          <button className="btn btn-accent" onClick={() => {
            triggerToast(isAr ? 'تم تطبيق قواعد التوزيع التلقائي على جميع العملاء الجدد بنجاح!' : 'Auto assignment applied!');
            addNotification('تم إعادة توزيع 3 عملاء متوقعي الجدية للـ Sales Team تلقائياً.');
          }}>
            {isAr ? 'تفعيل وتوزيع العملاء الآن' : 'Run Auto Assignment'}
          </button>
        </div>
      </div>
    </div>

  );
}
