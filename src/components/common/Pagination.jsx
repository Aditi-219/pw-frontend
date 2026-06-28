import './Pagination.css';

/**
 * Lightweight pagination control for list pages backed by the API.
 * Backend pagination params/response shape are NOT documented in the
 * OpenAPI spec (no `page`/`per_page`/meta schema present) — this
 * component is intentionally tolerant: it works off whatever
 * { page, totalPages, total } numbers the page-level service mapper
 * derives, defaulting to client-side paging if the API doesn't
 * paginate server-side. See module integration notes for details.
 */
export default function Pagination({
  page = 1,
  totalPages = 1,
  total,
  pageSize,
  onPageChange,
  disabled = false,
}) {
  if (totalPages <= 1) return null;

  const canPrev = page > 1 && !disabled;
  const canNext = page < totalPages && !disabled;

  return (
    <div className="pagination">
      <span className="pagination__summary">
        {total != null && pageSize
          ? `Page ${page} of ${totalPages} (${total} total)`
          : `Page ${page} of ${totalPages}`}
      </span>
      <div className="pagination__controls">
        <button
          type="button"
          className="pagination__btn"
          onClick={() => onPageChange(page - 1)}
          disabled={!canPrev}
        >
          ← Prev
        </button>
        <button
          type="button"
          className="pagination__btn"
          onClick={() => onPageChange(page + 1)}
          disabled={!canNext}
        >
          Next →
        </button>
      </div>
    </div>
  );
}
