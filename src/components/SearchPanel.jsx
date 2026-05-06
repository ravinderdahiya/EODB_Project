import "./SearchPanel.css";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Loader2, Printer } from "lucide-react";
import {
  getDistricts,
  getTehsils,
  getVillages,
  getMurrabas,
  getKhasras,
} from "@/services/mapQueryService";
import {
  getKhewats,
  getJamabandiPeriod,
  getKhatonis,
} from "@/services/landRecordService";
import { createParcelRecordFromSelection } from "@/services/parcelRecordService";
import { useLanguage } from "@/context/LanguageContext";

const SECTION_IDS = ["khasra", "khewat", "jamabandi"];

const SECTION_FIELDS = {
  khasra:    ["district", "tehsil", "village", "murabba", "khasra"],
  khewat:    ["district", "tehsil", "village", "khewat"],
  jamabandi: ["district", "tehsil", "village", "khewat", "khatoni"],
};

// ─── SearchSection ─────────────────────────────────────────────────────────────

function SearchSection({
  sectionId,
  districts,
  onBoundaryDraw,
  onSelectionStart,
  onPrint,
  onRecordSelect,
  onStatusChange,
  isOpen,
  onToggle,
}) {
  const { t } = useLanguage();

  const fields    = SECTION_FIELDS[sectionId];
  const sectionLabel = t(`searchPanel.${sectionId}.label`);

  const [codes,   setCodes]   = useState({});
  const [names,   setNames]   = useState({});
  const [options, setOptions] = useState({ district: districts });
  const [loading, setLoading] = useState({});
  const [resolvingRecord, setResolvingRecord] = useState(false);

  const periodRef = useRef("");

  useEffect(() => {
    setOptions((prev) => ({ ...prev, district: districts }));
  }, [districts]);

  useEffect(() => {
    if (!isOpen) {
      setCodes({});
      setNames({});
      setOptions({ district: districts });
      setLoading({});
      periodRef.current = "";
    }
  }, [isOpen, districts]);

  const setFieldLoading = (field, val) =>
    setLoading((prev) => ({ ...prev, [field]: val }));

  const setFieldOptions = (field, val) =>
    setOptions((prev) => ({ ...prev, [field]: val }));

  const resolveFinalRecord = async (nextCodes, nextNames) => {
    setResolvingRecord(true);
    onStatusChange?.(`Loading ${sectionLabel.toLowerCase()} details...`);

    try {
      const parcel = await createParcelRecordFromSelection({
        sectionId,
        codes: nextCodes,
        names: nextNames,
      });

      onRecordSelect?.(parcel);
      onStatusChange?.(`${sectionLabel} resolved from live HSAC services.`);
    } catch (error) {
      onStatusChange?.(error?.message || "Failed to resolve land-record details.");
    } finally {
      setResolvingRecord(false);
    }
  };

  const handleChange = async (fieldKey, code, name) => {
    const previousCode = codes[fieldKey];
    if (code && previousCode !== code) {
      onSelectionStart?.();
    }

    const idx        = fields.indexOf(fieldKey);
    const downstream = fields.slice(idx + 1);

    const resetCodes   = Object.fromEntries(downstream.map((k) => [k, undefined]));
    const resetNames   = Object.fromEntries(downstream.map((k) => [k, undefined]));
    const resetOptions = Object.fromEntries(downstream.map((k) => [k, []]));

    const newCodes = { ...codes, ...resetCodes, [fieldKey]: code };
    const newNames = { ...names, ...resetNames, [fieldKey]: name };

    setCodes(newCodes);
    setNames(newNames);
    setOptions((prev) => ({ ...prev, ...resetOptions }));

    if (["district", "tehsil", "village"].includes(fieldKey)) {
      periodRef.current = "";
    }

    if (onBoundaryDraw && code) {
      const boundaryType =
        fieldKey === "khewat" || fieldKey === "khatoni" ? "village" : fieldKey;
      onBoundaryDraw(boundaryType, {
        dCode:     newCodes.district,
        tCode:     newCodes.tehsil,
        vCode:     newCodes.village,
        murabbaNo: newCodes.murabba,
        khasraNo:  newCodes.khasra,
      });
    }

    if (!code) return;

    if (fieldKey === "district") {
      setFieldLoading("tehsil", true);
      try {
        const tehsils = await getTehsils(code);
        setFieldOptions("tehsil", tehsils);
      } finally {
        setFieldLoading("tehsil", false);
      }
      return;
    }

    if (fieldKey === "tehsil") {
      setFieldLoading("village", true);
      try {
        const villages = await getVillages(newCodes.district, code);
        setFieldOptions("village", villages);
      } finally {
        setFieldLoading("village", false);
      }
      return;
    }

    if (fieldKey === "village") {
      if (sectionId === "khasra") {
        setFieldLoading("murabba", true);
        try {
          const murrabas = await getMurrabas(newCodes.district, newCodes.tehsil, code);
          setFieldOptions("murabba", murrabas.map((m) => ({ code: m, name: m })));
        } finally {
          setFieldLoading("murabba", false);
        }
      } else {
        setFieldLoading("khewat", true);
        try {
          const khewats = await getKhewats(newCodes.district, newCodes.tehsil, code);
          setFieldOptions("khewat", khewats.map((k) => ({ code: k, name: k })));
        } finally {
          setFieldLoading("khewat", false);
        }

        if (sectionId === "jamabandi") {
          getJamabandiPeriod(newCodes.district, newCodes.tehsil, code)
            .then((period) => { periodRef.current = period; })
            .catch(() => { periodRef.current = ""; });
        }
      }
      return;
    }

    if (fieldKey === "murabba") {
      setFieldLoading("khasra", true);
      try {
        const khasras = await getKhasras(
          newCodes.district, newCodes.tehsil, newCodes.village, code,
        );
        setFieldOptions("khasra", khasras.map((k) => ({ code: k, name: k })));
      } finally {
        setFieldLoading("khasra", false);
      }
      return;
    }

    if (fieldKey === "khewat" && sectionId === "jamabandi") {
      setFieldLoading("khatoni", true);
      try {
        const khatonis = await getKhatonis(
          newCodes.district,
          newCodes.tehsil,
          newCodes.village,
          periodRef.current,
          code,
        );
        setFieldOptions("khatoni", khatonis.map((k) => ({ code: k, name: k })));
      } finally {
        setFieldLoading("khatoni", false);
      }
    }

    const finalFieldBySection = { khasra: "khasra", khewat: "khewat", jamabandi: "khatoni" };

    if (fieldKey === finalFieldBySection[sectionId]) {
      await resolveFinalRecord(newCodes, newNames);
    }
  };

  return (
    <div className={`search-section ${isOpen ? "search-section--open" : ""}`}>
      <button
        type="button"
        className="search-section__trigger sidebar__nav-item sidebar__nav-item--active"
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <span>{sectionLabel}</span>
        <ChevronDown size={15} className="search-section__chevron" />
      </button>

      <div className="search-section__body">
        {resolvingRecord ? (
          <div className="search-section__loading-hint">
            <Loader2 size={13} className="search-section__select-arrow--spin" />
            <span>{t("searchPanel.loadingDetails")}</span>
          </div>
        ) : null}

        <div className="search-section__fields">
          {fields.map((fieldKey) => {
            const fieldOptions = options[fieldKey] ?? [];
            const isLoading    = loading[fieldKey] ?? false;
            const selected     = codes[fieldKey] ?? "";

            const isDisabled =
              isLoading ||
              (!selected && fieldOptions.length === 0 && fieldKey !== "district");

            const fieldLabel = t(`searchPanel.fields.${fieldKey}`);

            return (
              <div key={fieldKey} className="search-section__field">
                <select
                  value={selected}
                  disabled={isDisabled}
                  onChange={(e) => {
                    const opt = fieldOptions.find((o) => o.code === e.target.value);
                    handleChange(fieldKey, e.target.value, opt?.name ?? e.target.value);
                  }}
                  className="search-section__select"
                >
                  <option value="">
                    {isLoading ? t("searchPanel.loading") : fieldLabel}
                  </option>
                  {fieldOptions.map((opt) => (
                    <option key={opt.code} value={opt.code}>
                      {opt.name}
                    </option>
                  ))}
                </select>

                {isLoading ? (
                  <Loader2
                    size={13}
                    className="search-section__select-arrow search-section__select-arrow--spin"
                  />
                ) : (
                  <ChevronDown size={13} className="search-section__select-arrow" />
                )}
              </div>
            );
          })}
        </div>

        {/* <button
          type="button"
          className="search-section__print-btn"
          onClick={() => onPrint?.({ section: sectionId, codes, names })}
        >
          <Printer size={13} />
          <span>{t("searchPanel.print")}</span>
        </button> */}
      </div>
    </div>
  );
}

