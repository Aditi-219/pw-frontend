import './Tabs.css';

export default function Tabs({ tabs = [], active, onChange, className = '' }) {
  return (
    <div className={`tabs ${className}`.trim()} role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          className={`tabs__tab ${active === tab.id ? 'tabs__tab--active' : ''}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
          {tab.count != null && (
            <span className="tabs__count">{tab.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}