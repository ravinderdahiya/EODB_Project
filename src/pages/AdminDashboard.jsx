import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, BarChart3, Clock3, Users } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import AdminDashboardView from "@/components/admin/AdminDashboardView";
import SidebarNav from "@/components/SidebarNav";
import { adminNavigationItems } from "@/data/adminData";
import { useDashboardPreferences } from "@/hooks/useDashboardPreferences";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import {
  fetchAnalyticsEvents,
  fetchAnalyticsSummary,
} from "@/services/adminAnalyticsService";
import axiosInstance from "../utils/axiosInstance";
import "@/styles/admin.css";

const SUMMARY_WINDOW_DAYS = 14;

const toEventRowsForDashboard = (events = []) =>
  events.map((item) => ({
    id: `GA-${item.id}`,
    name: `${item.eventType}${item.action && item.action !== "-" ? `: ${item.action}` : ""}`,
    category: item.category || "Uncategorized",
    date: item.timestamp,
    venue: item.page || "-",
    bookings: 1,
    revenue: 0,
    status: item.source || "Tracked",
  }));

const buildStatCards = (stats = {}) => ({
  totalEvents: {
    id: "ga-total-events",
    label: "Tracked Events",
    value: (stats.totalEvents || 0).toLocaleString("en-IN"),
    delta: `${stats.activeDays || SUMMARY_WINDOW_DAYS} day window`,
    detail: "Google analytics events synced to backend",
    trend: "up",
    tone: "green",
    icon: Activity,
  },
  uniqueUsers: {
    id: "ga-unique-users",
    label: "Tracked Users",
    value: (stats.uniqueTrackedUsers || 0).toLocaleString("en-IN"),
    delta: "Distinct authenticated users",
    detail: "Users with at least one tracked event",
    trend: "up",
    tone: "blue",
    icon: Users,
  },
  activeDays: {
    id: "ga-active-days",
    label: "Active Days",
    value: `${stats.activeDays || 0}`,
    delta: "Configured timeline",
    detail: `Rolling analytics for last ${stats.activeDays || SUMMARY_WINDOW_DAYS} days`,
    trend: "neutral",
    tone: "mint",
    icon: Clock3,
  },
  totalPoints: {
    id: "ga-total-points",
    label: "Trend Points",
    value: `${stats.activeDays || 0}`,
    delta: "Daily chart points",
    detail: "Used in dashboard overview chart",
    trend: "neutral",
    tone: "orange",
    icon: BarChart3,
  },
});

export default function AdminDashboard() {
  const navigate = useNavigate();
  const isTablet = useMediaQuery("(max-width: 1180px)");
  const { theme, setTheme } = useDashboardPreferences();

  const [activeNav, setActiveNav] = useState(adminNavigationItems[0]?.id ?? "dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(!isTablet);
  const [systemMessage, setSystemMessage] = useState(
    "Admin dashboard is active with static demo metrics.",
  );
  const [loginLogs, setLoginLogs] = useState([]);
  const [loginLogsTotal, setLoginLogsTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState(null);
  const [analyticsStats, setAnalyticsStats] = useState(null);
  const [analyticsOverviewSeries, setAnalyticsOverviewSeries] = useState([]);
  const [analyticsCategorySeries, setAnalyticsCategorySeries] = useState([]);
  const [analyticsRecentEvents, setAnalyticsRecentEvents] = useState([]);
  const [analyticsEvents, setAnalyticsEvents] = useState([]);
  const [analyticsTotal, setAnalyticsTotal] = useState(0);
  const [analyticsPage, setAnalyticsPage] = useState(1);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState(null);

  useEffect(() => {
    if (isTablet) {
      setSidebarOpen(false);
    }
  }, [isTablet]);

  useEffect(() => {
    const fetchLoginLogs = async () => {
      if (activeNav !== "login-logs") return;

      setLogsLoading(true);
      setLogsError(null);

      try {
        const res = await axiosInstance.get(
          `/user/login-logs?page=${currentPage}&pageSize=${pageSize}`,
        );
        setLoginLogs(res.data.logs || []);
        setLoginLogsTotal(res.data.totalCount || 0);
      } catch (err) {
        setLogsError(err.response?.data?.message || "Failed to load login logs.");
      } finally {
        setLogsLoading(false);
      }
    };

    fetchLoginLogs();
  }, [activeNav, currentPage, pageSize]);

  useEffect(() => {
    const fetchSummary = async () => {
      if (!["dashboard", "reports"].includes(activeNav)) return;

      setAnalyticsError(null);
      try {
        const res = await fetchAnalyticsSummary(SUMMARY_WINDOW_DAYS);
        const data = res.data || {};
        const cards = buildStatCards(data.stats || {});

        setAnalyticsStats([
          cards.totalEvents,
          cards.uniqueUsers,
          cards.activeDays,
          cards.totalPoints,
        ]);
        setAnalyticsOverviewSeries(data.trendSeries || []);
        setAnalyticsCategorySeries(data.categorySeries || []);
        setAnalyticsRecentEvents(toEventRowsForDashboard(data.recentEvents || []));
      } catch (err) {
        const message = err.response?.data?.message || "Failed to load analytics summary.";
        setAnalyticsError(message);
      }
    };

    fetchSummary();
  }, [activeNav]);

  useEffect(() => {
    const fetchEvents = async () => {
      if (activeNav !== "reports") return;

      setAnalyticsLoading(true);
      setAnalyticsError(null);
      try {
        const res = await fetchAnalyticsEvents({
          page: analyticsPage,
          pageSize,
          days: 30,
        });
        setAnalyticsEvents(res.events || []);
        setAnalyticsTotal(res.totalCount || 0);
      } catch (err) {
        setAnalyticsError(err.response?.data?.message || "Failed to load analytics events.");
      } finally {
        setAnalyticsLoading(false);
      }
    };

    fetchEvents();
  }, [activeNav, analyticsPage, pageSize]);

  const handleNavSelect = (nextId) => {
    setActiveNav(nextId);

    if (nextId === "login-logs") {
      setCurrentPage(1);
    }
    if (nextId === "reports") {
      setAnalyticsPage(1);
    }

    const navItem = adminNavigationItems.find((item) => item.id === nextId);
    if (navItem) {
      setSystemMessage(`${navItem.label} section loaded.`);
    }
  };

  const handleLogout = async () => {
    try {
      await axiosInstance.post("/user/logout");
    } finally {
      // Clear localStorage
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("isAdmin");
      // Clear sessionStorage
      sessionStorage.removeItem("isAuthenticated");
      sessionStorage.removeItem("user");
      sessionStorage.removeItem("isAdmin");
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
            loginLogs={loginLogs}
            logsLoading={logsLoading}
            logsError={logsError}
            currentPage={currentPage}
            pageSize={pageSize}
            loginLogsTotal={loginLogsTotal}
            analyticsStats={analyticsStats}
            analyticsOverviewSeries={analyticsOverviewSeries}
            analyticsCategorySeries={analyticsCategorySeries}
            analyticsRecentEvents={analyticsRecentEvents}
            analyticsEvents={analyticsEvents}
            analyticsLoading={analyticsLoading}
            analyticsError={analyticsError}
            analyticsPage={analyticsPage}
            analyticsTotal={analyticsTotal}
            onAnalyticsPageChange={setAnalyticsPage}
            onPageChange={setCurrentPage}
            onCreateEvent={() =>
              setSystemMessage("Create event action can be connected to your form/workflow.")
            }
          />
        </main>
      </div>
    </div>
  );
}
