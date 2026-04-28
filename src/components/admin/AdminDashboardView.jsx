import { ArrowUpRight, Plus } from "lucide-react";
import AdminCategoryChart from "@/components/admin/AdminCategoryChart";
import AdminOverviewChart from "@/components/admin/AdminOverviewChart";
import AdminRecentActivity from "@/components/admin/AdminRecentActivity";
import AdminRecentEventsTable from "@/components/admin/AdminRecentEventsTable";
import AdminStatCards from "@/components/admin/AdminStatCards";
import AdminSummaryCards from "@/components/admin/AdminSummaryCards";
import {
  adminCategorySeries,
  adminNavigationItems,
  adminOverviewSeries,
  adminRecentActivity,
  adminRecentEvents,
  adminStatCards,
  adminSummaryMetrics,
} from "@/data/adminData";

function AdminSectionPlaceholder({ section }) {
  return (
    <article className="admin-card admin-placeholder-card">
      <span className="eyebrow">Module Workspace</span>
      <h3>{section.label}</h3>
      <p>
        This section is connected to the same admin shell and theme engine.
        Dashboard widgets remain live, and dedicated actions for this module can be
        attached without changing layout behavior.
      </p>
    </article>
  );
}

export default function AdminDashboardView({
  activeSection,
  systemMessage,
  onCreateEvent,
}) {
  const activeItem = adminNavigationItems.find((item) => item.id === activeSection)
    ?? adminNavigationItems[0];
  const isDashboard = activeItem.id === "dashboard";

  return (
    <section className="admin-dashboard">
      <div className="admin-dashboard__stack">
        <header className="admin-card admin-page-header">
          <div className="admin-page-header__copy">
            <span className="eyebrow">Admin Control Center</span>
            <h2>{activeItem.label}</h2>
            <p>
              {isDashboard
                ? "Track event platform performance, bookings, and revenue from one operational dashboard."
                : activeItem.description}
            </p>
          </div>

          <div className="admin-page-header__actions">
            <button
              type="button"
              className="header-action-button header-action-button--primary"
              onClick={onCreateEvent}
            >
              <Plus size={16} />
              <span>Create Event</span>
            </button>
          </div>
        </header>

        <div className="admin-system-message" role="status">
          <span>{systemMessage}</span>
          <ArrowUpRight size={16} />
        </div>

        {isDashboard ? (
          <>
            <AdminStatCards cards={adminStatCards} />

            <div className="admin-grid admin-grid--charts">
              <AdminOverviewChart series={adminOverviewSeries} />
              <AdminCategoryChart categories={adminCategorySeries} />
            </div>

            <div className="admin-grid admin-grid--lower">
              <AdminRecentEventsTable events={adminRecentEvents} />
              <AdminRecentActivity items={adminRecentActivity} />
            </div>

            <AdminSummaryCards cards={adminSummaryMetrics} />
          </>
        ) : (
          <>
            <AdminSectionPlaceholder section={activeItem} />
            <AdminSummaryCards cards={adminSummaryMetrics} />
          </>
        )}
      </div>
    </section>
  );
}
