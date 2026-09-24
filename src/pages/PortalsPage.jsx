import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ChevronLeft, ChevronRight, Zap, CheckCircle2 } from 'lucide-react';
import { BuyWizard } from '../components/BuyWizard';
import { SellWizard } from '../components/SellWizard';
import { InvestorCenter } from '../components/InvestorCenter';
import { BrokerPortal } from '../components/BrokerPortal';
import { DemandsPortal } from '../components/DemandsPortal';
import { ReferralPortal } from '../components/ReferralPortal';
import { SpecialRequests } from '../components/SpecialRequests';
import QuickPortalLeadCard from '../components/common/QuickPortalLeadCard';

export default function PortalsPage({
  portalType,
  lang,
  currency = 'EGP',
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
  const [fastMode, setFastMode] = useState(false);

  const getPortalInfo = () => {
    switch (portalType) {
      case 'buy':
        return {
          badge: isAr ? 'مطابقة شخصية للمشترين' : 'Personal buyer matching',
          title: isAr ? 'صف العقار الذي تبحث عنه، ونعود إليك بما يطابقه' : 'Describe what you need — we come back with matches',
          subtitle: isAr ? 'في سوهاج أو القاهرة الكبرى: حدد الغرض والمنطقة والميزانية، ويرسل لك مستشارك قائمة مختصرة بعد مراجعة مستنداتها.' : 'In Sohag or Greater Cairo: set purpose, area and budget; your advisor sends a short list with documents reviewed.'
        };
      case 'sell':
      case 'valuation':
        return {
          badge: isAr ? 'تقييم استرشادي خلال دقيقتين' : 'Indicative valuation in two minutes',
          title: isAr ? 'اعرف قيمة عقارك قبل أن تعرضه' : 'Know your property’s value before you list',
          subtitle: isAr ? 'احصل على نطاق سعري استرشادي لعقارك، ثم مراجعة ميدانية للمستندات وخطة عرض قبل أي تسويق.' : 'Get an indicative price range, then an on-site document review and a marketing plan before any listing.'
        };
      case 'investor':
        return {
          badge: isAr ? 'مركز المستثمرين' : '1Line VIP Investors Club',
          title: isAr ? 'دراسة عائد مبدئية قبل أن تستثمر' : 'A preliminary yield study before you invest',
          subtitle: isAr ? 'أصول سكنية وتجارية وأراضٍ في سوهاج والقاهرة الكبرى، مع تقدير للعائد الإيجاري وسيناريوهات الخروج. الأرقام تقديرية وتختلف حسب الأصل والسوق.' : 'Residential, commercial and land assets with estimated rental yield and exit scenarios. Figures are estimates and vary by asset and market.'
        };
      case 'broker':
        return {
          badge: isAr ? 'شراكة الوسطاء' : 'Broker partnership',
          title: isAr ? 'انضم لشبكة شركاء 1Line العقارية' : 'Join 1Line Broker Partner Network',
          subtitle: isAr ? 'تعاون معنا على صفقات موثقة بعمولة واضحة ومكتوبة قبل البدء.' : 'Access verified inventory, high commission rates, and instant closing bonuses.'
        };
      case 'demands':
        return {
          badge: isAr ? 'طلبات المشترين' : 'Live Real Estate Market Demands',
          title: isAr ? 'طلبات حقيقية لمشترين يبحثون عن عقارات الآن' : 'Active Buyer Requests Looking for Sellers',
          subtitle: isAr ? 'إن كان لديك عقار يطابق أحد هذه الطلبات، اعرضه ليصل مباشرة للمشتري.' : 'Browse active cash buyers and match your property for fast closing.'
        };
      case 'referral':
        return {
          badge: isAr ? 'برنامج المكافآت والإحالة العقارية' : 'Referral Rewards Program',
          title: isAr ? 'رشّح مالكاً أو مشترياً واحصل على مكافأة عند إتمام الصفقة' : 'Refer a Buyer or Seller & Earn Cash Rewards',
          subtitle: isAr ? 'تُصرف المكافأة بعد تسجيل الصفقة ووفق شروط مكتوبة نرسلها لك قبل الترشيح.' : 'Share your referral code and earn instant bonuses on successful closings.'
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
          {/* Frictionless Mode Toggle for Portals with Wizards */}
          {['buy', 'sell', 'valuation', 'investor'].includes(portalType) && (
            <div className="portal-mode-toggle-strip">
              <button
                type="button"
                className={`portal-mode-btn ${!fastMode ? 'active' : ''}`}
                onClick={() => setFastMode(false)}
              >
                <CheckCircle2 size={16} />
                <span>{isAr ? 'المعالج التفاعلي خطوة بخطوة' : 'Step-by-Step Advisory'}</span>
              </button>
              <button
                type="button"
                className={`portal-mode-btn ${fastMode ? 'active' : ''}`}
                onClick={() => setFastMode(true)}
              >
                <Zap size={16} className="text-gold" />
                <span>{isAr ? 'طلب سريع في خطوة واحدة' : 'One-step quick request'}</span>
              </button>
            </div>
          )}

          {/* ⚡ 1-Step Fast Request Mode */}
          {fastMode && ['buy', 'sell', 'valuation', 'investor'].includes(portalType) ? (
            <QuickPortalLeadCard
              portalType={portalType}
              lang={lang}
              handleAddNewLead={handleAddNewLead}
              triggerToast={triggerToast}
            />
          ) : (
            <>
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
                  currency={currency}
                  triggerToast={triggerToast}
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
            </>
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
