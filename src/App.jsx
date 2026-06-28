import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import './styles/index.css';
import './styles/components.css';

import Layout from './components/layout/Layout';
import PageWrapper from './components/layout/PageWrapper';
import Card from './components/common/Card';

// Command Center — Screens 06–08
import MasterDashboard from './pages/dashboard/MasterDashboard';
import SystemHealth from './pages/dashboard/SystemHealth';
import GlobalSearch from './pages/dashboard/GlobalSearch';

// Auth — Screens 01–03
import Login from './pages/auth/Login';
import MFAVerification from './pages/auth/MFAVerification';
import ForgotPassword from './pages/auth/ForgotPassword';

// Profile — Screens 04–05
import ProfileSettings from './pages/profile/ProfileSettings';
import NotificationCenter from './pages/profile/NotificationCenter';

// Users — Screens 09–13
import UserDirectory from './pages/users/UserDirectory';
import CreateEditUser from './pages/users/CreateEditUser';
import RoleManagement from './pages/users/RoleManagement';
import PermissionMatrix from './pages/users/PermissionMatrix';
import SessionManagement from './pages/users/SessionManagement';


// Merchants — Screens 14–19
import MerchantDirectory from './pages/merchants/MerchantDirectory';
import KYCReviewWorkspace from './pages/merchants/KYCReviewWorkspace';
import Merchant360Profile from './pages/merchants/Merchant360Profile';
import AgreementManagement from './pages/merchants/AgreementManagement';
import VerificationAPILogs from './pages/merchants/VerificationAPILogs';
import ReKYCSuspension from './pages/merchants/ReKYCSuspension';

// Stores — Screens 20–21
import StoreNetworkMap from './pages/stores/StoreNetworkMap';
import StoreDetailView from './pages/stores/StoreDetailView';

// Products — Screens 22–23
import MasterProductCatalog from './pages/products/MasterProductCatalog';
import CategoryBrandMaster from './pages/products/CategoryBrandMaster';

// Lenders — Screens 24–28
import LenderDirectory from './pages/lenders/LenderDirectory';
import LenderConfiguration from './pages/lenders/LenderConfiguration';
import WaterfallBuilder from './pages/lenders/WaterfallBuilder';
import LenderRuleEngine from './pages/lenders/LenderRuleEngine';
import LenderSLAMonitor from './pages/lenders/LenderSLAMonitor';

// Pricing & Offers — Screens 29–32
import EMIMasterConfig from './pages/pricing/EMIMasterConfig';
import TenureInterestSlabs from './pages/pricing/TenureInterestSlabs';
import OfferEngineBuilder from './pages/pricing/OfferEngineBuilder';
import OfferApprovalQueue from './pages/pricing/OfferApprovalQueue';

// Loan Management — Screens 33–37
import LoanApplicationMonitor from './pages/loans/LoanApplicationMonitor';
import LoanDetailTimeline from './pages/loans/LoanDetailTimeline';
import ManualOverrideConsole from './pages/loans/ManualOverrideConsole';
import DisbursalSettlementQueue from './pages/loans/DisbursalSettlementQueue';
import CollectionsBounceManagement from './pages/loans/CollectionsBounceManagement';

// Phase 9 — Risk & Fraud — Screens 38–41
import FraudAlertFeed from './pages/risk/FraudAlertFeed';
import BlacklistManager from './pages/risk/BlacklistManager';
import VelocityRiskRules from './pages/risk/VelocityRiskRules';
import ManualReviewQueue from './pages/risk/ManualReviewQueue';

// Phase 10 — Compliance & Audit — Screens 42–44
import AuditTrailExplorer from './pages/compliance/AuditTrailExplorer';
import ConsentLogViewer from './pages/compliance/ConsentLogViewer';
import ComplianceReportsExports from './pages/compliance/ComplianceReportsExports';

// Phase 11 — Analytics & Business Intelligence — Screens 45–48
import BusinessAnalyticsDashboard from './pages/analytics/BusinessAnalyticsDashboard';
import LenderLoanAnalytics from './pages/analytics/LenderLoanAnalytics';
import SalesRegionAnalytics from './pages/analytics/SalesRegionAnalytics';
import CustomReportBuilder from './pages/analytics/CustomReportBuilder';

