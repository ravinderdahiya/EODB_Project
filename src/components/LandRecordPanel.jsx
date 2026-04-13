import {
  ChevronDown,
  Download,
  Printer,
  Share2,
  ShieldCheck,
  X,
} from "lucide-react";

export default function LandRecordPanel({
  isOpen,
  parcel,
  districtOptions,
  tehsilOptions,
  onClose,
  onToggle,
  onDistrictChange,
  onTehsilChange,
  onViewFullDetails,
  onPrint,
  onShare,
  onDownload,
}) {
  return (
    <aside className={`record-panel ${isOpen ? "record-panel--open" : ""}`}>
      <button type="button" className="record-panel__handle" onClick={onToggle}>
        <span>Land Record Information</span>
        <ChevronDown size={16} />
      </button>

      <div className="record-panel__surface">
        <div className="record-panel__hero">
          <div className="record-panel__hero-top">
            <div>
              <h3>Land Record Information</h3>
              <p>Parcel details open when you focus a land record from search or map highlight.</p>
            </div>

            <button
              type="button"
              className="record-panel__close"
              onClick={onClose}
              aria-label="Close land record panel"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="record-panel__filters">
          <label className="field">
            <span>District</span>
            <select value={parcel.district} onChange={(event) => onDistrictChange(event.target.value)}>
              {districtOptions.map((district) => (
                <option key={district} value={district}>
                  {district}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Tehsil</span>
            <select value={parcel.tehsil} onChange={(event) => onTehsilChange(event.target.value)}>
              {tehsilOptions.map((tehsil) => (
                <option key={tehsil} value={tehsil}>
                  {tehsil}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="record-panel__details">
          <div className="info-row">
            <span>Murabba No.</span>
            <strong>{parcel.murabbaNo || "--"}</strong>
          </div>
          <div className="info-row">
            <span>Khasra No.</span>
            <strong>{parcel.khasraNo}</strong>
          </div>
          <div className="info-row">
            <span>Owner Name</span>
            <strong>{parcel.ownerName}</strong>
          </div>
          <div className="info-row">
            <span>Village</span>
            <strong>{parcel.village}</strong>
          </div>
          <div className="info-row">
            <span>Area</span>
            <strong>{parcel.area}</strong>
          </div>
          <div className="info-row">
            <span>Land Use</span>
            <strong>{parcel.landUse}</strong>
          </div>
          <div className="info-row">
            <span>Record Type</span>
            <strong>{parcel.recordType}</strong>
          </div>
        </div>

        <div className="record-panel__status">
          <span className="badge badge--verified">
            <ShieldCheck size={14} />
            {parcel.verificationStatus}
          </span>
          <small>Last updated {parcel.lastUpdated}</small>
        </div>

        <button type="button" className="primary-button" onClick={onViewFullDetails}>
          View Full Details
        </button>

        <div className="record-panel__actions">
          <button type="button" className="action-link" onClick={onPrint}>
            <Printer size={16} />
            Print
          </button>
          <button type="button" className="action-link" onClick={onShare}>
            <Share2 size={16} />
            Share
          </button>
          <button type="button" className="action-link" onClick={onDownload}>
            <Download size={16} />
            Download
          </button>
        </div>
      </div>
    </aside>
  );
}
