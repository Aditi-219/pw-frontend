import { useState } from 'react';
import './LineChart.css';

export default function LineChart({
  title = 'Trend',
  data = [],
  labels = [],
  height = 220,
  color = 'var(--color-teal)',
  periods = ['7d', '30d', '90d'],
  onPeriodChange,
}) {
  const [period, setPeriod] = useState(periods[0]);
  const max = Math.max(...data, 1);
  const points = data
    .map((v, i) => {
      const x = (i / Math.max(data.length - 1, 1)) * 100;
      const y = 100 - (v / max) * 90 - 5;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="line-chart">
      <div className="line-chart__header">
        <h4 className="line-chart__title">{title}</h4>
        <div className="line-chart__periods">
          {periods.map((p) => (
            <button
              key={p}
              type="button"
              className={`line-chart__period ${period === p ? 'line-chart__period--active' : ''}`}
              onClick={() => { setPeriod(p); onPeriodChange?.(p); }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
      <div className="line-chart__canvas" style={{ height }}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="line-chart__svg">
          {[25, 50, 75].map((y) => (
            <line key={y} x1="0" y1={y} x2="100" y2={y} className="line-chart__grid" />
          ))}
          <polyline fill="none" stroke={color} strokeWidth="2.5" points={points} />
        </svg>
      </div>
      {labels.length > 0 && (
        <div className="line-chart__labels">
          {labels.map((l) => <span key={l}>{l}</span>)}
        </div>
      )}
    </div>
  );
}