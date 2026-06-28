// src/components/layout/Layout.jsx
import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './sidebar';
import Topbar from './Topbar';
import ErrorBoundary from '../common/ErrorBoundary';
import './Layout.css';

export default function Layout({ user, onLogout }) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <div className={`app-layout ${collapsed ? 'app-layout--collapsed' : ''}`}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <div className="app-layout__main">
        <Topbar user={user} onLogout={onLogout} />
        <main className="app-layout__content">
          {/* key={location.pathname} forces the boundary to reset its
              error state automatically when navigating to a different
              page, so a crash on one screen doesn't lock out the rest
              of the app. */}
          <ErrorBoundary key={location.pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}