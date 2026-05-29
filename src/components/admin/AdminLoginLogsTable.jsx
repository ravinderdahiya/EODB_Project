import { useState } from "react";

const DEVICE_PREVIEW_LIMIT = 30;

const getSafeDeviceText = (value) => {
  const text = String(value || "").trim();
  return text || "-";
};

export default function AdminLoginLogsTable({ logs, loading, error, page, pageSize, totalCount, onPageChange }) {
  const [expandedDeviceRows, setExpandedDeviceRows] = useState({});
  const startIndex = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIndex = Math.min(startIndex + logs.length - 1, totalCount);

  const toggleDeviceRow = (rowKey) => {
    setExpandedDeviceRows((prev) => ({
      ...prev,
      [rowKey]: !prev[rowKey],
    }));
  };

  return (
    <article className="admin-card admin-table-card">
      <header className="admin-card__header">
        <div>
          <span className="eyebrow">Security Audit</span>
          <h3>Login Logs</h3>
        </div>
      </header>

      <div className="admin-table-wrap">
        {loading ? (
          <div className="admin-placeholder-card" style={{ padding: "1.5rem" }}>
            Loading login logs...
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
                  <th scope="col">User</th>
                  <th scope="col">Email</th>
                  <th scope="col">Role</th>
                  <th scope="col">Login Time</th>
                  <th scope="col">IP Address</th>
                  <th scope="col">Device</th>
                  <th scope="col">Mobile</th>
                  <th scope="col">City</th>
                  <th scope="col">Country</th>
                  <th scope="col">Coordinates</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan="12" style={{ padding: "1rem", textAlign: "center" }}>
                      No login logs found.
                    </td>
                  </tr>
                ) : (
                  logs.map((entry, index) => {
                    const rowKey = entry.id ? `${entry.id}-${index}` : `row-${index}`;
                    const deviceText = getSafeDeviceText(entry.device);
                    const isLongDeviceText = deviceText.length > DEVICE_PREVIEW_LIMIT;
                    const isExpanded = Boolean(expandedDeviceRows[rowKey]);
                    const displayDeviceText = isExpanded || !isLongDeviceText
                      ? deviceText
                      : `${deviceText.slice(0, DEVICE_PREVIEW_LIMIT)}...`;

                    return (
                    <tr key={rowKey}>
                      <td>{startIndex + index}</td>
                      <td>
                        <strong>{entry.name}</strong>
                        <small>{entry.userId}</small>
                      </td>
                      <td>{entry.email}</td>
                      <td>{entry.role}</td>
                      <td>{entry.timestamp}</td>
                      <td>{entry.ipAddress}</td>
                      <td>
                        <div className="admin-log-device">
                          <span
                            className={`admin-log-device__text${isExpanded ? " admin-log-device__text--expanded" : ""}`}
                            title={deviceText}
                          >
                            {displayDeviceText}
                          </span>
                          {isLongDeviceText ? (
                            <button
                              type="button"
                              className="admin-log-device__toggle"
                              onClick={() => toggleDeviceRow(rowKey)}
                            >
                              {isExpanded ? "Read less" : "Read more"}
                            </button>
                          ) : null}
                        </div>
                      </td>
                      <td>{entry.mobile || "-"}</td>
                      <td>{entry.city || "-"}</td>
                      <td>{entry.country || "-"}</td>
                      <td>{entry.coordinates}</td>
                      <td>
                        <span className={`admin-status admin-status--${entry.status.toLowerCase()}`}>
                          {entry.status}
                        </span>
                      </td>
                    </tr>
                  )})
                )}
              </tbody>
            </table>
          </>
        )}
      </div>
    </article>
  );
}
