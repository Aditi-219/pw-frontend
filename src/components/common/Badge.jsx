import './Badge.css';
const variants = ['default', 'success', 'warning', 'danger', 'info', 'purple'];
export default function Badge({ children, variant = 'default', className = '' }) {
  return <span className={`badge badge--${variant} ${className}`}>{children}</span>;
}