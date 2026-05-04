import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import AdminDashboardView from "@/components/admin/AdminDashboardView";
import SidebarNav from "@/components/SidebarNav";
import SaarthiChatbotWidget from "@/components-addon/SaarthiChatbotWidget";
import { adminNavigationItems } from "@/data/adminData";
import { useDashboardPreferences } from "@/hooks/useDashboardPreferences";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import axiosInstance from "../utils/axiosInstance";
import "@/styles/admin.css";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const isTablet = useMediaQuery("(max-width: 1180px)");
  const { theme, setTheme } = useDashboardPreferences();

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

  const handleLogout = async () => {
    try {
      await axiosInstance.post("/user/logout");
    } catch (err) {
      console.error("Logout API error:", err);
    } finally {
      // Clear localStorage
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("isAdmin");
      navigate("/login");
    }
  };

  return (
    <div className="app-shell admin-shell">
      <AppHeader
        sidebarOpen={sidebarOpen}
        theme={theme}
        onSidebarToggle={() => setSidebarOpen((current) => !current)}
        onToggleTheme={() =>
          setTheme((current) => (current === "light" ? "dark" : "light"))
        }
        onLogout={handleLogout}
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
      <SaarthiChatbotWidget />
    </div>
  );
}
