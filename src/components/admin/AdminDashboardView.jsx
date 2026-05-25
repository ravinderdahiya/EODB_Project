import { ArrowUpRight, Plus } from "lucide-react";
import AdminCategoryChart from "@/components/admin/AdminCategoryChart";
import AdminOverviewChart from "@/components/admin/AdminOverviewChart";
import AdminRecentActivity from "@/components/admin/AdminRecentActivity";
import AdminRecentEventsTable from "@/components/admin/AdminRecentEventsTable";
import AdminLoginLogsTable from "@/components/admin/AdminLoginLogsTable";
import AdminAnalyticsEventsTable from "@/components/admin/AdminAnalyticsEventsTable";
import AdminFeedbackTable from "@/components/admin/AdminFeedbackTable";
import AdminUsersTable from "@/components/admin/AdminUsersTable";
import AdminApiUrlManager from "@/components/admin/AdminApiUrlManager";
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
  loginLogs,
  logsLoading,
  logsError,
  currentPage,
  pageSize,
  loginLogsTotal,
  analyticsStats = null,
  analyticsOverviewSeries = [],
  analyticsCategorySeries = [],
  analyticsRecentEvents = [],
  analyticsEvents = [],
  analyticsLoading = false,
  analyticsError = null,
  analyticsPage = 1,
  analyticsTotal = 0,
  feedbackRecords = [],
  feedbackLoading = false,
  feedbackError = null,
  feedbackPage = 1,
  feedbackTotal = 0,
  usersRecords = [],
  usersLoading = false,
  usersError = null,
  usersPage = 1,
  usersTotal = 0,
  onAnalyticsPageChange,
  onFeedbackPageChange,
  onUsersPageChange,
  onPageChange,
  onCreateEvent,
}) {
  const activeItem = adminNavigationItems.find((item) => item.id === activeSection)
    ?? adminNavigationItems[0];
  const isDashboard = activeItem.id === "dashboard";
  const statCards = analyticsStats || adminStatCards;
  const overviewSeries = analyticsOverviewSeries?.length
    ? analyticsOverviewSeries
    : adminOverviewSeries;
  const categorySeries = analyticsCategorySeries?.length
    ? analyticsCategorySeries
    : adminCategorySeries;
  const recentEvents = analyticsRecentEvents?.length
    ? analyticsRecentEvents
    : adminRecentEvents;

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
            <AdminStatCards cards={statCards} />

            <div className="admin-grid admin-grid--charts">
              <AdminOverviewChart series={overviewSeries} />
              <AdminCategoryChart categories={categorySeries} />
            </div>

            <div className="admin-grid admin-grid--lower">
              <AdminRecentEventsTable events={recentEvents} />
              <AdminRecentActivity items={adminRecentActivity} />
            </div>

            <AdminSummaryCards cards={adminSummaryMetrics} />
          </>
        ) : activeItem.id === "login-logs" ? (
          <>
            <AdminLoginLogsTable
              logs={loginLogs}
              loading={logsLoading}
              error={logsError}
              page={currentPage}
              pageSize={pageSize}
              totalCount={loginLogsTotal}
              onPageChange={onPageChange}
            />
            <AdminSummaryCards cards={adminSummaryMetrics} />
          </>
        ) : activeItem.id === "users" ? (
          <>
            <AdminUsersTable
              users={usersRecords}
              loading={usersLoading}
              error={usersError}
              page={usersPage}
              pageSize={pageSize}
              totalCount={usersTotal}
              onPageChange={onUsersPageChange}
            />
            <AdminSummaryCards cards={adminSummaryMetrics} />
          </>
        ) : activeItem.id === "api-urls" ? (
          <>
            <AdminApiUrlManager />
            <AdminSummaryCards cards={adminSummaryMetrics} />
          </>
        ) : activeItem.id === "reports" ? (
          <>
            <AdminAnalyticsEventsTable
              events={analyticsEvents}
              loading={analyticsLoading}
              error={analyticsError}
              page={analyticsPage}
              pageSize={pageSize}
              totalCount={analyticsTotal}
              onPageChange={onAnalyticsPageChange}
            />
            <AdminSummaryCards cards={adminSummaryMetrics} />
          </>
        ) : activeItem.id === "feedback-history" ? (
          <>
            <AdminFeedbackTable
              feedbacks={feedbackRecords}
              loading={feedbackLoading}
              error={feedbackError}
              page={feedbackPage}
              pageSize={pageSize}
              totalCount={feedbackTotal}
              onPageChange={onFeedbackPageChange}
            />
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
