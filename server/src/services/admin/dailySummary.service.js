import { emailAdmins } from "../notifications/adminAlertEmail.service.js";
import { dailySummaryEmail } from "../notifications/templates/emails.js";
import { getAdminAnalytics } from "./adminAnalytics.service.js";
import { getDashboard } from "./dashboard.service.js";

// "2026-10-09" -> "Fri, 9 Oct 2026"
const dayLabel = (day) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Accra",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(day + "T12:00:00Z"));

// The daily summary email to every active admin, at 23:59 Ghana time [AC-JOB-02].
// The same numbers as the dashboard and charts (one source of truth). Each admin gets
// one per day, even if the job runs twice (the email key holds the day) [AC-JOB-03].
export const sendDailySummary = async (now = new Date()) => {
  // Ghana is on UTC all year, so the UTC date is Ghana's date
  const day = now.toISOString().slice(0, 10);
  const [analytics, dashboard] = await Promise.all([
    getAdminAnalytics({ from: day, to: day }),
    getDashboard(now),
  ]);
  const openAlerts = Object.values(dashboard.alerts).reduce((sum, count) => sum + count, 0);

  await emailAdmins({
    type: "DAILY_SUMMARY",
    key: `daily-summary:${day}`,
    email: dailySummaryEmail({ dayLabel: dayLabel(day), analytics, openAlerts }),
  });
  return { day, orders: analytics.totals.orders };
};