// ─── SearchPanel ──────────────────────────────────────────────────────────────

export default function SearchPanel({
  onPrint,
  onBoundaryDraw,
  onSelectionStart,
  onRecordSelect,
  onStatusChange,
}) {
  const { t } = useLanguage();
  const [activeSection, setActiveSection] = useState(null);
  const [districts,     setDistricts]     = useState([]);
  const [loadingDist,   setLoadingDist]   = useState(false);

  useEffect(() => {
    setLoadingDist(true);
    getDistricts()
      .then(setDistricts)
      .catch(() => setDistricts([]))
      .finally(() => setLoadingDist(false));
  }, []);

  return (
    <div className="sidebar-search">
      {loadingDist && (
        <div className="search-section__loading-hint">
          <Loader2 size={13} className="search-section__select-arrow--spin" />
          <span>{t("searchPanel.loadingDistricts")}</span>
        </div>
      )}

      <div>
        {SECTION_IDS.map((sectionId) => (
          <SearchSection
            key={sectionId}
            sectionId={sectionId}
            districts={districts}
            onBoundaryDraw={onBoundaryDraw}
            onSelectionStart={onSelectionStart}
            onPrint={onPrint}
            onRecordSelect={onRecordSelect}
            onStatusChange={onStatusChange}
            isOpen={activeSection === sectionId}
            onToggle={() =>
              setActiveSection((prev) => (prev === sectionId ? null : sectionId))
            }
          />
        ))}
      </div>
    </div>
  );
}
