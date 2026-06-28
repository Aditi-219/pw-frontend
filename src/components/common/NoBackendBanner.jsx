import './NoBackendBanner.css';

/**
 * Consistent banner for pages where the FinZ LMS API has no matching
 * endpoints at all (confirmed by checking every tag in the OpenAPI spec —
 * not just a missing one-off action). Used on the Risk and Loans modules.
 * The page below the banner keeps its original demo/mock behavior so the
 * UI remains explorable, but nothing here is wired to the live backend.
 */
export default function NoBackendBanner({ module = 'This module' }) {
  return (
    <div className="no-backend-banner" role="status">
      <span className="no-backend-banner__icon">⚠</span>
      <span>
        <strong>{module} has no backend endpoints yet.</strong> The data below is illustrative only —
        nothing on this page reads from or writes to the live API. Flagged for the backend team.
      </span>
    </div>
  );
}
