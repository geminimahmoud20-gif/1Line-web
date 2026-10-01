import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy } from 'react';
import HomePage from './pages/HomePage';

// Home is eager (first paint); every other page loads on navigation
const AboutPage = lazy(() => import('./pages/AboutPage'));
const ClientAccountPage = lazy(() => import('./pages/ClientAccountPage'));
const CommercialHubPage = lazy(() => import('./pages/CommercialHubPage'));
const CrmPage = lazy(() => import('./pages/CrmPage'));
const FinancingPage = lazy(() => import('./pages/FinancingPage'));
const MarketIntelligencePage = lazy(() => import('./pages/MarketIntelligencePage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const PortalsPage = lazy(() => import('./pages/PortalsPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const PrivateOfficePage = lazy(() => import('./pages/PrivateOfficePage'));
const ProjectsPage = lazy(() => import('./pages/ProjectsPage'));
const PropertiesPage = lazy(() => import('./pages/PropertiesPage'));
const PropertyDetailPage = lazy(() => import('./pages/PropertyDetailPage'));
const TradeInPortal = lazy(() => import('./components/tradein/TradeInPortal'));

export default function AppRoutes({
  brokerForm,
  buyerAnswers,
  buyerStep,
  clearCompare,
  clearFavorites,
  compareList,
  crmAuthenticated,
  currency,
  demands,
  estimatedValue,
  favorites,
  handleAddAdminDemand,
  handleAddNewLead,
  handleAddProject,
  handleAddProperty,
  handleApproveDemand,
  handleBrokerCheckbox,
  handleBuyerChoice,
  handleCrmLogout,
  handleDeleteDemand,
  handleDeleteLead,
  handleDeleteProject,
  handleDeleteProperty,
  handleOpenQuickView,
  handleProtectedToggleCompare,
  handleProtectedToggleFavorite,
  handleSellerChoice,
  handleUnpublishDemand,
  handleUpdateDemand,
  handleUpdateLead,
  handleUpdateProject,
  handleUpdateProperty,
  invAmount,
  invPeriod,
  invPropType,
  investorForm,
  isScanningMap,
  lang,
  leads,
  navigate,
  ownerMatchesFound,
  ownerSearch,
  projects,
  properties,
  roiRes,
  scanningMessage,
  sellerAnswers,
  sellerStep,
  setAddDemandModalOpen,
  setBrokerForm,
  setBuyerAnswers,
  setBuyerStep,
  setCompareDrawerOpen,
  setCrmAuthenticated,
  setInvAmount,
  setInvPeriod,
  setInvPropType,
  setInvestorForm,
  setIsScanningMap,
  setLeads,
  setOwnerMatchesFound,
  setOwnerSearch,
  setScanningMessage,
  setSellerAnswers,
  setSellerStep,
  setShowInvResultForm,
  showInvResultForm,
  submitBrokerPortal,
  submitBuyerJourney,
  submitInvestorForm,
  submitSellerJourney,
  t,
  triggerToast
}) {
  return (
    <Routes>
      {/* 1. Home Page */}
      <Route
        path="/"
        element={
          <HomePage
            lang={lang}
            currency={currency}
            properties={properties}
            demands={demands}
            favorites={favorites}
            onToggleFavorite={handleProtectedToggleFavorite}
            compareList={compareList}
            onToggleCompare={handleProtectedToggleCompare}
            onQuickView={handleOpenQuickView}
            onOpenAddDemand={() => setAddDemandModalOpen(true)}
            onAddNewLead={handleAddNewLead}
            triggerToast={triggerToast}
          />
        }
      />

      {/* 2. Properties Catalog & Interactive Map */}
      <Route
        path="/properties"
        element={
          <PropertiesPage
            lang={lang}
            currency={currency}
            properties={properties}
            favorites={favorites}
            onToggleFavorite={handleProtectedToggleFavorite}
            compareList={compareList}
            onToggleCompare={handleProtectedToggleCompare}
            onQuickView={handleOpenQuickView}
          />
        }
      />

      {/* 3. Single Property Details Page */}
      <Route
        path="/properties/:id"
        element={
          <PropertyDetailPage
            lang={lang}
            currency={currency}
            t={t}
            properties={properties}
            favorites={favorites}
            onToggleFavorite={handleProtectedToggleFavorite}
            onQuickView={handleOpenQuickView}
            triggerToast={triggerToast}
            onAddNewLead={handleAddNewLead}
          />
        }
      />

      {/* 3.5. About 1Line & Leadership Page */}
      <Route
        path="/about"
        element={<AboutPage lang={lang} triggerToast={triggerToast} />}
      />
      <Route
        path="/about-us"
        element={<AboutPage lang={lang} triggerToast={triggerToast} />}
      />

      {/* 3.8. 1Line Private Office (Off-Market Portfolio) */}
      <Route
        path="/private-office"
        element={<PrivateOfficePage lang={lang} triggerToast={triggerToast} />}
      />
      <Route
        path="/off-market"
        element={<PrivateOfficePage lang={lang} triggerToast={triggerToast} />}
      />

      {/* 4. Financing & Mortgage Calculator Page */}
      <Route
        path="/financing"
        element={<FinancingPage lang={lang} t={t} />}
      />

      {/* 5. Specialized Business Portals & Wizards */}
      <Route
        path="/buy"
        element={
          <PortalsPage
            portalType="buy"
            lang={lang}
            t={t}
            buyerStep={buyerStep}
            setBuyerStep={setBuyerStep}
            buyerAnswers={buyerAnswers}
            setBuyerAnswers={setBuyerAnswers}
            handleBuyerChoice={handleBuyerChoice}
            submitBuyerJourney={submitBuyerJourney}
            triggerToast={triggerToast}
            handleAddNewLead={handleAddNewLead}
          />
        }
      />

      <Route
        path="/sell"
        element={
          <PortalsPage
            portalType="sell"
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
            handleAddNewLead={handleAddNewLead}
          />
        }
      />

      <Route
        path="/valuation"
        element={
          <PortalsPage
            portalType="valuation"
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
            handleAddNewLead={handleAddNewLead}
          />
        }
      />

      <Route
        path="/investor"
        element={
          <PortalsPage
            portalType="investor"
            lang={lang}
            currency={currency}
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
            triggerToast={triggerToast}
            handleAddNewLead={handleAddNewLead}
          />
        }
      />

      <Route
        path="/broker"
        element={
          <PortalsPage
            portalType="broker"
            lang={lang}
            t={t}
            brokerForm={brokerForm}
            setBrokerForm={setBrokerForm}
            handleBrokerCheckbox={handleBrokerCheckbox}
            submitBrokerPortal={submitBrokerPortal}
            triggerToast={triggerToast}
            handleAddNewLead={handleAddNewLead}
          />
        }
      />

      <Route
        path="/demands"
        element={
          <PortalsPage
            portalType="demands"
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
            navigateTo={(path) => navigate('/' + path)}
            setSellerAnswers={setSellerAnswers}
            triggerToast={triggerToast}
            handleAddNewLead={handleAddNewLead}
            onOpenAddDemand={() => setAddDemandModalOpen(true)}
          />
        }
      />

      <Route
        path="/vault"
        element={<Navigate to="/properties" replace />}
      />

      <Route
        path="/referral"
        element={
          <PortalsPage
            portalType="referral"
            lang={lang}
            t={t}
            triggerToast={triggerToast}
            handleAddNewLead={handleAddNewLead}
          />
        }
      />

      <Route
        path="/special"
        element={
          <PortalsPage
            portalType="special"
            lang={lang}
            t={t}
            triggerToast={triggerToast}
            handleAddNewLead={handleAddNewLead}
          />
        }
      />

      <Route
        path="/special-requests"
        element={
          <PortalsPage
            portalType="special"
            lang={lang}
            t={t}
            triggerToast={triggerToast}
            handleAddNewLead={handleAddNewLead}
          />
        }
      />

      {/* Mega Projects & Flagship Compounds Hub */}
      <Route
        path="/projects"
        element={
          <ProjectsPage
            lang={lang}
            currency={currency}
            projects={projects}
            triggerToast={triggerToast}
          />
        }
      />

      {/* Sohag Real Estate Market Intelligence & Price Benchmark */}
      <Route
        path="/market-intelligence"
        element={
          <MarketIntelligencePage
            lang={lang}
            currency={currency}
            triggerToast={triggerToast}
          />
        }
      />

      {/* 👤 Verified Client Account, Saved Favorites & Smart Comparisons Hub */}
      <Route
        path="/my-account"
        element={
          <ClientAccountPage
            properties={properties}
            favorites={favorites}
            onToggleFavorite={handleProtectedToggleFavorite}
            compareList={compareList}
            onToggleCompare={handleProtectedToggleCompare}
            onClearFavorites={clearFavorites}
            onClearCompare={clearCompare}
            onOpenCompare={() => setCompareDrawerOpen(true)}
            leads={leads}
            demands={demands}
            lang={lang}
            currency={currency}
          />
        }
      />

      <Route
        path="/favorites"
        element={<Navigate to="/my-account" replace />}
      />

      <Route
        path="/compare"
        element={<Navigate to="/my-account" replace />}
      />

      {/* CRM Admin Control Panel & Property CMS & Demands CMS */}
      <Route
        path="/crm"
        element={
          <CrmPage
            lang={lang}
            t={t}
            leads={leads}
            setLeads={setLeads}
            properties={properties}
            onAddProperty={handleAddProperty}
            onUpdateProperty={handleUpdateProperty}
            onDeleteProperty={handleDeleteProperty}
            projects={projects}
            onAddProject={handleAddProject}
            onUpdateProject={handleUpdateProject}
            onDeleteProject={handleDeleteProject}
            demands={demands}
            onAddDemand={handleAddAdminDemand}
            onApproveDemand={handleApproveDemand}
            onUpdateDemand={handleUpdateDemand}
            onDeleteDemand={handleDeleteDemand}
            onUnpublishDemand={handleUnpublishDemand}
            crmAuthenticated={crmAuthenticated}
            setCrmAuthenticated={setCrmAuthenticated}
            onLogout={handleCrmLogout}
            triggerToast={triggerToast}
            onUpdateLead={handleUpdateLead}
            onDeleteLead={handleDeleteLead}
            onAddNewLead={handleAddNewLead}
          />
        }
      />

      {/* Privacy policy & data handling */}
      {/* مركز الاستثمار الطبي والتجاري */}
      <Route
        path="/commercial-hub"
        element={
          <CommercialHubPage
            lang={lang}
            currency={currency}
            properties={properties}
            favorites={favorites}
            onToggleFavorite={handleProtectedToggleFavorite}
            compareList={compareList}
            onToggleCompare={handleProtectedToggleCompare}
            onQuickView={handleOpenQuickView}
          />
        }
      />

      {/* منصة البدل العقاري */}
      <Route
        path="/trade-in"
        element={
          <TradeInPortal
            lang={lang}
            properties={properties}
            onCreateLead={handleAddNewLead}
            triggerToast={triggerToast}
          />
        }
      />

      <Route path="/privacy" element={<PrivacyPage lang={lang} />} />
      <Route path="/terms" element={<Navigate to="/privacy" replace />} />

      {/* Unknown paths: real not-found view (served with HTTP 404 by Vercel) */}
      <Route path="*" element={<NotFoundPage lang={lang} />} />
    </Routes>
  );
}
