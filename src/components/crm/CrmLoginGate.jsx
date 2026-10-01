import { Lock, Eye, EyeOff, ShieldCheck, AlertCircle } from 'lucide-react';

export default function CrmLoginGate({
  crmAuthError,
  crmEmailInput,
  crmPasswordInput,
  firebaseConnected,
  handleLoginSubmit,
  isAr,
  loading,
  setCrmEmailInput,
  setCrmPasswordInput,
  setShowPassword,
  showPassword
}) {
  return (
    <div style={{ maxWidth: '420px', margin: '60px auto', textAlign: 'center' }}>
      <div style={{ 
        background: 'var(--crm-card)', 
        border: '1px solid var(--border-light)', 
        borderRadius: 'var(--radius-lg)', 
        padding: '40px 30px',
        boxShadow: 'var(--shadow-lg)'
      }}>
        <Lock size={40} style={{ color: 'var(--crm-accent-text)', marginBottom: '16px' }} />
        <h2 style={{ marginBottom: '8px' }}>
          {isAr ? 'لوحة تحكم الإدارة' : 'Admin CRM Login'}
        </h2>
        <p style={{ fontSize: 'var(--crm-text-base)', color: 'var(--crm-muted)', marginBottom: '24px' }}>
          {firebaseConnected 
            ? (isAr ? 'قم بتسجيل الدخول باستخدام حساب المشرف العقاري المعتمد.' : 'Login with certified admin credentials.')
            : (isAr ? 'أدخل كلمة المرور للوصول إلى وضع عدم الاتصال.' : 'Enter password to access offline mode.')}
        </p>
        
        <form onSubmit={handleLoginSubmit}>
          {firebaseConnected && (
            <div style={{ marginBottom: '16px', textAlign: 'right' }}>
              <label style={{ fontSize: 'var(--crm-text-sm)', fontWeight: 'bold', color: 'var(--crm-muted)' }}>
                {isAr ? 'البريد الإلكتروني' : 'Email Address'}
              </label>
              <input 
                type="email"
                required
                className="form-input"
                placeholder="admin@oneline.com"
                value={crmEmailInput} data-testid="login-email"
                onChange={(e) => setCrmEmailInput(e.target.value)}
                style={{ marginTop: '4px', textAlign: 'left', direction: 'ltr' }}
              />
            </div>
          )}

          <div style={{ marginBottom: '16px', textAlign: 'right' }}>
            <label style={{ fontSize: 'var(--crm-text-sm)', fontWeight: 'bold', color: 'var(--crm-muted)' }}>
              {isAr ? 'كلمة المرور' : 'Password'}
            </label>
            <div style={{ position: 'relative', marginTop: '4px' }}>
              <input 
                type={showPassword ? 'text' : 'password'}
                required
                className="form-input"
                placeholder={isAr ? 'كلمة المرور' : 'Password'}
                value={crmPasswordInput} data-testid="login-password"
                onChange={(e) => setCrmPasswordInput(e.target.value)}
                style={{ 
                  paddingInlineEnd: '40px', 
                  textAlign: firebaseConnected ? 'left' : 'center', 
                  fontSize: 'var(--crm-text-lg)', 
                  letterSpacing: firebaseConnected ? 'normal' : '2px' 
                }}
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ 
                  position: 'absolute', top: '50%', transform: 'translateY(-50%)',
                  [isAr ? 'left' : 'right']: '12px',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--crm-muted)'
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {crmAuthError && (
            <p style={{ color: 'var(--rose)', fontSize: 'var(--crm-text-base)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
              <AlertCircle size={14} />
              {crmAuthError}
            </p>
          )}

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            <ShieldCheck size={16} />
            {loading ? (isAr ? 'جاري التحقق...' : 'Verifying...') : (isAr ? 'دخول لوحة التحكم' : 'Login to CRM')}
          </button>
        </form>
      </div>
    </div>
  );
}
