import { Fragment, useState } from "react";
import SearchPanel from "./SearchPanel";

export default function SidebarNav({
  activeId,
  items,
  isOpen,
  onSelect,
  onBoundaryDraw,
  onRecordSelect,
  onStatusChange,
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
                      <SearchPanel
                        onPrint={() => window.print()}
                        onBoundaryDraw={onBoundaryDraw}
                        onRecordSelect={onRecordSelect}
                        onStatusChange={onStatusChange}
                      />
                    </div>
                  )}
                </Fragment>
              );
            })}
          </nav>
        </div>
      </div>
    </aside>
  );
}
