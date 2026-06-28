import { useNavigate } from 'react-router-dom';
import SearchBar from '../common/searchbar';
import './Topbar.css';

export default function Topbar({ user, onSearch, onLogout }) {
  const navigate = useNavigate();

  const goProfile = () => navigate('/profile');
  const goNotifications = () => navigate('/notifications');

  return (
    <header className="topbar">
      <SearchBar
        placeholder="Search merchants, users, loans... (Cmd+K)"
        onSearch={onSearch}
        className="topbar__search"
      />
      <div className="topbar__actions">
        <button
          type="button"
          className="topbar__icon-btn"
          title="Notifications"
          onClick={goNotifications}
          aria-label="Go to notifications"
        >
          🔔
        </button>

        <button
          type="button"
          className="topbar__user"
          onClick={goProfile}
          aria-label="Go to profile settings"
        >
          <div className="topbar__avatar">{user?.name?.charAt(0) || 'S'}</div>
          <div className="topbar__user-info">
            <span className="topbar__name">{user?.name || 'Super Admin'}</span>
            <span className="topbar__role">{user?.role || 'Super Admin'}</span>
          </div>
        </button>

        <button type="button" className="topbar__logout" onClick={onLogout}>
          Logout
        </button>
      </div>
    </header>
  );
}