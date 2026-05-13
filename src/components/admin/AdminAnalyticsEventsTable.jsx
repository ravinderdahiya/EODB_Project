export default function AdminAnalyticsEventsTable({
  events,
  loading,
  error,
  page,
  pageSize,
  totalCount,
  onPageChange,
}) {
  const startIndex = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIndex = Math.min(startIndex + events.length - 1, totalCount);

  return (
    <article className="admin-card admin-table-card">
      <header className="admin-card__header">
        <div>
          <span className="eyebrow">Analytics Audit</span>
          <h3>Tracked Events</h3>
        </div>
      </header>

      <div className="admin-table-wrap">
        {loading ? (
          <div className="admin-placeholder-card" style={{ padding: "1.5rem" }}>
            Loading analytics events...
          </div>
        ) : error ? (
          <div className="admin-placeholder-card" style={{ padding: "1.5rem" }}>
            {error}
          </div>
        ) : (
          <>
            <div className="admin-table-pagination">
              <span>
                Showing {startIndex} - {endIndex} of {totalCount} entries
              </span>
              <div className="admin-table-pagination__actions">
                <button
                  type="button"
                  className="admin-table-pagination__button"
                  disabled={page <= 1}
                  onClick={() => onPageChange(page - 1)}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="admin-table-pagination__button"
                  disabled={endIndex >= totalCount}
                  onClick={() => onPageChange(page + 1)}
                >
                  Next
                </button>
              </div>
            </div>

            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Time</th>
                  <th scope="col">Type</th>
                  <th scope="col">Category</th>
                  <th scope="col">Action</th>
                  <th scope="col">Label</th>
                  <th scope="col">Page</th>
                  <th scope="col">User</th>
                  <th scope="col">Source</th>
                </tr>
              </thead>
              <tbody>
                {events.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ padding: "1rem", textAlign: "center" }}>
                      No analytics events found.
                    </td>
                  </tr>
                ) : (
                  events.map((entry, index) => (
                    <tr key={entry.id || index}>
                      <td>{startIndex + index}</td>
                      <td>{entry.timestamp}</td>
                      <td>{entry.eventType}</td>
                      <td>{entry.category}</td>
                      <td>{entry.action}</td>
                      <td>{entry.label}</td>
                      <td>{entry.page}</td>
                      <td>{entry.userId}</td>
                      <td>{entry.source}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </>
        )}
      </div>
    </article>
  );
}
