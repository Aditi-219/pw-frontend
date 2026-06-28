import './StatCard.css';
import Badge from '../common/Badge';

export default function StatCard({
  label,
  value,
  change,
  changeType = 'up',
  icon,
  accent = 'primary',
  subtitle,
}) {
  return (
    <div className={`kpi-stat-card kpi-stat-card--${accent}`}>
      <div className="kpi-stat-card__top">
        <span className="kpi-stat-card__label">{label}</span>
        {icon && <span className="kpi-stat-card__icon">{icon}</span>}
      </div>
      <div className="kpi-stat-card__value">{value}</div>
      {subtitle && <p className="kpi-stat-card__subtitle">{subtitle}</p>}
      {change != null && (
        <Badge variant={changeType === 'up' ? 'success' : changeType === 'down' ? 'danger' : 'warning'}>
          {changeType === 'up' ? '↑' : changeType === 'down' ? '↓' : '•'} {change}
        </Badge>
      )}
    </div>
  );
}