// Phase 12 — Notifications & Document Management — Screens 49–51
import NotificationTemplateManager from './pages/notifications/NotificationTemplateManager';
import CommunicationLogs from './pages/notifications/CommunicationLogs';
import DocumentRepository from './pages/notifications/DocumentRepository';

// Phase 13 — System & Integrations — Screens 52–55
import WorkflowBuilder from './pages/system/WorkflowBuilder';
import ThirdPartyIntegrations from './pages/system/ThirdPartyIntegrations';
import FeatureFlagsABTests from './pages/system/FeatureFlagsABTests';
import SystemParametersSettings from './pages/system/SystemParametersSettings';

// Phase 14 — Support & Helpdesk — Screens 56–57
import MasterTicketQueue from './pages/support/MasterTicketQueue';
import TicketDetailSLATracking from './pages/support/TicketDetailSLATracking';

import api from './services/api';

// ─── Auth helpers ───────────────────────────────────────────
function isAuthenticated() {
  return localStorage.getItem('finz_authenticated') === 'true';
}

function logout() {
  // Best-effort server-side logout; we clear local state regardless so the
  // user is never stuck unable to log out just because this call failed
  // (e.g. expired token, network issue).
  api.post('/auth/logout').catch(() => {});

  localStorage.removeItem('finz_authenticated');
  localStorage.removeItem('finz_remember_device');
  localStorage.removeItem('finz_trusted_mfa');
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
  localStorage.removeItem('user_email');
}

// ─── Route guards ───────────────────────────────────────────
function ProtectedRoute({ children }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function PublicRoute({ children }) {
  if (isAuthenticated()) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

// ─── Placeholder for screens not built yet (06–08) ──────────
function ComingSoon({ title, subtitle, screen }) {
  return (
    <PageWrapper title={title} subtitle={subtitle}>
      <Card title={`Screen ${screen} — Coming in Phase 1`}>
        <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>
          This screen will be implemented next. Navigation and routing are already wired.
        </p>
      </Card>
    </PageWrapper>
  );
}

// ─── Layout wrapper with user + logout ──────────────────────
function getStoredUser() {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      name: parsed.name ?? 'Super Admin',
      role: parsed.role ?? 'Super Admin',
      email: parsed.email ?? localStorage.getItem('user_email') ?? '',
    };
  } catch {
    return null;
  }
}

