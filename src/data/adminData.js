import {
  BarChart3,
  Building2,
  CalendarDays,
  CircleDollarSign,
  Clock3,
  LayoutDashboard,
  Mail,
  Settings,
  Tags,
  TicketCheck,
  Users,
  Wallet,
} from "lucide-react";

export const adminNavigationItems = [
  {
    id: "dashboard",
    label: "Dashboard",
    description: "Platform KPIs and operational summary",
    icon: LayoutDashboard,
  },
  {
    id: "events",
    label: "Events",
    description: "Event listings, scheduling and publishing",
    icon: CalendarDays,
  },
  {
    id: "users",
    label: "Users",
    description: "User lifecycle, onboarding and permissions",
    icon: Users,
  },
  {
    id: "bookings",
    label: "Bookings",
    description: "Reservation and attendance operations",
    icon: TicketCheck,
  },
  {
    id: "payments",
    label: "Payments",
    description: "Collection, settlement and refunds",
    icon: Wallet,
  },
  {
    id: "venues",
    label: "Venues",
    description: "Venue allocation and availability",
    icon: Building2,
  },
  {
    id: "categories",
    label: "Categories",
    description: "Event taxonomy and classification",
    icon: Tags,
  },
  {
    id: "reports",
    label: "Reports",
    description: "Insights, exports and analytics",
    icon: BarChart3,
  },
  {
    id: "settings",
    label: "Settings",
    description: "System controls and preferences",
    icon: Settings,
  },
];

export const adminStatCards = [
  {
    id: "total-events",
    label: "Total Events",
    value: "1,248",
    delta: "+8.4%",
    detail: "42 new this week",
    trend: "up",
    tone: "green",
    icon: CalendarDays,
  },
  {
    id: "total-users",
    label: "Total Users",
    value: "36,912",
    delta: "+5.2%",
    detail: "1,124 signups this month",
    trend: "up",
    tone: "blue",
    icon: Users,
  },
  {
    id: "total-bookings",
    label: "Total Bookings",
    value: "18,476",
    delta: "+11.7%",
    detail: "1,982 pending confirmation",
    trend: "up",
    tone: "mint",
    icon: TicketCheck,
  },
  {
    id: "total-revenue",
    label: "Total Revenue",
    value: "₹2.84 Cr",
    delta: "-2.1%",
    detail: "Compared to last month",
    trend: "down",
    tone: "orange",
    icon: CircleDollarSign,
  },
];

export const adminOverviewSeries = [
  { label: "Jan", value: 1020 },
  { label: "Feb", value: 1148 },
  { label: "Mar", value: 1276 },
  { label: "Apr", value: 1184 },
  { label: "May", value: 1362 },
  { label: "Jun", value: 1444 },
  { label: "Jul", value: 1522 },
  { label: "Aug", value: 1488 },
  { label: "Sep", value: 1636 },
  { label: "Oct", value: 1714 },
  { label: "Nov", value: 1662 },
  { label: "Dec", value: 1796 },
];

export const adminCategorySeries = [
  { id: "music", label: "Music", events: 286, fill: "var(--green)" },
  { id: "sports", label: "Sports", events: 212, fill: "var(--blue)" },
  { id: "corporate", label: "Corporate", events: 168, fill: "var(--orange)" },
  { id: "workshops", label: "Workshops", events: 154, fill: "var(--mint)" },
  { id: "community", label: "Community", events: 123, fill: "#93d64c" },
];

export const adminRecentEvents = [
  {
    id: "EVT-1204",
    name: "Summer Beats Festival",
    category: "Music",
    date: "Apr 27, 2026",
    venue: "Leisure Valley, Gurugram",
    bookings: 3240,
    revenue: 1275000,
    status: "Open",
  },
  {
    id: "EVT-1191",
    name: "North India Startup Summit",
    category: "Corporate",
    date: "May 02, 2026",
    venue: "Yamuna Convention Hall",
    bookings: 980,
    revenue: 842000,
    status: "Open",
  },
  {
    id: "EVT-1176",
    name: "City Run Carnival",
    category: "Sports",
    date: "Apr 19, 2026",
    venue: "Sector 29 Arena",
    bookings: 4120,
    revenue: 1650000,
    status: "Closed",
  },
  {
    id: "EVT-1162",
    name: "Digital Creator Workshop",
    category: "Workshops",
    date: "Apr 30, 2026",
    venue: "EODB Knowledge Hub",
    bookings: 456,
    revenue: 182400,
    status: "Draft",
  },
  {
    id: "EVT-1158",
    name: "Community Heritage Walk",
    category: "Community",
    date: "Apr 24, 2026",
    venue: "Civil Lines, Karnal",
    bookings: 214,
    revenue: 64200,
    status: "Open",
  },
];

export const adminRecentActivity = [
  {
    id: "ACT-901",
    title: "Payment batch settled for Spring Marathon",
    detail: "Finance automation · 12 minutes ago",
    tone: "success",
  },
  {
    id: "ACT-896",
    title: "Venue availability updated for 6 properties",
    detail: "Venue operations · 39 minutes ago",
    tone: "info",
  },
  {
    id: "ACT-892",
    title: "Category review submitted for festival listings",
    detail: "Content moderation · 1 hour ago",
    tone: "neutral",
  },
  {
    id: "ACT-887",
    title: "Refund queue flagged for manual approval",
    detail: "Payments desk · 2 hours ago",
    tone: "warning",
  },
  {
    id: "ACT-882",
    title: "Newsletter campaign completed successfully",
    detail: "Communication engine · 3 hours ago",
    tone: "success",
  },
];

export const adminSummaryMetrics = [
  {
    id: "pending-bookings",
    label: "Pending Bookings",
    value: "1,982",
    tone: "blue",
    icon: Clock3,
  },
  {
    id: "pending-payments",
    label: "Pending Payments",
    value: "₹24.7L",
    tone: "orange",
    icon: CircleDollarSign,
  },
  {
    id: "total-venues",
    label: "Total Venues",
    value: "412",
    tone: "green",
    icon: Building2,
  },
  {
    id: "newsletter-subscribers",
    label: "Newsletter Subscribers",
    value: "18,903",
    tone: "mint",
    icon: Mail,
  },
];

export const adminSearchSuggestions = [
  {
    id: "SEARCH-1",
    title: "Summer Beats Festival",
    description: "Event · Leisure Valley, Gurugram · 3,240 bookings",
    targetNav: "events",
    targetLabel: "Events",
  },
  {
    id: "SEARCH-2",
    title: "Pending Booking Queue",
    description: "Bookings · 1,982 records awaiting confirmation",
    targetNav: "bookings",
    targetLabel: "Bookings",
  },
  {
    id: "SEARCH-3",
    title: "Settlement Exceptions",
    description: "Payments · 37 payouts flagged for review",
    targetNav: "payments",
    targetLabel: "Payments",
  },
  {
    id: "SEARCH-4",
    title: "Venue Capacity Audit",
    description: "Venues · 16 profiles updated this week",
    targetNav: "venues",
    targetLabel: "Venues",
  },
  {
    id: "SEARCH-5",
    title: "Category Approval Queue",
    description: "Categories · 12 submissions awaiting moderation",
    targetNav: "categories",
    targetLabel: "Categories",
  },
];
