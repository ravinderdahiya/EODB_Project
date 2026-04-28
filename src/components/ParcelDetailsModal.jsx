import "./ParcelDetailsModal.css";
import { X } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { normalizeParcel } from "@/utils/parcelUtils";

export default function ParcelDetailsModal({ open, parcel, onClose }) {
  const { t } = useLanguage();

  if (!open || !parcel) return null;

  const safeParcel = normalizeParcel(parcel);

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
            <span className="eyebrow">{t("modal.eyebrow")}</span>
            <h2 id="parcel-modal-title">
              {safeParcel.district} &gt; {safeParcel.tehsil} &gt; {safeParcel.village}
            </h2>
          </div>

          <button type="button" className="icon-button icon-button--soft" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="parcel-modal__grid">
          <div className="modal-info-card">
            <span>{t("modal.murabba")}</span>
            <strong>{safeParcel.murabbaNo}</strong>
          </div>
          <div className="modal-info-card">
            <span>{t("modal.khasra")}</span>
            <strong>{safeParcel.khasraNo}</strong>
          </div>
          <div className="modal-info-card">
            <span>{t("modal.area")}</span>
            <strong>{safeParcel.area}</strong>
          </div>
          <div className="modal-info-card">
            <span>{t("modal.recordType")}</span>
            <strong>{safeParcel.recordType}</strong>
          </div>
          <div className="modal-info-card">
            <span>{t("modal.jamabandi")}</span>
            <strong>{safeParcel.jamabandiYear}</strong>
          </div>
          <div className="modal-info-card">
            <span>{t("modal.verification")}</span>
            <strong>{safeParcel.verificationStatus}</strong>
          </div>
          <div className="modal-info-card">
            <span>{t("modal.khewat")}</span>
            <strong>{safeParcel.khewatNo}</strong>
          </div>
          <div className="modal-info-card">
            <span>{t("modal.khatoni")}</span>
            <strong>{safeParcel.khatoniNo}</strong>
          </div>
          <div className="modal-info-card">
            <span>{t("modal.lastUpdated")}</span>
            <strong>{safeParcel.lastUpdated}</strong>
          </div>
        </div>

        <div className="parcel-modal__summary">
          <h3>{t("modal.ownershipSummary")}</h3>
          <p>{safeParcel.ownerName}</p>
          <p>{safeParcel.breadcrumb}</p>
        </div>
      </div>
    </div>
  );
}
