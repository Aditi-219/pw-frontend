import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import PageWrapper from '../../components/layout/PageWrapper';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import SearchBar from '../../components/common/searchbar';
import Notification from '../../components/common/Notification';
import useNotification from '../../hooks/useNotification';
import { getErrorMessage } from '../../services/api';
import { globalSearch, getRecentSearches, saveSearch, deleteSavedSearch } from '../../services/profileService';
import './GlobalSearch.css';

const QUICK_COMMANDS = [
  { id: 'cmd-1', label: 'Approve last merchant', icon: '✓', action: '/merchants/kyc' },
  { id: 'cmd-2', label: 'Open audit log', icon: '🗂', action: '/audit-trail-explorer' },
  { id: 'cmd-3', label: 'Broadcast notice', icon: '📣', action: '/notifications' },
  { id: 'cmd-4', label: 'Trigger maintenance mode', icon: '🛠', action: '/system-health' },
];

// GET /admin/search and /admin/search/recent response shapes are
// undocumented. We expect results grouped by category (Merchants, Loans,
// etc.) with a navigable link — falling back to a flat "Results" bucket
// and the dashboard route if the API doesn't supply a link.
function mapResultItem(item) {
  return {
    id: item.id ?? `${item.category ?? 'result'}-${item.label ?? Math.random()}`,
    category: item.category ?? item.type ?? 'Results',
    label: item.label ?? item.name ?? item.title ?? String(item),
    sub: item.sub ?? item.subtitle ?? item.description ?? '',
    link: item.link ?? item.url ?? '/dashboard',
  };
}

