import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Edit3,
  Eye,
  Filter,
  Phone,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import {
  createVipUser,
  deleteVipUser,
  fetchVipUsers,
  toggleVipUserStatus,
  updateVipUser,
} from "@/services/vipUserService";

const initialFormState = {
  mobile: "",
  notes: "",
  isActive: true,
};

const formatDateTime = (value) => {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "-";
  }
};

const normalizeMobileInput = (value) => value.replace(/\D/g, "").slice(-10);

export default function AdminVipUsersManager() {
  const [vipUsers, setVipUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState(initialFormState);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const loadVipUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchVipUsers();
      const rows = res.data || [];
      setVipUsers(rows);
      if (rows.length && !selectedUser) {
        setSelectedUser(rows[0]);
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to fetch VIP users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVipUsers();
  }, []);

  const activeCount = useMemo(
    () => vipUsers.filter((item) => item.isActive).length,
    [vipUsers],
  );
  const inactiveCount = Math.max(vipUsers.length - activeCount, 0);

  const filteredVipUsers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return vipUsers.filter((item) => {
      const statusMatch =
        statusFilter === "all"
        || (statusFilter === "active" && item.isActive)
        || (statusFilter === "inactive" && !item.isActive);

      if (!statusMatch) return false;
      if (!query) return true;

      return [item.mobile, item.notes]
        .filter(Boolean)
        .some((value) => `${value}`.toLowerCase().includes(query));
    });
  }, [vipUsers, searchTerm, statusFilter]);

  useEffect(() => {
    if (!selectedUser?.id) return;
    const stillVisible = filteredVipUsers.some((item) => item.id === selectedUser.id);
    if (!stillVisible) {
      setSelectedUser(filteredVipUsers[0] || null);
    }
  }, [filteredVipUsers, selectedUser?.id]);

  const resetForm = () => {
    setFormData(initialFormState);
    setEditingId(null);
    setFormError(null);
  };

  const handleSelectUser = (vipUser) => {
    setSelectedUser(vipUser);
    setEditingId(null);
    setFormData(initialFormState);
    setFormError(null);
  };

  const handleEdit = (vipUser) => {
    setEditingId(vipUser.id);
    setFormData({
      mobile: normalizeMobileInput(vipUser.mobile || ""),
      notes: vipUser.notes || "",
      isActive: vipUser.isActive ?? true,
    });
    setSelectedUser(vipUser);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this VIP number? This cannot be undone.")) {
      return;
    }

    try {
      setLoading(true);
      await deleteVipUser(id);
      await loadVipUsers();
      if (selectedUser?.id === id) {
        setSelectedUser(null);
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to delete VIP number.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      setLoading(true);
      await toggleVipUserStatus(id);
      await loadVipUsers();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to toggle VIP status.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError(null);

    if (!/^\d{10}$/.test(formData.mobile.trim())) {
      setFormError("Enter a valid 10-digit mobile number.");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        mobile: formData.mobile.trim(),
        notes: formData.notes.trim() || null,
        isActive: formData.isActive,
      };

      if (editingId) {
        await updateVipUser(editingId, payload);
      } else {
        await createVipUser(payload);
      }

      resetForm();
      await loadVipUsers();
    } catch (err) {
      setFormError(err?.response?.data?.message || "Failed to save VIP user.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <article className="admin-card admin-table-card admin-api-url-card">
      <header className="admin-card__header admin-api-url-header">
        <div>
          <span className="eyebrow">VIP Number Management</span>
          <h3>VIP Users</h3>
          <p>Manage VIP phone numbers for direct login without OTP.</p>
        </div>
        <button
          type="button"
          className="header-action-button header-action-button--primary"
          onClick={resetForm}
        >
          <Plus size={16} />
          <span>{editingId ? "New VIP" : "Add VIP"}</span>
        </button>
      </header>

      <div className="admin-api-url-body">
        <div className="admin-api-url-panel">
          <form className="admin-api-url-form" onSubmit={handleSubmit}>
            <div className="admin-api-url-form__row">
              <label>
                Mobile Number
                <input
                  type="text"
                  value={formData.mobile}
                  onChange={(e) =>
                    setFormData((current) => ({
                      ...current,
                      mobile: normalizeMobileInput(e.target.value),
                    }))
                  }
                  placeholder="Enter 10-digit mobile number"
                  maxLength={10}
                  required
                />
              </label>
              <label>
                Active
                <select
                  value={String(formData.isActive)}
                  onChange={(e) =>
                    setFormData({ ...formData, isActive: e.target.value === "true" })
                  }
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </label>
            </div>

            <label className="admin-api-url-form__fieldwide">
              Notes
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                placeholder="Optional notes"
              />
            </label>

            {formError ? <p className="admin-form-error">{formError}</p> : null}

            <div className="admin-api-url-form__actions">
              <button type="submit" className="header-action-button header-action-button--primary">
                {saving ? "Saving..." : editingId ? "Update VIP" : "Create VIP"}
              </button>
              <button type="button" className="header-action-button" onClick={resetForm}>
                Reset
              </button>
            </div>
          </form>

          <div className="admin-api-url-details">
            <header className="admin-card__subheader">
              <h4>Selected VIP details</h4>
            </header>
            {selectedUser ? (
              <div className="admin-api-url-details__card">
                <div className="admin-api-url-details__meta">
                  <span className={`admin-status admin-status--${selectedUser.isActive ? "success" : "failed"}`}>
                    {selectedUser.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <p>
                  <strong>Mobile:</strong> {selectedUser.mobile}
                </p>
                <p>
                  <strong>Notes:</strong> {selectedUser.notes || "-"}
                </p>
                <p>
                  <strong>Created:</strong> {formatDateTime(selectedUser.createdAt)}
                </p>
                <p>
                  <strong>Updated:</strong> {formatDateTime(selectedUser.updatedAt)}
                </p>
              </div>
            ) : (
              <p className="admin-api-url-details__empty">Select a VIP row to view details.</p>
            )}
          </div>
        </div>

        <div className="admin-api-url-toolbar">
          <div className="admin-api-url-toolbar__stats">
            <span className="admin-chip">Total: {vipUsers.length}</span>
            <span className="admin-chip admin-chip--success">Active: {activeCount}</span>
            <span className="admin-chip admin-chip--muted">Inactive: {inactiveCount}</span>
          </div>

          <div className="admin-api-url-toolbar__filters">
            <label className="admin-api-url-search">
              <Search size={15} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by number or notes"
              />
            </label>

            <label className="admin-api-url-filter">
              <Filter size={14} />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label="Filter by status"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
          </div>
        </div>

        <div className="admin-table-wrap admin-api-url-table-wrap">
          {loading ? (
            <div className="admin-placeholder-card" style={{ padding: "1.5rem" }}>
              Loading VIP users...
            </div>
          ) : error ? (
            <div className="admin-placeholder-card" style={{ padding: "1.5rem" }}>
              {error}
            </div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Mobile</th>
                  <th>Notes</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredVipUsers.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ padding: "1rem", textAlign: "center" }}>
                      No VIP users found for the current filters.
                    </td>
                  </tr>
                ) : (
                  filteredVipUsers.map((item, index) => (
                    <tr
                      key={item.id}
                      className={selectedUser?.id === item.id ? "admin-api-url-row--selected" : ""}
                      onClick={() => handleSelectUser(item)}
                    >
                      <td>{index + 1}</td>
                      <td>
                        <span className="admin-api-url-name-cell">
                          <Phone size={13} />
                          <span>{item.mobile}</span>
                        </span>
                      </td>
                      <td title={item.notes || "-"}>{item.notes || "-"}</td>
                      <td>
                        <span className={`admin-status admin-status--${item.isActive ? "success" : "failed"}`}>
                          {item.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="admin-api-url-actions" onClick={(event) => event.stopPropagation()}>
                        <button type="button" className="admin-action-btn" onClick={() => handleSelectUser(item)}>
                          <Eye size={14} /> View
                        </button>
                        <button type="button" className="admin-action-btn" onClick={() => handleEdit(item)}>
                          <Edit3 size={14} /> Edit
                        </button>
                        <button type="button" className="admin-action-btn admin-action-btn--danger" onClick={() => handleDelete(item.id)}>
                          <Trash2 size={14} /> Delete
                        </button>
                        <button type="button" className="admin-action-btn admin-action-btn--toggle" onClick={() => handleToggleStatus(item.id)}>
                          <CheckCircle2 size={14} /> {item.isActive ? "Disable" : "Enable"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </article>
  );
}
