import './Loader.css';

export default function Loader({
  size = 'md', // sm | md | lg
  text,
  fullPage = false,
  className = '',
}) {
  const content = (
    <div className={`loader loader--${size} ${className}`.trim()} role="status" aria-live="polite">
      <div className="loader__spinner" aria-hidden="true" />
      {text && <p className="loader__text">{text}</p>}
    </div>
  );

  if (fullPage) {
    return <div className="loader-overlay">{content}</div>;
  }

  return content;
}