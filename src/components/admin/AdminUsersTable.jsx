import { Search } from "lucide-react";

export default function AdminUsersTable({
  users,
  loading,
  error,
  page,
  pageSize,
  searchTerm,
  totalCount,
  onPageChange,
  onSearchChange,
}) {
  const startIndex = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIndex = Math.min(startIndex + users.length - 1, totalCount);

  return (
    <article className="admin-card admin-table-card">
      <header className="admin-card__header">
        <div>
          <span className="eyebrow">User Directory</span>
          <h3>Registered Users</h3>
        </div>

        <label className="admin-users-search">
          <Search size={15} />
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search by name, email, mobile, or role"
            aria-label="Search users"
          />
        </label>
      </header>

      <div className="admin-table-wrap">
        {loading ? (
          <div className="admin-placeholder-card" style={{ padding: "1.5rem" }}>
            Loading users...
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
                  <th scope="col">Mobile</th>
                  <th scope="col">Role</th>
                  <th scope="col">Created</th>
                  <th scope="col">Last Login</th>
                  <th scope="col">Login IP</th>
                  <th scope="col">Attempts</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan="10" style={{ padding: "1rem", textAlign: "center" }}>
                      No users found.
                    </td>
                  </tr>
                ) : (
                  users.map((entry, index) => (
                    <tr key={entry.id || index}>
                      <td>{startIndex + index}</td>
                      <td>
                        <strong>{entry.name}</strong>
                        <small>{entry.userId}</small>
                      </td>
                      <td>{entry.email}</td>
                      <td>{entry.mobile}</td>
                      <td>{entry.role}</td>
                      <td>{entry.createdAt}</td>
                      <td>{entry.lastLoginAt}</td>
                      <td>{entry.lastLoginIp}</td>
                      <td>{entry.loginAttempts}</td>
                      <td>
                        <span className={`admin-status ${entry.isLocked ? "admin-status--failed" : "admin-status--success"}`}>
                          {entry.status}
                        </span>
                      </td>
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
