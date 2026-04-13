export default function SidebarNav({
  activeId,
  items,
  isOpen,
  onSelect,
}) {
  return (
    <aside className={`sidebar ${isOpen ? "sidebar--open" : ""}`}>
      <div className="sidebar__surface">
        <nav className="sidebar__nav" aria-label="Main navigation">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === activeId;

            return (
              <button
                type="button"
                key={item.id}
                className={`sidebar__nav-item ${isActive ? "sidebar__nav-item--active" : ""}`}
                onClick={() => onSelect(item.id)}
              >
                <span className="sidebar__nav-icon">
                  <Icon size={18} />
                </span>
                <span className="sidebar__nav-title">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
