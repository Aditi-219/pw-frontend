import './searchbar.css';

export default function SearchBar({
  placeholder = 'Search...',
  value = '',
  onChange,
  onSearch,
  className = '',
  disabled = false,
}) {
  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch?.(value);
  };

  return (
    <form
      className={`search-bar ${className}`.trim()}
      onSubmit={handleSubmit}
      role="search"
    >
      <span className="search-bar__icon" aria-hidden="true">
        🔍
      </span>
      <input
        type="search"
        className="search-bar__input"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        aria-label={placeholder}
      />
      {value && (
        <button
          type="button"
          className="search-bar__clear"
          onClick={() => onChange?.({ target: { value: '' } })}
          aria-label="Clear search"
        >
          ×
        </button>
      )}
    </form>
  );
}