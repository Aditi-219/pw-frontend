import './BarChart.css';

export default function BarChart({ title = 'Comparison', data = [], color = 'var(--color-primary)', showValues = true }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="bar-chart">
      {title && <h4 className="bar-chart__title">{title}</h4>}
      <div className="bar-chart__bars">
        {data.map((item) => (
          <div key={item.label} className="bar-chart__item">
            <div className="bar-chart__bar-wrap">
              <div
                className="bar-chart__bar"
                style={{ height: `${(item.value / max) * 100}%`, background: item.color || color }}
                title={`${item.label}: ${item.value}`}
              />
            </div>
            {showValues && <span className="bar-chart__value">{item.value}</span>}
            <span className="bar-chart__label">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}