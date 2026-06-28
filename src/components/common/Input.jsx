import './Input.css';

export default function Input({
  label,
  error,
  hint,
  type = 'text',
  className = '',
  ...props
}) {
  return (
    <div className={`input-group ${className}`}>
      {label && <label className="input-group__label">{label}</label>}
      <input type={type} className={`input-group__input ${error ? 'input-group__input--error' : ''}`} {...props} />
      {hint && !error && <span className="input-group__hint">{hint}</span>}
      {error && <span className="input-group__error">{error}</span>}
    </div>
  );
}