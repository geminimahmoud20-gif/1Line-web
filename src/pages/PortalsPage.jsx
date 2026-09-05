import { Link } from 'react-router-dom';
import { Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { BuyWizard } from '../components/BuyWizard';
import { SellWizard } from '../components/SellWizard';
import { InvestorCenter } from '../components/InvestorCenter';
import { BrokerPortal } from '../components/BrokerPortal';
import { DemandsPortal } from '../components/DemandsPortal';
import { VaultPortal } from '../components/VaultPortal';
import { ReferralPortal } from '../components/ReferralPortal';
import { SpecialRequests } from '../components/SpecialRequests';

export default function PortalsPage({
  portalType,
  lang,
  t,
  buyerStep,
  setBuyerStep,
  buyerAnswers,
  setBuyerAnswers,
  handleBuyerChoice,
  submitBuyerJourney,
  sellerStep,
  setSellerStep,
  sellerAnswers,
  setSellerAnswers,
  handleSellerChoice,
  submitSellerJourney,
  estimatedValue,
  invAmount,
  setInvAmount,
  invPeriod,
  setInvPeriod,
  invPropType,
  setInvPropType,
  investorForm,
  setInvestorForm,
  showInvResultForm,
  setShowInvResultForm,
  roiRes,
  submitInvestorForm,
  brokerForm,
  setBrokerForm,
  handleBrokerCheckbox,
  submitBrokerPortal,
  demands,
  ownerSearch,
  setOwnerSearch,
  isScanningMap,
  setIsScanningMap,
  ownerMatchesFound,
  setOwnerMatchesFound,
  scanningMessage,
  setScanningMessage,
  navigateTo,
  triggerToast,
  handleAddNewLead,
  onOpenAddDemand
}) {
  const isAr = lang === 'ar';

  const getPortalInfo = () => {
    switch (portalType) {
      case 'buy':
        return {
          badge: isAr ? 'دليل ومطابقة متطلبات المشترين المعتمد' : 'Verified Property Buyer Advisory',
          title: isAr ? 'اعثر على عقارك المثالي في سوهاج بمواصفاتك الخاصة' : 'Find Your Ideal Property in Sohag Tailored to You',
          subtitle: isAr ? 'حدد متطلباتك وميزانيتك وسنقوم بمطابقتها فورياً مع أفضل الوحدات والفرص المتاحة.' : 'Specify your preferences and budget for instant matching with top verified units.'
        };
      case 'sell':
      case 'valuation':
        return {
          badge: isAr ? 'منظومة التقييم العقاري المعتمدة بسوهاج 2026' : 'Sohag Certified Real Estate Valuation System',
          title: isAr ? 'بوابة تقييم وعرض العقار للبيع الفوري' : 'Property Valuation & Instant Listing Portal',
          subtitle: isAr ? 'احسب القيمة السوقية العادلة لعقارك واعرضه لأكثر من 500 مشترٍ ومستثمر جاد مجاناً وبدون عمولات على البائع.' : 'Calculate fair market value and showcase your property to 500+ ready buyers with zero seller fees.'
        };
      case 'investor':
        return {
          badge: isAr ? 'نادي 1Line لكبار المستثمرين (VIP)' : '1Line VIP Investors Club',
          title: isAr ? 'مركز الفرص الاستثمارية عالية العائد بسوهاج' : 'High-Yield Property Investment Center',
          subtitle: isAr ? 'محفظة حصرية من المشروعات التجارية والمقرات الإدارية بعوائد إيجارية تتجاوز 14% سنوياً.' : 'Exclusive commercial portfolios with projected rental yields exceeding 14% annually.'
        };
      case 'broker':
        return {
          badge: isAr ? 'شبكة الوسطاء والشركاء المعتمدين' : 'Certified Brokers & Partners Network',
          title: isAr ? 'انضم لشبكة شركاء 1Line العقارية' : 'Join 1Line Broker Partner Network',
          subtitle: isAr ? 'احصل على عمولات مجزية وتسهيلات حصرية وحوافز فورية على كل صفقة ناجحة.' : 'Access verified inventory, high commission rates, and instant closing bonuses.'
        };
      case 'demands':
        return {
          badge: isAr ? 'طلبات السوق العقاري الحية واللحظية' : 'Live Real Estate Market Demands',
          title: isAr ? 'طلبات حقيقية لمشترين يبحثون عن عقارات الآن' : 'Active Buyer Requests Looking for Sellers',
          subtitle: isAr ? 'تصفح طلبات الشراء الكاش الفورية وقدم عقارك للمطابقة والبيع السريع.' : 'Browse active cash buyers and match your property for fast closing.'
        };
      case 'vault':
        return {
          badge: isAr ? 'الخزينة العقارية السرية (VIP Vault)' : 'Off-Market Private Vault',
          title: isAr ? 'صفقات خاصة وحصرية غير معروضة للعامة' : 'Exclusive Off-Market Real Estate Deals',
          subtitle: isAr ? 'عقارات بأسعار استثنائية أقل من القيمة السوقية متاحة لكبار العملاء فقط برمز سري.' : 'Below-market investment opportunities accessible only with authorized PIN.'
        };
      case 'referral':
        return {
          badge: isAr ? 'برنامج المكافآت والإحالة العقارية' : 'Referral Rewards Program',
          title: isAr ? 'رشح مشترياً أو بائعاً واحصل على مكافأة نقدية فورية' : 'Refer a Buyer or Seller & Earn Cash Rewards',
          subtitle: isAr ? 'شارك رابط ترشيحك واكسب مكافآت تصاعدية عند إتمام أي صفقة عقارية.' : 'Share your referral code and earn instant bonuses on successful closings.'
        };
      case 'special':
        return {
          badge: isAr ? 'إدارة الطلبات والاستفسارات الخاصة' : 'Bespoke Inquiries & Special Demands',
          title: isAr ? 'طلب عقاري بمواصفات استثنائية خاصة' : 'Custom Real Estate Request',
          subtitle: isAr ? 'هل تبحث عن مقر لفرنشايز، أرض مجمع مدارس، أو برج سكني؟ فريقنا متخصص في تلبية الطلبات الكبرى.' : 'Looking for land plots, school zones, or mega franchises? Our acquisition team delivers.'
        };
      default:
        return {
          badge: isAr ? 'خدمات 1Line العقارية' : '1Line Real Estate Services',
          title: isAr ? 'البوابات العقارية المتخصصة' : 'Specialized Property Portals',
          subtitle: ''
        };
    }
  };

  const portalInfo = getPortalInfo();

  return (
    <div className="portal-page-wrapper">
      {/* Royal Navy Luxury Portal Hero Header */}
      <div className="portal-hero-section">
        <div className="portal-hero-container">
          <div className="portal-breadcrumbs">
            <Link to="/">{isAr ? 'الرئيسية' : 'Home'}</Link>
            {isAr ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
            <span>{portalInfo.title}</span>
          </div>

          <div className="portal-hero-badge">
            <Sparkles size={15} className="text-gold" />
            <span>{portalInfo.badge}</span>
          </div>

          <h1 className="portal-hero-title">{portalInfo.title}</h1>
          {portalInfo.subtitle && (
            <p className="portal-hero-subtitle">{portalInfo.subtitle}</p>
          )}
        </div>
      </div>

      {/* Main Interactive Wizard / Content Card */}
      <div className="portal-content-wrapper">
        <div className="portal-main-container">
          {portalType === 'buy' && (
            <BuyWizard
              lang={lang}
              t={t}
              buyerStep={buyerStep}
              setBuyerStep={setBuyerStep}
              buyerAnswers={buyerAnswers}
              setBuyerAnswers={setBuyerAnswers}
              handleBuyerChoice={handleBuyerChoice}
              submitBuyerJourney={submitBuyerJourney}
            />
          )}

          {(portalType === 'sell' || portalType === 'valuation') && (
            <SellWizard
              lang={lang}
              t={t}
              sellerStep={sellerStep}
              setSellerStep={setSellerStep}
              sellerAnswers={sellerAnswers}
              setSellerAnswers={setSellerAnswers}
              handleSellerChoice={handleSellerChoice}
              submitSellerJourney={submitSellerJourney}
              estimatedValue={estimatedValue}
              triggerToast={triggerToast}
            />
          )}

          {portalType === 'investor' && (
            <InvestorCenter
              lang={lang}
              t={t}
              invAmount={invAmount}
              setInvAmount={setInvAmount}
              invPeriod={invPeriod}
              setInvPeriod={setInvPeriod}
              invPropType={invPropType}
              setInvPropType={setInvPropType}
              investorForm={investorForm}
              setInvestorForm={setInvestorForm}
              showInvResultForm={showInvResultForm}
              setShowInvResultForm={setShowInvResultForm}
              roiRes={roiRes}
              submitInvestorForm={submitInvestorForm}
            />
          )}

          {portalType === 'broker' && (
            <BrokerPortal
              lang={lang}
              t={t}
              brokerForm={brokerForm}
              setBrokerForm={setBrokerForm}
              handleBrokerCheckbox={handleBrokerCheckbox}
              submitBrokerPortal={submitBrokerPortal}
            />
          )}

          {portalType === 'demands' && (
            <DemandsPortal
              lang={lang}
              t={t}
              demands={demands}
              ownerSearch={ownerSearch}
              setOwnerSearch={setOwnerSearch}
              isScanningMap={isScanningMap}
              setIsScanningMap={setIsScanningMap}
              ownerMatchesFound={ownerMatchesFound}
              setOwnerMatchesFound={setOwnerMatchesFound}
              scanningMessage={scanningMessage}
              setScanningMessage={setScanningMessage}
              navigateTo={navigateTo}
              setSellerAnswers={setSellerAnswers}
              triggerToast={triggerToast}
              handleAddNewLead={handleAddNewLead}
              onOpenAddDemand={onOpenAddDemand}
            />
          )}

          {portalType === 'vault' && (
            <VaultPortal
              lang={lang}
              t={t}
              triggerToast={triggerToast}
            />
          )}

          {portalType === 'referral' && (
            <ReferralPortal
              lang={lang}
              t={t}
              triggerToast={triggerToast}
            />
          )}

          {portalType === 'special' && (
            <SpecialRequests
              lang={lang}
              t={t}
              triggerToast={triggerToast}
            />
          )}
        </div>
      </div>
    </div>
  );
}
