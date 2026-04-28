import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import AdminDashboardView from "@/components/admin/AdminDashboardView";
import SidebarNav from "@/components/SidebarNav";
import { adminNavigationItems } from "@/data/adminData";
import { useDashboardPreferences } from "@/hooks/useDashboardPreferences";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import "@/styles/admin.css";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const isTablet = useMediaQuery("(max-width: 1180px)");
  const { theme, setTheme, glassMode, setGlassMode } = useDashboardPreferences();

  const [activeNav, setActiveNav] = useState(adminNavigationItems[0]?.id ?? "dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(!isTablet);
  const [systemMessage, setSystemMessage] = useState(
    "Admin dashboard is active with static demo metrics.",
  );

  useEffect(() => {
    if (isTablet) {
      setSidebarOpen(false);
    }
  }, [isTablet]);

  const handleNavSelect = (nextId) => {
    setActiveNav(nextId);

    const navItem = adminNavigationItems.find((item) => item.id === nextId);
    if (navItem) {
      setSystemMessage(`${navItem.label} section loaded.`);
    }
  };

  return (
    <div className="app-shell admin-shell">
      <AppHeader
        sidebarOpen={sidebarOpen}
        glassMode={glassMode}
        theme={theme}
        onToggleGlass={() => setGlassMode((current) => !current)}
        onSidebarToggle={() => setSidebarOpen((current) => !current)}
        onToggleTheme={() =>
          setTheme((current) => (current === "light" ? "dark" : "light"))
        }
        onLogout={() => navigate("/login")}
        isAdmin
        showSearch={false}
      />

      {isTablet && sidebarOpen ? (
        <button
          type="button"
          className="app-overlay"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <div
        className={`dashboard-shell admin-dashboard-shell ${
          !sidebarOpen && !isTablet ? "dashboard-shell--sidebar-closed" : ""
        }`}
      >
        <SidebarNav
          activeId={activeNav}
          items={adminNavigationItems}
          isOpen={sidebarOpen}
          onSelect={handleNavSelect}
          onBoundaryDraw={() => {}}
          onRecordSelect={() => {}}
          onStatusChange={() => {}}
        />

        <main className="workspace admin-workspace">
          <AdminDashboardView
            activeSection={activeNav}
            systemMessage={systemMessage}
            onCreateEvent={() =>
              setSystemMessage("Create event action can be connected to your form/workflow.")
            }
          />
        </main>
      </div>
    </div>
  );
}
