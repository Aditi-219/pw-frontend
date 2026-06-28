// src/components/layout/PageWrapper.jsx
import './PageWrapper.css';

export default function PageWrapper({ title, subtitle, actions, children }) {
  return (
    <div className="page-wrapper">
      {(title || actions) && (
        <div className="page-header">
          <div>
            {title && <h1 className="page-title">{title}</h1>}
            {subtitle && <p className="page-subtitle">{subtitle}</p>}
          </div>
          {actions && <div className="page-header__actions">{actions}</div>}
        </div>
      )}
      <div className="page-wrapper__content">{children}</div>
    </div>
  );
}