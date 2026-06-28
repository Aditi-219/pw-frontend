import { useState, useRef, useEffect } from 'react';
import './Dropdown.css';

export default function Dropdown({
  trigger,
  items = [],
  align = 'right', // left | right
  className = '',
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (item) => {
    if (item.disabled) return;
    item.onClick?.();
    setOpen(false);
  };

  return (
    <div className={`dropdown ${className}`.trim()} ref={ref}>
      <div
        className="dropdown__trigger"
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => e.key === 'Enter' && setOpen(!open)}
        role="button"
        tabIndex={0}
        aria-expanded={open}
        aria-haspopup="true"
      >
        {trigger}
      </div>
      {open && (
        <ul className={`dropdown__menu dropdown__menu--${align}`} role="menu">
          {items.map((item, index) => (
            <li key={item.id ?? index} role="none">
              {item.divider ? (
                <hr className="dropdown__divider" />
              ) : (
                <button
                  type="button"
                  role="menuitem"
                  className={`dropdown__item ${item.danger ? 'dropdown__item--danger' : ''} ${item.disabled ? 'dropdown__item--disabled' : ''}`}
                  onClick={() => handleSelect(item)}
                  disabled={item.disabled}
                >
                  {item.icon && <span className="dropdown__icon">{item.icon}</span>}
                  {item.label}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}