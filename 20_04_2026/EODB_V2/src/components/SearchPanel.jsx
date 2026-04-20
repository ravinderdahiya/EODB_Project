/**
 * Hierarchical land-record search for Khasra, Khewat, and Jamabandi flows.
 * Uses the same HSAC query chain as the legacy project in a cleaner UI.
 */

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

// ─── Section definitions ──────────────────────────────────────────────────────

const SECTIONS = [
  {
    id: "khasra",
    label: "Search Owners by Khasra",
    fields: [
      { key: "district", label: "Select District" },
      { key: "tehsil",   label: "Select Tehsil" },
      { key: "village",  label: "Select Village" },
      { key: "murabba",  label: "Select Murabba" },
      { key: "khasra",   label: "Select Khasra" },
    ],
  },
  {
    id: "khewat",
    label: "Search Owners by Khewat",
    fields: [
      { key: "district", label: "Select District" },
      { key: "tehsil",   label: "Select Tehsil" },
      { key: "village",  label: "Select Village" },
      { key: "khewat",   label: "Select Khewat" },
    ],
  },
  {
    id: "jamabandi",
    label: "Jamabandi Nakal",
    fields: [
      { key: "district", label: "Select District" },
      { key: "tehsil",   label: "Select Tehsil" },
      { key: "village",  label: "Select Village" },
      { key: "khewat",   label: "Select Khewat" },
      { key: "khatoni",  label: "Select Khatoni" },
    ],
  },
];

// ─── SearchSection ─────────────────────────────────────────────────────────────

/** One accordion-style search section. */
function SearchSection({
  section,
  districts,
  onBoundaryDraw,
  onPrint,
  onRecordSelect,
  onStatusChange,
  isOpen,
  onToggle,
}) {
  const [codes,   setCodes]   = useState({});
  const [names,   setNames]   = useState({});
  const [options, setOptions] = useState({ district: districts });
  const [loading, setLoading] = useState({});
  const [resolvingRecord, setResolvingRecord] = useState(false);

  const periodRef = useRef("");

  useEffect(() => {
    setOptions((prev) => ({ ...prev, district: districts }));
  }, [districts]);

  // Reset when accordion closes
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
    onStatusChange?.(`Loading ${section.label.toLowerCase()} details...`);

    try {
      const parcel = await createParcelRecordFromSelection({
        sectionId: section.id,
        codes: nextCodes,
        names: nextNames,
      });

      onRecordSelect?.(parcel);
      onStatusChange?.(`${section.label} resolved from live HSAC services.`);
    } catch (error) {
      onStatusChange?.(error?.message || "Failed to resolve land-record details.");
    } finally {
      setResolvingRecord(false);
    }
  };

  const handleChange = async (fieldKey, code, name) => {
    const fieldOrder  = section.fields.map((f) => f.key);
    const idx         = fieldOrder.indexOf(fieldKey);
    const downstream  = fieldOrder.slice(idx + 1);

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
      onBoundaryDraw(fieldKey, {
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
      if (section.id === "khasra") {
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

        if (section.id === "jamabandi") {
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

    if (fieldKey === "khewat" && section.id === "jamabandi") {
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

    const finalFieldBySection = {
      khasra: "khasra",
      khewat: "khewat",
      jamabandi: "khatoni",
    };

    if (fieldKey === finalFieldBySection[section.id]) {
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
        <span>{section.label}</span>
        <ChevronDown size={15} className="search-section__chevron" />
      </button>

      <div className="search-section__body">
        {resolvingRecord ? (
          <div className="search-section__loading-hint">
            <Loader2 size={13} className="search-section__select-arrow--spin" />
            <span>Resolving live parcel details…</span>
          </div>
        ) : null}

        <div className="search-section__fields">
          {section.fields.map((field) => {
            const fieldOptions = options[field.key] ?? [];
            const isLoading    = loading[field.key] ?? false;
            const selected     = codes[field.key] ?? "";

            const isDisabled =
              isLoading ||
              (!selected && fieldOptions.length === 0 && field.key !== "district");

            return (
              <div key={field.key} className="search-section__field">
                <select
                  value={selected}
                  disabled={isDisabled}
                  onChange={(e) => {
                    const opt = fieldOptions.find((o) => o.code === e.target.value);
                    handleChange(field.key, e.target.value, opt?.name ?? e.target.value);
                  }}
                  className="search-section__select"
                >
                  <option value="">
                    {isLoading ? "Loading…" : field.label}
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

        <button
          type="button"
          className="search-section__print-btn"
          onClick={() => onPrint?.({ section: section.id, codes, names })}
        >
          <Printer size={13} />
          <span>PRINT</span>
        </button>
      </div>
    </div>
  );
}

// ─── SearchPanel ──────────────────────────────────────────────────────────────

/**
 * @param {Function}  onPrint         Called when PRINT is clicked
 * @param {Function}  onBoundaryDraw  drawBoundary(type, codes) from useArcGISMap
 */
export default function SearchPanel({
  onPrint,
  onBoundaryDraw,
  onRecordSelect,
  onStatusChange,
}) {
  const [activeSection, setActiveSection] = useState(null);
  const [districts,     setDistricts]     = useState([]);
  const [loadingDist,   setLoadingDist]   = useState(false);

  // Load all districts once on mount (shared across all three sections)
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
          <span>Loading districts…</span>
        </div>
      )}

      <div>
        {SECTIONS.map((section) => (
          <SearchSection
            key={section.id}
            section={section}
            districts={districts}
            onBoundaryDraw={onBoundaryDraw}
            onPrint={onPrint}
            onRecordSelect={onRecordSelect}
            onStatusChange={onStatusChange}
            isOpen={activeSection === section.id}
            onToggle={() =>
              setActiveSection((prev) => (prev === section.id ? null : section.id))
            }
          />
        ))}
      </div>
    </div>
  );
}
