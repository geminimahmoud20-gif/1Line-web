import { Link } from 'react-router-dom';
import { Lock, Sparkles, ShieldCheck, ArrowLeft, ArrowRight, MessageSquare, KeyRound } from 'lucide-react';
import { getWhatsAppUrl } from '../../utils/founderCmsData';

export default function PrivateVaultBanner({ lang = 'ar' }) {
  const isAr = lang === 'ar';

  const handleVipWhatsApp = () => {
    const text = isAr 
      ? 'مرحباً 1Line، أنا مهتم بالحصول على كود دخول الخزينة العقارية السرية (VIP Vault) للاطلاع على الصفقات غير المعروضة للعامة.'
      : 'Hello 1Line, I would like to request VIP access to the Off-Market Private Vault.';
    window.open(getWhatsAppUrl(text), '_blank');
  };

  return (
    <section className="homepage-section private-vault-banner-wrap">
      <div className="private-vault-card">
        <div className="vault-glow-ambient" aria-hidden="true" />
        
        <div className="vault-card-inner">
          <div className="vault-content-left">
            <div className="vault-pill-badge">
              <KeyRound size={13} className="text-gold" />
              <span>{isAr ? 'قسم كبار المستثمرين والمغتربين الحصري' : 'Exclusive VIP & Expat Private Desk'}</span>
            </div>

            <h2 className="vault-title">
              {isAr ? (
                <>
                  <span>الخزينة العقارية السرية</span>
                  <span className="vault-gold-highlight"> (Off-Market Vault)</span>
                </>
              ) : (
                <>
                  <span>Exclusive Off-Market</span>
                  <span className="vault-gold-highlight"> Private Client Vault</span>
                </>
              )}
            </h2>

            <p className="vault-description">
              {isAr 
                ? 'صفقات خاصة وحصص تجارية استثنائية غير معروضة للعامة بأسعار أقل من القيمة السوقية بنسبة تصل إلى 20%. لا يمكن الاطلاع على تفاصيلها إلا للعملاء المسجلين برمز سري معتمد.'
                : 'Rare off-market residential and commercial properties discounted up to 20% below market value. Accessible exclusively to verified private clients.'}
            </p>

            <div className="vault-features-row">
              <div className="vault-feat-item">
                <ShieldCheck size={16} className="text-gold" />
                <span>{isAr ? 'سرية تامة 100% وحماية للملكية' : '100% Confidential'}</span>
              </div>
              <div className="vault-feat-item">
                <Sparkles size={16} className="text-gold" />
                <span>{isAr ? 'عقود مباشرة بأسعار استثنائية' : 'Below-Market Pricing'}</span>
              </div>
              <div className="vault-feat-item">
                <Lock size={16} className="text-gold" />
                <span>{isAr ? 'دخول فوري برمز PIN مشفر' : 'Encrypted PIN Access'}</span>
              </div>
            </div>
          </div>

          <div className="vault-actions-right">
            <div className="vault-action-box">
              <div className="vault-action-badge">
                <span className="live-dot-gold" />
                <span>{isAr ? '3 صفقات حصرية متاحة هذا الأسبوع' : '3 Active Off-Market Deals'}</span>
              </div>

              <Link to="/vault" className="btn btn-vault-primary">
                <KeyRound size={17} />
                <span>{isAr ? 'فتح الخزينة برمز PIN' : 'Access Private Vault'}</span>
                {isAr ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
              </Link>

              <button
                type="button"
                className="btn btn-vault-whatsapp"
                onClick={handleVipWhatsApp}
              >
                <MessageSquare size={17} />
                <span>{isAr ? 'طلب رمز الدخول عبر الواتساب' : 'Request Access Code'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
