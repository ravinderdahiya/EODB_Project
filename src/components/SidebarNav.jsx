import { Fragment, useState } from "react";
import { FileText } from "lucide-react";
import SearchPanel from "./SearchPanel";

export default function SidebarNav({
  activeId,
  items,
  isOpen,
  onSelect,
  onManualRecord,
  parcels,
}) {
  const [searchExpanded, setSearchExpanded] = useState(false);

  const handleNavClick = (id) => {
    if (id === "search") {
      setSearchExpanded((prev) => !prev);
    } else {
      setSearchExpanded(false);
      onSelect(id);
    }
  };

  return (
    <aside className={`sidebar ${isOpen ? "sidebar--open" : ""}`}>
      <div className="sidebar__surface">
        <div className="sidebar__body">
          <nav className="sidebar__nav" aria-label="Main navigation">
            {items.map((item) => {
              const Icon = item.icon;
              const isActive = item.id === "search" ? searchExpanded : item.id === activeId;

              return (
                <Fragment key={item.id}>
                  <button
                    type="button"
                    className={`sidebar__nav-item ${isActive ? "sidebar__nav-item--active" : ""}`}
                    onClick={() => handleNavClick(item.id)}
                  >
                    <span className="sidebar__nav-icon"><Icon size={18} /></span>
                    <span className="sidebar__nav-title">{item.label}</span>
                  </button>

                  {/* Search drawer renders directly below its own button */}
                  {item.id === "search" && (
                    <div className={`sidebar__search-drawer ${searchExpanded ? "sidebar__search-drawer--open" : ""}`}>
                      <SearchPanel parcels={parcels ?? []} onPrint={() => window.print()} />
                    </div>
                  )}
                </Fragment>
              );
            })}
          </nav>
        </div>

        <div className="sidebar__footer">
          <button
            type="button"
            className="sidebar__manual-record-btn"
            onClick={onManualRecord}
            aria-label="Open manual land record"
          >
            <span className="sidebar__manual-record-icon"><FileText size={18} /></span>
            <span className="sidebar__manual-record-label">Manual Land Record</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
