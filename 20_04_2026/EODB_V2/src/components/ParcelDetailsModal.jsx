import { X } from "lucide-react";

export default function ParcelDetailsModal({ open, parcel, onClose }) {
  if (!open || !parcel) {
    return null;
  }

  const safeParcel = {
    ...parcel,
    ownerName: parcel.ownerName || "--",
    area: parcel.area || "--",
    recordType: parcel.recordType || "--",
    jamabandiYear: parcel.jamabandiYear || "--",
    mutationStatus: parcel.mutationStatus || "--",
    registryRef: parcel.registryRef || "--",
    verificationStatus: parcel.verificationStatus || "--",
    khewatNo: parcel.khewatNo || "--",
    khatoniNo: parcel.khatoniNo || "--",
    lastUpdated: parcel.lastUpdated || "--",
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="parcel-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="parcel-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="parcel-modal__header">
          <div>
            <span className="eyebrow">Parcel dossier</span>
            <h2 id="parcel-modal-title">
              {safeParcel.district} / {safeParcel.tehsil} / {safeParcel.village}
            </h2>
          </div>

          <button type="button" className="icon-button icon-button--soft" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="parcel-modal__grid">
          <div className="modal-info-card">
            <span>Khasra No.</span>
            <strong>{safeParcel.khasraNo}</strong>
          </div>
          <div className="modal-info-card">
            <span>Owner Name</span>
            <strong>{safeParcel.ownerName}</strong>
          </div>
          <div className="modal-info-card">
            <span>Area</span>
            <strong>{safeParcel.area}</strong>
          </div>
          <div className="modal-info-card">
            <span>Record Type</span>
            <strong>{safeParcel.recordType}</strong>
          </div>
          <div className="modal-info-card">
            <span>Jamabandi Year</span>
            <strong>{safeParcel.jamabandiYear}</strong>
          </div>
          <div className="modal-info-card">
            <span>Mutation Status</span>
            <strong>{safeParcel.mutationStatus}</strong>
          </div>
          <div className="modal-info-card">
            <span>Registry Reference</span>
            <strong>{safeParcel.registryRef}</strong>
          </div>
          <div className="modal-info-card">
            <span>Verification</span>
            <strong>{safeParcel.verificationStatus}</strong>
          </div>
          <div className="modal-info-card">
            <span>Khewat No.</span>
            <strong>{safeParcel.khewatNo}</strong>
          </div>
          <div className="modal-info-card">
            <span>Khatoni No.</span>
            <strong>{safeParcel.khatoniNo}</strong>
          </div>
          <div className="modal-info-card">
            <span>Last Updated</span>
            <strong>{safeParcel.lastUpdated}</strong>
          </div>
        </div>

        <div className="parcel-modal__summary">
          <h3>Parcel Summary</h3>
          <p>{safeParcel.overview}</p>
          <p>{safeParcel.breadcrumb}</p>
        </div>
      </div>
    </div>
  );
}
