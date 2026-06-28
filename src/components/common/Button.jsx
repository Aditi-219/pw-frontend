import './Button.css';

const variants = ['primary', 'secondary', 'teal', 'accent', 'danger', 'ghost'];
const sizes = ['sm', 'md', 'lg'];

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  disabled = false,
  loading = false,
  className = '',
  ...props
}) {
  const v = variants.includes(variant) ? variant : 'primary';
  const s = sizes.includes(size) ? size : 'md';
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`btn btn--${v} btn--${s} ${className}`.trim()}
      {...props}
    >
      {loading ? <span className="btn__loader" /> : null}
      {children}
    </button>
  );
}