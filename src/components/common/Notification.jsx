import { useEffect } from 'react';
import './Notification.css';

const variants = ['success', 'error', 'warning', 'info'];

export default function Notification({
  message,
  title,
  variant = 'info',
  isVisible = false,
  onClose,
  duration = 5000,
  position = 'top-right', // top-right | top-left | bottom-right | bottom-left
}) {
  const v = variants.includes(variant) ? variant : 'info';

  useEffect(() => {
    if (!isVisible || !duration || !onClose) return undefined;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [isVisible, duration, onClose]);

  if (!isVisible) return null;

  const icons = {
    success: '✓',
    error: '✕',
    warning: '!',
    info: 'i',
  };

  return (
    <div
      className={`notification notification--${v} notification--${position}`}
      role="alert"
    >
      <span className="notification__icon">{icons[v]}</span>
      <div className="notification__content">
        {title && <strong className="notification__title">{title}</strong>}
        <p className="notification__message">{message}</p>
      </div>
      <button
        type="button"
        className="notification__close"
        onClick={onClose}
        aria-label="Dismiss notification"
      >
        ×
      </button>
    </div>
  );
}