function AppLayout() {
  const navigate = useNavigate();

  const user = getStoredUser() ?? {
    name: 'Super Admin',
    role: 'Super Admin',
    email: 'admin@finz.com',
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return <Layout user={user} onLogout={handleLogout} />;
}

// ─── App ────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public auth routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/mfa"
          element={
            <PublicRoute>
              <MFAVerification />
            </PublicRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <PublicRoute>
              <ForgotPassword />
            </PublicRoute>
          }
        />

        {/* Protected app routes */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          {/* Command Center — Screens 06–08 */}
          <Route path="/dashboard" element={<MasterDashboard />} />
          <Route path="/system-health" element={<SystemHealth />} />
          <Route path="/global-search" element={<GlobalSearch />} />

          {/* Merchants — Screens 14–19 */}
          <Route path="/merchants" element={<MerchantDirectory />} />
          <Route path="/merchants/kyc" element={<KYCReviewWorkspace />} />
          <Route path="/merchants/profile/:id" element={<Merchant360Profile />} />
          <Route path="/merchants/agreements" element={<AgreementManagement />} />
          <Route path="/merchants/verification-logs" element={<VerificationAPILogs />} />
          <Route path="/merchants/rekyc-suspension" element={<ReKYCSuspension />} />

          {/* Stores — Screens 20–21 */}
          <Route path="/stores/map" element={<StoreNetworkMap />} />
          <Route path="/stores/:id" element={<StoreDetailView />} />

          {/* Products — Screens 22–23 */}
          <Route path="/products/catalog" element={<MasterProductCatalog />} />
          <Route path="/products/category-brand" element={<CategoryBrandMaster />} />

          {/* Lenders — Screens 24–28 */}
          <Route path="/lenders" element={<LenderDirectory />} />
          <Route path="/lenders/config" element={<LenderConfiguration />} />
          <Route path="/lenders/waterfall" element={<WaterfallBuilder />} />
          <Route path="/lenders/rules" element={<LenderRuleEngine />} />
          <Route path="/lenders/sla" element={<LenderSLAMonitor />} />

          {/* Pricing & Offers — Screens 29–32 */}
          <Route path="/pricing/emi" element={<EMIMasterConfig />} />
          <Route path="/pricing/slabs" element={<TenureInterestSlabs />} />
          <Route path="/pricing/offers/builder" element={<OfferEngineBuilder />} />
          <Route path="/pricing/offers/approval" element={<OfferApprovalQueue />} />

          {/* Phase 8 — Loan & Disbursal Management — Screens 33–37 */}
          <Route path="/loan-application-monitor" element={<LoanApplicationMonitor />} />
          <Route path="/loan-detail-timeline" element={<LoanDetailTimeline />} />
          <Route path="/manual-override-console" element={<ManualOverrideConsole />} />
          <Route path="/disbursal-settlement-queue" element={<DisbursalSettlementQueue />} />
          <Route path="/collections-bounce-management" element={<CollectionsBounceManagement />} />

          {/* Phase 9 — Risk & Fraud — Screens 38–41 */}
          <Route path="/fraud-alert-feed" element={<FraudAlertFeed />} />
          <Route path="/blacklist-manager" element={<BlacklistManager />} />
          <Route path="/velocity-risk-rules" element={<VelocityRiskRules />} />
          <Route path="/manual-review-queue" element={<ManualReviewQueue />} />

          {/* Phase 10 — Compliance & Audit — Screens 42–44 */}
          <Route path="/audit-trail-explorer" element={<AuditTrailExplorer />} />
          <Route path="/consent-log-viewer" element={<ConsentLogViewer />} />
          <Route path="/compliance-reports-exports" element={<ComplianceReportsExports />} />

          {/* Phase 11 — Analytics & Business Intelligence — Screens 45–48 */}
          <Route path="/business-analytics-dashboard" element={<BusinessAnalyticsDashboard />} />
          <Route path="/lender-loan-analytics" element={<LenderLoanAnalytics />} />
          <Route path="/sales-region-analytics" element={<SalesRegionAnalytics />} />
          <Route path="/custom-report-builder" element={<CustomReportBuilder />} />

          {/* Phase 12 — Notifications & Document Management — Screens 49–51 */}
          <Route path="/notification-template-manager" element={<NotificationTemplateManager />} />
          <Route path="/communication-logs" element={<CommunicationLogs />} />
          <Route path="/document-repository" element={<DocumentRepository />} />

          {/* Phase 13 — System & Integrations — Screens 52–55 */}
          <Route path="/workflow-builder" element={<WorkflowBuilder />} />
          <Route path="/third-party-integrations" element={<ThirdPartyIntegrations />} />
          <Route path="/feature-flags-ab-tests" element={<FeatureFlagsABTests />} />
          <Route path="/system-parameters-settings" element={<SystemParametersSettings />} />

          {/* Phase 14 — Support & Helpdesk — Screens 56–57 */}
          <Route path="/master-ticket-queue" element={<MasterTicketQueue />} />
          <Route path="/ticket-detail-sla-tracking" element={<TicketDetailSLATracking />} />

          {/* Profile — Screens 04–05 */}
          <Route path="/profile" element={<ProfileSettings />} />
          <Route path="/notifications" element={<NotificationCenter />} />

          {/* Users — Screens 09–13 */}
          <Route path="/users" element={<UserDirectory />} />
          <Route path="/users/create" element={<CreateEditUser />} />
          <Route path="/users/edit/:id" element={<CreateEditUser />} />
          <Route path="/users/roles" element={<RoleManagement />} />
          <Route path="/users/permissions" element={<PermissionMatrix />} />
          <Route path="/users/sessions" element={<SessionManagement />} />
        </Route>

        {/* Default redirects */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}