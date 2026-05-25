import { useState } from "react";

export default function AdminFeedbackTable({
  feedbacks,
  loading,
  error,
  page,
  pageSize,
  totalCount,
  onPageChange,
}) {
  const [selectedMessage, setSelectedMessage] = useState(null);
  const startIndex = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIndex = Math.min(startIndex + feedbacks.length - 1, totalCount);

  const getShortMessage = (value, maxLength = 44) => {
    const text = `${value || ""}`.trim();
    if (text.length <= maxLength) return { shortText: text || "-", hasMore: false };
    return { shortText: `${text.slice(0, maxLength).trim()}...`, hasMore: true };
  };

  return (
    <article className="admin-card admin-table-card">
      <header className="admin-card__header">
        <div>
          <span className="eyebrow">User Input Log</span>
          <h3>Feedback History</h3>
        </div>
      </header>

      <div className="admin-table-wrap">
        {loading ? (
          <div className="admin-placeholder-card" style={{ padding: "1.5rem" }}>
            Loading feedback records...
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
                  <th scope="col">Name</th>
                  <th scope="col">Mobile</th>
                  <th scope="col">Email</th>
                  <th scope="col">Feedback</th>
                  <th scope="col">Page</th>
                  <th scope="col">User</th>
                  <th scope="col">IP</th>
                </tr>
              </thead>
              <tbody>
                {feedbacks.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ padding: "1rem", textAlign: "center" }}>
                      No feedback records found.
                    </td>
                  </tr>
                ) : (
                  feedbacks.map((entry, index) => (
                    <tr key={entry.id || index}>
                      <td>{startIndex + index}</td>
                      <td>{entry.timestamp}</td>
                      <td>{entry.name}</td>
                      <td>{entry.mobile}</td>
                      <td>{entry.email}</td>
                      <td>
                        <div className="admin-label-cell">
                          <span>{getShortMessage(entry.message).shortText}</span>
                          {getShortMessage(entry.message).hasMore ? (
                            <button
                              type="button"
                              className="admin-read-more-btn"
                              onClick={() => setSelectedMessage(entry.message)}
                            >
                              Read More
                            </button>
                          ) : null}
                        </div>
                      </td>
                      <td>{entry.pageUrl}</td>
                      <td>
                        <strong>{entry.userName}</strong>
                        <small>{entry.userId}</small>
                      </td>
                      <td>{entry.ipAddress}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {selectedMessage ? (
              <div
                className="admin-label-modal-backdrop"
                onClick={() => setSelectedMessage(null)}
              >
                <div
                  className="admin-label-modal"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="admin-label-modal__head">
                    <h4>Feedback Message</h4>
                    <button
                      type="button"
                      className="admin-table-pagination__button"
                      onClick={() => setSelectedMessage(null)}
                    >
                      Close
                    </button>
                  </div>
                  <pre className="admin-label-modal__content">{selectedMessage}</pre>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </article>
  );
}
