import { useState } from "react";
import { ChevronDown, Printer } from "lucide-react";

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
    ],
  },
];

function getOptions(parcels, field, values) {
  switch (field) {
    case "district":
      return [...new Set(parcels.map((p) => p.district))];
    case "tehsil":
      return values.district
        ? [...new Set(parcels.filter((p) => p.district === values.district).map((p) => p.tehsil))]
        : [];
    case "village":
      return values.district && values.tehsil
        ? [...new Set(
            parcels
              .filter((p) => p.district === values.district && p.tehsil === values.tehsil)
              .map((p) => p.village),
          )]
        : [];
    case "murabba":
      return values.village
        ? [...new Set(parcels.filter((p) => p.village === values.village).map((p) => p.murabbaNo))]
        : [];
    case "khasra":
      return values.murabba
        ? [...new Set(parcels.filter((p) => p.murabbaNo === values.murabba).map((p) => p.khasraNo))]
        : [];
    case "khewat":
      return values.village
        ? [...new Set(parcels.filter((p) => p.village === values.village).map((p) => p.khasraNo))]
        : [];
    default:
      return [];
  }
}

function SearchSection({ section, parcels, onPrint, isOpen, onToggle }) {
  const [values, setValues] = useState({});

  const handleChange = (field, value) => {
    const fieldOrder = section.fields.map((f) => f.key);
    const idx = fieldOrder.indexOf(field);
    const reset = {};
    fieldOrder.slice(idx + 1).forEach((k) => { reset[k] = ""; });
    setValues((prev) => ({ ...prev, ...reset, [field]: value }));
  };

  return (
    <div className={`search-section ${isOpen ? "search-section--open" : ""}`}>
      <button
        type="button"
        className="search-section__trigger"
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <span>{section.label}</span>
        <ChevronDown size={15} className="search-section__chevron" />
      </button>

      <div className="search-section__body">
        <div className="search-section__fields">
          {section.fields.map((field) => {
            const options = getOptions(parcels, field.key, values);
            return (
              <div key={field.key} className="search-section__field">
                <select
                  value={values[field.key] || ""}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  className="search-section__select"
                >
                  <option value="">{field.label}</option>
                  {options.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                <ChevronDown size={13} className="search-section__select-arrow" />
              </div>
            );
          })}
        </div>

        <button
          type="button"
          className="search-section__print-btn"
          onClick={() => onPrint?.({ section: section.id, values })}
        >
          <Printer size={13} />
          <span>PRINT</span>
        </button>
      </div>
    </div>
  );
}

/* Pure content — no absolute positioning; parent decides visibility */
export default function SearchPanel({ parcels, onPrint }) {
  const [activeSection, setActiveSection] = useState(null);

  return (
    <div className="sidebar-search">
      <div className="sidebar-search__header">
        <span className="sidebar-search__title">Search</span>
      </div>
      <div className="sidebar-search__sections">
        {SECTIONS.map((section) => (
          <SearchSection
            key={section.id}
            section={section}
            parcels={parcels}
            onPrint={onPrint}
            isOpen={activeSection === section.id}
            onToggle={() => setActiveSection((prev) => prev === section.id ? null : section.id)}
          />
        ))}
      </div>
    </div>
  );
}
