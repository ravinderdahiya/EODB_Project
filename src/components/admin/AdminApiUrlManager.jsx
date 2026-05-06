import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Edit3,
  Plus,
  Trash2,
  Eye,
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

  const loadApiUrls = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchApiUrls();
      setApiUrls(res.data || []);
      if ((res.data || []).length && !selectedUrl) {
        setSelectedUrl(res.data[0]);
      }
    } catch (err) {
      console.error("API URLs fetch error:", err);
      setError(err?.response?.data?.error || "Failed to fetch API URLs.");
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const res = await fetchApiUrlCategories();
      setCategories(res.data || []);
    } catch (err) {
      console.warn("Failed to load API URL categories", err);
    }
  };

  useEffect(() => {
    loadApiUrls();
    loadCategories();
  }, []);

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
      console.error("Delete API URL error:", err);
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
      console.error("Toggle API URL status error:", err);
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
      console.error("Save API URL error:", err);
      setFormError(err?.response?.data?.error || "Failed to save API URL.");
    } finally {
      setSaving(false);
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
                  placeholder="https://api.example.com/v1/resource"
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
                {saving ? "Saving…" : editingId ? "Update URL" : "Create URL"}
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
                <p>
                  <strong>Name:</strong> {selectedUrl.name}
                </p>
                <p>
                  <strong>URL:</strong> {selectedUrl.url}
                </p>
                <p>
                  <strong>Category:</strong> {selectedUrl.category || "—"}
                </p>
                <p>
                  <strong>Status:</strong> {selectedUrl.isActive ? "Active" : "Inactive"}
                </p>
                <p>
                  <strong>Description:</strong> {selectedUrl.description || "—"}
                </p>
              </div>
            ) : (
              <p className="admin-api-url-details__empty">Select an API row to view details.</p>
            )}
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
                {apiUrls.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ padding: "1rem", textAlign: "center" }}>
                      No API URLs found.
                    </td>
                  </tr>
                ) : (
                  apiUrls.map((item, index) => (
                    <tr key={item.id}>
                      <td>{index + 1}</td>
                      <td>{item.name}</td>
                      <td className="admin-api-url-table-url">{item.url}</td>
                      <td>{item.category || "-"}</td>
                      <td>
                        <span className={`admin-status admin-status--${item.isActive ? "success" : "failed"}`}>
                          {item.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="admin-api-url-actions">
                        <button type="button" onClick={() => handleSelectUrl(item)}>
                          <Eye size={14} /> View
                        </button>
                        <button type="button" onClick={() => handleEdit(item)}>
                          <Edit3 size={14} /> Edit
                        </button>
                        <button type="button" onClick={() => handleDelete(item.id)}>
                          <Trash2 size={14} /> Delete
                        </button>
                        <button type="button" onClick={() => handleToggleStatus(item.id)}>
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
