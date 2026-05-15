import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Copy,
  Edit3,
  Eye,
  Filter,
  Link2,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import {
  createApiUrl,
  deleteApiUrl,
  fetchApiUrlCategories,
  fetchApiUrls,
  toggleApiUrlStatus,
  updateApiUrl,
} from "@/services/apiUrlService";

const initialFormState = {
  name: "",
  url: "",
  category: "",
  description: "",
  isActive: true,
};

export default function AdminApiUrlManager() {
  const [apiUrls, setApiUrls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState(initialFormState);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [selectedUrl, setSelectedUrl] = useState(null);
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const loadApiUrls = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchApiUrls();
      const rows = res.data || [];
      setApiUrls(rows);
      if (rows.length && !selectedUrl) {
        setSelectedUrl(rows[0]);
      }
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to fetch API URLs.");
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const res = await fetchApiUrlCategories();
      setCategories(res.data || []);
    } catch {
      // Ignore category fetch failures and keep manual input enabled.
    }
  };

  useEffect(() => {
    loadApiUrls();
    loadCategories();
  }, []);

  const activeCount = useMemo(
    () => apiUrls.filter((item) => item.isActive).length,
    [apiUrls],
  );
  const inactiveCount = Math.max(apiUrls.length - activeCount, 0);

  const filteredApiUrls = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return apiUrls.filter((item) => {
      const statusMatch =
        statusFilter === "all"
        || (statusFilter === "active" && item.isActive)
        || (statusFilter === "inactive" && !item.isActive);

      if (!statusMatch) return false;
      if (!query) return true;

      return [item.name, item.url, item.category]
        .filter(Boolean)
        .some((value) => `${value}`.toLowerCase().includes(query));
    });
  }, [apiUrls, searchTerm, statusFilter]);

  useEffect(() => {
    if (!selectedUrl?.id) return;
    const stillVisible = filteredApiUrls.some((item) => item.id === selectedUrl.id);
    if (!stillVisible) {
      setSelectedUrl(filteredApiUrls[0] || null);
    }
  }, [filteredApiUrls, selectedUrl?.id]);

  const resetForm = () => {
    setFormData(initialFormState);
    setEditingId(null);
    setFormError(null);
  };

  const handleSelectUrl = (apiUrl) => {
    setSelectedUrl(apiUrl);
    setEditingId(null);
    setFormData(initialFormState);
    setFormError(null);
  };

  const handleEdit = (apiUrl) => {
    setEditingId(apiUrl.id);
    setFormData({
      name: apiUrl.name || "",
      url: apiUrl.url || "",
      category: apiUrl.category || "",
      description: apiUrl.description || "",
      isActive: apiUrl.isActive ?? true,
    });
    setSelectedUrl(apiUrl);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this API URL? This cannot be undone.")) {
      return;
    }

    try {
      setLoading(true);
      await deleteApiUrl(id);
      await loadApiUrls();
      if (selectedUrl?.id === id) {
        setSelectedUrl(null);
      }
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to delete API URL.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      setLoading(true);
      await toggleApiUrlStatus(id);
      await loadApiUrls();
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to toggle API URL status.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError(null);

    if (!formData.name.trim() || !formData.url.trim()) {
      setFormError("Name and URL are required.");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: formData.name.trim(),
        url: formData.url.trim(),
        category: formData.category.trim() || null,
        description: formData.description.trim() || null,
        isActive: formData.isActive,
      };

      if (editingId) {
        await updateApiUrl(editingId, payload);
      } else {
        await createApiUrl(payload);
      }

      resetForm();
      await loadApiUrls();
    } catch (err) {
      setFormError(err?.response?.data?.error || "Failed to save API URL.");
    } finally {
      setSaving(false);
    }
  };

  const handleCopySelectedUrl = async () => {
    if (!selectedUrl?.url || !navigator?.clipboard?.writeText) return;
    try {
      await navigator.clipboard.writeText(selectedUrl.url);
    } catch {
      // Ignore clipboard failures; URL remains visible in details panel.
    }
  };

  return (
    <article className="admin-card admin-table-card admin-api-url-card">
      <header className="admin-card__header admin-api-url-header">
        <div>
          <span className="eyebrow">API URL Management</span>
          <h3>API URLs</h3>
          <p>Manage backend endpoint metadata with add, edit, delete, and view operations.</p>
        </div>
        <button
          type="button"
          className="header-action-button header-action-button--primary"
          onClick={resetForm}
        >
          <Plus size={16} />
          <span>{editingId ? "New URL" : "Add URL"}</span>
        </button>
      </header>

      <div className="admin-api-url-body">
        <div className="admin-api-url-panel">
          <form className="admin-api-url-form" onSubmit={handleSubmit}>
            <div className="admin-api-url-form__row">
              <label>
                Name
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="API name"
                  required
                />
              </label>
              <label>
                URL
                <input
                  type="text"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="Enter backend or upstream API URL"
                  required
                />
              </label>
            </div>

            <div className="admin-api-url-form__row">
              <label>
                Category
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g. auth, user, reports"
                  list="api-url-categories"
                />
                <datalist id="api-url-categories">
                  {categories.map((category) => (
                    <option key={category} value={category} />
                  ))}
                </datalist>
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
              Description
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                placeholder="Optional description"
              />
            </label>

            {formError ? <p className="admin-form-error">{formError}</p> : null}

            <div className="admin-api-url-form__actions">
              <button type="submit" className="header-action-button header-action-button--primary">
                {saving ? "Saving..." : editingId ? "Update URL" : "Create URL"}
              </button>
              <button type="button" className="header-action-button" onClick={resetForm}>
                Reset
              </button>
            </div>
          </form>

          <div className="admin-api-url-details">
            <header className="admin-card__subheader">
              <h4>Selected API details</h4>
            </header>
            {selectedUrl ? (
              <div className="admin-api-url-details__card">
                <div className="admin-api-url-details__meta">
                  <span className={`admin-status admin-status--${selectedUrl.isActive ? "success" : "failed"}`}>
                    {selectedUrl.isActive ? "Active" : "Inactive"}
                  </span>
                  <button
                    type="button"
                    className="admin-api-url-copy-btn"
                    onClick={handleCopySelectedUrl}
                    title="Copy URL"
                  >
                    <Copy size={14} />
                    <span>Copy URL</span>
                  </button>
                </div>
                <p>
                  <strong>Name:</strong> {selectedUrl.name}
                </p>
                <p>
                  <strong>URL:</strong> {selectedUrl.url}
                </p>
                <p>
                  <strong>Category:</strong> {selectedUrl.category || "-"}
                </p>
                <p>
                  <strong>Description:</strong> {selectedUrl.description || "-"}
                </p>
              </div>
            ) : (
              <p className="admin-api-url-details__empty">Select an API row to view details.</p>
            )}
          </div>
        </div>

        <div className="admin-api-url-toolbar">
          <div className="admin-api-url-toolbar__stats">
            <span className="admin-chip">Total: {apiUrls.length}</span>
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
                placeholder="Search by name, URL, or category"
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
              Loading API URLs...
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
                  <th>Name</th>
                  <th>URL</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredApiUrls.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ padding: "1rem", textAlign: "center" }}>
                      No API URLs found for the current filters.
                    </td>
                  </tr>
                ) : (
                  filteredApiUrls.map((item, index) => (
                    <tr
                      key={item.id}
                      className={selectedUrl?.id === item.id ? "admin-api-url-row--selected" : ""}
                      onClick={() => handleSelectUrl(item)}
                    >
                      <td>{index + 1}</td>
                      <td>
                        <span className="admin-api-url-name-cell">
                          <Link2 size={13} />
                          <span>{item.name}</span>
                        </span>
                      </td>
                      <td className="admin-api-url-table-url" title={item.url}>{item.url}</td>
                      <td>{item.category || "-"}</td>
                      <td>
                        <span className={`admin-status admin-status--${item.isActive ? "success" : "failed"}`}>
                          {item.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="admin-api-url-actions" onClick={(event) => event.stopPropagation()}>
                        <button type="button" className="admin-action-btn" onClick={() => handleSelectUrl(item)}>
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