export default function GlobalSearch() {
  const navigate = useNavigate();
  const { notification, notify, closeNotification } = useNotification();

  const [query, setQuery] = useState('');
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [recent, setRecent] = useState([]);
  const [pinned, setPinned] = useState([]); // backed by "saved" searches
  const inputRef = useRef(null);

  const fetchRecent = useCallback(async () => {
    try {
      const result = await getRecentSearches();
      setRecent(result.items.map(mapResultItem));
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to load recent searches.'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fetchRecent(); }, [fetchRecent]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
      if (e.key === 'Escape') setPaletteOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (paletteOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [paletteOpen]);

  // Debounced live search against the backend
  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      try {
        setSearching(true);
        const payload = await globalSearch(query.trim());
        const items = payload?.items ?? payload?.results ?? payload?.data ?? (Array.isArray(payload) ? payload : []);
        setResults(items.map(mapResultItem));
      } catch (err) {
        notify.error(getErrorMessage(err, 'Search failed.'));
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const grouped = useMemo(() => {
    const groups = {};
    results.forEach((r) => {
      groups[r.category] = groups[r.category] || [];
      groups[r.category].push(r);
    });
    return groups;
  }, [results]);

  const handleSelect = async (item) => {
    setPaletteOpen(false);
    setQuery('');
    navigate(item.link);
    // Saving the query (not the item) matches the backend's
    // POST /admin/search/save { query } contract, which records search
    // terms rather than individual result records.
    try {
      await saveSearch(item.label);
      fetchRecent();
    } catch {
      // non-critical — recent-tracking failure shouldn't block navigation
    }
  };

  const togglePin = async (item) => {
    const isPinned = pinned.some((p) => p.id === item.id);
    try {
      if (isPinned) {
        await deleteSavedSearch(item.id);
        setPinned((prev) => prev.filter((p) => p.id !== item.id));
      } else {
        await saveSearch(item.label);
        setPinned((prev) => [...prev, item]);
      }
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to update pinned search.'));
    }
  };

  return (
    <PageWrapper
      title="Global Search & Command Palette"
      subtitle="Universal search across merchants, loans, customers, users, and tickets"
    >
      <div className="global-search">
        <button type="button" className="gs-trigger" onClick={() => setPaletteOpen(true)}>
          <span className="gs-trigger__icon">🔍</span>
          <span className="gs-trigger__text">Search merchants, loans, customers, users, tickets…</span>
          <span className="gs-trigger__kbd">⌘K</span>
        </button>

        <div className="gs-grid">
          <Card title="Pinned Shortcuts" subtitle="Quick access to what you use most">
            <div className="gs-chip-list">
              {pinned.map((item) => (
                <button key={item.id} className="gs-chip" onClick={() => handleSelect(item)} type="button">
                  <Badge variant="purple">{item.category}</Badge>
                  <span>{item.label}</span>
                </button>
              ))}
              {pinned.length === 0 && <p className="gs-empty">No pinned shortcuts yet. Pin items from search results.</p>}
            </div>
          </Card>

          <Card title="Recent Items">
            <div className="gs-chip-list">
              {recent.map((item) => (
                <button key={item.id} className="gs-chip" onClick={() => handleSelect(item)} type="button">
                  <Badge variant="info">{item.category}</Badge>
                  <span>{item.label}</span>
                </button>
              ))}
              {recent.length === 0 && <p className="gs-empty">No recent searches yet.</p>}
            </div>
          </Card>
        </div>

        <Card title="Quick-Action Commands" subtitle="Run common Super Admin actions instantly">
          <div className="gs-command-grid">
            {QUICK_COMMANDS.map((cmd) => (
              <button key={cmd.id} className="gs-command-card" onClick={() => navigate(cmd.action)} type="button">
                <span className="gs-command-card__icon">{cmd.icon}</span>
                <span className="gs-command-card__label">{cmd.label}</span>
              </button>
            ))}
          </div>
        </Card>
      </div>

      {paletteOpen && (
        <div className="gs-overlay" onClick={() => setPaletteOpen(false)} role="presentation">
          <div className="gs-palette" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="gs-palette__search">
              <SearchBar
                placeholder="Search merchants, loans, customers, users, tickets…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="gs-palette__results">
              {!query.trim() && (
                <div className="gs-palette__section">
                  <span className="gs-palette__section-title">Recent</span>
                  {recent.map((item) => (
                    <div key={item.id} className="gs-palette__row" onClick={() => handleSelect(item)}>
                      <div className="gs-palette__row-main">
                        <Badge variant="info">{item.category}</Badge>
                        <span className="gs-palette__row-label">{item.label}</span>
                      </div>
                      <span className="gs-palette__row-sub">{item.sub}</span>
                    </div>
                  ))}
                  {recent.length === 0 && <div className="gs-palette__empty">No recent searches</div>}
                </div>
              )}

              {searching && <div className="gs-palette__empty">Searching…</div>}

              {!searching && query.trim() && Object.keys(grouped).length === 0 && (
                <div className="gs-palette__empty">No results for "{query}"</div>
              )}

              {!searching && Object.entries(grouped).map(([category, items]) => (
                <div key={category} className="gs-palette__section">
                  <span className="gs-palette__section-title">{category}</span>
                  {items.map((item) => (
                    <div key={item.id} className="gs-palette__row" onClick={() => handleSelect(item)}>
                      <div className="gs-palette__row-main">
                        <Badge variant="info">{item.category}</Badge>
                        <span className="gs-palette__row-label">{item.label}</span>
                      </div>
                      <div className="gs-palette__row-right">
                        <span className="gs-palette__row-sub">{item.sub}</span>
                        <button
                          className="gs-palette__pin"
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePin(item);
                          }}
                          type="button"
                        >
                          {pinned.some((p) => p.id === item.id) ? '★' : '☆'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="gs-palette__footer">
              <span><kbd>↵</kbd> select</span>
              <span><kbd>esc</kbd> close</span>
              <span><kbd>⌘K</kbd> toggle</span>
            </div>
          </div>
        </div>
      )}

      <Notification {...notification} onClose={closeNotification} />
    </PageWrapper>
  );
}
