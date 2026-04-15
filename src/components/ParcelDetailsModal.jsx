import { X } from "lucide-react";

export default function ParcelDetailsModal({ open, parcel, onClose }) {
  if (!open || !parcel) {
    return null;
  }

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
              {parcel.district} / {parcel.tehsil} / {parcel.village}
            </h2>
          </div>

          <button type="button" className="icon-button icon-button--soft" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="parcel-modal__grid">
          <div className="modal-info-card">
            <span>Khasra No.</span>
            <strong>{parcel.khasraNo}</strong>
          </div>
          <div className="modal-info-card">
            <span>Owner Name</span>
            <strong>{parcel.ownerName}</strong>
          </div>
          <div className="modal-info-card">
            <span>Area</span>
            <strong>{parcel.area}</strong>
          </div>
          <div className="modal-info-card">
            <span>Record Type</span>
            <strong>{parcel.recordType}</strong>
          </div>
          <div className="modal-info-card">
            <span>Jamabandi Year</span>
            <strong>{parcel.jamabandiYear}</strong>
          </div>
          <div className="modal-info-card">
            <span>Mutation Status</span>
            <strong>{parcel.mutationStatus}</strong>
          </div>
          <div className="modal-info-card">
            <span>Registry Reference</span>
            <strong>{parcel.registryRef}</strong>
          </div>
          <div className="modal-info-card">
            <span>Verification</span>
            <strong>{parcel.verificationStatus}</strong>
          </div>
        </div>

        <div className="parcel-modal__summary">
          <h3>Parcel Summary</h3>
          <p>{parcel.overview}</p>
          <p>{parcel.breadcrumb}</p>
        </div>
      </div>
    </div>
  );
}
