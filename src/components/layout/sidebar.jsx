import { NavLink } from 'react-router-dom';
import './sidebar.css';

const navGroups = [
  {
    label: 'Command Center',
    items: [
      { to: '/dashboard', label: 'Master Dashboard', icon: '', end: true },
      { to: '/system-health', label: 'System Health', icon: '' },
      { to: '/global-search', label: 'Global Search', icon: '' },
    ],
  },
  {
    label: 'Users & Access',
    items: [
      { to: '/users', label: 'User Directory', icon: '', end: true },
      { to: '/users/create', label: 'Create User', icon: '' },
      { to: '/users/roles', label: 'Role Management', icon: '' },
      { to: '/users/permissions', label: 'Permission Matrix', icon: '' },
      { to: '/users/sessions', label: 'Sessions', icon: '' },
    ],
  },
  {
    label: 'Merchant Lifecycle',
    items: [
      { to: '/merchants', label: 'Merchant Directory', icon: '', end: true },
      { to: '/merchants/kyc', label: 'KYC Review Workspace', icon: '' },
      { to: '/merchants/agreements', label: 'Agreement Management', icon: '' },
      { to: '/merchants/verification-logs', label: 'Verification API Logs', icon: '' },
      { to: '/merchants/rekyc-suspension', label: 'Re-KYC & Suspension', icon: '' },
    ],
  },
  {
    label: 'Stores & Products',
    items: [
      { to: '/stores/map', label: 'Store Network Map', icon: '' },
      { to: '/products/catalog', label: 'Master Product Catalog', icon: '' },
      { to: '/products/category-brand', label: 'Category & Brand Master', icon: '' },
    ],
  },
  {
    label: 'Lender Operations',
    items: [
      { to: '/lenders', label: 'Lender Directory', icon: '', end: true },
      { to: '/lenders/config', label: 'Lender Configuration', icon: '' },
      { to: '/lenders/waterfall', label: 'Waterfall Builder', icon: '' },
      { to: '/lenders/rules', label: 'Lender Rule Engine', icon: '' },
      { to: '/lenders/sla', label: 'Lender SLA Monitor', icon: '' },
    ],
  },
  {
    label: 'Pricing & Offers',
    items: [
      { to: '/pricing/emi', label: 'EMI Master Config', icon: '' },
      { to: '/pricing/slabs', label: 'Tenure & Slabs', icon: '' },
      { to: '/pricing/offers/builder', label: 'Offer Builder', icon: '' },
      { to: '/pricing/offers/approval', label: 'Offer Approval Queue', icon: '' },
    ],
  },
  {
    label: 'Loan & Disbursal Management',
    items: [
      { to: '/loan-application-monitor', label: 'Loan Application Monitor', icon: '', end: true },
      { to: '/loan-detail-timeline', label: 'Loan Detail & Timeline', icon: '' },
      { to: '/manual-override-console', label: 'Manual Override Console', icon: '' },
      { to: '/disbursal-settlement-queue', label: 'Disbursal & Settlement Queue', icon: '' },
      { to: '/collections-bounce-management', label: 'Collections & Bounce Management', icon: '' },
    ],
  },
  {
    label: 'Risk & Fraud',
    items: [
      { to: '/fraud-alert-feed', label: 'Fraud Alert Feed', icon: '', end: true },
      { to: '/blacklist-manager', label: 'Blacklist Manager', icon: '' },
      { to: '/velocity-risk-rules', label: 'Velocity & Risk Rules', icon: '' },
      { to: '/manual-review-queue', label: 'Manual Review Queue', icon: '' },
    ],
  },
  {
    label: 'Compliance & Audit',
    items: [
      { to: '/audit-trail-explorer', label: 'Audit Trail Explorer', icon: '', end: true },
      { to: '/consent-log-viewer', label: 'Consent Log Viewer', icon: '' },
      { to: '/compliance-reports-exports', label: 'Compliance Reports & Exports', icon: '' },
    ],
  },
  {
    label: 'Analytics & Business Intelligence',
    items: [
      { to: '/business-analytics-dashboard', label: 'Business Analytics Dashboard', icon: '', end: true },
      { to: '/lender-loan-analytics', label: 'Lender & Loan Analytics', icon: '' },
      { to: '/sales-region-analytics', label: 'Sales & Region Analytics', icon: '' },
      { to: '/custom-report-builder', label: 'Custom Report Builder', icon: '' },
    ],
  },
  {
    label: 'Notifications & Document Management',
    items: [
      { to: '/notification-template-manager', label: 'Notification Template Manager', icon: '', end: true },
      { to: '/communication-logs', label: 'Communication Logs', icon: '' },
      { to: '/document-repository', label: 'Document Repository', icon: '' },
    ],
  },
  {
    label: 'System & Integrations',
    items: [
      { to: '/workflow-builder', label: 'Workflow Builder', icon: '', end: true },
      { to: '/third-party-integrations', label: 'Third-Party Integration Switchboard', icon: '' },
      { to: '/feature-flags-ab-tests', label: 'Feature Flags & A/B Tests', icon: '' },
      { to: '/system-parameters-settings', label: 'System Parameters & Settings', icon: '' },
    ],
  },
  {
    label: 'Support & Helpdesk',
    items: [
      { to: '/master-ticket-queue', label: 'Master Ticket Queue', icon: '', end: true },
      { to: '/ticket-detail-sla-tracking', label: 'Ticket Detail & SLA Tracking', icon: '' },
    ],
  },
  {
    label: 'Account',
    items: [
      { to: '/profile', label: 'Profile Settings', icon: '' },
      { to: '/notifications', label: 'Notifications', icon: '' },
    ],
  },
];

export default function Sidebar({ collapsed, onToggle }) {
  return (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
      <div className="sidebar__brand">
        <img src="/logo.png" alt="FinZ" className="sidebar__logo" />
      </div>
      <nav className="sidebar__nav">
        {navGroups.map((group) => (
          <div key={group.label} className="sidebar__group">
            {!collapsed && <span className="sidebar__group-label">{group.label}</span>}
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {group.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
                    }
                  >
                    <span className="sidebar__icon">{item.icon}</span>
                    {!collapsed && <span>{item.label}</span>}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <button type="button" className="sidebar__toggle" onClick={onToggle} aria-label="Toggle sidebar">
        {collapsed ? '→' : '←'}
      </button>
    </aside>
  );
}